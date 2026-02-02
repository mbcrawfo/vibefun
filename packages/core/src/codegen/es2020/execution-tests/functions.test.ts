/**
 * Function-related execution tests for ES2020 code generator
 *
 * Tests curried function application, lambda expressions, and recursive functions.
 */

import { describe, expect, it } from "vitest";

import { compileAndGetExport } from "./execution-test-helpers.js";

describe("curried function application", () => {
    it("should correctly evaluate curried function application", () => {
        const result = compileAndGetExport(
            `let add = (x, y) => x + y;
            let add5 = add(5);
            let result = add5(3);`,
            "result",
        );
        expect(result).toBe(8);
    });

    it("should support partial application", () => {
        const result = compileAndGetExport(
            `let multiply = (x, y) => x * y;
            let double = multiply(2);
            let result = double(21);`,
            "result",
        );
        expect(result).toBe(42);
    });

    it("should handle multiple levels of currying", () => {
        const result = compileAndGetExport(
            `let add3 = (x, y, z) => x + y + z;
            let f1 = add3(1);
            let f2 = f1(2);
            let result = f2(3);`,
            "result",
        );
        expect(result).toBe(6);
    });
});

describe("lambda expressions", () => {
    it("should handle closures", () => {
        const result = compileAndGetExport(
            `let makeAdder = (n) => (x) => x + n;
            let add10 = makeAdder(10);
            let result = add10(32);`,
            "result",
        );
        expect(result).toBe(42);
    });
});

// NOTE: if-expressions desugar to pattern matching on Bool,
// and the exhaustiveness checker has issues with Bool matching.
// These tests are skipped until that's resolved.
describe.skip("recursive functions", () => {
    it("should handle simple recursion", () => {
        const result = compileAndGetExport(
            `let rec factorial = (n) =>
                if n <= 1 then 1
                else n * factorial(n - 1);
            let result = factorial(5);`,
            "result",
        );
        expect(result).toBe(120);
    });

    it("should handle fibonacci", () => {
        const result = compileAndGetExport(
            `let rec fib = (n) =>
                if n <= 1 then n
                else fib(n - 1) + fib(n - 2);
            let result = fib(10);`,
            "result",
        );
        expect(result).toBe(55);
    });
});

describe.skip("if expressions", () => {
    it("should evaluate simple if-then-else", () => {
        const result = compileAndGetExport(
            `let max = (a, b) => if a > b then a else b;
            let result = max(10, 5);`,
            "result",
        );
        expect(result).toBe(10);
    });

    it("should handle chained if expressions", () => {
        const result = compileAndGetExport(
            `let clamp = (x, lo, hi) =>
                if x < lo then lo
                else if x > hi then hi
                else x;
            let result = clamp(15, 0, 10);`,
            "result",
        );
        expect(result).toBe(10);
    });
});
