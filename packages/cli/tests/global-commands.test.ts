/**
 * E2E tests for global CLI commands (--version, --help)
 */

import { describe, expect, it } from "vitest";

import { fixture, runCli } from "./helpers/index.js";

describe("CLI E2E: Global Commands", () => {
    it("--version outputs version string", () => {
        const result = runCli(["--version"]);

        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it("--help outputs usage information", () => {
        const result = runCli(["--help"]);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain("Usage:");
        expect(result.stdout).toContain("vibefun");
        expect(result.stdout).toContain("compile");
    });

    it("compile --help outputs command-specific help", () => {
        const result = runCli(["compile", "--help"]);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain("--output");
        expect(result.stdout).toContain("--emit");
    });

    it("returns exit code 2 for unknown commands", () => {
        const result = runCli(["foobar"]);

        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain("Unknown command");
    });

    it("--color flag enables ANSI color output", () => {
        const result = runCli(["compile", fixture("type-error.vf"), "--color"], {
            env: { NO_COLOR: "" },
        });

        expect(result.exitCode).toBe(1);
        // ANSI escape codes should be present when --color is used
        expect(result.stderr).toMatch(/\x1b\[/);
    });
});
