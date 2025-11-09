/**
 * Tests for identifier, keyword, and boolean literal parsing
 *
 * Phase 3: Simple Tokens - Identifier and keyword recognition
 */

import { describe, expect, it } from "vitest";

import { Lexer } from "./lexer.js";

describe("Lexer - Identifiers", () => {
    describe("basic identifiers", () => {
        it("should tokenize single letter identifier", () => {
            const lexer = new Lexer("x", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens).toHaveLength(2); // IDENTIFIER + EOF
            expect(tokens[0]).toMatchObject({
                type: "IDENTIFIER",
                value: "x",
            });
        });

        it("should tokenize multi-letter identifier", () => {
            const lexer = new Lexer("hello", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "IDENTIFIER",
                value: "hello",
            });
        });

        it("should tokenize camelCase identifier", () => {
            const lexer = new Lexer("getUserName", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "IDENTIFIER",
                value: "getUserName",
            });
        });

        it("should tokenize PascalCase identifier", () => {
            const lexer = new Lexer("PersonRecord", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "IDENTIFIER",
                value: "PersonRecord",
            });
        });

        it("should tokenize identifier with underscore prefix", () => {
            const lexer = new Lexer("_private", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "IDENTIFIER",
                value: "_private",
            });
        });

        it("should tokenize identifier with underscores", () => {
            const lexer = new Lexer("some_long_name", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "IDENTIFIER",
                value: "some_long_name",
            });
        });

        it("should tokenize identifier with digits", () => {
            const lexer = new Lexer("var123", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "IDENTIFIER",
                value: "var123",
            });
        });

        it("should tokenize identifier ending with digit", () => {
            const lexer = new Lexer("x2", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "IDENTIFIER",
                value: "x2",
            });
        });
    });

    describe("unicode identifiers", () => {
        it("should tokenize identifier with accented characters", () => {
            const lexer = new Lexer("café", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "IDENTIFIER",
                value: "café",
            });
        });

        it("should tokenize identifier with Greek letters", () => {
            const lexer = new Lexer("αβγ", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "IDENTIFIER",
                value: "αβγ",
            });
        });

        it("should tokenize identifier with Cyrillic letters", () => {
            const lexer = new Lexer("привет", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "IDENTIFIER",
                value: "привет",
            });
        });

        it("should tokenize identifier with Chinese characters", () => {
            const lexer = new Lexer("变量", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "IDENTIFIER",
                value: "变量",
            });
        });

        it("should tokenize identifier with Japanese characters", () => {
            const lexer = new Lexer("変数", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "IDENTIFIER",
                value: "変数",
            });
        });

        it("should tokenize mixed unicode identifier", () => {
            const lexer = new Lexer("αValue123", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "IDENTIFIER",
                value: "αValue123",
            });
        });
    });

    describe("multiple identifiers", () => {
        it("should tokenize space-separated identifiers", () => {
            const lexer = new Lexer("foo bar baz", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens).toHaveLength(4); // 3 identifiers + EOF
            expect(tokens[0]?.value).toBe("foo");
            expect(tokens[1]?.value).toBe("bar");
            expect(tokens[2]?.value).toBe("baz");
        });

        it("should tokenize newline-separated identifiers", () => {
            const lexer = new Lexer("foo\nbar\nbaz", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens).toHaveLength(6); // 3 identifiers + 2 newlines + 1 EOF
            expect(tokens[0]?.type).toBe("IDENTIFIER");
            expect(tokens[1]?.type).toBe("NEWLINE");
            expect(tokens[2]?.type).toBe("IDENTIFIER");
            expect(tokens[3]?.type).toBe("NEWLINE");
            expect(tokens[4]?.type).toBe("IDENTIFIER");
        });

        it("should tokenize identifiers with punctuation", () => {
            const lexer = new Lexer("(foo,bar)", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.type).toBe("LPAREN");
            expect(tokens[1]?.type).toBe("IDENTIFIER");
            expect(tokens[2]?.type).toBe("COMMA");
            expect(tokens[3]?.type).toBe("IDENTIFIER");
            expect(tokens[4]?.type).toBe("RPAREN");
        });
    });

    describe("identifier boundaries", () => {
        it("should stop identifier at whitespace", () => {
            const lexer = new Lexer("hello world", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "IDENTIFIER",
                value: "hello",
            });
            expect(tokens[1]).toMatchObject({
                type: "IDENTIFIER",
                value: "world",
            });
        });

        it("should stop identifier at punctuation", () => {
            const lexer = new Lexer("foo(bar)", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.value).toBe("foo");
            expect(tokens[1]?.type).toBe("LPAREN");
            expect(tokens[2]?.value).toBe("bar");
        });

        it("should stop identifier at operator", () => {
            const lexer = new Lexer("x+y", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.value).toBe("x");
            expect(tokens[1]?.type).toBe("PLUS");
            expect(tokens[2]?.value).toBe("y");
        });
    });
});

describe("Lexer - Keywords", () => {
    const keywords = [
        "let",
        "mut",
        "type",
        "if",
        "then",
        "else",
        "match",
        "when",
        "rec",
        "and",
        "import",
        "export",
        "external",
        "unsafe",
        "from",
        "as",
        "ref",
        "try",
        "catch",
    ];

    keywords.forEach((keyword) => {
        it(`should recognize '${keyword}' as keyword`, () => {
            const lexer = new Lexer(keyword, "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "KEYWORD",
                value: keyword,
                keyword: keyword,
            });
        });
    });

    it("should tokenize all 19 keywords", () => {
        expect(keywords).toHaveLength(19);
    });

    it("should tokenize keyword in expression", () => {
        const lexer = new Lexer("let x", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]).toMatchObject({
            type: "KEYWORD",
            value: "let",
            keyword: "let",
        });
        expect(tokens[1]).toMatchObject({
            type: "IDENTIFIER",
            value: "x",
        });
    });

    it("should distinguish keyword from similar identifier", () => {
        const lexer = new Lexer("letter", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]).toMatchObject({
            type: "IDENTIFIER",
            value: "letter",
        });
    });

    it("should handle keywords with punctuation", () => {
        const lexer = new Lexer("if(x)", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]?.type).toBe("KEYWORD");
        expect(tokens[0]?.value).toBe("if");
        expect(tokens[1]?.type).toBe("LPAREN");
    });

    it("should be case-sensitive for keywords", () => {
        const lexer = new Lexer("Let LET", "test.vf");
        const tokens = lexer.tokenize();

        // Both should be identifiers, not keywords
        expect(tokens[0]).toMatchObject({
            type: "IDENTIFIER",
            value: "Let",
        });
        expect(tokens[1]).toMatchObject({
            type: "IDENTIFIER",
            value: "LET",
        });
    });
});

describe("Lexer - Boolean Literals", () => {
    it("should tokenize true as boolean literal", () => {
        const lexer = new Lexer("true", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]).toMatchObject({
            type: "BOOL_LITERAL",
            value: true,
        });
    });

    it("should tokenize false as boolean literal", () => {
        const lexer = new Lexer("false", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]).toMatchObject({
            type: "BOOL_LITERAL",
            value: false,
        });
    });

    it("should distinguish true from True", () => {
        const lexer = new Lexer("True", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]).toMatchObject({
            type: "IDENTIFIER",
            value: "True",
        });
    });

    it("should tokenize multiple boolean literals", () => {
        const lexer = new Lexer("true false true", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]?.value).toBe(true);
        expect(tokens[1]?.value).toBe(false);
        expect(tokens[2]?.value).toBe(true);
    });

    it("should handle booleans in expressions", () => {
        const lexer = new Lexer("let x = true", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]?.type).toBe("KEYWORD");
        expect(tokens[1]?.type).toBe("IDENTIFIER");
        expect(tokens[2]?.type).toBe("EQUALS");
        expect(tokens[3]).toMatchObject({
            type: "BOOL_LITERAL",
            value: true,
        });
    });
});

describe("Lexer - Identifier Edge Cases", () => {
    it("should handle single underscore as identifier", () => {
        const lexer = new Lexer("_", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]).toMatchObject({
            type: "IDENTIFIER",
            value: "_",
        });
    });

    it("should handle multiple underscores", () => {
        const lexer = new Lexer("___", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]).toMatchObject({
            type: "IDENTIFIER",
            value: "___",
        });
    });

    it("should handle very long identifier", () => {
        const longName = "a".repeat(1000);
        const lexer = new Lexer(longName, "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]).toMatchObject({
            type: "IDENTIFIER",
            value: longName,
        });
    });

    it("should track location correctly for identifier", () => {
        const lexer = new Lexer("  hello", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]?.loc).toMatchObject({
            line: 1,
            column: 3, // After two spaces
        });
    });
});
