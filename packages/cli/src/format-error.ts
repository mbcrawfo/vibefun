import { VibefunDiagnostic } from "@vibefun/core";

/**
 * Format a compilation error for display.
 * Uses VibefunDiagnostic.format() for structured errors with source context.
 *
 * @param error - The error to format
 * @param source - The source code string for context display
 * @returns Formatted error string
 */
export function formatError(error: unknown, source: string): string {
    if (error instanceof VibefunDiagnostic) {
        return error.format(source);
    } else if (error instanceof Error) {
        return `Error: ${error.message}`;
    } else {
        return String(error);
    }
}
