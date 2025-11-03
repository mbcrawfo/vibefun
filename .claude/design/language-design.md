# Vibefun Language Design Specification

## Overview

Vibefun is a pragmatic functional programming language that transpiles to JavaScript. It combines the elegance of ML-style functional programming with practical features for real-world development.

## Design Principles

1. **Functional-first, pragmatic**: Strong functional defaults with escape hatches when needed
2. **Type safety**: Strong static typing with inference and runtime checks
3. **JavaScript target**: Transpiles to readable, debuggable JavaScript
4. **Explicit boundaries**: Clear separation between safe vibefun code and JS interop
5. **Developer experience**: Excellent error messages and tooling

## Syntax Overview

### Module System

```vibefun
// Import from other vibefun modules
import { map, filter } from './utils'
import * as List from './list'

// Export declarations
export let add = (x, y) => x + y
export type Result<T, E> = Ok(T) | Err(E)
```

### Let Bindings

```vibefun
// Immutable by default
let x = 42
let name = "vibefun"

// Mutable references (explicit)
let mut counter = ref(0)
counter := !counter + 1  // deref with !, assign with :=
```

### Functions

```vibefun
// Named function
let add = (x, y) => x + y

// With type annotations
let add: (Int, Int) -> Int = (x, y) => x + y

// Multi-line body
let greet = (name) => {
    let message = "Hello, " &name
    message
}

// Currying (automatic partial application)
let add = (x) => (y) => x + y
let increment = add(1)

// Recursive functions
let rec factorial = (n) =>
    if n <= 1 then 1
    else n * factorial(n - 1)
```

### Pipe Operator

```vibefun
// Forward pipe |>
let result = data
    |> filter((x) => x > 0)
    |> map((x) => x * 2)
    |> List.sum

// Function composition >> (left-to-right) and << (right-to-left)
let processData = filter((x) => x > 0) >> map((x) => x * 2) >> List.sum
```

### Control Flow

```vibefun
// If expressions (always return a value)
let max = (a, b) =>
    if a > b then a else b

// Pattern matching (preferred)
let describe = (x) => match x {
    | 0 => "zero"
    | 1 => "one"
    | n when n > 0 => "positive"
    | _ => "negative"
}
```

## Type System

### Primitive Types

- `Int` - Integer numbers (supports numeric separators: `1_000_000`)
- `Float` - Floating-point numbers (supports numeric separators: `3.14_159`)
- `String` - Text strings (single-line `"..."` or multi-line `"""..."""`)
- `Bool` - true/false
- `Unit` - Empty value (like void), written as `()`

#### String Literals

```vibefun
// Single-line strings
let simple = "Hello, world!"

// Multi-line strings
let multiline = """
    This is a multi-line string.
    It can span multiple lines.
    Leading/trailing whitespace is preserved.
"""

// String concatenation with & operator
let greeting = "Hello, " & "world!"
```

#### Numeric Literals

```vibefun
// Numeric separators for readability
let million = 1_000_000
let billion = 1_000_000_000
let precise = 3.14_159_265

// Standard numeric literals
let x = 42
let y = 3.14
```

### Type Annotations

```vibefun
let x: Int = 42
let add: (Int, Int) -> Int = (x, y) => x + y
```

### Type Inference

Type annotations are optional - the compiler infers types:

```vibefun
let add = (x, y) => x + y  // Inferred: (Int, Int) -> Int or polymorphic
let numbers = [1, 2, 3]    // Inferred: List<Int>
```

### Records (Product Types)

```vibefun
// Type definition
type Person = {
    name: String,
    age: Int,
    email: String
}

// Construction
let person = { name: "Alice", age: 30, email: "alice@example.com" }

// Access
let name = person.name

// Update (immutable - creates new record)
let older = { ...person, age: 31 }

// Pattern matching in function parameters
let greetPerson = ({ name, age }) =>
    "Hello " &name &", you are " &String.fromInt(age)
```

### Variants (Sum Types)

```vibefun
// Simple enum
type Color = Red | Green | Blue

// With associated data
type Option<T> = Some(T) | None

type Result<T, E> =
    | Ok(T)
    | Err(E)

// Usage with pattern matching
let unwrap = (opt) => match opt {
    | Some(value) => value
    | None => panic("unwrap called on None")
}

let handleResult = (result) => match result {
    | Ok(value) => "Success: " &String.fromInt(value)
    | Err(error) => "Error: " &error
}
```

### Type Aliases

```vibefun
type UserId = Int
type Username = String
type Callback<T> = (T) -> Unit
```

### Generics (Parametric Polymorphism)

```vibefun
// Generic function
let identity: <T>(T) -> T = (x) => x

// Generic type
type Box<T> = { value: T }

let mapBox: <A, B>(Box<A>, (A) -> B) -> Box<B> = (box, f) => {
    { value: f(box.value) }
}

// Multiple type parameters
type Either<L, R> = Left(L) | Right(R)
```

### Union Types

```vibefun
// Union of literals
type Status = "pending" | "active" | "complete"

// Union of types
type NumberOrString = Int | String

// Combined with variants
type ApiResponse<T> =
    | Success(T)
    | Error(String)
    | Loading
    | NotFound
```

## Pattern Matching

Exhaustive pattern matching with compiler checks:

```vibefun
// Match variants
let processOption = (opt) => match opt {
    | Some(x) => x * 2
    | None => 0
}

// Match literals
let describe = (n) => match n {
    | 0 => "zero"
    | 1 => "one"
    | 2 => "two"
    | _ => "many"
}

// Or patterns (match multiple cases)
let describeStatus = (status) => match status {
    | "pending" | "loading" => "In progress..."
    | "success" | "complete" => "Done!"
    | "error" | "failed" => "Something went wrong"
    | _ => "Unknown status"
}

// Match with guards
let classify = (n) => match n {
    | x when x < 0 => "negative"
    | 0 => "zero"
    | x when x > 0 => "positive"
}

// Nested patterns
let processResult = (result) => match result {
    | Ok(Some(value)) => "Got value: " &String.fromInt(value)
    | Ok(None) => "Got None"
    | Err(msg) => "Error: " &msg
}

// List patterns
let sumList = (list) => match list {
    | [] => 0
    | [x] => x
    | [x, ...rest] => x + sumList(rest)
}
```

## JavaScript Interop (FFI)

Explicit boundaries with the `external` keyword and `unsafe` blocks:

### Single External Declarations

```vibefun
// Declare external JS function
external console_log: (String) -> Unit = "console.log"

// Import from JS module
external fetch: (String) -> Promise<Response> = "fetch" from "node-fetch"

// Use in unsafe block
let debug = (msg) => unsafe {
    console_log(msg)
}
```

### External Blocks

Group multiple external declarations, especially useful when wrapping JavaScript libraries:

```vibefun
// Simple external block
external {
    log: (String) -> Unit = "console.log"
    error: (String) -> Unit = "console.error"
    warn: (String) -> Unit = "console.warn"
}

// External block with module import
external from "node-fetch" {
    fetch: (String, RequestInit) -> Promise<Response> = "fetch"
    Headers: Type = "Headers"
}

// Exportable external block
export external from "react" {
    useState: <T>(T) -> (T, (T) -> Unit) = "useState"
    useEffect: ((Unit) -> Unit, List<a>) -> Unit = "useEffect"
    useCallback: <T>((Unit) -> T, List<a>) -> (Unit) -> T = "useCallback"
}

// External type declarations in blocks
external {
    type Response = {
        json: (Unit) -> Promise<Json>,
        text: (Unit) -> Promise<String>,
        ok: Bool,
        status: Int
    }

    fetch: (String) -> Promise<Response> = "fetch"
}
```

### Overloaded External Functions

External functions can be overloaded with different arities, enabling natural interop with JavaScript APIs that accept varying numbers of arguments. Resolution is compile-time based on argument count:

```vibefun
// Overload setTimeout with different signatures
external setTimeout: ((Unit) -> Unit, Int) -> TimeoutId = "setTimeout"
external setTimeout: ((Unit) -> Unit, Int, Any) -> TimeoutId = "setTimeout"

// Overload fetch with optional options parameter
external fetch: (String) -> Promise<Response> = "fetch"
external fetch: (String, RequestInit) -> Promise<Response> = "fetch"

// Can also use external blocks for overloads
external from "react" {
    createElement: (String) -> Element = "createElement"
    createElement: (String, Props) -> Element = "createElement"
    createElement: (String, Props, Children) -> Element = "createElement"
}
```

**Important**: Overloading is **only** available for `external` declarations, not pure vibefun functions. Pure vibefun code uses pattern matching or different function names instead.

### Converting Between Vibefun and JS Types

```vibefun
// Use external functions in unsafe blocks
let fetchUser = (id) => unsafe {
    let url = "https://api.example.com/users/" &String.fromInt(id)
    fetch(url)
}
```

## Standard Library Outline

### List Module

```vibefun
List.map: <A, B>(List<A>, (A) -> B) -> List<B>
List.filter: <A>(List<A>, (A) -> Bool) -> List<A>
List.fold: <A, B>(List<A>, B, (B, A) -> B) -> B
List.length: <A>(List<A>) -> Int
List.head: <A>(List<A>) -> Option<A>
List.tail: <A>(List<A>) -> Option<List<A>>
```

### Option Module

```vibefun
Option.map: <A, B>(Option<A>, (A) -> B) -> Option<B>
Option.flatMap: <A, B>(Option<A>, (A) -> Option<B>) -> Option<B>
Option.getOrElse: <A>(Option<A>, A) -> A
Option.isSome: <A>(Option<A>) -> Bool
Option.isNone: <A>(Option<A>) -> Bool
```

### Result Module

```vibefun
Result.map: <T, E, U>(Result<T, E>, (T) -> U) -> Result<U, E>
Result.mapErr: <T, E, F>(Result<T, E>, (E) -> F) -> Result<T, F>
Result.flatMap: <T, E, U>(Result<T, E>, (T) -> Result<U, E>) -> Result<U, E>
Result.isOk: <T, E>(Result<T, E>) -> Bool
Result.isErr: <T, E>(Result<T, E>) -> Bool
```

### String Module

```vibefun
String.length: (String) -> Int
String.concat: (String, String) -> String  // Also available as &
String.toUpperCase: (String) -> String
String.toLowerCase: (String) -> String
String.trim: (String) -> String
String.split: (String, String) -> List<String>
String.fromInt: (Int) -> String
String.fromFloat: (Float) -> String
```

## Comments

```vibefun
// Single-line comment

/*
   Multi-line comment
   can span multiple lines
*/

/* Nested /* comments */ are supported */
```

## File Structure

Each `.vf` file is a module:

```
src/
├── main.vf           # Entry point
├── types.vf          # Type definitions
├── utils/
│   ├── list.vf       # List utilities
│   └── string.vf     # String utilities
└── lib/
    └── http.vf       # HTTP library
```

## Compilation

Vibefun transpiles to **ES2020 JavaScript** for maximum compatibility with modern runtimes:

- **Node.js**: 14.0+ (16+ recommended)
- **Browsers**: Modern browsers from 2020+ (Chrome 80+, Firefox 74+, Safari 13.1+, Edge 80+)

**Note**: Specific code generation patterns (currying implementation, variant representation, etc.) are implementation details that may evolve. The generated JavaScript is designed to be readable for debugging purposes, but should not be relied upon as a stable API.

```bash
# Compile single file
vibefun compile main.vf -o output.js

# Compile project
vibefun build

# Run directly
vibefun run main.vf

# Type check only
vibefun check main.vf
```

## Example Programs

### Hello World

```vibefun
// main.vf
external console_log: (String) -> Unit = "console.log"

let main = () => unsafe {
    console_log("Hello, Vibefun!")
}
```

### List Processing

```vibefun
import { map, filter, fold } from './stdlib/list'

let numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

let result = numbers
    |> filter((x) => x % 2 == 0)
    |> map((x) => x * x)
    |> fold(0, (acc, x) => acc + x)

// result = 220 (2² + 4² + 6² + 8² + 10²)
```

### Algebraic Data Types

```vibefun
type User = {
    id: Int,
    name: String,
    email: String
}

type UserError =
    | NotFound
    | InvalidEmail
    | DatabaseError(String)

let validateEmail = (email) =>
    if String.contains(email, "@")
    then Ok(email)
    else Err(InvalidEmail)

let findUser = (id) => {
    // Simulated database lookup
    if id == 1
    then Ok({ id: 1, name: "Alice", email: "alice@example.com" })
    else Err(NotFound)
}

let getUserEmail = (id) =>
    findUser(id)
    |> Result.map((user) => user.email)
    |> Result.flatMap(validateEmail)
```

## Future Considerations

- Effect system for managing side effects
- Async/await or Promise integration
- Module system improvements (namespaces, qualified imports)
- Type classes/traits for ad-hoc polymorphism
- Compile-time metaprogramming
- Optimizations (tail-call elimination, etc.)
