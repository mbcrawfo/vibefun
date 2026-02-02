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
