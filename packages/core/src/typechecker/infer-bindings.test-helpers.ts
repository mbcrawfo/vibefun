/**
 * Shared test helpers for infer-bindings test files.
 */

import type { TypeEnv } from "../types/environment.js";

import { getBuiltinEnv } from "./builtins.js";

export const testLoc = { file: "test.vf", line: 1, column: 1, offset: 0 };

export function createTestEnv(): TypeEnv {
    const builtins = getBuiltinEnv();
    const values = new Map();

    // Convert builtin type schemes to Value bindings
    for (const [name, scheme] of builtins.entries()) {
        values.set(name, {
            kind: "Value" as const,
            scheme,
            loc: { file: "<builtin>", line: 0, column: 0, offset: 0 },
        });
    }

    return {
        values,
        types: new Map(),
    };
}
