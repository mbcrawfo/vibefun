# Appendix

## Appendix

### Contents

- [Syntax Summary](#syntax-summary)
- [Keywords Reference](#keywords-reference)
- [Operators Reference](#operators-reference)
- [File Organization Best Practices](#file-organization-best-practices)
- **[Future Features](./future-features.md)** - Reserved keywords and planned features

---

### Syntax Summary

```vibefun
// Declarations
let name = value
let mut name = ref(value)
let rec name = ...
type Name = ...
export let name = ...
import { name } from "module"
external name: Type = "jsName"

// Expressions
42, 3.14, "hello", true, ()
x, functionName
f(x), f(x, y)
(x) => body
if cond then expr1 else expr2
match expr { | pattern => body }
{ field: value }
[1, 2, 3]
expr1 |> expr2
{ let x = 1; x + 1 }
!refExpr                        // Dereference (read ref value)
refExpr := value                // Assignment (update ref)

// Types
Int, Float, String, Bool, Unit
Ref<T>
(T1, T2) -> T
{ field: Type }
Constructor(Type) | Constructor(Type)
List<T>
T | U

// Patterns
literal
variable
_
Constructor(pattern)
[pattern, pattern, ...]
{ field: pattern }
pattern when guard
```

### Keywords Reference

| Keyword    | Purpose                           |
|------------|-----------------------------------|
| `let`      | Immutable binding                 |
| `mut`      | Mutable reference                 |
| `type`     | Type definition                   |
| `if`       | Conditional expression            |
| `then`     | If-then branch                    |
| `else`     | If-else branch                    |
| `match`    | Pattern matching                  |
| `when`     | Pattern guard                     |
| `rec`      | Recursive function                |
| `and`      | Mutually recursive functions      |
| `import`   | Import from module                |
| `export`   | Export declaration                |
| `external` | External JS declaration           |
| `unsafe`   | Unsafe JS interop block           |
| `from`     | Import source                     |
| `as`       | Import alias                      |
| `ref`      | Create mutable reference          |
| `while`    | While loop construct              |

### Operators Reference

| Operator                  | Precedence | Associativity | Description              |
|---------------------------|-----------|---------------|--------------------------|
| `.`                       | 16        | Left          | Field access             |
| `()`                      | 16        | Left          | Function call            |
| `[]`                      | 16        | Left          | List indexing            |
| `!`                       | 15        | Right         | Dereference/Logical NOT  |
| `-` (unary)               | 15        | Right         | Unary minus              |
| `*`                       | 14        | Left          | Multiplication           |
| `/`                       | 14        | Left          | Division                 |
| `%`                       | 14        | Left          | Modulo                   |
| `+`                       | 13        | Left          | Addition                 |
| `-` (binary)              | 13        | Left          | Subtraction              |
| `&`                       | 12        | Left          | String concatenation     |
| `::`                      | 11        | Right         | List cons                |
| `<`                       | 10        | Left          | Less than                |
| `<=`                      | 10        | Left          | Less than or equal       |
| `>`                       | 10        | Left          | Greater than             |
| `>=`                      | 10        | Left          | Greater than or equal    |
| `==`                      | 9         | Left          | Equal                    |
| `!=`                      | 9         | Left          | Not equal                |
| `&&`                      | 6         | Left          | Logical AND              |
| <code>&vert;&vert;</code> | 5         | Left          | Logical OR               |
| `>>`                      | 4         | Right         | Forward composition      |
| `<<`                      | 4         | Right         | Backward composition     |
| <code>&vert;&gt;</code>   | 3         | Left          | Forward pipe             |
| `:`                       | 2         | Right         | Type annotation          |
| `:=`                      | 1         | Right         | Reference assignment     |
| `=>`                      | 0         | Right         | Lambda arrow (lowest)    |

**Notes:**
- **String concatenation `&` type enforcement**: The `&` operator is strictly for strings. It has type `(String, String) -> String`. Attempting to concatenate non-string values (e.g., `123 & "hello"` or `"Age: " & 42`) is a compile-time type error. Use conversion functions first: `"Age: " & String.fromInt(42)`.
- **Spread operator `...`**: The spread operator is not a standalone infix operator with precedence. It is syntax within list literals `[1, ...rest]` and record updates `{ ...record, field: value }`. It cannot be used in arbitrary expression contexts.
- **Composition vs pipe**: Composition (`>>`, `<<`) operates on functions and returns a new function. Pipe (`|>`) applies a value to a function. Precedence ensures pipe binds very loosely (applied last), while composition binds tighter (composes functions before application).
- **Unary minus disambiguation**: The parser distinguishes unary `-x` from binary `a - b` based on context. Unary minus requires no whitespace: `-x`, not `- x`. Binary minus requires an expression on the left: `a - b`.
- **Lambda arrow `=>`**: Has the lowest precedence (0) to allow the body to extend as far right as possible. This means `(x) => x + 1` parses as `(x) => (x + 1)`, not `((x) => x) + 1`.
- **Type annotation `:`**: Binds very loosely (precedence 2) but tighter than lambda. This allows `let f: (Int) -> Int = (x) => x + 1` to parse correctly as `let f: (Int) -> Int = ((x) => x + 1)`.
- **Pattern guards `when`**: Not an operator; it's pattern-specific syntax that only appears in match arms. Guards are boolean expressions evaluated after pattern matching succeeds.

#### Precedence Examples

These examples show how precedence rules resolve potentially ambiguous expressions:

```vibefun
// List cons (::) binds tighter than arithmetic
x :: y :: z + 1           // Parsed as: x :: y :: (z + 1)

// Pipe (|>) binds very loosely
[1, 2] |> map((x) => x * 2)   // Parsed as: [1, 2] |> (map((x) => (x * 2)))

// Type annotation (:) binds loosely but tighter than lambda
let f: Int -> Int = (x) => x + 1
// Parsed as: let f: (Int -> Int) = ((x) => (x + 1))

// Lambda arrow (=>) extends to the right
(x) => (y) => x + y       // Parsed as: (x) => ((y) => (x + y))

// Composition (>>) vs pipe (|>)
f >> g |> value           // Parsed as: (f >> g) |> value
                          // First compose f and g, then apply to value

// Field access (.) binds tightest
record.field + 1          // Parsed as: (record.field) + 1

// String concat (&) binds looser than arithmetic
"Result: " & String.fromInt(x + y)
// Parsed as: "Result: " & (String.fromInt(x + y))
```

### File Organization Best Practices

```
project/
├── src/
│   ├── main.vf              # Entry point
│   ├── types.vf             # Type definitions
│   ├── utils/
│   │   ├── list.vf
│   │   ├── option.vf
│   │   └── result.vf
│   ├── domain/
│   │   ├── user.vf
│   │   └── order.vf
│   └── api/
│       ├── http.vf
│       └── handlers.vf
├── tests/
│   └── ...
└── vibefun.json             # Project configuration
```

---

**End of Specification**

This specification is a living document and will evolve as the language develops. For the latest updates and implementation details, see the project repository and design documents in `.claude/plans/`.
