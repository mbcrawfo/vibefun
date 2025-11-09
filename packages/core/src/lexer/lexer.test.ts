/**
 * Tests for the core Lexer functionality
 *
 * Phase 2: Core Lexer - Character navigation and location tracking
 */

import { describe, expect, it } from "vitest";

import { LexerError } from "../utils/index.js";
import { Lexer } from "./lexer.js";

describe("Lexer - Core Functionality", () => {
    describe("constructor", () => {
        it("should initialize with source and filename", () => {
            const lexer = new Lexer("hello", "test.vf");
            expect(lexer).toBeDefined();
        });

        it("should use default filename if not provided", () => {
            const lexer = new Lexer("\n");
            const tokens = lexer.tokenize();
            expect(tokens[0]?.loc.file).toBe("<input>");
        });
    });

    describe("peek", () => {
        it("should return current character without advancing", () => {
            const lexer = new Lexer("abc", "test.vf");
            expect(lexer.peek()).toBe("a");
            expect(lexer.peek()).toBe("a"); // Should still be 'a'
        });

        it("should peek ahead with offset", () => {
            const lexer = new Lexer("abc", "test.vf");
            expect(lexer.peek(0)).toBe("a");
            expect(lexer.peek(1)).toBe("b");
            expect(lexer.peek(2)).toBe("c");
        });

        it("should return empty string when peeking past end", () => {
            const lexer = new Lexer("a", "test.vf");
            expect(lexer.peek(0)).toBe("a");
            expect(lexer.peek(1)).toBe("");
            expect(lexer.peek(100)).toBe("");
        });

        it("should return empty string at end of input", () => {
            const lexer = new Lexer("", "test.vf");
            expect(lexer.peek()).toBe("");
        });
    });

    describe("advance", () => {
        it("should consume and return current character", () => {
            const lexer = new Lexer("abc", "test.vf");
            expect(lexer.advance()).toBe("a");
            expect(lexer.advance()).toBe("b");
            expect(lexer.advance()).toBe("c");
        });

        it("should return empty string at end of input", () => {
            const lexer = new Lexer("a", "test.vf");
            lexer.advance(); // consume 'a'
            expect(lexer.advance()).toBe("");
            expect(lexer.advance()).toBe("");
        });

        it("should handle empty input", () => {
            const lexer = new Lexer("", "test.vf");
            expect(lexer.advance()).toBe("");
        });
    });

    describe("isAtEnd", () => {
        it("should return false when not at end", () => {
            const lexer = new Lexer("abc", "test.vf");
            expect(lexer.isAtEnd()).toBe(false);
        });

        it("should return true when at end", () => {
            const lexer = new Lexer("a", "test.vf");
            lexer.advance();
            expect(lexer.isAtEnd()).toBe(true);
        });

        it("should return true for empty input", () => {
            const lexer = new Lexer("", "test.vf");
            expect(lexer.isAtEnd()).toBe(true);
        });

        it("should remain true after reaching end", () => {
            const lexer = new Lexer("a", "test.vf");
            lexer.advance();
            expect(lexer.isAtEnd()).toBe(true);
            lexer.advance();
            expect(lexer.isAtEnd()).toBe(true);
        });
    });

    describe("makeLocation", () => {
        it("should create location at start of input", () => {
            const lexer = new Lexer("hello", "test.vf");
            const loc = lexer.makeLocation();

            expect(loc).toEqual({
                file: "test.vf",
                line: 1,
                column: 1,
                offset: 0,
            });
        });

        it("should track position after advances", () => {
            const lexer = new Lexer("hello", "test.vf");
            lexer.advance(); // h
            lexer.advance(); // e
            const loc = lexer.makeLocation();

            expect(loc).toEqual({
                file: "test.vf",
                line: 1,
                column: 3,
                offset: 2,
            });
        });

        it("should track line and column after newline", () => {
            const lexer = new Lexer("ab\ncd", "test.vf");
            lexer.advance(); // a
            lexer.advance(); // b
            lexer.advance(); // \n
            const loc = lexer.makeLocation();

            expect(loc).toEqual({
                file: "test.vf",
                line: 2,
                column: 1,
                offset: 3,
            });
        });

        it("should handle multiple newlines", () => {
            const lexer = new Lexer("a\n\nb", "test.vf");
            lexer.advance(); // a
            lexer.advance(); // \n
            lexer.advance(); // \n
            const loc = lexer.makeLocation();

            expect(loc).toEqual({
                file: "test.vf",
                line: 3,
                column: 1,
                offset: 3,
            });
        });

        it("should track column correctly across multiple lines", () => {
            const lexer = new Lexer("abc\ndef\nghi", "test.vf");

            // Line 1
            lexer.advance(); // a
            lexer.advance(); // b
            lexer.advance(); // c
            lexer.advance(); // \n

            // Line 2
            lexer.advance(); // d
            lexer.advance(); // e
            const loc = lexer.makeLocation();

            expect(loc).toEqual({
                file: "test.vf",
                line: 2,
                column: 3,
                offset: 6,
            });
        });
    });

    describe("makeToken", () => {
        it("should create token with current location", () => {
            const lexer = new Lexer("hello", "test.vf");
            const token = lexer.makeToken("IDENTIFIER", "hello");

            expect(token).toMatchObject({
                type: "IDENTIFIER",
                value: "hello",
                loc: {
                    file: "test.vf",
                    line: 1,
                    column: 1,
                    offset: 0,
                },
            });
        });

        it("should create token with default empty value", () => {
            const lexer = new Lexer("", "test.vf");
            const token = lexer.makeToken("EOF");

            expect(token).toMatchObject({
                type: "EOF",
                value: "",
            });
        });

        it("should create token with correct location after advance", () => {
            const lexer = new Lexer("abc\ndef", "test.vf");
            lexer.advance(); // a
            lexer.advance(); // b
            lexer.advance(); // c
            lexer.advance(); // \n
            lexer.advance(); // d

            const token = lexer.makeToken("IDENTIFIER", "d");

            expect(token.loc).toEqual({
                file: "test.vf",
                line: 2,
                column: 2,
                offset: 5,
            });
        });
    });

    describe("tokenize", () => {
        it("should tokenize empty input", () => {
            const lexer = new Lexer("", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens).toHaveLength(1);
            expect(tokens[0]).toMatchObject({
                type: "EOF",
            });
        });

        it("should tokenize whitespace-only input", () => {
            const lexer = new Lexer("   \t  \r  ", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens).toHaveLength(1);
            expect(tokens[0]?.type).toBe("EOF");
        });

        it("should tokenize newlines", () => {
            const lexer = new Lexer("\n\n\n", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens).toHaveLength(4); // 3 NEWLINE + 1 EOF
            expect(tokens[0]?.type).toBe("NEWLINE");
            expect(tokens[1]?.type).toBe("NEWLINE");
            expect(tokens[2]?.type).toBe("NEWLINE");
            expect(tokens[3]?.type).toBe("EOF");
        });

        it("should skip spaces and tabs", () => {
            const lexer = new Lexer("  \t  \n  \t  ", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens).toHaveLength(2); // 1 NEWLINE + 1 EOF
            expect(tokens[0]?.type).toBe("NEWLINE");
            expect(tokens[1]?.type).toBe("EOF");
        });

        it("should throw error for unexpected characters", () => {
            const lexer = new Lexer("@#$", "test.vf");

            expect(() => lexer.tokenize()).toThrow(LexerError);
        });

        it("should include location in error message", () => {
            const lexer = new Lexer("  \n  @", "test.vf");

            try {
                lexer.tokenize();
                expect.fail("Should have thrown an error");
            } catch (error) {
                expect(error).toBeInstanceOf(LexerError);
                const lexerError = error as LexerError;
                expect(lexerError.location).toMatchObject({
                    line: 2,
                    column: 3,
                });
            }
        });

        it("should always end with EOF token", () => {
            const lexer1 = new Lexer("", "test.vf");
            const tokens1 = lexer1.tokenize();
            expect(tokens1[tokens1.length - 1]?.type).toBe("EOF");

            const lexer2 = new Lexer("\n", "test.vf");
            const tokens2 = lexer2.tokenize();
            expect(tokens2[tokens2.length - 1]?.type).toBe("EOF");
        });
    });

    describe("Location Tracking - Edge Cases", () => {
        it("should handle carriage return without consuming it as token", () => {
            const lexer = new Lexer("a\r\nb", "test.vf");
            const tokens = lexer.tokenize();

            // Should skip \r but process \n
            // 'a' is identifier, \r is skipped, \n is newline, 'b' is identifier
            expect(tokens.map((t) => t.type)).toEqual(["IDENTIFIER", "NEWLINE", "IDENTIFIER", "EOF"]);
        });

        it("should track location accurately through mixed content", () => {
            const lexer = new Lexer("  \n \t \n  ", "test.vf");
            const tokens = lexer.tokenize();

            // First NEWLINE
            expect(tokens[0]?.loc).toMatchObject({
                line: 1,
                column: 3,
            });

            // Second NEWLINE
            expect(tokens[1]?.loc).toMatchObject({
                line: 2,
                column: 4,
            });

            // EOF
            expect(tokens[2]?.loc).toMatchObject({
                line: 3,
                column: 3,
            });
        });

        it("should handle very long lines", () => {
            const longLine = "a".repeat(10000);
            const lexer = new Lexer(`  ${longLine}`, "test.vf");
            const tokens = lexer.tokenize();

            // Should tokenize the long identifier successfully
            expect(tokens[0]).toMatchObject({
                type: "IDENTIFIER",
                value: longLine,
            });
            expect(tokens[0]?.loc.column).toBe(3); // Starts at column 3 after two spaces
        });
    });

    describe("State Management", () => {
        it("should maintain consistent state through navigation", () => {
            const lexer = new Lexer("abc", "test.vf");

            expect(lexer.peek()).toBe("a");
            expect(lexer.isAtEnd()).toBe(false);

            lexer.advance();
            expect(lexer.peek()).toBe("b");
            expect(lexer.isAtEnd()).toBe(false);

            lexer.advance();
            expect(lexer.peek()).toBe("c");
            expect(lexer.isAtEnd()).toBe(false);

            lexer.advance();
            expect(lexer.peek()).toBe("");
            expect(lexer.isAtEnd()).toBe(true);
        });

        it("should handle peek and advance interleaving", () => {
            const lexer = new Lexer("abcd", "test.vf");

            expect(lexer.peek()).toBe("a");
            expect(lexer.peek(1)).toBe("b");
            lexer.advance();

            expect(lexer.peek()).toBe("b");
            expect(lexer.peek(1)).toBe("c");
            expect(lexer.peek(2)).toBe("d");
            lexer.advance();
            lexer.advance();

            expect(lexer.peek()).toBe("d");
            expect(lexer.peek(1)).toBe("");
        });
    });
});

describe("Lexer - Phase 3 Integration", () => {
    describe("simple expressions", () => {
        it("should tokenize variable assignment", () => {
            const lexer = new Lexer("let x = true", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual(["KEYWORD", "IDENTIFIER", "OP_EQUALS", "BOOL_LITERAL", "EOF"]);
            expect(tokens[0]?.value).toBe("let");
            expect(tokens[1]?.value).toBe("x");
            expect(tokens[3]?.value).toBe(true);
        });

        it("should tokenize function call", () => {
            const lexer = new Lexer("foo(bar, baz)", "test.vf");
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

        it("should tokenize match expression skeleton", () => {
            const lexer = new Lexer("match x", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]).toMatchObject({
                type: "KEYWORD",
                keyword: "match",
            });
            expect(tokens[1]).toMatchObject({
                type: "IDENTIFIER",
                value: "x",
            });
        });
    });

    describe("multi-line code", () => {
        it("should tokenize multi-line let statements", () => {
            const code = "let x = true\nlet y = false";
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "KEYWORD",
                "IDENTIFIER",
                "OP_EQUALS",
                "BOOL_LITERAL",
                "NEWLINE",
                "KEYWORD",
                "IDENTIFIER",
                "OP_EQUALS",
                "BOOL_LITERAL",
                "EOF",
            ]);
        });

        it("should tokenize block with braces", () => {
            const code = "{\nlet x\n}";
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.type).toBe("LBRACE");
            expect(tokens[1]?.type).toBe("NEWLINE");
            expect(tokens[2]?.type).toBe("KEYWORD");
            expect(tokens[3]?.type).toBe("IDENTIFIER");
            expect(tokens[4]?.type).toBe("NEWLINE");
            expect(tokens[5]?.type).toBe("RBRACE");
        });
    });

    describe("mixed tokens", () => {
        it("should handle identifiers with operators", () => {
            const lexer = new Lexer("x+y*z", "test.vf");
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

        it("should handle keywords with punctuation", () => {
            const lexer = new Lexer("if(x){let y}", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "KEYWORD",
                "LPAREN",
                "IDENTIFIER",
                "RPAREN",
                "LBRACE",
                "KEYWORD",
                "IDENTIFIER",
                "RBRACE",
                "EOF",
            ]);
        });

        it("should handle complex expression", () => {
            const lexer = new Lexer("let add = (x, y)", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "KEYWORD",
                "IDENTIFIER",
                "OP_EQUALS",
                "LPAREN",
                "IDENTIFIER",
                "COMMA",
                "IDENTIFIER",
                "RPAREN",
                "EOF",
            ]);
        });
    });

    describe("unicode support", () => {
        it("should handle unicode identifiers in expressions", () => {
            const lexer = new Lexer("let café = true", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[1]).toMatchObject({
                type: "IDENTIFIER",
                value: "café",
            });
        });

        it("should handle Greek letters", () => {
            const lexer = new Lexer("let α = β", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[1]?.value).toBe("α");
            expect(tokens[3]?.value).toBe("β");
        });
    });
});

describe("Lexer - Error Recovery and Handling", () => {
    describe("error stops tokenization", () => {
        it("should stop tokenization on invalid character", () => {
            const lexer = new Lexer("let x = 42 @ y = 10", "test.vf");

            expect(() => lexer.tokenize()).toThrow(/Unexpected character/);
        });

        it("should stop tokenization on unterminated string", () => {
            const lexer = new Lexer('let x = "hello', "test.vf");

            expect(() => lexer.tokenize()).toThrow(/Unterminated string/);
        });

        it("should stop tokenization on invalid escape sequence", () => {
            const lexer = new Lexer('"hello\\q"', "test.vf");

            expect(() => lexer.tokenize()).toThrow(/Invalid escape sequence/);
        });

        it("should stop tokenization on unterminated multi-line comment", () => {
            const lexer = new Lexer("let x = 42 /* comment", "test.vf");

            expect(() => lexer.tokenize()).toThrow(/Unterminated multi-line comment/);
        });
    });

    describe("error message quality", () => {
        it("should provide helpful error message for unexpected character", () => {
            const lexer = new Lexer("@", "test.vf");

            try {
                lexer.tokenize();
                expect.fail("Should have thrown an error");
            } catch (error) {
                expect(error).toBeInstanceOf(LexerError);
                const lexerError = error as LexerError;
                expect(lexerError.message).toContain("Unexpected character: '@'");
                expect(lexerError.help).toContain("not valid in vibefun syntax");
            }
        });

        it("should provide helpful error message for unterminated string", () => {
            const lexer = new Lexer('"hello', "test.vf");

            try {
                lexer.tokenize();
                expect.fail("Should have thrown an error");
            } catch (error) {
                expect(error).toBeInstanceOf(LexerError);
                const lexerError = error as LexerError;
                expect(lexerError.message).toContain("Unterminated string");
            }
        });

        it("should provide helpful error message for invalid hex literal", () => {
            const lexer = new Lexer("0x", "test.vf");

            try {
                lexer.tokenize();
                expect.fail("Should have thrown an error");
            } catch (error) {
                expect(error).toBeInstanceOf(LexerError);
                const lexerError = error as LexerError;
                expect(lexerError.message).toContain("Invalid hex literal");
                expect(lexerError.help).toContain("Add hex digits");
            }
        });

        it("should provide helpful error message for invalid binary literal", () => {
            const lexer = new Lexer("0b", "test.vf");

            try {
                lexer.tokenize();
                expect.fail("Should have thrown an error");
            } catch (error) {
                expect(error).toBeInstanceOf(LexerError);
                const lexerError = error as LexerError;
                expect(lexerError.message).toContain("Invalid binary literal");
                expect(lexerError.help).toContain("Add binary digits");
            }
        });

        it("should provide helpful error message for invalid scientific notation", () => {
            const lexer = new Lexer("1e", "test.vf");

            try {
                lexer.tokenize();
                expect.fail("Should have thrown an error");
            } catch (error) {
                expect(error).toBeInstanceOf(LexerError);
                const lexerError = error as LexerError;
                expect(lexerError.message).toContain("Invalid scientific notation");
                expect(lexerError.help).toContain("Add at least one digit");
            }
        });

        it("should provide helpful error message for unterminated multi-line comment", () => {
            const lexer = new Lexer("/* comment", "test.vf");

            try {
                lexer.tokenize();
                expect.fail("Should have thrown an error");
            } catch (error) {
                expect(error).toBeInstanceOf(LexerError);
                const lexerError = error as LexerError;
                expect(lexerError.message).toContain("Unterminated multi-line comment");
                expect(lexerError.help).toContain("Add closing */");
            }
        });
    });

    describe("error location tracking", () => {
        it("should track location of error in middle of file", () => {
            const lexer = new Lexer("let x = @", "test.vf");

            try {
                lexer.tokenize();
                expect.fail("Should have thrown an error");
            } catch (error) {
                expect(error).toBeInstanceOf(LexerError);
                const lexerError = error as LexerError;
                expect(lexerError.location).toMatchObject({
                    file: "test.vf",
                    line: 1,
                    column: 9, // @ is at column 9
                });
            }
        });

        it("should track location of error at end of file", () => {
            const lexer = new Lexer('"unterminated', "test.vf");

            try {
                lexer.tokenize();
                expect.fail("Should have thrown an error");
            } catch (error) {
                expect(error).toBeInstanceOf(LexerError);
                const lexerError = error as LexerError;
                expect(lexerError.location?.file).toBe("test.vf");
                expect(lexerError.location?.line).toBe(1);
            }
        });

        it("should track location of error on specific line", () => {
            const lexer = new Lexer("let x = 1\nlet y = @\nlet z = 3", "test.vf");

            try {
                lexer.tokenize();
                expect.fail("Should have thrown an error");
            } catch (error) {
                expect(error).toBeInstanceOf(LexerError);
                const lexerError = error as LexerError;
                expect(lexerError.location).toMatchObject({
                    line: 2, // @ is on line 2
                    column: 9,
                });
            }
        });

        it("should track location of unterminated comment at EOF", () => {
            const lexer = new Lexer("let x = 1\n/* comment", "test.vf");

            try {
                lexer.tokenize();
                expect.fail("Should have thrown an error");
            } catch (error) {
                expect(error).toBeInstanceOf(LexerError);
                const lexerError = error as LexerError;
                // Error should be reported at the start of the comment
                expect(lexerError.location?.line).toBe(2);
            }
        });
    });

    describe("error context", () => {
        it("should include filename in error", () => {
            const lexer = new Lexer("@", "myfile.vf");

            try {
                lexer.tokenize();
                expect.fail("Should have thrown an error");
            } catch (error) {
                expect(error).toBeInstanceOf(LexerError);
                const lexerError = error as LexerError;
                expect(lexerError.location?.file).toBe("myfile.vf");
            }
        });

        it("should use default filename when not provided", () => {
            const lexer = new Lexer("@");

            try {
                lexer.tokenize();
                expect.fail("Should have thrown an error");
            } catch (error) {
                expect(error).toBeInstanceOf(LexerError);
                const lexerError = error as LexerError;
                expect(lexerError.location?.file).toBe("<input>");
            }
        });
    });

    describe("multiple potential errors", () => {
        it("should report first error encountered", () => {
            // Has two errors: @ and # - should report @ first
            const lexer = new Lexer("@ #", "test.vf");

            try {
                lexer.tokenize();
                expect.fail("Should have thrown an error");
            } catch (error) {
                expect(error).toBeInstanceOf(LexerError);
                const lexerError = error as LexerError;
                expect(lexerError.message).toContain("@");
                expect(lexerError.location?.column).toBe(1); // @ is first
            }
        });

        it("should report error before valid tokens are skipped", () => {
            const lexer = new Lexer("let x @ y", "test.vf");

            try {
                lexer.tokenize();
                expect.fail("Should have thrown an error");
            } catch (error) {
                expect(error).toBeInstanceOf(LexerError);
                const lexerError = error as LexerError;
                expect(lexerError.message).toContain("@");
            }
        });
    });

    describe("edge case errors", () => {
        it("should handle error at start of file", () => {
            const lexer = new Lexer("@hello", "test.vf");

            try {
                lexer.tokenize();
                expect.fail("Should have thrown an error");
            } catch (error) {
                expect(error).toBeInstanceOf(LexerError);
                const lexerError = error as LexerError;
                expect(lexerError.location?.column).toBe(1);
                expect(lexerError.location?.offset).toBe(0);
            }
        });

        it("should handle error after whitespace", () => {
            const lexer = new Lexer("   @", "test.vf");

            try {
                lexer.tokenize();
                expect.fail("Should have thrown an error");
            } catch (error) {
                expect(error).toBeInstanceOf(LexerError);
                const lexerError = error as LexerError;
                expect(lexerError.location?.column).toBe(4); // After 3 spaces
            }
        });

        it("should handle error after comment", () => {
            const lexer = new Lexer("// comment\n@", "test.vf");

            try {
                lexer.tokenize();
                expect.fail("Should have thrown an error");
            } catch (error) {
                expect(error).toBeInstanceOf(LexerError);
                const lexerError = error as LexerError;
                expect(lexerError.location?.line).toBe(2);
            }
        });
    });
});
