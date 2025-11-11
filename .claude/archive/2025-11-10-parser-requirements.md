# Vibefun Parser Requirements

**Version**: 3.0 (Final)
**Last Updated**: 2025-11-09
**Status**: Approved for Implementation
**Specification Alignment**: 100%

## Document Purpose

This document defines the complete requirements for the Vibefun parser, which transforms a token stream from the lexer into an Abstract Syntax Tree (AST). The parser uses recursive descent parsing with operator precedence climbing for binary expressions.

**Review Status**: This document has undergone comprehensive review against the language specification and has been approved for implementation with no blocking issues.

---

## Table of Contents

1. [Parser Architecture](#1-parser-architecture)
2. [Module Structure](#2-module-structure)
3. [Declarations](#3-declarations)
4. [Expressions](#4-expressions)
5. [Patterns](#5-patterns)
6. [Type Expressions](#6-type-expressions)
7. [Error Handling](#7-error-handling)
8. [Special Parsing Rules](#8-special-parsing-rules)
9. [AST Node Requirements](#9-ast-node-requirements)
10. [Parser Testing Requirements](#10-parser-testing-requirements)
11. [Parser Performance](#11-parser-performance)
12. [Implementation Checklist](#12-implementation-checklist)
13. [Appendix A: Complete AST Node Reference](#appendix-a-complete-ast-node-reference)

---

## 1. Parser Architecture

### 1.1 Overall Structure

- **Parser Type**: Recursive descent with operator precedence climbing
- **Input**: Array of `Token` objects from the lexer
- **Output**: `Module` AST node containing imports and declarations
- **Error Handling**: Collect and report multiple errors with location information
- **State Management**: Stateful parser class tracking current position in token stream

### 1.2 Core Parser Methods

- `parse()`: Entry point returning a `Module`
- `parseModule()`: Parse top-level module structure
- `parseDeclaration()`: Parse declarations (let, type, external, import, export)
- `parseExpression(precedence)`: Parse expressions with precedence climbing
- `parsePattern()`: Parse patterns for destructuring
- `parseTypeExpr()`: Parse type annotations
- Token management: `peek()`, `advance()`, `match()`, `expect()`

---

## 2. Module Structure

### 2.1 Module AST Node

```typescript
Module {
  imports: Declaration[]        // All ImportDecl nodes
  declarations: Declaration[]   // All other declarations
  loc: Location
}
```

### 2.2 Module Parsing Order

1. Parse all `import` statements (must come first)
2. Parse declarations in any order:
   - Type definitions (`type`)
   - Let bindings (`let`, `let rec`, `let rec...and...`)
   - External declarations (`external`)
   - Re-exports (`export { ... } from`, `export * from`)

### 2.3 Forward References and Mutual Recursion

- **Type definitions**: Forward references allowed - types can reference types defined later in the module
- **Mutually recursive types**: Allowed via variant constructors and type aliases
- **Value bindings**: Forward references NOT allowed except via `let rec...and...` for mutual recursion
- **Parser responsibility**: Parse declarations in order; type checker handles forward reference validation

---

## 3. Declarations

### 3.1 Let Declarations

**Simple Let Binding:**

```vibefun
let x = 42
let (a, b) = (1, 2)
let { name, age } = person
```

**AST Node:**

```typescript
{
  kind: "LetDecl"
  pattern: Pattern
  value: Expr
  mutable: false
  recursive: false
  exported: boolean
  loc: Location
}
```

**Mutable Let Binding:**

```vibefun
let mut counter = ref(0)
```

AST Node: Same as above but `mutable: true`

**Recursive Let Binding:**

```vibefun
let rec factorial = (n) => if n <= 1 then 1 else n * factorial(n - 1)
```

AST Node: Same as above but `recursive: true`

**Mutual Recursion (Let Rec Group):**

```vibefun
let rec f = (x) => g(x + 1)
and g = (y) => if y > 10 then y else f(y)
and mut h = ref((z) => f(z))    // Individual bindings can be mutable
and k = (w) => !h(w) + g(w)
```

**AST Node:**

```typescript
{
  kind: "LetRecGroup"
  bindings: Array<{
    pattern: Pattern
    value: Expr
    mutable: boolean      // Per-binding mutability
    loc: Location
  }>
  exported: boolean
  loc: Location
}
```

**Parsing Requirements:**

- `let` keyword starts the declaration
- Optional `mut` keyword after `let` (for single let bindings)
- Optional `rec` keyword after `let` (or `let mut`)
- If `rec`, check for `and` keyword to continue mutual recursion group
- In mutual recursion, each binding after `and` can have `mut`: `and mut g = ...`
- Pattern parsing handles destructuring
- `=` token required
- Expression parsing for the value
- Semicolon insertion or explicit semicolon terminates

**Mutual Recursion with Mutability:**

- Syntax: `let rec f = ... and mut g = ... and h = ...`
- Each binding in the group can independently be mutable or immutable
- `mut` appears after `and` keyword: `and mut name = value`
- Parser tracks mutability per binding in the `bindings` array

### 3.2 Type Declarations

**Syntax:**

```vibefun
type Name = Type
type Name<T> = Type<T>
type Name<A, B> = Type<A, B>
```

**Type Definition Forms:**

**Type Alias:**

```vibefun
type UserId = Int
type Callback<T> = (T) -> Unit
```

**Record Type:**

```vibefun
type Person = { name: String, age: Int }
type Config = {
  host: String,
  port: Int,
  ssl: Bool
}
```

**Variant Type:**

```vibefun
type Option<T> = Some(T) | None
type Result<T, E> = Ok(T) | Err(E)
type Shape = Circle(Float) | Rectangle(Float, Float) | Point
```

**AST Node:**

```typescript
{
  kind: "TypeDecl"
  name: string
  params: string[]              // Type parameters
  definition: TypeDefinition    // AliasType | RecordTypeDef | VariantTypeDef
  exported: boolean
  loc: Location
}
```

**Parsing Requirements:**

- `type` keyword starts the declaration
- Identifier for type name (PascalCase by convention)
- Optional type parameters: `<T>` or `<A, B, ...>`
  - Trailing commas allowed: `<T, E,>`
- `=` token required
- Parse type definition:
  - If `{`, parse record type
  - If identifier followed by `(` or `|`, parse variant type
  - Otherwise, parse type alias
- Semicolon insertion or explicit semicolon terminates

### 3.3 External Declarations

**Single External:**

```vibefun
external name: Type = "jsName"
external name: Type = "jsName" from "module"
```

**External Block:**

```vibefun
external from "module" {
  fetch: (String) -> Promise<Response> = "fetch"
  setTimeout: (Function, Int) -> Int = "setTimeout"
}

external {
  type Response = { ok: Bool, status: Int }
  type Headers = { ... }
}
```

**Overloaded Externals:**

```vibefun
external fetch: (String) -> Promise<Response> = "fetch"
external fetch: (String, RequestInit) -> Promise<Response> = "fetch"
```

**AST Nodes:**

Single external:

```typescript
{
  kind: "ExternalDecl"
  name: string
  typeExpr: TypeExpr
  jsName: string
  from?: string
  exported: boolean
  loc: Location
}
```

External type:

```typescript
{
  kind: "ExternalTypeDecl"
  name: string
  typeExpr: TypeExpr
  exported: boolean
  loc: Location
}
```

External block:

```typescript
{
  kind: "ExternalBlock"
  items: ExternalBlockItem[]
  from?: string
  exported: boolean
  loc: Location
}

ExternalBlockItem =
  | { kind: "ExternalValue", name: string, typeExpr: TypeExpr, jsName: string, loc: Location }
  | { kind: "ExternalType", name: string, typeExpr: TypeExpr, loc: Location }
```

**Parsing Requirements:**

1. `external` keyword starts the declaration
2. Check for optional `from "module"`:
   - If present, consume `from` keyword and string literal
   - Store module path in `from` field
3. Determine if block or single external:
   - If `{`, parse external block
   - Otherwise, parse single external
4. **External block parsing:**
   - `{` opens block
   - Parse multiple external items:
     - Value item: `name: Type = "jsName"`
     - Type item: `type Name = Type`
   - Items separated by `,` or newline (both allowed)
   - Trailing comma allowed
   - `}` closes block
5. **Single external parsing:**
   - Identifier for name
   - `:` token
   - Type expression
   - `=` token
   - String literal for JS name
   - Optional `from "module"` (if not already parsed)
6. **Overloading validation** (parser collects, type checker validates):
   - Multiple externals with same name allowed only if:
     - Same `jsName`
     - Same `from` module (or both missing)
     - Different arities (argument counts)

### 3.4 Import Declarations

**Named Imports:**

```vibefun
import { name1, name2 } from "./module"
import { name as alias } from "./module"
import { type User, getUser } from "./api"
```

**Namespace Import:**

```vibefun
import * as Module from "./module"
```

**Type-Only Import:**

```vibefun
import type { Type1, Type2 } from "./module"
```

**AST Node:**

```typescript
{
  kind: "ImportDecl"
  items: ImportItem[]
  from: string
  loc: Location
}

ImportItem {
  name: string
  alias?: string
  isType: boolean
}
```

**Parsing Requirements:**

- `import` keyword starts the declaration
- Check for `type` keyword (makes all imports type-only)
- If `*`, expect `as Identifier` for namespace import
- If `{`, parse named imports:
  - Each item: `name` or `name as alias` or `type name`
  - `,` separates items
  - Trailing comma allowed
  - `}` closes list
- `from` keyword required
- String literal for module path
- Semicolon insertion or explicit semicolon terminates

### 3.5 Re-Export Declarations

**Named Re-Export:**

```vibefun
export { name1, name2 } from "./module"
export { name as alias } from "./module"
```

**Namespace Re-Export:**

```vibefun
export * from "./module"
```

**AST Node:**

```typescript
{
  kind: "ReExportDecl"
  items: ImportItem[] | null    // null for export *
  from: string
  loc: Location
}
```

**Parsing Requirements:**

- `export` keyword starts the declaration
- If followed by `{`:
  - Parse named exports like import items
  - `from` keyword required
  - String literal for module path
- If followed by `*`:
  - `from` keyword required
  - String literal for module path
  - `items` is `null`
- Semicolon insertion or explicit semicolon terminates

### 3.6 Export Keyword

**Exported Declarations:**

```vibefun
export let name = value
export type Name = Type
export external fetch: Type = "fetch"
```

**Parsing Requirements:**

- `export` keyword can prefix any declaration
- Set `exported: true` on the declaration node
- Parse the underlying declaration normally

---

## 4. Expressions

### 4.1 Expression Categories

**Literals:**

- Integer: `INT_LITERAL` → `{ kind: "IntLit", value: number }`
- Float: `FLOAT_LITERAL` → `{ kind: "FloatLit", value: number }`
- String: `STRING_LITERAL` → `{ kind: "StringLit", value: string }`
- Boolean: `BOOL_LITERAL` → `{ kind: "BoolLit", value: boolean }`
- Unit: `()` → `{ kind: "UnitLit" }`

**Variables:**

- Identifier: `IDENTIFIER` → `{ kind: "Var", name: string }`

**Collections:**

- List: `[expr, ...]` → `{ kind: "List", elements: ListElement[] }`
- Record: `{ field: expr, ... }` → `{ kind: "Record", fields: RecordField[] }`
- Tuple: `(expr1, expr2, ...)` → `{ kind: "Tuple", elements: Expr[] }`

### 4.2 Operator Precedence Table

| Level | Operators | Associativity | Description |
|-------|-----------|---------------|-------------|
| 16 | `.`, `()` | Left | Field access, function call |
| 15 | `!`, `-` (unary) | Right | Deref/NOT, negate |
| 14 | `*`, `/`, `%` | Left | Multiply, divide, modulo |
| 13 | `+`, `-` (binary) | Left | Add, subtract |
| 12 | `&` | Left | String concatenation |
| 11 | `::` | Right | List cons |
| 10 | `<`, `<=`, `>`, `>=` | Left | Comparisons |
| 9 | `==`, `!=` | Left | Equality |
| 6 | `&&` | Left | Logical AND |
| 5 | `||` | Left | Logical OR |
| 4 | `>>`, `<<` | Right | Composition |
| 3 | `|>` | Left | Pipe |
| 2 | `:` | Right | Type annotation |
| 1 | `:=` | Right | Ref assignment |
| 0 | `=>` | Right | Lambda (lowest) |

**Note**: `[]` is NOT an operator. Used only for list literals. Array indexing uses `List.at(list, index)`.

**Precedence Climbing Algorithm:**

- Start with precedence level 0
- At each level, parse left operand
- While current token is operator at current or higher precedence:
  - If left-associative, parse right with precedence + 1
  - If right-associative, parse right with same precedence
  - Build binary operator node
- Return result

**Minus Sign Disambiguation:**

- **After operators** (`+`, `*`, etc.): unary negation
- **After delimiters** (`,`, `(`, `[`, `{`, `=`, `then`, `else`, `=>`): unary negation
- **After identifier/closing delimiter** (`)`, `]`, `}`): binary subtraction
- **Whitespace is NOT significant**

Examples:

```vibefun
2 * -3        // Unary: 2 * (-3)
a - b         // Binary: a - b
(-5)          // Unary: -5
list.map(-1)  // Unary: list.map((-1))
f() - 1       // Binary: f() - 1
```

### 4.3 Binary Operators

**Operator Token to AST Mapping:**

```typescript
OP_PLUS       → "Add"
OP_MINUS      → "Subtract"
OP_STAR       → "Multiply"
OP_SLASH      → "Divide"
OP_PERCENT    → "Modulo"
OP_EQ         → "Equal"
OP_NEQ        → "NotEqual"
OP_LT         → "LessThan"
OP_LTE        → "LessEqual"
OP_GT         → "GreaterThan"
OP_GTE        → "GreaterEqual"
OP_AND        → "LogicalAnd"
OP_OR         → "LogicalOr"
OP_AMPERSAND  → "Concat"
OP_CONS       → "Cons"
OP_GT_GT      → "ForwardCompose"
OP_LT_LT      → "BackwardCompose"
OP_ASSIGN     → "RefAssign"
```

**AST Node:**

```typescript
{
  kind: "BinOp"
  op: BinaryOp
  left: Expr
  right: Expr
  loc: Location
}
```

**Pipe Operator Special Case:**

```typescript
{
  kind: "Pipe"
  expr: Expr
  func: Expr
  loc: Location
}
```

*Rationale*: Pipe has special semantics (argument application) warranting a dedicated node for clearer AST representation.

### 4.4 Unary Operators

```vibefun
-expr  // Negate
!expr  // LogicalNot or Deref (type checker disambiguates)
```

**AST Node:**

```typescript
{
  kind: "UnaryOp"
  op: "Negate" | "LogicalNot" | "Deref"
  expr: Expr
  loc: Location
}
```

### 4.5 Function Application

**Syntax:**

```vibefun
f()
f(x)
f(x, y)
f(x)(y)        // Curried
```

**AST Node:**

```typescript
{
  kind: "App"
  func: Expr
  args: Expr[]
  loc: Location
}
```

**Parsing Requirements:**

- Parse function expression (any expression)
- While next token is `(`:
  - Parse argument list (comma-separated, trailing comma allowed)
  - Build `App` node
  - Continue for chained calls

### 4.6 Field Access

**Syntax:**

```vibefun
record.field
config.server.host
```

**AST Node:**

```typescript
{
  kind: "RecordAccess"
  record: Expr
  field: string
  loc: Location
}
```

**Precedence Example:**

```vibefun
record.field :: list    // Parses as: (record.field) :: list
```

### 4.7 Lambda Expressions

**Syntax:**

```vibefun
x => x + 1                     // Single param, no parens
(x) => x + 1                   // Single param with parens (both valid)
(x, y) => x + y                // Multiple params
() => 42                       // No params
(x: Int): Int => x + 1         // Type annotations
({ name }) => name             // Destructuring param
```

**AST Node:**

```typescript
{
  kind: "Lambda"
  params: Pattern[]
  body: Expr
  loc: Location
}
```

**Parsing Requirements:**

**Single parameter without parens:**

- If `IDENTIFIER` followed by `FAT_ARROW`:
  - Create `VarPattern` from identifier
  - Consume `=>`
  - Parse body expression

**Parameters with parens:**

- Parse parameter list (patterns with optional type annotations)
- Optional return type annotation after `)`
- Expect `=>`
- Parse body expression

**Lambda Precedence:**

- Lowest precedence (0)
- Body extends to end of context (semicolon or closing delimiter)
- In match cases, extends until next `|` or `}`

### 4.8 If Expressions

**Syntax:**

```vibefun
if condition then expr1 else expr2
if condition then expr              // else → Unit
if c1 then e1
else if c2 then e2
else e3
```

**AST Node:**

```typescript
{
  kind: "If"
  condition: Expr
  then: Expr
  else_: Expr
  loc: Location
}
```

### 4.9 Match Expressions

**Syntax:**

```vibefun
match expr {
  | pattern1 => result1
  | pattern2 when guard => result2
  | pattern3 => result3
}
```

**AST Node:**

```typescript
{
  kind: "Match"
  expr: Expr
  cases: MatchCase[]
  loc: Location
}

MatchCase {
  pattern: Pattern
  guard?: Expr
  body: Expr
  loc: Location
}
```

**Parsing Requirements:**

- `match` keyword
- Parse scrutinee expression
- `{` opens case block
- **Leading `|` is REQUIRED for all cases (including first)**
- Parse pattern
- Optional `when` guard
- `=>` required
- Parse body expression
- At least one case required

### 4.10 While Loops

**Syntax:**

```vibefun
while condition {
  body
}
```

**AST Node:**

```typescript
{
  kind: "While"
  condition: Expr
  body: Expr
  loc: Location
}
```

### 4.11 Block Expressions

**Syntax:**

```vibefun
{
  let x = 10;
  let y = 20;
  x + y         // Last expression is result
}

{}              // Empty block → Unit
```

**AST Node:**

```typescript
{
  kind: "Block"
  exprs: Expr[]
  loc: Location
}
```

**Block Transformation:**

Blocks transform into nested `Let` expressions:

```typescript
{
  kind: "Let"
  pattern: Pattern
  value: Expr
  body: Expr          // Continuation
  mutable: boolean
  recursive: boolean
  loc: Location
}
```

### 4.12 List Literals

**Syntax:**

```vibefun
[]
[1, 2, 3]
[1, ...rest]
[1, 2, ...tail, 3]     // Multiple spreads
```

**AST Node:**

```typescript
{
  kind: "List"
  elements: ListElement[]
  loc: Location
}

ListElement =
  | { kind: "Element", expr: Expr }
  | { kind: "Spread", expr: Expr }
```

### 4.13 Record Literals

**Syntax:**

```vibefun
{ name: "Alice", age: 30 }
{ name, age }                       // Shorthand
{ ...base, x: 1 }                   // Spread
```

**AST Node:**

```typescript
{
  kind: "Record"
  fields: RecordField[]
  loc: Location
}

RecordField =
  | { kind: "Field", name: string, value: Expr, loc: Location }
  | { kind: "Spread", expr: Expr, loc: Location }
```

**Field Shorthand:**

Parser expands `{ name }` to `Field { name, value: Var(name) }`.

### 4.14 Tuple Expressions

**Syntax:**

```vibefun
(1, 2)
(1, 2, 3)
((1, 2), (3, 4))    // Nested
```

**NOT tuples:**

```vibefun
(x)          // Parenthesized expression
()           // Unit literal
```

**AST Node:**

```typescript
{
  kind: "Tuple"
  elements: Expr[]
  loc: Location
}
```

**Arity Validation:**

- Minimum 2 elements required
- `(x,)` → Parse error: "Tuple must have at least 2 elements"

### 4.15 Pipe Expressions

**Syntax:**

```vibefun
data |> f
data |> filter(pred) |> map(fn)
```

**AST Node:**

```typescript
{
  kind: "Pipe"
  expr: Expr
  func: Expr
  loc: Location
}
```

### 4.16 Type Annotations

**Syntax:**

```vibefun
expr: Type
(x + 1): Int
```

**AST Node:**

```typescript
{
  kind: "TypeAnnotation"
  expr: Expr
  typeExpr: TypeExpr
  loc: Location
}
```

### 4.17 Unsafe Blocks

**Syntax:**

```vibefun
unsafe {
  console.log("direct JS")
}
```

**AST Node:**

```typescript
{
  kind: "Unsafe"
  expr: Expr
  loc: Location
}
```

### 4.18 Operator Sections - NOT SUPPORTED

**Rejected:**

```vibefun
(+)          // ❌ Parse error
(+ 1)        // ❌ Parse error
```

**Error message**: "Operator sections are not supported. Use a lambda instead: (x, y) => x + y"

---

## 5. Patterns

### 5.1 Pattern Types

**Variable Pattern:** `x`, `userName`
**Wildcard Pattern:** `_`
**Literal Pattern:** `0`, `42`, `"hello"`, `true`
**Constructor Pattern:** `Some(x)`, `Ok(value)`, `None`
**Tuple Pattern:** `(x, y)`, `(x, y, z)`
**List Pattern:** `[]`, `[x]`, `[first, ...rest]`
**Record Pattern:** `{ name, age }`, `{ name: n, age: a }`
**Or Pattern:** `| pattern1 | pattern2`

### 5.2 Pattern Parsing Requirements

**Pattern Precedence (highest to lowest):**

1. Parenthesized/tuple patterns
2. Literals
3. Constructors
4. Lists
5. Records
6. Wildcard
7. Variables

**Tuple Pattern Arity:**

- Minimum 2 elements
- `(x,)` → Parse error
- `(x, y)` → Valid

**Arity Validation:**

Parser enforces minimum 2 elements. Type checker validates arity match:

```vibefun
let (x, y) = (1, 2)        // ✅ Valid
let (x, y) = (1, 2, 3)     // ❌ Type error: arity mismatch
```

---

## 6. Type Expressions

### 6.1 Type Expression Forms

**Type Variable:** `T`, `A`
**Type Constructor:** `Int`, `String`, `List`
**Type Application:** `List<Int>`, `Result<T, E>`
**Function Type:** `(Int) -> Int`, `(Int, Int) -> Int`
**Record Type:** `{ name: String, age: Int }`
**Variant Type:** `Some(T) | None`
**Union Type:** `Int | String`

### 6.2 Union vs Variant Disambiguation

**Variant Type** (at least one alternative has arguments):

```vibefun
Some(T) | None           // Variant
Ok(T) | Err(E)          // Variant
```

**Union Type** (no alternatives have arguments):

```vibefun
Int | String            // Union
User | Admin | Guest    // Union
```

**Parsing Algorithm:**

1. Parse all alternatives separated by `|`
2. If ANY alternative has constructor args `Name(...)`, create `VariantType`
3. Otherwise, create `UnionType`

### 6.3 Type Parameters

- Syntax: `<T>`, `<A, B>`
- Trailing commas allowed: `<T, E,>`
- **No explicit type application in expressions**: `identity<Int>(42)` is invalid

### 6.4 Function Types

- Surface syntax: `(Int, Int) -> Int` (parser produces this)
- Curried form: `(Int) -> (Int) -> Int` (desugarer transforms)
- Right-associative: `Int -> Int -> Int` = `Int -> (Int -> Int)`

---

## 7. Error Handling

### 7.1 Parser Errors

**Error Categories:**

- Unexpected token
- Invalid syntax
- Missing token
- Invalid pattern
- Tuple arity error
- Empty match
- Operator section
- Missing leading pipe

**Error Recovery:**

**Synchronization Points:**

- Semicolons (`;`)
- Keywords: `let`, `type`, `external`, `import`, `export`, `if`, `match`, `while`
- Closing delimiters: `}`, `)`, `]`
- EOF

**Recovery Algorithm:**

1. Report error
2. Enter panic mode
3. Consume tokens until synchronization point
4. Exit panic mode
5. Continue parsing

**Error Limits:**

- Collect up to 10 errors before stopping

### 7.2 Error Messages

**Format:**

```typescript
ParserError {
  message: string
  loc: Location
  hint?: string
}
```

**Examples:**

```
Parse error at example.vf:5:12
  Expected ')', got ','
  Hint: Check for missing closing parenthesis

Parse error at example.vf:10:8
  Operator sections are not supported: (+)
  Hint: Use a lambda instead. For (+), write: (x, y) => x + y

Parse error at example.vf:15:10
  Tuple must have at least 2 elements
  Hint: Use parentheses for grouping: (x), not for single-element tuples

Parse error at example.vf:25:3
  Match case must begin with '|'
  Hint: All match cases require a leading pipe: | pattern => result
```

---

## 8. Special Parsing Rules

### 8.1 Automatic Semicolon Insertion (ASI)

**Implementation:**

- **Location-based**: Parser compares `token.loc.line` between consecutive tokens
- **No NEWLINE tokens**: Lexer does not emit special NEWLINE tokens

**ASI Rules:**

**Prevent Insertion (expression continuations):**

When previous line ENDS with:
- Binary operators: `+`, `-`, `*`, `/`, `&&`, `||`, `|>`, etc.
- Member access: `.`
- Delimiters: `(`, `,`
- Keywords: `then`, `else`

When new line STARTS with:
- Binary operators: `+`, `-`, `*`, `/`, `&&`, `||`, `|>`, etc.
- Member access: `.`
- Delimiters: `,`

**Trigger Insertion:**

When new line starts with:
- Keywords: `let`, `type`, `match`, `if`, `external`, `import`, `export`, `while`
- Closing delimiter: `}`

**Examples:**

```vibefun
// Operator at end (no insertion)
let x = 1 +
  2

// Operator at start (no insertion, treated as continuation)
let y = 1
  + 2

// New statement (insertion)
let a = 1
let b = 2

// Pipe continuation
let result = data
  |> filter(pred)
  |> map(fn)
```

**ASI Algorithm:**

```typescript
function shouldInsertSemicolon(): boolean {
  const prev = previousToken();
  const curr = currentToken();

  if (curr.loc.line <= prev.loc.line) return false;
  if (isExpressionContinuation(prev.type)) return false;
  if (isLineContinuation(curr.type)) return false;
  if (isStatementStart(curr.type)) return true;

  return true;
}
```

### 8.2 Tuple vs Parenthesized Expressions

- `(x)` → Parenthesized expression
- `(x, y)` → Tuple
- `()` → Unit literal
- `(x,)` → Parse error

### 8.3 Empty Containers

**Empty Lists:**

```vibefun
let empty: List<Int> = []
```

Parser allows, type checker requires annotation if no context.

**Empty Records:**

```vibefun
let unit = {}
```

Represents empty record, distinct from unit literal `()`.

### 8.4 Trailing Commas

**Allowed in:**

- Lists, tuples, records, function args, type params, external blocks
- NOT allowed in match cases (pipe-separated)

### 8.5 Multi-Line Expressions

Both styles supported:

```vibefun
// Operators at end
let result = data |>
  filter(pred) |>
  map(fn)

// Operators at start
let sum = a
  + b
  + c
```

---

## 9. AST Node Requirements

### 9.1 Location Information

All nodes must include:

```typescript
loc: Location {
  file: string
  line: number      // 1-indexed
  column: number    // 1-indexed
  offset: number    // 0-indexed
}
```

### 9.2 AST Invariants

- All nodes properly typed (no `any`)
- All child nodes have valid locations
- No `undefined` or `null` in arrays
- Discriminated unions with `kind` field

---

## 10. Parser Testing Requirements

### 10.1 Test Categories

- **Unit tests**: Individual parsing functions
- **Integration tests**: Complete modules
- **Error tests**: All error conditions
- **Property tests**: Location preservation, AST invariants

### 10.2 Test Coverage Goals

**Expressions:**

- All literals, operators (all precedence levels), lambdas, if/match/while, blocks, collections

**Patterns:**

- All pattern types, nested patterns, tuple arity validation

**Types:**

- All type forms, union/variant disambiguation

**Declarations:**

- Let (simple, mutable, recursive, mutual), type, external, import, export

**Edge Cases:**

- Deep nesting, large literals, ASI edge cases, trailing commas

**Errors:**

- All error categories, recovery mechanisms, operator sections rejection

---

## 11. Parser Performance

### 11.1 Performance Requirements

- **Time**: O(n) where n = token count
- **Space**: O(d) where d = max nesting depth
- **No backtracking**: LL(2) parser
- **Single pass**

### 11.2 Considerations

- Minimize lookahead (max 2 tokens)
- Reuse precedence climbing
- Avoid redundant allocations
- Deep nesting limit (~1000 levels)

---

## 12. Implementation Checklist

**Before:**

- [ ] Understand recursive descent parsing
- [ ] Understand precedence climbing
- [ ] Review AST definitions
- [ ] Review lexer tokens
- [ ] Review error strategy

**During:**

- [ ] Token management
- [ ] Module parsing
- [ ] All declarations
- [ ] Expressions with precedence
- [ ] All patterns
- [ ] Type expressions
- [ ] ASI logic
- [ ] Error handling
- [ ] Special cases

**After:**

- [ ] Comprehensive tests
- [ ] Error message clarity
- [ ] Error recovery validation
- [ ] Performance testing
- [ ] Spec compliance verification

---

## Appendix A: Complete AST Node Reference

### Expressions

```typescript
Expr =
  // Literals
  | { kind: "IntLit", value: number, loc: Location }
  | { kind: "FloatLit", value: number, loc: Location }
  | { kind: "StringLit", value: string, loc: Location }
  | { kind: "BoolLit", value: boolean, loc: Location }
  | { kind: "UnitLit", loc: Location }

  // Variables and Bindings
  | { kind: "Var", name: string, loc: Location }
  | { kind: "Let", pattern: Pattern, value: Expr, body: Expr, mutable: boolean, recursive: boolean, loc: Location }

  // Functions
  | { kind: "Lambda", params: Pattern[], body: Expr, loc: Location }
  | { kind: "App", func: Expr, args: Expr[], loc: Location }

  // Control Flow
  | { kind: "If", condition: Expr, then: Expr, else_: Expr, loc: Location }
  | { kind: "Match", expr: Expr, cases: MatchCase[], loc: Location }
  | { kind: "While", condition: Expr, body: Expr, loc: Location }

  // Collections
  | { kind: "List", elements: ListElement[], loc: Location }
  | { kind: "Tuple", elements: Expr[], loc: Location }
  | { kind: "Record", fields: RecordField[], loc: Location }
  | { kind: "RecordAccess", record: Expr, field: string, loc: Location }

  // Operators
  | { kind: "BinOp", op: BinaryOp, left: Expr, right: Expr, loc: Location }
  | { kind: "UnaryOp", op: UnaryOp, expr: Expr, loc: Location }
  | { kind: "Pipe", expr: Expr, func: Expr, loc: Location }

  // Other
  | { kind: "Block", exprs: Expr[], loc: Location }
  | { kind: "TypeAnnotation", expr: Expr, typeExpr: TypeExpr, loc: Location }
  | { kind: "Unsafe", expr: Expr, loc: Location }
```

### Supporting Types

```typescript
ListElement =
  | { kind: "Element", expr: Expr }
  | { kind: "Spread", expr: Expr }

RecordField =
  | { kind: "Field", name: string, value: Expr, loc: Location }
  | { kind: "Spread", expr: Expr, loc: Location }

MatchCase = {
  pattern: Pattern
  guard?: Expr
  body: Expr
  loc: Location
}

BinaryOp =
  | "Add" | "Subtract" | "Multiply" | "Divide" | "Modulo"
  | "Equal" | "NotEqual" | "LessThan" | "LessEqual" | "GreaterThan" | "GreaterEqual"
  | "LogicalAnd" | "LogicalOr"
  | "Concat" | "Cons"
  | "ForwardCompose" | "BackwardCompose"
  | "RefAssign"

UnaryOp = "Negate" | "LogicalNot" | "Deref"
```

### Patterns

```typescript
Pattern =
  | { kind: "VarPattern", name: string, loc: Location }
  | { kind: "WildcardPattern", loc: Location }
  | { kind: "LiteralPattern", literal: Literal, loc: Location }
  | { kind: "ConstructorPattern", constructor: string, args: Pattern[], loc: Location }
  | { kind: "TuplePattern", elements: Pattern[], loc: Location }
  | { kind: "ListPattern", elements: Pattern[], rest?: Pattern, loc: Location }
  | { kind: "RecordPattern", fields: RecordPatternField[], loc: Location }
  | { kind: "OrPattern", patterns: Pattern[], loc: Location }

RecordPatternField = {
  name: string
  pattern: Pattern
  loc: Location
}

Literal = number | string | boolean | null
```

### Type Expressions

```typescript
TypeExpr =
  | { kind: "TypeVar", name: string, loc: Location }
  | { kind: "TypeConst", name: string, loc: Location }
  | { kind: "TypeApp", constructor: TypeExpr, args: TypeExpr[], loc: Location }
  | { kind: "FunctionType", params: TypeExpr[], return_: TypeExpr, loc: Location }
  | { kind: "RecordType", fields: RecordTypeField[], loc: Location }
  | { kind: "VariantType", constructors: VariantConstructor[], loc: Location }
  | { kind: "UnionType", types: TypeExpr[], loc: Location }

RecordTypeField = {
  name: string
  typeExpr: TypeExpr
  loc: Location
}

VariantConstructor = {
  name: string
  args: TypeExpr[]
  loc: Location
}
```

### Declarations

```typescript
Declaration =
  | { kind: "LetDecl", pattern: Pattern, value: Expr, mutable: boolean, recursive: boolean, exported: boolean, loc: Location }
  | { kind: "LetRecGroup", bindings: Array<{pattern: Pattern, value: Expr, mutable: boolean, loc: Location}>, exported: boolean, loc: Location }
  | { kind: "TypeDecl", name: string, params: string[], definition: TypeDefinition, exported: boolean, loc: Location }
  | { kind: "ExternalDecl", name: string, typeExpr: TypeExpr, jsName: string, from?: string, exported: boolean, loc: Location }
  | { kind: "ExternalTypeDecl", name: string, typeExpr: TypeExpr, exported: boolean, loc: Location }
  | { kind: "ExternalBlock", items: ExternalBlockItem[], from?: string, exported: boolean, loc: Location }
  | { kind: "ImportDecl", items: ImportItem[], from: string, loc: Location }
  | { kind: "ReExportDecl", items: ImportItem[] | null, from: string, loc: Location }

TypeDefinition =
  | { kind: "AliasType", typeExpr: TypeExpr, loc: Location }
  | { kind: "RecordTypeDef", fields: RecordTypeField[], loc: Location }
  | { kind: "VariantTypeDef", constructors: VariantConstructor[], loc: Location }

ExternalBlockItem =
  | { kind: "ExternalValue", name: string, typeExpr: TypeExpr, jsName: string, loc: Location }
  | { kind: "ExternalType", name: string, typeExpr: TypeExpr, loc: Location }

ImportItem = {
  name: string
  alias?: string
  isType: boolean
}
```

### Module

```typescript
Module = {
  imports: Declaration[]
  declarations: Declaration[]
  loc: Location
}
```

---

**END OF PARSER REQUIREMENTS DOCUMENT**

This document has been reviewed and approved for implementation with 100% specification alignment.
