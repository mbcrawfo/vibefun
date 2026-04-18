/**
 * Option module signature — matches docs/spec/11-stdlib/option.md.
 */

import type { Type, TypeScheme } from "../../../types/environment.js";

import { moduleType, primitiveTypes } from "../../types.js";
import { curriedFun, freshVar, optionType, scheme } from "../scheme-builders.js";

export const OPTION_MODULE_PATH = "@vibefun/std#Option";

export function getOptionModuleSignature(): Type {
    const exports = new Map<string, TypeScheme>();

    // map: forall a b. Option<a> -> (a -> b) -> Option<b>
    {
        const a = freshVar();
        const b = freshVar();
        exports.set(
            "map",
            scheme([a.id, b.id], curriedFun([optionType(a.var), curriedFun([a.var], b.var)], optionType(b.var))),
        );
    }

    // flatMap: forall a b. Option<a> -> (a -> Option<b>) -> Option<b>
    {
        const a = freshVar();
        const b = freshVar();
        exports.set(
            "flatMap",
            scheme(
                [a.id, b.id],
                curriedFun([optionType(a.var), curriedFun([a.var], optionType(b.var))], optionType(b.var)),
            ),
        );
    }

    // getOrElse: forall a. Option<a> -> a -> a
    {
        const a = freshVar();
        exports.set("getOrElse", scheme([a.id], curriedFun([optionType(a.var), a.var], a.var)));
    }

    // isSome: forall a. Option<a> -> Bool
    {
        const a = freshVar();
        exports.set("isSome", scheme([a.id], curriedFun([optionType(a.var)], primitiveTypes.Bool)));
    }

    // isNone: forall a. Option<a> -> Bool
    {
        const a = freshVar();
        exports.set("isNone", scheme([a.id], curriedFun([optionType(a.var)], primitiveTypes.Bool)));
    }

    // unwrap: forall a. Option<a> -> a
    {
        const a = freshVar();
        exports.set("unwrap", scheme([a.id], curriedFun([optionType(a.var)], a.var)));
    }

    return moduleType(OPTION_MODULE_PATH, exports);
}
