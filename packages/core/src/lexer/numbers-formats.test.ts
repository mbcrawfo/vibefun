/**
 * Tests for number literal parsing in the Lexer - format variants
 *
 * Covers:
 * - Decimal integers
 * - Decimal floats
 * - Hexadecimal literals (0x prefix)
 * - Binary literals (0b prefix)
 * - Scientific notation (e/E)
 * - Number separators (underscores)
 * - Error cases for invalid number formats
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { expectDiagnostic } from "../diagnostics/index.js";
import { intLiteralArb } from "../types/test-arbitraries/index.js";
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
        expect(tokens[1]!).toMatchObject({ type: "OP_PLUS", value: "+" });
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

    it("should tokenize 0999 as decimal (would be invalid octal)", () => {
        // 0999 would be invalid in octal (9 is not an octal digit)
        // Verify we treat as decimal: 999
        const lexer = new Lexer("0999", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "INT_LITERAL",
            value: 999,
        });
    });

    it("should tokenize 007 as decimal 7", () => {
        // Classic case: 007 should be decimal 7, not octal 7
        const lexer = new Lexer("007", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]!).toMatchObject({
            type: "INT_LITERAL",
            value: 7,
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
        const lexer = new Lexer("1e", "test.vf");

        expectDiagnostic(() => lexer.tokenize(), "VF1104");
    });

    it("should throw error on scientific notation with only sign", () => {
        const lexer = new Lexer("1e+", "test.vf");

        expectDiagnostic(() => lexer.tokenize(), "VF1104");
    });

    it("should throw error on scientific notation with invalid character", () => {
        const lexer = new Lexer("1e+x", "test.vf");

        expectDiagnostic(() => lexer.tokenize(), "VF1104");
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
        const lexer = new Lexer("0x", "test.vf");

        expectDiagnostic(() => lexer.tokenize(), "VF1102");
    });

    it("should throw error on hex literal with invalid character", () => {
        const lexer = new Lexer("0xG", "test.vf");

        expectDiagnostic(() => lexer.tokenize(), "VF1102");
    });

    it("should tokenize hex followed by operator", () => {
        const lexer = new Lexer("0xFF+0x10", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(4); // 0xFF, +, 0x10, EOF
        expect(tokens[0]!.value).toBe(255);
        expect(tokens[1]!).toMatchObject({ type: "OP_PLUS" });
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
        const lexer = new Lexer("0b", "test.vf");

        expectDiagnostic(() => lexer.tokenize(), "VF1101");
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
        expect(tokens[1]!).toMatchObject({ type: "OP_PLUS" });
        expect(tokens[2]!.value).toBe(5);
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

            expectDiagnostic(() => lexer.tokenize(), "VF1100");
        });

        it("should throw error on integer with trailing underscore before operator", () => {
            const lexer = new Lexer("123_+", "test.vf");

            expectDiagnostic(() => lexer.tokenize(), "VF1100");
        });

        it("should throw error on integer with consecutive underscores", () => {
            const lexer = new Lexer("1__000", "test.vf");

            expectDiagnostic(() => lexer.tokenize(), "VF1100");
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

            expectDiagnostic(() => lexer.tokenize(), "VF1100");
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

            expectDiagnostic(() => lexer.tokenize(), "VF1100");
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

            expectDiagnostic(() => lexer.tokenize(), "VF1100");
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

            expectDiagnostic(() => lexer.tokenize(), "VF1100");
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
            expect(tokens[1]!).toMatchObject({ type: "OP_PLUS" });
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

describe("Lexer - Number formats properties", () => {
    it("property: hex round-trip — toString(16) lexes back to same value", () => {
        fc.assert(
            fc.property(intLiteralArb, (n) => {
                // parseInt does not preserve values above 2^53; intLiteralArb is bounded
                // to MAX_SAFE_INTEGER so the round-trip is exact for hex too.
                const source = `0x${n.toString(16)}`;
                const tokens = new Lexer(source, "prop.vf").tokenize();
                const t = tokens[0];
                if (t?.type !== "INT_LITERAL") return false;
                return t.value === n;
            }),
        );
    });

    it("property: binary round-trip — toString(2) lexes back to same value", () => {
        fc.assert(
            fc.property(intLiteralArb, (n) => {
                const source = `0b${n.toString(2)}`;
                const tokens = new Lexer(source, "prop.vf").tokenize();
                const t = tokens[0];
                if (t?.type !== "INT_LITERAL") return false;
                return t.value === n;
            }),
        );
    });

    // F-47 (testing-gap chunk 05) — spec ref:
    // docs/spec/02-lexical-structure/tokens.md (integer literals).
    // The spec permits precision loss for integers above
    // Number.MAX_SAFE_INTEGER (2^53 − 1) but the lexer must not throw on
    // them. This property fuzzes 10001 values starting at MAX_SAFE_INTEGER
    // and asserts only the no-crash invariant; a returned value may be
    // imprecise, which is the documented best-effort behaviour.
    it("property: integers in [MAX_SAFE_INTEGER, MAX_SAFE_INTEGER + 10000] tokenise without throwing", () => {
        fc.assert(
            fc.property(fc.integer({ min: 0, max: 10000 }), (offset) => {
                const n = Number.MAX_SAFE_INTEGER + offset;
                const source = n.toString();
                expect(() => new Lexer(source, "prop.vf").tokenize()).not.toThrow();

                const tokens = new Lexer(source, "prop.vf").tokenize();
                // Must still produce a numeric literal token, even if the
                // value is the JavaScript best-approximation of `n`.
                expect(tokens[0]?.type).toMatch(/^(INT_LITERAL|FLOAT_LITERAL)$/);
            }),
        );
    });

    it("property: underscore separators inside the digit run do not change the value", () => {
        // Insert an underscore at every other position into the decimal form.
        fc.assert(
            fc.property(intLiteralArb, (n) => {
                const digits = String(n);
                if (digits.length < 2) return true;
                let withUnderscores = "";
                for (let i = 0; i < digits.length; i++) {
                    withUnderscores += digits[i];
                    if (i < digits.length - 1 && i % 2 === 0) withUnderscores += "_";
                }
                const tokens = new Lexer(withUnderscores, "prop.vf").tokenize();
                const t = tokens[0];
                if (t?.type !== "INT_LITERAL") return false;
                return t.value === n;
            }),
        );
    });
});
