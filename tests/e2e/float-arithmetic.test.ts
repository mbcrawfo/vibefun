/**
 * End-to-end Float arithmetic tests.
 *
 * Compiles and runs Vibefun programs that exercise polymorphic numeric
 * operators on Float operands through the real CLI, asserting the observed
 * stdout. Complements the unit and integration tests by proving the full
 * build/runtime chain — including stdlib resolution for `String.fromFloat`
 * — handles Float operators.
 */

import { describe, expect, it } from "vitest";

import { runSource, withOutput } from "./helpers.js";

describe("e2e float arithmetic", () => {
    it("adds two float literals", () => {
        const source = withOutput(`let sum = 1.5 + 2.25;`, `String.fromFloat(sum)`);
        const result = runSource(source);
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe("3.75");
    });

    it("runs the full polymorphic numeric surface on floats", () => {
        const source = withOutput(
            `
            let a = 3.5 - 1.0;
            let b = 2.0 * 2.5;
            let c = 7.5 % 2.0;
            let d = -4.25;
            let lt = 1.5 < 2.5;
            let total = a + b + c + d;
            `,
            `String.fromFloat(total) & " " & String.fromBool(lt)`,
        );
        const result = runSource(source);
        expect(result.exitCode).toBe(0);
        // 2.5 + 5.0 + 1.5 + (-4.25) = 4.75
        expect(result.stdout.trim()).toBe("4.75 true");
    });

    it("rejects mixing Int and Float operands at compile time", () => {
        const source = `let bad = 1 + 2.5;`;
        const result = runSource(source);
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr.length).toBeGreaterThan(0);
    });
});
