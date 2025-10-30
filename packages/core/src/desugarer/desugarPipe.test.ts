/**
 * Tests for desugarPipe function
 *
 * Note: Comprehensive integration tests for pipe desugaring exist in pipes.test.ts
 * These tests verify the desugarPipe function directly.
 */

import type { Expr, Location } from "../types/ast.js";
import type { CoreExpr } from "../types/core-ast.js";
import type { FreshVarGen } from "./FreshVarGen.js";

import { describe, expect, it } from "vitest";

import { desugarPipe } from "./desugarPipe.js";

const testLoc: Location = {
    file: "test.vf",
    line: 1,
    column: 1,
    offset: 0,
};

// Mock desugar function for testing
const mockDesugar = (expr: Expr, _gen: FreshVarGen): CoreExpr => {
    if (expr.kind === "Var") {
        return { kind: "CoreVar", name: expr.name, loc: expr.loc };
    }
    if (expr.kind === "IntLit") {
        return { kind: "CoreIntLit", value: expr.value, loc: expr.loc };
    }
    throw new Error(`Unexpected expression kind: ${expr.kind}`);
};

// Mock FreshVarGen
const mockGen = { fresh: () => "$tmp0", reset: () => {} } as FreshVarGen;

describe("desugarPipe", () => {
    it("should transform pipe into function application", () => {
        const data: Expr = { kind: "Var", name: "data", loc: testLoc };
        const func: Expr = { kind: "Var", name: "f", loc: testLoc };

        const result = desugarPipe(data, func, testLoc, mockGen, mockDesugar);

        expect(result.kind).toBe("CoreApp");
        if (result.kind === "CoreApp") {
            expect(result.func.kind).toBe("CoreVar");
            if (result.func.kind === "CoreVar") {
                expect(result.func.name).toBe("f");
            }
            expect(result.args).toHaveLength(1);
            const arg = result.args[0];
            expect(arg?.kind).toBe("CoreVar");
            if (arg?.kind === "CoreVar") {
                expect(arg.name).toBe("data");
            }
        }
    });

    it("should work with literals", () => {
        const data: Expr = { kind: "IntLit", value: 42, loc: testLoc };
        const func: Expr = { kind: "Var", name: "f", loc: testLoc };

        const result = desugarPipe(data, func, testLoc, mockGen, mockDesugar);

        expect(result.kind).toBe("CoreApp");
        if (result.kind === "CoreApp") {
            const arg = result.args[0];
            expect(arg?.kind).toBe("CoreIntLit");
            if (arg?.kind === "CoreIntLit") {
                expect(arg.value).toBe(42);
            }
        }
    });
});
