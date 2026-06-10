/**
 * Execution tests for multi-parameter external declarations.
 *
 * [BUG: VF-FC-0009] `(A, B) -> R` externals are auto-curried at the type
 * level, and codegen bridges the calling conventions with a curried wrapper
 * const so single-argument application chains reach the n-ary JS function
 * in one call.
 */

import { describe, expect, it } from "vitest";

import { compileAndRun, compileToJs } from "./execution-test-helpers.js";

describe("multi-param externals (curried wrappers)", () => {
    it("full application of a 2-param external calls the JS function once", () => {
        const result = compileAndRun(
            `external add2: (Int, Int) -> Int = "((a, b) => a + b)";
let r = unsafe { add2(3, 4) };`,
            "r",
        );
        expect(result).toBe(7);
    });

    it("partial application of a 2-param external returns a working closure", () => {
        const result = compileAndRun(
            `external add2: (Int, Int) -> Int = "((a, b) => a + b)";
let add3 = unsafe { add2(3) };
let r = add3(4);`,
            "r",
        );
        expect(result).toBe(7);
    });

    it("full application of a 3-param external", () => {
        const result = compileAndRun(
            `external sum3: (Int, Int, Int) -> Int = "((a, b, c) => a + b + c)";
let r = unsafe { sum3(1, 2, 3) };`,
            "r",
        );
        expect(result).toBe(6);
    });

    it("an explicitly curried external type is called one argument at a time", () => {
        const result = compileAndRun(
            `external mk: (Int) -> (Int) -> Int = "((a) => (b) => a + b)";
let r = unsafe { mk(3)(4) };`,
            "r",
        );
        expect(result).toBe(7);
    });

    it("a multi-param external used as a first-class value stays curried", () => {
        const result = compileAndRun(
            `external add2: (Int, Int) -> Int = "((a, b) => a + b)";
let apply = (f: (Int, Int) -> Int, x: Int, y: Int) => f(x)(y);
let r = unsafe { apply(add2, 3, 4) };`,
            "r",
        );
        expect(result).toBe(7);
    });

    it("emits a curried wrapper const for the multi-param external", () => {
        const js = compileToJs(`external add2: (Int, Int) -> Int = "((a, b) => a + b)";
let r = unsafe { add2(3, 4) };`);
        expect(js).toContain("const add2 = ($a0) => ($a1) => ((a, b) => a + b)($a0, $a1);");
        // The call site references the wrapper, not the inlined raw function.
        expect(js).toContain("add2(3)(4)");
    });

    it("references a same-named multi-param global through globalThis", () => {
        const js = compileToJs(`external parseInt: (String, Int) -> Int = "parseInt";
let r = unsafe { parseInt("42", 10) };`);
        expect(js).toContain("const parseInt = ($a0) => ($a1) => globalThis.parseInt($a0, $a1);");
    });

    it("single-param externals are still inlined by jsName", () => {
        const js = compileToJs(`external math_floor: (Float) -> Int = "Math.floor";
let r = unsafe { math_floor(3.7) };`);
        expect(js).toContain("Math.floor(3.7)");
        expect(js).not.toContain("$a0");
    });
});
