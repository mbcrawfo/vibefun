/**
 * Harness smoke test — proves the e2e harness itself is wired correctly
 * end-to-end: the CLI binary is built, stdin-piped source compiles and
 * runs, `@vibefun/std` resolves from the default cwd, and the child
 * process's stdout/stderr/exit-code are captured verbatim.
 */

import { describe, expect, it } from "vitest";

import { runSource, withOutput } from "./helpers.js";

describe("e2e smoke", () => {
    it("compiles and runs a minimal program that prints stdlib output", () => {
        const source = withOutput(`let answer = 42;`, `String.fromInt(answer)`);
        const result = runSource(source);
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe("42");
    });

    it("resolves @vibefun/std at runtime from the default cwd", () => {
        // Independently of whatever the repo cwd is configured to, the
        // spawned `node --input-type=module` must find @vibefun/std via the
        // root node_modules symlink.
        const source = withOutput(`let x = String.fromInt(7);`, `x`);
        const result = runSource(source);
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe("7");
    });

    it("surfaces compile errors through the CLI exit code", () => {
        const source = `let x: Int = "not an int";`;
        const result = runSource(source);
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr.length).toBeGreaterThan(0);
    });
});
