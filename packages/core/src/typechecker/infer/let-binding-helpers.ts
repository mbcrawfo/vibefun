/**
 * Shared helpers for the let-binding inference paths.
 *
 * Three soundness invariants are enforced identically across every let-form
 * in the compiler. Inlining them at each site led to nine rounds of
 * regression patches in PR #73 — every round was "path X is missing the
 * check that path Y already has." Centralising them here means there is one
 * call site to update when the rules change, and the call is the only
 * correct way to satisfy the invariant.
 *
 * The three invariants:
 *
 * 1. Mutable bindings (`let mut x = …`) must hold a `Ref<T>` value;
 *    otherwise throw VF4018 at the RHS location.
 * 2. Mutable bindings and non-`CoreVarPattern` bindings must stay
 *    monomorphic — generalising would re-open the polymorphic-ref hole
 *    (e.g. `let mut b = a` where `a` is a syntactic value) and is unsound
 *    for tuple/wildcard destructuring anyway.
 * 3. Substitution learned in a top-level declaration must flow into both
 *    `declarationTypes` (so `--emit typed-ast` doesn't drift) and
 *    `env.values` (so subsequent declarations observe the narrowed shape).
 *
 * See `docs/compiler-architecture/07-let-binding-paths.md` for the full
 * picture.
 */

import type { Location } from "../../types/ast.js";
import type { CoreExpr } from "../../types/core-ast.js";
import type { Type, TypeEnv, TypeScheme, ValueBinding } from "../../types/environment.js";
import type { Substitution } from "../unify.js";
import type { InferenceContext } from "./infer-context.js";

import { throwDiagnostic, VibefunDiagnostic } from "../../diagnostics/index.js";
import { appType, constType, freeTypeVarsAtLevel, freshTypeVar, isSyntacticValue } from "../types.js";
import { applySubst, composeSubst, unify } from "../unify.js";

/**
 * Generalize a type to a type scheme.
 *
 * Quantifies over all type variables at the current level, respecting the
 * value restriction for sound polymorphism with mutable references. The
 * helper lives in this file (rather than `infer-bindings.ts`) so that the
 * let-binding helpers can call it without participating in the
 * `infer-bindings → patterns → infer/index` module-init cycle.
 */
export function generalize(ctx: InferenceContext, type: Type, expr: CoreExpr): TypeScheme {
    const finalType = applySubst(ctx.subst, type);
    const freeVarsSet = freeTypeVarsAtLevel(finalType, ctx.level);
    const freeVars = Array.from(freeVarsSet);
    if (isSyntacticValue(expr)) {
        return { vars: freeVars, type: finalType };
    }
    return { vars: [], type: finalType };
}

/**
 * Apply a substitution to a type scheme, leaving the scheme's bound
 * variables alone. Bound variables are universally quantified; free
 * type vars in the scheme's body are subject to the substitution.
 */
function applySubstToScheme(subst: Substitution, scheme: TypeScheme): TypeScheme {
    if (scheme.vars.length === 0) {
        return { vars: [], type: applySubst(subst, scheme.type) };
    }
    const filtered = new Map(subst);
    for (const v of scheme.vars) {
        filtered.delete(v);
    }
    return { vars: scheme.vars, type: applySubst(filtered, scheme.type) };
}

/**
 * Apply a substitution to every binding in a value environment so type
 * constraints learned during one top-level declaration's inference
 * propagate to subsequent declarations.
 */
function applySubstToValues(subst: Substitution, values: Map<string, ValueBinding>): Map<string, ValueBinding> {
    if (subst.size === 0) {
        // Always return a fresh map: the caller `.set(...)`s on the result
        // and a shared map would mutate the previous environment in place,
        // violating the no-mutate-TypeEnv invariant.
        return new Map(values);
    }
    const out = new Map<string, ValueBinding>();
    for (const [name, binding] of values) {
        if (binding.kind === "Value") {
            out.set(name, { ...binding, scheme: applySubstToScheme(subst, binding.scheme) });
        } else if (binding.kind === "External") {
            out.set(name, { ...binding, scheme: applySubstToScheme(subst, binding.scheme) });
        } else {
            // ExternalOverload schemes are stored as TypeExpr (raw AST), not Type;
            // they can't carry inference-time substitutions.
            out.set(name, binding);
        }
    }
    return out;
}

/**
 * Enforce that a `let mut` binding's RHS has a `Ref<T>` type.
 *
 * No-op for non-mutable bindings. For mutable bindings, unifies the
 * inferred type against `Ref<fresh@level>` and re-throws unification
 * failures as VF4018 at the RHS location.
 *
 * @returns the updated substitution (composed onto the input subst).
 */
export function enforceMutableRefBinding(opts: {
    binding: { mutable: boolean; value: { loc: Location } };
    inferredType: Type;
    subst: Substitution;
    level: number;
    types: TypeEnv["types"];
}): Substitution {
    const { binding, inferredType, subst, level, types } = opts;
    if (!binding.mutable) {
        return subst;
    }
    const elemTypeVar = freshTypeVar(level);
    const expectedRefType = appType(constType("Ref"), [elemTypeVar]);
    const valueType = applySubst(subst, inferredType);
    try {
        const refUnifySubst = unify(valueType, expectedRefType, {
            loc: binding.value.loc,
            types,
        });
        return composeSubst(refUnifySubst, subst);
    } catch (err) {
        if (err instanceof VibefunDiagnostic) {
            throwDiagnostic("VF4018", binding.value.loc, {});
        }
        throw err;
    }
}

/**
 * Decide the scheme for a single binding.
 *
 * Returns a non-generalised scheme when:
 * - the binding is `mutable` (would re-open the polymorphic-ref hole), or
 * - the pattern is not `CoreVarPattern` (let-polymorphism is reserved for
 *   simple variable bindings; destructuring patterns inherit the value
 *   restriction by analogy with `inferLet`'s body-env construction).
 *
 * Otherwise calls `generalize`, which still applies the value restriction
 * via `isSyntacticValue` internally.
 */
export function computeBindingScheme(opts: {
    binding: { mutable: boolean; value: CoreExpr; pattern: { kind: string } };
    inferredType: Type;
    subst: Substitution;
    level: number;
    env: TypeEnv;
}): TypeScheme {
    const { binding, inferredType, subst, level, env } = opts;
    const appliedType = applySubst(subst, inferredType);
    const skipGeneralize = binding.mutable || binding.pattern.kind !== "CoreVarPattern";
    if (skipGeneralize) {
        return { vars: [], type: appliedType };
    }
    const ctx: InferenceContext = { env, subst, level, inUnsafe: false };
    return generalize(ctx, appliedType, binding.value);
}

/**
 * Propagate a substitution across all prior top-level declarations.
 *
 * Folds `subst` through every `declarationTypes` entry in place and
 * returns a new `TypeEnv` with `subst` baked into every existing
 * `env.values` scheme. Both must happen together: missing the
 * `declarationTypes` half causes `--emit typed-ast` to show stale
 * types; missing the `env.values` half causes later declarations to
 * read the un-narrowed scheme.
 *
 * @returns a new `TypeEnv` with the substitution applied to every value
 * scheme. The input `declarationTypes` map is mutated in place.
 */
export function propagateSubstAcrossDeclarations(opts: {
    subst: Substitution;
    declarationTypes: Map<string, Type>;
    env: TypeEnv;
}): TypeEnv {
    const { subst, declarationTypes, env } = opts;
    for (const [name, type] of declarationTypes) {
        declarationTypes.set(name, applySubst(subst, type));
    }
    return {
        values: applySubstToValues(subst, env.values),
        types: env.types,
    };
}
