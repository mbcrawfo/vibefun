/**
 * Function-related execution tests for ES2020 code generator
 *
 * Tests curried function application, lambda expressions, and recursive functions.
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { compileAndGetExport, compileAndRunSucceeds } from "./execution-test-helpers.js";

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

    it("should evaluate multi-argument calls via auto-currying", () => {
        // f(a, b) desugars to f(a)(b)
        const result = compileAndGetExport(
            `let add = (x, y) => x + y;
            let result = add(2, 3);`,
            "result",
        );
        expect(result).toBe(5);
    });

    it("should evaluate three-argument calls", () => {
        const result = compileAndGetExport(
            `let add3 = (x, y, z) => x + y + z;
            let result = add3(1, 2, 3);`,
            "result",
        );
        expect(result).toBe(6);
    });

    it("should evaluate zero-argument function call", () => {
        // f() desugars to f(unit); () => 42 accepts unit
        const result = compileAndGetExport(
            `let answer = () => 42;
            let result = answer();`,
            "result",
        );
        expect(result).toBe(42);
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

    it("should compile zero-parameter lambda", () => {
        // Definition-only: invocation requires multi-arg call desugaring.
        expect(compileAndRunSucceeds(`let noop = () => 42;`)).toBe(true);
    });
});

describe("recursive functions", () => {
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

describe("lambda parameter destructuring", () => {
    it("should destructure a record param to pick a field", () => {
        const result = compileAndGetExport(
            `let getX = ({ x, y }: { x: Int, y: Int }) => x;
            let result = getX({ x: 42, y: 10 });`,
            "result",
        );
        expect(result).toBe(42);
    });

    it("should destructure a record param and combine fields", () => {
        const result = compileAndGetExport(
            `let sum = ({ x, y }: { x: Int, y: Int }) => x + y;
            let result = sum({ x: 17, y: 25 });`,
            "result",
        );
        expect(result).toBe(42);
    });

    it("should destructure a nested record param", () => {
        const result = compileAndGetExport(
            `let getAge = ({ profile }: { profile: { age: Int } }) =>
                match profile { | { age } => age };
            let result = getAge({ profile: { age: 42 } });`,
            "result",
        );
        expect(result).toBe(42);
    });

    it("should mix a regular and a destructured param", () => {
        const result = compileAndGetExport(
            `let offsetX = (base: Int, { x, y }: { x: Int, y: Int }) => base + x;
            let result = offsetX(10, { x: 32, y: 99 });`,
            "result",
        );
        expect(result).toBe(42);
    });

    it("should destructure a tuple-literal argument", () => {
        // Tuple destructuring in a lambda param: ((a, b)) => …
        const result = compileAndGetExport(
            `let fst = ((a, b): (Int, Int)) => a;
            let result = fst((42, 99));`,
            "result",
        );
        expect(result).toBe(42);
    });
});

describe("explicit type parameters on lambdas", () => {
    it("should compile and apply <T>(x: T): T => x at multiple instantiations", () => {
        // Full pipeline regression: parser must accept the <T> prefix, the
        // desugarer must drop it, and the typechecker must let-generalize the
        // resulting lambda so id can be applied to both Int and String.
        const result = compileAndGetExport(
            `let id = <T>(x: T): T => x;
            let _ignored = id(42);
            let result = id("hello");`,
            "result",
        );
        expect(result).toBe("hello");
    });

    it("should compile and apply <A, B>(a: A, b: B): A => a", () => {
        const result = compileAndGetExport(
            `let first = <A, B>(a: A, b: B): A => a;
            let result = first(42, "hello");`,
            "result",
        );
        expect(result).toBe(42);
    });
});

describe("if expressions", () => {
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

describe("Properties", () => {
    // Each property run spawns the full pipeline + vm execution. Cap
    // numRuns at 10 — full-pipeline lambda programs are the heaviest.

    const safeIntArb = fc.integer({ min: -1000, max: 1000 });

    it("property: identity lambda is identity at runtime (cap numRuns 10 — spawns JS)", () => {
        fc.assert(
            fc.property(safeIntArb, (x) => {
                const result = compileAndGetExport(
                    `let id = (n) => n;
                     let result = id(${x});`,
                    "result",
                );
                return result === x;
            }),
            { numRuns: 10 },
        );
    });

    it("property: a closure capturing n returns x + n (cap numRuns 10 — spawns JS)", () => {
        fc.assert(
            fc.property(safeIntArb, safeIntArb, (n, x) => {
                const result = compileAndGetExport(
                    `let makeAdder = (a) => (b) => a + b;
                     let f = makeAdder(${n});
                     let result = f(${x});`,
                    "result",
                );
                return result === n + x;
            }),
            { numRuns: 10 },
        );
    });

    it("property: simple lambda program compiles and runs without throwing (cap numRuns 10)", () => {
        fc.assert(
            fc.property(safeIntArb, (x) => {
                return compileAndRunSucceeds(`let f = (a) => a + 1; let _r = f(${x});`);
            }),
            { numRuns: 10 },
        );
    });
});
