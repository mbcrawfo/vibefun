/**
 * Miscellaneous execution tests for ES2020 code generator
 *
 * Tests edge cases like empty modules and string concatenation.
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { compileAndGetExport, compileAndRunSucceeds } from "./execution-test-helpers.js";

describe("empty module", () => {
    it("should handle empty module", () => {
        expect(compileAndRunSucceeds("")).toBe(true);
    });
});

describe("string operations", () => {
    it("should handle string concatenation", () => {
        const result = compileAndGetExport(`let result = "hello" & " " & "world";`, "result");
        expect(result).toBe("hello world");
    });
});

describe("empty block", () => {
    it("should evaluate empty block to unit", () => {
        const result = compileAndGetExport(`let x = {};`, "x");
        expect(result).toBeUndefined();
    });
});

describe("while loop", () => {
    it("should type-check and run a while-false loop (exercises wildcard let)", () => {
        // The while desugarer emits `let _ = body in loop()`. Until 1.5,
        // the typechecker rejected wildcard let bindings. Also proves the
        // desugared loop actually terminates at runtime, not just that it
        // compiles.
        const result = compileAndGetExport(
            `let run = () => { while false { }; };
             let result = run();`,
            "result",
        );
        expect(result).toBeUndefined();
    });
});

describe("Properties", () => {
    // Each run spawns the full pipeline + vm.runInContext. Cap numRuns at
    // 10 — semantic-preservation properties are inherently expensive here.

    // Safe ASCII content excluding characters that would break the source
    // string after embedding in vibefun source. The vibefun lexer treats
    // backslash, double-quote, newline, and tab as escapes (per source-arb).
    const safeStrArb = fc.stringMatching(/^[a-zA-Z0-9 _]{0,8}$/);

    it("property: string concatenation matches JS string concatenation", () => {
        fc.assert(
            fc.property(safeStrArb, safeStrArb, (a, b) => {
                const result = compileAndGetExport(`let result = "${a}" & "${b}";`, "result");
                return result === a + b;
            }),
            { numRuns: 10 },
        );
    });

    it("property: trivial integer let-binding compiles and runs without throwing", () => {
        const safeIntArb = fc.integer({ min: 0, max: 1000 });
        fc.assert(
            fc.property(safeIntArb, (n) => {
                return compileAndRunSucceeds(`let x = ${n};`);
            }),
            { numRuns: 10 },
        );
    });
});
