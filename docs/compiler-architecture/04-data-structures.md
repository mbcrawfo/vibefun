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

For the source `let x = 42`, the lexer produces a sequence of tokens: LET keyword, IDENTIFIER (x), EQUALS, INT_LITERAL (42), and EOF. Each token carries its type, optional value, and location information.

## Surface AST

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

Surface AST nodes follow a common pattern: each node has a `type` field identifying the node kind, relevant data fields (like `params` for Lambda, `elements` for ListLiteral), child nodes, and a `loc` field for source location. For example, a lambda expression stores its parameters and body, a pipe expression stores its left side and sequence of functions to apply, and a list literal stores its element expressions.

### Characteristics

- **Rich syntax** - All language features represented
- **Convenient for parsing** - Natural AST from parser
- **Location on every node** - Error reporting support
- **Immutable** - Never modified after creation

## Core AST

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

The desugarer transforms Surface AST to Core AST:

- **Multi-param lambdas** become curried single-parameter lambdas (e.g., `(x, y) => body` becomes `x => y => body`)
- **Pipe expressions** become nested function applications (e.g., `x |> f |> g` becomes `g(f(x))`)
- **List literals** become chains of Cons variant constructors (e.g., `[1, 2, 3]` becomes `Cons(1, Cons(2, Cons(3, Nil)))`)

### Characteristics

- **Minimal language** - Fewer node types
- **No syntactic sugar** - Only essential constructs
- **Easier for type checker** - Fewer cases to handle
- **Easier for optimizer** - Fewer patterns to match
- **Semantically equivalent** - Same meaning as Surface AST

## Type Representation

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
  id: number;        // Globally unique identifier
  level: number;     // Scope level for generalization
}
```

**Purpose:**
- Represent unknown types during inference
- Unified during type checking
- Generalized in polymorphic types

**Design Decisions:**

**Integer IDs for uniqueness:**
- Each type variable has a globally unique integer ID generated via counter
- Efficient comparison (integer equality vs string comparison)
- Standard approach in ML implementations (matches OCaml's internal representation)
- Fresh variables created via `freshTypeVar(level)` pattern

**Level tracking for scope safety:**
- Each type variable carries a "level" indicating its scope depth
- Discovered by Didier Rémy (1988), used in OCaml and Standard ML
- Enables O(1) generalization checks (vs O(n) environment scanning)
- Prevents type variables from escaping their defining scope
- Example: In `let f = (x => x) in ...`, the type variable for `x` has level 1, and can be generalized because no outer scope references it

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
  vars: number[];      // IDs of quantified type variables
  type: Type;          // Type body with free occurrences
}
```

**Purpose:**
- Represent polymorphic types (universally quantified types)
- Enable let-polymorphism where each use of a let-bound variable gets fresh type variables
- Store generalized types in the type environment

**Example:**

The identity function `forall a. a -> a` is represented as:
```typescript
{
  vars: [0],           // Variable ID 0 is quantified
  type: FunctionType(TypeVar(0), TypeVar(0))
}
```

When instantiated, each quantified variable gets replaced with a fresh type variable, allowing the same function to be used at different types.

**Design Decisions:**

**Explicit quantified variable list:**
- Variables listed by their integer IDs (not names)
- Standard approach in ML type systems
- Clear separation between bound (quantified) and free type variables
- Enables efficient instantiation by iterating over the variable list

### Type Environment

```typescript
interface TypeEnv {
  values: Map<string, ValueBinding>;   // Variable name → type scheme
  types: Map<string, TypeBinding>;     // Type name → type definition
}
```

**Purpose:**
- Maps variable names to their type schemes
- Maps type names to their definitions
- Tracks types through scope
- Supports shadowing (inner bindings override outer)

**Design Decisions:**

**Flat maps vs nested scopes:**
- Uses flat `Map` structures rather than linked scope chains
- Shadowing handled by creating new maps: `new Map(oldEnv.values)`
- Simpler implementation with O(1) lookup
- Sufficient for Algorithm W which doesn't require backtracking

**Separate value and type namespaces:**
- Values (variables, functions) and types (type definitions) kept in separate maps
- Allows same name to exist as both value and type (e.g., `Some` as constructor and `Option` as type)
- Clean separation matches language semantics

**Immutable environment updates:**
- Extending environment creates new map, leaving old unchanged
- Enables easy scope exit (just discard extended environment)
- Simpler reasoning about environment state during type checking

### Substitution

```typescript
type Substitution = Map<number, Type>;  // Type variable ID → Type
```

**Purpose:**
- Records type variable bindings discovered during unification
- Maps type variable IDs to their resolved types
- Accumulated throughout type inference

**Operations:**

- **Empty substitution:** `new Map()` - no bindings
- **Single binding:** `map.set(id, type)` - bind one variable
- **Composition:** `composeSubst(s1, s2)` - combine two substitutions, applying s1 to types in s2
- **Application:** `applySubst(subst, type)` - replace all bound variables in a type

**Design Decisions:**

**Map from IDs to Types:**
- Simple, efficient representation using JavaScript Map
- O(1) lookup and insertion
- Standard functional approach (vs mutable reference cells)

**Immutable composition:**
- Composing substitutions creates new map
- `composeSubst(s1, s2)` applies s1 to all types in s2, then merges
- Maintains referential transparency

**Implicit path compression:**
- Chains like `α → β → Int` resolved during `applySubst`
- Recursive application follows chains to final type
- Simple correctness over optimization (explicit path compression could be added if needed)

### Type System Design Decisions

**Why immutable substitutions over mutable type variables?**

OCaml uses **mutable type variables** where unification directly modifies type variable cells in place. This is faster (O(1) unification updates) but more complex to implement correctly.

Vibefun uses **immutable substitutions** where unification returns a new substitution map. This is:
- Simpler to implement and debug
- Easier to reason about (no hidden mutation)
- Sufficient performance for typical programs
- Standard approach in functional implementations

Trade-off: Slightly more memory allocation, but enables cleaner error messages and easier debugging.

**Why this specific type representation?**

The type representation uses TypeScript discriminated unions, which provide:
- Type-safe pattern matching via `type` field
- Exhaustiveness checking by the TypeScript compiler
- Natural recursive structure for type traversal
- Clear, readable code

Maps used for record fields and variant constructors provide O(1) lookup, important for field access type checking and constructor resolution.

### Potential Future Optimizations

If profiling reveals type checking bottlenecks, these optimizations could be considered:

**1. Union-Find for type variables**
- Replace substitution map with union-find data structure
- O(α(n)) amortized unification (nearly O(1))
- Standard optimization in production compilers
- Trade-off: More complex implementation

**2. Hash-consing for types**
- Share identical type structures in memory
- Reduces memory usage for large programs
- Enables O(1) type equality checks (pointer comparison)
- Trade-off: Requires global type table

**3. Path compression in substitution**
- Eagerly collapse substitution chains
- Reduces repeated chain traversals
- Trade-off: Slightly more complex apply operation

**4. Persistent data structures for environments**
- Use immutable maps with structural sharing
- Faster environment extension (O(log n) vs O(n) copy)
- Libraries like Immutable.js provide this
- Trade-off: Additional dependency

**Current recommendation:** Keep the simple implementation. It's clean, correct, and performant enough for expected use cases. Optimize only if profiling shows actual bottlenecks.

## Location Information

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

Every AST node and token includes a `loc: Location` field containing the filename, line, column, and offset information.

## Error Structures

### Error Hierarchy

A base `VibefunError` class extends the standard Error, accepting a message, location, and optional hint. Phase-specific errors (LexerError, ParserError, TypeError, CodeGenError) extend this base class.

### Error Fields

- **message** - Description of the error
- **loc** - Source location where error occurred
- **hint** - Optional suggestion for fixing the error
- **stack** - Stack trace (inherited from Error)

### Example

Errors are thrown with a descriptive message, the location where the error occurred, and an optional hint to help the user fix the issue.

## Optimization Metrics

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

A binary operation node contains a type discriminator ('BinaryOp'), the operator, left and right child expressions, and location information. Child nodes also follow the same structure recursively.

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

**Last Updated:** 2025-11-24
