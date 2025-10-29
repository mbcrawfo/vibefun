/**
 * Expression parsing tests
 */

import { describe, expect, it } from "vitest";

import { Lexer } from "../lexer/lexer.js";
import { ParserError } from "../utils/index.js";
import { Parser } from "./parser.js";

// Helper to create a parser and parse an expression
function parseExpression(source: string) {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    return parser.parseExpression();
}

describe("Parser - Expressions", () => {
    describe("integer literals", () => {
        it("should parse positive integer", () => {
            const expr = parseExpression("42");

            expect(expr).toMatchObject({
                kind: "IntLit",
                value: 42,
            });
            expect(expr.loc).toBeDefined();
        });

        it("should parse zero", () => {
            const expr = parseExpression("0");

            expect(expr).toMatchObject({
                kind: "IntLit",
                value: 0,
            });
        });

        it("should parse large integer", () => {
            const expr = parseExpression("999999");

            expect(expr).toMatchObject({
                kind: "IntLit",
                value: 999999,
            });
        });

        it("should parse hex literal", () => {
            const expr = parseExpression("0xFF");

            expect(expr).toMatchObject({
                kind: "IntLit",
                value: 255,
            });
        });

        it("should parse binary literal", () => {
            const expr = parseExpression("0b1010");

            expect(expr).toMatchObject({
                kind: "IntLit",
                value: 10,
            });
        });
    });

    describe("float literals", () => {
        it("should parse decimal float", () => {
            const expr = parseExpression("3.14");

            expect(expr).toMatchObject({
                kind: "FloatLit",
                value: 3.14,
            });
        });

        it("should parse float with leading zero", () => {
            const expr = parseExpression("0.5");

            expect(expr).toMatchObject({
                kind: "FloatLit",
                value: 0.5,
            });
        });

        it("should parse scientific notation", () => {
            const expr = parseExpression("1.5e10");

            expect(expr).toMatchObject({
                kind: "FloatLit",
                value: 1.5e10,
            });
        });

        it("should parse negative exponent", () => {
            const expr = parseExpression("3.14e-2");

            expect(expr).toMatchObject({
                kind: "FloatLit",
                value: 0.0314,
            });
        });
    });

    describe("string literals", () => {
        it("should parse simple string", () => {
            const expr = parseExpression('"hello"');

            expect(expr).toMatchObject({
                kind: "StringLit",
                value: "hello",
            });
        });

        it("should parse empty string", () => {
            const expr = parseExpression('""');

            expect(expr).toMatchObject({
                kind: "StringLit",
                value: "",
            });
        });

        it("should parse string with escape sequences", () => {
            const expr = parseExpression('"hello\\nworld"');

            expect(expr).toMatchObject({
                kind: "StringLit",
                value: "hello\nworld",
            });
        });

        it("should parse string with unicode", () => {
            const expr = parseExpression('"\\u0048\\u0065\\u006C\\u006C\\u006F"');

            expect(expr).toMatchObject({
                kind: "StringLit",
                value: "Hello",
            });
        });

        it("should parse multi-line string", () => {
            const expr = parseExpression('"""line1\nline2"""');

            expect(expr).toMatchObject({
                kind: "StringLit",
                value: "line1\nline2",
            });
        });
    });

    describe("boolean literals", () => {
        it("should parse true", () => {
            const expr = parseExpression("true");

            expect(expr).toMatchObject({
                kind: "BoolLit",
                value: true,
            });
        });

        it("should parse false", () => {
            const expr = parseExpression("false");

            expect(expr).toMatchObject({
                kind: "BoolLit",
                value: false,
            });
        });
    });

    describe("unit literal", () => {
        it("should parse unit ()", () => {
            const expr = parseExpression("()");

            expect(expr).toMatchObject({
                kind: "UnitLit",
            });
            expect(expr.loc).toBeDefined();
        });
    });

    describe("variables", () => {
        it("should parse simple identifier", () => {
            const expr = parseExpression("x");

            expect(expr).toMatchObject({
                kind: "Var",
                name: "x",
            });
        });

        it("should parse multi-character identifier", () => {
            const expr = parseExpression("myVariable");

            expect(expr).toMatchObject({
                kind: "Var",
                name: "myVariable",
            });
        });

        it("should parse identifier with underscores", () => {
            const expr = parseExpression("my_var_123");

            expect(expr).toMatchObject({
                kind: "Var",
                name: "my_var_123",
            });
        });

        it("should parse unicode identifier", () => {
            const expr = parseExpression("café");

            expect(expr).toMatchObject({
                kind: "Var",
                name: "café",
            });
        });
    });

    describe("parenthesized expressions", () => {
        it("should parse parenthesized integer", () => {
            const expr = parseExpression("(42)");

            expect(expr).toMatchObject({
                kind: "IntLit",
                value: 42,
            });
        });

        it("should parse nested parentheses", () => {
            const expr = parseExpression("((123))");

            expect(expr).toMatchObject({
                kind: "IntLit",
                value: 123,
            });
        });

        it("should parse parenthesized variable", () => {
            const expr = parseExpression("(x)");

            expect(expr).toMatchObject({
                kind: "Var",
                name: "x",
            });
        });

        it("should distinguish unit from parenthesized expression", () => {
            const unit = parseExpression("()");
            const paren = parseExpression("(42)");

            expect(unit.kind).toBe("UnitLit");
            expect(paren.kind).toBe("IntLit");
        });

        it("should throw on unclosed parenthesis", () => {
            expect(() => parseExpression("(42")).toThrow(ParserError);
        });
    });

    describe("error cases", () => {
        it("should throw on unexpected token", () => {
            expect(() => parseExpression("+")).toThrow(ParserError);
        });

        it("should throw on empty input", () => {
            expect(() => parseExpression("")).toThrow(ParserError);
        });

        it("should provide helpful error message", () => {
            try {
                parseExpression("+");
                // Should not reach here
                expect(true).toBe(false);
            } catch (error) {
                expect(error).toBeInstanceOf(ParserError);
                expect((error as ParserError).message).toContain("Unexpected token");
                expect((error as ParserError).help).toBeDefined();
            }
        });
    });

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
                const expr = parseExpression('"hello" ++ "world"');

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

        describe("bitwise", () => {
            it("should parse bitwise AND", () => {
                const expr = parseExpression("5 & 3");

                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "BitwiseAnd",
                });
            });

            it("should parse bitwise OR", () => {
                const expr = parseExpression("5 | 3");

                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "BitwiseOr",
                });
            });

            it("should parse left shift", () => {
                const expr = parseExpression("1 << 3");

                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "LeftShift",
                });
            });

            it("should parse right shift", () => {
                const expr = parseExpression("8 >> 2");

                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "RightShift",
                });
            });
        });

        describe("special", () => {
            it("should parse list cons", () => {
                const expr = parseExpression("1 :: rest");

                expect(expr).toMatchObject({
                    kind: "ListCons",
                    head: { kind: "IntLit", value: 1 },
                    tail: { kind: "Var", name: "rest" },
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
                    kind: "ListCons",
                    head: { kind: "IntLit", value: 1 },
                    tail: {
                        kind: "ListCons",
                        head: { kind: "IntLit", value: 2 },
                        tail: { kind: "Var", name: "rest" },
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

        it("should parse bitwise not", () => {
            const expr = parseExpression("~x");

            expect(expr).toMatchObject({
                kind: "UnaryOp",
                op: "BitwiseNot",
                expr: { kind: "Var", name: "x" },
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
        it.todo("will be added in Phase 4c");
    });

    describe("control flow", () => {
        it.todo("will be added in Phase 4");
    });

    describe("data structures", () => {
        it.todo("will be added in Phase 4");
    });
});
