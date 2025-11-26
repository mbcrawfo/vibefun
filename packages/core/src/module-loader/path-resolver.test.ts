/**
 * Tests for Path Resolution
 *
 * Tests cover:
 * - Relative path resolution (./, ../)
 * - Extension resolution (.vf added if missing)
 * - Directory resolution (index.vf)
 * - File precedence over directory
 * - Symlink resolution
 * - Circular symlink detection
 * - Case sensitivity warnings (VF5901)
 * - Edge cases (trailing slash, current directory, Unicode paths)
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as process from "node:process";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { initializeDiagnosticCodes } from "../diagnostics/index.js";
import {
    fileExists,
    getRealPath,
    isPackageImport,
    isRelativeImport,
    normalizeImportPath,
    resolveImportPath,
    resolveModulePath,
} from "./path-resolver.js";

// Initialize the diagnostic registry before tests
initializeDiagnosticCodes();

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a temporary directory for test fixtures.
 * Returns the real path (symlinks resolved) for consistent comparisons on macOS.
 */
function createTempDir(): string {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "vibefun-path-test-"));
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
 * Create a dummy Location for testing
 */
function testLoc(file: string = "test.vf"): { file: string; line: number; column: number; offset: number } {
    return { file, line: 1, column: 1, offset: 0 };
}

// =============================================================================
// Tests: Relative Path Resolution
// =============================================================================

describe("path-resolver", () => {
    let tempDir: string;

    beforeEach(() => {
        tempDir = createTempDir();
    });

    afterEach(() => {
        cleanupTempDir(tempDir);
    });

    describe("resolveImportPath", () => {
        describe("relative path resolution", () => {
            it("should resolve ./file to file.vf in same directory", () => {
                const fromFile = path.join(tempDir, "main.vf");
                const targetFile = path.join(tempDir, "utils.vf");
                createTestFile(fromFile);
                createTestFile(targetFile);

                const result = resolveImportPath(fromFile, "./utils", testLoc());

                expect(result.resolvedPath).toBe(targetFile);
                expect(result.warnings).toHaveLength(0);
            });

            it("should resolve ../file to file.vf in parent directory", () => {
                const subDir = path.join(tempDir, "sub");
                const fromFile = path.join(subDir, "main.vf");
                const targetFile = path.join(tempDir, "utils.vf");
                createTestFile(fromFile);
                createTestFile(targetFile);

                const result = resolveImportPath(fromFile, "../utils", testLoc());

                expect(result.resolvedPath).toBe(targetFile);
            });

            it("should resolve deeply nested relative paths", () => {
                const deepDir = path.join(tempDir, "a", "b", "c");
                const fromFile = path.join(deepDir, "main.vf");
                const targetFile = path.join(tempDir, "utils.vf");
                createTestFile(fromFile);
                createTestFile(targetFile);

                const result = resolveImportPath(fromFile, "../../../utils", testLoc());

                expect(result.resolvedPath).toBe(targetFile);
            });

            it("should handle ./. path (current directory)", () => {
                const fromFile = path.join(tempDir, "main.vf");
                const indexFile = path.join(tempDir, "index.vf");
                createTestFile(fromFile);
                createTestFile(indexFile);

                const result = resolveImportPath(fromFile, ".", testLoc());

                expect(result.resolvedPath).toBe(indexFile);
            });

            it("should handle .. path (parent directory)", () => {
                const subDir = path.join(tempDir, "sub");
                const fromFile = path.join(subDir, "main.vf");
                const indexFile = path.join(tempDir, "index.vf");
                createTestFile(fromFile);
                createTestFile(indexFile);

                const result = resolveImportPath(fromFile, "..", testLoc());

                expect(result.resolvedPath).toBe(indexFile);
            });
        });

        describe("extension resolution", () => {
            it("should add .vf extension if missing", () => {
                const fromFile = path.join(tempDir, "main.vf");
                const targetFile = path.join(tempDir, "utils.vf");
                createTestFile(fromFile);
                createTestFile(targetFile);

                const result = resolveImportPath(fromFile, "./utils", testLoc());

                expect(result.resolvedPath).toBe(targetFile);
            });

            it("should not add .vf.vf if extension already present", () => {
                const fromFile = path.join(tempDir, "main.vf");
                const targetFile = path.join(tempDir, "utils.vf");
                createTestFile(fromFile);
                createTestFile(targetFile);

                const result = resolveImportPath(fromFile, "./utils.vf", testLoc());

                expect(result.resolvedPath).toBe(targetFile);
            });

            it("should return null if file not found even with extension", () => {
                const fromFile = path.join(tempDir, "main.vf");
                createTestFile(fromFile);

                const result = resolveImportPath(fromFile, "./nonexistent", testLoc());

                expect(result.resolvedPath).toBeNull();
            });
        });

        describe("directory resolution", () => {
            it("should resolve directory to index.vf", () => {
                const fromFile = path.join(tempDir, "main.vf");
                const subDir = path.join(tempDir, "utils");
                const indexFile = path.join(subDir, "index.vf");
                createTestFile(fromFile);
                createTestFile(indexFile);

                const result = resolveImportPath(fromFile, "./utils", testLoc());

                expect(result.resolvedPath).toBe(indexFile);
            });

            it("should prefer file over directory with same name", () => {
                const fromFile = path.join(tempDir, "main.vf");
                const utilsFile = path.join(tempDir, "utils.vf");
                const indexFile = path.join(tempDir, "utils", "index.vf");
                createTestFile(fromFile);
                createTestFile(utilsFile);
                createTestFile(indexFile);

                const result = resolveImportPath(fromFile, "./utils", testLoc());

                // File takes precedence over directory
                expect(result.resolvedPath).toBe(utilsFile);
            });

            it("should handle trailing slash as explicit directory reference", () => {
                const fromFile = path.join(tempDir, "main.vf");
                const utilsFile = path.join(tempDir, "utils.vf");
                const indexFile = path.join(tempDir, "utils", "index.vf");
                createTestFile(fromFile);
                createTestFile(utilsFile);
                createTestFile(indexFile);

                const result = resolveImportPath(fromFile, "./utils/", testLoc());

                // Trailing slash forces directory resolution
                expect(result.resolvedPath).toBe(indexFile);
            });

            it("should return null for trailing slash if no index.vf", () => {
                const fromFile = path.join(tempDir, "main.vf");
                const subDir = path.join(tempDir, "utils");
                createTestFile(fromFile);
                fs.mkdirSync(subDir, { recursive: true });

                const result = resolveImportPath(fromFile, "./utils/", testLoc());

                expect(result.resolvedPath).toBeNull();
            });
        });

        describe("path normalization", () => {
            it("should normalize paths with ./a/../b", () => {
                const fromFile = path.join(tempDir, "main.vf");
                const targetFile = path.join(tempDir, "utils.vf");
                createTestFile(fromFile);
                createTestFile(targetFile);

                const result = resolveImportPath(fromFile, "./other/../utils", testLoc());

                expect(result.resolvedPath).toBe(targetFile);
            });

            it("should handle multiple .. segments", () => {
                const deepDir = path.join(tempDir, "a", "b", "c", "d");
                const fromFile = path.join(deepDir, "main.vf");
                const targetFile = path.join(tempDir, "a", "utils.vf");
                createTestFile(fromFile);
                createTestFile(targetFile);

                const result = resolveImportPath(fromFile, "../../../utils", testLoc());

                expect(result.resolvedPath).toBe(targetFile);
            });
        });
    });

    describe("resolveModulePath", () => {
        it("should resolve path with .vf extension", () => {
            const targetFile = path.join(tempDir, "utils.vf");
            createTestFile(targetFile);

            const result = resolveModulePath(targetFile);

            expect(result).toBe(targetFile);
        });

        it("should add .vf extension if missing", () => {
            const targetFile = path.join(tempDir, "utils.vf");
            createTestFile(targetFile);

            const result = resolveModulePath(path.join(tempDir, "utils"));

            expect(result).toBe(targetFile);
        });

        it("should resolve to index.vf for directory", () => {
            const indexFile = path.join(tempDir, "utils", "index.vf");
            createTestFile(indexFile);

            const result = resolveModulePath(path.join(tempDir, "utils"));

            expect(result).toBe(indexFile);
        });

        it("should return null for nonexistent path", () => {
            const result = resolveModulePath(path.join(tempDir, "nonexistent"));

            expect(result).toBeNull();
        });
    });

    describe("normalizeImportPath", () => {
        it("should return same path for ./utils and ./utils.vf", () => {
            const targetFile = path.join(tempDir, "utils.vf");
            createTestFile(targetFile);

            const result1 = normalizeImportPath("./utils", tempDir);
            const result2 = normalizeImportPath("./utils.vf", tempDir);

            expect(result1).toBe(result2);
            expect(result1).toBe(targetFile);
        });

        it("should return null for nonexistent path", () => {
            const result = normalizeImportPath("./nonexistent", tempDir);

            expect(result).toBeNull();
        });
    });

    describe("symlink resolution", () => {
        // Skip symlink tests on Windows (symlinks require admin privileges)
        const supportsSymlinks = process.platform !== "win32";

        it.skipIf(!supportsSymlinks)("should resolve symlink to real path", () => {
            const realFile = path.join(tempDir, "real.vf");
            const linkFile = path.join(tempDir, "link.vf");
            createTestFile(realFile);
            fs.symlinkSync(realFile, linkFile);

            const fromFile = path.join(tempDir, "main.vf");
            createTestFile(fromFile);

            // Importing via symlink should resolve to real path
            const result = resolveImportPath(fromFile, "./link", testLoc());

            expect(result.resolvedPath).toBe(realFile);
        });

        it.skipIf(!supportsSymlinks)("should resolve symlinked directory", () => {
            const realDir = path.join(tempDir, "real");
            const indexFile = path.join(realDir, "index.vf");
            const linkDir = path.join(tempDir, "link");
            createTestFile(indexFile);
            fs.symlinkSync(realDir, linkDir, "dir");

            const fromFile = path.join(tempDir, "main.vf");
            createTestFile(fromFile);

            const result = resolveImportPath(fromFile, "./link", testLoc());

            expect(result.resolvedPath).toBe(indexFile);
        });

        it.skipIf(!supportsSymlinks)("should ensure symlink and real path resolve to same module", () => {
            const realFile = path.join(tempDir, "utils.vf");
            const linkFile = path.join(tempDir, "link.vf");
            createTestFile(realFile);
            fs.symlinkSync(realFile, linkFile);

            const fromFile = path.join(tempDir, "main.vf");
            createTestFile(fromFile);

            const resultViaSymlink = resolveImportPath(fromFile, "./link", testLoc());
            const resultViaReal = resolveImportPath(fromFile, "./utils", testLoc());

            // Both should resolve to the same real path
            expect(resultViaSymlink.resolvedPath).toBe(resultViaReal.resolvedPath);
        });
    });

    describe("getRealPath", () => {
        it("should return real path for existing file", () => {
            const targetFile = path.join(tempDir, "utils.vf");
            createTestFile(targetFile);

            const result = getRealPath(targetFile);

            expect(result).toBe(targetFile);
        });

        it("should return null for nonexistent file", () => {
            const result = getRealPath(path.join(tempDir, "nonexistent.vf"));

            expect(result).toBeNull();
        });

        // Skip symlink tests on Windows
        const supportsSymlinks = process.platform !== "win32";

        it.skipIf(!supportsSymlinks)("should resolve symlink to real path", () => {
            const realFile = path.join(tempDir, "real.vf");
            const linkFile = path.join(tempDir, "link.vf");
            createTestFile(realFile);
            fs.symlinkSync(realFile, linkFile);

            const result = getRealPath(linkFile);

            expect(result).toBe(realFile);
        });

        it.skipIf(!supportsSymlinks)("should throw on circular symlink", () => {
            const link1 = path.join(tempDir, "link1");
            const link2 = path.join(tempDir, "link2");

            // Create circular symlinks: link1 -> link2 -> link1
            fs.symlinkSync(link2, link1);
            fs.symlinkSync(link1, link2);

            expect(() => getRealPath(link1)).toThrow(/[Cc]ircular/);
        });
    });

    describe("case sensitivity warnings", () => {
        // Only run these on case-insensitive file systems (macOS, Windows)
        const isCaseInsensitive = process.platform === "darwin" || process.platform === "win32";

        it.skipIf(!isCaseInsensitive)("should warn when import case differs from file", () => {
            const fromFile = path.join(tempDir, "main.vf");
            const targetFile = path.join(tempDir, "utils.vf"); // lowercase
            createTestFile(fromFile);
            createTestFile(targetFile);

            // Import with uppercase should work but warn
            const result = resolveImportPath(fromFile, "./Utils", testLoc());

            expect(result.resolvedPath).toBe(targetFile);
            expect(result.warnings).toHaveLength(1);
            expect(result.warnings[0]?.code).toBe("VF5901");
        });

        it.skipIf(!isCaseInsensitive)("should not warn when case matches", () => {
            const fromFile = path.join(tempDir, "main.vf");
            const targetFile = path.join(tempDir, "utils.vf");
            createTestFile(fromFile);
            createTestFile(targetFile);

            const result = resolveImportPath(fromFile, "./utils", testLoc());

            expect(result.resolvedPath).toBe(targetFile);
            expect(result.warnings).toHaveLength(0);
        });

        it("should respect checkCaseSensitivity option", () => {
            const fromFile = path.join(tempDir, "main.vf");
            const targetFile = path.join(tempDir, "utils.vf");
            createTestFile(fromFile);
            createTestFile(targetFile);

            const result = resolveImportPath(fromFile, "./Utils", testLoc(), {
                checkCaseSensitivity: false,
            });

            // Should not warn even if case differs
            expect(result.warnings).toHaveLength(0);
        });
    });

    describe("isRelativeImport", () => {
        it("should return true for ./ paths", () => {
            expect(isRelativeImport("./utils")).toBe(true);
            expect(isRelativeImport("./a/b/c")).toBe(true);
        });

        it("should return true for ../ paths", () => {
            expect(isRelativeImport("../utils")).toBe(true);
            expect(isRelativeImport("../../a/b")).toBe(true);
        });

        it("should return true for . and ..", () => {
            expect(isRelativeImport(".")).toBe(true);
            expect(isRelativeImport("..")).toBe(true);
        });

        it("should return false for package imports", () => {
            expect(isRelativeImport("@vibefun/std")).toBe(false);
            expect(isRelativeImport("lodash")).toBe(false);
            expect(isRelativeImport("@org/package")).toBe(false);
        });
    });

    describe("isPackageImport", () => {
        it("should return true for bare package names", () => {
            expect(isPackageImport("lodash")).toBe(true);
            expect(isPackageImport("@vibefun/std")).toBe(true);
            expect(isPackageImport("@org/package")).toBe(true);
        });

        it("should return false for relative paths", () => {
            expect(isPackageImport("./utils")).toBe(false);
            expect(isPackageImport("../lib")).toBe(false);
            expect(isPackageImport(".")).toBe(false);
            expect(isPackageImport("..")).toBe(false);
        });

        it("should return false for absolute paths", () => {
            expect(isPackageImport("/absolute/path")).toBe(false);
        });
    });

    describe("fileExists", () => {
        it("should return true for existing file", () => {
            const targetFile = path.join(tempDir, "utils.vf");
            createTestFile(targetFile);

            expect(fileExists(targetFile)).toBe(true);
        });

        it("should return false for nonexistent file", () => {
            expect(fileExists(path.join(tempDir, "nonexistent.vf"))).toBe(false);
        });

        it("should return false for directory", () => {
            const dir = path.join(tempDir, "subdir");
            fs.mkdirSync(dir, { recursive: true });

            expect(fileExists(dir)).toBe(false);
        });
    });

    describe("edge cases", () => {
        it("should handle empty directory (no index.vf)", () => {
            const fromFile = path.join(tempDir, "main.vf");
            const emptyDir = path.join(tempDir, "empty");
            createTestFile(fromFile);
            fs.mkdirSync(emptyDir, { recursive: true });

            const result = resolveImportPath(fromFile, "./empty", testLoc());

            expect(result.resolvedPath).toBeNull();
        });

        it("should handle very long paths", () => {
            // Create a deeply nested structure
            const segments = ["a", "b", "c", "d", "e", "f", "g", "h"];
            const deepPath = path.join(tempDir, ...segments);
            const targetFile = path.join(deepPath, "utils.vf");
            const fromFile = path.join(deepPath, "main.vf");
            createTestFile(targetFile);
            createTestFile(fromFile);

            const result = resolveImportPath(fromFile, "./utils", testLoc());

            expect(result.resolvedPath).toBe(targetFile);
        });

        // Skip Unicode test on Windows due to potential encoding issues
        it.skipIf(process.platform === "win32")("should handle Unicode in paths", () => {
            const unicodeDir = path.join(tempDir, "ユニコード");
            const targetFile = path.join(unicodeDir, "utils.vf");
            const fromFile = path.join(unicodeDir, "main.vf");
            createTestFile(targetFile);
            createTestFile(fromFile);

            const result = resolveImportPath(fromFile, "./utils", testLoc());

            expect(result.resolvedPath).toBe(targetFile);
        });

        it("should handle import from root (multiple ..)", () => {
            const deepDir = path.join(tempDir, "a", "b", "c", "d", "e");
            const fromFile = path.join(deepDir, "main.vf");
            const targetFile = path.join(tempDir, "root.vf");
            createTestFile(fromFile);
            createTestFile(targetFile);

            const result = resolveImportPath(fromFile, "../../../../../root", testLoc());

            expect(result.resolvedPath).toBe(targetFile);
        });

        it("should not resolve file that is actually a directory", () => {
            const fromFile = path.join(tempDir, "main.vf");
            createTestFile(fromFile);

            // Create a directory named "utils.vf" (unusual but possible)
            const weirdDir = path.join(tempDir, "utils.vf");
            fs.mkdirSync(weirdDir, { recursive: true });

            // This should not resolve because utils.vf is a directory, not a file
            const result = resolveImportPath(fromFile, "./utils.vf", testLoc());

            // Should be null since ./utils.vf is a directory
            expect(result.resolvedPath).toBeNull();
        });
    });
});
