/**
 * Pattern type checking and exhaustiveness analysis
 *
 * This module implements pattern matching type checking, including:
 * - Pattern type inference with variable binding
 * - Exhaustiveness checking for match expressions
 * - Constructor coverage analysis
 */

import type {
    CoreLiteralPattern,
    CorePattern,
    CoreRecordPattern,
    CoreTuplePattern,
    CoreVariantPattern,
    CoreVarPattern,
    CoreWildcardPattern,
} from "../types/core-ast.js";
import type { Type, TypeEnv } from "../types/environment.js";
import type { Substitution, UnifyContext } from "./unify.js";

import { throwDiagnostic } from "../diagnostics/index.js";
import { typeToString } from "./format.js";
import { instantiate } from "./infer/index.js";
import { freshTypeVar, primitiveTypes, tupleType } from "./types.js";
import { applySubst, composeSubst, expandTypeAlias, unify } from "./unify.js";

/**
 * Result of pattern type checking
 */
export type PatternCheckResult = {
    /** The type that the pattern matches */
    type: Type;
    /** Variable bindings introduced by the pattern */
    bindings: Map<string, Type>;
    /** Substitution generated during pattern checking */
    subst: Substitution;
};

/**
 * Check a pattern against an expected type and collect variable bindings
 *
 * @param env - Type environment
 * @param pattern - Pattern to check
 * @param expectedType - Type the pattern is expected to match
 * @param subst - Current substitution
 * @param level - Current type variable level for instantiation
 * @param ctx - Unification context for error reporting
 * @returns Pattern check result with type, bindings, and updated substitution
 */
export function checkPattern(
    env: TypeEnv,
    pattern: CorePattern,
    expectedType: Type,
    subst: Substitution,
    level: number,
    ctx?: UnifyContext,
): PatternCheckResult {
    // Always thread env.types through so user-defined aliases expand during
    // unification, regardless of whether the caller supplied its own context.
    const effectiveCtx: UnifyContext = ctx
        ? { ...ctx, types: ctx.types ?? env.types }
        : { loc: pattern.loc, types: env.types };

    switch (pattern.kind) {
        case "CoreWildcardPattern":
            return checkWildcardPattern(pattern, expectedType, subst);

        case "CoreVarPattern":
            return checkVarPattern(pattern, expectedType, subst);

        case "CoreLiteralPattern":
            return checkLiteralPattern(pattern, expectedType, subst, effectiveCtx);

        case "CoreVariantPattern":
            return checkVariantPattern(env, pattern, expectedType, subst, level, effectiveCtx);

        case "CoreRecordPattern":
            return checkRecordPattern(env, pattern, expectedType, subst, level, effectiveCtx);

        case "CoreTuplePattern":
            return checkTuplePattern(env, pattern, expectedType, subst, level, effectiveCtx);

        default: {
            const _exhaustive: never = pattern;
            // Internal error - keep as plain Error
            throw new Error(`Unknown pattern kind: ${(_exhaustive as CorePattern).kind}`);
        }
    }
}

/**
 * Check wildcard pattern (_)
 * Matches any type, introduces no bindings
 */
function checkWildcardPattern(
    _pattern: CoreWildcardPattern,
    expectedType: Type,
    subst: Substitution,
): PatternCheckResult {
    return {
        type: expectedType,
        bindings: new Map(),
        subst,
    };
}

/**
 * Check variable pattern (x)
 * Matches any type, binds the variable to that type
 */
function checkVarPattern(pattern: CoreVarPattern, expectedType: Type, subst: Substitution): PatternCheckResult {
    const bindings = new Map<string, Type>();
    bindings.set(pattern.name, expectedType);

    return {
        type: expectedType,
        bindings,
        subst,
    };
}

/**
 * Check literal pattern (42, "hello", true, false, ())
 * Matches exact literal value
 */
function checkLiteralPattern(
    pattern: CoreLiteralPattern,
    expectedType: Type,
    subst: Substitution,
    ctx: UnifyContext,
): PatternCheckResult {
    // Determine literal type
    const literalType: Type =
        typeof pattern.literal === "number"
            ? Number.isInteger(pattern.literal)
                ? primitiveTypes.Int
                : primitiveTypes.Float
            : typeof pattern.literal === "string"
              ? primitiveTypes.String
              : typeof pattern.literal === "boolean"
                ? primitiveTypes.Bool
                : pattern.literal === null
                  ? primitiveTypes.Unit
                  : (() => {
                        // Internal error - keep as plain Error
                        throw new Error(`Unknown literal type: ${typeof pattern.literal}`);
                    })();

    // Unify literal type with expected type
    const unifySubst = unify(literalType, applySubst(subst, expectedType), ctx);
    const newSubst = composeSubst(unifySubst, subst);

    return {
        type: applySubst(newSubst, expectedType),
        bindings: new Map(),
        subst: newSubst,
    };
}

/**
 * Check variant pattern (Some(x), Cons(h, t), None, etc.)
 * Matches variant constructors and recursively checks arguments
 */
function checkVariantPattern(
    env: TypeEnv,
    pattern: CoreVariantPattern,
    expectedType: Type,
    subst: Substitution,
    level: number,
    ctx: UnifyContext,
): PatternCheckResult {
    // Look up constructor in environment
    const binding = env.values.get(pattern.constructor);
    if (!binding) {
        throwDiagnostic("VF4102", pattern.loc, { name: pattern.constructor });
    }

    if (binding.kind !== "Value" && binding.kind !== "External") {
        throwDiagnostic("VF4600", pattern.loc, {
            name: pattern.constructor,
            constructors: "Expected constructor, got type binding",
        });
    }

    // Get constructor type scheme and instantiate it with fresh type variables
    const scheme = binding.scheme;

    // For patterns, we need to check if constructor type matches expected type
    // Instantiate the type scheme (we'll get fresh type variables)
    // Then unify the result type with expected type

    // Instantiate the type scheme with fresh type variables
    const constructorType: Type = instantiate(scheme, level);

    // If nullary constructor (None, Nil)
    if (constructorType.type !== "Fun") {
        if (pattern.args.length > 0) {
            throwDiagnostic("VF4200", pattern.loc, {
                name: pattern.constructor,
                expected: 0,
                actual: pattern.args.length,
            });
        }

        // Unify constructor type with expected type
        const unifySubst = unify(constructorType, applySubst(subst, expectedType), ctx);
        const newSubst = composeSubst(unifySubst, subst);

        return {
            type: applySubst(newSubst, expectedType),
            bindings: new Map(),
            subst: newSubst,
        };
    }

    // Function constructor (Some, Cons, etc.)
    const funType = constructorType;

    // Verify argument count
    if (pattern.args.length !== funType.params.length) {
        throwDiagnostic("VF4200", pattern.loc, {
            name: pattern.constructor,
            expected: funType.params.length,
            actual: pattern.args.length,
        });
    }

    // Unify return type with expected type to get type variable bindings
    let currentSubst = subst;
    const returnUnifySubst = unify(
        applySubst(currentSubst, funType.return),
        applySubst(currentSubst, expectedType),
        ctx,
    );
    currentSubst = composeSubst(returnUnifySubst, currentSubst);

    // Check each argument pattern against parameter type
    const allBindings = new Map<string, Type>();

    for (let i = 0; i < pattern.args.length; i++) {
        const argPattern = pattern.args[i];
        const paramType = funType.params[i];

        if (!argPattern || !paramType) {
            // Internal error - should never happen
            throw new Error(`Missing argument pattern or parameter type at index ${i}`);
        }

        const argCtx: UnifyContext = { loc: argPattern.loc, types: env.types };
        const argResult = checkPattern(
            env,
            argPattern,
            applySubst(currentSubst, paramType),
            currentSubst,
            level,
            argCtx,
        );
        currentSubst = argResult.subst;

        // Collect bindings from argument patterns
        for (const [name, type] of argResult.bindings) {
            if (allBindings.has(name)) {
                throwDiagnostic("VF4402", argPattern.loc, { name });
            }
            allBindings.set(name, type);
        }
    }

    return {
        type: applySubst(currentSubst, expectedType),
        bindings: allBindings,
        subst: currentSubst,
    };
}

/**
 * Check record pattern { x, y: z }
 * Matches record types and recursively checks field patterns
 */
function checkRecordPattern(
    env: TypeEnv,
    pattern: CoreRecordPattern,
    expectedType: Type,
    subst: Substitution,
    level: number,
    _ctx: UnifyContext,
): PatternCheckResult {
    // Expected type should be a record
    const appliedExpected = applySubst(subst, expectedType);

    if (appliedExpected.type !== "Record") {
        throwDiagnostic("VF4500", pattern.loc, {
            actual: appliedExpected.type === "Var" ? "type variable" : typeToString(appliedExpected),
        });
    }

    const recordType = appliedExpected;
    let currentSubst = subst;
    const allBindings = new Map<string, Type>();

    // Check each field pattern
    for (const field of pattern.fields) {
        const fieldType = recordType.fields.get(field.name);
        if (!fieldType) {
            const availableFields = Array.from(recordType.fields.keys()).join(", ");
            throwDiagnostic("VF4501", field.pattern.loc, {
                field: field.name,
                availableFields: availableFields || "(none)",
            });
        }

        const fieldCtx: UnifyContext = { loc: field.pattern.loc };
        const fieldResult = checkPattern(env, field.pattern, fieldType, currentSubst, level, fieldCtx);
        currentSubst = fieldResult.subst;

        // Collect bindings from field patterns
        for (const [name, type] of fieldResult.bindings) {
            if (allBindings.has(name)) {
                throwDiagnostic("VF4402", field.pattern.loc, { name });
            }
            allBindings.set(name, type);
        }
    }

    return {
        type: applySubst(currentSubst, expectedType),
        bindings: allBindings,
        subst: currentSubst,
    };
}

/**
 * Check tuple pattern (x, y), (_, y, _)
 * Unifies with a fresh tuple type of the correct arity, then recurses
 * on each element. Arity mismatches surface via VF4026 from unification.
 */
function checkTuplePattern(
    env: TypeEnv,
    pattern: CoreTuplePattern,
    expectedType: Type,
    subst: Substitution,
    level: number,
    ctx: UnifyContext,
): PatternCheckResult {
    // Build a fresh tuple type skeleton of the correct arity and unify with
    // the expected type. This yields VF4026 on arity mismatch and a general
    // unification diagnostic when the expected type isn't a tuple.
    const freshElements = pattern.elements.map(() => freshTypeVar(level));
    const skeleton = tupleType(freshElements);

    let currentSubst = subst;
    const unifySubst = unify(applySubst(currentSubst, expectedType), skeleton, ctx);
    currentSubst = composeSubst(unifySubst, currentSubst);

    const allBindings = new Map<string, Type>();

    for (let i = 0; i < pattern.elements.length; i++) {
        const elemPattern = pattern.elements[i];
        const elemSkeleton = freshElements[i];

        if (!elemPattern || !elemSkeleton) {
            throw new Error(`Missing tuple element pattern or skeleton at index ${i}`);
        }

        const elemCtx: UnifyContext = { loc: elemPattern.loc, types: env.types };
        const elemResult = checkPattern(
            env,
            elemPattern,
            applySubst(currentSubst, elemSkeleton),
            currentSubst,
            level,
            elemCtx,
        );
        currentSubst = elemResult.subst;

        for (const [name, type] of elemResult.bindings) {
            if (allBindings.has(name)) {
                throwDiagnostic("VF4402", elemPattern.loc, { name });
            }
            allBindings.set(name, type);
        }
    }

    return {
        type: applySubst(currentSubst, expectedType),
        bindings: allBindings,
        subst: currentSubst,
    };
}

/**
 * Constructor information for exhaustiveness checking
 */
type ConstructorInfo = {
    name: string;
    arity: number;
};

/**
 * A match case's pattern plus whether it is protected by a `when` guard.
 * Guarded cases are ignored for exhaustiveness because the guard's runtime
 * outcome is not known statically (per `docs/spec/05-pattern-matching/
 * exhaustiveness.md` §"Guards do not affect exhaustiveness checking").
 */
export type CaseForExhaustiveness = {
    pattern: CorePattern;
    guarded: boolean;
};

/**
 * Check if match cases are exhaustive for a given type
 *
 * @param env - Type environment
 * @param cases - List of cases (pattern + whether guarded) to check
 * @param scrutineeType - Type being matched on
 * @returns Missing constructors (empty array if exhaustive)
 */
export function checkExhaustiveness(env: TypeEnv, cases: CaseForExhaustiveness[], scrutineeType: Type): string[] {
    // Guarded cases can still match at runtime but cannot complete an
    // exhaustiveness proof, so they are dropped before coverage analysis.
    const patterns = cases.filter((c) => !c.guarded).map((c) => c.pattern);

    // If any pattern is wildcard or variable — or a tuple pattern whose
    // every element is itself a catch-all (wildcard/variable/recursive
    // all-catch-all tuple) — it covers every value of the scrutinee.
    const hasWildcard = patterns.some(isCatchAllPattern);
    if (hasWildcard) {
        return [];
    }

    // Expand user-defined aliases before picking a variant name, so that
    // e.g. `type Shade = Color` scrutinees still resolve to Color's
    // constructor set. Without expansion, `variantName` would be "Shade"
    // and `getConstructorsForType` would find nothing.
    const effectiveScrutinee = expandTypeAlias(scrutineeType, env.types);

    // For variant types — both `App<Const, ...>` (generics like List<T>,
    // Option<T>) and bare `Const` (non-generic user types like `Color`) —
    // check constructor coverage against the declared constructor set.
    const variantName =
        effectiveScrutinee.type === "App" && effectiveScrutinee.constructor.type === "Const"
            ? effectiveScrutinee.constructor.name
            : effectiveScrutinee.type === "Const"
              ? effectiveScrutinee.name
              : undefined;

    if (variantName !== undefined) {
        const constructors = getConstructorsForType(env, variantName);
        if (constructors.length > 0) {
            const coveredConstructors = new Set<string>();
            for (const pattern of patterns) {
                if (pattern.kind === "CoreVariantPattern") {
                    coveredConstructors.add(pattern.constructor);
                }
            }
            const missing: string[] = [];
            for (const ctor of constructors) {
                if (!coveredConstructors.has(ctor.name)) {
                    missing.push(ctor.name);
                }
            }
            return missing;
        }
    }

    // For literal types, we can't generally enumerate all values.
    // But Bool has exactly two values (true, false); if both literal
    // patterns are present, the match is exhaustive.
    const hasLiterals = patterns.some((p) => p.kind === "CoreLiteralPattern");
    if (hasLiterals) {
        if (effectiveScrutinee.type === "Const" && effectiveScrutinee.name === "Bool") {
            const covered = new Set<boolean>();
            for (const p of patterns) {
                if (p.kind === "CoreLiteralPattern" && typeof p.literal === "boolean") {
                    covered.add(p.literal);
                }
            }
            const missing: string[] = [];
            if (!covered.has(true)) missing.push("true");
            if (!covered.has(false)) missing.push("false");
            return missing;
        }
        // Non-exhaustive unless there's a catch-all
        return ["<other values>"];
    }

    // For records, patterns are exhaustive (record pattern always matches)
    const hasRecords = patterns.some((p) => p.kind === "CoreRecordPattern");
    if (hasRecords) {
        return [];
    }

    // For tuple scrutinees, pairwise element coverage is out of scope for
    // Phase 5.1 (see Phase 5.2 pattern matching completeness). Require an
    // explicit catch-all — the `isCatchAllPattern` check above already
    // accepts tuple patterns whose elements are all catch-alls, so this
    // branch only fires for tuple matches that still have uncovered values.
    if (effectiveScrutinee.type === "Tuple") {
        const missing = effectiveScrutinee.elements.map(() => "_").join(", ");
        return [`(${missing})`];
    }

    // Default: not exhaustive
    return ["<uncovered cases>"];
}

/**
 * Check that every match arm is reachable.
 *
 * A pattern is unreachable when an earlier **unguarded** catch-all already
 * matches every possible value of the scrutinee, so no later arm can ever
 * run. Per `docs/spec/05-pattern-matching/exhaustiveness.md` §Unreachable
 * Patterns, this is a compile-time error.
 *
 * Throws VF4405 at the first unreachable arm found.
 */
export function checkReachability(cases: CaseForExhaustiveness[]): void {
    let sawCatchAll = false;
    for (const c of cases) {
        if (sawCatchAll) {
            throwDiagnostic("VF4405", c.pattern.loc, {});
        }
        if (!c.guarded && isCatchAllPattern(c.pattern)) {
            sawCatchAll = true;
        }
    }
}

/**
 * A pattern is a "catch-all" (covers every value of its scrutinee type)
 * if it is a wildcard, a variable, or a tuple pattern whose every
 * element is itself a catch-all. Nested or-patterns and literals are
 * intentionally excluded — literals match only specific values.
 */
function isCatchAllPattern(pattern: CorePattern): boolean {
    if (pattern.kind === "CoreWildcardPattern" || pattern.kind === "CoreVarPattern") {
        return true;
    }
    if (pattern.kind === "CoreTuplePattern") {
        return pattern.elements.every(isCatchAllPattern);
    }
    return false;
}

/**
 * Get all constructors for a variant type
 *
 * Constructors are identified by starting with an uppercase letter.
 * Helper functions like List.map or Option.flatMap are excluded.
 */
function getConstructorsForType(env: TypeEnv, typeName: string): ConstructorInfo[] {
    const constructors: ConstructorInfo[] = [];

    // Scan environment for constructors that return this type
    for (const [name, binding] of env.values) {
        if (binding.kind !== "Value" && binding.kind !== "External") {
            continue;
        }

        // Skip helper functions (contain dots or start with lowercase)
        if (name.includes(".") || /^[a-z]/.test(name)) {
            continue;
        }

        const scheme = binding.scheme;
        const returnType = scheme.type.type === "Fun" ? scheme.type.return : scheme.type;

        // Check if return type matches the scrutinee type. Constructors return:
        //   - `App(Const(T), ...)` for generic variants (List<T>, Box<T>, ...)
        //   - `Const(T)` for non-generic variants (user type Color, ...) or
        //     for nullary constructors of non-generic types.
        if (returnType.type === "App") {
            const constructor = returnType.constructor;
            if (constructor.type === "Const" && constructor.name === typeName) {
                const arity = scheme.type.type === "Fun" ? scheme.type.params.length : 0;
                constructors.push({ name, arity });
            }
        } else if (returnType.type === "Const" && returnType.name === typeName) {
            const arity = scheme.type.type === "Fun" ? scheme.type.params.length : 0;
            constructors.push({ name, arity });
        }
    }

    return constructors;
}
