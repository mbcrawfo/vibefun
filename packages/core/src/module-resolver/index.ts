/**
 * Module Resolver
 *
 * This module provides the module graph analysis infrastructure for Vibefun.
 * It analyzes module dependencies, detects circular dependencies, and
 * determines compilation order.
 *
 * The module resolver is separated from the module loader for clean separation:
 * - Module loader: File I/O, parsing, discovery
 * - Module resolver: Pure graph analysis, cycle detection, warnings
 *
 * This separation allows the resolver to be tested without file I/O and
 * enables alternative loading strategies (in-memory, virtual filesystem).
 *
 * ## Quick Start
 *
 * ```typescript
 * import { loadAndResolveModules } from '@vibefun/core';
 *
 * // Load and resolve all modules from entry point
 * const resolution = loadAndResolveModules('src/main.vf');
 *
 * // Check for errors
 * if (resolution.errors.length > 0) {
 *     for (const error of resolution.errors) {
 *         console.error(error.format());
 *     }
 * }
 *
 * // Compile modules in topological order
 * for (const modulePath of resolution.compilationOrder) {
 *     const module = resolution.modules.get(modulePath);
 *     // ... compile module
 * }
 * ```
 *
 * @module module-resolver
 */

// Main API - most users only need these
export {
    formatErrors,
    formatWarnings,
    hasErrors,
    hasWarnings,
    loadAndResolveModules,
    resolveModules,
} from "./resolver.js";
export type { ModuleResolution, ModuleResolverOptions } from "./resolver.js";

// Module Graph
export { ModuleGraph } from "./module-graph.js";
export type { DependencyEdge, TopologicalSortResult } from "./module-graph.js";

// Module Graph Builder
export { buildModuleGraph, ModuleGraphBuilder } from "./module-graph-builder.js";
export type { ModuleGraphBuildResult } from "./module-graph-builder.js";

// Cycle Detector
export { CircularDependencyDetector, detectCycles, formatCyclePath, formatCyclePathShort } from "./cycle-detector.js";
export type { Cycle, CycleDetectionResult, SelfImport } from "./cycle-detector.js";

// Warning Generator
export {
    formatCycleForWarning,
    generateCircularDependencyWarning,
    generateCircularDependencyWarnings,
    generateSelfImportError,
    generateSelfImportErrors,
    generateCaseSensitivityWarning,
    generateWarningsFromCycles,
} from "./warning-generator.js";
export type { WarningGenerationResult } from "./warning-generator.js";
