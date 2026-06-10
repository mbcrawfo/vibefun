/**
 * Type inference for function-related expressions
 *
 * Handles lambda abstractions and function applications.
 */

import type { CoreExpr } from "../../types/core-ast.js";
import type { Type, TypeEnv, TypeScheme, ValueBinding } from "../../types/environment.js";
import type { InferenceContext, InferResult } from "./infer-context.js";

import { throwDiagnostic } from "../../diagnostics/index.js";
import { resolveOverload } from "../resolver.js";
import { freshTypeVar, funType } from "../types.js";
import { applySubst, composeSubst, unify } from "../unify.js";
import { convertTypeExpr } from "./infer-primitives.js";

// Import inferExpr - will be set via dependency injection
// Initialized to error-throwing function for type safety and better error messages
let inferExprFn: (ctx: InferenceContext, expr: CoreExpr) => InferResult = () => {
    throw new Error("inferExprFn not initialized - setInferExpr must be called first");
};

/**
 * Set up dependency injection for inferExpr
 */
export function setInferExpr(fn: typeof inferExprFn): void {
    inferExprFn = fn;
}

/**
 * Infer the type of a lambda abstraction
 *
 * Creates a fresh type variable for the parameter, infers the body type,
 * and returns a function type.
 *
 * @param ctx - The inference context
 * @param expr - The lambda expression
 * @returns The inferred type and updated substitution
 */
export function inferLambda(ctx: InferenceContext, expr: Extract<CoreExpr, { kind: "CoreLambda" }>): InferResult {
    // Create fresh type variable for parameter
    const paramType = freshTypeVar(ctx.level);

    // Invariant: the desugarer lifts destructuring lambda params into a
    // synthesized match, so Core lambdas carry only variable or wildcard
    // patterns. Hitting this branch means a desugarer bug, not user error.
    if (expr.param.kind !== "CoreVarPattern" && expr.param.kind !== "CoreWildcardPattern") {
        throw new Error(`CoreLambda param must be CoreVarPattern or CoreWildcardPattern, got ${expr.param.kind}`);
    }

    const newEnv: TypeEnv = {
        values: new Map(ctx.env.values),
        types: ctx.env.types,
    };

    if (expr.param.kind === "CoreVarPattern") {
        const paramScheme: TypeScheme = { vars: [], type: paramType }; // Monomorphic
        newEnv.values.set(expr.param.name, {
            kind: "Value",
            scheme: paramScheme,
            loc: expr.param.loc,
        });
    }

    // Infer body type. A lambda body is a fresh "safe" scope: `inUnsafe` is
    // reset to false so a lambda defined inside an `unsafe` block does not
    // silently inherit unsafe capabilities at its future call sites. The spec
    // requires callers to wrap the lambda body in its own `unsafe` if it needs
    // to invoke externals.
    const bodyCtx: InferenceContext = {
        ...ctx,
        env: newEnv,
        subst: ctx.subst,
        level: ctx.level,
        inUnsafe: false,
    };
    const bodyResult = inferExprFn(bodyCtx, expr.body);

    // Apply substitution to parameter type
    const finalParamType = applySubst(bodyResult.subst, paramType);

    // Return function type
    const funcType = funType([finalParamType], bodyResult.type);

    return { type: funcType, subst: bodyResult.subst };
}

/**
 * Infer the type of a function application
 *
 * Infers the function and argument types, unifies the function type
 * with (arg -> result), and returns the result type.
 *
 * @param ctx - The inference context
 * @param expr - The application expression
 * @returns The inferred type and updated substitution
 */
export function inferApp(ctx: InferenceContext, expr: Extract<CoreExpr, { kind: "CoreApp" }>): InferResult {
    // Overloaded externals resolve by the argument count of the whole
    // application spine (the desugarer curries `f(a, b)` into nested
    // single-arg CoreApps, so the spine is reassembled here). The outermost
    // CoreApp of the spine handles the entire application, so inner spine
    // segments are never inferred individually.
    const spine = collectAppSpine(expr);
    if (spine.head.kind === "CoreVar") {
        const binding = ctx.env.values.get(spine.head.name);
        if (binding?.kind === "ExternalOverload") {
            return inferOverloadedExternalApp(ctx, spine.head, binding, spine.args, expr.loc);
        }
    }

    // Infer function type
    const funcResult = inferExprFn(ctx, expr.func);

    // Infer argument types
    let currentSubst = funcResult.subst;
    const argTypes: Type[] = [];

    for (const arg of expr.args) {
        const argCtx: InferenceContext = { ...ctx, subst: currentSubst };
        const argResult = inferExprFn(argCtx, arg);
        argTypes.push(argResult.type);
        currentSubst = argResult.subst;
    }

    // Create fresh type variable for result
    const resultType = freshTypeVar(ctx.level);

    // Create expected function type: (arg1, arg2, ...) -> result
    const expectedFuncType = funType(argTypes, resultType);

    // Apply current substitution to function type
    const actualFuncType = applySubst(currentSubst, funcResult.type);

    // Unify function type with expected type
    const unifyCtx = { loc: expr.loc, types: ctx.env.types };
    const unifySubst = unify(actualFuncType, expectedFuncType, unifyCtx);
    const finalSubst = composeSubst(unifySubst, currentSubst);

    // Apply substitution to result type
    const finalResultType = applySubst(finalSubst, resultType);

    return { type: finalResultType, subst: finalSubst };
}

/**
 * Reassemble the application spine of a curried CoreApp chain.
 *
 * `f(a, b)` desugars to `CoreApp(CoreApp(f, [a]), [b])`; walking the `func`
 * edge recovers the head `f` and the argument list `[a, b]` in source order.
 */
function collectAppSpine(expr: Extract<CoreExpr, { kind: "CoreApp" }>): { head: CoreExpr; args: CoreExpr[] } {
    const args: CoreExpr[] = [];
    let current: CoreExpr = expr;
    while (current.kind === "CoreApp") {
        const arg = current.args[0];
        if (arg === undefined) {
            throw new Error("Internal error: CoreApp.args is empty");
        }
        args.unshift(arg);
        current = current.func;
    }
    return { head: current, args };
}

/**
 * Infer a full application of an overloaded external.
 *
 * Resolution is arity-based (external-declarations.md): the overload whose
 * parameter count equals the spine's argument count is selected (VF4201 if
 * none, VF4205 if several share the arity). The selected overload's declared
 * type is converted to the canonical curried representation and unified with
 * the argument types, exactly like an ordinary application.
 */
function inferOverloadedExternalApp(
    ctx: InferenceContext,
    head: Extract<CoreExpr, { kind: "CoreVar" }>,
    binding: ValueBinding & { kind: "ExternalOverload" },
    args: CoreExpr[],
    loc: Extract<CoreExpr, { kind: "CoreApp" }>["loc"],
): InferResult {
    // Referencing an external outside an unsafe block is a compile error,
    // overloaded or not (spec Section 10, Unsafe Block Restrictions).
    if (!ctx.inUnsafe) {
        throwDiagnostic("VF4805", head.loc, { name: head.name });
    }

    const resolution = resolveOverload(head.name, binding, args.length, loc);
    if (resolution.kind !== "Overload") {
        throw new Error(`Internal error: expected overload resolution for '${head.name}'`);
    }

    // The declared overload signature, in the canonical curried form
    // (matches the desugarer's single-argument application chains).
    const funcType = convertTypeExpr({
        kind: "CoreFunctionType",
        params: resolution.overload.paramTypes,
        return_: resolution.overload.returnType,
        loc: resolution.overload.loc,
    });

    // Infer argument types left-to-right, threading the substitution
    let currentSubst = ctx.subst;
    const argTypes: Type[] = [];
    for (const arg of args) {
        const argCtx: InferenceContext = { ...ctx, subst: currentSubst };
        const argResult = inferExprFn(argCtx, arg);
        argTypes.push(argResult.type);
        currentSubst = argResult.subst;
    }

    // Expected curried type: arg1 -> arg2 -> ... -> result
    const resultType = freshTypeVar(ctx.level);
    const expectedFuncType = argTypes.reduceRight<Type>((acc, argType) => funType([argType], acc), resultType);

    const unifyCtx = { loc, types: ctx.env.types };
    const unifySubst = unify(applySubst(currentSubst, funcType), expectedFuncType, unifyCtx);
    const finalSubst = composeSubst(unifySubst, currentSubst);

    return { type: applySubst(finalSubst, resultType), subst: finalSubst };
}
