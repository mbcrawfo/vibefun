# Numeric Modules

The numeric modules provide operations for working with integers and floating-point numbers. Vibefun maintains a strict separation between `Int` and `Float` types with no implicit coercion.

## Int Module

The `Int` module provides operations for working with integers (whole numbers).

### Int.toString
```vibefun
Int.toString: (Int) -> String
```
**Description:** Convert an integer to its string representation.

**Examples:**
```vibefun
Int.toString(42);  // "42"
Int.toString(-100);  // "-100"
Int.toString(0);  // "0"
```

**Note:** This is equivalent to `String.fromInt`.

---

### Int.toFloat
```vibefun
Int.toFloat: (Int) -> Float
```
**Description:** Convert an integer to a floating-point number.

**Examples:**
```vibefun
Int.toFloat(42);  // 42.0
Int.toFloat(-5);  // -5.0
Int.toFloat(0);  // 0.0
```

**Note:** This conversion is always safe and never loses precision for typical integer ranges.

---

### Int.abs
```vibefun
Int.abs: (Int) -> Int
```
**Description:** Return the absolute value of an integer.

**Examples:**
```vibefun
Int.abs(42);  // 42
Int.abs(-42);  // 42
Int.abs(0);  // 0
```

---

### Int.max
```vibefun
Int.max: (Int, Int) -> Int
```
**Description:** Return the larger of two integers.

**Examples:**
```vibefun
Int.max(10, 20);  // 20
Int.max(5, 3);  // 5
Int.max(-1, -10);  // -1
```

---

### Int.min
```vibefun
Int.min: (Int, Int) -> Int
```
**Description:** Return the smaller of two integers.

**Examples:**
```vibefun
Int.min(10, 20);  // 10
Int.min(5, 3);  // 3
Int.min(-1, -10);  // -10
```

---

## Float Module

The `Float` module provides operations for working with floating-point numbers (real numbers).

### Float.toString
```vibefun
Float.toString: (Float) -> String
```
**Description:** Convert a float to its string representation.

**Examples:**
```vibefun
Float.toString(3.14);  // "3.14"
Float.toString(-2.5);  // "-2.5"
Float.toString(1.0);  // "1"
```

**Note:** This is equivalent to `String.fromFloat`.

---

### Float.toInt
```vibefun
Float.toInt: (Float) -> Int
```
**Description:** Convert a float to an integer by truncating toward zero (removing the fractional part).

**Examples:**
```vibefun
Float.toInt(3.14);  // 3
Float.toInt(9.99);  // 9
Float.toInt(-2.7);  // -2
Float.toInt(1.0);  // 1
```

**Note:** This truncates, not rounds. Use `Float.round` for rounding behavior.

---

### Float.round
```vibefun
Float.round: (Float) -> Int
```
**Description:** Round a float to the nearest integer. Halfway cases round away from zero.

**Examples:**
```vibefun
Float.round(3.4);  // 3
Float.round(3.5);  // 4
Float.round(3.6);  // 4
Float.round(-2.5);  // -3
```

---

### Float.floor
```vibefun
Float.floor: (Float) -> Int
```
**Description:** Round a float down to the nearest integer (toward negative infinity).

**Examples:**
```vibefun
Float.floor(3.9);  // 3
Float.floor(3.1);  // 3
Float.floor(-2.1);  // -3 (rounds down)
Float.floor(5.0);  // 5
```

---

### Float.ceil
```vibefun
Float.ceil: (Float) -> Int
```
**Description:** Round a float up to the nearest integer (toward positive infinity).

**Examples:**
```vibefun
Float.ceil(3.1);  // 4
Float.ceil(3.9);  // 4
Float.ceil(-2.9);  // -2 (rounds up)
Float.ceil(5.0);  // 5
```

---

### Float.abs
```vibefun
Float.abs: (Float) -> Float
```
**Description:** Return the absolute value of a float.

**Examples:**
```vibefun
Float.abs(3.14);  // 3.14
Float.abs(-2.5);  // 2.5
Float.abs(0.0);  // 0.0
```

---

### Float.isNaN
```vibefun
Float.isNaN: (Float) -> Bool
```
**Description:** Check if a float is NaN (Not a Number).

**Examples:**
```vibefun
Float.isNaN(0.0 / 0.0);  // true (NaN)
Float.isNaN(3.14);  // false
Float.isNaN(1.0 / 0.0);  // false (infinity, not NaN)
```

**Note:** NaN is produced by undefined operations like `0.0 / 0.0`.

---

### Float.isInfinite
```vibefun
Float.isInfinite: (Float) -> Bool
```
**Description:** Check if a float is positive or negative infinity.

**Examples:**
```vibefun
Float.isInfinite(1.0 / 0.0);  // true (positive infinity)
Float.isInfinite(-1.0 / 0.0);  // true (negative infinity)
Float.isInfinite(3.14);  // false
Float.isInfinite(0.0 / 0.0);  // false (NaN, not infinity)
```

---

### Float.isFinite
```vibefun
Float.isFinite: (Float) -> Bool
```
**Description:** Check if a float is a finite number (not NaN, not infinity).

**Examples:**
```vibefun
Float.isFinite(3.14);  // true
Float.isFinite(0.0);  // true
Float.isFinite(1.0 / 0.0);  // false (infinity)
Float.isFinite(0.0 / 0.0);  // false (NaN)
```

---

## Type Safety and Conversions

Vibefun maintains **strict type separation** between `Int` and `Float`:

```vibefun
let x: Int = 5;
let y: Float = 3.14;

// ❌ Type error: cannot mix Int and Float
let bad = x + y;

// ✅ Explicit conversion required
let good = Int.toFloat(x) + y;  // 8.14

// ✅ Or convert the other way
let also_good = x + Float.toInt(y);  // 8
```

### No Implicit Coercion

Unlike JavaScript, Vibefun never implicitly converts between numeric types:

```vibefun
// All of these are type errors:
let a = 5 + 3.14;  // ❌ Int + Float
let b = 5 * 2.0;  // ❌ Int * Float
let c = 10 / 2.5;  // ❌ Int / Float

// Explicit conversion required:
let a = Int.toFloat(5) + 3.14;  // ✅ Float
let b = 5 * Float.toInt(2.0);  // ✅ Int
let c = Int.toFloat(10) / 2.5;  // ✅ Float
```

---

## Common Patterns

### Safe Division with Check
```vibefun
let safeDivide = (a: Int, b: Int): Option<Int> =>
    if b == 0;
    then None;
    else Some(a / b);
```

### Clamping Values
```vibefun
let clamp = (value: Int, min: Int, max: Int): Int =>
    value;
        |> Int.max(min)
        |> Int.min(max)

clamp(15, 0, 10);  // 10
clamp(-5, 0, 10);  // 0
clamp(5, 0, 10);  // 5
```

### Checking for Valid Numbers
```vibefun
let isValidNumber = (x: Float): Bool =>
    Float.isFinite(x) && !Float.isNaN(x);
```

---

## Arithmetic Operators

Basic arithmetic operators are available for both `Int` and `Float`:

| Operator | Int | Float | Description |
|----------|-----|-------|-------------|
| `+` | ✅ | ✅ | Addition |
| `-` | ✅ | ✅ | Subtraction |
| `*` | ✅ | ✅ | Multiplication |
| `/` | ✅ | ✅ | Division |
| `%` | ✅ | ✅ | Modulo/remainder |

**Note:** Division of integers performs integer division (truncates toward zero).

```vibefun
7 / 2;  // 3 (Int / Int = Int)
7.0 / 2.0;  // 3.5 (Float / Float = Float)
7 % 2;  // 1 (remainder)
```

---

## Comparison Operators

All comparison operators work on both `Int` and `Float`:

| Operator | Description |
|----------|-------------|
| `==` | Equal |
| `!=` | Not equal |
| `<` | Less than |
| `<=` | Less than or equal |
| `>` | Greater than |
| `>=` | Greater than or equal |

**Note:** Comparisons require both operands to have the same type. No mixed comparisons.

```vibefun
5 < 10;  // ✅ true (Int < Int)
3.14 > 2.71;  // ✅ true (Float > Float)
5 < 3.14;  // ❌ Type error (Int < Float not allowed)
```

---

## Performance Notes

- Integer operations are generally faster than floating-point operations
- Floating-point comparisons should account for precision issues
- Use `Int.toFloat` only when necessary; prefer integer operations when possible

---

## See Also

- **[Primitive Types](../03-type-system/primitive-types.md)** - Int and Float type specifications
- **[String Module](./string.md)** - String conversion functions
- **[Math Module](./math.md)** - Advanced mathematical functions
- **[Operators](../02-lexical-structure/operators.md)** - Arithmetic and comparison operators
