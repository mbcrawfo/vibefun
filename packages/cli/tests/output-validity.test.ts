/**
 * E2E tests for generated output validity
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { fixture, runCli, runNode, TempDir } from "./helpers/index.js";

const tempDir = new TempDir();

beforeAll(() => {
    tempDir.setup();
});

afterAll(() => {
    tempDir.cleanup();
});

describe("CLI E2E: Generated Output Validity", () => {
    it("generates valid ES module that can be loaded", () => {
        const outputPath = tempDir.join("loadable.js");
        const compileResult = runCli(["compile", fixture("simple.vf"), "-o", outputPath]);
        expect(compileResult.exitCode).toBe(0);

        // Try to run the output with Node.js
        const runResult = runNode(outputPath);

        expect(runResult.status).toBe(0);
    });

    it("generates valid ES module for empty file", () => {
        const outputPath = tempDir.join("empty-loadable.js");
        const compileResult = runCli(["compile", fixture("empty.vf"), "-o", outputPath]);
        expect(compileResult.exitCode).toBe(0);

        const runResult = runNode(outputPath);

        expect(runResult.status).toBe(0);
    });
});
