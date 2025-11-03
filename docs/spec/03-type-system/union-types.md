# Union Types

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

