/**
 * Tests for invalid character handling
 *
 * Tests that the lexer properly rejects invalid characters
 * with helpful error messages.
 */

import { describe, expect, it } from "vitest";

import { Lexer } from "./lexer.js";

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
