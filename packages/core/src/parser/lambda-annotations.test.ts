/**
 * Tests for Lambda Parameter Type Annotations
 *
 * Phase 2.1: Lambda Parameter Type Annotations
 *
 * Tests parsing of type annotations on lambda parameters:
 * - Single parameter with type: (x: Int) => x + 1
 * - Multiple parameters with types: (x: Int, y: String) => ...
 * - Complex type annotations: (f: (Int) -> Int) => f(42)
 * - Generic types: (list: List<T>) => ...
 * - Mixed annotated and unannotated params (if allowed)
 */

import type { Expr } from "../types/index.js";

import { describe, expect, it } from "vitest";

import { Lexer } from "../lexer/index.js";
import { Parser } from "./parser.js";

/**
 * Helper to parse an expression
 */
function parseExpr(source: string): Expr {
    const wrappedSource = `let test = ${source};`;
    const lexer = new Lexer(wrappedSource, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    const module = parser.parse();

    const decl = module.declarations[0];

    if (!decl || decl.kind !== "LetDecl") {
        throw new Error("Expected LetDecl");
    }

    return decl.value;
}

describe("Lambda Parameter Type Annotations", () => {
    describe("Single parameter with type annotation", () => {
        it("parses simple type annotation: (x: Int) => x + 1", () => {
            const expr = parseExpr("(x: Int) => x + 1");

            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;

            expect(expr.params).toHaveLength(1);
            const param = expr.params[0];
            expect(param).toMatchObject({
                pattern: {
                    kind: "VarPattern",
                    name: "x",
                },
                type: {
                    kind: "TypeConst",
                    name: "Int",
                },
            });

            expect(expr.body.kind).toBe("BinOp");
        });

        it("parses type annotation with primitive types: (s: String) => s", () => {
            const expr = parseExpr("(s: String) => s");

            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;

            const param = expr.params[0];
            expect(param).toMatchObject({
                pattern: { kind: "VarPattern", name: "s" },
                type: {
                    kind: "TypeConst",
                    name: "String",
                },
            });
        });

        it("parses type annotation with Bool type: (flag: Bool) => flag", () => {
            const expr = parseExpr("(flag: Bool) => flag");

            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;

            const param = expr.params[0];
            expect(param).toMatchObject({
                pattern: { kind: "VarPattern", name: "flag" },
                type: {
                    kind: "TypeConst",
                    name: "Bool",
                },
            });
        });
    });

    describe("Multiple parameters with type annotations", () => {
        it("parses multiple params with types: (x: Int, y: Int) => x + y", () => {
            const expr = parseExpr("(x: Int, y: Int) => x + y");

            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;

            expect(expr.params).toHaveLength(2);

            expect(expr.params[0]).toMatchObject({
                pattern: { kind: "VarPattern", name: "x" },
                type: {
                    kind: "TypeConst",
                    name: "Int",
                },
            });

            expect(expr.params[1]).toMatchObject({
                pattern: { kind: "VarPattern", name: "y" },
                type: {
                    kind: "TypeConst",
                    name: "Int",
                },
            });
        });

        it("parses params with different types: (name: String, age: Int) => ...", () => {
            const expr = parseExpr("(name: String, age: Int) => name");

            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;

            expect(expr.params).toHaveLength(2);

            expect(expr.params[0]).toMatchObject({
                pattern: { kind: "VarPattern", name: "name" },
                type: {
                    kind: "TypeConst",
                    name: "String",
                },
            });

            expect(expr.params[1]).toMatchObject({
                pattern: { kind: "VarPattern", name: "age" },
                type: {
                    kind: "TypeConst",
                    name: "Int",
                },
            });
        });

        it("parses three parameters with types: (a: Int, b: Int, c: Int) => a + b + c", () => {
            const expr = parseExpr("(a: Int, b: Int, c: Int) => a + b + c");

            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;

            expect(expr.params).toHaveLength(3);

            expect(expr.params[0]).toMatchObject({
                pattern: { kind: "VarPattern", name: "a" },
                type: { kind: "TypeConst", name: "Int" },
            });

            expect(expr.params[1]).toMatchObject({
                pattern: { kind: "VarPattern", name: "b" },
                type: { kind: "TypeConst", name: "Int" },
            });

            expect(expr.params[2]).toMatchObject({
                pattern: { kind: "VarPattern", name: "c" },
                type: { kind: "TypeConst", name: "Int" },
            });
        });
    });

    describe("Complex type annotations", () => {
        it("parses function type annotation: (f: (Int) -> Int) => f(42)", () => {
            const expr = parseExpr("(f: (Int) -> Int) => f(42)");

            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;

            const param = expr.params[0];
            if (param?.pattern.kind !== "VarPattern") throw new Error("Expected VarPattern");
            expect(param.pattern.name).toBe("f");
            expect(param?.type).toMatchObject({
                kind: "FunctionType",
                params: [
                    {
                        kind: "TypeConst",
                        name: "Int",
                    },
                ],
                return_: {
                    kind: "TypeConst",
                    name: "Int",
                },
            });
        });

        it("parses complex function type: (transform: (String, Int) -> Bool) => ...", () => {
            const expr = parseExpr("(transform: (String, Int) -> Bool) => true");

            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;

            const param = expr.params[0];
            if (param?.pattern.kind !== "VarPattern") throw new Error("Expected VarPattern");
            expect(param.pattern.name).toBe("transform");
            expect(param?.type).toMatchObject({
                kind: "FunctionType",
                params: [
                    { kind: "TypeConst", name: "String" },
                    { kind: "TypeConst", name: "Int" },
                ],
                return_: {
                    kind: "TypeConst",
                    name: "Bool",
                },
            });
        });

        it("parses higher-order function type: (g: ((Int) -> Int) -> Int) => g((x) => x)", () => {
            const expr = parseExpr("(g: ((Int) -> Int) -> Int) => g((x) => x)");

            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;

            const param = expr.params[0];
            if (param?.pattern.kind !== "VarPattern") throw new Error("Expected VarPattern");
            expect(param.pattern.name).toBe("g");
            expect(param?.type?.kind).toBe("FunctionType");

            if (param?.type?.kind === "FunctionType") {
                // First param is (Int) -> Int
                expect(param.type.params[0]).toMatchObject({
                    kind: "FunctionType",
                    params: [{ kind: "TypeConst", name: "Int" }],
                    return_: { kind: "TypeConst", name: "Int" },
                });
                // Return type is Int
                expect(param.type.return_).toMatchObject({
                    kind: "TypeConst",
                    name: "Int",
                });
            }
        });
    });

    describe("Generic type annotations", () => {
        it("parses generic type: (list: List<Int>) => list", () => {
            const expr = parseExpr("(list: List<Int>) => list");

            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;

            const param = expr.params[0];
            if (param?.pattern.kind !== "VarPattern") throw new Error("Expected VarPattern");
            expect(param.pattern.name).toBe("list");
            expect(param?.type).toMatchObject({
                kind: "TypeApp",
                constructor: {
                    kind: "TypeConst",
                    name: "List",
                },
                args: [
                    {
                        kind: "TypeConst",
                        name: "Int",
                    },
                ],
            });
        });

        it("parses multiple type parameters: (dict: Map<String, Int>) => dict", () => {
            const expr = parseExpr("(dict: Map<String, Int>) => dict");

            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;

            const param = expr.params[0];
            if (param?.pattern.kind !== "VarPattern") throw new Error("Expected VarPattern");
            expect(param.pattern.name).toBe("dict");
            expect(param?.type).toMatchObject({
                kind: "TypeApp",
                constructor: {
                    kind: "TypeConst",
                    name: "Map",
                },
                args: [
                    { kind: "TypeConst", name: "String" },
                    { kind: "TypeConst", name: "Int" },
                ],
            });
        });

        it("parses nested generic types: (data: Option<List<String>>) => data", () => {
            const expr = parseExpr("(data: Option<List<String>>) => data");

            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;

            const param = expr.params[0];
            if (param?.pattern.kind !== "VarPattern") throw new Error("Expected VarPattern");
            expect(param.pattern.name).toBe("data");
            expect(param?.type).toMatchObject({
                kind: "TypeApp",
                constructor: {
                    kind: "TypeConst",
                    name: "Option",
                },
                args: [
                    {
                        kind: "TypeApp",
                        constructor: {
                            kind: "TypeConst",
                            name: "List",
                        },
                        args: [{ kind: "TypeConst", name: "String" }],
                    },
                ],
            });
        });

        it("parses Result type: (result: Result<String, Error>) => result", () => {
            const expr = parseExpr("(result: Result<String, Error>) => result");

            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;

            const param = expr.params[0];
            if (param?.pattern.kind !== "VarPattern") throw new Error("Expected VarPattern");
            expect(param.pattern.name).toBe("result");
            expect(param?.type).toMatchObject({
                kind: "TypeApp",
                constructor: {
                    kind: "TypeConst",
                    name: "Result",
                },
                args: [
                    { kind: "TypeConst", name: "String" },
                    { kind: "TypeConst", name: "Error" },
                ],
            });
        });
    });

    describe("Mixed annotated and unannotated parameters", () => {
        it("parses mix of typed and untyped params: (x: Int, y) => x + y", () => {
            const expr = parseExpr("(x: Int, y) => x + y");

            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;

            expect(expr.params).toHaveLength(2);

            // First param has type annotation
            expect(expr.params[0]).toMatchObject({
                pattern: { kind: "VarPattern", name: "x" },
                type: {
                    kind: "TypeConst",
                    name: "Int",
                },
            });

            // Second param has no type annotation
            const param1 = expr.params[1];
            expect(param1?.pattern).toMatchObject({ kind: "VarPattern", name: "y" });
            expect(param1?.type).toBeUndefined();
        });

        it("parses untyped followed by typed: (x, y: String) => y", () => {
            const expr = parseExpr("(x, y: String) => y");

            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;

            expect(expr.params).toHaveLength(2);

            // First param has no type
            const param0 = expr.params[0];
            expect(param0?.pattern).toMatchObject({ kind: "VarPattern", name: "x" });
            expect(param0?.type).toBeUndefined();

            // Second param has type annotation
            expect(expr.params[1]).toMatchObject({
                pattern: { kind: "VarPattern", name: "y" },
                type: {
                    kind: "TypeConst",
                    name: "String",
                },
            });
        });

        it("parses multiple params with partial annotations: (a: Int, b, c: String) => a", () => {
            const expr = parseExpr("(a: Int, b, c: String) => a");

            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;

            expect(expr.params).toHaveLength(3);

            expect(expr.params[0]).toMatchObject({
                pattern: { kind: "VarPattern", name: "a" },
                type: { kind: "TypeConst", name: "Int" },
            });

            const param1 = expr.params[1];
            expect(param1?.pattern).toMatchObject({ kind: "VarPattern", name: "b" });
            expect(param1?.type).toBeUndefined();

            expect(expr.params[2]).toMatchObject({
                pattern: { kind: "VarPattern", name: "c" },
                type: { kind: "TypeConst", name: "String" },
            });
        });
    });

    describe("Single parameter without parens", () => {
        it("parses single param with type requires parens: x: Int => x", () => {
            // Without parens, "x: Int" would be ambiguous
            // This should fail to parse or require parentheses
            // Let's verify the error case
            expect(() => parseExpr("x: Int => x")).toThrow();
        });

        it("parses single untyped param without parens: x => x + 1", () => {
            const expr = parseExpr("x => x + 1");

            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;

            expect(expr.params).toHaveLength(1);
            const param = expr.params[0];
            expect(param?.pattern).toMatchObject({ kind: "VarPattern", name: "x" });
            expect(param?.type).toBeUndefined();
        });
    });

    describe("Record and tuple type annotations", () => {
        it("parses record type annotation: (user: { name: String, age: Int }) => user", () => {
            const expr = parseExpr("(user: { name: String, age: Int }) => user");

            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;

            const param = expr.params[0];
            if (param?.pattern.kind !== "VarPattern") throw new Error("Expected VarPattern");
            expect(param.pattern.name).toBe("user");
            expect(param?.type).toMatchObject({
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
                ],
            });
        });

        it("parses tuple type annotation: (point: (Int, Int)) => point", () => {
            const expr = parseExpr("(point: (Int, Int)) => point");

            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;

            const param = expr.params[0];
            if (param?.pattern.kind !== "VarPattern") throw new Error("Expected VarPattern");
            expect(param.pattern.name).toBe("point");
            // Note: TupleType will be implemented in Phase 6.1
            // For now, (Int, Int) parses as UnionType
            expect(param?.type).toMatchObject({
                kind: "UnionType",
                types: [
                    { kind: "TypeConst", name: "Int" },
                    { kind: "TypeConst", name: "Int" },
                ],
            });
        });

        it("parses nested record type: (data: { user: { name: String } }) => data", () => {
            const expr = parseExpr("(data: { user: { name: String } }) => data");

            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;

            const param = expr.params[0];
            if (param?.pattern.kind !== "VarPattern") throw new Error("Expected VarPattern");
            expect(param.pattern.name).toBe("data");
            expect(param?.type?.kind).toBe("RecordType");

            if (param?.type?.kind === "RecordType") {
                expect(param.type.fields[0]).toMatchObject({
                    name: "user",
                    typeExpr: {
                        kind: "RecordType",
                        fields: [
                            {
                                name: "name",
                                typeExpr: { kind: "TypeConst", name: "String" },
                            },
                        ],
                    },
                });
            }
        });
    });

    describe("Edge cases", () => {
        it("parses empty parameter list with types is invalid: () => 42", () => {
            const expr = parseExpr("() => 42");

            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;

            expect(expr.params).toHaveLength(0);
        });

        it("parses type with whitespace: (x : Int) => x", () => {
            const expr = parseExpr("(x : Int) => x");

            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;

            const param = expr.params[0];
            expect(param).toMatchObject({
                pattern: { kind: "VarPattern", name: "x" },
                type: {
                    kind: "TypeConst",
                    name: "Int",
                },
            });
        });

        it("parses underscore param with type: (_: Int) => 42", () => {
            const expr = parseExpr("(_: Int) => 42");

            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;

            const param = expr.params[0];
            // Note: Underscore (_) is correctly parsed as WildcardPattern, not VarPattern
            expect(param).toMatchObject({
                pattern: { kind: "WildcardPattern" },
                type: {
                    kind: "TypeConst",
                    name: "Int",
                },
            });
        });
    });

    describe("Integration with lambda bodies", () => {
        it("parses typed param with block body: (x: Int) => { x + 1; }", () => {
            // Note: Semicolon is required per spec (functions-composition.md:131)
            // Without it, parser cannot distinguish { expr } from record shorthand
            const expr = parseExpr("(x: Int) => { x + 1; }");

            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;

            expect(expr.params[0]).toMatchObject({
                pattern: { kind: "VarPattern", name: "x" },
                type: {
                    kind: "TypeConst",
                    name: "Int",
                },
            });

            expect(expr.body.kind).toBe("Block");
        });

        it("parses typed params with match expression body", () => {
            const expr = parseExpr("(opt: Option<Int>) => match opt { | Some(x) => x | None => 0 }");

            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;

            expect(expr.params[0]).toMatchObject({
                pattern: { kind: "VarPattern", name: "opt" },
                type: {
                    kind: "TypeApp",
                    constructor: { kind: "TypeConst", name: "Option" },
                    args: [{ kind: "TypeConst", name: "Int" }],
                },
            });

            expect(expr.body.kind).toBe("Match");
        });

        it("parses typed params with lambda returning lambda", () => {
            const expr = parseExpr("(x: Int) => (y: Int) => x + y");

            expect(expr.kind).toBe("Lambda");
            if (expr.kind !== "Lambda") return;

            expect(expr.params[0]).toMatchObject({
                pattern: { kind: "VarPattern", name: "x" },
                type: { kind: "TypeConst", name: "Int" },
            });

            expect(expr.body.kind).toBe("Lambda");
            if (expr.body.kind !== "Lambda") return;

            expect(expr.body.params[0]).toMatchObject({
                pattern: { kind: "VarPattern", name: "y" },
                type: { kind: "TypeConst", name: "Int" },
            });
        });
    });
});
