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
});
