/**
 * Compiler Configuration Module
 *
 * This module provides loading and parsing of `vibefun.json` configuration files.
 * It is used by multiple compiler phases:
 *
 * - Module loader: For path mappings (import aliases)
 * - Type checker: For strict mode, target settings (future)
 * - Code generator: For output settings (future)
 * - CLI: For project configuration (future)
 *
 * @module config
 */

// Config loading functions
export { findProjectRoot, loadConfigFromEntryPoint, loadVibefunConfig } from "./config-loader.js";

// Config types
export type { ConfigLoadResult, PathMappings, VibefunCompilerOptions, VibefunConfig } from "./types.js";
