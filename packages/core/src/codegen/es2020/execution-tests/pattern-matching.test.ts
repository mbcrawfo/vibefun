/**
 * Pattern matching execution tests for ES2020 code generator
 *
 * Tests basic pattern matching with literals, wildcards, and variable bindings.
 */

import { describe, expect, it } from "vitest";

import { compileAndGetExport } from "./execution-test-helpers.js";

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
