/**
 * Type inference for let-bindings
 *
 * Handles both single and mutually recursive let-bindings,
 * including generalization and the value restriction.
 */

import type { CoreExpr } from "../../types/core-ast.js";
import type { Type, TypeEnv, TypeScheme } from "../../types/environment.js";
import type { InferenceContext, InferResult } from "./infer-context.js";

import { TypeError } from "../../utils/error.js";
import { freeTypeVarsAtLevel, freshTypeVar, isSyntacticValue } from "../types.js";
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
 * Generalize a type to a type scheme
 *
 * Quantifies over all type variables at the current level, respecting
 * the value restriction for sound polymorphism with mutable references.
 *
 * @param ctx - The inference context
 * @param type - The type to generalize
 * @param expr - The expression being generalized (for value restriction)
 * @returns A type scheme with quantified variables
 */
export function generalize(ctx: InferenceContext, type: Type, expr: CoreExpr): TypeScheme {
    // Apply current substitution to the type
    const finalType = applySubst(ctx.subst, type);

    // Find all free type variables at the current level
    const freeVarsSet = freeTypeVarsAtLevel(finalType, ctx.level);
    const freeVars = Array.from(freeVarsSet);

    // Value restriction: only generalize if the expression is a syntactic value
    // This prevents unsound generalization of mutable references
    // For example: let x = ref None should have type Ref<'a option>, not ∀'a. Ref<'a option>
    if (isSyntacticValue(expr)) {
        return { vars: freeVars, type: finalType };
    } else {
        // Not a syntactic value - don't generalize (monomorphic)
        return { vars: [], type: finalType };
    }
}

/**
 * Infer the type of a let-binding
 *
 * Handles let-polymorphism with generalization, supporting both
 * recursive and non-recursive bindings.
 *
 * @param ctx - The inference context
 * @param expr - The let expression
 * @returns The inferred type and updated substitution
 */
export function inferLet(ctx: InferenceContext, expr: Extract<CoreExpr, { kind: "CoreLet" }>): InferResult {
    // Currently only variable patterns are supported in let-bindings
    if (expr.pattern.kind !== "CoreVarPattern") {
        throw new TypeError(
            `Pattern matching in let-bindings not yet supported`,
            expr.loc,
            `Only simple variable patterns are currently supported`,
        );
    }

    const varName = expr.pattern.name;

    // Mutable let-bindings are not supported yet
    if (expr.mutable) {
        throw new TypeError(
            `Mutable let-bindings not yet supported`,
            expr.loc,
            `Use Ref<T> types for mutable values instead`,
        );
    }

    // Create new context with increased level for generalization
    const newLevel = ctx.level + 1;
    let valueCtx: InferenceContext = { ...ctx, level: newLevel };

    // Track temp type for recursive bindings
    let tempType: Type | null = null;

    // Handle recursive bindings
    if (expr.recursive) {
        // For recursive bindings, add a temporary binding with a fresh type variable
        tempType = freshTypeVar(newLevel);
        const tempScheme: TypeScheme = { vars: [], type: tempType };

        const newEnv: TypeEnv = {
            types: ctx.env.types,
            values: new Map(ctx.env.values),
        };
        newEnv.values.set(varName, {
            kind: "Value",
            scheme: tempScheme,
            loc: expr.loc,
        });

        valueCtx = { ...valueCtx, env: newEnv };
    }

    // Infer the type of the value
    const valueResult = inferExprFn(valueCtx, expr.value);
    valueCtx = { ...valueCtx, subst: valueResult.subst };

    // For recursive bindings, unify the inferred type with the temporary type variable
    if (expr.recursive && tempType) {
        const tempTypeSubst = applySubst(valueResult.subst, tempType);
        const unifyCtx = { loc: expr.loc };
        const unifySubst = unify(tempTypeSubst, valueResult.type, unifyCtx);
        valueCtx.subst = composeSubst(unifySubst, valueResult.subst);
    }

    // Generalize the type of the value
    const valueScheme = generalize(valueCtx, valueResult.type, expr.value);

    // Add the binding to the environment
    const newEnv: TypeEnv = {
        types: ctx.env.types,
        values: new Map(ctx.env.values),
    };
    newEnv.values.set(varName, {
        kind: "Value",
        scheme: valueScheme,
        loc: expr.loc,
    });

    // Infer the type of the body with the updated environment
    const bodyCtx: InferenceContext = {
        env: newEnv,
        subst: valueCtx.subst,
        level: ctx.level, // Back to the original level
    };

    return inferExprFn(bodyCtx, expr.body);
}

/**
 * Infer the type of mutually recursive let bindings (let rec f = ... and g = ... in body)
 *
 * Implements the algorithm for mutually recursive bindings:
 * 1. Bind all names with fresh type variables BEFORE inferring any values
 * 2. Increment level
 * 3. Infer each value expression
 * 4. Unify inferred types with placeholder types
 * 5. Generalize all bindings together
 * 6. Add all bindings to environment
 * 7. Infer the body expression
 *
 * @param ctx - The inference context
 * @param expr - The mutually recursive let expression
 * @returns The inferred type and updated substitution
 * @throws {TypeError} If type inference fails
 */
export function inferLetRecExpr(
    ctx: InferenceContext,
    expr: Extract<CoreExpr, { kind: "CoreLetRecExpr" }>,
): InferResult {
    // For simplicity, only handle variable patterns
    for (const binding of expr.bindings) {
        if (binding.pattern.kind !== "CoreVarPattern") {
            throw new TypeError(
                `Pattern matching in mutually recursive bindings not yet supported`,
                binding.loc,
                `Only simple variable patterns are supported in mutually recursive bindings`,
            );
        }
    }

    // Mutable bindings are not supported yet
    for (const binding of expr.bindings) {
        if (binding.mutable) {
            throw new TypeError(
                `Mutable bindings in mutually recursive groups not yet supported`,
                binding.loc,
                `Use Ref<T> types for mutable values instead`,
            );
        }
    }

    // Step 1: Create new level for generalization
    const newLevel = ctx.level + 1;

    // Step 2: Bind all names with fresh type variables BEFORE inferring any values
    const tempTypes: Map<string, Type> = new Map();
    const newEnv: TypeEnv = {
        types: ctx.env.types,
        values: new Map(ctx.env.values),
    };

    for (const binding of expr.bindings) {
        const varName = (binding.pattern as Extract<typeof binding.pattern, { kind: "CoreVarPattern" }>).name;
        const tempType = freshTypeVar(newLevel);
        tempTypes.set(varName, tempType);

        // Add temporary binding to environment
        newEnv.values.set(varName, {
            kind: "Value",
            scheme: { vars: [], type: tempType },
            loc: binding.loc,
        });
    }

    // Step 3: Infer each value expression with all names bound
    let currentSubst = ctx.subst;
    const inferredTypes: Map<string, Type> = new Map();

    for (const binding of expr.bindings) {
        const varName = (binding.pattern as Extract<typeof binding.pattern, { kind: "CoreVarPattern" }>).name;

        const valueCtx: InferenceContext = {
            env: newEnv,
            subst: currentSubst,
            level: newLevel,
        };

        const valueResult = inferExprFn(valueCtx, binding.value);
        currentSubst = valueResult.subst;
        inferredTypes.set(varName, valueResult.type);
    }

    // Step 4: Unify inferred types with placeholder types
    for (const binding of expr.bindings) {
        const varName = (binding.pattern as Extract<typeof binding.pattern, { kind: "CoreVarPattern" }>).name;
        const tempType = tempTypes.get(varName);
        const inferredType = inferredTypes.get(varName);

        if (!tempType || !inferredType) {
            throw new TypeError(
                `Internal error: missing type for '${varName}'`,
                binding.loc,
                `This is a compiler bug.`,
            );
        }

        const tempTypeSubst = applySubst(currentSubst, tempType);
        const unifyCtx = { loc: binding.loc };
        const unifySubst = unify(tempTypeSubst, inferredType, unifyCtx);
        currentSubst = composeSubst(unifySubst, currentSubst);
    }

    // Step 5: Generalize all bindings together
    const generalizedSchemes: Map<string, TypeScheme> = new Map();
    const valueCtxForGeneralize: InferenceContext = {
        env: newEnv,
        subst: currentSubst,
        level: newLevel,
    };

    for (const binding of expr.bindings) {
        const varName = (binding.pattern as Extract<typeof binding.pattern, { kind: "CoreVarPattern" }>).name;
        const inferredType = inferredTypes.get(varName);

        if (!inferredType) {
            throw new TypeError(
                `Internal error: missing inferred type for '${varName}'`,
                binding.loc,
                `This is a compiler bug.`,
            );
        }

        const scheme = generalize(valueCtxForGeneralize, inferredType, binding.value);
        generalizedSchemes.set(varName, scheme);
    }

    // Step 6: Add all bindings to environment with generalized types
    const finalEnv: TypeEnv = {
        types: ctx.env.types,
        values: new Map(ctx.env.values),
    };

    for (const binding of expr.bindings) {
        const varName = (binding.pattern as Extract<typeof binding.pattern, { kind: "CoreVarPattern" }>).name;
        const scheme = generalizedSchemes.get(varName);

        if (!scheme) {
            throw new TypeError(
                `Internal error: missing scheme for '${varName}'`,
                binding.loc,
                `This is a compiler bug.`,
            );
        }

        finalEnv.values.set(varName, {
            kind: "Value",
            scheme,
            loc: binding.loc,
        });
    }

    // Step 7: Infer the body expression with the updated environment
    const bodyCtx: InferenceContext = {
        env: finalEnv,
        subst: currentSubst,
        level: ctx.level, // Back to the original level
    };

    return inferExprFn(bodyCtx, expr.body);
}
