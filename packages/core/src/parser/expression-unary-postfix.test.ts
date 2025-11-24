/**
 * Expression parsing tests - Unary and postfix operators
 */

import { describe, expect, it } from "vitest";

import { parseExpression } from "./expression-test-helpers.js";

describe("Parser - Unary and Postfix Operators", () => {
    describe("unary operators", () => {
        it("should parse negation", () => {
            const expr = parseExpression("-5");

            expect(expr).toMatchObject({
                kind: "UnaryOp",
                op: "Negate",
                expr: { kind: "IntLit", value: 5 },
            });
        });

        it("should parse logical not", () => {
            const expr = parseExpression("!true");

            expect(expr).toMatchObject({
                kind: "UnaryOp",
                op: "LogicalNot",
                expr: { kind: "BoolLit", value: true },
            });
        });

        it("should handle stacked unary operators", () => {
            const expr = parseExpression("--5");

            expect(expr).toMatchObject({
                kind: "UnaryOp",
                op: "Negate",
                expr: {
                    kind: "UnaryOp",
                    op: "Negate",
                    expr: { kind: "IntLit", value: 5 },
                },
            });
        });

        it("should handle mixed unary operators", () => {
            const expr = parseExpression("-!x");

            expect(expr).toMatchObject({
                kind: "UnaryOp",
                op: "Negate",
                expr: {
                    kind: "UnaryOp",
                    op: "LogicalNot",
                    expr: { kind: "Var", name: "x" },
                },
            });
        });

        it("should bind unary tighter than binary", () => {
            const expr = parseExpression("-a + b");

            expect(expr).toMatchObject({
                kind: "BinOp",
                op: "Add",
                left: {
                    kind: "UnaryOp",
                    op: "Negate",
                    expr: { kind: "Var", name: "a" },
                },
                right: { kind: "Var", name: "b" },
            });
        });

        it("should allow parentheses to override precedence", () => {
            const expr = parseExpression("-(a + b)");

            expect(expr).toMatchObject({
                kind: "UnaryOp",
                op: "Negate",
                expr: {
                    kind: "BinOp",
                    op: "Add",
                    left: { kind: "Var", name: "a" },
                    right: { kind: "Var", name: "b" },
                },
            });
        });
    });

    describe("postfix dereference", () => {
        it("should parse simple dereference", () => {
            const expr = parseExpression("x!");

            expect(expr).toMatchObject({
                kind: "UnaryOp",
                op: "Deref",
                expr: { kind: "Var", name: "x" },
            });
        });

        it("should parse dereference of identifier", () => {
            const expr = parseExpression("counter!");

            expect(expr).toMatchObject({
                kind: "UnaryOp",
                op: "Deref",
                expr: { kind: "Var", name: "counter" },
            });
        });

        it("should parse double dereference", () => {
            const expr = parseExpression("x!!");

            expect(expr).toMatchObject({
                kind: "UnaryOp",
                op: "Deref",
                expr: {
                    kind: "UnaryOp",
                    op: "Deref",
                    expr: { kind: "Var", name: "x" },
                },
            });
        });

        it("should parse triple dereference", () => {
            const expr = parseExpression("x!!!");

            expect(expr).toMatchObject({
                kind: "UnaryOp",
                op: "Deref",
                expr: {
                    kind: "UnaryOp",
                    op: "Deref",
                    expr: {
                        kind: "UnaryOp",
                        op: "Deref",
                        expr: { kind: "Var", name: "x" },
                    },
                },
            });
        });

        it("should parse dereference after field access", () => {
            const expr = parseExpression("obj.field!");

            expect(expr).toMatchObject({
                kind: "UnaryOp",
                op: "Deref",
                expr: {
                    kind: "RecordAccess",
                    record: { kind: "Var", name: "obj" },
                    field: "field",
                },
            });
        });

        it("should parse dereference after nested field access", () => {
            const expr = parseExpression("record.value!");

            expect(expr).toMatchObject({
                kind: "UnaryOp",
                op: "Deref",
                expr: {
                    kind: "RecordAccess",
                    record: { kind: "Var", name: "record" },
                    field: "value",
                },
            });
        });

        it("should parse dereference after function call", () => {
            const expr = parseExpression("getRef()!");

            expect(expr).toMatchObject({
                kind: "UnaryOp",
                op: "Deref",
                expr: {
                    kind: "App",
                    func: { kind: "Var", name: "getRef" },
                    args: [],
                },
            });
        });

        it("should parse dereference after call with args", () => {
            const expr = parseExpression("f(x)!");

            expect(expr).toMatchObject({
                kind: "UnaryOp",
                op: "Deref",
                expr: {
                    kind: "App",
                    func: { kind: "Var", name: "f" },
                    args: [{ kind: "Var", name: "x" }],
                },
            });
        });

        it("should parse dereference in addition", () => {
            const expr = parseExpression("x! + 1");

            expect(expr).toMatchObject({
                kind: "BinOp",
                op: "Add",
                left: {
                    kind: "UnaryOp",
                    op: "Deref",
                    expr: { kind: "Var", name: "x" },
                },
                right: { kind: "IntLit", value: 1 },
            });
        });

        it("should parse dereference in multiplication", () => {
            const expr = parseExpression("x! * 2");

            expect(expr).toMatchObject({
                kind: "BinOp",
                op: "Multiply",
                left: {
                    kind: "UnaryOp",
                    op: "Deref",
                    expr: { kind: "Var", name: "x" },
                },
                right: { kind: "IntLit", value: 2 },
            });
        });

        it("should parse dereference in equality", () => {
            const expr = parseExpression("x! == y!");

            expect(expr).toMatchObject({
                kind: "BinOp",
                op: "Equal",
                left: {
                    kind: "UnaryOp",
                    op: "Deref",
                    expr: { kind: "Var", name: "x" },
                },
                right: {
                    kind: "UnaryOp",
                    op: "Deref",
                    expr: { kind: "Var", name: "y" },
                },
            });
        });

        it("should parse prefix NOT of postfix deref", () => {
            const expr = parseExpression("!x!");

            expect(expr).toMatchObject({
                kind: "UnaryOp",
                op: "LogicalNot",
                expr: {
                    kind: "UnaryOp",
                    op: "Deref",
                    expr: { kind: "Var", name: "x" },
                },
            });
        });

        it("should parse negation of deref", () => {
            const expr = parseExpression("-x!");

            expect(expr).toMatchObject({
                kind: "UnaryOp",
                op: "Negate",
                expr: {
                    kind: "UnaryOp",
                    op: "Deref",
                    expr: { kind: "Var", name: "x" },
                },
            });
        });

        it("should parse complex expression with dereference", () => {
            const expr = parseExpression("obj.getRef()! + 5");

            expect(expr).toMatchObject({
                kind: "BinOp",
                op: "Add",
                left: {
                    kind: "UnaryOp",
                    op: "Deref",
                    expr: {
                        kind: "App",
                        func: {
                            kind: "RecordAccess",
                            record: { kind: "Var", name: "obj" },
                            field: "getRef",
                        },
                        args: [],
                    },
                },
                right: { kind: "IntLit", value: 5 },
            });
        });

        it("should parse dereference in conditional", () => {
            const expr = parseExpression("if x! then y else z");

            expect(expr).toMatchObject({
                kind: "If",
                condition: {
                    kind: "UnaryOp",
                    op: "Deref",
                    expr: { kind: "Var", name: "x" },
                },
                then: { kind: "Var", name: "y" },
                else_: { kind: "Var", name: "z" },
            });
        });
    });
});
