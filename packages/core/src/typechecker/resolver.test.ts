/**
 * Tests for overload resolution
 */

import type { Expr, Module } from "../types/index.js";

import { describe, expect, it } from "vitest";

import { VibefunDiagnostic } from "../diagnostics/index.js";
import { Lexer } from "../lexer/index.js";
import { Parser } from "../parser/index.js";
import { buildEnvironment } from "./environment.js";
import { getOverloads, isOverloaded, resolveCall } from "./resolver.js";

function parseModule(source: string): Module {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    return parser.parse();
}

// Helper to create a dummy expression for testing
function dummyExpr(count: number): Expr[] {
    const loc = { file: "test.vf", line: 1, column: 1, offset: 0 };
    return Array.from({ length: count }, () => ({ kind: "IntLit" as const, value: 42, loc }));
}

describe("Overload Resolver", () => {
    describe("single function lookup", () => {
        it("resolves single external function", () => {
            const source = `external fetch: (String) -> Promise<Response> = "fetch";`;
            const module = parseModule(source);
            const env = buildEnvironment(module);

            const callLoc = { file: "test.vf", line: 1, column: 1, offset: 0 };
            const result = resolveCall(env, "fetch", dummyExpr(1), callLoc);

            expect(result.kind).toBe("Single");
            if (result.kind === "Single") {
                expect(result.binding.kind).toBe("External");
                if (result.binding.kind === "External") {
                    expect(result.binding.jsName).toBe("fetch");
                }
            }
        });

        it("throws error for undefined function", () => {
            const source = `external fetch: (String) -> Promise<Response> = "fetch";`;
            const module = parseModule(source);
            const env = buildEnvironment(module);

            const callLoc = { file: "test.vf", line: 1, column: 1, offset: 0 };

            expect(() => resolveCall(env, "nonExistent", dummyExpr(1), callLoc)).toThrow(VibefunDiagnostic);
            expect(() => resolveCall(env, "nonExistent", dummyExpr(1), callLoc)).toThrow(/VF4100/);
        });
    });

    describe("overload resolution by arity", () => {
        it("resolves overload with 1 argument", () => {
            const source = `
                external fetch: (String) -> Promise<Response> = "fetch";
                external fetch: (String, RequestInit) -> Promise<Response> = "fetch";
            `;
            const module = parseModule(source);
            const env = buildEnvironment(module);

            const callLoc = { file: "test.vf", line: 1, column: 1, offset: 0 };
            const result = resolveCall(env, "fetch", dummyExpr(1), callLoc);

            expect(result.kind).toBe("Overload");
            if (result.kind === "Overload") {
                expect(result.overload.paramTypes).toHaveLength(1);
                expect(result.jsName).toBe("fetch");
                expect(result.index).toBe(0);
            }
        });

        it("resolves overload with 2 arguments", () => {
            const source = `
                external fetch: (String) -> Promise<Response> = "fetch";
                external fetch: (String, RequestInit) -> Promise<Response> = "fetch";
            `;
            const module = parseModule(source);
            const env = buildEnvironment(module);

            const callLoc = { file: "test.vf", line: 1, column: 1, offset: 0 };
            const result = resolveCall(env, "fetch", dummyExpr(2), callLoc);

            expect(result.kind).toBe("Overload");
            if (result.kind === "Overload") {
                expect(result.overload.paramTypes).toHaveLength(2);
                expect(result.jsName).toBe("fetch");
                expect(result.index).toBe(1);
            }
        });

        it("resolves among three overloads", () => {
            const source = `
                external parseInt: (String) -> Int = "parseInt";
                external parseInt: (String, Int) -> Int = "parseInt";
                external parseInt: (String, Int, Bool) -> Int = "parseInt";
            `;
            const module = parseModule(source);
            const env = buildEnvironment(module);

            const callLoc = { file: "test.vf", line: 1, column: 1, offset: 0 };

            // Test 1 argument
            const result1 = resolveCall(env, "parseInt", dummyExpr(1), callLoc);
            if (result1.kind === "Overload") {
                expect(result1.index).toBe(0);
            }

            // Test 2 arguments
            const result2 = resolveCall(env, "parseInt", dummyExpr(2), callLoc);
            if (result2.kind === "Overload") {
                expect(result2.index).toBe(1);
            }

            // Test 3 arguments
            const result3 = resolveCall(env, "parseInt", dummyExpr(3), callLoc);
            if (result3.kind === "Overload") {
                expect(result3.index).toBe(2);
            }
        });
    });

    describe("resolution errors", () => {
        it("throws error when no overload matches argument count", () => {
            const source = `
                external fetch: (String) -> Promise<Response> = "fetch";
                external fetch: (String, RequestInit) -> Promise<Response> = "fetch";
            `;
            const module = parseModule(source);
            const env = buildEnvironment(module);

            const callLoc = { file: "test.vf", line: 1, column: 1, offset: 0 };

            // Try with 0 arguments
            expect(() => resolveCall(env, "fetch", dummyExpr(0), callLoc)).toThrow(VibefunDiagnostic);
            expect(() => resolveCall(env, "fetch", dummyExpr(0), callLoc)).toThrow(/VF4201/);

            // Try with 3 arguments
            expect(() => resolveCall(env, "fetch", dummyExpr(3), callLoc)).toThrow(VibefunDiagnostic);
            expect(() => resolveCall(env, "fetch", dummyExpr(3), callLoc)).toThrow(/VF4201/);
        });

        it("error message shows code and message", () => {
            const source = `
                external fetch: (String) -> Promise<Response> = "fetch";
                external fetch: (String, RequestInit) -> Promise<Response> = "fetch";
            `;
            const module = parseModule(source);
            const env = buildEnvironment(module);

            const callLoc = { file: "test.vf", line: 1, column: 1, offset: 0 };

            try {
                resolveCall(env, "fetch", dummyExpr(0), callLoc);
                expect.fail("Should have thrown an error");
            } catch (error) {
                expect(error).toBeInstanceOf(VibefunDiagnostic);
                if (error instanceof VibefunDiagnostic) {
                    expect(error.diagnostic.definition.code).toBe("VF4201");
                    expect(error.diagnostic.message).toContain("No matching overload");
                }
            }
        });

        it("throws ambiguous error when multiple overloads have same arity", () => {
            const source = `
                external log: (String) -> Unit = "console.log";
                external log: (Int) -> Unit = "console.log";
            `;
            const module = parseModule(source);
            const env = buildEnvironment(module);

            const callLoc = { file: "test.vf", line: 1, column: 1, offset: 0 };

            // Both overloads have 1 parameter, so this is ambiguous without type info
            expect(() => resolveCall(env, "log", dummyExpr(1), callLoc)).toThrow(VibefunDiagnostic);
            expect(() => resolveCall(env, "log", dummyExpr(1), callLoc)).toThrow(/VF4205/);
        });
    });

    describe("helper functions", () => {
        it("isOverloaded returns true for overloaded functions", () => {
            const source = `
                external fetch: (String) -> Promise<Response> = "fetch";
                external fetch: (String, RequestInit) -> Promise<Response> = "fetch";
            `;
            const module = parseModule(source);
            const env = buildEnvironment(module);

            expect(isOverloaded(env, "fetch")).toBe(true);
        });

        it("isOverloaded returns false for single functions", () => {
            const source = `external log: (String) -> Unit = "console.log";`;
            const module = parseModule(source);
            const env = buildEnvironment(module);

            expect(isOverloaded(env, "log")).toBe(false);
        });

        it("isOverloaded returns false for undefined functions", () => {
            const source = `external log: (String) -> Unit = "console.log";`;
            const module = parseModule(source);
            const env = buildEnvironment(module);

            expect(isOverloaded(env, "nonExistent")).toBe(false);
        });

        it("getOverloads returns overloads for overloaded functions", () => {
            const source = `
                external fetch: (String) -> Promise<Response> = "fetch";
                external fetch: (String, RequestInit) -> Promise<Response> = "fetch";
            `;
            const module = parseModule(source);
            const env = buildEnvironment(module);

            const overloads = getOverloads(env, "fetch");
            expect(overloads).toBeDefined();
            expect(overloads).toHaveLength(2);
        });

        it("getOverloads returns undefined for single functions", () => {
            const source = `external log: (String) -> Unit = "console.log";`;
            const module = parseModule(source);
            const env = buildEnvironment(module);

            expect(getOverloads(env, "log")).toBeUndefined();
        });
    });

    describe("external blocks", () => {
        it("resolves overloads from external blocks", () => {
            const source = `
                external {
                    setTimeout: ((Unit) -> Unit, Int) -> TimeoutId = "setTimeout";
                    setTimeout: ((Unit) -> Unit, Int, Any) -> TimeoutId = "setTimeout";
                };
            `;
            const module = parseModule(source);
            const env = buildEnvironment(module);

            const callLoc = { file: "test.vf", line: 1, column: 1, offset: 0 };

            const result2 = resolveCall(env, "setTimeout", dummyExpr(2), callLoc);
            expect(result2.kind).toBe("Overload");
            if (result2.kind === "Overload") {
                expect(result2.index).toBe(0);
            }

            const result3 = resolveCall(env, "setTimeout", dummyExpr(3), callLoc);
            expect(result3.kind).toBe("Overload");
            if (result3.kind === "Overload") {
                expect(result3.index).toBe(1);
            }
        });

        it("preserves from clause in resolution result", () => {
            const source = `
                external from "node:timers" {
                    setTimeout: ((Unit) -> Unit, Int) -> TimeoutId = "setTimeout";
                    setTimeout: ((Unit) -> Unit, Int, Any) -> TimeoutId = "setTimeout";
                };
            `;
            const module = parseModule(source);
            const env = buildEnvironment(module);

            const callLoc = { file: "test.vf", line: 1, column: 1, offset: 0 };
            const result = resolveCall(env, "setTimeout", dummyExpr(2), callLoc);

            if (result.kind === "Overload") {
                expect(result.from).toBe("node:timers");
            }
        });
    });
});
