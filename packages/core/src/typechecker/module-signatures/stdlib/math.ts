/**
 * Math module signature.
 *
 * Matches docs/spec/11-stdlib/math.md. Constants are monomorphic Float
 * schemes; functions are monomorphic curried Float arities. `random` is
 * `Unit -> Float` — impure, meant to be called inside an `unsafe` block.
 */

import type { Type, TypeScheme } from "../../../types/environment.js";

import { moduleType, primitiveTypes } from "../../types.js";
import { curriedFun, monoScheme } from "../scheme-builders.js";

export const MATH_MODULE_PATH = "@vibefun/std#Math";

export function getMathModuleSignature(): Type {
    const { Float, Unit } = primitiveTypes;
    const exports = new Map<string, TypeScheme>();

    // Constants
    exports.set("pi", monoScheme(Float));
    exports.set("e", monoScheme(Float));

    // Trigonometry
    exports.set("sin", monoScheme(curriedFun([Float], Float)));
    exports.set("cos", monoScheme(curriedFun([Float], Float)));
    exports.set("tan", monoScheme(curriedFun([Float], Float)));
    exports.set("asin", monoScheme(curriedFun([Float], Float)));
    exports.set("acos", monoScheme(curriedFun([Float], Float)));
    exports.set("atan", monoScheme(curriedFun([Float], Float)));
    exports.set("atan2", monoScheme(curriedFun([Float, Float], Float)));

    // Exponential / logarithmic
    exports.set("exp", monoScheme(curriedFun([Float], Float)));
    exports.set("log", monoScheme(curriedFun([Float], Float)));
    exports.set("log10", monoScheme(curriedFun([Float], Float)));
    exports.set("log2", monoScheme(curriedFun([Float], Float)));
    exports.set("pow", monoScheme(curriedFun([Float, Float], Float)));
    exports.set("sqrt", monoScheme(curriedFun([Float], Float)));

    // Rounding (Float → Float per spec)
    exports.set("round", monoScheme(curriedFun([Float], Float)));
    exports.set("floor", monoScheme(curriedFun([Float], Float)));
    exports.set("ceil", monoScheme(curriedFun([Float], Float)));
    exports.set("trunc", monoScheme(curriedFun([Float], Float)));

    // Utility
    exports.set("abs", monoScheme(curriedFun([Float], Float)));
    exports.set("sign", monoScheme(curriedFun([Float], Float)));
    exports.set("min", monoScheme(curriedFun([Float, Float], Float)));
    exports.set("max", monoScheme(curriedFun([Float, Float], Float)));

    // Impure — callable only inside `unsafe { … }`.
    exports.set("random", monoScheme(curriedFun([Unit], Float)));

    return moduleType(MATH_MODULE_PATH, exports);
}
