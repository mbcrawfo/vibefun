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
import { DesugarError } from "./DesugarError.js";

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
    it("should throw on empty block", () => {
        expect(() => desugarBlock([], testLoc, mockGen, mockDesugar, mockDesugarPattern)).toThrow(DesugarError);
        expect(() => desugarBlock([], testLoc, mockGen, mockDesugar, mockDesugarPattern)).toThrow("Empty block");
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
                pattern: { kind: "VarPattern", name: "x", loc: testLoc },
                value: { kind: "IntLit", value: 42, loc: testLoc },
                body: { kind: "Var", name: "x", loc: testLoc },
                mutable: false,
                recursive: false,
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

    it("should throw on non-let expression before last", () => {
        const exprs: Expr[] = [
            { kind: "IntLit", value: 1, loc: testLoc }, // Not a Let!
            { kind: "IntLit", value: 2, loc: testLoc },
        ];

        expect(() => desugarBlock(exprs, testLoc, mockGen, mockDesugar, mockDesugarPattern)).toThrow(DesugarError);
        expect(() => desugarBlock(exprs, testLoc, mockGen, mockDesugar, mockDesugarPattern)).toThrow(
            "Non-let expression in block",
        );
    });
});
