/**
 * Unified diagnostic system for all compiler phases
 *
 * This module provides the public API for the diagnostic system.
 * All errors and warnings use VFxxxx codes with consistent formatting.
 *
 * @example
 * ```typescript
 * import { throwDiagnostic, createDiagnostic, VibefunDiagnostic } from "./diagnostics";
 *
 * // Throw an error during compilation:
 * throwDiagnostic("VF4001", loc, { expected: "Int", actual: "String" });
 *
 * // Create a warning without throwing:
 * const warning = createDiagnostic("VF4900", loc, { pattern: "..." });
 * warningCollector.add(warning);
 *
 * // Format an error for display:
 * try {
 *     compile(source);
 * } catch (error) {
 *     if (error instanceof VibefunDiagnostic) {
 *         console.error(error.format(source));
 *     }
 * }
 * ```
 */

// Core types and class
export type {
    DiagnosticSeverity,
    DiagnosticPhase,
    DiagnosticExample,
    DiagnosticDefinition,
    Diagnostic,
} from "./diagnostic.js";
export { VibefunDiagnostic } from "./diagnostic.js";

// Registry
export { registry } from "./registry.js";

// Factory functions
export type { InterpolationParams } from "./factory.js";
export { interpolate, createDiagnostic, throwDiagnostic, createDiagnosticFromDefinition } from "./factory.js";

// Warning collector
export { WarningCollector } from "./warning-collector.js";

// Test helpers
export { expectDiagnostic, expectWarning, expectNoWarnings, expectAnyDiagnostic } from "./test-helpers.js";

// Code initialization
export { initializeDiagnosticCodes } from "./codes/index.js";
