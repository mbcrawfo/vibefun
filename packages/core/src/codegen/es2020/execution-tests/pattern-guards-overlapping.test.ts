/**
 * Pattern guard execution tests — overlapping patterns with multiple guards.
 *
 * Validates the runtime semantics the spec pins down in
 * `docs/spec/12-compilation/desugaring.md` §Pattern Guards (audit 12 F-11,
 * F-38):
 *
 *   - Guards are evaluated top-to-bottom, only after their pattern matches.
 *   - A pattern that matches but whose guard fails does NOT end the match —
 *     evaluation falls through to the next arm (even when that arm shares the
 *     same constructor shape). A failing guard must never trigger a
 *     non-exhaustive panic if a later arm would match.
 *
 * These are full-pipeline tests: each source is compiled (lexer → parser →
 * desugarer → typechecker → codegen) and the generated JS is run in the VM
 * sandbox via `compileAndGetExport`.
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { compileAndGetExport } from "./execution-test-helpers.js";

// Two arms share the shape `[x, ..._]` and differ only by guard — the spec's
// "overlapping patterns" case expressed over Cons cells. Shared by the F-11
// (selection) and F-38 (fallthrough) describe blocks below.
const CLASSIFY_LIST_SOURCE = `let classify = (xs: List<Int>) => match xs {
    | [x, ..._] when x > 10 => "big"
    | [x, ..._] when x > 0 => "small"
    | _ => "other"
};`;

describe("pattern guards — overlapping list patterns (F-11)", () => {
    it("selects the second guarded arm when the first guard fails (head = 5)", () => {
        // 5 > 10 is false, so the first arm is skipped; 5 > 0 is true.
        const result = compileAndGetExport(`${CLASSIFY_LIST_SOURCE}\nlet result = classify([5, 99]);`, "result");
        expect(result).toBe("small");
    });

    it("selects the first guarded arm when its guard succeeds (head = 15)", () => {
        const result = compileAndGetExport(`${CLASSIFY_LIST_SOURCE}\nlet result = classify([15, 99]);`, "result");
        expect(result).toBe("big");
    });

    it("does not reach the wildcard when an earlier guarded arm matches", () => {
        // A single-element list still matches `[x, ..._]` (rest binds to []).
        const result = compileAndGetExport(`${CLASSIFY_LIST_SOURCE}\nlet result = classify([5]);`, "result");
        expect(result).toBe("small");
    });
});

describe("pattern guards — fallthrough on guard failure (F-38)", () => {
    it("falls through to a later arm when every guard on the matched shape fails", () => {
        // head = -5 matches both `[x, ..._]` arms but fails both guards. The
        // matcher must continue to the wildcard rather than panic.
        const result = compileAndGetExport(`${CLASSIFY_LIST_SOURCE}\nlet result = classify([-5, 99]);`, "result");
        expect(result).toBe("other");
    });

    it("falls to the wildcard when the constructor itself does not match (empty list)", () => {
        const result = compileAndGetExport(`${CLASSIFY_LIST_SOURCE}\nlet result = classify([]);`, "result");
        expect(result).toBe("other");
    });
});

describe("pattern guards — overlapping variant patterns (F-11 / F-38)", () => {
    // Mirrors the worked example in desugaring.md §Pattern Guards: two guarded
    // `Has(x)` arms followed by an unguarded `Has(_)` catch-all. Guard failure
    // on the first two must fall through to the unguarded `Has` arm — not skip
    // straight to `Empty` and not panic. A user-defined variant is used rather
    // than the stdlib `Option`, because the built-in constructors compile to an
    // `import { Some } from "@vibefun/std"` that the VM sandbox can't load (see
    // execution-test-helpers `stripExports`, which only removes exports).
    const describeBox = `type Box = Has(Int) | Empty;
    let describe = (o: Box) => match o {
        | Has(x) when x > 10 => "big"
        | Has(x) when x > 0 => "small"
        | Has(_) => "nonpositive"
        | Empty => "nothing"
    };`;

    it("picks the first guard that holds (Has(15) => big)", () => {
        const result = compileAndGetExport(`${describeBox}\nlet result = describe(Has(15));`, "result");
        expect(result).toBe("big");
    });

    it("skips a failing guard for a passing one on the same constructor (Has(5) => small)", () => {
        const result = compileAndGetExport(`${describeBox}\nlet result = describe(Has(5));`, "result");
        expect(result).toBe("small");
    });

    it("falls through both failing guards to the unguarded Has arm (Has(-1) => nonpositive)", () => {
        const result = compileAndGetExport(`${describeBox}\nlet result = describe(Has(-1));`, "result");
        expect(result).toBe("nonpositive");
    });

    it("matches the Empty arm unguarded", () => {
        const result = compileAndGetExport(`${describeBox}\nlet result = describe(Empty);`, "result");
        expect(result).toBe("nothing");
    });
});

describe("Properties", () => {
    // Each run spawns the full pipeline + vm execution, so cap numRuns at 10 —
    // see pattern-matching.test.ts for the same budget.
    const safeIntArb = fc.integer({ min: -1000, max: 1000 });

    it("property: overlapping guarded variant arms match the reference matcher (cap numRuns 10 — spawns JS)", () => {
        const reference = (x: number): string => (x > 10 ? "big" : x > 0 ? "small" : "nonpositive");
        fc.assert(
            fc.property(safeIntArb, (x) => {
                const result = compileAndGetExport(
                    `type Box = Has(Int) | Empty;
                     let describe = (o: Box) => match o {
                         | Has(x) when x > 10 => "big"
                         | Has(x) when x > 0 => "small"
                         | Has(_) => "nonpositive"
                         | Empty => "nothing"
                     };
                     let result = describe(Has(${x}));`,
                    "result",
                );
                return result === reference(x);
            }),
            { numRuns: 10 },
        );
    });
});
