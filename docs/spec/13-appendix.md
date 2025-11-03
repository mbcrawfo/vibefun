# Appendix

## Appendix

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

### Operators Reference

| Operator                  | Precedence | Associativity | Description              |
|---------------------------|-----------|---------------|--------------------------|
| `.`                       | 15        | Left          | Field access             |
| `()`                      | 15        | Left          | Function call            |
| `[]`                      | 15        | Left          | List indexing            |
| `!`                       | 14        | Right         | Dereference/Logical NOT  |
| `-` (unary)               | 14        | Right         | Unary minus              |
| `*`                       | 13        | Left          | Multiplication           |
| `/`                       | 13        | Left          | Division                 |
| `%`                       | 13        | Left          | Modulo                   |
| `+`                       | 12        | Left          | Addition                 |
| `-` (binary)              | 12        | Left          | Subtraction              |
| `&`                       | 11        | Left          | String concatenation     |
| `::`                      | 10        | Right         | List cons                |
| `<`                       | 9         | Left          | Less than                |
| `<=`                      | 9         | Left          | Less than or equal       |
| `>`                       | 9         | Left          | Greater than             |
| `>=`                      | 9         | Left          | Greater than or equal    |
| `==`                      | 8         | Left          | Equal                    |
| `!=`                      | 8         | Left          | Not equal                |
| `&&`                      | 5         | Left          | Logical AND              |
| <code>&vert;&vert;</code> | 4         | Left          | Logical OR               |
| `>>`                      | 3         | Right         | Forward composition      |
| `<<`                      | 3         | Right         | Backward composition     |
| <code>&vert;&gt;</code>   | 2         | Left          | Forward pipe             |
| `:=`                      | 1         | Right         | Reference assignment     |

**Notes:**
- **String concatenation `&` type enforcement**: The `&` operator is strictly for strings. It has type `(String, String) -> String`. Attempting to concatenate non-string values (e.g., `123 & "hello"` or `"Age: " & 42`) is a compile-time type error. Use conversion functions first: `"Age: " & String.fromInt(42)`.
- **Spread operator `...`**: The spread operator is not a standalone infix operator with precedence. It is syntax within list literals `[1, ...rest]` and record updates `{ ...record, field: value }`. It cannot be used in arbitrary expression contexts.
- **Composition vs pipe**: Composition (`>>`, `<<`) operates on functions and returns a new function. Pipe (`|>`) applies a value to a function. Precedence ensures pipe binds very loosely (applied last), while composition binds tighter (composes functions before application).
- **Unary minus disambiguation**: The parser distinguishes unary `-x` from binary `a - b` based on context. Unary minus requires no whitespace: `-x`, not `- x`. Binary minus requires an expression on the left: `a - b`.

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
