/**
 * Tests for desugarBlock function
 *
 * Note: Comprehensive integration tests for block desugaring exist in blocks.test.ts
 */

import type { Expr, Location, Pattern } from "../types/ast.js";
import type { CoreExpr, CorePattern } from "../types/core-ast.js";
import type { FreshVarGen } from "./FreshVarGen.js";

import { describe, expect, it } from "vitest";

import { desugarBlock } from "./desugarBlock.js";

const testLoc: Location = {
    file: "test.vf",
    line: 1,
    column: 1,
    offset: 0,
};

// Mock functions
const mockDesugar = (expr: Expr, _gen: FreshVarGen): CoreExpr => {
    if (expr.kind === "Var") {
        return { kind: "CoreVar", name: expr.name, loc: expr.loc };
    }
    if (expr.kind === "IntLit") {
        return { kind: "CoreIntLit", value: expr.value, loc: expr.loc };
    }
    throw new Error(`Unexpected expression kind: ${expr.kind}`);
};

const mockDesugarPattern = (pattern: Pattern, _gen: FreshVarGen): CorePattern => {
    if (pattern.kind === "VarPattern") {
        return { kind: "CoreVarPattern", name: pattern.name, loc: pattern.loc };
    }
    throw new Error(`Unexpected pattern kind: ${pattern.kind}`);
};

const mockGen = { fresh: () => "$tmp0", reset: () => {} } as FreshVarGen;

describe("desugarBlock", () => {
    it("should desugar empty block to CoreUnitLit", () => {
        const result = desugarBlock([], testLoc, mockGen, mockDesugar, mockDesugarPattern);

        expect(result.kind).toBe("CoreUnitLit");
        expect(result.loc).toBe(testLoc);
    });

    it("should desugar single expression block", () => {
        const exprs: Expr[] = [{ kind: "IntLit", value: 42, loc: testLoc }];

        const result = desugarBlock(exprs, testLoc, mockGen, mockDesugar, mockDesugarPattern);

        expect(result.kind).toBe("CoreIntLit");
        if (result.kind === "CoreIntLit") {
            expect(result.value).toBe(42);
        }
    });

    it("should desugar block with let binding", () => {
        const exprs: Expr[] = [
            {
                kind: "Let",
                recursive: false,
                pattern: { kind: "VarPattern", name: "x", loc: testLoc },
                value: { kind: "IntLit", value: 42, loc: testLoc },
                body: { kind: "Var", name: "x", loc: testLoc },
                mutable: false,
                loc: testLoc,
            },
            { kind: "Var", name: "x", loc: testLoc },
        ];

        const result = desugarBlock(exprs, testLoc, mockGen, mockDesugar, mockDesugarPattern);

        expect(result.kind).toBe("CoreLet");
        if (result.kind === "CoreLet") {
            expect(result.pattern.kind).toBe("CoreVarPattern");
            expect(result.value.kind).toBe("CoreIntLit");
            expect(result.body.kind).toBe("CoreVar");
        }
    });

    it("should wrap a non-let expression before the last in a wildcard let", () => {
        // `{ 1; 2 }` desugars to `let _ = 1 in 2` — the first expression
        // is evaluated for side effects and discarded.
        const exprs: Expr[] = [
            { kind: "IntLit", value: 1, loc: testLoc },
            { kind: "IntLit", value: 2, loc: testLoc },
        ];

        const result = desugarBlock(exprs, testLoc, mockGen, mockDesugar, mockDesugarPattern);
        expect(result.kind).toBe("CoreLet");
        if (result.kind === "CoreLet") {
            expect(result.pattern.kind).toBe("CoreWildcardPattern");
            expect(result.mutable).toBe(false);
            expect(result.value).toEqual({ kind: "CoreIntLit", value: 1, loc: testLoc });
            expect(result.body).toEqual({ kind: "CoreIntLit", value: 2, loc: testLoc });
        }
    });
});
