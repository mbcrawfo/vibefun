/**
 * Scheme-building helpers shared by every stdlib module signature.
 *
 * The typechecker sees only curried single-argument CoreApp nodes (phase 1.2
 * multi-argument desugaring). Every stdlib function's type scheme therefore
 * needs to be a chain of single-parameter `Fun` types: `a -> b -> c -> r`.
 * `curriedFun` builds that chain without nesting noise at call sites.
 */

import type { Type, TypeScheme } from "../../types/environment.js";

import { appType, constType, freshTypeVar, funType, isTypeVar } from "../types.js";

export type FreshVar = { var: Type; id: number };

/**
 * Allocate a fresh type variable and return both the type and its numeric id
 * so the signature author can include the id in a scheme's `vars` list.
 */
export function freshVar(): FreshVar {
    const v = freshTypeVar();
    if (!isTypeVar(v)) {
        throw new Error("freshTypeVar() contract violated: expected a type variable");
    }
    return { var: v, id: v.id };
}

/**
 * Build a curried function type. `curriedFun([a, b, c], r)` produces
 * `a -> b -> c -> r`, i.e. `Fun([a], Fun([b], Fun([c], r)))`.
 */
export function curriedFun(params: Type[], ret: Type): Type {
    if (params.length === 0) return ret;
    let result = ret;
    for (let i = params.length - 1; i >= 0; i--) {
        const param = params[i];
        if (param === undefined) {
            throw new Error("curriedFun() received a sparse parameter list");
        }
        result = funType([param], result);
    }
    return result;
}

export function scheme(vars: number[], type: Type): TypeScheme {
    return { vars, type };
}

export function monoScheme(type: Type): TypeScheme {
    return { vars: [], type };
}

export function listType(t: Type): Type {
    return appType(constType("List"), [t]);
}

export function optionType(t: Type): Type {
    return appType(constType("Option"), [t]);
}

export function resultType(t: Type, e: Type): Type {
    return appType(constType("Result"), [t, e]);
}
