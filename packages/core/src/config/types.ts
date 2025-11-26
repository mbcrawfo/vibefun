/**
 * Compiler Configuration Types
 *
 * This module defines the types for Vibefun compiler configuration.
 * Configuration is loaded from `vibefun.json` files in the project root.
 *
 * These types are used by:
 * - Module loader (for path mappings)
 * - Type checker (for strict mode, target settings - future)
 * - Code generator (for output settings - future)
 * - CLI (for project configuration - future)
 *
 * @module config/types
 */

// =============================================================================
// Path Mapping Types
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

// =============================================================================
// Compiler Options
// =============================================================================

/**
 * Compiler options in vibefun.json
 *
 * This type will be extended as we add more compiler features.
 */
export type VibefunCompilerOptions = {
    /** Path mappings for import aliases */
    paths?: PathMappings;
    // Future options (type checker, code generator):
    // strict?: boolean;
    // target?: "es2020" | "es2021" | "es2022";
    // sourceMap?: boolean;
};

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Full vibefun.json configuration
 *
 * This is the root type for the vibefun.json file.
 * Additional fields are preserved when loading.
 */
export type VibefunConfig = {
    /** Compiler options */
    compilerOptions?: VibefunCompilerOptions;
    // Note: Additional fields may be present and are preserved
};

/**
 * Result of loading a config file
 *
 * Contains the loaded configuration along with metadata about
 * where it was found.
 */
export type ConfigLoadResult = {
    /** The loaded configuration (null if not found) */
    config: VibefunConfig | null;
    /** The path to the config file (null if not found) */
    configPath: string | null;
    /** The project root directory (directory containing config file, or null) */
    projectRoot: string | null;
};
