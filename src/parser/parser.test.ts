/**
 * Core parser tests - token consumption and utilities
 */

import { describe, expect, it } from "vitest";

import { Lexer } from "../lexer/lexer.js";
import { ParserError } from "../utils/index.js";
import { Parser } from "./parser.js";

// Helper to create a parser from source code
function createParser(source: string): Parser {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    return new Parser(tokens, "test.vf");
}

// Helper to access private methods for testing (using any type only in tests)
/* eslint-disable @typescript-eslint/no-explicit-any */
function getPrivate(parser: Parser, method: string): any {
    return (parser as any)[method].bind(parser);
}
/* eslint-enable @typescript-eslint/no-explicit-any */

describe("Parser - Core", () => {
    describe("construction", () => {
        it("should create a parser with tokens", () => {
            const parser = createParser("42");

            expect(parser).toBeDefined();
            expect(parser.hasError()).toBe(false);
        });

        it("should create parser with custom filename", () => {
            const lexer = new Lexer("42", "custom.vf");
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens, "custom.vf");

            expect(parser).toBeDefined();
        });
    });

    describe("peek", () => {
        it("should peek at current token", () => {
            const parser = createParser("42 + 10");
            const peek = getPrivate(parser, "peek");

            const token = peek(0);
            expect(token.type).toBe("INT_LITERAL");
            expect(token.value).toBe(42);
        });

        it("should peek ahead by offset", () => {
            const parser = createParser("42 + 10");
            const peek = getPrivate(parser, "peek");

            const token = peek(1);
            expect(token.type).toBe("PLUS");
        });

        it("should peek at EOF when at end", () => {
            const parser = createParser("");
            const peek = getPrivate(parser, "peek");

            const token = peek(0);
            expect(token.type).toBe("EOF");
        });

        it("should return EOF when peeking past end", () => {
            const parser = createParser("42");
            const peek = getPrivate(parser, "peek");

            const token = peek(10);
            expect(token.type).toBe("EOF");
        });
    });

    describe("advance", () => {
        it("should consume and return current token", () => {
            const parser = createParser("42 + 10");
            const advance = getPrivate(parser, "advance");
            const peek = getPrivate(parser, "peek");

            const token = advance();
            expect(token.type).toBe("INT_LITERAL");
            expect(token.value).toBe(42);

            // Current token should now be +
            const next = peek();
            expect(next.type).toBe("PLUS");
        });

        it("should advance through all tokens", () => {
            const parser = createParser("42 +");
            const advance = getPrivate(parser, "advance");
            const isAtEnd = getPrivate(parser, "isAtEnd");

            advance(); // 42
            advance(); // +
            advance(); // EOF

            expect(isAtEnd()).toBe(true);
        });

        it("should not advance past EOF", () => {
            const parser = createParser("");
            const advance = getPrivate(parser, "advance");
            const peek = getPrivate(parser, "peek");

            const token1 = advance();
            expect(token1.type).toBe("EOF");

            const token2 = advance();
            expect(token2.type).toBe("EOF");

            // Should still be at EOF
            expect(peek().type).toBe("EOF");
        });
    });

    describe("isAtEnd", () => {
        it("should return false when tokens remain", () => {
            const parser = createParser("42");
            const isAtEnd = getPrivate(parser, "isAtEnd");

            expect(isAtEnd()).toBe(false);
        });

        it("should return true at EOF", () => {
            const parser = createParser("");
            const isAtEnd = getPrivate(parser, "isAtEnd");

            expect(isAtEnd()).toBe(true);
        });

        it("should return true after consuming all tokens", () => {
            const parser = createParser("42");
            const advance = getPrivate(parser, "advance");
            const isAtEnd = getPrivate(parser, "isAtEnd");

            advance(); // consume 42
            expect(isAtEnd()).toBe(true);
        });
    });

    describe("check", () => {
        it("should return true if current token matches type", () => {
            const parser = createParser("42");
            const check = getPrivate(parser, "check");

            expect(check("INT_LITERAL")).toBe(true);
        });

        it("should return false if current token does not match", () => {
            const parser = createParser("42");
            const check = getPrivate(parser, "check");

            expect(check("STRING_LITERAL")).toBe(false);
        });

        it("should return false at EOF", () => {
            const parser = createParser("");
            const check = getPrivate(parser, "check");

            expect(check("INT_LITERAL")).toBe(false);
        });
    });

    describe("match", () => {
        it("should consume token if it matches", () => {
            const parser = createParser("42 + 10");
            const match = getPrivate(parser, "match");
            const peek = getPrivate(parser, "peek");

            const token = match("INT_LITERAL");
            expect(token).not.toBeNull();
            expect(token.type).toBe("INT_LITERAL");
            expect(token.value).toBe(42);

            // Should have advanced
            expect(peek().type).toBe("PLUS");
        });

        it("should return null if token does not match", () => {
            const parser = createParser("42");
            const match = getPrivate(parser, "match");
            const peek = getPrivate(parser, "peek");

            const token = match("STRING_LITERAL");
            expect(token).toBeNull();

            // Should not have advanced
            expect(peek().type).toBe("INT_LITERAL");
        });

        it("should match first of multiple types", () => {
            const parser = createParser("42");
            const match = getPrivate(parser, "match");

            const token = match("STRING_LITERAL", "INT_LITERAL", "FLOAT_LITERAL");
            expect(token).not.toBeNull();
            expect(token.type).toBe("INT_LITERAL");
        });

        it("should return null if none of multiple types match", () => {
            const parser = createParser("42");
            const match = getPrivate(parser, "match");

            const token = match("STRING_LITERAL", "BOOL_LITERAL");
            expect(token).toBeNull();
        });
    });

    describe("expect", () => {
        it("should consume and return token if it matches", () => {
            const parser = createParser("42");
            const expectFn = getPrivate(parser, "expect");

            const token = expectFn("INT_LITERAL");
            expect(token.type).toBe("INT_LITERAL");
            expect(token.value).toBe(42);
        });

        it("should throw ParserError if token does not match", () => {
            const parser = createParser("42");
            const expectFn = getPrivate(parser, "expect");

            expect(() => expectFn("STRING_LITERAL")).toThrow(ParserError);
        });

        it("should use custom error message", () => {
            const parser = createParser("42");
            const expectFn = getPrivate(parser, "expect");

            try {
                expectFn("LPAREN", "Expected opening parenthesis");
                // Should not reach here
                expect(true).toBe(false);
            } catch (error) {
                expect(error).toBeInstanceOf(ParserError);
                expect((error as ParserError).message).toContain("Expected opening parenthesis");
            }
        });

        it("should set hasError flag on error", () => {
            const parser = createParser("42");
            const expectFn = getPrivate(parser, "expect");

            try {
                expectFn("STRING_LITERAL");
            } catch {
                // Ignore error
            }

            expect(parser.hasError()).toBe(true);
        });
    });

    describe("error handling", () => {
        it("should create ParserError with location", () => {
            const parser = createParser("42");
            const errorFn = getPrivate(parser, "error");

            const error = errorFn("Test error", { file: "test.vf", line: 1, column: 1, offset: 0 });

            expect(error).toBeInstanceOf(ParserError);
            expect(error.message).toBe("Test error");
            expect(error.location).toBeDefined();
        });

        it("should create ParserError with help text", () => {
            const parser = createParser("42");
            const errorFn = getPrivate(parser, "error");

            const error = errorFn("Test error", { file: "test.vf", line: 1, column: 1, offset: 0 }, "Try this instead");

            expect(error.help).toBe("Try this instead");
        });

        it("should set hasError flag", () => {
            const parser = createParser("42");
            const errorFn = getPrivate(parser, "error");

            errorFn("Test error", { file: "test.vf", line: 1, column: 1, offset: 0 });

            expect(parser.hasError()).toBe(true);
        });
    });

    describe("synchronize", () => {
        it("should skip tokens until semicolon", () => {
            const parser = createParser("42 + 10 ; 99");
            const advance = getPrivate(parser, "advance");
            const synchronize = getPrivate(parser, "synchronize");
            const peek = getPrivate(parser, "peek");

            advance(); // consume 42
            synchronize(); // skip until semicolon

            // Should be at 99 now
            expect(peek().type).toBe("INT_LITERAL");
            expect(peek().value).toBe(99);
        });

        it("should skip tokens until newline", () => {
            const parser = createParser("42 + 10\n99");
            const advance = getPrivate(parser, "advance");
            const synchronize = getPrivate(parser, "synchronize");
            const peek = getPrivate(parser, "peek");

            advance(); // consume 42
            synchronize(); // skip until newline

            // Should be at 99 now
            expect(peek().type).toBe("INT_LITERAL");
            expect(peek().value).toBe(99);
        });

        it("should skip tokens until declaration keyword", () => {
            const parser = createParser("42 + 10 let x = 5");
            const advance = getPrivate(parser, "advance");
            const synchronize = getPrivate(parser, "synchronize");
            const peek = getPrivate(parser, "peek");

            advance(); // consume 42
            synchronize(); // skip until 'let'

            // Should be at 'let' now
            expect(peek().type).toBe("KEYWORD");
            expect(peek().value).toBe("let");
        });

        it("should handle EOF during synchronization", () => {
            const parser = createParser("42 + 10");
            const advance = getPrivate(parser, "advance");
            const synchronize = getPrivate(parser, "synchronize");
            const isAtEnd = getPrivate(parser, "isAtEnd");

            advance(); // consume 42
            synchronize(); // skip to EOF

            expect(isAtEnd()).toBe(true);
        });
    });

    describe("module parsing", () => {
        it("should parse empty module", () => {
            const parser = createParser("");
            const module = parser.parse();

            expect(module).toBeDefined();
            expect(module.imports).toHaveLength(0);
            expect(module.declarations).toHaveLength(0);
        });

        it("should parse module with only whitespace", () => {
            const parser = createParser("   \n\n   ");
            const module = parser.parse();

            expect(module).toBeDefined();
            expect(module.imports).toHaveLength(0);
            expect(module.declarations).toHaveLength(0);
        });

        it("should skip leading newlines", () => {
            const parser = createParser("\n\n\n");
            const module = parser.parse();

            expect(module).toBeDefined();
            expect(module.imports).toHaveLength(0);
            expect(module.declarations).toHaveLength(0);
        });

        it("should have location information", () => {
            const parser = createParser("42");
            const module = parser.parse();

            expect(module.loc).toBeDefined();
            expect(module.loc.file).toBe("test.vf");
            expect(module.loc.line).toBe(1);
        });
    });
});
