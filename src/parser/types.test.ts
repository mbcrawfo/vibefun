/**
 * Type expression parsing tests
 */

import type { TypeExpr } from "../types/index.js";

import { describe, expect, it } from "vitest";

import { Lexer } from "../lexer/index.js";
import { Parser } from "./parser.js";

// Helper to parse a type expression from source code
function parseType(source: string): TypeExpr {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    return parser.parseTypeExpr();
}

describe("Parser - Type Expressions", () => {
    describe("type variables and constants", () => {
        it("parses type variable (lowercase)", () => {
            const type = parseType("a");
            expect(type).toMatchObject({
                kind: "TypeVar",
                name: "a",
            });
        });

        it("parses type constant (PascalCase)", () => {
            const type = parseType("Int");
            expect(type).toMatchObject({
                kind: "TypeConst",
                name: "Int",
            });
        });

        it("distinguishes type variables from constants by case", () => {
            const typeVar = parseType("elem");
            const typeConst = parseType("Element");

            expect(typeVar).toMatchObject({ kind: "TypeVar", name: "elem" });
            expect(typeConst).toMatchObject({ kind: "TypeConst", name: "Element" });
        });
    });

    describe("type applications", () => {
        it("parses generic type with single argument", () => {
            const type = parseType("List<Int>");
            expect(type).toMatchObject({
                kind: "TypeApp",
                constructor: { kind: "TypeConst", name: "List" },
                args: [{ kind: "TypeConst", name: "Int" }],
            });
        });

        it("parses generic type with multiple arguments", () => {
            const type = parseType("Map<String, Int>");
            expect(type).toMatchObject({
                kind: "TypeApp",
                constructor: { kind: "TypeConst", name: "Map" },
                args: [
                    { kind: "TypeConst", name: "String" },
                    { kind: "TypeConst", name: "Int" },
                ],
            });
        });

        it("parses nested generic types", () => {
            const type = parseType("List<Option<Int>>");
            expect(type).toMatchObject({
                kind: "TypeApp",
                constructor: { kind: "TypeConst", name: "List" },
                args: [
                    {
                        kind: "TypeApp",
                        constructor: { kind: "TypeConst", name: "Option" },
                        args: [{ kind: "TypeConst", name: "Int" }],
                    },
                ],
            });
        });

        it("parses generic type with type variable", () => {
            const type = parseType("List<t>");
            expect(type).toMatchObject({
                kind: "TypeApp",
                constructor: { kind: "TypeConst", name: "List" },
                args: [{ kind: "TypeVar", name: "t" }],
            });
        });
    });

    describe("function types", () => {
        it("parses simple function type", () => {
            const type = parseType("Int -> String");
            expect(type).toMatchObject({
                kind: "FunctionType",
                params: [{ kind: "TypeConst", name: "Int" }],
                return_: { kind: "TypeConst", name: "String" },
            });
        });

        it("parses function type with multiple parameters", () => {
            const type = parseType("(Int, String) -> Bool");
            expect(type).toMatchObject({
                kind: "FunctionType",
                params: [
                    { kind: "TypeConst", name: "Int" },
                    { kind: "TypeConst", name: "String" },
                ],
                return_: { kind: "TypeConst", name: "Bool" },
            });
        });

        it("parses curried function type (right-associative)", () => {
            const type = parseType("Int -> Int -> Int");
            expect(type).toMatchObject({
                kind: "FunctionType",
                params: [{ kind: "TypeConst", name: "Int" }],
                return_: {
                    kind: "FunctionType",
                    params: [{ kind: "TypeConst", name: "Int" }],
                    return_: { kind: "TypeConst", name: "Int" },
                },
            });
        });

        it("parses higher-order function type", () => {
            const type = parseType("(Int -> String) -> Bool");
            expect(type).toMatchObject({
                kind: "FunctionType",
                params: [
                    {
                        kind: "FunctionType",
                        params: [{ kind: "TypeConst", name: "Int" }],
                        return_: { kind: "TypeConst", name: "String" },
                    },
                ],
                return_: { kind: "TypeConst", name: "Bool" },
            });
        });

        it("parses function with generic types", () => {
            const type = parseType("List<a> -> a");
            expect(type).toMatchObject({
                kind: "FunctionType",
                params: [
                    {
                        kind: "TypeApp",
                        constructor: { kind: "TypeConst", name: "List" },
                        args: [{ kind: "TypeVar", name: "a" }],
                    },
                ],
                return_: { kind: "TypeVar", name: "a" },
            });
        });
    });

    describe("record types", () => {
        it("parses empty record type", () => {
            const type = parseType("{}");
            expect(type).toMatchObject({
                kind: "RecordType",
                fields: [],
            });
        });

        it("parses record type with single field", () => {
            const type = parseType("{ x: Int }");
            expect(type).toMatchObject({
                kind: "RecordType",
                fields: [
                    {
                        name: "x",
                        typeExpr: { kind: "TypeConst", name: "Int" },
                    },
                ],
            });
        });

        it("parses record type with multiple fields", () => {
            const type = parseType("{ x: Int, y: Int, z: Int }");
            expect(type).toMatchObject({
                kind: "RecordType",
                fields: [
                    {
                        name: "x",
                        typeExpr: { kind: "TypeConst", name: "Int" },
                    },
                    {
                        name: "y",
                        typeExpr: { kind: "TypeConst", name: "Int" },
                    },
                    {
                        name: "z",
                        typeExpr: { kind: "TypeConst", name: "Int" },
                    },
                ],
            });
        });

        it("parses record type with complex field types", () => {
            const type = parseType("{ name: String, age: Int, scores: List<Int> }");
            expect(type).toMatchObject({
                kind: "RecordType",
                fields: [
                    {
                        name: "name",
                        typeExpr: { kind: "TypeConst", name: "String" },
                    },
                    {
                        name: "age",
                        typeExpr: { kind: "TypeConst", name: "Int" },
                    },
                    {
                        name: "scores",
                        typeExpr: {
                            kind: "TypeApp",
                            constructor: { kind: "TypeConst", name: "List" },
                            args: [{ kind: "TypeConst", name: "Int" }],
                        },
                    },
                ],
            });
        });

        it("parses nested record types", () => {
            const type = parseType("{ point: { x: Int, y: Int } }");
            expect(type).toMatchObject({
                kind: "RecordType",
                fields: [
                    {
                        name: "point",
                        typeExpr: {
                            kind: "RecordType",
                            fields: [
                                {
                                    name: "x",
                                    typeExpr: { kind: "TypeConst", name: "Int" },
                                },
                                {
                                    name: "y",
                                    typeExpr: { kind: "TypeConst", name: "Int" },
                                },
                            ],
                        },
                    },
                ],
            });
        });
    });

    describe("constructor types (for patterns/declarations)", () => {
        it("parses type constructor with no arguments", () => {
            const type = parseType("None()");
            expect(type).toMatchObject({
                kind: "TypeApp",
                constructor: { kind: "TypeConst", name: "None" },
                args: [],
            });
        });

        it("parses type constructor with arguments", () => {
            const type = parseType("Some(Int)");
            expect(type).toMatchObject({
                kind: "TypeApp",
                constructor: { kind: "TypeConst", name: "Some" },
                args: [{ kind: "TypeConst", name: "Int" }],
            });
        });

        it("parses type constructor with multiple arguments", () => {
            const type = parseType("Point(Int, Int)");
            expect(type).toMatchObject({
                kind: "TypeApp",
                constructor: { kind: "TypeConst", name: "Point" },
                args: [
                    { kind: "TypeConst", name: "Int" },
                    { kind: "TypeConst", name: "Int" },
                ],
            });
        });

        it("parses type constructor with generic arguments", () => {
            const type = parseType("Some(t)");
            expect(type).toMatchObject({
                kind: "TypeApp",
                constructor: { kind: "TypeConst", name: "Some" },
                args: [{ kind: "TypeVar", name: "t" }],
            });
        });
    });

    describe("union types", () => {
        it("parses simple union type", () => {
            const type = parseType("Int | String");
            expect(type).toMatchObject({
                kind: "UnionType",
                types: [
                    { kind: "TypeConst", name: "Int" },
                    { kind: "TypeConst", name: "String" },
                ],
            });
        });

        it("parses union type with three types", () => {
            const type = parseType("Int | String | Bool");
            expect(type).toMatchObject({
                kind: "UnionType",
                types: [
                    { kind: "TypeConst", name: "Int" },
                    { kind: "TypeConst", name: "String" },
                    { kind: "TypeConst", name: "Bool" },
                ],
            });
        });

        it("parses union type with generic types", () => {
            const type = parseType("List<Int> | Option<String>");
            expect(type).toMatchObject({
                kind: "UnionType",
                types: [
                    {
                        kind: "TypeApp",
                        constructor: { kind: "TypeConst", name: "List" },
                        args: [{ kind: "TypeConst", name: "Int" }],
                    },
                    {
                        kind: "TypeApp",
                        constructor: { kind: "TypeConst", name: "Option" },
                        args: [{ kind: "TypeConst", name: "String" }],
                    },
                ],
            });
        });
    });

    describe("complex types", () => {
        it("parses function type with record parameter and return", () => {
            const type = parseType("{ x: Int, y: Int } -> { distance: Float }");
            expect(type).toMatchObject({
                kind: "FunctionType",
                params: [
                    {
                        kind: "RecordType",
                        fields: [
                            { name: "x", typeExpr: { kind: "TypeConst", name: "Int" } },
                            { name: "y", typeExpr: { kind: "TypeConst", name: "Int" } },
                        ],
                    },
                ],
                return_: {
                    kind: "RecordType",
                    fields: [{ name: "distance", typeExpr: { kind: "TypeConst", name: "Float" } }],
                },
            });
        });

        it("parses function type with constructor in parentheses", () => {
            const type = parseType("String -> Some(Int)");
            expect(type).toMatchObject({
                kind: "FunctionType",
                params: [{ kind: "TypeConst", name: "String" }],
                return_: {
                    kind: "TypeApp",
                    constructor: { kind: "TypeConst", name: "Some" },
                    args: [{ kind: "TypeConst", name: "Int" }],
                },
            });
        });

        it("parses unit type", () => {
            const type = parseType("()");
            expect(type).toMatchObject({
                kind: "TypeConst",
                name: "Unit",
            });
        });

        it("parses function type with unit parameter", () => {
            const type = parseType("() -> Int");
            expect(type).toMatchObject({
                kind: "FunctionType",
                params: [{ kind: "TypeConst", name: "Unit" }],
                return_: { kind: "TypeConst", name: "Int" },
            });
        });
    });
});
