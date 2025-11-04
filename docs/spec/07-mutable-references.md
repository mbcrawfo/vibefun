# Mutable References

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

#### Mut Keyword Requirement

Bindings that hold refs **must** use the `mut` keyword. Omitting it is a **compile-time error**:

```vibefun
// ❌ Error: ref bindings must use 'let mut'
let x = ref(0)
// Error: Cannot bind Ref<Int> without 'mut' keyword
// Suggestion: Use 'let mut x = ref(0)'

// ✅ OK: Correct syntax with mut
let mut x = ref(0)
```

**Rationale:** The `mut` keyword serves as a visual marker that indicates "this binding can be updated." It helps readers quickly identify mutable state in the codebase.

**Scope of mutation:**

The `mut` keyword indicates that the **ref itself can be reassigned** (though refs are typically not reassigned—they're mutated using `:=`):

```vibefun
let mut x = ref(0)

// ✅ OK: Update the ref's contents
x := 5

// ✅ OK: Reassign the binding to a new ref
x = ref(10)  // Less common, but allowed

// Contrast with immutable binding:
let y = 42
// y = 43  // ❌ Error: Cannot reassign immutable binding
```

However, in practice, refs are almost never reassigned—they're mutated using `:=`:

```vibefun
let mut counter = ref(0)

// Common pattern: mutate the ref's contents
counter := !counter + 1  // ✅ Typical usage

// Rare: reassigning to a new ref
counter = ref(100)  // Uncommon, usually not needed
```

**Best practice:** The `mut` keyword signals "this is mutable state"—use it sparingly and prefer immutable alternatives when possible.

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

