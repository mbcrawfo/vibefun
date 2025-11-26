/**
 * Path Mapping for Module Resolution
 *
 * This module provides path mapping utilities for module resolution.
 * It interprets the `compilerOptions.paths` configuration from vibefun.json
 * to resolve import aliases like `@/utils` to actual file paths.
 *
 * Key functions:
 * - `applyPathMapping`: Apply path mappings to an import path
 * - `getAllPathMappings`: Get all possible mapped paths (for error messages)
 * - `resolveMappedPath`: Resolve a mapped path to an absolute path
 *
 * Note: Config loading is handled by the `../config` module. This module
 * only handles the interpretation of path mappings for module resolution.
 *
 * @module module-loader/path-mapping
 */

import type { VibefunConfig } from "../config/index.js";

import * as path from "node:path";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of applying a path mapping
 */
export type PathMappingResult = {
    /** The mapped path (relative or absolute), or null if no mapping matched */
    mappedPath: string | null;
    /** The pattern that matched (for debugging/error messages) */
    matchedPattern: string | null;
};

// =============================================================================
// Private Helpers
// =============================================================================

/**
 * Parse a path pattern into its prefix (before *) and suffix (after *).
 *
 * @example
 * parsePattern("@/*") => { prefix: "@/", suffix: "", hasWildcard: true }
 * parsePattern("@components/*") => { prefix: "@components/", suffix: "", hasWildcard: true }
 * parsePattern("lodash") => { prefix: "lodash", suffix: "", hasWildcard: false }
 */
function parsePattern(pattern: string): {
    prefix: string;
    suffix: string;
    hasWildcard: boolean;
} {
    const wildcardIndex = pattern.indexOf("*");
    if (wildcardIndex === -1) {
        return { prefix: pattern, suffix: "", hasWildcard: false };
    }
    return {
        prefix: pattern.substring(0, wildcardIndex),
        suffix: pattern.substring(wildcardIndex + 1),
        hasWildcard: true,
    };
}

/**
 * Check if an import path matches a pattern and extract the wildcard match.
 *
 * @example
 * matchPattern("@/utils/helper", "@/*") => { matches: true, captured: "utils/helper" }
 * matchPattern("@other/foo", "@/*") => { matches: false, captured: null }
 * matchPattern("lodash", "lodash") => { matches: true, captured: null }
 */
function matchPattern(
    importPath: string,
    pattern: string,
): {
    matches: boolean;
    captured: string | null;
} {
    const { prefix, suffix, hasWildcard } = parsePattern(pattern);

    if (!hasWildcard) {
        // Exact match required
        return { matches: importPath === pattern, captured: null };
    }

    // Check if import starts with prefix and ends with suffix
    if (!importPath.startsWith(prefix)) {
        return { matches: false, captured: null };
    }

    if (suffix && !importPath.endsWith(suffix)) {
        return { matches: false, captured: null };
    }

    // Extract the captured wildcard portion
    const captured = importPath.substring(prefix.length, importPath.length - suffix.length);

    return { matches: true, captured };
}

/**
 * Apply a replacement pattern with the captured wildcard value.
 *
 * @example
 * applyReplacement("./src/*", "utils/helper") => "./src/utils/helper"
 * applyReplacement("./src/index", null) => "./src/index"
 */
function applyReplacement(replacement: string, captured: string | null): string {
    if (captured === null) {
        return replacement;
    }

    const wildcardIndex = replacement.indexOf("*");
    if (wildcardIndex === -1) {
        return replacement;
    }

    return replacement.substring(0, wildcardIndex) + captured + replacement.substring(wildcardIndex + 1);
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Apply path mappings to an import path.
 *
 * Tries each pattern in the order they appear in the paths object.
 * For each matching pattern, tries each replacement in order.
 * Returns the first replacement that can be resolved.
 *
 * Note: This function only applies the mapping transformation. The caller
 * is responsible for checking if the resulting path actually exists.
 *
 * @param importPath - The import path to transform (e.g., '@/utils')
 * @param config - The vibefun configuration with path mappings
 * @param _projectRoot - The project root directory (for resolving relative paths)
 * @returns Result with the mapped path (or null if no mapping matched)
 *
 * @example
 * ```typescript
 * const config = { compilerOptions: { paths: { "@/*": ["./src/*"] } } };
 * const result = applyPathMapping('@/utils', config, '/project');
 * // result.mappedPath = './src/utils'
 * // result.matchedPattern = '@/*'
 *
 * // No match:
 * const result2 = applyPathMapping('./local', config, '/project');
 * // result2.mappedPath = null
 * // result2.matchedPattern = null
 * ```
 */
export function applyPathMapping(
    importPath: string,
    config: VibefunConfig | null,
    _projectRoot: string,
): PathMappingResult {
    if (!config?.compilerOptions?.paths) {
        return { mappedPath: null, matchedPattern: null };
    }

    const paths = config.compilerOptions.paths;

    // Try each pattern in order
    for (const pattern of Object.keys(paths)) {
        const { matches, captured } = matchPattern(importPath, pattern);

        if (matches) {
            const replacements = paths[pattern];
            if (!replacements || replacements.length === 0) {
                continue;
            }

            // Try each replacement in order
            // Return the first one (caller will check if it resolves)
            for (const replacement of replacements) {
                // Skip null/undefined entries (defensive against malformed configs)
                if (!replacement) continue;
                const mappedPath = applyReplacement(replacement, captured);
                return { mappedPath, matchedPattern: pattern };
            }
        }
    }

    return { mappedPath: null, matchedPattern: null };
}

/**
 * Get all possible mapped paths for an import (for error messages).
 *
 * Unlike applyPathMapping which returns the first match, this returns
 * ALL possible replacements for debugging/error messages.
 *
 * @param importPath - The import path to transform
 * @param config - The vibefun configuration with path mappings
 * @returns Array of all possible mapped paths with their source patterns
 *
 * @example
 * ```typescript
 * const config = {
 *     compilerOptions: {
 *         paths: {
 *             "@/*": ["./src/*", "./lib/*"],
 *             "@components/*": ["./src/components/*"]
 *         }
 *     }
 * };
 *
 * getAllPathMappings('@/utils', config);
 * // Returns: [
 * //   { mappedPath: './src/utils', pattern: '@/*' },
 * //   { mappedPath: './lib/utils', pattern: '@/*' }
 * // ]
 * ```
 */
export function getAllPathMappings(
    importPath: string,
    config: VibefunConfig | null,
): Array<{ mappedPath: string; pattern: string }> {
    if (!config?.compilerOptions?.paths) {
        return [];
    }

    const results: Array<{ mappedPath: string; pattern: string }> = [];
    const paths = config.compilerOptions.paths;

    for (const pattern of Object.keys(paths)) {
        const { matches, captured } = matchPattern(importPath, pattern);

        if (matches) {
            const replacements = paths[pattern];
            if (!replacements) continue;

            for (const replacement of replacements) {
                // Skip null/undefined entries (defensive against malformed configs)
                if (!replacement) continue;
                const mappedPath = applyReplacement(replacement, captured);
                results.push({ mappedPath, pattern });
            }
        }
    }

    return results;
}

/**
 * Resolve a path mapping to an absolute path.
 *
 * If the mapped path is relative (starts with ./), it's resolved
 * relative to the project root. Otherwise, it's returned as-is.
 *
 * @param mappedPath - The path from applyPathMapping
 * @param projectRoot - The project root directory
 * @returns Absolute path
 *
 * @example
 * ```typescript
 * resolveMappedPath('./src/utils', '/project');
 * // Returns: '/project/src/utils'
 *
 * resolveMappedPath('some-package', '/project');
 * // Returns: 'some-package' (unchanged, not relative)
 * ```
 */
export function resolveMappedPath(mappedPath: string, projectRoot: string): string {
    if (mappedPath.startsWith("./") || mappedPath.startsWith("../")) {
        return path.resolve(projectRoot, mappedPath);
    }
    return mappedPath;
}
