/**
 * Integration tests for the desugarer
 *
 * These tests combine multiple desugaring transformations to ensure they work together correctly.
 * Each test exercises 2+ transformations in combination.
 */

import type { Expr, Location, Module } from "../types/ast.js";
import type {
    CoreApp,
    CoreLambda,
    CoreLet,
    CoreLetDecl,
    CoreMatch,
    CoreUnsafe,
    CoreVar,
    CoreVariant,
    CoreVariantPattern,
} from "../types/core-ast.js";

import { describe, expect, it } from "vitest";

import { desugar, desugarModule } from "./desugarer.js";

const testLoc: Location = {
    file: "test.vf",
    line: 1,
    column: 1,
    offset: 0,
};

// Helper to wrap expressions in Element for new ListElement format
const elem = (expr: Expr) => ({ kind: "Element" as const, expr });

describe("Integration - Blocks + Lambdas", () => {
    it("should desugar block containing curried lambda", () => {
        // { let add = (x, y) => x + y; add(1, 2) }
        const expr: Expr = {
            kind: "Block",
            exprs: [
                {
                    kind: "Let",
                    pattern: { kind: "VarPattern", name: "add", loc: testLoc },
                    value: {
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
                    },
                    body: {
                        kind: "App",
                        func: {
                            kind: "App",
                            func: { kind: "Var", name: "add", loc: testLoc },
                            args: [{ kind: "IntLit", value: 1, loc: testLoc }],
                            loc: testLoc,
                        },
                        args: [{ kind: "IntLit", value: 2, loc: testLoc }],
                        loc: testLoc,
                    },
                    mutable: false,
                    recursive: false,
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(expr);

        // Block should become let binding
        expect(result.kind).toBe("CoreLet");
        // Lambda should be curried
        const letExpr = result as CoreLet;
        expect(letExpr.value.kind).toBe("CoreLambda");
        expect((letExpr.value as CoreLambda).body.kind).toBe("CoreLambda");
    });
});

describe("Integration - Pipes + Lists", () => {
    it("should desugar pipe with list literal", () => {
        // [1, 2, 3] |> sum
        const expr: Expr = {
            kind: "Pipe",
            expr: {
                kind: "List",
                elements: [
                    elem({ kind: "IntLit", value: 1, loc: testLoc }),
                    elem({ kind: "IntLit", value: 2, loc: testLoc }),
                    elem({ kind: "IntLit", value: 3, loc: testLoc }),
                ],
                loc: testLoc,
            },
            func: { kind: "Var", name: "sum", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(expr);

        // Pipe becomes app
        expect(result.kind).toBe("CoreApp");
        // List becomes Cons chain
        const appExpr = result as CoreApp;
        expect(appExpr.args[0]!.kind).toBe("CoreVariant");
        expect((appExpr.args[0] as CoreVariant).constructor).toBe("Cons");
    });

    it("should desugar chained pipes with list transformations", () => {
        // [1, 2, 3] |> map((x) => x * 2) |> filter((x) => x > 2)
        const expr: Expr = {
            kind: "Pipe",
            expr: {
                kind: "Pipe",
                expr: {
                    kind: "List",
                    elements: [
                        elem({ kind: "IntLit", value: 1, loc: testLoc }),
                        elem({ kind: "IntLit", value: 2, loc: testLoc }),
                        elem({ kind: "IntLit", value: 3, loc: testLoc }),
                    ],
                    loc: testLoc,
                },
                func: {
                    kind: "App",
                    func: { kind: "Var", name: "map", loc: testLoc },
                    args: [
                        {
                            kind: "Lambda",
                            params: [{ kind: "VarPattern", name: "x", loc: testLoc }],
                            body: {
                                kind: "BinOp",
                                op: "Multiply",
                                left: { kind: "Var", name: "x", loc: testLoc },
                                right: { kind: "IntLit", value: 2, loc: testLoc },
                                loc: testLoc,
                            },
                            loc: testLoc,
                        },
                    ],
                    loc: testLoc,
                },
                loc: testLoc,
            },
            func: {
                kind: "App",
                func: { kind: "Var", name: "filter", loc: testLoc },
                args: [
                    {
                        kind: "Lambda",
                        params: [{ kind: "VarPattern", name: "x", loc: testLoc }],
                        body: {
                            kind: "BinOp",
                            op: "GreaterThan",
                            left: { kind: "Var", name: "x", loc: testLoc },
                            right: { kind: "IntLit", value: 2, loc: testLoc },
                            loc: testLoc,
                        },
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = desugar(expr);

        // Final pipe result
        expect(result.kind).toBe("CoreApp");
    });
});

describe("Integration - Composition + If-Then-Else", () => {
    it("should desugar function composition with if-then-else in function", () => {
        // ((x) => if x > 0 then 1 else -1) >> abs
        const expr: Expr = {
            kind: "BinOp",
            op: "ForwardCompose",
            left: {
                kind: "Lambda",
                params: [{ kind: "VarPattern", name: "x", loc: testLoc }],
                body: {
                    kind: "If",
                    condition: {
                        kind: "BinOp",
                        op: "GreaterThan",
                        left: { kind: "Var", name: "x", loc: testLoc },
                        right: { kind: "IntLit", value: 0, loc: testLoc },
                        loc: testLoc,
                    },
                    then: { kind: "IntLit", value: 1, loc: testLoc },
                    else_: { kind: "IntLit", value: -1, loc: testLoc },
                    loc: testLoc,
                },
                loc: testLoc,
            },
            right: { kind: "Var", name: "abs", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(expr);

        // Composition becomes lambda
        expect(result.kind).toBe("CoreLambda");
        // Body is application
        const lambdaExpr = result as CoreLambda;
        expect(lambdaExpr.body.kind).toBe("CoreApp");
    });
});

describe("Integration - Match + Or-Patterns + Lists", () => {
    it("should desugar match on list with or-patterns", () => {
        // match list { | [] | [_] => "short" | [_, _, ...rest] => "long" }
        const expr: Expr = {
            kind: "Match",
            expr: { kind: "Var", name: "list", loc: testLoc },
            cases: [
                {
                    pattern: {
                        kind: "OrPattern",
                        patterns: [
                            { kind: "ListPattern", elements: [], loc: testLoc },
                            {
                                kind: "ListPattern",
                                elements: [{ kind: "WildcardPattern", loc: testLoc }],
                                loc: testLoc,
                            },
                        ],
                        loc: testLoc,
                    },
                    body: { kind: "StringLit", value: "short", loc: testLoc },
                    loc: testLoc,
                },
                {
                    pattern: {
                        kind: "ListPattern",
                        elements: [
                            { kind: "WildcardPattern", loc: testLoc },
                            { kind: "WildcardPattern", loc: testLoc },
                        ],
                        rest: { kind: "VarPattern", name: "rest", loc: testLoc },
                        loc: testLoc,
                    },
                    body: { kind: "StringLit", value: "long", loc: testLoc },
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugar(expr);

        expect(result.kind).toBe("CoreMatch");
        // Or-pattern should be expanded to 2 cases ([] and [_])
        // Plus the third case
        const matchExpr = result as CoreMatch;
        expect(matchExpr.cases).toHaveLength(3);
        // All list patterns should be Cons/Nil variant patterns
        expect(matchExpr.cases[0]!.pattern.kind).toBe("CoreVariantPattern");
    });
});

describe("Integration - Unsafe + Blocks + If", () => {
    it("should desugar unsafe block with complex logic", () => {
        // unsafe { let x = jsCall(); if x > 0 then x else 0 }
        const expr: Expr = {
            kind: "Unsafe",
            expr: {
                kind: "Block",
                exprs: [
                    {
                        kind: "Let",
                        pattern: { kind: "VarPattern", name: "x", loc: testLoc },
                        value: {
                            kind: "App",
                            func: { kind: "Var", name: "jsCall", loc: testLoc },
                            args: [],
                            loc: testLoc,
                        },
                        body: {
                            kind: "If",
                            condition: {
                                kind: "BinOp",
                                op: "GreaterThan",
                                left: { kind: "Var", name: "x", loc: testLoc },
                                right: { kind: "IntLit", value: 0, loc: testLoc },
                                loc: testLoc,
                            },
                            then: { kind: "Var", name: "x", loc: testLoc },
                            else_: { kind: "IntLit", value: 0, loc: testLoc },
                            loc: testLoc,
                        },
                        mutable: false,
                        recursive: false,
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            },
            loc: testLoc,
        };

        const result = desugar(expr);

        // Unsafe boundary preserved
        expect(result.kind).toBe("CoreUnsafe");
        // Block becomes let
        const unsafeExpr = result as CoreUnsafe;
        expect(unsafeExpr.expr.kind).toBe("CoreLet");
        // If becomes match
        expect((unsafeExpr.expr as CoreLet).body.kind).toBe("CoreMatch");
    });
});

describe("Integration - Complete Programs", () => {
    it("should desugar list sum example", () => {
        // let sum = (list) => match list { | [] => 0 | [x, ...rest] => x + sum(rest) }
        const expr: Expr = {
            kind: "Let",
            pattern: { kind: "VarPattern", name: "sum", loc: testLoc },
            value: {
                kind: "Lambda",
                params: [{ kind: "VarPattern", name: "list", loc: testLoc }],
                body: {
                    kind: "Match",
                    expr: { kind: "Var", name: "list", loc: testLoc },
                    cases: [
                        {
                            pattern: { kind: "ListPattern", elements: [], loc: testLoc },
                            body: { kind: "IntLit", value: 0, loc: testLoc },
                            loc: testLoc,
                        },
                        {
                            pattern: {
                                kind: "ListPattern",
                                elements: [{ kind: "VarPattern", name: "x", loc: testLoc }],
                                rest: { kind: "VarPattern", name: "rest", loc: testLoc },
                                loc: testLoc,
                            },
                            body: {
                                kind: "BinOp",
                                op: "Add",
                                left: { kind: "Var", name: "x", loc: testLoc },
                                right: {
                                    kind: "App",
                                    func: { kind: "Var", name: "sum", loc: testLoc },
                                    args: [{ kind: "Var", name: "rest", loc: testLoc }],
                                    loc: testLoc,
                                },
                                loc: testLoc,
                            },
                            loc: testLoc,
                        },
                    ],
                    loc: testLoc,
                },
                loc: testLoc,
            },
            body: {
                kind: "App",
                func: { kind: "Var", name: "sum", loc: testLoc },
                args: [
                    {
                        kind: "List",
                        elements: [
                            elem({ kind: "IntLit", value: 1, loc: testLoc }),
                            elem({ kind: "IntLit", value: 2, loc: testLoc }),
                            elem({ kind: "IntLit", value: 3, loc: testLoc }),
                        ],
                        loc: testLoc,
                    },
                ],
                loc: testLoc,
            },
            mutable: false,
            recursive: true,
            loc: testLoc,
        };

        const result = desugar(expr);

        // Top level is let
        expect(result.kind).toBe("CoreLet");
        // Value is lambda
        const letExpr = result as CoreLet;
        expect(letExpr.value.kind).toBe("CoreLambda");
        // Body has match
        const lambdaValue = letExpr.value as CoreLambda;
        expect(lambdaValue.body.kind).toBe("CoreMatch");
        // List patterns are Cons/Nil
        const match = lambdaValue.body as CoreMatch;
        expect(match.cases[0]!.pattern.kind).toBe("CoreVariantPattern");
        expect((match.cases[0]!.pattern as CoreVariantPattern).constructor).toBe("Nil");
        expect((match.cases[1]!.pattern as CoreVariantPattern).constructor).toBe("Cons");
    });

    it("should desugar complex functional pipeline", () => {
        // [1, 2, 3, 4, 5] |> filter((x) => x > 2) |> map((x) => x * 2) |> sum
        const expr: Expr = {
            kind: "Pipe",
            expr: {
                kind: "Pipe",
                expr: {
                    kind: "Pipe",
                    expr: {
                        kind: "List",
                        elements: [
                            elem({ kind: "IntLit", value: 1, loc: testLoc }),
                            elem({ kind: "IntLit", value: 2, loc: testLoc }),
                            elem({ kind: "IntLit", value: 3, loc: testLoc }),
                            elem({ kind: "IntLit", value: 4, loc: testLoc }),
                            elem({ kind: "IntLit", value: 5, loc: testLoc }),
                        ],
                        loc: testLoc,
                    },
                    func: {
                        kind: "App",
                        func: { kind: "Var", name: "filter", loc: testLoc },
                        args: [
                            {
                                kind: "Lambda",
                                params: [{ kind: "VarPattern", name: "x", loc: testLoc }],
                                body: {
                                    kind: "BinOp",
                                    op: "GreaterThan",
                                    left: { kind: "Var", name: "x", loc: testLoc },
                                    right: { kind: "IntLit", value: 2, loc: testLoc },
                                    loc: testLoc,
                                },
                                loc: testLoc,
                            },
                        ],
                        loc: testLoc,
                    },
                    loc: testLoc,
                },
                func: {
                    kind: "App",
                    func: { kind: "Var", name: "map", loc: testLoc },
                    args: [
                        {
                            kind: "Lambda",
                            params: [{ kind: "VarPattern", name: "x", loc: testLoc }],
                            body: {
                                kind: "BinOp",
                                op: "Multiply",
                                left: { kind: "Var", name: "x", loc: testLoc },
                                right: { kind: "IntLit", value: 2, loc: testLoc },
                                loc: testLoc,
                            },
                            loc: testLoc,
                        },
                    ],
                    loc: testLoc,
                },
                loc: testLoc,
            },
            func: { kind: "Var", name: "sum", loc: testLoc },
            loc: testLoc,
        };

        const result = desugar(expr);

        // Final result is application
        expect(result.kind).toBe("CoreApp");
        // Function is sum
        const appExpr = result as CoreApp;
        expect((appExpr.func as CoreVar).name).toBe("sum");
    });
});

describe("Integration - Module with All Features", () => {
    it("should desugar complete module with all features", () => {
        const module: Module = {
            imports: [
                {
                    kind: "ImportDecl",
                    items: [{ name: "List", isType: true }],
                    from: "./list",
                    loc: testLoc,
                },
            ],
            declarations: [
                // Type declaration
                {
                    kind: "TypeDecl",
                    name: "Option",
                    params: ["T"],
                    definition: {
                        kind: "VariantTypeDef",
                        constructors: [
                            {
                                name: "Some",
                                args: [{ kind: "TypeVar", name: "T", loc: testLoc }],
                                loc: testLoc,
                            },
                            { name: "None", args: [], loc: testLoc },
                        ],
                        loc: testLoc,
                    },
                    exported: true,
                    loc: testLoc,
                },
                // External declaration
                {
                    kind: "ExternalDecl",
                    name: "log",
                    typeExpr: { kind: "TypeConst", name: "Unit", loc: testLoc },
                    jsName: "console.log",
                    exported: false,
                    loc: testLoc,
                },
                // Let declaration with all features
                {
                    kind: "LetDecl",
                    pattern: { kind: "VarPattern", name: "process", loc: testLoc },
                    value: {
                        kind: "Lambda",
                        params: [
                            { kind: "VarPattern", name: "x", loc: testLoc },
                            { kind: "VarPattern", name: "y", loc: testLoc },
                        ],
                        body: {
                            kind: "Block",
                            exprs: [
                                {
                                    kind: "Let",
                                    pattern: { kind: "VarPattern", name: "sum", loc: testLoc },
                                    value: {
                                        kind: "BinOp",
                                        op: "Add",
                                        left: { kind: "Var", name: "x", loc: testLoc },
                                        right: { kind: "Var", name: "y", loc: testLoc },
                                        loc: testLoc,
                                    },
                                    body: {
                                        kind: "If",
                                        condition: {
                                            kind: "BinOp",
                                            op: "GreaterThan",
                                            left: { kind: "Var", name: "sum", loc: testLoc },
                                            right: { kind: "IntLit", value: 10, loc: testLoc },
                                            loc: testLoc,
                                        },
                                        then: { kind: "Var", name: "sum", loc: testLoc },
                                        else_: { kind: "IntLit", value: 0, loc: testLoc },
                                        loc: testLoc,
                                    },
                                    mutable: false,
                                    recursive: false,
                                    loc: testLoc,
                                },
                            ],
                            loc: testLoc,
                        },
                        loc: testLoc,
                    },
                    mutable: false,
                    recursive: false,
                    exported: true,
                    loc: testLoc,
                },
            ],
            loc: testLoc,
        };

        const result = desugarModule(module);

        // Module structure
        expect(result.imports).toHaveLength(1);
        expect(result.declarations).toHaveLength(3);

        // Type declaration passes through
        expect(result.declarations[0]!.kind).toBe("CoreTypeDecl");

        // External passes through
        expect(result.declarations[1]!.kind).toBe("CoreExternalDecl");

        // Let declaration with all features desugared
        expect(result.declarations[2]!.kind).toBe("CoreLetDecl");
        const letDecl = result.declarations[2] as CoreLetDecl;
        // Lambda is curried
        expect(letDecl.value.kind).toBe("CoreLambda");
        const outerLambda = letDecl.value as CoreLambda;
        expect(outerLambda.body.kind).toBe("CoreLambda");
        // Block inside becomes let
        const innerLambda = outerLambda.body as CoreLambda;
        expect(innerLambda.body.kind).toBe("CoreLet");
        // If inside becomes match
        const lambdaBodyLet = innerLambda.body as CoreLet;
        expect(lambdaBodyLet.body.kind).toBe("CoreMatch");
    });
});
