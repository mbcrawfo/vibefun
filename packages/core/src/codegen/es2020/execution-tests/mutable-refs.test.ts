/**
 * Execution tests for mutable references.
 *
 * Verifies that `let mut x = ref(v)` produces a single-wrapped ref object
 * at runtime (no double-wrapping via `{ $value: { $value: v } }`) and that
 * nested `let mut` inside lambdas works end-to-end.
 */

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
        // { x := 1; x := 2; !x } must run both assignments in order,
        // then evaluate the dereference.
        const result = compileAndGetExport(
            `let mut x = ref(0);
            let final = {
                x := 1;
                x := 2;
                !x;
            };`,
            "final",
        );
        expect(result).toBe(2);
    });
});
