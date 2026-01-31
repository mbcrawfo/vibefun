/**
 * Terminal color utilities
 *
 * Provides ANSI color functions with automatic detection of color support.
 */

/**
 * Options that affect color output
 */
export interface ColorOptions {
    /** Force color on (--color flag) */
    readonly color?: boolean;
    /** Force color off (--no-color flag) */
    readonly noColor?: boolean;
}

/**
 * Determine if colors should be used
 *
 * Priority (highest to lowest):
 * 1. --no-color flag
 * 2. --color flag
 * 3. NO_COLOR env var (any value disables color)
 * 4. FORCE_COLOR env var (any value enables color)
 * 5. CI env var (disables color in CI)
 * 6. TTY detection (color if stdout is a TTY)
 */
export function shouldUseColor(options?: ColorOptions): boolean {
    // CLI flags have highest priority
    if (options?.noColor === true) {
        return false;
    }
    if (options?.color === true) {
        return true;
    }

    // Environment variables
    if (process.env["NO_COLOR"] !== undefined) {
        return false;
    }
    if (process.env["FORCE_COLOR"] !== undefined) {
        return true;
    }

    // CI environments typically don't support colors well
    if (process.env["CI"] !== undefined) {
        return false;
    }

    // Default: check if stdout is a TTY
    return process.stdout.isTTY === true;
}

// ANSI escape codes
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const WHITE = "\x1b[37m";

/**
 * Create color functions based on whether colors are enabled
 */
export interface ColorFunctions {
    red: (text: string) => string;
    yellow: (text: string) => string;
    cyan: (text: string) => string;
    dim: (text: string) => string;
    bold: (text: string) => string;
    white: (text: string) => string;
}

/**
 * Create a set of color functions
 */
export function createColors(useColor: boolean): ColorFunctions {
    if (!useColor) {
        // Return identity functions when colors are disabled
        const identity = (text: string): string => text;
        return {
            red: identity,
            yellow: identity,
            cyan: identity,
            dim: identity,
            bold: identity,
            white: identity,
        };
    }

    return {
        red: (text: string) => `${RED}${text}${RESET}`,
        yellow: (text: string) => `${YELLOW}${text}${RESET}`,
        cyan: (text: string) => `${CYAN}${text}${RESET}`,
        dim: (text: string) => `${DIM}${text}${RESET}`,
        bold: (text: string) => `${BOLD}${text}${RESET}`,
        white: (text: string) => `${WHITE}${text}${RESET}`,
    };
}
