/**
 * Module Loader
 *
 * This module provides path resolution and module discovery for Vibefun imports.
 *
 * @module module-loader
 */

// Path resolution
export {
    fileExists,
    getRealPath,
    isPackageImport,
    isRelativeImport,
    normalizeImportPath,
    resolveImportPath,
    resolveModulePath,
} from "./path-resolver.js";
export type { PathResolutionResult, PathResolverOptions } from "./path-resolver.js";

// Package resolution
export { getNodeModulesSearchPaths, parsePackageImportPath, resolvePackageImport } from "./package-resolver.js";
export type { PackageResolutionResult } from "./package-resolver.js";

// Path mapping (module-resolution specific interpretation of config)
export { applyPathMapping, getAllPathMappings, resolveMappedPath } from "./path-mapping.js";
export type { PathMappingResult } from "./path-mapping.js";

// Re-export config types and functions for backwards compatibility
// These are now defined in ../config but re-exported here for existing consumers
export { findProjectRoot, loadConfigFromEntryPoint, loadVibefunConfig } from "../config/index.js";
export type { ConfigLoadResult, PathMappings, VibefunCompilerOptions, VibefunConfig } from "../config/index.js";
