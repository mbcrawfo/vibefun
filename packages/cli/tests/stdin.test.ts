/**
 * E2E tests for stdin/stdout compile support
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { fixture, runCli, TempDir } from "./helpers/index.js";

const tempDir = new TempDir();

beforeAll(() => {
    tempDir.setup();
});

afterAll(() => {
    tempDir.cleanup();
});

describe("CLI E2E: stdin/stdout Compile", () => {
    describe("reading from stdin", () => {
        it("compiles source piped via stdin (no file argument)", () => {
            const result = runCli(["compile"], { stdin: "let x = 42;" });

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain("const x = 42");
            expect(result.stdout).toContain("export {};");
        });

        it('compiles source piped via stdin with "-" argument', () => {
            const result = runCli(["compile", "-"], { stdin: "let x = 42;" });

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain("const x = 42");
            expect(result.stdout).toContain("export {};");
        });

        it("compiles empty source from stdin", () => {
            const result = runCli(["compile"], { stdin: "" });

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain("export {};");
        });

        it("outputs compiled JS to stdout by default from stdin", () => {
            const result = runCli(["compile"], { stdin: "let greeting = \"hello\";" });

            expect(result.exitCode).toBe(0);
            // Should contain the compiled JS, not a success message
            expect(result.stdout).toContain("Vibefun compiled output");
            expect(result.stdout).not.toContain("Compiled");
        });
    });

    describe("stdin with --output", () => {
        it("writes to file when --output is specified with stdin", () => {
            const outputPath = tempDir.join("stdin-to-file.js");
            const result = runCli(["compile", "-", "-o", outputPath], { stdin: "let x = 42;" });

            expect(result.exitCode).toBe(0);
            expect(tempDir.exists("stdin-to-file.js")).toBe(true);

            const output = tempDir.readFile("stdin-to-file.js");
            expect(output).toContain("const x = 42");
            expect(output).toContain("export {};");
        });

        it("writes to file when --output is specified without file arg", () => {
            const outputPath = tempDir.join("stdin-no-arg.js");
            const result = runCli(["compile", "-o", outputPath], { stdin: "let y = 100;" });

            expect(result.exitCode).toBe(0);
            expect(tempDir.exists("stdin-no-arg.js")).toBe(true);
        });
    });

    describe("stdin error handling", () => {
        it("returns exit code 1 for parse errors from stdin", () => {
            const result = runCli(["compile"], { stdin: "let x =" });

            expect(result.exitCode).toBe(1);
            expect(result.stderr).toContain("error");
        });

        it("uses <stdin> as filename in error messages", () => {
            const result = runCli(["compile"], { stdin: "let x =" });

            expect(result.exitCode).toBe(1);
            expect(result.stderr).toContain("<stdin>");
        });

        it("returns exit code 1 for type errors from stdin", () => {
            const result = runCli(["compile"], { stdin: 'let x = 42 + "hello";' });

            expect(result.exitCode).toBe(1);
            expect(result.stderr).toContain("error");
        });
    });

    describe("stdin with --emit modes", () => {
        it("outputs AST JSON from stdin with --emit ast", () => {
            const result = runCli(["compile", "--emit", "ast"], { stdin: "let x = 42;" });

            expect(result.exitCode).toBe(0);
            const json = JSON.parse(result.stdout);
            expect(json.filename).toBe("<stdin>");
            expect(json.declarationCount).toBe(1);
            expect(json.ast).toBeDefined();
        });

        it("outputs typed AST JSON from stdin with --emit typed-ast", () => {
            const result = runCli(["compile", "--emit", "typed-ast"], { stdin: "let x = 42;" });

            expect(result.exitCode).toBe(0);
            const json = JSON.parse(result.stdout);
            expect(json.filename).toBe("<stdin>");
            expect(json.types).toBeDefined();
        });
    });

    describe("stdin with --json", () => {
        it("includes code in JSON output from stdin", () => {
            const result = runCli(["compile", "--json"], { stdin: "let x = 42;" });

            expect(result.exitCode).toBe(0);
            const json = JSON.parse(result.stdout);
            expect(json.success).toBe(true);
            expect(json.code).toBeDefined();
            expect(json.code).toContain("const x = 42");
        });

        it("outputs errors as JSON from stdin", () => {
            const result = runCli(["compile", "--json"], { stdin: "let x =" });

            expect(result.exitCode).toBe(1);
            const json = JSON.parse(result.stderr);
            expect(json.success).toBe(false);
            expect(json.diagnostics.length).toBeGreaterThan(0);
        });
    });

    describe("stdin with --verbose", () => {
        it("shows timing on stderr when outputting JS to stdout", () => {
            const result = runCli(["compile", "--verbose"], { stdin: "let x = 42;" });

            expect(result.exitCode).toBe(0);
            // JS goes to stdout
            expect(result.stdout).toContain("const x = 42");
            // Timing goes to stderr
            expect(result.stderr).toContain("lexer:");
            expect(result.stderr).toContain("Total:");
        });
    });

    describe("file input still works", () => {
        it("compiles from file when file argument is given", () => {
            const outputPath = tempDir.join("file-input.js");
            const result = runCli(["compile", fixture("simple.vf"), "-o", outputPath]);

            expect(result.exitCode).toBe(0);
            expect(tempDir.exists("file-input.js")).toBe(true);
            expect(result.stdout).toContain("Compiled");
        });
    });
});
