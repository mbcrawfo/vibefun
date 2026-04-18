/**
 * Math module signature (phase 2.3 subset).
 *
 * Matches the Phase 2.1 runtime subset. Phase 2.7 fills out the full
 * spec (trig, log/exp, constants pi/e, etc.).
 */

import type { Type, TypeScheme } from "../../../types/environment.js";

import { moduleType, primitiveTypes } from "../../types.js";
import { curriedFun, monoScheme } from "../scheme-builders.js";

export const MATH_MODULE_PATH = "@vibefun/std#Math";

export function getMathModuleSignature(): Type {
    const { Float } = primitiveTypes;
    const exports = new Map<string, TypeScheme>();

    exports.set("sqrt", monoScheme(curriedFun([Float], Float)));
    exports.set("floor", monoScheme(curriedFun([Float], Float)));
    exports.set("ceil", monoScheme(curriedFun([Float], Float)));
    exports.set("abs", monoScheme(curriedFun([Float], Float)));

    return moduleType(MATH_MODULE_PATH, exports);
}
