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

    describe("unclosed delimiters (Phase 4.2)", () => {
        it("reports error for mismatched braces", () => {
            const error = expectParseError("let x = }");
            expect(error.message).toBeDefined();
            expect(error.message.length).toBeGreaterThan(0);
        });

        it("reports error for unexpected closing bracket", () => {
            const error = expectParseError("let x = ]");
            expect(error.message).toBeDefined();
            expect(error.message.length).toBeGreaterThan(0);
        });
    });

    describe("missing keywords (Phase 4.2)", () => {
        it("reports error for unexpected keyword", () => {
            const error = expectParseError("let x = then");
            expect(error.message).toBeDefined();
            expect(error.message.length).toBeGreaterThan(0);
        });

        it("reports error for invalid use of else", () => {
            const error = expectParseError("let x = else");
            expect(error.message).toBeDefined();
            expect(error.message.length).toBeGreaterThan(0);
        });
    });

    describe("invalid syntax (Phase 4.2)", () => {
        it("reports error for incomplete expression after operator", () => {
            const error = expectParseError("let x = 1 + else");
            expect(error.message).toBeDefined();
            expect(error.message.length).toBeGreaterThan(0);
        });

        it("reports error for invalid operand", () => {
            const error = expectParseError("let x = 1 * then");
            expect(error.message).toBeDefined();
            expect(error.message.length).toBeGreaterThan(0);
        });
    });

    describe("mismatched delimiters (Phase 4.2)", () => {
        it("reports error for bracket-brace mismatch", () => {
            const error = expectParseError("let x = { x: [1, 2 }");
            expect(error.message).toBeDefined();
            expect(error.message.length).toBeGreaterThan(0);
        });

        it("reports error for paren-bracket mismatch", () => {
            const error = expectParseError("let x = (a + [b)]");
            expect(error.message).toBeDefined();
            expect(error.message.length).toBeGreaterThan(0);
        });
    });

    describe("missing separators (Phase 4.2)", () => {
        it("reports error for missing comma in list", () => {
            const error = expectParseError("let x = [1 2 3]");
            expect(error.message).toBeDefined();
            expect(error.message.length).toBeGreaterThan(0);
        });

        it("reports error for missing comma in record", () => {
            const error = expectParseError("let x = { x: 1 y: 2 }");
            expect(error.message).toBeDefined();
            expect(error.message.length).toBeGreaterThan(0);
        });

        it("reports error for missing statement separator", () => {
            const error = expectParseError("let x = { let y = 1 let z = 2; z }");
            expect(error.message).toBeDefined();
            expect(error.message.length).toBeGreaterThan(0);
        });
    });

    describe("invalid pattern syntax (Phase 4.2)", () => {
        it("reports error for invalid pattern", () => {
            const error = expectParseError("let x = match y { | + => 0 }");
            expect(error.message).toBeDefined();
            expect(error.message.length).toBeGreaterThan(0);
        });
    });

    describe("type syntax errors (Phase 4.2)", () => {
        it("reports error for invalid type expression", () => {
            const error = expectParseError("type Point = { x: }");
            expect(error.message).toBeDefined();
            expect(error.message.length).toBeGreaterThan(0);
        });
    });

    describe("spread syntax errors (Phase 4.2)", () => {
        it("reports error for empty spread in record", () => {
            const error = expectParseError("let x = {...}");
            expect(error.message).toBeDefined();
            expect(error.message.length).toBeGreaterThan(0);
        });

        it("reports error for empty spread in list", () => {
            const error = expectParseError("let x = [...]");
            expect(error.message).toBeDefined();
            expect(error.message.length).toBeGreaterThan(0);
        });

        it("reports error for malformed record spread", () => {
            const error = expectParseError("let x = {..., y: 1}");
            expect(error.message).toBeDefined();
            expect(error.message.length).toBeGreaterThan(0);
        });
    });

    describe("error message quality (Phase 4.2)", () => {
        it("provides clear message with location for simple errors", () => {
            const error = expectParseError("let x = }");
            expect(error.message).toBeDefined();
            expect(error.location).toBeDefined();
            expect(error.location!.line).toBe(1);
            expect(error.location!.column).toBeGreaterThan(0);
        });

        it("provides context in complex error", () => {
            const error = expectParseError("let f = (x) => { let y = x + ; y }");
            expect(error.message).toBeDefined();
            expect(error.message.length).toBeGreaterThan(5);
        });
    });
});
