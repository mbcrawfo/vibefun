# Result Module

The `Result` module provides functional error handling without exceptions. Results represent computations that may succeed with a value or fail with an error.

## Result Type

```vibefun
type Result<T, E> = Ok(T) | Err(E)
```

- `Ok(value)` - Successful result containing a value of type `T`
- `Err(error)` - Failed result containing an error of type `E`

## Philosophy

Results make error handling **explicit and type-safe**:
- Errors are values, not exceptions
- The type system forces you to handle errors
- Error types are documented in function signatures
- No hidden control flow (unlike exceptions)

## Core Functions

### Result.map

```vibefun
Result.map: <T, E, U>(Result<T, E>, (T) -> U) -> Result<U, E>
```

**Description:** Transform the success value of a Result, leaving errors unchanged.

**Semantics:**
- If the Result is `Ok(value)`, applies the function and returns `Ok(newValue)`
- If the Result is `Err(error)`, returns `Err(error)` unchanged
- The error type `E` remains the same

**Examples:**

```vibefun
Result.map(Ok(5), (x) => x * 2)
// Ok(10)

Result.map(Err("failed"), (x) => x * 2)
// Err("failed")

// Chaining transformations
Ok(3)
    |> Result.map((x) => x + 1)
    |> Result.map((x) => x * 2)
// Ok(8)
```

**Use case:** Transform success values while propagating errors.

**Performance:** O(1)

---

### Result.mapErr

```vibefun
Result.mapErr: <T, E, F>(Result<T, E>, (E) -> F) -> Result<T, F>
```

**Description:** Transform the error value of a Result, leaving success values unchanged.

**Semantics:**
- If the Result is `Ok(value)`, returns `Ok(value)` unchanged
- If the Result is `Err(error)`, applies the function and returns `Err(newError)`
- The success type `T` remains the same

**Examples:**

```vibefun
Result.mapErr(Err("parse failed"), (msg) => "Error: " & msg)
// Err("Error: parse failed")

Result.mapErr(Ok(42), (msg) => "Error: " & msg)
// Ok(42)

// Convert error type
type ParseError = ParseError(String)
type ValidationError = ValidationError(String)

let toValidationError = (result: Result<Int, ParseError>): Result<Int, ValidationError> =>
    Result.mapErr(result, (ParseError(msg)) => ValidationError(msg))
```

**Use case:** Convert between error types or add context to errors.

**Performance:** O(1)

---

### Result.flatMap

```vibefun
Result.flatMap: <T, E, U>(Result<T, E>, (T) -> Result<U, E>) -> Result<U, E>
```

**Description:** Chain operations that may fail, also known as `andThen` or `bind`.

**Semantics:**
- If the Result is `Ok(value)`, applies the function (which returns a Result)
- If the Result is `Err(error)`, returns `Err(error)` without calling the function
- Flattens nested Results: `Result<Result<U, E>, E>` → `Result<U, E>`
- The error type `E` must be the same across all operations

**Examples:**

```vibefun
// Sequential operations that may fail
let parseAge = (s: String): Result<Int, String> =>
    match Int.parse(s) {
        | Some(n) => Ok(n)
        | None => Err("Invalid integer: " & s)
    }

let validateAge = (age: Int): Result<Int, String> =>
    if age >= 0 && age <= 150
    then Ok(age)
    else Err("Age out of range: " & String.fromInt(age))

// Chain with flatMap
let processAge = (input: String): Result<Int, String> =>
    parseAge(input)
        |> Result.flatMap(validateAge)

processAge("25")    // Ok(25)
processAge("200")   // Err("Age out of range: 200")
processAge("abc")   // Err("Invalid integer: abc")

// Multiple chained operations
let divide = (a: Int, b: Int): Result<Int, String> =>
    if b == 0 then Err("Division by zero") else Ok(a / b)

Ok(100)
    |> Result.flatMap((x) => divide(x, 10))
    |> Result.flatMap((x) => divide(x, 2))
// Ok(5)

Ok(100)
    |> Result.flatMap((x) => divide(x, 0))
    |> Result.flatMap((x) => divide(x, 2))
// Err("Division by zero") - stops at first error
```

**Use case:** Chain multiple failable operations, short-circuiting on first error.

**Performance:** O(1)

---

### Result.isOk

```vibefun
Result.isOk: <T, E>(Result<T, E>) -> Bool
```

**Description:** Check if a Result is `Ok`.

**Examples:**

```vibefun
Result.isOk(Ok(42))          // true
Result.isOk(Err("failed"))   // false
```

**Performance:** O(1)

**Note:** Pattern matching is often more idiomatic:

```vibefun
// Instead of:
if Result.isOk(result) then ...

// Use:
match result {
    | Ok(value) => ...
    | Err(error) => ...
}
```

---

### Result.isErr

```vibefun
Result.isErr: <T, E>(Result<T, E>) -> Bool
```

**Description:** Check if a Result is `Err`.

**Examples:**

```vibefun
Result.isErr(Ok(42))          // false
Result.isErr(Err("failed"))   // true
```

**Performance:** O(1)

---

### Result.unwrap

```vibefun
Result.unwrap: <T, E>(Result<T, E>) -> T  // Panics on Err
```

**Description:** Extract the success value from a Result, **panicking if it's an error**.

**Semantics:**
- If the Result is `Ok(value)`, returns `value`
- If the Result is `Err(error)`, **panics with a runtime error**

**Examples:**

```vibefun
Result.unwrap(Ok(42))
// 42

Result.unwrap(Err("failed"))
// ⚠️ Panics: "Called unwrap on Err value: failed"
```

**⚠️ Warning:** Use sparingly! Only call `unwrap` when you're **certain** the Result is `Ok`, or in test code.

**Better alternatives:**
- `Result.unwrapOr` - Provide default value
- Pattern matching - Handle both cases explicitly
- `Result.flatMap` - Chain operations

**Performance:** O(1) on success, panics on error

---

### Result.unwrapOr

```vibefun
Result.unwrapOr: <T, E>(Result<T, E>, T) -> T
```

**Description:** Extract the success value from a Result, or return a default if it's an error.

**Semantics:**
- If the Result is `Ok(value)`, returns `value`
- If the Result is `Err(error)`, returns the provided default value
- Never panics

**Examples:**

```vibefun
Result.unwrapOr(Ok(42), 0)
// 42

Result.unwrapOr(Err("failed"), 0)
// 0

// Provide fallback for parsing
let age = Int.parse(input)
    |> Result.unwrapOr(0)  // Default to 0 if parse fails
```

**Use case:** Provide fallback values for errors.

**Performance:** O(1)

---

## Additional Common Patterns

These functions are not in the initial standard library but can be implemented using the core functions:

### Result.andThen (alias for flatMap)

```vibefun
let andThen = Result.flatMap
```

### Result.or

```vibefun
// Return first Ok, or last Err if all fail
let or = <T, E>(r1: Result<T, E>, r2: Result<T, E>): Result<T, E> =>
    match r1 {
        | Ok(v) => Ok(v)
        | Err(_) => r2
    }

or(Err("first"), Ok(42))   // Ok(42)
or(Err("first"), Err("second"))  // Err("second")
or(Ok(1), Ok(2))  // Ok(1)
```

### Result.unwrapOrElse

```vibefun
// Compute default lazily
let unwrapOrElse = <T, E>(r: Result<T, E>, f: (E) -> T): T =>
    match r {
        | Ok(value) => value
        | Err(error) => f(error)
    }

// Use error to compute default
unwrapOrElse(Err("invalid"), (msg) => {
    unsafe { console.log("Error: " & msg) }
    0
})
```

### Result.toOption

```vibefun
// Convert Result to Option, discarding error
let toOption = <T, E>(r: Result<T, E>): Option<T> =>
    match r {
        | Ok(value) => Some(value)
        | Err(_) => None
    }

toOption(Ok(42))          // Some(42)
toOption(Err("failed"))   // None
```

### Result.fromOption

```vibefun
// Convert Option to Result with error message
let fromOption = <T, E>(opt: Option<T>, error: E): Result<T, E> =>
    match opt {
        | Some(value) => Ok(value)
        | None => Err(error)
    }

fromOption(Some(42), "no value")      // Ok(42)
fromOption(None, "no value")          // Err("no value")
```

---

## Error Handling Patterns

### Railway-Oriented Programming

Chain operations that may fail using `flatMap`:

```vibefun
type User = { name: String, email: String, age: Int }

let validateName = (name: String): Result<String, String> =>
    if String.length(name) > 0
    then Ok(name)
    else Err("Name cannot be empty")

let validateEmail = (email: String): Result<String, String> =>
    if String.contains(email, "@")
    then Ok(email)
    else Err("Invalid email address")

let validateAge = (age: Int): Result<Int, String> =>
    if age >= 18
    then Ok(age)
    else Err("Must be 18 or older")

let createUser = (name: String, email: String, age: Int): Result<User, String> =>
    validateName(name) |> Result.flatMap((validName) =>
    validateEmail(email) |> Result.flatMap((validEmail) =>
    validateAge(age) |> Result.map((validAge) =>
        { name: validName, email: validEmail, age: validAge }
    )))

createUser("Alice", "alice@example.com", 25)
// Ok({ name: "Alice", email: "alice@example.com", age: 25 })

createUser("", "alice@example.com", 25)
// Err("Name cannot be empty")

createUser("Bob", "invalid-email", 25)
// Err("Invalid email address")

createUser("Bob", "bob@example.com", 15)
// Err("Must be 18 or older")
```

### Collecting Results

Process a list of operations, collecting all successes or stopping at first error:

```vibefun
// Sequential: stop at first error
let rec mapResults = <A, B, E>(
    xs: List<A>,
    f: (A) -> Result<B, E>
): Result<List<B>, E> =>
    match xs {
        | [] => Ok([])
        | [head, ...tail] =>
            f(head) |> Result.flatMap((b) =>
                mapResults(tail, f) |> Result.map((bs) =>
                    [b, ...bs]
                ))
    }

mapResults([1, 2, 3], (x) => Ok(x * 2))
// Ok([2, 4, 6])

mapResults([1, 0, 3], (x) =>
    if x == 0 then Err("zero") else Ok(x)
)
// Err("zero") - stops at first error
```

### Result with Multiple Error Types

Use a variant type to represent multiple error kinds:

```vibefun
type AppError =
    | ParseError(String)
    | ValidationError(String)
    | NetworkError(String)

let parseInput = (s: String): Result<Int, AppError> =>
    match Int.parse(s) {
        | Some(n) => Ok(n)
        | None => Err(ParseError("Invalid number: " & s))
    }

let validatePositive = (n: Int): Result<Int, AppError> =>
    if n > 0
    then Ok(n)
    else Err(ValidationError("Must be positive"))

let processInput = (s: String): Result<Int, AppError> =>
    parseInput(s) |> Result.flatMap(validatePositive)

// Handle specific error types
match processInput(input) {
    | Ok(value) => // use value
    | Err(ParseError(msg)) => // handle parse error
    | Err(ValidationError(msg)) => // handle validation error
    | Err(NetworkError(msg)) => // handle network error
}
```

---

## Comparison with Option

Both `Result` and `Option` represent computations that may fail, but with different trade-offs:

| **Result<T, E>** | **Option<T>** |
|------------------|---------------|
| Carries error information | No error information |
| `Ok(value)` or `Err(error)` | `Some(value)` or `None` |
| Use when you need to know **why** it failed | Use when failure is expected/normal |
| Parsing, validation, I/O | Safe indexing, lookups |

**Use Result when:**
- You need to communicate what went wrong
- Errors should be propagated up the call stack
- Operations have multiple failure modes

**Use Option when:**
- Absence is normal (e.g., `List.head` on empty list)
- No additional error context needed
- Simpler API suffices

---

## Edge Cases

### Nesting Results

Avoid `Result<Result<T, E>, E>` - use `flatMap` instead:

```vibefun
// ❌ Nested Results (hard to work with)
let bad = (x: Int): Result<Result<Int, String>, String> =>
    if x > 0
    then Ok(Ok(x * 2))
    else Err("negative")

// ✅ Flattened with flatMap
let good = (x: Int): Result<Int, String> =>
    if x > 0
    then Ok(x) |> Result.map((y) => y * 2)
    else Err("negative")
```

### Pattern Matching is Exhaustive

The compiler enforces handling both cases:

```vibefun
let process = (r: Result<Int, String>): Int =>
    match r {
        | Ok(value) => value
        // ❌ Non-exhaustive: missing Err case
    }
```

Always handle both `Ok` and `Err`:

```vibefun
let process = (r: Result<Int, String>): Int =>
    match r {
        | Ok(value) => value
        | Err(_) => 0  // ✅ Exhaustive
    }
```

---

## Performance Notes

All Result operations are O(1) except when they call user-provided functions (map, flatMap).

Results are implemented as variants and have minimal overhead:
- No exception throwing/catching
- No hidden control flow
- Simple pattern matching compiles to efficient checks

---

## See Also

- **[Option Module](./option.md)** - For values that may be absent
- **[Error Handling](../09-error-handling.md)** - General error handling strategies
- **[Variant Types](../03-type-system/variant-types.md)** - Result is a variant type
- **[Pattern Matching](../05-pattern-matching/)** - Idiomatic way to handle Results
