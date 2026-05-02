/**
 * Numeric execution tests for ES2020 code generator
 *
 * Tests IEEE 754 semantics, integer division, and modulo operations.
 */

import * as fc from "fast-check";
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

describe("division by zero", () => {
    it("should panic at runtime on integer division by zero", () => {
        expect(() => compileAndGetExport(`let result = 10 / 0;`, "result")).toThrow("Division by zero");
    });

    it("should panic at runtime on integer division by zero with variable divisor", () => {
        expect(() => compileAndGetExport(`let d = 0; let result = 10 / d;`, "result")).toThrow("Division by zero");
    });

    it("should panic at runtime on integer modulo by zero", () => {
        expect(() => compileAndGetExport(`let result = 10 % 0;`, "result")).toThrow("Division by zero");
    });

    it("should NOT panic on float division by zero (IEEE 754 produces Infinity)", () => {
        const result = compileAndGetExport(`let result = 10.0 / 0.0;`, "result");
        expect(result).toBe(Infinity);
    });

    it("should NOT panic on float 0/0 (IEEE 754 produces NaN)", () => {
        const result = compileAndGetExport(`let result = 0.0 / 0.0;`, "result");
        expect(Number.isNaN(result as number)).toBe(true);
    });
});

describe("Properties", () => {
    // These properties spawn JS via vm.runInContext on every run. Cap
    // numRuns at 25 to keep the suite under the 10% runtime budget.

    const safeIntArb = fc.integer({ min: -10000, max: 10000 });

    it("property: integer addition matches JS reference", () => {
        fc.assert(
            fc.property(safeIntArb, safeIntArb, (l, r) => {
                const result = compileAndGetExport(`let result = ${l} + ${r};`, "result");
                return result === l + r;
            }),
            { numRuns: 25 },
        );
    });

    it("property: integer multiplication matches JS reference", () => {
        fc.assert(
            fc.property(safeIntArb, safeIntArb, (l, r) => {
                const result = compileAndGetExport(`let result = ${l} * ${r};`, "result");
                return result === l * r;
            }),
            { numRuns: 25 },
        );
    });

    it("property: integer modulo matches JS reference (excluding zero divisor)", () => {
        fc.assert(
            fc.property(
                safeIntArb,
                safeIntArb.filter((n) => n !== 0),
                (l, r) => {
                    const result = compileAndGetExport(`let result = ${l} % ${r};`, "result");
                    return result === l % r;
                },
            ),
            { numRuns: 25 },
        );
    });

    it("property: integer division truncates toward zero (matches Math.trunc(l / r))", () => {
        // Regression coverage for the truncation-toward-zero semantics
        // exercised by the four fixed division tests above (-7/2 = -3, etc.).
        // Wrap each operand in parens so a negative literal does not collide
        // with the preceding operator (e.g. `5 / -2` would lex as `5 / -2`
        // but `(5) / (-2)` is unambiguous and matches the existing fixed-test
        // convention on this file).
        fc.assert(
            fc.property(
                safeIntArb,
                safeIntArb.filter((n) => n !== 0),
                (l, r) => {
                    const result = compileAndGetExport(`let result = (${l}) / (${r});`, "result");
                    return result === Math.trunc(l / r);
                },
            ),
            { numRuns: 25 },
        );
    });
});
