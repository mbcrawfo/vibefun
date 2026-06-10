/**
 * Execution tests for the `panic` builtin.
 *
 * [BUG: VF-FC-0006] `panic` maps to the gated $panic runtime helper, which
 * throws a JS Error with the supplied message (09-error-handling.md).
 */

import { describe, expect, it } from "vitest";

import { compileAndRun, compileToJs } from "./execution-test-helpers.js";

describe("panic builtin", () => {
    it("throws an Error with the supplied message", () => {
        expect(() => compileAndRun(`let _crash = unsafe { panic("boom") };`)).toThrowError(new Error("boom"));
    });

    it("emits the gated $panic helper and maps the builtin to it", () => {
        const js = compileToJs(`let _crash = unsafe { panic("boom") };`);
        expect(js).toContain("const $panic = (msg) => { throw new Error(msg); };");
        expect(js).toContain('$panic("boom")');
    });

    it("does not emit the helper when panic is unused", () => {
        const js = compileToJs(`let x = 1;`);
        expect(js).not.toContain("$panic");
    });

    it("works when panic is used as a first-class value", () => {
        expect(() =>
            compileAndRun(`let crash = unsafe { panic };
let _ = crash("deferred");`),
        ).toThrowError(new Error("deferred"));
    });
});
