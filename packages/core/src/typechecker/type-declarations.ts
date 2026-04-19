/**
 * User-defined type declaration processing
 *
 * Registers type aliases, record types, and variant types declared in user
 * code. For variant types, also registers each constructor in the value
 * environment as a polymorphic type scheme — mirroring the built-in pattern
 * for `Cons`, `Some`, `Ok`, etc. in `./builtins.ts`.
 */

import type {
    CoreAliasType,
    CoreModule,
    CoreRecordTypeDef,
    CoreTypeDecl,
    CoreTypeExpr,
    CoreVariantTypeDef,
} from "../types/core-ast.js";
import type { Type, TypeEnv, TypeScheme, ValueBinding } from "../types/environment.js";

import { throwDiagnostic } from "../diagnostics/index.js";
import { convertTypeExpr } from "./infer/infer-primitives.js";
import { appType, constType, freshTypeVar, funType, isTypeVar } from "./types.js";

/**
 * Register all user-defined type declarations from the module into `env.types`
 * and, for variants, their constructors into `env.values`. This runs before
 * the main declaration loop so that constructors and aliases are visible to
 * let bindings regardless of declaration order.
 */
export function registerTypeDeclarations(module: CoreModule, env: TypeEnv): TypeEnv {
    const newEnv: TypeEnv = {
        values: new Map(env.values),
        types: new Map(env.types),
    };

    // Collect decls by name for the validation pass.
    const declsByName = new Map<string, CoreTypeDecl>();
    for (const decl of module.declarations) {
        if (decl.kind === "CoreTypeDecl") {
            declsByName.set(decl.name, decl);
        }
    }

    // Validate first (unguarded recursion rejection), using the raw module so
    // we can walk the CoreTypeExpr structures directly.
    for (const decl of declsByName.values()) {
        validateTypeDecl(decl, declsByName);
    }

    // Register.
    for (const decl of declsByName.values()) {
        registerTypeDecl(decl, newEnv);
    }

    return newEnv;
}

function registerTypeDecl(decl: CoreTypeDecl, env: TypeEnv): void {
    switch (decl.definition.kind) {
        case "CoreAliasType":
            registerAlias(decl, decl.definition, env);
            return;
        case "CoreRecordTypeDef":
            registerRecord(decl, decl.definition, env);
            return;
        case "CoreVariantTypeDef":
            registerVariant(decl, decl.definition, env);
            return;
    }
}

function registerAlias(decl: CoreTypeDecl, def: CoreAliasType, env: TypeEnv): void {
    const { typeParams, paramIds } = buildTypeParams(decl.params);
    const definition = convertTypeExpr(def.typeExpr, typeParams);
    env.types.set(decl.name, {
        kind: "Alias",
        params: decl.params,
        paramIds,
        definition,
        loc: decl.loc,
    });
}

function registerRecord(decl: CoreTypeDecl, def: CoreRecordTypeDef, env: TypeEnv): void {
    const { typeParams, paramIds } = buildTypeParams(decl.params);
    const fields = new Map<string, Type>();
    for (const field of def.fields) {
        fields.set(field.name, convertTypeExpr(field.typeExpr, typeParams));
    }
    env.types.set(decl.name, {
        kind: "Record",
        params: decl.params,
        paramIds,
        fields,
        loc: decl.loc,
    });
}

function registerVariant(decl: CoreTypeDecl, def: CoreVariantTypeDef, env: TypeEnv): void {
    const { typeParams, paramTypes, paramIds } = buildTypeParams(decl.params);

    const constructors = new Map<string, Type[]>();
    for (const ctor of def.constructors) {
        const argTypes = ctor.args.map((a) => convertTypeExpr(a, typeParams));
        constructors.set(ctor.name, argTypes);
    }

    env.types.set(decl.name, {
        kind: "Variant",
        params: decl.params,
        paramIds,
        constructors,
        loc: decl.loc,
    });

    // Return type for every constructor: the variant type applied to its
    // type parameters (e.g. `Color` or `Box<T>`).
    const returnType: Type = paramTypes.length === 0 ? constType(decl.name) : appType(constType(decl.name), paramTypes);

    for (const ctor of def.constructors) {
        const argTypes = constructors.get(ctor.name);
        if (!argTypes) {
            throw new Error(`Missing constructor arg types for ${ctor.name}`);
        }
        // Nullary constructors are values of the variant type (not zero-arg
        // functions). Constructors that take args are auto-curried functions
        // whose return type is the variant type applied to its params.
        const scheme: TypeScheme =
            argTypes.length === 0
                ? { vars: paramIds, type: returnType }
                : { vars: paramIds, type: funType(argTypes, returnType) };
        const binding: ValueBinding = {
            kind: "Value",
            scheme,
            loc: ctor.loc,
        };
        env.values.set(ctor.name, binding);
    }
}

function buildTypeParams(params: string[]): {
    typeParams: Map<string, Type>;
    paramTypes: Type[];
    paramIds: number[];
} {
    const typeParams = new Map<string, Type>();
    const paramTypes: Type[] = [];
    const paramIds: number[] = [];
    for (const name of params) {
        const tv = freshTypeVar();
        typeParams.set(name, tv);
        paramTypes.push(tv);
        if (isTypeVar(tv)) {
            paramIds.push(tv.id);
        }
    }
    return { typeParams, paramTypes, paramIds };
}

/**
 * Detect unguarded recursive type aliases (e.g. `type Bad = Bad;` or
 * `type Loop = (Int, Loop);`). Recursion through a Variant or Record
 * constructor body (i.e. inside a variant arg or record field) is *guarded*
 * and therefore allowed — that's how legitimately recursive types like
 * `List<T>` work.
 *
 * Validation only runs against aliases; record and variant declarations are
 * inherently guarded because their constructors introduce explicit syntax.
 */
function validateTypeDecl(decl: CoreTypeDecl, allDecls: Map<string, CoreTypeDecl>): void {
    if (decl.definition.kind !== "CoreAliasType") {
        return;
    }
    const visiting = new Set<string>([decl.name]);
    if (referencesNameUnguarded(decl.definition.typeExpr, decl.name, allDecls, visiting)) {
        throwDiagnostic("VF4027", decl.loc, { name: decl.name });
    }
}

function referencesNameUnguarded(
    expr: CoreTypeExpr,
    target: string,
    allDecls: Map<string, CoreTypeDecl>,
    visiting: Set<string>,
): boolean {
    switch (expr.kind) {
        case "CoreTypeConst": {
            if (expr.name === target) {
                return true;
            }
            if (visiting.has(expr.name)) {
                // Cyclic alias chain that routes back through `target` — if
                // target itself isn't the cycle seed, that's another decl's
                // problem (it will flag itself when validated).
                return false;
            }
            const nextDecl = allDecls.get(expr.name);
            if (nextDecl && nextDecl.definition.kind === "CoreAliasType") {
                visiting.add(expr.name);
                const result = referencesNameUnguarded(nextDecl.definition.typeExpr, target, allDecls, visiting);
                visiting.delete(expr.name);
                return result;
            }
            return false;
        }
        case "CoreTypeVar":
            return false;
        case "CoreTypeApp":
            if (referencesNameUnguarded(expr.constructor, target, allDecls, visiting)) {
                return true;
            }
            return expr.args.some((a) => referencesNameUnguarded(a, target, allDecls, visiting));
        case "CoreFunctionType":
            // Function-type bodies are lazy w.r.t. recursion (application
            // forces evaluation), so recursion through them is considered
            // guarded.
            return false;
        case "CoreRecordType":
            // Inline record types in an alias body are guarded (field access
            // is the guard).
            return false;
        case "CoreVariantType":
            // Inline variant types are guarded (construction is the guard).
            return false;
        case "CoreUnionType":
            return expr.types.some((t) => referencesNameUnguarded(t, target, allDecls, visiting));
        case "CoreTupleType":
            return expr.elements.some((e) => referencesNameUnguarded(e, target, allDecls, visiting));
    }
}
