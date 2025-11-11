# Type Aliases and Annotations

### Type Aliases

Type aliases create alternative names for existing types.

```vibefun
type UserId = Int;
type Username = String;
type Callback<T> = (T) -> Unit;

// Type aliases can reference other types
type Handler = (Request) -> Response;
type AsyncHandler = (Request) -> Promise<Response>
```

#### Transparent Type Aliases

Type aliases in Vibefun are **transparent** — they don't create new types, just alternative names for existing types. The type checker treats an alias and its definition as **completely interchangeable**:

```vibefun
type UserId = Int;
type PostId = Int;

let userId: UserId = 42;  // UserId is just Int
let postId: PostId = 42;  // PostId is just Int

// UserId and PostId are interchangeable (both are Int):
let id1: UserId = postId;  // ✅ OK: PostId == Int == UserId
let id2: PostId = userId;  // ✅ OK: UserId == Int == PostId
```

This is different from **nominal types** (like variants), which are distinct even if structurally identical.

#### Recursive Type Aliases

Type aliases **cannot** be directly recursive:

```vibefun
// ❌ Error: Recursive type alias
type BadList<T> = (T, BadList<T>);  // Not allowed

// ✅ Solution: Use a variant type instead
type GoodList<T> = Nil | Cons(T, GoodList<T>);
```

**Rationale:** Recursive aliases without constructor guards would create infinite types. Use variant types for recursive structures.

#### Generic Type Aliases

Type aliases can be parameterized with type variables:

```vibefun
// Generic type alias
type Result<T, E> = Ok(T) | Err(E);
type Option<T> = Some(T) | None;

// Nested generics
type Pair<A, B> = { first: A, second: B };
type PairList<A, B> = List<Pair<A, B>>

// Partially applied type alias (not supported directly)
// type IntResult = Result<Int>  // ❌ Error: Must apply all type parameters
// Workaround: define a new alias
type IntResult<E> = Result<Int, E>;  // ✅ OK
```

#### Type Aliases and Type Inference

Type aliases are fully transparent to the type inference system. The type checker **immediately expands** aliases to their underlying types:

```vibefun
type UserId = Int;
type Username = String;

// Type inference sees these as Int and String, not UserId and Username
let id = 42;  // Inferred as Int (not UserId)
let name = "Alice";  // Inferred as String (not Username)

// To get documentation benefit, add explicit annotations:
let id: UserId = 42;  // Documented as UserId, behaves as Int
let name: Username = "Alice";  // Documented as Username, behaves as String
```

**Implication:** Type aliases are purely for documentation and readability. They **do not** provide type safety against mixing similar types.

#### Type Safety Patterns

Because aliases are transparent, you **cannot** use them to prevent mixing conceptually different types:

```vibefun
type UserId = Int;
type OrderId = Int;

let user: UserId = 42;
let order: OrderId = user;  // ✅ Compiles (both are Int) but logically wrong!

// This will NOT catch the error at compile time because
// UserId and OrderId are both just Int
```

**Solution:** Use single-constructor variant types for nominal type safety:

```vibefun
type UserId = UserId(Int);
type OrderId = OrderId(Int);

let user = UserId(42);
let order: OrderId = user;  // ❌ Type error: UserId ≠ OrderId

// Must explicitly convert (forces you to acknowledge the mismatch):
let order = OrderId(42);  // ✅ Correct: Create OrderId explicitly
```

**Best Practice Guidelines:**
- **Use type aliases** for documenting intent without enforcing distinction (e.g., `type Callback<T> = (T) -> Unit`)
- **Use variant types** for enforcing type safety between conceptually different types (e.g., `UserId`, `OrderId`, `Kilometers`)
- **Consider the cost**: Variant types require explicit wrapping/unwrapping, which can be verbose

#### Type Alias vs Variant Type

```vibefun
// Type alias: transparent, interchangeable
type UserId = Int;
let id1: UserId = 42;
let id2: Int = id1;  // ✅ OK: UserId == Int

// Variant type: nominal, distinct
type Kilometers = Kilometers(Float);
type Miles = Miles(Float);

let km = Kilometers(100.0);
let mi: Miles = km;  // ❌ Error: Kilometers ≠ Miles (different nominal types)

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
let x: Int = 42;
let name: String = "Alice";
```

#### Function Annotations

```vibefun
// Full annotation
let add: (Int, Int) -> Int = (x, y) => x + y;

// Parameter annotations
let add = (x: Int, y: Int) => x + y;

// Return type annotation
let add = (x, y): Int => x + y;
```

#### When Annotations Are Required

1. External declarations (FFI)
2. Ambiguous recursive functions
3. Complex type parameters
4. Public API boundaries (recommended for documentation)

