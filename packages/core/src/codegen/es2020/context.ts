/**
 * Emission context for code generation
 *
 * Tracks state during code generation including:
 * - Statement vs expression context
 * - Indentation level
 * - Operator precedence (for parenthesization)
 * - Runtime helper usage
 * - Type environment (for structural equality detection)
 */

import type { Type, TypeEnv } from "../../types/environment.js";

/**
 * Context mode for emission
 * - "statement": Top-level or block context (can emit const/let)
 * - "expression": Value context (must emit single expression)
 */
export type EmitMode = "statement" | "expression";

/**
 * Shared mutable state that persists across context copies
 *
 * When contexts are copied with withPrecedence/withIndent/etc., this object
 * reference is shared so that mutations (like marking helpers as needed)
 * propagate to the original context.
 */
export type SharedState = {
    needsEqHelper: boolean;
    needsRefHelper: boolean;
    exportedNames: Set<string>;
    /** Counter for generating unique wildcard identifiers */
    wildcardCounter: number;
};

/**
 * Emission context passed through code generation
 */
export type EmitContext = {
    /** Current emission mode (statement or expression) */
    mode: EmitMode;

    /** Current indentation level (0 = no indent) */
    indentLevel: number;

    /** String used for each indentation level (default: "  ") */
    indentString: string;

    /** Current precedence level for parenthesization */
    precedence: number;

    /** Type environment for looking up variable types */
    env: TypeEnv;

    /** Inferred types for top-level declarations */
    declarationTypes: Map<string, Type>;

    /**
     * Shared mutable state - survives context copies
     * Use helper functions to access/modify these values
     */
    shared: SharedState;

    // Convenience accessors (read-only, for backward compatibility in tests)
    /** @deprecated Use shared.needsEqHelper instead */
    get needsEqHelper(): boolean;
    /** @deprecated Use shared.needsRefHelper instead */
    get needsRefHelper(): boolean;
    /** @deprecated Use shared.exportedNames instead */
    get exportedNames(): Set<string>;
};

/**
 * Default options for creating context
 */
export type CreateContextOptions = {
    /** Initial mode (default: "statement") */
    mode?: EmitMode;
    /** Indentation string (default: "  ") */
    indentString?: string;
    /** Type environment */
    env: TypeEnv;
    /** Declaration types */
    declarationTypes: Map<string, Type>;
};

/**
 * Create a new emission context with default values
 *
 * @param options - Configuration options
 * @returns Fresh emission context
 */
export function createContext(options: CreateContextOptions): EmitContext {
    const shared: SharedState = {
        needsEqHelper: false,
        needsRefHelper: false,
        exportedNames: new Set(),
        wildcardCounter: 0,
    };

    return {
        mode: options.mode ?? "statement",
        indentLevel: 0,
        indentString: options.indentString ?? "  ",
        precedence: 0,
        env: options.env,
        declarationTypes: options.declarationTypes,
        shared,
        // Getters for backward compatibility
        get needsEqHelper() {
            return shared.needsEqHelper;
        },
        get needsRefHelper() {
            return shared.needsRefHelper;
        },
        get exportedNames() {
            return shared.exportedNames;
        },
    };
}

/**
 * Get the current indentation string
 *
 * @param ctx - Emission context
 * @returns String for current indentation level
 */
export function getIndent(ctx: EmitContext): string {
    return ctx.indentString.repeat(ctx.indentLevel);
}

/**
 * Clone a context with overrides, preserving getters for shared state
 *
 * This is needed because spreading an object with getters converts them
 * to plain properties, breaking the live connection to shared state.
 */
function cloneContext(ctx: EmitContext, overrides: Partial<EmitContext>): EmitContext {
    const { shared } = ctx;
    return {
        ...ctx,
        ...overrides,
        shared,
        // Re-attach getters for backward compatibility
        get needsEqHelper() {
            return shared.needsEqHelper;
        },
        get needsRefHelper() {
            return shared.needsRefHelper;
        },
        get exportedNames() {
            return shared.exportedNames;
        },
    };
}

/**
 * Create a new context with incremented indentation
 *
 * @param ctx - Base context
 * @returns New context with indentation level + 1
 */
export function withIndent(ctx: EmitContext): EmitContext {
    return cloneContext(ctx, { indentLevel: ctx.indentLevel + 1 });
}

/**
 * Create a new context in expression mode
 *
 * @param ctx - Base context
 * @returns New context in expression mode
 */
export function withExpressionMode(ctx: EmitContext): EmitContext {
    return cloneContext(ctx, { mode: "expression" });
}

/**
 * Create a new context in statement mode
 *
 * @param ctx - Base context
 * @returns New context in statement mode
 */
export function withStatementMode(ctx: EmitContext): EmitContext {
    return cloneContext(ctx, { mode: "statement" });
}

/**
 * Create a new context with specified precedence
 *
 * @param ctx - Base context
 * @param precedence - New precedence level
 * @returns New context with updated precedence
 */
export function withPrecedence(ctx: EmitContext, precedence: number): EmitContext {
    return cloneContext(ctx, { precedence });
}

/**
 * Mark that the $eq helper is needed
 *
 * @param ctx - Context to update (mutates shared state!)
 */
export function markNeedsEqHelper(ctx: EmitContext): void {
    ctx.shared.needsEqHelper = true;
}

/**
 * Mark that the ref helper is needed
 *
 * @param ctx - Context to update (mutates shared state!)
 */
export function markNeedsRefHelper(ctx: EmitContext): void {
    ctx.shared.needsRefHelper = true;
}

/**
 * Add a name to the export set
 *
 * @param ctx - Context to update (mutates shared state!)
 * @param name - Name to export
 */
export function addExport(ctx: EmitContext, name: string): void {
    ctx.shared.exportedNames.add(name);
}

/**
 * Generate a unique wildcard identifier
 *
 * Used to avoid duplicate `_` identifiers in destructuring patterns.
 * Each call returns a unique name like `_unused0`, `_unused1`, etc.
 *
 * @param ctx - Context to update (mutates shared state!)
 * @returns Unique wildcard identifier
 */
export function nextWildcardId(ctx: EmitContext): string {
    const id = ctx.shared.wildcardCounter++;
    return `_unused${id}`;
}
