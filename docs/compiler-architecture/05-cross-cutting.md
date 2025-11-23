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

**Features:**
- Extends JavaScript `Error` for stack traces
- Includes `Location` for source position
- Optional `hint` for suggestions
- Formatted message with source context

### Phase-Specific Errors

**LexerError:**
```typescript
throw new LexerError(
  'Unterminated string literal',
  currentLoc,
  'Add a closing quote'
);
```

**ParserError:**
```typescript
throw new ParserError(
  `Expected identifier, got ${token.type}`,
  token.loc,
  'Variable names must start with a letter or underscore'
);
```

**TypeError:**
```typescript
throw new TypeError(
  `Type mismatch: expected ${expected}, got ${actual}`,
  expr.loc,
  'Consider adding a type annotation'
);
```

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
```typescript
function desugarPipe(expr: SurfaceExpr): CoreExpr {
  if (expr.type === 'Pipe') {
    return {
      type: 'CoreApp',
      func: expr.right,
      arg: expr.left,
      loc: expr.loc  // Preserve original location
    };
  }
  return expr;
}
```

**When creating synthetic nodes:**
```typescript
// Use location from nearest real node
const syntheticVar: CoreExpr = {
  type: 'CoreVar',
  name: '$temp0',
  loc: originalExpr.loc  // Borrow location
};
```

### Location Utilities

**Merging locations (for nodes spanning multiple source nodes):**
```typescript
function mergeLocations(start: Location, end: Location): Location {
  return {
    file: start.file,
    line: start.line,
    column: start.column,
    offset: start.offset
    // Could also track end position if needed
  };
}
```

## AST Analysis Utilities

### AST Size Calculation

```typescript
function getASTSize(expr: CoreExpr): number
```

**Purpose:**
- Measure AST complexity
- Track optimization effectiveness
- Decide when to inline functions
- Prevent excessive code bloat

**Implementation:**
- Counts AST nodes recursively
- Used by optimizer to measure improvements

### Free Variables Analysis

```typescript
function getFreeVariables(expr: CoreExpr): Set<string>
```

**Purpose:**
- Identify variables used in expression
- Determine closure requirements
- Validate scope correctness
- Optimize variable capture

**Example:**
```typescript
// Expression: x => x + y
getFreeVariables(expr)  // Returns: Set{'y'}
// 'x' is bound, 'y' is free
```

### AST Traversal

**Generic traversal pattern:**
```typescript
function traverseExpr<T>(
  expr: CoreExpr,
  visitor: {
    onVar?: (name: string) => T,
    onLambda?: (param: string, body: CoreExpr) => T,
    onApp?: (func: CoreExpr, arg: CoreExpr) => T,
    // ... other node types
  }
): T
```

**Use cases:**
- Collecting information from AST
- Validating AST properties
- Custom transformations

## AST Transformation Utilities

### Generic Transformation

```typescript
function transformExpr(
  expr: CoreExpr,
  transform: (expr: CoreExpr) => CoreExpr
): CoreExpr
```

**Purpose:**
- Apply transformation recursively to entire AST
- Used by optimization passes
- Preserves structure and location

**Example:**
```typescript
// Replace all occurrences of a variable
const renamed = transformExpr(expr, e => {
  if (e.type === 'CoreVar' && e.name === 'oldName') {
    return { ...e, name: 'newName' };
  }
  return e;
});
```

### Mapping Over Children

```typescript
function mapChildren(
  expr: CoreExpr,
  mapper: (child: CoreExpr) => CoreExpr
): CoreExpr
```

**Purpose:**
- Transform direct children only (not recursive)
- Used for bottom-up transformations
- Efficient for single-level changes

## Substitution

### Variable Substitution

```typescript
function substitute(
  expr: CoreExpr,
  varName: string,
  replacement: CoreExpr
): CoreExpr
```

**Purpose:**
- Replace all occurrences of a variable with an expression
- Used in beta reduction
- Used in let-binding expansion
- Respects variable shadowing

**Example:**
```typescript
// Substitute y for x in (x + 1)
const expr = /* CoreApp(+, x, 1) */;
const result = substitute(expr, 'x', /* CoreVar(y) */);
// Result: (y + 1)
```

### Capture-Avoiding Substitution

The substitution implementation **avoids variable capture**:

```typescript
// Don't substitute under shadowing lambda
substitute(
  /* x => x + outer_x */,
  'x',
  /* y */
)
// Result: x => x + y (inner 'x' not substituted)
```

**Implementation:**
- Track bound variables during traversal
- Don't substitute bound variables
- Rename if necessary to avoid capture

## Fresh Variable Generation

### Fresh Variable Generation

```typescript
class FreshVarGen {
  constructor(private prefix: string = '$') {}

  fresh(hint?: string): string
}
```

**Purpose:**
- Generate unique variable names
- Avoid name collisions
- Used during desugaring transformations

**Example:**
```typescript
const gen = new FreshVarGen('$pipe');
gen.fresh();  // "$pipe0"
gen.fresh();  // "$pipe1"
gen.fresh();  // "$pipe2"
```

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

```typescript
const gen = new FreshVarGen('$pipe');

// Desugar: x |> f |> g
// To: let $pipe0 = f(x) in g($pipe0)
const temp = gen.fresh();
return {
  type: 'CoreLet',
  name: temp,
  value: /* f(x) */,
  body: /* g($pipe0) */,
  loc
};
```

## Expression Equality

### Deep Equality Check

```typescript
function exprEquals(expr1: CoreExpr, expr2: CoreExpr): boolean
```

**Purpose:**
- Check if two AST nodes are structurally equal
- Used by optimizer (common subexpression elimination)
- Used in testing (output validation)

**Comparison:**
- Compares node types
- Compares all fields recursively
- Ignores locations (semantically irrelevant)

**Example:**
```typescript
const e1 = /* x + 1 */;
const e2 = /* x + 1 */;
const e3 = /* x + 2 */;

exprEquals(e1, e2);  // true
exprEquals(e1, e3);  // false
```

### Alpha Equivalence

```typescript
function alphaEquals(expr1: CoreExpr, expr2: CoreExpr): boolean
```

**Purpose:**
- Check equality up to variable renaming
- `x => x` equals `y => y` (same structure, different names)

**Used for:**
- Eta reduction optimization
- Testing with generated names

## Immutability Patterns

### Cloning AST Nodes

**Pattern:**
```typescript
// Create modified copy (preserve original)
const modified = {
  ...original,
  field: newValue
};
```

**Example:**
```typescript
function renameVariable(expr: CoreExpr, oldName: string, newName: string): CoreExpr {
  if (expr.type === 'CoreVar' && expr.name === oldName) {
    return {
      ...expr,
      name: newName  // New node with changed name
    };
  }
  return expr;  // Return original if no change
}
```

### Updating Nested Structures

**Pattern:**
```typescript
// Update nested field
const updated = {
  ...parent,
  child: {
    ...parent.child,
    field: newValue
  }
};
```

**Example:**
```typescript
function updateLambdaBody(lambda: CoreLambda, newBody: CoreExpr): CoreLambda {
  return {
    ...lambda,
    body: newBody  // New lambda with new body
  };
}
```

### Map/Set for Collections

Use immutable-style operations:

```typescript
// Add to set (create new set)
const newSet = new Set([...oldSet, newItem]);

// Add to map (create new map)
const newMap = new Map([...oldMap, [key, value]]);

// Remove from map
const newMap = new Map(
  [...oldMap].filter(([k, v]) => k !== keyToRemove)
);
```

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

```typescript
// Import from utils index
import {
  VibefunError,
  TypeError,
  getASTSize,
  transformExpr,
  substitute
} from '../utils/index.js';
```

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
