/**
 * Tests for external function overloading syntax
 */

import type { Module } from "../types/index.js";

import { describe, expect, it } from "vitest";

import { Lexer } from "../lexer/index.js";
import { Parser } from "./parser.js";

function parseModule(source: string): Module {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    return parser.parse();
}

describe("Parser - External Overloading", () => {
    describe("multiple external declarations with same name", () => {
        it("parses multiple external declarations for same function name", () => {
            const source = `
                external fetch: (String) -> Promise<Response> = "fetch"
                external fetch: (String, RequestInit) -> Promise<Response> = "fetch"
            `;

            const module = parseModule(source);
            expect(module.declarations).toHaveLength(2);

            const [decl1, decl2] = module.declarations;
            expect(decl1).toBeDefined();
            expect(decl2).toBeDefined();
            expect(decl1?.kind).toBe("ExternalDecl");
            expect(decl2?.kind).toBe("ExternalDecl");

            if (decl1?.kind === "ExternalDecl" && decl2?.kind === "ExternalDecl") {
                expect(decl1.name).toBe("fetch");
                expect(decl2.name).toBe("fetch");
                expect(decl1.jsName).toBe("fetch");
                expect(decl2.jsName).toBe("fetch");
            }
        });

        it("parses external overloads in external block", () => {
            const source = `
                external {
                    fetch: (String) -> Promise<Response> = "fetch"
                    fetch: (String, RequestInit) -> Promise<Response> = "fetch"
                }
            `;

            const module = parseModule(source);
            expect(module.declarations).toHaveLength(1);

            const decl = module.declarations[0];
            expect(decl).toBeDefined();
            expect(decl?.kind).toBe("ExternalBlock");

            if (decl?.kind === "ExternalBlock") {
                expect(decl.items).toHaveLength(2);
                const [item1, item2] = decl.items;

                expect(item1).toBeDefined();
                expect(item2).toBeDefined();
                expect(item1?.kind).toBe("ExternalValue");
                expect(item2?.kind).toBe("ExternalValue");

                if (item1?.kind === "ExternalValue" && item2?.kind === "ExternalValue") {
                    expect(item1.name).toBe("fetch");
                    expect(item2.name).toBe("fetch");
                    expect(item1.jsName).toBe("fetch");
                    expect(item2.jsName).toBe("fetch");
                }
            }
        });

        it("parses external overloads with from clause", () => {
            const source = `
                external from "node:timers" {
                    setTimeout: ((Unit) -> Unit, Int) -> TimeoutId = "setTimeout"
                    setTimeout: ((Unit) -> Unit, Int, Any) -> TimeoutId = "setTimeout"
                }
            `;

            const module = parseModule(source);
            expect(module.declarations).toHaveLength(1);

            const decl = module.declarations[0];
            expect(decl).toBeDefined();
            expect(decl?.kind).toBe("ExternalBlock");

            if (decl?.kind === "ExternalBlock") {
                expect(decl.from).toBe("node:timers");
                expect(decl.items).toHaveLength(2);

                const [item1, item2] = decl.items;
                if (item1?.kind === "ExternalValue" && item2?.kind === "ExternalValue") {
                    expect(item1.name).toBe("setTimeout");
                    expect(item2.name).toBe("setTimeout");
                }
            }
        });

        it("parses mixed normal and overloaded externals", () => {
            const source = `
                external console_log: (String) -> Unit = "console.log"
                external fetch: (String) -> Promise<Response> = "fetch"
                external fetch: (String, RequestInit) -> Promise<Response> = "fetch"
                external process_env: JsObject = "process.env"
            `;

            const module = parseModule(source);
            expect(module.declarations).toHaveLength(4);

            const names = module.declarations.map((d) => (d.kind === "ExternalDecl" ? d.name : null));
            expect(names).toEqual(["console_log", "fetch", "fetch", "process_env"]);
        });
    });

    describe("exported external overloads", () => {
        it("parses exported external overloads", () => {
            const source = `
                export external fetch: (String) -> Promise<Response> = "fetch"
                export external fetch: (String, RequestInit) -> Promise<Response> = "fetch"
            `;

            const module = parseModule(source);
            expect(module.declarations).toHaveLength(2);

            const [decl1, decl2] = module.declarations;
            if (decl1?.kind === "ExternalDecl" && decl2?.kind === "ExternalDecl") {
                expect(decl1.exported).toBe(true);
                expect(decl2.exported).toBe(true);
            }
        });

        it("parses exported external block with overloads", () => {
            const source = `
                export external {
                    fetch: (String) -> Promise<Response> = "fetch"
                    fetch: (String, RequestInit) -> Promise<Response> = "fetch"
                }
            `;

            const module = parseModule(source);
            const decl = module.declarations[0];

            if (decl?.kind === "ExternalBlock") {
                expect(decl.exported).toBe(true);
            }
        });
    });
});
