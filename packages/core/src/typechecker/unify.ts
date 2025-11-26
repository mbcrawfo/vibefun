/**
 * Type unification algorithm
 *
 * Implements unification for Hindley-Milner type inference.
 * Unification determines if two types can be made equal by
 * substituting type variables.
 */

import type { Location } from "../types/ast.js";
import type { Type } from "../types/environment.js";

import { throwDiagnostic } from "../diagnostics/index.js";
import { typeToString } from "./format.js";
import { isAppType, isConstType, isFunType, isRecordType, isTypeVar, isUnionType, isVariantType } from "./types.js";

/**
 * Context for unification operations.
 * Carries location and source information through unification
 * to enable accurate error reporting.
 */
export interface UnifyContext {
    /** Source location for error reporting */
    readonly loc: Location;
    /** Optional source code for error formatting */
    readonly source?: string;
}

/**
 * Substitution maps type variable IDs to types
 */
export type Substitution = Map<number, Type>;

/**
 * Empty substitution (identity)
 */
export function emptySubst(): Substitution {
    return new Map();
}

/**
 * Create a single-binding substitution
 *
 * @param id - Type variable ID
 * @param type - Type to substitute
 * @returns A substitution mapping id to type
 */
export function singleSubst(id: number, type: Type): Substitution {
    const subst = new Map();
    subst.set(id, type);
    return subst;
}

/**
 * Apply a substitution to a type
 *
 * @param subst - The substitution to apply
 * @param type - The type to substitute into
 * @returns The type with substitutions applied
 */
export function applySubst(subst: Substitution, type: Type): Type {
    if (subst.size === 0) {
        return type;
    }

    switch (type.type) {
        case "Var": {
            const replacement = subst.get(type.id);
            if (replacement) {
                // Apply substitution recursively to handle chains
                return applySubst(subst, replacement);
            }
            return type;
        }
        case "Const":
            return type;
        case "Fun":
            return {
                type: "Fun",
                params: type.params.map((p) => applySubst(subst, p)),
                return: applySubst(subst, type.return),
            };
        case "App":
            return {
                type: "App",
                constructor: applySubst(subst, type.constructor),
                args: type.args.map((arg) => applySubst(subst, arg)),
            };
        case "Record": {
            const fields = new Map<string, Type>();
            type.fields.forEach((fieldType, fieldName) => {
                fields.set(fieldName, applySubst(subst, fieldType));
            });
            return { type: "Record", fields };
        }
        case "Variant": {
            const constructors = new Map<string, Type[]>();
            type.constructors.forEach((paramTypes, constructorName) => {
                constructors.set(
                    constructorName,
                    paramTypes.map((t) => applySubst(subst, t)),
                );
            });
            return { type: "Variant", constructors };
        }
        case "Union":
            return {
                type: "Union",
                types: type.types.map((t) => applySubst(subst, t)),
            };
        case "Tuple":
            return {
                type: "Tuple",
                elements: type.elements.map((elem) => applySubst(subst, elem)),
            };
        case "Ref":
            return {
                type: "Ref",
                inner: applySubst(subst, type.inner),
            };
        case "Never":
            return type;
    }
}

/**
 * Compose two substitutions
 *
 * The result is equivalent to applying s1 first, then s2.
 *
 * @param s1 - First substitution
 * @param s2 - Second substitution
 * @returns The composed substitution
 */
export function composeSubst(s1: Substitution, s2: Substitution): Substitution {
    const result = new Map<number, Type>();

    // Apply s2 to all bindings in s1
    s1.forEach((type, id) => {
        result.set(id, applySubst(s2, type));
    });

    // Add bindings from s2 that aren't in s1
    s2.forEach((type, id) => {
        if (!result.has(id)) {
            result.set(id, type);
        }
    });

    return result;
}

/**
 * Check if a type variable occurs in a type (occurs check)
 *
 * This prevents the creation of infinite types like α = List<α>.
 *
 * @param id - Type variable ID to check for
 * @param type - Type to check in
 * @returns True if the variable occurs in the type
 */
export function occursIn(id: number, type: Type): boolean {
    switch (type.type) {
        case "Var":
            return type.id === id;
        case "Const":
            return false;
        case "Fun":
            return type.params.some((p) => occursIn(id, p)) || occursIn(id, type.return);
        case "App":
            return occursIn(id, type.constructor) || type.args.some((arg) => occursIn(id, arg));
        case "Record":
            return Array.from(type.fields.values()).some((fieldType) => occursIn(id, fieldType));
        case "Variant":
            return Array.from(type.constructors.values()).some((paramTypes) => paramTypes.some((t) => occursIn(id, t)));
        case "Union":
            return type.types.some((t) => occursIn(id, t));
        case "Tuple":
            return type.elements.some((elem) => occursIn(id, elem));
        case "Ref":
            return occursIn(id, type.inner);
        case "Never":
            return false;
    }
}

/**
 * Unify two types
 *
 * Attempts to find a substitution that makes the two types equal.
 * Throws a diagnostic if unification fails.
 *
 * @param t1 - First type
 * @param t2 - Second type
 * @param ctx - Unification context containing location for error reporting
 * @returns A substitution that unifies the types
 * @throws VibefunDiagnostic if types cannot be unified
 */
export function unify(t1: Type, t2: Type, ctx: UnifyContext): Substitution {
    // Type variable unification (must come before Never check)
    if (isTypeVar(t1)) {
        return unifyVar(t1.id, t1.level, t2, ctx);
    }
    if (isTypeVar(t2)) {
        return unifyVar(t2.id, t2.level, t1, ctx);
    }

    // Handle Never type (bottom type) - unifies with anything
    // This comes after var check so that 't ~ Never binds 't to Never
    if (isConstType(t1) && t1.name === "Never") {
        return emptySubst();
    }
    if (isConstType(t2) && t2.name === "Never") {
        return emptySubst();
    }

    // Constant type unification
    if (isConstType(t1) && isConstType(t2)) {
        if (t1.name === t2.name) {
            return emptySubst();
        }
        throwDiagnostic("VF4020", ctx.loc, { t1: t1.name, t2: t2.name });
    }

    // Function type unification
    if (isFunType(t1) && isFunType(t2)) {
        if (t1.params.length !== t2.params.length) {
            throwDiagnostic("VF4021", ctx.loc, {
                arity1: t1.params.length,
                arity2: t2.params.length,
            });
        }

        let subst = emptySubst();

        // Unify parameters
        for (let i = 0; i < t1.params.length; i++) {
            const param1 = t1.params[i];
            const param2 = t2.params[i];
            if (!param1 || !param2) {
                // Internal error - should never happen
                throw new Error(`Missing parameter at index ${i}`);
            }
            const paramSubst = unify(applySubst(subst, param1), applySubst(subst, param2), ctx);
            subst = composeSubst(subst, paramSubst);
        }

        // Unify return types
        const returnSubst = unify(applySubst(subst, t1.return), applySubst(subst, t2.return), ctx);
        return composeSubst(subst, returnSubst);
    }

    // Type application unification (e.g., List<Int> with List<String>)
    if (isAppType(t1) && isAppType(t2)) {
        if (t1.args.length !== t2.args.length) {
            throwDiagnostic("VF4022", ctx.loc, {});
        }

        // Unify constructors
        let subst = unify(t1.constructor, t2.constructor, ctx);

        // Unify arguments
        for (let i = 0; i < t1.args.length; i++) {
            const arg1 = t1.args[i];
            const arg2 = t2.args[i];
            if (!arg1 || !arg2) {
                // Internal error - should never happen
                throw new Error(`Missing argument at index ${i}`);
            }
            const argSubst = unify(applySubst(subst, arg1), applySubst(subst, arg2), ctx);
            subst = composeSubst(subst, argSubst);
        }

        return subst;
    }

    // Record type unification (structural with width subtyping)
    if (isRecordType(t1) && isRecordType(t2)) {
        return unifyRecords(t1, t2, ctx);
    }

    // Variant type unification (nominal - must have same structure)
    if (isVariantType(t1) && isVariantType(t2)) {
        return unifyVariants(t1, t2, ctx);
    }

    // Union type unification
    if (isUnionType(t1) && isUnionType(t2)) {
        if (t1.types.length !== t2.types.length) {
            throwDiagnostic("VF4023", ctx.loc, {});
        }

        let subst = emptySubst();
        for (let i = 0; i < t1.types.length; i++) {
            const type1 = t1.types[i];
            const type2 = t2.types[i];
            if (!type1 || !type2) {
                // Internal error - should never happen
                throw new Error(`Missing type at index ${i}`);
            }
            const typeSubst = unify(applySubst(subst, type1), applySubst(subst, type2), ctx);
            subst = composeSubst(subst, typeSubst);
        }

        return subst;
    }

    // Tuple type unification
    if (t1.type === "Tuple" && t2.type === "Tuple") {
        if (t1.elements.length !== t2.elements.length) {
            throwDiagnostic("VF4026", ctx.loc, {
                expected: t1.elements.length,
                actual: t2.elements.length,
            });
        }

        let subst = emptySubst();
        for (let i = 0; i < t1.elements.length; i++) {
            const elem1 = t1.elements[i];
            const elem2 = t2.elements[i];
            if (!elem1 || !elem2) {
                // Internal error - should never happen
                throw new Error(`Missing element at index ${i}`);
            }
            const elemSubst = unify(applySubst(subst, elem1), applySubst(subst, elem2), ctx);
            subst = composeSubst(subst, elemSubst);
        }

        return subst;
    }

    // No unification rule applies
    throwDiagnostic("VF4024", ctx.loc, {
        type1: typeToString(t1),
        type2: typeToString(t2),
    });
}

/**
 * Unify a type variable with a type
 *
 * @param id - Type variable ID
 * @param level - Type variable level
 * @param type - Type to unify with
 * @param ctx - Unification context for error reporting
 * @returns A substitution
 */
function unifyVar(id: number, level: number, type: Type, ctx: UnifyContext): Substitution {
    // Check if unifying with the same variable
    if (isTypeVar(type) && type.id === id) {
        return emptySubst();
    }

    // Occurs check - prevent infinite types
    if (occursIn(id, type)) {
        throwDiagnostic("VF4300", ctx.loc, {
            typeVar: `'${String.fromCharCode(97 + (id % 26))}`,
            type: typeToString(type),
        });
    }

    // Update level of type variables in the type to prevent escape
    const updatedType = updateLevels(type, level);

    return singleSubst(id, updatedType);
}

/**
 * Update levels in a type to be no higher than the given level
 *
 * This prevents type variables from escaping their scope.
 *
 * @param type - Type to update
 * @param maxLevel - Maximum level allowed
 * @returns Type with updated levels
 */
function updateLevels(type: Type, maxLevel: number): Type {
    switch (type.type) {
        case "Var":
            return {
                type: "Var",
                id: type.id,
                level: Math.min(type.level, maxLevel),
            };
        case "Const":
            return type;
        case "Fun":
            return {
                type: "Fun",
                params: type.params.map((p) => updateLevels(p, maxLevel)),
                return: updateLevels(type.return, maxLevel),
            };
        case "App":
            return {
                type: "App",
                constructor: updateLevels(type.constructor, maxLevel),
                args: type.args.map((arg) => updateLevels(arg, maxLevel)),
            };
        case "Record": {
            const fields = new Map<string, Type>();
            type.fields.forEach((fieldType, fieldName) => {
                fields.set(fieldName, updateLevels(fieldType, maxLevel));
            });
            return { type: "Record", fields };
        }
        case "Variant": {
            const constructors = new Map<string, Type[]>();
            type.constructors.forEach((paramTypes, constructorName) => {
                constructors.set(
                    constructorName,
                    paramTypes.map((t) => updateLevels(t, maxLevel)),
                );
            });
            return { type: "Variant", constructors };
        }
        case "Union":
            return {
                type: "Union",
                types: type.types.map((t) => updateLevels(t, maxLevel)),
            };
        case "Tuple":
            return {
                type: "Tuple",
                elements: type.elements.map((elem) => updateLevels(elem, maxLevel)),
            };
        case "Ref":
            return {
                type: "Ref",
                inner: updateLevels(type.inner, maxLevel),
            };
        case "Never":
            return type;
    }
}

/**
 * Unify two record types with width subtyping
 *
 * Records with more fields can be used where fewer fields are expected.
 *
 * @param r1 - First record type
 * @param r2 - Second record type
 * @param ctx - Unification context for error reporting
 * @returns A substitution that unifies the records
 */
function unifyRecords(r1: Type & { type: "Record" }, r2: Type & { type: "Record" }, ctx: UnifyContext): Substitution {
    // Width subtyping: allow extra fields
    // Find common fields that must unify
    const commonFields = Array.from(r1.fields.keys()).filter((f) => r2.fields.has(f));

    let subst = emptySubst();

    // Unify all common fields
    for (const field of commonFields) {
        const fieldType1 = r1.fields.get(field);
        const fieldType2 = r2.fields.get(field);
        if (!fieldType1 || !fieldType2) {
            // Internal error - should never happen
            throw new Error(`Missing field type for ${field}`);
        }
        const fieldSubst = unify(applySubst(subst, fieldType1), applySubst(subst, fieldType2), ctx);
        subst = composeSubst(subst, fieldSubst);
    }

    // Width subtyping: we don't require all fields to be present
    // A record with {x: Int, y: Int, z: Int} can be used as {x: Int, y: Int}
    return subst;
}

/**
 * Unify two variant types (nominal typing)
 *
 * Variant types must have exactly the same constructors with the same types.
 *
 * @param v1 - First variant type
 * @param v2 - Second variant type
 * @param ctx - Unification context for error reporting
 * @returns A substitution that unifies the variants
 */
function unifyVariants(
    v1: Type & { type: "Variant" },
    v2: Type & { type: "Variant" },
    ctx: UnifyContext,
): Substitution {
    // Nominal typing: constructors must match exactly
    const constructors1 = Array.from(v1.constructors.keys()).sort();
    const constructors2 = Array.from(v2.constructors.keys()).sort();

    if (constructors1.length !== constructors2.length) {
        throwDiagnostic("VF4025", ctx.loc, {
            message: "variants have different number of constructors",
        });
    }

    for (let i = 0; i < constructors1.length; i++) {
        if (constructors1[i] !== constructors2[i]) {
            throwDiagnostic("VF4025", ctx.loc, {
                message: "variants have different constructors",
            });
        }
    }

    let subst = emptySubst();

    // Unify parameter types for each constructor
    for (const constructor of constructors1) {
        const params1 = v1.constructors.get(constructor);
        const params2 = v2.constructors.get(constructor);

        if (!params1 || !params2) {
            // Internal error - should never happen
            throw new Error(`Missing constructor ${constructor}`);
        }

        if (params1.length !== params2.length) {
            throwDiagnostic("VF4025", ctx.loc, {
                message: `constructor ${constructor} has different arity in variants`,
            });
        }

        for (let i = 0; i < params1.length; i++) {
            const param1 = params1[i];
            const param2 = params2[i];
            if (!param1 || !param2) {
                // Internal error - should never happen
                throw new Error(`Missing parameter at index ${i} in constructor ${constructor}`);
            }
            const paramSubst = unify(applySubst(subst, param1), applySubst(subst, param2), ctx);
            subst = composeSubst(subst, paramSubst);
        }
    }

    return subst;
}
