/**
 * Tests for curryLambda function
 *
 * Note: Comprehensive integration tests exist in lambdas.test.ts
 */

import type { Expr, Location, Pattern } from "../types/ast.js";
import type { CoreExpr, CorePattern } from "../types/core-ast.js";
import type { FreshVarGen } from "./FreshVarGen.js";

import { describe, expect, it } from "vitest";

import { curryLambda } from "./curryLambda.js";

const testLoc: Location = {
    file: "test.vf",
    line: 1,
    column: 1,
    offset: 0,
};

const mockDesugar = (expr: Expr, _gen: FreshVarGen): CoreExpr => {
    if (expr.kind === "Var") {
        return { kind: "CoreVar", name: expr.name, loc: expr.loc };
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

describe("curryLambda", () => {
    it("should throw on zero parameters", () => {
        const body: Expr = { kind: "Var", name: "x", loc: testLoc };
        expect(() => curryLambda([], body, testLoc, mockGen, mockDesugar, mockDesugarPattern)).toThrow(
            "Lambda with zero parameters",
        );
    });

    it("should desugar single parameter lambda", () => {
        const params: Pattern[] = [{ kind: "VarPattern", name: "x", loc: testLoc }];
        const body: Expr = { kind: "Var", name: "x", loc: testLoc };

        const result = curryLambda(params, body, testLoc, mockGen, mockDesugar, mockDesugarPattern);

        expect(result.kind).toBe("CoreLambda");
        if (result.kind === "CoreLambda") {
            expect(result.param.kind).toBe("CoreVarPattern");
            expect(result.body.kind).toBe("CoreVar");
        }
    });

    it("should curry two parameter lambda", () => {
        const params: Pattern[] = [
            { kind: "VarPattern", name: "x", loc: testLoc },
            { kind: "VarPattern", name: "y", loc: testLoc },
        ];
        const body: Expr = { kind: "Var", name: "x", loc: testLoc };

        const result = curryLambda(params, body, testLoc, mockGen, mockDesugar, mockDesugarPattern);

        expect(result.kind).toBe("CoreLambda");
        if (result.kind === "CoreLambda") {
            expect(result.param.kind).toBe("CoreVarPattern");
            if (result.param.kind === "CoreVarPattern") {
                expect(result.param.name).toBe("x");
            }
            expect(result.body.kind).toBe("CoreLambda");
            if (result.body.kind === "CoreLambda") {
                expect(result.body.param.kind).toBe("CoreVarPattern");
                if (result.body.param.kind === "CoreVarPattern") {
                    expect(result.body.param.name).toBe("y");
                }
            }
        }
    });
});
