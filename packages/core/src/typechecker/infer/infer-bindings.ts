/**
 * Type inference for let-bindings
 *
 * Handles both single and mutually recursive let-bindings,
 * including generalization and the value restriction.
 */

import type { CoreExpr } from "../../types/core-ast.js";
import type { Type, TypeEnv, TypeScheme } from "../../types/environment.js";
import type { InferenceContext, InferResult } from "./infer-context.js";

import { throwDiagnostic } from "../../diagnostics/index.js";
import { checkPattern } from "../patterns.js";
import { freshTypeVar } from "../types.js";
import { applySubst, composeSubst, unify } from "../unify.js";
import { computeBindingScheme, enforceMutableRefBinding, generalize } from "./let-binding-helpers.js";

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

// Re-export generalize so existing import sites that pull it from this
// module continue to work without churn. The implementation now lives in
// `./let-binding-helpers.js` to avoid a module-init cycle through
// `../patterns.js → ./index.js → ./infer-bindings.js`.
export { generalize };

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
    //
    // Recursive `let` (`let rec x = … in body`) is lowered by the
    // desugarer to a single-binding `CoreLetRecExpr`, so this path
    // handles non-recursive forms only. See
    // `docs/compiler-architecture/07-let-binding-paths.md`.
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

    // Mutable bindings (`let mut x = ...`) require the inferred RHS type
    // to be `Ref<T>`. The parser admits any RHS shape (including ref
    // aliasing through a variable: `let mut b = a;`), so the constraint
    // is enforced here using unification — that way both `ref(0)` and an
    // existing `Ref<T>` binding pass, while `let mut x = 5;` fails.

    // Create new context with increased level for generalization
    const newLevel = ctx.level + 1;
    let valueCtx: InferenceContext = { ...ctx, level: newLevel };

    // Infer the type of the value
    const valueResult = inferExprFn(valueCtx, expr.value);
    valueCtx = { ...valueCtx, subst: valueResult.subst };

    // Mutable bindings: enforce that the value's inferred type is `Ref<T>`.
    // The helper unifies the RHS against `Ref<fresh>` so `let mut x = ref(0)`,
    // `let mut b = a;` (alias), and any other Ref-typed expression pass,
    // while `let mut x = 5;` (or any non-Ref RHS) is rejected.
    valueCtx.subst = enforceMutableRefBinding({
        binding: { mutable: expr.mutable, value: { loc: expr.value.loc } },
        inferredType: valueResult.type,
        subst: valueCtx.subst,
        level: newLevel,
        types: ctx.env.types,
    });

    // Build the body environment.
    //   - CoreVarPattern: bind the (possibly generalised) scheme.
    //   - CoreTuplePattern: destructure via checkPattern and add each
    //     element binding non-generalised. The value restriction applies
    //     (tuples are not syntactic values), so generalising would be
    //     unsound anyway.
    //   - CoreWildcardPattern: inherit the parent env.
    let bodyEnv: TypeEnv;
    if (expr.pattern.kind === "CoreVarPattern") {
        const valueScheme = computeBindingScheme({
            binding: { mutable: expr.mutable, value: expr.value, pattern: expr.pattern },
            inferredType: valueResult.type,
            subst: valueCtx.subst,
            level: newLevel,
            env: valueCtx.env,
        });
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
        currentSubst = enforceMutableRefBinding({
            binding: { mutable: binding.mutable, value: { loc: binding.value.loc } },
            inferredType,
            subst: currentSubst,
            level: newLevel,
            types: ctx.env.types,
        });
    }

    // Step 5: Generalize all bindings together. The helper enforces the
    // skip-generalize rule for mutable bindings — without that skip,
    // `let rec a = ref(None) and mut b = a` re-opens the polymorphic-ref
    // hole because `a` is a syntactic value at this level.
    const generalizedSchemes: Map<string, TypeScheme> = new Map();

    for (const binding of expr.bindings) {
        const varName = (binding.pattern as Extract<typeof binding.pattern, { kind: "CoreVarPattern" }>).name;
        const inferredType = inferredTypes.get(varName);

        if (!inferredType) {
            throw new Error(`Internal error: missing inferred type for '${varName}'`);
        }

        const scheme = computeBindingScheme({
            binding: { mutable: binding.mutable, value: binding.value, pattern: binding.pattern },
            inferredType,
            subst: currentSubst,
            level: newLevel,
            env: newEnv,
        });
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
