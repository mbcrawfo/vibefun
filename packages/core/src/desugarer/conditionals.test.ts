/**
 * Tests for if-then-else desugaring
 *
 * If-then-else is desugared to match on boolean:
 * if cond then a else b => match cond { | true => a | false => b }
 */

import type { Expr, Location } from "../types/ast.js";
import type {
    CoreApp,
    CoreBinOp,
    CoreBoolLit,
    CoreIntLit,
    CoreLambda,
    CoreLet,
    CoreLiteralPattern,
    CoreMatch,
    CoreVar,
} from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { desugar } from "./desugarer.js";

const testLoc: Location = {
    file: "test.vf",
    line: 1,
    column: 1,
    offset: 0,
};

describe("If-Then-Else - Basic Cases", () => {
    it("should desugar simple if-then-else", () => {
        // if true then 1 else 2
        const ifExpr: Expr = {
            kind: "If",
            condition: { kind: "BoolLit", value: true, loc: testLoc },
            then: { kind: "IntLit", value: 1, loc: testLoc },
            else_: { kind: "IntLit", value: 2, loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(ifExpr);

        // Should become: match true { | true => 1 | false => 2 }
        expect(result.kind).toBe("CoreMatch");
        const match = result as CoreMatch;
        const matchExpr = match.expr as CoreBoolLit;
        expect(matchExpr.kind).toBe("CoreBoolLit");
        expect(matchExpr.value).toBe(true);
        expect(match.cases).toHaveLength(2);

        // True case
        const trueCase = match.cases[0]!;
        const truePat = trueCase.pattern as CoreLiteralPattern;
        expect(truePat.kind).toBe("CoreLiteralPattern");
        expect(truePat.literal).toBe(true);
        const trueBody = trueCase.body as CoreIntLit;
        expect(trueBody.kind).toBe("CoreIntLit");
        expect(trueBody.value).toBe(1);

        // False case
        const falseCase = match.cases[1]!;
        const falsePat = falseCase.pattern as CoreLiteralPattern;
        expect(falsePat.kind).toBe("CoreLiteralPattern");
        expect(falsePat.literal).toBe(false);
        const falseBody = falseCase.body as CoreIntLit;
        expect(falseBody.kind).toBe("CoreIntLit");
        expect(falseBody.value).toBe(2);
    });

    it("should desugar if with variable condition", () => {
        // if cond then "yes" else "no"
        const ifExpr: Expr = {
            kind: "If",
            condition: { kind: "Var", name: "cond", loc: testLoc },
            then: { kind: "StringLit", value: "yes", loc: testLoc },
            else_: { kind: "StringLit", value: "no", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(ifExpr);

        expect(result.kind).toBe("CoreMatch");
        const match = result as CoreMatch;
        const matchExpr = match.expr as CoreVar;
        expect(matchExpr.kind).toBe("CoreVar");
        expect(matchExpr.name).toBe("cond");
    });

    it("should desugar if with comparison condition", () => {
        // if x > 0 then "positive" else "non-positive"
        const ifExpr: Expr = {
            kind: "If",
            condition: {
                kind: "BinOp",
                op: "GreaterThan",
                left: { kind: "Var", name: "x", loc: testLoc },
                right: { kind: "IntLit", value: 0, loc: testLoc },
                loc: testLoc,
            },
            then: { kind: "StringLit", value: "positive", loc: testLoc },
            else_: { kind: "StringLit", value: "non-positive", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(ifExpr);

        expect(result.kind).toBe("CoreMatch");
        const match = result as CoreMatch;
        const matchExpr = match.expr as CoreBinOp;
        expect(matchExpr.kind).toBe("CoreBinOp");
        expect(matchExpr.op).toBe("GreaterThan");
    });
});

describe("If-Then-Else - Nested If", () => {
    it("should desugar nested if in then branch", () => {
        // if a then (if b then 1 else 2) else 3
        const innerIf: Expr = {
            kind: "If",
            condition: { kind: "Var", name: "b", loc: testLoc },
            then: { kind: "IntLit", value: 1, loc: testLoc },
            else_: { kind: "IntLit", value: 2, loc: testLoc },
            loc: testLoc,
        };

        const outerIf: Expr = {
            kind: "If",
            condition: { kind: "Var", name: "a", loc: testLoc },
            then: innerIf,
            else_: { kind: "IntLit", value: 3, loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(outerIf);

        // Outer should be match
        expect(result.kind).toBe("CoreMatch");
        const match = result as CoreMatch;
        const matchExpr = match.expr as CoreVar;
        expect(matchExpr.name).toBe("a");

        // Then branch should be another match
        const thenBranch = match.cases[0]!.body as CoreMatch;
        expect(thenBranch.kind).toBe("CoreMatch");
        const thenExpr = thenBranch.expr as CoreVar;
        expect(thenExpr.name).toBe("b");
    });

    it("should desugar nested if in else branch", () => {
        // if a then 1 else (if b then 2 else 3)
        const innerIf: Expr = {
            kind: "If",
            condition: { kind: "Var", name: "b", loc: testLoc },
            then: { kind: "IntLit", value: 2, loc: testLoc },
            else_: { kind: "IntLit", value: 3, loc: testLoc },
            loc: testLoc,
        };

        const outerIf: Expr = {
            kind: "If",
            condition: { kind: "Var", name: "a", loc: testLoc },
            then: { kind: "IntLit", value: 1, loc: testLoc },
            else_: innerIf,
            loc: testLoc,
        };

        const result = desugar(outerIf);

        expect(result.kind).toBe("CoreMatch");
        const match = result as CoreMatch;

        // Else branch should be another match
        const elseBranch = match.cases[1]!.body as CoreMatch;
        expect(elseBranch.kind).toBe("CoreMatch");
        const elseExpr = elseBranch.expr as CoreVar;
        expect(elseExpr.name).toBe("b");
    });

    it("should desugar deeply nested if expressions", () => {
        // if a then (if b then (if c then 1 else 2) else 3) else 4
        const innermost: Expr = {
            kind: "If",
            condition: { kind: "Var", name: "c", loc: testLoc },
            then: { kind: "IntLit", value: 1, loc: testLoc },
            else_: { kind: "IntLit", value: 2, loc: testLoc },
            loc: testLoc,
        };

        const middle: Expr = {
            kind: "If",
            condition: { kind: "Var", name: "b", loc: testLoc },
            then: innermost,
            else_: { kind: "IntLit", value: 3, loc: testLoc },
            loc: testLoc,
        };

        const outer: Expr = {
            kind: "If",
            condition: { kind: "Var", name: "a", loc: testLoc },
            then: middle,
            else_: { kind: "IntLit", value: 4, loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(outer);

        // Three levels of match expressions
        expect(result.kind).toBe("CoreMatch");
        const match = result as CoreMatch;
        const level1 = match.cases[0]!.body as CoreMatch;
        expect(level1.kind).toBe("CoreMatch");
        const level2 = level1.cases[0]!.body as CoreMatch;
        expect(level2.kind).toBe("CoreMatch");
    });
});

describe("If-Then-Else - Complex Branches", () => {
    it("should desugar if with let in then branch", () => {
        // if cond then (let x = 10 in x + 1) else 0
        const ifExpr: Expr = {
            kind: "If",
            condition: { kind: "Var", name: "cond", loc: testLoc },
            then: {
                kind: "Let",
                pattern: { kind: "VarPattern", name: "x", loc: testLoc },
                value: { kind: "IntLit", value: 10, loc: testLoc },
                body: {
                    kind: "BinOp",
                    op: "Add",
                    left: { kind: "Var", name: "x", loc: testLoc },
                    right: { kind: "IntLit", value: 1, loc: testLoc },
                    loc: testLoc,
                },
                mutable: false,
                recursive: false,
                loc: testLoc,
            },
            else_: { kind: "IntLit", value: 0, loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(ifExpr);

        expect(result.kind).toBe("CoreMatch");
        const match = result as CoreMatch;

        // Then branch should be desugared let
        const thenBranch = match.cases[0]!.body as CoreLet;
        expect(thenBranch.kind).toBe("CoreLet");
    });

    it("should desugar if with lambda in branches", () => {
        // if cond then ((x) => x + 1) else ((x) => x - 1)
        const ifExpr: Expr = {
            kind: "If",
            condition: { kind: "Var", name: "cond", loc: testLoc },
            then: {
                kind: "Lambda",
                params: [{ kind: "VarPattern", name: "x", loc: testLoc }],
                body: {
                    kind: "BinOp",
                    op: "Add",
                    left: { kind: "Var", name: "x", loc: testLoc },
                    right: { kind: "IntLit", value: 1, loc: testLoc },
                    loc: testLoc,
                },
                loc: testLoc,
            },
            else_: {
                kind: "Lambda",
                params: [{ kind: "VarPattern", name: "x", loc: testLoc }],
                body: {
                    kind: "BinOp",
                    op: "Subtract",
                    left: { kind: "Var", name: "x", loc: testLoc },
                    right: { kind: "IntLit", value: 1, loc: testLoc },
                    loc: testLoc,
                },
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = desugar(ifExpr);

        expect(result.kind).toBe("CoreMatch");
        const match = result as CoreMatch;

        // Both branches should be lambdas
        const thenBranch = match.cases[0]!.body as CoreLambda;
        expect(thenBranch.kind).toBe("CoreLambda");
        const elseBranch = match.cases[1]!.body as CoreLambda;
        expect(elseBranch.kind).toBe("CoreLambda");
    });

    it("should desugar if with match in branch", () => {
        // if cond then (match x { | Some(v) => v | None => 0 }) else 1
        const ifExpr: Expr = {
            kind: "If",
            condition: { kind: "Var", name: "cond", loc: testLoc },
            then: {
                kind: "Match",
                expr: { kind: "Var", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: {
                            kind: "ConstructorPattern",
                            constructor: "Some",
                            args: [{ kind: "VarPattern", name: "v", loc: testLoc }],
                            loc: testLoc,
                        },
                        body: { kind: "Var", name: "v", loc: testLoc },
                        loc: testLoc,
                    },
                    {
                        pattern: {
                            kind: "ConstructorPattern",
                            constructor: "None",
                            args: [],
                            loc: testLoc,
                        },
                        body: { kind: "IntLit", value: 0, loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            },
            else_: { kind: "IntLit", value: 1, loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(ifExpr);

        expect(result.kind).toBe("CoreMatch");
        const match = result as CoreMatch;

        // Then branch should be another match
        const thenBranch = match.cases[0]!.body as CoreMatch;
        expect(thenBranch.kind).toBe("CoreMatch");
    });
});

describe("If-Then-Else - As Expression", () => {
    it("should desugar if as function argument", () => {
        // f(if cond then 1 else 2)
        const app: Expr = {
            kind: "App",
            func: { kind: "Var", name: "f", loc: testLoc },
            args: [
                {
                    kind: "If",
                    condition: { kind: "Var", name: "cond", loc: testLoc },
                    then: { kind: "IntLit", value: 1, loc: testLoc },
                    else_: { kind: "IntLit", value: 2, loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(app);

        expect(result.kind).toBe("CoreApp");
        const coreApp = result as CoreApp;

        // Argument should be desugared to match
        const arg = coreApp.args[0]! as CoreMatch;
        expect(arg.kind).toBe("CoreMatch");
    });

    it("should desugar if in binary operation", () => {
        // (if cond then 1 else 2) + 3
        const binOp: Expr = {
            kind: "BinOp",
            op: "Add",
            left: {
                kind: "If",
                condition: { kind: "Var", name: "cond", loc: testLoc },
                then: { kind: "IntLit", value: 1, loc: testLoc },
                else_: { kind: "IntLit", value: 2, loc: testLoc },
                loc: testLoc,
            },
            right: { kind: "IntLit", value: 3, loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(binOp);

        expect(result.kind).toBe("CoreBinOp");
        const coreBinOp = result as CoreBinOp;

        // Left operand should be desugared to match
        const left = coreBinOp.left as CoreMatch;
        expect(left.kind).toBe("CoreMatch");
    });
});

describe("If-Then-Else - Source Locations", () => {
    it("should preserve source locations", () => {
        const ifLoc: Location = {
            file: "test.vf",
            line: 20,
            column: 5,
            offset: 300,
        };

        const ifExpr: Expr = {
            kind: "If",
            condition: { kind: "BoolLit", value: true, loc: testLoc },
            then: { kind: "IntLit", value: 1, loc: testLoc },
            else_: { kind: "IntLit", value: 2, loc: testLoc },
            loc: ifLoc,
        };

        const result = desugar(ifExpr);

        expect(result.loc).toBe(ifLoc);
    });
});
