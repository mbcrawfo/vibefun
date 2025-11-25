/**
 * Factory functions for creating diagnostics
 *
 * This module provides the primary API for creating and throwing diagnostics.
 * Use these functions instead of throwing errors directly.
 */

import type { Location } from "../types/ast.js";
import type { Diagnostic, DiagnosticDefinition } from "./diagnostic.js";

import { VibefunDiagnostic } from "./diagnostic.js";
import { registry } from "./registry.js";

/**
 * Interpolation parameters for message templates.
 * Keys are placeholder names, values are the strings to substitute.
 */
export type InterpolationParams = Record<string, string | number>;

/**
 * Interpolate a message template with parameter values.
 * Replaces `{placeholder}` with the corresponding value from params.
 * Missing placeholders are left as-is in the output (aids debugging).
 *
 * @param template - The message template with {placeholder} syntax
 * @param params - Object mapping placeholder names to values
 * @returns The interpolated message
 *
 * @example
 * ```typescript
 * interpolate("Type mismatch: expected {expected}, got {actual}", {
 *     expected: "Int",
 *     actual: "String"
 * })
 * // Returns: "Type mismatch: expected Int, got String"
 *
 * // Missing placeholders are preserved:
 * interpolate("Cannot unify {t1} with {t2}", { t1: "Int" })
 * // Returns: "Cannot unify Int with {t2}"
 * ```
 */
export function interpolate(template: string, params: InterpolationParams): string {
    return template.replace(/\{(\w+)\}/g, (match, key: string) => {
        if (key in params) {
            return String(params[key]);
        }
        // Leave unmatched placeholders as-is for debugging visibility
        return match;
    });
}

/**
 * Create a diagnostic object without throwing it.
 * Useful for collecting warnings or when you need the diagnostic for further processing.
 *
 * @param code - The diagnostic code (e.g., "VF4001")
 * @param location - Source location where the diagnostic occurred
 * @param params - Interpolation parameters for message and hint templates
 * @returns A VibefunDiagnostic instance
 * @throws Error if the diagnostic code is not registered
 *
 * @example
 * ```typescript
 * const diagnostic = createDiagnostic("VF4001", loc, {
 *     expected: "Int",
 *     actual: "String"
 * });
 * warningCollector.add(diagnostic);
 * ```
 */
export function createDiagnostic(
    code: string,
    location: Location,
    params: InterpolationParams = {},
): VibefunDiagnostic {
    const definition = registry.get(code);
    if (!definition) {
        throw new Error(`Unknown diagnostic code: ${code}`);
    }

    const message = interpolate(definition.messageTemplate, params);

    const diagnostic: Diagnostic = definition.hintTemplate
        ? {
              definition,
              message,
              location,
              hint: interpolate(definition.hintTemplate, params),
          }
        : {
              definition,
              message,
              location,
          };

    return new VibefunDiagnostic(diagnostic);
}

/**
 * Create and immediately throw a diagnostic.
 * This is the primary way to report errors during compilation.
 *
 * @param code - The diagnostic code (e.g., "VF4001")
 * @param location - Source location where the diagnostic occurred
 * @param params - Interpolation parameters for message and hint templates
 * @throws VibefunDiagnostic always
 *
 * @example
 * ```typescript
 * // In type checker:
 * if (expected !== actual) {
 *     throwDiagnostic("VF4001", expr.loc, {
 *         expected: typeToString(expected),
 *         actual: typeToString(actual)
 *     });
 * }
 * ```
 */
export function throwDiagnostic(code: string, location: Location, params: InterpolationParams = {}): never {
    throw createDiagnostic(code, location, params);
}

/**
 * Create a diagnostic directly from a definition (bypassing registry lookup).
 * Useful for testing or when you have the definition directly.
 *
 * @param definition - The diagnostic definition
 * @param location - Source location where the diagnostic occurred
 * @param params - Interpolation parameters for message and hint templates
 * @returns A VibefunDiagnostic instance
 */
export function createDiagnosticFromDefinition(
    definition: DiagnosticDefinition,
    location: Location,
    params: InterpolationParams = {},
): VibefunDiagnostic {
    const message = interpolate(definition.messageTemplate, params);

    const diagnostic: Diagnostic = definition.hintTemplate
        ? {
              definition,
              message,
              location,
              hint: interpolate(definition.hintTemplate, params),
          }
        : {
              definition,
              message,
              location,
          };

    return new VibefunDiagnostic(diagnostic);
}
