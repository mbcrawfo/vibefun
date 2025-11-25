/**
 * Core diagnostic types and VibefunDiagnostic class
 *
 * This module defines the unified diagnostic system for all compiler phases.
 * All errors and warnings use VFxxxx codes with consistent formatting.
 */

import type { Location } from "../types/ast.js";

/**
 * Diagnostic severity - errors halt compilation, warnings do not
 */
export type DiagnosticSeverity = "error" | "warning";

/**
 * Compiler phase that produces the diagnostic
 */
export type DiagnosticPhase = "lexer" | "parser" | "desugarer" | "typechecker" | "modules" | "codegen" | "runtime";

/**
 * Documentation example demonstrating the error and its fix.
 */
export interface DiagnosticExample {
    /** Vibefun code that triggers this error */
    readonly bad: string;
    /** Corrected version of the code */
    readonly good: string;
    /** Brief description of what changed (e.g., "Changed value to match declared type") */
    readonly description: string;
}

/**
 * Complete definition of a diagnostic (error or warning).
 * This serves as the single source of truth for:
 * - Runtime error creation
 * - User-facing documentation generation
 * - Future CLI --explain command
 */
export interface DiagnosticDefinition {
    /** Unique code: VF1001, VF4001, etc. */
    readonly code: string;
    /** PascalCase identifier: TypeMismatch, UndefinedVariable */
    readonly title: string;
    /** Template with {placeholders} for runtime interpolation */
    readonly messageTemplate: string;
    /** Error or warning */
    readonly severity: DiagnosticSeverity;
    /** Compiler phase that produces this diagnostic */
    readonly phase: DiagnosticPhase;
    /** Subcategory within phase (e.g., "mismatch", "undefined") */
    readonly category: string;
    /** Template for actionable fix suggestion with {placeholders} */
    readonly hintTemplate?: string;

    // === DOCUMENTATION FIELDS (for generated docs) ===

    /** One-paragraph explanation of why this error occurs */
    readonly explanation: string;
    /** Code example demonstrating the error and fix (REQUIRED) */
    readonly example: DiagnosticExample;
    /** Related error codes users might also encounter */
    readonly relatedCodes?: readonly string[];
    /** Links to relevant spec documentation (relative paths from docs/) */
    readonly seeAlso?: readonly string[];
}

/**
 * A concrete diagnostic instance with interpolated message
 */
export interface Diagnostic {
    readonly definition: DiagnosticDefinition;
    readonly message: string;
    readonly location: Location;
    readonly hint?: string;
}

/**
 * Maximum line length for source context display.
 * Lines longer than this are truncated with ellipsis.
 */
const MAX_LINE_LENGTH = 120;

/**
 * Truncate a source line around the error column to keep the caret visible.
 * Returns the truncated line and adjusted column position.
 */
function truncateAroundColumn(line: string, column: number, maxLength: number): { line: string; column: number } {
    if (line.length <= maxLength) {
        return { line, column };
    }

    // Calculate how much context to show on each side of the error
    const halfContext = Math.floor(maxLength / 2);

    // Determine start position to center around the column
    let start = Math.max(0, column - halfContext);
    let end = start + maxLength;

    // Adjust if we're near the end of the line
    if (end > line.length) {
        end = line.length;
        start = Math.max(0, end - maxLength);
    }

    // Build the truncated line with ellipsis indicators
    let truncated = line.slice(start, end);
    const adjustedColumn = column - start;

    if (start > 0) {
        truncated = "..." + truncated.slice(3);
    }
    if (end < line.length) {
        truncated = truncated.slice(0, -3) + "...";
    }

    return { line: truncated, column: adjustedColumn };
}

/**
 * Unified error class replacing all existing error classes.
 * All compiler diagnostics (errors and warnings) use this class.
 */
export class VibefunDiagnostic extends Error {
    public readonly diagnostic: Diagnostic;

    constructor(diagnostic: Diagnostic) {
        // Create message with error code prefix
        const prefix = `[${diagnostic.definition.code}]`;
        const loc = diagnostic.location;
        const locStr = `${loc.file}:${loc.line}:${loc.column}`;
        const fullMessage = `${prefix} ${diagnostic.message} at ${locStr}`;

        super(fullMessage);
        this.name = "VibefunDiagnostic";
        this.diagnostic = diagnostic;

        // Ensure proper prototype chain for instanceof checks
        Object.setPrototypeOf(this, VibefunDiagnostic.prototype);
    }

    /**
     * Get the diagnostic code (e.g., "VF4001")
     */
    get code(): string {
        return this.diagnostic.definition.code;
    }

    /**
     * Get the diagnostic severity
     */
    get severity(): DiagnosticSeverity {
        return this.diagnostic.definition.severity;
    }

    /**
     * Get the source location
     */
    get location(): Location {
        return this.diagnostic.location;
    }

    /**
     * Get the hint message, if any
     */
    get hint(): string | undefined {
        return this.diagnostic.hint;
    }

    /**
     * Get the interpolated message (without code prefix or location)
     */
    get diagnosticMessage(): string {
        return this.diagnostic.message;
    }

    /**
     * Format the diagnostic for display, optionally with source context.
     *
     * @param source - The source code string for context display
     * @returns Formatted diagnostic string
     *
     * @example
     * ```
     * [VF4001] Type mismatch: expected Int, got String
     *   --> src/main.vf:5:10
     *   |
     * 5 |   let x: Int = "hello"
     *   |          ^^^ expected Int, got String
     *   |
     *   = hint: Change the value to an Int, or change the type annotation to String
     * ```
     */
    format(source?: string): string {
        const { definition, message, location, hint } = this.diagnostic;
        const lines: string[] = [];

        // Header line with code and message
        const severityBadge = definition.severity === "warning" ? "warning" : "error";
        lines.push(`${severityBadge}[${definition.code}]: ${message}`);

        // Location line
        lines.push(`  --> ${location.file}:${location.line}:${location.column}`);

        // Source context if available
        if (source) {
            const sourceLines = source.split("\n");
            const lineIdx = location.line - 1; // Convert to 0-indexed

            if (lineIdx >= 0 && lineIdx < sourceLines.length) {
                const lineNum = String(location.line);
                const padding = " ".repeat(lineNum.length);

                lines.push(`${padding} |`);

                // Get the source line and potentially truncate it
                let sourceLine = sourceLines[lineIdx] ?? "";
                let caretColumn = location.column - 1; // Convert to 0-indexed

                if (sourceLine.length > MAX_LINE_LENGTH) {
                    const truncated = truncateAroundColumn(sourceLine, caretColumn, MAX_LINE_LENGTH);
                    sourceLine = truncated.line;
                    caretColumn = truncated.column;
                }

                lines.push(`${lineNum} | ${sourceLine}`);

                // Caret line pointing to the error location
                const caretPadding = " ".repeat(Math.max(0, caretColumn));
                lines.push(`${padding} | ${caretPadding}^`);

                lines.push(`${padding} |`);
            }
        }

        // Hint if available
        if (hint) {
            lines.push(`  = hint: ${hint}`);
        }

        return lines.join("\n");
    }
}
