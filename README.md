# Vibefun

[![CI](https://github.com/mbcrawfo/vibefun/actions/workflows/ci.yml/badge.svg)](https://github.com/mbcrawfo/vibefun/actions/workflows/ci.yml)

**A pragmatic functional programming language that transpiles to JavaScript**

## What is Vibefun?

Vibefun is a statically-typed functional programming language designed to bring the best of ML-style functional programming to the JavaScript ecosystem. It combines powerful type inference, algebraic data types, and pattern matching with seamless JavaScript interop, making functional programming practical for real-world applications.

Like OCaml and F#, Vibefun is pragmatic: it provides strong functional defaults while giving you explicit escape hatches when you need them. The compiler transpiles to readable ES2020 JavaScript, allowing you to leverage the entire JavaScript ecosystem while enjoying the benefits of a robust type system and functional programming patterns.

Vibefun prioritizes developer experience with helpful error messages, comprehensive type inference that minimizes annotations, and a design philosophy that favors explicitness over magic.

## Key Features

- **Hindley-Milner Type Inference** - Write less type annotations while maintaining complete type safety
- **Algebraic Data Types** - Express your domain with variants (sum types) and records (product types)
- **Exhaustive Pattern Matching** - The compiler ensures you handle all cases
- **Immutability by Default** - Explicit `mut` keyword for mutable references when needed
- **First-Class Functions** - All functions are automatically curried for elegant partial application
- **Pipe Operator** - Chain transformations with the `|>` operator for readable data pipelines
- **Type-Safe JavaScript Interop** - Use any JavaScript library with explicit, type-safe FFI bindings

## Examples

### Pattern Matching with Algebraic Data Types

```vibefun
// Define a type with multiple variants
type Option<T> = Some(T) | None

// Pattern matching ensures all cases are handled
let getOrDefault = <T>(opt: Option<T>, default: T): T =>
    match opt {
        | Some(x) => x
        | None => default
    }

// Usage
let value = getOrDefault(Some(42), 0);  // 42
let missing = getOrDefault(None, 0);    // 0
```

### Functional Composition & Pipe Operator

```vibefun
// The pipe operator makes data transformations readable
[1, 2, 3, 4, 5]
    |> List.filter((x) => x % 2 == 0)  // [2, 4]
    |> List.map((x) => x * 2)          // [4, 8]
    |> List.sum                        // 12

// Automatic currying enables elegant partial application
let add = (x, y) => x + y;
let increment = add(1);  // Partially applied function
[1, 2, 3] |> List.map(increment);  // [2, 3, 4]
```

### Type-Safe JavaScript Interop

```vibefun
// Declare external JavaScript functions with full type safety
external from "node-fetch" {
    type Response = {
        ok: Bool,
        status: Int,
        json: (Unit) -> Promise<JsObject>
    };

    type RequestInit = {
        method: String,
        headers: JsObject
    };

    fetch: (String, RequestInit) -> Promise<Response> = "fetch";
}

// Use JavaScript libraries in type-safe unsafe blocks
let fetchUser = (id: Int) => unsafe {
    let url = "https://api.example.com/users/" & String.fromInt(id);
    let options = { method: "GET", headers: {} };
    fetch(url, options);
};
```

## Documentation

For comprehensive language details, see the [Language Specification](./docs/spec/).

---

Vibefun is currently in active development. The language specification is being implemented and the compiler is taking shape. Contributions and feedback are welcome!
