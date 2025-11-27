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
 * @module module-resolver
 */

// Module Graph
export { ModuleGraph } from "./module-graph.js";
export type { DependencyEdge, TopologicalSortResult } from "./module-graph.js";

// Module Graph Builder
export { buildModuleGraph, ModuleGraphBuilder } from "./module-graph-builder.js";
export type { ModuleGraphBuildResult } from "./module-graph-builder.js";

// Cycle Detector
export { CircularDependencyDetector, detectCycles, formatCyclePath, formatCyclePathShort } from "./cycle-detector.js";
export type { Cycle, CycleDetectionResult, SelfImport } from "./cycle-detector.js";
