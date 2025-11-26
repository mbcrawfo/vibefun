/**
 * Package Resolution for Module Loading
 *
 * This module implements node_modules lookup for package imports in Vibefun,
 * following Node.js/TypeScript resolution patterns:
 *
 * - Package imports: `@vibefun/std`, `@org/package`, `package-name`
 * - node_modules search: Current and ancestor directories
 * - Scoped packages: `@scope/package` → `node_modules/@scope/package`
 * - Extension resolution: `.vf` added if missing
 * - Directory resolution: `package` → `package/index.vf`
 *
 * @module package-resolver
 */

import * as fs from "node:fs";
import * as path from "node:path";

import { fileExists, getRealPath, resolveModulePath } from "./path-resolver.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of package resolution
 */
export type PackageResolutionResult = {
    /** The resolved absolute real path (null if not found) */
    resolvedPath: string | null;
    /** The node_modules directory where the package was found (null if not found) */
    nodeModulesDir: string | null;
};

// =============================================================================
// Private Helpers
// =============================================================================

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
 * Parse a package import path into scope and package name parts.
 *
 * Examples:
 * - `@vibefun/std` → { scope: '@vibefun', name: 'std', subpath: null }
 * - `@org/package/sub/path` → { scope: '@org', name: 'package', subpath: 'sub/path' }
 * - `package-name` → { scope: null, name: 'package-name', subpath: null }
 * - `package-name/sub/path` → { scope: null, name: 'package-name', subpath: 'sub/path' }
 */
function parsePackagePath(importPath: string): {
    scope: string | null;
    name: string;
    subpath: string | null;
} {
    const parts = importPath.split("/");

    if (importPath.startsWith("@")) {
        // Scoped package: @scope/package[/subpath...]
        const scope = parts[0] ?? "";
        if (parts.length < 2) {
            // Invalid: just "@scope" without package name
            return { scope, name: "", subpath: null };
        }
        const name = parts[1] ?? "";
        const subpath = parts.length > 2 ? parts.slice(2).join("/") : null;
        return { scope, name, subpath };
    }

    // Unscoped package: package[/subpath...]
    const name = parts[0] ?? "";
    const subpath = parts.length > 1 ? parts.slice(1).join("/") : null;
    return { scope: null, name, subpath };
}

/**
 * Get the package directory name in node_modules.
 * For scoped packages like @org/package, this returns "@org/package".
 */
function getPackageDir(scope: string | null, name: string): string {
    if (scope) {
        return `${scope}/${name}`;
    }
    return name;
}

/**
 * Try to resolve a package from a specific node_modules directory.
 * Returns the resolved path if found, null otherwise.
 */
function tryResolveFromNodeModules(
    nodeModulesDir: string,
    scope: string | null,
    name: string,
    subpath: string | null,
): string | null {
    const packageDir = path.join(nodeModulesDir, getPackageDir(scope, name));

    // If there's a subpath, resolve it relative to the package directory
    if (subpath) {
        const fullPath = path.join(packageDir, subpath);
        return resolveModulePath(fullPath);
    }

    // No subpath - try package root as file or directory
    // First try <package>.vf (file)
    const packageFile = packageDir + ".vf";
    if (fileExists(packageFile)) {
        return getRealPath(packageFile);
    }

    // Then try <package>/index.vf (directory with index)
    const indexFile = path.join(packageDir, "index.vf");
    if (fileExists(indexFile)) {
        return getRealPath(indexFile);
    }

    return null;
}

/**
 * Walk up the directory tree looking for node_modules directories.
 * Yields each node_modules path found from current directory up to root.
 */
function* walkNodeModules(startDir: string): Generator<string> {
    let currentDir = path.resolve(startDir);
    const root = path.parse(currentDir).root;

    while (true) {
        const nodeModulesDir = path.join(currentDir, "node_modules");
        if (isDirectory(nodeModulesDir)) {
            yield nodeModulesDir;
        }

        // Check if we've reached the root
        if (currentDir === root) {
            break;
        }

        // Move to parent directory
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) {
            // Reached filesystem root
            break;
        }
        currentDir = parentDir;
    }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Resolve a package import path to an absolute real path.
 *
 * Searches node_modules directories starting from the importing file's directory
 * and walking up the directory tree.
 *
 * @param importPath - The package import path (e.g., '@vibefun/std', 'lodash')
 * @param fromDir - The directory of the importing file
 * @returns Resolution result with path and location info
 *
 * @example
 * ```typescript
 * // Resolve @vibefun/std from a file in /project/src/
 * const result = resolvePackageImport('@vibefun/std', '/project/src');
 * if (result.resolvedPath) {
 *     console.log('Found at:', result.resolvedPath);
 *     console.log('In node_modules:', result.nodeModulesDir);
 * }
 *
 * // Resolve a nested path
 * const result2 = resolvePackageImport('@vibefun/std/option', '/project/src');
 * ```
 */
export function resolvePackageImport(importPath: string, fromDir: string): PackageResolutionResult {
    const { scope, name, subpath } = parsePackagePath(importPath);

    // Invalid package path (e.g., just "@scope")
    if (!name) {
        return { resolvedPath: null, nodeModulesDir: null };
    }

    // Search node_modules directories from current to root
    for (const nodeModulesDir of walkNodeModules(fromDir)) {
        const resolved = tryResolveFromNodeModules(nodeModulesDir, scope, name, subpath);
        if (resolved) {
            return { resolvedPath: resolved, nodeModulesDir };
        }
    }

    return { resolvedPath: null, nodeModulesDir: null };
}

/**
 * Get all node_modules directories that would be searched for a package import.
 * Useful for error messages showing where resolution was attempted.
 *
 * @param fromDir - The directory to start searching from
 * @returns Array of node_modules directories that exist in the search path
 *
 * @example
 * ```typescript
 * const searchPaths = getNodeModulesSearchPaths('/project/src/deep/nested');
 * // Returns: ['/project/src/deep/nested/node_modules', '/project/src/deep/node_modules', ...]
 * ```
 */
export function getNodeModulesSearchPaths(fromDir: string): string[] {
    return Array.from(walkNodeModules(fromDir));
}

/**
 * Parse a package import path into its component parts.
 *
 * Useful for understanding the structure of a package import and for
 * generating error messages.
 *
 * @param importPath - The package import path to parse
 * @returns Object with scope, name, and subpath components
 *
 * @example
 * ```typescript
 * parsePackageImportPath('@vibefun/std')
 * // => { scope: '@vibefun', name: 'std', subpath: null }
 *
 * parsePackageImportPath('@org/pkg/utils/helper')
 * // => { scope: '@org', name: 'pkg', subpath: 'utils/helper' }
 *
 * parsePackageImportPath('lodash')
 * // => { scope: null, name: 'lodash', subpath: null }
 * ```
 */
export function parsePackageImportPath(importPath: string): {
    scope: string | null;
    name: string;
    subpath: string | null;
} {
    return parsePackagePath(importPath);
}
