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
            const lexer = new Lexer("abc", "test.vf");

            expect(() => lexer.tokenize()).toThrow(LexerError);
        });

        it("should include location in error message", () => {
            const lexer = new Lexer("  \n  x", "test.vf");

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

            // Should skip \r but process \n
            expect(() => lexer.tokenize()).toThrow(LexerError); // Will fail on 'a' and 'b'
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

            try {
                lexer.tokenize();
            } catch (error) {
                expect(error).toBeInstanceOf(LexerError);
                const lexerError = error as LexerError;
                // Should be at column 3 (after two spaces)
                expect(lexerError.location.column).toBe(3);
            }
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
