/**
 * Execution tests for user-defined type declarations.
 *
 * Exercises variant construction and pattern matching for user-declared
 * variants, type alias transparency, and generic record expansion through
 * the full compiler pipeline.
 */

import { describe, expect, it } from "vitest";

import { compileAndGetExport } from "./execution-test-helpers.js";

describe("user-defined variant types", () => {
    it("matches against a non-generic variant with nullary constructors", () => {
        const result = compileAndGetExport(
            `type Color = Red | Green | Blue;
            let c = Green;
            let result = match c {
                | Red => 1
                | Green => 2
                | Blue => 3
            };`,
            "result",
        );
        expect(result).toBe(2);
    });

    it("constructs and matches a generic variant with a single-arg constructor", () => {
        // Single-arg constructors avoid tupled-call desugaring concerns.
        const result = compileAndGetExport(
            `type Box<T> = Empty | Full(T);
            let b = Full(42);
            let value = match b {
                | Empty => 0
                | Full(v) => v
            };`,
            "value",
        );
        expect(result).toBe(42);
    });

    it("matches a generic variant covering every constructor", () => {
        // Exhaustiveness check: user-defined generic variant, full coverage.
        const result = compileAndGetExport(
            `type Status<T> = Pending | Active(T) | Done;
            let s = Active(7);
            let out = match s {
                | Pending => -1
                | Active(n) => n
                | Done => -2
            };`,
            "out",
        );
        expect(result).toBe(7);
    });

    it("rejects an unguardedly recursive alias at compile time", () => {
        expect(() => compileAndGetExport(`type Bad = Bad;`, "_")).toThrow("VF4027");
    });
});

describe("type aliases", () => {
    it("treats `type UserId = Int` as transparently Int", () => {
        const result = compileAndGetExport(
            `type UserId = Int;
            let id: UserId = 42;
            let doubled = id * 2;`,
            "doubled",
        );
        expect(result).toBe(84);
    });

    it("transitively expands a chain of aliases", () => {
        // Regression test for CodeRabbit review: expansion must be transitive
        // so `type A = B; type B = Int` still lets arithmetic work on A.
        const result = compileAndGetExport(
            `type B = Int;
            type A = B;
            let x: A = 10;
            let doubled = x * 2;`,
            "doubled",
        );
        expect(result).toBe(20);
    });
});

describe("generic record types", () => {
    it("expands Box<Int> to { value: Int } for field access", () => {
        const result = compileAndGetExport(
            `type Box<T> = { value: T };
            let b: Box<Int> = { value: 42 };
            let x = b.value;`,
            "x",
        );
        expect(result).toBe(42);
    });
});
