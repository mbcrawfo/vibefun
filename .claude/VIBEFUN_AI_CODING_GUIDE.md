# Vibefun AI Coding Guide

**For AI Agents Writing Vibefun Code**

This guide provides practical, day-to-day knowledge for writing vibefun code. It focuses on common patterns, idioms, and gotchas rather than comprehensive language specification details.

> **Before writing any `.vf` code, review this guide to understand vibefun's syntax and semantics.**

---

## Table of Contents

1. [Quick Start Essentials](#1-quick-start-essentials)
2. [Type System Fundamentals](#2-type-system-fundamentals)
3. [Essential Syntax Patterns](#3-essential-syntax-patterns)
4. [Critical Gotchas](#4-critical-gotchas)
5. [JavaScript Interop](#5-javascript-interop)
6. [Standard Library Quick Reference](#6-standard-library-quick-reference)
7. [Module System](#7-module-system)
8. [Idiomatic Patterns](#8-idiomatic-patterns)
9. [Differences from Other Languages](#9-differences-from-other-languages)

---

## 1. Quick Start Essentials

### Top 10 Things to Remember

Before writing vibefun code, remember:

| # | Rule | Example |
|---|------|---------|
| 1 | **Semicolons required** | `let x = 42;` (most common error!) |
| 2 | **No Int/Float coercion** | Use `Float.fromInt(5) + 2.0` not `5 + 2.0` |
| 3 | **String concat with `&`** | `"Hello" & " world"` not `"Hello" + " world"` |
| 4 | **Use `Option<T>` for nullables** | No null/undefined |
| 5 | **Use `Result<T, E>` for errors** | No exceptions (except in unsafe) |
| 6 | **Pattern matching exhaustive** | Compiler enforced - cover all cases |
| 7 | **Mutable refs need `mut`** | `let mut x = ref(0)` not `let x = ref(0)` |
| 8 | **Record fields need commas** | `{ x: 1, y: 2 }` not `{ x: 1 y: 2 }` |
| 9 | **FFI needs unsafe blocks** | All JavaScript interop |
| 10 | **Prefer pipes for composition** | `data \|> f \|> g \|> h` |

### File Structure & Identifiers

```vibefun
// Files use .vf extension, UTF-8 encoding
// Each file is a module

// CRITICAL: Semicolons REQUIRED between statements
let x = 42;
let y = 10;

// camelCase for values/functions, PascalCase for types/constructors
let firstName = "Alice";
type Person = { name: String, age: Int };
type Result<T, E> = Ok(T) | Err(E);

// Comments: // single-line, /* multi-line (can nest) */
```

### Keywords

```
let      mut      type     if       then     else
match    when     rec      and      import   export
external unsafe   from     as       ref      try
catch    while
```

---

## 2. Type System Fundamentals

### Primitives & Type Inference

```vibefun
// Core types (Hindley-Milner inference)
let age: Int = 42;
let price: Float = 19.99;
let name: String = "Alice";
let isActive: Bool = true;
let nothing: Unit = ();

// ❌ NO automatic coercion!
let x = 5 + 2.0;  // ERROR

// ✅ Explicit conversion required
let x = Float.fromInt(5) + 2.0;

// Integer division truncates toward zero (not floor!)
// 7 / 2 = 3
// -7 / 2 = -3 (NOT -4)
// 7 / -2 = -3
// -7 / -2 = 3

// Float division follows IEEE 754 semantics (may round)
// 7.0 / 2.0 = 3.5
// -7.0 / 2.0 = -3.5

// Most types inferred automatically
let double = (x) => x * 2;  // Inferred: (Int) -> Int or (Float) -> Float

// Generics
let identity = <T>(x: T): T => x;
```

### Records (Structural) vs Variants (Nominal)

| Feature | Records | Variants |
|---------|---------|----------|
| **Typing** | Structural (shape matters) | Nominal (name matters) |
| **Definition** | `type P = { name: String }` | `type O<T> = Some(T) \| None` |
| **Construction** | `{ name: "Alice", age: 30 }` | `Some(42)` or `None` |
| **Field access** | `p.name` | Pattern match only |
| **Subtyping** | Width subtyping (extra fields OK) | No subtyping |

```vibefun
// Records - structural typing
type Person = { name: String, age: Int };
let alice = { name: "Alice", age: 30 };
let older = { ...alice, age: 31 };  // Immutable update
let bob = { name, age };  // Field shorthand

// Width subtyping
let detailed = { name: "Charlie", age: 28, city: "NYC" };
let person: Person = detailed;  // ✅ OK - has required fields

// Variants - nominal typing (constructors are functions)
type Option<T> = Some(T) | None;
let x = Some(42);  // Option<Int>
let y = None;      // Option<T> (polymorphic)

// CRITICAL: Same structure ≠ compatible types
type MyOption<T> = MySome(T) | MyNone;
let a: Option<Int> = Some(42);
let b: MyOption<Int> = MySome(42);
// a and b are INCOMPATIBLE!

// Keywords as field names (JavaScript interop)
let node = { type: "BinaryOp", import: "./module" };
node.type;  // ✅ OK - keywords work as field names
node.import;  // ✅ OK

// ❌ ERROR: Keywords can't use shorthand
let type = "User";  // Error: 'type' is a keyword
let obj = { type };  // Error: no variable 'type'

// ✅ CORRECT: Use explicit syntax
let typeValue = "User";
let obj = { type: typeValue };  // OK
```

### Functions & Mutable References

```vibefun
// All functions automatically curried
let add: (Int, Int) -> Int = (x, y) => x + y;
// Desugars to: (Int) -> (Int) -> Int

let add5 = add(5);  // Partial application
let result = add5(3);  // 8

// Mutable references (explicit with 'mut' + 'ref')
let mut counter = ref(0);  // Ref<Int>
let value = !counter;      // Dereference with !
counter := !counter + 1;   // Update with :=
```

---

## 3. Essential Syntax Patterns

### Variable Bindings

```vibefun
// Immutable (default)
let x = 42;

// Mutable reference
let mut counter = ref(0);

// Recursive function
let rec factorial = (n) =>
    if n <= 1 then 1
    else n * factorial(n - 1);

// Mutually recursive
let rec isEven = (n) =>
    if n == 0 then true else isOdd(n - 1);
and isOdd = (n) =>
    if n == 0 then false else isEven(n - 1);
```

### Functions & Lambdas

```vibefun
// Single param (parens optional)
let increment = x => x + 1;

// Multi-param (parens required)
let add = (x, y) => x + y;

// Block body (last expression is return value)
let complex = (x) => {
    let doubled = x * 2;
    let squared = doubled * doubled;
    squared + 1;
};

// Generic function
let identity = <T>(x: T): T => x;
```

### Pattern Matching

```vibefun
// Match expression (pipes required!)
match value {
    | pattern1 => result1
    | pattern2 => result2
    | _ => default  // Wildcard
}

// Common patterns
match list {
    | [] => "empty"
    | [x] => "single"
    | [x, ...rest] => "many"
}

match option {
    | Some(x) => x
    | None => 0
}

// Record patterns (partial OK)
match person {
    | { name, age } => name & " is " & String.fromInt(age)
}

// Nested patterns
match result {
    | Ok(Some(value)) => value
    | Ok(None) | Err(_) => 0
}

// Guards
match x {
    | n when n > 0 => "positive"
    | n when n < 0 => "negative"
    | _ => "zero"
}
```

### Control Flow

```vibefun
// If-then-else (both branches same type)
let max = if x > y then x else y;

// If without else (must return Unit)
if condition then { doSideEffect(); };

// Multi-line
let result = if check1 then {
    compute1();
} else if check2 then {
    compute2();
} else {
    default;
};

// While loops (use sparingly - prefer recursion)
let mut i = ref(0);
while !i < 10 {
    processItem(!i);
    i := !i + 1;
};
```

### Lists & Pipe Operator

```vibefun
// List construction
let numbers = [1, 2, 3, 4, 5];
let list = 1 :: 2 :: 3 :: [];  // Cons operator
let extended = [0, ...numbers, 6];  // Spread

// Pipe operator |> (left-to-right, idiomatic!)
let result = data |> parse |> validate |> transform;

// Multi-line pipelines
let processed = users
    |> List.filter((u) => u.active)
    |> List.map((u) => u.name)
    |> List.map(String.toUpper)
    |> List.sort;
```

---

## 4. Critical Gotchas

### #1: Missing Semicolons

**CRITICAL**: Most common syntax error!

```vibefun
// ❌ ERROR
let x = 42
let y = 10

// ✅ CORRECT
let x = 42;
let y = 10;

// Also in blocks
let result = {
    let a = 1;  // Required
    let b = 2;  // Required
    a + b;      // Optional but recommended
};
```

### #2: No Numeric Coercion

```vibefun
// ❌ ERROR: Cannot mix Int and Float
let x = 5 + 2.0;
let y = 3.14 * 2;

// ✅ CORRECT: Explicit conversion
let x = Float.fromInt(5) + 2.0;  // 7.0
let y = 3.14 * Float.fromInt(2);  // 6.28

// Division behavior:
// Int: truncates toward zero (NOT floor!)
//   10 / 3 = 3
//   -7 / 2 = -3 (not -4)
//   7 / -2 = -3
// Float: IEEE 754 division (may round)
//   10.0 / 3.0 = 3.333...
```

### #3: Value Restriction

Polymorphic values must be syntactic values (functions or constructors), not computed expressions.

```vibefun
// ❌ PROBLEMATIC: Empty list becomes monomorphic at first use
let empty = [];
let nums = [1, ...empty];  // T := Int
let strs = ["a", ...empty];  // ❌ ERROR: empty is now List<Int>

// ✅ SOLUTION: Use function to get polymorphic list
let empty = <T>(): List<T> => [];
let nums = [1, ...empty()];  // List<Int>
let strs = ["a", ...empty()];  // List<String>

// Or just use [] inline
let nums = [1, ...[]];
let strs = ["a", ...[]];

// Same issue with refs
let mut state = ref(None);  // Ref<Option<T>> - T becomes monomorphic
state := Some(42);  // T := Int
state := Some("hello");  // ❌ ERROR

// ✅ SOLUTION: Function or use in context
let makeState = <T>(): Ref<Option<T>> => ref(None);
```

### #4: Pattern Exhaustiveness

Compiler enforces exhaustive pattern matching.

```vibefun
// ❌ ERROR: Non-exhaustive
match list {
    | [x, ...xs] => x
}  // Missing [] case

// ✅ CORRECT: Cover all cases
match list {
    | [] => 0
    | [x, ...xs] => x
}

// Use _ for catch-all
match value {
    | 0 => "zero"
    | 1 => "one"
    | _ => "other"
}
```

### #5: Mutable References Require 'mut'

```vibefun
// ❌ ERROR: Missing 'mut' keyword
let counter = ref(0);

// ✅ CORRECT
let mut counter = ref(0);
let value = !counter;      // Dereference with !
counter := !counter + 1;   // Update with :=
```

### #6: Record Syntax & Keyword Fields

```vibefun
// ❌ ERROR: Missing commas
let person = { name: "Alice" age: 30 };

// ✅ CORRECT: Commas required
let person = { name: "Alice", age: 30 };

// ✅ Trailing comma allowed (improves diffs)
let person = { name: "Alice", age: 30, };

// ✅ Field shorthand works
let name = "Bob";
let age = 25;
let bob = { name, age };

// ✅ Keywords work as field names (JavaScript interop)
let node = { type: "ImportDeclaration", import: "./path" };
node.type;  // OK
match node {
    | { type: "ImportDeclaration", import: path } => path
    | { type: t } => t  // Explicit binding required
}

// ❌ ERROR: Keywords can't use shorthand
let type = "User";  // Error: 'type' is a keyword
let obj = { type };  // Error: no variable named 'type'

// ✅ CORRECT: Use explicit syntax for keyword fields
let typeValue = "User";
let obj = { type: typeValue };  // OK
```

### #7: String Concatenation

```vibefun
// ❌ ERROR: + doesn't work for strings
let greeting = "Hello" + "world";

// ✅ CORRECT: Use & operator
let greeting = "Hello" & " " & "world";
let message = "Count: " & String.fromInt(42);
```

### #8: If Expression Type Matching

```vibefun
// ❌ ERROR: Branches have different types
let result = if condition then 42 else "error";

// ✅ CORRECT: Use Result or Option
let result = if condition then Ok(42) else Err("error");

// ❌ ERROR: Missing else with non-Unit type
let value = if condition then 42;

// ✅ CORRECT: Provide else branch or return Unit
let value = if condition then 42 else 0;

// Unit type doesn't need else
if condition then { doSomething(); };
```

---

## 5. JavaScript Interop

### External Declarations & Unsafe Blocks

```vibefun
// Single external
external console_log: (String) -> Unit = "console.log";

// External block
external {
    log: (String) -> Unit = "console.log";
    error: (String) -> Unit = "console.error";
}

// From module
external fetch: (String) -> Promise<Response> = "fetch" from "node-fetch";

// All FFI calls must be in unsafe blocks
unsafe {
    console_log("Hello from JavaScript!");
}

// ✅ PATTERN: Wrap unsafe in safe function
let log = (msg) => unsafe { console_log(msg) };
log("Safe logging");  // Can call without unsafe
```

### Opaque Types

| Type | Purpose | Example |
|------|---------|---------|
| `JsObject` | Arbitrary JS objects | `document.getElementById` |
| `Json` | JSON values | `JSON.parse`, `JSON.stringify` |
| `Promise<T>` | JS promises | `fetch` |
| `Error` | JS errors | `throw new Error` |
| `Any` | Escape hatch (use sparingly!) | Unsafe operations |

```vibefun
external getElementById: (String) -> JsObject = "document.getElementById";
external JSON_parse: (String) -> Json = "JSON.parse";
external fetch: (String) -> Promise<Response> = "fetch";
```

### Safe Wrapping Pattern

```vibefun
// Declare external
external js_parseInt: (String, Int) -> Int = "parseInt";

// Wrap in safe function with Result
let parseNumber = (str) => unsafe {
    try {
        let result = js_parseInt(str, 10);
        Ok(result);
    } catch (e) {
        Err("Parse error");
    }
};

// Use safely
match parseNumber("42") {
    | Ok(n) => n
    | Err(msg) => 0
}
```

### Keywords as Field Names (JS Interop)

JavaScript frequently uses reserved words as object properties. Vibefun allows keywords as field names for seamless interop:

```vibefun
// Modeling JavaScript AST nodes
type ASTNode = {
    type: String,
    import: String,
    export: List<String>
};

external parseJS: (String) -> ASTNode from "./parser.js";

// ✅ Access keyword fields naturally
let analyzeImport = (code) => unsafe {
    let node = parseJS(code);
    match node {
        | { type: "ImportDeclaration", import: path, export: names } =>
            "Import " & String.join(", ", names) & " from " & path
        | { type: "ExportDeclaration", export: names } =>
            "Export " & String.join(", ", names)
        | { type: t, _ } =>
            "Other node: " & t
    }
};

// ✅ All keywords work as field names
// type, match, import, export, let, module, from, etc.

// ❌ Shorthand limitation in patterns
match node {
    | { type } => type  // Error: 'type' is a keyword
    | { type: t } => t  // OK: explicit binding
}
```

---

## 6. Standard Library Quick Reference

> **Full API documentation**: See `docs/spec/11-stdlib/` for complete details.

### List Module

**Core functions**: `map`, `filter`, `fold`, `head`, `tail`, `concat`, `flatten`, `reverse`, `length`, `take`, `drop`, `find`, `sort`

```vibefun
// Common operations
List.map(list, fn)           // Transform elements
List.filter(list, pred)      // Keep matching elements
List.fold(list, init, fn)    // Reduce to single value
List.head(list)              // Option<T> - first element
List.tail(list)              // Option<List<T>> - all but first

// ⚠️ Performance: prepending O(1), appending O(n)
let fast = 0 :: [1, 2, 3];        // Fast
let slow = List.concat([1, 2], [3]);  // Slower
```

**See**: `docs/spec/11-stdlib/list.md`

### Option Module

**Core functions**: `map`, `flatMap`, `filter`, `unwrapOr`, `isSome`, `isNone`

```vibefun
type Option<T> = Some(T) | None;

Option.map(opt, fn)          // Transform if Some
Option.flatMap(opt, fn)      // Chain operations
Option.unwrapOr(opt, default) // Get value or default
```

**See**: `docs/spec/11-stdlib/option.md`

### Result Module

**Core functions**: `map`, `mapErr`, `flatMap`, `unwrapOr`, `isOk`, `isErr`

```vibefun
type Result<T, E> = Ok(T) | Err(E);

Result.map(result, fn)       // Transform success
Result.mapErr(result, fn)    // Transform error
Result.flatMap(result, fn)   // Chain operations
Result.unwrapOr(result, default)
```

**See**: `docs/spec/11-stdlib/result.md`

### Conversions

| From | To | Function | Returns |
|------|-----|----------|---------|
| Int | Float | `Float.fromInt(42)` | `42.0` |
| Float | Int | `Int.fromFloat(3.14)` | `3` (truncates) |
| Int | String | `String.fromInt(42)` | `"42"` |
| String | Int | `Int.fromString("42")` | `Some(42)` |
| Float | String | `String.fromFloat(3.14)` | `"3.14"` |
| String | Float | `Float.fromString("3.14")` | `Some(3.14)` |
| Bool | String | `String.fromBool(true)` | `"true"` |

### String Module

**Core functions**: `length`, `toUpper`, `toLower`, `trim`, `contains`, `startsWith`, `endsWith`, `split`, `join`, `substring`, `charAt`

```vibefun
"Hello" & " " & "world"           // Concatenation
String.split("a,b,c", ",")        // ["a", "b", "c"]
String.join(["a", "b"], ",")      // "a,b"
String.contains("hello", "ell")   // true
```

**See**: `docs/spec/11-stdlib/string.md`, `array.md`, `map.md`, `set.md`, `math.md`, `json.md`

---

## 7. Module System

### Imports & Exports

```vibefun
// Named imports
import { map, filter } from './list';
import { type Person, getUser } from './api';

// Namespace imports
import * as List from './list';
import * as Utils from './utils';

// Type-only imports
import type { User, Profile } from './types';

// Relative paths
import { helper } from './utils';           // ./utils.vf
import { config } from '../config';         // ../config.vf
import { component } from '../../components/button';

// Package imports
import { Option, Result } from 'vibefun/std';
import { Http } from '@myorg/http';
```

```vibefun
// Export bindings
export let add = (x, y) => x + y;
export type Person = { name: String, age: Int };

// Re-export
export { map, filter } from './list';
export type { User } from './types';
export * from './utils';  // Re-export all
```

### Module Organization (Barrel Pattern)

```vibefun
// File: src/user/types.vf
export type User = { id: Int, name: String };
export type UserError = NotFound | InvalidEmail;

// File: src/user/api.vf
import type { User, UserError } from './types';
export let getUser = (id): Result<User, UserError> => { ... };

// File: src/user/index.vf (barrel export)
export type { User, UserError } from './types';
export { getUser, createUser } from './api';

// File: src/main.vf
import { type User, getUser } from './user';  // Imports from index.vf
```

---

## 8. Idiomatic Patterns

### Error Handling with Result

```vibefun
// Define error variants
type Error = NotFound | InvalidInput(String) | NetworkError(String);

// Return Result from fallible operations
let divide = (a, b) =>
    if b == 0 then Err(InvalidInput("Division by zero"))
    else Ok(a / b);

// Chain operations with flatMap
let result = divide(10, 2)
    |> Result.flatMap((x) => divide(x, 3))
    |> Result.map((x) => x * 2);

// Handle with pattern matching
match result {
    | Ok(value) => "Success: " & String.fromFloat(value)
    | Err(InvalidInput(msg)) => "Invalid: " & msg
    | Err(NetworkError(msg)) => "Network error: " & msg
    | Err(NotFound) => "Not found"
}
```

### Data Transformation Pipelines

```vibefun
// Idiomatic: use pipes for clarity
let result = users
    |> List.filter((u) => u.active)
    |> List.map((u) => u.name)
    |> List.map(String.toUpper)
    |> List.sort;

// Complex transformations
let summary = transactions
    |> List.filter((t) => t.amount > 100.0)
    |> List.map((t) => { ...t, amount: t.amount * 1.1 })
    |> List.fold(0.0, (acc, t) => acc + t.amount);
```

### Recursion Over Loops

```vibefun
// Prefer recursive functions
let rec sum = (list) => match list {
    | [] => 0
    | [x, ...xs] => x + sum(xs)
};

// Tail recursion for large data
let sum = (list) => {
    let rec go = (acc, items) => match items {
        | [] => acc
        | [x, ...xs] => go(acc + x, xs)
    };
    go(0, list);
};

// Or use fold
let sum = (list) => List.fold(list, 0, (acc, x) => acc + x);
```

### Type-Driven Development

```vibefun
// Define types first
type User = { id: Int, name: String, email: String };
type UserError = NotFound | InvalidEmail | DatabaseError(String);

// Let type inference guide implementation
let validateEmail = (email) =>
    if String.contains(email, "@") then Ok(email)
    else Err(InvalidEmail);

let createUser = (name, email) =>
    validateEmail(email)
    |> Result.map((validEmail) => {
        id: generateId(),
        name,
        email: validEmail
    });
```

### Optional Chaining

```vibefun
// Chain multiple optional operations
let getDisplayName = (userId) =>
    getUser(userId)
    |> Option.flatMap((u) => getProfile(u.profileId))
    |> Option.flatMap((p) => p.displayName)
    |> Option.unwrapOr("Anonymous");

// With Result
let processUser = (userId) =>
    getUser(userId)
    |> Result.flatMap(validateUser)
    |> Result.flatMap(updateUser)
    |> Result.map((u) => u.id);
```

### Building Complex Records

```vibefun
// Field shorthand
let makePerson = (name, age, email) => {
    name,
    age,
    email,
    createdAt: getCurrentTime(),
    id: generateId()
};

// Conditional fields
let makeUser = (name, maybeEmail) =>
    match maybeEmail {
        | Some(email) => { name, email: Some(email), id: generateId() }
        | None => { name, email: None, id: generateId() }
    };
```

---

## 9. Differences from Other Languages

### Quick Comparison

**vs. OCaml/F#:**
- ✅ Semicolons REQUIRED (not optional)
- ✅ Arrow functions `(x) => ...` (no `fun` keyword)
- ✅ String concat with `&` (not `^` or `+`)
- ✅ Width subtyping for records (more flexible)
- ✅ `rec` keyword for recursion (same as OCaml)

**vs. Haskell:**
- ✅ Semicolons required (no layout rules)
- ✅ `match` keyword (not `case`)
- ✅ Eager evaluation (not lazy)
- ✅ No operator sections - use lambdas `(x) => x + 1` not `(+1)`

**vs. TypeScript/JavaScript:**
- ✅ ML-family, not JavaScript-family
- ✅ No for loops - use recursion or List operations
- ✅ No automatic coercion (`5 + 2.0` is an error)
- ✅ No null/undefined - use `Option<T>`
- ✅ No exceptions - use `Result<T, E>`
- ✅ No classes (records + variants instead)

---

## Additional Resources

- **Language Specification**: `./docs/spec/` - Complete language reference (start with `.agent-map.md`)
- **Examples**: `./examples/` - Sample vibefun programs
- **Coding Standards**: `./.claude/CODING_STANDARDS.md` - Project conventions
- **Project Overview**: `./CLAUDE.md` - Architecture and design decisions
