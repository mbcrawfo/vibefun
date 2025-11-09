/**
 * Tests for string literal parsing
 *
 * Phase 6: Strings
 */

import { describe, expect, it } from "vitest";

import { LexerError } from "../utils/index.js";
import { Lexer } from "./lexer.js";

describe("Lexer - Single-Line Strings", () => {
    describe("basic strings", () => {
        it("should tokenize empty string", () => {
            const lexer = new Lexer('""', "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: "",
            });
        });

        it("should tokenize simple string", () => {
            const lexer = new Lexer('"hello"', "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: "hello",
            });
        });

        it("should tokenize string with spaces", () => {
            const lexer = new Lexer('"hello world"', "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: "hello world",
            });
        });

        it("should tokenize string with punctuation", () => {
            const lexer = new Lexer('"Hello, World!"', "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: "Hello, World!",
            });
        });

        it("should tokenize string with numbers", () => {
            const lexer = new Lexer('"test123"', "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: "test123",
            });
        });

        it("should tokenize multiple strings", () => {
            const lexer = new Lexer('"first" "second"', "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.type).toBe("STRING_LITERAL");
            expect(tokens[0]?.value).toBe("first");
            expect(tokens[1]?.type).toBe("STRING_LITERAL");
            expect(tokens[1]?.value).toBe("second");
        });
    });

    describe("simple escape sequences", () => {
        it("should handle newline escape", () => {
            const lexer = new Lexer('"line1\\nline2"', "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: "line1\nline2",
            });
        });

        it("should handle tab escape", () => {
            const lexer = new Lexer('"col1\\tcol2"', "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: "col1\tcol2",
            });
        });

        it("should handle carriage return escape", () => {
            const lexer = new Lexer('"text\\rmore"', "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: "text\rmore",
            });
        });

        it("should handle escaped quote", () => {
            const lexer = new Lexer('"say \\"hello\\""', "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: 'say "hello"',
            });
        });

        it("should handle escaped single quote", () => {
            const lexer = new Lexer(`"it\\'s"`, "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: "it's",
            });
        });

        it("should handle escaped backslash", () => {
            const lexer = new Lexer('"path\\\\file"', "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: "path\\file",
            });
        });

        it("should handle multiple escapes", () => {
            const lexer = new Lexer(`"\\n\\t\\r\\\\\\"\\'"`, "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: "\n\t\r\\\"'",
            });
        });
    });

    describe("hex escape sequences", () => {
        it("should handle simple hex escape", () => {
            const lexer = new Lexer('"\\x41"', "test.vf"); // 'A'
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: "A",
            });
        });

        it("should handle lowercase hex digits", () => {
            const lexer = new Lexer('"\\x61"', "test.vf"); // 'a'
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: "a",
            });
        });

        it("should handle uppercase hex digits", () => {
            const lexer = new Lexer('"\\x41\\x42\\x43"', "test.vf"); // 'ABC'
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: "ABC",
            });
        });

        it("should handle mixed case hex", () => {
            const lexer = new Lexer('"\\x4A\\x6b"', "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: "Jk",
            });
        });

        it("should handle special characters via hex", () => {
            const lexer = new Lexer('"\\x21\\x40\\x23"', "test.vf"); // '!@#'
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: "!@#",
            });
        });
    });

    describe("unicode escape sequences", () => {
        it("should handle short form unicode", () => {
            const lexer = new Lexer('"\\u0041"', "test.vf"); // 'A'
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: "A",
            });
        });

        it("should handle unicode characters", () => {
            const lexer = new Lexer('"\\u03B1\\u03B2\\u03B3"', "test.vf"); // 'αβγ'
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: "αβγ",
            });
        });

        it("should handle long form unicode with braces", () => {
            const lexer = new Lexer('"\\u{41}"', "test.vf"); // 'A'
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: "A",
            });
        });

        it("should handle emoji via long unicode", () => {
            const lexer = new Lexer('"\\u{1F600}"', "test.vf"); // '😀'
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: "😀",
            });
        });

        it("should handle various length long unicode", () => {
            const lexer = new Lexer('"\\u{41}\\u{3B1}\\u{1F600}"', "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: "Aα😀",
            });
        });

        it("should handle mixed unicode forms", () => {
            const lexer = new Lexer('"\\u0041\\u{42}test"', "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: "ABtest",
            });
        });
    });

    describe("error cases", () => {
        it("should throw error for unterminated string", () => {
            const lexer = new Lexer('"hello', "test.vf");

            expect(() => lexer.tokenize()).toThrow(LexerError);
            expect(() => new Lexer('"hello', "test.vf").tokenize()).toThrow(/unterminated string/i);
        });

        it("should throw error for newline in single-line string", () => {
            const lexer = new Lexer('"hello\nworld"', "test.vf");

            expect(() => lexer.tokenize()).toThrow(LexerError);
            expect(() => new Lexer('"hello\nworld"', "test.vf").tokenize()).toThrow(/newline/i);
        });

        it("should throw error for invalid escape sequence", () => {
            const lexer = new Lexer('"test\\q"', "test.vf");

            expect(() => lexer.tokenize()).toThrow(LexerError);
            expect(() => new Lexer('"test\\q"', "test.vf").tokenize()).toThrow(/invalid escape/i);
        });

        it("should throw error for incomplete hex escape", () => {
            const lexer = new Lexer('"\\x4"', "test.vf");

            expect(() => lexer.tokenize()).toThrow(LexerError);
            expect(() => new Lexer('"\\x4"', "test.vf").tokenize()).toThrow(/expected 2 hex digits/i);
        });

        it("should throw error for invalid hex escape", () => {
            const lexer = new Lexer('"\\xGG"', "test.vf");

            expect(() => lexer.tokenize()).toThrow(LexerError);
            expect(() => new Lexer('"\\xGG"', "test.vf").tokenize()).toThrow(/expected 2 hex digits/i);
        });

        it("should throw error for incomplete unicode escape", () => {
            const lexer = new Lexer('"\\u004"', "test.vf");

            expect(() => lexer.tokenize()).toThrow(LexerError);
            expect(() => new Lexer('"\\u004"', "test.vf").tokenize()).toThrow(/expected 4 hex digits/i);
        });

        it("should throw error for unterminated long unicode", () => {
            const lexer = new Lexer('"\\u{41"', "test.vf");

            expect(() => lexer.tokenize()).toThrow(LexerError);
            expect(() => new Lexer('"\\u{41"', "test.vf").tokenize()).toThrow(/expected closing }/i);
        });

        it("should throw error for empty long unicode", () => {
            const lexer = new Lexer('"\\u{}"', "test.vf");

            expect(() => lexer.tokenize()).toThrow(LexerError);
            expect(() => new Lexer('"\\u{}"', "test.vf").tokenize()).toThrow(/expected 1-6 hex digits/i);
        });

        it("should throw error for too long unicode", () => {
            const lexer = new Lexer('"\\u{1234567}"', "test.vf");

            expect(() => lexer.tokenize()).toThrow(LexerError);
            expect(() => new Lexer('"\\u{1234567}"', "test.vf").tokenize()).toThrow(/expected 1-6 hex digits/i);
        });

        it("should throw error for unicode codepoint out of range", () => {
            const lexer = new Lexer('"\\u{110000}"', "test.vf");

            expect(() => lexer.tokenize()).toThrow(LexerError);
            expect(() => new Lexer('"\\u{110000}"', "test.vf").tokenize()).toThrow(/0x10FFFF/i);
        });
    });
});

describe("Lexer - Multi-Line Strings", () => {
    describe("basic multi-line strings", () => {
        it("should tokenize empty multi-line string", () => {
            const lexer = new Lexer('""""""', "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: "",
            });
        });

        it("should tokenize simple multi-line string", () => {
            const lexer = new Lexer('"""hello"""', "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: "hello",
            });
        });

        it("should tokenize multi-line string with newline", () => {
            const lexer = new Lexer('"""line1\nline2"""', "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: "line1\nline2",
            });
        });

        it("should tokenize multi-line string with multiple newlines", () => {
            const lexer = new Lexer('"""line1\nline2\nline3"""', "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: "line1\nline2\nline3",
            });
        });

        it("should preserve indentation in multi-line strings", () => {
            const lexer = new Lexer('"""  indented\n    more"""', "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: "  indented\n    more",
            });
        });

        it("should allow double quotes in multi-line strings", () => {
            const lexer = new Lexer('"""He said "hello" """', "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: 'He said "hello" ',
            });
        });

        it("should allow two consecutive quotes", () => {
            const lexer = new Lexer('"""test""more"""', "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: 'test""more',
            });
        });
    });

    describe("multi-line strings with escapes", () => {
        it("should handle escapes in multi-line strings", () => {
            const lexer = new Lexer('"""line1\\nline2"""', "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: "line1\nline2",
            });
        });

        it("should handle tab escapes", () => {
            const lexer = new Lexer('"""col1\\tcol2"""', "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: "col1\tcol2",
            });
        });

        it("should handle unicode in multi-line strings", () => {
            const lexer = new Lexer('"""\\u{1F600}"""', "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "STRING_LITERAL",
                value: "😀",
            });
        });
    });

    describe("error cases", () => {
        it("should throw error for unterminated multi-line string", () => {
            const lexer = new Lexer('"""hello', "test.vf");

            expect(() => lexer.tokenize()).toThrow(LexerError);
            expect(() => new Lexer('"""hello', "test.vf").tokenize()).toThrow(/unterminated multi-line string/i);
        });

        it("should throw error for unterminated with single closing quote", () => {
            const lexer = new Lexer('"""hello"', "test.vf");

            expect(() => lexer.tokenize()).toThrow(LexerError);
            expect(() => new Lexer('"""hello"', "test.vf").tokenize()).toThrow(/unterminated multi-line string/i);
        });

        it("should throw error for unterminated with two closing quotes", () => {
            const lexer = new Lexer('"""hello""', "test.vf");

            expect(() => lexer.tokenize()).toThrow(LexerError);
            expect(() => new Lexer('"""hello""', "test.vf").tokenize()).toThrow(/unterminated multi-line string/i);
        });
    });
});

describe("Lexer - String Location Tracking", () => {
    it("should track location of single-line string", () => {
        const lexer = new Lexer('  "test"', "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]?.loc).toMatchObject({
            line: 1,
            column: 3,
        });
    });

    it("should track location of multi-line string", () => {
        const lexer = new Lexer('  """test"""', "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]?.loc).toMatchObject({
            line: 1,
            column: 3,
        });
    });

    it("should track location across multiple lines", () => {
        const lexer = new Lexer('"first"\n"second"', "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]?.loc.line).toBe(1);
        expect(tokens[2]?.loc.line).toBe(2); // Second string (after NEWLINE)
    });
});

describe("Lexer - Strings in Context", () => {
    it("should tokenize strings in array", () => {
        const lexer = new Lexer('["a", "b", "c"]', "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens.map((t) => t.type)).toEqual([
            "LBRACKET",
            "STRING_LITERAL",
            "COMMA",
            "STRING_LITERAL",
            "COMMA",
            "STRING_LITERAL",
            "RBRACKET",
            "EOF",
        ]);
    });

    it("should tokenize strings as function arguments", () => {
        const lexer = new Lexer('log("hello")', "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "LPAREN", "STRING_LITERAL", "RPAREN", "EOF"]);
    });

    it("should tokenize mixed types", () => {
        const lexer = new Lexer('[1, "two", 3.0]', "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[1]?.type).toBe("INT_LITERAL");
        expect(tokens[3]?.type).toBe("STRING_LITERAL");
        expect(tokens[5]?.type).toBe("FLOAT_LITERAL");
    });

    it("should handle strings with identifiers", () => {
        const lexer = new Lexer('let name = "Alice"', "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens.map((t) => t.type)).toEqual(["KEYWORD", "IDENTIFIER", "OP_EQUALS", "STRING_LITERAL", "EOF"]);
    });
});

describe("Lexer - String Edge Cases", () => {
    it("should handle very long string", () => {
        const longString = "a".repeat(10000);
        const lexer = new Lexer(`"${longString}"`, "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]?.type).toBe("STRING_LITERAL");
        expect(tokens[0]?.value).toBe(longString);
    });

    it("should handle string followed by identifier", () => {
        const lexer = new Lexer('"test"abc', "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]?.type).toBe("STRING_LITERAL");
        expect(tokens[1]?.type).toBe("IDENTIFIER");
    });

    it("should handle string followed by number", () => {
        const lexer = new Lexer('"test"123', "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]?.type).toBe("STRING_LITERAL");
        expect(tokens[1]?.type).toBe("INT_LITERAL");
    });

    it("should handle all escape types together", () => {
        const lexer = new Lexer('"\\n\\t\\r\\\\\\"\\x41\\u0042\\u{43}"', "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]).toMatchObject({
            type: "STRING_LITERAL",
            value: '\n\t\r\\"ABC',
        });
    });

    it("should handle empty string between tokens", () => {
        const lexer = new Lexer('a""b', "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]?.type).toBe("IDENTIFIER");
        expect(tokens[1]?.type).toBe("STRING_LITERAL");
        expect(tokens[1]?.value).toBe("");
        expect(tokens[2]?.type).toBe("IDENTIFIER");
    });
});
