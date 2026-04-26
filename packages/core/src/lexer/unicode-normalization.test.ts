/**
 * Tests for Unicode NFC normalization in the lexer
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { stringContentArb } from "../types/test-arbitraries/index.js";
import { Lexer } from "./lexer.js";

describe("Lexer - Unicode NFC Normalization for Identifiers", () => {
    it("should normalize composed vs decomposed é (café)", () => {
        // Composed: café using U+00E9 (single character é)
        const composed = "caf\u00E9";
        // Decomposed: café using U+0065 U+0301 (e + combining acute accent)
        const decomposed = "cafe\u0301";

        const lexer1 = new Lexer(composed, "test.vf");
        const lexer2 = new Lexer(decomposed, "test.vf");

        const tokens1 = lexer1.tokenize();
        const tokens2 = lexer2.tokenize();

        // Both should produce the same normalized identifier
        expect(tokens1[0]).toMatchObject({
            type: "IDENTIFIER",
            value: "café",
        });
        expect(tokens2[0]).toMatchObject({
            type: "IDENTIFIER",
            value: "café",
        });

        // Verify they're identical after normalization
        expect(tokens1[0]!.value).toBe(tokens2[0]!.value);
    });

    it("should normalize composed vs decomposed ñ (mañana)", () => {
        // Composed: ñ using U+00F1
        const composed = "ma\u00F1ana";
        // Decomposed: ñ using U+006E U+0303 (n + combining tilde)
        const decomposed = "man\u0303ana";

        const lexer1 = new Lexer(composed, "test.vf");
        const lexer2 = new Lexer(decomposed, "test.vf");

        const tokens1 = lexer1.tokenize();
        const tokens2 = lexer2.tokenize();

        expect(tokens1[0]!.value).toBe(tokens2[0]!.value);
        expect(tokens1[0]!.value).toBe("mañana");
    });

    it("should normalize composed vs decomposed ü (schön)", () => {
        // Composed: ü using U+00FC
        const composed = "sch\u00F6n";
        // Decomposed: ü using U+006F U+0308 (o + combining diaeresis)
        const decomposed = "scho\u0308n";

        const lexer1 = new Lexer(composed, "test.vf");
        const lexer2 = new Lexer(decomposed, "test.vf");

        const tokens1 = lexer1.tokenize();
        const tokens2 = lexer2.tokenize();

        expect(tokens1[0]!.value).toBe(tokens2[0]!.value);
        expect(tokens1[0]!.value).toBe("schön");
    });

    it("should normalize multiple accented characters", () => {
        // naïve: i with diaeresis
        // Composed: ï using U+00EF
        const composed = "na\u00EFve";
        // Decomposed: ï using U+0069 U+0308 (i + combining diaeresis)
        const decomposed = "nai\u0308ve";

        const lexer1 = new Lexer(composed, "test.vf");
        const lexer2 = new Lexer(decomposed, "test.vf");

        const tokens1 = lexer1.tokenize();
        const tokens2 = lexer2.tokenize();

        expect(tokens1[0]!.value).toBe(tokens2[0]!.value);
        expect(tokens1[0]!.value).toBe("naïve");
    });

    it("should normalize identifiers in expressions", () => {
        // let café = 42
        const composed = "let caf\u00E9 = 42";
        const decomposed = "let cafe\u0301 = 42";

        const lexer1 = new Lexer(composed, "test.vf");
        const lexer2 = new Lexer(decomposed, "test.vf");

        const tokens1 = lexer1.tokenize();
        const tokens2 = lexer2.tokenize();

        // Find the identifier token (skip 'let' keyword)
        const id1 = tokens1.find((t) => t.type === "IDENTIFIER");
        const id2 = tokens2.find((t) => t.type === "IDENTIFIER");

        expect(id1).toBeDefined();
        expect(id2).toBeDefined();
        expect(id1!.value).toBe(id2!.value);
        expect(id1!.value).toBe("café");
    });

    it("should handle ASCII identifiers without normalization overhead", () => {
        // ASCII identifiers should pass through unchanged
        const lexer = new Lexer("helloWorld", "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]).toMatchObject({
            type: "IDENTIFIER",
            value: "helloWorld",
        });
    });
});

describe("Lexer - Unicode NFC Normalization for Strings", () => {
    it("should normalize composed vs decomposed é in string literals", () => {
        // Composed
        const composed = '"caf\u00E9"';
        // Decomposed
        const decomposed = '"cafe\u0301"';

        const lexer1 = new Lexer(composed, "test.vf");
        const lexer2 = new Lexer(decomposed, "test.vf");

        const tokens1 = lexer1.tokenize();
        const tokens2 = lexer2.tokenize();

        expect(tokens1[0]).toMatchObject({
            type: "STRING_LITERAL",
            value: "café",
        });
        expect(tokens2[0]).toMatchObject({
            type: "STRING_LITERAL",
            value: "café",
        });

        // Verify they're identical after normalization
        expect(tokens1[0]!.value).toBe(tokens2[0]!.value);
    });

    it("should normalize strings with multiple accented characters", () => {
        // "Zürich naïve café"
        const composed = '"Z\u00FCrich na\u00EFve caf\u00E9"';
        const decomposed = '"Zu\u0308rich nai\u0308ve cafe\u0301"';

        const lexer1 = new Lexer(composed, "test.vf");
        const lexer2 = new Lexer(decomposed, "test.vf");

        const tokens1 = lexer1.tokenize();
        const tokens2 = lexer2.tokenize();

        expect(tokens1[0]!.value).toBe(tokens2[0]!.value);
        expect(tokens1[0]!.value).toBe("Zürich naïve café");
    });

    it("should normalize multi-line strings", () => {
        // Multi-line string with accented characters
        const composed = '"""caf\u00E9\nmañana"""';
        const decomposed = '"""cafe\u0301\nman\u0303ana"""';

        const lexer1 = new Lexer(composed, "test.vf");
        const lexer2 = new Lexer(decomposed, "test.vf");

        const tokens1 = lexer1.tokenize();
        const tokens2 = lexer2.tokenize();

        expect(tokens1[0]!.value).toBe(tokens2[0]!.value);
        expect(tokens1[0]!.value).toBe("café\nmañana");
    });

    it("should handle strings with escape sequences and Unicode", () => {
        // String with both escape sequences and Unicode
        const composed = '"Hello\\ncaf\u00E9"';
        const decomposed = '"Hello\\ncafe\u0301"';

        const lexer1 = new Lexer(composed, "test.vf");
        const lexer2 = new Lexer(decomposed, "test.vf");

        const tokens1 = lexer1.tokenize();
        const tokens2 = lexer2.tokenize();

        expect(tokens1[0]!.value).toBe(tokens2[0]!.value);
        expect(tokens1[0]!.value).toBe("Hello\ncafé");
    });

    it("should normalize Unicode escape sequences in strings", () => {
        // String using Unicode escape sequences
        const escapeSeq = '"caf\\u00E9"'; // \u00E9 is composed é
        const decomposed = '"cafe\u0301"'; // Decomposed é

        const lexer1 = new Lexer(escapeSeq, "test.vf");
        const lexer2 = new Lexer(decomposed, "test.vf");

        const tokens1 = lexer1.tokenize();
        const tokens2 = lexer2.tokenize();

        // After escape processing and normalization, should be identical
        expect(tokens1[0]!.value).toBe("café");
        expect(tokens2[0]!.value).toBe("café");
        expect(tokens1[0]!.value).toBe(tokens2[0]!.value);
    });

    it("should handle ASCII strings without normalization overhead", () => {
        const lexer = new Lexer('"Hello World"', "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]).toMatchObject({
            type: "STRING_LITERAL",
            value: "Hello World",
        });
    });
});

describe("Lexer - Unicode Normalization Edge Cases", () => {
    it("should normalize combining characters in various positions", () => {
        // Test multiple combining characters
        const lexer = new Lexer("e\u0301\u0302", "test.vf"); // e + acute + circumflex
        const tokens = lexer.tokenize();

        expect(tokens[0]).toMatchObject({
            type: "IDENTIFIER",
        });
        // After NFC normalization, the value should be consistent
        expect(typeof tokens[0]!.value).toBe("string");
    });

    it("should preserve emoji and other Unicode characters", () => {
        // Emoji should pass through unchanged (they're already in NFC form)
        const lexer = new Lexer('"Hello 👋 World 🌍"', "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]).toMatchObject({
            type: "STRING_LITERAL",
            value: "Hello 👋 World 🌍",
        });
    });

    it("should handle Greek letters with diacritics", () => {
        // Greek letter with diacritic
        // Composed: ά (alpha with tonos) U+03AC
        const composed = "\u03AC"; // Greek small letter alpha with tonos
        // Note: Greek letters typically don't have a separate decomposed form in common use
        // but we test that normalization doesn't break them

        const lexer = new Lexer(composed, "test.vf");
        const tokens = lexer.tokenize();

        expect(tokens[0]).toMatchObject({
            type: "IDENTIFIER",
            value: "ά",
        });
    });
});

describe("Lexer - Unicode normalization properties", () => {
    it("property: NFC and NFD forms of the same string lex to the same STRING_LITERAL value", () => {
        fc.assert(
            fc.property(stringContentArb, (s) => {
                const nfc = s.normalize("NFC");
                const nfd = s.normalize("NFD");
                const a = new Lexer(JSON.stringify(nfc), "prop.vf").tokenize();
                const b = new Lexer(JSON.stringify(nfd), "prop.vf").tokenize();
                if (a[0]?.type !== "STRING_LITERAL" || b[0]?.type !== "STRING_LITERAL") return false;
                return a[0].value === b[0].value && a[0].value === nfc;
            }),
        );
    });

    it("property: lexed STRING_LITERAL values are always in NFC form", () => {
        fc.assert(
            fc.property(stringContentArb, (s) => {
                const tokens = new Lexer(JSON.stringify(s), "prop.vf").tokenize();
                const t = tokens[0];
                if (t?.type !== "STRING_LITERAL") return false;
                return t.value === t.value.normalize("NFC");
            }),
        );
    });
});
