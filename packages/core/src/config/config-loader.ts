/**
 * Configuration Loading
 *
 * This module implements loading and parsing of `vibefun.json` configuration files.
 * It provides the core functionality for finding and loading project configuration.
 *
 * Key functions:
 * - `findProjectRoot`: Walk up from a starting directory to find the project root
 * - `loadVibefunConfig`: Load vibefun.json from a directory
 * - `loadConfigFromEntryPoint`: Convenience function combining both
 *
 * @module config/config-loader
 */

import type { ConfigLoadResult, VibefunConfig } from "./types.js";

import * as fs from "node:fs";
import * as path from "node:path";

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
