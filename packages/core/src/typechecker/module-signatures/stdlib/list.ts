/**
 * List module signature — typechecker view of @vibefun/std's List module.
 *
 * All functions are curried and data-first per docs/spec/11-stdlib/list.md,
 * matching the TS runtime in packages/stdlib/src/list.ts.
 */

import type { Type, TypeScheme } from "../../../types/environment.js";

import { moduleType, primitiveTypes } from "../../types.js";
import { curriedFun, freshVar, listType, optionType, scheme } from "../scheme-builders.js";

export const LIST_MODULE_PATH = "@vibefun/std#List";

export function getListModuleSignature(): Type {
    const exports = new Map<string, TypeScheme>();

    // map: forall a b. List<a> -> (a -> b) -> List<b>
    {
        const a = freshVar();
        const b = freshVar();
        exports.set(
            "map",
            scheme([a.id, b.id], curriedFun([listType(a.var), curriedFun([a.var], b.var)], listType(b.var))),
        );
    }

    // filter: forall a. List<a> -> (a -> Bool) -> List<a>
    {
        const a = freshVar();
        exports.set(
            "filter",
            scheme([a.id], curriedFun([listType(a.var), curriedFun([a.var], primitiveTypes.Bool)], listType(a.var))),
        );
    }

    // fold: forall a b. List<a> -> b -> (b -> a -> b) -> b
    {
        const a = freshVar();
        const b = freshVar();
        exports.set(
            "fold",
            scheme([a.id, b.id], curriedFun([listType(a.var), b.var, curriedFun([b.var, a.var], b.var)], b.var)),
        );
    }

    // foldRight: forall a b. List<a> -> b -> (a -> b -> b) -> b
    {
        const a = freshVar();
        const b = freshVar();
        exports.set(
            "foldRight",
            scheme([a.id, b.id], curriedFun([listType(a.var), b.var, curriedFun([a.var, b.var], b.var)], b.var)),
        );
    }

    // length: forall a. List<a> -> Int
    {
        const a = freshVar();
        exports.set("length", scheme([a.id], curriedFun([listType(a.var)], primitiveTypes.Int)));
    }

    // head: forall a. List<a> -> Option<a>
    {
        const a = freshVar();
        exports.set("head", scheme([a.id], curriedFun([listType(a.var)], optionType(a.var))));
    }

    // tail: forall a. List<a> -> Option<List<a>>
    {
        const a = freshVar();
        exports.set("tail", scheme([a.id], curriedFun([listType(a.var)], optionType(listType(a.var)))));
    }

    // reverse: forall a. List<a> -> List<a>
    {
        const a = freshVar();
        exports.set("reverse", scheme([a.id], curriedFun([listType(a.var)], listType(a.var))));
    }

    // concat: forall a. List<a> -> List<a> -> List<a>
    {
        const a = freshVar();
        exports.set("concat", scheme([a.id], curriedFun([listType(a.var), listType(a.var)], listType(a.var))));
    }

    // flatten: forall a. List<List<a>> -> List<a>
    {
        const a = freshVar();
        exports.set("flatten", scheme([a.id], curriedFun([listType(listType(a.var))], listType(a.var))));
    }

    return moduleType(LIST_MODULE_PATH, exports);
}
