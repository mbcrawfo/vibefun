/**
 * Tests for comment and whitespace handling
 *
 * Phase 4: Comments & Whitespace
 */

import { describe, expect, it } from "vitest";

import { LexerError } from "../utils/index.js";
import { Lexer } from "./lexer.js";

describe("Lexer - Whitespace", () => {
    it("should skip spaces", () => {
        const lexer = new Lexer("let    x", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(3); // let, x, EOF
        expect(tokens[0]?.type).toBe("KEYWORD");
        expect(tokens[1]?.type).toBe("IDENTIFIER");
    });

    it("should skip tabs", () => {
        const lexer = new Lexer("let\t\tx", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(3); // let, x, EOF
        expect(tokens[0]?.type).toBe("KEYWORD");
        expect(tokens[1]?.type).toBe("IDENTIFIER");
    });

    it("should skip carriage returns", () => {
        const lexer = new Lexer("let\r\rx", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(3); // let, x, EOF
    });

    it("should skip mixed whitespace", () => {
        const lexer = new Lexer("let \t \r  x", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(3); // let, x, EOF
    });

    it("should preserve newlines as tokens", () => {
        const lexer = new Lexer("let\nx", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(4); // let, NEWLINE, x, EOF
        expect(tokens[0]?.type).toBe("KEYWORD");
        expect(tokens[1]?.type).toBe("NEWLINE");
        expect(tokens[2]?.type).toBe("IDENTIFIER");
    });

    it("should skip whitespace before newline", () => {
        const lexer = new Lexer("let   \n  x", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(4); // let, NEWLINE, x, EOF
        expect(tokens[0]?.type).toBe("KEYWORD");
        expect(tokens[1]?.type).toBe("NEWLINE");
        expect(tokens[2]?.type).toBe("IDENTIFIER");
    });

    it("should skip whitespace at beginning of file", () => {
        const lexer = new Lexer("   \t  let", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(2); // let, EOF
        expect(tokens[0]?.type).toBe("KEYWORD");
    });

    it("should skip whitespace at end of file", () => {
        const lexer = new Lexer("let   \t  ", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(2); // let, EOF
        expect(tokens[0]?.type).toBe("KEYWORD");
    });
});

describe("Lexer - Single-Line Comments", () => {
    it("should skip single-line comment", () => {
        const lexer = new Lexer("// comment", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(1); // EOF
        expect(tokens[0]?.type).toBe("EOF");
    });

    it("should skip comment at end of line", () => {
        const lexer = new Lexer("let x // comment", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(3); // let, x, EOF
        expect(tokens[0]?.type).toBe("KEYWORD");
        expect(tokens[1]?.type).toBe("IDENTIFIER");
    });

    it("should preserve newline after comment", () => {
        const lexer = new Lexer("let // comment\nx", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(4); // let, NEWLINE, x, EOF
        expect(tokens[0]?.type).toBe("KEYWORD");
        expect(tokens[1]?.type).toBe("NEWLINE");
        expect(tokens[2]?.type).toBe("IDENTIFIER");
    });

    it("should handle multiple single-line comments", () => {
        const lexer = new Lexer("// comment 1\n// comment 2\nlet", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(4); // NEWLINE, NEWLINE, let, EOF
        expect(tokens[0]?.type).toBe("NEWLINE");
        expect(tokens[1]?.type).toBe("NEWLINE");
        expect(tokens[2]?.type).toBe("KEYWORD");
    });

    it("should handle comment with special characters", () => {
        const lexer = new Lexer("let // /* */ ! @ # $ %", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(2); // let, EOF
    });

    it("should handle empty comment", () => {
        const lexer = new Lexer("let //\nx", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(4); // let, NEWLINE, x, EOF
    });

    it("should handle comment at EOF", () => {
        const lexer = new Lexer("let x // comment at end", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(3); // let, x, EOF
    });

    it("should not treat division as comment", () => {
        const lexer = new Lexer("x/y", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(4); // x, /, y, EOF
        expect(tokens[0]?.type).toBe("IDENTIFIER");
        expect(tokens[1]?.type).toBe("SLASH");
        expect(tokens[2]?.type).toBe("IDENTIFIER");
    });

    it("should handle whitespace before comment", () => {
        const lexer = new Lexer("let   // comment", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(2); // let, EOF
    });
});

describe("Lexer - Multi-Line Comments", () => {
    it("should skip basic multi-line comment", () => {
        const lexer = new Lexer("/* comment */", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(1); // EOF
        expect(tokens[0]?.type).toBe("EOF");
    });

    it("should skip multi-line comment between tokens", () => {
        const lexer = new Lexer("let /* comment */ x", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(3); // let, x, EOF
        expect(tokens[0]?.type).toBe("KEYWORD");
        expect(tokens[1]?.type).toBe("IDENTIFIER");
    });

    it("should handle multi-line comment spanning lines", () => {
        const lexer = new Lexer("let /*\ncomment\n*/ x", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(3); // let, x, EOF
    });

    it("should handle comment with multiple lines", () => {
        const lexer = new Lexer(
            `let /*
            line 1
            line 2
            line 3
        */ x`,
            "test.vf",
        );
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(3); // let, x, EOF
    });

    it("should handle multiple multi-line comments", () => {
        const lexer = new Lexer("/* first */ let /* second */ x", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(3); // let, x, EOF
    });

    it("should handle empty multi-line comment", () => {
        const lexer = new Lexer("let /**/ x", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(3); // let, x, EOF
    });

    it("should preserve newlines inside comment", () => {
        const lexer = new Lexer("let /* comment */ \n x", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(4); // let, NEWLINE, x, EOF
        expect(tokens[1]?.type).toBe("NEWLINE");
    });
});

describe("Lexer - Nested Multi-Line Comments", () => {
    it("should handle nested comments", () => {
        const lexer = new Lexer("let /* outer /* inner */ outer */ x", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(3); // let, x, EOF
        expect(tokens[0]?.type).toBe("KEYWORD");
        expect(tokens[1]?.type).toBe("IDENTIFIER");
    });

    it("should handle deeply nested comments", () => {
        const lexer = new Lexer("let /* 1 /* 2 /* 3 */ 2 */ 1 */ x", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(3); // let, x, EOF
    });

    it("should handle nested comment with newlines", () => {
        const lexer = new Lexer(
            `let /*
            outer
            /* inner */
            still outer
        */ x`,
            "test.vf",
        );
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(3); // let, x, EOF
    });

    it("should handle multiple nesting levels", () => {
        const lexer = new Lexer("/* a /* b /* c */ b */ a */ let", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(2); // let, EOF
    });

    it("should not confuse */ inside nested comment", () => {
        const lexer = new Lexer("let /* outer /* has */ but not done */ x", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(3); // let, x, EOF
    });

    it("should handle adjacent nested comments", () => {
        const lexer = new Lexer("let /* /* a */ */ /* /* b */ */ x", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(3); // let, x, EOF
    });
});

describe("Lexer - Comment Error Cases", () => {
    it("should throw on unterminated multi-line comment", () => {
        const lexer = new Lexer("let /* comment", "test.vf");

        expect(() => lexer.tokenize()).toThrow(LexerError);

        // Create new lexer to test error message
        const lexer2 = new Lexer("let /* unterminated", "test.vf");
        expect(() => lexer2.tokenize()).toThrow("Unterminated");
    });

    it("should throw on unterminated nested comment", () => {
        const lexer = new Lexer("let /* outer /* inner */", "test.vf");

        expect(() => lexer.tokenize()).toThrow(LexerError);
    });

    it("should throw on deeply unterminated nested comment", () => {
        const lexer = new Lexer("let /* 1 /* 2 /* 3 */ 2 */", "test.vf");

        expect(() => lexer.tokenize()).toThrow(LexerError);
    });

    it("should include location in error for unterminated comment", () => {
        const lexer = new Lexer("  /* comment", "test.vf");

        try {
            lexer.tokenize();
            expect.fail("Should have thrown an error");
        } catch (error) {
            expect(error).toBeInstanceOf(LexerError);
            const lexerError = error as LexerError;
            expect(lexerError.location).toBeDefined();
            expect(lexerError.help).toBe("Add closing */");
        }
    });

    it("should not throw on single-line comment at EOF", () => {
        const lexer = new Lexer("let // comment at end", "test.vf");

        expect(() => lexer.tokenize()).not.toThrow();
    });
});

describe("Lexer - Mixed Comments and Whitespace", () => {
    it("should handle comments with surrounding whitespace", () => {
        const lexer = new Lexer("let   /* comment */   x", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(3); // let, x, EOF
    });

    it("should handle whitespace inside comments", () => {
        const lexer = new Lexer("let /*   spaces   */ x", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(3); // let, x, EOF
    });

    it("should handle tabs and spaces with comments", () => {
        const lexer = new Lexer("let\t\t/* comment */  \t  x", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(3); // let, x, EOF
    });

    it("should handle single and multi-line comments together", () => {
        const lexer = new Lexer("let // single\n/* multi */ x", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(4); // let, NEWLINE, x, EOF
    });

    it("should handle comment at start and end", () => {
        const lexer = new Lexer("/* start */ let x // end", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(3); // let, x, EOF
    });

    it("should handle multiple comment types in expression", () => {
        const lexer = new Lexer("let /* a */ x /* b */ = /* c */ y // done", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(5); // let, x, =, y, EOF
    });
});

describe("Lexer - Comments with Code Integration", () => {
    it("should tokenize function with comments", () => {
        const code = `
            // Function to add numbers
            let add = /* inline */ (x, y) => x + y
        `;
        const lexer = new Lexer(code, "test.vf");
        const tokens = lexer.tokenize();

        // Should skip comments and parse tokens correctly
        expect(tokens.filter((t) => t.type === "KEYWORD")).toHaveLength(1);
        expect(tokens.filter((t) => t.type === "IDENTIFIER").map((t) => t.value)).toEqual(["add", "x", "y", "x", "y"]);
    });

    it("should handle documentation comment style", () => {
        const code = `
            /**
             * Documentation comment
             * with multiple lines
             */
            let value = true
        `;
        const lexer = new Lexer(code, "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens.filter((t) => t.type === "KEYWORD").length).toBe(1);
        expect(tokens.filter((t) => t.type === "IDENTIFIER").length).toBe(1);
        expect(tokens.filter((t) => t.type === "BOOL_LITERAL").length).toBe(1);
    });

    it("should handle commented-out code", () => {
        const code = `
            let x = true
            // let y = false
            /* let z = true */
            let w = false
        `;
        const lexer = new Lexer(code, "test.vf");
        const tokens = lexer.tokenize();

        const identifiers = tokens.filter((t) => t.type === "IDENTIFIER").map((t) => t.value);
        expect(identifiers).toEqual(["x", "w"]);
    });

    it("should preserve token locations with comments", () => {
        const code = "let /* comment */ x";
        const lexer = new Lexer(code, "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]?.loc.column).toBe(1); // let at column 1
        expect(tokens[1]?.loc.column).toBe(19); // x at column 19 (after comment)
    });
});
