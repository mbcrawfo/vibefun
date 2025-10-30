/**
 * Parser error handling tests
 */

import { describe, expect, it } from "vitest";

import { Lexer } from "../lexer/index.js";
import { ParserError } from "../utils/error.js";
import { Parser } from "./parser.js";

// Helper to attempt parsing and expect an error
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

describe("Parser - Error Handling", () => {
    describe("syntax errors - expressions", () => {
        it("reports error for unexpected token in expression", () => {
            const error = expectParseError("let x = then");
            expect(error.message).toContain("Unexpected");
            expect(error.location!.line).toBe(1);
        });

        it("reports error for missing operator between operands", () => {
            const error = expectParseError("let x = 1 2");
            expect(error.message).toContain("Expected");
        });

        it("reports error for missing then in if expression", () => {
            const error = expectParseError("let x = if true else 0");
            expect(error.message).toContain("Expected");
        });

        it("reports error for missing arrow in lambda", () => {
            const error = expectParseError("let f = (x, y) x + y");
            expect(error.message).toContain("Expected");
        });

        it("reports error for invalid operand in binary operation", () => {
            const error = expectParseError("let x = 1 + else");
            expect(error.message).toContain("Unexpected");
        });
    });

    describe("syntax errors - patterns", () => {
        it("reports error for unexpected token in pattern", () => {
            const error = expectParseError("let x = match y { | + => 0 }");
            expect(error.message).toContain("Expected");
        });

        it("reports error for missing arrow in match case", () => {
            const error = expectParseError("let x = match y { | Some(v) 0 }");
            expect(error.message).toContain("Expected");
        });

        it("reports error for incomplete pattern", () => {
            const error = expectParseError("let x = match y { | Some( }");
            expect(error.message).toContain("Expected");
        });
    });

    describe("syntax errors - declarations", () => {
        it("reports error for missing pattern in let", () => {
            const error = expectParseError("let = 42");
            expect(error.message).toContain("Expected");
        });

        it("reports error for missing type name", () => {
            const error = expectParseError("type = Int");
            expect(error.message).toContain("Expected");
        });

        it("reports error for invalid type declaration", () => {
            const error = expectParseError("type Point = 42");
            expect(error.message).toContain("Expected");
        });

        it("reports error for invalid import syntax", () => {
            const error = expectParseError("import else");
            expect(error.message).toContain("Unexpected");
        });

        it("reports error for invalid export target", () => {
            const error = expectParseError("export 42");
            expect(error.message).toContain("Expected declaration keyword");
        });
    });

    describe("syntax errors - type expressions", () => {
        it("reports error for incomplete type", () => {
            const error = expectParseError("type Box<T =");
            expect(error.message).toContain("Expected");
        });

        it("reports error for missing type after colon in record", () => {
            const error = expectParseError("type Point = { x: }");
            expect(error.message).toContain("Expected");
        });

        it("reports error for malformed type parameter list", () => {
            const error = expectParseError("type Box<<T>> = { value: T }");
            expect(error.message).toContain("Expected");
        });
    });

    describe("error location information", () => {
        it("includes file name in error", () => {
            const error = expectParseError("let x = then");
            expect(error.location!.file).toBe("test.vf");
        });

        it("includes line number in error", () => {
            const error = expectParseError("let x = 1\nlet y = then");
            expect(error.location!.line).toBe(2);
        });

        it("includes column information", () => {
            const error = expectParseError("let x = then");
            expect(error.location!.column).toBeGreaterThan(0);
        });
    });

    describe("helpful error messages", () => {
        it("provides helpful message for unexpected keyword", () => {
            const error = expectParseError("let x = then");
            expect(error.message).toContain("Unexpected");
        });

        it("provides context for missing operator", () => {
            const error = expectParseError("let x = 1 2");
            expect(error.message).toContain("Expected");
        });

        it("error message is human-readable", () => {
            const error = expectParseError("let x = then");
            const errorStr = error.toString();
            expect(errorStr.length).toBeGreaterThan(10);
            expect(errorStr).toContain("Unexpected");
        });
    });

    describe("complex error scenarios", () => {
        it("reports error in nested expression", () => {
            const error = expectParseError("let x = (1 + (2 * else))");
            expect(error.message).toContain("Unexpected");
        });

        it("reports error in match case body", () => {
            const error = expectParseError("let x = match y { | Some(v) => then }");
            expect(error.message).toContain("Unexpected");
        });

        it("reports error in function call arguments", () => {
            const error = expectParseError("let x = foo(1, 2, else)");
            expect(error.message).toContain("Unexpected");
        });

        it("reports error for incomplete binary operation in complex context", () => {
            const error = expectParseError("let x = match y { | Some(v) => 1 + }");
            expect(error.message).toContain("Expected");
        });
    });
});
