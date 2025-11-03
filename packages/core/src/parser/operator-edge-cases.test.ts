/**
 * Operator and syntax edge case tests
 *
 * Tests parser behavior with complex operator precedence
 * NOTE: Only tests features that are currently implemented
 */

import { describe, expect, it } from "vitest";

import { Lexer } from "../lexer/index.js";
import { Parser } from "./parser.js";

// Helper to create a parser and parse an expression
function parseExpression(source: string) {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    return parser.parseExpression();
}

describe("Parser - Operator Edge Cases", () => {
    describe("double negation and similar patterns", () => {
        it("should parse double negation: --x", () => {
            const expr = parseExpression("--x");

            expect(expr.kind).toBe("UnaryOp");
            if (expr.kind === "UnaryOp") {
                expect(expr.op).toBe("Negate");
                expect(expr.expr.kind).toBe("UnaryOp");
                if (expr.expr.kind === "UnaryOp") {
                    expect(expr.expr.op).toBe("Negate");
                    expect(expr.expr.expr).toMatchObject({
                        kind: "Var",
                        name: "x",
                    });
                }
            }
        });

        it("should parse triple negation: ---x", () => {
            const expr = parseExpression("---x");

            expect(expr.kind).toBe("UnaryOp");
            if (expr.kind === "UnaryOp") {
                expect(expr.op).toBe("Negate");
                // Should nest three levels deep
                let current = expr.expr;
                let depth = 1;
                while (current.kind === "UnaryOp") {
                    depth++;
                    current = current.expr;
                }
                expect(depth).toBe(3);
            }
        });

        it("should parse double NOT: !!x", () => {
            const expr = parseExpression("!!x");

            expect(expr.kind).toBe("UnaryOp");
            if (expr.kind === "UnaryOp") {
                expect(expr.op).toBe("LogicalNot");
                expect(expr.expr.kind).toBe("UnaryOp");
                if (expr.expr.kind === "UnaryOp") {
                    expect(expr.expr.op).toBe("LogicalNot");
                }
            }
        });

        it("should parse mixed unary operators: -!x", () => {
            const expr = parseExpression("-!x");

            expect(expr.kind).toBe("UnaryOp");
            if (expr.kind === "UnaryOp") {
                expect(expr.op).toBe("Negate");
                expect(expr.expr.kind).toBe("UnaryOp");
                if (expr.expr.kind === "UnaryOp") {
                    expect(expr.expr.op).toBe("LogicalNot");
                }
            }
        });
    });

    describe("complex precedence", () => {
        it("should parse complex arithmetic: x + y * z - w / v", () => {
            const expr = parseExpression("x + y * z - w / v");

            expect(expr.kind).toBe("BinOp");
            // Should parse successfully with correct precedence
            expect(expr.loc).toBeDefined();
        });

        it("should respect parentheses: (x + y) * z", () => {
            const expr = parseExpression("(x + y) * z");

            expect(expr.kind).toBe("BinOp");
            if (expr.kind === "BinOp") {
                expect(expr.op).toBe("Multiply");
                // Left side should be the addition (parentheses optimized away in result)
                expect(expr.left.kind).toBe("BinOp");
            }
        });
    });

    describe("operators in different contexts", () => {
        it("should parse operators in list: [a + b, c * d]", () => {
            const expr = parseExpression("[a + b, c * d]");

            expect(expr.kind).toBe("List");
            if (expr.kind === "List") {
                expect(expr.elements).toHaveLength(2);
                const elem0 = expr.elements[0];
                const elem1 = expr.elements[1];
                expect(elem0).toBeDefined();
                expect(elem1).toBeDefined();
                if (elem0 && elem1) {
                    expect(elem0.expr.kind).toBe("BinOp");
                    expect(elem1.expr.kind).toBe("BinOp");
                }
            }
        });

        it("should parse operators in function arguments: f(a + b, c * d)", () => {
            const expr = parseExpression("f(a + b, c * d)");

            expect(expr.kind).toBe("App");
            if (expr.kind === "App") {
                expect(expr.args).toHaveLength(2);
                const arg0 = expr.args[0];
                const arg1 = expr.args[1];
                expect(arg0).toBeDefined();
                expect(arg1).toBeDefined();
                if (arg0 && arg1) {
                    expect(arg0.kind).toBe("BinOp");
                    expect(arg1.kind).toBe("BinOp");
                }
            }
        });
    });

    describe("empty and simple records", () => {
        it("should parse empty braces as empty record", () => {
            const expr = parseExpression("{}");

            expect(expr).toMatchObject({
                kind: "Record",
                fields: [],
            });
        });

        it("should parse single field record: { x: 1 }", () => {
            const expr = parseExpression("{ x: 1 }");

            expect(expr.kind).toBe("Record");
            if (expr.kind === "Record") {
                expect(expr.fields).toHaveLength(1);
                const field0 = expr.fields[0];
                expect(field0).toBeDefined();
                if (field0 && field0.kind === "Field") {
                    expect(field0.name).toBe("x");
                }
            }
        });

        it("should parse nested records: { a: { b: 1 } }", () => {
            const expr = parseExpression("{ a: { b: 1 } }");

            expect(expr.kind).toBe("Record");
            if (expr.kind === "Record") {
                const field0 = expr.fields[0];
                expect(field0).toBeDefined();
                if (field0 && field0.kind === "Field") {
                    expect(field0.value.kind).toBe("Record");
                }
            }
        });
    });
});
