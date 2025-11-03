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

### Whitespace and Semicolon Insertion

- **Spaces** and **tabs** are treated as whitespace and ignored (except in strings)
- **Newlines** are significant in some contexts (automatic semicolon insertion)
- **Indentation** is not significant (unlike Python or Haskell)

#### Semicolon Insertion Rules

Vibefun uses **automatic semicolon insertion (ASI)** similar to JavaScript, but with more conservative rules. Semicolons separate statements and expressions in blocks, but are often optional due to ASI.

**Explicit semicolons** (always allowed):
```vibefun
let x = 10; let y = 20; x + y
```

**Implicit semicolons** (inserted automatically):
```vibefun
let x = 10
let y = 20
x + y
```

**When semicolons are inserted:**

A semicolon is automatically inserted before a newline if **all** of the following are true:
1. The newline follows a **complete expression** or **statement**
2. The next token **cannot** continue the current expression
3. The next token starts a new statement or expression

**Examples:**

```vibefun
// ✅ Semicolon inserted after 10 (complete expression)
let x = 10
let y = 20

// ✅ Semicolon inserted after each expression in block
{
    let x = 1
    let y = 2
    x + y
}

// ✅ NO semicolon inserted (expression continues on next line)
let result = 1 +
    2 +
    3

// ✅ NO semicolon inserted (function call continues)
map(list,
    (x) => x + 1)

// ✅ NO semicolon inserted (list literal continues)
let numbers = [
    1,
    2,
    3
]

// ✅ NO semicolon inserted (record literal continues)
let person = {
    name: "Alice",
    age: 30
}

// ✅ NO semicolon inserted (pipe continues)
data
    |> filter((x) => x > 0)
    |> map((x) => x * 2)
```

**Tokens that prevent semicolon insertion** (expression continues):
- Binary operators: `+`, `-`, `*`, `/`, `%`, `&&`, `||`, `&`, `==`, `!=`, `<`, `>`, `<=`, `>=`, `::`
- Pipe operators: `|>`, `>>`, `<<`
- Field access: `.`
- Function application: `(`
- List/record continuation: `,` (inside `[]` or `{}`)

**Tokens that start new statements** (trigger semicolon insertion):
- `let`, `type`, `match`, `if`, `external`, `import`, `export`
- Identifiers (when not continuing an expression)
- Literals (when not continuing an expression)

**Best practices:**
- Rely on ASI for simple cases (let bindings, return values)
- Use explicit semicolons when in doubt
- Avoid relying on subtle ASI rules; prefer explicit semicolons in complex cases
- Use parentheses to group multi-line expressions when needed

```vibefun
// Clear: no ambiguity
let x = 1
let y = 2

// Explicit semicolon for clarity in complex blocks
let process = () => {
    sideEffect1();
    sideEffect2();
    result
}

// Parentheses for multi-line expressions
let value = (
    longExpression1 +
    longExpression2
)
```

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

### Type Variables and Polymorphism

Type variables represent polymorphic types and enable generic programming.

#### Type Variable Syntax

Vibefun uses **explicit type parameter syntax** with angle brackets `<T>` for declaring type parameters:

```vibefun
// Type parameters in function signatures
let identity: <T>(T) -> T = (x) => x
let map: <A, B>(List<A>, (A) -> B) -> List<B> = ...

// Type parameters in type definitions
type Box<T> = { value: T }
type Option<T> = Some(T) | None
type Result<T, E> = Ok(T) | Err(E)
```

**Naming conventions:**
- Type parameters use `PascalCase`: `<T>`, `<A>`, `<B>`, `<TValue>`, `<TError>`
- Use single letters for generic types: `<T>`, `<A>`, `<B>`
- Use descriptive names for semantic clarity: `<TValue>`, `<TError>`, `<TKey>`

#### Implicit vs Explicit Type Parameters

Type parameters are **implicitly quantified** at the outermost level of type signatures—you don't write `forall`:

```vibefun
// Implicit quantification (standard)
let identity: <T>(T) -> T = (x) => x

// NOT used: forall T. (T) -> T  (we don't use forall syntax)
```

At use sites, type parameters are **always inferred**—there is no syntax for explicit type application:

```vibefun
let id: <T>(T) -> T = (x) => x

// Type parameters inferred from arguments
id(42)        // T inferred as Int
id("hello")   // T inferred as String

// NO explicit type application syntax:
// id<Int>(42)     // ❌ Not supported
// id::<String>("hello")  // ❌ Not supported
```

#### Type Variable Scoping

Type variables are **lexically scoped** to their declaration:

```vibefun
// Each function has independent type variables
let f: <T>(T) -> T = ...    // T scoped to f
let g: <T>(T) -> T = ...    // Different T scoped to g

// Type variables in nested positions
let apply: <A, B>((A) -> B, A) -> B = (f, x) => f(x)
//         ^^^^^^  ^^^^^^^^^^^^^^     ^^^^^^^^^^
//         declared    used in type    used in body

// Type variables in type definitions
type Pair<A, B> = { first: A, second: B }
//        ^^^^                ^^      ^^
//        declared            used    used
```

#### Type Variable Inference

The type checker automatically infers type variables using Hindley-Milner inference:

```vibefun
// Type parameters inferred (no annotation needed)
let identity = (x) => x
// Inferred type: <T>(T) -> T

let first = (x, y) => x
// Inferred type: <A, B>(A, B) -> A

let applyTwice = (f, x) => f(f(x))
// Inferred type: <T>((T) -> T, T) -> T
```

#### Polymorphic Instantiation

When a polymorphic function is used, the type checker **instantiates** its type variables with fresh type variables or concrete types:

```vibefun
let id: <T>(T) -> T = (x) => x

// Each use instantiates T independently
let a = id(42)        // T := Int
let b = id("hello")   // T := String
let c = id(true)      // T := Bool

// In a polymorphic context
let apply = (f, x) => f(x)
// When apply is called with id, the type variables are unified
apply(id, 42)  // id's T unified with Int, apply's A := Int, B := Int
```

#### Higher-Rank Types

Vibefun uses **rank-1 polymorphism** (prenex polymorphism)—type variables can only be quantified at the outermost level of a type signature. Higher-rank types (where type quantifiers appear in nested positions) are **not supported**:

```vibefun
// ✅ Rank-1: Type parameters at the outermost level
let map: <A, B>(List<A>, (A) -> B) -> List<B> = ...

// ❌ Higher-rank: Would require nested quantification (NOT SUPPORTED)
// This would require passing a polymorphic function that works for ALL types:
// let applyToAll: ((<T>(T) -> T)) -> (Int, String) = ...
//                    ^^^ nested quantifier not allowed
```

If you need higher-rank behavior, use explicit wrapper types or redesign the API.

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

#### Width Subtyping Implementation Details

**Subtype relation:**
- A record type `R1` is a subtype of `R2` (written `R1 <: R2`) if:
  1. `R1` has **all** the fields of `R2`
  2. Each corresponding field has a **compatible type**

```vibefun
// Example 1: Extra fields
type Point2D = { x: Int, y: Int }
type Point3D = { x: Int, y: Int, z: Int }

// Point3D <: Point2D (Point3D has all Point2D fields plus z)
let p3: Point3D = { x: 1, y: 2, z: 3 }
let p2: Point2D = p3  // ✅ OK: Point3D <: Point2D

// Example 2: Field type compatibility
type Numeric = { value: Int }
type Labeled = { value: Int, label: String }

// Labeled <: Numeric
let labeled: Labeled = { value: 42, label: "Answer" }
let numeric: Numeric = labeled  // ✅ OK

// Example 3: Order doesn't matter (structural typing)
type A = { x: Int, y: Int }
type B = { y: Int, x: Int }

// A and B are THE SAME type (order doesn't matter)
let a: A = { x: 1, y: 2 }
let b: B = a  // ✅ OK: same structure
```

**Type checking rules:**

During unification, when checking if record type `R1` is compatible with `R2`:
1. **Field name matching**: All field names in `R2` must exist in `R1`
2. **Field type unification**: Each field type in `R1` must unify with the corresponding field in `R2`
3. **Extra fields**: Fields in `R1` not present in `R2` are **ignored**

```vibefun
// Function parameter with record type
let distance = (p: { x: Int, y: Int }) =>
    // p must have at least { x: Int, y: Int }
    p.x * p.x + p.y * p.y

// Can pass records with extra fields
distance({ x: 3, y: 4 })  // OK
distance({ x: 3, y: 4, z: 5 })  // OK - z ignored
distance({ x: 3, y: 4, label: "origin" })  // OK - label ignored
```

**Limitations:**

Width subtyping is **invariant** in type variables:

```vibefun
type Box<T> = { value: T }

let intBox: Box<Int> = { value: 42 }
let numBox: Box<Float> = intBox  // ❌ Error: Box<Int> ≠ Box<Float>
// Type parameters must match exactly (no variance)
```

**Contravariance in function types:**

When records appear in function argument positions, subtyping is **contravariant**:

```vibefun
type Point2D = { x: Int, y: Int }
type Point3D = { x: Int, y: Int, z: Int }

// Function that accepts Point3D
let process3D: (Point3D) -> Int = (p) => p.x + p.y + p.z

// Can we assign to a function that accepts Point2D?
let process2D: (Point2D) -> Int = process3D
// ❌ Error: (Point3D) -> Int is NOT a subtype of (Point2D) -> Int

// Why? If this were allowed:
// process2D({ x: 1, y: 2 })  // Pass Point2D
// But process3D expects z, which doesn't exist!

// The reverse IS allowed (covariant in return type, contravariant in args):
let accepts2D: (Point2D) -> Int = (p) => p.x + p.y
let accepts3D: (Point3D) -> Int = accepts2D  // ✅ OK
// A function expecting Point2D can accept Point3D (has all fields)
```

**Pattern matching and width subtyping:**

Pattern matching on records respects width subtyping:

```vibefun
type Point2D = { x: Int, y: Int }

let describe = (p: Point2D) => match p {
    | { x: 0, y: 0 } => "origin"
    | { x, y } => "point at (" & String.fromInt(x) & ", " & String.fromInt(y) & ")"
}

// Can pass records with extra fields
describe({ x: 3, y: 4 })  // OK: "point at (3, 4)"
describe({ x: 0, y: 0, z: 0 })  // OK: "origin" (z ignored)
```

**Inference with width subtyping:**

The type checker infers **minimum required fields** when a record is used:

```vibefun
// Function without type annotation
let getX = (p) => p.x

// Inferred type: <A>({ x: A, ... }) -> A
// The "..." means "and possibly other fields"

// Type checker infers minimum requirements:
getX({ x: 42 })  // OK: A := Int
getX({ x: 42, y: 100 })  // OK: extra fields allowed
getX({ y: 100 })  // ❌ Error: missing required field x
```

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

Union types represent values that can be one of several types. Vibefun has **limited support** for union types, primarily for variant constructors and string literals.

#### Variant Union Types (Primary Use)

The most common union types are variant types, which use `|` to separate constructors:

```vibefun
// Union of variant constructors
type Option<T> = Some(T) | None
type Result<T, E> = Ok(T) | Err(E)

// Multi-constructor variants
type Color = Red | Green | Blue | Yellow
type Shape = Circle(Float) | Rectangle(Float, Float) | Triangle(Point, Point, Point)
```

These are **nominal types** — the type name (`Option`, `Result`) defines the type, not the structure.

#### String Literal Union Types

String literal unions create types restricted to specific string values:

```vibefun
// String literal union type
type Status = "pending" | "active" | "complete" | "cancelled"

let status: Status = "pending"  // ✅ OK
let invalid: Status = "unknown" // ❌ Error: "unknown" is not in Status

// Useful for discriminated unions and state machines
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH"

let method: HttpMethod = "GET"
```

**Type checking:**
- String literal unions are checked at compile time
- Only the exact literal strings are allowed
- Case-sensitive: `"pending"` ≠ `"Pending"`

#### General Union Types (Limited Support)

Vibefun has **limited support** for arbitrary type unions (`Int | String`). These are primarily used for:

1. **External declarations** (JavaScript interop)
2. **Return type unions** in specific contexts

```vibefun
// External declaration with union type
external parseValue: (String) -> (Int | String) = "parseValue"

// Limited use in pure Vibefun code
type FlexibleId = Int | String

let id1: FlexibleId = 42
let id2: FlexibleId = "abc-123"
```

**Important limitations:**
- General unions are **not first-class** in all contexts
- Type inference may not work with general unions—annotations may be required
- Pattern matching on general unions is limited (works best with variants)

#### Type Inference with Unions

Type inference works best with **variant types**:

```vibefun
// ✅ Variant types: inference works well
let opt = Some(42)  // Inferred: Option<Int>
let result = Ok("success")  // Inferred: Result<String, E>

// ⚠️  General unions: often require annotations
let ambiguous = if condition then 42 else "hello"
// Error: Cannot infer type (could be Int | String, but that's not a defined type)

// Solution: annotate or use a variant
type IntOrString = IntValue(Int) | StringValue(String)
let explicit = if condition then IntValue(42) else StringValue("hello")
// Type: IntOrString (inferred from constructors)
```

#### Pattern Matching on Union Types

Pattern matching works naturally with variant types:

```vibefun
type Value = IntVal(Int) | StringVal(String) | BoolVal(Bool)

let describe = (v: Value) => match v {
    | IntVal(n) => "number: " & String.fromInt(n)
    | StringVal(s) => "string: " & s
    | BoolVal(b) => "boolean: " & if b then "true" else "false"
}
```

For string literal unions, pattern matching works with literal patterns:

```vibefun
type Status = "pending" | "active" | "complete"

let describe = (status: Status) => match status {
    | "pending" => "Waiting to start"
    | "active" => "Currently running"
    | "complete" => "Finished"
}
```

#### Union Types vs Variant Types

**Prefer variant types** for most use cases:

```vibefun
// ❌ General union (limited support, poor inference)
type Value = Int | String | Bool

// ✅ Variant type (full support, good inference, pattern matching)
type Value = IntVal(Int) | StringVal(String) | BoolVal(Bool)
```

**When to use each:**
- **Variant types**: Default choice for sum types in pure Vibefun code
- **String literal unions**: State machines, discriminated unions with string tags
- **General unions**: Only for JavaScript interop where needed

#### Design Rationale

Vibefun focuses on **variant types** (nominal, constructor-based) rather than **structural unions** (`Int | String`) because:

1. **Clarity**: Variant constructors make the intent explicit (`Some(42)` vs `42`)
2. **Pattern matching**: Variants work seamlessly with exhaustiveness checking
3. **Type inference**: Variant constructors help the type checker infer types
4. **Nominal safety**: Prevents accidental mixing of semantically different types

For JavaScript interop, limited union type support exists, but within pure Vibefun code, **variant types are strongly preferred**.

### Recursive Types

Vibefun supports **recursive type definitions**, where a type refers to itself:

```vibefun
// Recursive variant type (most common)
type List<T> =
    | Nil
    | Cons(T, List<T>)

// Recursive tree type
type Tree<T> =
    | Leaf(T)
    | Node(Tree<T>, Tree<T>)

// JSON representation
type Json =
    | JNull
    | JBool(Bool)
    | JNumber(Float)
    | JString(String)
    | JArray(List<Json>)           // Recursive reference
    | JObject(List<(String, Json)>) // Recursive reference
```

**Requirements:**
- Recursive types must be **guarded** by a constructor (variant or record)
- Direct self-reference without a constructor is not allowed

```vibefun
// ✅ OK: Recursion guarded by variant constructor
type Expr = Lit(Int) | Add(Expr, Expr) | Mul(Expr, Expr)

// ❌ Error: Unguarded recursion (infinite type)
type Bad = Bad  // Equivalent to type Bad = Bad = Bad = ...
```

#### Mutually Recursive Types

Multiple types can reference each other using the `and` keyword:

```vibefun
// Mutually recursive types for expressions and patterns
type Expr =
    | Lit(Int)
    | Var(String)
    | Lambda(Pattern, Expr)  // References Pattern
    | App(Expr, Expr)
and Pattern =
    | PWildcard
    | PVar(String)
    | PCons(Pattern, Pattern)
    | PExpr(Expr)             // References Expr

// Another example: tree with labeled nodes
type LabeledTree<T> =
    | Leaf(T)
    | Node(Label, List<LabeledTree<T>>)
and Label = {
    name: String,
    metadata: Metadata
}
and Metadata = {
    created: String,
    tags: List<String>,
    children: List<LabeledTree<String>>  // Back-reference
}
```

**Mutual recursion syntax:**
```vibefun
type A = ... B ...    // A references B
and B = ... A ...     // B references A
and C = ... A ... B   // C references both A and B
```

**Rules:**
- All types in a `and` group are simultaneously in scope
- Each type can reference any other type in the group
- Mutually recursive types must still be guarded by constructors

### Type Aliases

Type aliases create alternative names for existing types.

```vibefun
type UserId = Int
type Username = String
type Callback<T> = (T) -> Unit

// Type aliases can reference other types
type Handler = (Request) -> Response
type AsyncHandler = (Request) -> Promise<Response>
```

#### Transparent Type Aliases

Type aliases in Vibefun are **transparent** — they don't create new types, just alternative names for existing types. The type checker treats an alias and its definition as **completely interchangeable**:

```vibefun
type UserId = Int
type PostId = Int

let userId: UserId = 42       // UserId is just Int
let postId: PostId = 42       // PostId is just Int

// UserId and PostId are interchangeable (both are Int):
let id1: UserId = postId      // ✅ OK: PostId == Int == UserId
let id2: PostId = userId      // ✅ OK: UserId == Int == PostId
```

This is different from **nominal types** (like variants), which are distinct even if structurally identical.

#### Recursive Type Aliases

Type aliases **cannot** be directly recursive:

```vibefun
// ❌ Error: Recursive type alias
type BadList<T> = (T, BadList<T>)  // Not allowed

// ✅ Solution: Use a variant type instead
type GoodList<T> = Nil | Cons(T, GoodList<T>)
```

**Rationale:** Recursive aliases without constructor guards would create infinite types. Use variant types for recursive structures.

#### Generic Type Aliases

Type aliases can be parameterized with type variables:

```vibefun
// Generic type alias
type Result<T, E> = Ok(T) | Err(E)
type Option<T> = Some(T) | None

// Nested generics
type Pair<A, B> = { first: A, second: B }
type PairList<A, B> = List<Pair<A, B>>

// Partially applied type alias (not supported directly)
// type IntResult = Result<Int>  // ❌ Error: Must apply all type parameters
// Workaround: define a new alias
type IntResult<E> = Result<Int, E>  // ✅ OK
```

#### Type Alias vs Variant Type

```vibefun
// Type alias: transparent, interchangeable
type UserId = Int
let id1: UserId = 42
let id2: Int = id1  // ✅ OK: UserId == Int

// Variant type: nominal, distinct
type Kilometers = Kilometers(Float)
type Miles = Miles(Float)

let km = Kilometers(100.0)
let mi: Miles = km  // ❌ Error: Kilometers ≠ Miles (different nominal types)

// To convert between nominal types, you must explicitly unwrap and rewrap:
let mi = match km {
    | Kilometers(value) => Miles(value * 0.621371)
}
```

**When to use each:**
- **Type alias**: When you want a synonym for documentation (transparent aliasing)
- **Variant type**: When you want distinct types that can't be accidentally mixed (nominal typing)

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

### Value Restriction and Polymorphism

The **value restriction** is a type system rule that determines when a `let`-binding can be generalized to a polymorphic type. This restriction is essential for maintaining type safety in the presence of mutable references and side effects.

#### The Rule: Only Syntactic Values Can Be Polymorphic

A `let`-binding is generalized to a polymorphic type **only if** the right-hand side is a **syntactic value**.

**Syntactic values** (can be generalized):
- Variables: `x`, `foo`
- Literals: `42`, `"hello"`, `true`
- Lambda expressions: `(x) => ...`, `(x, y) => ...`
- Constructors applied to values: `Some(42)`, `Ok("hello")`
- Records: `{ name: "Alice", age: 30 }`
- Lists of values: `[1, 2, 3]`

**Non-values** (cannot be generalized):
- Function applications: `f(x)`, `map(list, fn)`
- If expressions: `if cond then a else b`
- Match expressions: `match x { ... }`
- Blocks: `{ let y = x; y }`
- Ref operations: `ref(x)`, `!r`, `r := v`
- Operators: `x + y`, `!x`, `x && y`

#### Why the Value Restriction Exists

Without the value restriction, you could write unsound code:

```vibefun
// WITHOUT value restriction (unsound!):
let id = (x) => x                    // <T>(T) -> T
let badRef = ref(id)                 // Would be: Ref<<T>(T) -> T> (polymorphic ref!)

// Now we could break type safety:
badRef := (x: Int) => x + 1          // Store Int -> Int
let result = (!badRef)("hello")      // Get it back, but as String -> String!
// Type error! We stored (Int -> Int) but used (String -> String)
```

The value restriction prevents this by refusing to generalize `ref(id)`:

```vibefun
let id = (x) => x                    // <T>(T) -> T (OK: lambda is a value)
let badRef = ref(id)                 // Ref<(t) -> t> (monomorphic t, not polymorphic)

// Now the type checker catches the error:
badRef := (x: Int) => x + 1          // Error: expects (t) -> t, got (Int) -> Int
```

#### Examples: When Generalization Happens

```vibefun
// ✅ Lambda is a value → generalized
let identity = (x) => x
// Type: <T>(T) -> T

// ✅ Each use gets a fresh instantiation
identity(42)        // T := Int
identity("hello")   // T := String

// ✅ Constructor with value → generalized
let none = None
// Type: <T>Option<T>

// ✅ List of values → generalized
let emptyList = []
// Type: <T>List<T>
```

#### Examples: When Generalization Does NOT Happen

```vibefun
// ❌ Function application → NOT a value → monomorphic
let ids = [id]
// Type: List<(t) -> t>  (monomorphic type variable t)
// NOT: <T>List<(T) -> T>

// This means you can't use ids polymorphically:
let f = List.head(ids)  // Some((t) -> t)
f(42)       // ✅ OK: t := Int
f("hello")  // ❌ Error: t is already Int, can't be String

// ❌ Ref creation → NOT a value → monomorphic
let mut r = ref(None)
// Type: Ref<Option<t>>  (monomorphic t)

r := Some(42)       // ✅ OK: t := Int
r := Some("hello")  // ❌ Error: t is Int, can't be String

// ❌ If expression → NOT a value → monomorphic
let choose = if condition then Some else None
// Type: <t>(t) -> Option<t>  (monomorphic t, NOT polymorphic)

// ❌ Function call → NOT a value → monomorphic
let result = identity(identity)
// Type: (t) -> t  (monomorphic t)
```

#### Workaround: Eta-Expansion

If you need polymorphism for a non-value expression, wrap it in a lambda (eta-expansion):

```vibefun
// Problem: Function application is not a value
let composed = f(g)           // Monomorphic: (t) -> t
composed(42)                  // OK: t := Int
composed("hello")             // Error: t is already Int

// Solution: Eta-expand to make it a value
let composed = (x) => f(g)(x) // Polymorphic: <T>(T) -> T
composed(42)                  // OK: T := Int
composed("hello")             // OK: T := String (independent instantiation)
```

#### Value Restriction and Refs

The value restriction is especially important for `Ref<T>`:

```vibefun
// Refs must be monomorphic
let mut counter = ref(0)         // Ref<Int> (concrete type)
let mut state = ref(None)        // Ref<Option<t>> (monomorphic t)

// You cannot create a polymorphic ref:
let mut polymorphicRef = ref(id)  // Ref<(t) -> t>, NOT Ref<<T>(T) -> T>

// To store polymorphic functions, use variants or records:
type PolyFunc = { apply: <T>(T) -> T }
let mut polyRef = ref({ apply: (x) => x })  // Ref<PolyFunc>
```

#### Summary

**Key takeaway**: The value restriction ensures type safety by preventing polymorphic mutable references. Only lambda expressions, constructors, and literals can be generalized to polymorphic types. Function applications and other non-value expressions get monomorphic types.

**Rule of thumb**:
- If you want polymorphism: use lambda expressions
- If you have a function call: it won't be polymorphic (unless you eta-expand)
- Refs are always monomorphic in their type variables

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
"hello" & " world"   // String concatenation
```

### If Expressions

If expressions are expressions that evaluate to a value based on a condition. Both branches must have the same type.

```vibefun
let max = (a, b) =>
    if a > b then a else b

let sign = (x) =>
    if x > 0 then "positive"
    else if x < 0 then "negative"
    else "zero"
```

#### If-Then-Else (Complete Form)

The standard form requires both `then` and `else` branches:

```vibefun
// Basic if-then-else
let result = if condition then valueIfTrue else valueIfFalse

// Multi-line form
let result = if condition then
    expensiveComputation()
else
    defaultValue

// Nested if (else-if chain)
let category = if score >= 90 then "A"
    else if score >= 80 then "B"
    else if score >= 70 then "C"
    else if score >= 60 then "D"
    else "F"
```

**Type requirements:**
- The condition must have type `Bool`
- Both branches must have the **same type**
- The entire if expression has the type of the branches

```vibefun
let x = if true then 42 else 100  // Type: Int
let y = if false then "hello" else "world"  // Type: String

// ❌ Type error: branches have different types
let bad = if condition then 42 else "hello"
// Error: Expected Int in else branch, got String
```

#### If Without Else (Returns Unit)

If the `else` branch is omitted, the expression returns `()` (Unit) when the condition is false:

```vibefun
// If without else
if condition then sideEffect()
// Type: Unit (returns () when condition is false)

// Equivalent to:
if condition then sideEffect() else ()

// Useful for side effects
if debug then unsafe { console_log("Debug message") }

// The then branch must also have type Unit:
if condition then 42  // ❌ Error: then branch is Int, but if without else must have type Unit
```

**Rules for if without else:**
- The `then` branch **must** have type `Unit`
- The entire expression has type `Unit`
- Used for conditional side effects

```vibefun
// ✅ OK: then branch returns Unit
if condition then print("message")

// ✅ OK: block returns Unit
if condition then {
    doSomething();
    doSomethingElse()
}

// ❌ Error: then branch returns Int, not Unit
if condition then 42
```

#### If Expression Type Rules

**Type checking algorithm:**
1. Check condition has type `Bool`
2. Infer type of `then` branch → `T1`
3. If `else` present: Infer type of `else` branch → `T2`, unify `T1` with `T2`
4. If `else` omitted: Require `T1 = Unit`
5. Result type: `T1` (or `T2` if they're unified)

**Examples:**

```vibefun
// Both branches same type
let x: Int = if condition then 1 else 2  // OK

// Polymorphic if (type variable)
let id = (x) => if true then x else x  // OK: both branches are x

// Nested ifs
let result = if a then
    if b then 1 else 2
else
    if c then 3 else 4
// Type: Int

// If without else must be Unit
let action = if shouldAct then performAction()
// OK if performAction returns Unit
```

#### Short-Circuit Evaluation

If expressions use **short-circuit evaluation**:
- If condition is `true`: only `then` branch is evaluated
- If condition is `false`: only `else` branch is evaluated

```vibefun
// Safe: second branch never evaluated when x is 0
let safe = if x == 0 then 0 else 10 / x

// The unevaluated branch can have side effects
let result = if condition then
    unsafe { console_log("then branch") }
else
    unsafe { console_log("else branch") }
// Only one message is printed
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

Records are product types with named fields, providing structural typing with convenient syntax.

```vibefun
// Construction
let person = { name: "Alice", age: 30 }

// Access
person.name

// Update (immutable)
{ ...person, age: 31 }
```

#### Record Construction

```vibefun
// Basic record
let point = { x: 10, y: 20 }

// Fields can be any expression
let computed = {
    x: 1 + 2,
    y: calculate(),
    label: "Point" & String.fromInt(x)
}

// Multi-line records
let person = {
    name: "Alice",
    age: 30,
    email: "alice@example.com",
    address: {
        street: "123 Main St",
        city: "Springfield"
    }
}

// Trailing commas allowed
let config = {
    timeout: 5000,
    retries: 3,  // Trailing comma OK
}
```

#### Field Access

Access record fields using dot notation:

```vibefun
let person = { name: "Alice", age: 30 }

let name = person.name  // "Alice"
let age = person.age    // 30

// Chained field access
let address = person.address.city
let nested = config.server.host.name

// Field access has highest precedence (see operator table)
person.name & " Smith"  // Equivalent to: (person.name) & " Smith"
```

#### Record Update (Immutable)

Records are **immutable**. To "update" a record, create a new record with modified fields using the spread operator:

```vibefun
let person = { name: "Alice", age: 30, email: "alice@example.com" }

// Update single field
let older = { ...person, age: 31 }
// { name: "Alice", age: 31, email: "alice@example.com" }

// Update multiple fields
let updated = { ...person, age: 31, email: "alice@newmail.com" }

// Original record unchanged (immutability)
person.age  // Still 30
```

#### Spread Operator in Records

The spread operator `...` copies all fields from an existing record:

```vibefun
let base = { x: 1, y: 2 }

// Spread + new field
let extended = { ...base, z: 3 }
// { x: 1, y: 2, z: 3 }

// Spread + override field
let modified = { ...base, x: 10 }
// { x: 10, y: 2 } (x overridden)

// Multiple spreads
let combined = { ...defaults, ...userConfig, ...overrides }
```

**Spread order semantics:**
- Fields are processed **left to right**
- **Later fields override earlier fields** with the same name
- Spread expands all fields from the source record at that position

```vibefun
let a = { x: 1, y: 2 }
let b = { y: 20, z: 30 }

// Later spread overrides earlier values
{ ...a, ...b }        // { x: 1, y: 20, z: 30 } (b.y overrides a.y)
{ ...b, ...a }        // { y: 2, z: 30, x: 1 } (a.y overrides b.y)

// Explicit field overrides spread
{ ...a, x: 100 }      // { x: 100, y: 2 } (explicit x overrides spread)
{ x: 100, ...a }      // { x: 1, y: 2 } (spread overrides explicit)

// Multiple overrides
{ ...a, x: 100, y: 200 }  // { x: 100, y: 200 }
```

#### Field Shorthand

When a variable name matches the field name, you can use shorthand syntax:

```vibefun
let name = "Alice"
let age = 30

// Shorthand
let person = { name, age }
// Equivalent to: { name: name, age: age }

// Mix shorthand and regular fields
let extended = { name, age, email: "alice@example.com" }

// Useful with function parameters
let makePerson = (name, age, email) => { name, age, email }
```

#### Record Type Inference

The type checker infers record types from their structure:

```vibefun
// Type inferred from literal
let point = { x: 10, y: 20 }
// Inferred type: { x: Int, y: Int }

// Type inferred from update
let updated = { ...point, z: 30 }
// Inferred type: { x: Int, y: Int, z: Int }

// Type annotation when needed
let typed: { name: String, age: Int } = { name: "Alice", age: 30 }
```

#### Nested Records

Records can be arbitrarily nested:

```vibefun
let config = {
    server: {
        host: "localhost",
        port: 8080,
        ssl: {
            enabled: true,
            cert: "/path/to/cert"
        }
    },
    database: {
        url: "localhost:5432",
        poolSize: 10
    }
}

// Access nested fields
config.server.host          // "localhost"
config.server.ssl.enabled   // true

// Update nested fields (requires spreading each level)
let newConfig = {
    ...config,
    server: {
        ...config.server,
        port: 9000  // Update nested field
    }
}
```

#### Record Update Patterns

Common patterns for working with records:

```vibefun
// Conditional update
let person = { name: "Alice", age: 30 }
let updated = if shouldAge then { ...person, age: person.age + 1 } else person

// Update with computed field
let incremented = { ...point, x: point.x + 1 }

// Merge records
let merged = { ...defaults, ...overrides }

// Add field conditionally (using Option)
let withOptional = match maybeEmail {
    | Some(email) => { ...person, email }
    | None => person
}
```

### List Expressions

Lists are the primary collection type in Vibefun, representing homogeneous sequences of values.

```vibefun
[]                     // Empty list
[1, 2, 3]              // List literal
[1, 2, ...rest]        // Spread
x :: xs                // Cons
```

#### List Literals

```vibefun
// Empty list
let empty = []  // Type: List<T> (polymorphic)

// List with elements
let numbers = [1, 2, 3, 4, 5]  // Type: List<Int>
let names = ["Alice", "Bob", "Charlie"]  // Type: List<String>

// All elements must have the same type
let mixed = [1, "hello"]  // ❌ Error: Expected Int, got String
```

#### Empty List Type Inference

The empty list `[]` has a **polymorphic type** `List<T>` where `T` is a type variable that will be inferred from context:

```vibefun
// Type inferred from annotation
let empty: List<Int> = []  // List<Int>

// Type inferred from usage
let withAppend = List.append([], [1, 2, 3])  // List<Int> (inferred from [1,2,3])

// Type inferred from function return type
let getEmptyInts: () -> List<Int> = () => []

// Polymorphic empty list (type not determined)
let ambiguous = []  // List<T> (monomorphic T due to value restriction)
```

**Note:** Due to the [value restriction](#value-restriction-and-polymorphism), `let empty = []` creates a **monomorphic** list with an unknown element type, not a fully polymorphic list. Add a type annotation if you need a specific element type.

#### List Spread Operator

The spread operator `...` expands a list's elements inline:

```vibefun
let first = [1, 2, 3]
let second = [4, 5, 6]

// Spread at end
let combined = [0, ...first]  // [0, 1, 2, 3]

// Spread in middle (if supported)
let middle = [0, ...first, 7]  // [0, 1, 2, 3, 7]

// Multiple spreads (if supported)
let multi = [...first, ...second]  // [1, 2, 3, 4, 5, 6]
```

**Spread operator limitations:**
- **Position**: Currently, spread is primarily supported at the **end** of a list in most contexts
- **Pattern matching**: Spread in patterns (`[x, ...rest]`) captures remaining elements (see Pattern Matching)
- **Construction**: Spread in list literals (`[1, ...other]`) expands the list

```vibefun
// ✅ Spread at end (always supported)
[1, 2, ...rest]

// ⚠️  Spread in middle (may be limited)
[1, ...middle, 5]  // Check implementation support

// ✅ Multiple spreads (concatenation)
[...list1, ...list2, ...list3]
```

#### Cons Operator (::)

The cons operator `::` prepends an element to the front of a list:

```vibefun
let list = [2, 3, 4]
let newList = 1 :: list  // [1, 2, 3, 4]

// Type: (T, List<T>) -> List<T>
// Right-associative (see operator precedence table)

// Building lists with cons
let numbers = 1 :: 2 :: 3 :: []  // [1, 2, 3]
// Equivalent to: 1 :: (2 :: (3 :: []))

// Cons in expressions
let prepend = (x, xs) => x :: xs
```

**Cons vs Spread:**
- Cons (`::`) prepends a **single element**: `1 :: [2, 3]` → `[1, 2, 3]`
- Spread (`...`) expands a **list**: `[1, ...[2, 3]]` → `[1, 2, 3]`

#### List Type Inference

```vibefun
// Inferred from elements
let nums = [1, 2, 3]  // List<Int>

// Inferred from operations
let doubled = List.map(nums, (x) => x * 2)  // List<Int>

// Inferred from cons
let extended = 0 :: nums  // List<Int>

// Type annotation when needed
let typed: List<String> = []
```

#### Multi-Line Lists

Lists can span multiple lines:

```vibefun
let longList = [
    1,
    2,
    3,
    4,
    5
]

// Trailing comma allowed
let withTrailing = [
    "one",
    "two",
    "three",  // Trailing comma OK
]
```

### Lambda Expressions

Lambda expressions (anonymous functions) are first-class values in Vibefun.

```vibefun
(x) => x + 1                    // Single parameter
(x, y) => x + y                 // Multiple parameters
() => 42                        // No parameters
(x) => { let y = x + 1; y }     // Block body
```

#### Lambda Syntax

```vibefun
// Single parameter (parentheses optional for one param)
(x) => x * 2
x => x * 2  // Also valid

// Multiple parameters (parentheses required)
(x, y) => x + y

// No parameters (parentheses required)
() => 42

// Block body
(x) => {
    let doubled = x * 2
    doubled + 1
}
```

#### Type Annotations in Lambdas

Lambda parameters can have optional type annotations:

```vibefun
// Parameter type annotations
(x: Int) => x + 1
(x: Int, y: Int) => x + y

// Return type annotation
(x): Int => x + 1

// Both parameter and return annotations
(x: Int, y: Int): Int => x + y

// Usually unnecessary (type inference works well)
let double = (x) => x * 2  // Inferred: <T>(T) -> T where T supports *
```

#### Destructuring in Lambda Parameters

Lambda parameters support pattern destructuring:

```vibefun
// Record destructuring
let getName = ({ name }) => name
let getCoords = ({ x, y }) => (x, y)

// List destructuring
let getFirst = ([first, ..._]) => first
let addPair = ([a, b]) => a + b

// Nested destructuring
let processUser = ({ profile: { name, age } }) => name & " is " & String.fromInt(age)

// Mix regular and destructured parameters
let combine = (prefix, { value }) => prefix & String.fromInt(value)
```

#### Lambdas Cannot Be Recursive

Anonymous lambda expressions **cannot** be directly recursive (they have no name to refer to):

```vibefun
// ❌ Error: Cannot reference lambda from within itself
let factorial = (n) => if n <= 1 then 1 else n * ???(n - 1)

// ✅ Solution: Use named recursive function
let rec factorial = (n) => if n <= 1 then 1 else n * factorial(n - 1)
```

#### Operator Sections

Vibefun **does not support** operator sections (Haskell-style partial application of operators):

```vibefun
// ❌ Not supported: operator sections
// (+)      // Would be a function (Int, Int) -> Int
// (+ 1)    // Would be partial application
// (1 +)    // Would be partial application

// ✅ Instead: Use lambda expressions
let add = (x, y) => x + y
let increment = (x) => x + 1
let addOne = (x) => 1 + x

// Common use: mapping with operators
[1, 2, 3] |> List.map((x) => x + 1)  // Must use lambda
```

**Rationale:** Operator sections would complicate parsing (ambiguity with parenthesized expressions) and are not essential—lambda expressions provide the same functionality with clearer syntax.

### Block Expressions

Blocks are sequences of expressions enclosed in braces `{ }`. The last expression in the block is the result value.

```vibefun
{
    let x = 10
    let y = 20
    x + y    // Result of block: 30
}
```

#### Block Syntax

```vibefun
{
    expression1;
    expression2;
    expression3;
    resultExpression  // No semicolon (or optional semicolon)
}
```

**Rules:**
- Expressions are separated by semicolons or newlines (automatic semicolon insertion)
- The **last expression** is the result value (no semicolon required)
- If the last expression has a semicolon, the block returns `()`

#### Scoping in Blocks

Each block creates a **new lexical scope**. Bindings (`let`) inside a block are local to that block:

```vibefun
let x = 10

{
    let x = 20  // New binding, shadows outer x
    let y = 30  // Local to block
    x + y       // 50
}

// Outside the block:
// x is still 10
// y is not in scope
```

**Shadowing:**
```vibefun
let x = 1
let x = 2  // Shadows previous x (creates new binding)

{
    let x = 3  // Shadows outer x within block
    x          // 3
}

x  // 2 (block doesn't affect outer binding)
```

#### Empty Blocks

An empty block `{}` has type `Unit` and evaluates to `()`:

```vibefun
let nothing = {}  // Type: Unit, value: ()

// Useful for no-op branches
if condition then {} else doSomething()
```

#### Blocks with Side Effects Only

If a block contains only side effects and doesn't produce a meaningful value, it returns `Unit`:

```vibefun
// Block with only side effects
let doWork = () => {
    unsafe { console_log("Step 1") };
    unsafe { console_log("Step 2") };
    unsafe { console_log("Step 3") }
}
// Type: () -> Unit

// If last expression has semicolon, returns Unit
let alsoUnit = {
    let x = 42;
    x + 1;  // Semicolon: value discarded, block returns ()
}
// Type: Unit
```

#### Blocks as Expressions

Blocks can appear anywhere an expression is expected:

```vibefun
// Block as function body
let compute = (x) => {
    let double = x * 2
    let triple = x * 3
    double + triple
}

// Block as if branch
let result = if condition then {
    let temp = expensiveComputation()
    process(temp)
} else {
    defaultValue
}

// Block in list
let values = [
    42,
    { let x = 10; x * 2 },
    100
]  // [42, 20, 100]

// Block as function argument
process({
    let data = fetchData()
    transform(data)
})
```

#### Sequential Execution

Expressions in a block are evaluated **sequentially** (top to bottom):

```vibefun
{
    unsafe { console_log("First") };   // Executed first
    unsafe { console_log("Second") };  // Then second
    unsafe { console_log("Third") }    // Then third
}

// With side effects and result
let result = {
    let mut counter = ref(0)
    counter := !counter + 1;  // Side effect
    counter := !counter + 1;  // Side effect
    !counter  // Result: 2
}
```

#### Nested Blocks

Blocks can be nested arbitrarily:

```vibefun
{
    let x = 1
    {
        let y = 2
        {
            let z = 3
            x + y + z  // 6 (all bindings in scope)
        }
    }
}
```

### Pipe Expressions

The pipe operator `|>` enables left-to-right function composition, making data transformation pipelines more readable.

```vibefun
// Forward pipe |>
data
    |> filter((x) => x > 0)
    |> map((x) => x * 2)
    |> sum

// Equivalent to:
sum(map(filter(data, (x) => x > 0), (x) => x * 2))
```

#### Pipe Operator Semantics

The pipe operator `|>` takes a value on the left and applies a function on the right:

```vibefun
// Basic syntax
value |> function

// Equivalent to:
function(value)

// Example
42 |> String.fromInt  // "42"
// Equivalent to: String.fromInt(42)
```

**Type:** `<A, B>(A, (A) -> B) -> B`

#### Pipe Precedence and Associativity

**Precedence:** 2 (very low, second-lowest after `:=`)
**Associativity:** Left

This means:
- Pipe binds **very loosely** (evaluated last, after most other operators)
- Pipe chains evaluate **left to right**

```vibefun
// Left-associative: evaluated left-to-right
a |> f |> g |> h
// Equivalent to: ((a |> f) |> g) |> h
// Which is: h(g(f(a)))

// Low precedence: other operators evaluated first
x + 1 |> double
// Equivalent to: (x + 1) |> double
// NOT: x + (1 |> double)
```

#### Piping into Curried Functions

Since Vibefun functions are curried, pipe works naturally with partial application:

```vibefun
// Single-argument function
data |> filter(predicate)

// Multi-argument function: pipe provides first argument
list |> List.map((x) => x * 2)
// Equivalent to: List.map(list, (x) => x * 2)

// Partial application before piping
let increment = add(1)
42 |> increment  // 43

// Pipe into partially applied function
data |> map((x) => x + 1) |> filter((x) => x > 10)
```

#### Multi-Line Pipe Chains

Pipe chains are often formatted across multiple lines for readability:

```vibefun
let result = data
    |> filter((x) => x > 0)
    |> map((x) => x * 2)
    |> List.fold(0, (acc, x) => acc + x)

// Indentation style (start pipe at beginning of line)
let processed =
    rawData
    |> parse
    |> validate
    |> transform
    |> save

// Or align pipes
let processed = rawData
    |> parse
    |> validate
    |> transform
    |> save
```

#### Pipe vs Composition

**Pipe (`|>`)**: applies a value to functions (data flow)
**Composition (`>>`, `<<`)**: combines functions without applying them

```vibefun
// Pipe: immediate evaluation with value
data |> f |> g  // g(f(data))

// Composition: creates new function, no evaluation yet
let pipeline = f >> g  // (x) => g(f(x))
data |> pipeline       // Now evaluate: g(f(data))

// Precedence: composition binds tighter than pipe
data |> f >> g >> h
// Equivalent to: data |> (f >> g >> h)
// Which is: h(g(f(data)))
```

#### Common Pipe Patterns

```vibefun
// Data transformation pipeline
users
    |> List.filter((u) => u.active)
    |> List.map((u) => u.name)
    |> List.sort
    |> List.take(10)

// With intermediate bindings
let activeUsers = users |> List.filter((u) => u.active)
let names = activeUsers |> List.map((u) => u.name)
names |> List.sort

// Debugging: insert trace function
data
    |> transform
    |> tap(console_log)  // Debug: log intermediate value
    |> processMore

// Error handling with Result
fetchData()
    |> Result.flatMap(validate)
    |> Result.flatMap(process)
    |> Result.map(format)
```

#### Pipe with Operators

Operators have higher precedence than pipe, so they're evaluated first:

```vibefun
// Arithmetic before pipe
10 + 5 |> double  // double(15), not 10 + double(5)

// Comparison before pipe
x > 0 |> negate  // negate(x > 0), evaluates x > 0 first

// Field access before pipe
person.age |> String.fromInt

// Use parentheses for different grouping if needed
10 |> (x => x + 5) |> double  // double(15)
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

### Function Types and Currying

#### Function Type Representation

Function types in Vibefun are written with the arrow `->` operator. Multi-argument functions are represented as curried functions (nested function types):

```vibefun
// Single-argument function
let identity: (Int) -> Int = (x) => x

// Multi-argument function (curried representation)
let add: (Int) -> (Int) -> Int = (x, y) => x + y
//       ^^^^^^^^^^^^^^^^^^^^^^^
//       Type: function from Int to (function from Int to Int)

// Higher-order function
let map: <A, B>((A) -> B) -> (List<A>) -> List<B> = ...
```

**Key principles:**
- All functions are curried by default
- `(A, B) -> C` is **syntactic sugar** for `(A) -> (B) -> C`
- At the type level, these are equivalent and interchangeable
- The compiler treats them identically during type checking

#### Surface Syntax vs Internal Representation

**Surface syntax** (what you write):
```vibefun
// Multi-argument syntax (preferred for readability)
let add: (Int, Int) -> Int = (x, y) => x + y

// Explicit curried syntax (equivalent)
let add: (Int) -> (Int) -> Int = (x) => (y) => x + y
```

**Internal representation** (how the type checker represents it):
- Both are represented as `(Int) -> (Int) -> Int` internally
- The parser converts `(Int, Int) -> Int` to `(Int) -> (Int) -> Int`
- The parser converts `(x, y) => body` to `(x) => (y) => body`

**This means:**
```vibefun
// These are THE SAME type:
let f1: (Int, Int) -> Int = ...
let f2: (Int) -> (Int) -> Int = ...

// f1 and f2 can be used interchangeably:
let g: (Int, Int) -> Int = f2     // ✅ OK
let h: (Int) -> (Int) -> Int = f1 // ✅ OK
```

#### Automatic Currying

All multi-argument functions are **automatically curried**, enabling partial application:

```vibefun
let add = (x, y) => x + y
// Surface syntax: (Int, Int) -> Int
// Internal type: (Int) -> (Int) -> Int

// Full application
add(1, 2)  // 3

// Partial application (provides fewer arguments than parameters)
let increment = add(1)  // Type: (Int) -> Int
increment(5)  // 6

// Partial application in pipelines
[1, 2, 3] |> List.map(add(10))  // [11, 12, 13]
```

#### Calling Conventions

Vibefun supports two equivalent calling conventions:

```vibefun
let add = (x, y, z) => x + y + z
// Type: (Int, Int, Int) -> Int
// Internal: (Int) -> (Int) -> (Int) -> Int

// Multi-argument call (uncurried style)
add(1, 2, 3)  // 6

// Curried call (nested application)
add(1)(2)(3)  // 6

// Partial application
let add1 = add(1)         // (Int, Int) -> Int
let add1and2 = add(1, 2)  // (Int) -> Int
let add1then2 = add(1)(2) // (Int) -> Int (equivalent to above)

// Mixed styles
add(1, 2)(3)   // ✅ OK: Apply first two args, then third
add(1)(2, 3)   // ✅ OK: Apply first arg, then next two
```

**Arity and partial application rules:**
- Providing **all arguments**: full application, returns result value
- Providing **fewer arguments than parameters**: partial application, returns a function
- Providing **more arguments than parameters**: type error (detected at compile time)

```vibefun
let add: (Int, Int) -> Int = (x, y) => x + y

add(1, 2)      // ✅ Full application → Int
add(1)         // ✅ Partial application → (Int) -> Int
add(1, 2, 3)   // ❌ Type error: expected 2 args, got 3
```

#### Type Inference with Currying

The type checker infers curried types automatically:

```vibefun
// Inferred as curried function
let add = (x, y) => x + y
// Inferred type: (Int) -> (Int) -> Int

// Partial application preserves type information
let increment = add(1)
// Inferred type: (Int) -> Int

// Works in higher-order contexts
let applyTwice = (f, x) => f(f(x))
// Inferred type: <T>((T) -> T, T) -> T

applyTwice(add(5), 10)  // add(5) is (Int) -> Int, applied twice
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

### Ref Equality and Aliasing

Refs use **reference equality** (identity), not **value equality**:

```vibefun
let mut x = ref(10)
let mut y = ref(10)

// x and y are DIFFERENT refs, even though they contain the same value
x == y  // false (different identity)

// Create an alias (same ref)
let mut z = x
x == z  // true (same identity)

// Mutations through aliases affect the same ref
x := 20
!z  // 20 (z is an alias of x)

// But y is unaffected
!y  // 10 (y is a different ref)
```

**Key points:**
- `ref(value)` always creates a **new** ref
- Refs are compared by **identity**, not by their contents
- Multiple bindings can reference the **same** ref (aliasing)
- Mutating a ref through any alias affects all aliases

#### Refs in Data Structures

Refs can be stored in data structures like lists, records, and variants:

```vibefun
// List of refs
let mut counters: List<Ref<Int>> = [ref(0), ref(1), ref(2)]

// Mutate individual refs in the list
match counters {
    | [first, ..._] => first := !first + 1
    | [] => ()
}

// Record containing refs
type State = {
    counter: Ref<Int>,
    status: Ref<String>
}

let mut state = {
    counter: ref(0),
    status: ref("idle")
}

state.counter := !state.counter + 1
state.status := "active"

// Variant containing refs
type CachedValue<T> = {
    value: Ref<Option<T>>,
    lastUpdated: Ref<Int>
}

let mut cache = {
    value: ref(None),
    lastUpdated: ref(0)
}

cache.value := Some(42)
```

#### Pattern Matching on Refs

You **cannot** pattern match directly on the contents of a ref. You must dereference first:

```vibefun
let mut opt = ref(Some(42))

// ❌ Error: Cannot pattern match on Ref<Option<Int>>
match opt {
    | Some(x) => x  // Wrong!
    | None => 0
}

// ✅ Correct: Dereference first, then match
match !opt {
    | Some(x) => x
    | None => 0
}

// Alternative: Extract value, then match
let value = !opt
match value {
    | Some(x) => x
    | None => 0
}
```

#### Polymorphic Refs and the Value Restriction

Refs **cannot** be polymorphic due to the value restriction:

```vibefun
// ❌ Cannot create a polymorphic ref
let mut polymorphicRef = ref((x) => x)
// Type: Ref<(t) -> t> (monomorphic t, NOT polymorphic <T>)

// The ref is monomorphic: once t is determined, it's fixed
polymorphicRef := (x: Int) => x + 1  // t := Int
let f = !polymorphicRef
f(42)  // OK: (Int) -> Int
f("hello")  // Error: t is Int, can't be String

// To store polymorphic functions, wrap in a record or variant:
type PolyFunc = { apply: <T>(T) -> T }

let mut polyRef = ref({ apply: (x) => x })
// Type: Ref<PolyFunc> (PolyFunc is polymorphic, not the ref)

let f = (!polyRef).apply
f(42)  // OK: T := Int
f("hello")  // OK: T := String (fresh instantiation)
```

See [Value Restriction](#value-restriction-and-polymorphism) for more details.

### Best Practices

1. **Declare refs with `mut`**: Always use `let mut x = ref(...)` to make mutation explicit
2. **Keep refs local**: Avoid exposing refs in public APIs—prefer functions that hide the mutation
3. **Minimize scope**: Create refs in the smallest scope possible
4. **Prefer pure functions**: Use refs only when the functional alternative is significantly worse
5. **Document why**: When you use a ref, comment on why mutation was chosen over immutability
6. **Understand aliasing**: Be aware when multiple bindings reference the same ref
7. **Don't pattern match on refs**: Dereference first, then pattern match on the value

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

### Module Paths and Resolution

Vibefun uses a module resolution algorithm similar to Node.js, adapted for `.vf` files.

#### Import Path Syntax

```vibefun
// Relative imports (must start with ./ or ../)
import { utils } from './utils'        // Same directory
import { helpers } from '../helpers'   // Parent directory
import { types } from './shared/types' // Subdirectory

// Package imports (no ./ or ../ prefix)
import { Option, Result } from 'vibefun/std'
import { map, filter } from '@myorg/functional-utils'
```

#### Module Resolution Algorithm

When resolving an import `from "module-path"`, the compiler follows these steps:

**1. Determine import type:**
- If path starts with `./` or `../`: **relative import**
- Otherwise: **package import**

**2. For relative imports:**

Starting from the importing file's directory, resolve the path:

```vibefun
// Current file: src/user/profile.vf
import { helper } from './utils'

// Resolution steps:
// 1. src/user/utils.vf         (exact match)
// 2. src/user/utils/index.vf   (directory with index)
// 3. Error if not found
```

**3. For package imports:**

Search in order:
1. **Standard library**: `vibefun/*` paths resolve to built-in modules
2. **node_modules**: Search `node_modules/` in current and ancestor directories
3. **Configured paths**: Check `vibefun.json` path mappings

```vibefun
// Stdlib import
import { Option } from 'vibefun/std'
// Resolves to: <stdlib>/std.vf

// Package import
import { Button } from '@ui/components'
// Search order:
//   1. ./node_modules/@ui/components.vf
//   2. ./node_modules/@ui/components/index.vf
//   3. ../node_modules/@ui/components.vf
//   4. ../node_modules/@ui/components/index.vf
//   (continue up the directory tree)
```

#### File Extension Rules

The `.vf` extension is **optional** in imports but **required** on the filesystem:

```vibefun
// ✅ All equivalent (find utils.vf)
import { helper } from './utils'
import { helper } from './utils.vf'

// File system must have:
// src/utils.vf  (with or without .vf in import)
```

**Index file convention:**
```vibefun
// Directory structure:
// src/
//   components/
//     index.vf       (re-exports)
//     button.vf
//     input.vf

// Import from directory:
import { Button, Input } from './components'
// Resolves to: ./components/index.vf
```

#### Circular Dependencies

Vibefun **allows** circular module dependencies, with these semantics:

```vibefun
// moduleA.vf
import { functionB } from './moduleB'
export let functionA = (x) => functionB(x) + 1

// moduleB.vf
import { functionA } from './moduleA'
export let functionB = (x) => if x > 0 then functionA(x - 1) else 0
```

**Initialization order:**
1. Modules are topologically sorted where possible
2. Circular dependencies create **initialization cycles**
3. During a cycle, imported bindings may be **undefined** until fully initialized
4. The compiler **warns** about circular dependencies but allows them

**Best practice:** Avoid circular dependencies when possible. If needed, use explicit initialization or redesign with a shared module:

```vibefun
// Instead of A ↔ B circular dependency:
// Create C as shared dependency: A → C ← B

// shared.vf
export type SharedType = ...

// moduleA.vf
import type { SharedType } from './shared'

// moduleB.vf
import type { SharedType } from './shared'
```

#### Path Mappings (vibefun.json)

Configure import aliases and module paths in `vibefun.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@utils/*": ["./src/utils/*"]
    }
  }
}
```

Usage:
```vibefun
// With path mapping configured above:
import { Button } from '@components/button'
// Resolves to: ./src/components/button.vf

import { helper } from '@utils/string'
// Resolves to: ./src/utils/string.vf
```

#### Module Resolution Errors

Clear error messages when resolution fails:

```vibefun
import { missing } from './nonexistent'
// Error: Cannot find module './nonexistent'
//   Tried:
//     - src/nonexistent.vf
//     - src/nonexistent/index.vf

import { missing } from 'unknown-package'
// Error: Cannot find module 'unknown-package'
//   Tried:
//     - node_modules/unknown-package.vf
//     - node_modules/unknown-package/index.vf
//     - ../node_modules/unknown-package.vf
//     - ../node_modules/unknown-package/index.vf
//   Package may need to be installed: npm install unknown-package
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
| `.`                       | 15        | Left          | Field access             |
| `()`                      | 15        | Left          | Function call            |
| `[]`                      | 15        | Left          | List indexing            |
| `!`                       | 14        | Right         | Dereference/Logical NOT  |
| `-` (unary)               | 14        | Right         | Unary minus              |
| `*`                       | 13        | Left          | Multiplication           |
| `/`                       | 13        | Left          | Division                 |
| `%`                       | 13        | Left          | Modulo                   |
| `+`                       | 12        | Left          | Addition                 |
| `-` (binary)              | 12        | Left          | Subtraction              |
| `&`                       | 11        | Left          | String concatenation     |
| `::`                      | 10        | Right         | List cons                |
| `<`                       | 9         | Left          | Less than                |
| `<=`                      | 9         | Left          | Less than or equal       |
| `>`                       | 9         | Left          | Greater than             |
| `>=`                      | 9         | Left          | Greater than or equal    |
| `==`                      | 8         | Left          | Equal                    |
| `!=`                      | 8         | Left          | Not equal                |
| `&&`                      | 5         | Left          | Logical AND              |
| <code>&vert;&vert;</code> | 4         | Left          | Logical OR               |
| `>>`                      | 3         | Right         | Forward composition      |
| `<<`                      | 3         | Right         | Backward composition     |
| <code>&vert;&gt;</code>   | 2         | Left          | Forward pipe             |
| `:=`                      | 1         | Right         | Reference assignment     |

**Notes:**
- **String concatenation `&` type enforcement**: The `&` operator is strictly for strings. It has type `(String, String) -> String`. Attempting to concatenate non-string values (e.g., `123 & "hello"` or `"Age: " & 42`) is a compile-time type error. Use conversion functions first: `"Age: " & String.fromInt(42)`.
- **Spread operator `...`**: The spread operator is not a standalone infix operator with precedence. It is syntax within list literals `[1, ...rest]` and record updates `{ ...record, field: value }`. It cannot be used in arbitrary expression contexts.
- **Composition vs pipe**: Composition (`>>`, `<<`) operates on functions and returns a new function. Pipe (`|>`) applies a value to a function. Precedence ensures pipe binds very loosely (applied last), while composition binds tighter (composes functions before application).
- **Unary minus disambiguation**: The parser distinguishes unary `-x` from binary `a - b` based on context. Unary minus requires no whitespace: `-x`, not `- x`. Binary minus requires an expression on the left: `a - b`.

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
