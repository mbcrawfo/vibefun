/**
 * Tests for FreshVarGen class
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { identifierArb } from "../types/test-arbitraries/index.js";
import { FreshVarGen } from "./FreshVarGen.js";

describe("FreshVarGen", () => {
    it("should generate fresh variable names with counter", () => {
        const gen = new FreshVarGen();

        expect(gen.fresh("tmp")).toBe("$tmp0");
        expect(gen.fresh("tmp")).toBe("$tmp1");
        expect(gen.fresh("tmp")).toBe("$tmp2");
    });

    it("should use custom prefix", () => {
        const gen = new FreshVarGen();

        expect(gen.fresh("composed")).toBe("$composed0");
        expect(gen.fresh("piped")).toBe("$piped1");
    });

    it("should reset counter", () => {
        const gen = new FreshVarGen();

        gen.fresh("tmp"); // $tmp0
        gen.fresh("tmp"); // $tmp1
        gen.reset();
        expect(gen.fresh("tmp")).toBe("$tmp0");
    });

    describe("generic scope tracking", () => {
        it("returns false when no generics are in scope", () => {
            const gen = new FreshVarGen();
            expect(gen.isGenericInScope("T")).toBe(false);
        });

        it("reports generics pushed onto the scope as in-scope", () => {
            const gen = new FreshVarGen();
            gen.pushGenerics(["T", "U"]);
            expect(gen.isGenericInScope("T")).toBe(true);
            expect(gen.isGenericInScope("U")).toBe(true);
            expect(gen.isGenericInScope("V")).toBe(false);
        });

        it("sees names from every enclosing frame (nested lookup)", () => {
            const gen = new FreshVarGen();
            gen.pushGenerics(["T"]);
            gen.pushGenerics(["U"]);
            expect(gen.isGenericInScope("T")).toBe(true);
            expect(gen.isGenericInScope("U")).toBe(true);
            gen.popGenerics();
            expect(gen.isGenericInScope("U")).toBe(false);
            expect(gen.isGenericInScope("T")).toBe(true);
            gen.popGenerics();
            expect(gen.isGenericInScope("T")).toBe(false);
        });

        it("throws on popGenerics underflow", () => {
            const gen = new FreshVarGen();
            expect(() => gen.popGenerics()).toThrow(/underflow/);
        });

        it("reset() clears both the counter and the generic scope", () => {
            const gen = new FreshVarGen();
            gen.fresh("tmp"); // $tmp0
            gen.pushGenerics(["T"]);
            gen.reset();
            expect(gen.fresh("tmp")).toBe("$tmp0");
            expect(gen.isGenericInScope("T")).toBe(false);
            // And popGenerics on the freshly-reset stack should underflow.
            expect(() => gen.popGenerics()).toThrow(/underflow/);
        });
    });

    describe("FreshVarGen properties", () => {
        // The desugarer relies on FreshVarGen for collision-free synthetic
        // names. The two load-bearing invariants are: (a) names produced by
        // a single instance never repeat, and (b) every produced name starts
        // with `$` so it can never collide with a user identifier (which
        // cannot start with `$` per the lexer).

        it("property: fresh() never returns the same name twice on one instance", () => {
            fc.assert(
                fc.property(fc.array(identifierArb, { minLength: 1, maxLength: 30 }), (prefixes) => {
                    const gen = new FreshVarGen();
                    const seen = new Set<string>();
                    for (const p of prefixes) {
                        const name = gen.fresh(p);
                        if (seen.has(name)) return false;
                        seen.add(name);
                    }
                    return true;
                }),
            );
        });

        it("property: every fresh name starts with `$` (cannot collide with user identifiers)", () => {
            fc.assert(
                fc.property(identifierArb, (prefix) => {
                    const gen = new FreshVarGen();
                    const name = gen.fresh(prefix);
                    return name.startsWith("$");
                }),
            );
        });

        it("property: fresh names contain the requested prefix", () => {
            fc.assert(
                fc.property(identifierArb, (prefix) => {
                    const gen = new FreshVarGen();
                    return gen.fresh(prefix).includes(prefix);
                }),
            );
        });

        it("property: pushGenerics / popGenerics is balanced — push N, pop N restores empty scope", () => {
            fc.assert(
                fc.property(fc.array(fc.array(identifierArb, { maxLength: 4 }), { maxLength: 6 }), (frames) => {
                    const gen = new FreshVarGen();
                    for (const frame of frames) gen.pushGenerics(frame);
                    for (let i = 0; i < frames.length; i++) gen.popGenerics();
                    // After balanced pop, no generic should be in scope
                    return frames.flat().every((name) => !gen.isGenericInScope(name));
                }),
            );
        });

        it("property: a generic pushed onto the topmost frame is reported in-scope", () => {
            fc.assert(
                fc.property(fc.array(identifierArb, { minLength: 1, maxLength: 4 }), (names) => {
                    const gen = new FreshVarGen();
                    gen.pushGenerics(names);
                    return names.every((n) => gen.isGenericInScope(n));
                }),
            );
        });

        it("property: reset() clears the counter — first fresh() afterwards equals $<prefix>0", () => {
            fc.assert(
                fc.property(identifierArb, fc.nat({ max: 20 }), (prefix, callsBeforeReset) => {
                    const gen = new FreshVarGen();
                    for (let i = 0; i < callsBeforeReset; i++) gen.fresh("warmup");
                    gen.reset();
                    return gen.fresh(prefix) === `$${prefix}0`;
                }),
            );
        });
    });
});
