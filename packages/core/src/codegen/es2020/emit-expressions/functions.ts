/**
 * Function emission for ES2020 code generation (lambdas + applications).
 */

import type { CoreExpr, CorePattern } from "../../../types/core-ast.js";
import type { EmitContext } from "../context.js";

import { withPrecedence } from "../context.js";
import { CALL_PRECEDENCE, needsParens } from "../emit-operators.js";
import { emitExpr } from "./index.js";
import { emitPattern } from "./shared-state.js";

/**
 * Wrap code in parentheses if needed based on precedence
 */
function maybeParens(code: string, innerPrec: number, outerPrec: number): string {
    if (needsParens(innerPrec, outerPrec)) {
        return `(${code})`;
    }
    return code;
}

/**
 * Emit a lambda expression
 */
export function emitLambda(expr: { kind: "CoreLambda"; param: CorePattern; body: CoreExpr }, ctx: EmitContext): string {
    const paramCode = emitPattern(expr.param, ctx);
    const bodyCode = emitExpr(expr.body, withPrecedence(ctx, 0));

    // Use concise arrow function syntax
    const code = `(${paramCode}) => ${bodyCode}`;

    // Arrow functions have very low precedence
    return maybeParens(code, 2, ctx.precedence);
}

/**
 * Emit a function application
 * Note: CoreApp.args is always a single-element array (curried)
 */
export function emitApp(expr: { kind: "CoreApp"; func: CoreExpr; args: CoreExpr[] }, ctx: EmitContext): string {
    const funcCode = emitExpr(expr.func, withPrecedence(ctx, CALL_PRECEDENCE));
    // Args is always single-element in core AST
    const arg = expr.args[0];
    if (arg === undefined) {
        throw new Error("Internal error: CoreApp.args is empty");
    }
    const argCode = emitExpr(arg, withPrecedence(ctx, 0));
    const code = `${funcCode}(${argCode})`;

    return maybeParens(code, CALL_PRECEDENCE, ctx.precedence);
}
