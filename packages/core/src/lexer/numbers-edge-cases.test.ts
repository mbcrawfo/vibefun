/**
 * Tests for number literals in context and edge cases in the Lexer
 */

import { describe, expect, it } from "vitest";

import { Lexer } from "./lexer.js";

describe("Lexer - Numbers in Context", () => {
    it("should tokenize arithmetic expression", () => {
        const lexer = new Lexer("10 + 20 * 3.5", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(6); // 10, +, 20, *, 3.5, EOF
        expect(tokens[0]!).toMatchObject({ type: "INT_LITERAL", value: 10 });
        expect(tokens[1]!).toMatchObject({ type: "OP_PLUS" });
        expect(tokens[2]!).toMatchObject({ type: "INT_LITERAL", value: 20 });
        expect(tokens[3]!).toMatchObject({ type: "OP_STAR" });
        expect(tokens[4]!).toMatchObject({ type: "FLOAT_LITERAL", value: 3.5 });
    });

    it("should tokenize numbers with parentheses", () => {
        const lexer = new Lexer("(42)", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(4); // (, 42, ), EOF
        expect(tokens[1]!).toMatchObject({ type: "INT_LITERAL", value: 42 });
    });

    it("should tokenize negative numbers as separate tokens", () => {
        // Note: The minus sign is a separate operator token
        const lexer = new Lexer("-42", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(3); // -, 42, EOF
        expect(tokens[0]!).toMatchObject({ type: "OP_MINUS" });
        expect(tokens[1]!).toMatchObject({ type: "INT_LITERAL", value: 42 });
    });

    it("should tokenize array of numbers", () => {
        const lexer = new Lexer("[1, 2, 3]", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(8); // [, 1, ,, 2, ,, 3, ], EOF
        expect(tokens.map((t) => t.type)).toEqual([
            "LBRACKET",
            "INT_LITERAL",
            "COMMA",
            "INT_LITERAL",
            "COMMA",
            "INT_LITERAL",
            "RBRACKET",
            "EOF",
        ]);
    });

    it("should tokenize function call with number argument", () => {
        const lexer = new Lexer("foo(42)", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(5); // foo, (, 42, ), EOF
        expect(tokens[0]!).toMatchObject({ type: "IDENTIFIER", value: "foo" });
        expect(tokens[2]!).toMatchObject({ type: "INT_LITERAL", value: 42 });
    });

    it("should handle numbers in comments", () => {
        const lexer = new Lexer("42 // 100\n200", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(4); // 42, newline, 200, EOF
        expect(tokens[0]!.value).toBe(42);
        expect(tokens[2]!.value).toBe(200);
    });

    it("should tokenize mixed number formats", () => {
        const lexer = new Lexer("42 0xFF 0b1010 3.14 1e10", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(6); // 5 numbers + EOF
        expect(tokens[0]!).toMatchObject({ type: "INT_LITERAL", value: 42 });
        expect(tokens[1]!).toMatchObject({ type: "INT_LITERAL", value: 255 });
        expect(tokens[2]!).toMatchObject({ type: "INT_LITERAL", value: 10 });
        expect(tokens[3]!).toMatchObject({ type: "FLOAT_LITERAL", value: 3.14 });
        expect(tokens[4]!).toMatchObject({ type: "FLOAT_LITERAL", value: 1e10 });
    });
});

describe("Lexer - Edge Cases", () => {
    it("should tokenize very large integer", () => {
        const lexer = new Lexer("999999999999999", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "INT_LITERAL",
            value: 999999999999999,
        });
    });

    it("should tokenize very small float", () => {
        const lexer = new Lexer("0.000000001", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "FLOAT_LITERAL",
            value: 0.000000001,
        });
    });

    it("should tokenize number immediately followed by identifier", () => {
        // This should be two separate tokens: 42 and abc
        const lexer = new Lexer("42abc", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(3); // 42, abc, EOF
        expect(tokens[0]!).toMatchObject({ type: "INT_LITERAL", value: 42 });
        expect(tokens[1]!).toMatchObject({ type: "IDENTIFIER", value: "abc" });
    });

    it("should tokenize zero with various formats", () => {
        const lexer = new Lexer("0 0.0 0x0 0b0", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(5); // 4 zeros + EOF
        tokens.slice(0, 4).forEach((token) => {
            expect(token.value).toBe(0);
        });
    });
});
