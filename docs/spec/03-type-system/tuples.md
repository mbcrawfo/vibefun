# Tuple Types

### Tuple Types

Tuples are **ordered, fixed-size, heterogeneous** product types. They allow grouping multiple values of different types without naming the fields.

#### Syntax

Tuples are constructed using comma-separated expressions enclosed in parentheses:

```vibefun
let pair = (1, 2)                    // Tuple of two Ints
let triple = ("Alice", 30, true)     // Tuple of String, Int, Bool
let nested = ((1, 2), (3, 4))        // Nested tuples
```

#### Tuple Types

Tuple types are written using comma-separated types in parentheses:

```vibefun
let point: (Int, Int) = (10, 20)
let person: (String, Int, Bool) = ("Bob", 25, false)
let pair: (Float, String) = (3.14, "pi")
```

Type inference works naturally with tuples:

```vibefun
let coords = (5, 10)           // Inferred as (Int, Int)
let mixed = (true, "yes", 42)  // Inferred as (Bool, String, Int)
```

#### Tuple Element Access

Tuples are **not** accessed by numeric indices like `tuple.0` or `tuple[0]`. Instead, tuples must be **destructured** using pattern matching or let bindings:

```vibefun
// Pattern matching
let pair = (10, 20)
match pair {
    | (x, y) => x + y  // Destructure to get x=10, y=20
}

// Let destructuring
let (a, b) = (100, 200)
// a = 100, b = 200

let (name, age, active) = ("Alice", 30, true)
// name = "Alice", age = 30, active = true
```

#### Nested Destructuring

Tuples can be destructured at arbitrary nesting levels:

```vibefun
let nested = ((1, 2), (3, 4))

// Destructure nested tuple
let ((a, b), (c, d)) = nested
// a=1, b=2, c=3, d=4

match nested {
    | ((x, _), (_, y)) => x + y  // Extract first of first, second of second
}
```

#### Tuples vs Records

Tuples and records are distinct types with different use cases:

| **Tuples** | **Records** |
|------------|-------------|
| Anonymous, positional fields | Named fields |
| `(Int, String)` | `{ x: Int, name: String }` |
| Access via destructuring only | Access via dot notation |
| Fixed order matters | Field order doesn't matter |
| Lightweight, temporary grouping | Structured, documented data |

**When to use tuples:**
- Returning multiple values from a function
- Temporary grouping without semantic meaning
- Small (2-4 element), short-lived data
- Mathematical pairs, triples (coordinates, RGB colors)

**When to use records:**
- Data with semantic field names
- Larger structures (4+ fields)
- Data that will be passed around and accessed
- API boundaries and public interfaces

```vibefun
// Tuples for temporary grouping
let divMod = (a, b) => (a / b, a % b)
let (quotient, remainder) = divMod(17, 5)

// Records for structured data
type Person = { name: String, age: Int, email: String }
let person = { name: "Alice", age: 30, email: "alice@example.com" }
let name = person.name
```

#### Tuples in Function Signatures

Tuples can be used in function parameters and return types:

```vibefun
// Return tuple
let swap = (pair: (Int, Int)): (Int, Int) => {
    let (a, b) = pair
    (b, a)
}

// Multiple return values via tuple
let minMax = (a: Int, b: Int): (Int, Int) =>
    if a < b then (a, b) else (b, a)

let (min, max) = minMax(10, 5)
// min = 5, max = 10

// Tuple as parameter (must destructure in body)
let distance = (p: (Int, Int)): Float => {
    let (x, y) = p
    Float.sqrt(x * x + y * y)
}

distance((3, 4))  // 5.0
```

#### Unit Type as Empty Tuple

The unit type `()` is conceptually a **zero-element tuple** - a tuple with no elements:

```vibefun
let nothing: Unit = ()
let nothing: () = ()  // Equivalent - Unit is the 0-tuple

// Functions returning Unit return "no value"
let log = (msg: String): () => unsafe { console.log(msg) }
```

This makes `()` consistent with the tuple family:
- `()` - 0-tuple (Unit)
- `(T)` - Not a tuple! Single-element parentheses are just grouping
- `(T1, T2)` - 2-tuple (pair)
- `(T1, T2, T3)` - 3-tuple (triple)
- ...

#### Single-Element Tuples

**Important:** There are **no single-element tuples** in Vibefun. Parentheses around a single expression are just grouping, not tuple construction:

```vibefun
let x = (42)         // Just Int, not a tuple
let y: (Int) = 42    // Type annotation with parens, still just Int
let z = ((((5))))    // Still just Int

// To create a tuple, you need at least 2 elements
let pair = (1, 2)    // ✅ Tuple
let single = (1)     // ❌ Not a tuple, just Int
```

This is consistent with mathematical notation and avoids ambiguity with grouping parentheses.

#### Tuples in Pattern Matching

Tuples can be matched in `match` expressions:

```vibefun
let describe = (point: (Int, Int)) => match point {
    | (0, 0) => "origin"
    | (x, 0) => "on x-axis at " & String.fromInt(x)
    | (0, y) => "on y-axis at " & String.fromInt(y)
    | (x, y) when x == y => "on diagonal"
    | (x, y) => "at (" & String.fromInt(x) & ", " & String.fromInt(y) & ")"
}

describe((0, 0))   // "origin"
describe((5, 5))   // "on diagonal"
describe((3, 7))   // "at (3, 7)"
```

#### Tuple Type Inference

The type checker infers tuple types naturally:

```vibefun
// Inferred as (Int, String)
let pair = (42, "answer")

// Polymorphic tuple function
let fst = (tuple) => {
    let (a, _) = tuple
    a
}
// Inferred type: <A, B>((A, B)) -> A

fst((1, 2))         // 1: Int
fst(("hello", 42))  // "hello": String

// Second element accessor
let snd = (tuple) => {
    let (_, b) = tuple
    b
}
// Inferred type: <A, B>((A, B)) -> B
```

#### Generic Tuples

Tuples work naturally with generic types:

```vibefun
// Generic pair type
type Pair<A, B> = (A, B)

let intPair: Pair<Int, Int> = (1, 2)
let mixedPair: Pair<String, Bool> = ("active", true)

// Generic functions over tuples
let mapPair = <A, B, C, D>(f: (A) -> C, g: (B) -> D, pair: (A, B)): (C, D) => {
    let (a, b) = pair
    (f(a), g(b))
}

let doubled = mapPair((x) => x * 2, (y) => y * 2, (5, 10))
// (10, 20): (Int, Int)
```

#### Tuples with Type Aliases

Type aliases can name tuple types for clarity:

```vibefun
// Aliases for common tuple types
type Point2D = (Int, Int)
type Point3D = (Int, Int, Int)
type RGB = (Int, Int, Int)
type Range = (Int, Int)

let origin: Point2D = (0, 0)
let color: RGB = (255, 128, 0)
let range: Range = (1, 100)

// Functions using aliased tuple types
let inRange = (value: Int, range: Range): Bool => {
    let (min, max) = range
    value >= min && value <= max
}

inRange(50, (1, 100))  // true
```

**Note:** These are **transparent aliases** - `Point2D` and `(Int, Int)` are **the same type**. This differs from nominal types (variants/records with `type` declarations).

```vibefun
type Point2D = (Int, Int)
type Vector2D = (Int, Int)

let p: Point2D = (1, 2)
let v: Vector2D = p  // ✅ OK - same underlying type (Int, Int)

// Compare to nominal record types:
type PointRec = { x: Int, y: Int }
type VectorRec = { x: Int, y: Int }
// These are DIFFERENT nominal types despite identical structure
```

#### Edge Cases and Limitations

**Destructuring requirements:**

```vibefun
let pair = (1, 2)

// ❌ Error: Cannot access tuple elements by index
let x = pair.0      // Compile error
let y = pair[0]     // Compile error

// ✅ Must destructure
let (x, y) = pair
```

**Exhaustiveness in pattern matching:**

```vibefun
let classify = (pair: (Int, Int)) => match pair {
    | (0, 0) => "origin"
    // ❌ Non-exhaustive: missing other (Int, Int) cases
}

// ✅ Exhaustive with wildcard
let classify = (pair: (Int, Int)) => match pair {
    | (0, 0) => "origin"
    | _ => "other"
}
```

**Tuple size is fixed:**

Tuples have a fixed number of elements determined at compile time. You cannot have a "list of unknown length" as a tuple.

```vibefun
// ✅ Fixed-size tuple
let triple = (1, 2, 3)

// For variable-length collections, use List
let numbers = [1, 2, 3, 4, 5]  // List<Int>
```

**Arity mismatch in destructuring:**

Destructuring must match the exact number of tuple elements. Arity mismatches are **compile-time errors**:

```vibefun
let pair = (10, 20)

// ❌ Too few variables
let (x) = pair
// Error: Cannot destructure tuple of size 2 into pattern with 1 variable
//   Expected: (T1, T2)
//   Got pattern: (x)
//
//   let (x) = pair
//       ^^^
//   Help: Tuple has 2 elements, provide 2 variables: let (x, y) = pair

// ❌ Too many variables
let (x, y, z) = pair
// Error: Cannot destructure tuple of size 2 into pattern with 3 variables
//   Expected: (T1, T2)
//   Got pattern: (x, y, z)
//
//   let (x, y, z) = pair
//       ^^^^^^^^^
//   Help: Tuple has 2 elements, provide 2 variables: let (x, y) = pair

// ✅ Correct arity
let (x, y) = pair  // OK: matches tuple size
```

**Arity in pattern matching:**

Pattern match arms must also have correct arity:

```vibefun
let triple = (1, 2, 3)

match triple {
    // ❌ Wrong arity in pattern
    | (x, y) => x + y
    // Error: Pattern has 2 elements but value has type (Int, Int, Int)
    //   Expected pattern with 3 elements
    //
    //   | (x, y) => x + y
    //     ^^^^^^
}

match triple {
    // ✅ Correct arity
    | (x, y, z) => x + y + z

    // ✅ Can use wildcards for unused elements
    | (x, _, z) => x + z
}
```

**Wildcards don't change arity:**

Wildcard patterns (`_`) still count toward arity - they must match the tuple size:

```vibefun
let pair = (10, 20)

// ✅ OK: 2 patterns for 2 elements
let (x, _) = pair      // Bind first, ignore second

// ✅ OK: Ignore both
let (_, _) = pair

// ❌ Wrong arity even with wildcards
let (x, _, _) = pair   // Error: 3 patterns for 2-tuple
```

**Rationale:**

Arity checking at compile time:
1. **Catches bugs early**: Prevents runtime index-out-of-bounds errors
2. **Clear error messages**: Points to exact mismatch location
3. **Type safety**: Ensures destructuring matches tuple shape
4. **No silent failures**: All elements must be explicitly handled (or ignored with `_`)

**Tuple type equivalence:**

Tuples are structurally typed - two tuple types with the same element types in the same order are equivalent:

```vibefun
let a: (Int, String) = (1, "hello")
let b: (Int, String) = a  // ✅ Same type

// Different order = different type
let c: (String, Int) = a  // ❌ Error: (Int, String) ≠ (String, Int)

// Different arity = different type
let d: (Int, String, Bool) = (1, "hi", true)
let e: (Int, String) = d   // ❌ Error: Different tuple sizes
```

#### Implementation Notes

**JavaScript Representation:**

Tuples are compiled to JavaScript arrays:

```vibefun
// Vibefun
let pair = (1, 2)
```

```javascript
// Generated JavaScript
const pair = [1, 2];
```

However, this is an implementation detail. Vibefun code **cannot** treat tuples as arrays (no index access, no mutation). The type system enforces tuple semantics.

**Performance:**

- Tuple creation: O(n) where n is the number of elements (small constant)
- Tuple destructuring: O(1) per element (compile-time transformation)
- No runtime overhead for type checking (static types erased after compilation)

#### Summary

**Tuples are:**
- ✅ Fixed-size, heterogeneous product types
- ✅ Constructed with comma syntax: `(a, b, c)`
- ✅ Destructured via pattern matching or let bindings
- ✅ Structural types (order and types must match)
- ✅ Useful for temporary grouping and multiple return values

**Tuples are NOT:**
- ❌ Accessible by numeric index (`tuple.0`, `tuple[0]`)
- ❌ Mutable or resizable
- ❌ A replacement for records (use records for structured, named data)
- ❌ Available as single-element tuples (use just the value)

**Best practices:**
- Use tuples for simple, temporary grouping (2-4 elements)
- Use records for structured data with semantic meaning
- Use destructuring to access tuple elements
- Keep tuples small - large tuples (>4 elements) should be records
