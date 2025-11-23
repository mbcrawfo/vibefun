# Basic Expressions

This document covers the fundamental building blocks of Vibefun expressions: literals, variables, function calls, and operators.

## Literal Expressions

Literal expressions represent constant values directly in source code.

```vibefun
42;  // Int literal
3.14;  // Float literal
"hello";  // String literal
true        // Bool literal (also: false)
();  // Unit literal
```

See [Lexical Structure - Tokens](../02-lexical-structure/tokens.md) for complete literal syntax.

---

## Variable References

Variables are referenced by their identifier name.

```vibefun
let x = 42;
let y = x;  // Variable reference - reads value of x
```

### Scoping
- Variables must be in scope (defined before use)
- Variables are immutable by default
- Variables can shadow outer scope variables

---

## Function Calls

Function calls apply arguments to functions.

### Basic Call Syntax

```vibefun
add(1, 2);  // Two arguments
noArgs();  // Zero arguments (call with empty parens)
map([1, 2, 3], double) // Higher-order function;
```

### Partial Application

Functions can be partially applied (currying).

```vibefun
let add = (x, y) => x + y;
let add5 = add(5);  // Partial application - returns function
let result = add5(3);  // Apply remaining argument - returns 8
```

See [Evaluation Order](./evaluation-order.md) for argument evaluation guarantees.

---

## Operators

Vibefun provides a rich set of operators for various operations.

### Arithmetic Operators

Arithmetic operators work on `Int` and `Float` types **without automatic coercion**.

**Binary operators:**
```vibefun
5 + 3      // Addition: 8
5 - 3      // Subtraction: 2
5 * 3      // Multiplication: 15
5 / 3      // Division: 1 (Int division truncates)
5.0 / 2.0  // Division: 2.5 (Float division)
5 % 3      // Modulo (remainder): 2
```

**Unary operator:**
```vibefun
-5         // Negation: -5
-x         // Negate variable value
```

#### Type Requirements
- **Int operations**: Both operands must be `Int`, result is `Int`
- **Float operations**: Both operands must be `Float`, result is `Float`
- **No mixed types**: `5 + 2.0` is a **type error** (use explicit conversion)

**Type conversions:**
```vibefun
Int.toFloat(5) + 2.0        // ✅ OK: 7.0
5 + Float.toInt(2.0)        // ✅ OK: 7
```

#### Division Semantics

**Integer division:**
- **Truncation**: Integer division truncates toward zero
- **Examples**: `7 / 2 = 3`, `-7 / 2 = -3`

**Division by zero:**
- **Runtime behavior**: Division by zero **panics at runtime**
- **Compile-time**: Literal division by zero (e.g., `5 / 0`) may be detected at compile time and rejected
- **Example**: `let x = 10 / 0` → runtime panic: "Division by zero"

**Float division:**
- **IEEE 754 semantics**: Float division follows IEEE 754 standard
- **Division by zero**: `5.0 / 0.0 = Infinity`, `-5.0 / 0.0 = -Infinity`
- **Zero by zero**: `0.0 / 0.0 = NaN`

#### Overflow and Underflow

**Integer overflow:**
- **Safe range**: Integers are guaranteed correct in range -(2^53 - 1) to 2^53 - 1
- **Overflow behavior**: Operations exceeding safe range have **implementation-defined behavior**
  - May wrap around
  - May produce incorrect results
  - May panic (implementation choice)
- **Recommendation**: Use `Int.safeAdd`, `Int.safeMul` for checked arithmetic

**Float overflow:**
- **IEEE 754**: Follows standard IEEE 754 overflow semantics
- **Overflow**: Results become `Infinity` or `-Infinity`
- **Underflow**: Results become `0.0`

---

### Comparison Operators

Comparison operators return `Bool` values.

```vibefun
5 == 5;  // Equal: true
5 != 3;  // Not equal: true
5 < 10     // Less than: true
5 <= 5;  // Less than or equal: true
10 > 5     // Greater than: true
10 >= 10;  // Greater than or equal: true
```

#### Type Requirements
- **Same type**: Both operands must have the same type
- **Comparable types**: Only types supporting equality/ordering can be compared
- **No automatic coercion**: `5 == 5.0` is a **type error**

**Equality:**
- **Primitive types**: Compared by value (`Int`, `Float`, `String`, `Bool`)
- **Records**: Structural equality (field-by-field comparison)
- **Variants**: Constructor and value equality
- **References**: Identity equality (same reference, not value)
- **Functions**: **Not comparable** (compile-time error)

**Ordering:**
- **Primitive types**: `Int`, `Float`, `String`, `Bool` support ordering
- **Tuples**: Lexicographic ordering (left-to-right)
- **Lists**: Lexicographic ordering (element-by-element)
- **Records**: **Not orderable** (no `<`, `>`, etc.)
- **Variants**: **Not orderable** by default

#### Chained Comparisons

**Non-associative:** Comparison operators **do not chain** as they do in mathematics.

```vibefun
// Mathematical notation: 1 < x < 10
// Vibefun equivalent:
1 < x && x < 10    // ✅ Correct: use logical AND

// WARNING: Don't chain comparisons
a < b < c          // ⚠️  Parses as: (a < b) < c
                   // This is a TYPE ERROR because (a < b) is Bool, not comparable to c
```

**Rationale:** Chained comparisons are parsed as `((a < b) < c)` which attempts to compare a `Bool` to a value, causing a type error. Use explicit `&&` for range checks.

---

### Logical Operators

Logical operators work on `Bool` values and support **short-circuit evaluation**.

```vibefun
true && false      // Logical AND: false
true || false      // Logical OR: true
!true              // Logical NOT: false
```

#### Short-Circuit Semantics

**AND operator (`&&`):**
- Evaluates left operand first
- If left is `false`, returns `false` **without evaluating right operand**
- If left is `true`, evaluates and returns right operand

**OR operator (`||`):**
- Evaluates left operand first
- If left is `true`, returns `true` **without evaluating right operand**
- If left is `false`, evaluates and returns right operand

**Example (safe division check):**
```vibefun
let safeDivide = (n, d) =>
  d != 0 && (n / d > 100);  // Division only happens if d != 0
```

See [Evaluation Order - Logical Operators](./evaluation-order.md#logical-operators-short-circuit) for complete details.

#### NOT Operator (`!`)

The `!` operator has **two meanings** based on type:

1. **Logical NOT**: When applied to `Bool` → returns negated boolean
2. **Dereference**: When applied to `Ref<T>` → reads value from reference

**Type-based disambiguation:**
```vibefun
!true              // Logical NOT (Bool -> Bool): false
let mut x = 5;
!x                 // Dereference (Ref<Int> -> Int): 5
```

The compiler automatically determines which operation based on the operand type.

---

### String Concatenation

String concatenation uses the `&` operator (ampersand).

```vibefun
"hello" & " " & "world";  // "hello world"
```

#### Type Requirements

**Strict typing:** Both operands must be `String` - **no automatic coercion**.

```vibefun
"Age: " & String.fromInt(42)      // ✅ OK: "Age: 42"
"Age: " & 42                       // ❌ Type error: Int is not String
```

**Conversion functions:**
- `String.fromInt(n)` - Convert Int to String
- `String.fromFloat(f)` - Convert Float to String
- `String.fromBool(b)` - Convert Bool to String

See [Operators - String Operators](../02-lexical-structure/operators.md#string-operators) for complete details.

---

### Other Operators

#### Field Access Operator (`.`)

Accesses fields of record values using dot notation.

```vibefun
let person = { name: "Alice", age: 30 };
person.name;  // "Alice"
person.age;  // 30

// Chained field access
let config = { server: { host: "localhost" } };
config.server.host;  // "localhost"
```

**Keywords as field names:**

Field access accepts **language keywords** as field names, enabling JavaScript interoperability:

```vibefun
let node = { type: "BinaryOp", import: "./module" };
node.type;  // "BinaryOp"
node.import;  // "./module"

// Chained access with keywords
let ast = { outer: { type: "Program" } };
ast.outer.type;  // "Program"
```

All 20 Vibefun keywords can be used as field names: `type`, `match`, `import`, `export`, etc.

**Precedence:**

Field access has the **highest precedence** (16), binding tighter than all other operators:

```vibefun
person.name & " Smith"  // Parses as: (person.name) & " Smith"
record.value + 10       // Parses as: (record.value) + 10
```

See [Data Literals - Field Access](./data-literals.md#field-access) and [Data Literals - Keywords as Field Names](./data-literals.md#keywords-as-field-names) for complete details.

#### Pipe Operator (`|>`)

Applies a value to a function (left-to-right).

```vibefun
x |> f                  // Equivalent to: f(x)
x |> f |> g             // Equivalent to: g(f(x))
[1, 2, 3] |> map(double) |> filter(isEven);
```

See [Functions and Composition](./functions-composition.md) for details.

#### Composition Operators

```vibefun
f >> g;  // Forward composition: (f >> g)(x) = g(f(x))
f << g;  // Backward composition: (f << g)(x) = f(g(x))
```

#### List Cons (`::`)

Prepends element to a list.

```vibefun
1 :: [2, 3]      // [1, 2, 3]
x :: xs          // Prepend x to list xs
```

See [Data Literals - Lists](./data-literals.md) for details.

#### Spread Operator (`...`)

Spreads record or list contents.

```vibefun
{ ...record, x: 10 }     // Record spread
[1, 2, ...rest];  // List spread (pattern matching)
```

See [Data Literals](./data-literals.md) for details.

---

## Operator Precedence and Associativity

Operators are evaluated according to precedence and associativity rules. See the [**Operators Reference**](../13-appendix.md#operators-reference) in the Appendix for the complete precedence table.

### Key Precedence Rules

**Higher precedence values bind more tightly**: Field access `.` (precedence 16) binds tightest, while lambda arrow `=>` (precedence 0) binds loosest.

**Associativity examples:**

Left-associative:
```vibefun
a + b + c      // Parses as: (a + b) + c
a * b / c      // Parses as: (a * b) / c
```

Right-associative:
```vibefun
a :: b :: c    // Parses as: a :: (b :: c)
f >> g >> h    // Parses as: f >> (g >> h)
```

### Parentheses for Grouping

Use parentheses to override precedence or clarify intent:

```vibefun
(a + b) * c;  // Force addition before multiplication
a < b && c < d;  // Explicit grouping (though not necessary)
```

---

## Summary

- **Literals**: Constant values in source code
- **Variables**: Named value references (immutable by default)
- **Function calls**: Application with argument evaluation left-to-right
- **Operators**:
  - Arithmetic: `+`, `-`, `*`, `/`, `%` (no auto-coercion)
  - Comparison: `==`, `!=`, `<`, `>`, `<=`, `>=` (same-type only)
  - Logical: `&&`, `||`, `!` (short-circuit)
  - String: `&` (strict typing)
  - Special: `|>`, `>>`, `<<`, `::`, `...`
- **Precedence**: Use parentheses when in doubt
- **Type safety**: No automatic coercion - explicit conversion required

See also:
- [Evaluation Order](./evaluation-order.md) - Evaluation order guarantees
- [Lexical Structure - Operators](../02-lexical-structure/operators.md) - Operator syntax
- [Appendix](../13-appendix.md) - Complete operator reference

