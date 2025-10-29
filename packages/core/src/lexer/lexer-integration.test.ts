/**
 * Integration tests for the lexer
 *
 * Phase 8: Integration - Test complete programs
 */

import { describe, expect, it } from "vitest";

import { Lexer } from "./lexer.js";

describe("Lexer - Integration Tests", () => {
    describe("function definitions", () => {
        it("should tokenize simple function", () => {
            const code = `let add = (x, y) => x + y`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "KEYWORD", // let
                "IDENTIFIER", // add
                "EQ", // =
                "LPAREN", // (
                "IDENTIFIER", // x
                "COMMA", // ,
                "IDENTIFIER", // y
                "RPAREN", // )
                "FAT_ARROW", // =>
                "IDENTIFIER", // x
                "PLUS", // +
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
                "EQ", // =
                "LPAREN", // (
                "IDENTIFIER", // x
                "COMMA", // ,
                "IDENTIFIER", // y
                "RPAREN", // )
                "FAT_ARROW", // =>
                "IDENTIFIER", // x
                "PLUS", // +
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
            expect(tokens.some((t) => t.type === "LT_EQ")).toBe(true);
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
                "EQ", // =
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
                "LT", // <
                "IDENTIFIER", // T
                "GT", // >
                "EQ", // =
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
            expect(tokens.some((t) => t.type === "LT")).toBe(true);
            expect(tokens.some((t) => t.type === "GT")).toBe(true);
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
                "PIPE_GT", // |>
                "IDENTIFIER", // filter
                "LPAREN", // (
                "IDENTIFIER", // pred
                "RPAREN", // )
                "PIPE_GT", // |>
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

            expect(tokens.filter((t) => t.type === "PIPE_GT").length).toBe(3);
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

    describe("complete programs", () => {
        it("should tokenize a simple program", () => {
            const code = `let main = () => {
    let x = 42
    let y = x + 1
    log(y)
}`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.type).toBe("KEYWORD");
            expect(tokens.filter((t) => t.type === "NEWLINE").length).toBeGreaterThan(0);
            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });

        it("should tokenize a program with multiple definitions", () => {
            const code = `type User = { name: String, age: Int }

let createUser = (name, age) => {
    { name: name, age: age }
}

let users = [
    createUser("Alice", 30),
    createUser("Bob", 25)
]`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "type").length).toBe(1);
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "let").length).toBe(2);
        });

        it("should tokenize a program with all token types", () => {
            const code = `// Import module
import { map, filter } from "list"

/* Type definitions */
type Option<T> = Some(T) | None

// Function with pattern matching
let unwrap = (opt) => match opt {
    | Some(x) => x
    | None => 0
}

// Main function
let main = () => {
    let numbers = [1, 2, 3, 4, 5]
    let result = numbers
        |> filter(x => x > 2)
        |> map(x => x * 2)

    log("Result: " & toString(result))
}`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Verify we have all major token types
            expect(tokens.some((t) => t.type === "KEYWORD")).toBe(true);
            expect(tokens.some((t) => t.type === "IDENTIFIER")).toBe(true);
            expect(tokens.some((t) => t.type === "STRING_LITERAL")).toBe(true);
            expect(tokens.some((t) => t.type === "INT_LITERAL")).toBe(true);
            expect(tokens.some((t) => t.type === "PIPE_GT")).toBe(true);
            expect(tokens.some((t) => t.type === "FAT_ARROW")).toBe(true);
            expect(tokens.some((t) => t.type === "NEWLINE")).toBe(true);
            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });
    });

    describe("location tracking", () => {
        it("should track locations correctly across multiple lines", () => {
            const code = `let x = 1
let y = 2`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // First 'let' is on line 1
            expect(tokens[0]?.loc.line).toBe(1);

            // Second 'let' is on line 2
            const secondLet = tokens.find((t, i) => i > 0 && t.type === "KEYWORD" && t.value === "let");
            expect(secondLet?.loc.line).toBe(2);
        });

        it("should track column positions correctly", () => {
            const code = `  let   x   =   42`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[0]?.loc.column).toBe(3); // let starts at column 3
            expect(tokens[1]?.loc.column).toBe(9); // x starts at column 9
        });

        it("should track locations in nested structures", () => {
            const code = `{
    x: 1,
    y: 2
}`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            const xToken = tokens.find((t) => t.type === "IDENTIFIER" && t.value === "x");
            const yToken = tokens.find((t) => t.type === "IDENTIFIER" && t.value === "y");

            expect(tokens[0]?.loc.line).toBe(1); // {
            expect(xToken?.loc.line).toBe(2); // x on line 2
            expect(yToken?.loc.line).toBe(3); // y on line 3
        });
    });

    describe("operator precedence scenarios", () => {
        it("should tokenize arithmetic with all operators", () => {
            const code = `1 + 2 * 3 / 4 - 5 % 6`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "INT_LITERAL",
                "PLUS",
                "INT_LITERAL",
                "STAR",
                "INT_LITERAL",
                "SLASH",
                "INT_LITERAL",
                "MINUS",
                "INT_LITERAL",
                "PERCENT",
                "INT_LITERAL",
                "EOF",
            ]);
        });

        it("should tokenize comparison operators", () => {
            const code = `a == b && c != d || e >= f && g <= h`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.some((t) => t.type === "EQ_EQ")).toBe(true);
            expect(tokens.some((t) => t.type === "BANG_EQ")).toBe(true);
            expect(tokens.some((t) => t.type === "GT_EQ")).toBe(true);
            expect(tokens.some((t) => t.type === "LT_EQ")).toBe(true);
            expect(tokens.some((t) => t.type === "AMP_AMP")).toBe(true);
            expect(tokens.some((t) => t.type === "PIPE_PIPE")).toBe(true);
        });

        it("should tokenize shift operators", () => {
            const code = `a << 2 >> 1`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.map((t) => t.type)).toEqual([
                "IDENTIFIER",
                "LT_LT",
                "INT_LITERAL",
                "GT_GT",
                "INT_LITERAL",
                "EOF",
            ]);
        });
    });

    describe("edge cases", () => {
        it("should handle empty input", () => {
            const code = ``;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens).toEqual([
                { type: "EOF", value: "", loc: { file: "test.vf", line: 1, column: 1, offset: 0 } },
            ]);
        });

        it("should handle only whitespace", () => {
            const code = `   \t\t  \n  \n  `;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Should have newlines and EOF
            expect(tokens.filter((t) => t.type === "NEWLINE").length).toBe(2);
            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });

        it("should handle only comments", () => {
            const code = `// comment 1
/* comment 2 */
// comment 3`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Should only have newlines and EOF
            expect(tokens.every((t) => t.type === "NEWLINE" || t.type === "EOF")).toBe(true);
        });

        it("should handle very long identifier", () => {
            const identifier = "a".repeat(1000);
            const code = `let ${identifier} = 1`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[1]?.type).toBe("IDENTIFIER");
            expect(tokens[1]?.value).toBe(identifier);
        });
    });

    describe("real-world examples", () => {
        it("should tokenize list operations", () => {
            const code = `let sum = (list) => list
    |> reduce((acc, x) => acc + x, 0)

let numbers = [1, 2, 3, 4, 5]
let total = sum(numbers)`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });

        it("should tokenize option handling", () => {
            const code = `let getOrElse = (opt, default) => match opt {
    | Some(value) => value
    | None => default
}

let result = getOrElse(Some(42), 0)`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });

        it("should tokenize record manipulation", () => {
            const code = `let updateAge = (user, newAge) => {
    ...user,
    age: newAge
}

let alice = { name: "Alice", age: 30 }
let olderAlice = updateAge(alice, 31)`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            expect(tokens.some((t) => t.type === "DOT_DOT_DOT")).toBe(true);
        });
    });
});
