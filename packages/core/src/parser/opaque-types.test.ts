/**
 * Opaque Type Constructors Tests
 *
 * Tests for opaque JavaScript type declarations as specified in:
 * docs/spec/10-javascript-interop/external-declarations.md:360-397
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

describe("Parser - Opaque Type Constructors", () => {
    describe("basic opaque types", () => {
        it("should parse opaque type in external block", () => {
            const decl = parseDecl(`external from "node-fetch" {
                Headers: Type = "Headers";
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.items).toHaveLength(1);
            expect(decl.items[0]!).toMatchObject({
                kind: "ExternalValue",
                name: "Headers",
                jsName: "Headers",
                typeExpr: {
                    kind: "TypeConst",
                    name: "Type",
                },
            });
        });

        it("should parse multiple opaque types", () => {
            const decl = parseDecl(`external from "node-fetch" {
                Headers: Type = "Headers";
                Request: Type = "Request";
                Response: Type = "Response";
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.items).toHaveLength(3);

            expect(decl.items[0]!).toMatchObject({
                kind: "ExternalValue",
                name: "Headers",
                typeExpr: { kind: "TypeConst", name: "Type" },
            });

            expect(decl.items[1]!).toMatchObject({
                kind: "ExternalValue",
                name: "Request",
                typeExpr: { kind: "TypeConst", name: "Type" },
            });

            expect(decl.items[2]!).toMatchObject({
                kind: "ExternalValue",
                name: "Response",
                typeExpr: { kind: "TypeConst", name: "Type" },
            });
        });
    });

    describe("opaque types with regular externals", () => {
        it("should parse opaque type mixed with function externals", () => {
            const decl = parseDecl(`external from "node-fetch" {
                Headers: Type = "Headers";
                newHeaders: (Unit) -> Headers = "Headers";
                append: (Headers, String, String) -> Unit = "append";
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.items).toHaveLength(3);

            // First is opaque type
            expect(decl.items[0]!).toMatchObject({
                kind: "ExternalValue",
                name: "Headers",
                typeExpr: { kind: "TypeConst", name: "Type" },
            });

            // Second is constructor wrapper
            expect(decl.items[1]!).toMatchObject({
                kind: "ExternalValue",
                name: "newHeaders",
                typeExpr: { kind: "FunctionType" },
            });

            // Third is method
            expect(decl.items[2]!).toMatchObject({
                kind: "ExternalValue",
                name: "append",
                typeExpr: { kind: "FunctionType" },
            });
        });

        it("should parse opaque types with regular type declarations", () => {
            const decl = parseDecl(`external {
                type Config = { url: String, timeout: Int };
                Client: Type = "Client";
                createClient: (Config) -> Client = "createClient";
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.items).toHaveLength(3);

            // First is regular type declaration
            expect(decl.items[0]!.kind).toBe("ExternalType");

            // Second is opaque type
            expect(decl.items[1]!).toMatchObject({
                kind: "ExternalValue",
                name: "Client",
                typeExpr: { kind: "TypeConst", name: "Type" },
            });

            // Third is function
            expect(decl.items[2]!).toMatchObject({
                kind: "ExternalValue",
                name: "createClient",
            });
        });
    });

    describe("standalone opaque type declarations", () => {
        it("should parse standalone external with Type", () => {
            const decl = parseDecl('external Promise: Type = "Promise";');

            expect(decl).toMatchObject({
                kind: "ExternalDecl",
                name: "Promise",
                typeExpr: {
                    kind: "TypeConst",
                    name: "Type",
                },
                jsName: "Promise",
            });
        });

        it("should parse standalone external with Type and from clause", () => {
            const decl = parseDecl('external WebSocket: Type = "WebSocket" from "ws";');

            expect(decl).toMatchObject({
                kind: "ExternalDecl",
                name: "WebSocket",
                typeExpr: {
                    kind: "TypeConst",
                    name: "Type",
                },
                jsName: "WebSocket",
                from: "ws",
            });
        });

        it("should parse exported standalone opaque type", () => {
            const decl = parseDecl('export external Buffer: Type = "Buffer";');

            expect(decl).toMatchObject({
                kind: "ExternalDecl",
                name: "Buffer",
                typeExpr: {
                    kind: "TypeConst",
                    name: "Type",
                },
                exported: true,
            });
        });
    });

    describe("spec examples", () => {
        it("should parse spec example: node-fetch types", () => {
            const decl = parseDecl(`external from "node-fetch" {
                Headers: Type = "Headers";
                Request: Type = "Request";
                Response: Type = "Response";
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.from).toBe("node-fetch");
            expect(decl.items).toHaveLength(3);
            expect(decl.items.every((item) => item.kind === "ExternalValue")).toBe(true);
        });

        it("should parse spec example: Headers with constructor and methods", () => {
            const decl = parseDecl(`external from "node-fetch" {
                Headers: Type = "Headers";
                newHeaders: (Unit) -> Headers = "Headers";
                append: (Headers, String, String) -> Unit = "append";
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.items).toHaveLength(3);

            // Opaque type
            expect(decl.items[0]!).toMatchObject({
                name: "Headers",
                typeExpr: { kind: "TypeConst", name: "Type" },
            });

            // Constructor
            if (decl.items[1]!.kind === "ExternalValue") {
                expect(decl.items[1]!.typeExpr.kind).toBe("FunctionType");
            }

            // Method
            if (decl.items[2]!.kind === "ExternalValue") {
                expect(decl.items[2]!.typeExpr.kind).toBe("FunctionType");
            }
        });
    });

    describe("edge cases", () => {
        it("should handle Type as regular identifier in regular contexts", () => {
            // Type is not a keyword, so it can be used as a type constructor elsewhere
            const decl = parseDecl("type MyType = Type;");

            expect(decl).toMatchObject({
                kind: "TypeDecl",
                name: "MyType",
                definition: {
                    kind: "AliasType",
                    typeExpr: {
                        kind: "TypeConst",
                        name: "Type",
                    },
                },
            });
        });

        it("should parse opaque type with generic constructors", () => {
            const decl = parseDecl(`external {
                Promise: Type = "Promise";
                resolve: <T>(T) -> Promise = "Promise.resolve";
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.items).toHaveLength(2);

            // Opaque type
            expect(decl.items[0]!).toMatchObject({
                name: "Promise",
                typeExpr: { kind: "TypeConst", name: "Type" },
            });

            // Generic constructor
            expect(decl.items[1]!).toMatchObject({
                kind: "ExternalValue",
                name: "resolve",
                typeParams: ["T"],
            });
        });

        it("should parse empty external block", () => {
            const decl = parseDecl("external {};");

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.items).toHaveLength(0);
        });

        it("should parse external block with only opaque types", () => {
            const decl = parseDecl(`external from "ws" {
                WebSocket: Type = "WebSocket";
                Server: Type = "Server";
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.items).toHaveLength(2);
            expect(decl.items.every((item) => {
                return item.kind === "ExternalValue" &&
                       item.typeExpr.kind === "TypeConst" &&
                       item.typeExpr.name === "Type";
            })).toBe(true);
        });
    });

    describe("real-world use cases", () => {
        it("should parse DOM types", () => {
            const decl = parseDecl(`external {
                Document: Type = "Document";
                HTMLElement: Type = "HTMLElement";
                querySelector: (Document, String) -> HTMLElement = "Document.prototype.querySelector";
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.items).toHaveLength(3);
        });

        it("should parse Node.js stream types", () => {
            const decl = parseDecl(`external from "stream" {
                Readable: Type = "Readable";
                Writable: Type = "Writable";
                pipe: (Readable, Writable) -> Writable = "Readable.prototype.pipe";
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.items).toHaveLength(3);
            expect(decl.from).toBe("stream");
        });

        it("should parse database client types", () => {
            const decl = parseDecl(`external from "pg" {
                Client: Type = "Client";
                Result: Type = "Result";
                connect: (Client) -> Promise = "Client.prototype.connect";
                query: (Client, String) -> Promise = "Client.prototype.query";
            };`);

            expect(decl.kind).toBe("ExternalBlock");
            if (decl.kind !== "ExternalBlock") return;

            expect(decl.items).toHaveLength(4);
        });
    });
});
