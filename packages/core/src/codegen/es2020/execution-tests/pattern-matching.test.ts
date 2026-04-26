/**
 * Pattern matching execution tests for ES2020 code generator
 *
 * Tests basic pattern matching with literals, wildcards, and variable bindings.
 */

import * as fc from "fast-check";
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

describe("Properties", () => {
    // Each property run spawns the full pipeline + vm execution. Cap
    // numRuns at 10 — pattern execution programs are expensive.

    const safeIntArb = fc.integer({ min: -1000, max: 1000 });

    it("property: variable pattern binds the scrutinee value (cap numRuns 10 — spawns JS)", () => {
        // match x { | n => n } returns x. The reference matcher is identity.
        fc.assert(
            fc.property(safeIntArb, (x) => {
                const result = compileAndGetExport(
                    `let id = (a) => match a { | n => n };
                     let result = id(${x});`,
                    "result",
                );
                return result === x;
            }),
            { numRuns: 10 },
        );
    });

    it("property: literal-pattern dispatch matches the reference matcher (cap numRuns 10 — spawns JS)", () => {
        // match x { 0 => "zero" | _ => "other" } — reference matcher classifies
        // 0 to "zero" and any other int to "other".
        fc.assert(
            fc.property(safeIntArb, (x) => {
                const expected = x === 0 ? "zero" : "other";
                const result = compileAndGetExport(
                    `let classify = (a) => match a {
                         | 0 => "zero"
                         | _ => "other"
                     };
                     let result = classify(${x});`,
                    "result",
                );
                return result === expected;
            }),
            { numRuns: 10 },
        );
    });
});
