/**
 * Shared file system error formatting
 *
 * Provides consistent error messages for file system errors across CLI commands.
 */

import type { ColorFunctions } from "./colors.js";

/**
 * Format a file system error message with color support
 */
export function formatFsErrorMessage(error: NodeJS.ErrnoException, path: string, colors: ColorFunctions): string {
    switch (error.code) {
        case "ENOENT":
            return colors.red(`error: File not found: ${path}`);
        case "EACCES":
            return colors.red(`error: Permission denied: ${path}`);
        case "EISDIR":
            return colors.red(`error: Expected file, got directory: ${path}`);
        default:
            return colors.red(`error: ${error.message}`);
    }
}
