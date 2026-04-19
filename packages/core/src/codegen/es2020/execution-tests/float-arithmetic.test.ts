/**
 * Float arithmetic execution tests for ES2020 code generator
 *
 * Verifies that polymorphic numeric operators (+, -, *, %, <, <=, >, >=, unary -)
 * accept Float operands through the full pipeline (lexer → parser → desugarer →
 * typechecker → codegen) and produce the expected runtime values.
 */

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
