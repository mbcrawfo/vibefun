/**
 * Pattern parsing tests
 */

import type { Pattern } from "../types/ast.js";

import { describe, expect, it } from "vitest";

import { Lexer } from "../lexer/index.js";
import { Parser } from "./parser.js";

// Helper to parse a pattern from source code
function parsePattern(source: string): Pattern {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    return parser.parsePattern();
}

describe("Parser - Patterns", () => {
    describe("simple patterns", () => {
        it("parses variable pattern", () => {
            const pattern = parsePattern("x");
            expect(pattern).toMatchObject({
                kind: "VarPattern",
                name: "x",
            });
        });

        it("parses wildcard pattern", () => {
            const pattern = parsePattern("_");
            expect(pattern).toMatchObject({
                kind: "WildcardPattern",
            });
        });

        it("parses integer literal pattern", () => {
            const pattern = parsePattern("42");
            expect(pattern).toMatchObject({
                kind: "LiteralPattern",
                literal: 42,
            });
        });

        it("parses float literal pattern", () => {
            const pattern = parsePattern("3.14");
            expect(pattern).toMatchObject({
                kind: "LiteralPattern",
                literal: 3.14,
            });
        });

        it("parses string literal pattern", () => {
            const pattern = parsePattern('"hello"');
            expect(pattern).toMatchObject({
                kind: "LiteralPattern",
                literal: "hello",
            });
        });

        it("parses true literal pattern", () => {
            const pattern = parsePattern("true");
            expect(pattern).toMatchObject({
                kind: "LiteralPattern",
                literal: true,
            });
        });

        it("parses false literal pattern", () => {
            const pattern = parsePattern("false");
            expect(pattern).toMatchObject({
                kind: "LiteralPattern",
                literal: false,
            });
        });

        it("parses null literal pattern", () => {
            const pattern = parsePattern("null");
            expect(pattern).toMatchObject({
                kind: "LiteralPattern",
                literal: null,
            });
        });
    });

    describe("constructor patterns", () => {
        it("parses constructor with no args", () => {
            const pattern = parsePattern("None()");
            expect(pattern).toMatchObject({
                kind: "ConstructorPattern",
                constructor: "None",
                args: [],
            });
        });

        it("parses constructor with one arg", () => {
            const pattern = parsePattern("Some(x)");
            expect(pattern).toMatchObject({
                kind: "ConstructorPattern",
                constructor: "Some",
                args: [{ kind: "VarPattern", name: "x" }],
            });
        });

        it("parses constructor with multiple args", () => {
            const pattern = parsePattern("Point(x, y)");
            expect(pattern).toMatchObject({
                kind: "ConstructorPattern",
                constructor: "Point",
                args: [
                    { kind: "VarPattern", name: "x" },
                    { kind: "VarPattern", name: "y" },
                ],
            });
        });

        it("parses nested constructor pattern", () => {
            const pattern = parsePattern("Some(Pair(x, y))");
            expect(pattern).toMatchObject({
                kind: "ConstructorPattern",
                constructor: "Some",
                args: [
                    {
                        kind: "ConstructorPattern",
                        constructor: "Pair",
                        args: [
                            { kind: "VarPattern", name: "x" },
                            { kind: "VarPattern", name: "y" },
                        ],
                    },
                ],
            });
        });

        it("parses constructor with wildcard arg", () => {
            const pattern = parsePattern("Some(_)");
            expect(pattern).toMatchObject({
                kind: "ConstructorPattern",
                constructor: "Some",
                args: [{ kind: "WildcardPattern" }],
            });
        });

        it("parses constructor with literal arg", () => {
            const pattern = parsePattern("Value(42)");
            expect(pattern).toMatchObject({
                kind: "ConstructorPattern",
                constructor: "Value",
                args: [{ kind: "LiteralPattern", literal: 42 }],
            });
        });

        it("treats PascalCase without parens as variable pattern", () => {
            const pattern = parsePattern("None");
            expect(pattern).toMatchObject({
                kind: "VarPattern",
                name: "None",
            });
        });
    });

    describe("record patterns", () => {
        it("parses empty record pattern", () => {
            const pattern = parsePattern("{}");
            expect(pattern).toMatchObject({
                kind: "RecordPattern",
                fields: [],
            });
        });

        it("parses record pattern with single field binding", () => {
            const pattern = parsePattern("{ x }");
            expect(pattern).toMatchObject({
                kind: "RecordPattern",
                fields: [
                    {
                        name: "x",
                        pattern: { kind: "VarPattern", name: "x" },
                    },
                ],
            });
        });

        it("parses record pattern with multiple field bindings", () => {
            const pattern = parsePattern("{ x, y, z }");
            expect(pattern).toMatchObject({
                kind: "RecordPattern",
                fields: [
                    {
                        name: "x",
                        pattern: { kind: "VarPattern", name: "x" },
                    },
                    {
                        name: "y",
                        pattern: { kind: "VarPattern", name: "y" },
                    },
                    {
                        name: "z",
                        pattern: { kind: "VarPattern", name: "z" },
                    },
                ],
            });
        });

        it("parses record pattern with field rename", () => {
            const pattern = parsePattern("{ x: newX }");
            expect(pattern).toMatchObject({
                kind: "RecordPattern",
                fields: [
                    {
                        name: "x",
                        pattern: { kind: "VarPattern", name: "newX" },
                    },
                ],
            });
        });

        it("parses record pattern with mixed bindings and renames", () => {
            const pattern = parsePattern("{ x, y: newY, z }");
            expect(pattern).toMatchObject({
                kind: "RecordPattern",
                fields: [
                    {
                        name: "x",
                        pattern: { kind: "VarPattern", name: "x" },
                    },
                    {
                        name: "y",
                        pattern: { kind: "VarPattern", name: "newY" },
                    },
                    {
                        name: "z",
                        pattern: { kind: "VarPattern", name: "z" },
                    },
                ],
            });
        });

        it("parses record pattern with nested pattern", () => {
            const pattern = parsePattern("{ point: Point(x, y) }");
            expect(pattern).toMatchObject({
                kind: "RecordPattern",
                fields: [
                    {
                        name: "point",
                        pattern: {
                            kind: "ConstructorPattern",
                            constructor: "Point",
                            args: [
                                { kind: "VarPattern", name: "x" },
                                { kind: "VarPattern", name: "y" },
                            ],
                        },
                    },
                ],
            });
        });

        it("parses record pattern with wildcard field", () => {
            const pattern = parsePattern("{ x: _ }");
            expect(pattern).toMatchObject({
                kind: "RecordPattern",
                fields: [
                    {
                        name: "x",
                        pattern: { kind: "WildcardPattern" },
                    },
                ],
            });
        });
    });

    describe("list patterns", () => {
        it("parses empty list pattern", () => {
            const pattern = parsePattern("[]");
            expect(pattern).toMatchObject({
                kind: "ListPattern",
                elements: [],
            });
        });

        it("parses list pattern with single element", () => {
            const pattern = parsePattern("[x]");
            expect(pattern).toMatchObject({
                kind: "ListPattern",
                elements: [{ kind: "VarPattern", name: "x" }],
            });
        });

        it("parses list pattern with multiple elements", () => {
            const pattern = parsePattern("[x, y, z]");
            expect(pattern).toMatchObject({
                kind: "ListPattern",
                elements: [
                    { kind: "VarPattern", name: "x" },
                    { kind: "VarPattern", name: "y" },
                    { kind: "VarPattern", name: "z" },
                ],
            });
        });

        it("parses list pattern with rest element", () => {
            const pattern = parsePattern("[x, ...rest]");
            expect(pattern).toMatchObject({
                kind: "ListPattern",
                elements: [{ kind: "VarPattern", name: "x" }],
                rest: { kind: "VarPattern", name: "rest" },
            });
        });

        it("parses list pattern with wildcard rest", () => {
            const pattern = parsePattern("[x, ..._]");
            expect(pattern).toMatchObject({
                kind: "ListPattern",
                elements: [{ kind: "VarPattern", name: "x" }],
                rest: { kind: "WildcardPattern" },
            });
        });

        it("parses list pattern with only rest", () => {
            const pattern = parsePattern("[...rest]");
            expect(pattern).toMatchObject({
                kind: "ListPattern",
                elements: [],
                rest: { kind: "VarPattern", name: "rest" },
            });
        });

        it("parses list pattern with literal elements", () => {
            const pattern = parsePattern('[1, "hello", true]');
            expect(pattern).toMatchObject({
                kind: "ListPattern",
                elements: [
                    { kind: "LiteralPattern", literal: 1 },
                    { kind: "LiteralPattern", literal: "hello" },
                    { kind: "LiteralPattern", literal: true },
                ],
            });
        });

        it("parses list pattern with constructor elements", () => {
            const pattern = parsePattern("[Some(x), None()]");
            expect(pattern).toMatchObject({
                kind: "ListPattern",
                elements: [
                    {
                        kind: "ConstructorPattern",
                        constructor: "Some",
                        args: [{ kind: "VarPattern", name: "x" }],
                    },
                    {
                        kind: "ConstructorPattern",
                        constructor: "None",
                        args: [],
                    },
                ],
            });
        });

        it("parses nested list pattern", () => {
            const pattern = parsePattern("[[a, b], [c, d]]");
            expect(pattern).toMatchObject({
                kind: "ListPattern",
                elements: [
                    {
                        kind: "ListPattern",
                        elements: [
                            { kind: "VarPattern", name: "a" },
                            { kind: "VarPattern", name: "b" },
                        ],
                    },
                    {
                        kind: "ListPattern",
                        elements: [
                            { kind: "VarPattern", name: "c" },
                            { kind: "VarPattern", name: "d" },
                        ],
                    },
                ],
            });
        });
    });

    describe("or patterns", () => {
        it("parses simple or pattern with two alternatives", () => {
            const pattern = parsePattern("x | y");
            expect(pattern).toMatchObject({
                kind: "OrPattern",
                patterns: [
                    { kind: "VarPattern", name: "x" },
                    { kind: "VarPattern", name: "y" },
                ],
            });
        });

        it("parses or pattern with three alternatives", () => {
            const pattern = parsePattern("x | y | z");
            expect(pattern).toMatchObject({
                kind: "OrPattern",
                patterns: [
                    { kind: "VarPattern", name: "x" },
                    { kind: "VarPattern", name: "y" },
                    { kind: "VarPattern", name: "z" },
                ],
            });
        });

        it("parses or pattern with literals", () => {
            const pattern = parsePattern("0 | 1 | 2");
            expect(pattern).toMatchObject({
                kind: "OrPattern",
                patterns: [
                    { kind: "LiteralPattern", literal: 0 },
                    { kind: "LiteralPattern", literal: 1 },
                    { kind: "LiteralPattern", literal: 2 },
                ],
            });
        });

        it("parses or pattern with string literals", () => {
            const pattern = parsePattern('"pending" | "loading"');
            expect(pattern).toMatchObject({
                kind: "OrPattern",
                patterns: [
                    { kind: "LiteralPattern", literal: "pending" },
                    { kind: "LiteralPattern", literal: "loading" },
                ],
            });
        });

        it("parses or pattern with constructors", () => {
            const pattern = parsePattern("Some(x) | None()");
            expect(pattern).toMatchObject({
                kind: "OrPattern",
                patterns: [
                    {
                        kind: "ConstructorPattern",
                        constructor: "Some",
                        args: [{ kind: "VarPattern", name: "x" }],
                    },
                    {
                        kind: "ConstructorPattern",
                        constructor: "None",
                        args: [],
                    },
                ],
            });
        });
    });

    describe("patterns in match expressions", () => {
        it("parses match with literal patterns", () => {
            const source = `match n {
                    | 0 => "zero"
                    | 1 => "one"
                    | _ => "other"
                }`;
            const lexer = new Lexer(source, "test.vf");
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens, "test.vf");
            const expr = parser.parseExpression();

            expect(expr.kind).toBe("Match");
            if (expr.kind === "Match") {
                expect(expr.cases).toHaveLength(3);
                expect(expr.cases[0]!.pattern).toMatchObject({
                    kind: "LiteralPattern",
                    literal: 0,
                });
                expect(expr.cases[1]!.pattern).toMatchObject({
                    kind: "LiteralPattern",
                    literal: 1,
                });
                expect(expr.cases[2]!.pattern).toMatchObject({
                    kind: "WildcardPattern",
                });
            }
        });

        it("parses match with constructor patterns", () => {
            const source = `match opt {
                    | Some(x) => x
                    | None() => 0
                }`;
            const lexer = new Lexer(source, "test.vf");
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens, "test.vf");
            const expr = parser.parseExpression();

            expect(expr.kind).toBe("Match");
            if (expr.kind === "Match") {
                expect(expr.cases).toHaveLength(2);
                expect(expr.cases[0]!.pattern).toMatchObject({
                    kind: "ConstructorPattern",
                    constructor: "Some",
                    args: [{ kind: "VarPattern", name: "x" }],
                });
                expect(expr.cases[1]!.pattern).toMatchObject({
                    kind: "ConstructorPattern",
                    constructor: "None",
                    args: [],
                });
            }
        });

        it("parses match with list patterns", () => {
            const source = `match list {
                    | [] => 0
                    | [x] => x
                    | [x, ...rest] => x + sum(rest)
                }`;
            const lexer = new Lexer(source, "test.vf");
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens, "test.vf");
            const expr = parser.parseExpression();

            expect(expr.kind).toBe("Match");
            if (expr.kind === "Match") {
                expect(expr.cases).toHaveLength(3);
                expect(expr.cases[0]!.pattern).toMatchObject({
                    kind: "ListPattern",
                    elements: [],
                });
                expect(expr.cases[1]!.pattern).toMatchObject({
                    kind: "ListPattern",
                    elements: [{ kind: "VarPattern", name: "x" }],
                });
                expect(expr.cases[2]!.pattern).toMatchObject({
                    kind: "ListPattern",
                    elements: [{ kind: "VarPattern", name: "x" }],
                    rest: { kind: "VarPattern", name: "rest" },
                });
            }
        });

        it("parses match with record patterns", () => {
            const source = `match person {
                    | { name, age } => name
                    | _ => "unknown"
                }`;
            const lexer = new Lexer(source, "test.vf");
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens, "test.vf");
            const expr = parser.parseExpression();

            expect(expr.kind).toBe("Match");
            if (expr.kind === "Match") {
                expect(expr.cases).toHaveLength(2);
                expect(expr.cases[0]!.pattern).toMatchObject({
                    kind: "RecordPattern",
                    fields: [
                        {
                            name: "name",
                            pattern: { kind: "VarPattern", name: "name" },
                        },
                        {
                            name: "age",
                            pattern: { kind: "VarPattern", name: "age" },
                        },
                    ],
                });
            }
        });

        it("parses match with or patterns", () => {
            const source = `match status {
                    | "pending" | "loading" => "in progress"
                    | "complete" => "done"
                    | _ => "unknown"
                }`;
            const lexer = new Lexer(source, "test.vf");
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens, "test.vf");
            const expr = parser.parseExpression();

            expect(expr.kind).toBe("Match");
            if (expr.kind === "Match") {
                expect(expr.cases).toHaveLength(3);
                expect(expr.cases[0]!.pattern).toMatchObject({
                    kind: "OrPattern",
                    patterns: [
                        { kind: "LiteralPattern", literal: "pending" },
                        { kind: "LiteralPattern", literal: "loading" },
                    ],
                });
            }
        });
    });
});
