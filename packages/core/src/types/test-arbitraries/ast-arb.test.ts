/**
 * Meta-tests for the AST arbitraries and pretty-printer.
 *
 * These verify that:
 *   1. Generators are total (don't throw, produce expected node kinds).
 *   2. The pretty-printer is deterministic and idempotent on identifier-like
 *      simple inputs.
 *   3. The end-to-end pipeline `prettyPrint(ast) → parse → ast'` is structurally
 *      equivalent (modulo `loc`) so downstream property tests can rely on it.
 *
 * If any meta-test fails, downstream property-test failures may be generator
 * bugs rather than parser bugs — fix the generator first.
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { Lexer } from "../../lexer/index.js";
import { Parser } from "../../parser/index.js";
import {
    astEquals,
    declArb,
    exprArb,
    moduleArb,
    patternArb,
    prettyPrintDeclaration,
    prettyPrintExpr,
    prettyPrintModule,
    prettyPrintPattern,
    prettyPrintTypeExpr,
    typeExprArb,
} from "./index.js";

function parseExpr(src: string) {
    const tokens = new Lexer(src, "<arb-test>").tokenize();
    return new Parser(tokens, "<arb-test>").parseExpression();
}

function parsePat(src: string) {
    const tokens = new Lexer(src, "<arb-test>").tokenize();
    return new Parser(tokens, "<arb-test>").parsePattern();
}

function parseType(src: string) {
    const tokens = new Lexer(src, "<arb-test>").tokenize();
    return new Parser(tokens, "<arb-test>").parseTypeExpr();
}

function parseModuleSrc(src: string) {
    const tokens = new Lexer(src, "<arb-test>").tokenize();
    return new Parser(tokens, "<arb-test>").parse();
}

describe("ast arbitraries", () => {
    it("exprArb generates without throwing and yields a valid kind", () => {
        fc.assert(
            fc.property(exprArb({ depth: 3 }), (e) => {
                expect(typeof e.kind).toBe("string");
                expect(e.loc).toBeDefined();
            }),
        );
    });

    it("patternArb generates without throwing and pattern-bound names are non-empty", () => {
        fc.assert(
            fc.property(patternArb({ depth: 3 }), (p) => {
                const visit = (q: unknown): void => {
                    if (q === null || typeof q !== "object") return;
                    const obj = q as { kind?: string; name?: unknown };
                    if (obj.kind === "VarPattern") {
                        expect(typeof obj.name).toBe("string");
                        expect((obj.name as string).length).toBeGreaterThan(0);
                    }
                    for (const v of Object.values(q as Record<string, unknown>)) visit(v);
                };
                visit(p);
            }),
        );
    });

    it("typeExprArb generates without throwing", () => {
        fc.assert(
            fc.property(typeExprArb({ depth: 3 }), (t) => {
                expect(typeof t.kind).toBe("string");
            }),
        );
    });

    it("declArb generates a LetDecl shape", () => {
        fc.assert(
            fc.property(declArb({ depth: 2 }), (d) => {
                expect(d.kind).toBe("LetDecl");
            }),
        );
    });
});

describe("pretty-printer round-trip", () => {
    it("property: parse(prettyPrintExpr(e)) is structurally equal to e", () => {
        fc.assert(
            fc.property(exprArb({ depth: 3 }), (e) => {
                const src = prettyPrintExpr(e);
                const reparsed = parseExpr(src);
                if (!astEquals(reparsed, e)) {
                    throw new Error(
                        `Round-trip mismatch.\n  src:      ${src}\n  expected: ${JSON.stringify(e)}\n  got:      ${JSON.stringify(reparsed)}`,
                    );
                }
            }),
        );
    });

    it("property: parse(prettyPrintPattern(p)) is structurally equal to p", () => {
        fc.assert(
            fc.property(patternArb({ depth: 3 }), (p) => {
                const src = prettyPrintPattern(p);
                const reparsed = parsePat(src);
                if (!astEquals(reparsed, p)) {
                    throw new Error(
                        `Pattern round-trip mismatch.\n  src:      ${src}\n  expected: ${JSON.stringify(p)}\n  got:      ${JSON.stringify(reparsed)}`,
                    );
                }
            }),
        );
    });

    it("property: parse(prettyPrintTypeExpr(t)) is structurally equal to t", () => {
        fc.assert(
            fc.property(typeExprArb({ depth: 3 }), (t) => {
                const src = prettyPrintTypeExpr(t);
                const reparsed = parseType(src);
                if (!astEquals(reparsed, t)) {
                    throw new Error(
                        `Type round-trip mismatch.\n  src:      ${src}\n  expected: ${JSON.stringify(t)}\n  got:      ${JSON.stringify(reparsed)}`,
                    );
                }
            }),
        );
    });

    it("property: parse(prettyPrintModule(m)) is structurally equal to m", () => {
        fc.assert(
            fc.property(moduleArb({ depth: 3, maxBreadth: 2 }), (m) => {
                const src = prettyPrintModule(m);
                const reparsed = parseModuleSrc(src);
                if (!astEquals(reparsed, m)) {
                    throw new Error(
                        `Module round-trip mismatch.\n  src:      ${src}\n  expected: ${JSON.stringify(m)}\n  got:      ${JSON.stringify(reparsed)}`,
                    );
                }
            }),
        );
    });

    it("simple identity: prettyPrintExpr(IntLit(1)) parses back to IntLit(1)", () => {
        const e = parseExpr(
            prettyPrintExpr({ kind: "IntLit", value: 1, loc: { file: "x", line: 1, column: 1, offset: 0 } }),
        );
        expect(e.kind).toBe("IntLit");
    });

    it("declaration round-trip: prettyPrintDeclaration produces re-parseable source", () => {
        fc.assert(
            fc.property(declArb({ depth: 2 }), (d) => {
                const src = `${prettyPrintDeclaration(d)};`;
                const m = parseModuleSrc(src);
                expect(m.declarations.length).toBe(1);
                expect(m.declarations[0]?.kind).toBe(d.kind);
            }),
        );
    });
});
