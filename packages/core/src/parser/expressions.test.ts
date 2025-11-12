/**
 * Expression parsing tests
 */

import { describe, expect, it } from "vitest";

import { Lexer } from "../lexer/index.js";
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
                params: [{ kind: "VarPattern", name: "x" }],
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
                    { kind: "VarPattern", name: "x" },
                    { kind: "VarPattern", name: "y" },
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
                    { kind: "VarPattern", name: "x" },
                    { kind: "VarPattern", name: "y" },
                    { kind: "VarPattern", name: "z" },
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
                params: [{ kind: "VarPattern", name: "x" }],
                body: {
                    kind: "Lambda",
                    params: [{ kind: "VarPattern", name: "y" }],
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
                        params: [{ kind: "VarPattern", name: "x" }],
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
                params: [{ kind: "VarPattern", name: "x" }],
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
                params: [{ kind: "VarPattern", name: "x" }],
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
                params: [{ kind: "VarPattern", name: "x" }],
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
                    params: [{ kind: "VarPattern", name: "x" }],
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

    describe("block expressions", () => {
        it("should parse block with multiple expressions", () => {
            const expr = parseExpression("{ 1; 2; 3; }");

            expect(expr).toMatchObject({
                kind: "Block",
                exprs: [
                    { kind: "IntLit", value: 1 },
                    { kind: "IntLit", value: 2 },
                    { kind: "IntLit", value: 3 },
                ],
            });
        });

        it("should parse block with trailing semicolon", () => {
            const expr = parseExpression("{ 1; 2; }");

            expect(expr).toMatchObject({
                kind: "Block",
                exprs: [
                    { kind: "IntLit", value: 1 },
                    { kind: "IntLit", value: 2 },
                ],
            });
        });

        it("should parse block starting with if", () => {
            const expr = parseExpression("{ if true then 1 else 2; 3; }");

            expect(expr).toMatchObject({
                kind: "Block",
                exprs: [
                    {
                        kind: "If",
                        condition: { kind: "BoolLit", value: true },
                        then: { kind: "IntLit", value: 1 },
                        else_: { kind: "IntLit", value: 2 },
                    },
                    { kind: "IntLit", value: 3 },
                ],
            });
        });

        it("should parse nested blocks", () => {
            const expr = parseExpression("{ { 1; 2; }; 3; }");

            expect(expr).toMatchObject({
                kind: "Block",
                exprs: [
                    {
                        kind: "Block",
                        exprs: [
                            { kind: "IntLit", value: 1 },
                            { kind: "IntLit", value: 2 },
                        ],
                    },
                    { kind: "IntLit", value: 3 },
                ],
            });
        });

        it("should parse block with function calls", () => {
            const expr = parseExpression("{ print(x); y; }");

            expect(expr).toMatchObject({
                kind: "Block",
                exprs: [
                    {
                        kind: "App",
                        func: { kind: "Var", name: "print" },
                        args: [{ kind: "Var", name: "x" }],
                    },
                    { kind: "Var", name: "y" },
                ],
            });
        });

        it("should parse block with complex expressions", () => {
            const expr = parseExpression("{ (x) => x + 1; 10; }");

            expect(expr).toMatchObject({
                kind: "Block",
                exprs: [
                    {
                        kind: "Lambda",
                        params: [{ kind: "VarPattern", name: "x" }],
                        body: {
                            kind: "BinOp",
                            op: "Add",
                        },
                    },
                    { kind: "IntLit", value: 10 },
                ],
            });
        });

        it("should parse block in lambda body", () => {
            const expr = parseExpression("(x) => { x + 1; x; }");

            expect(expr).toMatchObject({
                kind: "Lambda",
                params: [{ kind: "VarPattern", name: "x" }],
                body: {
                    kind: "Block",
                    exprs: [
                        {
                            kind: "BinOp",
                            op: "Add",
                            left: { kind: "Var", name: "x" },
                            right: { kind: "IntLit", value: 1 },
                        },
                        { kind: "Var", name: "x" },
                    ],
                },
            });
        });

        it("should parse block with match expression", () => {
            const expr = parseExpression("{ match x { | 1 => a | 2 => b }; c; }");

            expect(expr).toMatchObject({
                kind: "Block",
                exprs: [
                    {
                        kind: "Match",
                        expr: { kind: "Var", name: "x" },
                    },
                    { kind: "Var", name: "c" },
                ],
            });
        });

        it("should parse single field shorthand as record (not ambiguous)", () => {
            // Single field shorthand like { x } is valid - creates record with field x
            const expr = parseExpression("{ x }");
            expect(expr.kind).toBe("Record");
            if (expr.kind !== "Record") return;
            expect(expr.fields).toHaveLength(1);
        });

        it("should throw on missing semicolon between expressions", () => {
            expect(() => parseExpression("{ 1 2 }")).toThrow(ParserError);
        });

        it("should throw on unclosed block", () => {
            expect(() => parseExpression("{ 1; 2")).toThrow(ParserError);
        });

        it("should allow single expression with semicolon", () => {
            const expr = parseExpression("{ 42; }");

            expect(expr).toMatchObject({
                kind: "Block",
                exprs: [{ kind: "IntLit", value: 42 }],
            });
        });

        it("should distinguish blocks from records", () => {
            const block = parseExpression("{ 1; 2; }");
            const record = parseExpression("{ x: 1 }");

            expect(block.kind).toBe("Block");
            expect(record.kind).toBe("Record");
        });
    });

    describe("unsafe blocks", () => {
        it("should parse unsafe block with simple expression", () => {
            const expr = parseExpression("unsafe { x }");

            expect(expr).toMatchObject({
                kind: "Unsafe",
                expr: { kind: "Var", name: "x" },
            });
            expect(expr.loc).toBeDefined();
        });

        it("should parse unsafe block with function call", () => {
            const expr = parseExpression("unsafe { log(message) }");

            expect(expr).toMatchObject({
                kind: "Unsafe",
                expr: {
                    kind: "App",
                    func: { kind: "Var", name: "log" },
                    args: [{ kind: "Var", name: "message" }],
                },
            });
        });

        it("should parse unsafe block with complex expression", () => {
            const expr = parseExpression("unsafe { x + y * 2 }");

            expect(expr).toMatchObject({
                kind: "Unsafe",
                expr: {
                    kind: "BinOp",
                    op: "Add",
                    left: { kind: "Var", name: "x" },
                    right: {
                        kind: "BinOp",
                        op: "Multiply",
                        left: { kind: "Var", name: "y" },
                        right: { kind: "IntLit", value: 2 },
                    },
                },
            });
        });

        it("should parse nested unsafe blocks", () => {
            const expr = parseExpression("unsafe { unsafe { x } }");

            expect(expr).toMatchObject({
                kind: "Unsafe",
                expr: {
                    kind: "Unsafe",
                    expr: { kind: "Var", name: "x" },
                },
            });
        });

        it("should parse unsafe block in larger expression", () => {
            const expr = parseExpression("unsafe { getValue() } + 10");

            expect(expr).toMatchObject({
                kind: "BinOp",
                op: "Add",
                left: {
                    kind: "Unsafe",
                    expr: {
                        kind: "App",
                        func: { kind: "Var", name: "getValue" },
                        args: [],
                    },
                },
                right: { kind: "IntLit", value: 10 },
            });
        });

        it("should throw on unsafe without braces", () => {
            expect(() => parseExpression("unsafe x")).toThrow(ParserError);
        });

        it("should throw on unclosed unsafe block", () => {
            expect(() => parseExpression("unsafe { x")).toThrow(ParserError);
        });

        it("should parse unsafe with record construction", () => {
            const expr = parseExpression("unsafe { { x: 1, y: 2 } }");

            expect(expr).toMatchObject({
                kind: "Unsafe",
                expr: {
                    kind: "Record",
                    fields: [
                        { name: "x", value: { kind: "IntLit", value: 1 } },
                        { name: "y", value: { kind: "IntLit", value: 2 } },
                    ],
                },
            });
        });
    });

    describe("control flow", () => {
        describe("if expressions", () => {
            it("should parse if-then-else", () => {
                const expr = parseExpression("if x then 1 else 0");

                expect(expr).toMatchObject({
                    kind: "If",
                    condition: { kind: "Var", name: "x" },
                    then: { kind: "IntLit", value: 1 },
                    else_: { kind: "IntLit", value: 0 },
                });
            });

            it("should parse if with complex condition", () => {
                const expr = parseExpression("if x > 0 then x else -x");

                expect(expr).toMatchObject({
                    kind: "If",
                    condition: {
                        kind: "BinOp",
                        op: "GreaterThan",
                        left: { kind: "Var", name: "x" },
                        right: { kind: "IntLit", value: 0 },
                    },
                    then: { kind: "Var", name: "x" },
                    else_: {
                        kind: "UnaryOp",
                        op: "Negate",
                        expr: { kind: "Var", name: "x" },
                    },
                });
            });

            it("should parse nested if expressions", () => {
                const expr = parseExpression("if a then if b then 1 else 2 else 3");

                expect(expr).toMatchObject({
                    kind: "If",
                    condition: { kind: "Var", name: "a" },
                    then: {
                        kind: "If",
                        condition: { kind: "Var", name: "b" },
                        then: { kind: "IntLit", value: 1 },
                        else_: { kind: "IntLit", value: 2 },
                    },
                    else_: { kind: "IntLit", value: 3 },
                });
            });

            it("should parse if with function calls", () => {
                const expr = parseExpression("if isEmpty(list) then 0 else length(list)");

                expect(expr).toMatchObject({
                    kind: "If",
                    condition: {
                        kind: "App",
                        func: { kind: "Var", name: "isEmpty" },
                        args: [{ kind: "Var", name: "list" }],
                    },
                    then: { kind: "IntLit", value: 0 },
                    else_: {
                        kind: "App",
                        func: { kind: "Var", name: "length" },
                        args: [{ kind: "Var", name: "list" }],
                    },
                });
            });
        });

        describe("match expressions", () => {
            it("should parse match with single case", () => {
                const expr = parseExpression("match x { | y => y + 1 }");

                expect(expr).toMatchObject({
                    kind: "Match",
                    expr: { kind: "Var", name: "x" },
                    cases: [
                        {
                            pattern: { kind: "VarPattern", name: "y" },
                            body: {
                                kind: "BinOp",
                                op: "Add",
                                left: { kind: "Var", name: "y" },
                                right: { kind: "IntLit", value: 1 },
                            },
                        },
                    ],
                });
            });

            it("should parse match with multiple cases", () => {
                const expr = parseExpression("match x { | a => 1 | b => 2 | c => 3 }");

                expect(expr).toMatchObject({
                    kind: "Match",
                    expr: { kind: "Var", name: "x" },
                    cases: [
                        {
                            pattern: { kind: "VarPattern", name: "a" },
                            body: { kind: "IntLit", value: 1 },
                        },
                        {
                            pattern: { kind: "VarPattern", name: "b" },
                            body: { kind: "IntLit", value: 2 },
                        },
                        {
                            pattern: { kind: "VarPattern", name: "c" },
                            body: { kind: "IntLit", value: 3 },
                        },
                    ],
                });
            });

            it("should parse match with wildcard pattern", () => {
                const expr = parseExpression("match x { | _ => 0 }");

                expect(expr).toMatchObject({
                    kind: "Match",
                    expr: { kind: "Var", name: "x" },
                    cases: [
                        {
                            pattern: { kind: "WildcardPattern" },
                            body: { kind: "IntLit", value: 0 },
                        },
                    ],
                });
            });

            it("should parse match with guard", () => {
                const expr = parseExpression("match x { | n when n > 0 => n | _ => 0 }");

                expect(expr).toMatchObject({
                    kind: "Match",
                    expr: { kind: "Var", name: "x" },
                    cases: [
                        {
                            pattern: { kind: "VarPattern", name: "n" },
                            guard: {
                                kind: "BinOp",
                                op: "GreaterThan",
                                left: { kind: "Var", name: "n" },
                                right: { kind: "IntLit", value: 0 },
                            },
                            body: { kind: "Var", name: "n" },
                        },
                        {
                            pattern: { kind: "WildcardPattern" },
                            body: { kind: "IntLit", value: 0 },
                        },
                    ],
                });
            });

            it("should require leading pipes for all cases", () => {
                const expr = parseExpression("match x { | a => 1 | b => 2 }");

                expect(expr).toMatchObject({
                    kind: "Match",
                    expr: { kind: "Var", name: "x" },
                    cases: [
                        {
                            pattern: { kind: "VarPattern", name: "a" },
                            body: { kind: "IntLit", value: 1 },
                        },
                        {
                            pattern: { kind: "VarPattern", name: "b" },
                            body: { kind: "IntLit", value: 2 },
                        },
                    ],
                });
            });

            it("should parse lambda as match case body", () => {
                const expr = parseExpression("match x { | Some(v) => v => v + 1 | None => () => 0 }");

                expect(expr.kind).toBe("Match");
                if (expr.kind !== "Match") return;

                expect(expr.expr).toMatchObject({ kind: "Var", name: "x" });
                expect(expr.cases).toHaveLength(2);

                // First case: Some(v) => v => v + 1
                const case1 = expr.cases[0];
                expect(case1?.pattern.kind).toBe("ConstructorPattern");
                if (case1?.pattern.kind === "ConstructorPattern") {
                    expect(case1.pattern.constructor).toBe("Some");
                    expect(case1.pattern.args).toHaveLength(1);
                }
                expect(case1?.body.kind).toBe("Lambda");

                // Second case: None => () => 0
                const case2 = expr.cases[1];
                expect(case2?.pattern.kind).toBe("ConstructorPattern");
                if (case2?.pattern.kind === "ConstructorPattern") {
                    expect(case2.pattern.constructor).toBe("None");
                    expect(case2.pattern.args).toHaveLength(0);
                }
                expect(case2?.body.kind).toBe("Lambda");
            });

            it("should parse match with complex expressions", () => {
                const expr = parseExpression("match getValue() { | x => x * 2 + 1 }");

                expect(expr).toMatchObject({
                    kind: "Match",
                    expr: {
                        kind: "App",
                        func: { kind: "Var", name: "getValue" },
                        args: [],
                    },
                    cases: [
                        {
                            pattern: { kind: "VarPattern", name: "x" },
                            body: {
                                kind: "BinOp",
                                op: "Add",
                                left: {
                                    kind: "BinOp",
                                    op: "Multiply",
                                    left: { kind: "Var", name: "x" },
                                    right: { kind: "IntLit", value: 2 },
                                },
                                right: { kind: "IntLit", value: 1 },
                            },
                        },
                    ],
                });
            });
        });
    });

    describe("data structures", () => {
        describe("lists", () => {
            it("should parse empty list", () => {
                const expr = parseExpression("[]");

                expect(expr).toMatchObject({
                    kind: "List",
                    elements: [],
                });
            });

            it("should parse list with one element", () => {
                const expr = parseExpression("[1]");

                expect(expr).toMatchObject({
                    kind: "List",
                    elements: [{ kind: "Element", expr: { kind: "IntLit", value: 1 } }],
                });
            });

            it("should parse list with multiple elements", () => {
                const expr = parseExpression("[1, 2, 3]");

                expect(expr).toMatchObject({
                    kind: "List",
                    elements: [
                        { kind: "Element", expr: { kind: "IntLit", value: 1 } },
                        { kind: "Element", expr: { kind: "IntLit", value: 2 } },
                        { kind: "Element", expr: { kind: "IntLit", value: 3 } },
                    ],
                });
            });

            it("should parse list with expressions", () => {
                const expr = parseExpression("[a + b, c * d]");

                expect(expr).toMatchObject({
                    kind: "List",
                    elements: [
                        {
                            kind: "Element",
                            expr: {
                                kind: "BinOp",
                                op: "Add",
                                left: { kind: "Var", name: "a" },
                                right: { kind: "Var", name: "b" },
                            },
                        },
                        {
                            kind: "Element",
                            expr: {
                                kind: "BinOp",
                                op: "Multiply",
                                left: { kind: "Var", name: "c" },
                                right: { kind: "Var", name: "d" },
                            },
                        },
                    ],
                });
            });

            it("should parse nested lists", () => {
                const expr = parseExpression("[[1, 2], [3, 4]]");

                expect(expr).toMatchObject({
                    kind: "List",
                    elements: [
                        {
                            kind: "Element",
                            expr: {
                                kind: "List",
                                elements: [
                                    { kind: "Element", expr: { kind: "IntLit", value: 1 } },
                                    { kind: "Element", expr: { kind: "IntLit", value: 2 } },
                                ],
                            },
                        },
                        {
                            kind: "Element",
                            expr: {
                                kind: "List",
                                elements: [
                                    { kind: "Element", expr: { kind: "IntLit", value: 3 } },
                                    { kind: "Element", expr: { kind: "IntLit", value: 4 } },
                                ],
                            },
                        },
                    ],
                });
            });
        });

        describe("list spreads", () => {
            it("should parse list with spread at end", () => {
                const expr = parseExpression("[1, 2, ...rest]");

                expect(expr).toMatchObject({
                    kind: "List",
                    elements: [
                        { kind: "Element", expr: { kind: "IntLit", value: 1 } },
                        { kind: "Element", expr: { kind: "IntLit", value: 2 } },
                        { kind: "Spread", expr: { kind: "Var", name: "rest" } },
                    ],
                });
            });

            it("should parse list with spread only", () => {
                const expr = parseExpression("[...items]");

                expect(expr).toMatchObject({
                    kind: "List",
                    elements: [{ kind: "Spread", expr: { kind: "Var", name: "items" } }],
                });
            });

            it("should parse list with spread at start", () => {
                const expr = parseExpression("[...start, 1, 2]");

                expect(expr).toMatchObject({
                    kind: "List",
                    elements: [
                        { kind: "Spread", expr: { kind: "Var", name: "start" } },
                        { kind: "Element", expr: { kind: "IntLit", value: 1 } },
                        { kind: "Element", expr: { kind: "IntLit", value: 2 } },
                    ],
                });
            });

            it("should parse list with spread in middle", () => {
                const expr = parseExpression("[1, ...middle, 5]");

                expect(expr).toMatchObject({
                    kind: "List",
                    elements: [
                        { kind: "Element", expr: { kind: "IntLit", value: 1 } },
                        { kind: "Spread", expr: { kind: "Var", name: "middle" } },
                        { kind: "Element", expr: { kind: "IntLit", value: 5 } },
                    ],
                });
            });

            it("should parse list with multiple spreads", () => {
                const expr = parseExpression("[...xs, ...ys]");

                expect(expr).toMatchObject({
                    kind: "List",
                    elements: [
                        { kind: "Spread", expr: { kind: "Var", name: "xs" } },
                        { kind: "Spread", expr: { kind: "Var", name: "ys" } },
                    ],
                });
            });

            it("should parse list with three spreads", () => {
                const expr = parseExpression("[...a, ...b, ...c]");

                expect(expr).toMatchObject({
                    kind: "List",
                    elements: [
                        { kind: "Spread", expr: { kind: "Var", name: "a" } },
                        { kind: "Spread", expr: { kind: "Var", name: "b" } },
                        { kind: "Spread", expr: { kind: "Var", name: "c" } },
                    ],
                });
            });

            it("should parse list with mixed elements and spreads", () => {
                const expr = parseExpression("[...start, 1, 2, ...end]");

                expect(expr).toMatchObject({
                    kind: "List",
                    elements: [
                        { kind: "Spread", expr: { kind: "Var", name: "start" } },
                        { kind: "Element", expr: { kind: "IntLit", value: 1 } },
                        { kind: "Element", expr: { kind: "IntLit", value: 2 } },
                        { kind: "Spread", expr: { kind: "Var", name: "end" } },
                    ],
                });
            });

            it("should parse nested list with spread", () => {
                const expr = parseExpression("[[...inner]]");

                expect(expr).toMatchObject({
                    kind: "List",
                    elements: [
                        {
                            kind: "Element",
                            expr: {
                                kind: "List",
                                elements: [{ kind: "Spread", expr: { kind: "Var", name: "inner" } }],
                            },
                        },
                    ],
                });
            });

            it("should parse spread of list literal", () => {
                const expr = parseExpression("[...[1, 2, 3]]");

                expect(expr).toMatchObject({
                    kind: "List",
                    elements: [
                        {
                            kind: "Spread",
                            expr: {
                                kind: "List",
                                elements: [
                                    { kind: "Element", expr: { kind: "IntLit", value: 1 } },
                                    { kind: "Element", expr: { kind: "IntLit", value: 2 } },
                                    { kind: "Element", expr: { kind: "IntLit", value: 3 } },
                                ],
                            },
                        },
                    ],
                });
            });

            it("should parse spread with complex expression", () => {
                const expr = parseExpression("[...getList(), 1]");

                expect(expr).toMatchObject({
                    kind: "List",
                    elements: [
                        {
                            kind: "Spread",
                            expr: {
                                kind: "App",
                                func: { kind: "Var", name: "getList" },
                                args: [],
                            },
                        },
                        { kind: "Element", expr: { kind: "IntLit", value: 1 } },
                    ],
                });
            });

            it("should parse list spread in pipe expression", () => {
                const expr = parseExpression("[...xs] |> map(f)");

                expect(expr).toMatchObject({
                    kind: "Pipe",
                    expr: {
                        kind: "List",
                        elements: [{ kind: "Spread", expr: { kind: "Var", name: "xs" } }],
                    },
                    func: {
                        kind: "App",
                        func: { kind: "Var", name: "map" },
                        args: [{ kind: "Var", name: "f" }],
                    },
                });
            });

            it("should parse list spread with binary operation", () => {
                const expr = parseExpression("[...xs, a + b]");

                expect(expr).toMatchObject({
                    kind: "List",
                    elements: [
                        { kind: "Spread", expr: { kind: "Var", name: "xs" } },
                        {
                            kind: "Element",
                            expr: {
                                kind: "BinOp",
                                op: "Add",
                                left: { kind: "Var", name: "a" },
                                right: { kind: "Var", name: "b" },
                            },
                        },
                    ],
                });
            });
        });

        describe("records", () => {
            it("should parse empty record", () => {
                const expr = parseExpression("{}");

                expect(expr).toMatchObject({
                    kind: "Record",
                    fields: [],
                });
            });

            it("should parse record with one field", () => {
                const expr = parseExpression("{ x: 1 }");

                expect(expr).toMatchObject({
                    kind: "Record",
                    fields: [{ name: "x", value: { kind: "IntLit", value: 1 } }],
                });
            });

            it("should parse record with multiple fields", () => {
                const expr = parseExpression("{ x: 1, y: 2, z: 3 }");

                expect(expr).toMatchObject({
                    kind: "Record",
                    fields: [
                        { name: "x", value: { kind: "IntLit", value: 1 } },
                        { name: "y", value: { kind: "IntLit", value: 2 } },
                        { name: "z", value: { kind: "IntLit", value: 3 } },
                    ],
                });
            });

            it("should parse record with expression values", () => {
                const expr = parseExpression("{ sum: a + b, product: c * d }");

                expect(expr).toMatchObject({
                    kind: "Record",
                    fields: [
                        {
                            name: "sum",
                            value: {
                                kind: "BinOp",
                                op: "Add",
                                left: { kind: "Var", name: "a" },
                                right: { kind: "Var", name: "b" },
                            },
                        },
                        {
                            name: "product",
                            value: {
                                kind: "BinOp",
                                op: "Multiply",
                                left: { kind: "Var", name: "c" },
                                right: { kind: "Var", name: "d" },
                            },
                        },
                    ],
                });
            });

            it("should parse nested records", () => {
                const expr = parseExpression("{ inner: { x: 1 } }");

                expect(expr).toMatchObject({
                    kind: "Record",
                    fields: [
                        {
                            name: "inner",
                            value: {
                                kind: "Record",
                                fields: [{ name: "x", value: { kind: "IntLit", value: 1 } }],
                            },
                        },
                    ],
                });
            });
        });

        describe("Record field comma requirements", () => {
            // Negative tests - should error when commas are missing

            it("should require comma between regular fields on same line", () => {
                expect(() => parseExpression("{ x: 1 y: 2 }")).toThrow(ParserError);
                expect(() => parseExpression("{ x: 1 y: 2 }")).toThrow(/Expected ',' between record fields/);
            });

            it("should require comma between shorthand fields", () => {
                // Note: Error is "Expected ':' after field name" because parser
                // tries to parse 'y' as a regular field after shorthand 'x'
                expect(() => parseExpression("{ x y z }")).toThrow(ParserError);
            });

            it("should require comma in multi-line records", () => {
                expect(() =>
                    parseExpression(`{
                        x: 1
                        y: 2
                    }`),
                ).toThrow(ParserError);
                expect(() =>
                    parseExpression(`{
                        x: 1
                        y: 2
                    }`),
                ).toThrow(/Expected ',' between record fields/);
            });

            it("should require comma after spread operator", () => {
                expect(() => parseExpression("{ ...base x: 1 }")).toThrow(ParserError);
                expect(() => parseExpression("{ ...base x: 1 }")).toThrow(/Expected ',' between record fields/);
            });

            it("should require comma in mixed shorthand and regular fields", () => {
                // Note: Error is "Expected ':' after field name" because parser
                // tries to parse 'age' as a regular field after shorthand 'x'
                expect(() => parseExpression("{ x age: 30 }")).toThrow(ParserError);
            });

            it("should require comma after field even with comment-induced newline", () => {
                // Comments are not yet implemented, but when they are, this should error
                // For now, this tests that newlines alone don't substitute for commas
                expect(() =>
                    parseExpression(`{
                        x: 1
                        y: 2
                    }`),
                ).toThrow(/Expected ',' between record fields/);
            });

            it("should error on first missing comma when multiple are missing", () => {
                expect(() => parseExpression("{ x: 1 y: 2 z: 3 }")).toThrow(ParserError);
                expect(() => parseExpression("{ x: 1 y: 2 z: 3 }")).toThrow(/Expected ',' between record fields/);
            });

            it("should error on missing comma in nested record", () => {
                expect(() => parseExpression("{ a: 1, b: { x: 1 y: 2 }, c: 3 }")).toThrow(ParserError);
                expect(() => parseExpression("{ a: 1, b: { x: 1 y: 2 }, c: 3 }")).toThrow(
                    /Expected ',' between record fields/,
                );
            });

            it("should require comma when shorthand follows regular field", () => {
                expect(() => parseExpression("{ x: 1 name }")).toThrow(ParserError);
                expect(() => parseExpression("{ x: 1 name }")).toThrow(/Expected ',' between record fields/);
            });

            // Positive tests - should parse successfully with commas

            it("should accept trailing comma", () => {
                const expr = parseExpression("{ x: 1, y: 2, }");
                expect(expr.kind).toBe("Record");
                if (expr.kind !== "Record") return;
                expect(expr.fields).toHaveLength(2);
            });

            it("should parse single field without comma", () => {
                const expr = parseExpression("{ x: 1 }");
                expect(expr.kind).toBe("Record");
                if (expr.kind !== "Record") return;
                expect(expr.fields).toHaveLength(1);
            });

            it("should parse single shorthand field without comma", () => {
                const expr = parseExpression("{ name }");
                expect(expr.kind).toBe("Record");
                if (expr.kind !== "Record") return;
                expect(expr.fields).toHaveLength(1);
            });

            it("should parse multiple fields with commas", () => {
                const expr = parseExpression("{ x: 1, y: 2, z: 3 }");
                expect(expr.kind).toBe("Record");
                if (expr.kind !== "Record") return;
                expect(expr.fields).toHaveLength(3);
            });

            it("should parse nested records with commas", () => {
                const expr = parseExpression("{ outer: { inner: 1, x: 2 }, y: 3 }");
                expect(expr.kind).toBe("Record");
                if (expr.kind !== "Record") return;
                expect(expr.fields).toHaveLength(2);
            });

            it("should parse multi-line with commas", () => {
                const expr = parseExpression(`{
                    x: 1,
                    y: 2
                }`);
                expect(expr.kind).toBe("Record");
                if (expr.kind !== "Record") return;
                expect(expr.fields).toHaveLength(2);
            });

            it("should parse empty record", () => {
                const expr = parseExpression("{}");
                expect(expr.kind).toBe("Record");
                if (expr.kind !== "Record") return;
                expect(expr.fields).toHaveLength(0);
            });

            it("should parse empty record with whitespace", () => {
                const expr = parseExpression("{ }");
                expect(expr.kind).toBe("Record");
                if (expr.kind !== "Record") return;
                expect(expr.fields).toHaveLength(0);
            });

            it("should parse empty record with newlines", () => {
                const expr = parseExpression("{\n}");
                expect(expr.kind).toBe("Record");
                if (expr.kind !== "Record") return;
                expect(expr.fields).toHaveLength(0);
            });

            it("should parse empty record with multiple newlines", () => {
                const expr = parseExpression("{\n\n}");
                expect(expr.kind).toBe("Record");
                if (expr.kind !== "Record") return;
                expect(expr.fields).toHaveLength(0);
            });

            it("should parse trailing comma with newlines", () => {
                const expr = parseExpression(`{
                    x: 1,
                    y: 2,

                }`);
                expect(expr.kind).toBe("Record");
                if (expr.kind !== "Record") return;
                expect(expr.fields).toHaveLength(2);
            });
        });

        describe("record access", () => {
            it("should parse record field access", () => {
                const expr = parseExpression("record.field");

                expect(expr).toMatchObject({
                    kind: "RecordAccess",
                    record: { kind: "Var", name: "record" },
                    field: "field",
                });
            });

            it("should parse chained field access", () => {
                const expr = parseExpression("record.field1.field2");

                expect(expr).toMatchObject({
                    kind: "RecordAccess",
                    record: {
                        kind: "RecordAccess",
                        record: { kind: "Var", name: "record" },
                        field: "field1",
                    },
                    field: "field2",
                });
            });

            it("should parse field access on record literal", () => {
                const expr = parseExpression("{ x: 1, y: 2 }.x");

                expect(expr).toMatchObject({
                    kind: "RecordAccess",
                    record: {
                        kind: "Record",
                        fields: [
                            { name: "x", value: { kind: "IntLit", value: 1 } },
                            { name: "y", value: { kind: "IntLit", value: 2 } },
                        ],
                    },
                    field: "x",
                });
            });

            it("should parse field access in expressions", () => {
                const expr = parseExpression("a.x + b.y");

                expect(expr).toMatchObject({
                    kind: "BinOp",
                    op: "Add",
                    left: {
                        kind: "RecordAccess",
                        record: { kind: "Var", name: "a" },
                        field: "x",
                    },
                    right: {
                        kind: "RecordAccess",
                        record: { kind: "Var", name: "b" },
                        field: "y",
                    },
                });
            });
        });

        describe("record update", () => {
            it("should parse record update with one field", () => {
                const expr = parseExpression("{ ...record, x: 10 }");

                expect(expr).toMatchObject({
                    kind: "RecordUpdate",
                    record: { kind: "Var", name: "record" },
                    updates: [{ kind: "Field", name: "x", value: { kind: "IntLit", value: 10 } }],
                });
            });

            it("should parse record update with multiple fields", () => {
                const expr = parseExpression("{ ...record, x: 10, y: 20 }");

                expect(expr).toMatchObject({
                    kind: "RecordUpdate",
                    record: { kind: "Var", name: "record" },
                    updates: [
                        { kind: "Field", name: "x", value: { kind: "IntLit", value: 10 } },
                        { kind: "Field", name: "y", value: { kind: "IntLit", value: 20 } },
                    ],
                });
            });

            it("should parse record update with expressions", () => {
                const expr = parseExpression("{ ...point, x: point.x + 1 }");

                expect(expr).toMatchObject({
                    kind: "RecordUpdate",
                    record: { kind: "Var", name: "point" },
                    updates: [
                        {
                            kind: "Field",
                            name: "x",
                            value: {
                                kind: "BinOp",
                                op: "Add",
                                left: {
                                    kind: "RecordAccess",
                                    record: { kind: "Var", name: "point" },
                                    field: "x",
                                },
                                right: { kind: "IntLit", value: 1 },
                            },
                        },
                    ],
                });
            });

            it("should parse record spread only (shallow copy)", () => {
                const expr = parseExpression("{ ...obj }");

                expect(expr).toMatchObject({
                    kind: "RecordUpdate",
                    record: { kind: "Var", name: "obj" },
                    updates: [],
                });
            });

            it("should parse record with multiple spreads", () => {
                const expr = parseExpression("{ ...a, ...b }");

                expect(expr).toMatchObject({
                    kind: "RecordUpdate",
                    record: { kind: "Var", name: "a" },
                    updates: [{ kind: "Spread", expr: { kind: "Var", name: "b" } }],
                });
            });

            it("should parse record with spread and multiple fields", () => {
                const expr = parseExpression("{ ...base, x: 1, y: 2 }");

                expect(expr).toMatchObject({
                    kind: "RecordUpdate",
                    record: { kind: "Var", name: "base" },
                    updates: [
                        { kind: "Field", name: "x", value: { kind: "IntLit", value: 1 } },
                        { kind: "Field", name: "y", value: { kind: "IntLit", value: 2 } },
                    ],
                });
            });

            it("should parse record with multiple spreads and fields", () => {
                const expr = parseExpression("{ ...a, ...b, x: 1 }");

                expect(expr).toMatchObject({
                    kind: "RecordUpdate",
                    record: { kind: "Var", name: "a" },
                    updates: [
                        { kind: "Spread", expr: { kind: "Var", name: "b" } },
                        { kind: "Field", name: "x", value: { kind: "IntLit", value: 1 } },
                    ],
                });
            });

            it("should parse record with nested spread", () => {
                const expr = parseExpression("{ ...obj, nested: { ...obj.nested, x: 1 } }");

                expect(expr).toMatchObject({
                    kind: "RecordUpdate",
                    record: { kind: "Var", name: "obj" },
                    updates: [
                        {
                            kind: "Field",
                            name: "nested",
                            value: {
                                kind: "RecordUpdate",
                                record: {
                                    kind: "RecordAccess",
                                    record: { kind: "Var", name: "obj" },
                                    field: "nested",
                                },
                                updates: [{ kind: "Field", name: "x", value: { kind: "IntLit", value: 1 } }],
                            },
                        },
                    ],
                });
            });

            it("should parse spread with function call", () => {
                const expr = parseExpression("{ ...getDefaults(), x: 1 }");

                expect(expr).toMatchObject({
                    kind: "RecordUpdate",
                    record: {
                        kind: "App",
                        func: { kind: "Var", name: "getDefaults" },
                        args: [],
                    },
                    updates: [{ kind: "Field", name: "x", value: { kind: "IntLit", value: 1 } }],
                });
            });

            it("should parse spread with complex expression", () => {
                const expr = parseExpression("{ ...if condition then a else b, x: 1 }");

                expect(expr).toMatchObject({
                    kind: "RecordUpdate",
                    record: {
                        kind: "If",
                        condition: { kind: "Var", name: "condition" },
                        then: { kind: "Var", name: "a" },
                        else_: { kind: "Var", name: "b" },
                    },
                    updates: [{ kind: "Field", name: "x", value: { kind: "IntLit", value: 1 } }],
                });
            });

            it("should parse triple spread", () => {
                const expr = parseExpression("{ ...a, ...b, ...c }");

                expect(expr).toMatchObject({
                    kind: "RecordUpdate",
                    record: { kind: "Var", name: "a" },
                    updates: [
                        { kind: "Spread", expr: { kind: "Var", name: "b" } },
                        { kind: "Spread", expr: { kind: "Var", name: "c" } },
                    ],
                });
            });

            it("should parse spread with string field names", () => {
                const expr = parseExpression('{ ...obj, name: "Alice", age: 30 }');

                expect(expr).toMatchObject({
                    kind: "RecordUpdate",
                    record: { kind: "Var", name: "obj" },
                    updates: [
                        { kind: "Field", name: "name", value: { kind: "StringLit", value: "Alice" } },
                        { kind: "Field", name: "age", value: { kind: "IntLit", value: 30 } },
                    ],
                });
            });

            it("should parse spread in pipeline", () => {
                const expr = parseExpression("{ ...obj, x: 1 } |> process");

                expect(expr).toMatchObject({
                    kind: "Pipe",
                    expr: {
                        kind: "RecordUpdate",
                        record: { kind: "Var", name: "obj" },
                        updates: [{ kind: "Field", name: "x", value: { kind: "IntLit", value: 1 } }],
                    },
                    func: { kind: "Var", name: "process" },
                });
            });

            it("should parse spread with boolean fields", () => {
                const expr = parseExpression("{ ...config, enabled: true, debug: false }");

                expect(expr).toMatchObject({
                    kind: "RecordUpdate",
                    record: { kind: "Var", name: "config" },
                    updates: [
                        { kind: "Field", name: "enabled", value: { kind: "BoolLit", value: true } },
                        { kind: "Field", name: "debug", value: { kind: "BoolLit", value: false } },
                    ],
                });
            });

            it("should parse spread with record literal as base", () => {
                const expr = parseExpression("{ ...{ x: 1, y: 2 }, x: 3 }");

                expect(expr).toMatchObject({
                    kind: "RecordUpdate",
                    record: {
                        kind: "Record",
                        fields: [
                            { kind: "Field", name: "x", value: { kind: "IntLit", value: 1 } },
                            { kind: "Field", name: "y", value: { kind: "IntLit", value: 2 } },
                        ],
                    },
                    updates: [{ kind: "Field", name: "x", value: { kind: "IntLit", value: 3 } }],
                });
            });

            it("should parse spread with field access", () => {
                const expr = parseExpression("{ ...obj.nested, x: 1 }");

                expect(expr).toMatchObject({
                    kind: "RecordUpdate",
                    record: {
                        kind: "RecordAccess",
                        record: { kind: "Var", name: "obj" },
                        field: "nested",
                    },
                    updates: [{ kind: "Field", name: "x", value: { kind: "IntLit", value: 1 } }],
                });
            });

            it("should parse spread with computed field value", () => {
                const expr = parseExpression("{ ...obj, x: y + z, a: b * c }");

                expect(expr).toMatchObject({
                    kind: "RecordUpdate",
                    record: { kind: "Var", name: "obj" },
                    updates: [
                        {
                            kind: "Field",
                            name: "x",
                            value: {
                                kind: "BinOp",
                                op: "Add",
                                left: { kind: "Var", name: "y" },
                                right: { kind: "Var", name: "z" },
                            },
                        },
                        {
                            kind: "Field",
                            name: "a",
                            value: {
                                kind: "BinOp",
                                op: "Multiply",
                                left: { kind: "Var", name: "b" },
                                right: { kind: "Var", name: "c" },
                            },
                        },
                    ],
                });
            });

            it("should parse spread with lambda field value", () => {
                const expr = parseExpression("{ ...obj, callback: (x) => x + 1 }");

                expect(expr).toMatchObject({
                    kind: "RecordUpdate",
                    record: { kind: "Var", name: "obj" },
                    updates: [
                        {
                            kind: "Field",
                            name: "callback",
                            value: {
                                kind: "Lambda",
                                params: [{ kind: "VarPattern", name: "x" }],
                                body: {
                                    kind: "BinOp",
                                    op: "Add",
                                    left: { kind: "Var", name: "x" },
                                    right: { kind: "IntLit", value: 1 },
                                },
                            },
                        },
                    ],
                });
            });

            it("should parse spread with list field value", () => {
                const expr = parseExpression("{ ...obj, items: [1, 2, 3] }");

                expect(expr).toMatchObject({
                    kind: "RecordUpdate",
                    record: { kind: "Var", name: "obj" },
                    updates: [
                        {
                            kind: "Field",
                            name: "items",
                            value: {
                                kind: "List",
                                elements: [
                                    { kind: "Element", expr: { kind: "IntLit", value: 1 } },
                                    { kind: "Element", expr: { kind: "IntLit", value: 2 } },
                                    { kind: "Element", expr: { kind: "IntLit", value: 3 } },
                                ],
                            },
                        },
                    ],
                });
            });

            it("should parse multiple sequential spreads with fields", () => {
                const expr = parseExpression("{ ...a, x: 1, ...b, y: 2, ...c }");

                expect(expr).toMatchObject({
                    kind: "RecordUpdate",
                    record: { kind: "Var", name: "a" },
                    updates: [
                        { kind: "Field", name: "x", value: { kind: "IntLit", value: 1 } },
                        { kind: "Spread", expr: { kind: "Var", name: "b" } },
                        { kind: "Field", name: "y", value: { kind: "IntLit", value: 2 } },
                        { kind: "Spread", expr: { kind: "Var", name: "c" } },
                    ],
                });
            });

            it("should parse spread with match expression field", () => {
                const expr = parseExpression("{ ...obj, value: match x { | Some(v) => v | None => 0 } }");

                expect(expr).toMatchObject({
                    kind: "RecordUpdate",
                    record: { kind: "Var", name: "obj" },
                    updates: [
                        {
                            kind: "Field",
                            name: "value",
                            value: {
                                kind: "Match",
                                expr: { kind: "Var", name: "x" },
                            },
                        },
                    ],
                });
            });

            it("should parse deeply nested spreads", () => {
                const expr = parseExpression("{ ...a, b: { ...c, d: { ...e, f: 1 } } }");

                expect(expr).toMatchObject({
                    kind: "RecordUpdate",
                    record: { kind: "Var", name: "a" },
                    updates: [
                        {
                            kind: "Field",
                            name: "b",
                            value: {
                                kind: "RecordUpdate",
                                record: { kind: "Var", name: "c" },
                                updates: [
                                    {
                                        kind: "Field",
                                        name: "d",
                                        value: {
                                            kind: "RecordUpdate",
                                            record: { kind: "Var", name: "e" },
                                            updates: [
                                                {
                                                    kind: "Field",
                                                    name: "f",
                                                    value: { kind: "IntLit", value: 1 },
                                                },
                                            ],
                                        },
                                    },
                                ],
                            },
                        },
                    ],
                });
            });
        });
    });
});
