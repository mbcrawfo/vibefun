# Data Literals

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

