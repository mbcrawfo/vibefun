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

    it("returns exit code 1 for missing argument", () => {
        const result = runCli(["compile"]);

        expect(result.exitCode).toBe(1); // Commander exits with 1 for missing args
        expect(result.stderr).toContain("required");
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
