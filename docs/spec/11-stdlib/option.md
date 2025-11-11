# Option Module

The `Option` module provides a type-safe way to represent values that may or may not be present, eliminating null pointer errors.

## Option Type

```vibefun
type Option<T> = Some(T) | None;
```

- `Some(value)` - Contains a value of type `T`
- `None` - Represents absence of a value

## Philosophy

Options make absence **explicit and type-safe**:
- No null/undefined errors
- The type system forces you to handle the absence case
- More expressive than null checks
- Composable with map/flatMap

## Core Functions

### Option.map

```vibefun
Option.map: <A, B>(Option<A>, (A) -> B) -> Option<B>
```

**Description:** Transform the value inside an Option, if present.

**Semantics:**
- If the Option is `Some(value)`, applies the function and returns `Some(newValue)`
- If the Option is `None`, returns `None`

**Examples:**

```vibefun
Option.map(Some(5), (x) => x * 2);
// Some(10)

Option.map(None, (x) => x * 2);
// None

// Chain transformations
Some("hello");
    |> Option.map(String.length)
    |> Option.map((len) => len * 2)
// Some(10)
```

**Performance:** O(1)

---

### Option.flatMap

```vibefun
Option.flatMap: <A, B>(Option<A>, (A) -> Option<B>) -> Option<B>
```

**Description:** Chain operations that return Options, also known as `andThen` or `bind`.

**Semantics:**
- If the Option is `Some(value)`, applies the function (which returns an Option)
- If the Option is `None`, returns `None` without calling the function
- Flattens nested Options: `Option<Option<B>>` → `Option<B>`

**Examples:**

```vibefun
let parsePositive = (s: String): Option<Int> =>
    match Int.parse(s) {
        | Some(n) if n > 0 => Some(n)
        | _ => None
    }

let double = (x: Int): Option<Int> => Some(x * 2);

Some("42");
    |> Option.flatMap(parsePositive)
    |> Option.flatMap(double)
// Some(84)

Some("-5");
    |> Option.flatMap(parsePositive)
    |> Option.flatMap(double)
// None (parsePositive returns None for negative)

None;
    |> Option.flatMap(parsePositive)
// None
```

**Performance:** O(1)

---

### Option.getOrElse

```vibefun
Option.getOrElse: <A>(Option<A>, A) -> A
```

**Description:** Extract the value from an Option, or return a default if absent.

**Semantics:**
- If the Option is `Some(value)`, returns `value`
- If the Option is `None`, returns the provided default value
- Never panics

**Examples:**

```vibefun
Option.getOrElse(Some(42), 0);
// 42

Option.getOrElse(None, 0);
// 0

// Provide fallback for lookups
let config = Map.get(configMap, "timeout");
    |> Option.getOrElse(30)  // Default timeout: 30
```

**Performance:** O(1)

---

### Option.isSome

```vibefun
Option.isSome: <A>(Option<A>) -> Bool
```

**Description:** Check if an Option contains a value.

**Examples:**

```vibefun
Option.isSome(Some(42));  // true
Option.isSome(None);  // false
```

**Performance:** O(1)

**Note:** Pattern matching is often more idiomatic:

```vibefun
// Instead of:
if Option.isSome(opt) then ...;

// Use:
match opt {
    | Some(value) => // use value
    | None => ...
}
```

---

### Option.isNone

```vibefun
Option.isNone: <A>(Option<A>) -> Bool
```

**Description:** Check if an Option is absent.

**Examples:**

```vibefun
Option.isNone(Some(42));  // false
Option.isNone(None);  // true
```

**Performance:** O(1)

---

### Option.unwrap

```vibefun
Option.unwrap: <A>(Option<A>) -> A  // Panics on None
```

**Description:** Extract the value from an Option, **panicking if it's None**.

**Semantics:**
- If the Option is `Some(value)`, returns `value`
- If the Option is `None`, **panics with a runtime error**

**Examples:**

```vibefun
Option.unwrap(Some(42));
// 42

Option.unwrap(None);
// ⚠️ Panics: "Called unwrap on None"
```

**⚠️ Warning:** Use sparingly! Only call `unwrap` when you're **certain** the Option is `Some`, or in test code.

**Better alternatives:**
- `Option.getOrElse` - Provide default value
- Pattern matching - Handle both cases explicitly
- `Option.flatMap` - Chain operations

**Performance:** O(1) on Some, panics on None

---

## Additional Common Patterns

These functions are not in the initial standard library but can be implemented using the core functions:

### Option.filter

```vibefun
// Keep Some only if predicate is true
let filter = <A>(opt: Option<A>, pred: (A) -> Bool): Option<A> =>
    match opt {
        | Some(value) if pred(value) => Some(value)
        | _ => None
    }

filter(Some(42), (x) => x > 0);  // Some(42)
filter(Some(-5), (x) => x > 0);  // None
filter(None, (x) => x > 0);  // None
```

### Option.or

```vibefun
// Return first Some, or None if both are None
let or = <A>(opt1: Option<A>, opt2: Option<A>): Option<A> =>
    match opt1 {
        | Some(v) => Some(v)
        | None => opt2
    }

or(Some(1), Some(2));  // Some(1)
or(None, Some(2));  // Some(2)
or(None, None);  // None
```

### Option.getOrElseLazy

```vibefun
// Compute default lazily (only if None)
let getOrElseLazy = <A>(opt: Option<A>, f: () -> A): A =>
    match opt {
        | Some(value) => value
        | None => f()
    }

// Expensive computation only runs if None
getOrElseLazy(opt, () => expensiveComputation());
```

### Option.toList

```vibefun
// Convert Option to List
let toList = <A>(opt: Option<A>): List<A> =>
    match opt {
        | Some(value) => [value]
        | None => []
    }

toList(Some(42));  // [42]
toList(None);  // []
```

### Option.fromNullable (JavaScript interop)

```vibefun
// Convert nullable JavaScript value to Option
let fromNullable = <A>(value: A | null | undefined): Option<A> =>
    if value == null || value == undefined;
    then None;
    else Some(value);
```

---

## Common Usage Patterns

### Safe Indexing

```vibefun
// List.head returns Option<A> instead of throwing
let firstElement = List.head([1, 2, 3]);
// Some(1)

let emptyFirst = List.head([]);
// None

// Use with getOrElse for default
let first = List.head(list) |> Option.getOrElse(0);
```

### Chaining Lookups

```vibefun
type User = { id: Int, name: String };
type Database = { users: Map<Int, User> };

let getUserName = (db: Database, userId: Int): Option<String> =>
    Map.get(db.users, userId);
        |> Option.map((user) => user.name)

getUserName(db, 42);
// Some("Alice") if user exists
// None if user not found
```

### Combining Multiple Options

```vibefun
// All must be Some, or result is None
let combine2 = <A, B, C>(;
    opt1: Option<A>,
    opt2: Option<B>,
    f: (A, B) -> C
): Option<C> =>
    opt1 |> Option.flatMap((a) =>
    opt2 |> Option.map((b) =>
        f(a, b);
    ))

let add = (x: Int, y: Int): Int => x + y;

combine2(Some(5), Some(10), add);
// Some(15)

combine2(Some(5), None, add);
// None
```

### Converting to Result

```vibefun
// Add error message to None
let toResult = <A, E>(opt: Option<A>, error: E): Result<A, E> =>
    match opt {
        | Some(value) => Ok(value)
        | None => Err(error)
    }

let age = Int.parse(input);
    |> toResult("Invalid age")
```

---

## Pattern Matching with Options

Pattern matching is the most idiomatic way to handle Options:

```vibefun
let describe = (opt: Option<Int>): String =>
    match opt {
        | Some(0) => "zero"
        | Some(n) if n > 0 => "positive"
        | Some(n) => "negative"
        | None => "absent"
    }

// Nested patterns
let process = (opt: Option<(Int, Int)]): Int =>
    match opt {
        | Some((x, y)) => x + y
        | None => 0
    }

// Extracting from records
type Config = { timeout: Option<Int>, retries: Option<Int> };

let getTimeout = (config: Config): Int =>
    match config.timeout {
        | Some(t) => t
        | None => 30  // default
    }
```

---

## Comparison with Result

| **Option<T>** | **Result<T, E>** |
|---------------|------------------|
| `Some(value)` or `None` | `Ok(value)` or `Err(error)` |
| No error information | Carries error details |
| Use when absence is normal | Use when you need to know why it failed |
| Simpler, lightweight | More expressive for errors |

**Use Option when:**
- Absence is a normal, expected case
- You don't need to know why a value is absent
- Simple lookups, safe indexing, optional fields

**Use Result when:**
- You need to communicate what went wrong
- Errors should propagate with context
- Multiple failure modes exist

---

## Edge Cases

### Nesting Options

Avoid `Option<Option<T>>` - use `flatMap` instead:

```vibefun
// ❌ Nested Options (confusing)
let bad = (x: Int): Option<Option<Int>> =>
    if x > 0 then Some(Some(x * 2)) else None;

// ✅ Flattened with flatMap
let good = (x: Int): Option<Int> =>
    if x > 0 then Some(x * 2) else None;
```

### Pattern Matching is Exhaustive

The compiler enforces handling both cases:

```vibefun
let process = (opt: Option<Int>): Int =>
    match opt {
        | Some(value) => value
        // ❌ Non-exhaustive: missing None case
    }
```

Always handle both `Some` and `None`:

```vibefun
let process = (opt: Option<Int>): Int =>
    match opt {
        | Some(value) => value
        | None => 0  // ✅ Exhaustive
    }
```

### Empty Option Polymorphism

Due to the value restriction, binding `None` creates a monomorphic type:

```vibefun
let none = None;  // Type: Option<T> where T is a fresh type variable

// First use determines the type
let numbers = [Some(1), none]  // T := Int, none: Option<Int>
let strings = [Some("hello"), none]  // ❌ Error: none is already Option<Int>
```

To maintain polymorphism, use a function:

```vibefun
let none = <A>(): Option<A> => None;

// Now each call gets fresh type
let numbers = [Some(1), none()]   // Option<Int>
let strings = [Some("a"), none()] // Option<String>
```

---

## Performance Notes

All Option operations are O(1).

Options are implemented as variants and have minimal overhead:
- No null checks in generated code
- Simple pattern matching compiles to efficient checks
- Same memory representation as variants

---

## See Also

- **[Result Module](./result.md)** - For operations that can fail with error information
- **[Variant Types](../03-type-system/variant-types.md)** - Option is a variant type
- **[Pattern Matching](../05-pattern-matching/)** - Idiomatic way to handle Options
- **[List Module](./list.md)** - Many List functions return Options
