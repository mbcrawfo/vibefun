/**
 * Error handling and reporting utilities
 *
 * This file previously contained the VibefunError class and its subclasses
 * (LexerError, ParserError, TypeError, CompilationError, RuntimeError).
 *
 * These have been replaced by the unified diagnostic system in:
 * packages/core/src/diagnostics/
 *
 * Use VibefunDiagnostic and throwDiagnostic() for all error handling.
 *
 * @see packages/core/src/diagnostics/README.md for usage documentation
 */

// Re-export the unified diagnostic system for backward compatibility
export { VibefunDiagnostic } from "../diagnostics/index.js";
