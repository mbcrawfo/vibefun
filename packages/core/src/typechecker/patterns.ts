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
    CoreVariantPattern,
    CoreVarPattern,
    CoreWildcardPattern,
} from "../types/core-ast.js";
import type { Type, TypeEnv } from "../types/environment.js";
import type { Substitution } from "./unify.js";

import { instantiate } from "./infer/index.js";
import { primitiveTypes } from "./types.js";
import { applySubst, composeSubst, unify } from "./unify.js";

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
 * @returns Pattern check result with type, bindings, and updated substitution
 */
export function checkPattern(
    env: TypeEnv,
    pattern: CorePattern,
    expectedType: Type,
    subst: Substitution,
    level: number,
): PatternCheckResult {
    switch (pattern.kind) {
        case "CoreWildcardPattern":
            return checkWildcardPattern(pattern, expectedType, subst);

        case "CoreVarPattern":
            return checkVarPattern(pattern, expectedType, subst);

        case "CoreLiteralPattern":
            return checkLiteralPattern(pattern, expectedType, subst);

        case "CoreVariantPattern":
            return checkVariantPattern(env, pattern, expectedType, subst, level);

        case "CoreRecordPattern":
            return checkRecordPattern(env, pattern, expectedType, subst, level);

        case "CoreTuplePattern":
            // Placeholder: Tuple pattern type checking not yet implemented
            // For now, return stub result to allow compilation
            return {
                type: expectedType,
                bindings: new Map(),
                subst,
            };

        default: {
            const _exhaustive: never = pattern;
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
function checkLiteralPattern(pattern: CoreLiteralPattern, expectedType: Type, subst: Substitution): PatternCheckResult {
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
                        throw new Error(`Unknown literal type: ${typeof pattern.literal}`);
                    })();

    // Unify literal type with expected type
    const unifySubst = unify(literalType, applySubst(subst, expectedType));
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
): PatternCheckResult {
    // Look up constructor in environment
    const binding = env.values.get(pattern.constructor);
    if (!binding) {
        throw new Error(`Undefined constructor: ${pattern.constructor}`);
    }

    if (binding.kind !== "Value" && binding.kind !== "External") {
        throw new Error(`${pattern.constructor} is not a value binding`);
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
            throw new Error(`Constructor ${pattern.constructor} expects no arguments, got ${pattern.args.length}`);
        }

        // Unify constructor type with expected type
        const unifySubst = unify(constructorType, applySubst(subst, expectedType));
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
        throw new Error(
            `Constructor ${pattern.constructor} expects ${funType.params.length} arguments, got ${pattern.args.length}`,
        );
    }

    // Unify return type with expected type to get type variable bindings
    let currentSubst = subst;
    const returnUnifySubst = unify(applySubst(currentSubst, funType.return), applySubst(currentSubst, expectedType));
    currentSubst = composeSubst(returnUnifySubst, currentSubst);

    // Check each argument pattern against parameter type
    const allBindings = new Map<string, Type>();

    for (let i = 0; i < pattern.args.length; i++) {
        const argPattern = pattern.args[i];
        const paramType = funType.params[i];

        if (!argPattern || !paramType) {
            throw new Error(`Missing argument pattern or parameter type at index ${i}`);
        }

        const argResult = checkPattern(env, argPattern, applySubst(currentSubst, paramType), currentSubst, level);
        currentSubst = argResult.subst;

        // Collect bindings from argument patterns
        for (const [name, type] of argResult.bindings) {
            if (allBindings.has(name)) {
                throw new Error(`Duplicate pattern variable: ${name}`);
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
): PatternCheckResult {
    // Expected type should be a record
    const appliedExpected = applySubst(subst, expectedType);

    if (appliedExpected.type !== "Record") {
        throw new Error(
            `Pattern expects record type, but got ${appliedExpected.type === "Var" ? "type variable" : appliedExpected.type}`,
        );
    }

    const recordType = appliedExpected;
    let currentSubst = subst;
    const allBindings = new Map<string, Type>();

    // Check each field pattern
    for (const field of pattern.fields) {
        const fieldType = recordType.fields.get(field.name);
        if (!fieldType) {
            throw new Error(`Field ${field.name} not found in record type`);
        }

        const fieldResult = checkPattern(env, field.pattern, fieldType, currentSubst, level);
        currentSubst = fieldResult.subst;

        // Collect bindings from field patterns
        for (const [name, type] of fieldResult.bindings) {
            if (allBindings.has(name)) {
                throw new Error(`Duplicate pattern variable: ${name}`);
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
 * Check if patterns are exhaustive for a given type
 *
 * @param env - Type environment
 * @param patterns - List of patterns to check
 * @param scrutineeType - Type being matched on
 * @returns Missing constructors (empty array if exhaustive)
 */
export function checkExhaustiveness(env: TypeEnv, patterns: CorePattern[], scrutineeType: Type): string[] {
    // If any pattern is wildcard or variable, it's exhaustive
    const hasWildcard = patterns.some((p) => p.kind === "CoreWildcardPattern" || p.kind === "CoreVarPattern");
    if (hasWildcard) {
        return [];
    }

    // For variant types (App types like List<T>, Option<T>), check constructor coverage
    if (scrutineeType.type === "App") {
        // Get the type constructor name
        const constructorType = scrutineeType.constructor;
        if (constructorType.type === "Const") {
            // Get all constructors for this type
            const constructors = getConstructorsForType(env, constructorType.name);

            // Get constructors covered by patterns
            const coveredConstructors = new Set<string>();
            for (const pattern of patterns) {
                if (pattern.kind === "CoreVariantPattern") {
                    coveredConstructors.add(pattern.constructor);
                }
            }

            // Find missing constructors
            const missing: string[] = [];
            for (const ctor of constructors) {
                if (!coveredConstructors.has(ctor.name)) {
                    missing.push(ctor.name);
                }
            }

            return missing;
        }
    }

    // For literal types, we can't easily check exhaustiveness
    // (would need to enumerate all possible values)
    // So we're conservative and require a wildcard/variable pattern
    const hasLiterals = patterns.some((p) => p.kind === "CoreLiteralPattern");
    if (hasLiterals) {
        // Non-exhaustive unless there's a catch-all
        return ["<other values>"];
    }

    // For records, patterns are exhaustive (record pattern always matches)
    const hasRecords = patterns.some((p) => p.kind === "CoreRecordPattern");
    if (hasRecords) {
        return [];
    }

    // Default: not exhaustive
    return ["<uncovered cases>"];
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

        // Check if return type matches the scrutinee type
        // For App types like List<T>, Option<T>, the constructor should be Const with matching name
        if (returnType.type === "App") {
            const constructor = returnType.constructor;
            if (constructor.type === "Const" && constructor.name === typeName) {
                const arity = scheme.type.type === "Fun" ? scheme.type.params.length : 0;
                constructors.push({ name, arity });
            }
        }
    }

    return constructors;
}
