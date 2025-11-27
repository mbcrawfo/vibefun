/**
 * Warning Generator for Module Resolution
 *
 * This module generates warnings for circular dependencies and case sensitivity
 * issues detected during module resolution. It uses the unified diagnostic
 * system (VF5900, VF5901) and follows the spec format.
 *
 * @module module-resolver
 */

import type { Location } from "../types/index.js";
import type { Cycle, SelfImport } from "./cycle-detector.js";

import { VibefunDiagnostic } from "../diagnostics/diagnostic.js";
import { createDiagnostic } from "../diagnostics/factory.js";
import { WarningCollector } from "../diagnostics/warning-collector.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of warning generation.
 */
export type WarningGenerationResult = {
    /** All generated warnings */
    warnings: VibefunDiagnostic[];

    /** Self-import errors (these are errors, not warnings) */
    selfImportErrors: VibefunDiagnostic[];
};

// =============================================================================
// Circular Dependency Warnings (VF5900)
// =============================================================================

/**
 * Format a cycle path as a human-readable string with arrows.
 *
 * Uses base filenames by default for cleaner output. The full path
 * can be shown by passing `useFullPaths: true`.
 *
 * @param cycle - The cycle to format
 * @param useFullPaths - Whether to use full paths (default: false uses basenames)
 * @returns String like "a.vf → b.vf → c.vf → a.vf"
 *
 * @example
 * ```typescript
 * formatCycleForWarning({ path: ['/src/a.vf', '/src/b.vf'], ... });
 * // Returns: "a.vf → b.vf → a.vf"
 * ```
 */
export function formatCycleForWarning(cycle: Cycle, useFullPaths = false): string {
    if (cycle.path.length === 0) return "";

    const paths = useFullPaths ? cycle.path : cycle.path.map((p) => p.split("/").pop() ?? p);

    return [...paths, paths[0]].join(" → ");
}

/**
 * Generate a circular dependency warning for a single cycle.
 *
 * Uses VF5900 diagnostic code. The warning points to the first import
 * in the cycle, with the full cycle path shown in the message.
 *
 * @param cycle - The cycle to generate a warning for
 * @returns A VibefunDiagnostic warning
 *
 * @example
 * ```typescript
 * const warning = generateCircularDependencyWarning(cycle);
 * console.warn(warning.format(source));
 * ```
 */
export function generateCircularDependencyWarning(cycle: Cycle): VibefunDiagnostic {
    // Use the first import location in the cycle as the primary location
    const location = cycle.locations[0] ?? {
        file: cycle.path[0] ?? "unknown",
        line: 1,
        column: 1,
        offset: 0,
    };

    const cyclePath = formatCycleForWarning(cycle);

    return createDiagnostic("VF5900", location, { cycle: cyclePath });
}

/**
 * Generate circular dependency warnings for all value cycles.
 *
 * Type-only cycles are skipped (they're safe at runtime).
 * Results are added to the provided warning collector.
 *
 * @param cycles - All detected cycles
 * @param collector - Warning collector to add warnings to
 *
 * @example
 * ```typescript
 * const collector = new WarningCollector();
 * generateCircularDependencyWarnings(cycles, collector);
 *
 * for (const warning of collector.getWarnings()) {
 *   console.warn(warning.format(source));
 * }
 * ```
 */
export function generateCircularDependencyWarnings(cycles: Cycle[], collector: WarningCollector): void {
    for (const cycle of cycles) {
        // Skip type-only cycles - they're safe at runtime
        if (cycle.isTypeOnly) continue;

        const warning = generateCircularDependencyWarning(cycle);
        collector.add(warning);
    }
}

// =============================================================================
// Self-Import Errors (VF5004)
// =============================================================================

/**
 * Generate a self-import error.
 *
 * Self-imports are compile-time ERRORS (not warnings) because they
 * serve no useful purpose and indicate a mistake.
 *
 * Uses VF5004 diagnostic code.
 *
 * @param selfImport - The self-import to generate an error for
 * @returns A VibefunDiagnostic error
 *
 * @example
 * ```typescript
 * const error = generateSelfImportError(selfImport);
 * throw error;
 * ```
 */
export function generateSelfImportError(selfImport: SelfImport): VibefunDiagnostic {
    return createDiagnostic("VF5004", selfImport.location, {
        path: selfImport.modulePath.split("/").pop() ?? selfImport.modulePath,
    });
}

/**
 * Generate self-import errors for all detected self-imports.
 *
 * @param selfImports - All detected self-imports
 * @returns Array of VibefunDiagnostic errors
 */
export function generateSelfImportErrors(selfImports: SelfImport[]): VibefunDiagnostic[] {
    return selfImports.map(generateSelfImportError);
}

// =============================================================================
// Case Sensitivity Warnings (VF5901)
// =============================================================================

/**
 * Generate a case sensitivity warning.
 *
 * This warning is generated when the import path casing doesn't match
 * the actual file name on disk. While this may work on case-insensitive
 * file systems, it will fail on case-sensitive systems like Linux.
 *
 * Uses VF5901 diagnostic code.
 *
 * @param importPath - The import path as written in source (e.g., "./Utils")
 * @param actualPath - The actual file path on disk (e.g., "./utils")
 * @param location - Location of the import statement
 * @returns A VibefunDiagnostic warning
 *
 * @example
 * ```typescript
 * const warning = generateCaseSensitivityWarning(
 *   './Utils',
 *   './utils.vf',
 *   importLoc
 * );
 * collector.add(warning);
 * ```
 */
export function generateCaseSensitivityWarning(
    importPath: string,
    actualPath: string,
    location: Location,
): VibefunDiagnostic {
    // Extract just the filename for cleaner display
    const actualBasename = actualPath.split("/").pop() ?? actualPath;
    const importBasename = importPath.split("/").pop() ?? importPath;

    return createDiagnostic("VF5901", location, {
        actual: importBasename,
        expected: actualBasename,
    });
}

// =============================================================================
// Combined Warning Generation
// =============================================================================

/**
 * Generate all warnings and errors from cycle detection results.
 *
 * This is the main entry point for warning generation. It processes
 * cycle detection results and returns:
 * - Warnings for value cycles (VF5900)
 * - Errors for self-imports (VF5004)
 *
 * Type-only cycles are skipped (safe at runtime).
 *
 * @param cycles - Detected cycles
 * @param selfImports - Detected self-imports
 * @returns Warning generation result with warnings and errors
 *
 * @example
 * ```typescript
 * const cycleResult = detectCycles(graph);
 * const warningResult = generateWarningsFromCycles(
 *   cycleResult.cycles,
 *   cycleResult.selfImports
 * );
 *
 * // Handle self-import errors
 * if (warningResult.selfImportErrors.length > 0) {
 *   throw new AggregateError(
 *     warningResult.selfImportErrors,
 *     'Self-import errors detected'
 *   );
 * }
 *
 * // Collect warnings
 * for (const warning of warningResult.warnings) {
 *   collector.add(warning);
 * }
 * ```
 */
export function generateWarningsFromCycles(cycles: Cycle[], selfImports: SelfImport[]): WarningGenerationResult {
    const warnings: VibefunDiagnostic[] = [];

    // Generate circular dependency warnings for value cycles
    for (const cycle of cycles) {
        if (!cycle.isTypeOnly) {
            warnings.push(generateCircularDependencyWarning(cycle));
        }
    }

    // Generate self-import errors
    const selfImportErrors = generateSelfImportErrors(selfImports);

    return { warnings, selfImportErrors };
}
