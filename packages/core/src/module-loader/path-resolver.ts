/**
 * Path Resolution for Module Loading
 *
 * This module implements path resolution for Vibefun imports, following
 * Node.js/TypeScript resolution patterns:
 *
 * - Relative imports: `./foo`, `../bar`
 * - Extension resolution: `.vf` added if missing
 * - Directory resolution: `./foo` → `./foo/index.vf` if directory
 * - Symlink resolution: All paths resolved to real paths
 * - Case sensitivity: Warnings for case mismatches (VF5901)
 *
 * @module path-resolver
 */

import type { Location } from "../types/ast.js";

import * as fs from "node:fs";
import * as path from "node:path";

import { createDiagnostic } from "../diagnostics/factory.js";
import { VibefunDiagnostic } from "../diagnostics/index.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of path resolution, including any warnings generated
 */
export type PathResolutionResult = {
    /** The resolved absolute real path (null if not found) */
    resolvedPath: string | null;
    /** Any warnings generated during resolution (e.g., case sensitivity) */
    warnings: VibefunDiagnostic[];
};

/**
 * Options for path resolution
 */
export type PathResolverOptions = {
    /** Enable case sensitivity checking (default: true) */
    checkCaseSensitivity?: boolean;
};

// =============================================================================
// Private Helpers
// =============================================================================

/**
 * Check if a path exists and is a file
 */
function isFile(filePath: string): boolean {
    try {
        const stats = fs.statSync(filePath);
        return stats.isFile();
    } catch {
        return false;
    }
}

/**
 * Check if a path exists and is a directory
 */
function isDirectory(dirPath: string): boolean {
    try {
        const stats = fs.statSync(dirPath);
        return stats.isDirectory();
    } catch {
        return false;
    }
}

/**
 * Get the actual filename case from the directory listing.
 * On case-insensitive systems, the filename returned by realpathSync
 * might not match the actual case on disk.
 */
function getActualFilename(filePath: string): string {
    try {
        const dir = path.dirname(filePath);
        const basename = path.basename(filePath);
        const entries = fs.readdirSync(dir);

        // Find the entry with matching case (case-insensitive comparison)
        const actualEntry = entries.find((entry) => entry.toLowerCase() === basename.toLowerCase());

        if (actualEntry && actualEntry !== basename) {
            return path.join(dir, actualEntry);
        }
        return filePath;
    } catch {
        return filePath;
    }
}

/**
 * Resolve symlinks to get the real path with correct case.
 * Returns null if the path doesn't exist or circular symlink detected.
 */
function resolveRealPath(filePath: string): string | null {
    try {
        const realPath = fs.realpathSync(filePath);
        // Get the actual case from disk (important for case-insensitive filesystems)
        return getActualFilename(realPath);
    } catch (error) {
        // ELOOP indicates circular symlink
        if (error instanceof Error && "code" in error) {
            const code = (error as Error & { code?: string }).code;
            if (code === "ELOOP") {
                throw new Error(`Circular symlink detected: ${filePath}`);
            }
        }
        return null;
    }
}

/**
 * Check case sensitivity by comparing import path against actual file on disk.
 * Returns the actual filename case if there's a mismatch, null otherwise.
 */
function checkCaseMismatch(resolvedPath: string, importedBasename: string): string | null {
    try {
        const dir = path.dirname(resolvedPath);
        const entries = fs.readdirSync(dir);
        const actualFile = path.basename(resolvedPath);

        // Find matching entry (case-insensitive)
        const matchedEntry = entries.find((entry) => entry.toLowerCase() === actualFile.toLowerCase());

        if (matchedEntry && matchedEntry !== actualFile) {
            // Case mismatch detected
            return matchedEntry;
        }

        // Also check if the imported basename differs from actual
        // (e.g., importing './Utils' when file is 'utils.vf')
        const importedWithoutExt = importedBasename.replace(/\.vf$/, "");
        const actualWithoutExt = actualFile.replace(/\.vf$/, "");

        if (
            importedWithoutExt.toLowerCase() === actualWithoutExt.toLowerCase() &&
            importedWithoutExt !== actualWithoutExt
        ) {
            return actualFile;
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * Try to resolve a path with various extensions/index file patterns.
 * Returns the resolved real path if found, null otherwise.
 *
 * Resolution order:
 * 1. If path ends with `.vf`: try as-is
 * 2. If path does NOT end with `.vf`:
 *    a. Try `<path>.vf` (exact file)
 *    b. Try `<path>/index.vf` (directory with index)
 * 3. If path ends with `/` (explicit directory reference):
 *    - ONLY try `<path>index.vf`
 */
function tryResolvePath(basePath: string): string | null {
    // Trailing slash = explicit directory reference
    if (basePath.endsWith("/") || basePath.endsWith(path.sep)) {
        const indexPath = path.join(basePath, "index.vf");
        if (isFile(indexPath)) {
            return resolveRealPath(indexPath);
        }
        return null;
    }

    // If already has .vf extension, try as-is
    if (basePath.endsWith(".vf")) {
        if (isFile(basePath)) {
            return resolveRealPath(basePath);
        }
        return null;
    }

    // Try with .vf extension first (file precedence over directory)
    const withExtension = basePath + ".vf";
    if (isFile(withExtension)) {
        return resolveRealPath(withExtension);
    }

    // Try as directory with index.vf
    if (isDirectory(basePath)) {
        const indexPath = path.join(basePath, "index.vf");
        if (isFile(indexPath)) {
            return resolveRealPath(indexPath);
        }
    }

    return null;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Resolve an import path from an importing file to an absolute real path.
 *
 * Handles:
 * - Relative imports (`./foo`, `../bar`)
 * - Extension resolution (`.vf` added if missing)
 * - Directory resolution (`./foo` → `./foo/index.vf`)
 * - Symlink resolution (returns canonical real path)
 * - Case sensitivity checking (optional)
 *
 * @param fromFile - Absolute path to the importing file
 * @param importPath - The import path from source code (e.g., './utils')
 * @param importLoc - Source location of the import for warning generation
 * @param options - Resolution options
 * @returns Resolution result with path and any warnings
 *
 * @example
 * ```typescript
 * const result = resolveImportPath(
 *     '/project/src/main.vf',
 *     './utils',
 *     importLoc
 * );
 * if (result.resolvedPath) {
 *     console.log('Resolved to:', result.resolvedPath);
 * }
 * if (result.warnings.length > 0) {
 *     // Handle case sensitivity warnings
 * }
 * ```
 */
export function resolveImportPath(
    fromFile: string,
    importPath: string,
    importLoc: Location,
    options: PathResolverOptions = {},
): PathResolutionResult {
    const { checkCaseSensitivity = true } = options;
    const warnings: VibefunDiagnostic[] = [];

    // Get the directory of the importing file
    const fromDir = path.dirname(fromFile);

    // Handle special cases
    if (importPath === ".") {
        // Import from current directory = index.vf
        const absolutePath = path.resolve(fromDir, "index.vf");
        const resolved = tryResolvePath(absolutePath.replace(/\.vf$/, ""));

        if (resolved && checkCaseSensitivity) {
            const caseMismatch = checkCaseMismatch(resolved, "index.vf");
            if (caseMismatch) {
                warnings.push(
                    createDiagnostic("VF5901", importLoc, {
                        actual: importPath,
                        expected: ".",
                    }),
                );
            }
        }

        return { resolvedPath: resolved, warnings };
    }

    if (importPath === "..") {
        // Import from parent directory = parent/index.vf
        const absolutePath = path.resolve(fromDir, "..", "index.vf");
        const resolved = tryResolvePath(absolutePath.replace(/\.vf$/, ""));
        return { resolvedPath: resolved, warnings };
    }

    // Check for trailing slash BEFORE path.resolve strips it
    const hasTrailingSlash = importPath.endsWith("/") || importPath.endsWith(path.sep);

    // Resolve relative path to absolute
    let absolutePath = path.resolve(fromDir, importPath);

    // Restore trailing slash if needed (path.resolve strips it)
    if (hasTrailingSlash && !absolutePath.endsWith("/") && !absolutePath.endsWith(path.sep)) {
        absolutePath += path.sep;
    }

    // Try to resolve the path
    const resolved = tryResolvePath(absolutePath);

    // Check for case sensitivity issues
    if (resolved && checkCaseSensitivity) {
        const importBasename = path.basename(importPath);
        const caseMismatch = checkCaseMismatch(resolved, importBasename);
        if (caseMismatch) {
            // Get the expected import path with correct casing
            const dir = path.dirname(importPath);
            const expectedBasename = caseMismatch.replace(/\.vf$/, "");
            const expected = dir === "." ? `./${expectedBasename}` : `${dir}/${expectedBasename}`;

            warnings.push(
                createDiagnostic("VF5901", importLoc, {
                    actual: importPath,
                    expected: expected,
                }),
            );
        }
    }

    return { resolvedPath: resolved, warnings };
}

/**
 * Resolve a module path (absolute) to a .vf file.
 *
 * Tries:
 * 1. Path as-is (if ends with .vf)
 * 2. Path with .vf extension
 * 3. Path as directory with index.vf
 *
 * @param basePath - Absolute path to resolve (without guaranteed extension)
 * @returns The resolved real path, or null if not found
 *
 * @example
 * ```typescript
 * // All these could resolve to /project/src/utils.vf:
 * resolveModulePath('/project/src/utils');
 * resolveModulePath('/project/src/utils.vf');
 *
 * // This resolves to /project/src/utils/index.vf:
 * resolveModulePath('/project/src/utils');  // if utils is a directory
 * ```
 */
export function resolveModulePath(basePath: string): string | null {
    return tryResolvePath(basePath);
}

/**
 * Normalize an import path to a canonical form for cache lookup.
 *
 * Both `./utils` and `./utils.vf` should resolve to the same cached module.
 * This function ensures consistent cache keys.
 *
 * @param importPath - The import path from source code
 * @param fromDir - The directory of the importing file
 * @returns Normalized absolute path (with symlinks resolved)
 */
export function normalizeImportPath(importPath: string, fromDir: string): string | null {
    const absolutePath = path.resolve(fromDir, importPath);
    const resolved = tryResolvePath(absolutePath);
    return resolved;
}

/**
 * Check if an import path is a relative import (starts with ./ or ../)
 *
 * @param importPath - The import path to check
 * @returns True if the path is relative
 */
export function isRelativeImport(importPath: string): boolean {
    return importPath.startsWith("./") || importPath.startsWith("../") || importPath === "." || importPath === "..";
}

/**
 * Check if an import path is a package import (no ./ or ../ prefix)
 *
 * @param importPath - The import path to check
 * @returns True if the path is a package import
 */
export function isPackageImport(importPath: string): boolean {
    return !isRelativeImport(importPath) && !path.isAbsolute(importPath);
}

/**
 * Get the real path of a file, resolving any symlinks.
 * Throws if circular symlinks are detected.
 *
 * @param filePath - The path to resolve
 * @returns The real path, or null if the file doesn't exist
 * @throws Error if circular symlink is detected
 */
export function getRealPath(filePath: string): string | null {
    return resolveRealPath(filePath);
}

/**
 * Check if a file exists (not a directory)
 *
 * @param filePath - The path to check
 * @returns True if the path exists and is a file
 */
export function fileExists(filePath: string): boolean {
    return isFile(filePath);
}
