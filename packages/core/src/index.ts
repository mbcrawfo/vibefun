// Re-export all public APIs from vibefun core

export { Lexer } from "./lexer/index.js";
export type { Token, Keyword, Location } from "./types/index.js";
export { Parser } from "./parser/index.js";
export type { Module, Declaration, Expr, Pattern, TypeExpr, Literal } from "./types/index.js";

// Unified diagnostic system
export { VibefunDiagnostic, createDiagnostic, throwDiagnostic, WarningCollector } from "./diagnostics/index.js";
export type { DiagnosticSeverity, DiagnosticPhase, Diagnostic } from "./diagnostics/index.js";

// Configuration loading
export { findProjectRoot, loadConfigFromEntryPoint, loadVibefunConfig } from "./config/index.js";
export type { ConfigLoadResult, PathMappings, VibefunCompilerOptions, VibefunConfig } from "./config/index.js";

// Module loader - discovers and parses modules
export { loadModules, ModuleLoader } from "./module-loader/index.js";
export type { ModuleLoadResult, ModuleLoaderOptions } from "./module-loader/index.js";

// Module resolver - analyzes dependencies, detects cycles
export {
    loadAndResolveModules,
    resolveModules,
    hasErrors,
    hasWarnings,
    formatErrors,
    formatWarnings,
    ModuleGraph,
    detectCycles,
} from "./module-resolver/index.js";
export type {
    ModuleResolution,
    ModuleResolverOptions,
    DependencyEdge,
    TopologicalSortResult,
    Cycle,
    CycleDetectionResult,
    SelfImport,
} from "./module-resolver/index.js";
