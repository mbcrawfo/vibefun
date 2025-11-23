# Design Patterns

This document describes the core architectural patterns used throughout the Vibefun compiler.

## Overview

The compiler architecture employs several key patterns that provide:
- **Modularity** - Clear separation of concerns
- **Extensibility** - Easy to add new features
- **Testability** - Independently testable components
- **Maintainability** - Consistent, predictable structure

## Pattern 1: Two-AST Strategy

### Intent

Separate parsing concerns (full syntax) from semantic analysis (minimal core language).

### Structure

```
Surface AST                  Core AST
(Full Syntax)               (Minimal Core)
     │                            │
     │  ┌──────────────┐         │
     └─>│  Desugarer   │────────>│
        └──────────────┘
```

### Participants

**Surface AST (`types/ast.ts`):**
- Full language syntax
- All syntactic sugar preserved
- Produced by parser
- Easier for parser to construct

**Core AST (`types/core-ast.ts`):**
- Minimal language core
- All sugar removed
- Input to type checker and optimizer
- Fewer node types to handle

**Desugarer:**
- Transforms Surface → Core
- Removes syntactic sugar
- Semantic equivalence preserved

### Example

**Surface AST:**
```
Pipe(x, [f, g])              // x |> f |> g
```

**Core AST:**
```
App(g, App(f, x))            // g(f(x))
```

### Benefits

1. **Simpler Type Checker:** Works on minimal Core AST (fewer cases)
2. **Simpler Optimizer:** Fewer node types to optimize
3. **Clearer Semantics:** Core AST defines language meaning precisely
4. **Parser Freedom:** Parser can build natural Surface AST without worrying about downstream

### Trade-offs

- **Extra phase:** Desugaring adds compilation step
- **Two type systems:** Surface and Core AST types must be maintained
- **Testing:** Must test both Surface→Core and Core semantics

### When to Use

Use two-AST strategy when:
- Language has significant syntactic sugar
- Type checker would be simpler on minimal language
- Clear separation between syntax and semantics is valuable

### Related Patterns

- **Modular Transformation Architecture** (for implementing desugarer)
- **Location Tracking Pattern** (location flows from Surface to Core)

## Pattern 2: Modular Transformation Architecture

### Intent

Break complex transformations into independently testable, composable functions.

### Structure

```
┌──────────────┐     ┌─────────────────┐
│ Surface AST  │────>│  Transformation │
└──────────────┘     │    Function 1   │
                     └────────┬────────┘
                              │
                     ┌────────▼────────┐
                     │  Transformation │
                     │    Function 2   │
                     └────────┬────────┘
                              │
                     ┌────────▼────────┐
                     │  Transformation │
                     │    Function 3   │
                     └────────┬────────┘
                              │
                     ┌────────▼────────┐
                     │   Core AST      │
                     └─────────────────┘
```

### Participants

**Transformation Functions:**
- Pure functions `(SurfaceExpr) => CoreExpr`
- Each in its own file
- Single responsibility
- No shared state

**Orchestrator (Desugarer):**
- Applies transformations in order
- Manages overall flow
- No transformation logic itself

### Example

**File structure:**
```
desugarer/
├── desugarer.ts           # Orchestrator
├── curryLambda.ts         # Transform 1
├── desugarPipe.ts         # Transform 2
├── desugarComposition.ts  # Transform 3
├── desugarListLiteral.ts  # Transform 4
└── buildConsChain.ts      # Helper
```

**Orchestrator:**
```typescript
export function desugar(expr: SurfaceExpr): CoreExpr {
  let result = expr;
  result = desugarPipe(result);
  result = desugarComposition(result);
  result = curryLambda(result);
  result = desugarListLiteral(result);
  return result;
}
```

**Individual transformation:**
```typescript
// desugarPipe.ts
export function desugarPipe(expr: SurfaceExpr): CoreExpr {
  if (expr.type === 'Pipe') {
    // Transform x |> f to f(x)
    return /* transformation logic */;
  }
  // Recursively transform children
  return /* recurse into sub-expressions */;
}
```

### Benefits

1. **Single Responsibility:** Each transformation does one thing
2. **Independent Testing:** Test transformations in isolation
3. **Easy to Add:** New transformation = new file + add to orchestrator
4. **No Side Effects:** Pure functions (no shared state)
5. **Composability:** Transformations can build on each other

### Trade-offs

- **More files:** Each transformation in separate file
- **Ordering matters:** Some transformations depend on others
- **Potential repetition:** Tree traversal logic repeated (mitigated by utilities)

### When to Use

Use modular transformations when:
- Complex transformation can be broken into steps
- Independent testing is valuable
- Multiple people may work on transformations
- Transformations may be reused in different contexts

### Related Patterns

- **Two-AST Strategy** (what this pattern implements)
- **Fresh Variable Generation** (used by transformations)

## Pattern 3: Pluggable Pass System

### Intent

Allow optimization passes to be added, removed, or reordered without changing core optimizer.

### Structure

```
┌─────────────────┐
│   Optimizer     │
│                 │
│  ┌───────────┐  │
│  │  Pass 1   │  │
│  └───────────┘  │
│  ┌───────────┐  │
│  │  Pass 2   │  │
│  └───────────┘  │
│  ┌───────────┐  │
│  │  Pass 3   │  │
│  └───────────┘  │
└─────────────────┘
```

### Participants

**OptimizationPass Interface:**
```typescript
interface OptimizationPass {
  name: string;
  transform(expr: CoreExpr): CoreExpr;
}
```

**Optimizer Class:**
- Manages collection of passes
- Applies passes in order
- Handles optimization levels (O0, O1, O2)
- Tracks metrics

**Individual Passes:**
- Implement `OptimizationPass` interface
- Pure transformation functions
- Independent of other passes

### Example

**Pass implementation:**
```typescript
// constant-folding.ts
export const constantFoldingPass: OptimizationPass = {
  name: 'constant-folding',
  transform(expr: CoreExpr): CoreExpr {
    if (expr.type === 'BinaryOp' && isLiteral(expr.left) && isLiteral(expr.right)) {
      return evaluateAtCompileTime(expr);
    }
    return expr;
  }
};
```

**Optimizer usage:**
```typescript
const optimizer = new Optimizer([
  constantFoldingPass,
  deadCodeEliminationPass,
  betaReductionPass,
  etaReductionPass,
  csePass,
  inlinePass,
  patternMatchOptPass,
], { level: 'O2', maxIterations: 10 });

const optimized = optimizer.optimize(ast);
```

### Benefits

1. **Extensible:** Add passes without modifying optimizer core
2. **Configurable:** Enable/disable passes easily
3. **Reorderable:** Experiment with pass ordering
4. **Testable:** Test passes independently
5. **Clear Interface:** Uniform pass interface

### Trade-offs

- **Abstraction overhead:** Interface adds indirection
- **Pass interaction:** Must ensure passes don't interfere
- **Iteration complexity:** Fixed-point iteration adds complexity

### Optimization Levels

**O0 - No Optimization:**
- Skip all passes
- Fastest compilation

**O1 - Single Pass:**
- Run each pass once
- Balanced performance

**O2 - Fixed-Point Iteration:**
- Run passes until convergence
- Maximum optimization
- Slower compilation

### When to Use

Use pluggable passes when:
- Multiple independent optimizations exist
- Want configurability (enable/disable passes)
- Passes may be added over time
- Experimentation with pass ordering is valuable

### Related Patterns

- **Modular Transformation Architecture** (similar philosophy)
- **AST Traversal Utilities** (used by passes)

## Pattern 4: Location Tracking Pattern

### Intent

Preserve source location information throughout compilation for error reporting and source maps.

### Structure

```
Every AST Node:
{
  type: "NodeType",
  /* ... node-specific fields ... */
  loc: {
    file: string,
    line: number,
    column: number,
    offset: number
  }
}
```

### Participants

**Location Type:**
```typescript
interface Location {
  file: string;
  line: number;
  column: number;
  offset: number;
}
```

**AST Nodes:**
- Every node includes `loc: Location`
- Location preserved during transformations

**Error Types:**
- Accept `Location` parameter
- Include location in error message

### Example

**Token with location:**
```typescript
const token: Token = {
  type: 'IDENTIFIER',
  value: 'foo',
  loc: { file: 'example.vf', line: 5, column: 10, offset: 87 }
};
```

**AST node with location:**
```typescript
const expr: Expr = {
  type: 'Variable',
  name: 'foo',
  loc: { file: 'example.vf', line: 5, column: 10, offset: 87 }
};
```

**Error with location:**
```typescript
throw new TypeError(
  'Undefined variable: foo',
  { file: 'example.vf', line: 5, column: 10, offset: 87 },
  'Did you mean to import this variable?'
);
```

### Benefits

1. **Precise Errors:** Error messages point to exact source location
2. **Source Maps:** Location enables debugging in original source
3. **Traceability:** Can trace optimizations back to source
4. **Context:** Users know exactly where problem occurred

### Trade-offs

- **Memory overhead:** 4 fields per AST node (~32 bytes)
- **Transformation complexity:** Must preserve locations when creating new nodes

### When to Use

Always use location tracking in compilers - it's essential for:
- Error reporting
- Source maps
- Debugging
- IDE integration (future)

### Related Patterns

- **Error Handling Strategy** (uses locations)
- **Two-AST Strategy** (locations flow from Surface to Core)

## Pattern 5: Error Handling Strategy

### Intent

Provide consistent, helpful error reporting across all compilation phases.

### Structure

```
Phase-Specific Error Classes:
- LexerError
- ParserError
- TypeError
- CodeGenError
     │
     └──> All extend VibefunError
              │
              └──> Includes location, message, hint
```

### Participants

**Base Error Class:**
```typescript
class VibefunError extends Error {
  constructor(
    message: string,
    public loc: Location,
    public hint?: string
  ) {
    super(formatErrorMessage(message, loc, hint));
  }
}
```

**Phase-Specific Errors:**
```typescript
class LexerError extends VibefunError {}
class ParserError extends VibefunError {}
class TypeError extends VibefunError {}
class CodeGenError extends VibefunError {}
```

### Example

**Throwing an error:**
```typescript
if (currentToken.type !== 'IDENTIFIER') {
  throw new ParserError(
    `Expected identifier, got ${currentToken.type}`,
    currentToken.loc,
    'Variable names must be valid identifiers'
  );
}
```

**Error message output:**
```
Error: Expected identifier, got OPERATOR
  at example.vf:5:10

    3 | let x = 42;
    4 | let y = x +;
              ^
    5 | let z = y;

Hint: Variable names must be valid identifiers
```

### Benefits

1. **Consistency:** All errors follow same format
2. **Helpful:** Includes location, message, and hint
3. **Contextual:** Shows source code with error highlighted
4. **Typed:** Type-safe error handling
5. **Debuggable:** Stack traces preserved

### Error Quality Guidelines

**Good error messages:**
- State what went wrong clearly
- Include what was expected vs what was found
- Provide location (handled automatically)
- Offer suggestion or hint when possible

**Example - Good:**
```typescript
throw new TypeError(
  `Type mismatch: expected ${expected}, got ${actual}`,
  expr.loc,
  'Consider adding a type annotation'
);
```

**Example - Bad:**
```typescript
throw new Error('type error');  // No location, vague message, no hint
```

### Fail-Fast Philosophy

The compiler uses **fail-fast error handling**:
- Stop on first error
- Don't attempt error recovery
- Report error immediately

**Rationale:**
- Simpler implementation
- First error usually root cause
- Error recovery adds complexity
- Fast feedback loop

### When to Use

Always use this error pattern in compilers - consistent errors are essential for:
- Developer productivity
- Clear debugging
- Professional tool quality

### Related Patterns

- **Location Tracking Pattern** (provides locations for errors)

## Pattern 6: Stateful vs Functional Components

### Intent

Use appropriate abstraction for each component: classes for state management, functions for pure logic.

### Guidelines

**Use Classes For:**
- Lexer (position, line, column state)
- Parser (token position state)
- Optimizer (pass management, metrics)
- Code Generator (output buffer, source map state)

**Use Functions For:**
- Desugaring transformations (pure AST → AST)
- Type utilities (type comparison, unification)
- AST utilities (traversal, analysis, transformation)
- Optimization passes (pure AST → AST)

### Structure

**Class-based (stateful):**
Used for components that maintain internal state (position tracking, output buffers, etc.). Examples: Lexer, Parser, Code Generator.

**Function-based (pure):**
Used for stateless transformations and utilities. Examples: Desugaring transformations, type substitution, AST analysis.

### Benefits

1. **Clarity:** Clear distinction between stateful and pure
2. **Testability:** Pure functions easier to test
3. **Reasoning:** Pure functions easier to reason about
4. **Pragmatism:** Classes where they improve readability

### When to Use Which

**Use classes when:**
- Component maintains internal state (position, buffer, etc.)
- State changes throughout operation
- Multiple methods share state
- Object-oriented design improves clarity

**Use functions when:**
- Operation is pure (no side effects)
- Input → Output transformation
- No state between calls
- Functional composition desired

### Related Patterns

- **Modular Transformation Architecture** (uses functions)
- **Two-AST Strategy** (mix of classes and functions)

## Pattern 7: Module Organization Pattern

### Intent

Provide clear public APIs for modules while hiding implementation details.

### Structure

```
module/
├── implementation.ts    # Implementation details
├── helpers.ts          # Internal utilities
├── implementation.test.ts
└── index.ts            # Public API (exports only)
```

### Example

**Implementation file (parser.ts):**
```typescript
export class Parser { /* ... */ }
export function parseModule(tokens: Token[]): Module { /* ... */ }
function parseExpr(): Expr { /* private helper */ }
```

**Index file (index.ts):**
```typescript
// Only export public API
export { Parser, parseModule } from './parser.js';
export type { ParseOptions } from './parser.js';
// Note: parseExpr is not exported (internal helper)
```

**Consumer imports from index:**
```typescript
import { Parser, parseModule } from './parser/index.js';
```

### Benefits

1. **Clear API:** Explicit public interface
2. **Encapsulation:** Internal helpers hidden
3. **Refactoring:** Can change implementation files without breaking consumers
4. **Consistency:** Uniform import pattern

### Guidelines

**Always:**
- Create `index.ts` for every module
- Export only public API from `index.ts`
- Import from `index.ts`, never from implementation files

**Never:**
- Export internal helpers from `index.ts`
- Import directly from implementation files
- Use default exports (use named exports)

### Related Patterns

- **Modular Transformation Architecture** (each transformation is a module)
- **Pluggable Pass System** (each pass is a module)

## Pattern Application Summary

| Pattern | Where Used | Purpose |
|---------|-----------|---------|
| Two-AST Strategy | Parser → Desugarer → Type Checker | Separate syntax from semantics |
| Modular Transformations | Desugarer | Break complex transformations into testable pieces |
| Pluggable Passes | Optimizer | Allow configurable optimization |
| Location Tracking | All phases | Enable good errors and source maps |
| Error Handling | All phases | Consistent, helpful error reporting |
| Stateful vs Functional | All phases | Use appropriate abstraction |
| Module Organization | All modules | Clear public APIs |

## Anti-Patterns to Avoid

### Anti-Pattern 1: Shared Mutable State

**Problem:**
```typescript
let globalTypeEnv: Map<string, Type> = new Map();  // ❌

function inferType(expr: Expr): Type {
  // Mutates global state
  globalTypeEnv.set(expr.name, type);
}
```

**Solution:**
```typescript
function inferType(expr: Expr, env: TypeEnv): [Type, TypeEnv] {
  const newEnv = env.set(expr.name, type);
  return [type, newEnv];  // Return new state
}
```

### Anti-Pattern 2: God Class

**Problem:**
```typescript
class Compiler {
  tokenize() { /* ... */ }
  parse() { /* ... */ }
  typeCheck() { /* ... */ }
  optimize() { /* ... */ }
  generate() { /* ... */ }
  // One class doing everything ❌
}
```

**Solution:**
```typescript
class Lexer { tokenize() { /* ... */ } }
class Parser { parse() { /* ... */ } }
class TypeChecker { check() { /* ... */ } }
// Separate classes for each phase ✓
```

### Anti-Pattern 3: Missing Location Information

**Problem:**
```typescript
interface Expr {
  type: string;
  // No location ❌
}

throw new Error('Parse error');  // No location ❌
```

**Solution:**
```typescript
interface Expr {
  type: string;
  loc: Location;  // Always include location ✓
}

throw new ParserError('Unexpected token', token.loc);  // ✓
```

### Anti-Pattern 4: Mutation During Transformation

**Problem:**
```typescript
function desugar(expr: Expr): Expr {
  expr.type = 'Desugared';  // Mutates input ❌
  return expr;
}
```

**Solution:**
```typescript
function desugar(expr: Expr): Expr {
  return {
    type: 'Desugared',
    ...expr  // Create new object ✓
  };
}
```

## Next Steps

Continue reading:

- **[04-data-structures.md](./04-data-structures.md)** - AST and type structures
- **[05-cross-cutting.md](./05-cross-cutting.md)** - Shared utilities
- **[06-extensibility.md](./06-extensibility.md)** - How to extend
- **[07-implementation-guide.md](./07-implementation-guide.md)** - Coding patterns

---

**Last Updated:** 2025-11-23
