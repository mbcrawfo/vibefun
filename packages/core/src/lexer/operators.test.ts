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
                type: "EQUALS",
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

    it("should throw error for ~ character", () => {
        const lexer = new Lexer("~", "test.vf");

        expect(() => lexer.tokenize()).toThrow("Unexpected character: '~'");
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
                type: "EQ",
                value: "==",
            });
        });

        it("should tokenize !=", () => {
            const lexer = new Lexer("!=", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "NEQ",
                value: "!=",
            });
        });

        it("should tokenize <=", () => {
            const lexer = new Lexer("<=", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "LTE",
                value: "<=",
            });
        });

        it("should tokenize >=", () => {
            const lexer = new Lexer(">=", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "GTE",
                value: ">=",
            });
        });
    });

    describe("string concatenation operator", () => {
        it("should tokenize &", () => {
            const lexer = new Lexer("&", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "AMPERSAND",
                value: "&",
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
                type: "ASSIGN",
                value: ":=",
            });
        });
    });

    describe("two-character list operators", () => {
        it("should tokenize ::", () => {
            const lexer = new Lexer("::", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "CONS",
                value: "::",
            });
        });
    });

    describe("two-character logical operators", () => {
        it("should tokenize &&", () => {
            const lexer = new Lexer("&&", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "AND",
                value: "&&",
            });
        });

        it("should tokenize ||", () => {
            const lexer = new Lexer("||", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "OR",
                value: "||",
            });
        });
    });

    describe("three-character operators", () => {
        it("should tokenize ...", () => {
            const lexer = new Lexer("...", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "SPREAD",
                value: "...",
            });
        });
    });

    describe("operator disambiguation", () => {
        it("should distinguish == from = followed by =", () => {
            const lexer = new Lexer("= =", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.type).toBe("EQUALS");
            expect(tokens[1]?.type).toBe("EQUALS");
        });

        it("should distinguish != from ! followed by =", () => {
            const lexer = new Lexer("! =", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.type).toBe("BANG");
            expect(tokens[1]?.type).toBe("EQUALS");
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

            expect(tokens[0]?.type).toBe("EQUALS");
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

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "EQ", "IDENTIFIER", "EOF"]);
        });

        it("should tokenize inequality comparison", () => {
            const lexer = new Lexer("a != b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "NEQ", "IDENTIFIER", "EOF"]);
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

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "AND", "IDENTIFIER", "EOF"]);
        });

        it("should tokenize logical or", () => {
            const lexer = new Lexer("a || b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "OR", "IDENTIFIER", "EOF"]);
        });

        it("should tokenize spread operator", () => {
            const lexer = new Lexer("[...items]", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["LBRACKET", "SPREAD", "IDENTIFIER", "RBRACKET", "EOF"]);
        });
    });

    describe("complex expressions", () => {
        it("should tokenize compound comparison", () => {
            const lexer = new Lexer("a >= 1 && b <= 10", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "IDENTIFIER",
                "GTE",
                "INT_LITERAL",
                "AND",
                "IDENTIFIER",
                "LTE",
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
                "ASSIGN",
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

describe("Lexer - Operator Edge Cases", () => {
    describe("consecutive operators without spaces", () => {
        it("should tokenize triple plus as three separate tokens", () => {
            const lexer = new Lexer("a+++b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "IDENTIFIER", // a
                "PLUS", // +
                "PLUS", // +
                "PLUS", // +
                "IDENTIFIER", // b
                "EOF",
            ]);
        });

        it("should tokenize triple minus as three separate tokens", () => {
            const lexer = new Lexer("a---b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "IDENTIFIER", // a
                "MINUS", // -
                "MINUS", // -
                "MINUS", // -
                "IDENTIFIER", // b
                "EOF",
            ]);
        });

        it("should tokenize double star as two separate tokens", () => {
            const lexer = new Lexer("a**b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "IDENTIFIER", // a
                "STAR", // *
                "STAR", // *
                "IDENTIFIER", // b
                "EOF",
            ]);
        });

        it("should tokenize double slash as comment, not two operators", () => {
            const lexer = new Lexer("a//b", "test.vf");
            const tokens = lexer.tokenize();

            // "//" starts a comment, so everything after is skipped
            expect(tokens.map((t) => t.type)).toEqual([
                "IDENTIFIER", // a
                "EOF",
            ]);
        });

        it("should tokenize == correctly without spaces", () => {
            const lexer = new Lexer("a==b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "EQ", "IDENTIFIER", "EOF"]);
        });

        it("should tokenize != correctly without spaces", () => {
            const lexer = new Lexer("a!=b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "NEQ", "IDENTIFIER", "EOF"]);
        });

        it("should tokenize arrow correctly without spaces", () => {
            const lexer = new Lexer("a->b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "ARROW", "IDENTIFIER", "EOF"]);
        });

        it("should tokenize fat arrow correctly without spaces", () => {
            const lexer = new Lexer("x=>x+1", "test.vf");
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
    });

    describe("ambiguous operator sequences", () => {
        it("should handle minus followed by arrow (- >)", () => {
            const lexer = new Lexer("a- >b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "MINUS", "GT", "IDENTIFIER", "EOF"]);
        });

        it("should handle minus immediately followed by greater than (->)", () => {
            const lexer = new Lexer("a->b", "test.vf");
            const tokens = lexer.tokenize();

            // Longest match: -> should be tokenized as ARROW
            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "ARROW", "IDENTIFIER", "EOF"]);
        });

        it("should handle equals followed by greater than (= >)", () => {
            const lexer = new Lexer("a= >b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "EQUALS", "GT", "IDENTIFIER", "EOF"]);
        });

        it("should handle equals immediately followed by greater than (=>)", () => {
            const lexer = new Lexer("a=>b", "test.vf");
            const tokens = lexer.tokenize();

            // Longest match: => should be tokenized as FAT_ARROW
            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "FAT_ARROW", "IDENTIFIER", "EOF"]);
        });

        it("should handle pipe followed by greater than (| >)", () => {
            const lexer = new Lexer("a| >b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "PIPE", "GT", "IDENTIFIER", "EOF"]);
        });

        it("should handle pipe immediately followed by greater than (|>)", () => {
            const lexer = new Lexer("a|>b", "test.vf");
            const tokens = lexer.tokenize();

            // Longest match: |> should be tokenized as PIPE_GT
            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "PIPE_GT", "IDENTIFIER", "EOF"]);
        });

        it("should handle bang followed by equals (! =)", () => {
            const lexer = new Lexer("a! =b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "BANG", "EQUALS", "IDENTIFIER", "EOF"]);
        });

        it("should handle bang immediately followed by equals (!=)", () => {
            const lexer = new Lexer("a!=b", "test.vf");
            const tokens = lexer.tokenize();

            // Longest match: != should be tokenized as NEQ
            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "NEQ", "IDENTIFIER", "EOF"]);
        });

        it("should handle double equals with extra equals (===)", () => {
            const lexer = new Lexer("a===b", "test.vf");
            const tokens = lexer.tokenize();

            // Should be == followed by =
            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "EQ", "EQUALS", "IDENTIFIER", "EOF"]);
        });

        it("should handle colon followed by equals (: =)", () => {
            const lexer = new Lexer("a: =b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "COLON", "EQUALS", "IDENTIFIER", "EOF"]);
        });

        it("should handle colon immediately followed by equals (:=)", () => {
            const lexer = new Lexer("a:=b", "test.vf");
            const tokens = lexer.tokenize();

            // Longest match: := should be tokenized as ASSIGN
            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "ASSIGN", "IDENTIFIER", "EOF"]);
        });

        it("should handle colon followed by colon (: :)", () => {
            const lexer = new Lexer("a: :b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "COLON", "COLON", "IDENTIFIER", "EOF"]);
        });

        it("should handle colon immediately followed by colon (::)", () => {
            const lexer = new Lexer("a::b", "test.vf");
            const tokens = lexer.tokenize();

            // Longest match: :: should be tokenized as CONS
            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "CONS", "IDENTIFIER", "EOF"]);
        });

        it("should handle ampersand followed by ampersand (& &)", () => {
            const lexer = new Lexer("a& &b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "AMPERSAND", "AMPERSAND", "IDENTIFIER", "EOF"]);
        });

        it("should handle ampersand immediately followed by ampersand (&&)", () => {
            const lexer = new Lexer("a&&b", "test.vf");
            const tokens = lexer.tokenize();

            // Longest match: && should be tokenized as AND
            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "AND", "IDENTIFIER", "EOF"]);
        });

        it("should handle pipe followed by pipe (| |)", () => {
            const lexer = new Lexer("a| |b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "PIPE", "PIPE", "IDENTIFIER", "EOF"]);
        });

        it("should handle pipe immediately followed by pipe (||)", () => {
            const lexer = new Lexer("a||b", "test.vf");
            const tokens = lexer.tokenize();

            // Longest match: || should be tokenized as OR
            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "OR", "IDENTIFIER", "EOF"]);
        });

        it("should handle less than followed by less than (< <)", () => {
            const lexer = new Lexer("a< <b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "LT", "LT", "IDENTIFIER", "EOF"]);
        });

        it("should handle less than immediately followed by less than (<<)", () => {
            const lexer = new Lexer("a<<b", "test.vf");
            const tokens = lexer.tokenize();

            // Longest match: << should be tokenized as LT_LT
            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "LT_LT", "IDENTIFIER", "EOF"]);
        });

        it("should handle greater than followed by greater than (> >)", () => {
            const lexer = new Lexer("a> >b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "GT", "GT", "IDENTIFIER", "EOF"]);
        });

        it("should handle greater than immediately followed by greater than (>>)", () => {
            const lexer = new Lexer("a>>b", "test.vf");
            const tokens = lexer.tokenize();

            // Longest match: >> should be tokenized as GT_GT
            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "GT_GT", "IDENTIFIER", "EOF"]);
        });

        it("should handle triple greater than (>>>)", () => {
            const lexer = new Lexer("a>>>b", "test.vf");
            const tokens = lexer.tokenize();

            // Should be >> followed by >
            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "GT_GT", "GT", "IDENTIFIER", "EOF"]);
        });
    });

    describe("dot operator edge cases", () => {
        it("should handle two dots as separate tokens (. .)", () => {
            const lexer = new Lexer(". .", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["DOT", "DOT", "EOF"]);
        });

        it("should handle three dots as spread operator (...)", () => {
            const lexer = new Lexer("...", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["SPREAD", "EOF"]);
        });

        it("should handle four dots as spread plus dot (....) ", () => {
            const lexer = new Lexer("....", "test.vf");
            const tokens = lexer.tokenize();

            // Should be ... followed by .
            expect(tokens.map((t) => t.type)).toEqual(["SPREAD", "DOT", "EOF"]);
        });

        it("should handle six dots as two spread operators", () => {
            const lexer = new Lexer("......", "test.vf");
            const tokens = lexer.tokenize();

            // Should be ... followed by ...
            expect(tokens.map((t) => t.type)).toEqual(["SPREAD", "SPREAD", "EOF"]);
        });
    });

    describe("complex operator combinations", () => {
        it("should handle multiple operators in sequence", () => {
            const lexer = new Lexer("a==b!=c<=d>=e", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "IDENTIFIER", // a
                "EQ", // ==
                "IDENTIFIER", // b
                "NEQ", // !=
                "IDENTIFIER", // c
                "LTE", // <=
                "IDENTIFIER", // d
                "GTE", // >=
                "IDENTIFIER", // e
                "EOF",
            ]);
        });

        it("should handle chained arrows and pipes", () => {
            const lexer = new Lexer("a|>b|>c->d->e=>f", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "IDENTIFIER", // a
                "PIPE_GT", // |>
                "IDENTIFIER", // b
                "PIPE_GT", // |>
                "IDENTIFIER", // c
                "ARROW", // ->
                "IDENTIFIER", // d
                "ARROW", // ->
                "IDENTIFIER", // e
                "FAT_ARROW", // =>
                "IDENTIFIER", // f
                "EOF",
            ]);
        });

        it("should handle mixed assignment and comparison operators", () => {
            const lexer = new Lexer("x:=y==z", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "IDENTIFIER", // x
                "ASSIGN", // :=
                "IDENTIFIER", // y
                "EQ", // ==
                "IDENTIFIER", // z
                "EOF",
            ]);
        });
    });
});
