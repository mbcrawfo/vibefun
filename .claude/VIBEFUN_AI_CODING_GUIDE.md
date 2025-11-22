# Vibefun AI Coding Guide

**For AI Agents Writing Vibefun Code**

This guide provides practical, day-to-day knowledge for writing vibefun code. It focuses on common patterns, idioms, and gotchas rather than comprehensive language specification details.

> **Before writing any `.vf` code, review this guide to understand vibefun's syntax and semantics.**

---

## Table of Contents

1. [Core Syntax Fundamentals](#1-core-syntax-fundamentals)
2. [Type System Essentials](#2-type-system-essentials)
3. [Common Syntax Patterns](#3-common-syntax-patterns)
4. [Key Differences from Other Languages](#4-key-differences-from-other-languages)
5. [Idiomatic Vibefun Patterns](#5-idiomatic-vibefun-patterns)
6. [Common Gotchas & Edge Cases](#6-common-gotchas--edge-cases)
7. [JavaScript Interop](#7-javascript-interop)
8. [Standard Library Overview](#8-standard-library-overview)
9. [Common Daily Patterns](#9-common-daily-patterns)
10. [Module System](#10-module-system)

---

## 1. Core Syntax Fundamentals

### File Structure

```vibefun
// Files use .vf extension, UTF-8 encoding
// Each file is a module

// CRITICAL: Semicolons are REQUIRED between statements/declarations
let x = 42;
let y = 10;

// Comments
// Single-line comment
/* Multi-line comment
   (can be nested) */
```

### Identifiers & Naming Conventions

```vibefun
// camelCase for values and functions
let firstName = "Alice";
let calculateTotal = (items) => ...;

// PascalCase for types and constructors
type Person = { name: String, age: Int };
type Result<T, E> = Ok(T) | Err(E);

// Unicode and emoji support
let café = "coffee";
let 🚀 = "rocket";
```

### Keywords to Know

```
let      mut      type     if       then     else
match    when     rec      and      import   export
external unsafe   from     as       ref      try
catch    while
```

---

## 2. Type System Essentials

### Primitive Types

```vibefun
// Core primitives
let age: Int = 42;
let price: Float = 19.99;
let name: String = "Alice";
let isActive: Bool = true;
let nothing: Unit = ();  // Unit type written as ()

// NO automatic coercion between Int and Float!
let x = 5 + 2.0;  // ❌ ERROR
let x = Float.fromInt(5) + 2.0;  // ✅ Correct
```

### Type Inference (Hindley-Milner)

```vibefun
// Most types are inferred automatically
let double = (x) => x * 2;  // Inferred: (Int) -> Int or (Float) -> Float

// Type annotations optional but helpful at module boundaries
export let add = (x: Int, y: Int): Int => x + y;

// Generic type parameters
let identity = <T>(x: T): T => x;
let map = <A, B>(f: (A) -> B, list: List<A>): List<B> => ...;
```

### Records (Structural Typing)

```vibefun
// Record types use structural typing
type Person = { name: String, age: Int };

// Construction (commas required!)
let alice = { name: "Alice", age: 30 };

// Field access
let name = alice.name;

// Immutable update
let older = { ...alice, age: 31 };

// Field shorthand
let name = "Bob";
let age = 25;
let bob = { name, age };  // Equivalent to { name: name, age: age }

// Width subtyping: extra fields accepted
let detailed = { name: "Charlie", age: 28, city: "NYC" };
let person: Person = detailed;  // ✅ OK - has required fields
```

### Variants (Nominal Typing)

```vibefun
// Variant types use nominal typing (name matters!)
type Option<T> = Some(T) | None;
type Result<T, E> = Ok(T) | Err(E);

// Constructors are functions
let x = Some(42);  // Option<Int>
let y = None;      // Option<T> (polymorphic)

// Pattern matching required
match x {
    | Some(value) => value
    | None => 0
}

// Two variants with same structure are DIFFERENT types
type MyOption<T> = MySome(T) | MyNone;
let a: Option<Int> = Some(42);
let b: MyOption<Int> = MySome(42);
// a and b are incompatible types!
```

### Function Types & Currying

```vibefun
// All functions are automatically curried
let add: (Int, Int) -> Int = (x, y) => x + y;
// Desugars to: (Int) -> (Int) -> Int

// Partial application works naturally
let add5 = add(5);  // (Int) -> Int
let result = add5(3);  // 8

// Both forms are equivalent:
let f: (A, B) -> C = ...;
let g: (A) -> (B) -> C = ...;
// These are the same type!
```

### Mutable References

```vibefun
// Must declare with 'mut' keyword
let mut counter = ref(0);  // Ref<Int>

// Dereference with !
let value = !counter;

// Update with :=
counter := !counter + 1;

// Type annotation
let mut state: Ref<Option<String>> = ref(None);
```

---

## 3. Common Syntax Patterns

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

// Mutually recursive functions
let rec isEven = (n) =>
    if n == 0 then true
    else isOdd(n - 1);
and isOdd = (n) =>
    if n == 0 then false
    else isEven(n - 1);
```

### Functions

```vibefun
// Lambda (single param - parens optional)
let increment = x => x + 1;
let increment = (x) => x + 1;  // Also valid

// Multi-param (parens required)
let add = (x, y) => x + y;

// With type annotations
let divide = (x: Int, y: Int): Int => x / y;

// Block body
let complex = (x) => {
    let doubled = x * 2;
    let squared = doubled * doubled;
    squared + 1;  // Last expression is return value
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
    | _ => default  // Wildcard for catch-all
}

// Variant patterns
match option {
    | Some(x) => x
    | None => 0
}

// List patterns
match list {
    | [] => "empty"
    | [x] => "single"
    | [x, y] => "pair"
    | [x, ...rest] => "many"
}

// Record patterns (partial matching OK)
match person {
    | { name, age } => name & " is " & String.fromInt(age)
    | { status: "active", id } => "Active user: " & String.fromInt(id)
}

// Nested patterns
match result {
    | Ok(Some(value)) => value
    | Ok(None) => 0
    | Err(e) => -1
}

// When guards
match x {
    | n when n > 0 => "positive"
    | n when n < 0 => "negative"
    | _ => "zero"
}
```

### Control Flow

```vibefun
// If-then-else (both branches must have same type)
let max = if x > y then x else y;

// If without else (must return Unit)
if condition then {
    doSideEffect();
};

// Multi-line if
let result = if check1 then {
    let temp = compute1();
    temp * 2;
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

### Lists

```vibefun
// List literals
let empty = [];
let numbers = [1, 2, 3, 4, 5];

// Cons operator ::
let list = 1 :: [2, 3];  // [1, 2, 3]
let list = 1 :: 2 :: 3 :: [];  // [1, 2, 3]

// Spread operator
let extended = [0, ...numbers, 6];  // [0, 1, 2, 3, 4, 5, 6]

// Pattern matching
match list {
    | [] => 0
    | [x, ...xs] => x + sum(xs)
}
```

### Pipe Operator

```vibefun
// Forward pipe |> (left-to-right application)
let result = data |> parse |> validate |> transform;

// Equivalent to:
let result = transform(validate(parse(data)));

// Multi-line pipelines (idiomatic!)
let processed = users
    |> List.filter((u) => u.active)
    |> List.map((u) => u.name)
    |> List.map(String.toUpper)
    |> List.sort;

// With partial application
let doubled = [1, 2, 3]
    |> List.map((x) => x * 2);
```

---

## 4. Key Differences from Other Languages

### vs. OCaml / F#

```vibefun
// Semicolons REQUIRED (not optional)
let x = 42;  // ✅
let y = 10;  // Must have semicolon

// No 'fun' keyword - use arrow functions
let add = (x, y) => x + y;  // Vibefun
(* let add = fun x y -> x + y  // OCaml *)

// String concatenation uses &
let greeting = "Hello" & " " & "world";
(* OCaml uses ^: "Hello" ^ " " ^ "world" *)

// rec keyword for recursion (like OCaml)
let rec sum = (list) => match list {
    | [] => 0
    | [x, ...xs] => x + sum(xs)
};

// Width subtyping for records (more flexible)
let person = { name: "Alice", age: 30, city: "NYC" };
let basic: { name: String } = person;  // ✅ OK in Vibefun
```

### vs. Haskell

```vibefun
// Semicolons required (no layout rules)
let x = 42;
let y = 10;

// match keyword (not case)
match list {
    | [] => 0
    | [x, ...xs] => x
}

// Eager evaluation (not lazy)
let expensive = computeExpensive();  // Evaluated immediately

// No operator sections - use lambdas
let increment = (x) => x + 1;  // Not: (+1)

// No do-notation (yet)
```

### vs. TypeScript / JavaScript

```vibefun
// ML-family, not JavaScript-family
// No for loops - use recursion or List operations
let sum = (list) => List.fold(list, 0, (acc, x) => acc + x);

// No automatic type coercion
let x = 5 + 2.0;  // ❌ ERROR
let x = Float.fromInt(5) + 2.0;  // ✅

// No null/undefined - use Option<T>
let maybeValue: Option<Int> = Some(42);
let noValue: Option<Int> = None;

// No exceptions - use Result<T, E>
let divide = (a, b) =>
    if b == 0 then Err("Division by zero")
    else Ok(a / b);

// No classes (yet)
```

---

## 5. Idiomatic Vibefun Patterns

### Error Handling with Result

```vibefun
// Define error type
type Error = NotFound | InvalidInput(String) | NetworkError(String);

// Return Result from fallible operations
let divide = (a, b) =>
    if b == 0 then Err(InvalidInput("Division by zero"))
    else Ok(a / b);

// Chain operations
let result = divide(10, 2)
    |> Result.flatMap((x) => divide(x, 3))
    |> Result.map((x) => x * 2);

// Pattern match to handle
match result {
    | Ok(value) => "Success: " & String.fromFloat(value)
    | Err(NotFound) => "Not found"
    | Err(InvalidInput(msg)) => "Invalid: " & msg
    | Err(NetworkError(msg)) => "Network error: " & msg
}
```

### Option for Nullable Values

```vibefun
// Use Option instead of null
let findFirst = <T>(list: List<T>, pred: (T) -> Bool): Option<T> =>
    match list {
        | [] => None
        | [x, ...xs] => if pred(x) then Some(x) else findFirst(xs, pred)
    };

// Chain with flatMap
let result = getUser(id)
    |> Option.flatMap((u) => getProfile(u.profileId))
    |> Option.flatMap((p) => getAvatar(p.avatarId))
    |> Option.map((a) => a.url);

// Provide default
let name = Option.unwrapOr(maybeName, "Unknown");
```

### Recursion Over Loops

```vibefun
// Prefer recursive functions
let rec sum = (list) => match list {
    | [] => 0
    | [x, ...xs] => x + sum(xs)
};

// Tail recursion when possible
let sum = (list) => {
    let rec go = (acc, items) => match items {
        | [] => acc
        | [x, ...xs] => go(acc + x, xs)
    };
    go(0, list);
};

// Or use fold
let sum = (list) => List.fold(list, 0, (acc, x) => acc + x);

// While loops only when necessary (imperative code)
let mut counter = ref(0);
while !counter < 10 {
    performSideEffect(!counter);
    counter := !counter + 1;
};
```

### Type-Driven Development

```vibefun
// Define types first
type User = { id: Int, name: String, email: String };
type UserError = NotFound | InvalidEmail | DatabaseError(String);
type UserResult = Result<User, UserError>;

// Let type inference work for you
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

### Data Transformation Pipelines

```vibefun
// Idiomatic: use pipes for clarity
let result = data
    |> parse
    |> validate
    |> transform
    |> format;

// With List operations
let activeUserNames = users
    |> List.filter((u) => u.active)
    |> List.map((u) => u.name)
    |> List.sort;

// Complex transformations
let summary = transactions
    |> List.filter((t) => t.amount > 100.0)
    |> List.groupBy((t) => t.category)
    |> List.map((category, items) => {
        category,
        total: List.sum(List.map(items, (t) => t.amount))
    });
```

---

## 6. Common Gotchas & Edge Cases

### #1 Gotcha: Missing Semicolons

```vibefun
// ❌ ERROR: Missing semicolons
let x = 42
let y = 10

// ✅ CORRECT: Semicolons required
let x = 42;
let y = 10;

// Also applies to expressions in blocks
let result = {
    let a = 1;  // Need semicolon
    let b = 2;  // Need semicolon
    a + b;      // Last expression - semicolon optional but recommended
};
```

### #2 Gotcha: No Numeric Coercion

```vibefun
// ❌ ERROR: Cannot mix Int and Float
let x = 5 + 2.0;
let y = 3.14 * 2;

// ✅ CORRECT: Explicit conversion required
let x = Float.fromInt(5) + 2.0;  // 7.0
let y = 3.14 * Float.fromInt(2);  // 6.28

// Int operations
let a = 5 + 2;  // 7 (Int)
let b = 10 / 3;  // 3 (Int division)

// Float operations
let c = 5.0 + 2.0;  // 7.0 (Float)
let d = 10.0 / 3.0;  // 3.333... (Float division)
```

### #3 Gotcha: Value Restriction

```vibefun
// ❌ PROBLEMATIC: Empty list is monomorphic
let empty = [];  // List<T> but T becomes fixed at first use
let nums = [1, ...empty];  // T := Int
let strs = ["a", ...empty];  // ❌ ERROR: empty is already List<Int>

// ✅ SOLUTION: Use function to get polymorphic empty list
let empty = <T>(): List<T> => [];
let nums = [1, ...empty()];  // List<Int>
let strs = ["a", ...empty()];  // List<String>

// Or just use [] directly where needed
let nums = [1, ...[]];
let strs = ["a", ...[]];

// Similar issue with refs
let mut state = ref(None);  // Ref<Option<T>> - T becomes monomorphic
state := Some(42);  // T := Int
state := Some("hello");  // ❌ ERROR

// ✅ SOLUTION: Eta-expand or use in context
let makeState = <T>(): Ref<Option<T>> => ref(None);
```

### #4 Gotcha: Pattern Exhaustiveness

```vibefun
// ❌ ERROR: Non-exhaustive pattern match
match list {
    | [x, ...xs] => x
}  // Missing [] case

// ✅ CORRECT: Cover all cases
match list {
    | [] => 0
    | [x, ...xs] => x
}

// Compiler enforces exhaustiveness
match option {
    | Some(x) => x
    // ❌ Must handle None case
}

// Use _ for catch-all
match value {
    | 0 => "zero"
    | 1 => "one"
    | _ => "other"
}
```

### #5 Gotcha: Mutable References Require 'mut'

```vibefun
// ❌ ERROR: Missing 'mut' keyword
let counter = ref(0);

// ✅ CORRECT: Must use 'mut'
let mut counter = ref(0);

// Dereference with !
let value = !counter;

// Update with :=
counter := !counter + 1;

// Type annotation
let mut state: Ref<Int> = ref(0);
```

### #6 Gotcha: Record Syntax

```vibefun
// ❌ ERROR: Missing commas in record
let person = { name: "Alice" age: 30 };

// ✅ CORRECT: Commas required
let person = { name: "Alice", age: 30 };

// ❌ ERROR: Trailing comma not allowed (currently)
let person = { name: "Alice", age: 30, };

// Field shorthand works
let name = "Bob";
let age = 25;
let bob = { name, age };  // ✅ OK
```

### #7 Gotcha: String Concatenation

```vibefun
// ❌ ERROR: + doesn't work for strings
let greeting = "Hello" + "world";

// ✅ CORRECT: Use & operator
let greeting = "Hello" & " " & "world";

// Converting to string
let message = "Count: " & String.fromInt(42);
let price = "Price: $" & String.fromFloat(19.99);
```

### #8 Gotcha: If Expressions Must Match Types

```vibefun
// ❌ ERROR: Branches return different types
let result = if condition then 42 else "error";

// ✅ CORRECT: Use Result or Option
let result = if condition then Ok(42) else Err("error");

// ❌ ERROR: Missing else with non-Unit type
let value = if condition then 42;

// ✅ CORRECT: Provide else branch
let value = if condition then 42 else 0;

// ✅ Or if you want side effect only (Unit type)
if condition then {
    doSomething();
};  // No else needed - returns Unit
```

---

## 7. JavaScript Interop

### External Declarations

```vibefun
// Single external function
external console_log: (String) -> Unit = "console.log";

// External block (multiple declarations)
external {
    log: (String) -> Unit = "console.log";
    error: (String) -> Unit = "console.error";
    warn: (String) -> Unit = "console.warn";
}

// From specific module
external fetch: (String) -> Promise<Response> = "fetch" from "node-fetch";
external readFile: (String) -> Promise<String> = "readFile" from "fs/promises";

// Aliasing
external print: (String) -> Unit = "console.log" as "print";

// Overloading (arity-based)
external setTimeout: ((Unit) -> Unit, Int) -> TimeoutId = "setTimeout";
external setTimeout: ((Unit) -> Unit, Int, Any) -> TimeoutId = "setTimeout";
```

### Unsafe Blocks

```vibefun
// All FFI calls must be in unsafe blocks
unsafe {
    console_log("Hello from JavaScript!");
}

// Encapsulate unsafe in safe wrapper
let log = (msg) => unsafe {
    console_log(msg);
};

// Now can call without unsafe
log("Safe logging");

// JavaScript try/catch (only in unsafe blocks)
let safeOperation = () => unsafe {
    try {
        riskyJsFunction();
        Ok(());
    } catch (error) {
        Err(error);
    }
};
```

### Opaque Types for JS Interop

```vibefun
// JsObject - arbitrary JavaScript objects
external getElementById: (String) -> JsObject = "document.getElementById";

// Json - JSON values
external JSON_parse: (String) -> Json = "JSON.parse";
external JSON_stringify: (Json) -> String = "JSON.stringify";

// Promise - JavaScript promises
external fetch: (String) -> Promise<Response> = "fetch";

// Error - JavaScript errors
external throwError: (String) -> Error = "throw new Error";

// Any - escape hatch (use sparingly!)
external dangerousOperation: (Any) -> Any = "someJsFunction";
```

### Common Interop Patterns

```vibefun
// Wrapping console functions
external {
    js_log: (String) -> Unit = "console.log";
    js_error: (String) -> Unit = "console.error";
}

let log = (msg) => unsafe { js_log(msg) };
let logError = (msg) => unsafe { js_error(msg) };

// Working with Promises
external js_fetch: (String) -> Promise<Response> = "fetch";

let fetchData = (url) => unsafe {
    js_fetch(url);
};

// Converting between types
external js_parseInt: (String, Int) -> Int = "parseInt";

let parseNumber = (str) => unsafe {
    try {
        let result = js_parseInt(str, 10);
        Ok(result);
    } catch (e) {
        Err("Parse error");
    }
};
```

---

## 8. Standard Library Overview

### List Module

```vibefun
// Construction
let numbers = [1, 2, 3, 4, 5];
let empty = [];

// Common operations
List.map([1, 2, 3], (x) => x * 2);  // [2, 4, 6]
List.filter([1, 2, 3, 4], (x) => x % 2 == 0);  // [2, 4]
List.fold([1, 2, 3], 0, (acc, x) => acc + x);  // 6

// Accessing elements
List.head([1, 2, 3]);  // Some(1)
List.tail([1, 2, 3]);  // Some([2, 3])
List.head([]);  // None

// Combining lists
List.concat([1, 2], [3, 4]);  // [1, 2, 3, 4]
List.flatten([[1, 2], [3, 4], [5]]);  // [1, 2, 3, 4, 5]

// Other utilities
List.reverse([1, 2, 3]);  // [3, 2, 1]
List.length([1, 2, 3]);  // 3
List.take([1, 2, 3, 4], 2);  // [1, 2]
List.drop([1, 2, 3, 4], 2);  // [3, 4]

// Performance: prepending O(1), appending O(n)
let fast = 0 :: [1, 2, 3];  // Fast
let slow = List.concat([1, 2, 3], [4]);  // Slower
```

### Option Module

```vibefun
// Type definition
type Option<T> = Some(T) | None;

// Creating options
let hasValue = Some(42);
let noValue = None;

// Transforming
Option.map(Some(5), (x) => x * 2);  // Some(10)
Option.map(None, (x) => x * 2);  // None

// Chaining
Option.flatMap(Some(5), (x) => Some(x * 2));  // Some(10)
Option.flatMap(None, (x) => Some(x * 2));  // None

// Getting values
Option.unwrap(Some(42), 0);  // 42
Option.unwrap(None, 0);  // 0

Option.unwrapOr(Some(42), 0);  // 42
Option.unwrapOr(None, 0);  // 0

// Checking
Option.isSome(Some(42));  // true
Option.isNone(None);  // true
```

### Result Module

```vibefun
// Type definition
type Result<T, E> = Ok(T) | Err(E);

// Creating results
let success = Ok(42);
let failure = Err("Something went wrong");

// Transforming success
Result.map(Ok(5), (x) => x * 2);  // Ok(10)
Result.map(Err("error"), (x) => x * 2);  // Err("error")

// Transforming errors
Result.mapErr(Err("error"), (e) => "Failed: " & e);  // Err("Failed: error")

// Chaining operations
Result.flatMap(Ok(10), (x) => Ok(x / 2));  // Ok(5)
Result.flatMap(Err("error"), (x) => Ok(x / 2));  // Err("error")

// Unwrapping
Result.unwrap(Ok(42), 0);  // 42
Result.unwrap(Err("error"), 0);  // 0
```

### Numeric Conversions

```vibefun
// Int <-> Float
Float.fromInt(42);  // 42.0
Int.fromFloat(3.14);  // 3 (truncates)
Int.fromFloat(3.9);  // 3 (truncates, doesn't round)

// Int <-> String
String.fromInt(42);  // "42"
Int.fromString("42");  // Some(42)
Int.fromString("not a number");  // None

// Float <-> String
String.fromFloat(3.14);  // "3.14"
Float.fromString("3.14");  // Some(3.14)
Float.fromString("invalid");  // None

// Bool <-> String
String.fromBool(true);  // "true"
Bool.fromString("true");  // Some(true)
Bool.fromString("yes");  // None (only "true"/"false" supported)
```

### String Module

```vibefun
// Concatenation
"Hello" & " " & "world";  // "Hello world"

// Common operations
String.length("hello");  // 5
String.toUpper("hello");  // "HELLO"
String.toLower("HELLO");  // "hello"
String.trim("  hello  ");  // "hello"

// Searching
String.contains("hello world", "world");  // true
String.startsWith("hello", "hel");  // true
String.endsWith("hello", "lo");  // true

// Splitting and joining
String.split("a,b,c", ",");  // ["a", "b", "c"]
String.join(["a", "b", "c"], ",");  // "a,b,c"

// Substrings
String.substring("hello", 1, 4);  // "ell"
String.charAt("hello", 1);  // Some("e")
```

---

## 9. Common Daily Patterns

### Safe Division

```vibefun
let safeDivide = (a, b) =>
    if b == 0 then None
    else Some(a / b);

// With Result
let divideOrError = (a, b) =>
    if b == 0 then Err("Division by zero")
    else Ok(a / b);
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
    |> Result.flatMap((u) => validateUser(u))
    |> Result.flatMap((u) => updateUser(u))
    |> Result.map((u) => u.id);
```

### Data Transformation Pipeline

```vibefun
// Process collection
let result = users
    |> List.filter((u) => u.active)
    |> List.map((u) => u.name)
    |> List.map(String.toUpper)
    |> List.sort;

// With intermediate processing
let summary = transactions
    |> List.filter((t) => t.amount > 100.0)
    |> List.map((t) => { ...t, amount: t.amount * 1.1 })
    |> List.fold(0.0, (acc, t) => acc + t.amount);
```

### Building Complex Records

```vibefun
// Using field shorthand
let makePerson = (name, age, email) => {
    name,
    age,
    email,
    createdAt: getCurrentTime(),
    id: generateId()
};

// Conditional fields (use Option or match)
let makeUser = (name, age, maybeEmail) => {
    let baseUser = { name, age, id: generateId() };
    match maybeEmail {
        | Some(email) => { ...baseUser, email: Some(email) }
        | None => { ...baseUser, email: None }
    };
};
```

### Recursive Processing

```vibefun
// Tree traversal
let rec sumTree = (tree) => match tree {
    | Leaf(value) => value
    | Node(left, right) => sumTree(left) + sumTree(right)
};

// Tail-recursive accumulation
let sumList = (list) => {
    let rec go = (acc, items) => match items {
        | [] => acc
        | [x, ...xs] => go(acc + x, xs)
    };
    go(0, list);
};

// Mutual recursion
let rec processEven = (list) => match list {
    | [] => []
    | [x, ...xs] => [x * 2, ...processOdd(xs)]
};
and processOdd = (list) => match list {
    | [] => []
    | [x, ...xs] => [x + 1, ...processEven(xs)]
};
```

### Error Accumulation

```vibefun
// Collect all errors vs fail fast
let validateAll = (items) => {
    let rec go = (acc, remaining) => match remaining {
        | [] => Ok(List.reverse(acc))
        | [item, ...rest] =>
            match validate(item) {
                | Ok(validated) => go([validated, ...acc], rest)
                | Err(e) => Err(e)  // Fail fast
            }
    };
    go([], items);
};

// Accumulate errors
type Validation<T> = Valid(T) | Invalid(List<String>);

let combineValidations = (validations) =>
    validations
    |> List.fold(Valid([]), (acc, v) => match (acc, v) {
        | (Valid(items), Valid(item)) => Valid([item, ...items])
        | (Valid(_), Invalid(errs)) => Invalid(errs)
        | (Invalid(errs1), Invalid(errs2)) => Invalid(List.concat(errs1, errs2))
        | (Invalid(errs), Valid(_)) => Invalid(errs)
    });
```

---

## 10. Module System

### Imports

```vibefun
// Named imports
import { map, filter, fold } from './list';
import { type Person, getUser } from './api';

// Everything as namespace
import * as List from './list';
import * as Utils from './utils';

// Type-only imports
import type { User, Profile } from './types';

// Mixed imports
import { type User, type Profile, getUser, updateUser } from './api';

// Relative paths
import { helper } from './utils';
import { config } from '../config';
import { component } from '../../components/button';

// Package imports
import { Option, Result } from 'vibefun/std';
import { Http } from '@myorg/http';
```

### Exports

```vibefun
// Export value bindings
export let add = (x, y) => x + y;
export let multiply = (x, y) => x * y;

// Export type definitions
export type Person = { name: String, age: Int };
export type Result<T, E> = Ok(T) | Err(E);

// Re-export from other modules
export { map, filter } from './list';
export type { User } from './types';

// Re-export everything
export * from './utils';

// Export with alias
export { internalName as publicName } from './internal';
```

### Module Organization

```vibefun
// File: src/user/types.vf
export type User = { id: Int, name: String, email: String };
export type UserError = NotFound | InvalidEmail;

// File: src/user/api.vf
import type { User, UserError } from './types';

export let getUser = (id: Int): Result<User, UserError> => {
    // Implementation
};

export let createUser = (name: String, email: String): Result<User, UserError> => {
    // Implementation
};

// File: src/user/index.vf (barrel export)
export type { User, UserError } from './types';
export { getUser, createUser, updateUser, deleteUser } from './api';

// File: src/main.vf
import { type User, getUser } from './user';  // Imports from index.vf
```

### Module Resolution

```vibefun
// Relative imports
import { x } from './module';  // ./module.vf or ./module/index.vf
import { y } from '../parent';  // ../parent.vf
import { z } from './nested/deep';  // ./nested/deep.vf

// Package imports (from node_modules or vibefun packages)
import { Option } from 'vibefun/std';
import { Http } from '@myorg/http';

// .vf extension optional in imports (required on filesystem)
import { x } from './module';  // Looks for module.vf
import { x } from './module.vf';  // Also valid
```

---

## Quick Reference Checklist

Before writing vibefun code, remember:

1. **✅ Semicolons required** - Most common syntax error!
2. **✅ No Int/Float coercion** - Use explicit conversion
3. **✅ String concatenation with `&`** - Not `+`
4. **✅ Use `Option<T>` for nullables** - No null/undefined
5. **✅ Use `Result<T, E>` for errors** - No exceptions (except in unsafe)
6. **✅ Pattern matching must be exhaustive** - Compiler enforced
7. **✅ Mutable refs need `mut` keyword** - `let mut x = ref(0)`
8. **✅ Record fields need commas** - `{ x: 1, y: 2 }`
9. **✅ FFI calls need unsafe blocks** - JavaScript interop
10. **✅ Prefer pipes for composition** - `data |> f |> g |> h`

---

## Additional Resources

- **Language Specification**: `./docs/spec/` - Complete language reference
- **Examples**: `./examples/` - Sample vibefun programs
- **Coding Standards**: `./.claude/CODING_STANDARDS.md` - Project conventions
- **Project Overview**: `./CLAUDE.md` - Architecture and design decisions
