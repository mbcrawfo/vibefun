/**
 * Integration tests for the lexer - Language features
 *
 * Tests for complete programs, location tracking, edge cases,
 * real-world examples, external blocks, and mutable references.
 */

import { describe, expect, it } from "vitest";

import { Lexer } from "./lexer.js";

describe("Lexer - Integration Tests - Language Features", () => {
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
            expect(tokens.some((t) => t.type === "OP_PIPE_GT")).toBe(true);
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

            expect(tokens.some((t) => t.type === "SPREAD")).toBe(true);
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
            expect(tokens.filter((t) => t.type === "OP_BANG").length).toBe(1);

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
            expect(tokens.filter((t) => t.type === "OP_ASSIGN").length).toBe(2);

            // Verify dereference operators
            expect(tokens.filter((t) => t.type === "OP_BANG").length).toBe(2);

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
            expect(tokens.filter((t) => t.type === "OP_ASSIGN").length).toBe(2);

            // Verify dereference operators
            expect(tokens.filter((t) => t.type === "OP_BANG").length).toBeGreaterThan(3);

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
            expect(tokens.filter((t) => t.type === "OP_ASSIGN").length).toBe(1);
            expect(tokens.filter((t) => t.type === "OP_BANG").length).toBe(1);

            // Verify pattern matching
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "match").length).toBe(1);

            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });
    });
});
