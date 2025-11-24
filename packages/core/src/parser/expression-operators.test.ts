/**
 * Expression parsing tests - Binary operators
 */

import { describe, expect, it } from "vitest";

import { parseExpression } from "./expression-test-helpers.js";

describe("Parser - Binary Operators", () => {
    describe("binary operators", () => {
        describe("arithmetic", () => {
            it("should parse addition", () => {
                const expr = parseExpression("1 + 2");

                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "Add",
                    left: { kind: "IntLit", value: 1 },
                    right: { kind: "IntLit", value: 2 },
                });
            });

            it("should parse subtraction", () => {
                const expr = parseExpression("5 - 3");

                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "Subtract",
                    left: { kind: "IntLit", value: 5 },
                    right: { kind: "IntLit", value: 3 },
                });
            });

            it("should parse multiplication", () => {
                const expr = parseExpression("2 * 3");

                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "Multiply",
                    left: { kind: "IntLit", value: 2 },
                    right: { kind: "IntLit", value: 3 },
                });
            });

            it("should parse division", () => {
                const expr = parseExpression("6 / 2");

                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "Divide",
                    left: { kind: "IntLit", value: 6 },
                    right: { kind: "IntLit", value: 2 },
                });
            });

            it("should parse modulo", () => {
                const expr = parseExpression("7 % 3");

                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "Modulo",
                    left: { kind: "IntLit", value: 7 },
                    right: { kind: "IntLit", value: 3 },
                });
            });

            it("should parse string concatenation", () => {
                const expr = parseExpression('"hello" & "world"');

                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "Concat",
                    left: { kind: "StringLit", value: "hello" },
                    right: { kind: "StringLit", value: "world" },
                });
            });
        });

        describe("comparison", () => {
            it("should parse less than", () => {
                const expr = parseExpression("1 < 2");

                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "LessThan",
                    left: { kind: "IntLit", value: 1 },
                    right: { kind: "IntLit", value: 2 },
                });
            });

            it("should parse less than or equal", () => {
                const expr = parseExpression("1 <= 2");

                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "LessEqual",
                });
            });

            it("should parse greater than", () => {
                const expr = parseExpression("2 > 1");

                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "GreaterThan",
                });
            });

            it("should parse greater than or equal", () => {
                const expr = parseExpression("2 >= 1");

                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "GreaterEqual",
                });
            });

            it("should parse equality", () => {
                const expr = parseExpression("1 == 1");

                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "Equal",
                });
            });

            it("should parse inequality", () => {
                const expr = parseExpression("1 != 2");

                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "NotEqual",
                });
            });
        });

        describe("logical", () => {
            it("should parse logical AND", () => {
                const expr = parseExpression("true && false");

                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "LogicalAnd",
                });
            });

            it("should parse logical OR", () => {
                const expr = parseExpression("true || false");

                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "LogicalOr",
                });
            });
        });

        describe("special", () => {
            it("should parse list cons", () => {
                const expr = parseExpression("1 :: rest");

                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "Cons",
                    left: { kind: "IntLit", value: 1 },
                    right: { kind: "Var", name: "rest" },
                });
            });

            it("should parse pipe", () => {
                const expr = parseExpression("x |> f");

                expect(expr).toMatchObject({
                    kind: "Pipe",
                    expr: { kind: "Var", name: "x" },
                    func: { kind: "Var", name: "f" },
                });
            });

            it("should parse reference assignment", () => {
                const expr = parseExpression("r := value");

                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "RefAssign",
                    left: { kind: "Var", name: "r" },
                    right: { kind: "Var", name: "value" },
                });
            });

            it("should parse forward composition", () => {
                const expr = parseExpression("f >> g");

                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "ForwardCompose",
                    left: { kind: "Var", name: "f" },
                    right: { kind: "Var", name: "g" },
                });
            });

            it("should parse backward composition", () => {
                const expr = parseExpression("f << g");

                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "BackwardCompose",
                    left: { kind: "Var", name: "f" },
                    right: { kind: "Var", name: "g" },
                });
            });

            it("should parse chained forward composition", () => {
                const expr = parseExpression("f >> g >> h");

                // Should parse as (f >> g) >> h (left-associative)
                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "ForwardCompose",
                    left: {
                        kind: "BinOp",
                        op: "ForwardCompose",
                        left: { kind: "Var", name: "f" },
                        right: { kind: "Var", name: "g" },
                    },
                    right: { kind: "Var", name: "h" },
                });
            });

            it("should parse chained backward composition", () => {
                const expr = parseExpression("f << g << h");

                // Should parse as (f << g) << h (left-associative)
                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "BackwardCompose",
                    left: {
                        kind: "BinOp",
                        op: "BackwardCompose",
                        left: { kind: "Var", name: "f" },
                        right: { kind: "Var", name: "g" },
                    },
                    right: { kind: "Var", name: "h" },
                });
            });

            it("should parse mixed composition operators", () => {
                const expr = parseExpression("f >> g << h");

                // Should parse as (f >> g) << h (left-associative, same precedence)
                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "BackwardCompose",
                    left: {
                        kind: "BinOp",
                        op: "ForwardCompose",
                        left: { kind: "Var", name: "f" },
                        right: { kind: "Var", name: "g" },
                    },
                    right: { kind: "Var", name: "h" },
                });
            });

            it("should respect composition precedence with arithmetic", () => {
                const expr = parseExpression("x + 1 >> f");

                // Should parse as (x + 1) >> f (arithmetic binds tighter)
                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "ForwardCompose",
                    left: {
                        kind: "BinOp",
                        op: "Add",
                        left: { kind: "Var", name: "x" },
                        right: { kind: "IntLit", value: 1 },
                    },
                    right: { kind: "Var", name: "f" },
                });
            });

            it("should respect composition precedence with logical operators", () => {
                // Composition (level 4) calls LogicalOr (level 5), so logical binds tighter
                // Test simple case: f >> g && h should parse with && binding tighter
                const expr = parseExpression("f >> g && h");

                // Should have composition at top level with logical and inside
                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "ForwardCompose",
                    left: { kind: "Var", name: "f" },
                    right: {
                        kind: "BinOp",
                        op: "LogicalAnd",
                        left: { kind: "Var", name: "g" },
                        right: { kind: "Var", name: "h" },
                    },
                });
            });

            it("should parse composition with function calls", () => {
                const expr = parseExpression("parse() >> validate");

                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "ForwardCompose",
                    left: {
                        kind: "App",
                        func: { kind: "Var", name: "parse" },
                        args: [],
                    },
                    right: { kind: "Var", name: "validate" },
                });
            });
        });

        describe("precedence", () => {
            it("should respect multiplication over addition", () => {
                const expr = parseExpression("1 + 2 * 3");

                // Should parse as 1 + (2 * 3), not (1 + 2) * 3
                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "Add",
                    left: { kind: "IntLit", value: 1 },
                    right: {
                        kind: "BinOp",
                        op: "Multiply",
                        left: { kind: "IntLit", value: 2 },
                        right: { kind: "IntLit", value: 3 },
                    },
                });
            });

            it("should respect division over subtraction", () => {
                const expr = parseExpression("10 - 6 / 2");

                // Should parse as 10 - (6 / 2)
                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "Subtract",
                    left: { kind: "IntLit", value: 10 },
                    right: {
                        kind: "BinOp",
                        op: "Divide",
                        left: { kind: "IntLit", value: 6 },
                        right: { kind: "IntLit", value: 2 },
                    },
                });
            });

            it("should respect comparison over logical AND", () => {
                const expr = parseExpression("1 < 2 && 3 < 4");

                // Should parse as (1 < 2) && (3 < 4)
                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "LogicalAnd",
                    left: {
                        kind: "BinOp",
                        op: "LessThan",
                    },
                    right: {
                        kind: "BinOp",
                        op: "LessThan",
                    },
                });
            });

            it("should respect logical AND over logical OR", () => {
                const expr = parseExpression("true || false && true");

                // Should parse as true || (false && true)
                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "LogicalOr",
                    left: { kind: "BoolLit", value: true },
                    right: {
                        kind: "BinOp",
                        op: "LogicalAnd",
                        left: { kind: "BoolLit", value: false },
                        right: { kind: "BoolLit", value: true },
                    },
                });
            });

            it("should handle complex precedence chain", () => {
                const expr = parseExpression("1 + 2 * 3 - 4 / 2");

                // Should parse as (1 + (2 * 3)) - (4 / 2)
                expect(expr.kind).toBe("BinOp");
                if (expr.kind === "BinOp") {
                    expect(expr.op).toBe("Subtract");
                }
            });
        });

        describe("associativity", () => {
            it("should left-associate addition", () => {
                const expr = parseExpression("1 + 2 + 3");

                // Should parse as (1 + 2) + 3
                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "Add",
                    left: {
                        kind: "BinOp",
                        op: "Add",
                        left: { kind: "IntLit", value: 1 },
                        right: { kind: "IntLit", value: 2 },
                    },
                    right: { kind: "IntLit", value: 3 },
                });
            });

            it("should right-associate cons", () => {
                const expr = parseExpression("1 :: 2 :: rest");

                // Should parse as 1 :: (2 :: rest)
                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "Cons",
                    left: { kind: "IntLit", value: 1 },
                    right: {
                        kind: "BinOp",
                        op: "Cons",
                        left: { kind: "IntLit", value: 2 },
                        right: { kind: "Var", name: "rest" },
                    },
                });
            });

            it("should right-associate reference assignment", () => {
                const expr = parseExpression("a := b := c");

                // Should parse as a := (b := c)
                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "RefAssign",
                    left: { kind: "Var", name: "a" },
                    right: {
                        kind: "BinOp",
                        op: "RefAssign",
                        left: { kind: "Var", name: "b" },
                        right: { kind: "Var", name: "c" },
                    },
                });
            });

            it("should left-associate pipe", () => {
                const expr = parseExpression("x |> f |> g");

                // Should parse as (x |> f) |> g
                expect(expr).toMatchObject({
                    kind: "Pipe",
                    expr: {
                        kind: "Pipe",
                        expr: { kind: "Var", name: "x" },
                        func: { kind: "Var", name: "f" },
                    },
                    func: { kind: "Var", name: "g" },
                });
            });
        });

        describe("parentheses override precedence", () => {
            it("should allow parentheses to override precedence", () => {
                const expr = parseExpression("(1 + 2) * 3");

                // Should parse as (1 + 2) * 3, not 1 + (2 * 3)
                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "Multiply",
                    left: {
                        kind: "BinOp",
                        op: "Add",
                        left: { kind: "IntLit", value: 1 },
                        right: { kind: "IntLit", value: 2 },
                    },
                    right: { kind: "IntLit", value: 3 },
                });
            });
        });
    });
});
