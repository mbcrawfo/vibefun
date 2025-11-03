# Data Patterns

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

List patterns destructure lists, matching on structure and extracting elements.

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

#### Basic List Patterns

```vibefun
// Empty list
match list {
    | [] => "empty"
    | _ => "non-empty"
}

// Single element
match list {
    | [x] => x
    | _ => defaultValue
}

// Multiple specific elements
match list {
    | [a, b] => a + b
    | [a, b, c] => a + b + c
    | _ => 0
}

// Head and tail
match list {
    | [head, ...tail] => (head, tail)
    | [] => (defaultHead, [])
}
```

#### List Spread Patterns

The spread operator `...` captures the remaining elements:

```vibefun
// Capture rest of list
match list {
    | [first, ...rest] => (first, rest)
    | [] => (0, [])
}

// Skip elements with wildcard
match list {
    | [first, _, third, ...rest] => (first, third)
    | _ => (0, 0)
}

// Discard rest
match list {
    | [first, second, ..._] => first + second
    | _ => 0
}
```

**Spread Position Rules:**
- Spread can only appear **at the end** of a list pattern
- Only **one spread** allowed per list pattern
- Spread can be ignored with `_` or bound to a variable

```vibefun
// ✅ OK: Spread at end
| [a, b, ...rest] => ...

// ✅ OK: Spread with wildcard
| [a, b, ..._] => ...

// ❌ Error: Spread in middle
| [a, ...middle, z] => ...  // Not supported

// ❌ Error: Multiple spreads
| [a, ...rest1, ...rest2] => ...  // Not supported
```

#### List Pattern Exhaustiveness

List patterns require handling both empty and non-empty cases:

```vibefun
// ✅ Exhaustive: handles [] and non-empty
match list {
    | [] => "empty"
    | [_, ..._] => "non-empty"
}

// ✅ Exhaustive: wildcard catches all
match list {
    | [x] => x
    | _ => 0
}

// ❌ Non-exhaustive: missing []
match list {
    | [x, ...xs] => x
}
// Error: Missing pattern: []
```

#### Matching Specific List Lengths

```vibefun
match list {
    | [] => "none"
    | [_] => "one"
    | [_, _] => "two"
    | [_, _, _] => "three"
    | _ => "many"
}

// Or use guards for length checks
match list {
    | xs when List.length(xs) == 0 => "none"
    | xs when List.length(xs) <= 3 => "few"
    | _ => "many"
}
```

#### Nested List Patterns

Lists can be nested within other patterns:

```vibefun
// List of lists
match matrix {
    | [[a, b], [c, d]] => a + b + c + d
    | _ => 0
}

// List in variant
match result {
    | Ok([first, ...rest]) => first
    | Ok([]) => 0
    | Err(_) => -1
}

// List in record
match data {
    | { items: [first, second, ..._] } => first + second
    | { items: _ } => 0
}
```

### Record Patterns

Record patterns destructure record values, extracting fields by name.

```vibefun
let greetPerson = (person) => match person {
    | { name, age } => "Hello " &name &", age " &String.fromInt(age)
}

// Or in function parameters
let greet = ({ name }) => "Hello " &name
```

#### Basic Record Patterns

```vibefun
// Extract specific fields
match person {
    | { name, age } => (name, age)
}

// Match specific field values
match person {
    | { status: "active", id } => id
    | { status: "inactive", _ } => -1
    | _ => 0
}

// Nested field patterns
match user {
    | { profile: { name, email } } => (name, email)
}
```

#### Partial Record Matching

Record patterns support **partial matching** — you only need to match the fields you care about:

```vibefun
type Person = { name: String, age: Int, email: String, phone: String }

// Match only name and age (email and phone ignored)
match person {
    | { name: "Alice", age } => age
    | { name, _ } => 0
}

// Function parameter: extract only needed fields
let getName = ({ name }) => name  // Other fields ignored

// Works with width subtyping
let getX = ({ x }) => x
getX({ x: 1, y: 2, z: 3 })  // OK: extra fields ignored
```

#### Record Pattern Spread (Not Supported)

Vibefun **does not support** spread patterns in record matching:

```vibefun
// ❌ Not supported: rest pattern in record
match person {
    | { name, ...rest } => (name, rest)  // Not supported
}

// ✅ Workaround: Extract explicitly or use the whole record
match person {
    | { name, age, email } => (name, (age, email))  // Extract all needed
}

let { name, ...rest } = person  // ❌ Also not supported

// ✅ Alternative: Bind whole record and access fields
let person = getPerson()
let name = person.name
let age = person.age
```

#### Wildcard in Record Patterns

Use `_` to ignore specific fields:

```vibefun
// Ignore specific field
match user {
    | { name, age: _, email } => (name, email)
}

// Ignore field entirely (don't mention it)
match user {
    | { name, email } => (name, email)  // age field not mentioned = ignored
}

// Wildcard for the rest (but no binding to remaining fields)
match point {
    | { x, y } => x + y  // z field (if exists) ignored
}
```

#### Record Patterns with Literal Values

Match records with specific field values:

```vibefun
match result {
    | { status: "ok", value } => value
    | { status: "error", message } => panic(message)
    | _ => defaultValue
}

// Multiple literal constraints
match config {
    | { enabled: true, mode: "production" } => startProduction()
    | { enabled: true, mode: "development" } => startDev()
    | { enabled: false } => ()
}
```

#### Record Pattern Exhaustiveness

Record patterns with width subtyping affect exhaustiveness:

```vibefun
type Status = { code: Int }

// ❌ Non-exhaustive: Int has infinite values
match status {
    | { code: 200 } => "ok"
    | { code: 404 } => "not found"
}
// Error: Missing cases

// ✅ Exhaustive: wildcard catches all
match status {
    | { code: 200 } => "ok"
    | { code: 404 } => "not found"
    | _ => "other"
}
```

