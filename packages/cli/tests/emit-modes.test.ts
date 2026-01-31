/**
 * E2E tests for --emit modes
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

describe("CLI E2E: --emit Modes", () => {
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
        const outputPath = tempDir.join("should-not-exist-ast.js");
        runCli(["compile", fixture("simple.vf"), "--emit", "ast", "-o", outputPath]);

        // The -o flag is ignored for ast/typed-ast modes
        expect(tempDir.exists("should-not-exist-ast.js")).toBe(false);
    });
});
