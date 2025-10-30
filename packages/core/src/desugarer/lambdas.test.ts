/**
 * Tests for lambda currying
 *
 * Multi-parameter lambdas are curried:
 * (x, y, z) => expr => (x) => (y) => (z) => expr
 */

import type { Expr, Location } from "../types/ast.js";
import type {
    CoreBinOp,
    CoreExpr,
    CoreLambda,
    CoreRecordPattern,
    CoreVariantPattern,
    CoreVarPattern,
} from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { desugar } from "./desugarer.js";
import { DesugarError } from "./DesugarError.js";

const testLoc: Location = {
    file: "test.vf",
    line: 1,
    column: 1,
    offset: 0,
};

describe("Lambda Currying - Single Parameter", () => {
    it("should desugar single-parameter lambda", () => {
        const lambda: Expr = {
            kind: "Lambda",
            params: [{ kind: "VarPattern", name: "x", loc: testLoc }],
            body: { kind: "Var", name: "x", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(lambda);

        expect(result.kind).toBe("CoreLambda");
        const coreLambda = result as CoreLambda;
        expect(coreLambda.param.kind).toBe("CoreVarPattern");
        expect((coreLambda.param as CoreVarPattern).name).toBe("x");
        expect(coreLambda.body.kind).toBe("CoreVar");
        const body = coreLambda.body as { kind: "CoreVar"; name: string };
        expect(body.name).toBe("x");
    });

    it("should desugar identity function", () => {
        const lambda: Expr = {
            kind: "Lambda",
            params: [{ kind: "VarPattern", name: "id", loc: testLoc }],
            body: { kind: "Var", name: "id", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(lambda);

        expect(result.kind).toBe("CoreLambda");
    });

    it("should desugar lambda with complex body", () => {
        const lambda: Expr = {
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
        };

        const result = desugar(lambda);

        expect(result.kind).toBe("CoreLambda");
        const coreLambda = result as CoreLambda;
        expect(coreLambda.body.kind).toBe("CoreBinOp");
        const body = coreLambda.body as CoreBinOp;
        expect(body.op).toBe("Add");
    });
});

describe("Lambda Currying - Two Parameters", () => {
    it("should curry two-parameter lambda", () => {
        const lambda: Expr = {
            kind: "Lambda",
            params: [
                { kind: "VarPattern", name: "x", loc: testLoc },
                { kind: "VarPattern", name: "y", loc: testLoc },
            ],
            body: {
                kind: "BinOp",
                op: "Add",
                left: { kind: "Var", name: "x", loc: testLoc },
                right: { kind: "Var", name: "y", loc: testLoc },
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = desugar(lambda);

        // Outer lambda: (x) => ...
        expect(result.kind).toBe("CoreLambda");
        const outerLambda = result as CoreLambda;
        expect((outerLambda.param as CoreVarPattern).name).toBe("x");

        // Inner lambda: (y) => x + y
        const innerLambda = outerLambda.body as CoreLambda;
        expect(innerLambda.kind).toBe("CoreLambda");
        expect((innerLambda.param as CoreVarPattern).name).toBe("y");

        // Body: x + y
        const body = innerLambda.body as CoreBinOp;
        expect(body.kind).toBe("CoreBinOp");
        expect(body.op).toBe("Add");
    });

    it("should curry multiply function", () => {
        const lambda: Expr = {
            kind: "Lambda",
            params: [
                { kind: "VarPattern", name: "a", loc: testLoc },
                { kind: "VarPattern", name: "b", loc: testLoc },
            ],
            body: {
                kind: "BinOp",
                op: "Multiply",
                left: { kind: "Var", name: "a", loc: testLoc },
                right: { kind: "Var", name: "b", loc: testLoc },
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = desugar(lambda);

        expect(result.kind).toBe("CoreLambda");
        const outerLambda = result as CoreLambda;
        expect((outerLambda.param as CoreVarPattern).name).toBe("a");
        expect(outerLambda.body.kind).toBe("CoreLambda");
        const innerLambda = outerLambda.body as CoreLambda;
        expect((innerLambda.param as CoreVarPattern).name).toBe("b");
    });
});

describe("Lambda Currying - Three Parameters", () => {
    it("should curry three-parameter lambda", () => {
        const lambda: Expr = {
            kind: "Lambda",
            params: [
                { kind: "VarPattern", name: "x", loc: testLoc },
                { kind: "VarPattern", name: "y", loc: testLoc },
                { kind: "VarPattern", name: "z", loc: testLoc },
            ],
            body: {
                kind: "BinOp",
                op: "Add",
                left: { kind: "Var", name: "x", loc: testLoc },
                right: {
                    kind: "BinOp",
                    op: "Add",
                    left: { kind: "Var", name: "y", loc: testLoc },
                    right: { kind: "Var", name: "z", loc: testLoc },
                    loc: testLoc,
                },
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = desugar(lambda);

        // Level 1: (x) => ...
        expect(result.kind).toBe("CoreLambda");
        const level1 = result as CoreLambda;
        expect((level1.param as CoreVarPattern).name).toBe("x");

        // Level 2: (y) => ...
        const level2 = level1.body as CoreLambda;
        expect(level2.kind).toBe("CoreLambda");
        expect((level2.param as CoreVarPattern).name).toBe("y");

        // Level 3: (z) => x + y + z
        const level3 = level2.body as CoreLambda;
        expect(level3.kind).toBe("CoreLambda");
        expect((level3.param as CoreVarPattern).name).toBe("z");

        // Body: x + (y + z)
        const body = level3.body;
        expect(body.kind).toBe("CoreBinOp");
    });
});

describe("Lambda Currying - Four+ Parameters", () => {
    it("should curry four-parameter lambda", () => {
        const lambda: Expr = {
            kind: "Lambda",
            params: [
                { kind: "VarPattern", name: "a", loc: testLoc },
                { kind: "VarPattern", name: "b", loc: testLoc },
                { kind: "VarPattern", name: "c", loc: testLoc },
                { kind: "VarPattern", name: "d", loc: testLoc },
            ],
            body: { kind: "IntLit", value: 42, loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(lambda);

        // Verify four levels of nesting
        expect(result.kind).toBe("CoreLambda");
        const lambda1 = result as CoreLambda;
        expect((lambda1.param as CoreVarPattern).name).toBe("a");

        let current = lambda1.body as CoreLambda;
        expect(current.kind).toBe("CoreLambda");
        expect((current.param as CoreVarPattern).name).toBe("b");

        current = current.body as CoreLambda;
        expect(current.kind).toBe("CoreLambda");
        expect((current.param as CoreVarPattern).name).toBe("c");

        current = current.body as CoreLambda;
        expect(current.kind).toBe("CoreLambda");
        expect((current.param as CoreVarPattern).name).toBe("d");

        // Final body
        const finalBody = current.body as { kind: "CoreIntLit"; value: number };
        expect(finalBody.kind).toBe("CoreIntLit");
        expect(finalBody.value).toBe(42);
    });

    it("should curry five-parameter lambda", () => {
        const lambda: Expr = {
            kind: "Lambda",
            params: [
                { kind: "VarPattern", name: "p1", loc: testLoc },
                { kind: "VarPattern", name: "p2", loc: testLoc },
                { kind: "VarPattern", name: "p3", loc: testLoc },
                { kind: "VarPattern", name: "p4", loc: testLoc },
                { kind: "VarPattern", name: "p5", loc: testLoc },
            ],
            body: { kind: "StringLit", value: "done", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(lambda);

        // Walk through five levels
        let current: CoreExpr = result;
        expect(current.kind).toBe("CoreLambda");
        const lambda1 = current as CoreLambda;
        expect((lambda1.param as CoreVarPattern).name).toBe("p1");

        current = lambda1.body;
        expect(current.kind).toBe("CoreLambda");
        const lambda2 = current as CoreLambda;
        expect((lambda2.param as CoreVarPattern).name).toBe("p2");

        current = lambda2.body;
        expect(current.kind).toBe("CoreLambda");
        const lambda3 = current as CoreLambda;
        expect((lambda3.param as CoreVarPattern).name).toBe("p3");

        current = lambda3.body;
        expect(current.kind).toBe("CoreLambda");
        const lambda4 = current as CoreLambda;
        expect((lambda4.param as CoreVarPattern).name).toBe("p4");

        current = lambda4.body;
        expect(current.kind).toBe("CoreLambda");
        const lambda5 = current as CoreLambda;
        expect((lambda5.param as CoreVarPattern).name).toBe("p5");

        // Final body
        expect(lambda5.body.kind).toBe("CoreStringLit");
    });
});

describe("Lambda Currying - Nested Lambdas", () => {
    it("should curry nested lambdas independently", () => {
        const lambda: Expr = {
            kind: "Lambda",
            params: [
                { kind: "VarPattern", name: "x", loc: testLoc },
                { kind: "VarPattern", name: "y", loc: testLoc },
            ],
            body: {
                // Inner lambda
                kind: "Lambda",
                params: [
                    { kind: "VarPattern", name: "a", loc: testLoc },
                    { kind: "VarPattern", name: "b", loc: testLoc },
                ],
                body: {
                    kind: "BinOp",
                    op: "Add",
                    left: { kind: "Var", name: "x", loc: testLoc },
                    right: { kind: "Var", name: "a", loc: testLoc },
                    loc: testLoc,
                },
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = desugar(lambda);

        // Outer lambda structure: (x) => (y) => ...
        expect(result.kind).toBe("CoreLambda");
        const level1 = result as CoreLambda;
        expect((level1.param as CoreVarPattern).name).toBe("x");

        const level2 = level1.body as CoreLambda;
        expect(level2.kind).toBe("CoreLambda");
        expect((level2.param as CoreVarPattern).name).toBe("y");

        // Inner lambda structure: (a) => (b) => x + a
        const innerLambda = level2.body as CoreLambda;
        expect(innerLambda.kind).toBe("CoreLambda");
        expect((innerLambda.param as CoreVarPattern).name).toBe("a");

        const innerLevel2 = innerLambda.body as CoreLambda;
        expect(innerLevel2.kind).toBe("CoreLambda");
        expect((innerLevel2.param as CoreVarPattern).name).toBe("b");

        // Final body
        expect(innerLevel2.body.kind).toBe("CoreBinOp");
    });
});

describe("Lambda Currying - Pattern Parameters", () => {
    it("should curry lambda with wildcard patterns", () => {
        const lambda: Expr = {
            kind: "Lambda",
            params: [
                { kind: "WildcardPattern", loc: testLoc },
                { kind: "VarPattern", name: "y", loc: testLoc },
            ],
            body: { kind: "Var", name: "y", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(lambda);

        expect(result.kind).toBe("CoreLambda");
        const outerLambda = result as CoreLambda;
        expect(outerLambda.param.kind).toBe("CoreWildcardPattern");
        expect(outerLambda.body.kind).toBe("CoreLambda");
        const innerLambda = outerLambda.body as CoreLambda;
        expect((innerLambda.param as CoreVarPattern).name).toBe("y");
    });

    it("should curry lambda with constructor patterns", () => {
        const lambda: Expr = {
            kind: "Lambda",
            params: [
                {
                    kind: "ConstructorPattern",
                    constructor: "Some",
                    args: [{ kind: "VarPattern", name: "x", loc: testLoc }],
                    loc: testLoc,
                },
                { kind: "VarPattern", name: "default", loc: testLoc },
            ],
            body: { kind: "Var", name: "x", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(lambda);

        expect(result.kind).toBe("CoreLambda");
        const outerLambda = result as CoreLambda;
        expect(outerLambda.param.kind).toBe("CoreVariantPattern");
        const variantPattern = outerLambda.param as CoreVariantPattern;
        expect(variantPattern.constructor).toBe("Some");
    });

    it("should curry lambda with record patterns", () => {
        const lambda: Expr = {
            kind: "Lambda",
            params: [
                {
                    kind: "RecordPattern",
                    fields: [
                        {
                            name: "x",
                            pattern: { kind: "VarPattern", name: "x", loc: testLoc },
                            loc: testLoc,
                        },
                        {
                            name: "y",
                            pattern: { kind: "VarPattern", name: "y", loc: testLoc },
                            loc: testLoc,
                        },
                    ],
                    loc: testLoc,
                },
            ],
            body: {
                kind: "BinOp",
                op: "Add",
                left: { kind: "Var", name: "x", loc: testLoc },
                right: { kind: "Var", name: "y", loc: testLoc },
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = desugar(lambda);

        expect(result.kind).toBe("CoreLambda");
        const coreLambda = result as CoreLambda;
        expect(coreLambda.param.kind).toBe("CoreRecordPattern");
        const recordPattern = coreLambda.param as CoreRecordPattern;
        expect(recordPattern.fields).toHaveLength(2);
    });
});

describe("Lambda Currying - Complex Bodies", () => {
    it("should curry lambda with let binding in body", () => {
        const lambda: Expr = {
            kind: "Lambda",
            params: [
                { kind: "VarPattern", name: "x", loc: testLoc },
                { kind: "VarPattern", name: "y", loc: testLoc },
            ],
            body: {
                kind: "Let",
                pattern: { kind: "VarPattern", name: "sum", loc: testLoc },
                value: {
                    kind: "BinOp",
                    op: "Add",
                    left: { kind: "Var", name: "x", loc: testLoc },
                    right: { kind: "Var", name: "y", loc: testLoc },
                    loc: testLoc,
                },
                body: { kind: "Var", name: "sum", loc: testLoc },
                mutable: false,
                recursive: false,
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = desugar(lambda);

        // Outer structure
        expect(result.kind).toBe("CoreLambda");
        const outerLambda = result as CoreLambda;
        const innerLambda = outerLambda.body as CoreLambda;
        expect(innerLambda.kind).toBe("CoreLambda");

        // Body should be desugared let
        const body = innerLambda.body;
        expect(body.kind).toBe("CoreLet");
    });

    it("should curry lambda with match expression in body", () => {
        const lambda: Expr = {
            kind: "Lambda",
            params: [
                { kind: "VarPattern", name: "x", loc: testLoc },
                { kind: "VarPattern", name: "y", loc: testLoc },
            ],
            body: {
                kind: "Match",
                expr: { kind: "Var", name: "x", loc: testLoc },
                cases: [
                    {
                        pattern: { kind: "LiteralPattern", literal: 0, loc: testLoc },
                        body: { kind: "Var", name: "y", loc: testLoc },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = desugar(lambda);

        expect(result.kind).toBe("CoreLambda");
        const outerLambda = result as CoreLambda;
        const innerLambda = outerLambda.body as CoreLambda;
        expect(innerLambda.kind).toBe("CoreLambda");

        const body = innerLambda.body;
        expect(body.kind).toBe("CoreMatch");
    });
});

describe("Lambda Currying - Source Locations", () => {
    it("should preserve source locations", () => {
        const lambdaLoc: Location = {
            file: "test.vf",
            line: 42,
            column: 10,
            offset: 500,
        };

        const lambda: Expr = {
            kind: "Lambda",
            params: [
                { kind: "VarPattern", name: "x", loc: testLoc },
                { kind: "VarPattern", name: "y", loc: testLoc },
            ],
            body: { kind: "IntLit", value: 1, loc: testLoc },
            loc: lambdaLoc,
        };

        const result = desugar(lambda);

        // All lambdas use the original location
        expect(result.loc).toBe(lambdaLoc);
        const coreLambda = result as CoreLambda;
        expect(coreLambda.body.loc).toBe(lambdaLoc);
    });
});

describe("Lambda Currying - Error Cases", () => {
    it("should throw error for zero-parameter lambda", () => {
        const lambda: Expr = {
            kind: "Lambda",
            params: [],
            body: { kind: "IntLit", value: 42, loc: testLoc },
            loc: testLoc,
        };

        expect(() => desugar(lambda)).toThrow(DesugarError);
        expect(() => desugar(lambda)).toThrow("Lambda with zero parameters");
    });
});
