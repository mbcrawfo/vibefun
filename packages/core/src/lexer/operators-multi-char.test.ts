/**
 * Tests for multi-character operator parsing
 *
 * Tests parsing of two-character and three-character operators including
 * comparison, arrow, pipe, assignment, list, logical, and spread operators.
 */

import { describe, expect, it } from "vitest";

import { Lexer } from "./lexer.js";

describe("Lexer - Multi-Character Operators", () => {
    describe("two-character comparison operators", () => {
        it("should tokenize ==", () => {
            const lexer = new Lexer("==", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "OP_EQ",
                value: "==",
            });
        });

        it("should tokenize !=", () => {
            const lexer = new Lexer("!=", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "OP_NEQ",
                value: "!=",
            });
        });

        it("should tokenize <=", () => {
            const lexer = new Lexer("<=", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "OP_LTE",
                value: "<=",
            });
        });

        it("should tokenize >=", () => {
            const lexer = new Lexer(">=", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "OP_GTE",
                value: ">=",
            });
        });
    });

    describe("string concatenation operator", () => {
        it("should tokenize &", () => {
            const lexer = new Lexer("&", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "OP_AMPERSAND",
                value: "&",
            });
        });
    });

    describe("two-character shift operators", () => {
        it("should tokenize >>", () => {
            const lexer = new Lexer(">>", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "OP_GT_GT",
                value: ">>",
            });
        });

        it("should tokenize <<", () => {
            const lexer = new Lexer("<<", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "OP_LT_LT",
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
                type: "OP_PIPE_GT",
                value: "|>",
            });
        });
    });

    describe("two-character assignment operators", () => {
        it("should tokenize :=", () => {
            const lexer = new Lexer(":=", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "OP_ASSIGN",
                value: ":=",
            });
        });
    });

    describe("two-character list operators", () => {
        it("should tokenize ::", () => {
            const lexer = new Lexer("::", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "OP_CONS",
                value: "::",
            });
        });
    });

    describe("two-character logical operators", () => {
        it("should tokenize &&", () => {
            const lexer = new Lexer("&&", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "OP_AND",
                value: "&&",
            });
        });

        it("should tokenize ||", () => {
            const lexer = new Lexer("||", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "OP_OR",
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

            expect(tokens[0]?.type).toBe("OP_EQUALS");
            expect(tokens[1]?.type).toBe("OP_EQUALS");
        });

        it("should distinguish != from ! followed by =", () => {
            const lexer = new Lexer("! =", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.type).toBe("OP_BANG");
            expect(tokens[1]?.type).toBe("OP_EQUALS");
        });

        it("should distinguish -> from - followed by >", () => {
            const lexer = new Lexer("- >", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.type).toBe("OP_MINUS");
            expect(tokens[1]?.type).toBe("OP_GT");
        });

        it("should distinguish => from = followed by >", () => {
            const lexer = new Lexer("= >", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.type).toBe("OP_EQUALS");
            expect(tokens[1]?.type).toBe("OP_GT");
        });

        it("should distinguish |> from | followed by >", () => {
            const lexer = new Lexer("| >", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.type).toBe("PIPE");
            expect(tokens[1]?.type).toBe("OP_GT");
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

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "OP_EQ", "IDENTIFIER", "EOF"]);
        });

        it("should tokenize inequality comparison", () => {
            const lexer = new Lexer("a != b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "OP_NEQ", "IDENTIFIER", "EOF"]);
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
                "OP_PLUS",
                "INT_LITERAL",
                "EOF",
            ]);
        });

        it("should tokenize pipe expression", () => {
            const lexer = new Lexer("data |> filter |> map", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "IDENTIFIER",
                "OP_PIPE_GT",
                "IDENTIFIER",
                "OP_PIPE_GT",
                "IDENTIFIER",
                "EOF",
            ]);
        });

        it("should tokenize logical and", () => {
            const lexer = new Lexer("a && b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "OP_AND", "IDENTIFIER", "EOF"]);
        });

        it("should tokenize logical or", () => {
            const lexer = new Lexer("a || b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "OP_OR", "IDENTIFIER", "EOF"]);
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
                "OP_GTE",
                "INT_LITERAL",
                "OP_AND",
                "IDENTIFIER",
                "OP_LTE",
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
                "OP_ASSIGN",
                "IDENTIFIER",
                "FAT_ARROW",
                "IDENTIFIER",
                "OP_PLUS",
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
