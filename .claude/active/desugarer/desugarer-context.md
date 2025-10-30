# Desugarer Implementation Context

**Created:** 2025-10-29
**Last Updated:** 2025-10-29

This document captures key context, files, and design decisions for the desugarer implementation.

---

## Key Files

### Files to Create

| File | Purpose |
|------|---------|
| `packages/core/src/types/core-ast.ts` | Core AST type definitions (CoreExpr, CorePattern, CoreDeclaration) |
| `packages/core/src/desugarer/desugarer.ts` | Main desugaring logic and transformation functions |
| `packages/core/src/desugarer/index.ts` | Public exports |
| `packages/core/src/desugarer/desugarer.test.ts` | Main desugarer tests |
| `packages/core/src/desugarer/blocks.test.ts` | Block desugaring tests |
| `packages/core/src/desugarer/lambdas.test.ts` | Lambda currying tests |
| `packages/core/src/desugarer/pipes.test.ts` | Pipe operator tests |
| `packages/core/src/desugarer/composition.test.ts` | Function composition tests |
| `packages/core/src/desugarer/lists.test.ts` | List literal and cons tests |
| `packages/core/src/desugarer/records.test.ts` | Record update tests |
| `packages/core/src/desugarer/conditionals.test.ts` | If-then-else tests |
| `packages/core/src/desugarer/patterns.test.ts` | Or-pattern tests |
| `packages/core/src/desugarer/integration.test.ts` | End-to-end integration tests |

### Files to Read/Reference

| File | Why |
|------|-----|
| `vibefun-spec.md` | Complete language specification with examples |
| `packages/core/src/types/ast.ts` | Surface AST types (input to desugarer) |
| `packages/core/src/parser/parser.ts` | Understanding what parser generates |
| `.claude/plans/compiler-architecture.md` | Overall compiler pipeline design |
| `.claude/plans/type-system.md` | Type system expectations |
| `.claude/CODING_STANDARDS.md` | Code style and testing requirements |

### Files to Update

| File | Change |
|------|--------|
| `packages/core/src/types/index.ts` | Export new core-ast types |
| `packages/core/src/index.ts` | Export desugarer module (if exposing publicly) |

---

## Design Decisions

### 1. Separate Core AST Type System ✅

**Decision:** Create distinct `CoreExpr`, `CorePattern`, `CoreDeclaration` types.

**Rationale:**
- Type safety: TypeScript enforces that only Core AST reaches type checker
- Clear boundaries between compiler phases
- Self-documenting code (Core types show language semantics)
- Easier to evolve surface syntax without affecting core

**Impact:**
- More code to maintain (separate type definitions)
- Need conversion/transformation functions
- Type checker works exclusively with Core types

### 2. If-Then-Else Desugars to Match ✅

**Decision:** Transform `if cond then a else b` → `match cond { | true => a | false => b }`

**Rationale:**
- Single conditional construct in core language
- Type checker only handles match
- Simpler code generation
- Suggested in compiler architecture document

**Impact:**
- Type checker doesn't need If case
- Code generator doesn't need If case
- More uniform language semantics

### 3. Record Updates Use Inline Spread ✅

**Decision:** Transform `{ record | field: value }` by explicitly copying all fields.

**Rationale:**
- No runtime helper dependencies
- Straightforward JavaScript object spread translation
- Type checker validates field existence

**Challenge:**
- May need type information to know all fields
- Initial approach: Generate spread pattern for JS to handle
- Can refine during type checker integration

**Impact:**
- More verbose Core AST for record updates
- No stdlib dependency

### 4. Complete Implementation Scope ✅

**Decision:** Implement all transformations in initial phase (not phased approach).

**Included:**
1. Block expressions
2. Lambda currying
3. Pipe operator
4. Function composition
5. List literals
6. List spread in expressions
7. List cons operator
8. List patterns
9. Record updates (pipe syntax only)
10. If-then-else
11. Or-patterns
12. Mutable references (pass through)
13. Type annotations (pass through)
14. Unsafe blocks (desugar contents)
15. External blocks (to multiple externals)
16. Module-level

**Rationale:**
- Complete desugaring phase before type checker work
- All transformations are well-understood
- Comprehensive test coverage from start

---

## Core Language Semantics

### What's "In" the Core Language

After desugaring, Core AST contains only:

**Expressions:**
- Literals: int, float, string, bool, unit
- Variables: identifiers
- Let bindings: `let x = expr in body` (single binding)
- Lambdas: `(x) => body` (single parameter)
- Applications: `f(x)`
- Match expressions: `match x { ... }` (only conditional)
- Records: `{ field: value, ... }`
- Record access: `record.field`
- Variants: `Cons(x, xs)`, `Some(x)`, `None`
- Binary operators: `+`, `-`, `*`, etc. (but NOT `|>` or `>>`)
- Unary operators: `-`, `!`
- Type annotations: `(expr : Type)`
- Unsafe blocks: `unsafe { ... }`

**Patterns:**
- Wildcard: `_`
- Variables: `x`
- Literals: `42`, `"hello"`, `true`
- Variants: `Some(x)`, `Cons(x, xs)`
- Records: `{ x, y }`
- Lists: `[x, ...rest]` (preserved for clarity)

**Declarations:**
- Let bindings: `let name = expr`
- Type declarations: `type Name<T> = ...`
- External declarations: `external name: Type = "js.path"`
- Imports: `import { ... } from "..."`

### What's "Out" (Eliminated by Desugaring)

❌ Multi-parameter lambdas: `(x, y) => body`
❌ Pipe operator: `a |> f |> g`
❌ Composition: `f >> g`, `f << g`
❌ List literals: `[1, 2, 3]`
❌ List spread in expressions: `[1, ...xs, 2]`
❌ List patterns: `[x, ...rest]` (desugared to Cons patterns)
❌ Cons operator: `x :: xs`
❌ Record updates: `{ record | field: value }`
❌ Block expressions: `{ stmt1; stmt2; expr }`
❌ If expressions: `if cond then a else b`
❌ Or-patterns: `"a" | "b" | "c"`

---

## Transformation Reference

Quick reference for each transformation:

| Surface Syntax | Core Syntax | Complexity |
|----------------|-------------|------------|
| `{ let x = 1; x + 1 }` | `let x = 1 in (x + 1)` | Low |
| `(x, y) => x + y` | `(x) => (y) => x + y` | Low |
| `a \|> f \|> g` | `g(f(a))` | Medium |
| `f >> g` | `(x) => g(f(x))` | Medium |
| `[1, 2, 3]` | `Cons(1, Cons(2, Cons(3, Nil)))` | Low |
| `[1, ...xs, 2]` | `Cons(1, concat(xs, Cons(2, Nil)))` | Medium |
| `x :: xs` | `Cons(x, xs)` | Low |
| `[x, ...rest]` (pattern) | `Cons(x, rest)` (pattern) | Low |
| `{ r \| f: v }` | `{ ...r, f: v }` (spread) | Medium |
| `if c then a else b` | `match c { true => a \| false => b }` | Low |
| `"a" \| "b" => x` | `"a" => x; "b" => x` | Medium |
| `let mut x = ...` | Pass through (preserve mutability) | Low |
| `(expr : Type)` | Pass through (preserve annotation) | Low |
| `unsafe { ... }` | Desugar contents, keep boundary | Low |
| `external { ... }` | Multiple separate externals | Low |

---

## Fresh Variable Generation

Generated code needs unique variable names:

**Use Cases:**
- Function composition: `(x) => g(f(x))` needs parameter name
- Complex desugaring: Temporary bindings

**Naming Convention:**
```
$<prefix><counter>
```

**Examples:**
- `$composed0`, `$composed1`
- `$tmp0`, `$tmp1`
- `$piped0`

**Implementation:**
```typescript
class FreshVarGen {
    private counter = 0;

    fresh(prefix: string = 'tmp'): string {
        return `$${prefix}${this.counter++}`;
    }
}
```

**Rationale:**
- `$` prefix avoids collision with user variables
- Counter guarantees uniqueness within module
- Descriptive prefix aids debugging

---

## Source Location Strategy

**Goal:** Preserve accurate source locations for error reporting.

**Rules:**

1. **Direct transformation:** Copy `loc` from source node
   ```typescript
   const coreNode: CoreLambda = {
       ...
       loc: lambdaNode.loc  // Copy source location
   };
   ```

2. **Generated nodes:** Use location of triggering construct
   ```typescript
   // When desugaring [1, 2, 3] to Cons chain
   const cons: CoreVariant = {
       kind: 'CoreVariant',
       name: 'Cons',
       args: [...],
       loc: listNode.loc  // Use list's location
   };
   ```

3. **Nested generated nodes:** Use parent's location or create span
   ```typescript
   // For deeply nested Cons in list literal
   // All Cons nodes can use the list's overall location
   ```

**Why This Matters:**
- Type errors point to right place in source
- Runtime errors trace back correctly
- Debugging shows original code location

---

## Testing Strategy

### Test Organization

Each transformation has dedicated test file for focused coverage:

```
desugarer/
├── desugarer.ts              # Implementation
├── desugarer.test.ts         # Basic tests, pass-through
├── blocks.test.ts            # Block → nested let
├── lambdas.test.ts           # Lambda currying
├── pipes.test.ts             # Pipe operator
├── composition.test.ts       # Function composition
├── lists.test.ts             # Lists & cons
├── records.test.ts           # Record updates
├── conditionals.test.ts      # If → match
├── patterns.test.ts          # Or-patterns
├── integration.test.ts       # End-to-end
└── index.ts                  # Exports
```

### Test Pattern

```typescript
describe('Feature Desugaring', () => {
    it('should handle basic case', () => {
        const input = /* construct AST */;
        const result = desugar(input);
        expect(result.kind).toBe('CoreXxx');
        // Assert transformation correct
    });

    it('should handle edge case', () => { ... });

    it('should preserve source locations', () => { ... });

    it('should handle nested cases', () => { ... });
});
```

### Coverage Requirements

- ✅ Minimum 95% code coverage
- ✅ All error paths tested
- ✅ All edge cases covered
- ✅ Source locations verified
- ✅ Integration tests for combined features

---

## Error Handling

### Error Types

```typescript
class DesugarError extends Error {
    constructor(
        message: string,
        public loc: SourceLocation,
        public hint?: string
    ) {
        super(message);
        this.name = 'DesugarError';
    }
}
```

### When to Error

Desugarer should error on:
1. Invalid AST nodes (indicates parser bug)
2. Impossible transformations (shouldn't happen with valid parse)
3. Internal consistency failures

Desugarer should NOT error on:
1. Type errors (that's type checker's job)
2. Exhaustiveness (that's type checker's job)
3. Semantic errors (that's type checker's job)

### Error Examples

```typescript
// Empty block (should be prevented by parser)
throw new DesugarError(
    'Empty block expression',
    block.loc,
    'Block must contain at least one expression'
);

// Unknown node type
throw new DesugarError(
    `Unknown expression kind: ${(expr as any).kind}`,
    expr.loc,
    'This may indicate a parser bug'
);
```

---

## Integration Points

### Input: Parser

Desugarer receives Surface AST from parser:

```typescript
import type { Module, Expr, Pattern, Declaration } from '../types/ast.js';

// Parser output
const surfaceAst: Module = parser.parse(source);

// Desugarer input
const coreAst = desugarModule(surfaceAst);
```

### Output: Type Checker

Desugarer produces Core AST for type checker:

```typescript
import type { CoreModule, CoreExpr } from '../types/core-ast.js';

// Desugarer output
const coreAst: CoreModule = desugarModule(surfaceAst);

// Type checker input
const typedAst = typeCheck(coreAst);
```

### Exports

```typescript
// packages/core/src/desugarer/index.ts
export { desugar, desugarPattern, desugarDecl, desugarModule } from './desugarer.js';
export { DesugarError } from './desugarer.js';
```

---

## Dependencies

### Internal Dependencies

- `packages/core/src/types/ast.ts` - Surface AST types
- `packages/core/src/types/core-ast.ts` - Core AST types (to be created)
- `packages/core/src/types/location.ts` - Source location types

### External Dependencies

- None (desugarer is pure transformation, no runtime dependencies)

### Test Dependencies

- `vitest` - Test framework
- Test utilities for constructing AST nodes

---

## Known Challenges

### 1. Record Update Without Type Info

**Challenge:** Cannot know all record fields without type information.

**Current Approach:** Generate spread syntax, let JavaScript handle it.

**Future Refinement:** May need to revisit during type checker integration if we need explicit field listing.

### 2. List Pattern Desugaring Decision ✅ RESOLVED

**Decision:** Desugar `[x, ...rest]` patterns to `CoreVariantPattern("Cons", [x, rest])` for uniformity.

**Rationale:** Type checker and code generator only need to handle variant patterns. Simpler and more consistent Core AST.

### 3. Source Location for Generated Code

**Challenge:** Deeply nested generated code (like Cons chains) needs locations.

**Approach:** Use original construct's location for all generated nodes. Source maps in code generator will handle JavaScript mapping.

### 4. Fresh Variable Collisions

**Challenge:** Generated variables might collide with user-defined names.

**Solution:** Prefix with `$` which is not allowed in user identifiers in vibefun.

---

## Performance Considerations

### Transformation Complexity

Most transformations are O(n) in AST size:
- Single pass over each node
- Recursive descent with no backtracking
- No expensive lookups

### Potential Optimizations (Future)

- Reuse immutable subtrees when possible
- Avoid copying nodes that don't need transformation
- Batch process sibling nodes

### Current Focus

**Don't optimize prematurely.** Focus on:
1. Correctness
2. Clear code
3. Comprehensive tests
4. Good error messages

Profile later if performance becomes an issue.

---

## Workflow

### Development Cycle

1. **Implement transformation** in `desugarer.ts`
2. **Write tests** in dedicated test file
3. **Run tests:** `npm test -w @vibefun/core`
4. **Type check:** `npm run check`
5. **Lint:** `npm run lint`
6. **Format:** `npm run format`

Or use: `npm run verify` (runs all checks)

### Commit Strategy

Commit after each phase:
- "feat(desugarer): implement core AST types"
- "feat(desugarer): implement block desugaring"
- "feat(desugarer): implement lambda currying"
- etc.

Keep commits focused and atomic.

---

## Future Work

### After Desugarer Complete

1. **Type checker integration**
   - Update type checker to work with Core AST
   - Test with desugared programs

2. **Code generator integration**
   - Generate JavaScript from Core AST
   - Test with desugared programs

3. **Error message quality**
   - Ensure error messages point to original source locations
   - Test error reporting through full pipeline

### Potential Enhancements

1. **Optimization passes**
   - Constant folding
   - Dead code elimination
   - Inline expansion

2. **Additional desugarings**
   - String interpolation (if added to language)
   - Operator sections (if added to language)
   - Do notation (if monadic syntax added)

---

## Resolved Design Questions

### List Spread in Expressions ✅

**Decision:** Support list spread in expressions (`[1, ...xs, 2]`)

**Implementation:**
- Add spread support to List AST node
- Desugar to cons chains with concat for multiple segments
- Simple spread at end just uses the spread value as tail

### Record Update Syntax ✅

**Decision:** Only support pipe syntax `{ record | field: value }`

**Rationale:**
- Single, clear syntax
- Remove spread syntax `{ ...record, field: value }` from spec
- Simpler parser and desugarer

### Mutable References ✅

**Decision:** Include as pass-through transformations in initial implementation

**Handling:**
- `Let` with `mutable: true` → `CoreLet` with `mutable: true`
- `RefAssign` and `Deref` operators preserved in Core AST
- Type checker needs mutability information

### External Blocks ✅

**Decision:** Desugar to multiple individual `CoreExternal` declarations

**Rationale:** Simpler Core AST, easier for type checker to process

---

## Questions & Answers

### Q: Why separate Core AST instead of reusing same types?

**A:** Type safety. TypeScript can enforce that only Core AST reaches type checker. Also clearer separation of concerns.

### Q: Why desugar if-then-else to match?

**A:** Single conditional construct in core language. Type checker and code generator only handle one case. More uniform semantics.

### Q: Why not use runtime helper for record updates?

**A:** Avoid runtime dependencies. Keep language implementation self-contained. JavaScript object spread handles it naturally.

### Q: Should desugarer validate exhaustiveness?

**A:** No. Desugarer is pure transformation. Type checker validates semantics including exhaustiveness.

### Q: What about type annotations in Core AST?

**A:** Preserve them. Type checker needs them for explicit annotations. They don't affect desugaring logic.

---

**Last Updated:** 2025-10-29 (Updated with gap analysis resolutions)
