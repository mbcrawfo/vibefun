/**
 * Function emission for ES2020 code generation (lambdas + applications).
 */

import type { CoreExpr, CorePattern } from "../../../types/core-ast.js";
import type { EmitContext } from "../context.js";

import { markNeedsFfiOptionHelper, withPrecedence } from "../context.js";
import { isOptionTypeExpr, jsCallTarget } from "../emit-declarations.js";
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

    // JS parses a concise arrow body starting with `{` as a block, not an
    // expression. Records, record updates, and variant constructors all
    // emit `{ ... }`, so wrap those bodies in parens to force expression
    // parsing: `(x) => ({ ... })`.
    const wrappedBody = bodyCode.startsWith("{") ? `(${bodyCode})` : bodyCode;
    const code = `(${paramCode}) => ${wrappedBody}`;

    // Arrow functions have very low precedence
    return maybeParens(code, 2, ctx.precedence);
}

/**
 * Emit a function application
 * Note: CoreApp.args is always a single-element array (curried)
 */
export function emitApp(expr: { kind: "CoreApp"; func: CoreExpr; args: CoreExpr[] }, ctx: EmitContext): string {
    // Calls to overloaded externals emit the whole curried spine as ONE
    // n-ary JS call: the typechecker resolved the overload by exact spine
    // arity, and all overloads share a single jsName (VF4801), so the raw
    // JS function expects every argument at once. The outermost CoreApp
    // handles the full spine, so inner segments are never visited.
    const spine = collectAppSpine(expr);
    if (spine.head.kind === "CoreVar") {
        const binding = ctx.env.values.get(spine.head.name);
        if (binding?.kind === "ExternalOverload") {
            const argsCode = spine.args.map((arg) => emitExpr(arg, withPrecedence(ctx, 0))).join(", ");
            let code = `${jsCallTarget(binding.jsName)}(${argsCode})`;
            // The typechecker resolved the overload by exact spine arity;
            // marshal its Option<T> return through $ffiOption like wrapped
            // single externals do. [BUG: VF-FC-0010]
            const overload = binding.overloads.find((o) => o.paramTypes.length === spine.args.length);
            if (overload !== undefined && isOptionTypeExpr(overload.returnType)) {
                markNeedsFfiOptionHelper(ctx);
                code = `$ffiOption(${code})`;
            }
            return maybeParens(code, CALL_PRECEDENCE, ctx.precedence);
        }
    }

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

/**
 * Reassemble the application spine of a curried CoreApp chain
 * (`f(a)(b)` → head `f`, args `[a, b]`).
 */
function collectAppSpine(expr: { kind: "CoreApp"; func: CoreExpr; args: CoreExpr[] }): {
    head: CoreExpr;
    args: CoreExpr[];
} {
    const outerArg = expr.args[0];
    if (outerArg === undefined) {
        throw new Error("Internal error: CoreApp.args is empty");
    }
    const args: CoreExpr[] = [outerArg];
    let current: CoreExpr = expr.func;
    while (current.kind === "CoreApp") {
        const arg = current.args[0];
        if (arg === undefined) {
            throw new Error("Internal error: CoreApp.args is empty");
        }
        args.push(arg);
        current = current.func;
    }
    args.reverse();
    return { head: current, args };
}
