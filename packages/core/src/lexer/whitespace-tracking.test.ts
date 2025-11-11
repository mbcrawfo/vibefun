/**
 * Tests for lexer whitespace tracking
 *
 * The lexer tracks whether a token had leading whitespace, which is used
 * by the parser to distinguish between cases like:
 * - (-x) - unary negation (no space between - and x)
 * - (- x) - operator section (space between - and x)
 */

import { describe, expect, it } from "vitest";

import { Lexer } from "./lexer.js";

describe("Lexer - Whitespace Tracking", () => {
    describe("basic whitespace tracking", () => {
        it("should not set hasLeadingWhitespace on first token", () => {
            const lexer = new Lexer("let", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined();
        });

        it("should set hasLeadingWhitespace when token has leading space", () => {
            const lexer = new Lexer("let x", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined(); // 'let'
            expect(tokens[1]?.hasLeadingWhitespace).toBe(true); // 'x' has space before it
        });

        it("should not set hasLeadingWhitespace when tokens are adjacent", () => {
            const lexer = new Lexer("(x)", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined(); // '('
            expect(tokens[1]?.hasLeadingWhitespace).toBeUndefined(); // 'x' - no space
            expect(tokens[2]?.hasLeadingWhitespace).toBeUndefined(); // ')'
        });

        it("should handle multiple spaces as leading whitespace", () => {
            const lexer = new Lexer("x    y", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined(); // 'x'
            expect(tokens[1]?.hasLeadingWhitespace).toBe(true); // 'y' has spaces before it
        });

        it("should handle tabs as leading whitespace", () => {
            const lexer = new Lexer("x\ty", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined(); // 'x'
            expect(tokens[1]?.hasLeadingWhitespace).toBe(true); // 'y' has tab before it
        });

        it("should handle mixed spaces and tabs", () => {
            const lexer = new Lexer("x \t  y", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined(); // 'x'
            expect(tokens[1]?.hasLeadingWhitespace).toBe(true); // 'y' has whitespace before it
        });
    });

    describe("whitespace tracking with comments", () => {
        it("should set hasLeadingWhitespace when token follows single-line comment", () => {
            const lexer = new Lexer("x // comment\ny", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined(); // 'x'
            expect(tokens[1]?.type).toBe("NEWLINE");
            expect(tokens[2]?.hasLeadingWhitespace).toBeUndefined(); // 'y' starts new line
        });

        it("should set hasLeadingWhitespace when token follows multi-line comment", () => {
            const lexer = new Lexer("x /* comment */ y", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined(); // 'x'
            expect(tokens[1]?.hasLeadingWhitespace).toBe(true); // 'y' - comment counts as whitespace
        });

        it("should track whitespace with nested comments", () => {
            const lexer = new Lexer("a /* outer /* inner */ */ b", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined(); // 'a'
            expect(tokens[1]?.hasLeadingWhitespace).toBe(true); // 'b' - nested comment counts
        });

        it("should handle comment immediately after token", () => {
            const lexer = new Lexer("x/* no space */y", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined(); // 'x'
            expect(tokens[1]?.hasLeadingWhitespace).toBe(true); // 'y' - comment counts
        });
    });

    describe("whitespace tracking with operators", () => {
        it("should distinguish (-x) from (- x)", () => {
            const lexer1 = new Lexer("(-x)", "test.vf");
            const tokens1 = lexer1.tokenize();

            expect(tokens1[0]?.type).toBe("LPAREN");
            expect(tokens1[1]?.type).toBe("OP_MINUS");
            expect(tokens1[2]?.type).toBe("IDENTIFIER");
            expect(tokens1[2]?.hasLeadingWhitespace).toBeUndefined(); // no space

            const lexer2 = new Lexer("(- x)", "test.vf");
            const tokens2 = lexer2.tokenize();

            expect(tokens2[0]?.type).toBe("LPAREN");
            expect(tokens2[1]?.type).toBe("OP_MINUS");
            expect(tokens2[2]?.type).toBe("IDENTIFIER");
            expect(tokens2[2]?.hasLeadingWhitespace).toBe(true); // has space
        });

        it("should track whitespace for operators themselves", () => {
            const lexer = new Lexer("x + y", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined(); // 'x'
            expect(tokens[1]?.hasLeadingWhitespace).toBe(true); // '+'
            expect(tokens[2]?.hasLeadingWhitespace).toBe(true); // 'y'
        });

        it("should handle operators without spaces", () => {
            const lexer = new Lexer("x+y", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined(); // 'x'
            expect(tokens[1]?.hasLeadingWhitespace).toBeUndefined(); // '+'
            expect(tokens[2]?.hasLeadingWhitespace).toBeUndefined(); // 'y'
        });
    });

    describe("whitespace tracking with literals", () => {
        it("should track whitespace for number literals", () => {
            const lexer = new Lexer("1 2", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined(); // '1'
            expect(tokens[1]?.hasLeadingWhitespace).toBe(true); // '2'
        });

        it("should track whitespace for string literals", () => {
            const lexer = new Lexer('"hello" "world"', "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined(); // '"hello"'
            expect(tokens[1]?.hasLeadingWhitespace).toBe(true); // '"world"'
        });

        it("should track whitespace for boolean literals", () => {
            const lexer = new Lexer("true false", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined(); // 'true'
            expect(tokens[1]?.hasLeadingWhitespace).toBe(true); // 'false'
        });

        it("should handle float literals with whitespace", () => {
            const lexer = new Lexer("3.14 2.71", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined(); // '3.14'
            expect(tokens[1]?.hasLeadingWhitespace).toBe(true); // '2.71'
        });
    });

    describe("whitespace tracking with punctuation", () => {
        it("should track whitespace for parentheses", () => {
            const lexer = new Lexer("( x )", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined(); // '('
            expect(tokens[1]?.hasLeadingWhitespace).toBe(true); // 'x'
            expect(tokens[2]?.hasLeadingWhitespace).toBe(true); // ')'
        });

        it("should track whitespace for brackets", () => {
            const lexer = new Lexer("[ 1 , 2 ]", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined(); // '['
            expect(tokens[1]?.hasLeadingWhitespace).toBe(true); // '1'
            expect(tokens[2]?.hasLeadingWhitespace).toBe(true); // ','
            expect(tokens[3]?.hasLeadingWhitespace).toBe(true); // '2'
            expect(tokens[4]?.hasLeadingWhitespace).toBe(true); // ']'
        });

        it("should track whitespace for braces", () => {
            const lexer = new Lexer("{ x }", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined(); // '{'
            expect(tokens[1]?.hasLeadingWhitespace).toBe(true); // 'x'
            expect(tokens[2]?.hasLeadingWhitespace).toBe(true); // '}'
        });

        it("should handle punctuation without spaces", () => {
            const lexer = new Lexer("[1,2]", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined(); // '['
            expect(tokens[1]?.hasLeadingWhitespace).toBeUndefined(); // '1'
            expect(tokens[2]?.hasLeadingWhitespace).toBeUndefined(); // ','
            expect(tokens[3]?.hasLeadingWhitespace).toBeUndefined(); // '2'
            expect(tokens[4]?.hasLeadingWhitespace).toBeUndefined(); // ']'
        });
    });

    describe("whitespace tracking with newlines", () => {
        it("should not treat newline as leading whitespace for next line", () => {
            const lexer = new Lexer("x\ny", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined(); // 'x'
            expect(tokens[1]?.type).toBe("NEWLINE");
            expect(tokens[1]?.hasLeadingWhitespace).toBeUndefined();
            expect(tokens[2]?.hasLeadingWhitespace).toBeUndefined(); // 'y' - new line
        });

        it("should track whitespace before newline", () => {
            const lexer = new Lexer("x \n", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined(); // 'x'
            expect(tokens[1]?.type).toBe("NEWLINE");
            expect(tokens[1]?.hasLeadingWhitespace).toBe(true); // newline has space before it
        });

        it("should handle indentation on new lines", () => {
            const lexer = new Lexer("x\n  y", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined(); // 'x'
            expect(tokens[1]?.type).toBe("NEWLINE");
            expect(tokens[2]?.hasLeadingWhitespace).toBe(true); // 'y' has indentation
        });
    });

    describe("whitespace tracking with keywords", () => {
        it("should track whitespace for keywords", () => {
            const lexer = new Lexer("let x = 42", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined(); // 'let'
            expect(tokens[1]?.hasLeadingWhitespace).toBe(true); // 'x'
            expect(tokens[2]?.hasLeadingWhitespace).toBe(true); // '='
            expect(tokens[3]?.hasLeadingWhitespace).toBe(true); // '42'
        });

        it("should handle keywords without spaces", () => {
            const lexer = new Lexer("if(true)", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined(); // 'if'
            expect(tokens[1]?.hasLeadingWhitespace).toBeUndefined(); // '('
            expect(tokens[2]?.hasLeadingWhitespace).toBeUndefined(); // 'true'
            expect(tokens[3]?.hasLeadingWhitespace).toBeUndefined(); // ')'
        });
    });

    describe("whitespace tracking edge cases", () => {
        it("should handle empty input", () => {
            const lexer = new Lexer("", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.type).toBe("EOF");
            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined();
        });

        it("should handle input with only whitespace", () => {
            const lexer = new Lexer("   ", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.type).toBe("EOF");
            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined();
        });

        it("should handle carriage returns as whitespace", () => {
            const lexer = new Lexer("x\ry", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined(); // 'x'
            expect(tokens[1]?.hasLeadingWhitespace).toBe(true); // 'y' - \r is whitespace
        });

        it("should track whitespace consistently through complex expression", () => {
            const lexer = new Lexer("(x+y) * (a - b)", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.type).toBe("LPAREN"); // '('
            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined();

            expect(tokens[1]?.type).toBe("IDENTIFIER"); // 'x'
            expect(tokens[1]?.hasLeadingWhitespace).toBeUndefined();

            expect(tokens[2]?.type).toBe("OP_PLUS"); // '+'
            expect(tokens[2]?.hasLeadingWhitespace).toBeUndefined();

            expect(tokens[3]?.type).toBe("IDENTIFIER"); // 'y'
            expect(tokens[3]?.hasLeadingWhitespace).toBeUndefined();

            expect(tokens[4]?.type).toBe("RPAREN"); // ')'
            expect(tokens[4]?.hasLeadingWhitespace).toBeUndefined();

            expect(tokens[5]?.type).toBe("OP_STAR"); // '*'
            expect(tokens[5]?.hasLeadingWhitespace).toBe(true);

            expect(tokens[6]?.type).toBe("LPAREN"); // '('
            expect(tokens[6]?.hasLeadingWhitespace).toBe(true);

            expect(tokens[7]?.type).toBe("IDENTIFIER"); // 'a'
            expect(tokens[7]?.hasLeadingWhitespace).toBeUndefined();

            expect(tokens[8]?.type).toBe("OP_MINUS"); // '-'
            expect(tokens[8]?.hasLeadingWhitespace).toBe(true);

            expect(tokens[9]?.type).toBe("IDENTIFIER"); // 'b'
            expect(tokens[9]?.hasLeadingWhitespace).toBe(true);

            expect(tokens[10]?.type).toBe("RPAREN"); // ')'
            expect(tokens[10]?.hasLeadingWhitespace).toBeUndefined();
        });
    });

    describe("whitespace tracking with multi-character operators", () => {
        it("should track whitespace for => operator", () => {
            const lexer = new Lexer("x => y", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined(); // 'x'
            expect(tokens[1]?.hasLeadingWhitespace).toBe(true); // '=>'
            expect(tokens[2]?.hasLeadingWhitespace).toBe(true); // 'y'
        });

        it("should track whitespace for == operator", () => {
            const lexer = new Lexer("x == y", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined(); // 'x'
            expect(tokens[1]?.hasLeadingWhitespace).toBe(true); // '=='
            expect(tokens[2]?.hasLeadingWhitespace).toBe(true); // 'y'
        });

        it("should track whitespace for |> pipe operator", () => {
            const lexer = new Lexer("x |> f", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined(); // 'x'
            expect(tokens[1]?.hasLeadingWhitespace).toBe(true); // '|>'
            expect(tokens[2]?.hasLeadingWhitespace).toBe(true); // 'f'
        });

        it("should handle :: cons operator", () => {
            const lexer = new Lexer("x :: xs", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.hasLeadingWhitespace).toBeUndefined(); // 'x'
            expect(tokens[1]?.hasLeadingWhitespace).toBe(true); // '::'
            expect(tokens[2]?.hasLeadingWhitespace).toBe(true); // 'xs'
        });
    });
});
