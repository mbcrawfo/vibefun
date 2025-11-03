# Vibefun Language Specification

**Version:** 0.1.0 (Draft)
**Date:** October 2025
**Status:** In Development

## Table of Contents

1. [Introduction](#introduction)
2. [Language Philosophy](#language-philosophy)
3. [Lexical Structure](#lexical-structure)
4. [Type System](#type-system)
5. [Expressions](#expressions)
6. [Functions](#functions)
7. [Pattern Matching](#pattern-matching)
8. [Modules](#modules)
9. [JavaScript Interop](#javascript-interop)
10. [Error Handling](#error-handling)
11. [Standard Library](#standard-library)
12. [Compilation Model](#compilation-model)

---

## Introduction

**Vibefun** is a pragmatic functional programming language that transpiles to JavaScript. It combines the elegance and safety of ML-style functional programming with practical features for real-world application development. Vibefun aims to bring strong static typing, algebraic data types, and powerful type inference to the JavaScript ecosystem while maintaining excellent interoperability with existing JavaScript code.

### Design Goals

- **Type Safety**: Strong static typing with comprehensive type inference
- **Functional-First**: Immutability by default, first-class functions, and algebraic data types
- **Pragmatic**: Escape hatches for JavaScript interop when needed
- **Developer Experience**: Clear error messages and excellent tooling
- **JavaScript Target**: Generate readable, debuggable JavaScript code

### Target Audience

Vibefun is designed for developers who:
- Want ML-style functional programming on the JavaScript runtime
- Value type safety and immutability but need JavaScript interop
- Prefer expressive type systems and pattern matching
- Build real-world applications requiring reliability and maintainability

---

## Language Philosophy

### Pragmatic Functional Programming

Vibefun follows a "pragmatic functional" philosophy similar to OCaml and F#. The language provides:

- **Strong functional defaults**: Immutability, pure functions, and algebraic data types are the norm
- **Escape hatches**: Explicit mechanisms (`mut`, `unsafe`) when mutability or side effects are needed
- **Practicality over purity**: The goal is productive real-world development, not theoretical purity

### Explicitness Over Implicitness

Vibefun values clear, explicit code:

- **Explicit boundaries**: JavaScript interop requires `external` and `unsafe` keywords
- **Explicit mutability**: Mutation requires `let mut` and the `:=` operator
- **Explicit exports**: Module exports are explicitly declared
- **Optional type annotations**: Inference works well, but annotations improve clarity at boundaries

### Developer Experience First

Every design decision considers developer experience:

- **Clear error messages**: Detailed, actionable error messages with location information
- **Minimal boilerplate**: Type inference reduces annotation burden
- **Readable generated code**: JavaScript output should be understandable for debugging
- **Fast compilation**: Keep compile times reasonable

---

## Lexical Structure

### Source Files

Vibefun source files use the `.vf` extension. Each file is a module.

**Encoding:** UTF-8
**Line Endings:** LF (`\n`) or CRLF (`\r\n`)

### Comments

#### Single-Line Comments

```vibefun
// This is a single-line comment
let x = 42  // Comment at end of line
```

#### Multi-Line Comments

Multi-line comments support nesting:

```vibefun
/*
 * This is a multi-line comment
 * It can span multiple lines
 */

/* Outer comment /* inner nested comment */ still in outer */
```

### Whitespace

- **Spaces** and **tabs** are treated as whitespace and ignored (except in strings)
- **Newlines** are significant in some contexts (semicolon insertion)
- **Indentation** is not significant (unlike Python or Haskell)

### Keywords

Vibefun has 17 reserved keywords:

```
let       mut       type      if
then      else      match     when
rec       and       import    export
external  unsafe    from      as
ref
```

Additional reserved for future use:
```
async     await     trait     impl
where     do        yield     return
```

### Identifiers

**Syntax:** Identifiers start with a Unicode letter or underscore, followed by letters, digits, or underscores.

**Pattern:** `[a-zA-Z_\p{L}][a-zA-Z0-9_\p{L}]*`

**Examples:**
```vibefun
x
userName
_private
café
αβγ
変数
```

**Conventions:**
- Variables and functions: `camelCase`
- Types and constructors: `PascalCase`
- Constants: `camelCase`

### Literals

#### Boolean Literals

```vibefun
true
false
```

#### Integer Literals

```vibefun
42          // Decimal
0xFF        // Hexadecimal (255)
0b1010      // Binary (10)
```

**Note:** Underscores can be used as separators: `1_000_000`

#### Float Literals

```vibefun
3.14
0.5
1e10        // Scientific notation (10000000000)
3.14e-2     // (0.0314)
```

#### String Literals

**Single-line strings:**
```vibefun
"hello"
"hello, world!"
```

**Multi-line strings:**
```vibefun
"""
This is a multi-line string.
It can span multiple lines.
"""
```

**Escape sequences:**
- `\\` - Backslash
- `\"` - Double quote
- `\'` - Single quote
- `\n` - Newline
- `\r` - Carriage return
- `\t` - Tab
- `\xHH` - Hex escape (e.g., `\x41` = 'A')
- `\uXXXX` - Unicode escape (e.g., `\u03B1` = 'α')
- `\u{XXXXXX}` - Long unicode escape (e.g., `\u{1F600}` = '😀')

#### Unit Literal

```vibefun
()  // The unit value (like void in other languages)
```

### Operators

#### Arithmetic Operators

```
+     Addition
-     Subtraction / Negation
*     Multiplication
/     Division
%     Modulo
```

#### Comparison Operators

```
==    Equal
!=    Not equal
<     Less than
<=    Less than or equal
>     Greater than
>=    Greater than or equal
```

#### Logical Operators

```
&&    Logical AND
||    Logical OR
!     Logical NOT (also used for dereference - see Special Operators)
```

#### String Operators

```
&     String concatenation
```

#### Special Operators

```
|>    Forward pipe (function application)
>>    Forward composition
<<    Backward composition
->    Function type / arrow
=>    Lambda / function expression
::    List cons
...   Spread operator (records, lists)
.     Record field access / module access
```

##### Reference Operators

```
:=    Reference assignment - updates a mutable reference
      Type: (Ref<T>, T) -> Unit
      Example: myRef := newValue
      See: Mutable References section

!     Dereference / Logical NOT (type-based disambiguation)
      When applied to Ref<T>: extracts value (type Ref<T> -> T)
      When applied to Bool: logical negation (type Bool -> Bool)
      Examples:
        !myRef    // Dereference: reads value from Ref<Int>
        !true     // Logical NOT: evaluates to false
      The compiler automatically determines which operation based on operand type.
      See: Mutable References section
```

#### Punctuation

```
(  )    Parentheses (grouping, tuples, function calls)
{  }    Braces (blocks, records, match branches)
[  ]    Brackets (lists, arrays)
,       Comma (separates items)
;       Semicolon (statement separator)
:       Colon (type annotations, pattern matching)
|       Pipe (variant constructors, match cases)
```

---

## Type System

Vibefun uses a Hindley-Milner type system extended with generics, union types, and records. Type inference minimizes the need for annotations while maintaining strong static typing.

### Type System Design

Vibefun's type system is based on **Algorithm W** with several modern extensions:

- **Constraint-based inference**: Generates and solves type constraints for flexible, modular type checking
- **Type variable scoping with levels**: Prevents type variables from escaping their scope (Standard ML approach)
- **Width subtyping for records**: Records with extra fields are subtypes (duck-typing-like flexibility)
- **Nominal typing for variants**: Variant types require exact name matching
- **Let-polymorphism**: Automatic generalization and instantiation of polymorphic types
- **Syntactic value restriction**: Only syntactic values can be generalized (prevents unsound polymorphism)

### Primitive Types

#### Int

Signed integer numbers (JavaScript `number`, integer values).

```vibefun
let x: Int = 42
let y = -10  // Inferred as Int
```

#### Float

Floating-point numbers (JavaScript `number`).

```vibefun
let pi: Float = 3.14159
let e = 2.71828  // Inferred as Float
```

#### String

Unicode text strings (JavaScript `string`).

```vibefun
let name: String = "Alice"
let greeting = "Hello, " &name
```

#### Bool

Boolean values (JavaScript `boolean`).

```vibefun
let isActive: Bool = true
let isDone = false
```

#### Unit

The unit type represents "no value" (like `void` in other languages). The only value of type `Unit` is `()`.

```vibefun
let nothing: Unit = ()
let log = (msg) => unsafe { console_log(msg) }  // Returns Unit
```

### Ref<T> (Mutable References)

The `Ref<T>` type represents a **mutable reference cell** containing a value of type `T`. Refs provide controlled mutability in Vibefun's otherwise immutable-by-default language.

```vibefun
let mut counter: Ref<Int> = ref(0)
let mut state: Ref<Option<String>> = ref(None)
```

Refs are created with the `ref` keyword, read with the dereference operator `!`, and updated with the assignment operator `:=`:

```vibefun
let mut x = ref(10)   // Create: Ref<Int>
let value = !x        // Read: Int
x := 20               // Update: Unit
```

**Type characteristics:**
- `Ref<T>` is a **parameterized type** (generic over `T`)
- All refs must be declared with the `mut` keyword: `let mut x = ref(...)`
- Refs are **mutable cells**—the reference itself is immutable, but the contained value can change
- Creating a ref: `ref(value)` has type `Ref<T>` when `value` has type `T`
- Reading a ref: `!refExpr` has type `T` when `refExpr` has type `Ref<T>`
- Updating a ref: `refExpr := value` requires `refExpr: Ref<T>` and `value: T`, returns `Unit`

**See also:** The [Mutable References](#mutable-references) section for comprehensive documentation, examples, and usage guidance.

### Function Types

Functions are first-class values with types written using the arrow notation.

```vibefun
// Type signature
add: (Int, Int) -> Int

// Single argument function
identity: (Int) -> Int

// Higher-order function
map: <A, B>(List<A>, (A) -> B) -> List<B>

// Curried function (all functions are curried by default)
add: (Int) -> (Int) -> Int
```

### Type Variables

Type variables represent polymorphic types and are written with lowercase letters, typically starting with `'a`, `'b`, etc. In syntax, they may be written as `<A>`, `<T>`, etc.

```vibefun
// Polymorphic identity function
let identity: <T>(T) -> T = (x) => x

// Works with any type
identity(42)        // Int -> Int
identity("hello")   // String -> String
```

### Record Types

Records are product types with named fields.

#### Type Definition

```vibefun
type Person = {
    name: String,
    age: Int,
    email: String
}
```

#### Construction

```vibefun
let person = {
    name: "Alice",
    age: 30,
    email: "alice@example.com"
}
```

#### Field Access

```vibefun
let name = person.name       // "Alice"
let age = person.age         // 30
```

#### Update (Immutable)

```vibefun
let older = { ...person, age: 31 }  // Creates new record
```

#### Structural Typing with Width Subtyping

Records use **structural typing with width subtyping**: two record types with the same fields are compatible, and records with **extra fields** are subtypes of records with fewer fields.

```vibefun
type Point2D = { x: Int, y: Int }
type Vector2D = { x: Int, y: Int }

let p: Point2D = { x: 1, y: 2 }
let v: Vector2D = p  // OK - same structure

// Width subtyping: records with extra fields accepted
let point3D = { x: 1, y: 2, z: 3 }
let point2D: Point2D = point3D  // OK - has x and y (z ignored)

// Functions accept "at least these fields"
let getX = (p: { x: Int }) => p.x

getX({ x: 1, y: 2 })        // OK - has x (and extra y)
getX({ x: 5, y: 10, z: 15 }) // OK - has x (extra fields ignored)
```

This provides **duck-typing-like flexibility** with compile-time safety: functions can work with any record that has "at least" the required fields.

### Variant Types

Variants (also called sum types or tagged unions) represent values that can be one of several alternatives.

#### Simple Enums

```vibefun
type Color = Red | Green | Blue
```

#### Variants with Data

```vibefun
type Option<T> = Some(T) | None

type Result<T, E> =
    | Ok(T)
    | Err(E)
```

#### Complex Variants

```vibefun
type Shape =
    | Circle(Float)                          // radius
    | Rectangle(Float, Float)                // width, height
    | Triangle(Float, Float, Float)          // sides
```

#### Constructor Functions

Variant constructors are functions:

```vibefun
Some: <T>(T) -> Option<T>
None: <T>Option<T>

Circle: (Float) -> Shape
Rectangle: (Float, Float) -> Shape
```

#### Nominal Typing for Variants

Variants use **nominal typing**: two variant types are compatible **only if they have the same type name**, even if they have identical constructors.

```vibefun
type Status = Pending | Active | Complete
type State = Pending | Active | Complete

let status: Status = Pending
let state: State = status  // ERROR: Status ≠ State

// Even though constructors are identical, these are different types
```

This prevents accidental mixing of semantically different types:

```vibefun
type HttpStatus = Ok | NotFound | ServerError
type DatabaseStatus = Ok | NotFound | ServerError

// These are DIFFERENT types - cannot be mixed
let httpStatus: HttpStatus = Ok
let dbStatus: DatabaseStatus = httpStatus  // ERROR: different types
```

**Rationale**: Nominal typing for variants provides type safety by preventing confusion between types that happen to have the same structure but represent different concepts.

### Generics (Parametric Polymorphism)

Generics allow types and functions to be parameterized by type variables.

#### Generic Types

```vibefun
type Box<T> = { value: T }

type Pair<A, B> = { first: A, second: B }

type Either<L, R> = Left(L) | Right(R)
```

#### Generic Functions

```vibefun
let identity: <T>(T) -> T = (x) => x

let map: <A, B>(List<A>, (A) -> B) -> List<B> = (list, f) => ...
```

#### Multiple Type Parameters

```vibefun
let zip: <A, B>(List<A>, List<B>) -> List<Pair<A, B>> = ...
```

### Union Types

Union types represent values that can be one of several types.

#### Type Unions

```vibefun
type NumberOrString = Int | String

let x: NumberOrString = 42
let y: NumberOrString = "hello"
```

#### Literal Unions

```vibefun
type Status = "pending" | "active" | "complete"

let status: Status = "pending"  // OK
let invalid: Status = "unknown" // Error
```

### Type Aliases

Type aliases create alternative names for existing types.

```vibefun
type UserId = Int
type Username = String
type Callback<T> = (T) -> Unit
```

Type aliases are transparent - they don't create new types, just new names.

### Type Annotations

Type annotations are optional but can improve clarity and catch errors earlier.

#### Variable Annotations

```vibefun
let x: Int = 42
let name: String = "Alice"
```

#### Function Annotations

```vibefun
// Full annotation
let add: (Int, Int) -> Int = (x, y) => x + y

// Parameter annotations
let add = (x: Int, y: Int) => x + y

// Return type annotation
let add = (x, y): Int => x + y
```

#### When Annotations Are Required

1. External declarations (FFI)
2. Ambiguous recursive functions
3. Complex type parameters
4. Public API boundaries (recommended for documentation)

### Type Inference

Vibefun uses Hindley-Milner type inference with Algorithm W. The compiler infers types for most code without annotations.

```vibefun
// All types inferred
let add = (x, y) => x + y              // (Int, Int) -> Int
let double = (x) => add(x, x)          // (Int) -> Int
let numbers = [1, 2, 3]                 // List<Int>
let result = numbers |> map(double)     // List<Int>
```

---

## Expressions

Everything in Vibefun is an expression that evaluates to a value.

### Literal Expressions

```vibefun
42          // Int
3.14        // Float
"hello"     // String
true        // Bool
()          // Unit
```

### Variable References

```vibefun
let x = 42
let y = x  // Variable reference
```

### Function Calls

```vibefun
add(1, 2)              // Function call
map([1, 2, 3], double) // Higher-order function
```

### Operators

```vibefun
1 + 2                  // Arithmetic
x == y                 // Comparison
true && false          // Logical
"hello" &" world"    // String concatenation
```

### If Expressions

If expressions always return a value. Both branches must have the same type.

```vibefun
let max = (a, b) =>
    if a > b then a else b

let sign = (x) =>
    if x > 0 then "positive"
    else if x < 0 then "negative"
    else "zero"
```

### Match Expressions

Pattern matching with exhaustiveness checking.

```vibefun
let describe = (opt) => match opt {
    | Some(x) => "got " &String.fromInt(x)
    | None => "nothing"
}
```

### Record Expressions

```vibefun
// Construction
let person = { name: "Alice", age: 30 }

// Access
person.name

// Update
{ ...person, age: 31 }
```

### List Expressions

```vibefun
[]                     // Empty list
[1, 2, 3]              // List literal
[1, 2, ...rest]        // Spread
x :: xs                // Cons
```

### Lambda Expressions

```vibefun
(x) => x + 1                    // Single parameter
(x, y) => x + y                 // Multiple parameters
() => 42                        // No parameters
(x) => { let y = x + 1; y }     // Block body
```

### Block Expressions

Blocks are sequences of expressions. The last expression is the result.

```vibefun
{
    let x = 10
    let y = 20
    x + y    // Result of block
}
```

### Pipe Expressions

```vibefun
// Forward pipe |>
data
    |> filter((x) => x > 0)
    |> map((x) => x * 2)
    |> sum

// Equivalent to:
sum(map(filter(data, (x) => x > 0), (x) => x * 2))
```

---

## Functions

Functions are first-class values in Vibefun. All functions are automatically curried.

### Function Definitions

```vibefun
// Named function
let add = (x, y) => x + y

// With type annotation
let add: (Int, Int) -> Int = (x, y) => x + y

// Multi-line body
let greet = (name) => {
    let message = "Hello, " &name
    console_log(message)
    message
}
```

### Currying

All multi-argument functions are automatically curried.

```vibefun
let add = (x, y) => x + y
// Type: (Int) -> (Int) -> Int

let increment = add(1)  // Partial application
// Type: (Int) -> Int

increment(5)  // 6
```

### Recursive Functions

Use the `rec` keyword for recursive functions.

```vibefun
let rec factorial = (n) =>
    if n <= 1 then 1
    else n * factorial(n - 1)

let rec length = (list) => match list {
    | [] => 0
    | [_, ...rest] => 1 + length(rest)
}
```

### Mutually Recursive Functions

Use the `and` keyword to define mutually recursive functions (OCaml/F# style):

```vibefun
let rec isEven = (n) =>
    if n == 0 then true
    else isOdd(n - 1)
and isOdd = (n) =>
    if n == 0 then false
    else isEven(n - 1)

// Three-way mutual recursion
let rec parseExpr = (tokens) =>
    // ... can call parseTerm and parseFactor
    parseTerm(tokens)
and parseTerm = (tokens) =>
    // ... can call parseExpr and parseFactor
    parseExpr(tokens)
and parseFactor = (tokens) =>
    // ... can call parseExpr and parseTerm
    parseTerm(tokens)
```

The `and` keyword explicitly declares a mutually recursive group. All functions in the group can reference each other.

### Higher-Order Functions

Functions that take or return other functions.

```vibefun
let map: <A, B>(List<A>, (A) -> B) -> List<B> = (list, f) =>
    match list {
        | [] => []
        | [x, ...xs] => [f(x), ...map(xs, f)]
    }

let compose: <A, B, C>((B) -> C, (A) -> B) -> (A) -> C = (f, g) =>
    (x) => f(g(x))
```

### Anonymous Functions

```vibefun
(x) => x + 1

(x, y) => x * y

numbers |> filter((x) => x > 0)
```

### Function Composition

```vibefun
// Forward composition >>
let processData = parse >> validate >> transform

// Backward composition <<
let processData = transform << validate << parse

// Equivalent to:
let processData = (x) => transform(validate(parse(x)))
```

---

## Pattern Matching

Pattern matching is a powerful way to destructure and inspect data. The compiler ensures all cases are handled (exhaustiveness checking).

### Match Expressions

```vibefun
match expression {
    | pattern1 => result1
    | pattern2 => result2
    | pattern3 => result3
}
```

### Literal Patterns

```vibefun
let describe = (n) => match n {
    | 0 => "zero"
    | 1 => "one"
    | 2 => "two"
    | _ => "many"
}
```

### Variable Patterns

```vibefun
let identity = (x) => match x {
    | value => value
}
```

### Wildcard Pattern

The underscore `_` matches anything and discards the value.

```vibefun
match option {
    | Some(x) => x
    | _ => 0
}
```

### Variant Patterns

```vibefun
let unwrap = (opt) => match opt {
    | Some(x) => x
    | None => panic("unwrap on None")
}

let handleResult = (result) => match result {
    | Ok(value) => value
    | Err(error) => defaultValue
}
```

### List Patterns

```vibefun
let sum = (list) => match list {
    | [] => 0
    | [x] => x
    | [x, ...rest] => x + sum(rest)
}

let firstTwo = (list) => match list {
    | [a, b, ..._] => Some((a, b))
    | _ => None
}
```

### Record Patterns

```vibefun
let greetPerson = (person) => match person {
    | { name, age } => "Hello " &name &", age " &String.fromInt(age)
}

// Or in function parameters
let greet = ({ name }) => "Hello " &name
```

### Nested Patterns

```vibefun
let process = (result) => match result {
    | Ok(Some(value)) => "got " &String.fromInt(value)
    | Ok(None) => "got nothing"
    | Err(msg) => "error: " &msg
}
```

### Guards (When Clauses)

```vibefun
let classify = (n) => match n {
    | x when x < 0 => "negative"
    | 0 => "zero"
    | x when x > 0 && x < 10 => "small positive"
    | x when x >= 10 => "large positive"
}
```

### Or Patterns

```vibefun
match status {
    | "pending" | "loading" => "in progress"
    | "complete" => "done"
    | _ => "unknown"
}
```

---

## Mutable References

Vibefun is a functional-first language that encourages immutability and pure functions. However, certain scenarios benefit from controlled mutability—particularly when implementing imperative algorithms or interfacing with mutable JavaScript APIs. **Mutable references** (refs) provide a pragmatic escape hatch for these cases.

> **Design Philosophy**: Refs should be used sparingly. Prefer pure functional alternatives (recursion, `map`, `fold`, etc.) whenever possible. Refs are most appropriate for:
> - Imperative algorithms where mutation is clearer (loops with accumulators, counters)
> - Interfacing with JavaScript APIs that expect or return mutable state
> - Performance-critical code where avoiding allocations is essential

### The Ref<T> Type

A ref is a **mutable cell** containing a value of type `T`. The type is written as `Ref<T>`:

```vibefun
// A mutable reference to an Int
let mut counter: Ref<Int> = ref(0)

// A mutable reference to an Option
let mut state: Ref<Option<String>> = ref(None)
```

The `Ref<T>` type is parameterized—it wraps a value of any type and allows that value to be read and updated.

### Creating References

Create a mutable reference using the `ref` keyword with the `mut` declaration:

```vibefun
let mut x = ref(10)         // Ref<Int>
let mut name = ref("Alice") // Ref<String>
let mut items = ref([])     // Ref<List<T>>
```

**Important**: The `mut` keyword is **required** when declaring a ref. This makes mutation explicit and visible at the declaration site.

### Reading References (Dereference)

Read the current value of a ref using the **dereference operator** `!`:

```vibefun
let mut counter = ref(0)
let value = !counter  // Read the value: 0
```

The `!` operator has type `Ref<T> -> T`—it extracts the value from the ref.

### Updating References (Assignment)

Update the value stored in a ref using the **reference assignment operator** `:=`:

```vibefun
let mut counter = ref(0)
counter := 5        // Update to 5
counter := !counter + 1  // Increment: read, add 1, write back
```

The `:=` operator has type `(Ref<T>, T) -> Unit`—it updates the ref and returns `()`.

### The `!` Operator: Type-Based Disambiguation

The `!` operator serves **two purposes** in Vibefun:
1. **Logical NOT** when applied to a `Bool`
2. **Dereference** when applied to a `Ref<T>`

The compiler distinguishes between these uses based on the **type** of the operand:

```vibefun
// Logical NOT (operand type: Bool)
let isActive = true
let isInactive = !isActive  // false

// Dereference (operand type: Ref<Int>)
let mut counter = ref(42)
let value = !counter  // 42
```

This type-based resolution is automatic—you don't need to do anything special. The compiler infers the correct operation from the context.

### Basic Example: Counter

```vibefun
let mut counter = ref(0)

let increment = () => {
    counter := !counter + 1
}

let getCount = () => !counter

increment()
increment()
let total = getCount()  // 2
```

### Example: Imperative Factorial

Refs are useful when translating imperative algorithms:

```vibefun
let factorial = (n) => {
    let mut result = ref(1)
    let mut i = ref(1)

    while !i <= n {
        result := !result * !i
        i := !i + 1
    }

    !result
}

factorial(5)  // 120
```

**Compare to the pure functional version:**

```vibefun
// Preferred functional approach
let factorial = (n) => {
    let rec loop = (acc, i) => {
        if i > n then acc
        else loop(acc * i, i + 1)
    }
    loop(1, 1)
}
```

The functional version avoids mutation entirely and is generally preferred in Vibefun code.

### Example: Refs with Variants

Refs can hold any type, including variants:

```vibefun
let mut state = ref(None)

let setValue = (x) => {
    state := Some(x)
}

let getValue = () => match !state {
    | Some(x) => x
    | None => 0
}

setValue(42)
getValue()  // 42
```

### Example: Multiple Refs

```vibefun
let swap = () => {
    let mut x = ref(10)
    let mut y = ref(20)

    let temp = !x
    x := !y
    y := temp

    (!x, !y)  // (20, 10)
}
```

### Example: Refs in Closures

Refs can be captured by closures, enabling stateful functions:

```vibefun
let makeCounter = () => {
    let mut count = ref(0)

    let increment = () => {
        count := !count + 1
        !count
    }

    increment
}

let counter1 = makeCounter()
counter1()  // 1
counter1()  // 2

let counter2 = makeCounter()
counter2()  // 1 (independent state)
```

### When to Use Refs

✅ **Use refs when:**
- Implementing imperative algorithms where mutation is natural (loops with accumulators)
- Interfacing with mutable JavaScript APIs
- Performance is critical and you need to avoid allocations
- Porting imperative code from other languages

❌ **Avoid refs when:**
- A pure functional solution is equally clear (prefer `map`, `fold`, recursion)
- You're working with data transformations (use immutable operations)
- The mutation is not performance-critical
- You can use pattern matching or recursion instead

### Type Checking Rules

The type checker enforces the following rules for refs:

1. **Creating refs**: `ref(value)` has type `Ref<T>` when `value` has type `T`
2. **Dereferencing**: `!refExpr` has type `T` when `refExpr` has type `Ref<T>`
3. **Assignment**: `refExpr := value` requires `refExpr: Ref<T>` and `value: T`, returns `Unit`

These rules ensure type safety—you cannot assign a value of the wrong type to a ref, and dereferencing always produces a value of the expected type.

### Best Practices

1. **Declare refs with `mut`**: Always use `let mut x = ref(...)` to make mutation explicit
2. **Keep refs local**: Avoid exposing refs in public APIs—prefer functions that hide the mutation
3. **Minimize scope**: Create refs in the smallest scope possible
4. **Prefer pure functions**: Use refs only when the functional alternative is significantly worse
5. **Document why**: When you use a ref, comment on why mutation was chosen over immutability

---

## Modules

Each `.vf` file is a module. Modules provide namespacing and code organization.

### Exports

```vibefun
// Export declarations
export let add = (x, y) => x + y

export type Person = { name: String, age: Int }

// Multiple exports
export let x = 10
export let y = 20
```

### Imports

```vibefun
// Named imports
import { map, filter } from './list'

// Import all as namespace
import * as List from './list'

// Import types
import type { Person } from './types'

// Mixed imports
import { type User, getUser, updateUser } from './api'
```

### Module Paths

```vibefun
// Relative imports
import { utils } from './utils'
import { helpers } from '../helpers'

// Module imports (from node_modules or configured paths)
import { Option, Result } from 'vibefun/std'
```

### Re-exports

```vibefun
// Re-export from another module
export { map, filter } from './list'
export * from './utils'
```

### Module Structure

```vibefun
// src/user.vf
export type User = {
    id: Int,
    name: String,
    email: String
}

export let validateEmail = (email) => ...

export let createUser = (name, email) => ...

// src/main.vf
import { type User, createUser } from './user'

let main = () => {
    let user = createUser("Alice", "alice@example.com")
    ...
}
```

---

## JavaScript Interop

Vibefun provides explicit, type-safe JavaScript interop through the FFI (Foreign Function Interface).

### External Declarations

The `external` keyword declares JavaScript values with their types.

#### Single External Declarations

```vibefun
// Declare JS function
external console_log: (String) -> Unit = "console.log"

// From specific module
external fetch: (String) -> Promise<Response> = "fetch" from "node-fetch"

// JS constants
external process_env: JsObject = "process.env" from "process"

// Exported external (can be imported by other modules)
export external myHelper: (Int) -> String = "helper"
```

#### External Blocks

When wrapping JavaScript libraries, use external blocks to declare multiple bindings at once:

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
    Request: Type = "Request"
}

// Exported external block
export external from "react" {
    useState: (a) -> (a, (a) -> Unit) = "useState"
    useEffect: ((Unit) -> Unit, List<a>) -> Unit = "useEffect"
}
```

#### Overloaded External Functions

Many JavaScript APIs have functions with multiple signatures (overloading). Vibefun supports declaring multiple external signatures for the same JavaScript function:

```vibefun
// Multiple separate declarations for the same JS function
external fetch: (String) -> Promise<Response> = "fetch"
external fetch: (String, RequestInit) -> Promise<Response> = "fetch"

// Or grouped in an external block
external {
    setTimeout: ((Unit) -> Unit, Int) -> TimeoutId = "setTimeout"
    setTimeout: ((Unit) -> Unit, Int, Any) -> TimeoutId = "setTimeout"
}

// With module imports
external from "node:timers" {
    setTimeout: ((Unit) -> Unit, Int) -> TimeoutId = "setTimeout"
    setTimeout: ((Unit) -> Unit, Int, Any) -> TimeoutId = "setTimeout"
}
```

**Overload Resolution:**

The compiler automatically selects the correct overload based on the number of arguments at the call site:

```vibefun
unsafe {
    // Calls first overload: (String) -> Promise<Response>
    fetch("https://api.example.com/users")

    // Calls second overload: (String, RequestInit) -> Promise<Response>
    fetch("https://api.example.com/users", { method: "POST" })

    // Calls first setTimeout overload
    setTimeout(callback, 1000)

    // Calls second setTimeout overload
    setTimeout(callback, 1000, extraArg)
}
```

**Restrictions:**

- Only `external` functions can be overloaded (not pure Vibefun functions)
- All overloads must map to the same JavaScript function name
- All overloads must have the same `from` module (if specified)
- All overloads must be function types
- Overloads are resolved by argument count (arity)

**Error Messages:**

Clear errors when no overload matches or the call is ambiguous:

```vibefun
external fetch: (String) -> Promise<Response> = "fetch"
external fetch: (String, RequestInit) -> Promise<Response> = "fetch"

unsafe {
    fetch()  // Error: No matching signature for 'fetch'
             // Expected 1 or 2 arguments, but got 0

    fetch("url", options, extra)  // Error: No matching signature for 'fetch'
                                   // Expected 1 or 2 arguments, but got 3
}
```

**When to Use Overloading:**

Overloading is designed for JavaScript interop where the underlying JS function has multiple signatures. For pure Vibefun code, prefer pattern matching or different function names:

```vibefun
// Instead of overloading (not supported for pure Vibefun):
// let process = (x: Int) => ...
// let process = (x: String) => ...

// Use pattern matching:
let process = (x) => match x {
    | n: Int => n * 2
    | s: String => s & s
}

// Or use different names:
let processInt = (n: Int) => n * 2
let processString = (s: String) => s & s
```

#### External Type Declarations

Declare the shape of JavaScript objects within external blocks:

```vibefun
external {
    // Declare types for JS objects
    type Response = { ok: Bool, status: Int, json: (Unit) -> Promise<Json> }
    type RequestInit = { method: String, headers: JsObject }

    // Then declare functions that use those types
    fetch: (String, RequestInit) -> Promise<Response> = "fetch"
}

// Or separately
external from "node-fetch" {
    type Response = { ok: Bool, status: Int }
    type Headers = { append: (String, String) -> Unit }

    fetch: (String) -> Promise<Response> = "fetch"
    Headers: Type = "Headers"
}
```

**Syntax Summary:**

```vibefun
// Single declaration
external name: Type = "jsName" [from "module"]

// Simple block
external {
    name1: Type1 = "jsName1"
    name2: Type2 = "jsName2"
    type TypeName = { ... }
}

// Block with module import
external from "module" {
    name: Type = "jsName"
    type TypeName = { ... }
}

// Exported (applies to both single and blocks)
export external name: Type = "jsName"
export external { ... }
export external from "module" { ... }
```

### Unsafe Blocks

All JavaScript interop must occur in `unsafe` blocks.

```vibefun
let debug = (msg) => unsafe {
    console_log(msg)
}

let fetchUser = (id) => unsafe {
    let url = "https://api.example.com/users/" &String.fromInt(id)
    fetch(url)
}
```

### Type Safety at Boundaries

Values crossing FFI boundaries are checked:

```vibefun
external parseJson: (String) -> Json = "JSON.parse"

// Checked wrapper
let safeParseJson = (str) => unsafe {
    try {
        Some(parseJson(str))
    } catch {
        None
    }
}
```

### Calling Vibefun from JavaScript

Compiled Vibefun functions can be called from JavaScript:

```javascript
// Generated JavaScript
const add = (x) => (y) => x + y;

// Call from JS
add(1)(2);  // 3

// With partial application
const increment = add(1);
increment(5);  // 6
```

---

## Error Handling

Vibefun uses algebraic data types for error handling rather than exceptions.

### Result Type

```vibefun
type Result<T, E> = Ok(T) | Err(E)

let divide = (a, b) =>
    if b == 0
    then Err("Division by zero")
    else Ok(a / b)

let result = divide(10, 2)
match result {
    | Ok(value) => "Result: " &String.fromInt(value)
    | Err(msg) => "Error: " &msg
}
```

### Option Type

```vibefun
type Option<T> = Some(T) | None

let find = (list, predicate) => match list {
    | [] => None
    | [x, ...xs] => if predicate(x) then Some(x) else find(xs, predicate)
}
```

### Error Propagation

```vibefun
// Manual propagation
let getUserEmail = (id) => {
    let userResult = findUser(id)
    match userResult {
        | Ok(user) => validateEmail(user.email)
        | Err(e) => Err(e)
    }
}

// Using flatMap for chaining
let getUserEmail = (id) =>
    findUser(id)
    |> Result.flatMap((user) => validateEmail(user.email))
```

### Panic (Last Resort)

```vibefun
let panic: (String) -> <never> = ...

let unwrap = (opt) => match opt {
    | Some(x) => x
    | None => panic("unwrap called on None")
}
```

**Note:** Avoid `panic` in library code. Prefer `Result` or `Option`.

---

## Standard Library

The standard library provides essential data structures and utilities.

### List Module

```vibefun
List.map: <A, B>(List<A>, (A) -> B) -> List<B>
List.filter: <A>(List<A>, (A) -> Bool) -> List<A>
List.fold: <A, B>(List<A>, B, (B, A) -> B) -> B
List.foldRight: <A, B>(List<A>, B, (A, B) -> B) -> B
List.length: <A>(List<A>) -> Int
List.head: <A>(List<A>) -> Option<A>
List.tail: <A>(List<A>) -> Option<List<A>>
List.reverse: <A>(List<A>) -> List<A>
List.concat: <A>(List<A>, List<A>) -> List<A>
List.flatten: <A>(List<List<A>>) -> List<A>
```

### Option Module

```vibefun
Option.map: <A, B>(Option<A>, (A) -> B) -> Option<B>
Option.flatMap: <A, B>(Option<A>, (A) -> Option<B>) -> Option<B>
Option.getOrElse: <A>(Option<A>, A) -> A
Option.isSome: <A>(Option<A>) -> Bool
Option.isNone: <A>(Option<A>) -> Bool
Option.unwrap: <A>(Option<A>) -> A  // Panics on None
```

### Result Module

```vibefun
Result.map: <T, E, U>(Result<T, E>, (T) -> U) -> Result<U, E>
Result.mapErr: <T, E, F>(Result<T, E>, (E) -> F) -> Result<T, F>
Result.flatMap: <T, E, U>(Result<T, E>, (T) -> Result<U, E>) -> Result<U, E>
Result.isOk: <T, E>(Result<T, E>) -> Bool
Result.isErr: <T, E>(Result<T, E>) -> Bool
Result.unwrap: <T, E>(Result<T, E>) -> T  // Panics on Err
Result.unwrapOr: <T, E>(Result<T, E>, T) -> T
```

### String Module

```vibefun
String.length: (String) -> Int
String.concat: (String, String) -> String  // Also &
String.toUpperCase: (String) -> String
String.toLowerCase: (String) -> String
String.trim: (String) -> String
String.split: (String, String) -> List<String>
String.contains: (String, String) -> Bool
String.startsWith: (String, String) -> Bool
String.endsWith: (String, String) -> Bool
String.fromInt: (Int) -> String
String.fromFloat: (Float) -> String
String.toInt: (String) -> Option<Int>
String.toFloat: (String) -> Option<Float>
```

### Int Module

```vibefun
Int.toString: (Int) -> String
Int.toFloat: (Int) -> Float
Int.abs: (Int) -> Int
Int.max: (Int, Int) -> Int
Int.min: (Int, Int) -> Int
```

### Float Module

```vibefun
Float.toString: (Float) -> String
Float.toInt: (Float) -> Int
Float.round: (Float) -> Int
Float.floor: (Float) -> Int
Float.ceil: (Float) -> Int
Float.abs: (Float) -> Float
```

---

## Compilation Model

### Compilation Pipeline

1. **Lexing**: Source code → Tokens
2. **Parsing**: Tokens → AST
3. **Desugaring**: Surface AST → Core AST
4. **Type Checking**: Core AST + Type Inference
5. **Optimization**: Optional transformations
6. **Code Generation**: Core AST → JavaScript

### JavaScript Target

Vibefun generates JavaScript code targeting **ECMAScript 2020 (ES2020)**.

#### Guaranteed Features

The generated JavaScript is guaranteed to be valid ES2020, which includes:

- Arrow functions, `const`/`let` declarations
- Destructuring, spread operators
- Promises, `async`/`await`
- Optional chaining (`?.`), nullish coalescing (`??`)
- All ES2020 standard library features

#### Compatibility

- **Node.js**: 14.0+ (Node.js 16+ recommended)
- **Browsers**: Modern browsers (2020+)
- **Legacy targets**: Transpilation for older environments is the user's responsibility

#### Implementation Details

The specific patterns used to generate JavaScript from Vibefun code (such as how functions are curried, how algebraic data types are represented, or how pattern matching is compiled) are **implementation details** and may change between compiler versions without notice.

The generated code is designed to be **readable for debugging purposes**, but should be treated as compiler output rather than a stable API. Always use source maps to debug original Vibefun source code rather than inspecting generated JavaScript.

### Source Maps

Vibefun generates source maps for debugging:

```bash
vibefun compile main.vf -o main.js --source-maps
```

This allows stepping through original Vibefun code in browser/Node.js debuggers.

### Runtime Type Checking

Optional runtime type checking at FFI boundaries:

```bash
vibefun compile main.vf --runtime-checks=ffi     # Only FFI boundaries
vibefun compile main.vf --runtime-checks=all     # All type assertions
vibefun compile main.vf --runtime-checks=none    # No runtime checks (production)
```

---

## Appendix

### Syntax Summary

```vibefun
// Declarations
let name = value
let mut name = ref(value)
let rec name = ...
type Name = ...
export let name = ...
import { name } from "module"
external name: Type = "jsName"

// Expressions
42, 3.14, "hello", true, ()
x, functionName
f(x), f(x, y)
(x) => body
if cond then expr1 else expr2
match expr { | pattern => body }
{ field: value }
[1, 2, 3]
expr1 |> expr2
{ let x = 1; x + 1 }
!refExpr                        // Dereference (read ref value)
refExpr := value                // Assignment (update ref)

// Types
Int, Float, String, Bool, Unit
Ref<T>
(T1, T2) -> T
{ field: Type }
Constructor(Type) | Constructor(Type)
List<T>
T | U

// Patterns
literal
variable
_
Constructor(pattern)
[pattern, pattern, ...]
{ field: pattern }
pattern when guard
```

### Keywords Reference

| Keyword    | Purpose                           |
|------------|-----------------------------------|
| `let`      | Immutable binding                 |
| `mut`      | Mutable reference                 |
| `type`     | Type definition                   |
| `if`       | Conditional expression            |
| `then`     | If-then branch                    |
| `else`     | If-else branch                    |
| `match`    | Pattern matching                  |
| `when`     | Pattern guard                     |
| `rec`      | Recursive function                |
| `and`      | Mutually recursive functions      |
| `import`   | Import from module                |
| `export`   | Export declaration                |
| `external` | External JS declaration           |
| `unsafe`   | Unsafe JS interop block           |
| `from`     | Import source                     |
| `as`       | Import alias                      |
| `ref`      | Create mutable reference          |

### Operators Reference

| Operator                  | Precedence | Associativity | Description              |
|---------------------------|-----------|---------------|--------------------------|
| `.`                       | 14        | Left          | Field access             |
| `()`                      | 14        | Left          | Function call            |
| `[]`                      | 14        | Left          | List indexing            |
| `!`                       | 13        | Right         | Dereference/Logical NOT  |
| `-`                       | 13        | Right         | Unary minus              |
| `*`                       | 12        | Left          | Multiplication           |
| `/`                       | 12        | Left          | Division                 |
| `%`                       | 12        | Left          | Modulo                   |
| `+`                       | 11        | Left          | Addition                 |
| `-`                       | 11        | Left          | Subtraction              |
| `&`                       | 11        | Left          | String concatenation     |
| `<`                       | 9         | Left          | Less than                |
| `<=`                      | 9         | Left          | Less than or equal       |
| `>`                       | 9         | Left          | Greater than             |
| `>=`                      | 9         | Left          | Greater than or equal    |
| `==`                      | 8         | Left          | Equal                    |
| `!=`                      | 8         | Left          | Not equal                |
| `&&`                      | 5         | Left          | Logical AND              |
| <code>&vert;&vert;</code> | 4          | Left          | Logical OR               |
| `::`                      | 3         | Right         | List cons                |
| <code>&vert;&gt;</code>`  | 2          | Left          | Forward pipe             |
| `:=`                      | 1         | Right         | Reference assignment     |

### File Organization Best Practices

```
project/
├── src/
│   ├── main.vf              # Entry point
│   ├── types.vf             # Type definitions
│   ├── utils/
│   │   ├── list.vf
│   │   ├── option.vf
│   │   └── result.vf
│   ├── domain/
│   │   ├── user.vf
│   │   └── order.vf
│   └── api/
│       ├── http.vf
│       └── handlers.vf
├── tests/
│   └── ...
└── vibefun.json             # Project configuration
```

---

**End of Specification**

This specification is a living document and will evolve as the language develops. For the latest updates and implementation details, see the project repository and design documents in `.claude/plans/`.
