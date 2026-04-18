/**
 * Miscellaneous execution tests for ES2020 code generator
 *
 * Tests edge cases like empty modules and string concatenation.
 */

import { describe, expect, it } from "vitest";

import { compileAndGetExport, compileAndRunSucceeds } from "./execution-test-helpers.js";

describe("empty module", () => {
    it("should handle empty module", () => {
        expect(compileAndRunSucceeds("")).toBe(true);
    });
});

describe("string operations", () => {
    it("should handle string concatenation", () => {
        const result = compileAndGetExport(`let result = "hello" & " " & "world";`, "result");
        expect(result).toBe("hello world");
    });
});

describe("empty block", () => {
    it("should evaluate empty block to unit", () => {
        const result = compileAndGetExport(`let x = {};`, "x");
        expect(result).toBeUndefined();
    });
});

describe("while loop", () => {
    it("should type-check and run a while-false loop (exercises wildcard let)", () => {
        // The while desugarer emits `let _ = body in loop()`. Until 1.5,
        // the typechecker rejected wildcard let bindings.
        expect(compileAndRunSucceeds(`let run = () => { while false { }; };`)).toBe(true);
    });
});
