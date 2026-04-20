/**
 * Tests for FreshVarGen class
 */

import { describe, expect, it } from "vitest";

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
});
