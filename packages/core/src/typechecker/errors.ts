/**
 * Type checker formatting utilities
 *
 * This file re-exports type formatting functions from the format module.
 * The TypeCheckerError class and factory functions have been removed.
 * Use the unified diagnostics system (VibefunDiagnostic and throwDiagnostic)
 * from packages/core/src/diagnostics/ for error handling.
 */

// Re-export formatting functions from the format module
export { findSimilarStrings, levenshteinDistance, typeSchemeToString, typeToString } from "./format.js";
