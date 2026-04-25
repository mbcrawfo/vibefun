/**
 * Type inference for let-bindings
 *
 * Handles both single and mutually recursive let-bindings,
 * including generalization and the value restriction.
 */

import type { CoreExpr } from "../../types/core-ast.js";
import type { Type, TypeEnv, TypeScheme } from "../../types/environment.js";
import type { InferenceContext, InferResult } from "./infer-context.js";

import { throwDiagnostic, VibefunDiagnostic } from "../../diagnostics/index.js";
import { checkPattern } from "../patterns.js";
import { freeTypeVarsAtLevel, freshTypeVar, isSyntacticValue, refType } from "../types.js";
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
    // Supported patterns:
    //   - CoreVarPattern — standard let-polymorphism
    //   - CoreWildcardPattern — side-effect lets (`let _ = expr;`)
    //   - CoreTuplePattern — destructuring let (`let (a, b) = pair;`)
    // Other patterns (literal, record, constructor) are not yet supported.
    if (
        expr.pattern.kind !== "CoreVarPattern" &&
        expr.pattern.kind !== "CoreWildcardPattern" &&
        expr.pattern.kind !== "CoreTuplePattern"
    ) {
        throwDiagnostic("VF4017", expr.loc, {
            feature: "Pattern matching in let-bindings",
            hint: "Only variable, wildcard, or tuple patterns are currently supported",
        });
    }

    // Recursive tuple bindings (`let rec (a, b) = ...`) are not meaningful —
    // there is no name to seed in the environment before inference.
    if (expr.recursive && expr.pattern.kind === "CoreTuplePattern") {
        throwDiagnostic("VF4017", expr.loc, {
            feature: "Recursive tuple-destructuring let-bindings",
            hint: "Use a variable pattern for recursive bindings",
        });
    }

    // Mutable bindings (`let mut x = ...`) require the inferred RHS type
    // to be `Ref<T>`. The parser admits any RHS shape (including ref
    // aliasing through a variable: `let mut b = a;`), so the constraint
    // is enforced here using unification — that way both `ref(0)` and an
    // existing `Ref<T>` binding pass, while `let mut x = 5;` fails.

    // Create new context with increased level for generalization
    const newLevel = ctx.level + 1;
    let valueCtx: InferenceContext = { ...ctx, level: newLevel };

    // Track temp type for recursive bindings
    let tempType: Type | null = null;

    // Handle recursive bindings (only meaningful for variable patterns;
    // wildcard recursive would reference nothing, so we simply skip env seeding)
    if (expr.recursive && expr.pattern.kind === "CoreVarPattern") {
        // For recursive bindings, add a temporary binding with a fresh type variable
        tempType = freshTypeVar(newLevel);
        const tempScheme: TypeScheme = { vars: [], type: tempType };

        const newEnv: TypeEnv = {
            types: ctx.env.types,
            values: new Map(ctx.env.values),
        };
        newEnv.values.set(expr.pattern.name, {
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
        const unifyCtx = { loc: expr.loc, types: ctx.env.types };
        const unifySubst = unify(tempTypeSubst, valueResult.type, unifyCtx);
        valueCtx.subst = composeSubst(unifySubst, valueResult.subst);
    }

    // Mutable bindings: enforce that the value's inferred type is `Ref<T>`.
    // Unifies the RHS against `Ref<fresh>` so `let mut x = ref(0)`,
    // `let mut b = a;` (alias), and any other Ref-typed expression pass,
    // while `let mut x = 5;` (or any non-Ref RHS) is rejected.
    if (expr.mutable) {
        const elemTypeVar = freshTypeVar(newLevel);
        const expectedRefType = refType(elemTypeVar);
        const valueType = applySubst(valueCtx.subst, valueResult.type);
        try {
            const refUnifySubst = unify(valueType, expectedRefType, {
                loc: expr.value.loc,
                types: ctx.env.types,
            });
            valueCtx.subst = composeSubst(refUnifySubst, valueCtx.subst);
        } catch (err) {
            // Replace the generic unification error with a focused
            // "mutable binding requires Ref<T>" diagnostic.
            if (err instanceof VibefunDiagnostic) {
                throwDiagnostic("VF4018", expr.value.loc, {});
            }
            throw err;
        }
    }

    // Build the body environment.
    //   - CoreVarPattern: bind the generalized scheme.
    //   - CoreTuplePattern: destructure via checkPattern and add each
    //     element binding non-generalized. The value restriction applies
    //     (tuples are not syntactic values), so generalizing would be
    //     unsound anyway.
    //   - CoreWildcardPattern: inherit the parent env.
    let bodyEnv: TypeEnv;
    if (expr.pattern.kind === "CoreVarPattern") {
        const valueScheme = generalize(valueCtx, valueResult.type, expr.value);
        bodyEnv = {
            types: ctx.env.types,
            values: new Map(ctx.env.values),
        };
        bodyEnv.values.set(expr.pattern.name, {
            kind: "Value",
            scheme: valueScheme,
            loc: expr.loc,
        });
    } else if (expr.pattern.kind === "CoreTuplePattern") {
        const patternResult = checkPattern(
            valueCtx.env,
            expr.pattern,
            valueResult.type,
            valueCtx.subst,
            valueCtx.level,
            { loc: expr.pattern.loc, types: ctx.env.types },
        );
        valueCtx = { ...valueCtx, subst: patternResult.subst };
        bodyEnv = {
            types: ctx.env.types,
            values: new Map(ctx.env.values),
        };
        for (const [name, type] of patternResult.bindings) {
            bodyEnv.values.set(name, {
                kind: "Value",
                scheme: { vars: [], type: applySubst(valueCtx.subst, type) },
                loc: expr.loc,
            });
        }
    } else {
        bodyEnv = ctx.env;
    }

    // Infer the type of the body with the updated environment
    const bodyCtx: InferenceContext = {
        ...ctx,
        env: bodyEnv,
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
 * @throws {VibefunDiagnostic} If type inference fails
 */
export function inferLetRecExpr(
    ctx: InferenceContext,
    expr: Extract<CoreExpr, { kind: "CoreLetRecExpr" }>,
): InferResult {
    // For simplicity, only handle variable patterns
    for (const binding of expr.bindings) {
        if (binding.pattern.kind !== "CoreVarPattern") {
            throwDiagnostic("VF4017", binding.loc, {
                feature: "Pattern matching in mutually recursive bindings",
                hint: "Only simple variable patterns are supported in mutually recursive bindings",
            });
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
            ...ctx,
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
            throw new Error(`Internal error: missing type for '${varName}'`);
        }

        const tempTypeSubst = applySubst(currentSubst, tempType);
        const unifyCtx = { loc: binding.loc, types: ctx.env.types };
        const unifySubst = unify(tempTypeSubst, inferredType, unifyCtx);
        currentSubst = composeSubst(unifySubst, currentSubst);

        // Mutable bindings inside a let-rec group must still hold a
        // `Ref<T>` value — see VF4018 in single-binding `inferLet`.
        // Without this check, `let rec mut x = 0 and …` slips past
        // even though the equivalent non-recursive form errors.
        if (binding.mutable) {
            const elemTypeVar = freshTypeVar(newLevel);
            const expectedRefType = refType(elemTypeVar);
            const valueType = applySubst(currentSubst, inferredType);
            try {
                const refUnifySubst = unify(valueType, expectedRefType, {
                    loc: binding.loc,
                    types: ctx.env.types,
                });
                currentSubst = composeSubst(refUnifySubst, currentSubst);
            } catch (err) {
                if (err instanceof VibefunDiagnostic) {
                    throwDiagnostic("VF4018", binding.loc, {});
                }
                throw err;
            }
        }
    }

    // Step 5: Generalize all bindings together
    const generalizedSchemes: Map<string, TypeScheme> = new Map();
    const valueCtxForGeneralize: InferenceContext = {
        ...ctx,
        env: newEnv,
        subst: currentSubst,
        level: newLevel,
    };

    for (const binding of expr.bindings) {
        const varName = (binding.pattern as Extract<typeof binding.pattern, { kind: "CoreVarPattern" }>).name;
        const inferredType = inferredTypes.get(varName);

        if (!inferredType) {
            throw new Error(`Internal error: missing inferred type for '${varName}'`);
        }

        // Mutable bindings stay monomorphic — generalizing a `Ref<t>`
        // would let subsequent `:=` assignments instantiate `t`
        // independently, including the alias case
        // `let rec a = ref(None) and mut b = a` where `a` is a
        // syntactic value at this level. Mirrors the same restriction
        // the non-recursive `inferLet` path applies.
        const appliedType = applySubst(currentSubst, inferredType);
        const scheme = binding.mutable
            ? { vars: [], type: appliedType }
            : generalize(valueCtxForGeneralize, appliedType, binding.value);
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
            throw new Error(`Internal error: missing scheme for '${varName}'`);
        }

        finalEnv.values.set(varName, {
            kind: "Value",
            scheme,
            loc: binding.loc,
        });
    }

    // Step 7: Infer the body expression with the updated environment
    const bodyCtx: InferenceContext = {
        ...ctx,
        env: finalEnv,
        subst: currentSubst,
        level: ctx.level, // Back to the original level
    };

    return inferExprFn(bodyCtx, expr.body);
}
