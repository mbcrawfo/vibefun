/**
 * End-to-end tests for prefix `!` disambiguation via the CLI.
 */

import { describe, expect, it } from "vitest";

import { runSource, withOutput } from "./helpers.js";

describe("e2e prefix !", () => {
    it("dereferences a Ref<Int> and prints the value", () => {
        const source = withOutput(`let mut r = ref(42);`, `String.fromInt(!r)`);
        const result = runSource(source);
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe("42");
    });

    it("applies logical NOT to a Bool", () => {
        const source = withOutput(`let b = false;`, `String.fromBool(!b)`);
        const result = runSource(source);
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe("true");
    });

    it("uses prefix ! on the same scope for both Ref and Bool", () => {
        const source = withOutput(
            `
            let mut r = ref(7);
            let b = true;
            `,
            `String.fromInt(!r) & " " & String.fromBool(!b)`,
        );
        const result = runSource(source);
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe("7 false");
    });
});
