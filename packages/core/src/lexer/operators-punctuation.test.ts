/**
 * Tests for single-character punctuation parsing
 *
 * Tests parsing of parentheses, braces, brackets, delimiters,
 * arithmetic operators, and comparison operators.
 */

import { describe, expect, it } from "vitest";

import { Lexer } from "./lexer.js";

describe("Lexer - Single-Character Punctuation", () => {
    describe("parentheses", () => {
        it("should tokenize left parenthesis", () => {
            const lexer = new Lexer("(", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "LPAREN",
                value: "(",
            });
        });

        it("should tokenize right parenthesis", () => {
            const lexer = new Lexer(")", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "RPAREN",
                value: ")",
            });
        });

        it("should tokenize matching parentheses", () => {
            const lexer = new Lexer("()", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.type).toBe("LPAREN");
            expect(tokens[1]?.type).toBe("RPAREN");
        });
    });

    describe("braces", () => {
        it("should tokenize left brace", () => {
            const lexer = new Lexer("{", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "LBRACE",
                value: "{",
            });
        });

        it("should tokenize right brace", () => {
            const lexer = new Lexer("}", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "RBRACE",
                value: "}",
            });
        });

        it("should tokenize matching braces", () => {
            const lexer = new Lexer("{}", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.type).toBe("LBRACE");
            expect(tokens[1]?.type).toBe("RBRACE");
        });
    });

    describe("brackets", () => {
        it("should tokenize left bracket", () => {
            const lexer = new Lexer("[", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "LBRACKET",
                value: "[",
            });
        });

        it("should tokenize right bracket", () => {
            const lexer = new Lexer("]", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "RBRACKET",
                value: "]",
            });
        });

        it("should tokenize matching brackets", () => {
            const lexer = new Lexer("[]", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.type).toBe("LBRACKET");
            expect(tokens[1]?.type).toBe("RBRACKET");
        });
    });

    describe("delimiters", () => {
        it("should tokenize comma", () => {
            const lexer = new Lexer(",", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "COMMA",
                value: ",",
            });
        });

        it("should tokenize dot", () => {
            const lexer = new Lexer(".", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "DOT",
                value: ".",
            });
        });

        it("should tokenize colon", () => {
            const lexer = new Lexer(":", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "COLON",
                value: ":",
            });
        });

        it("should tokenize semicolon", () => {
            const lexer = new Lexer(";", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "SEMICOLON",
                value: ";",
            });
        });

        it("should tokenize pipe", () => {
            const lexer = new Lexer("|", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "PIPE",
                value: "|",
            });
        });
    });

    describe("arithmetic operators", () => {
        it("should tokenize plus", () => {
            const lexer = new Lexer("+", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "OP_PLUS",
                value: "+",
            });
        });

        it("should tokenize minus", () => {
            const lexer = new Lexer("-", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "OP_MINUS",
                value: "-",
            });
        });

        it("should tokenize star", () => {
            const lexer = new Lexer("*", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "OP_STAR",
                value: "*",
            });
        });

        it("should tokenize slash", () => {
            const lexer = new Lexer("/", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "OP_SLASH",
                value: "/",
            });
        });

        it("should tokenize percent", () => {
            const lexer = new Lexer("%", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "OP_PERCENT",
                value: "%",
            });
        });
    });

    describe("comparison operators", () => {
        it("should tokenize less than", () => {
            const lexer = new Lexer("<", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "OP_LT",
                value: "<",
            });
        });

        it("should tokenize greater than", () => {
            const lexer = new Lexer(">", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "OP_GT",
                value: ">",
            });
        });

        it("should tokenize equals", () => {
            const lexer = new Lexer("=", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "OP_EQUALS",
                value: "=",
            });
        });

        it("should tokenize bang", () => {
            const lexer = new Lexer("!", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "OP_BANG",
                value: "!",
            });
        });
    });

    describe("punctuation sequences", () => {
        it("should tokenize comma-separated list", () => {
            const lexer = new Lexer("a,b,c", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.type).toBe("IDENTIFIER");
            expect(tokens[1]?.type).toBe("COMMA");
            expect(tokens[2]?.type).toBe("IDENTIFIER");
            expect(tokens[3]?.type).toBe("COMMA");
            expect(tokens[4]?.type).toBe("IDENTIFIER");
        });

        it("should tokenize function call syntax", () => {
            const lexer = new Lexer("f(x,y)", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "IDENTIFIER",
                "LPAREN",
                "IDENTIFIER",
                "COMMA",
                "IDENTIFIER",
                "RPAREN",
                "EOF",
            ]);
        });

        it("should tokenize array/list syntax", () => {
            const lexer = new Lexer("[1,2,3]", "test.vf");
            const tokens = lexer.tokenize();

            // Now numbers are implemented, this should parse correctly
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

        it("should tokenize record syntax", () => {
            const lexer = new Lexer("{a,b}", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["LBRACE", "IDENTIFIER", "COMMA", "IDENTIFIER", "RBRACE", "EOF"]);
        });
    });

    describe("operator expressions", () => {
        it("should tokenize arithmetic expression", () => {
            const lexer = new Lexer("a+b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.type).toBe("IDENTIFIER");
            expect(tokens[1]?.type).toBe("OP_PLUS");
            expect(tokens[2]?.type).toBe("IDENTIFIER");
        });

        it("should tokenize multiple operators", () => {
            const lexer = new Lexer("a+b*c", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "IDENTIFIER",
                "OP_PLUS",
                "IDENTIFIER",
                "OP_STAR",
                "IDENTIFIER",
                "EOF",
            ]);
        });

        it("should tokenize operators with spacing", () => {
            const lexer = new Lexer("a + b - c", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "IDENTIFIER",
                "OP_PLUS",
                "IDENTIFIER",
                "OP_MINUS",
                "IDENTIFIER",
                "EOF",
            ]);
        });
    });

    describe("punctuation with whitespace", () => {
        it("should handle spaces around punctuation", () => {
            const lexer = new Lexer("( a , b )", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["LPAREN", "IDENTIFIER", "COMMA", "IDENTIFIER", "RPAREN", "EOF"]);
        });

        it("should handle newlines with punctuation", () => {
            const lexer = new Lexer("{\na\n}", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.type).toBe("LBRACE");
            expect(tokens[1]?.type).toBe("NEWLINE");
            expect(tokens[2]?.type).toBe("IDENTIFIER");
            expect(tokens[3]?.type).toBe("NEWLINE");
            expect(tokens[4]?.type).toBe("RBRACE");
        });
    });

    describe("location tracking", () => {
        it("should track location of punctuation correctly", () => {
            const lexer = new Lexer("  (", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.loc).toMatchObject({
                line: 1,
                column: 3,
            });
        });

        it("should track location across multiple lines", () => {
            const lexer = new Lexer("(\n)", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.loc.line).toBe(1);
            expect(tokens[1]?.loc.line).toBe(1); // NEWLINE on line 1
            expect(tokens[2]?.loc.line).toBe(2); // RPAREN on line 2
        });
    });
});
