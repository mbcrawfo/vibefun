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

    describe("complete module programs", () => {
        it("should tokenize module with imports and type definitions", () => {
            const code = `import { map, filter, reduce } from "list"
import { Some, None } from "option"

type User = {
    name: String,
    age: Int,
    email: String
}

type Status = Active | Inactive | Pending

let createUser = (name, age, email) => {
    name: name,
    age: age,
    email: email
}`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Verify import keywords
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "import").length).toBe(2);
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "from").length).toBe(2);

            // Verify type definitions
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "type").length).toBe(2);

            // Verify function definition
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "let").length).toBe(1);

            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });

        it("should tokenize module with exports", () => {
            const code = `type Result<T, E> = Ok(T) | Error(E)

export let unwrapOr = (result, default) => match result {
    | Ok(value) => value
    | Error(_) => default
}

export let map = (result, f) => match result {
    | Ok(value) => Ok(f(value))
    | Error(e) => Error(e)
}

export { Result, unwrapOr, map }`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Verify export keywords
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "export").length).toBe(3);

            // Verify pattern matching
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "match").length).toBe(2);

            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });

        it("should tokenize module with recursive type definitions", () => {
            const code = `type Tree<T> = Leaf(T) | Node(Tree<T>, T, Tree<T>)

type List<T> = Cons(T, List<T>) | Nil

let rec sumTree = (tree) => match tree {
    | Leaf(x) => x
    | Node(left, value, right) => sumTree(left) + value + sumTree(right)
}

let rec length = (list) => match list {
    | Cons(_, tail) => 1 + length(tail)
    | Nil => 0
}`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Verify recursive type definitions
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "type").length).toBe(2);

            // Verify recursive functions (let rec)
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "rec").length).toBe(2);

            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });

        it("should tokenize module combining imports, types, and functions", () => {
            const code = `import { log } from "console"
import { map } from "list"

type Point = { x: Float, y: Float }
type Shape = Circle(Point, Float) | Rectangle(Point, Point)

let area = (shape) => match shape {
    | Circle(_, radius) => 3.14159 * radius * radius
    | Rectangle(p1, p2) => (p2.x - p1.x) * (p2.y - p1.y)
}

let shapes = [
    Circle({ x: 0.0, y: 0.0 }, 5.0),
    Rectangle({ x: 0.0, y: 0.0 }, { x: 10.0, y: 20.0 })
]

let areas = map(shapes, area)`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Verify structure
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "import").length).toBe(2);
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "type").length).toBe(2);
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "let").length).toBe(3);
            expect(tokens.some((t) => t.type === "FLOAT_LITERAL")).toBe(true);

            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });

        it("should tokenize module with mutual recursion", () => {
            const code = `let rec isEven = (n) => {
    if n == 0 {
        true
    } else {
        isOdd(n - 1)
    }
}

let rec isOdd = (n) => {
    if n == 0 {
        false
    } else {
        isEven(n - 1)
    }
}

let numbers = [1, 2, 3, 4, 5]
let evens = numbers |> filter(isEven)`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Verify two recursive functions that call each other
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "rec").length).toBe(2);
            expect(tokens.some((t) => t.type === "IDENTIFIER" && t.value === "isEven")).toBe(true);
            expect(tokens.some((t) => t.type === "IDENTIFIER" && t.value === "isOdd")).toBe(true);

            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });

        it("should tokenize module with complex generics", () => {
            const code = `type Either<L, R> = Left(L) | Right(R)
type Pair<A, B> = { first: A, second: B }
type Triple<A, B, C> = { first: A, second: B, third: C }

let makePair = (a, b) => { first: a, second: b }

let swapPair = (pair) => {
    first: pair.second,
    second: pair.first
}

let result: Either<String, Int> = Right(42)`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Verify generic type parameters
            expect(tokens.filter((t) => t.type === "LT").length).toBeGreaterThan(3);
            expect(tokens.filter((t) => t.type === "GT").length).toBeGreaterThan(3);

            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });
    });

    describe("external blocks with usage", () => {
        it("should tokenize external declarations with unsafe usage", () => {
            const code = `external log: (String) -> Unit = "console.log"
external error: (String) -> Unit = "console.error"

let main = () => {
    unsafe {
        log("Starting program")
        error("This is an error")
    }
}`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Verify external declarations
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "external").length).toBe(2);

            // Verify unsafe block
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "unsafe").length).toBe(1);

            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });

        it("should tokenize external block syntax", () => {
            const code = `external from "react" {
    useState: (a) -> (a, (a) -> Unit) = "useState"
    useEffect: ((Unit) -> Unit) -> Unit = "useEffect"
    createElement: (String, a, b) -> c = "createElement"
}

unsafe {
    let [count, setCount] = useState(0)
    useEffect(() => log("Count changed"))
}`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Verify external from block
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "external").length).toBe(1);
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "from").length).toBe(1);

            // Verify string literal for module name
            expect(tokens.some((t) => t.type === "STRING_LITERAL" && t.value === "react")).toBe(true);

            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });

        it("should tokenize multiple external blocks from different modules", () => {
            const code = `external from "fs" {
    readFile: (String, (String) -> Unit) -> Unit = "readFile"
    writeFile: (String, String) -> Unit = "writeFile"
}

external from "path" {
    join: (String, String) -> String = "join"
    basename: (String) -> String = "basename"
}

let processFile = (filename) => {
    unsafe {
        let path = join("/data", filename)
        readFile(path, (content) => {
            log(content)
        })
    }
}`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Verify multiple external blocks
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "external").length).toBe(2);
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "from").length).toBe(2);

            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });

        it("should tokenize overloaded external functions", () => {
            const code = `external fetch: (String) -> Promise<Response> = "fetch"
external fetch: (String, RequestInit) -> Promise<Response> = "fetch"

external setTimeout: ((Unit) -> Unit, Int) -> Int = "setTimeout"
external setTimeout: (String, Int) -> Int = "setTimeout"

unsafe {
    fetch("https://api.example.com")
    fetch("https://api.example.com", { method: "POST" })
    setTimeout(() => log("done"), 1000)
}`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Verify overloaded externals (same name declared multiple times)
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "external").length).toBe(4);

            // Verify fetch and setTimeout appear multiple times
            const fetchTokens = tokens.filter((t) => t.type === "IDENTIFIER" && t.value === "fetch");
            const setTimeoutTokens = tokens.filter((t) => t.type === "IDENTIFIER" && t.value === "setTimeout");
            expect(fetchTokens.length).toBeGreaterThan(2);
            expect(setTimeoutTokens.length).toBeGreaterThan(2);

            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });
    });

    describe("mutable references", () => {
        it("should tokenize ref creation and dereference", () => {
            const code = `let counter = ref(0)
let value = !counter
log(value)`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Verify identifiers for ref function
            expect(tokens.filter((t) => t.type === "IDENTIFIER").length).toBeGreaterThan(3);

            // Verify dereference operator
            expect(tokens.filter((t) => t.type === "BANG").length).toBe(1);

            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });

        it("should tokenize ref assignment", () => {
            const code = `let x = ref(10)
x := 20
x := !x + 1
let final = !x`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Verify assignment operator
            expect(tokens.filter((t) => t.type === "COLON_EQ").length).toBe(2);

            // Verify dereference operators
            expect(tokens.filter((t) => t.type === "BANG").length).toBe(2);

            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });

        it("should tokenize mutable refs in function bodies", () => {
            const code = `let factorial = (n) => {
    let result = ref(1)
    let i = ref(1)

    while !i <= n {
        result := !result * !i
        i := !i + 1
    }

    !result
}`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Verify identifiers present (including ref)
            expect(tokens.filter((t) => t.type === "IDENTIFIER").length).toBeGreaterThan(5);

            // Verify assignment operators
            expect(tokens.filter((t) => t.type === "COLON_EQ").length).toBe(2);

            // Verify dereference operators
            expect(tokens.filter((t) => t.type === "BANG").length).toBeGreaterThan(3);

            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });

        it("should tokenize complex ref expressions with pattern matching", () => {
            const code = `let state = ref(Some(42))

let update = (newValue) => {
    state := Some(newValue)
}

let get = () => match !state {
    | Some(x) => x
    | None => 0
}

update(100)
let value = get()`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Verify identifiers, assignment, and dereference
            expect(tokens.filter((t) => t.type === "IDENTIFIER").length).toBeGreaterThan(8);
            expect(tokens.filter((t) => t.type === "COLON_EQ").length).toBe(1);
            expect(tokens.filter((t) => t.type === "BANG").length).toBe(1);

            // Verify pattern matching
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "match").length).toBe(1);

            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });
    });

    describe("complex pattern matching", () => {
        it("should tokenize nested patterns", () => {
            const code = `let unwrapNested = (value) => match value {
    | Ok(Some(x)) => x
    | Ok(None) => 0
    | Error(Some(msg)) => -1
    | Error(None) => -2
}`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Verify nested constructor patterns
            expect(tokens.filter((t) => t.type === "LPAREN").length).toBeGreaterThan(4);
            expect(tokens.filter((t) => t.type === "PIPE").length).toBe(4);

            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });

        it("should tokenize pattern matching with guards", () => {
            const code = `let classify = (x) => match x {
    | n when n < 0 => "negative"
    | 0 => "zero"
    | n when n > 0 && n < 10 => "small"
    | n when n >= 10 => "large"
}`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Verify when clauses
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "when").length).toBe(3);

            // Verify comparison operators in guards
            expect(tokens.some((t) => t.type === "LT")).toBe(true);
            expect(tokens.some((t) => t.type === "GT")).toBe(true);
            expect(tokens.some((t) => t.type === "GT_EQ")).toBe(true);

            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });

        it("should tokenize multiple match expressions in sequence", () => {
            const code = `let process = (a, b) => {
    let resultA = match a {
        | Some(x) => x
        | None => 0
    }

    let resultB = match b {
        | Ok(y) => y
        | Error(_) => 0
    }

    match (resultA, resultB) {
        | (0, 0) => "both empty"
        | (x, 0) => "first: " & toString(x)
        | (0, y) => "second: " & toString(y)
        | (x, y) => "both: " & toString(x + y)
    }
}`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Verify three match expressions
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "match").length).toBe(3);

            // Verify tuple patterns
            expect(tokens.filter((t) => t.type === "LPAREN").length).toBeGreaterThan(6);

            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });

        it("should tokenize deep pattern nesting with various constructors", () => {
            const code = `type Tree<T> = Leaf(T) | Node(Tree<T>, T, Tree<T>)

let findDeep = (tree) => match tree {
    | Leaf(x) => Some(x)
    | Node(Leaf(x), _, _) => Some(x)
    | Node(_, _, Leaf(x)) => Some(x)
    | Node(Node(Leaf(x), _, _), _, _) => Some(x)
    | Node(_, _, Node(_, _, Leaf(x))) => Some(x)
    | _ => None
}`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Verify deeply nested patterns
            expect(tokens.filter((t) => t.type === "LPAREN").length).toBeGreaterThan(15);
            expect(tokens.filter((t) => t.type === "PIPE").length).toBeGreaterThan(6);

            // Verify wildcard patterns
            expect(tokens.filter((t) => t.type === "IDENTIFIER" && t.value === "_").length).toBeGreaterThan(5);

            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });
    });

    describe("multi-feature combinations", () => {
        it("should tokenize types with pattern matching and pipes", () => {
            const code = `type Option<T> = Some(T) | None

let map = (opt, f) => match opt {
    | Some(x) => Some(f(x))
    | None => None
}

let numbers = [Some(1), None, Some(3), Some(4)]
let doubled = numbers
    |> map(opt => map(opt, x => x * 2))
    |> filter(opt => match opt {
        | Some(_) => true
        | None => false
    })`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Verify type definition
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "type").length).toBe(1);

            // Verify pattern matching
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "match").length).toBe(2);

            // Verify pipe operators
            expect(tokens.filter((t) => t.type === "PIPE_GT").length).toBe(2);

            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });

        it("should tokenize recursive functions with refs and conditionals", () => {
            const code = `let rec fibonacci = (n, memo) => {
    if n <= 1 {
        n
    } else {
        let cached = !memo
        match cached {
            | Some(value) => value
            | None => {
                let result = fibonacci(n - 1, ref(None)) + fibonacci(n - 2, ref(None))
                memo := Some(result)
                result
            }
        }
    }
}

let fib10 = fibonacci(10, ref(None))`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Verify recursive function
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "rec").length).toBe(1);

            // Verify identifiers and ref assignment operator
            expect(tokens.filter((t) => t.type === "IDENTIFIER").length).toBeGreaterThan(10);
            expect(tokens.filter((t) => t.type === "COLON_EQ").length).toBe(1);

            // Verify conditionals
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "if").length).toBe(1);

            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });

        it("should tokenize external declarations with unsafe blocks and error handling", () => {
            const code = `external from "fs" {
    readFile: (String, (String) -> Unit) -> Unit = "readFile"
}

type FileResult = Success(String) | Failure(String)

let safeReadFile = (path) => {
    let result = ref(Failure("not read yet"))

    unsafe {
        readFile(path, (content) => {
            result := Success(content)
        })
    }

    !result
}

let content = safeReadFile("data.txt")
match content {
    | Success(text) => log(text)
    | Failure(err) => error(err)
}`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Verify external declaration
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "external").length).toBe(1);

            // Verify unsafe block
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "unsafe").length).toBe(1);

            // Verify type definition and pattern matching
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "type").length).toBe(1);
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "match").length).toBe(1);

            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });

        it("should tokenize complete program with imports, types, functions, and pipes", () => {
            const code = `import { map, filter, reduce } from "list"
import { log } from "console"

type User = { name: String, age: Int, active: Bool }
type UserStatus = Active | Inactive

let isActive = (user) => user.active

let getActiveUsers = (users) => users
    |> filter(isActive)
    |> map(user => user.name)

let users = [
    { name: "Alice", age: 30, active: true },
    { name: "Bob", age: 25, active: false },
    { name: "Charlie", age: 35, active: true }
]

let activeNames = getActiveUsers(users)

unsafe {
    log("Active users: " & toString(activeNames))
}`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Verify imports
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "import").length).toBe(2);

            // Verify types
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "type").length).toBe(2);

            // Verify pipes
            expect(tokens.filter((t) => t.type === "PIPE_GT").length).toBe(2);

            // Verify unsafe block
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "unsafe").length).toBe(1);

            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });

        it("should tokenize list processing pipeline with type definitions", () => {
            const code = `type Result<T, E> = Ok(T) | Error(E)

let divide = (a, b) => {
    if b == 0 {
        Error("division by zero")
    } else {
        Ok(a / b)
    }
}

let processNumbers = (nums) => {
    nums
        |> map(n => divide(n, 2))
        |> filter(r => match r {
            | Ok(_) => true
            | Error(_) => false
        })
        |> map(r => match r {
            | Ok(value) => value
            | Error(_) => 0
        })
        |> reduce((acc, x) => acc + x, 0)
}

let numbers = [10, 20, 0, 30, 40]
let result = processNumbers(numbers)`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Verify type definition
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "type").length).toBe(1);

            // Verify pipes
            expect(tokens.filter((t) => t.type === "PIPE_GT").length).toBe(4);

            // Verify pattern matching
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "match").length).toBe(2);

            // Verify division and comparison
            expect(tokens.some((t) => t.type === "SLASH")).toBe(true);
            expect(tokens.some((t) => t.type === "EQ_EQ")).toBe(true);

            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });

        it("should tokenize complex nested expressions with all operators", () => {
            const code = `let compute = (a, b, c) => {
    let x = (a + b) * c - (a / b) % c
    let y = a << 2 >> 1 & 0xFF
    let z = a == b || c != 0 && a >= b || b <= c
    let w = [1, 2, 3] |> map(n => n * 2) |> reduce((acc, x) => acc + x, 0)

    {
        arithmetic: x,
        bitwise: y,
        logical: z,
        pipeline: w
    }
}`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Verify arithmetic operators
            expect(tokens.some((t) => t.type === "PLUS")).toBe(true);
            expect(tokens.some((t) => t.type === "STAR")).toBe(true);
            expect(tokens.some((t) => t.type === "MINUS")).toBe(true);
            expect(tokens.some((t) => t.type === "SLASH")).toBe(true);
            expect(tokens.some((t) => t.type === "PERCENT")).toBe(true);

            // Verify bitwise operators
            expect(tokens.some((t) => t.type === "LT_LT")).toBe(true);
            expect(tokens.some((t) => t.type === "GT_GT")).toBe(true);
            expect(tokens.some((t) => t.type === "AMP")).toBe(true);

            // Verify comparison and logical operators
            expect(tokens.some((t) => t.type === "EQ_EQ")).toBe(true);
            expect(tokens.some((t) => t.type === "BANG_EQ")).toBe(true);
            expect(tokens.some((t) => t.type === "GT_EQ")).toBe(true);
            expect(tokens.some((t) => t.type === "LT_EQ")).toBe(true);
            expect(tokens.some((t) => t.type === "PIPE_PIPE")).toBe(true);
            expect(tokens.some((t) => t.type === "AMP_AMP")).toBe(true);

            // Verify pipe operator
            expect(tokens.filter((t) => t.type === "PIPE_GT").length).toBe(2);

            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });
    });

    describe("large realistic programs", () => {
        it("should tokenize a complete data processing module", () => {
            const code = `import { map, filter, reduce, sort } from "list"
import { Some, None } from "option"

// Data types
type Person = {
    id: Int,
    name: String,
    age: Int,
    email: String,
    active: Bool
}

type Validation<T> = Valid(T) | Invalid(String)

// Validation functions
let validateAge = (age) => {
    if age >= 0 && age <= 150 {
        Valid(age)
    } else {
        Invalid("Age must be between 0 and 150")
    }
}

let validateEmail = (email) => {
    if email |> contains("@") {
        Valid(email)
    } else {
        Invalid("Invalid email format")
    }
}

let validatePerson = (person) => match (validateAge(person.age), validateEmail(person.email)) {
    | (Valid(_), Valid(_)) => Valid(person)
    | (Invalid(msg), _) => Invalid(msg)
    | (_, Invalid(msg)) => Invalid(msg)
}

// Processing functions
let getActivePeople = (people) => people
    |> filter(p => p.active)
    |> map(p => validatePerson(p))
    |> filter(v => match v {
        | Valid(_) => true
        | Invalid(_) => false
    })
    |> map(v => match v {
        | Valid(person) => person
        | Invalid(_) => { id: 0, name: "", age: 0, email: "", active: false }
    })

let sortByAge = (people) => people
    |> sort((a, b) => a.age - b.age)

// Main processing
let people = [
    { id: 1, name: "Alice", age: 30, email: "alice@example.com", active: true },
    { id: 2, name: "Bob", age: 25, email: "bob@example.com", active: false },
    { id: 3, name: "Charlie", age: 35, email: "charlie@example.com", active: true }
]

let result = people
    |> getActivePeople
    |> sortByAge

export { Person, Validation, validatePerson, getActivePeople, sortByAge }`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Verify overall structure
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "import").length).toBe(2);
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "type").length).toBe(2);
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "let").length).toBeGreaterThan(6);
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "export").length).toBe(1);

            // Verify pattern matching
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "match").length).toBeGreaterThan(2);

            // Verify pipe operators (at least several)
            expect(tokens.filter((t) => t.type === "PIPE_GT").length).toBeGreaterThan(6);

            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });

        it("should tokenize a module with external interop and complex logic", () => {
            const code = `external from "fetch" {
    fetch: (String) -> Promise<Response> = "fetch"
    fetch: (String, RequestInit) -> Promise<Response> = "fetch"
}

external from "console" {
    log: (String) -> Unit = "log"
    error: (String) -> Unit = "error"
}

type ApiResponse<T> = Success(T) | Error(String)
type User = { id: Int, name: String }

let parseJson = (text) => {
    // Simplified - would use actual JSON parsing
    Success({ id: 1, name: "Test" })
}

let fetchUser = (userId) => {
    let url = "https://api.example.com/users/" & toString(userId)
    let response = ref(Error("Not fetched"))

    unsafe {
        fetch(url)
            |> then(r => r.text())
            |> then(text => {
                response := parseJson(text)
            })
            |> catch(err => {
                response := Error("Network error")
            })
    }

    !response
}

let processUsers = (userIds) => {
    userIds
        |> map(id => fetchUser(id))
        |> filter(result => match result {
            | Success(_) => true
            | Error(_) => false
        })
        |> map(result => match result {
            | Success(user) => user
            | Error(_) => { id: 0, name: "Unknown" }
        })
}

let main = () => {
    let ids = [1, 2, 3, 4, 5]
    let users = processUsers(ids)

    unsafe {
        log("Fetched " & toString(length(users)) & " users")
    }
}

export { fetchUser, processUsers, main }`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Verify external declarations
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "external").length).toBe(2);
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "from").length).toBe(2);

            // Verify unsafe blocks
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "unsafe").length).toBe(2);

            // Verify identifiers and ref assignment operator
            expect(tokens.filter((t) => t.type === "IDENTIFIER").length).toBeGreaterThan(20);
            expect(tokens.filter((t) => t.type === "COLON_EQ").length).toBeGreaterThan(1);

            // Verify pipes
            expect(tokens.filter((t) => t.type === "PIPE_GT").length).toBeGreaterThan(5);

            // Verify exports
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "export").length).toBe(1);

            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });

        it("should tokenize a functional data structure implementation", () => {
            const code = `// Immutable linked list implementation
type List<T> = Cons(T, List<T>) | Nil

let rec length = (list) => match list {
    | Cons(_, tail) => 1 + length(tail)
    | Nil => 0
}

let rec map = (list, f) => match list {
    | Cons(head, tail) => Cons(f(head), map(tail, f))
    | Nil => Nil
}

let rec filter = (list, pred) => match list {
    | Cons(head, tail) => {
        if pred(head) {
            Cons(head, filter(tail, pred))
        } else {
            filter(tail, pred)
        }
    }
    | Nil => Nil
}

let rec foldLeft = (list, acc, f) => match list {
    | Cons(head, tail) => foldLeft(tail, f(acc, head), f)
    | Nil => acc
}

let rec foldRight = (list, acc, f) => match list {
    | Cons(head, tail) => f(head, foldRight(tail, acc, f))
    | Nil => acc
}

let reverse = (list) => foldLeft(list, Nil, (acc, x) => Cons(x, acc))

let append = (list1, list2) => foldRight(list1, list2, (x, acc) => Cons(x, acc))

let flatten = (listOfLists) => foldRight(listOfLists, Nil, (list, acc) => append(list, acc))

// Example usage
let numbers = Cons(1, Cons(2, Cons(3, Cons(4, Cons(5, Nil)))))
let doubled = numbers |> map(n => n * 2)
let evens = numbers |> filter(n => n % 2 == 0)
let sum = numbers |> foldLeft(0, (acc, x) => acc + x)

export { List, length, map, filter, foldLeft, foldRight, reverse, append, flatten }`;
            const lexer = new Lexer(code, "test.vf");
            const tokens = lexer.tokenize();

            // Verify type definition
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "type").length).toBe(1);

            // Verify multiple recursive functions
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "rec").length).toBeGreaterThan(3);

            // Verify pattern matching
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "match").length).toBeGreaterThan(4);

            // Verify pipes in usage examples
            expect(tokens.filter((t) => t.type === "PIPE_GT").length).toBeGreaterThan(1);

            // Verify export
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "export").length).toBe(1);

            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });
    });
});
