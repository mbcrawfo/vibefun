# Primitive Types

#### Int

Signed integer numbers (JavaScript `number`, integer values).

```vibefun
let x: Int = 42;
let y = -10;  // Inferred as Int
```

#### Float

Floating-point numbers (JavaScript `number`).

```vibefun
let pi: Float = 3.14159;
let e = 2.71828;  // Inferred as Float
```

### Numeric Type Unification Rules

Int and Float are **distinct types** with **no automatic coercion**. This prevents subtle bugs from implicit numeric conversions.

#### No Automatic Coercion

**Type rule:** Operations between `Int` and `Float` require explicit conversion.

```vibefun
// Literals have specific types
let x = 42;       // Int
let y = 3.14;     // Float

// Mixed operations are type errors
x + y;            // ❌ Type error: Cannot apply (+) to Int and Float

// Error message:
// Type mismatch in binary operation
//   Operator + expects operands of the same numeric type
//   Left: Int
//   Right: Float
//
//   x + y
//     ^
//   Help: Convert to common type using Float.fromInt(x) or Int.fromFloat(y)
```

**Valid mixed arithmetic (with explicit conversion):**
```vibefun
let x: Int = 42;
let y: Float = 3.14;

Float.fromInt(x) + y;       // ✅ OK: 45.14 (Float)
x + Int.fromFloat(y);       // ✅ OK: 45 (Int, truncates)
```

#### Numeric Literal Typing

Literal expressions have specific inferred types:

```vibefun
// Integer literals → Int
42;                 // Int
-10;                // Int
0x2A;               // Int
0b101010;           // Int

// Float literals → Float (must have decimal point or exponent)
3.14;               // Float
2.0;                // Float
1e10;               // Float
-0.5;               // Float

// Type annotations override inference
let x: Float = 42;  // ❌ Type error: Expected Float, got Int
let y: Int = 3.14;  // ❌ Type error: Expected Int, got Float

// Correct:
let x: Float = 42.0;           // ✅ OK
let y: Int = Int.fromFloat(3.14);  // ✅ OK: truncates to 3
```

#### Arithmetic Operations

Arithmetic operators require operands of the **same numeric type**:

```vibefun
// Int operations
let a: Int = 10;
let b: Int = 5;
a + b;     // ✅ Int
a - b;     // ✅ Int
a * b;     // ✅ Int
a / b;     // ✅ Int (integer division: 2)
a % b;     // ✅ Int

// Float operations
let x: Float = 10.0;
let y: Float = 5.0;
x + y;     // ✅ Float
x - y;     // ✅ Float
x * y;     // ✅ Float
x / y;     // ✅ Float (floating-point division: 2.0)
// Note: % (modulo) on Float uses JavaScript % semantics

// Mixed types require conversion
let c = 10 + 3.14;        // ❌ Type error
let d = 10.0 + Float.fromInt(3);  // ✅ OK: 13.0
```

#### Comparison Operations

Comparisons also require the same numeric type:

```vibefun
1 == 1;             // ✅ Bool: true
1.0 == 1.0;         // ✅ Bool: true
1 == 1.0;           // ❌ Type error: Cannot compare Int and Float

1 < 2;              // ✅ Bool: true
1.0 < 2.0;          // ✅ Bool: true
1 < 2.0;            // ❌ Type error: Cannot compare Int and Float

// Correct:
1 == Int.fromFloat(1.0);            // ✅ Bool: true
Float.fromInt(1) == 1.0;            // ✅ Bool: true
```

#### Lists and Collections

Lists must contain elements of a **single numeric type**:

```vibefun
[1, 2, 3];          // ✅ List<Int>
[1.0, 2.0, 3.0];    // ✅ List<Float>
[1, 2.0, 3];        // ❌ Type error: Mixed Int and Float in list

// Error message:
// Type mismatch in list literal
//   Expected all elements to have type Int (inferred from first element)
//   But element at index 1 has type Float
//
//   [1, 2.0, 3]
//       ^^^
//   Help: Convert all elements to the same type
```

**Valid heterogeneous lists:**
```vibefun
[1.0, 2.0, 3.0];                          // ✅ List<Float>
[Float.fromInt(1), 2.0, Float.fromInt(3)]; // ✅ List<Float>
```

#### Type Inference with Numeric Operations

The type checker infers numeric types from literals and operations:

```vibefun
// Inferred as Int
let x = 10;
let y = x + 5;      // Int

// Inferred as Float
let a = 3.14;
let b = a * 2.0;    // Float

// Context can influence inference
let f: (Float) -> Float = (x) => x * 2.0;
let result = f(10.0);  // ✅ OK: 20.0
let wrong = f(10);     // ❌ Type error: f expects Float, got Int
```

#### Conversion Functions

Use standard library functions for explicit conversion:

```vibefun
// Int → Float
Float.fromInt: (Int) -> Float;
Float.fromInt(42);       // 42.0

// Float → Int (truncates toward zero)
Int.fromFloat: (Float) -> Int;
Int.fromFloat(3.14);     // 3
Int.fromFloat(-2.7);     // -2

// String conversions
String.fromInt: (Int) -> String;
String.fromFloat: (Float) -> String;
```

See [Numeric stdlib](../11-stdlib/numeric.md) for complete numeric module documentation.

#### Rationale

**Why no automatic coercion?**
1. **Type safety**: Prevents accidental precision loss (Float → Int) or unexpected type changes
2. **Clarity**: Makes conversions explicit in code, improving readability
3. **Consistency**: Aligns with Vibefun's principle of explicit over implicit
4. **Error prevention**: Catches common bugs at compile time (e.g., `age + 0.1` when `age` is an Int)

**Comparison with other languages:**
- **JavaScript**: Automatic coercion (often surprising: `1 + 2.5 === 3.5`, but `"1" + 2 === "12"`)
- **Python**: Automatic Int/Float coercion (convenient but can hide precision issues)
- **OCaml/Haskell**: Separate operators for Int and Float (e.g., `+` vs `+.` in OCaml)
- **Vibefun**: Unified operators with explicit conversion (balance of safety and usability)

#### String

Unicode text strings (JavaScript `string`).

```vibefun
let name: String = "Alice";
let greeting = "Hello, " & name;
```

#### Bool

Boolean values (JavaScript `boolean`).

```vibefun
let isActive: Bool = true;
let isDone = false;
```

#### Unit

The unit type represents "no value" (like `void` in other languages). The only value of type `Unit` is `()`.

```vibefun
let nothing: Unit = ();
let log = (msg) => unsafe { console_log(msg); };  // Returns Unit
```

### Ref<T> (Mutable References)

The `Ref<T>` type represents a **mutable reference cell** containing a value of type `T`. Refs provide controlled mutability in Vibefun's otherwise immutable-by-default language.

**Important:** All refs must be declared with the `mut` keyword.

```vibefun
let mut counter: Ref<Int> = ref(0);
let mut state: Ref<Option<String>> = ref(None);
```

Refs are created with the `ref` keyword, read with the dereference operator `!`, and updated with the assignment operator `:=`:

```vibefun
let mut x = ref(10);   // Create: Ref<Int>
let value = !x;        // Read: Int
x := 20;               // Update: Unit
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

