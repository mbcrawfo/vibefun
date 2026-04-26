/**
 * Expression parsing tests - Literals and basic expressions
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { VibefunDiagnostic } from "../diagnostics/index.js";
import {
    astEquals,
    lowerIdentifierArb,
    nonNegativeIntArb,
    prettyPrintExpr,
    safeStringContentArb,
} from "../types/test-arbitraries/index.js";
import { parseExpression } from "./expression-test-helpers.js";

describe("Parser - Expression Literals", () => {
    describe("integer literals", () => {
        it("should parse positive integer", () => {
            const expr = parseExpression("42");

            expect(expr).toMatchObject({
                kind: "IntLit",
                value: 42,
            });
            expect(expr.loc).toBeDefined();
        });

        it("should parse zero", () => {
            const expr = parseExpression("0");

            expect(expr).toMatchObject({
                kind: "IntLit",
                value: 0,
            });
        });

        it("should parse large integer", () => {
            const expr = parseExpression("999999");

            expect(expr).toMatchObject({
                kind: "IntLit",
                value: 999999,
            });
        });

        it("should parse hex literal", () => {
            const expr = parseExpression("0xFF");

            expect(expr).toMatchObject({
                kind: "IntLit",
                value: 255,
            });
        });

        it("should parse binary literal", () => {
            const expr = parseExpression("0b1010");

            expect(expr).toMatchObject({
                kind: "IntLit",
                value: 10,
            });
        });
    });

    describe("float literals", () => {
        it("should parse decimal float", () => {
            const expr = parseExpression("3.14");

            expect(expr).toMatchObject({
                kind: "FloatLit",
                value: 3.14,
            });
        });

        it("should parse float with leading zero", () => {
            const expr = parseExpression("0.5");

            expect(expr).toMatchObject({
                kind: "FloatLit",
                value: 0.5,
            });
        });

        it("should parse scientific notation", () => {
            const expr = parseExpression("1.5e10");

            expect(expr).toMatchObject({
                kind: "FloatLit",
                value: 1.5e10,
            });
        });

        it("should parse negative exponent", () => {
            const expr = parseExpression("3.14e-2");

            expect(expr).toMatchObject({
                kind: "FloatLit",
                value: 0.0314,
            });
        });
    });

    describe("string literals", () => {
        it("should parse simple string", () => {
            const expr = parseExpression('"hello"');

            expect(expr).toMatchObject({
                kind: "StringLit",
                value: "hello",
            });
        });

        it("should parse empty string", () => {
            const expr = parseExpression('""');

            expect(expr).toMatchObject({
                kind: "StringLit",
                value: "",
            });
        });

        it("should parse string with escape sequences", () => {
            const expr = parseExpression('"hello\\nworld"');

            expect(expr).toMatchObject({
                kind: "StringLit",
                value: "hello\nworld",
            });
        });

        it("should parse string with unicode", () => {
            const expr = parseExpression('"\\u0048\\u0065\\u006C\\u006C\\u006F"');

            expect(expr).toMatchObject({
                kind: "StringLit",
                value: "Hello",
            });
        });

        it("should parse multi-line string", () => {
            const expr = parseExpression('"""line1\nline2"""');

            expect(expr).toMatchObject({
                kind: "StringLit",
                value: "line1\nline2",
            });
        });
    });

    describe("boolean literals", () => {
        it("should parse true", () => {
            const expr = parseExpression("true");

            expect(expr).toMatchObject({
                kind: "BoolLit",
                value: true,
            });
        });

        it("should parse false", () => {
            const expr = parseExpression("false");

            expect(expr).toMatchObject({
                kind: "BoolLit",
                value: false,
            });
        });
    });

    describe("unit literal", () => {
        it("should parse unit ()", () => {
            const expr = parseExpression("()");

            expect(expr).toMatchObject({
                kind: "UnitLit",
            });
            expect(expr.loc).toBeDefined();
        });
    });

    describe("variables", () => {
        it("should parse simple identifier", () => {
            const expr = parseExpression("x");

            expect(expr).toMatchObject({
                kind: "Var",
                name: "x",
            });
        });

        it("should parse multi-character identifier", () => {
            const expr = parseExpression("myVariable");

            expect(expr).toMatchObject({
                kind: "Var",
                name: "myVariable",
            });
        });

        it("should parse identifier with underscores", () => {
            const expr = parseExpression("my_var_123");

            expect(expr).toMatchObject({
                kind: "Var",
                name: "my_var_123",
            });
        });

        it("should parse unicode identifier", () => {
            const expr = parseExpression("café");

            expect(expr).toMatchObject({
                kind: "Var",
                name: "café",
            });
        });
    });

    describe("parenthesized expressions", () => {
        it("should parse parenthesized integer", () => {
            const expr = parseExpression("(42)");

            expect(expr).toMatchObject({
                kind: "IntLit",
                value: 42,
            });
        });

        it("should parse nested parentheses", () => {
            const expr = parseExpression("((123))");

            expect(expr).toMatchObject({
                kind: "IntLit",
                value: 123,
            });
        });

        it("should parse parenthesized variable", () => {
            const expr = parseExpression("(x)");

            expect(expr).toMatchObject({
                kind: "Var",
                name: "x",
            });
        });

        it("should distinguish unit from parenthesized expression", () => {
            const unit = parseExpression("()");
            const paren = parseExpression("(42)");

            expect(unit.kind).toBe("UnitLit");
            expect(paren.kind).toBe("IntLit");
        });

        it("should throw on unclosed parenthesis", () => {
            expect(() => parseExpression("(42")).toThrow(VibefunDiagnostic);
        });
    });

    describe("error cases", () => {
        it("should throw on unexpected token", () => {
            expect(() => parseExpression("+")).toThrow(VibefunDiagnostic);
        });

        it("should throw on empty input", () => {
            expect(() => parseExpression("")).toThrow(VibefunDiagnostic);
        });

        it("should provide helpful error message", () => {
            try {
                parseExpression("+");
                // Should not reach here
                expect(true).toBe(false);
            } catch (error) {
                expect(error).toBeInstanceOf(VibefunDiagnostic);
                expect((error as VibefunDiagnostic).code).toBe("VF2101");
                expect((error as VibefunDiagnostic).hint).toBeDefined();
            }
        });
    });

    describe("properties", () => {
        it("property: any non-negative integer literal parses to IntLit with the same value", () => {
            fc.assert(
                fc.property(nonNegativeIntArb, (n) => {
                    const expr = parseExpression(n.toString(10));
                    expect(expr).toMatchObject({ kind: "IntLit", value: n });
                    expect(expr.loc).toBeDefined();
                }),
            );
        });

        it("property: any safe identifier parses to Var with the same name", () => {
            fc.assert(
                fc.property(lowerIdentifierArb, (name) => {
                    const expr = parseExpression(name);
                    expect(expr).toMatchObject({ kind: "Var", name });
                }),
            );
        });

        it("property: parse(prettyPrintExpr(literalAst)) round-trips for literal nodes", () => {
            const literalArb = fc.oneof(
                nonNegativeIntArb.map((value) => ({
                    kind: "IntLit" as const,
                    value,
                    loc: { file: "x", line: 1, column: 1, offset: 0 },
                })),
                fc.boolean().map((value) => ({
                    kind: "BoolLit" as const,
                    value,
                    loc: { file: "x", line: 1, column: 1, offset: 0 },
                })),
                safeStringContentArb.map((value) => ({
                    kind: "StringLit" as const,
                    value,
                    loc: { file: "x", line: 1, column: 1, offset: 0 },
                })),
                fc.constant({
                    kind: "UnitLit" as const,
                    loc: { file: "x", line: 1, column: 1, offset: 0 },
                }),
            );
            fc.assert(
                fc.property(literalArb, (lit) => {
                    expect(astEquals(parseExpression(prettyPrintExpr(lit)), lit)).toBe(true);
                }),
            );
        });

        it("property: any parenthesized expression parses to the inner expression", () => {
            fc.assert(
                fc.property(nonNegativeIntArb, (n) => {
                    const expr = parseExpression(`(${n})`);
                    expect(expr).toMatchObject({ kind: "IntLit", value: n });
                }),
            );
        });
    });
});
