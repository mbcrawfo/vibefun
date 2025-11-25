/**
 * Desugarer diagnostic codes (VF3xxx)
 *
 * Error codes for the desugaring phase.
 *
 * Most desugarer errors are internal assertions that indicate compiler bugs
 * (Unknown expression/pattern/declaration kind, undefined array elements, etc.)
 * and remain as plain Error throws.
 *
 * Subcategory allocation:
 * - VF3000-VF3099: Unknown node kinds (internal, not implemented as diagnostics)
 * - VF3100-VF3199: Invalid transformation errors
 * - VF3900-VF3999: Desugarer warnings (reserved)
 */

import type { DiagnosticDefinition } from "../diagnostic.js";

import { registry } from "../registry.js";

// =============================================================================
// VF3100-VF3199: Invalid Transformation Errors
// =============================================================================

export const VF3101: DiagnosticDefinition = {
    code: "VF3101",
    title: "UndefinedListElement",
    messageTemplate: "List element at index {index} is undefined",
    severity: "error",
    phase: "desugarer",
    category: "list",
    hintTemplate: "Check that all list elements are properly defined",
    explanation:
        "The list contains an undefined element at the specified position. " +
        "This typically indicates an issue with list pattern or literal construction " +
        "where an element was expected but not provided.",
    example: {
        bad: "let [a, b] = list  // where list has fewer than 2 elements",
        good: "let [a, b] = [1, 2]  // proper list with 2 elements",
        description: "Ensure the list has the expected number of defined elements",
    },
};

// =============================================================================
// Registration
// =============================================================================

const desugarerCodes: readonly DiagnosticDefinition[] = [
    // Invalid transformations
    VF3101,
];

/**
 * Register all desugarer diagnostic codes with the global registry.
 */
export function registerDesugarerCodes(): void {
    registry.registerAll(desugarerCodes);
}
