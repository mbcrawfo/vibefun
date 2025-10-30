/**
 * Parser integration tests - complete programs
 */

import type { Declaration, Module } from "../types/index.js";

import { describe, expect, it } from "vitest";

import { Lexer } from "../lexer/index.js";
import { Parser } from "./parser.js";

// Type aliases for casting
type LetDecl = Extract<Declaration, { kind: "LetDecl" }>;

// Helper to parse a complete module
function parseModule(source: string): Module {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    return parser.parse();
}

describe("Parser - Integration", () => {
    describe("simple function definitions", () => {
        it("parses identity function", () => {
            const source = "let identity = (x) => x";
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(1);
            expect(module.declarations[0]!).toMatchObject({
                kind: "LetDecl",
                pattern: { kind: "VarPattern", name: "identity" },
                value: { kind: "Lambda" },
            });
        });

        it("parses add function with explicit parameters", () => {
            const source = "let add = (x, y) => x + y";
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(1);
            const decl = module.declarations[0]!;
            expect(decl).toBeDefined();
            expect(decl).toMatchObject({
                kind: "LetDecl",
                pattern: { kind: "VarPattern", name: "add" },
                value: {
                    kind: "Lambda",
                    body: {
                        kind: "BinOp",
                        op: "Add",
                    },
                },
            });
        });

        it("parses curried function", () => {
            const source = "let multiply = (x) => (y) => x * y";
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(1);
            expect(module.declarations[0]!).toMatchObject({
                kind: "LetDecl",
                value: {
                    kind: "Lambda",
                    body: {
                        kind: "Lambda",
                        body: { kind: "BinOp", op: "Multiply" },
                    },
                },
            });
        });
    });

    describe("recursive functions", () => {
        it("parses factorial function", () => {
            const source = "let rec factorial = (n) => if n == 0 then 1 else n * factorial(n - 1)";
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(1);
            expect(module.declarations[0]!).toMatchObject({
                kind: "LetDecl",
                pattern: { kind: "VarPattern", name: "factorial" },
                recursive: true,
                value: {
                    kind: "Lambda",
                    body: { kind: "If" },
                },
            });
        });

        it("parses fibonacci with pattern matching", () => {
            const source = `let rec fib = (n) => match n {
                | 0 => 0
                | 1 => 1
                | _ => fib(n - 1) + fib(n - 2)
            }`;
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(1);
            expect(module.declarations[0]!).toMatchObject({
                kind: "LetDecl",
                recursive: true,
                value: {
                    kind: "Lambda",
                    body: {
                        kind: "Match",
                        cases: [
                            { pattern: { kind: "LiteralPattern" } },
                            { pattern: { kind: "LiteralPattern" } },
                            { pattern: { kind: "WildcardPattern" } },
                        ],
                    },
                },
            });
        });
    });

    describe("type definitions", () => {
        it("parses type alias", () => {
            const source = "type UserId = Int";
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(1);
            expect(module.declarations[0]!).toMatchObject({
                kind: "TypeDecl",
                name: "UserId",
                params: [],
                definition: { kind: "AliasType" },
            });
        });

        it("parses record type", () => {
            const source = "type Point = { x: Int, y: Int }";
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(1);
            expect(module.declarations[0]!).toMatchObject({
                kind: "TypeDecl",
                name: "Point",
                definition: {
                    kind: "RecordTypeDef",
                    fields: [{ name: "x" }, { name: "y" }],
                },
            });
        });

        it("parses variant type with constructors", () => {
            const source = "type option<t> = Some(t) | None";
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(1);
            expect(module.declarations[0]!).toMatchObject({
                kind: "TypeDecl",
                name: "option",
                params: ["t"],
                definition: {
                    kind: "VariantTypeDef",
                    constructors: [{ name: "Some" }, { name: "None" }],
                },
            });
        });

        it("parses Result type with two type parameters", () => {
            const source = "type Result<t, e> = Ok(t) | Err(e)";
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(1);
            expect(module.declarations[0]!).toMatchObject({
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

    describe("programs with imports", () => {
        it("parses module with named imports", () => {
            const source = `import { map, filter } from "./list"
                let doubled = map(list, (x) => x * 2)`;
            const module = parseModule(source);

            expect(module.imports).toHaveLength(1);
            expect(module.imports[0]!).toMatchObject({
                kind: "ImportDecl",
                items: [{ name: "map" }, { name: "filter" }],
                from: "./list",
            });
            expect(module.declarations).toHaveLength(1);
        });

        it("parses module with namespace import", () => {
            const source = `import * as List from "./list"
                let result = List.map(data, fn)`;
            const module = parseModule(source);

            expect(module.imports).toHaveLength(1);
            expect(module.imports[0]!).toMatchObject({
                kind: "ImportDecl",
                items: [{ name: "*", alias: "List" }],
                from: "./list",
            });
        });

        it("parses module with type imports", () => {
            const source = `import { type User, getUser } from "./api"
                let currentUser = getUser()`;
            const module = parseModule(source);

            expect(module.imports).toHaveLength(1);
            expect(module.imports[0]!).toMatchObject({
                kind: "ImportDecl",
                items: [
                    { name: "User", isType: true },
                    { name: "getUser", isType: false },
                ],
            });
        });
    });

    describe("programs with external declarations", () => {
        it("parses module with external function", () => {
            const source = 'external log: (String) -> Unit = "console.log"';
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(1);
            expect(module.declarations[0]!).toMatchObject({
                kind: "ExternalDecl",
                name: "log",
                jsName: "console.log",
            });
        });

        it("parses external with from clause", () => {
            const source = 'external fetch: (String) -> Promise = "fetch" from "node-fetch"';
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(1);
            expect(module.declarations[0]!).toMatchObject({
                kind: "ExternalDecl",
                name: "fetch",
                jsName: "fetch",
                from: "node-fetch",
            });
        });
    });

    describe("programs with exports", () => {
        it("parses exported function", () => {
            const source = "export let add = (x, y) => x + y";
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(1);
            expect(module.declarations[0]!).toMatchObject({
                kind: "LetDecl",
                exported: true,
            });
        });

        it("parses exported type", () => {
            const source = "export type Point = { x: Int, y: Int }";
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(1);
            expect(module.declarations[0]!).toMatchObject({
                kind: "TypeDecl",
                exported: true,
            });
        });
    });

    describe("real-world examples", () => {
        it("parses Option type module", () => {
            const source = `
                type Option<t> = Some(t) | None

                export let map = (opt, f) => match opt {
                    | Some(x) => Some(f(x))
                    | None => None
                }

                export let getOrElse = (opt, default) => match opt {
                    | Some(x) => x
                    | None => default
                }
            `;
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(3);
            expect(module.declarations[0]).toBeDefined();
            expect(module.declarations[0]!.kind).toBe("TypeDecl");
            expect(module.declarations[1]).toBeDefined();
            expect(module.declarations[1]!.kind).toBe("LetDecl");
            expect(module.declarations[2]).toBeDefined();
            expect(module.declarations[2]!.kind).toBe("LetDecl");
        });

        it("parses List utilities module", () => {
            const source = `
                export let rec map = (list, f) => match list {
                    | [] => []
                    | [head, ...tail] => [f(head)]
                }

                export let rec filter = (list, pred) => match list {
                    | [] => []
                    | [head, ...tail] => if pred(head) then [head] else filter(tail, pred)
                }

                export let rec fold = (list, init, f) => match list {
                    | [] => init
                    | [head, ...tail] => fold(tail, f(init, head), f)
                }
            `;
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(3);
            expect(
                module.declarations.every(
                    (d) => d.kind === "LetDecl" && (d as LetDecl).exported && (d as LetDecl).recursive,
                ),
            ).toBe(true);
        });

        it("parses Counter module with mutable state", () => {
            const source = `
                let mut count = 0

                export let increment = () => count := count + 1

                export let decrement = () => count := count - 1

                export let getCount = () => count

                export let reset = () => count := 0
            `;
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(5);
            expect(module.declarations[0]!).toMatchObject({
                kind: "LetDecl",
                mutable: true,
                exported: false,
            });
            expect(module.declarations.slice(1).every((d) => d.kind === "LetDecl" && (d as LetDecl).exported)).toBe(
                true,
            );
        });

        it("parses Point module with type and functions", () => {
            const source = `
                export type Point = { x: Int, y: Int }

                export let origin = { x: 0, y: 0 }

                export let distance = (p1, p2) => (p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y)

                export let translate = (point, dx, dy) => { point | x: point.x + dx, y: point.y + dy }
            `;
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(4);
            expect(module.declarations[0]!).toMatchObject({
                kind: "TypeDecl",
                name: "Point",
                exported: true,
            });
            expect(module.declarations[1]!).toMatchObject({
                kind: "LetDecl",
                pattern: { kind: "VarPattern", name: "origin" },
                exported: true,
            });
        });

        it("parses comprehensive module with imports, types, and functions", () => {
            const source = `
                import { type Option, Some, None } from "./option"
                import * as List from "./list"

                export type User = { id: Int, name: String, email: String }

                external log: (String) -> Unit = "console.log"

                let defaultUser = { id: 0, name: "Unknown", email: "" }

                export let findUserById = (users, id) => match List.find(users, (user) => user.id == id) {
                    | Some(user) => user
                    | None => defaultUser
                }

                export let getUserEmail = (user) => user.email
            `;
            const module = parseModule(source);

            expect(module.imports).toHaveLength(2);
            expect(module.declarations).toHaveLength(5);
            expect(module.declarations[0]).toBeDefined();
            expect(module.declarations[0]!.kind).toBe("TypeDecl");
            expect(module.declarations[1]).toBeDefined();
            expect(module.declarations[1]!.kind).toBe("ExternalDecl");
            expect(module.declarations[2]).toBeDefined();
            expect(module.declarations[2]!.kind).toBe("LetDecl");
            expect(module.declarations[3]).toBeDefined();
            expect(module.declarations[3]!.kind).toBe("LetDecl");
            expect(module.declarations[4]).toBeDefined();
            expect(module.declarations[4]!.kind).toBe("LetDecl");
        });
    });

    describe("pattern matching programs", () => {
        it("parses list sum with pattern matching", () => {
            const source = `
                let rec sum = (list) => match list {
                    | [] => 0
                    | [head, ...tail] => head + sum(tail)
                }
            `;
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(1);
            expect(module.declarations[0]!).toMatchObject({
                kind: "LetDecl",
                recursive: true,
                value: {
                    kind: "Lambda",
                    body: {
                        kind: "Match",
                        cases: [
                            { pattern: { kind: "ListPattern", elements: [] } },
                            {
                                pattern: {
                                    kind: "ListPattern",
                                    elements: [{ kind: "VarPattern" }],
                                },
                            },
                        ],
                    },
                },
            });
        });

        it("parses nested pattern matching", () => {
            const source = `
                let processResult = (result) => match result {
                    | Ok(Some(value)) => value
                    | Ok(None()) => 0
                    | Err(_) => -1
                }
            `;
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(1);
            const decl = module.declarations[0]!;
            expect(decl).toBeDefined();
            expect(decl.kind).toBe("LetDecl");
            if (decl.kind === "LetDecl" && decl.value.kind === "Lambda") {
                const body = decl.value.body;
                expect(body.kind).toBe("Match");
                if (body.kind === "Match") {
                    expect(body.cases).toHaveLength(3);
                    expect(body.cases[0]).toBeDefined();
                    expect(body.cases[0]!.pattern.kind).toBe("ConstructorPattern");
                    expect(body.cases[1]).toBeDefined();
                    expect(body.cases[1]!.pattern.kind).toBe("ConstructorPattern");
                    expect(body.cases[2]).toBeDefined();
                    expect(body.cases[2]!.pattern.kind).toBe("ConstructorPattern");
                }
            }
        });

        it("parses record destructuring in let binding", () => {
            const source = `
                let { x, y } = point
                let distance = x * x + y * y
            `;
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(2);
            expect(module.declarations[0]!).toMatchObject({
                kind: "LetDecl",
                pattern: {
                    kind: "RecordPattern",
                    fields: [{ name: "x" }, { name: "y" }],
                },
            });
        });
    });

    describe("complex expressions in programs", () => {
        it("parses pipe operator chains", () => {
            const source = "let result = data |> filter((x) => x > 0) |> map((x) => x * 2) |> sum";
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(1);
            const decl = module.declarations[0]!;
            expect(decl).toBeDefined();
            expect(decl.kind).toBe("LetDecl");
            if (decl.kind === "LetDecl") {
                expect(decl.value.kind).toBe("Pipe");
            }
        });

        it("parses record construction and update", () => {
            const source = `
                let point = { x: 10, y: 20 }
                let movedPoint = { point | x: point.x + 5 }
            `;
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(2);
            expect(module.declarations[0]!).toMatchObject({
                kind: "LetDecl",
                value: { kind: "Record" },
            });
            expect(module.declarations[1]!).toMatchObject({
                kind: "LetDecl",
                value: { kind: "RecordUpdate" },
            });
        });

        it("parses list operations", () => {
            const source = `
                let numbers = [1, 2, 3, 4, 5]
                let moreNumbers = 0 :: numbers
                let firstThree = [1, 2, 3]
            `;
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(3);
            expect(module.declarations[0]!).toMatchObject({
                kind: "LetDecl",
                value: { kind: "List" },
            });
            expect(module.declarations[1]!).toMatchObject({
                kind: "LetDecl",
                value: { kind: "ListCons" },
            });
        });
    });
});
