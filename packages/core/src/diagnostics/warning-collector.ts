/**
 * Warning collector for accumulating warnings during compilation
 *
 * Unlike errors, warnings do not halt compilation. This class collects
 * warnings throughout the compilation process so they can be reported
 * after compilation completes.
 */

import { VibefunDiagnostic } from "./diagnostic.js";

/**
 * Collects warnings during compilation.
 * Warnings accumulate without stopping compilation and are
 * reported after the compilation phase completes.
 *
 * @example
 * ```typescript
 * const collector = new WarningCollector();
 *
 * // During type checking:
 * if (isUnreachablePattern) {
 *     collector.add(createDiagnostic("VF4900", pattern.loc, { ... }));
 * }
 *
 * // After compilation:
 * for (const warning of collector.getWarnings()) {
 *     console.warn(warning.format(source));
 * }
 * ```
 */
export class WarningCollector {
    private readonly warnings: VibefunDiagnostic[] = [];

    /**
     * Add a warning to the collection.
     * Validates that the diagnostic is actually a warning.
     *
     * @param warning - The warning diagnostic to add
     * @throws Error if the diagnostic is not a warning
     */
    add(warning: VibefunDiagnostic): void {
        if (warning.severity !== "warning") {
            throw new Error(`Expected warning diagnostic, got ${warning.severity}: ${warning.code}`);
        }
        this.warnings.push(warning);
    }

    /**
     * Get all collected warnings.
     */
    getWarnings(): readonly VibefunDiagnostic[] {
        return this.warnings;
    }

    /**
     * Check if any warnings have been collected.
     */
    hasWarnings(): boolean {
        return this.warnings.length > 0;
    }

    /**
     * Get the number of collected warnings.
     */
    get count(): number {
        return this.warnings.length;
    }

    /**
     * Clear all collected warnings.
     * Useful when starting a new compilation unit.
     */
    clear(): void {
        this.warnings.length = 0;
    }

    /**
     * Format all warnings for display.
     *
     * @param source - Optional source code for context display
     * @returns Array of formatted warning strings
     */
    formatAll(source?: string): string[] {
        return this.warnings.map((w) => w.format(source));
    }
}
