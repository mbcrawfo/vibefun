/**
 * Execution tests for mutable references.
 *
 * Verifies that `let mut x = ref(v)` produces a single-wrapped ref object
 * at runtime (no double-wrapping via `{ $value: { $value: v } }`) and that
 * nested `let mut` inside lambdas works end-to-end.
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { compileAndGetExport, compileToJs } from "./execution-test-helpers.js";

describe("mutable references", () => {
    it("top-level let mut + deref returns the underlying value", () => {
        const result = compileAndGetExport(
            `let mut x = ref(10);
            let deref = !x;`,
            "deref",
        );
        expect(result).toBe(10);
    });

    it("does not double-wrap a top-level let mut ref", () => {
        const js = compileToJs(`let mut x = ref(10);`);
        expect(js).not.toContain("{ $value: { $value:");
        expect(js).toContain("let x = ref(10)");
    });

    it("does not double-wrap a nested let mut inside a lambda", () => {
        const js = compileToJs(
            `let makeCounter = () => {
                let mut c = ref(0);
                c;
            };`,
        );
        expect(js).not.toContain("{ $value: { $value:");
        expect(js).toContain("let c = ref(0)");
    });

    it("nested let mut inside a lambda typechecks and runs", () => {
        const result = compileAndGetExport(
            `let makeRef = () => {
                let mut c = ref(42);
                c;
            };
            let r = makeRef();
            let deref = !r;`,
            "deref",
        );
        expect(result).toBe(42);
    });

    it("runs non-let block statements for their side effects before the final expression", () => {
        // Both assignments must execute in order: the second reads the
        // first's result via `!x + 1`, so a dropped or reordered first
        // statement would produce `1` (or `NaN`), not `2`.
        const result = compileAndGetExport(
            `let mut x = ref(0);
            let final = {
                x := 1;
                x := !x + 1;
                !x;
            };`,
            "final",
        );
        expect(result).toBe(2);
    });
});

describe("Properties", () => {
    // Each property run spawns the full pipeline + vm execution. Cap
    // numRuns at 10 — ref/deref round-trip is the canonical property here.

    const safeIntArb = fc.integer({ min: -1000, max: 1000 });

    it("property: ref/deref round-trip preserves any int value (cap numRuns 10 — spawns JS)", () => {
        fc.assert(
            fc.property(safeIntArb, (x) => {
                const result = compileAndGetExport(
                    `let mut r = ref(${x});
                     let result = !r;`,
                    "result",
                );
                return result === x;
            }),
            { numRuns: 10 },
        );
    });

    it("property: assignment + deref returns the assigned value (cap numRuns 10 — spawns JS)", () => {
        fc.assert(
            fc.property(safeIntArb, safeIntArb, (initial, assigned) => {
                const result = compileAndGetExport(
                    `let mut r = ref(${initial});
                     let final = {
                        r := ${assigned};
                        !r;
                     };`,
                    "final",
                );
                return result === assigned;
            }),
            { numRuns: 10 },
        );
    });
});
