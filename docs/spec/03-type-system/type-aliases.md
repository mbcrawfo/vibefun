# Type Aliases and Annotations

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

