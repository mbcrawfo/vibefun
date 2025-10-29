/**
 * Core parser tests - token consumption and utilities
 */

import { describe, expect, it } from "vitest";

import { Lexer } from "../lexer/lexer.js";
import { Parser } from "./parser.js";

describe("Parser - Core", () => {
    describe("construction", () => {
        it("should create a parser with tokens", () => {
            const lexer = new Lexer("42", "test.vf");
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens, "test.vf");

            expect(parser).toBeDefined();
            expect(parser.hasError()).toBe(false);
        });
    });

    describe("module parsing", () => {
        it("should parse empty module", () => {
            const lexer = new Lexer("", "test.vf");
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens, "test.vf");
            const module = parser.parse();

            expect(module).toBeDefined();
            expect(module.imports).toHaveLength(0);
            expect(module.declarations).toHaveLength(0);
        });
    });
});
