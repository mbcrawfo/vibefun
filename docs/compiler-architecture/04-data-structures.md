# Data Structures

This document describes the key data structures that flow through the compilation pipeline.

## Overview

The compiler uses well-defined data structures to represent:
- **Tokens** - Lexical elements from source
- **Surface AST** - Full syntax tree with all language features
- **Core AST** - Minimal desugared syntax tree
- **Types** - Type representations for type checking
- **Locations** - Source position information
- **Errors** - Error information with context

All data structures are **immutable** - transformations create new structures rather than modifying existing ones.

## Token Representation

**File:** `packages/core/src/types/token.ts`

### Token Structure

```typescript
interface Token {
  type: TokenType;
  value?: string | number;
  loc: Location;
}
```

### Token Types

Tokens are categorized into:

**1. Keywords** (50+ reserved words)
- `let`, `type`, `match`, `if`, `then`, `else`
- `import`, `export`, `external`
- `true`, `false`, `module`

**2. Identifiers**
- Variable names, type names, module names
- Start with letter or underscore
- Can contain letters, digits, underscores

**3. Literals**
- `INT_LITERAL` - Integer values (42, 1_000)
- `FLOAT_LITERAL` - Float values (3.14, 0.5)
- `STRING_LITERAL` - String values ("hello")
- `true`, `false` - Boolean keywords

**4. Operators** (14 precedence levels)
- Arithmetic: `+`, `-`, `*`, `/`, `%`, `**`
- Comparison: `==`, `!=`, `<`, `<=`, `>`, `>=`
- Logical: `&&`, `||`, `!`
- Function: `->`, `=>`, `|>`, `>>`, `<<`
- List: `::`
- Record: `.`, `...`

**5. Delimiters**
- Parentheses: `(`, `)`
- Braces: `{`, `}`
- Brackets: `[`, `]`

**6. Punctuation**
- `,` - Separator
- `:` - Type annotation
- `;` - Statement separator
- `=` - Assignment
- `|` - Pattern separator

**7. Special**
- `EOF` - End of file (always last token)

### Example Token Stream

**Source:**
```vibefun
let x = 42
```

**Tokens:**
```typescript
[
  { type: 'LET', loc: { file: 'ex.vf', line: 1, column: 1, offset: 0 } },
  { type: 'IDENTIFIER', value: 'x', loc: { file: 'ex.vf', line: 1, column: 5, offset: 4 } },
  { type: 'EQUALS', loc: { file: 'ex.vf', line: 1, column: 7, offset: 6 } },
  { type: 'INT_LITERAL', value: 42, loc: { file: 'ex.vf', line: 1, column: 9, offset: 8 } },
  { type: 'EOF', loc: { file: 'ex.vf', line: 1, column: 11, offset: 10 } }
]
```

## Surface AST

**File:** `packages/core/src/types/ast.ts`

### Purpose

Represents the **full syntax** of the Vibefun language as parsed, including all syntactic sugar.

### Node Categories

**1. Expressions**
- Literals (integers, floats, strings, booleans)
- Variables
- Function application
- Lambda expressions (can have multiple parameters)
- Binary operations
- Unary operations
- If-then-else
- Match expressions
- Record literals and access
- List literals
- Block expressions
- Pipe expressions (`x |> f |> g`)
- Composition expressions (`f >> g`, `f << g`)

**2. Patterns**
- Variable patterns
- Wildcard patterns (`_`)
- Literal patterns
- Constructor patterns
- List patterns (with spread)
- Record patterns
- Or-patterns (`Red | Blue`)

**3. Declarations**
- Let bindings (`let x = 42`)
- Type definitions (`type Option<T> = ...`)
- External declarations (FFI)
- Export declarations
- Import declarations

**4. Types**
- Named types (`Int`, `String`, `List<T>`)
- Function types (`Int -> String`)
- Record types (`{ x: Int, y: Int }`)
- Variant types (defined in type declarations)
- Type variables (`T`, `U`)

**5. Modules**
- Module definition
- List of declarations

### Example Nodes

**Lambda Expression (multi-param):**
```typescript
{
  type: 'Lambda',
  params: ['x', 'y'],
  body: {
    type: 'BinaryOp',
    op: '+',
    left: { type: 'Variable', name: 'x', loc },
    right: { type: 'Variable', name: 'y', loc },
    loc
  },
  loc
}
```

**Pipe Expression:**
```typescript
{
  type: 'Pipe',
  left: { type: 'Variable', name: 'x', loc },
  right: [
    { type: 'Variable', name: 'f', loc },
    { type: 'Variable', name: 'g', loc }
  ],
  loc
}
// Represents: x |> f |> g
```

**List Literal:**
```typescript
{
  type: 'ListLiteral',
  elements: [
    { type: 'IntLiteral', value: 1, loc },
    { type: 'IntLiteral', value: 2, loc },
    { type: 'IntLiteral', value: 3, loc }
  ],
  loc
}
// Represents: [1, 2, 3]
```

### Characteristics

- **Rich syntax** - All language features represented
- **Convenient for parsing** - Natural AST from parser
- **Location on every node** - Error reporting support
- **Immutable** - Never modified after creation

## Core AST

**File:** `packages/core/src/types/core-ast.ts`

### Purpose

Represents the **minimal core language** after desugaring, with all syntactic sugar removed.

### Simplified Node Set

**Core Expressions:**
- Variables
- Literals (int, float, string, bool)
- Lambda (single parameter only)
- Application
- Let binding
- Match expression
- Record literal
- Record access
- Variant construction

**Key Differences from Surface AST:**

| Surface AST | Core AST |
|-------------|----------|
| Multi-param lambdas | Single-param curried lambdas |
| Pipe operator | Function application |
| Composition operators | Lambda wrappers |
| List literals `[1,2,3]` | Cons chains `Cons(1, Cons(2, Cons(3, Nil)))` |
| List cons operator `::` | Variant constructor `Cons` |
| If-then-else | Match on boolean |
| Or-patterns | Multiple match cases |
| Block expressions | Nested let bindings |

### Example Transformations

**Multi-param lambda → Curried:**
```typescript
// Surface: (x, y) => x + y
{
  type: 'Lambda',
  params: ['x', 'y'],
  body: /* x + y */,
  loc
}

// Core: x => y => x + y
{
  type: 'CoreLambda',
  param: 'x',
  body: {
    type: 'CoreLambda',
    param: 'y',
    body: /* x + y */,
    loc
  },
  loc
}
```

**Pipe → Application:**
```typescript
// Surface: x |> f |> g
{
  type: 'Pipe',
  left: { type: 'Variable', name: 'x', loc },
  right: [
    { type: 'Variable', name: 'f', loc },
    { type: 'Variable', name: 'g', loc }
  ],
  loc
}

// Core: g(f(x))
{
  type: 'CoreApp',
  func: { type: 'CoreVar', name: 'g', loc },
  arg: {
    type: 'CoreApp',
    func: { type: 'CoreVar', name: 'f', loc },
    arg: { type: 'CoreVar', name: 'x', loc },
    loc
  },
  loc
}
```

**List literal → Cons chain:**
```typescript
// Surface: [1, 2, 3]
{
  type: 'ListLiteral',
  elements: [
    { type: 'IntLiteral', value: 1, loc },
    { type: 'IntLiteral', value: 2, loc },
    { type: 'IntLiteral', value: 3, loc }
  ],
  loc
}

// Core: Cons(1, Cons(2, Cons(3, Nil)))
{
  type: 'CoreVariant',
  tag: 'Cons',
  value: {
    type: 'CoreTuple',
    elements: [
      { type: 'CoreInt', value: 1, loc },
      {
        type: 'CoreVariant',
        tag: 'Cons',
        value: {
          type: 'CoreTuple',
          elements: [
            { type: 'CoreInt', value: 2, loc },
            {
              type: 'CoreVariant',
              tag: 'Cons',
              value: {
                type: 'CoreTuple',
                elements: [
                  { type: 'CoreInt', value: 3, loc },
                  { type: 'CoreVariant', tag: 'Nil', value: null, loc }
                ],
                loc
              },
              loc
            }
          ],
          loc
        },
        loc
      }
    ],
    loc
  },
  loc
}
```

### Characteristics

- **Minimal language** - Fewer node types
- **No syntactic sugar** - Only essential constructs
- **Easier for type checker** - Fewer cases to handle
- **Easier for optimizer** - Fewer patterns to match
- **Semantically equivalent** - Same meaning as Surface AST

## Type Representation

**File:** `packages/core/src/types/type.ts`

### Type Structure

```typescript
type Type =
  | TypeVar         // Type variables (T, U)
  | TypeCon         // Type constructors (Int, String, List)
  | TypeApp         // Type application (List<Int>)
  | FunctionType    // Function types (Int -> String)
  | RecordType      // Record types ({ x: Int, y: Int })
  | RefType         // Mutable reference (Ref<Int>)
```

### Type Variables

```typescript
interface TypeVar {
  kind: 'TypeVar';
  name: string;      // e.g., "T", "U", "a"
  id: number;        // Unique identifier for unification
}
```

**Purpose:**
- Represent unknown types during inference
- Unified during type checking
- Generalized in polymorphic types

### Type Constructors

```typescript
interface TypeCon {
  kind: 'TypeCon';
  name: string;      // e.g., "Int", "String", "Bool", "List"
}
```

**Primitive types:**
- `Int` - Integer numbers
- `Float` - Floating-point numbers
- `String` - Text strings
- `Bool` - Boolean values
- `Unit` - Unit type (like void)

**Defined types:**
- User-defined variant types
- Type names from type declarations

### Type Application

```typescript
interface TypeApp {
  kind: 'TypeApp';
  constructor: Type;  // e.g., TypeCon("List")
  arg: Type;          // e.g., TypeCon("Int")
}
```

**Examples:**
- `List<Int>` - List of integers
- `Option<String>` - Optional string
- `Result<Int, String>` - Result type

### Function Types

```typescript
interface FunctionType {
  kind: 'FunctionType';
  from: Type;
  to: Type;
}
```

**Examples:**
- `Int -> String` - Function from int to string
- `Int -> Int -> Int` - Curried function (associates right)
- `(Int -> Int) -> Int` - Higher-order function

### Record Types

```typescript
interface RecordType {
  kind: 'RecordType';
  fields: Map<string, Type>;
}
```

**Examples:**
- `{ x: Int, y: Int }` - Point record
- `{ name: String, age: Int }` - Person record

**Subtyping:**
- Width subtyping: `{x: Int, y: Int}` <: `{x: Int}`
- More fields is subtype of fewer fields

### Type Schemes (Polymorphic Types)

```typescript
interface TypeScheme {
  typeVars: string[];   // Quantified type variables
  type: Type;           // The actual type
}
```

**Example:**
```typescript
// id: forall a. a -> a
{
  typeVars: ['a'],
  type: {
    kind: 'FunctionType',
    from: { kind: 'TypeVar', name: 'a', id: 0 },
    to: { kind: 'TypeVar', name: 'a', id: 0 }
  }
}
```

### Type Environment

```typescript
type TypeEnv = Map<string, TypeScheme>;
```

**Purpose:**
- Maps variable names to their type schemes
- Tracks types through scope
- Supports shadowing (inner bindings override outer)

## Location Information

**File:** `packages/core/src/types/location.ts`

### Location Structure

```typescript
interface Location {
  file: string;      // Source file name
  line: number;      // Line number (1-based)
  column: number;    // Column number (1-based)
  offset: number;    // Character offset from start (0-based)
}
```

### Purpose

- **Error reporting** - Show exact source position
- **Source maps** - Map generated JS to source
- **IDE integration** - Enable jump-to-definition, etc.
- **Debugging** - Trace execution to source

### Usage

Every AST node and token includes a `loc: Location` field.

**Example:**
```typescript
const expr: Expr = {
  type: 'Variable',
  name: 'foo',
  loc: {
    file: 'example.vf',
    line: 5,
    column: 10,
    offset: 87
  }
};
```

## Error Structures

**File:** `packages/core/src/utils/error.ts`

### Error Hierarchy

```typescript
class VibefunError extends Error {
  constructor(
    message: string,
    public loc: Location,
    public hint?: string
  )
}

class LexerError extends VibefunError {}
class ParserError extends VibefunError {}
class TypeError extends VibefunError {}
class CodeGenError extends VibefunError {}
```

### Error Fields

- **message** - Description of the error
- **loc** - Source location where error occurred
- **hint** - Optional suggestion for fixing the error
- **stack** - Stack trace (inherited from Error)

### Example

```typescript
throw new TypeError(
  'Type mismatch: expected Int, got String',
  expr.loc,
  'Consider converting the string to an integer'
);
```

## Optimization Metrics

**File:** `packages/core/src/optimizer/optimizer.ts`

### Metrics Structure

```typescript
interface OptimizationMetrics {
  passesApplied: number;      // Number of passes run
  nodesEliminated: number;    // AST nodes removed
  sizeBefore: number;         // AST size before optimization
  sizeAfter: number;          // AST size after optimization
  iterations: number;         // Iterations (for O2)
  converged: boolean;         // Did optimization converge?
}
```

### Purpose

- Track optimization effectiveness
- Debug optimization issues
- Performance analysis
- Decide when to stop (convergence)

## AST Node Commonalities

### Every AST Node Has

**1. Type Discriminator**
```typescript
type: 'NodeType'
```
Used for pattern matching and type narrowing.

**2. Location**
```typescript
loc: Location
```
Source position for errors and source maps.

**3. Node-Specific Fields**
```typescript
// e.g., for Variable:
name: string

// e.g., for BinaryOp:
op: string
left: Expr
right: Expr
```

### Example Complete Node

```typescript
const binaryOp: Expr = {
  type: 'BinaryOp',
  op: '+',
  left: {
    type: 'Variable',
    name: 'x',
    loc: { file: 'ex.vf', line: 1, column: 5, offset: 4 }
  },
  right: {
    type: 'IntLiteral',
    value: 42,
    loc: { file: 'ex.vf', line: 1, column: 9, offset: 8 }
  },
  loc: { file: 'ex.vf', line: 1, column: 5, offset: 4 }
};
```

## Data Structure Design Principles

### Immutability

All data structures are **immutable** by convention:
- Never modify existing structures
- Create new structures for transformations
- Enables safe parallelization (future)
- Easier to reason about

### Type Safety

All structures are **strictly typed**:
- No `any` types
- Discriminated unions for variant types
- TypeScript enforces correctness

### Self-Contained

Each node is **self-contained**:
- Includes all necessary information
- No external dependencies
- Can be processed independently

### Location Tracking

Every AST node **includes location**:
- Essential for error reporting
- Minimal overhead
- Flows naturally through pipeline

## Memory Characteristics

### Size Estimates

**Token:**
- ~100 bytes per token (type, value, location)

**Surface AST Node:**
- ~150-200 bytes per node (type, fields, location, children)

**Core AST Node:**
- ~150-200 bytes per node (similar to Surface)

**Type:**
- ~50-100 bytes per type (depends on complexity)

### Memory Usage for Typical File

For a 1000-line file:
- **Tokens:** ~50KB (500 tokens × 100 bytes)
- **Surface AST:** ~500KB (2500 nodes × 200 bytes)
- **Core AST:** ~600KB (3000 nodes × 200 bytes, larger due to desugaring)
- **Types:** ~100KB (1000 types × 100 bytes)

**Total:** ~1.25 MB per 1000 lines of code

This is acceptable for modern systems. Typical projects (10K-100K lines) use 12-125 MB.

## Next Steps

Continue reading:

- **[05-cross-cutting.md](./05-cross-cutting.md)** - Cross-cutting concerns and utilities
- **[06-extensibility.md](./06-extensibility.md)** - How to extend the compiler
- **[07-implementation-guide.md](./07-implementation-guide.md)** - Coding patterns

---

**Last Updated:** 2025-11-23
