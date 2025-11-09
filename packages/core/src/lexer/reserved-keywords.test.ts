/**
 * Tests for reserved keyword validation in the lexer
 */

import { describe, expect, it } from "vitest";

import { LexerError } from "../utils/error.js";
import { Lexer } from "./lexer.js";

describe("Lexer - Reserved Keywords", () => {
    const reservedKeywords = ["async", "await", "trait", "impl", "where", "do", "yield", "return"];

    reservedKeywords.forEach((keyword) => {
        it(`should throw error for reserved keyword '${keyword}'`, () => {
            const lexer1 = new Lexer(keyword, "test.vf");
            const lexer2 = new Lexer(keyword, "test.vf");

            expect(() => lexer1.tokenize()).toThrow(LexerError);
            expect(() => lexer2.tokenize()).toThrow(`'${keyword}' is a reserved keyword for future language features`);
        });

        it(`should throw error for reserved keyword '${keyword}' in expression`, () => {
            const lexer1 = new Lexer(`let ${keyword} = 42`, "test.vf");
            const lexer2 = new Lexer(`let ${keyword} = 42`, "test.vf");

            expect(() => lexer1.tokenize()).toThrow(LexerError);
            expect(() => lexer2.tokenize()).toThrow(`'${keyword}' is a reserved keyword for future language features`);
        });
    });

    it("should throw error with correct location information", () => {
        const lexer = new Lexer("let async = 5", "test.vf");

        try {
            lexer.tokenize();
            expect.fail("Should have thrown an error");
        } catch (error) {
            expect(error).toBeInstanceOf(LexerError);
            if (error instanceof LexerError && error.location) {
                expect(error.location.file).toBe("test.vf");
                expect(error.location.line).toBe(1);
                expect(error.location.column).toBe(5); // 'async' starts at column 5
            }
        }
    });

    it("should allow reserved keywords in string literals", () => {
        const code = '"async await trait impl"';
        const lexer = new Lexer(code, "test.vf");

        const tokens = lexer.tokenize();
        expect(tokens[0]).toMatchObject({
            type: "STRING_LITERAL",
            value: "async await trait impl",
        });
    });

    it("should allow reserved keywords in comments", () => {
        const code = `// async await trait impl
let x = 42`;
        const lexer = new Lexer(code, "test.vf");

        const tokens = lexer.tokenize();
        // Should have: KEYWORD(let), IDENTIFIER(x), EQ, INT_LITERAL(42), EOF
        // Newline might be included depending on lexer settings
        expect(tokens.some((t) => t.type === "KEYWORD" && t.value === "let")).toBe(true);
        expect(tokens.some((t) => t.type === "IDENTIFIER" && t.value === "x")).toBe(true);
    });

    it("should allow reserved keywords in multiline comments", () => {
        const code = `/* async await
        trait impl
        where do */
let x = 42`;
        const lexer = new Lexer(code, "test.vf");

        const tokens = lexer.tokenize();
        expect(tokens.some((t) => t.type === "KEYWORD" && t.value === "let")).toBe(true);
    });

    it("should error on reserved keyword as function name", () => {
        const lexer1 = new Lexer("let async = (x) => x", "test.vf");
        const lexer2 = new Lexer("let async = (x) => x", "test.vf");

        expect(() => lexer1.tokenize()).toThrow(LexerError);
        expect(() => lexer2.tokenize()).toThrow("'async' is a reserved keyword for future language features");
    });

    it("should error on reserved keyword as type name", () => {
        const lexer1 = new Lexer("type trait = Int", "test.vf");
        const lexer2 = new Lexer("type trait = Int", "test.vf");

        expect(() => lexer1.tokenize()).toThrow(LexerError);
        expect(() => lexer2.tokenize()).toThrow("'trait' is a reserved keyword for future language features");
    });

    it("should error on reserved keyword as record field name", () => {
        const lexer1 = new Lexer("{ async: 42 }", "test.vf");
        const lexer2 = new Lexer("{ async: 42 }", "test.vf");

        expect(() => lexer1.tokenize()).toThrow(LexerError);
        expect(() => lexer2.tokenize()).toThrow("'async' is a reserved keyword for future language features");
    });

    it("should error on first reserved keyword in sequence", () => {
        const lexer1 = new Lexer("async await", "test.vf");
        const lexer2 = new Lexer("async await", "test.vf");

        expect(() => lexer1.tokenize()).toThrow(LexerError);
        expect(() => lexer2.tokenize()).toThrow("'async' is a reserved keyword for future language features");
    });

    it("should provide helpful hint in error", () => {
        const lexer = new Lexer("async", "test.vf");

        try {
            lexer.tokenize();
            expect.fail("Should have thrown an error");
        } catch (error) {
            expect(error).toBeInstanceOf(LexerError);
            if (error instanceof LexerError) {
                expect(error.help).toBe("Reserved keywords cannot be used as identifiers");
            }
        }
    });

    it("should throw all 8 reserved keywords count", () => {
        expect(reservedKeywords).toHaveLength(8);
    });
});
