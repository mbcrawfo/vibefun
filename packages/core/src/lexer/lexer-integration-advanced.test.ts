/**
 * Integration tests for the lexer - Advanced patterns
 *
 * Tests for complete module programs, complex pattern matching,
 * and multi-feature combinations.
 */

import { describe, expect, it } from "vitest";

import { Lexer } from "./lexer.js";

describe("Lexer - Integration Tests - Advanced Patterns", () => {
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
            expect(tokens.filter((t) => t.type === "OP_LT").length).toBeGreaterThan(3);
            expect(tokens.filter((t) => t.type === "OP_GT").length).toBeGreaterThan(3);

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
            expect(tokens.some((t) => t.type === "OP_LT")).toBe(true);
            expect(tokens.some((t) => t.type === "OP_GT")).toBe(true);
            expect(tokens.some((t) => t.type === "OP_GTE")).toBe(true);

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
            expect(tokens.filter((t) => t.type === "OP_PIPE_GT").length).toBe(2);

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
            expect(tokens.filter((t) => t.type === "OP_ASSIGN").length).toBe(1);

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
            expect(tokens.filter((t) => t.type === "OP_PIPE_GT").length).toBe(2);

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
            expect(tokens.filter((t) => t.type === "OP_PIPE_GT").length).toBe(4);

            // Verify pattern matching
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "match").length).toBe(2);

            // Verify division and comparison
            expect(tokens.some((t) => t.type === "OP_SLASH")).toBe(true);
            expect(tokens.some((t) => t.type === "OP_EQ")).toBe(true);

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
            expect(tokens.some((t) => t.type === "OP_PLUS")).toBe(true);
            expect(tokens.some((t) => t.type === "OP_STAR")).toBe(true);
            expect(tokens.some((t) => t.type === "OP_MINUS")).toBe(true);
            expect(tokens.some((t) => t.type === "OP_SLASH")).toBe(true);
            expect(tokens.some((t) => t.type === "OP_PERCENT")).toBe(true);

            // Verify bitwise operators
            expect(tokens.some((t) => t.type === "OP_LT_LT")).toBe(true);
            expect(tokens.some((t) => t.type === "OP_GT_GT")).toBe(true);
            expect(tokens.some((t) => t.type === "OP_AMPERSAND")).toBe(true);

            // Verify comparison and logical operators
            expect(tokens.some((t) => t.type === "OP_EQ")).toBe(true);
            expect(tokens.some((t) => t.type === "OP_NEQ")).toBe(true);
            expect(tokens.some((t) => t.type === "OP_GTE")).toBe(true);
            expect(tokens.some((t) => t.type === "OP_LTE")).toBe(true);
            expect(tokens.some((t) => t.type === "OP_OR")).toBe(true);
            expect(tokens.some((t) => t.type === "OP_AND")).toBe(true);

            // Verify pipe operator
            expect(tokens.filter((t) => t.type === "OP_PIPE_GT").length).toBe(2);

            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });
    });
});
