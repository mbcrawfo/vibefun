/**
 * fast-check arbitraries for the typechecker's `Type`, `TypeScheme`, `TypeEnv`,
 * `Substitution`, and `Constraint` shapes.
 *
 * These generators are tuned for property-based testing of unification,
 * substitution, generalization, and constraint solving. The generated `Type`
 * tree avoids `Module` and nominal `Variant` (those unify by path / name and
 * therefore degenerate trivially under random generation), and keeps the
 * generated type-variable ID range small (0..MAX_VAR_ID) so different
 * generated values share variables often enough to exercise unification
 * non-trivially.
 *
 * Depth is capped to keep generation bounded. The `App` constructor is
 * restricted to a small set of well-known names so two generated `App`s
 * have a realistic chance of having matching constructors.
 */

import type { Constraint, EqualityConstraint, InstanceConstraint } from "../../typechecker/constraints.js";
import type { Substitution } from "../../typechecker/unify.js";
import type { Type, TypeBinding, TypeEnv, TypeScheme, ValueBinding } from "../environment.js";

import * as fc from "fast-check";

const SYNTHETIC_LOCATION = { file: "<arb>", line: 1, column: 1, offset: 0 } as const;

/**
 * Maximum type-variable ID used by `typeArb` and `typeSubstitutionArb`. Keeping
 * this small (<= 8) ensures generated Substitutions and Types share variables
 * frequently enough for `apply` / `compose` properties to exercise non-trivial
 * paths through the substitution code.
 */
export const MAX_VAR_ID = 7;

/** Primitive type names recognized by the typechecker. */
export const PRIMITIVE_TYPE_NAMES = ["Int", "Float", "String", "Bool", "Unit"] as const;

/**
 * Type-application constructors paired with their fixed arities.
 *
 * Generating `List<a, b>` or `Ref<a, b>` would produce ill-formed types that
 * unification rejects on grounds unrelated to the property under test, so we
 * pin each constructor's argument count.
 *
 * Includes `Ref` — references in the typechecker are represented as
 * `App<Const("Ref"), [inner]>` (see `refType()` in `typechecker/types.ts`),
 * not as the bare `Ref` discriminant on the `Type` union. The bare discriminant
 * exists for completeness but `unify` does not handle it directly, so
 * generators must use the `App` form.
 */
const APP_CONSTRUCTORS = [
    { name: "List", arity: 1 },
    { name: "Option", arity: 1 },
    { name: "Result", arity: 2 },
    { name: "Box", arity: 1 },
    { name: "Map", arity: 2 },
    { name: "Ref", arity: 1 },
] as const;

/** Record field name pool. Small so different records collide. */
const FIELD_NAME_POOL = ["x", "y", "z", "name", "value", "left", "right"] as const;

/**
 * Options for `typeArb`.
 */
export interface TypeArbOptions {
    /** Maximum recursion depth (default 3). */
    readonly depth?: number;
    /**
     * Type-variable level used for generated `Var` nodes. Defaults to 0.
     * Tests that exercise level-based generalization should override this.
     */
    readonly level?: number;
    /**
     * Maximum type-variable ID. Defaults to `MAX_VAR_ID`. Lowering this
     * increases the chance of variable reuse across generated values.
     */
    readonly maxVarId?: number;
    /**
     * If true, restrict to types that contain no type variables. Useful for
     * properties that require ground types.
     */
    readonly groundOnly?: boolean;
}

const DEFAULT_DEPTH = 3;

/**
 * Build an arbitrary `Type` constrained by recursion depth and var-ID range.
 *
 * Generated shape distribution favors leaves (variables and primitives) so
 * deeper recursion levels still terminate quickly.
 */
export function typeArb(options: TypeArbOptions = {}): fc.Arbitrary<Type> {
    const depth = options.depth ?? DEFAULT_DEPTH;
    const level = options.level ?? 0;
    const maxVarId = options.maxVarId ?? MAX_VAR_ID;
    const groundOnly = options.groundOnly ?? false;

    const leafBranches: Array<fc.Arbitrary<Type>> = [primitiveTypeArb()];
    if (!groundOnly) {
        leafBranches.push(typeVarArb(maxVarId, level));
    }
    const leaf = fc.oneof(...leafBranches);

    function build(d: number): fc.Arbitrary<Type> {
        if (d <= 1) {
            return leaf;
        }
        const sub = build(d - 1);
        return fc.oneof(
            { weight: 4, arbitrary: leaf },
            {
                weight: 2,
                arbitrary: fc
                    .tuple(fc.array(sub, { minLength: 0, maxLength: 3 }), sub)
                    .map(([params, ret]): Type => ({ type: "Fun", params, return: ret })),
            },
            {
                weight: 2,
                arbitrary: fc.constantFrom(...APP_CONSTRUCTORS).chain(({ name, arity }) =>
                    fc.array(sub, { minLength: arity, maxLength: arity }).map(
                        (args): Type => ({
                            type: "App",
                            constructor: { type: "Const", name },
                            args,
                        }),
                    ),
                ),
            },
            {
                weight: 1,
                arbitrary: fc
                    .array(sub, { minLength: 2, maxLength: 3 })
                    .map((elements): Type => ({ type: "Tuple", elements })),
            },
            {
                weight: 1,
                arbitrary: recordTypeArb(sub).map((fields): Type => ({ type: "Record", fields })),
            },
        );
    }

    return build(depth);
}

function typeVarArb(maxVarId: number, level: number): fc.Arbitrary<Type> {
    return fc.integer({ min: 0, max: maxVarId }).map((id): Type => ({ type: "Var", id, level }));
}

function primitiveTypeArb(): fc.Arbitrary<Type> {
    return fc.constantFrom(...PRIMITIVE_TYPE_NAMES).map((name): Type => ({ type: "Const", name }));
}

function recordTypeArb(sub: fc.Arbitrary<Type>): fc.Arbitrary<Map<string, Type>> {
    return fc
        .uniqueArray(fc.tuple(fc.constantFrom(...FIELD_NAME_POOL), sub), {
            minLength: 1,
            maxLength: 3,
            selector: (entry) => entry[0],
        })
        .map((entries) => new Map(entries));
}

/**
 * Arbitrary for a `Type` containing only primitives and constructed types
 * (no `Var`). Useful for properties that require ground types — for example
 * the soundness check `apply(σ, a) ≡ apply(σ, b)` where `σ = unify(a, b)`.
 */
export const groundTypeArb: fc.Arbitrary<Type> = typeArb({ groundOnly: true, depth: 3 });

/**
 * Options for `typeSchemeArb`.
 */
export interface TypeSchemeArbOptions extends TypeArbOptions {
    /**
     * Maximum number of variables to quantify. Quantified variables are
     * drawn from the free vars of the generated body type.
     */
    readonly maxBoundVars?: number;
}

/**
 * Arbitrary for a `TypeScheme` (`forall α₁..αₙ. T`).
 *
 * The body type is generated first; quantified variables are then chosen
 * from its free type variables so the scheme is meaningful (no spurious
 * `forall` over variables that don't appear in the body).
 */
export function typeSchemeArb(options: TypeSchemeArbOptions = {}): fc.Arbitrary<TypeScheme> {
    return typeArb(options).chain((type) => {
        const free = freeVarsOfType(type);
        const freeArr = Array.from(free).sort((a, b) => a - b);
        const cap = Math.min(options.maxBoundVars ?? freeArr.length, freeArr.length);
        if (cap === 0) {
            return fc.constant({ vars: [], type } satisfies TypeScheme);
        }
        return fc
            .uniqueArray(fc.constantFrom(...freeArr), { minLength: 0, maxLength: cap })
            .map((vars) => ({ vars, type }) satisfies TypeScheme);
    });
}

/**
 * Arbitrary for a type-level `Substitution` (`Map<number, Type>`). Named with
 * the `type` prefix to disambiguate from PR 4's expression-level
 * `substitutionArb` (`Map<string, CoreExpr>`) re-exported from the same
 * barrel — they are semantically distinct: this one feeds `applySubst` /
 * `composeSubst` in `typechecker/unify.ts`, the other feeds `substitute` in
 * `utils/substitution.ts`.
 *
 * Keys are drawn from `[0, maxVarId]` and values default to ground types
 * (no variables) so applying the substitution always reduces the variable
 * count, keeping idempotence tests well-founded.
 */
export interface TypeSubstitutionArbOptions {
    readonly maxVarId?: number;
    readonly maxSize?: number;
    /**
     * If true (default), substitution range is restricted to ground types so
     * applying the substitution is monotone — applying it cannot reintroduce
     * a variable that the substitution itself rewrites. Tests of properties
     * that depend on idempotence should keep this on.
     */
    readonly groundRange?: boolean;
}

export function typeSubstitutionArb(options: TypeSubstitutionArbOptions = {}): fc.Arbitrary<Substitution> {
    const maxVarId = options.maxVarId ?? MAX_VAR_ID;
    const maxSize = options.maxSize ?? 4;
    const groundRange = options.groundRange ?? true;
    const valueArb = groundRange ? groundTypeArb : typeArb({ depth: 2 });
    return fc
        .uniqueArray(fc.tuple(fc.integer({ min: 0, max: maxVarId }), valueArb), {
            minLength: 0,
            maxLength: maxSize,
            selector: (entry) => entry[0],
        })
        .map((entries) => new Map<number, Type>(entries));
}

/**
 * Arbitrary for an `EqualityConstraint`.
 */
export const equalityConstraintArb: fc.Arbitrary<EqualityConstraint> = fc
    .tuple(typeArb(), typeArb())
    .map(([t1, t2]) => ({
        kind: "Equality" as const,
        t1,
        t2,
        loc: SYNTHETIC_LOCATION,
    }));

/**
 * Arbitrary for an `InstanceConstraint`.
 */
export const instanceConstraintArb: fc.Arbitrary<InstanceConstraint> = fc
    .tuple(typeSchemeArb(), typeArb())
    .map(([scheme, type]) => ({
        kind: "Instance" as const,
        scheme,
        type,
        loc: SYNTHETIC_LOCATION,
    }));

/**
 * Arbitrary for a `Constraint` (equality or instance).
 */
export const constraintArb: fc.Arbitrary<Constraint> = fc.oneof(equalityConstraintArb, instanceConstraintArb);

/**
 * Options for `typeEnvArb`.
 */
export interface TypeEnvArbOptions {
    readonly size?: number;
    readonly maxVarId?: number;
}

/**
 * Arbitrary for a `TypeEnv` containing several `Value` bindings. The
 * environment never contains `External` / `ExternalOverload` bindings —
 * those carry surface-AST `TypeExpr` nodes that aren't worth generating
 * for the property scenarios in scope.
 */
export function typeEnvArb(options: TypeEnvArbOptions = {}): fc.Arbitrary<TypeEnv> {
    const size = options.size ?? 3;
    const schemeOpts: TypeSchemeArbOptions = options.maxVarId === undefined ? {} : { maxVarId: options.maxVarId };
    return fc
        .uniqueArray(fc.tuple(envBindingNameArb(), typeSchemeArb(schemeOpts)), {
            minLength: 0,
            maxLength: size,
            selector: (entry) => entry[0],
        })
        .map((entries) => {
            const values = new Map<string, ValueBinding>();
            for (const [name, scheme] of entries) {
                values.set(name, {
                    kind: "Value",
                    scheme,
                    loc: SYNTHETIC_LOCATION,
                });
            }
            const types = new Map<string, TypeBinding>();
            return { values, types } satisfies TypeEnv;
        });
}

const ENV_BINDING_NAME_POOL = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

function envBindingNameArb(): fc.Arbitrary<string> {
    return fc.constantFrom(...ENV_BINDING_NAME_POOL);
}

// =============================================================================
// Helpers reused by tests
// =============================================================================

/**
 * Compute the set of free type-variable IDs in a `Type`. This duplicates the
 * production `freeTypeVars` to avoid a circular dependency between the
 * `types/` package and the `typechecker/` package — keeping this file
 * self-contained means it can be imported anywhere without pulling in the
 * type-checker module graph.
 */
export function freeVarsOfType(type: Type): Set<number> {
    const out = new Set<number>();
    const stack: Type[] = [type];
    while (stack.length > 0) {
        const t = stack.pop();
        if (!t) {
            continue;
        }
        switch (t.type) {
            case "Var":
                out.add(t.id);
                break;
            case "Const":
            case "Never":
            case "StringLit":
            case "Module":
                break;
            case "Fun":
                stack.push(...t.params, t.return);
                break;
            case "App":
                stack.push(t.constructor, ...t.args);
                break;
            case "Record":
                t.fields.forEach((v) => stack.push(v));
                break;
            case "Variant":
                t.constructors.forEach((vs) => stack.push(...vs));
                break;
            case "Union":
                stack.push(...t.types);
                break;
            case "Tuple":
                stack.push(...t.elements);
                break;
            case "Ref":
                stack.push(t.inner);
                break;
        }
    }
    return out;
}

/**
 * Test whether two types are α-equivalent under a renaming of type variables.
 *
 * Two types are α-equivalent if there is a bijection between their type
 * variable IDs that makes them structurally equal. Used by generalization /
 * instantiation round-trip properties where instantiation freshens variable
 * IDs but should preserve type structure.
 *
 * Returns false on any mismatch in shape, constructor name, arity, or
 * field/constructor sets. Records and variants compare by sorted-key
 * structure; ordering of `Tuple`, `Fun.params`, and `App.args` is positional.
 */
export function alphaEquivalent(a: Type, b: Type): boolean {
    const forward = new Map<number, number>();
    const backward = new Map<number, number>();

    function go(x: Type, y: Type): boolean {
        if (x.type !== y.type) {
            return false;
        }
        switch (x.type) {
            case "Var": {
                const yv = y as Type & { type: "Var" };
                const mapped = forward.get(x.id);
                const reverseMapped = backward.get(yv.id);
                if (mapped === undefined && reverseMapped === undefined) {
                    forward.set(x.id, yv.id);
                    backward.set(yv.id, x.id);
                    return true;
                }
                return mapped === yv.id && reverseMapped === x.id;
            }
            case "Const":
                return x.name === (y as Type & { type: "Const" }).name;
            case "Fun": {
                const yf = y as Type & { type: "Fun" };
                if (x.params.length !== yf.params.length) {
                    return false;
                }
                for (let i = 0; i < x.params.length; i++) {
                    const xp = x.params[i];
                    const yp = yf.params[i];
                    if (!xp || !yp || !go(xp, yp)) {
                        return false;
                    }
                }
                return go(x.return, yf.return);
            }
            case "App": {
                const ya = y as Type & { type: "App" };
                if (x.args.length !== ya.args.length) {
                    return false;
                }
                if (!go(x.constructor, ya.constructor)) {
                    return false;
                }
                for (let i = 0; i < x.args.length; i++) {
                    const xa = x.args[i];
                    const yaa = ya.args[i];
                    if (!xa || !yaa || !go(xa, yaa)) {
                        return false;
                    }
                }
                return true;
            }
            case "Record": {
                const yr = y as Type & { type: "Record" };
                if (x.fields.size !== yr.fields.size) {
                    return false;
                }
                for (const [name, ft] of x.fields) {
                    const other = yr.fields.get(name);
                    if (!other || !go(ft, other)) {
                        return false;
                    }
                }
                return true;
            }
            case "Variant": {
                const yv = y as Type & { type: "Variant" };
                if (x.constructors.size !== yv.constructors.size) {
                    return false;
                }
                for (const [name, params] of x.constructors) {
                    const otherParams = yv.constructors.get(name);
                    if (!otherParams || params.length !== otherParams.length) {
                        return false;
                    }
                    for (let i = 0; i < params.length; i++) {
                        const xp = params[i];
                        const yp = otherParams[i];
                        if (!xp || !yp || !go(xp, yp)) {
                            return false;
                        }
                    }
                }
                return true;
            }
            case "Union": {
                const yu = y as Type & { type: "Union" };
                if (x.types.length !== yu.types.length) {
                    return false;
                }
                for (let i = 0; i < x.types.length; i++) {
                    const xt = x.types[i];
                    const yt = yu.types[i];
                    if (!xt || !yt || !go(xt, yt)) {
                        return false;
                    }
                }
                return true;
            }
            case "Tuple": {
                const yt = y as Type & { type: "Tuple" };
                if (x.elements.length !== yt.elements.length) {
                    return false;
                }
                for (let i = 0; i < x.elements.length; i++) {
                    const xe = x.elements[i];
                    const ye = yt.elements[i];
                    if (!xe || !ye || !go(xe, ye)) {
                        return false;
                    }
                }
                return true;
            }
            case "Ref":
                return go(x.inner, (y as Type & { type: "Ref" }).inner);
            case "Module":
                return x.path === (y as Type & { type: "Module" }).path;
            case "Never":
                return true;
            case "StringLit":
                return x.value === (y as Type & { type: "StringLit" }).value;
        }
    }

    return go(a, b);
}
