/**
 * Module signature registry.
 *
 * The typechecker-side view of every stdlib module. For each module name, the
 * registry returns a fresh `TModule` carrying the module's curried, data-first
 * field schemes. Fresh type variables are allocated per-call so instantiation
 * at each import site doesn't alias into shared state.
 *
 * The `@vibefun/std` package is the only path currently served. User-module
 * signatures (derived from compiled .vf output) will land in phase 2.9 when
 * the multi-file CLI pipeline comes online.
 */

import type { Type, TypeScheme } from "../../types/environment.js";

import { moduleType } from "../types.js";
import { monoScheme } from "./scheme-builders.js";
import { getFloatModuleSignature } from "./stdlib/float.js";
import { getIntModuleSignature } from "./stdlib/int.js";
import { getListModuleSignature } from "./stdlib/list.js";
import { getMathModuleSignature } from "./stdlib/math.js";
import { getOptionModuleSignature } from "./stdlib/option.js";
import { getResultModuleSignature } from "./stdlib/result.js";
import { getStringModuleSignature } from "./stdlib/string.js";

export const STDLIB_PACKAGE = "@vibefun/std";
export const STDLIB_ROOT_PATH = "@vibefun/std#__std__";

type StdlibModuleBuilder = () => Type;

const STDLIB_MODULES: Record<string, StdlibModuleBuilder> = {
    String: getStringModuleSignature,
    List: getListModuleSignature,
    Option: getOptionModuleSignature,
    Result: getResultModuleSignature,
    Int: getIntModuleSignature,
    Float: getFloatModuleSignature,
    Math: getMathModuleSignature,
};

/**
 * All stdlib module names that can be imported by name from @vibefun/std.
 */
export function getStdlibModuleNames(): string[] {
    return Object.keys(STDLIB_MODULES);
}

/**
 * Get the signature for a specific stdlib module by name.
 *
 * Returns null for unknown module names so callers can surface a user-facing
 * diagnostic (VF4701) instead of the caller having to special-case missing
 * entries.
 */
export function getStdlibModuleSignature(name: string): Type | null {
    const builder = Object.hasOwn(STDLIB_MODULES, name) ? STDLIB_MODULES[name] : undefined;
    return builder ? builder() : null;
}

/**
 * Get the compiler-reserved `__std__` root module. Its exports are one field
 * per stdlib module, each bound to a monomorphic scheme wrapping that module's
 * `TModule`. The codegen wires this to `import { __std__ } from "@vibefun/std"`
 * whenever the desugarer has synthesized references like `__std__.List.concat`
 * (phase 2.5).
 */
export function getStdlibRootSignature(): Type {
    const exports = new Map<string, TypeScheme>();
    for (const name of getStdlibModuleNames()) {
        const moduleSig = getStdlibModuleSignature(name);
        if (moduleSig !== null) {
            exports.set(name, monoScheme(moduleSig));
        }
    }
    return moduleType(STDLIB_ROOT_PATH, exports);
}
