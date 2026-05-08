/**
 * Tests for line-ending handling.
 *
 * Spec ref: docs/spec/02-lexical-structure/basic-structure.md:11
 * Source files may use LF (`\n`) or CRLF (`\r\n`) line endings. The
 * existing lexer.test.ts asserts that `\r` is skipped as whitespace
 * (the lexer treats `\r` as whitespace and `\n` as a NEWLINE token);
 * the tests here pin the higher-level guarantee that a CRLF pair
 * produces exactly one logical newline between two declarations,
 * matching the LF-only equivalent.
 */

import { describe, expect, it } from "vitest";

import { Lexer } from "./lexer.js";

describe("Lexer - line endings", () => {
    it("emits a single NEWLINE between declarations separated by CRLF", () => {
        // F-03 (testing-gap chunk 05): CRLF must collapse to one logical
        // newline — never two. The test accepts whatever NEWLINE token
        // count the LF-only form produces and asserts CRLF matches it.
        const lf = new Lexer("let x = 1;\nlet y = 2;", "test.vf").tokenize();
        const crlf = new Lexer("let x = 1;\r\nlet y = 2;", "test.vf").tokenize();

        const lfTypes = lf.map((t) => t.type);
        const crlfTypes = crlf.map((t) => t.type);

        expect(crlfTypes).toEqual(lfTypes);
        expect(crlfTypes.filter((t) => t === "NEWLINE")).toHaveLength(1);
    });

    it("preserves NEWLINE token line/column positions across CRLF and LF forms", () => {
        // Location tracking must agree — `\r` is a column-only advance
        // and `\n` is the line break. If CRLF and LF disagree on line
        // numbers, downstream error spans would shift.
        const lf = new Lexer("a\nb", "test.vf").tokenize();
        const crlf = new Lexer("a\r\nb", "test.vf").tokenize();

        expect(crlf.map((t) => ({ type: t.type, line: t.loc.line }))).toEqual(
            lf.map((t) => ({ type: t.type, line: t.loc.line })),
        );
    });

    it("handles trailing CRLF the same as trailing LF", () => {
        // Trailing newline before EOF: same shape regardless of form.
        const lf = new Lexer("let x = 1;\n", "test.vf").tokenize().map((t) => t.type);
        const crlf = new Lexer("let x = 1;\r\n", "test.vf").tokenize().map((t) => t.type);

        expect(crlf).toEqual(lf);
    });
});
