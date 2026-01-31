/**
 * Diagnostic formatting for CLI output
 *
 * Provides both human-readable and JSON output formats for compilation errors.
 */

import type { VibefunDiagnostic } from "@vibefun/core";
import type { ColorFunctions } from "../utils/colors.js";
import type { PhaseTimings } from "../utils/timer.js";

/**
 * JSON diagnostic format matching cli-mvp.md specification
 */
export interface JsonDiagnostic {
    /** Error code (e.g., "VF1001") */
    readonly code: string;
    /** Severity level */
    readonly severity: "error" | "warning" | "info";
    /** Error message */
    readonly message: string;
    /** Source location */
    readonly location: {
        readonly file: string;
        readonly line: number;
        readonly column: number;
    };
    /** Compiler phase that generated this diagnostic */
    readonly phase: string;
}

/**
 * JSON output structure for error reporting
 */
export interface JsonOutput {
    /** Whether compilation succeeded */
    readonly success: boolean;
    /** Array of diagnostics */
    readonly diagnostics: readonly JsonDiagnostic[];
    /** Timing information (when --verbose is used) */
    readonly timing?: {
        readonly totalMs: number;
        readonly phases: ReadonlyArray<{
            readonly name: string;
            readonly durationMs: number;
            readonly metadata?: Record<string, number | string>;
        }>;
        readonly outputBytes?: number;
    };
}

/**
 * Convert a VibefunDiagnostic to JSON format
 */
export function toJsonDiagnostic(diagnostic: VibefunDiagnostic): JsonDiagnostic {
    return {
        code: diagnostic.code,
        severity: diagnostic.severity,
        message: diagnostic.diagnosticMessage,
        location: {
            file: diagnostic.location.file,
            line: diagnostic.location.line,
            column: diagnostic.location.column,
        },
        phase: diagnostic.diagnostic.definition.phase,
    };
}

/**
 * Format a diagnostic for human-readable output
 *
 * Uses colors if provided, falls back to plain text otherwise.
 */
export function formatDiagnosticHuman(diagnostic: VibefunDiagnostic, source: string, colors?: ColorFunctions): string {
    // Use the built-in format method if no colors, otherwise enhance with colors
    if (!colors) {
        return diagnostic.format(source);
    }

    const lines: string[] = [];
    const loc = diagnostic.location;

    // Header line: severity + code + message
    const severityLabel =
        diagnostic.severity === "error"
            ? colors.red("error")
            : diagnostic.severity === "warning"
              ? colors.yellow("warning")
              : colors.cyan("info");

    lines.push(`${severityLabel}[${colors.bold(diagnostic.code)}]: ${diagnostic.message}`);

    // Location line
    lines.push(`  ${colors.cyan("-->")} ${loc.file}:${loc.line}:${loc.column}`);

    // Source context (if source is available)
    const sourceLine = getSourceLine(source, loc.line);
    if (sourceLine !== null) {
        const lineNumStr = String(loc.line);
        const padding = " ".repeat(lineNumStr.length);

        lines.push(`${colors.cyan(`${padding} |`)}`);
        lines.push(`${colors.cyan(`${lineNumStr} |`)} ${sourceLine}`);

        // Underline
        const underline = " ".repeat(loc.column - 1) + colors.red("^");
        lines.push(`${colors.cyan(`${padding} |`)} ${underline}`);
    }

    return lines.join("\n");
}

/**
 * Format multiple diagnostics for JSON output
 */
export function formatDiagnosticsJson(diagnostics: readonly VibefunDiagnostic[], timings?: PhaseTimings): string {
    const output: JsonOutput = {
        success: diagnostics.length === 0,
        diagnostics: diagnostics.map(toJsonDiagnostic),
        ...(timings
            ? {
                  timing: {
                      totalMs: timings.totalMs,
                      phases: timings.phases.map((p) => ({
                          name: p.name,
                          durationMs: p.durationMs,
                          ...(p.metadata ? { metadata: p.metadata } : {}),
                      })),
                      ...(timings.outputBytes !== undefined ? { outputBytes: timings.outputBytes } : {}),
                  },
              }
            : {}),
    };

    return JSON.stringify(output, null, 2);
}

/**
 * Format a success result for JSON output
 */
export function formatSuccessJson(outputPath: string | undefined, timings?: PhaseTimings): string {
    const output: JsonOutput & { output?: string } = {
        success: true,
        diagnostics: [],
        ...(outputPath ? { output: outputPath } : {}),
        ...(timings
            ? {
                  timing: {
                      totalMs: timings.totalMs,
                      phases: timings.phases.map((p) => ({
                          name: p.name,
                          durationMs: p.durationMs,
                          ...(p.metadata ? { metadata: p.metadata } : {}),
                      })),
                      ...(timings.outputBytes !== undefined ? { outputBytes: timings.outputBytes } : {}),
                  },
              }
            : {}),
    };

    return JSON.stringify(output, null, 2);
}

/**
 * Get a specific line from source code
 */
function getSourceLine(source: string, line: number): string | null {
    const lines = source.split("\n");
    const idx = line - 1; // Convert 1-indexed to 0-indexed
    if (idx >= 0 && idx < lines.length) {
        return lines[idx] ?? null;
    }
    return null;
}
