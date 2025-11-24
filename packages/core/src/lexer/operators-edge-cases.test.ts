/**
 * Tests for operator edge cases
 *
 * Tests parsing of consecutive operators, ambiguous sequences,
 * and complex operator combinations.
 */

import { describe, expect, it } from "vitest";

import { Lexer } from "./lexer.js";

describe("Lexer - Operator Edge Cases", () => {
    describe("consecutive operators without spaces", () => {
        it("should tokenize triple plus as three separate tokens", () => {
            const lexer = new Lexer("a+++b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "IDENTIFIER", // a
                "OP_PLUS", // +
                "OP_PLUS", // +
                "OP_PLUS", // +
                "IDENTIFIER", // b
                "EOF",
            ]);
        });

        it("should tokenize triple minus as three separate tokens", () => {
            const lexer = new Lexer("a---b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "IDENTIFIER", // a
                "OP_MINUS", // -
                "OP_MINUS", // -
                "OP_MINUS", // -
                "IDENTIFIER", // b
                "EOF",
            ]);
        });

        it("should tokenize double star as two separate tokens", () => {
            const lexer = new Lexer("a**b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "IDENTIFIER", // a
                "OP_STAR", // *
                "OP_STAR", // *
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

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "OP_EQ", "IDENTIFIER", "EOF"]);
        });

        it("should tokenize != correctly without spaces", () => {
            const lexer = new Lexer("a!=b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "OP_NEQ", "IDENTIFIER", "EOF"]);
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
                "OP_PLUS",
                "INT_LITERAL",
                "EOF",
            ]);
        });
    });

    describe("ambiguous operator sequences", () => {
        it("should handle minus followed by arrow (- >)", () => {
            const lexer = new Lexer("a- >b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "OP_MINUS", "OP_GT", "IDENTIFIER", "EOF"]);
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

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "OP_EQUALS", "OP_GT", "IDENTIFIER", "EOF"]);
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

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "PIPE", "OP_GT", "IDENTIFIER", "EOF"]);
        });

        it("should handle pipe immediately followed by greater than (|>)", () => {
            const lexer = new Lexer("a|>b", "test.vf");
            const tokens = lexer.tokenize();

            // Longest match: |> should be tokenized as PIPE_GT
            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "OP_PIPE_GT", "IDENTIFIER", "EOF"]);
        });

        it("should handle bang followed by equals (! =)", () => {
            const lexer = new Lexer("a! =b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "OP_BANG", "OP_EQUALS", "IDENTIFIER", "EOF"]);
        });

        it("should handle bang immediately followed by equals (!=)", () => {
            const lexer = new Lexer("a!=b", "test.vf");
            const tokens = lexer.tokenize();

            // Longest match: != should be tokenized as NEQ
            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "OP_NEQ", "IDENTIFIER", "EOF"]);
        });

        it("should handle double equals with extra equals (===)", () => {
            const lexer = new Lexer("a===b", "test.vf");
            const tokens = lexer.tokenize();

            // Should be == followed by =
            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "OP_EQ", "OP_EQUALS", "IDENTIFIER", "EOF"]);
        });

        it("should handle colon followed by equals (: =)", () => {
            const lexer = new Lexer("a: =b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "COLON", "OP_EQUALS", "IDENTIFIER", "EOF"]);
        });

        it("should handle colon immediately followed by equals (:=)", () => {
            const lexer = new Lexer("a:=b", "test.vf");
            const tokens = lexer.tokenize();

            // Longest match: := should be tokenized as ASSIGN
            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "OP_ASSIGN", "IDENTIFIER", "EOF"]);
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
            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "OP_CONS", "IDENTIFIER", "EOF"]);
        });

        it("should handle ampersand followed by ampersand (& &)", () => {
            const lexer = new Lexer("a& &b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "IDENTIFIER",
                "OP_AMPERSAND",
                "OP_AMPERSAND",
                "IDENTIFIER",
                "EOF",
            ]);
        });

        it("should handle ampersand immediately followed by ampersand (&&)", () => {
            const lexer = new Lexer("a&&b", "test.vf");
            const tokens = lexer.tokenize();

            // Longest match: && should be tokenized as AND
            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "OP_AND", "IDENTIFIER", "EOF"]);
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
            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "OP_OR", "IDENTIFIER", "EOF"]);
        });

        it("should handle less than followed by less than (< <)", () => {
            const lexer = new Lexer("a< <b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "OP_LT", "OP_LT", "IDENTIFIER", "EOF"]);
        });

        it("should handle less than immediately followed by less than (<<)", () => {
            const lexer = new Lexer("a<<b", "test.vf");
            const tokens = lexer.tokenize();

            // Longest match: << should be tokenized as LT_LT
            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "OP_LT_LT", "IDENTIFIER", "EOF"]);
        });

        it("should handle greater than followed by greater than (> >)", () => {
            const lexer = new Lexer("a> >b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "OP_GT", "OP_GT", "IDENTIFIER", "EOF"]);
        });

        it("should handle greater than immediately followed by greater than (>>)", () => {
            const lexer = new Lexer("a>>b", "test.vf");
            const tokens = lexer.tokenize();

            // Longest match: >> should be tokenized as GT_GT
            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "OP_GT_GT", "IDENTIFIER", "EOF"]);
        });

        it("should handle triple greater than (>>>)", () => {
            const lexer = new Lexer("a>>>b", "test.vf");
            const tokens = lexer.tokenize();

            // Should be >> followed by >
            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "OP_GT_GT", "OP_GT", "IDENTIFIER", "EOF"]);
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
                "OP_EQ", // ==
                "IDENTIFIER", // b
                "OP_NEQ", // !=
                "IDENTIFIER", // c
                "OP_LTE", // <=
                "IDENTIFIER", // d
                "OP_GTE", // >=
                "IDENTIFIER", // e
                "EOF",
            ]);
        });

        it("should handle chained arrows and pipes", () => {
            const lexer = new Lexer("a|>b|>c->d->e=>f", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "IDENTIFIER", // a
                "OP_PIPE_GT", // |>
                "IDENTIFIER", // b
                "OP_PIPE_GT", // |>
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
                "OP_ASSIGN", // :=
                "IDENTIFIER", // y
                "OP_EQ", // ==
                "IDENTIFIER", // z
                "EOF",
            ]);
        });
    });
});
