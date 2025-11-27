/**
 * Module Resolver - Main API
 *
 * This module provides the main entry points for module resolution in Vibefun.
 * It combines the module graph, cycle detection, and warning generation into
 * a single, cohesive API.
 *
 * Two main functions are provided:
 * - `resolveModules`: Pure function that analyzes pre-loaded modules
 * - `loadAndResolveModules`: Convenience function that loads and resolves
 *
 * @module module-resolver
 */
import type { ModuleLoaderOptions, ModuleLoadResult } from "../module-loader/index.js";
import type { Module } from "../types/index.js";
import type { Cycle, CycleDetectionResult, SelfImport } from "./cycle-detector.js";
import type { ModuleGraphBuildResult } from "./module-graph-builder.js";
import type { ModuleGraph, TopologicalSortResult } from "./module-graph.js";
import type { WarningGenerationResult } from "./warning-generator.js";

import { VibefunDiagnostic } from "../diagnostics/index.js";
import { loadModules } from "../module-loader/index.js";
import { detectCycles } from "./cycle-detector.js";
import { buildModuleGraph } from "./module-graph-builder.js";
import { generateCircularDependencyWarning, generateWarningsFromCycles } from "./warning-generator.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of module resolution.
 *
 * Contains everything needed for compilation:
 * - Compilation order (topologically sorted)
 * - All warnings and errors
 * - The dependency graph (for tooling)
 * - All loaded modules
 */
export type ModuleResolution = {
    /**
     * Modules in topological order (dependencies before dependents).
     * This is the order in which modules should be compiled.
     */
    compilationOrder: string[];

    /**
     * All warnings generated during resolution.
     * Includes circular dependency warnings (VF5900) and case sensitivity
     * warnings (VF5901).
     */
    warnings: VibefunDiagnostic[];

    /**
     * All errors generated during resolution.
     * Includes self-import errors (VF5004) and import conflict errors.
     */
    errors: VibefunDiagnostic[];

    /**
     * The dependency graph.
     * Useful for tooling (visualization, IDE integration, etc.)
     */
    graph: ModuleGraph;

    /**
     * All loaded modules, keyed by real path.
     */
    modules: Map<string, Module>;

    /**
     * Detected cycles (including type-only cycles that don't generate warnings).
     * Useful for tooling and debugging.
     */
    cycles: Cycle[];

    /**
     * Detected self-imports (these generate errors).
     */
    selfImports: SelfImport[];

    /**
     * The entry point module path (if available).
     */
    entryPoint: string | null;

    /**
     * The project root directory (if vibefun.json found).
     */
    projectRoot: string | null;
};

/**
 * Options for module resolution.
 */
export type ModuleResolverOptions = ModuleLoaderOptions & {
    /**
     * Whether to include type-only cycles in warnings (default: false).
     * Type-only cycles are safe at runtime, but some users may want to know about them.
     */
    warnOnTypeOnlyCycles?: boolean;
};

// =============================================================================
// Path Map Builder
// =============================================================================

/**
 * Build a path map from the module load result.
 *
 * The path map maps each module path to its import path → resolved path mappings.
 * This is needed by the graph builder to resolve import paths to absolute paths.
 */
function buildPathMap(modules: Map<string, Module>): Map<string, Map<string, string>> {
    const pathMap = new Map<string, Map<string, string>>();

    for (const [modulePath, module] of modules) {
        const importMap = new Map<string, string>();

        // Process imports
        for (const decl of module.imports) {
            if (decl.kind === "ImportDecl" || decl.kind === "ReExportDecl") {
                // The resolved path should be in the modules map
                // We need to find which module this import resolves to
                const resolvedPath = findResolvedPath(modules, modulePath, decl.from);
                if (resolvedPath) {
                    importMap.set(decl.from, resolvedPath);
                }
            }
        }

        // Process declarations (for re-exports)
        for (const decl of module.declarations) {
            if (decl.kind === "ReExportDecl") {
                const resolvedPath = findResolvedPath(modules, modulePath, decl.from);
                if (resolvedPath) {
                    importMap.set(decl.from, resolvedPath);
                }
            }
        }

        pathMap.set(modulePath, importMap);
    }

    return pathMap;
}

/**
 * Find the resolved path for an import.
 *
 * This is a heuristic that matches import paths to loaded module paths.
 * The loader has already resolved all imports, so we match based on file names.
 */
function findResolvedPath(modules: Map<string, Module>, _fromModule: string, importPath: string): string | null {
    // Try to find a module that matches the import path
    // This is based on the assumption that the loader has already resolved
    // all imports and they're in the modules map

    // Get the base name from the import path
    const importBasename = importPath.split("/").pop()?.replace(/\.vf$/, "") ?? "";

    // First try: exact path match for resolved paths
    for (const modulePath of modules.keys()) {
        // Check if the module path ends with the import path (normalized)
        const normalizedImport = importPath.replace(/^\.\//, "").replace(/\.vf$/, "");
        const normalizedModule = modulePath.replace(/\.vf$/, "");

        if (normalizedModule.endsWith(normalizedImport) || normalizedModule.endsWith(normalizedImport + "/index")) {
            return modulePath;
        }
    }

    // Second try: basename match
    for (const modulePath of modules.keys()) {
        const moduleBasename = modulePath.split("/").pop()?.replace(/\.vf$/, "") ?? "";

        // Check for basename match (handles index.vf case too)
        if (moduleBasename === importBasename || moduleBasename === "index") {
            // More specific: check if the directory matches
            const importDir = importPath.split("/").slice(0, -1).join("/");
            if (importDir === "" || modulePath.includes(importDir.replace(/^\.\//, ""))) {
                return modulePath;
            }
        }
    }

    return null;
}

// =============================================================================
// Main API Functions
// =============================================================================

/**
 * Resolve module dependencies from pre-loaded modules.
 *
 * This is a pure function that performs all resolution logic without any I/O.
 * It's useful for testing and for cases where modules are loaded from sources
 * other than the filesystem.
 *
 * @param modules - Map of module paths to parsed Module ASTs
 * @param options - Resolution options
 * @returns Module resolution result
 *
 * @example
 * ```typescript
 * // For testing or in-memory compilation
 * const modules = new Map<string, Module>();
 * modules.set('/path/to/main.vf', mainModule);
 * modules.set('/path/to/utils.vf', utilsModule);
 *
 * const resolution = resolveModules(modules);
 *
 * // Compile in order
 * for (const modulePath of resolution.compilationOrder) {
 *     const module = resolution.modules.get(modulePath);
 *     // ... compile module
 * }
 * ```
 */
export function resolveModules(modules: Map<string, Module>, options: ModuleResolverOptions = {}): ModuleResolution {
    // Build path map from modules
    const pathMap = buildPathMap(modules);

    // Build the module graph
    const graphResult: ModuleGraphBuildResult = buildModuleGraph(modules, pathMap);

    // Detect cycles
    const cycleResult: CycleDetectionResult = detectCycles(graphResult.graph);

    // Generate warnings and errors from cycles
    const warningResult: WarningGenerationResult = generateWarningsFromCycles(
        cycleResult.cycles,
        cycleResult.selfImports,
    );

    // If warnOnTypeOnlyCycles is enabled, add warnings for type-only cycles too
    if (options.warnOnTypeOnlyCycles) {
        for (const cycle of cycleResult.cycles) {
            if (cycle.isTypeOnly) {
                // Type-only cycles don't normally generate warnings
                // But user requested them
                warningResult.warnings.push(generateCircularDependencyWarning(cycle));
            }
        }
    }

    // Get topological order
    const sortResult: TopologicalSortResult = graphResult.graph.getTopologicalOrder();

    // Combine all errors
    const errors: VibefunDiagnostic[] = [
        ...graphResult.errors, // Import conflict errors
        ...warningResult.selfImportErrors, // Self-import errors
    ];

    return {
        compilationOrder: sortResult.order,
        warnings: warningResult.warnings,
        errors,
        graph: graphResult.graph,
        modules,
        cycles: cycleResult.cycles,
        selfImports: cycleResult.selfImports,
        entryPoint: null,
        projectRoot: null,
    };
}

/**
 * Load and resolve all modules from an entry point.
 *
 * This is a convenience function that combines module loading and resolution.
 * It's the typical entry point for compiling a Vibefun project.
 *
 * @param entryPoint - Path to the entry point file
 * @param options - Loader and resolver options
 * @returns Module resolution result
 * @throws {VibefunDiagnostic} If entry point not found or loading fails
 *
 * @example
 * ```typescript
 * // Typical compilation workflow
 * const resolution = loadAndResolveModules('src/main.vf');
 *
 * // Check for errors
 * if (resolution.errors.length > 0) {
 *     for (const error of resolution.errors) {
 *         console.error(error.format());
 *     }
 *     process.exit(1);
 * }
 *
 * // Report warnings
 * for (const warning of resolution.warnings) {
 *     console.warn(warning.format());
 * }
 *
 * // Compile in order
 * for (const modulePath of resolution.compilationOrder) {
 *     const module = resolution.modules.get(modulePath);
 *     // ... desugar, type check, generate code
 * }
 * ```
 */
export function loadAndResolveModules(entryPoint: string, options: ModuleResolverOptions = {}): ModuleResolution {
    // Load all modules
    const loadResult: ModuleLoadResult = loadModules(entryPoint, options);

    // Resolve dependencies
    const resolution = resolveModules(loadResult.modules, options);

    // Add warnings from loading (e.g., case sensitivity warnings)
    resolution.warnings.push(...loadResult.warnings);

    // Set entry point and project root from load result
    resolution.entryPoint = loadResult.entryPoint;
    resolution.projectRoot = loadResult.projectRoot;

    return resolution;
}

/**
 * Check if a module resolution has any fatal errors.
 *
 * @param resolution - The resolution result to check
 * @returns true if there are errors that should halt compilation
 */
export function hasErrors(resolution: ModuleResolution): boolean {
    return resolution.errors.length > 0;
}

/**
 * Check if a module resolution has any warnings.
 *
 * @param resolution - The resolution result to check
 * @returns true if there are warnings
 */
export function hasWarnings(resolution: ModuleResolution): boolean {
    return resolution.warnings.length > 0;
}

/**
 * Format all errors from a resolution for display.
 *
 * @param resolution - The resolution result
 * @returns Formatted error messages
 */
export function formatErrors(resolution: ModuleResolution): string[] {
    return resolution.errors.map((e) => e.format());
}

/**
 * Format all warnings from a resolution for display.
 *
 * @param resolution - The resolution result
 * @returns Formatted warning messages
 */
export function formatWarnings(resolution: ModuleResolution): string[] {
    return resolution.warnings.map((w) => w.format());
}
