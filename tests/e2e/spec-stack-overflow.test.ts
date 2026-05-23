/**
 * End-to-end stack-overflow surface check (spec 09-error-handling §129-141).
 *
 * Deep non-tail recursion exhausts the JavaScript call stack, surfacing as
 * a runtime RangeError that Vibefun code cannot catch. This validates that
 * the failure reaches the user as a non-zero exit with a recognisable
 * call-stack error.
 *
 * Deliberately kept OUT of `spec-validation/` (which is gating): the exact
 * stderr wording and stack depth are Node/OS-version sensitive even with the
 * relaxed regex below, so a drift here should not fail the gating spec suite.
 * We assert only the stable signals (`RangeError`, /call stack/i) and avoid
 * pinning Node's exact "Maximum call stack size exceeded" phrasing, which can
 * change across runtime versions.
 */

import { describe, expect, it } from "vitest";

import { runSource, withOutput } from "./helpers.js";

describe("e2e stack overflow", () => {
    it("surfaces a RangeError when non-tail recursion exhausts the call stack", () => {
        // Non-tail-recursive: the `+ 1` keeps a frame alive per call, so no
        // engine can tail-call-optimise this away. 1,000,000 deep blows the
        // stack well before completing.
        const source = withOutput(
            `let rec deep = (n: Int): Int => if n == 0 then 0 else deep(n - 1) + 1;
let answer = deep(1000000);`,
            `String.fromInt(answer)`,
        );
        const result = runSource(source);

        expect(result.exitCode, `expected non-zero exit\nstdout:\n${result.stdout}`).not.toBe(0);
        expect(result.stderr).toContain("RangeError");
        // Node's exact phrasing ("Maximum call stack size exceeded") may change;
        // match the stable "call stack" fragment case-insensitively instead.
        expect(result.stderr).toMatch(/call stack/i);
    });
});
