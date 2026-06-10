/**
 * Execution tests for FFI null→Option marshalling.
 *
 * [BUG: VF-FC-0010] Externals declared `-> Option<T>` marshal their return
 * value through the gated $ffiOption helper: JS null/undefined become None,
 * any other value becomes Some(value). Marshalling is unconditional.
 *
 * The vm sandbox cannot resolve module imports, so results are observed as
 * plain Ints (match patterns compile to $tag checks without stdlib imports).
 */

import { describe, expect, it } from "vitest";

import { compileAndRun, compileToJs } from "./execution-test-helpers.js";

const SHOW = `let show = (o: Option<Int>) => match o { | Some(v) => v | None => 0 - 99 };`;

describe("FFI Option marshalling", () => {
    it("a value marshals to Some", () => {
        const result = compileAndRun(
            `external js_maybe: (Bool) -> Option<Int> = "(b) => b ? 5 : null";
${SHOW}
let out = show(unsafe { js_maybe(true) });`,
            "out",
        );
        expect(result).toBe(5);
    });

    it("null marshals to None", () => {
        const result = compileAndRun(
            `external js_maybe: (Bool) -> Option<Int> = "(b) => b ? 5 : null";
${SHOW}
let out = show(unsafe { js_maybe(false) });`,
            "out",
        );
        expect(result).toBe(-99);
    });

    it("undefined marshals to None", () => {
        const result = compileAndRun(
            `external js_undef: (Bool) -> Option<Int> = "((b) => undefined)";
${SHOW}
let out = show(unsafe { js_undef(true) });`,
            "out",
        );
        expect(result).toBe(-99);
    });

    it("falsy non-null values marshal to Some", () => {
        const result = compileAndRun(
            `external js_zero: (Bool) -> Option<Int> = "((b) => 0)";
${SHOW}
let out = show(unsafe { js_zero(true) });`,
            "out",
        );
        expect(result).toBe(0);
    });

    it("multi-param Option externals marshal through the curried wrapper", () => {
        const result = compileAndRun(
            `external js_find: (Int, Int) -> Option<Int> = "((a, b) => a > b ? a : null)";
${SHOW}
let out = (show(unsafe { js_find(9, 4) }), show(unsafe { js_find(1, 4) }));`,
            "out",
        );
        expect(result).toEqual([9, -99]);
    });

    it("partial application of a multi-param Option external still marshals", () => {
        const result = compileAndRun(
            `external js_find: (Int, Int) -> Option<Int> = "((a, b) => a > b ? a : null)";
${SHOW}
let findNine = unsafe { js_find(9) };
let out = show(findNine(4));`,
            "out",
        );
        expect(result).toBe(9);
    });

    it("overloaded Option externals marshal per resolved overload", () => {
        const result = compileAndRun(
            `external pick: (Int) -> Option<Int> = "((a, b) => { const v = b === undefined ? a : a + b; return v > 5 ? v : null; })";
external pick: (Int, Int) -> Option<Int> = "((a, b) => { const v = b === undefined ? a : a + b; return v > 5 ? v : null; })";
${SHOW}
let out = (show(unsafe { pick(9) }), show(unsafe { pick(1, 2) }));`,
            "out",
        );
        expect(result).toEqual([9, -99]);
    });

    it("emits the gated $ffiOption helper only when needed", () => {
        const withOption = compileToJs(`external js_maybe: (Bool) -> Option<Int> = "(b) => b ? 5 : null";
let r = unsafe { js_maybe(true) };`);
        expect(withOption).toContain("const $ffiOption");
        expect(withOption).toContain("const js_maybe = ($a0) => $ffiOption(((b) => b ? 5 : null)($a0));");

        const withoutOption = compileToJs(`external math_floor: (Float) -> Int = "Math.floor";
let r = unsafe { math_floor(3.7) };`);
        expect(withoutOption).not.toContain("$ffiOption");
    });
});
