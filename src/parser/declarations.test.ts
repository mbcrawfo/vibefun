/**
 * Declaration parsing tests
 */

import type { Declaration, Module } from "../types/index.js";

import { describe, expect, it } from "vitest";

import { Lexer } from "../lexer/lexer.js";
import { Parser } from "./parser.js";

// Helper to parse a module from source code
function parseModule(source: string): Module {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    return parser.parse();
}

// Helper to get first declaration
function parseDecl(source: string): Declaration {
    const module = parseModule(source);
    return module.declarations[0]!;
}

describe("Parser - Declarations", () => {
    describe("let declarations", () => {
        it("parses simple let binding", () => {
            const decl = parseDecl("let x = 42");
            expect(decl).toMatchObject({
                kind: "LetDecl",
                pattern: { kind: "VarPattern", name: "x" },
                value: { kind: "IntLit", value: 42 },
                mutable: false,
                recursive: false,
                exported: false,
            });
        });

        it("parses let with type annotation", () => {
            const decl = parseDecl("let x: Int = 42");
            expect(decl).toMatchObject({
                kind: "LetDecl",
                pattern: { kind: "VarPattern", name: "x" },
                value: { kind: "IntLit", value: 42 },
            });
        });

        it("parses mutable let binding", () => {
            const decl = parseDecl("let mut counter = 0");
            expect(decl).toMatchObject({
                kind: "LetDecl",
                pattern: { kind: "VarPattern", name: "counter" },
                value: { kind: "IntLit", value: 0 },
                mutable: true,
                recursive: false,
            });
        });

        it("parses recursive let binding", () => {
            const decl = parseDecl("let rec factorial = (n) => if n == 0 then 1 else n * factorial(n - 1)");
            expect(decl).toMatchObject({
                kind: "LetDecl",
                pattern: { kind: "VarPattern", name: "factorial" },
                mutable: false,
                recursive: true,
            });
        });

        it("parses let with both mut and rec", () => {
            const decl = parseDecl("let mut rec state = initialState()");
            expect(decl).toMatchObject({
                kind: "LetDecl",
                pattern: { kind: "VarPattern", name: "state" },
                mutable: true,
                recursive: true,
            });
        });

        it("parses exported let binding", () => {
            const decl = parseDecl("export let pi = 3.14159");
            expect(decl).toMatchObject({
                kind: "LetDecl",
                pattern: { kind: "VarPattern", name: "pi" },
                exported: true,
            });
        });

        it("parses let with pattern destructuring", () => {
            const decl = parseDecl("let { x, y } = point");
            expect(decl).toMatchObject({
                kind: "LetDecl",
                pattern: {
                    kind: "RecordPattern",
                    fields: [
                        { name: "x", pattern: { kind: "VarPattern", name: "x" } },
                        { name: "y", pattern: { kind: "VarPattern", name: "y" } },
                    ],
                },
            });
        });

        it("parses let with function value", () => {
            const decl = parseDecl("let add = (x, y) => x + y");
            expect(decl).toMatchObject({
                kind: "LetDecl",
                pattern: { kind: "VarPattern", name: "add" },
                value: { kind: "Lambda" },
            });
        });
    });

    describe("type declarations", () => {
        it("parses type alias", () => {
            const decl = parseDecl("type UserId = Int");
            expect(decl).toMatchObject({
                kind: "TypeDecl",
                name: "UserId",
                params: [],
                definition: {
                    kind: "AliasType",
                    typeExpr: { kind: "TypeConst", name: "Int" },
                },
                exported: false,
            });
        });

        it("parses generic type alias", () => {
            const decl = parseDecl("type Box<T> = { value: T }");
            expect(decl).toMatchObject({
                kind: "TypeDecl",
                name: "Box",
                params: ["T"],
                definition: { kind: "RecordTypeDef" },
            });
        });

        it("parses record type", () => {
            const decl = parseDecl("type Point = { x: Int, y: Int }");
            expect(decl).toMatchObject({
                kind: "TypeDecl",
                name: "Point",
                params: [],
                definition: {
                    kind: "RecordTypeDef",
                    fields: [
                        { name: "x", typeExpr: { kind: "TypeConst", name: "Int" } },
                        { name: "y", typeExpr: { kind: "TypeConst", name: "Int" } },
                    ],
                },
            });
        });

        it("parses variant type with constructors", () => {
            const decl = parseDecl("type Option<t> = Some(t) | None");
            expect(decl).toMatchObject({
                kind: "TypeDecl",
                name: "Option",
                params: ["t"],
                definition: {
                    kind: "VariantTypeDef",
                    constructors: [
                        { name: "Some", args: [{ kind: "TypeVar", name: "t" }] },
                        { name: "None", args: [] },
                    ],
                },
            });
        });

        it("parses variant type with multiple constructors", () => {
            const decl = parseDecl("type Shape = Circle(Int) | Rectangle(Int, Int) | Triangle(Int, Int, Int)");
            expect(decl).toMatchObject({
                kind: "TypeDecl",
                name: "Shape",
                definition: {
                    kind: "VariantTypeDef",
                    constructors: [
                        { name: "Circle", args: [{ kind: "TypeConst", name: "Int" }] },
                        {
                            name: "Rectangle",
                            args: [
                                { kind: "TypeConst", name: "Int" },
                                { kind: "TypeConst", name: "Int" },
                            ],
                        },
                        {
                            name: "Triangle",
                            args: [
                                { kind: "TypeConst", name: "Int" },
                                { kind: "TypeConst", name: "Int" },
                                { kind: "TypeConst", name: "Int" },
                            ],
                        },
                    ],
                },
            });
        });

        it("parses exported type", () => {
            const decl = parseDecl("export type Status = String");
            expect(decl).toMatchObject({
                kind: "TypeDecl",
                name: "Status",
                exported: true,
            });
        });

        it("parses multiline variant type", () => {
            const decl = parseDecl("type Result<t, e> = | Ok(t) | Err(e)");
            expect(decl).toMatchObject({
                kind: "TypeDecl",
                name: "Result",
                params: ["t", "e"],
                definition: {
                    kind: "VariantTypeDef",
                    constructors: [
                        { name: "Ok", args: [{ kind: "TypeVar", name: "t" }] },
                        { name: "Err", args: [{ kind: "TypeVar", name: "e" }] },
                    ],
                },
            });
        });
    });

    describe("external declarations", () => {
        it("parses simple external", () => {
            const decl = parseDecl('external log: (String) -> Unit = "console.log"');
            expect(decl).toMatchObject({
                kind: "ExternalDecl",
                name: "log",
                typeExpr: {
                    kind: "FunctionType",
                    params: [{ kind: "TypeConst", name: "String" }],
                    return_: { kind: "TypeConst", name: "Unit" },
                },
                jsName: "console.log",
            });
            expect(decl.kind === "ExternalDecl" && decl.from).toBeUndefined();
        });

        it("parses external with from clause", () => {
            const decl = parseDecl('external fetch: (String) -> Promise = "fetch" from "node-fetch"');
            expect(decl).toMatchObject({
                kind: "ExternalDecl",
                name: "fetch",
                jsName: "fetch",
                from: "node-fetch",
            });
        });

        it("parses external with complex type", () => {
            const decl = parseDecl('external map: (List<a>, (a) -> b) -> List<b> = "Array.prototype.map"');
            expect(decl).toMatchObject({
                kind: "ExternalDecl",
                name: "map",
                typeExpr: { kind: "FunctionType" },
                jsName: "Array.prototype.map",
            });
        });
    });

    describe("imports", () => {
        it("parses named import", () => {
            const module = parseModule('import { map, filter } from "./list"');
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [
                    { name: "map", isType: false },
                    { name: "filter", isType: false },
                ],
                from: "./list",
            });
        });

        it("parses import with alias", () => {
            const module = parseModule('import { map as listMap } from "./list"');
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [{ name: "map", alias: "listMap", isType: false }],
                from: "./list",
            });
        });

        it("parses import all as namespace", () => {
            const module = parseModule('import * as List from "./list"');
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [{ name: "*", alias: "List", isType: false }],
                from: "./list",
            });
        });

        it("parses type import", () => {
            const module = parseModule('import { type User, type Post } from "./types"');
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [
                    { name: "User", isType: true },
                    { name: "Post", isType: true },
                ],
                from: "./types",
            });
        });

        it("parses mixed import", () => {
            const module = parseModule('import { type User, getUser, updateUser } from "./api"');
            const imp = module.imports[0]!;
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [
                    { name: "User", isType: true },
                    { name: "getUser", isType: false },
                    { name: "updateUser", isType: false },
                ],
                from: "./api",
            });
        });
    });

    describe("module structure", () => {
        it("parses module with multiple declarations", () => {
            const source = `let x = 42
                let y = 10
                let z = x + y`;
            const module = parseModule(source);
            expect(module.declarations).toHaveLength(3);
        });

        it("parses module with imports and declarations", () => {
            const source = `import { map } from "./list"
                let doubled = map(list, (x) => x * 2)`;
            const module = parseModule(source);
            expect(module.imports).toHaveLength(1);
            expect(module.declarations).toHaveLength(1);
        });

        it("parses empty module", () => {
            const module = parseModule("");
            expect(module.imports).toHaveLength(0);
            expect(module.declarations).toHaveLength(0);
        });

        it("parses module with only newlines", () => {
            const module = parseModule("\n\n\n");
            expect(module.imports).toHaveLength(0);
            expect(module.declarations).toHaveLength(0);
        });

        it("parses module with mixed declaration types", () => {
            const source = `import { Option } from "./option"
                type Result<T, E> = Ok(T) | Err(E)
                external log: (String) -> Unit = "console.log"
                let processResult = (r) => match r {
                    | Ok(x) => log(x)
                    | Err(e) => log(e)
                }`;
            const module = parseModule(source);
            expect(module.imports).toHaveLength(1);
            expect(module.declarations).toHaveLength(3);
            expect(module.declarations[0]!.kind).toBe("TypeDecl");
            expect(module.declarations[1]!.kind).toBe("ExternalDecl");
            expect(module.declarations[2]!.kind).toBe("LetDecl");
        });
    });
});
