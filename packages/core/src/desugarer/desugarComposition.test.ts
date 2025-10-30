/**
 * Tests for desugarComposition
 *
 * Note: Comprehensive integration tests exist in composition.test.ts
 */

import type { Expr, Location } from "../types/ast.js";
import type { CoreExpr } from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { desugarComposition } from "./desugarComposition.js";
import { FreshVarGen } from "./FreshVarGen.js";

const testLoc: Location = {
    file: "test.vf",
    line: 1,
    column: 1,
    offset: 0,
};

const mockDesugar = (expr: Expr, _gen: import("./FreshVarGen.js").FreshVarGen): CoreExpr => {
    if (expr.kind === "Var") {
        return { kind: "CoreVar", name: expr.name, loc: expr.loc };
    }
    throw new Error(`Unexpected expression kind: ${expr.kind}`);
};

describe("desugarComposition", () => {
    it("should desugar forward composition", () => {
        const left: Expr = { kind: "Var", name: "f", loc: testLoc };
        const right: Expr = { kind: "Var", name: "g", loc: testLoc };
        const gen = new FreshVarGen();

        const result = desugarComposition("ForwardCompose", left, right, testLoc, gen, mockDesugar);

        expect(result.kind).toBe("CoreLambda");
    });

    it("should desugar backward composition", () => {
        const left: Expr = { kind: "Var", name: "f", loc: testLoc };
        const right: Expr = { kind: "Var", name: "g", loc: testLoc };
        const gen = new FreshVarGen();

        const result = desugarComposition("BackwardCompose", left, right, testLoc, gen, mockDesugar);

        expect(result.kind).toBe("CoreLambda");
    });
});
