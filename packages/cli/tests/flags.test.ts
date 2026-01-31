/**
 * E2E tests for CLI flags (--verbose, --quiet, --json, --no-color)
 */

import { spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { CLI_PATH, fixture, runCli, TempDir } from "./helpers/index.js";

const tempDir = new TempDir();

beforeAll(() => {
    tempDir.setup();
});

afterAll(() => {
    tempDir.cleanup();
});

describe("CLI E2E: --verbose Flag", () => {
    it("shows timing information", () => {
        const result = runCli(["--verbose", "compile", fixture("simple.vf"), "-o", tempDir.join("verbose.js")]);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain("lexer:");
        expect(result.stdout).toContain("parser:");
        expect(result.stdout).toContain("desugar:");
        expect(result.stdout).toContain("typecheck:");
        expect(result.stdout).toContain("codegen:");
        expect(result.stdout).toContain("Total:");
    });

    it("shows token and node counts", () => {
        const result = runCli(["--verbose", "compile", fixture("simple.vf"), "-o", tempDir.join("counts.js")]);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain("tokens:");
        expect(result.stdout).toContain("nodes:");
    });
});

describe("CLI E2E: --quiet Flag", () => {
    it("suppresses success output", () => {
        const result = runCli(["--quiet", "compile", fixture("simple.vf"), "-o", tempDir.join("quiet.js")]);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe("");
    });

    it("still shows errors", () => {
        const result = runCli(["--quiet", "compile", fixture("type-error.vf")]);

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("error");
    });
});

describe("CLI E2E: --json Flag", () => {
    it("outputs success as valid JSON", () => {
        const result = runCli(["--json", "compile", fixture("simple.vf"), "-o", tempDir.join("json.js")]);

        expect(result.exitCode).toBe(0);

        const json = JSON.parse(result.stdout);
        expect(json.success).toBe(true);
        expect(json.diagnostics).toEqual([]);
        expect(json.output).toContain("json.js");
    });

    it("outputs errors as valid JSON", () => {
        const result = runCli(["--json", "compile", fixture("type-error.vf")]);

        expect(result.exitCode).toBe(1);

        const json = JSON.parse(result.stderr);
        expect(json.success).toBe(false);
        expect(json.diagnostics.length).toBeGreaterThan(0);
        expect(json.diagnostics[0].code).toMatch(/^VF/);
    });

    it("includes timing in JSON when combined with --verbose", () => {
        const result = runCli([
            "--json",
            "--verbose",
            "compile",
            fixture("simple.vf"),
            "-o",
            tempDir.join("json-verbose.js"),
        ]);

        expect(result.exitCode).toBe(0);

        const json = JSON.parse(result.stdout);
        expect(json.timing).toBeDefined();
        expect(json.timing.totalMs).toBeGreaterThanOrEqual(0);
        expect(json.timing.phases).toBeDefined();
    });
});

describe("CLI E2E: --no-color Flag", () => {
    it("disables color output", () => {
        // Run without NO_COLOR env to test the flag
        const result = spawnSync("node", [CLI_PATH, "--no-color", "compile", fixture("type-error.vf")], {
            encoding: "utf-8",
            env: { ...process.env, NO_COLOR: undefined, FORCE_COLOR: undefined },
        });

        // Should not contain ANSI escape codes
        expect(result.stderr).not.toMatch(/\x1b\[/);
    });
});

describe("CLI E2E: --emit with --verbose --json", () => {
    it("includes timing in ast JSON output", () => {
        const result = runCli(["--json", "--verbose", "compile", fixture("simple.vf"), "--emit", "ast"]);

        expect(result.exitCode).toBe(0);

        const json = JSON.parse(result.stdout);
        expect(json.timing).toBeDefined();
        expect(json.filename).toBeDefined();
    });

    it("includes timing in typed-ast JSON output", () => {
        const result = runCli(["--json", "--verbose", "compile", fixture("simple.vf"), "--emit", "typed-ast"]);

        expect(result.exitCode).toBe(0);

        const json = JSON.parse(result.stdout);
        expect(json.timing).toBeDefined();
        expect(json.filename).toBeDefined();
    });
});
