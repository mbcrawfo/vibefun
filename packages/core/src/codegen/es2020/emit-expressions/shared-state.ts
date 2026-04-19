/**
 * Shared DI state for the emit-expressions sub-modules.
 *
 * The code generator wires pattern emission, match-pattern emission, and
 * pattern-name extraction via setter functions (the cycle is broken by
 * initializing these at generator boot). Sub-files call the getter
 * wrappers below, keeping the mutable function references private to
 * this module.
 */

import type { CorePattern } from "../../../types/core-ast.js";
import type { EmitContext } from "../context.js";

// Forward declaration for pattern emission (set by generator.ts)
let emitPatternFn: (pattern: CorePattern, ctx: EmitContext) => string = () => {
    throw new Error("emitPatternFn not initialized - setEmitPattern must be called first");
};

// Forward declaration for extracting pattern names (set by generator.ts)
let extractPatternNamesFn: (pattern: CorePattern) => string[] = () => {
    throw new Error("extractPatternNamesFn not initialized - setExtractPatternNames must be called first");
};

// Forward declaration for match pattern emission (set by generator.ts)
let emitMatchPatternFn: (
    pattern: CorePattern,
    scrutinee: string,
    ctx: EmitContext,
) => { condition: string | null; bindings: string[] } = () => {
    throw new Error("emitMatchPatternFn not initialized - setEmitMatchPattern must be called first");
};

/**
 * Set the pattern emission function (called during initialization)
 */
export function setEmitPattern(fn: typeof emitPatternFn): void {
    emitPatternFn = fn;
}

/**
 * Set the pattern name extraction function (called during initialization)
 */
export function setExtractPatternNames(fn: typeof extractPatternNamesFn): void {
    extractPatternNamesFn = fn;
}

/**
 * Set the match pattern emission function (called during initialization)
 */
export function setEmitMatchPattern(fn: typeof emitMatchPatternFn): void {
    emitMatchPatternFn = fn;
}

/**
 * Emit a pattern via the injected pattern emitter.
 */
export function emitPattern(pattern: CorePattern, ctx: EmitContext): string {
    return emitPatternFn(pattern, ctx);
}

/**
 * Extract the variable names introduced by a pattern via the injected extractor.
 */
export function extractPatternNames(pattern: CorePattern): string[] {
    return extractPatternNamesFn(pattern);
}

/**
 * Emit a match-pattern test/bindings pair via the injected emitter.
 */
export function emitMatchPattern(
    pattern: CorePattern,
    scrutinee: string,
    ctx: EmitContext,
): { condition: string | null; bindings: string[] } {
    return emitMatchPatternFn(pattern, scrutinee, ctx);
}
