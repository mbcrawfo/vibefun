/**
 * Shared test utilities for typechecker tests
 */

import type { Location } from "../types/ast.js";
import type { CoreDeclaration, CoreModule } from "../types/core-ast.js";
import type { TypeEnv } from "../types/environment.js";

import { getBuiltinEnv } from "./builtins.js";

// Helper to create a test location
export const testLoc: Location = {
    file: "test.vf",
    line: 1,
    column: 1,
    offset: 0,
};

// Helper to create a simple module
export function createModule(declarations: CoreDeclaration[]): CoreModule {
    return {
        declarations,
        imports: [],
        loc: testLoc,
    };
}

// Helper to seed a TypeEnv with the builtin schemes wrapped as Value bindings.
// Used by the infer-bindings test files.
export function createTestEnv(): TypeEnv {
    const builtins = getBuiltinEnv();
    const values: TypeEnv["values"] = new Map();

    for (const [name, scheme] of builtins.entries()) {
        values.set(name, {
            kind: "Value" as const,
            scheme,
            loc: { file: "<builtin>", line: 0, column: 0, offset: 0 },
        });
    }

    const types: TypeEnv["types"] = new Map();
    return { values, types };
}
