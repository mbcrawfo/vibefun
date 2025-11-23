# Cross-Cutting Concerns

This document describes patterns and utilities that span multiple compilation phases.

## Overview

Cross-cutting concerns are aspects of the compiler that affect multiple phases:

- **Error Handling** - Consistent error reporting across all phases
- **Location Tracking** - Source position information throughout pipeline
- **AST Utilities** - Common operations on AST nodes
- **Fresh Variable Generation** - Unique name generation for transformations
- **Substitution** - Variable replacement in expressions
- **Expression Equality** - Deep comparison of AST nodes
- **Immutability Patterns** - Creating modified copies of structures

## Error Handling

### Error Class Hierarchy

```
Error (built-in)
  │
  └─ VibefunError (base for all compiler errors)
       ├─ LexerError
       ├─ ParserError
       ├─ TypeError
       └─ CodeGenError
```

### Base Error Class

The `VibefunError` base class extends JavaScript's Error, adding location information and an optional hint field. All compiler errors inherit from this base class, providing consistent error reporting across all phases.

**Features:**
- Extends JavaScript `Error` for stack traces
- Includes `Location` for source position
- Optional `hint` for suggestions
- Formatted message with source context

### Phase-Specific Errors

Each compilation phase has its own error class (LexerError, ParserError, TypeError, CodeGenError) that extends VibefunError. Errors are thrown with descriptive messages, source locations, and optional hints to help users understand and fix issues.

### Error Message Formatting

Error messages include:

1. **Error type and message**
2. **Source location** (file, line, column)
3. **Source code context** (lines around error)
4. **Visual indicator** (caret pointing to error)
5. **Hint** (if provided)

**Example output:**
```
TypeError: Type mismatch: expected Int, got String
  at example.vf:5:10

    3 | let x = 42;
    4 | let y = x + "hello";
                    ^
    5 | let z = y;

Hint: Consider adding a type annotation
```

### Error Handling Strategy

**Fail-Fast Philosophy:**
- Throw error immediately when detected
- Don't attempt error recovery
- Stop compilation on first error
- Report error with full context

**Rationale:**
- First error is usually root cause
- Error recovery adds complexity
- Fast feedback for developers
- Simpler implementation

### Best Practices

**Good error messages:**
```typescript
// ✓ Specific, helpful, includes context
throw new TypeError(
  `Cannot apply operator '${op}' to types ${leftType} and ${rightType}`,
  expr.loc,
  `The ${op} operator requires numeric types`
);
```

**Bad error messages:**
```typescript
// ✗ Vague, no context, no help
throw new Error('type error');
```

## Location Tracking

### Location Structure

```typescript
interface Location {
  file: string;      // e.g., "example.vf"
  line: number;      // 1-based line number
  column: number;    // 1-based column number
  offset: number;    // 0-based character offset
}
```

### Purpose

Location information enables:
- **Precise error messages** - Point to exact source position
- **Source maps** - Map generated JS back to source
- **IDE integration** - Jump-to-definition, hover info
- **Debugging** - Trace execution to source

### Location Flow Through Pipeline

```
Source Code
    ↓
Lexer → Tokens (each has location)
    ↓
Parser → Surface AST (each node has location)
    ↓
Desugarer → Core AST (location preserved from Surface)
    ↓
Type Checker → Typed AST (location preserved)
    ↓
Optimizer → Optimized AST (location preserved)
    ↓
Code Generator → Source Maps (location → JS position)
```

### Preserving Locations

**During AST transformation:**
When transforming AST nodes, the location from the original node should be preserved in the transformed node. This maintains the connection to the source code.

**When creating synthetic nodes:**
Synthetic nodes (created by the compiler, not from source) borrow location information from the nearest real node to provide approximate source context.

### Location Utilities

Location utilities provide operations like merging locations from multiple nodes (for nodes that span multiple source locations).

## AST Analysis Utilities

### AST Size Calculation

Utility to measure AST complexity by counting nodes recursively.

**Purpose:**
- Measure AST complexity
- Track optimization effectiveness
- Decide when to inline functions
- Prevent excessive code bloat

### Free Variables Analysis

Utility to identify variables used in an expression that are not bound within that expression.

**Purpose:**
- Identify variables used in expression
- Determine closure requirements
- Validate scope correctness
- Optimize variable capture

**Example:**
For the expression `x => x + y`, the free variable is `y` (since `x` is bound by the lambda).

### AST Traversal

Generic traversal utilities visit each node in an AST, allowing custom operations at each node type through a visitor pattern.

**Use cases:**
- Collecting information from AST
- Validating AST properties
- Custom transformations

## AST Transformation Utilities

### Generic Transformation

Utilities for applying transformations recursively to AST nodes.

**Purpose:**
- Apply transformation recursively to entire AST
- Used by optimization passes
- Preserves structure and location

**Example:**
Transformations can recursively apply operations like variable renaming throughout an AST.

### Mapping Over Children

Utility to transform only the direct children of a node (non-recursive).

**Purpose:**
- Transform direct children only (not recursive)
- Used for bottom-up transformations
- Efficient for single-level changes

## Substitution

### Variable Substitution

Utilities for replacing all occurrences of a variable with an expression.

**Purpose:**
- Replace all occurrences of a variable with an expression
- Used in beta reduction
- Used in let-binding expansion
- Respects variable shadowing

**Example:**
Substituting `y` for `x` in the expression `(x + 1)` produces `(y + 1)`.

### Capture-Avoiding Substitution

The substitution implementation avoids variable capture by respecting lambda-bound variables.

**Example:**
When substituting `y` for `x` in `x => x + outer_x`, the inner `x` is not substituted (it's bound by the lambda), but `outer_x` would be substituted if it matched. Result: `x => x + y`.

**Implementation:**
- Track bound variables during traversal
- Don't substitute bound variables
- Rename if necessary to avoid capture

## Fresh Variable Generation

### Fresh Variable Generation

Utilities for generating unique variable names to avoid collisions.

**Purpose:**
- Generate unique variable names
- Avoid name collisions
- Used during desugaring transformations

**Example:**
A fresh variable generator with prefix `$pipe` produces names like `$pipe0`, `$pipe1`, `$pipe2`, etc.

### Naming Conventions

Different prefixes for different transformations:

- `$pipe` - Pipe operator desugaring
- `$comp` - Composition operator desugaring
- `$block` - Block expression desugaring
- `$temp` - General temporary variables

**Benefits:**
- Clear origin in generated code
- Easy to identify synthetic variables
- Avoid collision with user variables (start with `$`)

### Usage in Transformations

Fresh variable generators are used during transformations to create temporary variables. For example, when desugaring `x |> f |> g`, a fresh variable like `$pipe0` might be created to hold intermediate results.

## Expression Equality

### Deep Equality Check

Utilities for checking if two AST nodes are structurally equal.

**Purpose:**
- Check if two AST nodes are structurally equal
- Used by optimizer (common subexpression elimination)
- Used in testing (output validation)

**Comparison:**
- Compares node types
- Compares all fields recursively
- Ignores locations (semantically irrelevant)

**Example:**
Two expressions `x + 1` are equal, but `x + 1` and `x + 2` are not.

### Alpha Equivalence

Utilities for checking equality up to variable renaming.

**Purpose:**
- Check equality up to variable renaming
- `x => x` equals `y => y` (same structure, different names)

**Used for:**
- Eta reduction optimization
- Testing with generated names

## Immutability Patterns

### Cloning AST Nodes

**Pattern:**
Create modified copies of nodes using object spread, preserving the original while changing specific fields.

**Example:**
When renaming a variable, create a new node with the updated name rather than mutating the original.

### Updating Nested Structures

**Pattern:**
Use nested object spread to update fields deep in a structure while preserving immutability.

**Example:**
Updating a lambda's body creates a new lambda object with the new body, leaving the original unchanged.

### Map/Set for Collections

Use immutable-style operations: create new collections rather than mutating existing ones. For example, adding to a Set creates a new Set including the new item, rather than modifying the original Set.

## Utility Organization

### Utils Module Structure

```
utils/
├── error.ts                # Error classes
├── ast-analysis.ts         # AST analysis (size, free vars)
├── ast-transform.ts        # AST transformation utilities
├── substitution.ts         # Variable substitution
├── expr-equality.ts        # Expression equality checking
└── index.ts               # Public API
```

### Import Pattern

Utilities are imported from the utils module index, providing a clean public API.

## Testing Cross-Cutting Utilities

### Test Organization

```
utils/
├── error.test.ts           # Error formatting tests
├── ast-analysis.test.ts    # Analysis utilities tests
├── ast-transform.test.ts   # Transformation utilities tests
├── substitution.test.ts    # Substitution tests
└── expr-equality.test.ts   # Equality tests
```

### Testing Substitution

```typescript
describe('substitute', () => {
  it('should replace variable occurrences', () => {
    const expr = /* x + x */;
    const result = substitute(expr, 'x', /* CoreInt(42) */);
    expect(result).toEqual(/* 42 + 42 */);
  });

  it('should avoid capture', () => {
    const expr = /* x => x + outer_x */;
    const result = substitute(expr, 'x', /* y */);
    // Inner 'x' should not be substituted
    expect(result).toEqual(/* x => x + y */);
  });
});
```

### Testing AST Equality

```typescript
describe('exprEquals', () => {
  it('should compare structurally equal expressions', () => {
    const e1 = /* x + 1 */;
    const e2 = /* x + 1 */;
    expect(exprEquals(e1, e2)).toBe(true);
  });

  it('should ignore locations', () => {
    const e1 = /* x at loc1 */;
    const e2 = /* x at loc2 */;
    expect(exprEquals(e1, e2)).toBe(true);
  });
});
```

## Performance Considerations

### AST Traversal

**Complexity:**
- Most utilities are O(n) where n is AST size
- Traversal visits each node once
- Acceptable for typical ASTs (thousands of nodes)

**Optimization:**
- Early termination when possible
- Avoid redundant traversals
- Cache results when appropriate

### Memory Usage

**Immutability overhead:**
- Creating new nodes requires allocation
- Trade-off: safety and simplicity vs memory
- Modern GC handles this well
- Acceptable for compiler workload

**Mitigation:**
- Don't clone unnecessarily
- Return original if no changes
- Use structural sharing (spread operator)

### Fresh Variable Generation

**Efficiency:**
- O(1) per variable generated
- Simple counter increment
- No collision detection needed (prefix ensures uniqueness)

## Common Patterns

### Error Handling Pattern

```typescript
function parseExpr(): Expr {
  if (unexpected condition) {
    throw new ParserError(
      'Clear description of what went wrong',
      location,
      'Helpful suggestion for fixing'
    );
  }
  // Normal path
}
```

### Location Preservation Pattern

```typescript
function transform(expr: SurfaceExpr): CoreExpr {
  return {
    type: 'CoreNodeType',
    // ... fields
    loc: expr.loc  // Always preserve location
  };
}
```

### AST Transformation Pattern

```typescript
function optimizeExpr(expr: CoreExpr): CoreExpr {
  // Check if transformation applies
  if (shouldTransform(expr)) {
    return {
      ...expr,
      // ... modified fields
    };
  }

  // Recurse into children
  return transformExpr(expr, optimizeExpr);
}
```

### Fresh Variable Pattern

```typescript
const gen = new FreshVarGen('$hint');
const temp = gen.fresh();
// Use temp in generated code
```

## Next Steps

Continue reading:

- **[06-extensibility.md](./06-extensibility.md)** - How to extend the compiler
- **[07-implementation-guide.md](./07-implementation-guide.md)** - Coding patterns and practices

---

**Last Updated:** 2025-11-23
