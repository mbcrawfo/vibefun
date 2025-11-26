/**
 * Tests for Package Resolution
 *
 * Tests cover:
 * - Package import parsing (@scope/package, package)
 * - node_modules search algorithm (current and ancestor directories)
 * - Scoped package resolution (@org/package)
 * - Package file vs directory resolution (.vf vs index.vf)
 * - Subpath imports (@org/package/sub/path)
 * - Error cases (package not found)
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getNodeModulesSearchPaths, parsePackageImportPath, resolvePackageImport } from "./package-resolver.js";

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a temporary directory for test fixtures.
 * Returns the real path (symlinks resolved) for consistent comparisons on macOS.
 */
function createTempDir(): string {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "vibefun-pkg-test-"));
    // Resolve to real path (on macOS, /var is a symlink to /private/var)
    return fs.realpathSync(tempDir);
}

/**
 * Clean up temporary directory
 */
function cleanupTempDir(dir: string): void {
    fs.rmSync(dir, { recursive: true, force: true });
}

/**
 * Create a test file with optional content
 */
function createTestFile(filePath: string, content: string = ""): void {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content);
}

/**
 * Create a directory (and parents)
 */
function createDir(dirPath: string): void {
    fs.mkdirSync(dirPath, { recursive: true });
}

// =============================================================================
// Tests: parsePackageImportPath
// =============================================================================

describe("package-resolver", () => {
    describe("parsePackageImportPath", () => {
        it("should parse scoped package @scope/name", () => {
            const result = parsePackageImportPath("@vibefun/std");
            expect(result).toEqual({
                scope: "@vibefun",
                name: "std",
                subpath: null,
            });
        });

        it("should parse scoped package with subpath", () => {
            const result = parsePackageImportPath("@vibefun/std/option");
            expect(result).toEqual({
                scope: "@vibefun",
                name: "std",
                subpath: "option",
            });
        });

        it("should parse scoped package with deep subpath", () => {
            const result = parsePackageImportPath("@org/package/deep/nested/path");
            expect(result).toEqual({
                scope: "@org",
                name: "package",
                subpath: "deep/nested/path",
            });
        });

        it("should parse unscoped package", () => {
            const result = parsePackageImportPath("lodash");
            expect(result).toEqual({
                scope: null,
                name: "lodash",
                subpath: null,
            });
        });

        it("should parse unscoped package with subpath", () => {
            const result = parsePackageImportPath("lodash/fp");
            expect(result).toEqual({
                scope: null,
                name: "lodash",
                subpath: "fp",
            });
        });

        it("should parse unscoped package with deep subpath", () => {
            const result = parsePackageImportPath("some-package/utils/helpers");
            expect(result).toEqual({
                scope: null,
                name: "some-package",
                subpath: "utils/helpers",
            });
        });

        it("should handle just @scope (invalid, but parsed)", () => {
            const result = parsePackageImportPath("@scope");
            expect(result).toEqual({
                scope: "@scope",
                name: "",
                subpath: null,
            });
        });
    });

    // =============================================================================
    // Tests: resolvePackageImport
    // =============================================================================

    describe("resolvePackageImport", () => {
        let tempDir: string;

        beforeEach(() => {
            tempDir = createTempDir();
        });

        afterEach(() => {
            cleanupTempDir(tempDir);
        });

        describe("basic package resolution", () => {
            it("should resolve scoped package with index.vf", () => {
                const srcDir = path.join(tempDir, "src");
                const nodeModules = path.join(tempDir, "node_modules");
                const packageDir = path.join(nodeModules, "@vibefun", "std");
                const indexFile = path.join(packageDir, "index.vf");

                createDir(srcDir);
                createTestFile(indexFile, "// @vibefun/std");

                const result = resolvePackageImport("@vibefun/std", srcDir);

                expect(result.resolvedPath).toBe(indexFile);
                expect(result.nodeModulesDir).toBe(nodeModules);
            });

            it("should resolve scoped package with .vf file", () => {
                const srcDir = path.join(tempDir, "src");
                const nodeModules = path.join(tempDir, "node_modules");
                const packageFile = path.join(nodeModules, "@vibefun", "std.vf");

                createDir(srcDir);
                createTestFile(packageFile, "// @vibefun/std as file");

                const result = resolvePackageImport("@vibefun/std", srcDir);

                expect(result.resolvedPath).toBe(packageFile);
                expect(result.nodeModulesDir).toBe(nodeModules);
            });

            it("should resolve unscoped package with index.vf", () => {
                const srcDir = path.join(tempDir, "src");
                const nodeModules = path.join(tempDir, "node_modules");
                const indexFile = path.join(nodeModules, "my-package", "index.vf");

                createDir(srcDir);
                createTestFile(indexFile, "// my-package");

                const result = resolvePackageImport("my-package", srcDir);

                expect(result.resolvedPath).toBe(indexFile);
                expect(result.nodeModulesDir).toBe(nodeModules);
            });

            it("should resolve unscoped package with .vf file", () => {
                const srcDir = path.join(tempDir, "src");
                const nodeModules = path.join(tempDir, "node_modules");
                const packageFile = path.join(nodeModules, "my-package.vf");

                createDir(srcDir);
                createTestFile(packageFile, "// my-package as file");

                const result = resolvePackageImport("my-package", srcDir);

                expect(result.resolvedPath).toBe(packageFile);
                expect(result.nodeModulesDir).toBe(nodeModules);
            });

            it("should prefer .vf file over directory with index.vf", () => {
                const srcDir = path.join(tempDir, "src");
                const nodeModules = path.join(tempDir, "node_modules");
                const packageFile = path.join(nodeModules, "my-package.vf");
                const indexFile = path.join(nodeModules, "my-package", "index.vf");

                createDir(srcDir);
                createTestFile(packageFile, "// file version");
                createTestFile(indexFile, "// directory version");

                const result = resolvePackageImport("my-package", srcDir);

                // File takes precedence
                expect(result.resolvedPath).toBe(packageFile);
            });
        });

        describe("subpath resolution", () => {
            it("should resolve scoped package with subpath", () => {
                const srcDir = path.join(tempDir, "src");
                const nodeModules = path.join(tempDir, "node_modules");
                const subpathFile = path.join(nodeModules, "@vibefun", "std", "option.vf");

                createDir(srcDir);
                createTestFile(subpathFile, "// option module");

                const result = resolvePackageImport("@vibefun/std/option", srcDir);

                expect(result.resolvedPath).toBe(subpathFile);
            });

            it("should resolve deep subpath to file", () => {
                const srcDir = path.join(tempDir, "src");
                const nodeModules = path.join(tempDir, "node_modules");
                const subpathFile = path.join(nodeModules, "@org", "pkg", "utils", "helpers.vf");

                createDir(srcDir);
                createTestFile(subpathFile, "// helpers");

                const result = resolvePackageImport("@org/pkg/utils/helpers", srcDir);

                expect(result.resolvedPath).toBe(subpathFile);
            });

            it("should resolve deep subpath to directory index", () => {
                const srcDir = path.join(tempDir, "src");
                const nodeModules = path.join(tempDir, "node_modules");
                const indexFile = path.join(nodeModules, "@org", "pkg", "utils", "index.vf");

                createDir(srcDir);
                createTestFile(indexFile, "// utils index");

                const result = resolvePackageImport("@org/pkg/utils", srcDir);

                expect(result.resolvedPath).toBe(indexFile);
            });

            it("should resolve unscoped package with subpath", () => {
                const srcDir = path.join(tempDir, "src");
                const nodeModules = path.join(tempDir, "node_modules");
                const subpathFile = path.join(nodeModules, "lodash", "fp.vf");

                createDir(srcDir);
                createTestFile(subpathFile, "// lodash/fp");

                const result = resolvePackageImport("lodash/fp", srcDir);

                expect(result.resolvedPath).toBe(subpathFile);
            });
        });

        describe("node_modules search algorithm", () => {
            it("should search node_modules in current directory", () => {
                const srcDir = path.join(tempDir, "src");
                const nodeModules = path.join(srcDir, "node_modules");
                const indexFile = path.join(nodeModules, "local-pkg", "index.vf");

                createTestFile(indexFile, "// local");

                const result = resolvePackageImport("local-pkg", srcDir);

                expect(result.resolvedPath).toBe(indexFile);
                expect(result.nodeModulesDir).toBe(nodeModules);
            });

            it("should search node_modules in parent directory", () => {
                const srcDir = path.join(tempDir, "project", "src", "deep");
                const nodeModules = path.join(tempDir, "project", "node_modules");
                const indexFile = path.join(nodeModules, "parent-pkg", "index.vf");

                createDir(srcDir);
                createTestFile(indexFile, "// from parent");

                const result = resolvePackageImport("parent-pkg", srcDir);

                expect(result.resolvedPath).toBe(indexFile);
                expect(result.nodeModulesDir).toBe(nodeModules);
            });

            it("should search node_modules in ancestor directories", () => {
                const srcDir = path.join(tempDir, "a", "b", "c", "d", "e");
                const nodeModules = path.join(tempDir, "a", "node_modules");
                const indexFile = path.join(nodeModules, "ancestor-pkg", "index.vf");

                createDir(srcDir);
                createTestFile(indexFile, "// from ancestor");

                const result = resolvePackageImport("ancestor-pkg", srcDir);

                expect(result.resolvedPath).toBe(indexFile);
                expect(result.nodeModulesDir).toBe(nodeModules);
            });

            it("should prefer closer node_modules", () => {
                const srcDir = path.join(tempDir, "project", "src");
                const projectNodeModules = path.join(tempDir, "project", "node_modules");
                const rootNodeModules = path.join(tempDir, "node_modules");

                const nearFile = path.join(projectNodeModules, "pkg", "index.vf");
                const farFile = path.join(rootNodeModules, "pkg", "index.vf");

                createDir(srcDir);
                createTestFile(nearFile, "// near");
                createTestFile(farFile, "// far");

                const result = resolvePackageImport("pkg", srcDir);

                expect(result.resolvedPath).toBe(nearFile);
                expect(result.nodeModulesDir).toBe(projectNodeModules);
            });

            it("should find package in further node_modules if not in closer", () => {
                const srcDir = path.join(tempDir, "project", "src");
                const projectNodeModules = path.join(tempDir, "project", "node_modules");
                const rootNodeModules = path.join(tempDir, "node_modules");

                // Only create empty project node_modules (no pkg)
                createDir(projectNodeModules);
                const farFile = path.join(rootNodeModules, "far-pkg", "index.vf");
                createTestFile(farFile, "// far");

                const result = resolvePackageImport("far-pkg", srcDir);

                expect(result.resolvedPath).toBe(farFile);
                expect(result.nodeModulesDir).toBe(rootNodeModules);
            });
        });

        describe("package not found", () => {
            it("should return null for non-existent package", () => {
                const srcDir = path.join(tempDir, "src");
                createDir(srcDir);

                const result = resolvePackageImport("non-existent", srcDir);

                expect(result.resolvedPath).toBeNull();
                expect(result.nodeModulesDir).toBeNull();
            });

            it("should return null for non-existent scoped package", () => {
                const srcDir = path.join(tempDir, "src");
                createDir(srcDir);

                const result = resolvePackageImport("@scope/non-existent", srcDir);

                expect(result.resolvedPath).toBeNull();
                expect(result.nodeModulesDir).toBeNull();
            });

            it("should return null for invalid @scope (no package name)", () => {
                const srcDir = path.join(tempDir, "src");
                createDir(srcDir);

                const result = resolvePackageImport("@scope", srcDir);

                expect(result.resolvedPath).toBeNull();
            });

            it("should return null when node_modules exists but package does not", () => {
                const srcDir = path.join(tempDir, "src");
                const nodeModules = path.join(tempDir, "node_modules");
                const otherPkg = path.join(nodeModules, "other-pkg", "index.vf");

                createDir(srcDir);
                createTestFile(otherPkg, "// other");

                const result = resolvePackageImport("missing-pkg", srcDir);

                expect(result.resolvedPath).toBeNull();
            });

            it("should return null for non-existent subpath", () => {
                const srcDir = path.join(tempDir, "src");
                const nodeModules = path.join(tempDir, "node_modules");
                const indexFile = path.join(nodeModules, "@vibefun", "std", "index.vf");

                createDir(srcDir);
                createTestFile(indexFile, "// std");

                const result = resolvePackageImport("@vibefun/std/nonexistent", srcDir);

                expect(result.resolvedPath).toBeNull();
            });
        });

        describe("edge cases", () => {
            it("should handle package directory that exists but has no .vf files", () => {
                const srcDir = path.join(tempDir, "src");
                const packageDir = path.join(tempDir, "node_modules", "empty-pkg");

                createDir(srcDir);
                createDir(packageDir);
                // Package directory exists but has no index.vf

                const result = resolvePackageImport("empty-pkg", srcDir);

                expect(result.resolvedPath).toBeNull();
            });

            it("should handle scope directory that exists but package does not", () => {
                const srcDir = path.join(tempDir, "src");
                const scopeDir = path.join(tempDir, "node_modules", "@vibefun");
                const otherPkg = path.join(scopeDir, "other", "index.vf");

                createDir(srcDir);
                createTestFile(otherPkg, "// other");

                const result = resolvePackageImport("@vibefun/missing", srcDir);

                expect(result.resolvedPath).toBeNull();
            });

            it("should handle empty node_modules directory", () => {
                const srcDir = path.join(tempDir, "src");
                const nodeModules = path.join(tempDir, "node_modules");

                createDir(srcDir);
                createDir(nodeModules);

                const result = resolvePackageImport("any-pkg", srcDir);

                expect(result.resolvedPath).toBeNull();
            });
        });
    });

    // =============================================================================
    // Tests: getNodeModulesSearchPaths
    // =============================================================================

    describe("getNodeModulesSearchPaths", () => {
        let tempDir: string;

        beforeEach(() => {
            tempDir = createTempDir();
        });

        afterEach(() => {
            cleanupTempDir(tempDir);
        });

        it("should return empty array when no node_modules exist", () => {
            const srcDir = path.join(tempDir, "a", "b", "c");
            createDir(srcDir);

            const result = getNodeModulesSearchPaths(srcDir);

            expect(result).toEqual([]);
        });

        it("should return single node_modules in current directory", () => {
            const srcDir = path.join(tempDir, "src");
            const nodeModules = path.join(srcDir, "node_modules");
            createDir(nodeModules);

            const result = getNodeModulesSearchPaths(srcDir);

            expect(result).toEqual([nodeModules]);
        });

        it("should return node_modules in order from current to ancestor", () => {
            const srcDir = path.join(tempDir, "project", "src", "deep");
            const nearNodeModules = path.join(tempDir, "project", "src", "node_modules");
            const midNodeModules = path.join(tempDir, "project", "node_modules");
            const farNodeModules = path.join(tempDir, "node_modules");

            createDir(srcDir);
            createDir(nearNodeModules);
            createDir(midNodeModules);
            createDir(farNodeModules);

            const result = getNodeModulesSearchPaths(srcDir);

            // Should be in order from closest to furthest
            expect(result).toEqual([nearNodeModules, midNodeModules, farNodeModules]);
        });

        it("should skip directories without node_modules", () => {
            const srcDir = path.join(tempDir, "a", "b", "c");
            const farNodeModules = path.join(tempDir, "a", "node_modules");

            createDir(srcDir);
            createDir(farNodeModules);
            // b and c don't have node_modules

            const result = getNodeModulesSearchPaths(srcDir);

            expect(result).toEqual([farNodeModules]);
        });
    });
});
