/**
 * Integration tests for the lexer - Basic syntax
 *
 * Tests for basic language syntax including functions, types,
 * pattern matching, pipes, comments, strings, and operators.
 */

import { describe, expect, it } from "vitest";

import { Lexer } from "./lexer.js";

describe("Lexer - Integration Tests - Basic Syntax", () => {
    describe("function definitions", () => {
        it("should tokenize simple function", () => {
            const code = `let add = (x, y) => x + y`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "KEYWORD", // let
                "IDENTIFIER", // add
                "OP_EQUALS", // =
                "LPAREN", // (
                "IDENTIFIER", // x
                "COMMA", // ,
                "IDENTIFIER", // y
                "RPAREN", // )
                "FAT_ARROW", // =>
                "IDENTIFIER", // x
                "OP_PLUS", // +
                "IDENTIFIER", // y
                "EOF",
            ]);
        });

        it("should tokenize function with type annotation", () => {
            const code = `let add: (Int, Int) -> Int = (x, y) => x + y`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "KEYWORD", // let
                "IDENTIFIER", // add
                "COLON", // :
                "LPAREN", // (
                "IDENTIFIER", // Int
                "COMMA", // ,
                "IDENTIFIER", // Int
                "RPAREN", // )
                "ARROW", // ->
                "IDENTIFIER", // Int
                "OP_EQUALS", // =
                "LPAREN", // (
                "IDENTIFIER", // x
                "COMMA", // ,
                "IDENTIFIER", // y
                "RPAREN", // )
                "FAT_ARROW", // =>
                "IDENTIFIER", // x
                "OP_PLUS", // +
                "IDENTIFIER", // y
                "EOF",
            ]);
        });

        it("should tokenize function definition block", () => {
            const code = `let factorial = (n) => {
    if n <= 1 {
        1
    } else {
        n * factorial(n - 1)
    }
}`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Verify key tokens
            expect(tokens[0]?.type).toBe("KEYWORD"); // let
            expect(tokens[1]?.type).toBe("IDENTIFIER"); // factorial
            expect(tokens.some((t) => t.type === "OP_LTE")).toBe(true);
        });
    });

    describe("type definitions", () => {
        it("should tokenize type alias", () => {
            const code = `type Point = { x: Float, y: Float }`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "KEYWORD", // type
                "IDENTIFIER", // Point
                "OP_EQUALS", // =
                "LBRACE", // {
                "IDENTIFIER", // x
                "COLON", // :
                "IDENTIFIER", // Float
                "COMMA", // ,
                "IDENTIFIER", // y
                "COLON", // :
                "IDENTIFIER", // Float
                "RBRACE", // }
                "EOF",
            ]);
        });

        it("should tokenize variant type", () => {
            const code = `type Option<T> = Some(T) | None`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "KEYWORD", // type
                "IDENTIFIER", // Option
                "OP_LT", // <
                "IDENTIFIER", // T
                "OP_GT", // >
                "OP_EQUALS", // =
                "IDENTIFIER", // Some
                "LPAREN", // (
                "IDENTIFIER", // T
                "RPAREN", // )
                "PIPE", // |
                "IDENTIFIER", // None
                "EOF",
            ]);
        });

        it("should tokenize complex type with generics", () => {
            const code = `type Result<T, E> = Ok(T) | Error(E)`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.type).toBe("KEYWORD"); // type
            expect(tokens.some((t) => t.type === "OP_LT")).toBe(true);
            expect(tokens.some((t) => t.type === "OP_GT")).toBe(true);
            expect(tokens.some((t) => t.type === "PIPE")).toBe(true);
        });
    });

    describe("pattern matching", () => {
        it("should tokenize match expression", () => {
            const code = `match option {
    | Some(x) => x
    | None => 0
}`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.type).toBe("KEYWORD"); // match
            expect(tokens[3]?.type).toBe("NEWLINE");
            expect(tokens[4]?.type).toBe("PIPE");
            expect(tokens[9]?.type).toBe("FAT_ARROW");
        });

        it("should tokenize nested match", () => {
            const code = `match result {
    | Ok(Some(value)) => value
    | Ok(None) => 0
    | Error(msg) => -1
}`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Verify structure
            expect(tokens[0]?.type).toBe("KEYWORD");
            expect(tokens.filter((t) => t.type === "PIPE").length).toBe(3);
            expect(tokens.filter((t) => t.type === "FAT_ARROW").length).toBe(3);
        });
    });

    describe("pipe expressions", () => {
        it("should tokenize simple pipe", () => {
            const code = `data |> filter(pred) |> map(transform)`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "IDENTIFIER", // data
                "OP_PIPE_GT", // |>
                "IDENTIFIER", // filter
                "LPAREN", // (
                "IDENTIFIER", // pred
                "RPAREN", // )
                "OP_PIPE_GT", // |>
                "IDENTIFIER", // map
                "LPAREN", // (
                "IDENTIFIER", // transform
                "RPAREN", // )
                "EOF",
            ]);
        });

        it("should tokenize multi-line pipe", () => {
            const code = `numbers
    |> filter(x => x > 0)
    |> map(x => x * 2)
    |> reduce((a, b) => a + b, 0)`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.filter((t) => t.type === "OP_PIPE_GT").length).toBe(3);
            expect(tokens.filter((t) => t.type === "FAT_ARROW").length).toBe(3);
        });
    });

    describe("mixed content", () => {
        it("should tokenize code with single-line comments", () => {
            const code = `// Calculate sum
let sum = (a, b) => a + b // Add two numbers`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Comments should be skipped, but newline after comment is preserved
            const keywordToken = tokens.find((t) => t.type === "KEYWORD");
            expect(keywordToken?.value).toBe("let");
            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });

        it("should tokenize code with multi-line comments", () => {
            const code = `/*
 * Function to calculate factorial
 * Uses recursion
 */
let factorial = (n) => {
    /* base case */
    if n <= 1 { 1 } else { n * factorial(n - 1) }
}`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Comments should be skipped, but newlines are preserved
            const keywordToken = tokens.find((t) => t.type === "KEYWORD");
            expect(keywordToken?.value).toBe("let");
            const identToken = tokens.find((t) => t.type === "IDENTIFIER");
            expect(identToken?.value).toBe("factorial");
        });

        it("should tokenize code with nested comments", () => {
            const code = `/* outer /* inner */ still in comment */ let x = 1`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.type).toBe("KEYWORD"); // let
        });

        it("should tokenize code with strings containing special chars", () => {
            const code = `let msg = "Hello, \\"world\\"!\\n"`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[3]?.type).toBe("STRING_LITERAL");
            expect(tokens[3]?.value).toBe('Hello, "world"!\n');
        });

        it("should tokenize code with multi-line strings", () => {
            const code = `let doc = """
This is a
multi-line string
with "quotes"
"""`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[3]?.type).toBe("STRING_LITERAL");
            expect(tokens[3]?.value).toContain("multi-line");
        });
    });

    describe("operator precedence scenarios", () => {
        it("should tokenize arithmetic with all operators", () => {
            const code = `1 + 2 * 3 / 4 - 5 % 6`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "INT_LITERAL",
                "OP_PLUS",
                "INT_LITERAL",
                "OP_STAR",
                "INT_LITERAL",
                "OP_SLASH",
                "INT_LITERAL",
                "OP_MINUS",
                "INT_LITERAL",
                "OP_PERCENT",
                "INT_LITERAL",
                "EOF",
            ]);
        });

        it("should tokenize comparison operators", () => {
            const code = `a == b && c != d || e >= f && g <= h`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.some((t) => t.type === "OP_EQ")).toBe(true);
            expect(tokens.some((t) => t.type === "OP_NEQ")).toBe(true);
            expect(tokens.some((t) => t.type === "OP_GTE")).toBe(true);
            expect(tokens.some((t) => t.type === "OP_LTE")).toBe(true);
            expect(tokens.some((t) => t.type === "OP_AND")).toBe(true);
            expect(tokens.some((t) => t.type === "OP_OR")).toBe(true);
        });

        it("should tokenize shift operators", () => {
            const code = `a << 2 >> 1`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "IDENTIFIER",
                "OP_LT_LT",
                "INT_LITERAL",
                "OP_GT_GT",
                "INT_LITERAL",
                "EOF",
            ]);
        });
    });
});
