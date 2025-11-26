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
