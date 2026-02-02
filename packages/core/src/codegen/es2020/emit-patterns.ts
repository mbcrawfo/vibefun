/**
 * Pattern emission for ES2020 code generation
 *
 * This module handles the emission of CorePattern nodes for:
 * 1. Destructuring contexts (let bindings, lambda parameters)
 * 2. Match case contexts (pattern matching with conditions)
 */

import type { CoreExpr, CorePattern } from "../../types/core-ast.js";
import type { EmitContext } from "./context.js";

import { nextWildcardId } from "./context.js";
import { escapeIdentifier } from "./reserved-words.js";

// =============================================================================
// Dependency Injection for Circular Dependencies
// =============================================================================

// Forward declaration for expression emission (set by generator.ts)
let emitExprFn: (expr: CoreExpr, ctx: EmitContext) => string = () => {
    throw new Error("emitExprFn not initialized - setEmitExpr must be called first");
};

/**
 * Set the expression emission function (called during initialization)
 */
export function setEmitExpr(fn: typeof emitExprFn): void {
    emitExprFn = fn;
}

// =============================================================================
// Pattern Emission for Destructuring
// =============================================================================

/**
 * Emit a pattern for destructuring contexts (let bindings, lambda parameters)
 *
 * This generates JavaScript destructuring syntax:
 * - Variable pattern: `x`
 * - Wildcard pattern: `_` (or unused variable)
 * - Tuple pattern: `[a, b, c]`
 * - Record pattern: `{ x, y }` or `{ x: a, y: b }`
 *
 * @param pattern - The pattern to emit
 * @param ctx - Emission context
 * @returns JavaScript destructuring pattern string
 */
export function emitPattern(pattern: CorePattern, ctx: EmitContext): string {
    switch (pattern.kind) {
        case "CoreWildcardPattern":
            // Generate unique identifier to avoid duplicate `_` in destructuring
            return nextWildcardId(ctx);

        case "CoreVarPattern":
            return escapeIdentifier(pattern.name);

        case "CoreLiteralPattern":
            // Literal patterns can't be used in destructuring on the left side
            // This should only appear in match contexts
            throw new Error("Internal error: Literal patterns cannot be used in destructuring contexts");

        case "CoreTuplePattern":
            return emitTuplePatternDestructure(pattern, ctx);

        case "CoreRecordPattern":
            return emitRecordPatternDestructure(pattern, ctx);

        case "CoreVariantPattern":
            // Variant patterns require runtime checking, can't be pure destructuring
            // This should only appear in match contexts
            throw new Error("Internal error: Variant patterns cannot be used in simple destructuring contexts");

        default: {
            const _exhaustive: never = pattern;
            throw new Error(`Internal error: Unknown pattern kind: ${(_exhaustive as CorePattern).kind}`);
        }
    }
}

/**
 * Emit a tuple pattern for destructuring: [a, b, c]
 */
function emitTuplePatternDestructure(
    pattern: { kind: "CoreTuplePattern"; elements: CorePattern[] },
    ctx: EmitContext,
): string {
    const elements = pattern.elements.map((p) => emitPattern(p, ctx));
    return `[${elements.join(", ")}]`;
}

/**
 * Emit a record pattern for destructuring: { x, y } or { x: a }
 */
function emitRecordPatternDestructure(
    pattern: { kind: "CoreRecordPattern"; fields: Array<{ name: string; pattern: CorePattern }> },
    ctx: EmitContext,
): string {
    const fields = pattern.fields.map((field) => {
        const fieldPattern = emitPattern(field.pattern, ctx);
        // If the pattern is just a variable with the same name, use shorthand
        if (field.pattern.kind === "CoreVarPattern" && field.pattern.name === field.name) {
            return escapeIdentifier(field.name);
        }
        // Otherwise use full destructuring syntax
        return `${field.name}: ${fieldPattern}`;
    });
    return `{ ${fields.join(", ")} }`;
}

// =============================================================================
// Pattern Emission for Match Cases
// =============================================================================

/**
 * Result of emitting a match pattern
 */
export type MatchPatternResult = {
    /** JavaScript condition expression (or null if always matches) */
    condition: string | null;
    /** Variable bindings to emit before the body */
    bindings: string[];
};

/**
 * Emit a pattern for match case contexts
 *
 * This generates:
 * 1. A condition expression to check if the pattern matches
 * 2. Variable bindings to extract matched values
 *
 * @param pattern - The pattern to emit
 * @param scrutinee - The JavaScript expression being matched against
 * @param ctx - Emission context
 * @returns Condition and bindings for the match case
 */
export function emitMatchPattern(pattern: CorePattern, scrutinee: string, ctx: EmitContext): MatchPatternResult {
    switch (pattern.kind) {
        case "CoreWildcardPattern":
            // Always matches, no bindings
            return { condition: null, bindings: [] };

        case "CoreVarPattern":
            // Always matches, binds the value
            return {
                condition: null,
                bindings: [`const ${escapeIdentifier(pattern.name)} = ${scrutinee};`],
            };

        case "CoreLiteralPattern":
            return emitLiteralPattern(pattern, scrutinee);

        case "CoreTuplePattern":
            return emitTuplePattern(pattern, scrutinee, ctx);

        case "CoreRecordPattern":
            return emitRecordPattern(pattern, scrutinee, ctx);

        case "CoreVariantPattern":
            return emitVariantPattern(pattern, scrutinee, ctx);

        default: {
            const _exhaustive: never = pattern;
            throw new Error(`Internal error: Unknown pattern kind: ${(_exhaustive as CorePattern).kind}`);
        }
    }
}

/**
 * Emit a literal pattern for matching
 */
function emitLiteralPattern(
    pattern: { kind: "CoreLiteralPattern"; literal: number | string | boolean | null },
    scrutinee: string,
): MatchPatternResult {
    const literal = pattern.literal;

    // Handle null (unit value) -> undefined
    if (literal === null) {
        return {
            condition: `${scrutinee} === undefined`,
            bindings: [],
        };
    }

    // Handle string literals
    if (typeof literal === "string") {
        // Need to escape the string for JavaScript
        const escaped = JSON.stringify(literal);
        return {
            condition: `${scrutinee} === ${escaped}`,
            bindings: [],
        };
    }

    // Handle numbers (including negative)
    if (typeof literal === "number") {
        // Handle special float values
        if (Number.isNaN(literal)) {
            // NaN never equals itself, use Number.isNaN
            return {
                condition: `Number.isNaN(${scrutinee})`,
                bindings: [],
            };
        }
        if (literal === Infinity) {
            return {
                condition: `${scrutinee} === Infinity`,
                bindings: [],
            };
        }
        if (literal === -Infinity) {
            return {
                condition: `${scrutinee} === -Infinity`,
                bindings: [],
            };
        }
        // Negative numbers need parentheses
        if (literal < 0) {
            return {
                condition: `${scrutinee} === (${literal})`,
                bindings: [],
            };
        }
        return {
            condition: `${scrutinee} === ${literal}`,
            bindings: [],
        };
    }

    // Handle booleans
    return {
        condition: `${scrutinee} === ${literal}`,
        bindings: [],
    };
}

/**
 * Emit a tuple pattern for matching
 */
function emitTuplePattern(
    pattern: { kind: "CoreTuplePattern"; elements: CorePattern[] },
    scrutinee: string,
    ctx: EmitContext,
): MatchPatternResult {
    const conditions: string[] = [];
    const bindings: string[] = [];

    // Check array length
    conditions.push(`Array.isArray(${scrutinee})`);
    conditions.push(`${scrutinee}.length === ${pattern.elements.length}`);

    // Process each element
    for (let i = 0; i < pattern.elements.length; i++) {
        const elemPattern = pattern.elements[i];
        if (elemPattern === undefined) continue;

        const elemScrutinee = `${scrutinee}[${i}]`;
        const result = emitMatchPattern(elemPattern, elemScrutinee, ctx);

        if (result.condition !== null) {
            conditions.push(result.condition);
        }
        bindings.push(...result.bindings);
    }

    return {
        condition: conditions.join(" && "),
        bindings,
    };
}

/**
 * Emit a record pattern for matching
 */
function emitRecordPattern(
    pattern: { kind: "CoreRecordPattern"; fields: Array<{ name: string; pattern: CorePattern }> },
    scrutinee: string,
    ctx: EmitContext,
): MatchPatternResult {
    const conditions: string[] = [];
    const bindings: string[] = [];

    // Check that it's an object
    conditions.push(`typeof ${scrutinee} === "object"`);
    conditions.push(`${scrutinee} !== null`);

    // Process each field
    for (const field of pattern.fields) {
        const fieldScrutinee = `${scrutinee}.${field.name}`;
        const result = emitMatchPattern(field.pattern, fieldScrutinee, ctx);

        if (result.condition !== null) {
            conditions.push(result.condition);
        }
        bindings.push(...result.bindings);
    }

    return {
        condition: conditions.join(" && "),
        bindings,
    };
}

/**
 * Emit a variant pattern for matching
 */
function emitVariantPattern(
    pattern: { kind: "CoreVariantPattern"; constructor: string; args: CorePattern[] },
    scrutinee: string,
    ctx: EmitContext,
): MatchPatternResult {
    const conditions: string[] = [];
    const bindings: string[] = [];

    // Ensure scrutinee is a non-null object before tag access
    conditions.push(`typeof ${scrutinee} === "object"`);
    conditions.push(`${scrutinee} !== null`);

    // Check the tag
    conditions.push(`${scrutinee}.$tag === "${pattern.constructor}"`);

    // Process each argument
    for (let i = 0; i < pattern.args.length; i++) {
        const argPattern = pattern.args[i];
        if (argPattern === undefined) continue;

        const argScrutinee = `${scrutinee}.$${i}`;
        const result = emitMatchPattern(argPattern, argScrutinee, ctx);

        if (result.condition !== null) {
            conditions.push(result.condition);
        }
        bindings.push(...result.bindings);
    }

    return {
        condition: conditions.join(" && "),
        bindings,
    };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Extract all variable names bound by a pattern
 *
 * Used for collecting export names when a declaration uses pattern destructuring.
 *
 * @param pattern - The pattern to extract names from
 * @returns Array of variable names
 */
export function extractPatternNames(pattern: CorePattern): string[] {
    switch (pattern.kind) {
        case "CoreWildcardPattern":
            return [];

        case "CoreVarPattern":
            return [pattern.name];

        case "CoreLiteralPattern":
            return [];

        case "CoreTuplePattern":
            return pattern.elements.flatMap(extractPatternNames);

        case "CoreRecordPattern":
            return pattern.fields.flatMap((f) => extractPatternNames(f.pattern));

        case "CoreVariantPattern":
            return pattern.args.flatMap(extractPatternNames);

        default: {
            const _exhaustive: never = pattern;
            throw new Error(`Internal error: Unknown pattern kind: ${(_exhaustive as CorePattern).kind}`);
        }
    }
}
