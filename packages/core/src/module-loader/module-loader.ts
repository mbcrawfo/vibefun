/**
 * Module Loader for Vibefun
 *
 * This module discovers and parses all modules transitively from an entry point.
 * It is responsible for:
 * - Entry point validation
 * - Transitive import discovery
 * - Module parsing and caching
 * - Error collection (not fail-fast)
 *
 * The module loader is separated from the module resolver (which analyzes
 * dependencies and detects cycles) for clean separation of concerns:
 * - Module loader: File I/O, parsing, caching
 * - Module resolver: Pure graph analysis, cycle detection
 *
 * @module module-loader
 */

import type { VibefunConfig } from "../config/index.js";
import type { Location, Module } from "../types/index.js";

import * as fs from "node:fs";
import * as path from "node:path";

import { loadConfigFromEntryPoint } from "../config/index.js";
import { createDiagnostic, throwDiagnostic, VibefunDiagnostic } from "../diagnostics/index.js";
import { Lexer } from "../lexer/index.js";
import { Parser } from "../parser/index.js";
import { getNodeModulesSearchPaths, resolvePackageImport } from "./package-resolver.js";
import { applyPathMapping, getAllPathMappings, resolveMappedPath } from "./path-mapping.js";
import {
    getRealPath,
    isPackageImport,
    isRelativeImport,
    resolveImportPath,
    resolveModulePath,
} from "./path-resolver.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of loading all modules from an entry point
 */
export type ModuleLoadResult = {
    /** All loaded modules, keyed by real path */
    modules: Map<string, Module>;
    /** Any warnings generated during loading (e.g., case sensitivity) */
    warnings: VibefunDiagnostic[];
    /** The entry point real path */
    entryPoint: string;
    /** The project root directory (if vibefun.json found) */
    projectRoot: string | null;
};

/**
 * Options for module loading
 */
export type ModuleLoaderOptions = {
    /** Enable case sensitivity checking (default: true) */
    checkCaseSensitivity?: boolean;
};

/**
 * Internal options with all values resolved to their defaults
 */
type ResolvedOptions = {
    checkCaseSensitivity: boolean;
};

/**
 * Information about an import that needs to be resolved
 */
type PendingImport = {
    /** The raw import path from source code */
    importPath: string;
    /** The file that contains this import */
    fromFile: string;
    /** Source location of the import for error messages */
    importLoc: Location;
};

/**
 * Collected error during module loading
 */
type LoadError = {
    /** The diagnostic to throw/report */
    diagnostic: VibefunDiagnostic;
    /** The file where the error occurred */
    file: string;
};

// =============================================================================
// Module Loader Class
// =============================================================================

/**
 * Module loader that discovers and parses all modules transitively.
 *
 * @example
 * ```typescript
 * const loader = new ModuleLoader();
 * const result = loader.loadModules('src/main.vf');
 *
 * for (const [path, module] of result.modules) {
 *     console.log(`Loaded: ${path}`);
 * }
 * ```
 */
export class ModuleLoader {
    /** Cache of loaded modules, keyed by real path (after symlink resolution) */
    private cache: Map<string, Module> = new Map();

    /** Collected errors during loading (not fail-fast) */
    private errors: LoadError[] = [];

    /** Collected warnings during loading */
    private warnings: VibefunDiagnostic[] = [];

    /** Set of paths currently being loaded (for detecting circular imports during loading) */
    private loading: Set<string> = new Set();

    /** Config loaded from vibefun.json (if found) */
    private config: VibefunConfig | null = null;

    /** Project root directory (if vibefun.json found) */
    private projectRoot: string | null = null;

    /** Loader options */
    private options: ResolvedOptions;

    /**
     * Create a new ModuleLoader
     * @param options - Loader options
     */
    constructor(options: ModuleLoaderOptions = {}) {
        this.options = {
            checkCaseSensitivity: options.checkCaseSensitivity ?? true,
        };
    }

    /**
     * Load all modules transitively from an entry point.
     *
     * @param entryPoint - Path to the entry point file (absolute or relative to cwd)
     * @returns Result containing all loaded modules and warnings
     * @throws {VibefunDiagnostic} If entry point not found or any errors during loading
     */
    loadModules(entryPoint: string): ModuleLoadResult {
        // Reset state for fresh load
        this.cache.clear();
        this.errors = [];
        this.warnings = [];
        this.loading.clear();

        // Resolve entry point to absolute path
        const absoluteEntryPoint = path.resolve(entryPoint);

        // Load config from project root
        const configResult = loadConfigFromEntryPoint(absoluteEntryPoint);
        this.config = configResult.config;
        this.projectRoot = configResult.projectRoot;

        // Validate and resolve entry point
        const entryPointRealPath = this.validateEntryPoint(absoluteEntryPoint);

        // Queue of imports to process
        const queue: PendingImport[] = [];

        // Load the entry point module
        const entryModule = this.loadModule(entryPointRealPath, entryPointRealPath);
        if (entryModule) {
            // Discover imports from entry point
            const imports = this.discoverImports(entryModule, entryPointRealPath);
            queue.push(...imports);
        }

        // Process queue until empty (breadth-first discovery)
        while (queue.length > 0) {
            const pending = queue.shift();
            if (!pending) continue;
            const resolvedPath = this.resolveImport(pending);

            if (resolvedPath && !this.cache.has(resolvedPath)) {
                const module = this.loadModule(resolvedPath, pending.fromFile);
                if (module) {
                    const imports = this.discoverImports(module, resolvedPath);
                    queue.push(...imports);
                }
            }
        }

        // If any errors were collected, throw them
        this.throwCollectedErrors();

        return {
            modules: this.cache,
            warnings: this.warnings,
            entryPoint: entryPointRealPath,
            projectRoot: this.projectRoot,
        };
    }

    /**
     * Validate that the entry point exists and return its real path.
     * @throws {VibefunDiagnostic} If entry point not found
     */
    private validateEntryPoint(entryPoint: string): string {
        // Try to resolve the entry point
        const resolved = resolveModulePath(entryPoint);
        if (resolved) {
            return resolved;
        }

        // Try as directory with index.vf
        const indexPath = path.join(entryPoint, "index.vf");
        const resolvedIndex = resolveModulePath(indexPath);
        if (resolvedIndex) {
            return resolvedIndex;
        }

        // Entry point not found - generate helpful error
        const triedPaths: string[] = [];

        // What we tried
        if (!entryPoint.endsWith(".vf")) {
            triedPaths.push(entryPoint + ".vf");
        } else {
            triedPaths.push(entryPoint);
        }
        triedPaths.push(path.join(entryPoint, "index.vf"));

        // Synthetic location for entry point error
        const loc: Location = { file: entryPoint, line: 1, column: 1, offset: 0 };
        throwDiagnostic("VF5005", loc, {
            path: entryPoint,
            triedPaths: triedPaths.join(", "),
        });
    }

    /**
     * Load a single module from a file path.
     * Handles parse errors by collecting them instead of failing immediately.
     *
     * @param realPath - Real path to the module file (after symlink resolution)
     * @param requestedFrom - Path of the file that requested this module (for error context)
     * @returns The parsed Module AST, or null if loading failed
     */
    private loadModule(realPath: string, requestedFrom: string): Module | null {
        // Check cache first
        const cached = this.cache.get(realPath);
        if (cached) {
            return cached;
        }

        // Check for circular loading (this shouldn't happen with proper resolution)
        if (this.loading.has(realPath)) {
            // Circular import during loading - this is handled by the resolver later
            // Just return null to avoid infinite loop
            return null;
        }

        // Mark as loading
        this.loading.add(realPath);

        try {
            // Read the file
            const source = this.readFile(realPath, requestedFrom);
            if (source === null) {
                return null;
            }

            // Parse the file
            const module = this.parseFile(source, realPath);
            if (module === null) {
                return null;
            }

            // Add to cache
            this.cache.set(realPath, module);
            return module;
        } finally {
            // Remove from loading set
            this.loading.delete(realPath);
        }
    }

    /**
     * Read a file's contents.
     * @returns File contents, or null if file could not be read
     */
    private readFile(filePath: string, requestedFrom: string): string | null {
        try {
            return fs.readFileSync(filePath, "utf-8");
        } catch (error) {
            // Create a synthetic location for the error
            const loc: Location = { file: requestedFrom, line: 1, column: 1, offset: 0 };

            // Check if it's a permission error
            if (error instanceof Error && "code" in error) {
                const code = (error as Error & { code?: string }).code;
                if (code === "EACCES" || code === "EPERM") {
                    // Permission error
                    this.collectError({
                        diagnostic: createDiagnostic("VF5000", loc, {
                            path: filePath,
                        }),
                        file: requestedFrom,
                    });
                    return null;
                }
            }

            // Generic file read error - treat as module not found
            this.collectError({
                diagnostic: createDiagnostic("VF5000", loc, {
                    path: filePath,
                }),
                file: requestedFrom,
            });

            return null;
        }
    }

    /**
     * Parse a file's contents into a Module AST.
     * @returns Parsed Module, or null if parsing failed
     */
    private parseFile(source: string, filePath: string): Module | null {
        try {
            const lexer = new Lexer(source, filePath);
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens, filePath);
            return parser.parse();
        } catch (error) {
            // Collect parse errors
            if (error instanceof VibefunDiagnostic) {
                this.collectError({
                    diagnostic: error,
                    file: filePath,
                });
            } else {
                // Unexpected error - wrap it
                const errorMessage = error instanceof Error ? error.message : String(error);
                const loc: Location = { file: filePath, line: 1, column: 1, offset: 0 };
                this.collectError({
                    diagnostic: createDiagnostic("VF5000", loc, {
                        path: `Parse error in ${filePath}: ${errorMessage}`,
                    }),
                    file: filePath,
                });
            }
            return null;
        }
    }

    /**
     * Discover all imports from a parsed module.
     * @returns Array of pending imports to resolve
     */
    private discoverImports(module: Module, modulePath: string): PendingImport[] {
        const pending: PendingImport[] = [];

        // Check the imports array
        for (const decl of module.imports) {
            if (decl.kind === "ImportDecl") {
                pending.push({
                    importPath: decl.from,
                    fromFile: modulePath,
                    importLoc: decl.loc,
                });
            } else if (decl.kind === "ReExportDecl") {
                // Re-exports also create dependencies
                pending.push({
                    importPath: decl.from,
                    fromFile: modulePath,
                    importLoc: decl.loc,
                });
            }
        }

        // Also check declarations for re-exports
        for (const decl of module.declarations) {
            if (decl.kind === "ReExportDecl") {
                pending.push({
                    importPath: decl.from,
                    fromFile: modulePath,
                    importLoc: decl.loc,
                });
            }
        }

        return pending;
    }

    /**
     * Resolve an import path to an absolute real path.
     * @returns Resolved path, or null if resolution failed
     */
    private resolveImport(pending: PendingImport): string | null {
        const { importPath, fromFile, importLoc } = pending;
        const fromDir = path.dirname(fromFile);

        // Check for self-import
        const selfCheck = this.checkSelfImport(importPath, fromFile, importLoc);
        if (selfCheck === false) {
            // Self-import detected and error collected
            return null;
        }

        // Try path mappings first (TypeScript behavior)
        if (this.config?.compilerOptions?.paths) {
            const mappingResult = applyPathMapping(importPath, this.config, this.projectRoot || fromDir);
            if (mappingResult.mappedPath) {
                const absoluteMapped = resolveMappedPath(mappingResult.mappedPath, this.projectRoot || fromDir);
                const resolved = resolveModulePath(absoluteMapped);
                if (resolved) {
                    return resolved;
                }
            }
        }

        // Try relative import
        if (isRelativeImport(importPath)) {
            const result = resolveImportPath(fromFile, importPath, importLoc, {
                checkCaseSensitivity: this.options.checkCaseSensitivity,
            });

            // Add any warnings
            this.warnings.push(...result.warnings);

            if (result.resolvedPath) {
                return result.resolvedPath;
            }

            // Module not found
            this.collectModuleNotFoundError(importPath, fromFile, importLoc);
            return null;
        }

        // Try package import
        if (isPackageImport(importPath)) {
            const result = resolvePackageImport(importPath, fromDir);
            if (result.resolvedPath) {
                return result.resolvedPath;
            }

            // Package not found - generate helpful error
            this.collectPackageNotFoundError(importPath, fromDir, importLoc);
            return null;
        }

        // Unknown import type
        this.collectModuleNotFoundError(importPath, fromFile, importLoc);
        return null;
    }

    /**
     * Check if an import is a self-import (module importing itself).
     * @returns true if OK, false if self-import detected (error collected)
     */
    private checkSelfImport(importPath: string, fromFile: string, importLoc: Location): boolean {
        // Resolve the import path to see if it points to fromFile
        const fromDir = path.dirname(fromFile);

        let resolvedPath: string | null = null;

        // Try path mappings first
        if (this.config?.compilerOptions?.paths) {
            const mappingResult = applyPathMapping(importPath, this.config, this.projectRoot || fromDir);
            if (mappingResult.mappedPath) {
                const absoluteMapped = resolveMappedPath(mappingResult.mappedPath, this.projectRoot || fromDir);
                resolvedPath = resolveModulePath(absoluteMapped);
            }
        }

        // Try relative import
        if (!resolvedPath && isRelativeImport(importPath)) {
            const result = resolveImportPath(fromFile, importPath, importLoc, {
                checkCaseSensitivity: false, // Don't warn during self-import check
            });
            resolvedPath = result.resolvedPath;
        }

        // Try package import
        if (!resolvedPath && isPackageImport(importPath)) {
            const result = resolvePackageImport(importPath, fromDir);
            resolvedPath = result.resolvedPath;
        }

        // Check if resolved path matches fromFile
        if (resolvedPath) {
            const fromRealPath = getRealPath(fromFile);
            if (fromRealPath && resolvedPath === fromRealPath) {
                // Self-import detected
                this.collectError({
                    diagnostic: createDiagnostic("VF5004", importLoc, {
                        path: importPath,
                    }),
                    file: fromFile,
                });
                return false;
            }
        }

        return true;
    }

    /**
     * Collect a module not found error.
     */
    private collectModuleNotFoundError(importPath: string, fromFile: string, importLoc: Location): void {
        // Try to suggest similar filenames
        const suggestion = this.findSimilarFilename(importPath, fromFile);

        let errorMessage = importPath;
        if (suggestion) {
            errorMessage = `${importPath}. Did you mean '${suggestion}'?`;
        }

        this.collectError({
            diagnostic: createDiagnostic("VF5000", importLoc, {
                path: errorMessage,
            }),
            file: fromFile,
        });
    }

    /**
     * Collect a package not found error with search path info.
     */
    private collectPackageNotFoundError(importPath: string, fromDir: string, importLoc: Location): void {
        const searchPaths = getNodeModulesSearchPaths(fromDir);
        const searchInfo =
            searchPaths.length > 0
                ? ` (searched: ${searchPaths.slice(0, 3).join(", ")}${searchPaths.length > 3 ? "..." : ""})`
                : "";

        // Check if there were any path mappings that could have matched
        let mappingInfo = "";
        if (this.config) {
            const mappings = getAllPathMappings(importPath, this.config);
            if (mappings.length > 0) {
                mappingInfo = ` (path mapping '${mappings[0]?.pattern}' matched but resolved path not found)`;
            }
        }

        this.collectError({
            diagnostic: createDiagnostic("VF5000", importLoc, {
                path: `${importPath}${mappingInfo}${searchInfo}`,
            }),
            file: fromDir,
        });
    }

    /**
     * Find a similar filename in the same directory (for typo suggestions).
     */
    private findSimilarFilename(importPath: string, fromFile: string): string | null {
        try {
            const fromDir = path.dirname(fromFile);
            const importBasename = path.basename(importPath).replace(/\.vf$/, "");

            // Get the target directory
            const targetDir = isRelativeImport(importPath) ? path.resolve(fromDir, path.dirname(importPath)) : fromDir;

            // Read directory contents
            const entries = fs.readdirSync(targetDir);

            // Find .vf files with similar names
            const vfFiles = entries.filter((e) => e.endsWith(".vf")).map((e) => e.replace(/\.vf$/, ""));

            // Simple Levenshtein-like similarity check
            for (const file of vfFiles) {
                const distance = this.levenshteinDistance(importBasename.toLowerCase(), file.toLowerCase());
                // If edit distance is small (1-2 characters), suggest it
                if (distance > 0 && distance <= 2) {
                    const dir = path.dirname(importPath);
                    return dir === "." ? `./${file}` : `${dir}/${file}`;
                }
            }

            return null;
        } catch {
            return null;
        }
    }

    /**
     * Calculate Levenshtein distance between two strings.
     * Uses a space-optimized algorithm with two rows.
     */
    private levenshteinDistance(a: string, b: string): number {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        // Use two rows for space optimization
        let prevRow: number[] = Array.from({ length: a.length + 1 }, (_, i) => i);
        let currRow: number[] = new Array<number>(a.length + 1);

        for (let i = 1; i <= b.length; i++) {
            currRow[0] = i;
            for (let j = 1; j <= a.length; j++) {
                const cost = b[i - 1] === a[j - 1] ? 0 : 1;
                const prev = prevRow[j - 1] ?? 0;
                const prevJ = prevRow[j] ?? 0;
                const currJMinus1 = currRow[j - 1] ?? 0;
                currRow[j] = Math.min(
                    prev + cost, // substitution
                    currJMinus1 + 1, // insertion
                    prevJ + 1, // deletion
                );
            }
            // Swap rows
            [prevRow, currRow] = [currRow, prevRow];
        }

        return prevRow[a.length] ?? 0;
    }

    /**
     * Collect an error for later reporting.
     */
    private collectError(error: LoadError): void {
        this.errors.push(error);
    }

    /**
     * Throw all collected errors.
     * If multiple errors, includes count in message.
     */
    private throwCollectedErrors(): void {
        if (this.errors.length === 0) {
            return;
        }

        // Throw the first error (others could be shown in a multi-error display)
        const firstError = this.errors[0];
        if (firstError) {
            throw firstError.diagnostic;
        }
    }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Load all modules transitively from an entry point.
 *
 * This is the main entry point for module loading. It discovers all imports
 * recursively, parses each module once, and returns a map of all modules.
 *
 * @param entryPoint - Path to the entry point file
 * @param options - Loader options
 * @returns Result containing all loaded modules and warnings
 * @throws {VibefunDiagnostic} If entry point not found or any errors during loading
 *
 * @example
 * ```typescript
 * const result = loadModules('src/main.vf');
 *
 * console.log(`Loaded ${result.modules.size} modules`);
 * console.log(`Entry point: ${result.entryPoint}`);
 *
 * for (const [path, module] of result.modules) {
 *     console.log(`- ${path}`);
 * }
 *
 * if (result.warnings.length > 0) {
 *     console.log('Warnings:');
 *     for (const warning of result.warnings) {
 *         console.log(warning.format());
 *     }
 * }
 * ```
 */
export function loadModules(entryPoint: string, options: ModuleLoaderOptions = {}): ModuleLoadResult {
    const loader = new ModuleLoader(options);
    return loader.loadModules(entryPoint);
}
