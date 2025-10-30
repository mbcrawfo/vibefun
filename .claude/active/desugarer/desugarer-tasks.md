# Desugarer Implementation Tasks

**Created:** 2025-10-29
**Last Updated:** 2025-10-29

This document tracks implementation progress for the desugarer phase.

---

## Overall Progress

**Phases Completed:** 0 / 12 (0%)

**Status Legend:**
- 🔜 Not Started
- ⏳ In Progress
- ✅ Done

---

## Phase 1: Core AST Type System 🔜

**Status:** 🔜 Not Started
**Estimated Time:** 2-3 hours

### Tasks

- [ ] Create `packages/core/src/types/core-ast.ts`
- [ ] Define `CoreExpr` union type with all expression variants
- [ ] Define `CorePattern` union type with all pattern variants
- [ ] Define `CoreDeclaration` union type
- [ ] Define `CoreModule` type
- [ ] Add type guards: `isCoreExpr()`, `isCorePattern()`, etc.
- [ ] Add utility functions: `coreExprKind()`, `corePatternKind()`
- [ ] Add comprehensive JSDoc documentation to all types
- [ ] Export types through `packages/core/src/types/index.ts`
- [ ] Verify TypeScript compilation passes
- [ ] Verify exports work correctly

### Verification

```bash
npm run check
npm run build -w @vibefun/core
```

---

## Phase 2: Desugarer Foundation 🔜

**Status:** 🔜 Not Started
**Estimated Time:** 2 hours

### Tasks

- [ ] Create `packages/core/src/desugarer/` directory
- [ ] Create `packages/core/src/desugarer/desugarer.ts`
- [ ] Implement `desugar(expr: Expr): CoreExpr` skeleton
- [ ] Implement `desugarPattern(pattern: Pattern): CorePattern` skeleton
- [ ] Implement `desugarDecl(decl: Declaration): CoreDeclaration` skeleton
- [ ] Implement `desugarModule(module: Module): CoreModule` skeleton
- [ ] Add `FreshVarGen` class for generating unique variables
- [ ] Implement pass-through for literal expressions
- [ ] Implement pass-through for variable expressions
- [ ] Add `DesugarError` error class with source locations
- [ ] Create `packages/core/src/desugarer/index.ts` with exports
- [ ] Create `packages/core/src/desugarer/desugarer.test.ts`
- [ ] Write tests for pass-through cases (literals, vars)
- [ ] Write tests for error handling

### Verification

```bash
npm test -w @vibefun/core
npm run check
npm run lint
```

---

## Phase 3: Block Desugaring 🔜

**Status:** 🔜 Not Started
**Estimated Time:** 1.5 hours

### Tasks

- [ ] Implement block desugaring in `desugar()`
- [ ] Handle single-statement blocks
- [ ] Handle multi-statement blocks (nested lets)
- [ ] Handle blocks with only expression (no statements)
- [ ] Handle empty blocks (should error)
- [ ] Preserve source locations correctly
- [ ] Create `packages/core/src/desugarer/blocks.test.ts`
- [ ] Test single-statement block
- [ ] Test multi-statement block (2, 3, 4+ statements)
- [ ] Test nested blocks
- [ ] Test block with only expression
- [ ] Test empty block (error case)
- [ ] Test source location preservation

### Example

```vibefun
// Input:
{ let x = 10; let y = 20; x + y }

// Output:
let x = 10 in (let y = 20 in (x + y))
```

### Verification

```bash
npm test packages/core/src/desugarer/blocks.test.ts
```

---

## Phase 4: Lambda Currying 🔜

**Status:** 🔜 Not Started
**Estimated Time:** 1.5 hours

### Tasks

- [ ] Implement lambda currying in `desugar()`
- [ ] Handle single-parameter lambdas (pass through)
- [ ] Handle two-parameter lambdas
- [ ] Handle three+ parameter lambdas
- [ ] Handle nested lambdas correctly
- [ ] Preserve source locations
- [ ] Create `packages/core/src/desugarer/lambdas.test.ts`
- [ ] Test single-parameter (no transformation)
- [ ] Test two-parameter currying
- [ ] Test three-parameter currying
- [ ] Test four+ parameter currying
- [ ] Test nested lambdas
- [ ] Test lambda with complex body
- [ ] Test source location preservation

### Example

```vibefun
// Input:
(x, y, z) => x + y + z

// Output:
(x) => (y) => (z) => x + y + z
```

### Verification

```bash
npm test packages/core/src/desugarer/lambdas.test.ts
```

---

## Phase 5: Pipe Operator 🔜

**Status:** 🔜 Not Started
**Estimated Time:** 1.5 hours

### Tasks

- [ ] Implement pipe desugaring in `desugar()`
- [ ] Collect all stages in pipe chain
- [ ] Build nested applications right-to-left
- [ ] Handle two-stage pipes
- [ ] Handle multi-stage pipes (3+)
- [ ] Recursively desugar each stage
- [ ] Preserve source locations
- [ ] Create `packages/core/src/desugarer/pipes.test.ts`
- [ ] Test simple two-stage pipe
- [ ] Test three-stage pipe
- [ ] Test four+ stage pipe
- [ ] Test pipe with lambdas
- [ ] Test pipe with complex expressions
- [ ] Test source location preservation

### Example

```vibefun
// Input:
data |> filter(pred) |> map(f) |> sum

// Output:
sum(map(filter(data, pred), f))
```

### Verification

```bash
npm test packages/core/src/desugarer/pipes.test.ts
```

---

## Phase 6: Function Composition 🔜

**Status:** 🔜 Not Started
**Estimated Time:** 2 hours

### Tasks

- [ ] Implement forward composition (`>>`) desugaring
- [ ] Implement backward composition (`<<`) desugaring
- [ ] Generate fresh variable for composed function parameter
- [ ] Build application chain in correct order (forward)
- [ ] Build application chain in correct order (backward)
- [ ] Handle chains of 2+ compositions
- [ ] Preserve source locations
- [ ] Create `packages/core/src/desugarer/composition.test.ts`
- [ ] Test forward composition (`>>`) with 2 functions
- [ ] Test forward composition with 3+ functions
- [ ] Test backward composition (`<<`) with 2 functions
- [ ] Test backward composition with 3+ functions
- [ ] Test composition of lambdas
- [ ] Test composition with complex functions
- [ ] Test source location preservation

### Example

```vibefun
// Input:
f >> g >> h

// Output:
(x) => h(g(f(x)))

// Input:
f << g << h

// Output:
(x) => f(g(h(x)))
```

### Verification

```bash
npm test packages/core/src/desugarer/composition.test.ts
```

---

## Phase 7: List Desugaring 🔜

**Status:** 🔜 Not Started
**Estimated Time:** 1.5 hours

### Tasks

- [ ] Implement list literal desugaring in `desugar()`
- [ ] Implement list cons operator desugaring
- [ ] Handle empty lists (Nil)
- [ ] Handle single-element lists
- [ ] Handle multi-element lists (fold right)
- [ ] Handle cons operator (`::`)
- [ ] Handle nested lists
- [ ] Recursively desugar list elements
- [ ] Preserve source locations
- [ ] Create `packages/core/src/desugarer/lists.test.ts`
- [ ] Test empty list
- [ ] Test single-element list
- [ ] Test two-element list
- [ ] Test multi-element list (3+)
- [ ] Test cons operator
- [ ] Test chained cons operators
- [ ] Test nested lists
- [ ] Test lists with complex expressions
- [ ] Test source location preservation

### Example

```vibefun
// Input:
[1, 2, 3]

// Output:
Cons(1, Cons(2, Cons(3, Nil)))

// Input:
x :: xs

// Output:
Cons(x, xs)
```

### Verification

```bash
npm test packages/core/src/desugarer/lists.test.ts
```

---

## Phase 8: Record Update 🔜

**Status:** 🔜 Not Started
**Estimated Time:** 2 hours

### Tasks

- [ ] Implement record update desugaring in `desugar()`
- [ ] Handle single field update
- [ ] Handle multiple field updates
- [ ] Generate spread syntax or inline field copying
- [ ] Recursively desugar field values
- [ ] Handle nested record updates
- [ ] Preserve source locations
- [ ] Create `packages/core/src/desugarer/records.test.ts`
- [ ] Test single field update
- [ ] Test two field updates
- [ ] Test multiple field updates (3+)
- [ ] Test nested record updates
- [ ] Test update with complex expressions
- [ ] Test source location preservation

### Example

```vibefun
// Input:
{ person | age: 31, name: "Alice" }

// Output (conceptual):
{ name: "Alice", age: 31, address: person.address, ... }
```

### Verification

```bash
npm test packages/core/src/desugarer/records.test.ts
```

**Note:** May need refinement during type checker integration if we need explicit field knowledge.

---

## Phase 9: If-Then-Else 🔜

**Status:** 🔜 Not Started
**Estimated Time:** 1.5 hours

### Tasks

- [ ] Implement if-then-else desugaring in `desugar()`
- [ ] Create match expression with boolean patterns
- [ ] Create true case arm
- [ ] Create false case arm
- [ ] Recursively desugar condition
- [ ] Recursively desugar consequent
- [ ] Recursively desugar alternative
- [ ] Preserve source locations
- [ ] Create `packages/core/src/desugarer/conditionals.test.ts`
- [ ] Test simple if-then-else
- [ ] Test nested if expressions
- [ ] Test if with complex condition
- [ ] Test if with complex branches
- [ ] Test if in function body
- [ ] Test if as match arm body
- [ ] Test source location preservation

### Example

```vibefun
// Input:
if condition then consequent else alternative

// Output:
match condition {
    | true => consequent
    | false => alternative
}
```

### Verification

```bash
npm test packages/core/src/desugarer/conditionals.test.ts
```

---

## Phase 10: Or-Pattern Expansion 🔜

**Status:** 🔜 Not Started
**Estimated Time:** 2 hours

### Tasks

- [ ] Implement or-pattern expansion in `desugarPattern()`
- [ ] Extract all pattern alternatives from or-pattern
- [ ] Duplicate match arm for each alternative
- [ ] Handle guards correctly (duplicate to each arm)
- [ ] Handle two-alternative or-patterns
- [ ] Handle three+ alternative or-patterns
- [ ] Recursively desugar each alternative pattern
- [ ] Recursively desugar arm bodies
- [ ] Preserve source locations
- [ ] Create `packages/core/src/desugarer/patterns.test.ts`
- [ ] Test simple or-pattern (2 alternatives)
- [ ] Test three-alternative or-pattern
- [ ] Test or-pattern with guards
- [ ] Test multiple or-patterns in same match
- [ ] Test or-pattern with complex patterns
- [ ] Test source location preservation

### Example

```vibefun
// Input:
match x {
    | "a" | "b" | "c" => "vowel"
    | other => "consonant"
}

// Output:
match x {
    | "a" => "vowel"
    | "b" => "vowel"
    | "c" => "vowel"
    | other => "consonant"
}
```

### Verification

```bash
npm test packages/core/src/desugarer/patterns.test.ts
```

---

## Phase 11: Module-Level Desugaring 🔜

**Status:** 🔜 Not Started
**Estimated Time:** 1.5 hours

### Tasks

- [ ] Implement `desugarModule()` function
- [ ] Process all module declarations
- [ ] Desugar let binding declarations
- [ ] Pass through type declarations
- [ ] Pass through external declarations
- [ ] Pass through import declarations
- [ ] Handle modules with no declarations
- [ ] Handle modules with mixed declarations
- [ ] Add tests to `desugarer.test.ts` for module desugaring
- [ ] Test module with single let binding
- [ ] Test module with multiple let bindings
- [ ] Test module with type declarations
- [ ] Test module with external declarations
- [ ] Test module with imports
- [ ] Test module with all declaration types
- [ ] Test empty module

### Verification

```bash
npm test -w @vibefun/core
```

---

## Phase 12: Integration & Documentation 🔜

**Status:** 🔜 Not Started
**Estimated Time:** 3 hours

### Tasks

#### Integration Testing

- [ ] Create `packages/core/src/desugarer/integration.test.ts`
- [ ] Test multiple transformations in single expression
- [ ] Test block with curried lambda
- [ ] Test pipe with list literals
- [ ] Test composition with if-then-else
- [ ] Test complete programs from vibefun-spec.md
- [ ] Test list sum example
- [ ] Test factorial example (if applicable)
- [ ] Test all features combined
- [ ] Test complex real-world example

#### Documentation

- [ ] Add comprehensive JSDoc to all public functions
- [ ] Document each transformation with examples
- [ ] Document error conditions
- [ ] Document source location strategy
- [ ] Add usage examples in `desugarer.ts`
- [ ] Update `.claude/active/desugarer/desugarer-plan.md` with any changes
- [ ] Update `.claude/active/desugarer/desugarer-context.md` with lessons learned

#### Final Verification

- [ ] Run all tests: `npm test -w @vibefun/core`
- [ ] Verify test coverage ≥ 95%: `npm run test:coverage -w @vibefun/core`
- [ ] Run type checking: `npm run check`
- [ ] Run linting: `npm run lint`
- [ ] Run formatting: `npm run format`
- [ ] Run full verification: `npm run verify`

### Verification

```bash
npm run verify
npm run test:coverage -w @vibefun/core
```

---

## Final Checklist

Before marking desugarer implementation as complete:

- [ ] All 12 phases completed
- [ ] All tests passing
- [ ] Test coverage ≥ 95%
- [ ] Type checking passes (`npm run check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Code formatted (`npm run format`)
- [ ] All Core AST types documented
- [ ] All transformation functions documented
- [ ] Integration tests passing
- [ ] Error handling comprehensive
- [ ] Source locations preserved throughout
- [ ] Ready for type checker integration

---

## Notes & Decisions

### Phase-Specific Notes

_(Add notes here as you work through each phase)_

### Blockers

_(Document any blockers encountered during implementation)_

### Design Changes

_(Document any deviations from the original plan)_

---

## Time Tracking

| Phase | Estimated | Actual | Status |
|-------|-----------|--------|--------|
| Phase 1: Core AST | 2-3h | - | 🔜 |
| Phase 2: Foundation | 2h | - | 🔜 |
| Phase 3: Blocks | 1.5h | - | 🔜 |
| Phase 4: Lambdas | 1.5h | - | 🔜 |
| Phase 5: Pipes | 1.5h | - | 🔜 |
| Phase 6: Composition | 2h | - | 🔜 |
| Phase 7: Lists | 1.5h | - | 🔜 |
| Phase 8: Records | 2h | - | 🔜 |
| Phase 9: If-Else | 1.5h | - | 🔜 |
| Phase 10: Or-Patterns | 2h | - | 🔜 |
| Phase 11: Modules | 1.5h | - | 🔜 |
| Phase 12: Integration | 3h | - | 🔜 |
| **TOTAL** | **22-25h** | **-** | **0%** |

---

**Last Updated:** 2025-10-29
