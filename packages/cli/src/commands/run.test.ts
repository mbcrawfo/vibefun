/**
 * Integration tests for the run command
 */

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { EXIT_COMPILATION_ERROR, EXIT_IO_ERROR, EXIT_SUCCESS } from "./compile.js";
import { run } from "./run.js";

describe("run command", () => {
    let testDir: string;

    beforeEach(() => {
        testDir = join(tmpdir(), `vibefun-run-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(testDir, { recursive: true, force: true });
    });

    function createTestFile(name: string, content: string): string {
        const path = join(testDir, name);
        writeFileSync(path, content, "utf-8");
        return path;
    }

    describe("basic execution", () => {
        it("compiles and runs a simple file", () => {
            const inputPath = createTestFile("simple.vf", "let x = 42;");

            const result = run(inputPath);

            expect(result.exitCode).toBe(EXIT_SUCCESS);
        });

        it("compiles and runs an empty file", () => {
            const inputPath = createTestFile("empty.vf", "");

            const result = run(inputPath);

            expect(result.exitCode).toBe(EXIT_SUCCESS);
        });
    });

    describe("compilation errors", () => {
        it("returns exit code 1 for parse errors without executing", () => {
            const inputPath = createTestFile("bad.vf", "let x =");

            const result = run(inputPath, { noColor: true });

            expect(result.exitCode).toBe(EXIT_COMPILATION_ERROR);
            expect(result.stderr).toBeDefined();
            expect(result.stderr).toContain("error");
        });

        it("returns exit code 4 for file not found", () => {
            const result = run(join(testDir, "nonexistent.vf"), { noColor: true });

            expect(result.exitCode).toBe(EXIT_IO_ERROR);
            expect(result.stderr).toBeDefined();
            expect(result.stderr).toContain("not found");
        });
    });

    describe("file read errors", () => {
        it("returns IO error as JSON for file not found", () => {
            const result = run(join(testDir, "missing.vf"), { json: true });

            expect(result.exitCode).toBe(EXIT_IO_ERROR);
            expect(result.stderr).toBeDefined();
            const output = JSON.parse(result.stderr!);
            expect(output.success).toBe(false);
            expect(output.error.code).toBe("ENOENT");
        });

        it("returns IO error for directory instead of file", () => {
            mkdirSync(join(testDir, "adir.vf"), { recursive: true });

            const result = run(join(testDir, "adir.vf"), { noColor: true });

            expect(result.exitCode).toBe(EXIT_IO_ERROR);
            expect(result.stderr).toContain("directory");
        });
    });

    describe("options", () => {
        it("shows timing when --verbose is used", () => {
            const inputPath = createTestFile("verbose.vf", "let x = 42;");

            const result = run(inputPath, { verbose: true, noColor: true });

            expect(result.exitCode).toBe(EXIT_SUCCESS);
            expect(result.stderr).toBeDefined();
            expect(result.stderr).toContain("lexer:");
            expect(result.stderr).toContain("Total:");
        });

        it("suppresses timing when --quiet is used with --verbose", () => {
            const inputPath = createTestFile("quiet.vf", "let x = 42;");

            const result = run(inputPath, { verbose: true, quiet: true });

            expect(result.exitCode).toBe(EXIT_SUCCESS);
            expect(result.stderr).toBeUndefined();
        });

        it("outputs compilation errors as JSON when --json is used", () => {
            const inputPath = createTestFile("json-error.vf", "let x =");

            const result = run(inputPath, { json: true });

            expect(result.exitCode).toBe(EXIT_COMPILATION_ERROR);
            expect(result.stderr).toBeDefined();
            const output = JSON.parse(result.stderr!);
            expect(output.success).toBe(false);
            expect(output.diagnostics.length).toBeGreaterThan(0);
        });

        it("outputs file not found as JSON when --json is used", () => {
            const result = run(join(testDir, "missing.vf"), { json: true });

            expect(result.exitCode).toBe(EXIT_IO_ERROR);
            expect(result.stderr).toBeDefined();
            const output = JSON.parse(result.stderr!);
            expect(output.success).toBe(false);
            expect(output.error.code).toBe("ENOENT");
        });
    });
});
