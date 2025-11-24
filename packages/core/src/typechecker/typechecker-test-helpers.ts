/**
 * Shared test utilities for typechecker tests
 */

import type { Location } from "../types/ast.js";
import type { CoreDeclaration, CoreModule } from "../types/core-ast.js";

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
