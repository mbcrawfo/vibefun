# Compilation Pipeline

This document describes the architecture of each compilation phase and how data flows through the pipeline.

## Pipeline Overview

The Vibefun compiler uses a **linear pipeline architecture** where each phase:

1. Takes well-defined input from the previous phase
2. Performs a single, focused transformation
3. Produces well-defined output for the next phase
4. Can fail with phase-specific errors that halt compilation

### Pipeline Stages

```
Source → Lexer → Parser → Desugarer → Type Checker → Optimizer → Code Generator → JavaScript
 (text)  (tokens) (Surface)  (Core)    (Typed Core) (Optimized)    (JS + maps)     (files)
```

### Phase Independence

Each phase is **independently testable**:
- Unit tests for phase logic
- Integration tests for phase connections
- Snapshot tests for output validation

Phases communicate **only through data**:
- No shared global state
- No phase-to-phase dependencies except data
- Clear input/output contracts

## Phase 1: Lexer

### Responsibility

Transform UTF-8 source text into a stream of tokens for parsing.

### Input

- **Source code:** UTF-8 string
- **Filename:** String for error reporting

### Output

- **Token stream:** Array of `Token` objects
- Always ends with `EOF` token
- Each token includes:
  - Type (keyword, identifier, literal, operator, etc.)
  - Value (for literals and identifiers)
  - Location (file, line, column, offset)

### Key Features

**1. Unicode Normalization**
- Normalizes to NFC form for consistent identifier comparison
- Handles unicode in identifiers, strings, and comments

**2. Comment Handling**
- Line comments (`//`) removed during tokenization
- Block comments (`/* */`) can nest
- Comments don't appear in token stream

**3. Number Parsing**
- Integer literals: `42`, `0`, `999`
- Float literals: `3.14`, `0.5`
- Underscores for readability: `1_000_000`
- Validation: rejects `1.`, `.5`, multiple decimals

**4. String Literal Parsing**
- Double-quoted strings: `"hello"`
- Escape sequences: `\n`, `\t`, `\"`, `\\`, `\u{xxxx}`
- Multi-line strings supported
- Unicode escape validation

**5. Operator Recognition**
- 50+ operators across 14 precedence levels
- Multi-character operators: `==`, `!=`, `<=`, `>=`, `->`, `=>`, `|>`, `>>`, `<<`, `::`, `...`
- Disambiguation: `!` (postfix) vs `!` (prefix in expressions)

**6. Keyword Recognition**
- 50+ reserved keywords
- Case-sensitive matching
- Keywords reserved even if unused (for future features)

### Error Handling

**Throws `LexerError` for:**
- Unexpected characters: `@`, `#`, `$`
- Unterminated strings
- Invalid escape sequences
- Invalid unicode escapes
- Malformed numbers

**Error includes:**
- Source location (file, line, column)
- Descriptive message
- Context (what was expected)

### Design Rationale

**Fail-fast error handling:**
- Invalid source code should be rejected immediately
- No error recovery needed at lexical level
- Clear, focused error messages

**Comment removal:**
- Simplifies parser (no comment nodes in AST)
- Comments are irrelevant for compilation
- Documentation comments could be handled separately (future)

### Testing

**448 tests covering:**
- All token types
- Edge cases (empty input, unicode, deep nesting)
- Error cases (invalid syntax)
- Number parsing edge cases
- String escape sequences
- Operator disambiguation

## Phase 2: Parser

### Responsibility

Build a Surface AST from the token stream using recursive descent parsing.

### Input

- **Token stream:** Array of `Token` objects from lexer
- **Filename:** String for error reporting

### Output

- **Surface AST:** `Module` node representing the entire program
- Includes all syntactic sugar (pipe operators, composition, list literals, etc.)
- Every AST node includes source location

### Key Features

**1. Recursive Descent**
- Each grammar rule maps to a parsing method
- `parseExpr()`, `parsePattern()`, `parseDecl()`, etc.
- Top-down, predictable parsing flow

**2. Pratt-Style Precedence Climbing**
- 14 precedence levels for operators
- Left and right associativity handled
- Minimal code for complex precedence rules

**3. Disambiguation Strategies**
- **Postfix `!` vs Prefix `!`:** Context-based (postfix after value, prefix before)
- **Blocks vs Records:** Look for `=` to distinguish record fields
- **Type application vs Bit shift:** Whitespace-sensitive (`List<Int>` vs `x<<y`)
- **Spread in lists vs records:** Context determines interpretation

**4. Expression Parsing Hierarchy**

Lowest to highest precedence:
1. Lambda expressions (`x => x + 1`)
2. Pipe operator (`x |> f`)
3. Forward/backward composition (`f >> g`, `f << g`)
4. Logical OR (`||`)
5. Logical AND (`&&`)
6. Equality (`==`, `!=`)
7. Comparison (`<`, `<=`, `>`, `>=`)
8. Cons operator (`::`)
9. Addition/Subtraction (`+`, `-`)
10. Multiplication/Division (`*`, `/`, `%`)
11. Exponentiation (`**`)
12. Unary (`-`, `!` prefix)
13. Function application (juxtaposition)
14. Postfix (`!` non-null assertion)

**5. Pattern Matching Support**
- Variable patterns, wildcard patterns, literal patterns
- Constructor patterns with nested patterns
- List patterns with spread (`[x, ...xs]`)
- Record patterns with field punning
- Or-patterns (`Red | Blue`)

**6. Module System**
- Module declarations
- Import/export statements
- External FFI declarations
- Type definitions

### Error Handling

**Throws `ParserError` for:**
- Unexpected tokens
- Missing required tokens (e.g., `then` after `if` condition)
- Invalid syntax structures
- Unclosed delimiters

**Error includes:**
- Token location (file, line, column)
- Expected vs actual token
- Context ("in function parameter list")

### Design Decisions

**Why recursive descent?**
- Simple, readable implementation
- Easy to debug and understand
- Handles complex grammars well
- Natural mapping to grammar rules

**Why Pratt precedence climbing?**
- Minimal code for precedence handling
- Easy to adjust precedence levels
- Well-established pattern
- Combines well with recursive descent

**Why fail-fast?**
- First error is usually root cause
- Error recovery adds complexity
- Fast feedback loop for developers

**Why context-sensitive disambiguation?**
- Vibefun syntax is intentionally context-sensitive
- Avoids verbose syntax (e.g., `List.<Int>` for type application)
- Improves readability at cost of parsing complexity

### Testing

**800+ tests covering:**
- All expression types
- All pattern types
- All declaration types
- Precedence and associativity
- Edge cases (deeply nested, complex compositions)
- Error cases (missing tokens, unexpected syntax)

## Phase 3: Desugarer

### Responsibility

Transform Surface AST into Core AST by removing syntactic sugar and simplifying to a minimal core language.

### Architecture

**Modular transformation design:**

The desugarer orchestrates multiple independent transformation functions, each implementing a specific syntactic transformation as a pure function.

### Input

- **Surface AST:** Full syntax tree with all syntactic sugar

### Output

- **Core AST:** Minimal AST with sugar removed
- Smaller node type set (easier for type checker and optimizer)
- Semantically equivalent to Surface AST

### Transformations

**1. Multi-Param Lambdas → Curried Lambdas**
- `(x, y) => x + y` becomes `x => y => x + y`

**2. Pipe Operator → Function Application**
- `x |> f` becomes `f(x)`
- `x |> f |> g` becomes `g(f(x))`

**3. Composition Operators → Lambda Wrappers**
- `f >> g` becomes `x => g(f(x))`
- `f << g` becomes `x => f(g(x))`

**4. List Literals → Cons/Nil Chains**
- `[1, 2, 3]` becomes `Cons(1, Cons(2, Cons(3, Nil)))`

**5. List Cons Operator → Variant Constructor**
- `x :: xs` becomes `Cons(x, xs)`

**6. Block Expressions → Nested Let Bindings**
- Blocks with multiple statements become nested `let` expressions

**7. Record Updates → Explicit Field Copying**
- `{ ...record, field: newValue }` becomes explicit field-by-field copy

**8. If-Then-Else → Match on Boolean**
- `if cond then a else b` becomes `match cond { true => a, false => b }`

**9. Or-Patterns → Multiple Match Cases**
- `Red | Blue => "color"` becomes two separate cases

**10. External Blocks → Multiple Declarations**
- External FFI blocks expanded to individual declarations

### Key Features

**1. Fresh Variable Generation**
- Generates unique variable names during transformations
- Prevents name capture during transformations
- Naming pattern: `$pipe0`, `$comp1`, `$block2`, etc.

**2. Pure Transformations**
- All transformation functions are pure (no side effects)
- Input AST unchanged (new AST returned)
- Independently testable
- Composable

**3. Location Preservation**
- Source locations flow through transformations
- Generated nodes use location from original node
- Enables accurate error messages in later phases

### Design Decisions

**Why modular transformations?**
- Single responsibility (each transformation does one thing)
- Independently testable
- Easy to add new transformations
- No shared state between transformations

**Why Core AST?**
- Simplifies type checker (fewer node types)
- Simplifies optimizer (fewer patterns to match)
- Clear semantic definition (less ambiguity)
- Easier to reason about correctness

**Why this transformation order?**
- Some transformations depend on others being complete
- Pipe desugaring before currying handles edge cases
- List literals before cons operator handles nesting

### Testing

**200+ tests per transformation covering:**
- Basic transformation cases
- Nested transformations
- Edge cases (empty lists, single elements)
- Location preservation
- Fresh variable generation

## Phase 4: Type Checker

### Responsibility

Infer types for all expressions using Algorithm M (constraint-based Hindley-Milner type inference) and validate type correctness.

### Architecture

**Algorithm M implementation** with two-phase design:
- **Phase 1:** Constraint generation with bidirectional typing
- **Phase 2:** Constraint solving with error recovery
- Type environment management
- Unification algorithm
- Let-polymorphism with value restriction
- Pattern exhaustiveness checking
- Partial results for IDE support

### Input

- **Core AST:** Desugared, minimal AST

### Output

- **Typed Core AST:** Core AST with type annotations on every node
- Type schemes for all bindings

### Key Features (Planned)

**1. Type Inference**
- Hindley-Milner Algorithm M (constraint-based)
- Two-phase architecture (generation + solving)
- Bidirectional typing (synthesis and checking modes)
- Automatic type variable generation
- Let-polymorphism (generalize at let-bindings)

**2. Type Environment**
- Tracks variable types through scope
- Handles shadowing correctly
- Supports recursive and mutually recursive bindings

**3. Subtyping**
- Width subtyping for records (`{x: Int, y: Int}` <: `{x: Int}`)
- Nominal typing for variants (explicit definition required)

**4. Pattern Exhaustiveness**
- Matrix-based algorithm for checking match completeness
- Warns on non-exhaustive patterns
- Detects unreachable patterns

**5. Special Constructs**
- `Ref<T>` handling (mutable references)
- JavaScript FFI type validation
- Module type checking

### Design Decisions

**Why Algorithm M over Algorithm W?**
- Better error messages through constraint analysis and prioritization
- Partial results enable IDE support (type-at-cursor, error recovery)
- Future extensibility for advanced type features (GADTs, effects)
- Bidirectional typing provides more precise inference
- Clean separation of concerns (generation vs solving)
- Trade-off: More complex implementation for better developer experience

**Why value restriction?**
- Soundness with mutable references
- Prevents polymorphic references
- Standard approach in ML-family languages

**Why level-based type variable scoping?**
- Efficient O(1) generalization checks (vs O(n) environment scanning)
- Prevents type variables from escaping their defining scope
- Well-proven approach from OCaml and Standard ML implementations
- Simpler implementation than alternative approaches
- Discovered by Didier Rémy (1988), battle-tested in production compilers

**Why width subtyping for records?**
- Convenient for JavaScript interop
- Natural for structural record types
- Common in practical functional languages

**Why nominal typing for variants?**
- Clear error messages (explicit type names)
- Better tooling support
- Prevents accidental type equivalence
- Aligns with algebraic data type philosophy

### Testing (In Progress)

**300+ tests planned:**
- Basic type inference
- Unification cases
- Let-polymorphism
- Pattern exhaustiveness
- Error cases (type mismatches, infinite types)
- Edge cases (recursive types, mutual recursion)

## Phase 5: Optimizer

### Responsibility

Apply optimization passes to improve generated code quality while preserving semantics.

### Architecture

**Pluggable pass-based design:**

Each optimization implements a common interface allowing passes to be enabled, disabled, or configured independently.

### Input

- **Typed Core AST:** Type-checked and validated AST

### Output

- **Optimized Core AST:** Semantically equivalent but improved AST
- Optimization metrics (passes applied, nodes eliminated, etc.)

### Optimization Levels

**O0 - No Optimization**
- Skip all optimization passes
- Fastest compilation
- Largest output, slowest runtime

**O1 - Single Pass**
- Run each optimization pass once
- Balanced compilation speed and output quality

**O2 - Fixed-Point Iteration**
- Run passes repeatedly until no changes (or max iterations reached)
- Slowest compilation
- Smallest output, fastest runtime

### Optimization Passes

**1. Constant Folding** (`constant-folding.ts`)
- Evaluate compile-time constants
- `2 + 3` → `5`
- `true && false` → `false`
- String concatenation

**2. Dead Code Elimination** (`dead-code-elim.ts`)
- Remove unreachable code
- Remove unused bindings
- Simplify match expressions with known outcomes

**3. Beta Reduction** (`beta-reduction.ts`)
- Inline simple function applications
- `(x => x + 1)(5)` → `5 + 1`
- Only for simple cases (avoid code bloat)

**4. Eta Reduction** (`eta-reduction.ts`)
- Simplify lambda wrapping
- `x => f(x)` → `f`
- Reduces overhead of unnecessary lambdas

**5. Common Subexpression Elimination** (`cse.ts`)
- Hoist repeated expressions
- `x + y` used multiple times → compute once, reuse
- Scope-aware (doesn't break semantics)

**6. Inline Expansion** (`inline.ts`)
- Inline small functions at call sites
- Configurable size threshold
- Avoids inlining recursive functions

**7. Pattern Match Optimization** (`pattern-match-opt.ts`)
- Optimize match expressions
- Reorder cases for common patterns
- Eliminate redundant checks

### Key Features

**1. Pass Interface**
- All passes implement `OptimizationPass` interface
- `name` for debugging and metrics
- `transform` performs the optimization
- Pure function (no side effects)

**2. Fixed-Point Iteration**
- Run passes until AST stops changing
- Max iterations limit prevents infinite loops
- Tracks iterations and convergence

**3. Metrics Tracking**
- Number of passes applied
- Nodes eliminated
- Size reduction
- Iteration count (O2 only)

**4. AST Size Tracking**
- Measures AST node count before/after
- Prevents optimizations that increase size excessively
- Useful for inline expansion decisions

### Design Decisions

**Why pluggable passes?**
- Easy to add new optimizations
- Enable/disable passes individually
- Clear separation of concerns
- Testable in isolation

**Why fixed-point iteration for O2?**
- Optimizations enable other optimizations
- Beta reduction + constant folding synergy
- Maximize optimization effectiveness
- Limit prevents runaway compilation

**Why AST-to-AST optimization?**
- Type information available (typed AST)
- Simpler than IR-based optimization
- JavaScript target doesn't need complex optimizations
- Readable output prioritized

### Testing

**150+ tests covering:**
- Each optimization pass independently
- Pass combinations
- Fixed-point convergence
- Edge cases (deeply nested, mutual recursion)
- Metrics validation

## Phase 6: Code Generator

### Responsibility

Generate readable JavaScript code and source maps from optimized Core AST.

### Architecture (Planned)

Maintains an output buffer and source map state while traversing the AST to emit JavaScript code.

### Input

- **Optimized Core AST:** Final AST ready for emission

### Output

- **JavaScript code:** ES2020+ JavaScript
- **Source maps:** For debugging support

### Planned Features

**1. Curried Function Compilation**
- Multi-level curried functions
- Readable nested function syntax
- Preserve function names where possible

**2. Variant Representation**
- Tagged objects: `{ tag: "Some", value: 42 }`
- Pattern matching → switch statements or if-chains
- Type-safe variant construction

**3. Pattern Matching Compilation**
- Decision tree generation
- Efficient matching (avoid redundant checks)
- Exhaustiveness guaranteed by type checker

**4. List Compilation**
- Linked list representation (objects with `head`/`tail`)
- Or array-based (optimization opportunity)
- Trade-off between immutability and performance

**5. Record Compilation**
- Plain JavaScript objects
- Width subtyping preserved
- Field access → property access

**6. Readable Output**
- Preserve variable names where possible
- Add comments for clarity
- Proper indentation
- Avoid minification (explicit minifier can do that)

**7. Source Maps**
- Map generated JS back to `.vf` source
- Enable debugging in browser/Node.js
- Preserve location information from AST

### Design Decisions (Planned)

**Why ES2020+?**
- Modern runtime features available
- No need for legacy browser support
- Clean, readable output
- Sufficient target for Node.js and modern browsers

**Why readable output over optimal?**
- Debugging is important
- JavaScript engines optimize well
- Explicit minifier if needed
- Developer experience prioritized

**Why tagged objects for variants?**
- Type-safe runtime representation
- Easy pattern matching implementation
- Compatible with JavaScript ecosystem
- Readable in debugger

### Testing (Planned)

- End-to-end compilation tests
- Output validation (syntax, semantics)
- Source map correctness
- Readability checks
- Runtime behavior validation

## Data Flow Summary

### Complete Pipeline

```
┌──────────────┐
│ Source Code  │ "let x = 42"
└──────┬───────┘
       │ Lexer
       ▼
┌──────────────┐
│   Tokens     │ [LET, IDENTIFIER("x"), EQUALS, INT(42)]
└──────┬───────┘
       │ Parser
       ▼
┌──────────────┐
│ Surface AST  │ LetDecl("x", IntLiteral(42))
└──────┬───────┘
       │ Desugarer
       ▼
┌──────────────┐
│  Core AST    │ Let("x", CoreInt(42), ...)
└──────┬───────┘
       │ Type Checker
       ▼
┌──────────────┐
│ Typed Core   │ Let("x": Int, CoreInt(42): Int, ...)
└──────┬───────┘
       │ Optimizer
       ▼
┌──────────────┐
│ Optimized    │ (optimized but equivalent)
└──────┬───────┘
       │ Code Generator
       ▼
┌──────────────┐
│ JavaScript   │ "const x = 42;"
└──────────────┘
```

### Information Flow

**Forward Flow (data transformations):**
- Source → Tokens → Surface AST → Core AST → Typed AST → Optimized AST → JavaScript

**Preserved Throughout:**
- **Location information:** Every AST node knows its source position
- **Semantics:** Each transformation preserves program meaning
- **Type information:** Once inferred, flows through remaining phases

**Lost During Pipeline:**
- **Comments:** Removed during lexing
- **Whitespace:** Not preserved (not needed)
- **Syntactic sugar:** Removed during desugaring
- **Redundant information:** Removed during optimization

## Error Handling Across Phases

### Phase-Specific Errors

| Phase | Error Type | Examples |
|-------|------------|----------|
| Lexer | `LexerError` | Invalid character, unterminated string |
| Parser | `ParserError` | Unexpected token, missing delimiter |
| Desugarer | Rarely errors | (Transformations should always succeed) |
| Type Checker | `TypeError` | Type mismatch, undefined variable |
| Optimizer | Should not error | (Optimizations preserve semantics) |
| Code Gen | `CodeGenError` | Invalid AST structure |

### Error Propagation

**Fail-fast strategy:**
1. Error detected in phase
2. Phase throws specific error type
3. Compilation halts immediately
4. Error reported to user with location

**No error recovery:**
- First error is usually root cause
- Multiple errors often cascade from one issue
- Simpler implementation
- Fast feedback loop

### Error Quality

All errors include:
- **Location:** File, line, column
- **Message:** Clear description of problem
- **Context:** What was expected vs what was found
- **Hint:** Suggestion for fixing (when applicable)

## Performance Characteristics

### Time Complexity (Approximate)

| Phase | Complexity | Notes |
|-------|------------|-------|
| Lexer | O(n) | Linear scan of source |
| Parser | O(n) | Recursive descent, no backtracking |
| Desugarer | O(n) | Tree traversal |
| Type Checker | O(n * log n) | Algorithm W with environment lookups |
| Optimizer | O(n * k) | k = iterations (1 for O1, ~5-10 for O2) |
| Code Gen | O(n) | Tree traversal |

**Overall:** O(n) to O(n * log n) depending on type checker complexity

### Space Complexity

- **Lexer:** O(n) for token array
- **Parser:** O(d) for recursion depth, O(n) for AST
- **Desugarer:** O(n) for Core AST (similar size to Surface AST)
- **Type Checker:** O(n) for type environment
- **Optimizer:** O(n) for optimized AST
- **Code Gen:** O(n) for output string

**Overall:** O(n) space, where n is source size

### Compilation Speed

Target: **< 100ms for typical modules** (1000 lines)

Achieved through:
- Simple algorithms (no complex optimizations)
- Linear or near-linear phases
- Minimal memory allocation
- No unnecessary passes

## Next Steps

Continue reading:

- **[03-design-patterns.md](./03-design-patterns.md)** - Architectural patterns explained
- **[04-data-structures.md](./04-data-structures.md)** - AST and type structures
- **[05-cross-cutting.md](./05-cross-cutting.md)** - Shared utilities
- **[06-extensibility.md](./06-extensibility.md)** - How to extend
- **[07-implementation-guide.md](./07-implementation-guide.md)** - Coding patterns

---

**Last Updated:** 2025-11-23
