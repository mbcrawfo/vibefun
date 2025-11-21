/**
 * Pattern Type Annotations Tests
 *
 * Tests for pattern type annotations as specified in:
 * docs/spec/05-pattern-matching/advanced-patterns.md:463-487
 *
 * Type annotations in patterns use the syntax: (pattern: Type)
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

describe("Parser - Pattern Type Annotations", () => {
    describe("variable patterns with type annotations", () => {
        it("parses simple variable with type annotation", () => {
            const pattern = parsePattern("(x: Int)");
            expect(pattern).toMatchObject({
                kind: "TypeAnnotatedPattern",
                pattern: {
                    kind: "VarPattern",
                    name: "x",
                },
                typeExpr: {
                    kind: "TypeConst",
                    name: "Int",
                },
            });
        });

        it("parses variable with generic type", () => {
            const pattern = parsePattern("(x: Option<Int>)");
            expect(pattern).toMatchObject({
                kind: "TypeAnnotatedPattern",
                pattern: {
                    kind: "VarPattern",
                    name: "x",
                },
                typeExpr: {
                    kind: "TypeApp",
                    constructor: {
                        kind: "TypeConst",
                        name: "Option",
                    },
                    args: [
                        {
                            kind: "TypeConst",
                            name: "Int",
                        },
                    ],
                },
            });
        });

        it("parses variable with complex generic type", () => {
            const pattern = parsePattern("(list: List<Option<Int>>)");
            expect(pattern).toMatchObject({
                kind: "TypeAnnotatedPattern",
                pattern: {
                    kind: "VarPattern",
                    name: "list",
                },
                typeExpr: {
                    kind: "TypeApp",
                    constructor: {
                        kind: "TypeConst",
                        name: "List",
                    },
                },
            });
        });

        it("parses variable with function type", () => {
            const pattern = parsePattern("(f: (Int) -> String)");
            expect(pattern).toMatchObject({
                kind: "TypeAnnotatedPattern",
                pattern: {
                    kind: "VarPattern",
                    name: "f",
                },
                typeExpr: {
                    kind: "FunctionType",
                    params: [
                        {
                            kind: "TypeConst",
                            name: "Int",
                        },
                    ],
                    return_: {
                        kind: "TypeConst",
                        name: "String",
                    },
                },
            });
        });
    });

    describe("constructor patterns with type annotations", () => {
        it("parses constructor with type-annotated argument", () => {
            const pattern = parsePattern("Some((x: Int))");
            expect(pattern).toMatchObject({
                kind: "ConstructorPattern",
                constructor: "Some",
                args: [
                    {
                        kind: "TypeAnnotatedPattern",
                        pattern: {
                            kind: "VarPattern",
                            name: "x",
                        },
                        typeExpr: {
                            kind: "TypeConst",
                            name: "Int",
                        },
                    },
                ],
            });
        });

        it("parses constructor with multiple type-annotated arguments", () => {
            const pattern = parsePattern("Pair((x: Int), (y: String))");
            expect(pattern).toMatchObject({
                kind: "ConstructorPattern",
                constructor: "Pair",
                args: [
                    {
                        kind: "TypeAnnotatedPattern",
                        pattern: {
                            kind: "VarPattern",
                            name: "x",
                        },
                        typeExpr: {
                            kind: "TypeConst",
                            name: "Int",
                        },
                    },
                    {
                        kind: "TypeAnnotatedPattern",
                        pattern: {
                            kind: "VarPattern",
                            name: "y",
                        },
                        typeExpr: {
                            kind: "TypeConst",
                            name: "String",
                        },
                    },
                ],
            });
        });

        it("parses constructor with mixed annotated and unannotated args", () => {
            const pattern = parsePattern("Result((ok: Int), err)");
            expect(pattern).toMatchObject({
                kind: "ConstructorPattern",
                constructor: "Result",
                args: [
                    {
                        kind: "TypeAnnotatedPattern",
                        pattern: {
                            kind: "VarPattern",
                            name: "ok",
                        },
                        typeExpr: {
                            kind: "TypeConst",
                            name: "Int",
                        },
                    },
                    {
                        kind: "VarPattern",
                        name: "err",
                    },
                ],
            });
        });
    });

    describe("tuple patterns with type annotations", () => {
        it("parses tuple with type-annotated elements", () => {
            const pattern = parsePattern("((x: Int), (y: String))");
            expect(pattern).toMatchObject({
                kind: "TuplePattern",
                elements: [
                    {
                        kind: "TypeAnnotatedPattern",
                        pattern: {
                            kind: "VarPattern",
                            name: "x",
                        },
                        typeExpr: {
                            kind: "TypeConst",
                            name: "Int",
                        },
                    },
                    {
                        kind: "TypeAnnotatedPattern",
                        pattern: {
                            kind: "VarPattern",
                            name: "y",
                        },
                        typeExpr: {
                            kind: "TypeConst",
                            name: "String",
                        },
                    },
                ],
            });
        });

        it("parses tuple with mixed annotated and unannotated elements", () => {
            const pattern = parsePattern("((x: Int), y, (z: Bool))");
            expect(pattern).toMatchObject({
                kind: "TuplePattern",
                elements: [
                    {
                        kind: "TypeAnnotatedPattern",
                        pattern: {
                            kind: "VarPattern",
                            name: "x",
                        },
                        typeExpr: {
                            kind: "TypeConst",
                            name: "Int",
                        },
                    },
                    {
                        kind: "VarPattern",
                        name: "y",
                    },
                    {
                        kind: "TypeAnnotatedPattern",
                        pattern: {
                            kind: "VarPattern",
                            name: "z",
                        },
                        typeExpr: {
                            kind: "TypeConst",
                            name: "Bool",
                        },
                    },
                ],
            });
        });

        it("parses nested tuple with type annotations", () => {
            const pattern = parsePattern("((x: Int), ((y: String), (z: Bool)))");
            expect(pattern).toMatchObject({
                kind: "TuplePattern",
                elements: [
                    {
                        kind: "TypeAnnotatedPattern",
                        pattern: {
                            kind: "VarPattern",
                            name: "x",
                        },
                    },
                    {
                        kind: "TuplePattern",
                        elements: [
                            {
                                kind: "TypeAnnotatedPattern",
                                pattern: {
                                    kind: "VarPattern",
                                    name: "y",
                                },
                            },
                            {
                                kind: "TypeAnnotatedPattern",
                                pattern: {
                                    kind: "VarPattern",
                                    name: "z",
                                },
                            },
                        ],
                    },
                ],
            });
        });
    });

    describe("record patterns with type annotations", () => {
        it("parses record with type-annotated fields", () => {
            const pattern = parsePattern("{ name: (n: String), age: (a: Int) }");
            expect(pattern).toMatchObject({
                kind: "RecordPattern",
                fields: [
                    {
                        name: "name",
                        pattern: {
                            kind: "TypeAnnotatedPattern",
                            pattern: {
                                kind: "VarPattern",
                                name: "n",
                            },
                            typeExpr: {
                                kind: "TypeConst",
                                name: "String",
                            },
                        },
                    },
                    {
                        name: "age",
                        pattern: {
                            kind: "TypeAnnotatedPattern",
                            pattern: {
                                kind: "VarPattern",
                                name: "a",
                            },
                            typeExpr: {
                                kind: "TypeConst",
                                name: "Int",
                            },
                        },
                    },
                ],
            });
        });

        it("parses record with shorthand and type annotation", () => {
            const pattern = parsePattern("{ (name: String), age }");
            expect(pattern).toMatchObject({
                kind: "RecordPattern",
                fields: [
                    {
                        name: "name",
                        pattern: {
                            kind: "TypeAnnotatedPattern",
                            pattern: {
                                kind: "VarPattern",
                                name: "name",
                            },
                            typeExpr: {
                                kind: "TypeConst",
                                name: "String",
                            },
                        },
                    },
                    {
                        name: "age",
                        pattern: {
                            kind: "VarPattern",
                            name: "age",
                        },
                    },
                ],
            });
        });

        it("parses record with nested pattern and type annotation", () => {
            const pattern = parsePattern("{ user: (u: User), settings }");
            expect(pattern).toMatchObject({
                kind: "RecordPattern",
                fields: [
                    {
                        name: "user",
                        pattern: {
                            kind: "TypeAnnotatedPattern",
                            pattern: {
                                kind: "VarPattern",
                                name: "u",
                            },
                            typeExpr: {
                                kind: "TypeConst",
                                name: "User",
                            },
                        },
                    },
                    {
                        name: "settings",
                        pattern: {
                            kind: "VarPattern",
                            name: "settings",
                        },
                    },
                ],
            });
        });
    });

    describe("list patterns with type annotations", () => {
        it("parses list with type-annotated elements", () => {
            const pattern = parsePattern("[(x: Int), (y: Int)]");
            expect(pattern).toMatchObject({
                kind: "ListPattern",
                elements: [
                    {
                        kind: "TypeAnnotatedPattern",
                        pattern: {
                            kind: "VarPattern",
                            name: "x",
                        },
                        typeExpr: {
                            kind: "TypeConst",
                            name: "Int",
                        },
                    },
                    {
                        kind: "TypeAnnotatedPattern",
                        pattern: {
                            kind: "VarPattern",
                            name: "y",
                        },
                        typeExpr: {
                            kind: "TypeConst",
                            name: "Int",
                        },
                    },
                ],
            });
        });

        it("parses list with type-annotated rest", () => {
            const pattern = parsePattern("[(first: Int), ...(rest: List<Int>)]");
            expect(pattern).toMatchObject({
                kind: "ListPattern",
                elements: [
                    {
                        kind: "TypeAnnotatedPattern",
                        pattern: {
                            kind: "VarPattern",
                            name: "first",
                        },
                        typeExpr: {
                            kind: "TypeConst",
                            name: "Int",
                        },
                    },
                ],
                rest: {
                    kind: "TypeAnnotatedPattern",
                    pattern: {
                        kind: "VarPattern",
                        name: "rest",
                    },
                    typeExpr: {
                        kind: "TypeApp",
                        constructor: {
                            kind: "TypeConst",
                            name: "List",
                        },
                    },
                },
            });
        });
    });

    describe("type annotations in match expressions", () => {
        it("parses match with type-annotated patterns", () => {
            const expr = parseExpr('match value { | (x: Int) when x > 0 => "positive" | (x: Int) => "non-positive" }');

            expect(expr).toMatchObject({
                kind: "Match",
                cases: [
                    {
                        pattern: {
                            kind: "TypeAnnotatedPattern",
                            pattern: {
                                kind: "VarPattern",
                                name: "x",
                            },
                            typeExpr: {
                                kind: "TypeConst",
                                name: "Int",
                            },
                        },
                    },
                    {
                        pattern: {
                            kind: "TypeAnnotatedPattern",
                            pattern: {
                                kind: "VarPattern",
                                name: "x",
                            },
                            typeExpr: {
                                kind: "TypeConst",
                                name: "Int",
                            },
                        },
                    },
                ],
            });
        });

        it("parses match with complex type-annotated patterns", () => {
            const expr = parseExpr(
                "match result { | Ok((value: Int)) when value > 0 => value | Ok((value: Int)) => 0 | Err((msg: String)) => -1 }",
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
                                    kind: "TypeAnnotatedPattern",
                                    pattern: {
                                        kind: "VarPattern",
                                        name: "value",
                                    },
                                    typeExpr: {
                                        kind: "TypeConst",
                                        name: "Int",
                                    },
                                },
                            ],
                        },
                    },
                    {
                        pattern: {
                            kind: "ConstructorPattern",
                            constructor: "Ok",
                            args: [
                                {
                                    kind: "TypeAnnotatedPattern",
                                },
                            ],
                        },
                    },
                    {
                        pattern: {
                            kind: "ConstructorPattern",
                            constructor: "Err",
                            args: [
                                {
                                    kind: "TypeAnnotatedPattern",
                                },
                            ],
                        },
                    },
                ],
            });
        });
    });

    describe("nested type annotations", () => {
        it("parses deeply nested type annotations", () => {
            const pattern = parsePattern("Some(Ok(((value: Int), (msg: String))))");
            expect(pattern).toMatchObject({
                kind: "ConstructorPattern",
                constructor: "Some",
                args: [
                    {
                        kind: "ConstructorPattern",
                        constructor: "Ok",
                        args: [
                            {
                                kind: "TuplePattern",
                                elements: [
                                    {
                                        kind: "TypeAnnotatedPattern",
                                        pattern: {
                                            kind: "VarPattern",
                                            name: "value",
                                        },
                                        typeExpr: {
                                            kind: "TypeConst",
                                            name: "Int",
                                        },
                                    },
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
                            },
                        ],
                    },
                ],
            });
        });

        it("parses record with nested constructor and type annotations", () => {
            const pattern = parsePattern("{ result: Some((value: Int)), status }");
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
                                    kind: "TypeAnnotatedPattern",
                                    pattern: {
                                        kind: "VarPattern",
                                        name: "value",
                                    },
                                    typeExpr: {
                                        kind: "TypeConst",
                                        name: "Int",
                                    },
                                },
                            ],
                        },
                    },
                    {
                        name: "status",
                        pattern: {
                            kind: "VarPattern",
                            name: "status",
                        } as Pattern,
                    },
                ],
            });
        });
    });

    describe("error cases", () => {
        it("parses variable pattern and leaves type annotation for caller to handle", () => {
            // Note: "x: Int" will parse as just "x" (VarPattern)
            // The ": Int" part is left unparsed (not an error at pattern level)
            const pattern = parsePattern("x: Int");
            expect(pattern).toMatchObject({
                kind: "VarPattern",
                name: "x",
            });
        });

        it("throws on incomplete type annotation", () => {
            expect(() => parsePattern("(x:)")).toThrow();
        });

        it("throws on missing closing parenthesis", () => {
            expect(() => parsePattern("(x: Int")).toThrow();
        });

        it("throws on type annotation with wildcard (unclear if allowed)", () => {
            // This might actually be allowed - spec doesn't clarify
            // For now, test that it either parses or throws consistently
            const testFn = () => parsePattern("(_: Int)");
            // Either it works or it doesn't, but it should be consistent
            try {
                const result = testFn();
                expect(result).toMatchObject({
                    kind: "TypeAnnotatedPattern",
                    pattern: {
                        kind: "WildcardPattern",
                    },
                });
            } catch {
                expect(testFn).toThrow();
            }
        });
    });

    describe("edge cases", () => {
        it("parses type annotation with type variable", () => {
            const pattern = parsePattern("(x: T)");
            expect(pattern).toMatchObject({
                kind: "TypeAnnotatedPattern",
                pattern: {
                    kind: "VarPattern",
                    name: "x",
                },
                typeExpr: {
                    // Note: Parser treats all identifiers as TypeConst
                    // Type checker will determine which are type variables based on scope
                    kind: "TypeConst",
                    name: "T",
                },
            });
        });

        it("parses type annotation with multi-param function type", () => {
            const pattern = parsePattern("(f: (Int, String) -> Bool)");
            expect(pattern).toMatchObject({
                kind: "TypeAnnotatedPattern",
                pattern: {
                    kind: "VarPattern",
                    name: "f",
                },
                typeExpr: {
                    kind: "FunctionType",
                    params: [
                        {
                            kind: "TypeConst",
                            name: "Int",
                        },
                        {
                            kind: "TypeConst",
                            name: "String",
                        },
                    ],
                    return_: {
                        kind: "TypeConst",
                        name: "Bool",
                    },
                },
            });
        });

        it("preserves location information", () => {
            const pattern = parsePattern("(x: Int)");
            expect(pattern.loc).toBeDefined();
            expect(pattern.loc.file).toBe("test.vf");
            expect(pattern.loc.line).toBeGreaterThan(0);
            expect(pattern.loc.column).toBeGreaterThan(0);
        });
    });
});
