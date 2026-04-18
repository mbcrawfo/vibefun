/**
 * Int module signature — matches docs/spec/11-stdlib/numeric.md.
 */

import type { Type, TypeScheme } from "../../../types/environment.js";

import { moduleType, primitiveTypes } from "../../types.js";
import { curriedFun, monoScheme } from "../scheme-builders.js";

export const INT_MODULE_PATH = "@vibefun/std#Int";

export function getIntModuleSignature(): Type {
    const { Int, Float, String } = primitiveTypes;
    const exports = new Map<string, TypeScheme>();

    exports.set("toString", monoScheme(curriedFun([Int], String)));
    exports.set("toFloat", monoScheme(curriedFun([Int], Float)));
    exports.set("abs", monoScheme(curriedFun([Int], Int)));
    exports.set("max", monoScheme(curriedFun([Int, Int], Int)));
    exports.set("min", monoScheme(curriedFun([Int, Int], Int)));

    return moduleType(INT_MODULE_PATH, exports);
}
