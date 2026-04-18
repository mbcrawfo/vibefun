/**
 * Float module signature — matches docs/spec/11-stdlib/numeric.md.
 */

import type { Type, TypeScheme } from "../../../types/environment.js";

import { moduleType, primitiveTypes } from "../../types.js";
import { curriedFun, monoScheme } from "../scheme-builders.js";

export const FLOAT_MODULE_PATH = "@vibefun/std#Float";

export function getFloatModuleSignature(): Type {
    const { Int, Float, String } = primitiveTypes;
    const exports = new Map<string, TypeScheme>();

    exports.set("toString", monoScheme(curriedFun([Float], String)));
    exports.set("toInt", monoScheme(curriedFun([Float], Int)));
    exports.set("round", monoScheme(curriedFun([Float], Int)));
    exports.set("floor", monoScheme(curriedFun([Float], Int)));
    exports.set("ceil", monoScheme(curriedFun([Float], Int)));
    exports.set("abs", monoScheme(curriedFun([Float], Float)));
    exports.set("isNaN", monoScheme(curriedFun([Float], primitiveTypes.Bool)));
    exports.set("isInfinite", monoScheme(curriedFun([Float], primitiveTypes.Bool)));
    exports.set("isFinite", monoScheme(curriedFun([Float], primitiveTypes.Bool)));

    return moduleType(FLOAT_MODULE_PATH, exports);
}
