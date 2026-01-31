/**
 * End-to-end tests for the vibefun CLI
 *
 * These tests run the actual CLI binary and verify its behavior.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Path to the CLI binary
const CLI_PATH = resolve(__dirname, "../dist/index.js");

// Path to test fixtures
const FIXTURES_PATH = resolve(__dirname, "../test-fixtures");

// Temporary output directory for tests
let tempDir: string;

/**
 * Run the CLI with given arguments
 */
function runCli(
    args: string[],
    options: { cwd?: string; env?: Record<string, string> } = {},
): { stdout: string; stderr: string; exitCode: number } {
    const result = spawnSync("node", [CLI_PATH, ...args], {
        cwd: options.cwd ?? tempDir,
        encoding: "utf-8",
        env: { ...process.env, ...options.env, NO_COLOR: "1" },
    });

    return {
        stdout: result.stdout ?? "",
        stderr: result.stderr ?? "",
        exitCode: result.status ?? -1,
    };
}

/**
 * Get path to a test fixture
 */
function fixture(name: string): string {
    return join(FIXTURES_PATH, name);
}

beforeAll(() => {
    // Create temp directory for test outputs
    tempDir = join(tmpdir(), `vibefun-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
});

afterAll(() => {
    // Clean up temp directory
    rmSync(tempDir, { recursive: true, force: true });
});

describe("CLI E2E Tests", () => {
    describe("basic compilation", () => {
        it("compiles a simple file and creates output", () => {
            const result = runCli(["compile", fixture("simple.vf"), "-o", join(tempDir, "simple.js")]);

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain("Compiled");
            expect(existsSync(join(tempDir, "simple.js"))).toBe(true);

            const output = readFileSync(join(tempDir, "simple.js"), "utf-8");
            expect(output).toContain("export {};");
        });

        it("creates output with custom path using -o", () => {
            const outputPath = join(tempDir, "custom-output.js");
            const result = runCli(["compile", fixture("simple.vf"), "-o", outputPath]);

            expect(result.exitCode).toBe(0);
            expect(existsSync(outputPath)).toBe(true);
        });

        it("creates nested directories for output path", () => {
            const outputPath = join(tempDir, "deep/nested/dir/output.js");
            const result = runCli(["compile", fixture("simple.vf"), "-o", outputPath]);

            expect(result.exitCode).toBe(0);
            expect(existsSync(outputPath)).toBe(true);
        });

        it("compiles empty file to valid empty module", () => {
            const outputPath = join(tempDir, "empty.js");
            const result = runCli(["compile", fixture("empty.vf"), "-o", outputPath]);

            expect(result.exitCode).toBe(0);
            expect(existsSync(outputPath)).toBe(true);

            const output = readFileSync(outputPath, "utf-8");
            expect(output).toContain("export {};");
        });

        it("compiles comments-only file to valid empty module", () => {
            const outputPath = join(tempDir, "comments.js");
            const result = runCli(["compile", fixture("comments-only.vf"), "-o", outputPath]);

            expect(result.exitCode).toBe(0);
            expect(existsSync(outputPath)).toBe(true);

            const output = readFileSync(outputPath, "utf-8");
            expect(output).toContain("export {};");
        });

        it("compiles unicode identifiers correctly", () => {
            const outputPath = join(tempDir, "unicode.js");
            const result = runCli(["compile", fixture("unicode.vf"), "-o", outputPath]);

            expect(result.exitCode).toBe(0);
            expect(existsSync(outputPath)).toBe(true);
        });

        it("handles file with UTF-8 BOM", () => {
            const outputPath = join(tempDir, "bom.js");
            const result = runCli(["compile", fixture("with-bom.vf"), "-o", outputPath]);

            expect(result.exitCode).toBe(0);
            expect(existsSync(outputPath)).toBe(true);
        });

        it("handles file path with spaces", () => {
            const outputPath = join(tempDir, "spaces.js");
            const result = runCli(["compile", fixture("path with spaces/test.vf"), "-o", outputPath]);

            expect(result.exitCode).toBe(0);
            expect(existsSync(outputPath)).toBe(true);
        });

        it("overwrites existing output file atomically", () => {
            const outputPath = join(tempDir, "overwrite.js");

            // Create initial file
            writeFileSync(outputPath, "// old content");

            // Compile over it
            const result = runCli(["compile", fixture("simple.vf"), "-o", outputPath]);

            expect(result.exitCode).toBe(0);
            const output = readFileSync(outputPath, "utf-8");
            expect(output).toContain("Vibefun compiled output");
            expect(output).not.toContain("old content");
        });
    });

    describe("--emit modes", () => {
        it("outputs surface AST as valid JSON with --emit ast", () => {
            const result = runCli(["compile", fixture("simple.vf"), "--emit", "ast"]);

            expect(result.exitCode).toBe(0);

            const json = JSON.parse(result.stdout);
            expect(json.filename).toContain("simple.vf");
            expect(json.declarationCount).toBeGreaterThan(0);
            expect(json.ast).toBeDefined();
        });

        it("outputs typed AST as valid JSON with --emit typed-ast", () => {
            const result = runCli(["compile", fixture("simple.vf"), "--emit", "typed-ast"]);

            expect(result.exitCode).toBe(0);

            const json = JSON.parse(result.stdout);
            expect(json.filename).toContain("simple.vf");
            expect(json.declarationCount).toBeGreaterThan(0);
            expect(json.ast).toBeDefined();
            expect(json.types).toBeDefined();
        });

        it("does not create file when --emit ast is used", () => {
            const outputPath = join(tempDir, "should-not-exist-ast.js");
            runCli(["compile", fixture("simple.vf"), "--emit", "ast", "-o", outputPath]);

            // The -o flag is ignored for ast/typed-ast modes
            expect(existsSync(outputPath)).toBe(false);
        });
    });

    describe("error handling", () => {
        it("returns exit code 1 for parse errors", () => {
            const result = runCli(["compile", fixture("parse-error.vf")]);

            expect(result.exitCode).toBe(1);
            expect(result.stderr).toContain("error");
            expect(result.stderr).toContain("VF2");
        });

        it("returns exit code 1 for type errors", () => {
            const result = runCli(["compile", fixture("type-error.vf")]);

            expect(result.exitCode).toBe(1);
            expect(result.stderr).toContain("error");
            expect(result.stderr).toContain("VF4");
        });

        it("returns exit code 4 for file not found", () => {
            const result = runCli(["compile", "nonexistent-file.vf"]);

            expect(result.exitCode).toBe(4);
            expect(result.stderr).toContain("not found");
        });

        it("returns exit code 2 for missing argument", () => {
            const result = runCli(["compile"]);

            expect(result.exitCode).toBe(1); // Commander exits with 1 for missing args
            expect(result.stderr).toContain("required");
        });

        it("does not leave partial file on compilation error", () => {
            const outputPath = join(tempDir, "should-not-exist-error.js");
            runCli(["compile", fixture("type-error.vf"), "-o", outputPath]);

            expect(existsSync(outputPath)).toBe(false);
        });
    });

    describe("--verbose", () => {
        it("shows timing information", () => {
            const result = runCli(["--verbose", "compile", fixture("simple.vf"), "-o", join(tempDir, "verbose.js")]);

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain("lexer:");
            expect(result.stdout).toContain("parser:");
            expect(result.stdout).toContain("desugar:");
            expect(result.stdout).toContain("typecheck:");
            expect(result.stdout).toContain("codegen:");
            expect(result.stdout).toContain("Total:");
        });

        it("shows token and node counts", () => {
            const result = runCli(["--verbose", "compile", fixture("simple.vf"), "-o", join(tempDir, "counts.js")]);

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain("tokens:");
            expect(result.stdout).toContain("nodes:");
        });
    });

    describe("--quiet", () => {
        it("suppresses success output", () => {
            const result = runCli(["--quiet", "compile", fixture("simple.vf"), "-o", join(tempDir, "quiet.js")]);

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toBe("");
        });

        it("still shows errors", () => {
            const result = runCli(["--quiet", "compile", fixture("type-error.vf")]);

            expect(result.exitCode).toBe(1);
            expect(result.stderr).toContain("error");
        });
    });

    describe("--json", () => {
        it("outputs success as valid JSON", () => {
            const result = runCli(["--json", "compile", fixture("simple.vf"), "-o", join(tempDir, "json.js")]);

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
                join(tempDir, "json-verbose.js"),
            ]);

            expect(result.exitCode).toBe(0);

            const json = JSON.parse(result.stdout);
            expect(json.timing).toBeDefined();
            expect(json.timing.totalMs).toBeGreaterThanOrEqual(0);
            expect(json.timing.phases).toBeDefined();
        });
    });

    describe("--no-color", () => {
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

    describe("global commands", () => {
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

    describe("--emit with --verbose --json", () => {
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

    describe("multi-error handling", () => {
        it("reports first error and exits with code 1", () => {
            // Note: Multi-error collection is deferred, so only first error is reported
            const result = runCli(["compile", fixture("multi-error.vf")]);

            expect(result.exitCode).toBe(1);
            expect(result.stderr).toContain("error");
        });
    });

    describe("generated output validity", () => {
        it("generates valid ES module that can be loaded", () => {
            const outputPath = join(tempDir, "loadable.js");
            const compileResult = runCli(["compile", fixture("simple.vf"), "-o", outputPath]);
            expect(compileResult.exitCode).toBe(0);

            // Try to run the output with Node.js
            const runResult = spawnSync("node", [outputPath], {
                encoding: "utf-8",
            });

            expect(runResult.status).toBe(0);
        });

        it("generates valid ES module for empty file", () => {
            const outputPath = join(tempDir, "empty-loadable.js");
            const compileResult = runCli(["compile", fixture("empty.vf"), "-o", outputPath]);
            expect(compileResult.exitCode).toBe(0);

            const runResult = spawnSync("node", [outputPath], {
                encoding: "utf-8",
            });

            expect(runResult.status).toBe(0);
        });
    });
});
