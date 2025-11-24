/**
 * Type inference for function-related expressions
 *
 * Handles lambda abstractions and function applications.
 */

import type { CoreExpr } from "../../types/core-ast.js";
import type { Type, TypeEnv, TypeScheme } from "../../types/environment.js";
import type { InferenceContext, InferResult } from "./infer-context.js";

import { TypeError } from "../../utils/error.js";
import { freshTypeVar, funType, typeToString } from "../types.js";
import { applySubst, composeSubst, unify } from "../unify.js";

// Import inferExpr - will be set via dependency injection
let inferExprFn: (ctx: InferenceContext, expr: CoreExpr) => InferResult;

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

    // Add parameter to environment
    // Currently only variable patterns are supported in lambda parameters
    if (expr.param.kind !== "CoreVarPattern") {
        throw new TypeError(
            `Pattern matching in lambda parameters not yet supported`,
            expr.loc,
            `Only simple variable patterns are currently supported`,
        );
    }

    const paramName = expr.param.name;
    const paramScheme: TypeScheme = { vars: [], type: paramType }; // Monomorphic

    const newEnv: TypeEnv = {
        values: new Map(ctx.env.values),
        types: ctx.env.types,
    };
    newEnv.values.set(paramName, {
        kind: "Value",
        scheme: paramScheme,
        loc: expr.param.loc,
    });

    // Infer body type
    const bodyCtx: InferenceContext = { env: newEnv, subst: ctx.subst, level: ctx.level };
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
    try {
        const unifySubst = unify(actualFuncType, expectedFuncType);
        const finalSubst = composeSubst(unifySubst, currentSubst);

        // Apply substitution to result type
        const finalResultType = applySubst(finalSubst, resultType);

        return { type: finalResultType, subst: finalSubst };
    } catch (error) {
        if (error instanceof TypeError) {
            throw error;
        }
        throw new TypeError(
            `Type error in function application`,
            expr.loc,
            `Expected function type, got ${typeToString(actualFuncType)}`,
        );
    }
}
