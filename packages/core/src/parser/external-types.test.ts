/**
 * External Type Declarations Tests
 *
 * Tests for type declarations within external blocks as specified in:
 * docs/spec/10-javascript-interop/external-declarations.md:399-443
 *
 * External blocks can contain type declarations that define the shape of
 * JavaScript objects, allowing Vibefun code to type-check interactions
 * with external JavaScript APIs.
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

describe("Parser - External Type Declarations", () => {
    describe("basic type declarations in external blocks", () => {
        it("should parse simple record type in external block", () => {
            const decl = parseDecl(`external {
                type Response = { ok: Bool, status: Int };
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.items).toHaveLength(1);
            const item = decl.items[0];
            expect(item?.kind).toBe("ExternalType");
            if (item?.kind !== "ExternalType") return;

            expect(item.name).toBe("Response");
            expect(item.typeExpr.kind).toBe("RecordType");
            if (item.typeExpr.kind !== "RecordType") return;

            expect(item.typeExpr.fields).toHaveLength(2);
            expect(item.typeExpr.fields[0]?.name).toBe("ok");
            expect(item.typeExpr.fields[1]?.name).toBe("status");
        });

        it("should parse type with function fields", () => {
            const decl = parseDecl(`external {
                type Response = { json: (Unit) -> Promise };
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            const item = decl.items[0];
            expect(item?.kind).toBe("ExternalType");
            if (item?.kind !== "ExternalType") return;

            expect(item.typeExpr.kind).toBe("RecordType");
            if (item.typeExpr.kind !== "RecordType") return;

            const field = item.typeExpr.fields[0];
            expect(field?.typeExpr.kind).toBe("FunctionType");
        });

        it("should parse multiple type declarations in one block", () => {
            const decl = parseDecl(`external {
                type Response = { ok: Bool };
                type Request = { method: String };
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.items).toHaveLength(2);
            expect(decl.items[0]?.kind).toBe("ExternalType");
            expect(decl.items[1]?.kind).toBe("ExternalType");

            if (decl.items[0]?.kind === "ExternalType") {
                expect(decl.items[0].name).toBe("Response");
            }
            if (decl.items[1]?.kind === "ExternalType") {
                expect(decl.items[1].name).toBe("Request");
            }
        });
    });

    describe("type aliases for existing types", () => {
        it("should parse type alias for primitive type", () => {
            const decl = parseDecl(`external {
                type UserId = Int;
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            const item = decl.items[0];
            expect(item?.kind).toBe("ExternalType");
            if (item?.kind !== "ExternalType") return;

            expect(item.name).toBe("UserId");
            expect(item.typeExpr.kind).toBe("TypeConst");
        });

        it("should parse type alias for generic type", () => {
            const decl = parseDecl(`external {
                type UserList = List<User>;
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            const item = decl.items[0];
            expect(item?.kind).toBe("ExternalType");
            if (item?.kind !== "ExternalType") return;

            expect(item.name).toBe("UserList");
            expect(item.typeExpr.kind).toBe("TypeApp");
        });

        it("should parse type alias for function type", () => {
            const decl = parseDecl(`external {
                type Callback = (Int) -> Unit;
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            const item = decl.items[0];
            expect(item?.kind).toBe("ExternalType");
            if (item?.kind !== "ExternalType") return;

            expect(item.name).toBe("Callback");
            expect(item.typeExpr.kind).toBe("FunctionType");
        });
    });

    describe("mixed type and value declarations", () => {
        it("should parse type followed by function using that type", () => {
            const decl = parseDecl(`external {
                type Response = { ok: Bool, status: Int };
                fetch: (String) -> Promise<Response> = "fetch";
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.items).toHaveLength(2);
            expect(decl.items[0]?.kind).toBe("ExternalType");
            expect(decl.items[1]?.kind).toBe("ExternalValue");

            // Verify the function uses the type
            if (decl.items[1]?.kind === "ExternalValue") {
                expect(decl.items[1].typeExpr.kind).toBe("FunctionType");
            }
        });

        it("should parse multiple types and multiple values", () => {
            const decl = parseDecl(`external {
                type Response = { ok: Bool };
                type Request = { method: String };
                fetch: (Request) -> Promise<Response> = "fetch";
                get: (String) -> Promise<Response> = "get";
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.items).toHaveLength(4);
            expect(decl.items[0]?.kind).toBe("ExternalType");
            expect(decl.items[1]?.kind).toBe("ExternalType");
            expect(decl.items[2]?.kind).toBe("ExternalValue");
            expect(decl.items[3]?.kind).toBe("ExternalValue");
        });

        it("should parse interleaved types and values", () => {
            const decl = parseDecl(`external {
                type Headers = { append: (String, String) -> Unit };
                newHeaders: (Unit) -> Headers = "Headers";
                type Response = { headers: Headers };
                fetch: (String) -> Promise<Response> = "fetch";
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.items).toHaveLength(4);
            expect(decl.items[0]?.kind).toBe("ExternalType");
            expect(decl.items[1]?.kind).toBe("ExternalValue");
            expect(decl.items[2]?.kind).toBe("ExternalType");
            expect(decl.items[3]?.kind).toBe("ExternalValue");
        });
    });

    describe("external blocks with from clause", () => {
        it("should parse type in external block with from clause", () => {
            const decl = parseDecl(`external from "node-fetch" {
                type Response = { ok: Bool, status: Int };
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.from).toBe("node-fetch");
            expect(decl.items).toHaveLength(1);
            expect(decl.items[0]?.kind).toBe("ExternalType");
        });

        it("should parse multiple types with from clause", () => {
            const decl = parseDecl(`external from "node-fetch" {
                type Response = { ok: Bool, status: Int };
                type Headers = { append: (String, String) -> Unit };
                fetch: (String) -> Promise<Response> = "fetch";
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.from).toBe("node-fetch");
            expect(decl.items).toHaveLength(3);
            expect(decl.items[0]?.kind).toBe("ExternalType");
            expect(decl.items[1]?.kind).toBe("ExternalType");
            expect(decl.items[2]?.kind).toBe("ExternalValue");
        });

        it("should parse type with complex module path", () => {
            const decl = parseDecl(`external from "./utils/fetch.js" {
                type FetchOptions = { headers: JsObject };
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.from).toBe("./utils/fetch.js");
            expect(decl.items).toHaveLength(1);
        });
    });

    describe("exported external types", () => {
        it("should parse exported external block with types", () => {
            const decl = parseDecl(`export external {
                type Response = { ok: Bool };
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.exported).toBe(true);
            expect(decl.items).toHaveLength(1);
            expect(decl.items[0]?.kind).toBe("ExternalType");
        });

        it("should parse exported external block with from clause and types", () => {
            const decl = parseDecl(`export external from "api" {
                type User = { id: Int, name: String };
                type Post = { title: String, author: User };
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.exported).toBe(true);
            expect(decl.from).toBe("api");
            expect(decl.items).toHaveLength(2);
        });
    });

    describe("complex type expressions", () => {
        it("should parse type with nested record on single line", () => {
            const decl = parseDecl(`external {
                type Config = { server: { host: String, port: Int } };
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            const item = decl.items[0];
            expect(item?.kind).toBe("ExternalType");
            if (item?.kind !== "ExternalType") return;

            expect(item.typeExpr.kind).toBe("RecordType");
            if (item.typeExpr.kind !== "RecordType") return;

            expect(item.typeExpr.fields).toHaveLength(1);
            expect(item.typeExpr.fields[0]?.typeExpr.kind).toBe("RecordType");
        });

        it("should parse type with function returning function", () => {
            const decl = parseDecl(`external {
                type Curried = { curry: (Int) -> (Int) -> Int };
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            const item = decl.items[0];
            expect(item?.kind).toBe("ExternalType");
            if (item?.kind !== "ExternalType") return;

            expect(item.typeExpr.kind).toBe("RecordType");
        });

        it("should parse type with optional fields using Option", () => {
            const decl = parseDecl(`external {
                type UserProfile = { name: String, email: Option<String>, age: Option<Int> };
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            const item = decl.items[0];
            expect(item?.kind).toBe("ExternalType");
            if (item?.kind !== "ExternalType") return;

            expect(item.typeExpr.kind).toBe("RecordType");
            if (item.typeExpr.kind !== "RecordType") return;

            expect(item.typeExpr.fields).toHaveLength(3);
        });
    });

    describe("edge cases", () => {
        it("should parse empty record type", () => {
            const decl = parseDecl(`external {
                type Empty = {};
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            const item = decl.items[0];
            expect(item?.kind).toBe("ExternalType");
            if (item?.kind !== "ExternalType") return;

            expect(item.typeExpr.kind).toBe("RecordType");
            if (item.typeExpr.kind !== "RecordType") return;

            expect(item.typeExpr.fields).toHaveLength(0);
        });

        it("should parse type with trailing comma in record", () => {
            const decl = parseDecl(`external {
                type User = { name: String, age: Int, };
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            const item = decl.items[0];
            expect(item?.kind).toBe("ExternalType");
            if (item?.kind !== "ExternalType") return;

            expect(item.typeExpr.kind).toBe("RecordType");
            if (item.typeExpr.kind !== "RecordType") return;

            expect(item.typeExpr.fields).toHaveLength(2);
        });

        it("should parse type referencing other external types", () => {
            const decl = parseDecl(`external {
                type Address = { street: String, city: String };
                type Person = { name: String, address: Address };
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.items).toHaveLength(2);
            expect(decl.items[0]?.kind).toBe("ExternalType");
            expect(decl.items[1]?.kind).toBe("ExternalType");

            // Second type should reference first
            if (decl.items[1]?.kind === "ExternalType") {
                expect(decl.items[1].typeExpr.kind).toBe("RecordType");
            }
        });
    });

    describe("realistic examples from spec", () => {
        it("should parse fetch API types example", () => {
            const decl = parseDecl(`external {
                type Response = { ok: Bool, status: Int, json: (Unit) -> Promise<Json> };
                type RequestInit = { method: String, headers: JsObject };
                fetch: (String, RequestInit) -> Promise<Response> = "fetch";
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.items).toHaveLength(3);
            expect(decl.items[0]?.kind).toBe("ExternalType");
            expect(decl.items[1]?.kind).toBe("ExternalType");
            expect(decl.items[2]?.kind).toBe("ExternalValue");
        });

        it("should parse node-fetch example with types and values", () => {
            const decl = parseDecl(`external from "node-fetch" {
                type Response = { ok: Bool, status: Int };
                type Headers = { append: (String, String) -> Unit };
                fetch: (String) -> Promise<Response> = "fetch";
                Headers: Type = "Headers";
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.from).toBe("node-fetch");
            expect(decl.items).toHaveLength(4);
            expect(decl.items[0]?.kind).toBe("ExternalType");
            expect(decl.items[1]?.kind).toBe("ExternalType");
            expect(decl.items[2]?.kind).toBe("ExternalValue");
            expect(decl.items[3]?.kind).toBe("ExternalValue");
        });

        it("should parse complex API types with multiple fields", () => {
            const decl = parseDecl(`external {
                type ApiResponse = { data: JsObject, status: Int, headers: JsObject };
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            const item = decl.items[0];
            expect(item?.kind).toBe("ExternalType");
            if (item?.kind !== "ExternalType") return;

            expect(item.name).toBe("ApiResponse");
            expect(item.typeExpr.kind).toBe("RecordType");
            if (item.typeExpr.kind !== "RecordType") return;

            expect(item.typeExpr.fields).toHaveLength(3);
        });
    });

    describe("generic external type declarations", () => {
        it("should parse external type with single type parameter", () => {
            const decl = parseDecl(`external {
                type Box<T> = { value: T };
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.items).toHaveLength(1);
            const item = decl.items[0];
            expect(item?.kind).toBe("ExternalType");
            if (item?.kind !== "ExternalType") return;

            expect(item.name).toBe("Box");
            expect(item.typeParams).toEqual(["T"]);
            expect(item.typeExpr.kind).toBe("RecordType");
        });

        it("should parse external type with multiple type parameters", () => {
            const decl = parseDecl(`external {
                type Either<L, R> = { left: L, right: R };
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            const item = decl.items[0];
            expect(item?.kind).toBe("ExternalType");
            if (item?.kind !== "ExternalType") return;

            expect(item.name).toBe("Either");
            expect(item.typeParams).toEqual(["L", "R"]);
            expect(item.typeExpr.kind).toBe("RecordType");
        });

        it("should parse generic type with function fields using type parameter", () => {
            const decl = parseDecl(`external {
                type Container<T> = { value: T, transform: (T) -> T };
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            const item = decl.items[0];
            expect(item?.kind).toBe("ExternalType");
            if (item?.kind !== "ExternalType") return;

            expect(item.name).toBe("Container");
            expect(item.typeParams).toEqual(["T"]);
            expect(item.typeExpr.kind).toBe("RecordType");

            // Verify the record has value and transform fields
            if (item.typeExpr.kind !== "RecordType") return;
            expect(item.typeExpr.fields).toHaveLength(2);
            expect(item.typeExpr.fields[0]?.name).toBe("value");
            expect(item.typeExpr.fields[1]?.name).toBe("transform");
        });

        it("should parse external type with three type parameters", () => {
            const decl = parseDecl(`external {
                type Triple<A, B, C> = { first: A, second: B, third: C };
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            const item = decl.items[0];
            expect(item?.kind).toBe("ExternalType");
            if (item?.kind !== "ExternalType") return;

            expect(item.name).toBe("Triple");
            expect(item.typeParams).toEqual(["A", "B", "C"]);
        });

        it("should parse non-generic external type without typeParams field", () => {
            const decl = parseDecl(`external {
                type Response = { ok: Bool };
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            const item = decl.items[0];
            expect(item?.kind).toBe("ExternalType");
            if (item?.kind !== "ExternalType") return;

            expect(item.name).toBe("Response");
            // Verify that typeParams is undefined for non-generic types
            expect(item.typeParams).toBeUndefined();
        });

        it("should parse mixed generic and non-generic types in same block", () => {
            const decl = parseDecl(`external {
                type Box<T> = { value: T };
                type Response = { ok: Bool };
                type Pair<A, B> = { fst: A, snd: B };
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.items).toHaveLength(3);

            // First is generic with one param
            const item0 = decl.items[0];
            expect(item0?.kind).toBe("ExternalType");
            if (item0?.kind === "ExternalType") {
                expect(item0.name).toBe("Box");
                expect(item0.typeParams).toEqual(["T"]);
            }

            // Second is not generic
            const item1 = decl.items[1];
            expect(item1?.kind).toBe("ExternalType");
            if (item1?.kind === "ExternalType") {
                expect(item1.name).toBe("Response");
                // Verify that typeParams is undefined for non-generic types
                expect(item1.typeParams).toBeUndefined();
            }

            // Third is generic with two params
            const item2 = decl.items[2];
            expect(item2?.kind).toBe("ExternalType");
            if (item2?.kind === "ExternalType") {
                expect(item2.name).toBe("Pair");
                expect(item2.typeParams).toEqual(["A", "B"]);
            }
        });

        it("should parse generic types mixed with generic values in same block", () => {
            const decl = parseDecl(`external {
                type Box<T> = { value: T };
                map: <A, B>(Array<A>, (A) -> B) -> Array<B> = "map";
                type Option<T> = { value: T, hasValue: Bool };
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.items).toHaveLength(3);

            // First is generic type
            expect(decl.items[0]?.kind).toBe("ExternalType");
            if (decl.items[0]?.kind === "ExternalType") {
                expect(decl.items[0].name).toBe("Box");
                expect(decl.items[0].typeParams).toEqual(["T"]);
            }

            // Second is generic value
            expect(decl.items[1]?.kind).toBe("ExternalValue");
            if (decl.items[1]?.kind === "ExternalValue") {
                expect(decl.items[1].name).toBe("map");
                expect(decl.items[1].typeParams).toEqual(["A", "B"]);
            }

            // Third is generic type
            expect(decl.items[2]?.kind).toBe("ExternalType");
            if (decl.items[2]?.kind === "ExternalType") {
                expect(decl.items[2].name).toBe("Option");
                expect(decl.items[2].typeParams).toEqual(["T"]);
            }
        });

        it("should parse generic external type with from clause", () => {
            const decl = parseDecl(`external from "typescript" {
                type Promise<T> = { then_: (T) -> Unit };
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.from).toBe("typescript");

            const item = decl.items[0];
            expect(item?.kind).toBe("ExternalType");
            if (item?.kind !== "ExternalType") return;

            expect(item.name).toBe("Promise");
            expect(item.typeParams).toEqual(["T"]);
        });

        it("should parse exported generic external type", () => {
            const decl = parseDecl(`export external {
                type Box<T> = { value: T };
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.exported).toBe(true);

            const item = decl.items[0];
            expect(item?.kind).toBe("ExternalType");
            if (item?.kind !== "ExternalType") return;

            expect(item.name).toBe("Box");
            expect(item.typeParams).toEqual(["T"]);
        });

        it("should parse generic type with complex type expression", () => {
            const decl = parseDecl(`external {
                type Map<K, V> = { get: (K) -> Option<V>, set: (K, V) -> Unit };
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            const item = decl.items[0];
            expect(item?.kind).toBe("ExternalType");
            if (item?.kind !== "ExternalType") return;

            expect(item.name).toBe("Map");
            expect(item.typeParams).toEqual(["K", "V"]);
            expect(item.typeExpr.kind).toBe("RecordType");
        });
    });
});
