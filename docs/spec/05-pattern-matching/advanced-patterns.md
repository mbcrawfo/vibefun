# Advanced Patterns

### Nested Patterns

Patterns can be arbitrarily nested, allowing deep destructuring of complex data structures.

```vibefun
let process = (result) => match result {
    | Ok(Some(value)) => "got " &String.fromInt(value)
    | Ok(None) => "got nothing"
    | Err(msg) => "error: " &msg
}
```

#### Nesting Depth

There is **no limit** on pattern nesting depth:

```vibefun
// Three levels deep
match data {
    | Ok(Some([x, ...xs])) => ...
    | Ok(Some([])) => ...
    | Ok(None) => ...
    | Err(_) => ...
}

// Four levels deep
match response {
    | Ok(User({ profile: { name, age } })) => ...
    | Ok(User({ profile: _ })) => ...
    | Err(_) => ...
}

// Very deep nesting (still valid)
match deeply {
    | A(B(C(D(E(value))))) => value
    | _ => defaultValue
}
```

#### All Combinations of Nested Patterns

**Variant in variant:**
```vibefun
match result {
    | Ok(Some(x)) => x
    | Ok(None) => 0
    | Err(_) => -1
}
```

**List in variant:**
```vibefun
match result {
    | Ok([]) => "empty"
    | Ok([x]) => "single: " & String.fromInt(x)
    | Ok([x, ...rest]) => "multiple"
    | Err(_) => "error"
}
```

**Record in variant:**
```vibefun
match result {
    | Ok({ value, status: "complete" }) => value
    | Ok({ value, status }) => defaultValue
    | Err(_) => errorValue
}
```

**Variant in list:**
```vibefun
match items {
    | [Some(a), Some(b), ...rest] => a + b
    | [Some(a), None, ...rest] => a
    | [None, ..._] => 0
    | [] => 0
}
```

**Record in list:**
```vibefun
match users {
    | [{ name, age }, ...rest] => (name, age)
    | [] => ("", 0)
}
```

**List in record:**
```vibefun
match data {
    | { items: [first, ...rest], status } => (first, status)
    | { items: [], status } => (defaultItem, status)
}
```

**Nested records:**
```vibefun
match person {
    | { profile: { name, address: { city } } } => (name, city)
    | { profile: { name } } => (name, "unknown")
}
```

**Nested lists:**
```vibefun
match matrix {
    | [[a, b], [c, d]] => a + b + c + d
    | [[x], [y]] => x + y
    | _ => 0
}
```

#### Pattern Nesting and Exhaustiveness

Exhaustiveness checking works with nested patterns:

```vibefun
// ✅ Exhaustive: all Result<Option<T>> cases covered
match result {
    | Ok(Some(x)) => x
    | Ok(None) => 0
    | Err(_) => -1
}

// ❌ Non-exhaustive: missing Err case
match result {
    | Ok(Some(x)) => x
    | Ok(None) => 0
}
// Error: Missing pattern: Err(_)
```

### Guards (When Clauses)

Guards add Boolean conditions to patterns, allowing more precise matching based on runtime values.

```vibefun
let classify = (n) => match n {
    | x when x < 0 => "negative"
    | 0 => "zero"
    | x when x > 0 && x < 10 => "small positive"
    | x when x >= 10 => "large positive"
}
```

#### Guard Syntax

```vibefun
// Guard with variable pattern
match value {
    | x when condition => result
}

// Guard with destructuring pattern
match list {
    | [x, ...xs] when x > 0 => process(x, xs)
    | _ => defaultValue
}

// Multiple guards on same pattern type
match number {
    | n when n < 0 => "negative"
    | n when n == 0 => "zero"
    | n when n > 0 => "positive"
}
```

#### Variable Scope in Guards

Variables bound in the pattern are **in scope** within the guard expression:

```vibefun
// Variable x bound in pattern, used in guard
match opt {
    | Some(x) when x > 10 => "large"
    | Some(x) when x > 0 => "small positive"
    | Some(x) => "non-positive"
    | None => "none"
}

// Multiple variables from pattern
match pair {
    | (a, b) when a == b => "equal"
    | (a, b) when a > b => "first larger"
    | (a, b) => "second larger"
}

// Nested pattern variables in guard
match result {
    | Ok(Some(value)) when value > 0 => value
    | Ok(Some(value)) => 0
    | _ => -1
}
```

#### Guard Evaluation Order

Guards are evaluated **top to bottom**, and evaluation stops at the first matching pattern with a satisfied guard:

```vibefun
match n {
    | x when x < 0 => "negative"    // Checked first
    | x when x == 0 => "zero"       // Checked second (if first fails)
    | x when x < 10 => "small"      // Checked third (if first two fail)
    | x => "large"                  // Checked last (always matches)
}

// Order matters:
let value = -5;
// Step 1: Pattern matches (x = -5), guard (x < 0) is true → "negative"
```

**Important:** The same pattern with different guards is tried in order:

```vibefun
match x {
    | n when n > 100 => "very large"
    | n when n > 10 => "large"
    | n when n > 0 => "positive"
    | n => "non-positive"
}
```

#### Guard Expression Restrictions

Guards must be **Boolean expressions**:

```vibefun
// ✅ OK: Boolean expression
match x {
    | n when n > 0 && n < 100 => "in range"
    | _ => "out of range"
}

// ✅ OK: Function call returning Bool
match x {
    | n when isValid(n) => "valid"
    | _ => "invalid"
}

// ❌ Error: Non-Boolean guard
match x {
    | n when n + 1 => ...  // Error: Int is not Bool
}
```

#### Guards Can Reference Outer Scope

Guards can reference variables from outer scopes:

```vibefun
let threshold = 100;

match value {
    | x when x > threshold => "above threshold"
    | x => "below threshold"
}

// Useful for configurable matching
let filterList = (list, minValue) =>
    match list {
        | [] => []
        | [x, ...xs] when x >= minValue => [x, ...filterList(xs, minValue)]
        | [_, ...xs] => filterList(xs, minValue)
    }
```

#### Guards with Complex Patterns

Guards work with all pattern forms:

```vibefun
// Guard with record pattern
match person {
    | { age, name } when age >= 18 => "Adult: " & name
    | { age, name } => "Minor: " & name
}

// Guard with list pattern
match list {
    | [x, y, ...rest] when x + y > 100 => "large sum"
    | [x, y, ..._] => "small sum"
    | _ => "too few elements"
}

// Guard with variant pattern
match result {
    | Ok(value) when value > 0 => value * 2
    | Ok(value) => value
    | Err(_) => 0
}
```

#### Guards and Side Effects

Guards **should not** have side effects, but technically can:

```vibefun
// ⚠️ Not recommended: side effects in guard
match x {
    | n when unsafe { console_log("checking"); n > 0 } => "positive"
    | _ => "non-positive"
}
```

**Best practice:** Keep guards **pure** (no side effects). The compiler may evaluate guards multiple times or in any order during pattern compilation.

#### Guards vs Separate Match Arms

Sometimes it's clearer to use separate match arms instead of guards:

```vibefun
// With guards
match status {
    | s when s == "active" || s == "pending" => inProgress()
    | s when s == "complete" => done()
    | _ => unknown()
}

// Without guards (clearer with or-patterns)
match status {
    | "active" | "pending" => inProgress()
    | "complete" => done()
    | _ => unknown()
}
```

**When to use guards:**
- Numeric ranges: `when x > 0 && x < 100`
- Complex conditions: `when List.length(xs) > 10`
- Conditions on multiple variables: `when a == b`

**When to avoid guards:**
- Simple equality: Use literal patterns instead
- Exhaustiveness matters: Guards don't contribute to exhaustiveness checking

### Or Patterns

Or-patterns allow multiple patterns to share the same result expression using the `|` separator within a match arm.

```vibefun
match status {
    | "pending" | "loading" => "in progress"
    | "complete" => "done"
    | _ => "unknown"
}
```

#### Or-Pattern Syntax

```vibefun
// Multiple literal patterns
match value {
    | 0 | 1 | 2 => "small"
    | 3 | 4 | 5 => "medium"
    | _ => "large"
}

// Constructor patterns
match result {
    | Ok(0) | Err("zero") => "zero case"
    | Ok(n) => "success: " & String.fromInt(n)
    | Err(msg) => "error: " & msg
}

// Mixed literal types (if same type)
match color {
    | Red | Green | Blue => "primary"
    | Yellow | Cyan | Magenta => "secondary"
    | _ => "other"
}
```

#### Variable Binding in Or-Patterns

**Rule:** Variables **cannot** be bound in or-patterns. All alternatives in an or-pattern must be **irrefutable patterns** (literals, wildcards, or constructors without bindings).

```vibefun
// ❌ Error: Cannot bind variables in or-patterns
match value {
    | Some(x) | None => x  // Error: x not bound in None branch
    | _ => 0
}

// ✅ Solution: Separate arms for each binding pattern
match value {
    | Some(x) => x
    | None => 0
}

// ✅ OK: No variables bound (all literals)
match status {
    | "active" | "pending" | "running" => true
    | _ => false
}

// ✅ OK: All alternatives bind no variables
match shape {
    | Circle(_) | Square(_) | Triangle(_) => "shape detected"
    | _ => "unknown"
}
```

#### Nesting Or-Patterns

Or-patterns can appear **within** constructor patterns:

```vibefun
// Or-pattern inside constructor
match response {
    | Ok("success" | "completed") => "done"
    | Ok(msg) => "ok: " & msg
    | Err(_) => "failed"
}

// Nested or-patterns
match event {
    | Click("button" | "link") => handleInteraction()
    | Hover("image" | "video") => showPreview()
    | _ => ()
}
```

**Limitation:** Or-patterns as the **top-level pattern** of a match arm cannot themselves be nested in complex ways:

```vibefun
// ✅ OK: Simple or-pattern at top level
| Red | Blue => ...

// ✅ OK: Or-pattern inside constructor
| Some("a" | "b") => ...

// ⚠️  Complex nesting may have limitations
| (Red | Blue) | Green => ...  // Check implementation support
```

#### Type Requirements for Or-Patterns

All alternatives in an or-pattern must have **compatible types** that can be unified:

```vibefun
// ✅ OK: All alternatives are Int
match x {
    | 0 | 1 | 2 => "small"
    | _ => "large"
}

// ❌ Error: Type mismatch (Int vs String)
match x {
    | 0 | "zero" => "zero value"  // Error: incompatible types
    | _ => "other"
}

// ✅ OK: All alternatives are same variant type
match color {
    | Red | Green | Blue => "RGB"
    | _ => "other"
}
```

### Pattern Type Annotations

Patterns can include type annotations to guide type inference or document expected types:

```vibefun
// Type annotation in match
match value {
    | (x: Int) when x > 0 => "positive"
    | (x: Int) => "non-positive"
}

// Type annotation in function parameter pattern
let process = (x: Option<Int>) => match x {
    | Some(n) => n * 2
    | None => 0
}

// Record pattern with field type annotations
let extract = ({ name: (name: String), age: (age: Int) }) => (name, age);
```

**Usage:**
- Mostly **optional** (type inference usually works)
- Useful for **disambiguation** when types are ambiguous
- Helpful for **documentation** in complex patterns

### As-Patterns

**Note:** Vibefun currently **does not support** as-patterns (binding both the whole value and parts).

In languages like OCaml/Haskell, as-patterns look like: `x as Some(value)`

```vibefun
// ❌ Not supported: as-patterns
match list {
    | head :: tail as fullList => ...  // Not supported
}

// ✅ Workaround: Bind separately
let fullList = list;
match list {
    | head :: tail => ...  // Use fullList from outer scope
}

// ✅ Alternative: Match and rebind
match list {
    | head :: tail => {
        let fullList = head :: tail;
        ...
    }
}
```

