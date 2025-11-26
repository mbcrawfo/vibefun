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
