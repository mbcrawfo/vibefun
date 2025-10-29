/**
 * Tests for operator and punctuation parsing
 *
 * Phase 3: Simple Tokens - Single-character punctuation
 * Phase 7: Multi-character operators
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
                type: "PLUS",
                value: "+",
            });
        });

        it("should tokenize minus", () => {
            const lexer = new Lexer("-", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "MINUS",
                value: "-",
            });
        });

        it("should tokenize star", () => {
            const lexer = new Lexer("*", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STAR",
                value: "*",
            });
        });

        it("should tokenize slash", () => {
            const lexer = new Lexer("/", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "SLASH",
                value: "/",
            });
        });

        it("should tokenize percent", () => {
            const lexer = new Lexer("%", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "PERCENT",
                value: "%",
            });
        });
    });

    describe("comparison operators", () => {
        it("should tokenize less than", () => {
            const lexer = new Lexer("<", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "LT",
                value: "<",
            });
        });

        it("should tokenize greater than", () => {
            const lexer = new Lexer(">", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "GT",
                value: ">",
            });
        });

        it("should tokenize equals", () => {
            const lexer = new Lexer("=", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "EQ",
                value: "=",
            });
        });

        it("should tokenize bang", () => {
            const lexer = new Lexer("!", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "BANG",
                value: "!",
            });
        });
    });

    describe("other operators", () => {
        it("should tokenize tilde", () => {
            const lexer = new Lexer("~", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "TILDE",
                value: "~",
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
            expect(tokens[1]?.type).toBe("PLUS");
            expect(tokens[2]?.type).toBe("IDENTIFIER");
        });

        it("should tokenize multiple operators", () => {
            const lexer = new Lexer("a+b*c", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "IDENTIFIER",
                "PLUS",
                "IDENTIFIER",
                "STAR",
                "IDENTIFIER",
                "EOF",
            ]);
        });

        it("should tokenize operators with spacing", () => {
            const lexer = new Lexer("a + b - c", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "IDENTIFIER",
                "PLUS",
                "IDENTIFIER",
                "MINUS",
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

describe("Lexer - Invalid Characters", () => {
    it("should throw error for invalid character", () => {
        const lexer = new Lexer("@", "test.vf");

        expect(() => lexer.tokenize()).toThrow("Unexpected character: '@'");
    });

    it("should throw error for # character", () => {
        const lexer = new Lexer("#", "test.vf");

        expect(() => lexer.tokenize()).toThrow("Unexpected character: '#'");
    });

    it("should throw error for $ character", () => {
        const lexer = new Lexer("$", "test.vf");

        expect(() => lexer.tokenize()).toThrow("Unexpected character: '$'");
    });

    it("should include location in error for invalid character", () => {
        const lexer = new Lexer("  @", "test.vf");

        try {
            lexer.tokenize();
            expect.fail("Should have thrown an error");
        } catch (error) {
            expect(error).toBeDefined();
            // Error should indicate position
        }
    });
});

describe("Lexer - Multi-Character Operators", () => {
    describe("two-character comparison operators", () => {
        it("should tokenize ==", () => {
            const lexer = new Lexer("==", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "EQ_EQ",
                value: "==",
            });
        });

        it("should tokenize !=", () => {
            const lexer = new Lexer("!=", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "BANG_EQ",
                value: "!=",
            });
        });

        it("should tokenize <=", () => {
            const lexer = new Lexer("<=", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "LT_EQ",
                value: "<=",
            });
        });

        it("should tokenize >=", () => {
            const lexer = new Lexer(">=", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "GT_EQ",
                value: ">=",
            });
        });
    });

    describe("two-character arithmetic operators", () => {
        it("should tokenize ++", () => {
            const lexer = new Lexer("++", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "PLUS_PLUS",
                value: "++",
            });
        });
    });

    describe("two-character shift operators", () => {
        it("should tokenize >>", () => {
            const lexer = new Lexer(">>", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "GT_GT",
                value: ">>",
            });
        });

        it("should tokenize <<", () => {
            const lexer = new Lexer("<<", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "LT_LT",
                value: "<<",
            });
        });
    });

    describe("two-character arrow operators", () => {
        it("should tokenize ->", () => {
            const lexer = new Lexer("->", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "ARROW",
                value: "->",
            });
        });

        it("should tokenize =>", () => {
            const lexer = new Lexer("=>", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "FAT_ARROW",
                value: "=>",
            });
        });
    });

    describe("two-character pipe operators", () => {
        it("should tokenize |>", () => {
            const lexer = new Lexer("|>", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "PIPE_GT",
                value: "|>",
            });
        });
    });

    describe("two-character assignment operators", () => {
        it("should tokenize :=", () => {
            const lexer = new Lexer(":=", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "COLON_EQ",
                value: ":=",
            });
        });
    });

    describe("two-character logical operators", () => {
        it("should tokenize &&", () => {
            const lexer = new Lexer("&&", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "AMP_AMP",
                value: "&&",
            });
        });

        it("should tokenize ||", () => {
            const lexer = new Lexer("||", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "PIPE_PIPE",
                value: "||",
            });
        });
    });

    describe("three-character operators", () => {
        it("should tokenize ...", () => {
            const lexer = new Lexer("...", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "DOT_DOT_DOT",
                value: "...",
            });
        });
    });

    describe("operator disambiguation", () => {
        it("should distinguish == from = followed by =", () => {
            const lexer = new Lexer("= =", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.type).toBe("EQ");
            expect(tokens[1]?.type).toBe("EQ");
        });

        it("should distinguish != from ! followed by =", () => {
            const lexer = new Lexer("! =", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.type).toBe("BANG");
            expect(tokens[1]?.type).toBe("EQ");
        });

        it("should distinguish -> from - followed by >", () => {
            const lexer = new Lexer("- >", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.type).toBe("MINUS");
            expect(tokens[1]?.type).toBe("GT");
        });

        it("should distinguish => from = followed by >", () => {
            const lexer = new Lexer("= >", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.type).toBe("EQ");
            expect(tokens[1]?.type).toBe("GT");
        });

        it("should distinguish |> from | followed by >", () => {
            const lexer = new Lexer("| >", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.type).toBe("PIPE");
            expect(tokens[1]?.type).toBe("GT");
        });

        it("should distinguish ... from .. followed by .", () => {
            const lexer = new Lexer(". . .", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.type).toBe("DOT");
            expect(tokens[1]?.type).toBe("DOT");
            expect(tokens[2]?.type).toBe("DOT");
        });
    });

    describe("operators in expressions", () => {
        it("should tokenize equality comparison", () => {
            const lexer = new Lexer("a == b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "EQ_EQ", "IDENTIFIER", "EOF"]);
        });

        it("should tokenize inequality comparison", () => {
            const lexer = new Lexer("a != b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "BANG_EQ", "IDENTIFIER", "EOF"]);
        });

        it("should tokenize function type signature", () => {
            const lexer = new Lexer("Int -> String", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "ARROW", "IDENTIFIER", "EOF"]);
        });

        it("should tokenize lambda expression", () => {
            const lexer = new Lexer("x => x + 1", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "IDENTIFIER",
                "FAT_ARROW",
                "IDENTIFIER",
                "PLUS",
                "INT_LITERAL",
                "EOF",
            ]);
        });

        it("should tokenize pipe expression", () => {
            const lexer = new Lexer("data |> filter |> map", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "IDENTIFIER",
                "PIPE_GT",
                "IDENTIFIER",
                "PIPE_GT",
                "IDENTIFIER",
                "EOF",
            ]);
        });

        it("should tokenize logical and", () => {
            const lexer = new Lexer("a && b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "AMP_AMP", "IDENTIFIER", "EOF"]);
        });

        it("should tokenize logical or", () => {
            const lexer = new Lexer("a || b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "PIPE_PIPE", "IDENTIFIER", "EOF"]);
        });

        it("should tokenize spread operator", () => {
            const lexer = new Lexer("[...items]", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["LBRACKET", "DOT_DOT_DOT", "IDENTIFIER", "RBRACKET", "EOF"]);
        });
    });

    describe("complex expressions", () => {
        it("should tokenize compound comparison", () => {
            const lexer = new Lexer("a >= 1 && b <= 10", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "IDENTIFIER",
                "GT_EQ",
                "INT_LITERAL",
                "AMP_AMP",
                "IDENTIFIER",
                "LT_EQ",
                "INT_LITERAL",
                "EOF",
            ]);
        });

        it("should tokenize chained arrows", () => {
            const lexer = new Lexer("a -> b -> c", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "IDENTIFIER",
                "ARROW",
                "IDENTIFIER",
                "ARROW",
                "IDENTIFIER",
                "EOF",
            ]);
        });

        it("should tokenize mixed operators", () => {
            const lexer = new Lexer("x := y => y + 1", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "IDENTIFIER",
                "COLON_EQ",
                "IDENTIFIER",
                "FAT_ARROW",
                "IDENTIFIER",
                "PLUS",
                "INT_LITERAL",
                "EOF",
            ]);
        });
    });

    describe("location tracking", () => {
        it("should track location of multi-character operators", () => {
            const lexer = new Lexer("  ==", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.loc).toMatchObject({
                line: 1,
                column: 3,
            });
        });

        it("should track location across operators", () => {
            const lexer = new Lexer("a==b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.loc.column).toBe(1); // a
            expect(tokens[1]?.loc.column).toBe(2); // ==
            expect(tokens[2]?.loc.column).toBe(4); // b
        });
    });
});
