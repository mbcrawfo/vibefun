import { describe, expect, it } from "vitest";

import { escapeIdentifier, isReservedWord, RESERVED_WORDS } from "../reserved-words.js";

describe("Reserved Words", () => {
    describe("RESERVED_WORDS", () => {
        it("should include JavaScript keywords", () => {
            expect(RESERVED_WORDS.has("function")).toBe(true);
            expect(RESERVED_WORDS.has("class")).toBe(true);
            expect(RESERVED_WORDS.has("return")).toBe(true);
            expect(RESERVED_WORDS.has("if")).toBe(true);
            expect(RESERVED_WORDS.has("while")).toBe(true);
        });

        it("should include ES6+ keywords", () => {
            expect(RESERVED_WORDS.has("const")).toBe(true);
            expect(RESERVED_WORDS.has("let")).toBe(true);
            expect(RESERVED_WORDS.has("import")).toBe(true);
            expect(RESERVED_WORDS.has("export")).toBe(true);
            expect(RESERVED_WORDS.has("yield")).toBe(true);
        });

        it("should include strict mode reserved words", () => {
            expect(RESERVED_WORDS.has("implements")).toBe(true);
            expect(RESERVED_WORDS.has("interface")).toBe(true);
            expect(RESERVED_WORDS.has("private")).toBe(true);
            expect(RESERVED_WORDS.has("public")).toBe(true);
        });

        it("should include literal keywords", () => {
            expect(RESERVED_WORDS.has("null")).toBe(true);
            expect(RESERVED_WORDS.has("true")).toBe(true);
            expect(RESERVED_WORDS.has("false")).toBe(true);
        });

        it("should include built-in globals to avoid", () => {
            expect(RESERVED_WORDS.has("undefined")).toBe(true);
            expect(RESERVED_WORDS.has("NaN")).toBe(true);
            expect(RESERVED_WORDS.has("Infinity")).toBe(true);
            expect(RESERVED_WORDS.has("eval")).toBe(true);
            expect(RESERVED_WORDS.has("arguments")).toBe(true);
        });

        it("should not include normal identifiers", () => {
            expect(RESERVED_WORDS.has("foo")).toBe(false);
            expect(RESERVED_WORDS.has("myVariable")).toBe(false);
            expect(RESERVED_WORDS.has("x")).toBe(false);
            expect(RESERVED_WORDS.has("result")).toBe(false);
        });
    });

    describe("isReservedWord", () => {
        it("should return true for reserved words", () => {
            expect(isReservedWord("class")).toBe(true);
            expect(isReservedWord("function")).toBe(true);
            expect(isReservedWord("const")).toBe(true);
        });

        it("should return false for non-reserved words", () => {
            expect(isReservedWord("foo")).toBe(false);
            expect(isReservedWord("bar")).toBe(false);
            expect(isReservedWord("myFunction")).toBe(false);
        });

        it("should be case-sensitive", () => {
            expect(isReservedWord("Class")).toBe(false);
            expect(isReservedWord("FUNCTION")).toBe(false);
            expect(isReservedWord("Const")).toBe(false);
        });
    });

    describe("escapeIdentifier", () => {
        it("should escape reserved words with $ suffix", () => {
            expect(escapeIdentifier("class")).toBe("class$");
            expect(escapeIdentifier("function")).toBe("function$");
            expect(escapeIdentifier("const")).toBe("const$");
            expect(escapeIdentifier("let")).toBe("let$");
        });

        it("should not escape non-reserved words", () => {
            expect(escapeIdentifier("foo")).toBe("foo");
            expect(escapeIdentifier("myClass")).toBe("myClass");
            expect(escapeIdentifier("className")).toBe("className");
        });

        it("should escape all JavaScript keywords", () => {
            const keywords = [
                "break",
                "case",
                "catch",
                "continue",
                "debugger",
                "default",
                "delete",
                "do",
                "else",
                "finally",
                "for",
                "function",
                "if",
                "in",
                "instanceof",
                "new",
                "return",
                "switch",
                "this",
                "throw",
                "try",
                "typeof",
                "var",
                "void",
                "while",
                "with",
            ];

            for (const keyword of keywords) {
                expect(escapeIdentifier(keyword)).toBe(`${keyword}$`);
            }
        });

        it("should escape literal keywords", () => {
            expect(escapeIdentifier("null")).toBe("null$");
            expect(escapeIdentifier("true")).toBe("true$");
            expect(escapeIdentifier("false")).toBe("false$");
        });

        it("should escape built-in globals", () => {
            expect(escapeIdentifier("undefined")).toBe("undefined$");
            expect(escapeIdentifier("NaN")).toBe("NaN$");
            expect(escapeIdentifier("Infinity")).toBe("Infinity$");
        });

        it("should preserve words that end with $", () => {
            // Words that already end with $ are not reserved, so they pass through
            expect(escapeIdentifier("class$")).toBe("class$");
            expect(escapeIdentifier("foo$")).toBe("foo$");
        });
    });
});
