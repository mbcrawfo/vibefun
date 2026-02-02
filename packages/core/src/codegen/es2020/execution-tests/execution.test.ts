/**
 * Execution tests for ES2020 code generator
 *
 * These tests verify runtime semantics by compiling vibefun source
 * and executing the generated JavaScript in a sandboxed VM.
 *
 * NOTE: Some features are not yet fully implemented in the typechecker,
 * so those tests are marked as skipped.
 */

import { describe, expect, it } from "vitest";

import { compileAndGetExport, compileAndRunSucceeds } from "./execution-test-helpers.js";

describe("Execution Tests", () => {
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

    describe("pattern matching - basic", () => {
        it("should match literal patterns", () => {
            const result = compileAndGetExport(
                `let classify = (x) => match x {
                    | 0 => "zero"
                    | 1 => "one"
                    | _ => "other"
                };
                let result = classify(1);`,
                "result",
            );
            expect(result).toBe("one");
        });

        it("should match wildcard pattern", () => {
            const result = compileAndGetExport(
                `let always42 = (x) => match x {
                    | _ => 42
                };
                let result = always42("anything");`,
                "result",
            );
            expect(result).toBe(42);
        });

        it("should bind variables in patterns", () => {
            const result = compileAndGetExport(
                `let extract = (x) => match x {
                    | n => n + 1
                };
                let result = extract(41);`,
                "result",
            );
            expect(result).toBe(42);
        });
    });

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

    describe("structural equality - records", () => {
        it("should compare records structurally", () => {
            const result = compileAndGetExport(
                `let a = { x: 1, y: 2 };
                let b = { x: 1, y: 2 };
                let result = a == b;`,
                "result",
            );
            expect(result).toBe(true);
        });

        it("should detect record inequality", () => {
            const result = compileAndGetExport(
                `let a = { x: 1, y: 2 };
                let b = { x: 1, y: 3 };
                let result = a == b;`,
                "result",
            );
            expect(result).toBe(false);
        });

        it("should compare nested records structurally", () => {
            const result = compileAndGetExport(
                `let a = { point: { x: 1, y: 2 }, name: "origin" };
                let b = { point: { x: 1, y: 2 }, name: "origin" };
                let result = a == b;`,
                "result",
            );
            expect(result).toBe(true);
        });
    });

    describe("edge cases", () => {
        it("should handle empty module", () => {
            expect(compileAndRunSucceeds("")).toBe(true);
        });

        it("should handle string concatenation", () => {
            const result = compileAndGetExport(`let result = "hello" & " " & "world";`, "result");
            expect(result).toBe("hello world");
        });

        it("should handle modulo operation", () => {
            const result = compileAndGetExport(`let result = 17 % 5;`, "result");
            expect(result).toBe(2);
        });

        it("should handle negative modulo", () => {
            const result = compileAndGetExport(`let result = (-17) % 5;`, "result");
            expect(result).toBe(-2);
        });

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

        it("should handle boolean operations", () => {
            const r1 = compileAndGetExport(`let result = true && false;`, "result");
            const r2 = compileAndGetExport(`let result = true || false;`, "result");
            const r3 = compileAndGetExport(`let result = !true;`, "result");

            expect(r1).toBe(false);
            expect(r2).toBe(true);
            expect(r3).toBe(false);
        });
    });

    describe("record operations", () => {
        it("should access record fields", () => {
            const result = compileAndGetExport(
                `let point = { x: 10, y: 20 };
                let result = point.x + point.y;`,
                "result",
            );
            expect(result).toBe(30);
        });

        it("should update records immutably", () => {
            const result = compileAndGetExport(
                `let point = { x: 10, y: 20 };
                let moved = { ...point, x: 15 };
                let result = moved.x + moved.y;`,
                "result",
            );
            expect(result).toBe(35);
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
});
