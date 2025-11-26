/**
 * Module Loader
 *
 * This module provides path resolution and module discovery for Vibefun imports.
 *
 * @module module-loader
 */

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

export { getNodeModulesSearchPaths, parsePackageImportPath, resolvePackageImport } from "./package-resolver.js";
export type { PackageResolutionResult } from "./package-resolver.js";

export {
    applyPathMapping,
    findProjectRoot,
    getAllPathMappings,
    loadConfigFromEntryPoint,
    loadVibefunConfig,
    resolveMappedPath,
} from "./config-loader.js";
export type {
    ConfigLoadResult,
    PathMappingResult,
    PathMappings,
    VibefunCompilerOptions,
    VibefunConfig,
} from "./config-loader.js";
