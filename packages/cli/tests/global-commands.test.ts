/**
 * E2E tests for global CLI commands (--version, --help)
 */

import { describe, expect, it } from "vitest";

import { runCli } from "./helpers/index.js";

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
});
