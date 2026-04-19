/**
 * Literal emission for ES2020 code generation (int, float, string).
 */

import { escapeString } from "./escape-string.js";

/**
 * Emit an integer literal
 * Negative numbers are wrapped in parentheses to avoid ambiguity
 */
export function emitIntLit(value: number): string {
    if (value < 0) {
        return `(${value})`;
    }
    return String(value);
}

/**
 * Emit a float literal
 * Handles special cases: Infinity, -Infinity, NaN, -0
 */
export function emitFloatLit(value: number): string {
    if (Number.isNaN(value)) {
        return "NaN";
    }
    if (value === Infinity) {
        return "Infinity";
    }
    if (value === -Infinity) {
        return "(-Infinity)";
    }
    // Check for negative zero
    if (Object.is(value, -0)) {
        return "(-0)";
    }
    if (value < 0) {
        return `(${value})`;
    }
    // Ensure float representation (add .0 if needed)
    const str = String(value);
    if (!str.includes(".") && !str.includes("e") && !str.includes("E")) {
        return str + ".0";
    }
    return str;
}

/**
 * Emit a string literal with proper escaping
 */
export function emitStringLit(value: string): string {
    return `"${escapeString(value)}"`;
}
