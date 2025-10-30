/**
 * Type representation utilities for type checking
 *
 * This module provides helper functions for constructing, manipulating,
 * and inspecting types during type inference.
 */

import type { CoreExpr } from "../types/core-ast.js";
import type { Type, TypeScheme } from "../types/environment.js";

/**
 * Type variable counter for generating fresh type variables
 */
let typeVarCounter = 0;

/**
 * Reset the type variable counter (useful for testing)
 */
export function resetTypeVarCounter(): void {
    typeVarCounter = 0;
}

/**
 * Generate a fresh type variable with optional level
 *
 * @param level - Optional level for scoping (defaults to 0)
 * @returns A new type variable with a unique ID
 */
export function freshTypeVar(level: number = 0): Type {
    return { type: "Var", id: typeVarCounter++, level };
}

/**
 * Create a type constant
 *
 * @param name - The name of the type constant (e.g., "Int", "String")
 * @returns A constant type
 */
export function constType(name: string): Type {
    return { type: "Const", name };
}

/**
 * Create a function type
 *
 * @param params - Parameter types
 * @param returnType - Return type
 * @returns A function type
 */
export function funType(params: Type[], returnType: Type): Type {
    return { type: "Fun", params, return: returnType };
}

/**
 * Create a type application (generic type with arguments)
 *
 * @param constructor - The type constructor
 * @param args - Type arguments
 * @returns A type application
 *
 * @example
 * ```typescript
 * // List<Int>
 * appType(constType("List"), [constType("Int")])
 * ```
 */
export function appType(constructor: Type, args: Type[]): Type {
    return { type: "App", constructor, args };
}

/**
 * Create a record type
 *
 * @param fields - Map of field names to types
 * @returns A record type
 */
export function recordType(fields: Map<string, Type>): Type {
    return { type: "Record", fields };
}

/**
 * Create a variant type
 *
 * @param constructors - Map of constructor names to parameter types
 * @returns A variant type
 */
export function variantType(constructors: Map<string, Type[]>): Type {
    return { type: "Variant", constructors };
}

/**
 * Create a union type
 *
 * @param types - Array of types to union
 * @returns A union type
 */
export function unionType(types: Type[]): Type {
    return { type: "Union", types };
}

/**
 * Create a reference type (mutable reference)
 *
 * @param elementType - The type of the referenced value
 * @returns A Ref<T> type
 */
export function refType(elementType: Type): Type {
    return appType(constType("Ref"), [elementType]);
}

/**
 * Built-in primitive types
 */
export const primitiveTypes = {
    Int: constType("Int"),
    Float: constType("Float"),
    String: constType("String"),
    Bool: constType("Bool"),
    Unit: constType("Unit"),
    Never: constType("Never"),
} as const;

/**
 * Check if a type is a type variable
 *
 * @param t - The type to check
 * @returns True if the type is a type variable
 */
export function isTypeVar(t: Type): t is Type & { type: "Var" } {
    return t.type === "Var";
}

/**
 * Check if a type is a constant type
 *
 * @param t - The type to check
 * @returns True if the type is a constant type
 */
export function isConstType(t: Type): t is Type & { type: "Const" } {
    return t.type === "Const";
}

/**
 * Check if a type is a function type
 *
 * @param t - The type to check
 * @returns True if the type is a function type
 */
export function isFunType(t: Type): t is Type & { type: "Fun" } {
    return t.type === "Fun";
}

/**
 * Check if a type is a type application
 *
 * @param t - The type to check
 * @returns True if the type is a type application
 */
export function isAppType(t: Type): t is Type & { type: "App" } {
    return t.type === "App";
}

/**
 * Check if a type is a record type
 *
 * @param t - The type to check
 * @returns True if the type is a record type
 */
export function isRecordType(t: Type): t is Type & { type: "Record" } {
    return t.type === "Record";
}

/**
 * Check if a type is a variant type
 *
 * @param t - The type to check
 * @returns True if the type is a variant type
 */
export function isVariantType(t: Type): t is Type & { type: "Variant" } {
    return t.type === "Variant";
}

/**
 * Check if a type is a union type
 *
 * @param t - The type to check
 * @returns True if the type is a union type
 */
export function isUnionType(t: Type): t is Type & { type: "Union" } {
    return t.type === "Union";
}

/**
 * Get all free type variables in a type
 *
 * @param t - The type to inspect
 * @returns Set of type variable IDs that are free in the type
 */
export function freeTypeVars(t: Type): Set<number> {
    const freeVars = new Set<number>();

    function collect(type: Type): void {
        switch (type.type) {
            case "Var":
                freeVars.add(type.id);
                break;
            case "Const":
                break;
            case "Fun":
                type.params.forEach(collect);
                collect(type.return);
                break;
            case "App":
                collect(type.constructor);
                type.args.forEach(collect);
                break;
            case "Record":
                type.fields.forEach((fieldType) => collect(fieldType));
                break;
            case "Variant":
                type.constructors.forEach((paramTypes) => {
                    paramTypes.forEach(collect);
                });
                break;
            case "Union":
                type.types.forEach(collect);
                break;
        }
    }

    collect(t);
    return freeVars;
}

/**
 * Get all free type variables in a type at or below a given level
 *
 * @param t - The type to inspect
 * @param maxLevel - Maximum level to include
 * @returns Set of type variable IDs that are free and at or below maxLevel
 */
export function freeTypeVarsAtLevel(t: Type, maxLevel: number): Set<number> {
    const freeVars = new Set<number>();

    function collect(type: Type): void {
        switch (type.type) {
            case "Var":
                if (type.level <= maxLevel) {
                    freeVars.add(type.id);
                }
                break;
            case "Const":
                break;
            case "Fun":
                type.params.forEach(collect);
                collect(type.return);
                break;
            case "App":
                collect(type.constructor);
                type.args.forEach(collect);
                break;
            case "Record":
                type.fields.forEach((fieldType) => collect(fieldType));
                break;
            case "Variant":
                type.constructors.forEach((paramTypes) => {
                    paramTypes.forEach(collect);
                });
                break;
            case "Union":
                type.types.forEach(collect);
                break;
        }
    }

    collect(t);
    return freeVars;
}

/**
 * Get all free type variables in a type scheme
 *
 * @param scheme - The type scheme to inspect
 * @returns Set of type variable IDs that are free (not quantified)
 */
export function freeInScheme(scheme: TypeScheme): Set<number> {
    const free = freeTypeVars(scheme.type);
    scheme.vars.forEach((v) => free.delete(v));
    return free;
}

/**
 * Check if two types are structurally equal
 *
 * Note: This is structural equality, not unification.
 * Type variables are compared by ID.
 *
 * @param t1 - First type
 * @param t2 - Second type
 * @returns True if the types are structurally equal
 */
export function typeEquals(t1: Type, t2: Type): boolean {
    if (t1.type !== t2.type) {
        return false;
    }

    switch (t1.type) {
        case "Var":
            return t1.id === (t2 as Type & { type: "Var" }).id;
        case "Const":
            return t1.name === (t2 as Type & { type: "Const" }).name;
        case "Fun": {
            const f2 = t2 as Type & { type: "Fun" };
            if (t1.params.length !== f2.params.length) {
                return false;
            }
            return (
                t1.params.every((p, i) => {
                    const param2 = f2.params[i];
                    return param2 !== undefined && typeEquals(p, param2);
                }) && typeEquals(t1.return, f2.return)
            );
        }
        case "App": {
            const a2 = t2 as Type & { type: "App" };
            if (t1.args.length !== a2.args.length) {
                return false;
            }
            return (
                typeEquals(t1.constructor, a2.constructor) &&
                t1.args.every((arg, i) => {
                    const arg2 = a2.args[i];
                    return arg2 !== undefined && typeEquals(arg, arg2);
                })
            );
        }
        case "Record": {
            const r2 = t2 as Type & { type: "Record" };
            if (t1.fields.size !== r2.fields.size) {
                return false;
            }
            for (const [name, fieldType] of t1.fields) {
                const otherType = r2.fields.get(name);
                if (!otherType || !typeEquals(fieldType, otherType)) {
                    return false;
                }
            }
            return true;
        }
        case "Variant": {
            const v2 = t2 as Type & { type: "Variant" };
            if (t1.constructors.size !== v2.constructors.size) {
                return false;
            }
            for (const [name, paramTypes] of t1.constructors) {
                const otherTypes = v2.constructors.get(name);
                if (!otherTypes || paramTypes.length !== otherTypes.length) {
                    return false;
                }
                if (
                    !paramTypes.every((paramType, i) => {
                        const otherType = otherTypes[i];
                        return otherType !== undefined && typeEquals(paramType, otherType);
                    })
                ) {
                    return false;
                }
            }
            return true;
        }
        case "Union": {
            const u2 = t2 as Type & { type: "Union" };
            if (t1.types.length !== u2.types.length) {
                return false;
            }
            return t1.types.every((type1, i) => {
                const type2 = u2.types[i];
                return type2 !== undefined && typeEquals(type1, type2);
            });
        }
    }
}

/**
 * Convert a type to a readable string representation
 *
 * @param t - The type to format
 * @returns A human-readable string representation
 */
export function typeToString(t: Type): string {
    switch (t.type) {
        case "Var":
            return `'t${t.id}`;
        case "Const":
            return t.name;
        case "Fun": {
            const firstParam = t.params[0];
            const paramStr =
                t.params.length === 1 && firstParam !== undefined
                    ? typeToString(firstParam)
                    : `(${t.params.map(typeToString).join(", ")})`;
            return `${paramStr} -> ${typeToString(t.return)}`;
        }
        case "App": {
            const constructorStr = typeToString(t.constructor);
            const argsStr = t.args.map(typeToString).join(", ");
            return `${constructorStr}<${argsStr}>`;
        }
        case "Record": {
            const fields = Array.from(t.fields.entries())
                .map(([name, type]) => `${name}: ${typeToString(type)}`)
                .join(", ");
            return `{ ${fields} }`;
        }
        case "Variant": {
            const constructors = Array.from(t.constructors.entries())
                .map(([name, types]) => {
                    if (types.length === 0) {
                        return name;
                    }
                    return `${name}(${types.map(typeToString).join(", ")})`;
                })
                .join(" | ");
            return constructors;
        }
        case "Union":
            return t.types.map(typeToString).join(" | ");
    }
}

/**
 * Convert a type scheme to a readable string representation
 *
 * @param scheme - The type scheme to format
 * @returns A human-readable string representation
 */
export function schemeToString(scheme: TypeScheme): string {
    if (scheme.vars.length === 0) {
        return typeToString(scheme.type);
    }
    const varsStr = scheme.vars.map((id) => `'t${id}`).join(" ");
    return `forall ${varsStr}. ${typeToString(scheme.type)}`;
}

// =============================================================================
// Syntactic Value Restriction
// =============================================================================

/**
 * Check if a core expression is a syntactic value
 *
 * This implements the ML value restriction for sound polymorphism.
 * Only syntactic values can be generalized to polymorphic types.
 *
 * Syntactic values include:
 * - Literals (int, float, string, bool, unit)
 * - Variables (references to bound names)
 * - Lambda abstractions
 * - Variant constructors where all arguments are syntactic values
 * - Records where all field values are syntactic values
 *
 * Non-values include:
 * - Function applications
 * - Match expressions
 * - Let bindings
 * - Binary/unary operations
 * - Record access/update (non-value operations)
 *
 * This prevents unsound generalization of expressions like:
 * - `ref(None)` which would allow type variable escape
 * - `f(x)` where f is a polymorphic function returning a ref
 *
 * @param expr - The core expression to check
 * @returns true if the expression is a syntactic value, false otherwise
 */
export function isSyntacticValue(expr: CoreExpr): boolean {
    switch (expr.kind) {
        // Literals are always syntactic values
        case "CoreIntLit":
        case "CoreFloatLit":
        case "CoreStringLit":
        case "CoreBoolLit":
        case "CoreUnitLit":
            return true;

        // Variables are syntactic values (they reference bound values)
        case "CoreVar":
            return true;

        // Lambdas are syntactic values
        case "CoreLambda":
            return true;

        // Variant constructors are syntactic values if all arguments are
        case "CoreVariant":
            return expr.args.every(isSyntacticValue);

        // Records are syntactic values if all field values are
        case "CoreRecord":
            return expr.fields.every((field) => isSyntacticValue(field.value));

        // Type annotations: check the inner expression
        case "CoreTypeAnnotation":
            return isSyntacticValue(expr.expr);

        // Unsafe blocks: check the inner expression
        case "CoreUnsafe":
            return isSyntacticValue(expr.expr);

        // Everything else is NOT a syntactic value
        case "CoreLet":
        case "CoreLetRecExpr":
        case "CoreApp":
        case "CoreMatch":
        case "CoreRecordAccess":
        case "CoreRecordUpdate":
        case "CoreBinOp":
        case "CoreUnaryOp":
            return false;
    }
}
