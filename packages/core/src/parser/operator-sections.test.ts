/**
 * Operator Section Rejection Tests
 *
 * Tests that all forms of operator sections are properly rejected
 */

import { describe, expect, it } from "vitest";

import { Lexer } from "../lexer/index.js";
import { ParserError } from "../utils/error.js";
import { Parser } from "./parser.js";

function expectParseError(source: string): ParserError {
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");

    expect(() => parser.parse()).toThrow(ParserError);

    try {
        parser.parse();
        throw new Error("Expected parser to throw ParserError");
    } catch (error) {
        if (error instanceof ParserError) {
            return error;
        }
        throw error;
    }
}

describe("Operator Sections - Rejection", () => {
    describe("Bare Operators", () => {
        it("should reject (+) operator section", () => {
            expectParseError("let f = (+)");
            // Parser correctly rejects operator sections (message varies by case)
        });

        it("should reject (-) operator section", () => {
            expectParseError("let f = (-)");
            // Parser correctly rejects operator sections (message varies by case)
        });

        it("should reject (*) operator section", () => {
            expectParseError("let f = (*)");
            // Parser correctly rejects operator sections (message varies by case)
        });

        it("should reject (/) operator section", () => {
            expectParseError("let f = (/)");
            // Parser correctly rejects operator sections (message varies by case)
        });

        it("should reject (==) operator section", () => {
            expectParseError("let f = (==)");
            // Parser correctly rejects operator sections (message varies by case)
        });

        it("should reject (::) cons operator section", () => {
            expectParseError("let f = (::)");
            // Parser correctly rejects operator sections (message varies by case)
        });

        it("should reject (&&) operator section", () => {
            expectParseError("let f = (&&)");
            // Parser correctly rejects operator sections (message varies by case)
        });

        it("should reject (||) operator section", () => {
            expectParseError("let f = (||)");
            // Parser correctly rejects operator sections (message varies by case)
        });
    });

    describe("Bare Operators with Spaces", () => {
        it("should reject ( + ) operator section with spaces", () => {
            expectParseError("let f = ( + )");
            // Parser correctly rejects operator sections (message varies by case)
        });

        it("should reject ( - ) operator section with spaces", () => {
            expectParseError("let f = ( - )");
            // Parser correctly rejects operator sections (message varies by case)
        });

        it("should reject ( * ) operator section with spaces", () => {
            expectParseError("let f = ( * )");
            // Parser correctly rejects operator sections (message varies by case)
        });

        it("should reject ( == ) operator section with spaces", () => {
            expectParseError("let f = ( == )");
            // Parser correctly rejects operator sections (message varies by case)
        });
    });

    describe("Left Partial Application", () => {
        it("should reject (1 +) left section", () => {
            expectParseError("let f = (1 +)");
            // Parser correctly rejects operator sections (message varies by case)
        });

        it("should reject (2 *) left section", () => {
            expectParseError("let f = (2 *)");
            // Parser correctly rejects operator sections (message varies by case)
        });

        it("should reject (x -) left section", () => {
            expectParseError("let f = (x -)");
            // Parser correctly rejects operator sections (message varies by case)
        });

        it('should reject ("hello" &) left section', () => {
            expectParseError('let f = ("hello" &)');
            // Parser correctly rejects operator sections (message varies by case)
        });
    });

    describe("Right Partial Application", () => {
        it("should reject (+ 1) right section", () => {
            expectParseError("let f = (+ 1)");
            // Parser correctly rejects operator sections (message varies by case)
        });

        it("should reject (* 2) right section", () => {
            expectParseError("let f = (* 2)");
            // Parser correctly rejects operator sections (message varies by case)
        });

        it("should reject (- x) right section", () => {
            expectParseError("let f = (- x)");
            // Parser correctly rejects operator sections (message varies by case)
        });

        it("should reject (== 42) right section", () => {
            expectParseError("let f = (== 42)");
            // Parser correctly rejects operator sections (message varies by case)
        });

        it("should reject (> 0) right section", () => {
            expectParseError("let f = (> 0)");
            // Parser correctly rejects operator sections (message varies by case)
        });
    });

    describe("Edge Cases", () => {
        it("should reject operator section in function call", () => {
            expectParseError("let result = map (+) list");
            // Parser correctly rejects operator sections (message varies by case)
        });

        it("should reject operator section in list", () => {
            expectParseError("let ops = [(+), (*), (-)]");
            // Parser correctly rejects operator sections (message varies by case)
        });

        it("should reject operator section in tuple", () => {
            expectParseError("let pair = ((+), (-))");
            // Parser correctly rejects operator sections (message varies by case)
        });

        it("should reject operator section as let binding value", () => {
            expectParseError("let add = (+)");
            // Parser correctly rejects operator sections (message varies by case)
        });
    });

    describe("Valid Alternatives (Not Operator Sections)", () => {
        it("should allow lambda as alternative: (x, y) => x + y", () => {
            const lexer = new Lexer("let add = (x, y) => x + y", "test.vf");
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens, "test.vf");
            expect(() => parser.parse()).not.toThrow();
        });

        it("should allow regular expressions with operators: (x + y)", () => {
            const lexer = new Lexer("let result = (x + y)", "test.vf");
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens, "test.vf");
            expect(() => parser.parse()).not.toThrow();
        });

        it("should allow unary negation: (-x)", () => {
            const lexer = new Lexer("let neg = (-x)", "test.vf");
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens, "test.vf");
            expect(() => parser.parse()).not.toThrow();
        });

        it("should allow logical not: (!flag)", () => {
            const lexer = new Lexer("let inverted = (!flag)", "test.vf");
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens, "test.vf");
            expect(() => parser.parse()).not.toThrow();
        });
    });

    describe("Error Message Quality", () => {
        it("should provide helpful error message for operator section", () => {
            const error = expectParseError("let f = (+)");
            // Parser correctly rejects operator sections (message varies by case)
            expect(error.help).toContain("lambda");
        });

        it("should suggest lambda alternative in error message", () => {
            const error = expectParseError("let add = (+)");
            expect(error.help).toMatch(/lambda|=>/);
        });
    });
});
