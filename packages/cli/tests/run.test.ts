/**
 * E2E tests for the run command
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

describe("CLI E2E: Run Command", () => {
    describe("basic execution", () => {
        it("runs a simple file successfully", () => {
            const result = runCli(["run", fixture("simple.vf")]);

            expect(result.exitCode).toBe(0);
        });

        it("runs an empty file successfully", () => {
            const result = runCli(["run", fixture("empty.vf")]);

            expect(result.exitCode).toBe(0);
        });

        it("runs a comments-only file successfully", () => {
            const result = runCli(["run", fixture("comments-only.vf")]);

            expect(result.exitCode).toBe(0);
        });

        it("actually executes the compiled JS and captures stdout", () => {
            const result = runCli(["run", fixture("hello.vf")]);

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain("hello from vibefun");
        });

        it("executes code from stdin and captures stdout", () => {
            const source = [
                'external console_log: (String) -> Unit = "console.log";',
                'let _ = unsafe { console_log("stdin output") };',
            ].join("\n");

            const result = runCli(["run"], { stdin: source });

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain("stdin output");
        });
    });

    describe("compilation errors", () => {
        it("returns exit code 1 for parse errors", () => {
            const result = runCli(["run", fixture("parse-error.vf")]);

            expect(result.exitCode).toBe(1);
            expect(result.stderr).toContain("error");
            expect(result.stderr).toContain("VF2");
        });

        it("returns exit code 1 for type errors", () => {
            const result = runCli(["run", fixture("type-error.vf")]);

            expect(result.exitCode).toBe(1);
            expect(result.stderr).toContain("error");
            expect(result.stderr).toContain("VF4");
        });

        it("returns exit code 1 for lexer errors", () => {
            const result = runCli(["run", fixture("lexer-error.vf")]);

            expect(result.exitCode).toBe(1);
            expect(result.stderr).toContain("error");
            expect(result.stderr).toContain("VF1");
        });

        it("returns exit code 4 for file not found", () => {
            const result = runCli(["run", "nonexistent-file.vf"]);

            expect(result.exitCode).toBe(4);
            expect(result.stderr).toContain("not found");
        });
    });

    describe("stdin support", () => {
        it("runs source piped via stdin (no file argument)", () => {
            const result = runCli(["run"], { stdin: "let x = 42;" });

            expect(result.exitCode).toBe(0);
        });

        it('runs source piped via stdin with "-" argument', () => {
            const result = runCli(["run", "-"], { stdin: "let x = 42;" });

            expect(result.exitCode).toBe(0);
        });

        it("returns exit code 1 for parse errors from stdin", () => {
            const result = runCli(["run"], { stdin: "let x =" });

            expect(result.exitCode).toBe(1);
            expect(result.stderr).toContain("error");
            expect(result.stderr).toContain("<stdin>");
        });
    });

    describe("verbose mode", () => {
        it("shows compilation timing on stderr", () => {
            const result = runCli(["--verbose", "run", fixture("simple.vf")]);

            expect(result.exitCode).toBe(0);
            expect(result.stderr).toContain("lexer:");
            expect(result.stderr).toContain("Total:");
        });
    });

    describe("json mode", () => {
        it("outputs compilation errors as JSON", () => {
            const result = runCli(["--json", "run", fixture("type-error.vf")]);

            expect(result.exitCode).toBe(1);
            const json = JSON.parse(result.stderr);
            expect(json.success).toBe(false);
            expect(json.diagnostics.length).toBeGreaterThan(0);
        });
    });

    describe("help", () => {
        it("shows run command help", () => {
            const result = runCli(["run", "--help"]);

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain("run");
            expect(result.stdout).toContain("Compile and run");
        });
    });
});
