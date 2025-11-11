# Future Features

This appendix documents language features that are **reserved for future implementation** but are not currently supported in Vibefun. These features have reserved syntax or keywords to maintain forward compatibility.

---

## For Loops

**Status:** Not currently supported

**Reserved Syntax:** None (no reserved keywords)

**Future Design:** For loops may be added in a future version of Vibefun for more ergonomic iteration over collections.

### Hypothetical Syntax

```vibefun
// Possible future syntax (NOT IMPLEMENTED)
for item in list {
    // Process each item
}

for (key, value) in map {
    // Process key-value pairs
}

for i in 0..10 {
    // Range-based iteration
}
```

### Current Alternatives

Until for loops are implemented, use these approaches:

**List operations (recommended):**

```vibefun
// Use List.map for transformations
List.map([1, 2, 3, 4, 5], (x) => x * 2);
// [2, 4, 6, 8, 10]

// Use List.fold for accumulation
List.fold([1, 2, 3, 4, 5], 0, (acc, x) => acc + x);
// 15

// Use List.filter for selection
List.filter([1, 2, 3, 4, 5], (x) => x % 2 == 0);
// [2, 4]
```

**Range-based iteration:**

```vibefun
// Create a range helper function
let rec range = (start: Int, end: Int): List<Int> =>
    if start >= end then [];
    else [start, ...range(start + 1, end)];

// Use with map/fold
range(0, 10) |> List.map((i) => i * i);
// [0, 1, 4, 9, 16, 25, 36, 49, 64, 81]
```

**While loops for imperative style:**

```vibefun
// For mutation-heavy algorithms
let mut i = ref(0);
let mut sum = ref(0);

while !i < 10 {
    sum := !sum + !i;
    i := !i + 1;
}

!sum;  // 45
```

### Design Considerations

If for loops are added, they will likely:
- Work with any iterable type (List, Array, Set, etc.)
- Support pattern matching in the loop variable
- Have clear semantics for mutation and side effects
- Possibly support `break` and `continue` keywords
- Integrate with Vibefun's type system and exhaustiveness checking

---

## Async/Await

**Status:** Reserved for future implementation

**Reserved Keywords:** `async`, `await`

**Current Behavior:** These keywords are **reserved** and cannot be used as identifiers. Attempting to use them results in a parse error.

```vibefun
// ❌ Parse error: 'async' is a reserved keyword
let async = 42;

// ❌ Parse error: 'await' is a reserved keyword
let await = someFunction();
```

### Future Design

Async/await will likely provide first-class support for asynchronous programming, integrating with JavaScript's Promise-based ecosystem.

### Hypothetical Syntax

```vibefun
// Possible future syntax (NOT IMPLEMENTED)

// Async function declaration
let fetchUser = async (id: Int): Promise<User> => {
    let response = await fetch("/api/users/" & String.fromInt(id));
    let json = await response.json();
    parseUser(json);
}

// Async blocks
let result = await async {
    let user = await getUser(42);
    let posts = await getPosts(user.id);
    (user, posts);
}

// Error handling with async
let safeLoad = async (id: Int): Result<User, Error> => {
    try {
        let user = await loadUser(id);
        Ok(user);
    } catch (error) {
        Err(error);
    }
}
```

### Current Alternatives

Until async/await is implemented, use JavaScript Promises directly through unsafe blocks or external declarations:

**Using external declarations:**

```vibefun
// Declare Promise-returning JavaScript functions
external fetch: (String) -> Promise<Response> = "fetch" from "global";
external then: <A, B>(Promise<A>, (A) -> B) -> Promise<B> = "then" from "Promise.prototype";

// Use promises imperatively
unsafe {
    fetch("/api/data");
        .then((response) => response.json());
        .then((data) => console.log(data));
}
```

**Callback-based approach:**

```vibefun
external setTimeout: ((Unit) -> Unit, Int) -> Unit = "setTimeout" from "global";

let delay = (ms: Int, callback: (Unit) -> Unit): Unit =>
    unsafe {
        setTimeout(callback, ms);
    }

// Usage
delay(1000, () => {
    unsafe { console.log("Delayed message") };
})
```

**Promise wrapping:**

```vibefun
type Promise<T> = external;

external newPromise: <T>((((T) -> Unit), ((String) -> Unit)) -> Unit) -> Promise<T>
    = "Promise" from "global"

external promiseThen: <A, B>(Promise<A>, (A) -> Promise<B>) -> Promise<B>
    = "then" from "Promise.prototype"

// Create and chain promises
let loadData = (): Promise<Data> =>
    unsafe {
        newPromise((resolve, reject) => {
            // Async operation
            fetch("/api/data");
                .then((res) => res.json());
                .then(resolve);
                .catch(reject);
        })
    }
```

### Design Considerations

When async/await is added, it will need to address:

1. **Type system integration:**
   - How do `async` functions interact with the type system?
   - Should `async fn(): T` return `Promise<T>` or a Vibefun-specific async type?

2. **Effect tracking:**
   - How do async operations interact with purity and effect tracking?
   - Should async code require `unsafe` blocks, or be tracked separately?

3. **Error handling:**
   - How do errors propagate in async code?
   - Integration with `Result` type vs try/catch?

4. **Concurrency:**
   - Support for concurrent operations (e.g., `Promise.all`)?
   - Structured concurrency primitives?

5. **Compatibility:**
   - Full compatibility with JavaScript Promises
   - Ability to await both Vibefun and JavaScript async functions

---

## Other Reserved Keywords

The following keywords are reserved but not yet assigned to specific features:

- `trait` - Possibly for type classes or traits
- `impl` - Possibly for trait implementations
- `where` - Possibly for type constraints
- `yield` - Possibly for generators

These keywords may be used in future language versions and cannot currently be used as identifiers.

---

## Potential Future Features (Not Reserved)

These features are under consideration but have no reserved syntax:

### Type Classes / Traits

Ad-hoc polymorphism through type classes:

```vibefun
// Hypothetical syntax
trait Show<T> {
    show: (T) -> String
}

impl Show<Int> {
    show = String.fromInt;
}

impl Show<Bool> {
    show = (b) => if b then "true" else "false";
}

// Usage
let debug = <T: Show>(value: T): Unit =>
    unsafe { console.log(Show::show(value)) }
```

### Effect System

Track side effects in the type system:

```vibefun
// Hypothetical syntax
let pure: Int -> Int = (x) => x + 1;

let impure: Int -> IO<Unit> = (x) => {
    console.log(x);
}

// Effects compose
let combined: Int -> IO<Int> = (x) => {
    impure(x);
    pure(x);
}
```

### Module System Enhancements

- Nested modules
- Module functors (parameterized modules)
- Module signatures/interfaces
- Private members with explicit visibility control

### Pattern Matching Enhancements

- Active patterns (user-defined pattern matchers)
- View patterns
- As-patterns improvements
- Boolean patterns (combining guards with patterns)

### Syntax Improvements

- String interpolation: `"Hello, ${name}!"`
- Raw string literals: `r"C:\path\to\file"`
- Multiline strings with proper indentation handling
- Named function arguments: `f(name: "Alice", age: 30)`
- Optional arguments with defaults

### Tooling Features

- Language server protocol (LSP) support
- REPL (Read-Eval-Print Loop)
- Package manager
- Build tool enhancements
- Documentation generator

---

## Contributing to Future Features

If you're interested in contributing to the design or implementation of these features:

1. Check the project's GitHub issues for discussions
2. Review existing proposals and RFCs
3. Share your use cases and requirements
4. Participate in design discussions

**Note:** This appendix will be updated as features are implemented or as new features are proposed.
