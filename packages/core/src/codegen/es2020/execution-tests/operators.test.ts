/**
 * Operator execution tests for ES2020 code generator
 *
 * Tests comparison and boolean operators.
 */

import { describe, expect, it } from "vitest";

import { compileAndGetExport } from "./execution-test-helpers.js";

describe("comparison operators", () => {
    it("should handle comparison operators", () => {
        const r1 = compileAndGetExport(`let result = 5 < 10;`, "result");
        const r2 = compileAndGetExport(`let result = 5 <= 5;`, "result");
        const r3 = compileAndGetExport(`let result = 10 > 5;`, "result");
        const r4 = compileAndGetExport(`let result = 5 >= 5;`, "result");

        expect(r1).toBe(true);
        expect(r2).toBe(true);
        expect(r3).toBe(true);
        expect(r4).toBe(true);
    });
});

describe("boolean operators", () => {
    it("should handle boolean operations", () => {
        const r1 = compileAndGetExport(`let result = true && false;`, "result");
        const r2 = compileAndGetExport(`let result = true || false;`, "result");
        const r3 = compileAndGetExport(`let result = !true;`, "result");

        expect(r1).toBe(false);
        expect(r2).toBe(true);
        expect(r3).toBe(false);
    });
});
