# Primitive Types

#### Int

Signed integer numbers (JavaScript `number`, integer values).

```vibefun
let x: Int = 42
let y = -10  // Inferred as Int
```

#### Float

Floating-point numbers (JavaScript `number`).

```vibefun
let pi: Float = 3.14159
let e = 2.71828  // Inferred as Float
```

#### String

Unicode text strings (JavaScript `string`).

```vibefun
let name: String = "Alice"
let greeting = "Hello, " &name
```

#### Bool

Boolean values (JavaScript `boolean`).

```vibefun
let isActive: Bool = true
let isDone = false
```

#### Unit

The unit type represents "no value" (like `void` in other languages). The only value of type `Unit` is `()`.

```vibefun
let nothing: Unit = ()
let log = (msg) => unsafe { console_log(msg) }  // Returns Unit
```

### Ref<T> (Mutable References)

The `Ref<T>` type represents a **mutable reference cell** containing a value of type `T`. Refs provide controlled mutability in Vibefun's otherwise immutable-by-default language.

**Important:** All refs must be declared with the `mut` keyword.

```vibefun
let mut counter: Ref<Int> = ref(0)
let mut state: Ref<Option<String>> = ref(None)
```

Refs are created with the `ref` keyword, read with the dereference operator `!`, and updated with the assignment operator `:=`:

```vibefun
let mut x = ref(10)   // Create: Ref<Int>
let value = !x        // Read: Int
x := 20               // Update: Unit
```

**Type characteristics:**
- `Ref<T>` is a **parameterized type** (generic over `T`)
- All refs must be declared with the `mut` keyword: `let mut x = ref(...)`
- Refs are **mutable cells**—the reference itself is immutable, but the contained value can change
- Creating a ref: `ref(value)` has type `Ref<T>` when `value` has type `T`
- Reading a ref: `!refExpr` has type `T` when `refExpr` has type `Ref<T>`
- Updating a ref: `refExpr := value` requires `refExpr: Ref<T>` and `value: T`, returns `Unit`

**See also:** The [Mutable References](#mutable-references) section for comprehensive documentation, examples, and usage guidance.

### Function Types

Functions are first-class values with types written using the arrow notation.

```vibefun
// Type signature
add: (Int, Int) -> Int

// Single argument function
identity: (Int) -> Int

// Higher-order function
map: <A, B>(List<A>, (A) -> B) -> List<B>

// Curried function (all functions are curried by default)
add: (Int) -> (Int) -> Int
```

