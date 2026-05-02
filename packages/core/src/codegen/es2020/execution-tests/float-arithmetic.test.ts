/**
 * Float arithmetic execution tests for ES2020 code generator
 *
 * Verifies that polymorphic numeric operators (+, -, *, %, <, <=, >, >=, unary -)
 * accept Float operands through the full pipeline (lexer → parser → desugarer →
 * typechecker → codegen) and produce the expected runtime values.
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { compileAndGetExport } from "./execution-test-helpers.js";

describe("Float arithmetic (polymorphic numeric operators)", () => {
    it("adds two floats", () => {
        const result = compileAndGetExport(`let result = 1.5 + 2.25;`, "result");
        expect(result).toBe(3.75);
    });

    it("subtracts two floats", () => {
        const result = compileAndGetExport(`let result = 5.5 - 1.25;`, "result");
        expect(result).toBe(4.25);
    });

    it("multiplies two floats", () => {
        const result = compileAndGetExport(`let result = 1.5 * 2.0;`, "result");
        expect(result).toBe(3.0);
    });

    it("computes modulo of two floats", () => {
        const result = compileAndGetExport(`let result = 5.5 % 2.0;`, "result");
        expect(result).toBe(1.5);
    });

    it("negates a float literal", () => {
        const result = compileAndGetExport(`let result = -3.14;`, "result");
        expect(result).toBe(-3.14);
    });

    it("chains float arithmetic operations", () => {
        const result = compileAndGetExport(`let result = 1.5 + 2.5 * 2.0 - 0.5;`, "result");
        expect(result).toBe(6.0);
    });
});

describe("Float comparison (polymorphic comparison operators)", () => {
    it("returns Bool for Float less-than", () => {
        const result = compileAndGetExport(`let result = 1.5 < 2.5;`, "result");
        expect(result).toBe(true);
    });

    it("returns Bool for Float less-or-equal", () => {
        const result = compileAndGetExport(`let result = 2.5 <= 2.5;`, "result");
        expect(result).toBe(true);
    });

    it("returns Bool for Float greater-than", () => {
        const result = compileAndGetExport(`let result = 2.5 > 1.5;`, "result");
        expect(result).toBe(true);
    });

    it("returns Bool for Float greater-or-equal", () => {
        const result = compileAndGetExport(`let result = 2.5 >= 2.6;`, "result");
        expect(result).toBe(false);
    });

    it("compares Int operands to Bool (lock existing Int behaviour)", () => {
        const result = compileAndGetExport(`let result = 3 < 4;`, "result");
        expect(result).toBe(true);
    });
});

describe("Infinity / NaN arithmetic (spec section 09)", () => {
    it("produces Infinity when adding to Infinity", () => {
        const result = compileAndGetExport(`let x = 1.0 / 0.0; let result = x + 1.0;`, "result");
        expect(result).toBe(Infinity);
    });

    it("compares Infinity values correctly", () => {
        const result = compileAndGetExport(`let x = 1.0 / 0.0; let result = x > 1.0e308;`, "result");
        expect(result).toBe(true);
    });
});

describe("Properties", () => {
    // Each property run spawns the full pipeline + vm.runInContext. Cap
    // numRuns at 25 — float arithmetic is the most valuable per-run signal
    // since it has the largest input space.

    // Generate finite floats whose decimal printout the lexer accepts: limit
    // to ~6 digits in [1, 100] so the literal is unambiguous and round-trips
    // cleanly through Number → string → vibefun → emitted JS.
    const safeFloatArb = fc
        .double({ min: 1.0, max: 100.0, noNaN: true, noDefaultInfinity: true })
        .map((n) => Math.round(n * 1000) / 1000);

    it("property: float addition matches JS reference (cap numRuns 25 — spawns JS)", () => {
        fc.assert(
            fc.property(safeFloatArb, safeFloatArb, (l, r) => {
                const result = compileAndGetExport(`let result = ${l.toFixed(3)} + ${r.toFixed(3)};`, "result");
                return Math.abs((result as number) - (l + r)) < 1e-9;
            }),
            { numRuns: 25 },
        );
    });

    it("property: float multiplication matches JS reference (cap numRuns 25 — spawns JS)", () => {
        fc.assert(
            fc.property(safeFloatArb, safeFloatArb, (l, r) => {
                const result = compileAndGetExport(`let result = ${l.toFixed(3)} * ${r.toFixed(3)};`, "result");
                return Math.abs((result as number) - l * r) < 1e-6;
            }),
            { numRuns: 25 },
        );
    });
});
