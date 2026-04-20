/**
 * Type unification algorithm
 *
 * Implements unification for Hindley-Milner type inference.
 * Unification determines if two types can be made equal by
 * substituting type variables.
 */

import type { Location } from "../types/ast.js";
import type { Type, TypeBinding } from "../types/environment.js";

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
    /**
     * Optional type environment for alias / generic expansion during
     * unification. When present, `Const`/`App` types whose name matches a
     * registered `Alias` or `Record` binding are expanded before structural
     * unification. Callers that don't need alias transparency (unit tests,
     * module-signature synthesis) may leave this undefined.
     */
    readonly types?: Map<string, TypeBinding>;
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
        case "Module":
            // Module exports are fully-generalized schemes — substitution does
            // not need to reach inside them.
            return type;
        case "Never":
            return type;
        case "StringLit":
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
        case "Module":
            return false;
        case "Never":
            return false;
        case "StringLit":
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

    // Expand user-defined type aliases and generic record types transparently
    // before structural unification. This is what makes `type UserId = Int`
    // interchangeable with `Int` and `Box<Int>` interchangeable with
    // `{ value: Int }`. Expansion is transitive so nested aliases like
    // `type A = B; type B = Int` collapse in one step.
    const expanded1 = expandAliasFully(t1, ctx);
    const expanded2 = expandAliasFully(t2, ctx);
    if (expanded1 !== t1 || expanded2 !== t2) {
        return unify(expanded1, expanded2, ctx);
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

    // Module type unification (nominal — match by path)
    if (t1.type === "Module" && t2.type === "Module") {
        if (t1.path === t2.path) {
            return emptySubst();
        }
        throwDiagnostic("VF4024", ctx.loc, {
            type1: typeToString(t1),
            type2: typeToString(t2),
        });
    }

    // String literal singleton unification.
    //
    // Rules (symmetric):
    //   - StringLit(v1) ~ StringLit(v2): unifies iff v1 === v2.
    //   - StringLit(v)  ~ Const("String"): unifies. A singleton is a
    //     legitimate inhabitant of `String`, so an expression typed as
    //     `String` flowing into a literal-typed slot (or vice versa) is
    //     accepted here — the narrower membership check for
    //     string-literal *unions* happens at annotation sites, not here.
    if (t1.type === "StringLit" && t2.type === "StringLit") {
        if (t1.value === t2.value) {
            return emptySubst();
        }
        throwDiagnostic("VF4020", ctx.loc, {
            t1: typeToString(t1),
            t2: typeToString(t2),
        });
    }
    if (t1.type === "StringLit" && isConstType(t2) && t2.name === "String") {
        return emptySubst();
    }
    if (isConstType(t1) && t1.name === "String" && t2.type === "StringLit") {
        return emptySubst();
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
        case "Module":
            return type;
        case "Never":
            return type;
        case "StringLit":
            return type;
    }
}

/**
 * Unify two record types with directional width subtyping.
 *
 * Convention: r1 is the *expected* (narrower) record and r2 is the
 * *actual* (possibly wider) record. r2 may carry extra fields that r1
 * does not name — that's width subtyping. But every field r1 requires
 * must exist in r2; missing fields raise VF4503.
 *
 * @param r1 - Expected record type (its fields must all be present in r2)
 * @param r2 - Actual record type (may have extras)
 * @param ctx - Unification context for error reporting
 * @returns A substitution that unifies the records
 */
function unifyRecords(r1: Type & { type: "Record" }, r2: Type & { type: "Record" }, ctx: UnifyContext): Substitution {
    let subst = emptySubst();

    // Every field required by r1 (expected) must appear in r2 (actual).
    for (const [field, expectedFieldType] of r1.fields) {
        const actualFieldType = r2.fields.get(field);
        if (!actualFieldType) {
            throwDiagnostic("VF4503", ctx.loc, {
                field,
                expected: typeToString(r1),
                actual: typeToString(r2),
            });
        }
        const fieldSubst = unify(applySubst(subst, expectedFieldType), applySubst(subst, actualFieldType), ctx);
        subst = composeSubst(subst, fieldSubst);
    }

    // Extra fields in r2 are allowed (width subtyping).
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

/**
 * Public wrapper around alias/generic expansion for callers outside
 * `unify()` itself (e.g. record field access in infer-structures.ts) that
 * need to peek at the expanded shape of a user-defined type before
 * proceeding with structural checks.
 *
 * Expansion is transitive: `type A = B; type B = Int` expanded from `A`
 * yields `Int`, not `B`. A depth cap guards against pathological cycles
 * that somehow slip past the alias-recursion validator.
 */
export function expandTypeAlias(type: Type, types: Map<string, TypeBinding>): Type {
    const ctx: UnifyContext = { loc: { file: "", line: 0, column: 0, offset: 0 }, types };
    let current = type;
    for (let i = 0; i < 32; i++) {
        const expanded = expandAlias(current, ctx);
        if (expanded === current) {
            return current;
        }
        current = expanded;
    }
    return current;
}

/**
 * Transitive wrapper around `expandAlias` — applies expansion repeatedly
 * until the type stabilises or a depth cap is hit. The depth cap guards
 * against pathological alias cycles that slipped past validation.
 */
export function expandAliasFully(type: Type, ctx: UnifyContext): Type {
    let current = type;
    for (let i = 0; i < 32; i++) {
        const expanded = expandAlias(current, ctx);
        if (expanded === current) {
            return current;
        }
        current = expanded;
    }
    return current;
}

/**
 * Expand a user-defined type alias or generic record type for unification.
 *
 * - `type UserId = Int` expands `UserId` → `Int`.
 * - `type Box<T> = { value: T }` expands `Box<Int>` → `{ value: Int }`.
 *
 * Variant types are **not** expanded — they use nominal typing and have
 * dedicated unification rules that match by the constructor set.
 */
function expandAlias(type: Type, ctx: UnifyContext): Type {
    if (!ctx.types) {
        return type;
    }

    // Bare `Const` reference (e.g. `UserId`) with no type arguments.
    if (type.type === "Const") {
        const binding = ctx.types.get(type.name);
        if (!binding) {
            return type;
        }
        if (binding.kind === "Alias" && binding.params.length === 0) {
            return binding.definition;
        }
        if (binding.kind === "Record" && binding.params.length === 0) {
            return { type: "Record", fields: binding.fields };
        }
        return type;
    }

    // Applied `App(Const(name), args)` reference (e.g. `Box<Int>`).
    if (type.type === "App" && type.constructor.type === "Const") {
        const binding = ctx.types.get(type.constructor.name);
        if (!binding) {
            return type;
        }
        if (binding.kind === "Alias" && binding.params.length === type.args.length) {
            const subst = buildParamSubst(binding.paramIds, type.args);
            if (!subst) {
                return type;
            }
            return applySubst(subst, binding.definition);
        }
        if (binding.kind === "Record" && binding.params.length === type.args.length) {
            const subst = buildParamSubst(binding.paramIds, type.args);
            if (!subst) {
                return type;
            }
            const fields = new Map<string, Type>();
            for (const [name, fieldType] of binding.fields) {
                fields.set(name, applySubst(subst, fieldType));
            }
            return { type: "Record", fields };
        }
        return type;
    }

    return type;
}

/**
 * Build a substitution mapping each generic parameter's type variable ID to
 * the corresponding concrete type argument. Returns `undefined` when the
 * binding lacks `paramIds` (unit-test fixtures), signalling that the caller
 * should skip expansion.
 */
function buildParamSubst(paramIds: number[] | undefined, args: Type[]): Substitution | undefined {
    if (!paramIds || paramIds.length !== args.length) {
        return undefined;
    }
    const subst: Substitution = new Map();
    for (let i = 0; i < paramIds.length; i++) {
        const id = paramIds[i];
        const arg = args[i];
        if (id !== undefined && arg !== undefined) {
            subst.set(id, arg);
        }
    }
    return subst;
}
