/**
 * Numeric execution tests for ES2020 code generator
 *
 * Tests IEEE 754 semantics, integer division, and modulo operations.
 */

import { describe, expect, it } from "vitest";

import { compileAndGetExport } from "./execution-test-helpers.js";

describe("IEEE 754 semantics", () => {
    it("should handle NaN equality correctly (NaN != NaN)", () => {
        const result = compileAndGetExport(
            `let x = 0.0 / 0.0;
            let result = x == x;`,
            "result",
        );
        expect(result).toBe(false);
    });

    it("should handle NaN inequality correctly", () => {
        const result = compileAndGetExport(
            `let x = 0.0 / 0.0;
            let result = x != x;`,
            "result",
        );
        expect(result).toBe(true);
    });
});

describe("integer division", () => {
    it("should truncate toward zero for positive division", () => {
        const result = compileAndGetExport(`let result = 7 / 2;`, "result");
        expect(result).toBe(3);
    });

    it("should truncate toward zero for negative dividend", () => {
        const result = compileAndGetExport(`let result = (-7) / 2;`, "result");
        expect(result).toBe(-3); // Not -4 (floor)
    });

    it("should truncate toward zero for negative divisor", () => {
        const result = compileAndGetExport(`let result = 7 / (-2);`, "result");
        expect(result).toBe(-3);
    });

    it("should truncate toward zero for both negative", () => {
        const result = compileAndGetExport(`let result = (-7) / (-2);`, "result");
        expect(result).toBe(3);
    });
});

describe("modulo operations", () => {
    it("should handle modulo operation", () => {
        const result = compileAndGetExport(`let result = 17 % 5;`, "result");
        expect(result).toBe(2);
    });

    it("should handle negative modulo", () => {
        const result = compileAndGetExport(`let result = (-17) % 5;`, "result");
        expect(result).toBe(-2);
    });
});
