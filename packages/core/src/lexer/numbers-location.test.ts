/**
 * Tests for number literal location tracking in the Lexer
 */

import { describe, expect, it } from "vitest";

import { Lexer } from "./lexer.js";

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
