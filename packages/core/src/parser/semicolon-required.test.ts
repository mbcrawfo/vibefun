import { describe, expect, it } from "vitest";

import { Lexer } from "../lexer/index.js";
import { ParserError } from "../utils/index.js";
import { Parser } from "./parser.js";

describe("Semicolon Requirements", () => {
    function parse(source: string) {
        const lexer = new Lexer(source, "test.vf");
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens, "test.vf");
        return parser.parse();
    }

    describe("Top-level declarations", () => {
        it("should require semicolons after let declarations", () => {
            expect(() => parse("let x = 1")).toThrow(ParserError);
            expect(() => parse("let x = 1\nlet y = 2")).toThrow(ParserError);
        });

        it("should require semicolons after type declarations", () => {
            expect(() => parse("type Point = { x: Int, y: Int }")).toThrow(ParserError);
        });

        it("should require semicolons after external declarations", () => {
            expect(() => parse('external log: (String) -> Unit = "console.log"')).toThrow(ParserError);
        });

        it("should accept semicolons at EOF", () => {
            expect(() => parse("let x = 1;")).not.toThrow();
            expect(() => parse("let x = 1;\nlet y = 2;")).not.toThrow();
        });
    });

    describe("Block expressions", () => {
        it("should require semicolons between statements", () => {
            expect(() => parse("let x = { let y = 1\ny };")).toThrow(ParserError);
            expect(() => parse("let x = { 1\n2 };")).toThrow(ParserError);
        });

        it("should accept semicolons in blocks", () => {
            expect(() => parse("let x = { let y = 1; y; };")).not.toThrow();
            expect(() => parse("let x = { 1; 2; };")).not.toThrow();
        });

        it("should accept empty blocks", () => {
            expect(() => parse("let noOp = () => {};")).not.toThrow();
        });
    });

    describe("External blocks", () => {
        it("should require semicolons between external items", () => {
            expect(() =>
                parse('external { log: (String) -> Unit = "console.log"\nerror: (String) -> Unit = "console.error" };'),
            ).toThrow(ParserError);
        });

        it("should accept semicolons in external blocks", () => {
            expect(() =>
                parse(
                    'external { log: (String) -> Unit = "console.log"; error: (String) -> Unit = "console.error"; };',
                ),
            ).not.toThrow();
        });
    });
});
