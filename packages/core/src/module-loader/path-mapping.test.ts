/**
 * Tests for path-mapping.ts
 *
 * Tests cover:
 * - Applying path mappings with wildcards
 * - Getting all possible mappings for error messages
 * - Resolving mapped paths to absolute paths
 */
import type { VibefunConfig } from "../config/index.js";

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { applyPathMapping, getAllPathMappings, resolveMappedPath } from "./path-mapping.js";

// =============================================================================
// Test Fixtures Helpers
// =============================================================================

/**
 * Helper to create a temporary directory with files for testing.
 */
function createTempDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), "vibefun-path-mapping-test-"));
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

describe("path-mapping", () => {
    let tempDir: string;

    beforeEach(() => {
        tempDir = createTempDir();
    });

    afterEach(() => {
        removeTempDir(tempDir);
    });

    // =========================================================================
    // applyPathMapping
    // =========================================================================

    describe("applyPathMapping", () => {
        it("should apply simple wildcard mapping", () => {
            const config: VibefunConfig = {
                compilerOptions: {
                    paths: { "@/*": ["./src/*"] },
                },
            };

            const result = applyPathMapping("@/utils", config, tempDir);

            expect(result.mappedPath).toBe("./src/utils");
            expect(result.matchedPattern).toBe("@/*");
        });

        it("should apply mapping with nested path", () => {
            const config: VibefunConfig = {
                compilerOptions: {
                    paths: { "@/*": ["./src/*"] },
                },
            };

            const result = applyPathMapping("@/components/Button", config, tempDir);

            expect(result.mappedPath).toBe("./src/components/Button");
            expect(result.matchedPattern).toBe("@/*");
        });

        it("should apply more specific pattern first", () => {
            const config: VibefunConfig = {
                compilerOptions: {
                    paths: {
                        "@components/*": ["./src/components/*"],
                        "@/*": ["./src/*"],
                    },
                },
            };

            // @components/* comes first in order, so it should match
            const result = applyPathMapping("@components/Button", config, tempDir);

            expect(result.mappedPath).toBe("./src/components/Button");
            expect(result.matchedPattern).toBe("@components/*");
        });

        it("should fall back to less specific pattern", () => {
            const config: VibefunConfig = {
                compilerOptions: {
                    paths: {
                        "@components/*": ["./src/components/*"],
                        "@/*": ["./src/*"],
                    },
                },
            };

            const result = applyPathMapping("@/utils", config, tempDir);

            expect(result.mappedPath).toBe("./src/utils");
            expect(result.matchedPattern).toBe("@/*");
        });

        it("should handle exact match (no wildcard)", () => {
            const config: VibefunConfig = {
                compilerOptions: {
                    paths: { lodash: ["./node_modules/lodash/index.vf"] },
                },
            };

            const result = applyPathMapping("lodash", config, tempDir);

            expect(result.mappedPath).toBe("./node_modules/lodash/index.vf");
            expect(result.matchedPattern).toBe("lodash");
        });

        it("should not match partial exact pattern", () => {
            const config: VibefunConfig = {
                compilerOptions: {
                    paths: { lodash: ["./lodash.vf"] },
                },
            };

            const result = applyPathMapping("lodash/fp", config, tempDir);

            expect(result.mappedPath).toBe(null);
            expect(result.matchedPattern).toBe(null);
        });

        it("should return null when no patterns match", () => {
            const config: VibefunConfig = {
                compilerOptions: {
                    paths: { "@/*": ["./src/*"] },
                },
            };

            const result = applyPathMapping("./local/module", config, tempDir);

            expect(result.mappedPath).toBe(null);
            expect(result.matchedPattern).toBe(null);
        });

        it("should return null when config is null", () => {
            const result = applyPathMapping("@/utils", null, tempDir);

            expect(result.mappedPath).toBe(null);
            expect(result.matchedPattern).toBe(null);
        });

        it("should return null when paths is undefined", () => {
            const config: VibefunConfig = {
                compilerOptions: {},
            };

            const result = applyPathMapping("@/utils", config, tempDir);

            expect(result.mappedPath).toBe(null);
            expect(result.matchedPattern).toBe(null);
        });

        it("should return null when compilerOptions is undefined", () => {
            const config: VibefunConfig = {};

            const result = applyPathMapping("@/utils", config, tempDir);

            expect(result.mappedPath).toBe(null);
            expect(result.matchedPattern).toBe(null);
        });

        it("should return first replacement from array", () => {
            const config: VibefunConfig = {
                compilerOptions: {
                    paths: { "@/*": ["./src/*", "./lib/*"] },
                },
            };

            const result = applyPathMapping("@/utils", config, tempDir);

            expect(result.mappedPath).toBe("./src/utils");
        });

        it("should handle empty replacement array", () => {
            const config: VibefunConfig = {
                compilerOptions: {
                    paths: { "@/*": [] },
                },
            };

            const result = applyPathMapping("@/utils", config, tempDir);

            // Empty array means no replacement possible
            expect(result.mappedPath).toBe(null);
            expect(result.matchedPattern).toBe(null);
        });

        it("should handle pattern with suffix wildcard", () => {
            const config: VibefunConfig = {
                compilerOptions: {
                    paths: { "*.test": ["./tests/*.spec"] },
                },
            };

            const result = applyPathMapping("utils.test", config, tempDir);

            expect(result.mappedPath).toBe("./tests/utils.spec");
            expect(result.matchedPattern).toBe("*.test");
        });

        it("should handle scoped package style patterns", () => {
            const config: VibefunConfig = {
                compilerOptions: {
                    paths: { "@myorg/*": ["./packages/*"] },
                },
            };

            const result = applyPathMapping("@myorg/shared/utils", config, tempDir);

            expect(result.mappedPath).toBe("./packages/shared/utils");
            expect(result.matchedPattern).toBe("@myorg/*");
        });
    });

    // =========================================================================
    // getAllPathMappings
    // =========================================================================

    describe("getAllPathMappings", () => {
        it("should return all possible mappings for fallback patterns", () => {
            const config: VibefunConfig = {
                compilerOptions: {
                    paths: { "@/*": ["./src/*", "./lib/*", "./shared/*"] },
                },
            };

            const result = getAllPathMappings("@/utils", config);

            expect(result).toEqual([
                { mappedPath: "./src/utils", pattern: "@/*" },
                { mappedPath: "./lib/utils", pattern: "@/*" },
                { mappedPath: "./shared/utils", pattern: "@/*" },
            ]);
        });

        it("should return empty array when no config", () => {
            const result = getAllPathMappings("@/utils", null);
            expect(result).toEqual([]);
        });

        it("should return empty array when no match", () => {
            const config: VibefunConfig = {
                compilerOptions: {
                    paths: { "@/*": ["./src/*"] },
                },
            };

            const result = getAllPathMappings("./local", config);
            expect(result).toEqual([]);
        });

        it("should return mappings from multiple matching patterns", () => {
            // Note: in practice only first match is used, but this shows all possibilities
            const config: VibefunConfig = {
                compilerOptions: {
                    paths: {
                        "@utils/*": ["./src/utils/*"],
                        "@/*": ["./src/*"],
                    },
                },
            };

            // @utils/helper matches only @utils/*
            const result = getAllPathMappings("@utils/helper", config);

            expect(result).toEqual([{ mappedPath: "./src/utils/helper", pattern: "@utils/*" }]);
        });
    });

    // =========================================================================
    // resolveMappedPath
    // =========================================================================

    describe("resolveMappedPath", () => {
        it("should resolve relative path to absolute", () => {
            const result = resolveMappedPath("./src/utils", tempDir);
            expect(result).toBe(path.join(tempDir, "src", "utils"));
        });

        it("should resolve parent relative path", () => {
            const result = resolveMappedPath("../shared/utils", path.join(tempDir, "sub"));
            expect(result).toBe(path.join(tempDir, "shared", "utils"));
        });

        it("should not modify non-relative paths", () => {
            const result = resolveMappedPath("some-package", tempDir);
            expect(result).toBe("some-package");
        });

        it("should not modify absolute paths", () => {
            const absPath = "/absolute/path/to/module";
            const result = resolveMappedPath(absPath, tempDir);
            expect(result).toBe(absPath);
        });

        it("should handle complex relative paths", () => {
            const result = resolveMappedPath("./a/../b/./c", tempDir);
            // path.resolve normalizes the path
            expect(result).toBe(path.join(tempDir, "b", "c"));
        });
    });

    // =========================================================================
    // Edge Cases
    // =========================================================================

    describe("edge cases", () => {
        it("should handle empty import path", () => {
            const config: VibefunConfig = {
                compilerOptions: {
                    paths: { "@/*": ["./src/*"] },
                },
            };

            const result = applyPathMapping("", config, tempDir);
            expect(result.mappedPath).toBe(null);
        });

        it("should handle pattern that is just wildcard", () => {
            const config: VibefunConfig = {
                compilerOptions: {
                    paths: { "*": ["./src/*"] },
                },
            };

            const result = applyPathMapping("anything", config, tempDir);

            expect(result.mappedPath).toBe("./src/anything");
            expect(result.matchedPattern).toBe("*");
        });

        it("should handle Unicode in import paths", () => {
            const config: VibefunConfig = {
                compilerOptions: {
                    paths: { "@/*": ["./src/*"] },
                },
            };

            const result = applyPathMapping("@/日本語/モジュール", config, tempDir);

            expect(result.mappedPath).toBe("./src/日本語/モジュール");
        });

        it("should handle import path with spaces", () => {
            const config: VibefunConfig = {
                compilerOptions: {
                    paths: { "@/*": ["./src/*"] },
                },
            };

            const result = applyPathMapping("@/my module/file", config, tempDir);

            expect(result.mappedPath).toBe("./src/my module/file");
        });

        it("should handle config with null in paths array", () => {
            // TypeScript types prevent this, but test runtime robustness
            const config = {
                compilerOptions: {
                    paths: { "@/*": [null, "./src/*"] as unknown as string[] },
                },
            };

            // Should skip null entries and use the next valid one
            const result = applyPathMapping("@/utils", config as VibefunConfig, tempDir);

            // Null entry is skipped, second entry "./src/*" is used
            expect(result.mappedPath).toBe("./src/utils");
            expect(result.matchedPattern).toBe("@/*");
        });

        it("should handle replacement without wildcard when pattern has wildcard", () => {
            const config: VibefunConfig = {
                compilerOptions: {
                    // Pattern has wildcard, but replacement doesn't
                    paths: { "@/*": ["./src/default"] },
                },
            };

            const result = applyPathMapping("@/anything", config, tempDir);

            // Without * in replacement, captured part is not inserted
            expect(result.mappedPath).toBe("./src/default");
        });
    });
});
