# Optimizer Implementation Tasks

**Last Updated**: 2025-10-30

This document tracks all implementation tasks for the vibefun optimizer. Mark tasks complete as they are finished.

## Legend
- [ ] Not started
- [x] Completed
- 🔜 Blocked/Waiting
- ⏳ In progress

## Phase 1: Foundation & Infrastructure

**Goal**: Build core infrastructure that all optimization passes depend on.

**Status**: Not Started
**Estimated Complexity**: High (foundational work)

### Type Definitions

- [ ] Add `OptimizationLevel` enum to `src/types/` (O0, O1, O2)
- [ ] Add `OptimizerOptions` interface to `src/types/`
- [ ] Add `OptimizationMetrics` interface to `src/types/`
- [ ] Export optimizer types from `src/types/index.ts`

### Utility Functions

- [ ] Add AST visitor base utilities to `src/utils/`
  - [ ] `transformExpr(expr: CoreExpr, fn: Transformer): CoreExpr` - Bottom-up transformation
  - [ ] `foldExpr<T>(expr: CoreExpr, fn: Folder<T>): T` - Fold/reduce over AST
  - [ ] `visitExpr(expr: CoreExpr, fn: Visitor): void` - Traverse AST

- [ ] Add substitution utilities to `src/utils/`
  - [ ] `substitute(expr: CoreExpr, varName: string, replacement: CoreExpr): CoreExpr`
  - [ ] `freshen(varName: string, avoid: Set<string>): string` - Generate fresh variable name
  - [ ] `substituteMultiple(expr: CoreExpr, bindings: Map<string, CoreExpr>): CoreExpr`
  - [ ] Tests for capture-avoiding substitution

- [ ] Add free variable analysis to `src/utils/`
  - [ ] `freeVars(expr: CoreExpr): Set<string>` - Compute free variables
  - [ ] `boundVars(expr: CoreExpr): Set<string>` - Compute bound variables
  - [ ] Tests for nested scopes

- [ ] Add cost model utilities to `src/utils/`
  - [ ] `astSize(expr: CoreExpr): number` - Count AST nodes
  - [ ] `complexity(expr: CoreExpr): number` - Estimate complexity
  - [ ] `shouldInline(expr: CoreExpr, useCount: number, level: OptimizationLevel): boolean`
  - [ ] Tests for cost heuristics

- [ ] Add expression equivalence to `src/utils/`
  - [ ] `exprEquals(e1: CoreExpr, e2: CoreExpr): boolean` - Deep equality
  - [ ] `exprEquivalent(e1: CoreExpr, e2: CoreExpr): boolean` - Semantic equivalence
  - [ ] Tests for structural equality

- [ ] Export all utility functions from `src/utils/index.ts`

### Optimizer Infrastructure

- [ ] Create `packages/core/src/optimizer/` directory
- [ ] Create `packages/core/src/optimizer/optimization-pass.ts`
  - [ ] Define `OptimizationPass` abstract base class
  - [ ] Method: `abstract transform(expr: CoreExpr): CoreExpr`
  - [ ] Method: `abstract name: string`
  - [ ] Tests for base class

- [ ] Create `packages/core/src/optimizer/optimizer.ts`
  - [ ] Define `Optimizer` class
  - [ ] Constructor: Accept optimization level
  - [ ] Method: `optimize(expr: CoreExpr): CoreExpr` - Main entry point
  - [ ] Method: `addPass(pass: OptimizationPass): void` - Register pass
  - [ ] Fixed-point iteration logic
  - [ ] Optimization metrics collection
  - [ ] Tests for pipeline orchestration

- [ ] Create `packages/core/src/optimizer/passes/` directory

- [ ] Create `packages/core/src/optimizer/index.ts`
  - [ ] Export `Optimizer` class
  - [ ] Export all optimization passes (as they're created)
  - [ ] Export types (re-export from src/types)

### Validation

- [ ] Run `npm run check` - Type checking must pass
- [ ] Run `npm run lint` - Linting must pass
- [ ] Run `npm test` - All tests must pass
- [ ] Run `npm run format` - Code must be formatted
- [ ] Verify 90%+ test coverage for Phase 1 code

---

## Phase 2: Basic Optimizations (Part 1)

**Goal**: Implement constant folding and beta reduction.

**Status**: Not Started
**Estimated Complexity**: Medium

### Constant Folding Pass

- [ ] Create `packages/core/src/optimizer/passes/constant-folding.ts`
- [ ] Implement `ConstantFoldingPass extends OptimizationPass`
- [ ] Fold integer arithmetic: +, -, *, /, %
- [ ] Fold float arithmetic: +, -, *, /
- [ ] Fold boolean operations: &&, ||, not
- [ ] Fold string concatenation: &
- [ ] Fold comparison operators: ==, !=, <, >, <=, >=
- [ ] Algebraic simplifications:
  - [ ] x + 0 → x, 0 + x → x
  - [ ] x - 0 → x
  - [ ] x * 0 → 0, 0 * x → 0
  - [ ] x * 1 → x, 1 * x → x
  - [ ] x / 1 → x
  - [ ] x && true → x, true && x → x
  - [ ] x && false → false, false && x → false
  - [ ] x || true → true, true || x → true
  - [ ] x || false → x, false || x → x
- [ ] Handle edge cases:
  - [ ] Don't fold division by zero (keep as runtime error)
  - [ ] Handle NaN and Infinity correctly
  - [ ] Handle integer overflow (JavaScript limits)

### Constant Folding Tests

- [ ] Create `constant-folding.test.ts`
- [ ] Test: Integer addition fold
- [ ] Test: Integer subtraction fold
- [ ] Test: Integer multiplication fold
- [ ] Test: Integer division fold (including by zero)
- [ ] Test: Float operations fold
- [ ] Test: Boolean operations fold
- [ ] Test: String concatenation fold
- [ ] Test: Comparison operators fold
- [ ] Test: Nested operations fold
- [ ] Test: Each algebraic simplification
- [ ] Test: Edge cases (overflow, NaN, Infinity)
- [ ] Test: Type preservation
- [ ] Test: Source location preservation

### Beta Reduction Pass

- [ ] Create `packages/core/src/optimizer/passes/beta-reduction.ts`
- [ ] Implement `BetaReductionPass extends OptimizationPass`
- [ ] Detect pattern: `CoreApp(CoreLambda(param, body), arg)`
- [ ] Perform capture-avoiding substitution
- [ ] Handle nested applications: `f(a)(b)` → reduce incrementally
- [ ] Handle multiple parameters (curried functions)
- [ ] Preserve type annotations during substitution
- [ ] Preserve source locations

### Beta Reduction Tests

- [ ] Create `beta-reduction.test.ts`
- [ ] Test: Simple beta reduction `((x) => x + 1)(5)`
- [ ] Test: Beta reduction with variable substitution
- [ ] Test: Capture avoidance (shadowed variables)
- [ ] Test: Nested applications `((x) => (y) => x + y)(1)(2)`
- [ ] Test: Free variable preservation
- [ ] Test: Complex body expressions
- [ ] Test: Type preservation
- [ ] Test: Source location preservation
- [ ] Test: Don't reduce if unsafe (side effects in arg)

### Integration

- [ ] Register `ConstantFoldingPass` in Optimizer
- [ ] Register `BetaReductionPass` in Optimizer
- [ ] Test: Both passes work together
- [ ] Test: Constant fold after beta reduce enables more folding

### Validation

- [ ] Run `npm run check`
- [ ] Run `npm run lint`
- [ ] Run `npm test`
- [ ] Run `npm run format`
- [ ] Verify 90%+ test coverage for Phase 2 code

---

## Phase 3: Basic Optimizations (Part 2)

**Goal**: Implement inlining and dead code elimination.

**Status**: Not Started
**Estimated Complexity**: Medium-High

### Inline Expansion Pass

- [ ] Create `packages/core/src/optimizer/passes/inline.ts`
- [ ] Implement `InlineExpansionPass extends OptimizationPass`
- [ ] Detect inlining candidates:
  - [ ] Small functions (use cost model)
  - [ ] Single-use let bindings
  - [ ] Non-recursive functions
- [ ] Perform inlining (substitute function body)
- [ ] Track variable usage counts
- [ ] Respect optimization level (different thresholds for O1 vs O2)
- [ ] Don't inline recursive functions
- [ ] Don't inline if contains unsafe blocks
- [ ] Don't inline external functions

### Inline Expansion Tests

- [ ] Create `inline.test.ts`
- [ ] Test: Inline small function
- [ ] Test: Inline single-use let binding
- [ ] Test: Don't inline large function
- [ ] Test: Don't inline recursive function
- [ ] Test: Don't inline multi-use function (O1)
- [ ] Test: Inline multi-use if small enough (O2)
- [ ] Test: Cost model correctness
- [ ] Test: Type preservation
- [ ] Test: Source location preservation
- [ ] Test: Inlining enables further optimizations

### Dead Code Elimination Pass

- [ ] Create `packages/core/src/optimizer/passes/dead-code-elim.ts`
- [ ] Implement `DeadCodeEliminationPass extends OptimizationPass`
- [ ] Eliminate unused let bindings (use free variable analysis)
- [ ] Eliminate unreachable match branches:
  - [ ] Match on known boolean: `match true { True => e1, False => e2 }` → `e1`
  - [ ] Match on known variant constructor
  - [ ] Detect unreachable patterns
- [ ] Eliminate code after proven control flow changes
- [ ] Preserve side effects (don't eliminate unsafe blocks)

### Dead Code Elimination Tests

- [ ] Create `dead-code-elim.test.ts`
- [ ] Test: Remove unused let binding
- [ ] Test: Keep used let binding
- [ ] Test: Remove unreachable match branch (known boolean)
- [ ] Test: Remove unreachable match branch (known constructor)
- [ ] Test: Remove shadowed dead bindings
- [ ] Test: Don't remove bindings with side effects (unsafe)
- [ ] Test: Type preservation
- [ ] Test: Source location preservation
- [ ] Test: Integration with constant folding

### Integration

- [ ] Register `InlineExpansionPass` in Optimizer
- [ ] Register `DeadCodeEliminationPass` in Optimizer
- [ ] Test: All four passes work together
- [ ] Test: Fixed-point iteration converges
- [ ] Test: Optimization cascade (inline → const fold → dead code)

### Validation

- [ ] Run `npm run check`
- [ ] Run `npm run lint`
- [ ] Run `npm test`
- [ ] Run `npm run format`
- [ ] Verify 90%+ test coverage for Phase 3 code

---

## Phase 4: Advanced Optimizations (Part 1)

**Goal**: Implement eta reduction and pattern match optimization.

**Status**: Not Started
**Estimated Complexity**: High

### Eta Reduction Pass

- [ ] Create `packages/core/src/optimizer/passes/eta-reduction.ts`
- [ ] Implement `EtaReductionPass extends OptimizationPass`
- [ ] Detect pattern: `CoreLambda(param, CoreApp(f, CoreVar(param)))`
- [ ] Verify param not free in f (safety check)
- [ ] Reduce to f (eliminate lambda)
- [ ] Handle multi-parameter eta expansions
- [ ] Preserve type annotations

### Eta Reduction Tests

- [ ] Create `eta-reduction.test.ts`
- [ ] Test: Simple eta reduction `(x) => f(x)` → `f`
- [ ] Test: Don't reduce if param free in f
- [ ] Test: Multi-parameter eta expansion
- [ ] Test: Eta reduction in nested contexts
- [ ] Test: Type preservation
- [ ] Test: Source location preservation
- [ ] Test: Integration with other passes

### Pattern Match Optimization Pass

- [ ] Create `packages/core/src/optimizer/passes/pattern-opt.ts`
- [ ] Implement `PatternMatchOptimizationPass extends OptimizationPass`
- [ ] Case reordering:
  - [ ] Move literal patterns before variable patterns
  - [ ] Move constructor patterns before wildcard patterns
  - [ ] Detect and remove redundant wildcards
- [ ] Decision tree generation:
  - [ ] Convert sequential matching to decision tree
  - [ ] Optimize common pattern sequences
- [ ] Optimize matches on known values:
  - [ ] Match on literal: reduce to matching branch
  - [ ] Match on known constructor: reduce to matching branch
- [ ] Jump table generation (for literal patterns)

### Pattern Match Optimization Tests

- [ ] Create `pattern-opt.test.ts`
- [ ] Test: Reorder literal before variable pattern
- [ ] Test: Remove unreachable patterns
- [ ] Test: Optimize match on known value
- [ ] Test: Decision tree generation
- [ ] Test: Jump table for integer literals
- [ ] Test: Complex nested patterns
- [ ] Test: Exhaustiveness preserved
- [ ] Test: Type preservation
- [ ] Test: Source location preservation

### Integration

- [ ] Register `EtaReductionPass` in Optimizer
- [ ] Register `PatternMatchOptimizationPass` in Optimizer
- [ ] Test: All six passes work together
- [ ] Test: Optimization quality improves with all passes

### Validation

- [ ] Run `npm run check`
- [ ] Run `npm run lint`
- [ ] Run `npm test`
- [ ] Run `npm run format`
- [ ] Verify 90%+ test coverage for Phase 4 code

---

## Phase 5: Advanced Optimizations (Part 2)

**Goal**: Implement CSE, metrics, and optimization levels.

**Status**: Not Started
**Estimated Complexity**: Medium-High

### Common Subexpression Elimination Pass

- [ ] Create `packages/core/src/optimizer/passes/cse.ts`
- [ ] Implement `CSEPass extends OptimizationPass`
- [ ] Identify duplicate pure expressions (use expression equivalence)
- [ ] Build equivalence classes
- [ ] Hoist common subexpressions to let bindings
- [ ] Only consider pure expressions (no unsafe, no external, no ref ops)
- [ ] Respect scope (don't move expressions across lambda boundaries incorrectly)

### CSE Tests

- [ ] Create `cse.test.ts`
- [ ] Test: Eliminate duplicate arithmetic expressions
- [ ] Test: Eliminate duplicate function calls (pure)
- [ ] Test: Eliminate duplicate record accesses
- [ ] Test: Don't eliminate expressions with side effects
- [ ] Test: Don't eliminate external function calls
- [ ] Test: Scope correctness
- [ ] Test: Type preservation
- [ ] Test: Source location preservation
- [ ] Test: CSE enables further optimizations

### Optimization Metrics

- [ ] Implement metrics collection in `Optimizer` class
- [ ] Track: Number of each optimization applied
- [ ] Track: Iterations to fixed point
- [ ] Track: AST size before/after
- [ ] Track: Compilation time
- [ ] Add method: `getMetrics(): OptimizationMetrics`

### Optimization Levels Implementation

- [ ] Implement O0 (no optimization):
  - [ ] Pass-through (return input unchanged)
  - [ ] Zero overhead

- [ ] Implement O1 (basic optimization):
  - [ ] Constant folding
  - [ ] Beta reduction
  - [ ] Dead code elimination
  - [ ] Single iteration (fast)

- [ ] Implement O2 (aggressive optimization):
  - [ ] All passes enabled
  - [ ] Fixed-point iteration (until convergence)
  - [ ] More aggressive inlining thresholds

### Tests for Optimization Levels

- [ ] Test: O0 returns input unchanged
- [ ] Test: O1 applies basic optimizations
- [ ] Test: O2 applies all optimizations
- [ ] Test: O2 performs more iterations than O1
- [ ] Test: O1 is faster than O2
- [ ] Test: O2 produces smaller AST than O1

### Integration

- [ ] Register `CSEPass` in Optimizer
- [ ] Test: All seven passes work together
- [ ] Test: Metrics are collected correctly
- [ ] Test: Optimization levels work as expected
- [ ] Test: Complex programs optimize correctly

### Validation

- [ ] Run `npm run check`
- [ ] Run `npm run lint`
- [ ] Run `npm test`
- [ ] Run `npm run format`
- [ ] Verify 90%+ test coverage for Phase 5 code

---

## Phase 6: Integration Documentation & Polish

**Goal**: Document integration, create comprehensive tests, add examples.

**Status**: Not Started
**Estimated Complexity**: Medium

### CLI Integration Documentation

- [ ] Document CLI flags in optimizer docs:
  - [ ] `-O0, --optimize=0` - No optimization (default)
  - [ ] `-O1, --optimize=1` - Basic optimization
  - [ ] `-O2, --optimize=2` - Aggressive optimization
- [ ] Document CLI usage examples
- [ ] Document how CLI will parse and pass optimization level
- [ ] Note: Implementation deferred (CLI not built yet)

### Pipeline Integration Documentation

- [ ] Document optimizer position in pipeline (after type checker)
- [ ] Document input/output types (Typed Core AST → Typed Core AST)
- [ ] Document integration steps for future implementation
- [ ] Create API documentation for programmatic use
- [ ] Document optimization pipeline architecture
- [ ] Note: Implementation deferred (pipeline not built yet)

### Comprehensive Documentation

- [ ] Write optimizer module README
- [ ] Document each optimization pass in detail
- [ ] Add JSDoc to all public functions
- [ ] Document optimization levels and when to use each
- [ ] Document metrics and how to interpret them
- [ ] Add architecture diagrams (if helpful)

### Integration Tests

- [ ] Create `optimizer.integration.test.ts`
- [ ] Test: Full pipeline (all passes, multiple iterations)
- [ ] Test: Complex nested expressions
- [ ] Test: Large example programs
- [ ] Test: Optimization convergence
- [ ] Test: Type preservation across all passes
- [ ] Test: Source location preservation across all passes
- [ ] Test: Semantic preservation (before/after equivalence)

### Example Programs

- [ ] Create `examples/optimizer/` directory
- [ ] Example: Fibonacci (show recursion handling)
- [ ] Example: List operations (show pipeline optimizations)
- [ ] Example: Pattern matching (show pattern opt)
- [ ] Example: Higher-order functions (show inlining + beta reduction)
- [ ] Example: Nested let bindings (show dead code elim)
- [ ] For each example:
  - [ ] Show input AST
  - [ ] Show optimized AST (at each level)
  - [ ] Show metrics
  - [ ] Explain optimizations applied

### Benchmarking

- [ ] Create benchmark suite
- [ ] Measure compilation time for different levels
- [ ] Measure AST size reduction
- [ ] Measure iterations to convergence
- [ ] Document performance characteristics

### Final Polish

- [ ] Code review checklist:
  - [ ] No `any` types used
  - [ ] All functions have return types
  - [ ] All public APIs documented
  - [ ] Consistent naming conventions
  - [ ] Error messages are helpful
- [ ] Refactor any complex functions
- [ ] Add TODO comments for future enhancements
- [ ] Update main CLAUDE.md with optimizer section

### Final Validation

- [ ] Run `npm run verify` - All checks pass
- [ ] Run `npm test` with coverage - >90% coverage
- [ ] Manual testing with example programs
- [ ] Review all documentation for completeness
- [ ] Verify all Phase 6 deliverables complete

---

## Future Enhancements (Post-Phase 6)

These are potential future optimizations, not required for initial implementation:

- [ ] **List Fusion**: Combine multiple list operations (map, filter) into single pass
- [ ] **Deforestation**: Eliminate intermediate data structures
- [ ] **Monomorphization**: Specialize polymorphic functions for specific types
- [ ] **Tail Call Optimization**: Convert tail-recursive functions to loops (limited by JS)
- [ ] **Unboxing**: Avoid boxing/unboxing for known numeric types
- [ ] **Record Specialization**: Optimize records with known shapes
- [ ] **Loop Fusion**: Combine multiple loops over same data
- [ ] **Strictness Analysis**: Identify strict functions for evaluation optimization

---

## Summary Statistics

**Total Tasks**: ~200+
**Phases**: 6
**Test Files**: 7 main pass tests + integration tests + utilities tests
**Documentation Files**: CLI guide, pipeline guide, module README, examples

**Phases Completed**: 0/6
**Overall Progress**: 0%
