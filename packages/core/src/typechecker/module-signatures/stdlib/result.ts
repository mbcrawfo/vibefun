/**
 * Result module signature — matches docs/spec/11-stdlib/result.md.
 */

import type { Type, TypeScheme } from "../../../types/environment.js";

import { moduleType, primitiveTypes } from "../../types.js";
import { curriedFun, freshVar, resultType, scheme } from "../scheme-builders.js";

export const RESULT_MODULE_PATH = "@vibefun/std#Result";

export function getResultModuleSignature(): Type {
    const exports = new Map<string, TypeScheme>();

    // map: forall t e u. Result<t, e> -> (t -> u) -> Result<u, e>
    {
        const t = freshVar();
        const e = freshVar();
        const u = freshVar();
        exports.set(
            "map",
            scheme(
                [t.id, e.id, u.id],
                curriedFun([resultType(t.var, e.var), curriedFun([t.var], u.var)], resultType(u.var, e.var)),
            ),
        );
    }

    // flatMap: forall t e u. Result<t, e> -> (t -> Result<u, e>) -> Result<u, e>
    {
        const t = freshVar();
        const e = freshVar();
        const u = freshVar();
        exports.set(
            "flatMap",
            scheme(
                [t.id, e.id, u.id],
                curriedFun(
                    [resultType(t.var, e.var), curriedFun([t.var], resultType(u.var, e.var))],
                    resultType(u.var, e.var),
                ),
            ),
        );
    }

    // mapErr: forall t e f. Result<t, e> -> (e -> f) -> Result<t, f>
    {
        const t = freshVar();
        const e = freshVar();
        const f = freshVar();
        exports.set(
            "mapErr",
            scheme(
                [t.id, e.id, f.id],
                curriedFun([resultType(t.var, e.var), curriedFun([e.var], f.var)], resultType(t.var, f.var)),
            ),
        );
    }

    // isOk: forall t e. Result<t, e> -> Bool
    {
        const t = freshVar();
        const e = freshVar();
        exports.set("isOk", scheme([t.id, e.id], curriedFun([resultType(t.var, e.var)], primitiveTypes.Bool)));
    }

    // isErr: forall t e. Result<t, e> -> Bool
    {
        const t = freshVar();
        const e = freshVar();
        exports.set("isErr", scheme([t.id, e.id], curriedFun([resultType(t.var, e.var)], primitiveTypes.Bool)));
    }

    // unwrap: forall t e. Result<t, e> -> t
    {
        const t = freshVar();
        const e = freshVar();
        exports.set("unwrap", scheme([t.id, e.id], curriedFun([resultType(t.var, e.var)], t.var)));
    }

    // unwrapOr: forall t e. Result<t, e> -> t -> t
    {
        const t = freshVar();
        const e = freshVar();
        exports.set("unwrapOr", scheme([t.id, e.id], curriedFun([resultType(t.var, e.var), t.var], t.var)));
    }

    return moduleType(RESULT_MODULE_PATH, exports);
}
