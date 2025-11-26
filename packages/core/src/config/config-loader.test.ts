/**
 * Tests for config-loader.ts
 *
 * Tests cover:
 * - Finding project root by walking up directory tree
 * - Loading vibefun.json configuration
 * - Combining both via loadConfigFromEntryPoint
 */
import type { VibefunConfig } from "./types.js";

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { findProjectRoot, loadConfigFromEntryPoint, loadVibefunConfig } from "./config-loader.js";

// =============================================================================
// Test Fixtures Helpers
// =============================================================================

/**
 * Helper to create a temporary directory with files for testing.
 */
function createTempDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), "vibefun-config-test-"));
}

/**
 * Helper to create a file with content.
 */
function createFile(filePath: string, content: string): void {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content);
}

/**
 * Helper to remove a directory and all its contents.
 */
function removeTempDir(dir: string): void {
    fs.rmSync(dir, { recursive: true, force: true });
}

// =============================================================================
// Tests
// =============================================================================

describe("config-loader", () => {
    let tempDir: string;

    beforeEach(() => {
        tempDir = createTempDir();
    });

    afterEach(() => {
        removeTempDir(tempDir);
    });

    // =========================================================================
    // findProjectRoot
    // =========================================================================

    describe("findProjectRoot", () => {
        it("should find project root with vibefun.json", () => {
            // Create vibefun.json at root
            createFile(path.join(tempDir, "vibefun.json"), "{}");
            // Create a nested directory
            const nestedDir = path.join(tempDir, "src", "deep", "nested");
            fs.mkdirSync(nestedDir, { recursive: true });

            const root = findProjectRoot(nestedDir);
            expect(root).toBe(tempDir);
        });

        it("should find project root with package.json when no vibefun.json", () => {
            // Create package.json at root
            createFile(path.join(tempDir, "package.json"), "{}");
            // Create a nested directory
            const nestedDir = path.join(tempDir, "src", "deep");
            fs.mkdirSync(nestedDir, { recursive: true });

            const root = findProjectRoot(nestedDir);
            expect(root).toBe(tempDir);
        });

        it("should prefer vibefun.json over package.json", () => {
            // Create both at root
            createFile(path.join(tempDir, "vibefun.json"), "{}");
            createFile(path.join(tempDir, "package.json"), "{}");
            const nestedDir = path.join(tempDir, "src");
            fs.mkdirSync(nestedDir, { recursive: true });

            const root = findProjectRoot(nestedDir);
            expect(root).toBe(tempDir);
        });

        it("should find nested vibefun.json before root package.json", () => {
            // Create package.json at root
            createFile(path.join(tempDir, "package.json"), "{}");
            // Create vibefun.json in nested directory
            const nestedProject = path.join(tempDir, "packages", "sub");
            createFile(path.join(nestedProject, "vibefun.json"), "{}");
            // Start from inside nested project
            const deepDir = path.join(nestedProject, "src");
            fs.mkdirSync(deepDir, { recursive: true });

            const root = findProjectRoot(deepDir);
            expect(root).toBe(nestedProject);
        });

        it("should return null when no config file found", () => {
            const emptyDir = path.join(tempDir, "empty");
            fs.mkdirSync(emptyDir, { recursive: true });

            const root = findProjectRoot(emptyDir);
            expect(root).toBe(null);
        });

        it("should handle starting from root directory", () => {
            // This test uses the tempDir itself
            const root = findProjectRoot(tempDir);
            expect(root).toBe(null);
        });

        it("should handle non-existent starting directory gracefully", () => {
            const nonExistent = path.join(tempDir, "does", "not", "exist");
            // path.resolve will handle non-existent paths, walking up to tempDir
            const root = findProjectRoot(nonExistent);
            expect(root).toBe(null);
        });
    });

    // =========================================================================
    // loadVibefunConfig
    // =========================================================================

    describe("loadVibefunConfig", () => {
        it("should load a valid vibefun.json", () => {
            const config: VibefunConfig = {
                compilerOptions: {
                    paths: {
                        "@/*": ["./src/*"],
                    },
                },
            };
            createFile(path.join(tempDir, "vibefun.json"), JSON.stringify(config, null, 2));

            const loaded = loadVibefunConfig(tempDir);
            expect(loaded).toEqual(config);
        });

        it("should return null when vibefun.json does not exist", () => {
            const loaded = loadVibefunConfig(tempDir);
            expect(loaded).toBe(null);
        });

        it("should throw on invalid JSON", () => {
            createFile(path.join(tempDir, "vibefun.json"), "{ invalid json }");

            expect(() => loadVibefunConfig(tempDir)).toThrow(/Invalid JSON in vibefun\.json/);
        });

        it("should load empty config", () => {
            createFile(path.join(tempDir, "vibefun.json"), "{}");

            const loaded = loadVibefunConfig(tempDir);
            expect(loaded).toEqual({});
        });

        it("should load config with multiple path mappings", () => {
            const config: VibefunConfig = {
                compilerOptions: {
                    paths: {
                        "@/*": ["./src/*"],
                        "@components/*": ["./src/components/*"],
                        "@utils/*": ["./src/utils/*", "./shared/utils/*"],
                    },
                },
            };
            createFile(path.join(tempDir, "vibefun.json"), JSON.stringify(config));

            const loaded = loadVibefunConfig(tempDir);
            expect(loaded).toEqual(config);
        });

        it("should handle config with only compilerOptions (no paths)", () => {
            const config: VibefunConfig = {
                compilerOptions: {},
            };
            createFile(path.join(tempDir, "vibefun.json"), JSON.stringify(config));

            const loaded = loadVibefunConfig(tempDir);
            expect(loaded).toEqual(config);
        });

        it("should preserve extra fields in config", () => {
            const config = {
                name: "my-project",
                compilerOptions: {
                    paths: { "@/*": ["./src/*"] },
                },
                customField: true,
            };
            createFile(path.join(tempDir, "vibefun.json"), JSON.stringify(config));

            const loaded = loadVibefunConfig(tempDir);
            expect(loaded).toEqual(config);
        });
    });

    // =========================================================================
    // loadConfigFromEntryPoint
    // =========================================================================

    describe("loadConfigFromEntryPoint", () => {
        it("should load config from entry point file", () => {
            const config: VibefunConfig = {
                compilerOptions: { paths: { "@/*": ["./src/*"] } },
            };
            createFile(path.join(tempDir, "vibefun.json"), JSON.stringify(config));
            createFile(path.join(tempDir, "src", "main.vf"), "// entry point");

            const result = loadConfigFromEntryPoint(path.join(tempDir, "src", "main.vf"));

            expect(result.config).toEqual(config);
            expect(result.configPath).toBe(path.join(tempDir, "vibefun.json"));
            expect(result.projectRoot).toBe(tempDir);
        });

        it("should load config from entry point directory", () => {
            const config: VibefunConfig = {
                compilerOptions: { paths: { "@/*": ["./src/*"] } },
            };
            createFile(path.join(tempDir, "vibefun.json"), JSON.stringify(config));
            fs.mkdirSync(path.join(tempDir, "src"), { recursive: true });

            const result = loadConfigFromEntryPoint(path.join(tempDir, "src"));

            expect(result.config).toEqual(config);
            expect(result.projectRoot).toBe(tempDir);
        });

        it("should return null values when no config found", () => {
            fs.mkdirSync(path.join(tempDir, "src"), { recursive: true });

            const result = loadConfigFromEntryPoint(path.join(tempDir, "src"));

            expect(result.config).toBe(null);
            expect(result.configPath).toBe(null);
            expect(result.projectRoot).toBe(null);
        });

        it("should return projectRoot but null config when only package.json exists", () => {
            createFile(path.join(tempDir, "package.json"), "{}");
            fs.mkdirSync(path.join(tempDir, "src"), { recursive: true });

            const result = loadConfigFromEntryPoint(path.join(tempDir, "src"));

            // projectRoot found via package.json, but no vibefun.json
            expect(result.projectRoot).toBe(tempDir);
            expect(result.config).toBe(null);
            expect(result.configPath).toBe(null);
        });
    });

    // =========================================================================
    // Edge Cases
    // =========================================================================

    describe("edge cases", () => {
        it("should handle deeply nested config file", () => {
            // Create config at a very deep level
            const deepPath = path.join(tempDir, "a", "b", "c", "d", "e", "f", "g", "h", "i", "j");
            fs.mkdirSync(deepPath, { recursive: true });
            createFile(path.join(deepPath, "vibefun.json"), "{}");

            const startDir = path.join(deepPath, "more", "nested");
            fs.mkdirSync(startDir, { recursive: true });

            const root = findProjectRoot(startDir);
            expect(root).toBe(deepPath);
        });
    });
});
