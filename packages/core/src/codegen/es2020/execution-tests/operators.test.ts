/**
 * Operator execution tests for ES2020 code generator
 *
 * Tests comparison and boolean operators.
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { compileAndGetExport } from "./execution-test-helpers.js";

describe("comparison operators", () => {
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
});

describe("boolean operators", () => {
    it("should handle boolean operations", () => {
        const r1 = compileAndGetExport(`let result = true && false;`, "result");
        const r2 = compileAndGetExport(`let result = true || false;`, "result");
        const r3 = compileAndGetExport(`let result = !true;`, "result");

        expect(r1).toBe(false);
        expect(r2).toBe(true);
        expect(r3).toBe(false);
    });
});

describe("Properties", () => {
    // Each property run spawns the full pipeline + vm execution. Cap
    // numRuns at 25 — operator semantics have a large input space and
    // benefit from broad sampling.

    const safeIntArb = fc.integer({ min: -1000, max: 1000 });

    it("property: < matches JS reference (cap numRuns 25 — spawns JS)", () => {
        fc.assert(
            fc.property(safeIntArb, safeIntArb, (l, r) => {
                const result = compileAndGetExport(`let result = ${l} < ${r};`, "result");
                return result === l < r;
            }),
            { numRuns: 25 },
        );
    });

    // Boolean operators have only 4 input combinations (true/true, true/false,
    // false/true, false/false), so numRuns: 4 is enough to cover every case
    // and avoids re-running the same compile-and-execute 6× for no signal.
    it("property: && matches JS reference for boolean operands (cap numRuns 4 — full enumeration)", () => {
        fc.assert(
            fc.property(fc.boolean(), fc.boolean(), (l, r) => {
                const result = compileAndGetExport(`let result = ${l} && ${r};`, "result");
                return result === (l && r);
            }),
            { numRuns: 4 },
        );
    });

    it("property: || matches JS reference for boolean operands (cap numRuns 4 — full enumeration)", () => {
        fc.assert(
            fc.property(fc.boolean(), fc.boolean(), (l, r) => {
                const result = compileAndGetExport(`let result = ${l} || ${r};`, "result");
                return result === (l || r);
            }),
            { numRuns: 4 },
        );
    });
});
