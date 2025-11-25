/**
 * Central registry for all diagnostic codes
 *
 * This module maintains the single source of truth for all VFxxxx diagnostic codes.
 * The registry validates for duplicates and provides lookup utilities.
 */

import type { DiagnosticDefinition, DiagnosticPhase, DiagnosticSeverity } from "./diagnostic.js";

/**
 * Central registry for all diagnostic definitions.
 * Provides lookup by code, phase, and severity.
 * Validates for duplicate codes at registration time.
 */
class DiagnosticRegistry {
    private readonly codes: Map<string, DiagnosticDefinition> = new Map();

    /**
     * Register a diagnostic definition.
     * Throws an error if a duplicate code is detected.
     *
     * @param definition - The diagnostic definition to register
     * @throws Error if the code is already registered
     */
    register(definition: DiagnosticDefinition): void {
        if (this.codes.has(definition.code)) {
            throw new Error(`Duplicate diagnostic code: ${definition.code}`);
        }
        this.codes.set(definition.code, definition);
    }

    /**
     * Register multiple diagnostic definitions.
     *
     * @param definitions - Array of diagnostic definitions to register
     * @throws Error if any duplicate code is detected
     */
    registerAll(definitions: readonly DiagnosticDefinition[]): void {
        for (const definition of definitions) {
            this.register(definition);
        }
    }

    /**
     * Get a diagnostic definition by code.
     *
     * @param code - The diagnostic code (e.g., "VF4001")
     * @returns The definition, or undefined if not found
     */
    get(code: string): DiagnosticDefinition | undefined {
        return this.codes.get(code);
    }

    /**
     * Check if a diagnostic code is registered.
     *
     * @param code - The diagnostic code to check
     */
    has(code: string): boolean {
        return this.codes.has(code);
    }

    /**
     * Get all registered diagnostic definitions.
     */
    all(): readonly DiagnosticDefinition[] {
        return Array.from(this.codes.values());
    }

    /**
     * Get all diagnostic definitions for a specific phase.
     *
     * @param phase - The compiler phase to filter by
     */
    byPhase(phase: DiagnosticPhase): readonly DiagnosticDefinition[] {
        return Array.from(this.codes.values()).filter((def) => def.phase === phase);
    }

    /**
     * Get all diagnostic definitions for a specific severity.
     *
     * @param severity - The severity to filter by
     */
    bySeverity(severity: DiagnosticSeverity): readonly DiagnosticDefinition[] {
        return Array.from(this.codes.values()).filter((def) => def.severity === severity);
    }

    /**
     * Get the explanation for a diagnostic code.
     * Useful for implementing `vibefun explain VF4001`.
     *
     * @param code - The diagnostic code
     * @returns Formatted explanation string, or undefined if code not found
     */
    explain(code: string): string | undefined {
        const def = this.codes.get(code);
        if (!def) return undefined;

        const lines: string[] = [];

        // Header
        lines.push(`${def.code}: ${def.title}`);
        lines.push(`Severity: ${def.severity}`);
        lines.push(`Phase: ${def.phase}`);
        lines.push(`Category: ${def.category}`);
        lines.push("");

        // Message template
        lines.push("Message template:");
        lines.push(`  ${def.messageTemplate}`);
        lines.push("");

        // Explanation
        lines.push("Explanation:");
        lines.push(`  ${def.explanation}`);
        lines.push("");

        // Example
        lines.push("Example:");
        lines.push("");
        lines.push("  Problem:");
        for (const badLine of def.example.bad.split("\n")) {
            lines.push(`    ${badLine}`);
        }
        lines.push("");
        lines.push("  Solution:");
        for (const goodLine of def.example.good.split("\n")) {
            lines.push(`    ${goodLine}`);
        }
        lines.push("");
        lines.push(`  ${def.example.description}`);

        // Hint template if present
        if (def.hintTemplate) {
            lines.push("");
            lines.push("Hint:");
            lines.push(`  ${def.hintTemplate}`);
        }

        // Related codes
        if (def.relatedCodes && def.relatedCodes.length > 0) {
            lines.push("");
            lines.push("Related codes:");
            lines.push(`  ${def.relatedCodes.join(", ")}`);
        }

        // See also
        if (def.seeAlso && def.seeAlso.length > 0) {
            lines.push("");
            lines.push("See also:");
            for (const link of def.seeAlso) {
                lines.push(`  - ${link}`);
            }
        }

        return lines.join("\n");
    }

    /**
     * Get the count of registered diagnostics.
     */
    get size(): number {
        return this.codes.size;
    }

    /**
     * Clear all registered diagnostics.
     * Primarily useful for testing.
     */
    clear(): void {
        this.codes.clear();
    }
}

/**
 * Global singleton registry instance.
 * All diagnostic codes are registered here.
 */
export const registry = new DiagnosticRegistry();
