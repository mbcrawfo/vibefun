/**
 * E2E tests for basic CLI compilation
 */

import { readFileSync, writeFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { fixture, runCli, TempDir } from "./helpers/index.js";

const tempDir = new TempDir();

beforeAll(() => {
    tempDir.setup();
});

afterAll(() => {
    tempDir.cleanup();
});

describe("CLI E2E: Basic Compilation", () => {
    it("compiles a simple file and creates output", () => {
        const outputPath = tempDir.join("simple.js");
        const result = runCli(["compile", fixture("simple.vf"), "-o", outputPath], { cwd: tempDir.getPath() });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain("Compiled");
        expect(tempDir.exists("simple.js")).toBe(true);

        const output = tempDir.readFile("simple.js");
        expect(output).toContain("export {};");
    });

    it("creates output with custom path using -o", () => {
        const outputPath = tempDir.join("custom-output.js");
        const result = runCli(["compile", fixture("simple.vf"), "-o", outputPath]);

        expect(result.exitCode).toBe(0);
        expect(tempDir.exists("custom-output.js")).toBe(true);
    });

    it("creates nested directories for output path", () => {
        const outputPath = tempDir.join("deep/nested/dir/output.js");
        const result = runCli(["compile", fixture("simple.vf"), "-o", outputPath]);

        expect(result.exitCode).toBe(0);
        expect(tempDir.exists("deep/nested/dir/output.js")).toBe(true);
    });

    it("compiles empty file to valid empty module", () => {
        const outputPath = tempDir.join("empty.js");
        const result = runCli(["compile", fixture("empty.vf"), "-o", outputPath]);

        expect(result.exitCode).toBe(0);
        expect(tempDir.exists("empty.js")).toBe(true);

        const output = readFileSync(outputPath, "utf-8");
        expect(output).toContain("export {};");
    });

    it("compiles comments-only file to valid empty module", () => {
        const outputPath = tempDir.join("comments.js");
        const result = runCli(["compile", fixture("comments-only.vf"), "-o", outputPath]);

        expect(result.exitCode).toBe(0);
        expect(tempDir.exists("comments.js")).toBe(true);

        const output = readFileSync(outputPath, "utf-8");
        expect(output).toContain("export {};");
    });

    it("compiles unicode identifiers correctly", () => {
        const outputPath = tempDir.join("unicode.js");
        const result = runCli(["compile", fixture("unicode.vf"), "-o", outputPath]);

        expect(result.exitCode).toBe(0);
        expect(tempDir.exists("unicode.js")).toBe(true);
    });

    it("handles file with UTF-8 BOM", () => {
        const outputPath = tempDir.join("bom.js");
        const result = runCli(["compile", fixture("with-bom.vf"), "-o", outputPath]);

        expect(result.exitCode).toBe(0);
        expect(tempDir.exists("bom.js")).toBe(true);
    });

    it("handles file path with spaces", () => {
        const outputPath = tempDir.join("spaces.js");
        const result = runCli(["compile", fixture("path with spaces/test.vf"), "-o", outputPath]);

        expect(result.exitCode).toBe(0);
        expect(tempDir.exists("spaces.js")).toBe(true);
    });

    it("overwrites existing output file atomically", () => {
        const outputPath = tempDir.join("overwrite.js");

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
