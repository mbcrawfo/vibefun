/**
 * Integration tests for the compile command
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { compile, EXIT_COMPILATION_ERROR, EXIT_IO_ERROR, EXIT_SUCCESS } from "./compile.js";

describe("compile command", () => {
    let testDir: string;

    beforeEach(() => {
        // Create a unique test directory
        testDir = join(tmpdir(), `vibefun-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
        // Clean up test directory
        rmSync(testDir, { recursive: true, force: true });
    });

    /**
     * Helper to create a test file
     */
    function createTestFile(name: string, content: string): string {
        const path = join(testDir, name);
        const dir = join(testDir, ...name.split("/").slice(0, -1));
        if (dir !== testDir) {
            mkdirSync(dir, { recursive: true });
        }
        writeFileSync(path, content, "utf-8");
        return path;
    }

    /**
     * Helper to check if output file exists
     */
    function readOutputFile(name: string): string {
        return readFileSync(join(testDir, name), "utf-8");
    }

    describe("basic compilation", () => {
        it("compiles a simple file with default output", () => {
            const inputPath = createTestFile("main.vf", "let x = 42;");

            const result = compile(inputPath, { quiet: true });

            expect(result.exitCode).toBe(EXIT_SUCCESS);

            // Check output file exists with default name
            const output = readOutputFile("main.js");
            expect(output).toContain("// Vibefun compiled output");
            expect(output).toContain("export {};");
        });

        it("compiles a file with custom output path", () => {
            const inputPath = createTestFile("src/input.vf", "let y = 100;");

            const outputPath = join(testDir, "dist/output.js");
            const result = compile(inputPath, { output: outputPath, quiet: true });

            expect(result.exitCode).toBe(EXIT_SUCCESS);

            const output = readOutputFile("dist/output.js");
            expect(output).toContain("export {};");
        });

        it("creates nested directories for output path", () => {
            const inputPath = createTestFile("test.vf", "let z = 0;");

            const outputPath = join(testDir, "deep/nested/dir/out.js");
            const result = compile(inputPath, { output: outputPath, quiet: true });

            expect(result.exitCode).toBe(EXIT_SUCCESS);

            const output = readOutputFile("deep/nested/dir/out.js");
            expect(output).toContain("export {};");
        });

        it("compiles an empty file to valid empty module", () => {
            const inputPath = createTestFile("empty.vf", "");

            const result = compile(inputPath, { quiet: true });

            expect(result.exitCode).toBe(EXIT_SUCCESS);

            const output = readOutputFile("empty.js");
            expect(output).toContain("export {};");
        });

        it("compiles a file with only comments", () => {
            const inputPath = createTestFile("comments.vf", "// This is a comment\n// Another comment");

            const result = compile(inputPath, { quiet: true });

            expect(result.exitCode).toBe(EXIT_SUCCESS);

            const output = readOutputFile("comments.js");
            expect(output).toContain("export {};");
        });
    });

    describe("--emit ast", () => {
        it("outputs surface AST as JSON to stdout", () => {
            const inputPath = createTestFile("test.vf", "let x = 42;");

            const result = compile(inputPath, { emit: "ast" });

            expect(result.exitCode).toBe(EXIT_SUCCESS);
            expect(result.stdout).toBeDefined();

            const output = JSON.parse(result.stdout!);
            expect(output.filename).toBe(inputPath);
            expect(output.declarationCount).toBe(1);
            expect(output.ast).toBeDefined();
        });

        it("does not write file when --emit ast is used", () => {
            const inputPath = createTestFile("nowrite.vf", "let x = 1;");

            compile(inputPath, { emit: "ast" });

            // Should not create output file
            expect(() => readOutputFile("nowrite.js")).toThrow();
        });
    });

    describe("--emit typed-ast", () => {
        it("outputs typed AST as JSON to stdout", () => {
            const inputPath = createTestFile("typed.vf", "let x = 42;");

            const result = compile(inputPath, { emit: "typed-ast" });

            expect(result.exitCode).toBe(EXIT_SUCCESS);
            expect(result.stdout).toBeDefined();

            const output = JSON.parse(result.stdout!);
            expect(output.filename).toBe(inputPath);
            expect(output.declarationCount).toBe(1);
            expect(output.ast).toBeDefined();
            expect(output.types).toBeDefined();
        });
    });

    describe("error handling", () => {
        it("returns exit code 1 for parse errors", () => {
            const inputPath = createTestFile("bad-syntax.vf", "let x =");

            const result = compile(inputPath, { noColor: true });

            expect(result.exitCode).toBe(EXIT_COMPILATION_ERROR);
            expect(result.stderr).toBeDefined();
            expect(result.stderr).toContain("error");
        });

        it("returns exit code 4 for file not found", () => {
            const result = compile(join(testDir, "nonexistent.vf"), { noColor: true });

            expect(result.exitCode).toBe(EXIT_IO_ERROR);
            expect(result.stderr).toBeDefined();
            expect(result.stderr).toContain("not found");
        });
    });

    describe("--verbose", () => {
        it("shows timing information", () => {
            const inputPath = createTestFile("verbose.vf", "let x = 42;");

            const result = compile(inputPath, { verbose: true, noColor: true });

            expect(result.exitCode).toBe(EXIT_SUCCESS);
            expect(result.stdout).toBeDefined();
            expect(result.stdout).toContain("lexer:");
            expect(result.stdout).toContain("parser:");
            expect(result.stdout).toContain("Total:");
        });
    });

    describe("--quiet", () => {
        it("suppresses success output", () => {
            const inputPath = createTestFile("quiet.vf", "let x = 42;");

            const result = compile(inputPath, { quiet: true });

            expect(result.exitCode).toBe(EXIT_SUCCESS);
            expect(result.stdout).toBeUndefined();
        });
    });

    describe("--json", () => {
        it("outputs success as JSON", () => {
            const inputPath = createTestFile("json-success.vf", "let x = 42;");

            const result = compile(inputPath, { json: true });

            expect(result.exitCode).toBe(EXIT_SUCCESS);
            expect(result.stdout).toBeDefined();

            const output = JSON.parse(result.stdout!);
            expect(output.success).toBe(true);
            expect(output.diagnostics).toEqual([]);
        });

        it("outputs errors as JSON", () => {
            const inputPath = createTestFile("json-error.vf", "let x =");

            const result = compile(inputPath, { json: true });

            expect(result.exitCode).toBe(EXIT_COMPILATION_ERROR);
            expect(result.stderr).toBeDefined();

            const output = JSON.parse(result.stderr!);
            expect(output.success).toBe(false);
            expect(output.diagnostics.length).toBeGreaterThan(0);
        });

        it("includes timing in JSON when --verbose is also used", () => {
            const inputPath = createTestFile("json-verbose.vf", "let x = 42;");

            const result = compile(inputPath, { json: true, verbose: true });

            expect(result.exitCode).toBe(EXIT_SUCCESS);

            const output = JSON.parse(result.stdout!);
            expect(output.timing).toBeDefined();
            expect(output.timing.totalMs).toBeGreaterThanOrEqual(0);
            expect(output.timing.phases).toBeDefined();
        });
    });

    describe("input handling", () => {
        it("handles UTF-8 BOM", () => {
            const bom = "\uFEFF";
            const inputPath = createTestFile("bom.vf", `${bom}let x = 42;`);

            const result = compile(inputPath, { quiet: true });

            expect(result.exitCode).toBe(EXIT_SUCCESS);
        });

        it("handles CRLF line endings", () => {
            const inputPath = createTestFile("crlf.vf", "let x = 42;\r\nlet y = 100;");

            const result = compile(inputPath, { quiet: true });

            expect(result.exitCode).toBe(EXIT_SUCCESS);
        });
    });

    describe("atomic writes", () => {
        it("does not leave partial output on compilation error", () => {
            const inputPath = createTestFile("fail.vf", "let x =");
            const outputPath = join(testDir, "fail.js");

            compile(inputPath, { output: outputPath });

            // Output file should not exist
            expect(() => readFileSync(outputPath)).toThrow();
        });
    });

    describe("--emit with --verbose --json", () => {
        it("includes timing in ast JSON output", () => {
            const inputPath = createTestFile("ast-timing.vf", "let x = 42;");

            const result = compile(inputPath, { emit: "ast", json: true, verbose: true });

            expect(result.exitCode).toBe(EXIT_SUCCESS);

            const output = JSON.parse(result.stdout!);
            expect(output.timing).toBeDefined();
            expect(output.filename).toBeDefined();
        });

        it("includes timing in typed-ast JSON output", () => {
            const inputPath = createTestFile("typed-ast-timing.vf", "let x = 42;");

            const result = compile(inputPath, { emit: "typed-ast", json: true, verbose: true });

            expect(result.exitCode).toBe(EXIT_SUCCESS);

            const output = JSON.parse(result.stdout!);
            expect(output.timing).toBeDefined();
            expect(output.filename).toBeDefined();
        });
    });
});
