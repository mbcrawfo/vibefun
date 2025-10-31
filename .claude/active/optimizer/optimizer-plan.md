# Vibefun Optimizer Implementation Plan

**Last Updated**: 2025-10-30

## Overview

Implement a multi-pass optimizer that transforms Typed Core AST into optimized Typed Core AST while preserving semantics, types, and source locations. The optimizer will be built in isolation and focus on functional programming patterns common in vibefun.

## Architecture

### Optimizer Module Structure

```
packages/core/src/optimizer/
├── index.ts                    # Public API exports
├── optimizer.ts                # Main optimizer class & pipeline
├── optimization-pass.ts        # Base class for optimization passes
└── passes/
    ├── constant-folding.ts     # Fold constants, propagate values
    ├── beta-reduction.ts       # Simplify lambda applications
    ├── eta-reduction.ts        # Simplify eta-expansions
    ├── inline.ts               # Inline functions and let bindings
    ├── dead-code-elim.ts       # Remove unreachable code
    ├── pattern-opt.ts          # Optimize pattern matching
    └── cse.ts                  # Common subexpression elimination
```

**Design Note**: The optimizer reuses existing infrastructure:
- Types defined in `src/types/` (OptimizerOptions, OptimizationLevel, OptimizationMetrics)
- Utilities in `src/utils/` (AST traversal, substitution, analysis)

### Shared Utilities (to be added to src/utils/)

- **AST Visitor**: Generic traversal and transformation for Core AST
- **Substitution**: Capture-avoiding variable substitution
- **Free Variable Analysis**: Compute free variables in expressions
- **Cost Model**: Heuristics for inlining decisions (AST size, complexity)

## Implementation Phases

### Phase 1: Foundation & Infrastructure

Build the core infrastructure that all optimization passes depend on.

**Tasks:**
1. Add optimizer types to `src/types/`
2. Create base `OptimizationPass` abstract class
3. Add AST visitor utilities to `src/utils/`
4. Add substitution utilities to `src/utils/`
5. Add analysis utilities to `src/utils/`
6. Create main `Optimizer` class with pipeline
7. Create `optimizer/index.ts` for exports
8. Validate with `npm run verify`

**Deliverables:**
- Type definitions for optimizer configuration and metrics
- Reusable AST transformation infrastructure
- Base class defining optimization pass interface
- Working optimizer pipeline (even if empty)

### Phase 2: Basic Optimizations (Part 1)

Implement foundational optimizations that provide immediate value.

**Tasks:**
9. Implement `ConstantFolding` pass with comprehensive tests
10. Implement `BetaReduction` pass with comprehensive tests
11. Validate with `npm run verify`

**Deliverables:**
- Constant folding for Int, Float, Bool, String operations
- Algebraic simplifications (x + 0, x * 1, etc.)
- Beta reduction for immediate lambda applications
- Full test coverage for both passes

### Phase 3: Basic Optimizations (Part 2)

Add more fundamental optimizations.

**Tasks:**
12. Implement `InlineExpansion` pass with tests
13. Implement `DeadCodeElimination` pass with tests
14. Validate with `npm run verify`

**Deliverables:**
- Inlining with cost model
- Dead code elimination for unreachable branches
- Tests demonstrating optimization effectiveness

### Phase 4: Advanced Optimizations (Part 1)

Implement more sophisticated optimizations.

**Tasks:**
15. Implement `EtaReduction` pass with tests
16. Implement `PatternMatchOptimization` pass with tests
17. Validate with `npm run verify`

**Deliverables:**
- Eta reduction for point-free style
- Pattern match optimization with decision trees
- Tests for complex patterns

### Phase 5: Advanced Optimizations (Part 2)

Complete the optimization suite.

**Tasks:**
18. Implement `CommonSubexpressionElimination` pass with tests
19. Add optimization metrics/statistics tracking
20. Add optimization level configuration (O0, O1, O2)
21. Validate with `npm run verify`

**Deliverables:**
- CSE pass with expression equivalence
- Optimization statistics
- Configurable optimization levels

### Phase 6: Integration Documentation & Polish

Document integration points and finalize implementation.

**Tasks:**
22. Document CLI integration (how `--optimize` flag will work)
23. Document pipeline integration (where optimizer sits)
24. Write comprehensive optimizer documentation
25. Add integration tests (multiple passes together)
26. Add benchmark/example programs
27. Final validation with `npm run verify`

**Deliverables:**
- Complete documentation of optimizer
- Integration guide for CLI (future)
- Integration guide for pipeline (future)
- Benchmarks showing optimization impact

## Key Optimizations Explained

### 1. Constant Folding

Evaluate constant expressions at compile time.

**Examples:**
- `1 + 2` → `3`
- `"hello" & " world"` → `"hello world"`
- `true && false` → `false`
- `x + 0` → `x` (algebraic simplification)
- `x * 1` → `x`
- `x * 0` → `0`

**Implementation:**
- Pattern match on `CoreBinOp`, `CoreUnaryOp` with literal operands
- Evaluate operations and replace with result literals
- Handle integer overflow, division by zero appropriately

### 2. Beta Reduction

Simplify immediate lambda applications by substitution.

**Example:**
- `((x) => x + 1)(5)` → `5 + 1` → `6`

**Implementation:**
- Detect `CoreApp(CoreLambda(param, body), arg)`
- Perform capture-avoiding substitution: `body[param := arg]`
- Critical for code generated by desugarer (pipes, composition)

### 3. Inline Expansion

Replace function calls with function bodies for small, pure functions.

**Example:**
```
let inc = (x) => x + 1
let y = inc(5)
```
Becomes:
```
let y = 5 + 1  // Then constant folds to 6
```

**Heuristics:**
- Inline if function body is small (AST node count < threshold)
- Inline if function is used only once
- Don't inline recursive functions
- Don't inline if would duplicate side effects

### 4. Dead Code Elimination

Remove unreachable code and unused bindings.

**Examples:**
- Match on known value: `match true { True => e1, False => e2 }` → `e1`
- Unused let binding: `let x = expr in body` → `body` (if x unused in body)
- Unreachable after control flow

**Implementation:**
- Use liveness analysis to find unused variables
- Use constant propagation to find determined control flow
- Remove provably unreachable branches

### 5. Eta Reduction

Simplify eta-expansions to point-free style.

**Example:**
- `(x) => f(x)` → `f` (when x not free in f)

**Implementation:**
- Detect `CoreLambda(param, CoreApp(f, CoreVar(param)))`
- Check that param is not free in f
- Replace with f

### 6. Pattern Match Optimization

Convert pattern matches to efficient decision trees.

**Optimizations:**
- Reorder cases: literals before variables, constructors before wildcards
- Eliminate redundant checks
- Combine similar branches
- Generate jump tables for literal matches

**Example:**
```
match x {
  | _ => e1
  | Some(y) => e2
}
```
The wildcard case always matches first, making Some case unreachable.
Optimize by removing unreachable branch.

### 7. Common Subexpression Elimination

Eliminate duplicate computations.

**Example:**
```
let a = x + y
let b = x + y
```
Becomes:
```
let a = x + y
let b = a
```

**Implementation:**
- Build equivalence classes of expressions
- Identify duplicates
- Hoist to let bindings
- Only for pure expressions (no side effects)

## Optimization Levels

### -O0: No Optimization (Default)
- Disabled for debugging
- Fastest compilation
- Easiest to debug generated code

### -O1: Basic Optimizations
Enables:
- Constant folding
- Beta reduction
- Dead code elimination
- Single pass

**Use Case**: Development builds, reasonable performance

### -O2: Aggressive Optimizations
Enables:
- All optimization passes
- Multiple iterations until fixed point
- More aggressive inlining thresholds

**Use Case**: Production builds, maximum performance

## Testing Strategy

### Test Requirements

- Each pass has colocated test file (e.g., `constant-folding.test.ts`)
- Minimum 90% code coverage per module
- All quality checks pass: `npm run verify`

### Test Categories

**1. Correctness Tests (Semantic Preservation)**
- Verify optimized AST has same behavior as input
- Verify types are preserved (well-typedness maintained)
- Verify source locations preserved

**2. Transformation Tests**
- Verify optimizations actually occur
- Verify expected transformations happen
- Verify fixed-point convergence

**3. Edge Case Tests**
- Variable shadowing
- Capture avoidance
- Recursive functions
- Complex nested patterns
- Boundary conditions

**4. Safety Tests**
- Don't inline when unsafe
- Don't break variable scoping
- Conservative with external functions
- Conservative with unsafe blocks
- Respect type system

**5. Integration Tests**
- Multiple passes work together
- Pass ordering doesn't break semantics
- Optimization levels work correctly

### Example Test Structure

```typescript
describe('ConstantFolding', () => {
  describe('integer arithmetic', () => {
    it('should fold addition', () => {
      const input = CoreBinOp(Plus, CoreIntLit(1), CoreIntLit(2));
      const expected = CoreIntLit(3);
      const result = constantFold(input);
      expect(result).toEqual(expected);
    });

    it('should fold nested operations', () => {
      // (1 + 2) * 3 → 3 * 3 → 9
    });
  });

  describe('algebraic simplifications', () => {
    it('should simplify x + 0 to x', () => {
      const input = CoreBinOp(Plus, CoreVar("x"), CoreIntLit(0));
      const expected = CoreVar("x");
      const result = constantFold(input);
      expect(result).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('should handle integer overflow gracefully', () => {
      // Test MAX_SAFE_INTEGER overflow behavior
    });

    it('should not fold division by zero', () => {
      // Division by zero should remain as runtime error
    });
  });
});
```

## Quality Checks

After each phase, run:

```bash
npm run verify  # Runs all checks
```

Individual checks:
- `npm run check` - TypeScript type checking
- `npm run lint` - ESLint
- `npm test` - Vitest with coverage
- `npm run format` - Prettier

## Future Integration Points

### CLI Integration (Documentation Only - No Implementation Yet)

The CLI will support optimization flags:

```bash
vibefun compile src/main.vf -O0          # No optimization (default)
vibefun compile src/main.vf -O1          # Basic optimization
vibefun compile src/main.vf -O2          # Aggressive optimization
vibefun compile src/main.vf --optimize=2 # Alternative syntax
```

**CLI Changes Needed** (future work):
1. Add `-O, --optimize <level>` flag to compile command
2. Parse optimization level (0, 1, 2)
3. Pass to compiler pipeline
4. Default to -O0 for development

### Pipeline Integration (Documentation Only - No Implementation Yet)

The optimizer will fit between type checker and code generator:

```
Current State (Isolated Components):
┌──────┐   ┌────────┐   ┌───────────┐   ┌──────────────┐
│Lexer │   │ Parser │   │ Desugarer │   │ Type Checker │
└──────┘   └────────┘   └───────────┘   └──────────────┘

Future State (Integrated Pipeline):
┌──────┐   ┌────────┐   ┌───────────┐   ┌──────────────┐   ┌───────────┐   ┌──────────┐
│Lexer │ → │ Parser │ → │ Desugarer │ → │ Type Checker │ → │ Optimizer │ → │ Code Gen │
└──────┘   └────────┘   └───────────┘   └──────────────┘   └───────────┘   └──────────┘
                                              ↓                     ↓              ↓
                                         Typed Core AST    Optimized AST    JavaScript
```

**Integration Steps** (future work):
1. Type checker outputs Typed Core AST
2. Optimizer receives Typed Core AST
3. Optimizer applies passes based on level
4. Optimizer returns Optimized Typed Core AST
5. Code generator receives optimized AST

**API Design** (future):
```typescript
// Programmatic API
const optimized = optimize(typedAst, { level: OptimizationLevel.O2 });

// In compile function
const typedAst = typeCheck(coreAst);
const optimizedAst = optimize(typedAst, options.optimize);
const jsCode = generateCode(optimizedAst);
```

## Success Criteria

✅ All optimization passes preserve types (no type errors introduced)
✅ Comprehensive test coverage (>90% per module)
✅ No semantic changes (behavior preserved)
✅ Source locations preserved for error reporting
✅ All quality checks pass (`npm run verify`)
✅ Each phase independently testable
✅ Documentation complete (code + integration guides)

## Open Questions

1. **Fixed-Point Iteration**: How many iterations max? (Proposal: 10 iterations or convergence)
2. **Inlining Threshold**: What AST size is "small"? (Proposal: < 20 nodes for O1, < 50 for O2)
3. **External Functions**: How conservative should we be? (Proposal: Never optimize external calls)
4. **Unsafe Blocks**: Optimize inside or skip entirely? (Proposal: Skip for safety)
5. **Optimization Statistics**: What metrics to track? (Proposal: # of each optimization applied, AST size reduction, compilation time)

## References

- **Language Spec**: `vibefun-spec.md` - Language syntax and semantics
- **Type System Design**: `.claude/design/type-system.md` - Type checker details
- **Compiler Architecture**: `.claude/design/compiler-architecture.md` - Pipeline design
- **Coding Standards**: `.claude/CODING_STANDARDS.md` - Code style guide
