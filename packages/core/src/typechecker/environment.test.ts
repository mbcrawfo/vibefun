/**
 * Tests for type environment builder
 */

import type { Module } from "../types/index.js";

import { describe, expect, it } from "vitest";

import { Lexer } from "../lexer/index.js";
import { Parser } from "../parser/index.js";
import { TypeError } from "../utils/error.js";
import { buildEnvironment } from "./environment.js";

function parseModule(source: string): Module {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    return parser.parse();
}

describe("Environment Builder - External Overloading", () => {
    describe("single external declarations", () => {
        it("adds single external to environment", () => {
            const source = `external fetch: (String) -> Promise<Response> = "fetch";`;
            const module = parseModule(source);
            const env = buildEnvironment(module);

            const binding = env.values.get("fetch");
            expect(binding).toBeDefined();
            expect(binding?.kind).toBe("External");

            if (binding?.kind === "External") {
                expect(binding.jsName).toBe("fetch");
                expect(binding.from).toBeUndefined();
            }
        });

        it("adds external with from clause", () => {
            const source = `external fetch: (String) -> Promise<Response> = "fetch" from "node-fetch";`;
            const module = parseModule(source);
            const env = buildEnvironment(module);

            const binding = env.values.get("fetch");
            if (binding?.kind === "External") {
                expect(binding.jsName).toBe("fetch");
                expect(binding.from).toBe("node-fetch");
            }
        });
    });

    describe("overloaded external declarations", () => {
        it("detects and groups multiple external declarations with same name", () => {
            const source = `
                external fetch: (String) -> Promise<Response> = "fetch";
                external fetch: (String, RequestInit) -> Promise<Response> = "fetch";
            `;
            const module = parseModule(source);
            const env = buildEnvironment(module);

            const binding = env.values.get("fetch");
            expect(binding).toBeDefined();
            expect(binding?.kind).toBe("ExternalOverload");

            if (binding?.kind === "ExternalOverload") {
                expect(binding.overloads).toHaveLength(2);
                expect(binding.jsName).toBe("fetch");
                expect(binding.from).toBeUndefined();

                // Check first overload
                const overload1 = binding.overloads[0];
                expect(overload1).toBeDefined();
                expect(overload1?.paramTypes).toHaveLength(1);

                // Check second overload
                const overload2 = binding.overloads[1];
                expect(overload2).toBeDefined();
                expect(overload2?.paramTypes).toHaveLength(2);
            }
        });

        it("groups external overloads in external block", () => {
            const source = `
                external {
                    setTimeout: ((Unit) -> Unit, Int) -> TimeoutId = "setTimeout";
                    setTimeout: ((Unit) -> Unit, Int, Any) -> TimeoutId = "setTimeout";
                };
            `;
            const module = parseModule(source);
            const env = buildEnvironment(module);

            const binding = env.values.get("setTimeout");
            expect(binding).toBeDefined();
            expect(binding?.kind).toBe("ExternalOverload");

            if (binding?.kind === "ExternalOverload") {
                expect(binding.overloads).toHaveLength(2);
                expect(binding.jsName).toBe("setTimeout");
            }
        });

        it("groups external overloads with from clause", () => {
            const source = `
                external from "node:timers" {
                    setTimeout: ((Unit) -> Unit, Int) -> TimeoutId = "setTimeout";
                    setTimeout: ((Unit) -> Unit, Int, Any) -> TimeoutId = "setTimeout";
                };
            `;
            const module = parseModule(source);
            const env = buildEnvironment(module);

            const binding = env.values.get("setTimeout");
            if (binding?.kind === "ExternalOverload") {
                expect(binding.jsName).toBe("setTimeout");
                expect(binding.from).toBe("node:timers");
            }
        });

        it("handles three or more overloads", () => {
            const source = `
                external parseInt: (String) -> Int = "parseInt";
                external parseInt: (String, Int) -> Int = "parseInt";
                external parseInt: (String, Int, Bool) -> Int = "parseInt";
            `;
            const module = parseModule(source);
            const env = buildEnvironment(module);

            const binding = env.values.get("parseInt");
            if (binding?.kind === "ExternalOverload") {
                expect(binding.overloads).toHaveLength(3);
            }
        });
    });

    describe("mixed declarations", () => {
        it("handles mix of single and overloaded externals", () => {
            const source = `
                external log: (String) -> Unit = "console.log";
                external fetch: (String) -> Promise<Response> = "fetch";
                external fetch: (String, RequestInit) -> Promise<Response> = "fetch";
                external env: JsObject = "process.env";
            `;
            const module = parseModule(source);
            const env = buildEnvironment(module);

            // Check single externals
            const log = env.values.get("log");
            expect(log?.kind).toBe("External");

            const envBinding = env.values.get("env");
            expect(envBinding?.kind).toBe("External");

            // Check overloaded external
            const fetch = env.values.get("fetch");
            expect(fetch?.kind).toBe("ExternalOverload");
        });
    });

    describe("validation errors", () => {
        it("throws error for inconsistent jsName in overloads", () => {
            const source = `
                external fetch: (String) -> Promise<Response> = "fetch";
                external fetch: (String, RequestInit) -> Promise<Response> = "window.fetch";
            `;
            const module = parseModule(source);

            expect(() => buildEnvironment(module)).toThrow(TypeError);
            expect(() => buildEnvironment(module)).toThrow(/inconsistent JavaScript names/);
        });

        it("throws error for inconsistent from clause in overloads", () => {
            const source = `
                external fetch: (String) -> Promise<Response> = "fetch" from "node-fetch";
                external fetch: (String, RequestInit) -> Promise<Response> = "fetch" from "undici";
            `;
            const module = parseModule(source);

            expect(() => buildEnvironment(module)).toThrow(TypeError);
            expect(() => buildEnvironment(module)).toThrow(/inconsistent module imports/);
        });

        it("throws error for overload without from when first has from", () => {
            const source = `
                external fetch: (String) -> Promise<Response> = "fetch" from "node-fetch";
                external fetch: (String, RequestInit) -> Promise<Response> = "fetch";
            `;
            const module = parseModule(source);

            expect(() => buildEnvironment(module)).toThrow(TypeError);
            expect(() => buildEnvironment(module)).toThrow(/inconsistent module imports/);
        });

        it("throws error for non-function type in overloads", () => {
            const source = `
                external fetch: (String) -> Promise<Response> = "fetch";
                external fetch: JsObject = "fetch";
            `;
            const module = parseModule(source);

            expect(() => buildEnvironment(module)).toThrow(TypeError);
            expect(() => buildEnvironment(module)).toThrow(/must have function type/);
        });
    });

    describe("external blocks", () => {
        it("handles external block with single item per name", () => {
            const source = `
                external {
                    log: (String) -> Unit = "console.log";
                    error: (String) -> Unit = "console.error";
                };
            `;
            const module = parseModule(source);
            const env = buildEnvironment(module);

            const log = env.values.get("log");
            expect(log?.kind).toBe("External");

            const error = env.values.get("error");
            expect(error?.kind).toBe("External");
        });

        it("handles external block with overloads", () => {
            const source = `
                external {
                    log: (String) -> Unit = "console.log";
                    log: (Int) -> Unit = "console.log";
                    error: (String) -> Unit = "console.error";
                };
            `;
            const module = parseModule(source);
            const env = buildEnvironment(module);

            const log = env.values.get("log");
            expect(log?.kind).toBe("ExternalOverload");
            if (log?.kind === "ExternalOverload") {
                expect(log.overloads).toHaveLength(2);
            }

            const error = env.values.get("error");
            expect(error?.kind).toBe("External");
        });
    });

    describe("built-in types and functions", () => {
        it("includes built-in variant constructors", () => {
            const source = ``;
            const module = parseModule(source);
            const env = buildEnvironment(module);

            expect(env.values.has("Cons")).toBe(true);
            expect(env.values.has("Nil")).toBe(true);
            expect(env.values.has("Some")).toBe(true);
            expect(env.values.has("None")).toBe(true);
            expect(env.values.has("Ok")).toBe(true);
            expect(env.values.has("Err")).toBe(true);
        });

        it("includes built-in standard library functions", () => {
            const source = ``;
            const module = parseModule(source);
            const env = buildEnvironment(module);

            expect(env.values.has("List.map")).toBe(true);
            expect(env.values.has("Option.map")).toBe(true);
            expect(env.values.has("Result.map")).toBe(true);
            expect(env.values.has("String.length")).toBe(true);
            expect(env.values.has("Int.toString")).toBe(true);
            expect(env.values.has("Float.toString")).toBe(true);
        });

        it("includes special functions", () => {
            const source = ``;
            const module = parseModule(source);
            const env = buildEnvironment(module);

            expect(env.values.has("panic")).toBe(true);
            expect(env.values.has("ref")).toBe(true);
        });

        it("does not allow user declarations to override built-ins", () => {
            const source = `
                external panic: (Int) -> String = "panic";
            `;
            const module = parseModule(source);
            const env = buildEnvironment(module);

            // User declaration should override the built-in
            const panic = env.values.get("panic");
            expect(panic?.kind).toBe("External");
        });

        it("preserves built-ins alongside user declarations", () => {
            const source = `
                external myFunction: (String) -> Int = "myFunc";
            `;
            const module = parseModule(source);
            const env = buildEnvironment(module);

            // Both built-ins and user declarations should be present
            expect(env.values.has("Cons")).toBe(true);
            expect(env.values.has("myFunction")).toBe(true);
        });
    });
});
