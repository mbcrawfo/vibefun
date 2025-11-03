# Functions

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

