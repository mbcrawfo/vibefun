/**
 * Control-flow emission for ES2020 code generation:
 * let / let-rec / match expressions.
 */

import type { CoreExpr, CorePattern } from "../../../types/core-ast.js";
import type { EmitContext } from "../context.js";

import { markNeedsRefHelper, withPrecedence } from "../context.js";
import { escapeIdentifier } from "../reserved-words.js";
import { emitExpr } from "./index.js";
import { emitMatchPattern, emitPattern, extractPatternNames } from "./shared-state.js";

/**
 * Emit a let expression
 */
export function emitLet(
    expr: {
        kind: "CoreLet";
        pattern: CorePattern;
        value: CoreExpr;
        body: CoreExpr;
        mutable: boolean;
        recursive: boolean;
    },
    ctx: EmitContext,
): string {
    // Mutable bindings carry their ref wrapping via an explicit `ref(...)`
    // call in the value expression — the parser enforces this shape, so
    // codegen must not double-wrap. We still need the ref runtime helper
    // to exist because the emitted value will call it. Use `let` for
    // mutable bindings so the binding itself can be reassigned
    // (`x = ref(10)` per spec).
    if (expr.mutable) {
        markNeedsRefHelper(ctx);
    }
    const patternCode = emitPattern(expr.pattern, ctx);
    const valueCode = emitExpr(expr.value, withPrecedence(ctx, 0));
    const bodyCode = emitExpr(expr.body, withPrecedence(ctx, 0));

    const keyword = expr.recursive || expr.mutable ? "let" : "const";

    return `(() => { ${keyword} ${patternCode} = ${valueCode}; return ${bodyCode}; })()`;
}

/**
 * Emit a mutually recursive let expression
 *
 * For let rec, we need to declare variables first (forward references),
 * then assign. JavaScript destructuring requires initializers, so we
 * extract variable names for declarations and use full patterns for assignments.
 */
export function emitLetRecExpr(
    expr: {
        kind: "CoreLetRecExpr";
        bindings: Array<{ pattern: CorePattern; value: CoreExpr; mutable: boolean }>;
        body: CoreExpr;
    },
    ctx: EmitContext,
): string {
    // Use IIFE with let declarations for forward references
    const declarations: string[] = [];
    const assignments: string[] = [];

    for (const binding of expr.bindings) {
        // Extract variable names for forward declaration (destructuring needs initializer)
        const names = extractPatternNames(binding.pattern).map(escapeIdentifier);
        declarations.push(...names);

        // Use full pattern for assignment. Mutable bindings rely on the
        // explicit `ref(...)` call inside `value` for their wrapping, so
        // codegen must not wrap again — but the helper function still
        // needs to be emitted to satisfy the call.
        if (binding.mutable) {
            markNeedsRefHelper(ctx);
        }
        const patternCode = emitPattern(binding.pattern, ctx);
        const valueCode = emitExpr(binding.value, withPrecedence(ctx, 0));
        assignments.push(`${patternCode} = ${valueCode}`);
    }

    const bodyCode = emitExpr(expr.body, withPrecedence(ctx, 0));

    const declLine = declarations.length > 0 ? `let ${declarations.join(", ")}; ` : "";
    return `(() => { ${declLine}${assignments.join("; ")}; return ${bodyCode}; })()`;
}

/**
 * Emit a match expression
 *
 * Uses IIFE with if-chain for pattern matching.
 *
 * Generated structure:
 * ```javascript
 * (() => {
 *   const $match = <scrutinee>;
 *   if (<condition1>) { <bindings1>; return <body1>; }
 *   if (<condition2>) { <bindings2>; return <body2>; }
 *   ...
 *   throw new Error("Match exhausted"); // fallback
 * })()
 * ```
 */
export function emitMatch(
    expr: {
        kind: "CoreMatch";
        expr: CoreExpr;
        cases: Array<{ pattern: CorePattern; guard?: CoreExpr; body: CoreExpr }>;
    },
    ctx: EmitContext,
): string {
    const indent = ctx.indentString.repeat(ctx.indentLevel);
    const indent1 = ctx.indentString.repeat(ctx.indentLevel + 1);

    const scrutineeCode = emitExpr(expr.expr, withPrecedence(ctx, 0));

    // Generate IIFE with if-chain
    const lines: string[] = [];
    lines.push(`(() => {`);
    lines.push(`${indent1}const $match = ${scrutineeCode};`);

    // Track whether we emitted an unconditional case (no need for fallback after)
    let emittedUnconditionalCase = false;

    for (let i = 0; i < expr.cases.length; i++) {
        const matchCase = expr.cases[i];
        if (matchCase === undefined) {
            continue;
        }

        // Get pattern condition and bindings
        const patternResult = emitMatchPattern(matchCase.pattern, "$match", ctx);
        const bodyCode = emitExpr(matchCase.body, withPrecedence(ctx, 0));

        // Generate bindings as variable declarations
        const bindingsCode = patternResult.bindings.join(" ");

        // Get pattern condition and guard code separately
        const patternCondition = patternResult.condition;
        const guardCode = matchCase.guard !== undefined ? emitExpr(matchCase.guard, withPrecedence(ctx, 0)) : null;

        if (patternCondition === null && guardCode === null) {
            // Unconditional match (wildcard or variable without guard)
            if (bindingsCode) {
                lines.push(`${indent1}${bindingsCode} return ${bodyCode};`);
            } else {
                lines.push(`${indent1}return ${bodyCode};`);
            }
            // No need for fallback after unconditional match
            emittedUnconditionalCase = true;
            break;
        } else if (patternCondition !== null && guardCode === null) {
            // Pattern condition only (no guard)
            if (bindingsCode) {
                lines.push(`${indent1}if (${patternCondition}) { ${bindingsCode} return ${bodyCode}; }`);
            } else {
                lines.push(`${indent1}if (${patternCondition}) { return ${bodyCode}; }`);
            }
        } else if (patternCondition === null && guardCode !== null) {
            // Guard only (variable/wildcard pattern with guard)
            // Bindings must be emitted BEFORE guard evaluation
            lines.push(`${indent1}{ ${bindingsCode} if (${guardCode}) { return ${bodyCode}; } }`);
        } else {
            // Both pattern condition and guard
            // Check pattern first, then emit bindings, then check guard
            if (bindingsCode) {
                lines.push(
                    `${indent1}if (${patternCondition}) { ${bindingsCode} if (${guardCode}) { return ${bodyCode}; } }`,
                );
            } else {
                lines.push(`${indent1}if (${patternCondition} && ${guardCode}) { return ${bodyCode}; }`);
            }
        }
    }

    // Add exhaustiveness fallback (should be unreachable if typechecker ensures exhaustiveness)
    // Only add if no unconditional case was emitted
    if (!emittedUnconditionalCase) {
        lines.push(`${indent1}throw new Error("Match exhausted");`);
    }

    lines.push(`${indent}})()`);

    return lines.join("\n");
}
