/**
 * Config Loading for Module Resolution
 *
 * This module implements loading and parsing of `vibefun.json` configuration files,
 * with support for path mappings (TypeScript-style):
 *
 * - Find project root: Walk up from entry point looking for vibefun.json
 * - Load config: Parse JSON with clear error messages
 * - Path mappings: Support `@/*` → `./src/*` style aliases
 *
 * @module config-loader
 */

import * as fs from "node:fs";
import * as path from "node:path";

// =============================================================================
// Types
// =============================================================================

/**
 * Path mapping configuration for import aliases.
 *
 * Keys are patterns (e.g., "@/*"), values are arrays of replacement paths.
 * Multiple replacement paths are tried in order until one resolves.
 *
 * @example
 * ```json
 * {
 *   "@/*": ["./src/*"],
 *   "@components/*": ["./src/components/*", "./shared/components/*"]
 * }
 * ```
 */
export type PathMappings = Record<string, string[]>;

/**
 * Compiler options in vibefun.json
 */
export type VibefunCompilerOptions = {
    /** Path mappings for import aliases */
    paths?: PathMappings;
};

/**
 * Full vibefun.json configuration
 */
export type VibefunConfig = {
    /** Compiler options */
    compilerOptions?: VibefunCompilerOptions;
};

/**
 * Result of loading a config file
 */
export type ConfigLoadResult = {
    /** The loaded configuration (null if not found) */
    config: VibefunConfig | null;
    /** The path to the config file (null if not found) */
    configPath: string | null;
    /** The project root directory (directory containing config file, or null) */
    projectRoot: string | null;
};

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
 * Find the project root by walking up from a starting directory.
 *
 * Looks for `vibefun.json` first, then falls back to `package.json`.
 * Returns the directory containing the config file, or null if none found.
 *
 * @param startDir - The directory to start searching from (e.g., entry point directory)
 * @returns The project root directory, or null if not found
 *
 * @example
 * ```typescript
 * const projectRoot = findProjectRoot('/project/src/deep/nested');
 * // Returns '/project' if /project/vibefun.json exists
 * ```
 */
export function findProjectRoot(startDir: string): string | null {
    let currentDir = path.resolve(startDir);
    const root = path.parse(currentDir).root;

    while (true) {
        // Check for vibefun.json first (preferred)
        const vibefunConfig = path.join(currentDir, "vibefun.json");
        if (isFile(vibefunConfig)) {
            return currentDir;
        }

        // Fall back to package.json
        const packageJson = path.join(currentDir, "package.json");
        if (isFile(packageJson)) {
            return currentDir;
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

    return null;
}

/**
 * Load a vibefun.json configuration file from a directory.
 *
 * Returns null if the file doesn't exist (not an error).
 * Throws an error if the file exists but contains invalid JSON.
 *
 * @param projectRoot - The directory to load vibefun.json from
 * @returns The loaded configuration, or null if not found
 * @throws Error if the file contains invalid JSON
 *
 * @example
 * ```typescript
 * const config = loadVibefunConfig('/project');
 * if (config) {
 *     console.log('Path mappings:', config.compilerOptions?.paths);
 * }
 * ```
 */
export function loadVibefunConfig(projectRoot: string): VibefunConfig | null {
    const configPath = path.join(projectRoot, "vibefun.json");

    if (!isFile(configPath)) {
        return null;
    }

    try {
        const content = fs.readFileSync(configPath, "utf-8");
        const config = JSON.parse(content) as VibefunConfig;
        return config;
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error(`Invalid JSON in vibefun.json at ${configPath}: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Load vibefun.json configuration by searching from an entry point.
 *
 * Combines findProjectRoot and loadVibefunConfig for convenience.
 *
 * @param entryPoint - Path to the entry point file or directory
 * @returns Result containing config, config path, and project root
 *
 * @example
 * ```typescript
 * const result = loadConfigFromEntryPoint('/project/src/main.vf');
 * if (result.config) {
 *     console.log('Found config at:', result.configPath);
 *     console.log('Project root:', result.projectRoot);
 * }
 * ```
 */
export function loadConfigFromEntryPoint(entryPoint: string): ConfigLoadResult {
    // Get the directory of the entry point
    const startDir = isFile(entryPoint) ? path.dirname(entryPoint) : entryPoint;

    // Find the project root
    const projectRoot = findProjectRoot(startDir);
    if (!projectRoot) {
        return { config: null, configPath: null, projectRoot: null };
    }

    // Try to load vibefun.json (may not exist even if project root found via package.json)
    const configPath = path.join(projectRoot, "vibefun.json");
    const config = loadVibefunConfig(projectRoot);

    return {
        config,
        configPath: config ? configPath : null,
        projectRoot,
    };
}

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
 * @param projectRoot - The project root directory (for resolving relative paths)
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
