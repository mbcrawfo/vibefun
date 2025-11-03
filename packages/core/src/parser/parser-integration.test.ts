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

                export let translate = (point, dx, dy) => { ...point, x: point.x + dx, y: point.y + dy }
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
                let movedPoint = { ...point, x: point.x + 5 }
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

    describe("new features integration (Phase 4)", () => {
        it("parses counter module with ref operations and dereference", () => {
            const source = `
                external refCreate: (Int) -> Ref = "ref" from "@vibefun/runtime"
                let counter = refCreate(0)
                export let increment = () => counter := counter! + 1
                export let decrement = () => counter := counter! - 1
                export let getValue = () => counter!
                export let reset = () => counter := 0
                export let addN = (n) => counter := counter! + n
            `;
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(7);
            // External declaration
            expect(module.declarations[0]!).toMatchObject({
                kind: "ExternalDecl",
                name: "refCreate",
            });
            // Counter initialization
            expect(module.declarations[1]!).toMatchObject({
                kind: "LetDecl",
                pattern: { kind: "VarPattern", name: "counter" },
            });
            // Increment function with RefAssign and Deref
            const increment = module.declarations[2]!;
            expect(increment.kind).toBe("LetDecl");
            if (increment.kind === "LetDecl" && increment.value.kind === "Lambda") {
                expect(increment.value.body.kind).toBe("BinOp");
                if (increment.value.body.kind === "BinOp") {
                    expect(increment.value.body.op).toBe("RefAssign");
                }
            }
        });

        it("parses list processing with spreads and transformations", () => {
            const source = `
                let items = [1, 2, 3]
                let extended = [...items, 4, 5]
                let combined = [...items, ...extended]
                let withPrefix = [0, ...items]
                let sandwich = [...items, 99, ...items]
                export let pipeline = items |> (list) => [...list, 10] |> (list) => [0, ...list]
            `;
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(6);
            // Extended list with spread
            expect(module.declarations[1]!).toMatchObject({
                kind: "LetDecl",
                pattern: { kind: "VarPattern", name: "extended" },
                value: { kind: "List" },
            });
            // Combined with multiple spreads
            expect(module.declarations[2]!).toMatchObject({
                kind: "LetDecl",
                pattern: { kind: "VarPattern", name: "combined" },
                value: { kind: "List" },
            });
            // Pipeline with spreads
            expect(module.declarations[5]!).toMatchObject({
                kind: "LetDecl",
                exported: true,
                value: { kind: "Pipe" },
            });
        });

        it("parses module system with re-exports", () => {
            const source = `
                import { type User, createUser } from "./user"
                import * as Utils from "./utils"

                export { type User, createUser } from "./user"

                export * from "./helpers"

                export { map, filter } from "./list"

                export { sum as total, avg as mean } from "./math"

                export let processUser = (user) => user
            `;
            const module = parseModule(source);

            expect(module.imports).toHaveLength(2);
            expect(module.declarations).toHaveLength(5);

            // Re-export with named items
            expect(module.declarations[0]!).toMatchObject({
                kind: "ReExportDecl",
                from: "./user",
            });

            // Re-export namespace
            expect(module.declarations[1]!).toMatchObject({
                kind: "ReExportDecl",
                items: null, // export *
                from: "./helpers",
            });

            // Re-export with multiple items
            expect(module.declarations[2]!).toMatchObject({
                kind: "ReExportDecl",
                from: "./list",
            });

            // Re-export with aliases
            expect(module.declarations[3]!).toMatchObject({
                kind: "ReExportDecl",
                from: "./math",
            });
        });

        it("parses complex pattern matching with deref and guards", () => {
            const source = `
                external refCreate: ({}) -> Ref = "ref" from "@vibefun/runtime"
                type Status = Active | Pending | Inactive
                type UserData<t> = Some(t) | None
                type UserRecord = { status: Status, data: UserData<String>, verified: Bool }
                let userRef = refCreate({ status: Active, data: Some("info"), verified: true })
                export let processUser = () => match userRef! {
                    | { status: Active, data: Some(info), verified: v } when v => info
                    | { status: Pending, data: _ } => "pending"
                    | { status: Inactive } => "inactive"
                    | _ => "unknown"
                }
            `;
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(6);

            // processUser function
            const processUser = module.declarations[5]!;
            expect(processUser.kind).toBe("LetDecl");
            if (processUser.kind === "LetDecl" && processUser.value.kind === "Lambda") {
                expect(processUser.value.body.kind).toBe("Match");
                if (processUser.value.body.kind === "Match") {
                    // Match on dereferenced value
                    expect(processUser.value.body.expr.kind).toBe("UnaryOp");
                    if (processUser.value.body.expr.kind === "UnaryOp") {
                        expect(processUser.value.body.expr.op).toBe("Deref");
                    }
                    // Has guard clause
                    expect(processUser.value.body.cases[0]!.guard).toBeDefined();
                }
            }
        });

        it("parses pipeline with spreads and composition", () => {
            const source = `
                let data = [1, 2, 3, 4, 5]
                let extras = [10, 20]
                let result = data |> (xs) => [...xs, ...extras] |> (xs) => [0, ...xs] |> (xs) => match xs { | [first, ...rest] => [...rest, first] | [] => [] } |> (xs) => xs
            `;
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(3);
            expect(module.declarations[2]!).toMatchObject({
                kind: "LetDecl",
                pattern: { kind: "VarPattern", name: "result" },
                value: { kind: "Pipe" },
            });
        });

        it("parses record operations with multiple spreads", () => {
            const source = `
                let base = { a: 1, b: 2 }
                let overrides = { b: 20, c: 30 }

                let merged = { ...base, ...overrides }

                let customized = { ...base, ...overrides, d: 40 }

                let reversed = { ...overrides, ...base }

                let nested = { ...base, inner: { ...overrides, x: 100 } }

                export let update = (record, field, value) => { ...record, field: value }
            `;
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(7);

            // Merged with two spreads
            expect(module.declarations[2]!).toMatchObject({
                kind: "LetDecl",
                value: { kind: "RecordUpdate" },
            });

            // Customized with spreads and field
            expect(module.declarations[3]!).toMatchObject({
                kind: "LetDecl",
                value: { kind: "RecordUpdate" },
            });

            // Nested record update
            expect(module.declarations[5]!).toMatchObject({
                kind: "LetDecl",
                value: { kind: "RecordUpdate" },
            });
        });

        it("parses external API with overloading", () => {
            const source = `
                external setTimeout: ((() -> Unit), Int) -> Int = "setTimeout"
                external setTimeout: ((() -> Unit)) -> Int = "setTimeout"

                external fetch: (String) -> Promise = "fetch"
                external fetch: (String, {}) -> Promise = "fetch"

                let delay1 = setTimeout(callback, 1000)
                let delay2 = setTimeout(callback)
            `;
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(6);

            // Two setTimeout overloads
            expect(module.declarations[0]!).toMatchObject({
                kind: "ExternalDecl",
                name: "setTimeout",
            });
            expect(module.declarations[1]!).toMatchObject({
                kind: "ExternalDecl",
                name: "setTimeout",
            });

            // Two fetch overloads
            expect(module.declarations[2]!).toMatchObject({
                kind: "ExternalDecl",
                name: "fetch",
            });
            expect(module.declarations[3]!).toMatchObject({
                kind: "ExternalDecl",
                name: "fetch",
            });
        });

        it("parses nested match with guards and derefs", () => {
            const source = `
                external refCreate: (Inner) -> Ref = "ref" from "@vibefun/runtime"
                type Inner = IVal(Int) | INone
                type Outer = OVal(Inner) | ONone
                let outerRef = refCreate(OVal(IVal(42)))
                export let process = () => match outerRef! {
                    | OVal(IVal(n)) when n > 0 => n
                    | OVal(IVal(n)) when n <= 0 => 0
                    | OVal(INone) => -1
                    | ONone => -2
                }
            `;
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(5);

            const process = module.declarations[4]!;
            expect(process.kind).toBe("LetDecl");
            if (process.kind === "LetDecl" && process.value.kind === "Lambda") {
                expect(process.value.body.kind).toBe("Match");
                if (process.value.body.kind === "Match") {
                    expect(process.value.body.cases).toHaveLength(4);
                    // First two cases have guards
                    expect(process.value.body.cases[0]!.guard).toBeDefined();
                    expect(process.value.body.cases[1]!.guard).toBeDefined();
                }
            }
        });

        it("parses higher-order functions with complex types", () => {
            const source = `
                type Func<a, b> = (a) -> b
                export let compose = (f, g) => (x) => f(g(x))
                export let pipe = (f, g) => (x) => g(f(x))
                export let curry = (f) => (x) => (y) => f(x, y)
            `;
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(4);
            // Type declaration
            expect(module.declarations[0]!.kind).toBe("TypeDecl");
            // Exported functions
            expect(module.declarations.slice(1).every((d) => d.kind === "LetDecl" && (d as LetDecl).exported)).toBe(
                true,
            );
        });

        it("parses mixed module with imports, exports, and re-exports", () => {
            const source = `
                import { type Option, Some, None } from "./option"
                import { type Result } from "./result"
                import * as List from "./list"

                export { type Option, Some, None } from "./option"
                export * from "./utils"

                export type User = { id: Int, name: String }

                external log: (String) -> Unit = "console.log"

                let defaultUser = { id: 0, name: "Unknown" }

                export let findUser = (users, id) => List.find(users, (u) => u.id == id)
            `;
            const module = parseModule(source);

            expect(module.imports).toHaveLength(3);
            expect(module.declarations).toHaveLength(6);

            // Re-exports
            expect(module.declarations[0]!.kind).toBe("ReExportDecl");
            expect(module.declarations[1]!.kind).toBe("ReExportDecl");

            // Type declaration
            expect(module.declarations[2]!).toMatchObject({
                kind: "TypeDecl",
                exported: true,
            });

            // External
            expect(module.declarations[3]!.kind).toBe("ExternalDecl");
        });

        it("parses data transformation pipeline with spreads", () => {
            const source = `
                let input = [1, 2, 3, 4, 5]
                let transformed = input |> (xs) => [...xs, 6, 7] |> (xs) => [0, ...xs] |> (xs) => match xs { | [first, ...rest] => rest | [] => [] } |> (xs) => [...xs, ...xs]
            `;
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(2);
            expect(module.declarations[1]!).toMatchObject({
                kind: "LetDecl",
                value: { kind: "Pipe" },
            });
        });

        it("parses state management pattern with refs", () => {
            const source = `
                external refCreate: (State) -> Ref = "ref" from "@vibefun/runtime"
                type State = { count: Int, items: List<String> }
                let initialState = { count: 0, items: [] }
                let stateRef = refCreate(initialState)
                export let getState = () => stateRef!
                export let updateCount = (n) => stateRef := { ...stateRef!, count: n }
                export let addItem = (item) => stateRef := { ...stateRef!, items: [item, ...stateRef!.items] }
                export let reset = () => stateRef := initialState
            `;
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(8);

            // updateCount with deref and spread
            const updateCount = module.declarations[5]!;
            expect(updateCount.kind).toBe("LetDecl");
            if (updateCount.kind === "LetDecl" && updateCount.value.kind === "Lambda") {
                expect(updateCount.value.body.kind).toBe("BinOp");
                if (updateCount.value.body.kind === "BinOp") {
                    expect(updateCount.value.body.op).toBe("RefAssign");
                    expect(updateCount.value.body.right.kind).toBe("RecordUpdate");
                }
            }
        });

        it("parses recursive data structure operations", () => {
            const source = `
                type Tree<t> = Leaf(t) | Node(Tree<t>, Tree<t>)

                let rec map = (tree, f) => match tree {
                    | Leaf(value) => Leaf(f(value))
                    | Node(left, right) => Node(map(left, f), map(right, f))
                }

                let rec fold = (tree, init, f) => match tree {
                    | Leaf(value) => f(init, value)
                    | Node(left, right) => fold(right, fold(left, init, f), f)
                }
            `;
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(3);
            expect(module.declarations[1]!).toMatchObject({
                kind: "LetDecl",
                recursive: true,
                pattern: { kind: "VarPattern", name: "map" },
            });
            expect(module.declarations[2]!).toMatchObject({
                kind: "LetDecl",
                recursive: true,
                pattern: { kind: "VarPattern", name: "fold" },
            });
        });

        it("parses complex type expressions with generics", () => {
            const source = `
                type Either<a, b> = Left(a) | Right(b)
                type Pair<a, b> = (a, b)
                type Func<a, b> = (a) -> b
                export let bimap = (either, f, g) => match either { | Left(a) => Left(f(a)) | Right(b) => Right(g(b)) }
                export let isLeft = (either) => match either { | Left(_) => true | Right(_) => false }
            `;
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(5);
            // Complex type declarations
            expect(module.declarations.slice(0, 3).every((d) => d.kind === "TypeDecl")).toBe(true);
            // Exported functions
            expect(module.declarations.slice(3).every((d) => d.kind === "LetDecl" && (d as LetDecl).exported)).toBe(
                true,
            );
        });

        it("parses API wrapper pattern with externals and re-exports", () => {
            const source = `
                external fetch: (String) -> Promise = "fetch"
                external fetch: (String, {}) -> Promise = "fetch"

                export { type Response } from "./types"

                export let get = (url) => fetch(url)

                export let post = (url, data) => fetch(url, { method: "POST", body: data })

                let handleError = (err) => err

                export let safeGet = (url) => match get(url) {
                    | Ok(response) => response
                    | Err(error) => handleError(error)
                }
            `;
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(7);

            // External overloads
            expect(module.declarations[0]!.kind).toBe("ExternalDecl");
            expect(module.declarations[1]!.kind).toBe("ExternalDecl");

            // Re-export
            expect(module.declarations[2]!).toMatchObject({
                kind: "ReExportDecl",
                from: "./types",
            });
        });

        it("parses complex guard conditions in pattern matching", () => {
            const source = `
                type Point = { x: Int, y: Int }

                let quadrant = (point) => match point {
                    | { x, y } when x > 0 && y > 0 => "Q1"
                    | { x, y } when x < 0 && y > 0 => "Q2"
                    | { x, y } when x < 0 && y < 0 => "Q3"
                    | { x, y } when x > 0 && y < 0 => "Q4"
                    | { x: 0, y } when y != 0 => "Y-axis"
                    | { x, y: 0 } when x != 0 => "X-axis"
                    | _ => "Origin"
                }
            `;
            const module = parseModule(source);

            expect(module.declarations).toHaveLength(2);

            const quadrant = module.declarations[1]!;
            expect(quadrant.kind).toBe("LetDecl");
            if (quadrant.kind === "LetDecl" && quadrant.value.kind === "Lambda") {
                expect(quadrant.value.body.kind).toBe("Match");
                if (quadrant.value.body.kind === "Match") {
                    expect(quadrant.value.body.cases).toHaveLength(7);
                    // First 6 cases have guards
                    expect(quadrant.value.body.cases.slice(0, 6).every((c) => c.guard !== undefined)).toBe(true);
                }
            }
        });

        it("parses module with all feature types combined", () => {
            const source = `
                import { type Option, Some, None } from "./option"
                import * as List from "./list"
                export { type Option } from "./option"
                export * from "./utils"
                external refCreate: (State) -> Ref = "ref" from "@vibefun/runtime"
                external log: (String) -> Unit = "console.log"
                type State = { items: List<Int>, total: Int }
                let initialState = { items: [], total: 0 }
                let stateRef = refCreate(initialState)
                export let addItem = (item) => stateRef := { ...stateRef!, items: [item, ...stateRef!.items] }
                export let getItems = () => stateRef!.items
                export let processItems = () => stateRef!.items |> (xs) => [0, ...xs] |> (xs) => match xs { | [first, ...rest] when first == 0 => rest | xs => xs }
            `;
            const module = parseModule(source);

            expect(module.imports).toHaveLength(2);
            expect(module.declarations.length).toBeGreaterThan(6);
            // Re-exports
            expect(module.declarations[0]!.kind).toBe("ReExportDecl");
            expect(module.declarations[1]!.kind).toBe("ReExportDecl");
            // Externals
            expect(module.declarations[2]!.kind).toBe("ExternalDecl");
            expect(module.declarations[3]!.kind).toBe("ExternalDecl");
            // Type
            expect(module.declarations[4]!).toMatchObject({
                kind: "TypeDecl",
                name: "State",
            });
            // Has exported functions with spread/deref operations
            const exportedFuncs = module.declarations.filter((d) => d.kind === "LetDecl" && (d as LetDecl).exported);
            expect(exportedFuncs.length).toBeGreaterThan(0);
        });
    });
});
