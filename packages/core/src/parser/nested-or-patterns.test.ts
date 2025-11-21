/**
 * Nested Or-Patterns Tests
 *
 * Tests for nested or-patterns as specified in:
 * docs/spec/05-pattern-matching/advanced-patterns.md:406-437
 *
 * Or-patterns can appear **within** constructor patterns, record patterns,
 * tuple patterns, and list patterns.
 */

import type { Expr, Pattern } from "../types/ast.js";

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

// Helper to parse a full expression (for match expressions)
function parseExpr(source: string): Expr {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    return parser.parseExpression();
}

describe("Parser - Nested Or-Patterns", () => {
    describe("or-patterns inside constructor arguments", () => {
        it('parses or-pattern in constructor: Ok("success" | "completed")', () => {
            const pattern = parsePattern('Ok("success" | "completed")');
            expect(pattern).toMatchObject({
                kind: "ConstructorPattern",
                constructor: "Ok",
                args: [
                    {
                        kind: "OrPattern",
                        patterns: [
                            { kind: "LiteralPattern", literal: "success" },
                            { kind: "LiteralPattern", literal: "completed" },
                        ],
                    },
                ],
            });
        });

        it("parses or-pattern with numbers in constructor", () => {
            const pattern = parsePattern("Result(0 | 1 | 2)");
            expect(pattern).toMatchObject({
                kind: "ConstructorPattern",
                constructor: "Result",
                args: [
                    {
                        kind: "OrPattern",
                        patterns: [
                            { kind: "LiteralPattern", literal: 0 },
                            { kind: "LiteralPattern", literal: 1 },
                            { kind: "LiteralPattern", literal: 2 },
                        ],
                    },
                ],
            });
        });

        it("parses or-pattern with constructors inside constructor", () => {
            const pattern = parsePattern("Outer(Red | Green | Blue)");
            expect(pattern).toMatchObject({
                kind: "ConstructorPattern",
                constructor: "Outer",
                args: [
                    {
                        kind: "OrPattern",
                        patterns: [
                            {
                                kind: "ConstructorPattern",
                                constructor: "Red",
                                args: [],
                            },
                            {
                                kind: "ConstructorPattern",
                                constructor: "Green",
                                args: [],
                            },
                            {
                                kind: "ConstructorPattern",
                                constructor: "Blue",
                                args: [],
                            },
                        ],
                    },
                ],
            });
        });

        it("parses multiple args with or-pattern", () => {
            const pattern = parsePattern('Pair("a" | "b", x)');
            expect(pattern).toMatchObject({
                kind: "ConstructorPattern",
                constructor: "Pair",
                args: [
                    {
                        kind: "OrPattern",
                        patterns: [
                            { kind: "LiteralPattern", literal: "a" },
                            { kind: "LiteralPattern", literal: "b" },
                        ],
                    },
                    { kind: "VarPattern", name: "x" },
                ],
            });
        });

        it("parses or-pattern with wildcards", () => {
            const pattern = parsePattern("Some(_ | None())");
            expect(pattern).toMatchObject({
                kind: "ConstructorPattern",
                constructor: "Some",
                args: [
                    {
                        kind: "OrPattern",
                        patterns: [
                            { kind: "WildcardPattern" } as Pattern,
                            {
                                kind: "ConstructorPattern",
                                constructor: "None",
                                args: [],
                            },
                        ],
                    },
                ],
            });
        });
    });

    describe("deeply nested or-patterns", () => {
        it("parses or-pattern nested two levels deep", () => {
            const pattern = parsePattern('Some(Ok("success" | "completed"))');
            expect(pattern).toMatchObject({
                kind: "ConstructorPattern",
                constructor: "Some",
                args: [
                    {
                        kind: "ConstructorPattern",
                        constructor: "Ok",
                        args: [
                            {
                                kind: "OrPattern",
                                patterns: [
                                    {
                                        kind: "LiteralPattern",
                                        literal: "success",
                                    },
                                    {
                                        kind: "LiteralPattern",
                                        literal: "completed",
                                    },
                                ],
                            },
                        ],
                    },
                ],
            });
        });

        it("parses multiple or-patterns in same constructor", () => {
            const pattern = parsePattern('Event("click" | "tap", "button" | "link")');
            expect(pattern).toMatchObject({
                kind: "ConstructorPattern",
                constructor: "Event",
                args: [
                    {
                        kind: "OrPattern",
                        patterns: [
                            { kind: "LiteralPattern", literal: "click" },
                            { kind: "LiteralPattern", literal: "tap" },
                        ],
                    },
                    {
                        kind: "OrPattern",
                        patterns: [
                            { kind: "LiteralPattern", literal: "button" },
                            { kind: "LiteralPattern", literal: "link" },
                        ],
                    },
                ],
            });
        });

        it("parses or-pattern with nested constructors", () => {
            const pattern = parsePattern("Wrapper(Some(1) | None() | Some(2))");
            expect(pattern).toMatchObject({
                kind: "ConstructorPattern",
                constructor: "Wrapper",
                args: [
                    {
                        kind: "OrPattern",
                        patterns: [
                            {
                                kind: "ConstructorPattern",
                                constructor: "Some",
                                args: [
                                    {
                                        kind: "LiteralPattern",
                                        literal: 1,
                                    },
                                ],
                            },
                            {
                                kind: "ConstructorPattern",
                                constructor: "None",
                                args: [],
                            },
                            {
                                kind: "ConstructorPattern",
                                constructor: "Some",
                                args: [
                                    {
                                        kind: "LiteralPattern",
                                        literal: 2,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            });
        });
    });

    describe("or-patterns in tuple positions", () => {
        it("parses or-pattern in tuple element", () => {
            const pattern = parsePattern('(x, "active" | "pending")');
            expect(pattern).toMatchObject({
                kind: "TuplePattern",
                elements: [
                    { kind: "VarPattern", name: "x" },
                    {
                        kind: "OrPattern",
                        patterns: [
                            { kind: "LiteralPattern", literal: "active" },
                            { kind: "LiteralPattern", literal: "pending" },
                        ],
                    },
                ],
            });
        });

        it("parses or-pattern in first tuple position", () => {
            const pattern = parsePattern("(1 | 2 | 3, y)");
            expect(pattern).toMatchObject({
                kind: "TuplePattern",
                elements: [
                    {
                        kind: "OrPattern",
                        patterns: [
                            { kind: "LiteralPattern", literal: 1 },
                            { kind: "LiteralPattern", literal: 2 },
                            { kind: "LiteralPattern", literal: 3 },
                        ],
                    },
                    { kind: "VarPattern", name: "y" },
                ],
            });
        });

        it("parses multiple or-patterns in tuple", () => {
            const pattern = parsePattern('(1 | 2, "a" | "b", x)');
            expect(pattern).toMatchObject({
                kind: "TuplePattern",
                elements: [
                    {
                        kind: "OrPattern",
                        patterns: [
                            { kind: "LiteralPattern", literal: 1 },
                            { kind: "LiteralPattern", literal: 2 },
                        ],
                    },
                    {
                        kind: "OrPattern",
                        patterns: [
                            { kind: "LiteralPattern", literal: "a" },
                            { kind: "LiteralPattern", literal: "b" },
                        ],
                    },
                    { kind: "VarPattern", name: "x" },
                ],
            });
        });

        it("parses tuple with parenthesized or-patterns", () => {
            // Note: ((1 | 2), (3 | 4)) parses as a tuple with two or-patterns,
            // not a tuple with two single-element tuples. The inner parens are
            // stripped as they just group the or-pattern.
            const pattern = parsePattern("((1 | 2), (3 | 4))");
            expect(pattern).toMatchObject({
                kind: "TuplePattern",
                elements: [
                    {
                        kind: "OrPattern",
                        patterns: [
                            { kind: "LiteralPattern", literal: 1 },
                            { kind: "LiteralPattern", literal: 2 },
                        ],
                    },
                    {
                        kind: "OrPattern",
                        patterns: [
                            { kind: "LiteralPattern", literal: 3 },
                            { kind: "LiteralPattern", literal: 4 },
                        ],
                    },
                ],
            });
        });
    });

    describe("or-patterns in record fields", () => {
        it("parses or-pattern in record field value", () => {
            const pattern = parsePattern('{ status: "active" | "pending", name }');
            expect(pattern).toMatchObject({
                kind: "RecordPattern",
                fields: [
                    {
                        name: "status",
                        pattern: {
                            kind: "OrPattern",
                            patterns: [
                                {
                                    kind: "LiteralPattern",
                                    literal: "active",
                                },
                                {
                                    kind: "LiteralPattern",
                                    literal: "pending",
                                },
                            ],
                        },
                    },
                    {
                        name: "name",
                        pattern: { kind: "VarPattern", name: "name" },
                    },
                ],
            });
        });

        it("parses or-pattern with constructors in record", () => {
            const pattern = parsePattern("{ result: Ok(x) | Err(_), status }");
            expect(pattern).toMatchObject({
                kind: "RecordPattern",
                fields: [
                    {
                        name: "result",
                        pattern: {
                            kind: "OrPattern",
                            patterns: [
                                {
                                    kind: "ConstructorPattern",
                                    constructor: "Ok",
                                    args: [{ kind: "VarPattern", name: "x" }],
                                },
                                {
                                    kind: "ConstructorPattern",
                                    constructor: "Err",
                                    args: [{ kind: "WildcardPattern" }],
                                },
                            ],
                        },
                    },
                    {
                        name: "status",
                        pattern: { kind: "VarPattern", name: "status" },
                    },
                ],
            });
        });

        it("parses multiple fields with or-patterns", () => {
            const pattern = parsePattern('{ x: 1 | 2, y: "a" | "b" }');
            expect(pattern).toMatchObject({
                kind: "RecordPattern",
                fields: [
                    {
                        name: "x",
                        pattern: {
                            kind: "OrPattern",
                            patterns: [
                                { kind: "LiteralPattern", literal: 1 },
                                { kind: "LiteralPattern", literal: 2 },
                            ],
                        },
                    },
                    {
                        name: "y",
                        pattern: {
                            kind: "OrPattern",
                            patterns: [
                                { kind: "LiteralPattern", literal: "a" },
                                { kind: "LiteralPattern", literal: "b" },
                            ],
                        },
                    },
                ],
            });
        });
    });

    describe("or-patterns in list patterns", () => {
        it("parses or-pattern as list element", () => {
            const pattern = parsePattern('["a" | "b", x]');
            expect(pattern).toMatchObject({
                kind: "ListPattern",
                elements: [
                    {
                        kind: "OrPattern",
                        patterns: [
                            { kind: "LiteralPattern", literal: "a" },
                            { kind: "LiteralPattern", literal: "b" },
                        ],
                    },
                    { kind: "VarPattern", name: "x" },
                ],
            });
        });

        it("parses multiple or-patterns in list", () => {
            const pattern = parsePattern('[1 | 2, "a" | "b", x]');
            expect(pattern).toMatchObject({
                kind: "ListPattern",
                elements: [
                    {
                        kind: "OrPattern",
                        patterns: [
                            { kind: "LiteralPattern", literal: 1 },
                            { kind: "LiteralPattern", literal: 2 },
                        ],
                    },
                    {
                        kind: "OrPattern",
                        patterns: [
                            { kind: "LiteralPattern", literal: "a" },
                            { kind: "LiteralPattern", literal: "b" },
                        ],
                    },
                    { kind: "VarPattern", name: "x" },
                ],
            });
        });

        it("parses or-pattern in list with rest", () => {
            const pattern = parsePattern("[1 | 2, ...rest]");
            expect(pattern).toMatchObject({
                kind: "ListPattern",
                elements: [
                    {
                        kind: "OrPattern",
                        patterns: [
                            { kind: "LiteralPattern", literal: 1 },
                            { kind: "LiteralPattern", literal: 2 },
                        ],
                    },
                ],
                rest: { kind: "VarPattern", name: "rest" },
            });
        });
    });

    describe("or-patterns in match expressions", () => {
        it("parses match with nested or-patterns in constructor", () => {
            const expr = parseExpr(
                'match response { | Ok("success" | "completed") => "done" | Ok(msg) => msg | Err(_) => "failed" }',
            );

            expect(expr).toMatchObject({
                kind: "Match",
                cases: [
                    {
                        pattern: {
                            kind: "ConstructorPattern",
                            constructor: "Ok",
                            args: [
                                {
                                    kind: "OrPattern",
                                    patterns: [
                                        {
                                            kind: "LiteralPattern",
                                            literal: "success",
                                        },
                                        {
                                            kind: "LiteralPattern",
                                            literal: "completed",
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                    {
                        pattern: {
                            kind: "ConstructorPattern",
                            constructor: "Ok",
                            args: [{ kind: "VarPattern", name: "msg" }],
                        },
                    },
                    {
                        pattern: {
                            kind: "ConstructorPattern",
                            constructor: "Err",
                            args: [{ kind: "WildcardPattern" }],
                        },
                    },
                ],
            });
        });

        it("parses match with nested or-patterns and guards", () => {
            const expr = parseExpr(
                'match event { | Click("button" | "link") when enabled => handleInteraction() | Hover("image" | "video") => showPreview() | _ => () }',
            );

            expect(expr).toMatchObject({
                kind: "Match",
                cases: [
                    {
                        pattern: {
                            kind: "ConstructorPattern",
                            constructor: "Click",
                            args: [
                                {
                                    kind: "OrPattern",
                                    patterns: [
                                        {
                                            kind: "LiteralPattern",
                                            literal: "button",
                                        },
                                        {
                                            kind: "LiteralPattern",
                                            literal: "link",
                                        },
                                    ],
                                },
                            ],
                        },
                        guard: {
                            kind: "Var",
                            name: "enabled",
                        },
                    },
                    {
                        pattern: {
                            kind: "ConstructorPattern",
                            constructor: "Hover",
                            args: [
                                {
                                    kind: "OrPattern",
                                    patterns: [
                                        {
                                            kind: "LiteralPattern",
                                            literal: "image",
                                        },
                                        {
                                            kind: "LiteralPattern",
                                            literal: "video",
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                    {
                        pattern: { kind: "WildcardPattern" } as Pattern,
                    },
                ],
            });
        });
    });

    describe("complex nested combinations", () => {
        it("parses or-pattern inside constructor inside record", () => {
            const pattern = parsePattern('{ result: Some("a" | "b"), x }');
            expect(pattern).toMatchObject({
                kind: "RecordPattern",
                fields: [
                    {
                        name: "result",
                        pattern: {
                            kind: "ConstructorPattern",
                            constructor: "Some",
                            args: [
                                {
                                    kind: "OrPattern",
                                    patterns: [
                                        {
                                            kind: "LiteralPattern",
                                            literal: "a",
                                        },
                                        {
                                            kind: "LiteralPattern",
                                            literal: "b",
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                    {
                        name: "x",
                        pattern: { kind: "VarPattern", name: "x" } as Pattern,
                    },
                ],
            });
        });

        it("parses or-pattern with type annotations at top level", () => {
            // Type annotations work when wrapping the whole or-pattern,
            // not individual alternatives
            const pattern = parsePattern("Ok((msg: String))");
            expect(pattern).toMatchObject({
                kind: "ConstructorPattern",
                constructor: "Ok",
                args: [
                    {
                        kind: "TypeAnnotatedPattern",
                        pattern: {
                            kind: "VarPattern",
                            name: "msg",
                        },
                        typeExpr: {
                            kind: "TypeConst",
                            name: "String",
                        },
                    },
                ],
            });
        });

        it("parses tuple with nested constructor with or-pattern", () => {
            const pattern = parsePattern('(x, Some("a" | "b"), y)');
            expect(pattern).toMatchObject({
                kind: "TuplePattern",
                elements: [
                    { kind: "VarPattern", name: "x" } as Pattern,
                    {
                        kind: "ConstructorPattern",
                        constructor: "Some",
                        args: [
                            {
                                kind: "OrPattern",
                                patterns: [
                                    {
                                        kind: "LiteralPattern",
                                        literal: "a",
                                    },
                                    {
                                        kind: "LiteralPattern",
                                        literal: "b",
                                    },
                                ],
                            },
                        ],
                    },
                    { kind: "VarPattern", name: "y" } as Pattern,
                ],
            });
        });
    });

    describe("edge cases", () => {
        it("parses or-pattern with single wildcard alternative", () => {
            const pattern = parsePattern("_ | x");
            expect(pattern).toMatchObject({
                kind: "OrPattern",
                patterns: [{ kind: "WildcardPattern" }, { kind: "VarPattern", name: "x" }],
            });
        });

        it("parses simple or-pattern with boolean literals (standalone)", () => {
            // Test standalone boolean or-pattern first
            const pattern = parsePattern("true | false");
            expect(pattern).toMatchObject({
                kind: "OrPattern",
                patterns: [
                    { kind: "LiteralPattern", literal: true },
                    { kind: "LiteralPattern", literal: false },
                ],
            });
        });

        it("parses or-pattern with null literal", () => {
            const pattern = parsePattern("Some(x | null)");
            expect(pattern).toMatchObject({
                kind: "ConstructorPattern",
                constructor: "Some",
                args: [
                    {
                        kind: "OrPattern",
                        patterns: [
                            { kind: "VarPattern", name: "x" },
                            { kind: "LiteralPattern", literal: null },
                        ],
                    },
                ],
            });
        });

        it("preserves location information", () => {
            const pattern = parsePattern('Ok("a" | "b")');
            expect(pattern.loc).toBeDefined();
            expect(pattern.loc.file).toBe("test.vf");
            expect(pattern.loc.line).toBeGreaterThan(0);
        });
    });
});
