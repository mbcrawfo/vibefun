/**
 * E2E tests for error handling
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

describe("CLI E2E: Error Handling", () => {
    it("returns exit code 1 for parse errors", () => {
        const result = runCli(["compile", fixture("parse-error.vf")]);

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("error");
        expect(result.stderr).toContain("VF2");
        expect(result.stderr).toMatch(/\d+:\d+/); // includes source location
    });

    it("returns exit code 1 for type errors", () => {
        const result = runCli(["compile", fixture("type-error.vf")]);

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("error");
        expect(result.stderr).toContain("VF4");
        expect(result.stderr).toMatch(/\d+:\d+/); // includes source location
    });

    it("returns exit code 1 for lexer errors", () => {
        const result = runCli(["compile", fixture("lexer-error.vf")]);

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("error");
        expect(result.stderr).toContain("VF1");
        expect(result.stderr).toMatch(/\d+:\d+/); // includes source location
    });

    it("returns exit code 4 for file not found", () => {
        const result = runCli(["compile", "nonexistent-file.vf"]);

        expect(result.exitCode).toBe(4);
        expect(result.stderr).toContain("not found");
    });

    it("compiles from stdin when no file argument is given", () => {
        const result = runCli(["compile"], { stdin: "let x = 42;" });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain("Vibefun compiled output");
    });

    it("does not leave partial file on compilation error", () => {
        const outputPath = tempDir.join("should-not-exist-error.js");
        runCli(["compile", fixture("type-error.vf"), "-o", outputPath]);

        expect(tempDir.exists("should-not-exist-error.js")).toBe(false);
    });

    it("reports first error and exits with code 1 for multi-error files", () => {
        // Note: Multi-error collection is deferred, so only first error is reported
        const result = runCli(["compile", fixture("multi-error.vf")]);

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("error");
    });
});
