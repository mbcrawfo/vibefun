/**
 * Large literal edge case tests
 *
 * Tests parser behavior with extreme literal values:
 * - Very large/small numbers
 * - Extreme scientific notation
 * - Long numbers with separators
 * - Very large strings
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

describe("Parser - Large Literal Edge Cases", () => {
    describe("extreme scientific notation", () => {
        it("should parse maximum float value (1e308)", () => {
            const expr = parseExpression("1e308");

            expect(expr).toMatchObject({
                kind: "FloatLit",
                value: 1e308,
            });
            expect(expr.loc).toBeDefined();
        });

        it("should parse minimum positive float value (1e-324)", () => {
            const expr = parseExpression("1e-324");

            expect(expr).toMatchObject({
                kind: "FloatLit",
                value: 1e-324,
            });
            expect(expr.loc).toBeDefined();
        });

        it("should parse near-zero float (1e-308)", () => {
            const expr = parseExpression("1e-308");

            expect(expr).toMatchObject({
                kind: "FloatLit",
                value: 1e-308,
            });
        });

        it("should parse large negative scientific notation", () => {
            const expr = parseExpression("-9.99e307");

            expect(expr.kind).toBe("UnaryOp");
            if (expr.kind === "UnaryOp") {
                expect(expr.op).toBe("Negate");
                expect(expr.expr).toMatchObject({
                    kind: "FloatLit",
                    value: 9.99e307,
                });
            }
        });

        it("should parse scientific notation in expressions", () => {
            const expr = parseExpression("1e10 + 2e20");

            expect(expr.kind).toBe("BinOp");
            if (expr.kind === "BinOp") {
                expect(expr.left).toMatchObject({
                    kind: "FloatLit",
                    value: 1e10,
                });
                expect(expr.right).toMatchObject({
                    kind: "FloatLit",
                    value: 2e20,
                });
            }
        });

        it("should parse scientific notation with large exponents in expressions", () => {
            const expr = parseExpression("1e100 * 2e100");

            expect(expr.kind).toBe("BinOp");
            if (expr.kind === "BinOp") {
                expect(expr.left.kind).toBe("FloatLit");
                expect(expr.right.kind).toBe("FloatLit");
            }
        });
    });

    describe("very long numbers with separators", () => {
        it("should parse number with many separators (billion scale)", () => {
            const expr = parseExpression("1_000_000_000");

            expect(expr).toMatchObject({
                kind: "IntLit",
                value: 1000000000,
            });
        });

        it("should parse number with many separators (trillion scale)", () => {
            const expr = parseExpression("1_000_000_000_000");

            expect(expr).toMatchObject({
                kind: "IntLit",
                value: 1000000000000,
            });
        });

        it("should parse very long integer literal", () => {
            // JavaScript safe integer max: 2^53 - 1 = 9007199254740991
            const expr = parseExpression("9007199254740991");

            expect(expr).toMatchObject({
                kind: "IntLit",
                value: 9007199254740991,
            });
        });

        it("should parse long number with separators in expression", () => {
            const expr = parseExpression("1_000_000 + 2_000_000");

            expect(expr.kind).toBe("BinOp");
            if (expr.kind === "BinOp") {
                expect(expr.left).toMatchObject({
                    kind: "IntLit",
                    value: 1000000,
                });
                expect(expr.right).toMatchObject({
                    kind: "IntLit",
                    value: 2000000,
                });
            }
        });

        it("should parse float with many decimal places and separators", () => {
            const expr = parseExpression("1_234.567_890_123");

            expect(expr).toMatchObject({
                kind: "FloatLit",
                value: 1234.567890123,
            });
        });
    });

    describe("very large string literals", () => {
        it("should parse 10KB string literal", () => {
            // Create a 10KB string (10,000 characters)
            const largeString = "a".repeat(10000);
            const source = `"${largeString}"`;

            const expr = parseExpression(source);

            expect(expr).toMatchObject({
                kind: "StringLit",
                value: largeString,
            });
            expect(expr.loc).toBeDefined();
        });

        it("should parse 50KB string literal", () => {
            // Create a 50KB string (50,000 characters)
            const largeString = "x".repeat(50000);
            const source = `"${largeString}"`;

            const expr = parseExpression(source);

            expect(expr).toMatchObject({
                kind: "StringLit",
                value: largeString,
            });
            if (expr.kind === "StringLit") {
                expect(expr.value.length).toBe(50000);
            }
        });

        // SKIPPED: String concatenation operator (++) not yet implemented
        it.skip("should parse very large string in expression", () => {
            const largeString = "hello ".repeat(1000); // ~6KB
            const source = `"${largeString}" ++ " world"`;

            const expr = parseExpression(source);

            expect(expr.kind).toBe("BinOp");
            if (expr.kind === "BinOp") {
                expect(expr.op).toBe("++");
                expect(expr.left).toMatchObject({
                    kind: "StringLit",
                });
            }
        });

        it("should parse very large string in list", () => {
            const largeString = "data".repeat(2500); // ~10KB
            const source = `["${largeString}"]`;

            const expr = parseExpression(source);

            expect(expr.kind).toBe("List");
            if (expr.kind === "List") {
                expect(expr.elements).toHaveLength(1);
                const firstElement = expr.elements[0];
                expect(firstElement).toBeDefined();
                expect(firstElement?.expr).toMatchObject({
                    kind: "StringLit",
                });
            }
        });

        it("should parse very large string in record", () => {
            const largeString = "value".repeat(2000); // ~10KB
            const source = `{ data: "${largeString}" }`;

            const expr = parseExpression(source);

            expect(expr.kind).toBe("Record");
            if (expr.kind === "Record") {
                expect(expr.fields).toHaveLength(1);
                const firstField = expr.fields[0];
                expect(firstField).toBeDefined();
                if (firstField?.kind === "Field") {
                    expect(firstField.value).toMatchObject({
                        kind: "StringLit",
                    });
                }
            }
        });
    });

    describe("large literal combinations", () => {
        it("should parse list of large numbers", () => {
            const source = "[1e100, 2e100, 3e100, 4e100, 5e100]";

            const expr = parseExpression(source);

            expect(expr.kind).toBe("List");
            if (expr.kind === "List") {
                expect(expr.elements).toHaveLength(5);
                const firstElement = expr.elements[0];
                expect(firstElement).toBeDefined();
                expect(firstElement?.expr).toMatchObject({
                    kind: "FloatLit",
                    value: 1e100,
                });
            }
        });

        it("should parse record with large values", () => {
            const source = `{ maxFloat: 1e308, minFloat: 1e-324, bigInt: 9_007_199_254_740_991, largeString: "${"x".repeat(1000)}" }`;

            const expr = parseExpression(source);

            expect(expr.kind).toBe("Record");
            if (expr.kind === "Record") {
                expect(expr.fields).toHaveLength(4);
                const field0 = expr.fields[0];
                const field1 = expr.fields[1];
                const field2 = expr.fields[2];
                const field3 = expr.fields[3];
                expect(field0).toBeDefined();
                expect(field1).toBeDefined();
                expect(field2).toBeDefined();
                expect(field3).toBeDefined();
                if (field0?.kind === "Field") {
                    expect(field0.name).toBe("maxFloat");
                }
                if (field1?.kind === "Field") {
                    expect(field1.name).toBe("minFloat");
                }
                if (field2?.kind === "Field") {
                    expect(field2.name).toBe("bigInt");
                }
                if (field3?.kind === "Field") {
                    expect(field3.name).toBe("largeString");
                }
            }
        });

        it("should parse function call with large literal arguments", () => {
            const source = "process(1e308, 1e-324)";

            const expr = parseExpression(source);

            expect(expr.kind).toBe("App");
            if (expr.kind === "App") {
                expect(expr.args).toHaveLength(2);
                expect(expr.args[0]).toMatchObject({
                    kind: "FloatLit",
                    value: 1e308,
                });
                expect(expr.args[1]).toMatchObject({
                    kind: "FloatLit",
                    value: 1e-324,
                });
            }
        });
    });

    describe("edge case number formats", () => {
        it("should parse hex number with many digits", () => {
            const expr = parseExpression("0xFFFFFFFFFFFFFFFF");

            expect(expr.kind).toBe("IntLit");
            expect(expr.loc).toBeDefined();
        });

        it("should parse binary number with many digits", () => {
            const expr = parseExpression("0b11111111111111111111111111111111");

            expect(expr.kind).toBe("IntLit");
            expect(expr.loc).toBeDefined();
        });

        it("should parse octal number with many digits", () => {
            const expr = parseExpression("0o77777777777");

            expect(expr.kind).toBe("IntLit");
            expect(expr.loc).toBeDefined();
        });
    });
});
