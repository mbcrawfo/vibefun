/**
 * Meta-tests for source-level arbitraries.
 *
 * These properties verify the generators in `source-arb.ts` themselves —
 * if a generator silently emits malformed values (e.g. an identifier that
 * is actually a reserved keyword, or a "safe string" that contains an
 * unescaped quote), every downstream property test built on it would
 * silently pass on vacuous inputs. Modeled on `token-arb.test.ts`.
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { VibefunDiagnostic } from "../../diagnostics/index.js";
import { Lexer } from "../../lexer/index.js";
import { isBoolLiteral, isKeyword, isReservedKeyword } from "../token.js";
import {
    lowerIdentifierArb,
    nonNegativeFloatArb,
    nonNegativeIntArb,
    renderStringLit,
    safeStringContentArb,
    SYNTHETIC_LOCATION,
    upperIdentifierArb,
} from "./index.js";

const MAX_SHRINK_STEPS = 1000;

/**
 * Tokenize a source fragment. If a `VibefunDiagnostic` escapes, return its
 * code so the property can assert it's registered. Plain `Error` throws
 * propagate (those would mean the generator hit an unhandled lexer path
 * and the property should fail loudly).
 */
function lexOrCode(
    source: string,
): { kind: "ok"; tokens: ReturnType<Lexer["tokenize"]> } | { kind: "diag"; code: string } {
    try {
        const tokens = new Lexer(source, "<source-arb>").tokenize();
        return { kind: "ok", tokens };
    } catch (error) {
        if (error instanceof VibefunDiagnostic) {
            return { kind: "diag", code: error.code };
        }
        throw error;
    }
}

describe("source arbitraries", () => {
    describe("lowerIdentifierArb", () => {
        it("matches the documented regex and is never a reserved word", () => {
            fc.assert(
                fc.property(lowerIdentifierArb, (s) => {
                    return (
                        /^[a-z][a-z0-9_]{0,7}$/.test(s) && !isKeyword(s) && !isReservedKeyword(s) && !isBoolLiteral(s)
                    );
                }),
            );
        });

        it("lexes to a single IDENTIFIER token (no unregistered throws)", () => {
            fc.assert(
                fc.property(lowerIdentifierArb, (s) => {
                    const result = lexOrCode(s);
                    if (result.kind === "diag") return /^VF\d{4}$/.test(result.code);
                    // [IDENTIFIER, EOF]
                    return (
                        result.tokens.length === 2 &&
                        result.tokens[0]?.type === "IDENTIFIER" &&
                        result.tokens[0]?.value === s
                    );
                }),
            );
        });
    });

    describe("upperIdentifierArb", () => {
        it("matches the documented regex (uppercase-leading PascalCase)", () => {
            fc.assert(fc.property(upperIdentifierArb, (s) => /^[A-Z][a-zA-Z0-9_]{0,7}$/.test(s)));
        });

        it("lexes to a single IDENTIFIER token (no unregistered throws)", () => {
            fc.assert(
                fc.property(upperIdentifierArb, (s) => {
                    const result = lexOrCode(s);
                    if (result.kind === "diag") return /^VF\d{4}$/.test(result.code);
                    return (
                        result.tokens.length === 2 &&
                        result.tokens[0]?.type === "IDENTIFIER" &&
                        result.tokens[0]?.value === s
                    );
                }),
            );
        });
    });

    describe("safeStringContentArb", () => {
        it("contains only documented printable-ASCII codepoints (no quote, no backslash, no control)", () => {
            fc.assert(
                fc.property(safeStringContentArb, (s) => {
                    for (const ch of s) {
                        const code = ch.codePointAt(0);
                        if (code === undefined) return false;
                        const inLow = code >= 0x20 && code <= 0x21;
                        const inMid = code >= 0x23 && code <= 0x5b;
                        const inHigh = code >= 0x5d && code <= 0x7e;
                        if (!(inLow || inMid || inHigh)) return false;
                    }
                    return true;
                }),
            );
        });

        it("renderStringLit round-trips through JSON.parse (and through the lexer)", () => {
            fc.assert(
                fc.property(safeStringContentArb, (s) => {
                    const rendered = renderStringLit(s);
                    if (JSON.parse(rendered) !== s) return false;
                    const result = lexOrCode(rendered);
                    if (result.kind === "diag") return /^VF\d{4}$/.test(result.code);
                    return (
                        result.tokens.length === 2 &&
                        result.tokens[0]?.type === "STRING_LITERAL" &&
                        result.tokens[0]?.value === s
                    );
                }),
            );
        });
    });

    describe("nonNegativeIntArb", () => {
        it("only produces non-negative safe integers in the documented range", () => {
            fc.assert(fc.property(nonNegativeIntArb, (n) => Number.isSafeInteger(n) && n >= 0 && n <= 1_000_000_000));
        });
    });

    describe("nonNegativeFloatArb", () => {
        it("only produces finite, non-negative numbers ≤ 1e6", () => {
            fc.assert(fc.property(nonNegativeFloatArb, (x) => Number.isFinite(x) && x >= 0 && x <= 1_000_000));
        });
    });

    describe("SYNTHETIC_LOCATION", () => {
        it("is a structurally-complete Location", () => {
            expect(typeof SYNTHETIC_LOCATION.file).toBe("string");
            expect(typeof SYNTHETIC_LOCATION.line).toBe("number");
            expect(typeof SYNTHETIC_LOCATION.column).toBe("number");
            expect(typeof SYNTHETIC_LOCATION.offset).toBe("number");
        });
    });

    describe("shrink termination", () => {
        // Each arbitrary's shrink path must terminate. We falsify a trivial
        // property to force fast-check to shrink, then assert numShrinks
        // is bounded — an infinite shrink would hang, but the safety net
        // catches a runaway shrink that finishes after N≫1000 steps.
        const cases: ReadonlyArray<readonly [string, fc.Arbitrary<unknown>]> = [
            ["lowerIdentifierArb", lowerIdentifierArb],
            ["upperIdentifierArb", upperIdentifierArb],
            ["safeStringContentArb", safeStringContentArb],
            ["nonNegativeIntArb", nonNegativeIntArb],
            ["nonNegativeFloatArb", nonNegativeFloatArb],
        ];

        for (const [name, arb] of cases) {
            it(`${name}: shrinks within ${MAX_SHRINK_STEPS} steps`, () => {
                const result = fc.check(
                    fc.property(arb, () => false),
                    { numRuns: 1 },
                );
                expect(result.failed).toBe(true);
                expect(result.numShrinks).toBeLessThanOrEqual(MAX_SHRINK_STEPS);
            });
        }
    });
});
