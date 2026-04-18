/**
 * String module signature — matches docs/spec/11-stdlib/string.md.
 */

import type { Type, TypeScheme } from "../../../types/environment.js";

import { moduleType, primitiveTypes } from "../../types.js";
import { curriedFun, listType, monoScheme, optionType } from "../scheme-builders.js";

export const STRING_MODULE_PATH = "@vibefun/std#String";

export function getStringModuleSignature(): Type {
    const { String, Int, Float, Bool } = primitiveTypes;
    const exports = new Map<string, TypeScheme>();

    exports.set("length", monoScheme(curriedFun([String], Int)));
    exports.set("concat", monoScheme(curriedFun([String, String], String)));
    exports.set("fromInt", monoScheme(curriedFun([Int], String)));
    exports.set("fromFloat", monoScheme(curriedFun([Float], String)));
    exports.set("fromBool", monoScheme(curriedFun([Bool], String)));
    exports.set("toUpperCase", monoScheme(curriedFun([String], String)));
    exports.set("toLowerCase", monoScheme(curriedFun([String], String)));
    exports.set("trim", monoScheme(curriedFun([String], String)));
    exports.set("split", monoScheme(curriedFun([String, String], listType(String))));
    exports.set("contains", monoScheme(curriedFun([String, String], Bool)));
    exports.set("startsWith", monoScheme(curriedFun([String, String], Bool)));
    exports.set("endsWith", monoScheme(curriedFun([String, String], Bool)));
    exports.set("toInt", monoScheme(curriedFun([String], optionType(Int))));
    exports.set("toFloat", monoScheme(curriedFun([String], optionType(Float))));

    return moduleType(STRING_MODULE_PATH, exports);
}
