/**
 * Type inference for structural types
 *
 * Handles records, variants, and pattern matching.
 */

import type { CoreExpr } from "../../types/core-ast.js";
import type { Type, TypeEnv, TypeScheme } from "../../types/environment.js";
import type { InferenceContext, InferResult } from "./infer-context.js";

import { throwDiagnostic } from "../../diagnostics/index.js";
import { typeToString } from "../format.js";
import { checkExhaustiveness, checkPattern, checkReachability } from "../patterns.js";
import { freshTypeVar, primitiveTypes } from "../types.js";
import { applySubst, composeSubst, expandTypeAlias, unify } from "../unify.js";
import { instantiate } from "./infer-context.js";

// Import inferExpr - will be set via dependency injection
let inferExprFn: (ctx: InferenceContext, expr: CoreExpr) => InferResult;

/**
 * Set up dependency injection for inferExpr
 */
export function setInferExpr(fn: typeof inferExprFn): void {
    inferExprFn = fn;
}

/**
 * Infer the type of a record construction
 *
 * Creates a record type with the types of all fields.
 *
 * @param ctx - The inference context
 * @param expr - The record construction expression
 * @returns The inferred type and updated substitution
 */
export function inferRecord(ctx: InferenceContext, expr: Extract<CoreExpr, { kind: "CoreRecord" }>): InferResult {
    let currentCtx = ctx;
    const fieldTypes = new Map<string, Type>();

    // Infer the type of each field
    for (const field of expr.fields) {
        if (field.kind === "Field") {
            // Handle explicit field
            const fieldResult = inferExprFn(currentCtx, field.value);
            currentCtx = { ...currentCtx, subst: fieldResult.subst };
            fieldTypes.set(field.name, fieldResult.type);
        } else {
            // Handle spread - infer the spread expression and merge its fields
            const spreadResult = inferExprFn(currentCtx, field.expr);
            currentCtx = { ...currentCtx, subst: spreadResult.subst };

            // The spread expression must be a record type. Expand user-
            // defined aliases / generic records (e.g. `type Box<T> = { value: T }`)
            // so their fields merge correctly. Anything that doesn't resolve
            // to a record is a type error — silently dropping a non-record
            // spread was hiding bugs.
            const spreadType = expandTypeAlias(applySubst(currentCtx.subst, spreadResult.type), ctx.env.types);
            if (spreadType.type !== "Record") {
                throwDiagnostic("VF4500", field.loc, {
                    actual: typeToString(spreadType),
                });
            }
            for (const [fieldName, fieldType] of spreadType.fields) {
                fieldTypes.set(fieldName, fieldType);
            }
        }
    }

    // Create the record type
    const recordType: Type = {
        type: "Record",
        fields: fieldTypes,
    };

    return { type: recordType, subst: currentCtx.subst };
}

/**
 * Infer the type of a record field access
 *
 * Checks that the record has the requested field and returns its type.
 *
 * @param ctx - The inference context
 * @param expr - The record access expression
 * @returns The inferred type and updated substitution
 */
export function inferRecordAccess(
    ctx: InferenceContext,
    expr: Extract<CoreExpr, { kind: "CoreRecordAccess" }>,
): InferResult {
    // Infer the type of the record expression
    const recordResult = inferExprFn(ctx, expr.record);
    let recordType = applySubst(recordResult.subst, recordResult.type);
    let currentSubst = recordResult.subst;

    // Module access: look the field up in the module's exports and
    // instantiate its scheme at the current level. Modules are never
    // unified with Record types — they're a nominally distinct kind.
    if (recordType.type === "Module") {
        const fieldScheme = recordType.exports.get(expr.field);
        if (!fieldScheme) {
            throwDiagnostic("VF5001", expr.loc, {
                name: expr.field,
                path: recordType.path,
            });
        }
        return {
            type: instantiate(fieldScheme, ctx.level),
            subst: currentSubst,
        };
    }

    // If the type is a type variable, constrain it to be a record type with the accessed field
    if (recordType.type === "Var") {
        // Create a fresh type variable for the field
        const fieldType = freshTypeVar(ctx.level);

        // Create a record type with (at least) the accessed field
        const recordConstraint: Type = {
            type: "Record",
            fields: new Map([[expr.field, fieldType]]),
        };

        // Unify the constraint (expected shape: "must contain this field")
        // against the variable (actual, may resolve to a wider record).
        const unifyCtx = { loc: expr.loc, types: ctx.env.types };
        const unifySubst = unify(recordConstraint, recordType, unifyCtx);
        currentSubst = composeSubst(unifySubst, currentSubst);
        recordType = applySubst(currentSubst, recordType);

        // Return the field type
        return { type: fieldType, subst: currentSubst };
    }

    // Expand user-defined type aliases / generic records transparently so
    // `Box<Int>` (from `type Box<T> = { value: T }`) behaves like
    // `{ value: Int }` for field access.
    recordType = expandTypeAlias(recordType, ctx.env.types);

    // Check that it's a record type
    if (recordType.type !== "Record") {
        throwDiagnostic("VF4500", expr.loc, {
            actual: typeToString(recordType),
        });
    }

    // Look up the field
    const fieldType = recordType.fields.get(expr.field);
    if (!fieldType) {
        const availableFields = Array.from(recordType.fields.keys()).join(", ") || "(none)";
        throwDiagnostic("VF4501", expr.loc, {
            field: expr.field,
            availableFields,
        });
    }

    return { type: fieldType, subst: currentSubst };
}

/**
 * Infer the type of a record update
 *
 * Creates a new record type with updated fields.
 *
 * @param ctx - The inference context
 * @param expr - The record update expression
 * @returns The inferred type and updated substitution
 */
export function inferRecordUpdate(
    ctx: InferenceContext,
    expr: Extract<CoreExpr, { kind: "CoreRecordUpdate" }>,
): InferResult {
    // Infer the type of the base record
    const recordResult = inferExprFn(ctx, expr.record);
    let currentCtx: InferenceContext = { ...ctx, subst: recordResult.subst };
    let recordType = applySubst(recordResult.subst, recordResult.type);

    // Expand user-defined aliases / generic records (mirrors inferRecordAccess).
    recordType = expandTypeAlias(recordType, ctx.env.types);

    // Check that it's a record type
    if (recordType.type !== "Record") {
        throwDiagnostic("VF4500", expr.loc, {
            actual: typeToString(recordType),
        });
    }

    // Create a new field map with updates
    const newFields = new Map(recordType.fields);

    // Infer and check each update
    for (const update of expr.updates) {
        if (update.kind === "Field") {
            // Handle explicit field update
            // Check that the field exists in the original record
            if (!recordType.fields.has(update.name)) {
                const availableFields = Array.from(recordType.fields.keys()).join(", ") || "(none)";
                throwDiagnostic("VF4501", update.loc, {
                    field: update.name,
                    availableFields,
                });
            }

            // Infer the type of the update value
            const updateResult = inferExprFn(currentCtx, update.value);
            currentCtx = { ...currentCtx, subst: updateResult.subst };

            // Get the expected field type (after applying current substitution)
            const originalFieldType = recordType.fields.get(update.name);
            if (!originalFieldType) {
                throw new Error(`Field ${update.name} unexpectedly missing from record type`);
            }
            const expectedType = applySubst(currentCtx.subst, originalFieldType);
            const actualType = updateResult.type;

            // Unify the field's declared type (expected) against the update
            // value's inferred type (actual). Record convention: expected
            // fields must all appear in the actual.
            const unifyCtx = { loc: update.loc, types: ctx.env.types };
            const unifySubst = unify(expectedType, actualType, unifyCtx);
            currentCtx.subst = composeSubst(unifySubst, currentCtx.subst);

            // Update the field in the new map
            newFields.set(update.name, applySubst(currentCtx.subst, actualType));
        } else {
            // Handle spread update - infer the spread expression type
            const spreadResult = inferExprFn(currentCtx, update.expr);
            currentCtx = { ...currentCtx, subst: spreadResult.subst };

            // The spread expression should be a record type. Expand user-
            // defined aliases / generic records so their fields merge.
            const spreadType = expandTypeAlias(applySubst(currentCtx.subst, spreadResult.type), ctx.env.types);
            if (spreadType.type !== "Record") {
                throwDiagnostic("VF4500", update.loc, {
                    actual: typeToString(spreadType),
                });
            }

            // Merge fields from the spread expression into the new fields map
            for (const [fieldName, fieldType] of spreadType.fields) {
                newFields.set(fieldName, fieldType);
            }
        }
    }

    // Create the updated record type
    const updatedRecordType: Type = {
        type: "Record",
        fields: newFields,
    };

    return { type: updatedRecordType, subst: currentCtx.subst };
}

/**
 * Infer the type of a variant construction
 *
 * Looks up the constructor in the environment, instantiates its type,
 * and checks the arguments.
 *
 * @param ctx - The inference context
 * @param expr - The variant construction expression
 * @returns The inferred type and updated substitution
 */
export function inferVariant(ctx: InferenceContext, expr: Extract<CoreExpr, { kind: "CoreVariant" }>): InferResult {
    // Look up the constructor in the environment
    const binding = ctx.env.values.get(expr.constructor);

    if (!binding) {
        throwDiagnostic("VF4102", expr.loc, { name: expr.constructor });
    }

    // Get the constructor's type scheme
    let scheme: TypeScheme;
    if (binding.kind === "Value" || binding.kind === "External") {
        scheme = binding.scheme;
    } else {
        throwDiagnostic("VF4804", expr.loc, { name: expr.constructor });
    }

    // Instantiate the type scheme
    const constructorType = instantiate(scheme, ctx.level);

    // Nullary constructors (None, Nil, …) are values, not functions.
    if (constructorType.type !== "Fun") {
        if (expr.args.length > 0) {
            throwDiagnostic("VF4200", expr.loc, {
                name: expr.constructor,
                expected: 0,
                actual: expr.args.length,
            });
        }
        return { type: constructorType, subst: ctx.subst };
    }

    // Multi-arg variant constructors are curried: their type is
    // `(A) -> (B) -> … -> Variant<…>`. Walk one arg at a time, peeling
    // a layer of function type per application. This mirrors the
    // desugarer's curried CoreApp emission and accepts both direct
    // user calls (`Cons(1)(Nil)`) and the synthesized list-literal
    // `CoreVariant` form (`{ kind: "CoreVariant", args: [head, tail] }`).
    let currentType: Type = constructorType;
    let currentCtx: InferenceContext = ctx;
    let argIndex = 0;
    for (const arg of expr.args) {
        const liveType = applySubst(currentCtx.subst, currentType);
        if (liveType.type !== "Fun" || liveType.params.length === 0) {
            throwDiagnostic("VF4200", expr.loc, {
                name: expr.constructor,
                expected: argIndex,
                actual: expr.args.length,
            });
        }

        const expectedType = liveType.params[0];
        if (expectedType === undefined) {
            throw new Error(`Missing parameter at index ${argIndex}`);
        }

        const argResult = inferExprFn(currentCtx, arg);
        currentCtx = { ...currentCtx, subst: argResult.subst };

        const unifyCtx = { loc: arg.loc, types: ctx.env.types };
        const unifySubst = unify(applySubst(currentCtx.subst, expectedType), argResult.type, unifyCtx);
        currentCtx.subst = composeSubst(unifySubst, currentCtx.subst);

        currentType =
            liveType.params.length === 1 ? liveType.return : { ...liveType, params: liveType.params.slice(1) };
        argIndex++;
    }

    const resultType = applySubst(currentCtx.subst, currentType);
    if (resultType.type === "Fun") {
        // The constructor was applied to fewer args than its arity;
        // this is a partial application but variant constructors are
        // not partially applicable in expression position. Per the
        // desugarer, the user's surface call always provides every
        // arg, so this case shouldn't occur in practice.
        throwDiagnostic("VF4200", expr.loc, {
            name: expr.constructor,
            expected: argIndex + 1,
            actual: argIndex,
        });
    }
    return { type: resultType, subst: currentCtx.subst };
}

/**
 * Infer the type of a match expression
 *
 * Steps:
 * 1. Infer the type of the scrutinee (matched expression)
 * 2. For each case:
 *    a. Check the pattern against scrutinee type
 *    b. Extend environment with pattern bindings
 *    c. Infer the body type
 * 3. Check exhaustiveness
 * 4. Unify all case body types
 * 5. Return unified result type
 */
export function inferMatch(ctx: InferenceContext, expr: Extract<CoreExpr, { kind: "CoreMatch" }>): InferResult {
    // Reject unreachable arms before inferring guards/bodies so VF4405 fires
    // before any unrelated type error inside a dead arm can mask it.
    const exhaustivenessCases = expr.cases.map((c) => ({
        pattern: c.pattern,
        guarded: c.guard !== undefined,
    }));
    checkReachability(exhaustivenessCases);

    // Infer scrutinee type
    const scrutineeResult = inferExprFn(ctx, expr.expr);
    let currentCtx: InferenceContext = { ...ctx, subst: scrutineeResult.subst };
    let scrutineeType = applySubst(currentCtx.subst, scrutineeResult.type);

    // Infer type of each case
    let resultType: Type | null = null;

    for (const matchCase of expr.cases) {
        // Check pattern against scrutinee type
        const patternResult = checkPattern(
            currentCtx.env,
            matchCase.pattern,
            scrutineeType,
            currentCtx.subst,
            currentCtx.level,
        );
        currentCtx = { ...currentCtx, subst: patternResult.subst };

        // Extend environment with pattern bindings
        const caseEnv: TypeEnv = {
            values: new Map(currentCtx.env.values),
            types: currentCtx.env.types,
        };

        for (const [name, type] of patternResult.bindings) {
            caseEnv.values.set(name, {
                kind: "Value",
                scheme: { vars: [], type },
                loc: matchCase.loc,
            });
        }

        // If there's a guard, check it and ensure it's Bool
        if (matchCase.guard) {
            const guardCtx: InferenceContext = {
                ...currentCtx,
                env: caseEnv,
            };
            const guardResult = inferExprFn(guardCtx, matchCase.guard);
            currentCtx = { ...currentCtx, subst: guardResult.subst };

            // Unify guard type with Bool
            const guardCtxForUnify = { loc: matchCase.guard.loc };
            const guardUnifySubst = unify(
                applySubst(guardResult.subst, guardResult.type),
                primitiveTypes.Bool,
                guardCtxForUnify,
            );
            currentCtx.subst = composeSubst(guardUnifySubst, currentCtx.subst);
        }

        // Infer body type with extended environment
        const bodyCtx: InferenceContext = {
            ...currentCtx,
            env: caseEnv,
        };
        const bodyResult = inferExprFn(bodyCtx, matchCase.body);
        currentCtx = { ...currentCtx, subst: bodyResult.subst };

        // Unify with result type (first case sets it, others must match)
        if (resultType === null) {
            resultType = bodyResult.type;
        } else {
            const bodyUnifyCtx = { loc: matchCase.body.loc };
            const unifySubst = unify(
                applySubst(currentCtx.subst, resultType),
                applySubst(currentCtx.subst, bodyResult.type),
                bodyUnifyCtx,
            );
            currentCtx.subst = composeSubst(unifySubst, currentCtx.subst);
            resultType = applySubst(currentCtx.subst, resultType);
        }
    }

    // Check exhaustiveness after pattern checking completes
    // This allows the substitution to contain unifications from pattern checking
    // which resolves type variables to concrete variant types
    scrutineeType = applySubst(currentCtx.subst, scrutineeType);
    const missingCases = checkExhaustiveness(currentCtx.env, exhaustivenessCases, scrutineeType);
    if (missingCases.length > 0) {
        throwDiagnostic("VF4400", expr.loc, {
            missing: missingCases.join(", "),
        });
    }

    // Return unified result type
    if (resultType === null) {
        throwDiagnostic("VF4404", expr.loc, {});
    }

    return {
        type: applySubst(currentCtx.subst, resultType),
        subst: currentCtx.subst,
    };
}
