/**
 * Expression parsing tests - Functions and lambdas
 */

import { describe, expect, it } from "vitest";

import { parseExpression } from "./expression-test-helpers.js";

describe("Parser - Functions and Lambdas", () => {
    describe("function calls", () => {
        it("should parse function call with no arguments", () => {
            const expr = parseExpression("foo()");

            expect(expr).toMatchObject({
                kind: "App",
                func: { kind: "Var", name: "foo" },
                args: [],
            });
        });

        it("should parse function call with one argument", () => {
            const expr = parseExpression("foo(42)");

            expect(expr).toMatchObject({
                kind: "App",
                func: { kind: "Var", name: "foo" },
                args: [{ kind: "IntLit", value: 42 }],
            });
        });

        it("should parse function call with multiple arguments", () => {
            const expr = parseExpression("foo(1, 2, 3)");

            expect(expr).toMatchObject({
                kind: "App",
                func: { kind: "Var", name: "foo" },
                args: [
                    { kind: "IntLit", value: 1 },
                    { kind: "IntLit", value: 2 },
                    { kind: "IntLit", value: 3 },
                ],
            });
        });

        it("should parse curried function calls", () => {
            const expr = parseExpression("foo(1)(2)");

            expect(expr).toMatchObject({
                kind: "App",
                func: {
                    kind: "App",
                    func: { kind: "Var", name: "foo" },
                    args: [{ kind: "IntLit", value: 1 }],
                },
                args: [{ kind: "IntLit", value: 2 }],
            });
        });

        it("should parse function call with expression arguments", () => {
            const expr = parseExpression("foo(a + b, c * d)");

            expect(expr).toMatchObject({
                kind: "App",
                func: { kind: "Var", name: "foo" },
                args: [
                    {
                        kind: "BinOp",
                        op: "Add",
                        left: { kind: "Var", name: "a" },
                        right: { kind: "Var", name: "b" },
                    },
                    {
                        kind: "BinOp",
                        op: "Multiply",
                        left: { kind: "Var", name: "c" },
                        right: { kind: "Var", name: "d" },
                    },
                ],
            });
        });

        it("should bind call tighter than unary", () => {
            const expr = parseExpression("-foo(x)");

            expect(expr).toMatchObject({
                kind: "UnaryOp",
                op: "Negate",
                expr: {
                    kind: "App",
                    func: { kind: "Var", name: "foo" },
                    args: [{ kind: "Var", name: "x" }],
                },
            });
        });

        it("should bind call tighter than binary", () => {
            const expr = parseExpression("foo(x) + bar(y)");

            expect(expr).toMatchObject({
                kind: "BinOp",
                op: "Add",
                left: {
                    kind: "App",
                    func: { kind: "Var", name: "foo" },
                    args: [{ kind: "Var", name: "x" }],
                },
                right: {
                    kind: "App",
                    func: { kind: "Var", name: "bar" },
                    args: [{ kind: "Var", name: "y" }],
                },
            });
        });

        it("should parse nested function calls in arguments", () => {
            const expr = parseExpression("foo(bar(x))");

            expect(expr).toMatchObject({
                kind: "App",
                func: { kind: "Var", name: "foo" },
                args: [
                    {
                        kind: "App",
                        func: { kind: "Var", name: "bar" },
                        args: [{ kind: "Var", name: "x" }],
                    },
                ],
            });
        });
    });

    describe("lambda expressions", () => {
        it("should parse lambda with no parameters", () => {
            const expr = parseExpression("() => 42");

            expect(expr).toMatchObject({
                kind: "Lambda",
                params: [],
                body: { kind: "IntLit", value: 42 },
            });
        });

        it("should parse lambda with one parameter", () => {
            const expr = parseExpression("(x) => x + 1");

            expect(expr).toMatchObject({
                kind: "Lambda",
                params: [{ pattern: { kind: "VarPattern", name: "x" } }],
                body: {
                    kind: "BinOp",
                    op: "Add",
                    left: { kind: "Var", name: "x" },
                    right: { kind: "IntLit", value: 1 },
                },
            });
        });

        it("should parse lambda with multiple parameters", () => {
            const expr = parseExpression("(x, y) => x + y");

            expect(expr).toMatchObject({
                kind: "Lambda",
                params: [
                    { pattern: { kind: "VarPattern", name: "x" } },
                    { pattern: { kind: "VarPattern", name: "y" } },
                ],
                body: {
                    kind: "BinOp",
                    op: "Add",
                    left: { kind: "Var", name: "x" },
                    right: { kind: "Var", name: "y" },
                },
            });
        });

        it("should parse lambda with complex body", () => {
            const expr = parseExpression("(x, y, z) => x * y + z");

            expect(expr).toMatchObject({
                kind: "Lambda",
                params: [
                    { pattern: { kind: "VarPattern", name: "x" } },
                    { pattern: { kind: "VarPattern", name: "y" } },
                    { pattern: { kind: "VarPattern", name: "z" } },
                ],
                body: {
                    kind: "BinOp",
                    op: "Add",
                    left: {
                        kind: "BinOp",
                        op: "Multiply",
                        left: { kind: "Var", name: "x" },
                        right: { kind: "Var", name: "y" },
                    },
                    right: { kind: "Var", name: "z" },
                },
            });
        });

        it("should parse nested lambdas", () => {
            const expr = parseExpression("(x) => (y) => x + y");

            expect(expr).toMatchObject({
                kind: "Lambda",
                params: [{ pattern: { kind: "VarPattern", name: "x" } }],
                body: {
                    kind: "Lambda",
                    params: [{ pattern: { kind: "VarPattern", name: "y" } }],
                    body: {
                        kind: "BinOp",
                        op: "Add",
                        left: { kind: "Var", name: "x" },
                        right: { kind: "Var", name: "y" },
                    },
                },
            });
        });

        it("should parse lambda as function argument", () => {
            const expr = parseExpression("map((x) => x * 2, list)");

            expect(expr).toMatchObject({
                kind: "App",
                func: { kind: "Var", name: "map" },
                args: [
                    {
                        kind: "Lambda",
                        params: [{ pattern: { kind: "VarPattern", name: "x" } }],
                        body: {
                            kind: "BinOp",
                            op: "Multiply",
                            left: { kind: "Var", name: "x" },
                            right: { kind: "IntLit", value: 2 },
                        },
                    },
                    { kind: "Var", name: "list" },
                ],
            });
        });

        it("should parse lambda with function call in body", () => {
            const expr = parseExpression("(x) => foo(x)");

            expect(expr).toMatchObject({
                kind: "Lambda",
                params: [{ pattern: { kind: "VarPattern", name: "x" } }],
                body: {
                    kind: "App",
                    func: { kind: "Var", name: "foo" },
                    args: [{ kind: "Var", name: "x" }],
                },
            });
        });

        it("should distinguish lambda from parenthesized variable", () => {
            const lambdaExpr = parseExpression("(x) => x");
            const parenExpr = parseExpression("(x)");

            expect(lambdaExpr).toMatchObject({
                kind: "Lambda",
                params: [{ pattern: { kind: "VarPattern", name: "x" } }],
                body: { kind: "Var", name: "x" },
            });

            expect(parenExpr).toMatchObject({
                kind: "Var",
                name: "x",
            });
        });

        it("should distinguish lambda from unit literal", () => {
            const lambdaExpr = parseExpression("() => 42");
            const unitExpr = parseExpression("()");

            expect(lambdaExpr).toMatchObject({
                kind: "Lambda",
                params: [],
                body: { kind: "IntLit", value: 42 },
            });

            expect(unitExpr).toMatchObject({
                kind: "UnitLit",
            });
        });
    });

    describe("type annotations", () => {
        it("should parse simple type annotation", () => {
            const expr = parseExpression("x : Int");

            expect(expr).toMatchObject({
                kind: "TypeAnnotation",
                expr: { kind: "Var", name: "x" },
                typeExpr: { kind: "TypeConst", name: "Int" },
            });
        });

        it("should parse type annotation with complex expression", () => {
            const expr = parseExpression("x + 1 : Int");

            expect(expr).toMatchObject({
                kind: "TypeAnnotation",
                expr: {
                    kind: "BinOp",
                    op: "Add",
                    left: { kind: "Var", name: "x" },
                    right: { kind: "IntLit", value: 1 },
                },
                typeExpr: { kind: "TypeConst", name: "Int" },
            });
        });

        it("should parse type annotation with function type", () => {
            const expr = parseExpression("f : (Int) -> Int");

            expect(expr).toMatchObject({
                kind: "TypeAnnotation",
                expr: { kind: "Var", name: "f" },
                typeExpr: {
                    kind: "FunctionType",
                    params: [{ kind: "TypeConst", name: "Int" }],
                    return_: { kind: "TypeConst", name: "Int" },
                },
            });
        });

        it("should parse type annotation with generic type", () => {
            const expr = parseExpression("list : List<Int>");

            expect(expr).toMatchObject({
                kind: "TypeAnnotation",
                expr: { kind: "Var", name: "list" },
                typeExpr: {
                    kind: "TypeApp",
                    constructor: { kind: "TypeConst", name: "List" },
                    args: [{ kind: "TypeConst", name: "Int" }],
                },
            });
        });

        it("should parse type annotation with record type", () => {
            const expr = parseExpression("point : { x: Int, y: Int }");

            expect(expr).toMatchObject({
                kind: "TypeAnnotation",
                expr: { kind: "Var", name: "point" },
                typeExpr: {
                    kind: "RecordType",
                    fields: [
                        { name: "x", typeExpr: { kind: "TypeConst", name: "Int" } },
                        { name: "y", typeExpr: { kind: "TypeConst", name: "Int" } },
                    ],
                },
            });
        });

        it("should parse type annotation on function call", () => {
            const expr = parseExpression("getValue() : Int");

            expect(expr).toMatchObject({
                kind: "TypeAnnotation",
                expr: {
                    kind: "App",
                    func: { kind: "Var", name: "getValue" },
                    args: [],
                },
                typeExpr: { kind: "TypeConst", name: "Int" },
            });
        });

        it("should parse type annotation inside lambda body", () => {
            const expr = parseExpression("(x) => x + 1 : Int");

            // Lambda extends as far right as possible, so type annotation is inside the body
            expect(expr).toMatchObject({
                kind: "Lambda",
                params: [{ pattern: { kind: "VarPattern", name: "x" } }],
                body: {
                    kind: "TypeAnnotation",
                    expr: {
                        kind: "BinOp",
                        op: "Add",
                        left: { kind: "Var", name: "x" },
                        right: { kind: "IntLit", value: 1 },
                    },
                    typeExpr: { kind: "TypeConst", name: "Int" },
                },
            });
        });

        it("should parse type annotation on parenthesized lambda", () => {
            const expr = parseExpression("((x) => x + 1) : (Int) -> Int");

            // Parentheses force the type annotation to wrap the whole lambda
            expect(expr).toMatchObject({
                kind: "TypeAnnotation",
                expr: {
                    kind: "Lambda",
                    params: [{ pattern: { kind: "VarPattern", name: "x" } }],
                    body: {
                        kind: "BinOp",
                        op: "Add",
                        left: { kind: "Var", name: "x" },
                        right: { kind: "IntLit", value: 1 },
                    },
                },
                typeExpr: {
                    kind: "FunctionType",
                },
            });
        });

        it("should have low precedence (lower than pipe)", () => {
            const expr = parseExpression("x |> f : Int");

            expect(expr).toMatchObject({
                kind: "TypeAnnotation",
                expr: {
                    kind: "Pipe",
                    expr: { kind: "Var", name: "x" },
                    func: { kind: "Var", name: "f" },
                },
                typeExpr: { kind: "TypeConst", name: "Int" },
            });
        });

        it("should parse nested type annotations", () => {
            const expr = parseExpression("(x : Int) : Int");

            expect(expr).toMatchObject({
                kind: "TypeAnnotation",
                expr: {
                    kind: "TypeAnnotation",
                    expr: { kind: "Var", name: "x" },
                    typeExpr: { kind: "TypeConst", name: "Int" },
                },
                typeExpr: { kind: "TypeConst", name: "Int" },
            });
        });
    });
});
