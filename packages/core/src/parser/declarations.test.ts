/**
 * Declaration parsing tests
 */

import type { Declaration, Module } from "../types/index.js";

import { describe, expect, it } from "vitest";

import { Lexer } from "../lexer/index.js";
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
    const decl = module.declarations[0];
    if (!decl) {
        throw new Error("Expected at least one declaration in parsed module");
    }
    return decl;
}

describe("Parser - Declarations", () => {
    describe("let declarations", () => {
        it("parses simple let binding", () => {
            const decl = parseDecl("let x = 42;");
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
            const decl = parseDecl("let x: Int = 42;");
            expect(decl).toMatchObject({
                kind: "LetDecl",
                pattern: { kind: "VarPattern", name: "x" },
                value: { kind: "IntLit", value: 42 },
            });
        });

        it("parses mutable let binding", () => {
            const decl = parseDecl("let mut counter = 0;");
            expect(decl).toMatchObject({
                kind: "LetDecl",
                pattern: { kind: "VarPattern", name: "counter" },
                value: { kind: "IntLit", value: 0 },
                mutable: true,
                recursive: false,
            });
        });

        it("parses recursive let binding", () => {
            const decl = parseDecl("let rec factorial = (n) => if n == 0 then 1 else n * factorial(n - 1);");
            expect(decl).toMatchObject({
                kind: "LetDecl",
                pattern: { kind: "VarPattern", name: "factorial" },
                mutable: false,
                recursive: true,
            });
        });

        it("parses let with both mut and rec", () => {
            const decl = parseDecl("let mut rec state = initialState();");
            expect(decl).toMatchObject({
                kind: "LetDecl",
                pattern: { kind: "VarPattern", name: "state" },
                mutable: true,
                recursive: true,
            });
        });

        it("parses exported let binding", () => {
            const decl = parseDecl("export let pi = 3.14159;");
            expect(decl).toMatchObject({
                kind: "LetDecl",
                pattern: { kind: "VarPattern", name: "pi" },
                exported: true,
            });
        });

        it("parses let with pattern destructuring", () => {
            const decl = parseDecl("let { x, y } = point;");
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
            const decl = parseDecl("let add = (x, y) => x + y;");
            expect(decl).toMatchObject({
                kind: "LetDecl",
                pattern: { kind: "VarPattern", name: "add" },
                value: { kind: "Lambda" },
            });
        });
    });

    describe("type declarations", () => {
        it("parses type alias", () => {
            const decl = parseDecl("type UserId = Int;");
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
            const decl = parseDecl("type Box<T> = { value: T };");
            expect(decl).toMatchObject({
                kind: "TypeDecl",
                name: "Box",
                params: ["T"],
                definition: { kind: "RecordTypeDef" },
            });
        });

        it("parses record type", () => {
            const decl = parseDecl("type Point = { x: Int, y: Int };");
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
            const decl = parseDecl("type Option<t> = Some(t) | None;");
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
            const decl = parseDecl("type Shape = Circle(Int) | Rectangle(Int, Int) | Triangle(Int, Int, Int);");
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
            const decl = parseDecl("export type Status = String;");
            expect(decl).toMatchObject({
                kind: "TypeDecl",
                name: "Status",
                exported: true,
            });
        });

        it("parses multiline variant type", () => {
            const decl = parseDecl("type Result<t, e> = | Ok(t) | Err(e);");
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
            const decl = parseDecl('external log: (String) -> Unit = "console.log";');
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
            const decl = parseDecl('external fetch: (String) -> Promise = "fetch" from "node-fetch";');
            expect(decl).toMatchObject({
                kind: "ExternalDecl",
                name: "fetch",
                jsName: "fetch",
                from: "node-fetch",
            });
        });

        it("parses external with complex type", () => {
            const decl = parseDecl('external map: (List<a>, (a) -> b) -> List<b> = "Array.prototype.map";');
            expect(decl).toMatchObject({
                kind: "ExternalDecl",
                name: "map",
                typeExpr: { kind: "FunctionType" },
                jsName: "Array.prototype.map",
            });
        });

        it("parses exported external", () => {
            const decl = parseDecl('export external log: (String) -> Unit = "console.log";');
            expect(decl).toMatchObject({
                kind: "ExternalDecl",
                name: "log",
                exported: true,
            });
        });
    });

    describe("external blocks", () => {
        it("parses simple external block", () => {
            const decl = parseDecl(`external {
                log: (String) -> Unit = "console.log";
                error: (String) -> Unit = "console.error";
            };`);
            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.items).toHaveLength(2);
            expect(decl.items[0]!).toMatchObject({
                kind: "ExternalValue",
                name: "log",
                jsName: "console.log",
            });
            expect(decl.items[1]!).toMatchObject({
                kind: "ExternalValue",
                name: "error",
                jsName: "console.error",
            });
            expect(decl.from).toBeUndefined();
            expect(decl.exported).toBe(false);
        });

        it("parses external block with from clause", () => {
            const decl = parseDecl(`external from "node-fetch" {
                fetch: (String) -> Promise = "fetch";
                Headers: Type = "Headers";
            };`);
            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.items).toHaveLength(2);
            expect(decl.from).toBe("node-fetch");
            expect(decl.exported).toBe(false);
        });

        it("parses exported external block", () => {
            const decl = parseDecl(`export external {
                log: (String) -> Unit = "console.log";
            };`);
            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.exported).toBe(true);
            expect(decl.items).toHaveLength(1);
        });

        it("parses external block with type declarations", () => {
            const decl = parseDecl(`external {
                type Response = { ok: Bool, status: Int };
                fetch: (String) -> Promise = "fetch";
            };`);
            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.items).toHaveLength(2);

            // First item is a type
            expect(decl.items[0]!).toMatchObject({
                kind: "ExternalType",
                name: "Response",
                typeExpr: {
                    kind: "RecordType",
                    fields: [
                        { name: "ok", typeExpr: { kind: "TypeConst", name: "Bool" } },
                        { name: "status", typeExpr: { kind: "TypeConst", name: "Int" } },
                    ],
                },
            });

            // Second item is a value
            expect(decl.items[1]!).toMatchObject({
                kind: "ExternalValue",
                name: "fetch",
                jsName: "fetch",
            });
        });

        it("parses exported external block with from clause", () => {
            const decl = parseDecl(`export external from "react" {
                useState: (a) -> (a, (a) -> Unit) = "useState";
                useEffect: ((Unit) -> Unit) -> Unit = "useEffect";
            };`);
            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.exported).toBe(true);
            expect(decl.from).toBe("react");
            expect(decl.items).toHaveLength(2);
        });

        it("parses empty external block", () => {
            const decl = parseDecl("external {};");
            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.items).toHaveLength(0);
        });

        it("parses external block with single item", () => {
            const decl = parseDecl(`external {
                log: (String) -> Unit = "console.log";
            };`);
            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.items).toHaveLength(1);
            expect(decl.items[0]!).toMatchObject({
                kind: "ExternalValue",
                name: "log",
            });
        });

        it("parses external block with complex types", () => {
            const decl = parseDecl(`external {
                map: (List<a>, (a) -> b) -> List<b> = "Array.prototype.map";
                filter: (List<a>, (a) -> Bool) -> List<a> = "Array.prototype.filter";
            };`);
            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.items).toHaveLength(2);
            expect(decl.items[0]!).toMatchObject({
                kind: "ExternalValue",
                name: "map",
                typeExpr: { kind: "FunctionType" },
            });
        });

        it("handles inline formatting in external blocks", () => {
            const decl = parseDecl('external { log: (String) -> Unit = "console.log" };');
            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.items).toHaveLength(1);
        });

        it("parses external block with only type declarations", () => {
            const decl = parseDecl(`external {
                type Request = { url: String, method: String };
                type Response = { status: Int, body: String };
            };`);
            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.items).toHaveLength(2);
            expect(decl.items[0]!.kind).toBe("ExternalType");
            expect(decl.items[1]!.kind).toBe("ExternalType");
        });
    });

    describe("imports", () => {
        it("parses named import", () => {
            const module = parseModule('import { map, filter } from "./list";');
            expect(module.imports).toHaveLength(1);
            const imp = module.imports[0]!;
            expect(imp).toBeDefined();
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
            const module = parseModule('import { map as listMap } from "./list";');
            const imp = module.imports[0]!;
            expect(imp).toBeDefined();
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [{ name: "map", alias: "listMap", isType: false }],
                from: "./list",
            });
        });

        it("parses import all as namespace", () => {
            const module = parseModule('import * as List from "./list";');
            const imp = module.imports[0]!;
            expect(imp).toBeDefined();
            expect(imp).toMatchObject({
                kind: "ImportDecl",
                items: [{ name: "*", alias: "List", isType: false }],
                from: "./list",
            });
        });

        it("parses type import", () => {
            const module = parseModule('import { type User, type Post } from "./types";');
            const imp = module.imports[0]!;
            expect(imp).toBeDefined();
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
            const module = parseModule('import { type User, getUser, updateUser } from "./api";');
            const imp = module.imports[0]!;
            expect(imp).toBeDefined();
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
            const source = `let x = 42;
                let y = 10;
                let z = x + y;`;
            const module = parseModule(source);
            expect(module.declarations).toHaveLength(3);
        });

        it("parses module with imports and declarations", () => {
            const source = `import { map } from "./list";
                let doubled = map(list, (x) => x * 2);`;
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
            const source = `import { Option } from "./option";
                type Result<T, E> = Ok(T) | Err(E);
                external log: (String) -> Unit = "console.log";
                let processResult = (r) => match r {
                    | Ok(x) => log(x)
                    | Err(e) => log(e)
                };`;
            const module = parseModule(source);
            expect(module.imports).toHaveLength(1);
            expect(module.declarations).toHaveLength(3);
            expect(module.declarations[0]).toBeDefined();
            expect(module.declarations[0]?.kind).toBe("TypeDecl");
            expect(module.declarations[1]).toBeDefined();
            expect(module.declarations[1]?.kind).toBe("ExternalDecl");
            expect(module.declarations[2]).toBeDefined();
            expect(module.declarations[2]?.kind).toBe("LetDecl");
        });
    });

    describe("re-export declarations", () => {
        it("parses named re-export", () => {
            const decl = parseDecl('export { x } from "./mod";');
            expect(decl).toMatchObject({
                kind: "ReExportDecl",
                items: [{ name: "x", isType: false }],
                from: "./mod",
            });
        });

        it("parses multiple named re-exports", () => {
            const decl = parseDecl('export { x, y, z } from "./mod";');
            expect(decl).toMatchObject({
                kind: "ReExportDecl",
                items: [
                    { name: "x", isType: false },
                    { name: "y", isType: false },
                    { name: "z", isType: false },
                ],
                from: "./mod",
            });
        });

        it("parses aliased re-export", () => {
            const decl = parseDecl('export { x as y } from "./mod";');
            expect(decl).toMatchObject({
                kind: "ReExportDecl",
                items: [{ name: "x", alias: "y", isType: false }],
                from: "./mod",
            });
        });

        it("parses multiple aliased re-exports", () => {
            const decl = parseDecl('export { x as a, y as b } from "./mod";');
            expect(decl).toMatchObject({
                kind: "ReExportDecl",
                items: [
                    { name: "x", alias: "a", isType: false },
                    { name: "y", alias: "b", isType: false },
                ],
                from: "./mod",
            });
        });

        it("parses namespace re-export", () => {
            const decl = parseDecl('export * from "./mod";');
            expect(decl).toMatchObject({
                kind: "ReExportDecl",
                items: null,
                from: "./mod",
            });
        });

        it("parses namespace re-export from parent", () => {
            const decl = parseDecl('export * from "../parent/mod";');
            expect(decl).toMatchObject({
                kind: "ReExportDecl",
                items: null,
                from: "../parent/mod",
            });
        });

        it("parses type re-export", () => {
            const decl = parseDecl('export { type T } from "./types";');
            expect(decl).toMatchObject({
                kind: "ReExportDecl",
                items: [{ name: "T", isType: true }],
                from: "./types",
            });
        });

        it("parses multiple type re-exports", () => {
            const decl = parseDecl('export { type T, type U } from "./types";');
            expect(decl).toMatchObject({
                kind: "ReExportDecl",
                items: [
                    { name: "T", isType: true },
                    { name: "U", isType: true },
                ],
                from: "./types",
            });
        });

        it("parses mixed type and value re-exports", () => {
            const decl = parseDecl('export { type T, value } from "./mod";');
            expect(decl).toMatchObject({
                kind: "ReExportDecl",
                items: [
                    { name: "T", isType: true },
                    { name: "value", isType: false },
                ],
                from: "./mod",
            });
        });

        it("parses mixed with multiple types and values", () => {
            const decl = parseDecl('export { type T, type U, a, b } from "./mod";');
            expect(decl).toMatchObject({
                kind: "ReExportDecl",
                items: [
                    { name: "T", isType: true },
                    { name: "U", isType: true },
                    { name: "a", isType: false },
                    { name: "b", isType: false },
                ],
                from: "./mod",
            });
        });

        it("parses empty re-export", () => {
            const decl = parseDecl('export {} from "./mod";');
            expect(decl).toMatchObject({
                kind: "ReExportDecl",
                items: [],
                from: "./mod",
            });
        });

        it("parses re-export with relative paths", () => {
            const decl1 = parseDecl('export { x } from "./sibling";');
            expect(decl1).toMatchObject({
                kind: "ReExportDecl",
                from: "./sibling",
            });

            const decl2 = parseDecl('export { x } from "../parent";');
            expect(decl2).toMatchObject({
                kind: "ReExportDecl",
                from: "../parent",
            });

            const decl3 = parseDecl('export { x } from "../../grandparent";');
            expect(decl3).toMatchObject({
                kind: "ReExportDecl",
                from: "../../grandparent",
            });
        });
    });
});
