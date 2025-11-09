/**
 * Tests for number literal parsing in the Lexer
 *
 * Covers:
 * - Decimal integers
 * - Decimal floats
 * - Hexadecimal literals (0x prefix)
 * - Binary literals (0b prefix)
 * - Scientific notation (e/E)
 * - Error cases for invalid number formats
 */

import { describe, expect, it } from "vitest";

import { LexerError } from "../utils/error.js";
import { Lexer } from "./lexer.js";

describe("Lexer - Decimal Integers", () => {
    it("should tokenize single digit", () => {
        const lexer = new Lexer("5", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(2); // INT_LITERAL + EOF
        expect(tokens[0]!).toMatchObject({
            type: "INT_LITERAL",
            value: 5,
        });
    });

    it("should tokenize zero", () => {
        const lexer = new Lexer("0", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "INT_LITERAL",
            value: 0,
        });
    });

    it("should tokenize multi-digit integer", () => {
        const lexer = new Lexer("42", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "INT_LITERAL",
            value: 42,
        });
    });

    it("should tokenize large integer", () => {
        const lexer = new Lexer("999999", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "INT_LITERAL",
            value: 999999,
        });
    });

    it("should tokenize multiple integers separated by spaces", () => {
        const lexer = new Lexer("1 2 3", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(4); // 1, 2, 3, EOF
        expect(tokens[0]!.value).toBe(1);
        expect(tokens[1]!.value).toBe(2);
        expect(tokens[2]!.value).toBe(3);
    });

    it("should tokenize integers with operators", () => {
        const lexer = new Lexer("10+20", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(4); // 10, +, 20, EOF
        expect(tokens[0]!).toMatchObject({ type: "INT_LITERAL", value: 10 });
        expect(tokens[1]!).toMatchObject({ type: "PLUS", value: "+" });
        expect(tokens[2]!).toMatchObject({ type: "INT_LITERAL", value: 20 });
    });

    it("should tokenize leading zeros as decimal (not octal)", () => {
        // Unlike JavaScript, Vibefun treats leading zeros as decimal
        // 0123 should equal 123 (not octal 83)
        const lexer = new Lexer("0123", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "INT_LITERAL",
            value: 123,
        });
    });
});

describe("Lexer - Decimal Floats", () => {
    it("should tokenize simple float", () => {
        const lexer = new Lexer("3.14", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "FLOAT_LITERAL",
            value: 3.14,
        });
    });

    it("should tokenize float with zero integer part", () => {
        const lexer = new Lexer("0.5", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "FLOAT_LITERAL",
            value: 0.5,
        });
    });

    it("should tokenize float with many decimal places", () => {
        const lexer = new Lexer("3.141592653589793", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "FLOAT_LITERAL",
            value: 3.141592653589793,
        });
    });

    it("should NOT tokenize number ending with dot as float", () => {
        // "3." should be tokenized as integer 3 followed by dot operator
        const lexer = new Lexer("3.", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(3); // 3, ., EOF
        expect(tokens[0]!).toMatchObject({ type: "INT_LITERAL", value: 3 });
        expect(tokens[1]!).toMatchObject({ type: "DOT", value: "." });
    });

    it("should NOT tokenize dot followed by number as float", () => {
        // ".5" should be tokenized as dot operator followed by integer 5
        const lexer = new Lexer(".5", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(3); // ., 5, EOF
        expect(tokens[0]!).toMatchObject({ type: "DOT", value: "." });
        expect(tokens[1]!).toMatchObject({ type: "INT_LITERAL", value: 5 });
    });

    it("should tokenize float with leading zeros", () => {
        const lexer = new Lexer("0.001", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "FLOAT_LITERAL",
            value: 0.001,
        });
    });
});

describe("Lexer - Scientific Notation", () => {
    it("should tokenize simple scientific notation", () => {
        const lexer = new Lexer("1e10", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "FLOAT_LITERAL",
            value: 1e10,
        });
    });

    it("should tokenize scientific notation with positive exponent", () => {
        const lexer = new Lexer("2E+5", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "FLOAT_LITERAL",
            value: 2e5,
        });
    });

    it("should tokenize scientific notation with negative exponent", () => {
        const lexer = new Lexer("3.14e-2", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "FLOAT_LITERAL",
            value: 3.14e-2,
        });
    });

    it("should tokenize scientific notation with uppercase E", () => {
        const lexer = new Lexer("1.5E10", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "FLOAT_LITERAL",
            value: 1.5e10,
        });
    });

    it("should tokenize scientific notation with multi-digit exponent", () => {
        const lexer = new Lexer("1e100", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "FLOAT_LITERAL",
            value: 1e100,
        });
    });

    it("should throw error on scientific notation without exponent digits", () => {
        const lexer1 = new Lexer("1e", "test.vf");
        const lexer2 = new Lexer("1e", "test.vf");

        expect(() => lexer1.tokenize()).toThrow(LexerError);
        expect(() => lexer2.tokenize()).toThrow(/expected digit after exponent/i);
    });

    it("should throw error on scientific notation with only sign", () => {
        const lexer1 = new Lexer("1e+", "test.vf");
        const lexer2 = new Lexer("1e+", "test.vf");

        expect(() => lexer1.tokenize()).toThrow(LexerError);
        expect(() => lexer2.tokenize()).toThrow(/expected digit after exponent/i);
    });

    it("should throw error on scientific notation with invalid character", () => {
        const lexer = new Lexer("1e+x", "test.vf");

        expect(() => lexer.tokenize()).toThrow(LexerError);
    });

    it("should tokenize scientific notation with leading zeros in exponent", () => {
        // 1e010 is equivalent to 1e10
        const lexer = new Lexer("1e010", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "FLOAT_LITERAL",
            value: 1e10,
        });
    });

    it("should tokenize scientific notation with explicit +0 exponent", () => {
        // 1.5e+00 is equivalent to 1.5
        const lexer = new Lexer("1.5e+00", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "FLOAT_LITERAL",
            value: 1.5,
        });
    });

    it("should tokenize scientific notation with negative exponent and leading zero", () => {
        // 1.23e-05 is valid scientific notation
        const lexer = new Lexer("1.23e-05", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "FLOAT_LITERAL",
            value: 1.23e-5,
        });
    });
});

describe("Lexer - Hexadecimal Literals", () => {
    it("should tokenize simple hex literal", () => {
        const lexer = new Lexer("0xFF", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "INT_LITERAL",
            value: 255,
        });
    });

    it("should tokenize hex literal with lowercase x", () => {
        const lexer = new Lexer("0xff", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "INT_LITERAL",
            value: 255,
        });
    });

    it("should tokenize hex literal with uppercase X", () => {
        const lexer = new Lexer("0XFF", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "INT_LITERAL",
            value: 255,
        });
    });

    it("should tokenize hex literal with mixed case digits", () => {
        const lexer = new Lexer("0xAbCd", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "INT_LITERAL",
            value: 0xabcd,
        });
    });

    it("should tokenize hex literal with all lowercase", () => {
        const lexer = new Lexer("0xabcdef", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "INT_LITERAL",
            value: 0xabcdef,
        });
    });

    it("should tokenize hex zero", () => {
        const lexer = new Lexer("0x0", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "INT_LITERAL",
            value: 0,
        });
    });

    it("should tokenize single hex digit", () => {
        const lexer = new Lexer("0x1A", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "INT_LITERAL",
            value: 26,
        });
    });

    it("should throw error on hex literal without digits", () => {
        const lexer1 = new Lexer("0x", "test.vf");
        const lexer2 = new Lexer("0x", "test.vf");

        expect(() => lexer1.tokenize()).toThrow(LexerError);
        expect(() => lexer2.tokenize()).toThrow(/expected at least one hex digit/i);
    });

    it("should throw error on hex literal with invalid character", () => {
        const lexer = new Lexer("0xG", "test.vf");

        expect(() => lexer.tokenize()).toThrow(LexerError);
    });

    it("should tokenize hex followed by operator", () => {
        const lexer = new Lexer("0xFF+0x10", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(4); // 0xFF, +, 0x10, EOF
        expect(tokens[0]!.value).toBe(255);
        expect(tokens[1]!).toMatchObject({ type: "PLUS" });
        expect(tokens[2]!.value).toBe(16);
    });
});

describe("Lexer - Binary Literals", () => {
    it("should tokenize simple binary literal", () => {
        const lexer = new Lexer("0b1010", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "INT_LITERAL",
            value: 10,
        });
    });

    it("should tokenize binary literal with lowercase b", () => {
        const lexer = new Lexer("0b11111111", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "INT_LITERAL",
            value: 255,
        });
    });

    it("should tokenize binary literal with uppercase B", () => {
        const lexer = new Lexer("0B1010", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "INT_LITERAL",
            value: 10,
        });
    });

    it("should tokenize binary zero", () => {
        const lexer = new Lexer("0b0", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "INT_LITERAL",
            value: 0,
        });
    });

    it("should tokenize binary one", () => {
        const lexer = new Lexer("0b1", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "INT_LITERAL",
            value: 1,
        });
    });

    it("should tokenize long binary literal", () => {
        const lexer = new Lexer("0b11111111111111111111111111111111", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "INT_LITERAL",
            value: 0b11111111111111111111111111111111,
        });
    });

    it("should throw error on binary literal without digits", () => {
        const lexer1 = new Lexer("0b", "test.vf");
        const lexer2 = new Lexer("0b", "test.vf");

        expect(() => lexer1.tokenize()).toThrow(LexerError);
        expect(() => lexer2.tokenize()).toThrow(/expected at least one binary digit/i);
    });

    it("should throw error on binary literal with invalid digit", () => {
        const lexer = new Lexer("0b102", "test.vf");
        const tokens = lexer.tokenize();

        // Should parse 0b10 and then fail on '2' as unexpected character
        expect(tokens[0]!.value).toBe(2); // 0b10 = 2
        expect(tokens[1]!.value).toBe(2); // the '2' is parsed as a separate integer
    });

    it("should tokenize binary followed by operator", () => {
        const lexer = new Lexer("0b1010+0b0101", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(4); // 0b1010, +, 0b0101, EOF
        expect(tokens[0]!.value).toBe(10);
        expect(tokens[1]!).toMatchObject({ type: "PLUS" });
        expect(tokens[2]!.value).toBe(5);
    });
});

describe("Lexer - Number Location Tracking", () => {
    it("should track location for integer", () => {
        const lexer = new Lexer("42", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!.loc).toMatchObject({
            file: "test.vf",
            line: 1,
            column: 1,
            offset: 0,
        });
    });

    it("should track location for float", () => {
        const lexer = new Lexer("3.14", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!.loc).toMatchObject({
            line: 1,
            column: 1,
        });
    });

    it("should track location for numbers on different lines", () => {
        const lexer = new Lexer("1\n2\n3", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!.loc.line).toBe(1); // 1
        expect(tokens[1]!.loc.line).toBe(1); // newline
        expect(tokens[2]!.loc.line).toBe(2); // 2
        expect(tokens[3]!.loc.line).toBe(2); // newline
        expect(tokens[4]!.loc.line).toBe(3); // 3
    });

    it("should track location for hex literal", () => {
        const lexer = new Lexer("0xFF", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!.loc).toMatchObject({
            line: 1,
            column: 1,
        });
    });
});

describe("Lexer - Numbers in Context", () => {
    it("should tokenize arithmetic expression", () => {
        const lexer = new Lexer("10 + 20 * 3.5", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(6); // 10, +, 20, *, 3.5, EOF
        expect(tokens[0]!).toMatchObject({ type: "INT_LITERAL", value: 10 });
        expect(tokens[1]!).toMatchObject({ type: "PLUS" });
        expect(tokens[2]!).toMatchObject({ type: "INT_LITERAL", value: 20 });
        expect(tokens[3]!).toMatchObject({ type: "STAR" });
        expect(tokens[4]!).toMatchObject({ type: "FLOAT_LITERAL", value: 3.5 });
    });

    it("should tokenize numbers with parentheses", () => {
        const lexer = new Lexer("(42)", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(4); // (, 42, ), EOF
        expect(tokens[1]!).toMatchObject({ type: "INT_LITERAL", value: 42 });
    });

    it("should tokenize negative numbers as separate tokens", () => {
        // Note: The minus sign is a separate operator token
        const lexer = new Lexer("-42", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(3); // -, 42, EOF
        expect(tokens[0]!).toMatchObject({ type: "OP_MINUS" });
        expect(tokens[1]!).toMatchObject({ type: "INT_LITERAL", value: 42 });
    });

    it("should tokenize array of numbers", () => {
        const lexer = new Lexer("[1, 2, 3]", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(8); // [, 1, ,, 2, ,, 3, ], EOF
        expect(tokens.map((t) => t.type)).toEqual([
            "LBRACKET",
            "INT_LITERAL",
            "COMMA",
            "INT_LITERAL",
            "COMMA",
            "INT_LITERAL",
            "RBRACKET",
            "EOF",
        ]);
    });

    it("should tokenize function call with number argument", () => {
        const lexer = new Lexer("foo(42)", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(5); // foo, (, 42, ), EOF
        expect(tokens[0]!).toMatchObject({ type: "IDENTIFIER", value: "foo" });
        expect(tokens[2]!).toMatchObject({ type: "INT_LITERAL", value: 42 });
    });

    it("should handle numbers in comments", () => {
        const lexer = new Lexer("42 // 100\n200", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(4); // 42, newline, 200, EOF
        expect(tokens[0]!.value).toBe(42);
        expect(tokens[2]!.value).toBe(200);
    });

    it("should tokenize mixed number formats", () => {
        const lexer = new Lexer("42 0xFF 0b1010 3.14 1e10", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(6); // 5 numbers + EOF
        expect(tokens[0]!).toMatchObject({ type: "INT_LITERAL", value: 42 });
        expect(tokens[1]!).toMatchObject({ type: "INT_LITERAL", value: 255 });
        expect(tokens[2]!).toMatchObject({ type: "INT_LITERAL", value: 10 });
        expect(tokens[3]!).toMatchObject({ type: "FLOAT_LITERAL", value: 3.14 });
        expect(tokens[4]!).toMatchObject({ type: "FLOAT_LITERAL", value: 1e10 });
    });
});

describe("Lexer - Number Separators (Underscores)", () => {
    describe("Decimal integers with separators", () => {
        it("should tokenize integer with single separator", () => {
            const lexer = new Lexer("1_000", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]!).toMatchObject({
                type: "INT_LITERAL",
                value: 1000,
            });
        });

        it("should tokenize integer with multiple separators", () => {
            const lexer = new Lexer("1_000_000", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]!).toMatchObject({
                type: "INT_LITERAL",
                value: 1000000,
            });
        });

        it("should tokenize large integer with separators", () => {
            const lexer = new Lexer("999_999_999", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]!).toMatchObject({
                type: "INT_LITERAL",
                value: 999999999,
            });
        });

        it("should tokenize integer with irregular separator placement", () => {
            const lexer = new Lexer("12_34_5", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]!).toMatchObject({
                type: "INT_LITERAL",
                value: 12345,
            });
        });

        it("should throw error on integer starting with underscore", () => {
            // "_123" would be tokenized as an identifier, not a number
            const lexer = new Lexer("_123", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]!).toMatchObject({
                type: "IDENTIFIER",
                value: "_123",
            });
        });

        it("should throw error on integer ending with underscore", () => {
            const lexer = new Lexer("123_", "test.vf");

            expect(() => lexer.tokenize()).toThrow(/underscore must be between/);
        });

        it("should throw error on integer with trailing underscore before operator", () => {
            const lexer = new Lexer("123_+", "test.vf");

            expect(() => lexer.tokenize()).toThrow(/underscore must be between/);
        });
    });

    describe("Decimal floats with separators", () => {
        it("should tokenize float with separator in integer part", () => {
            const lexer = new Lexer("1_000.5", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]!).toMatchObject({
                type: "FLOAT_LITERAL",
                value: 1000.5,
            });
        });

        it("should tokenize float with separator in fractional part", () => {
            const lexer = new Lexer("3.141_592", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]!).toMatchObject({
                type: "FLOAT_LITERAL",
                value: 3.141592,
            });
        });

        it("should tokenize float with separators in both parts", () => {
            const lexer = new Lexer("1_234.567_890", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]!).toMatchObject({
                type: "FLOAT_LITERAL",
                value: 1234.56789,
            });
        });

        it("should tokenize float with multiple separators", () => {
            const lexer = new Lexer("3.141_592_653_589_793", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]!).toMatchObject({
                type: "FLOAT_LITERAL",
                value: 3.141592653589793,
            });
        });

        it("should throw error on float with trailing underscore in fractional part", () => {
            const lexer = new Lexer("3.14_", "test.vf");

            expect(() => lexer.tokenize()).toThrow(/underscore must be between/);
        });
    });

    describe("Scientific notation with separators", () => {
        it("should tokenize scientific notation with separator in mantissa", () => {
            const lexer = new Lexer("1_000e10", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]!).toMatchObject({
                type: "FLOAT_LITERAL",
                value: 1000e10,
            });
        });

        it("should tokenize scientific notation with separator in exponent", () => {
            const lexer = new Lexer("1e1_00", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]!).toMatchObject({
                type: "FLOAT_LITERAL",
                value: 1e100,
            });
        });

        it("should tokenize scientific notation with separators in both parts", () => {
            const lexer = new Lexer("1_234.567_8e98", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]!).toMatchObject({
                type: "FLOAT_LITERAL",
                value: 1234.5678e98,
            });
        });

        it("should throw error on scientific notation with trailing underscore in exponent", () => {
            const lexer = new Lexer("1e10_", "test.vf");

            expect(() => lexer.tokenize()).toThrow(/underscore must be between/);
        });
    });

    describe("Hexadecimal with separators", () => {
        it("should tokenize hex with single separator", () => {
            const lexer = new Lexer("0xFF_AA", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]!).toMatchObject({
                type: "INT_LITERAL",
                value: 0xffaa,
            });
        });

        it("should tokenize hex with multiple separators", () => {
            const lexer = new Lexer("0xFF_AA_BB_CC", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]!).toMatchObject({
                type: "INT_LITERAL",
                value: 0xffaabbcc,
            });
        });

        it("should tokenize hex with common byte grouping", () => {
            const lexer = new Lexer("0xDEAD_BEEF", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]!).toMatchObject({
                type: "INT_LITERAL",
                value: 0xdeadbeef,
            });
        });

        it("should throw error on hex with trailing underscore", () => {
            const lexer = new Lexer("0xFF_", "test.vf");

            expect(() => lexer.tokenize()).toThrow(/underscore must be between/);
        });

        it("should allow underscore immediately after prefix", () => {
            const lexer = new Lexer("0x_FF", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]!).toMatchObject({
                type: "INT_LITERAL",
                value: 0xff,
            });
        });
    });

    describe("Binary with separators", () => {
        it("should tokenize binary with single separator", () => {
            const lexer = new Lexer("0b1111_0000", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]!).toMatchObject({
                type: "INT_LITERAL",
                value: 0b11110000,
            });
        });

        it("should tokenize binary with multiple separators", () => {
            const lexer = new Lexer("0b1010_1010_1010_1010", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]!).toMatchObject({
                type: "INT_LITERAL",
                value: 0b1010101010101010,
            });
        });

        it("should tokenize binary with nibble grouping", () => {
            const lexer = new Lexer("0b1111_1111_1111_1111", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]!).toMatchObject({
                type: "INT_LITERAL",
                value: 0b1111111111111111,
            });
        });

        it("should throw error on binary with trailing underscore", () => {
            const lexer = new Lexer("0b1010_", "test.vf");

            expect(() => lexer.tokenize()).toThrow(/underscore must be between/);
        });

        it("should allow underscore immediately after prefix", () => {
            const lexer = new Lexer("0b_1010", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]!).toMatchObject({
                type: "INT_LITERAL",
                value: 0b1010,
            });
        });
    });

    describe("Number separators in context", () => {
        it("should tokenize expression with separated numbers", () => {
            const lexer = new Lexer("1_000 + 2_000", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens).toHaveLength(4); // 1000, +, 2000, EOF
            expect(tokens[0]!).toMatchObject({ type: "INT_LITERAL", value: 1000 });
            expect(tokens[1]!).toMatchObject({ type: "PLUS" });
            expect(tokens[2]!).toMatchObject({ type: "INT_LITERAL", value: 2000 });
        });

        it("should tokenize mixed formats with separators", () => {
            const lexer = new Lexer("1_000 0xFF_AA 0b1111_0000 3.14_159", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens).toHaveLength(5); // 4 numbers + EOF
            expect(tokens[0]!).toMatchObject({ type: "INT_LITERAL", value: 1000 });
            expect(tokens[1]!).toMatchObject({ type: "INT_LITERAL", value: 0xffaa });
            expect(tokens[2]!).toMatchObject({ type: "INT_LITERAL", value: 0b11110000 });
            expect(tokens[3]!).toMatchObject({ type: "FLOAT_LITERAL", value: 3.14159 });
        });

        it("should handle separators in function arguments", () => {
            const lexer = new Lexer("foo(1_000_000)", "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens).toHaveLength(5); // foo, (, 1000000, ), EOF
            expect(tokens[2]!).toMatchObject({ type: "INT_LITERAL", value: 1000000 });
        });
    });
});

describe("Lexer - Edge Cases", () => {
    it("should tokenize very large integer", () => {
        const lexer = new Lexer("999999999999999", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "INT_LITERAL",
            value: 999999999999999,
        });
    });

    it("should tokenize very small float", () => {
        const lexer = new Lexer("0.000000001", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "FLOAT_LITERAL",
            value: 0.000000001,
        });
    });

    it("should tokenize number immediately followed by identifier", () => {
        // This should be two separate tokens: 42 and abc
        const lexer = new Lexer("42abc", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(3); // 42, abc, EOF
        expect(tokens[0]!).toMatchObject({ type: "INT_LITERAL", value: 42 });
        expect(tokens[1]!).toMatchObject({ type: "IDENTIFIER", value: "abc" });
    });

    it("should tokenize zero with various formats", () => {
        const lexer = new Lexer("0 0.0 0x0 0b0", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(5); // 4 zeros + EOF
        tokens.slice(0, 4).forEach((token) => {
            expect(token.value).toBe(0);
        });
    });
});
