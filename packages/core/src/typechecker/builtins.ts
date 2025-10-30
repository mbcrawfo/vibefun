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
 * - Standard library functions (17 core functions)
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

    // Standard Library Functions - Phase 2 Core Subset (17 functions)

    // List functions (4)
    const tVar4 = freshTypeVar();
    const tVar4Id = isTypeVar(tVar4) ? tVar4.id : 0;
    const uVar = freshTypeVar();
    const uVarId = isTypeVar(uVar) ? uVar.id : 0;
    const tVar5 = freshTypeVar();
    const tVar5Id = isTypeVar(tVar5) ? tVar5.id : 0;
    const tVar6 = freshTypeVar();
    const tVar6Id = isTypeVar(tVar6) ? tVar6.id : 0;
    const tVar7 = freshTypeVar();
    const tVar7Id = isTypeVar(tVar7) ? tVar7.id : 0;

    // List.map: ((T) -> U, List<T>) -> List<U>
    env.set(
        "List.map",
        polyScheme([tVar4Id, uVarId], funType([funType([tVar4], uVar), listType(tVar4)], listType(uVar))),
    );

    // List.filter: ((T) -> Bool, List<T>) -> List<T>
    env.set(
        "List.filter",
        polyScheme([tVar5Id], funType([funType([tVar5], primitiveTypes.Bool), listType(tVar5)], listType(tVar5))),
    );

    // List.fold: ((U, T) -> U, U, List<T>) -> U
    env.set(
        "List.fold",
        polyScheme([uVarId, tVar6Id], funType([funType([uVar, tVar6], uVar), uVar, listType(tVar6)], uVar)),
    );

    // List.length: (List<T>) -> Int
    env.set("List.length", polyScheme([tVar7Id], funType([listType(tVar7)], primitiveTypes.Int)));

    // Option functions (3)
    const tVar8 = freshTypeVar();
    const tVar8Id = isTypeVar(tVar8) ? tVar8.id : 0;
    const uVar2 = freshTypeVar();
    const uVar2Id = isTypeVar(uVar2) ? uVar2.id : 0;
    const tVar9 = freshTypeVar();
    const tVar9Id = isTypeVar(tVar9) ? tVar9.id : 0;
    const tVar10 = freshTypeVar();
    const tVar10Id = isTypeVar(tVar10) ? tVar10.id : 0;

    // Option.map: ((T) -> U, Option<T>) -> Option<U>
    env.set(
        "Option.map",
        polyScheme([tVar8Id, uVar2Id], funType([funType([tVar8], uVar2), optionType(tVar8)], optionType(uVar2))),
    );

    // Option.flatMap: ((T) -> Option<U>, Option<T>) -> Option<U>
    env.set(
        "Option.flatMap",
        polyScheme(
            [tVar9Id, uVar2Id],
            funType([funType([tVar9], optionType(uVar2)), optionType(tVar9)], optionType(uVar2)),
        ),
    );

    // Option.getOrElse: (T, Option<T>) -> T
    env.set("Option.getOrElse", polyScheme([tVar10Id], funType([tVar10, optionType(tVar10)], tVar10)));

    // Result functions (3)
    const tVar11 = freshTypeVar();
    const tVar11Id = isTypeVar(tVar11) ? tVar11.id : 0;
    const eVar2 = freshTypeVar();
    const eVar2Id = isTypeVar(eVar2) ? eVar2.id : 0;
    const uVar3 = freshTypeVar();
    const uVar3Id = isTypeVar(uVar3) ? uVar3.id : 0;
    const tVar12 = freshTypeVar();
    const tVar12Id = isTypeVar(tVar12) ? tVar12.id : 0;
    const eVar3 = freshTypeVar();
    const eVar3Id = isTypeVar(eVar3) ? eVar3.id : 0;
    const tVar13 = freshTypeVar();
    const tVar13Id = isTypeVar(tVar13) ? tVar13.id : 0;
    const eVar4 = freshTypeVar();
    const eVar4Id = isTypeVar(eVar4) ? eVar4.id : 0;

    // Result.map: ((T) -> U, Result<T, E>) -> Result<U, E>
    env.set(
        "Result.map",
        polyScheme(
            [tVar11Id, uVar3Id, eVar2Id],
            funType([funType([tVar11], uVar3), resultType(tVar11, eVar2)], resultType(uVar3, eVar2)),
        ),
    );

    // Result.flatMap: ((T) -> Result<U, E>, Result<T, E>) -> Result<U, E>
    env.set(
        "Result.flatMap",
        polyScheme(
            [tVar12Id, uVar3Id, eVar3Id],
            funType([funType([tVar12], resultType(uVar3, eVar3)), resultType(tVar12, eVar3)], resultType(uVar3, eVar3)),
        ),
    );

    // Result.isOk: (Result<T, E>) -> Bool
    env.set("Result.isOk", polyScheme([tVar13Id, eVar4Id], funType([resultType(tVar13, eVar4)], primitiveTypes.Bool)));

    // String functions (3)
    // String.length: (String) -> Int
    env.set("String.length", monoScheme(funType([primitiveTypes.String], primitiveTypes.Int)));

    // String.concat: (String, String) -> String
    env.set(
        "String.concat",
        monoScheme(funType([primitiveTypes.String, primitiveTypes.String], primitiveTypes.String)),
    );

    // String.fromInt: (Int) -> String
    env.set("String.fromInt", monoScheme(funType([primitiveTypes.Int], primitiveTypes.String)));

    // Int functions (2)
    // Int.toString: (Int) -> String
    env.set("Int.toString", monoScheme(funType([primitiveTypes.Int], primitiveTypes.String)));

    // Int.toFloat: (Int) -> Float
    env.set("Int.toFloat", monoScheme(funType([primitiveTypes.Int], primitiveTypes.Float)));

    // Float functions (2)
    // Float.toString: (Float) -> String
    env.set("Float.toString", monoScheme(funType([primitiveTypes.Float], primitiveTypes.String)));

    // Float.toInt: (Float) -> Int
    env.set("Float.toInt", monoScheme(funType([primitiveTypes.Float], primitiveTypes.Int)));

    // Special functions

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
