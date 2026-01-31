// Re-export all public APIs from vibefun core

export { Lexer } from "./lexer/index.js";
export type { Token, Keyword, Location } from "./types/index.js";
export { Parser } from "./parser/index.js";
export type { Module, Declaration, Expr, Pattern, TypeExpr, Literal } from "./types/index.js";

// Core AST types (desugared form)
export type { CoreModule, CoreDeclaration, CoreExpr, CorePattern } from "./types/index.js";

// Desugarer - transforms Surface AST to Core AST
export { desugarModule } from "./desugarer/index.js";

// Typechecker - type inference and checking
export { typeCheck } from "./typechecker/index.js";
export type { TypedModule, TypeCheckOptions } from "./typechecker/index.js";
export { typeToString } from "./typechecker/index.js";
export type { Type, TypeEnv } from "./types/index.js";

// Code generator - transforms typed AST to JavaScript
export { generate } from "./codegen/index.js";
export type { GenerateOptions, GenerateResult } from "./codegen/index.js";

// Unified diagnostic system
export { VibefunDiagnostic, createDiagnostic, throwDiagnostic, WarningCollector } from "./diagnostics/index.js";
export type { DiagnosticSeverity, DiagnosticPhase, DiagnosticDefinition, Diagnostic } from "./diagnostics/index.js";

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
