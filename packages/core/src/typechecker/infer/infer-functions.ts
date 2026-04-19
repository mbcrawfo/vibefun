/**
 * Type inference for function-related expressions
 *
 * Handles lambda abstractions and function applications.
 */

import type { CoreExpr } from "../../types/core-ast.js";
import type { Type, TypeEnv, TypeScheme } from "../../types/environment.js";
import type { InferenceContext, InferResult } from "./infer-context.js";

import { freshTypeVar, funType } from "../types.js";
import { applySubst, composeSubst, unify } from "../unify.js";

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
