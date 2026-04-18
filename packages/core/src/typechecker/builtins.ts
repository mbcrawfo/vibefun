/**
 * Built-in types and standard library function signatures
 *
 * This module defines all primitive types and standard library functions
 * that are available in the vibefun environment by default.
 */

import type { Type, TypeScheme } from "../types/environment.js";

import { appType, constType, freshTypeVar, funType, isTypeVar, primitiveTypes } from "./types.js";

/**
 * List<T> type constructor
 */
export function listType(elementType: Type): Type {
    return appType(constType("List"), [elementType]);
}

/**
 * Option<T> type constructor
 */
export function optionType(elementType: Type): Type {
    return appType(constType("Option"), [elementType]);
}

/**
 * Result<T, E> type constructor
 */
export function resultType(okType: Type, errType: Type): Type {
    return appType(constType("Result"), [okType, errType]);
}

/**
 * Create a polymorphic type scheme
 *
 * @param varIds - Type variable IDs to quantify
 * @param type - The type with free variables
 * @returns A type scheme with quantified variables
 */
function polyScheme(varIds: number[], type: Type): TypeScheme {
    return { vars: varIds, type };
}

/**
 * Create a monomorphic type scheme (no quantified variables)
 *
 * @param type - The monomorphic type
 * @returns A type scheme with no quantified variables
 */
function monoScheme(type: Type): TypeScheme {
    return { vars: [], type };
}

/**
 * Get all built-in types and standard library function signatures
 *
 * This includes:
 * - Primitive types (Int, Float, String, Bool, Unit, Never)
 * - Standard library types (List<T>, Option<T>, Result<T,E>)
 * - Standard library functions (46 total: 17 core + 29 additional)
 *   - List: map, filter, fold, length, foldRight, head, tail, reverse, concat
 *   - Option: map, flatMap, getOrElse, isSome, isNone, unwrap
 *   - Result: map, flatMap, isOk, mapErr, isErr, unwrap, unwrapOr
 *   - String: length, concat, fromInt, toUpperCase, toLowerCase, trim, split, contains, startsWith, endsWith, fromFloat, toInt, toFloat
 *   - Int: toString, toFloat, abs, max, min
 *   - Float: toString, toInt, round, floor, ceil, abs
 * - Special functions (panic, ref)
 *
 * @returns Map of name to type scheme
 */
export function getBuiltinEnv(): Map<string, TypeScheme> {
    const env = new Map<string, TypeScheme>();

    // Primitive types are not added to the value environment
    // They are only used in type expressions

    // List<T> constructors
    // type List<T> = Cons(T, List<T>) | Nil
    const tVar = freshTypeVar(); // Type variable for List element type
    const tVarId = isTypeVar(tVar) ? tVar.id : 0;
    const listOfT = listType(tVar);

    // Cons: (T, List<T>) -> List<T>
    env.set("Cons", polyScheme([tVarId], funType([tVar, listOfT], listOfT)));

    // Nil: () -> List<T>
    env.set("Nil", polyScheme([tVarId], funType([], listOfT)));

    // Option<T> constructors
    // type Option<T> = Some(T) | None
    const tVar2 = freshTypeVar();
    const tVar2Id = isTypeVar(tVar2) ? tVar2.id : 0;
    const optionOfT = optionType(tVar2);

    // Some: (T) -> Option<T>
    env.set("Some", polyScheme([tVar2Id], funType([tVar2], optionOfT)));

    // None: () -> Option<T>
    env.set("None", polyScheme([tVar2Id], funType([], optionOfT)));

    // Result<T, E> constructors
    // type Result<T, E> = Ok(T) | Err(E)
    const tVar3 = freshTypeVar();
    const tVar3Id = isTypeVar(tVar3) ? tVar3.id : 0;
    const eVar = freshTypeVar();
    const eVarId = isTypeVar(eVar) ? eVar.id : 0;
    const resultOfTE = resultType(tVar3, eVar);

    // Ok: (T) -> Result<T, E>
    env.set("Ok", polyScheme([tVar3Id, eVarId], funType([tVar3], resultOfTE)));

    // Err: (E) -> Result<T, E>
    env.set("Err", polyScheme([tVar3Id, eVarId], funType([eVar], resultOfTE)));

    // Stdlib functions (String.*, List.*, Option.*, Result.*, Int.*, Float.*,
    // Math.*) are NOT ambient as of Phase 2.6. User code accesses them via
    // explicit imports from @vibefun/std; see packages/core/src/typechecker/
    // module-signatures/ for the signatures and the import handler in
    // typechecker.ts. The desugarer-synthesized `__std__` pre-seeded further
    // down provides the same access path for compiler-generated references.

    // ==================== Special functions ====================

    // panic: (String) -> Never
    env.set("panic", monoScheme(funType([primitiveTypes.String], primitiveTypes.Never)));

    // ref: forall a. (a) -> Ref<a>
    const aVar = freshTypeVar();
    const aVarId = isTypeVar(aVar) ? aVar.id : 0;
    const refOfA = appType(constType("Ref"), [aVar]);
    env.set("ref", polyScheme([aVarId], funType([aVar], refOfA)));

    return env;
}

/**
 * Get built-in type definitions (for type environment)
 *
 * This includes the definitions of List, Option, and Result types.
 *
 * @returns Map of type name to type definition
 */
export function getBuiltinTypes(): Map<
    string,
    {
        kind: "Variant";
        params: string[];
        constructors: Map<string, Type[]>;
    }
> {
    const types = new Map();

    // List<T> type definition
    const tVar = freshTypeVar();
    const listOfT = listType(tVar);
    types.set("List", {
        kind: "Variant" as const,
        params: ["T"],
        constructors: new Map([
            ["Cons", [tVar, listOfT]], // Cons(T, List<T>)
            ["Nil", []], // Nil
        ]),
    });

    // Option<T> type definition
    const tVar2 = freshTypeVar();
    types.set("Option", {
        kind: "Variant" as const,
        params: ["T"],
        constructors: new Map([
            ["Some", [tVar2]], // Some(T)
            ["None", []], // None
        ]),
    });

    // Result<T, E> type definition
    const tVar3 = freshTypeVar();
    const eVar = freshTypeVar();
    types.set("Result", {
        kind: "Variant" as const,
        params: ["T", "E"],
        constructors: new Map([
            ["Ok", [tVar3]], // Ok(T)
            ["Err", [eVar]], // Err(E)
        ]),
    });

    return types;
}
