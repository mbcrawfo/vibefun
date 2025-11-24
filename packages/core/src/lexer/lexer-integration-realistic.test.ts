/**
 * Integration tests for the lexer - Large realistic programs
 *
 * Tests for complete, real-world style programs that combine
 * multiple language features.
 */

import { describe, expect, it } from "vitest";

import { Lexer } from "./lexer.js";

describe("Lexer - Integration Tests - Large Realistic Programs", () => {
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
            expect(tokens.filter((t) => t.type === "OP_PIPE_GT").length).toBeGreaterThan(6);

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
            expect(tokens.filter((t) => t.type === "OP_ASSIGN").length).toBeGreaterThan(1);

            // Verify pipes
            expect(tokens.filter((t) => t.type === "OP_PIPE_GT").length).toBeGreaterThan(5);

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
            expect(tokens.filter((t) => t.type === "OP_PIPE_GT").length).toBeGreaterThan(1);

            // Verify export
            expect(tokens.filter((t) => t.type === "KEYWORD" && t.value === "export").length).toBe(1);

            expect(tokens[tokens.length - 1]?.type).toBe("EOF");
        });
    });
});
