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

### Phase 0: Language Feature Audit & Coverage Analysis

**NEW PHASE**: Systematically audit all language features to ensure comprehensive optimizer coverage.

**Tasks:**
1. Read and catalog all Core AST node types from `src/types/ast.ts`
2. Create language feature coverage matrix (Core AST nodes × optimization passes)
3. Document special handling requirements for each language construct
4. Identify optimization opportunities and constraints per feature
5. Document language constructs that require conservative handling

**Deliverables:**
- Complete inventory of all 55 Core AST node types
- Coverage matrix documenting which optimizations apply to which constructs
- Policy documentation for special cases (mutable refs, unsafe blocks, externals, mutual recursion)
- Gap analysis showing what's not covered by current optimization plan
- Updated optimizer-context.md with comprehensive feature list

**Key Language Features Requiring Special Attention:**

1. **Mutable References**
   - `CoreRef` - Reference creation
   - `CoreDeref` - Dereference operations (`!ref`)
   - `CoreAssign` - Reference assignment (`:=` operator in CoreBinOp)
   - **Policy**: Never optimize - always treat as impure, never inline, never CSE

2. **Mutually Recursive Functions**
   - `CoreLetRecExpr` with multiple bindings (`let rec f = ... and g = ...`)
   - **Policy**: Treat binding group as unit, never inline any function in group

3. **External Functions**
   - `CoreExternal` - External function references
   - External function overloading (arity-based resolution at type checking)
   - **Policy**: Treat as opaque, never optimize calls, never assume purity

4. **Unsafe Blocks**
   - `CoreUnsafe` - Explicit unsafe boundaries
   - **Policy**: Never optimize inside unsafe blocks, never inline functions containing unsafe

5. **Record Operations**
   - `CoreRecordLit` - Record literals
   - `CoreRecordAccess` - Field access
   - `CoreRecordUpdate` - Record updates with spread syntax
   - **Opportunities**: Update fusion, identity elimination, update-then-access constant prop

6. **Pattern Matching**
   - `CoreMatch` with optional guards
   - **Safety**: Guards may have side effects, preserve evaluation order

7. **Type System Features**
   - Width subtyping for records (extra fields allowed)
   - Nominal typing for variants (exact name match required)
   - Let-polymorphism preservation
   - **Constraint**: All optimizations must preserve types

8. **JavaScript Runtime Constraints**
   - Number precision: IEEE 754 doubles only (±2^53 - 1 safe integer range)
   - No guaranteed tail call optimization
   - Stack depth limitations
   - **Implication**: Constant folding must handle overflow, inlining affects stack depth

**Success Criteria:**
✅ All Core AST nodes documented with optimization applicability
✅ Coverage matrix shows systematic handling of all language features
✅ Policies defined for all special cases
✅ No language features overlooked or missing from optimization plan
✅ Document updated with comprehensive feature list

---

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
8. Document critical optimization policies (see below)
9. Validate with `npm run verify`

**Deliverables:**
- Type definitions for optimizer configuration and metrics
- Reusable AST transformation infrastructure
- Base class defining optimization pass interface
- Working optimizer pipeline (even if empty)
- Documented policies for special language features

**Critical Optimization Policies:**

These policies must be implemented and enforced by all optimization passes:

1. **Mutable Reference Policy**
   - **Rule**: Mutable reference operations are ALWAYS impure
   - **Never optimize**:
     - `CoreRef` expressions (reference creation)
     - `CoreDeref` expressions (dereference `!ref`)
     - `CoreAssign` expressions (assignment `:=`)
   - **Never inline**: Expressions containing ref operations
   - **Never CSE**: Dereference operations (even if structurally identical)
   - **Never eliminate**: Assignments (even if result unused)
   - **Rationale**: Reference identity matters, mutations are side effects

2. **Unsafe Block Policy**
   - **Rule**: `CoreUnsafe` blocks are black boxes
   - **Never optimize**: Expressions inside unsafe blocks
   - **Never inline**: Functions containing unsafe blocks anywhere in body
   - **Always preserve**: Unsafe boundaries as-is
   - **Rationale**: User explicitly marked code as requiring special handling

3. **External Function Policy**
   - **Rule**: External functions are opaque
   - **Never inline**: External function definitions
   - **Never optimize**: External function call sites
   - **Never assume**: Purity or any semantic properties
   - **Handle carefully**: External function overloading (already resolved by type checker)
   - **Rationale**: Cannot reason about JavaScript function behavior

4. **Mutual Recursion Policy**
   - **Rule**: Mutually recursive bindings must stay together
   - **Detect**: `CoreLetRecExpr` with multiple bindings
   - **Never inline**: Any function in a mutually recursive group
   - **Treat as unit**: All bindings must be kept together
   - **Never reorder**: Bindings within recursive group
   - **Rationale**: Breaking group breaks mutual references

5. **Source Location Preservation Policy**
   - **Rule**: Every transformation must preserve source locations
   - **Always copy**: `loc` field from input nodes to output nodes
   - **For synthetic nodes**: Use location of "cause" node (the node that triggered creation)
   - **Never lose**: Location information during transformation
   - **Rationale**: Error messages must remain useful after optimization

6. **Type Preservation Policy**
   - **Rule**: Every optimization must preserve types
   - **Invariant**: `type(optimize(expr)) = type(expr)`
   - **Always preserve**: Type annotations from input AST
   - **Verify**: Integration tests re-type-check optimized code
   - **Rationale**: Optimizations must not violate type system

7. **Evaluation Order Preservation**
   - **Rule**: Don't reorder expressions that could have side effects
   - **Preserve**: Left-to-right evaluation order (JavaScript semantics)
   - **Never reorder**: Function arguments
   - **Never reorder**: Pattern match guards (may have side effects)
   - **Rationale**: Observable behavior must be preserved

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
- Edge case handling (overflow, NaN, Infinity)
- Record update constant propagation

**Extended Constant Folding Scope:**

Beyond basic arithmetic, constant folding should handle:

1. **String Operations**
   - String concatenation chains: `"a" & "b" & "c"` → `"abc"`
   - Multi-line string literals (ensure proper handling)
   - Future: String module functions if inlined (`String.length("hello")` → `5`)

2. **Numeric Edge Cases**
   - **Integer overflow**: Respect JavaScript's `MAX_SAFE_INTEGER` (2^53 - 1)
   - **Overflow behavior**: Don't fold if result exceeds safe integer range
   - **Division by zero**: Keep as runtime error (don't fold `x / 0`)
   - **NaN propagation**: `NaN + 1` → `NaN` (preserve JavaScript semantics)
   - **Infinity**: Preserve `Infinity` and `-Infinity` behavior

3. **Record Operations**
   - **Update-then-access**:
     ```
     let r2 = { ...r, x: 5 }
     r2.x  // → 5 (constant)
     ```
   - **Identity update elimination**:
     ```
     { ...record, x: record.x }  // → record (no change)
     ```

4. **What NOT to Fold (Mutable Reference Policy)**
   - **Never fold** `CoreRef` (reference creation)
   - **Never fold** `CoreDeref` (dereference operations)
   - **Never fold** `CoreAssign` (assignments)
   - **Rationale**: These have side effects and reference identity

5. **Conservative Handling**
   - **External calls**: Never fold (opaque behavior)
   - **Unsafe blocks**: Skip entirely
   - **Pattern match guards**: Can fold guard expressions, but preserve evaluation order

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
- Mutual recursion detection and handling
- Safe inlining with respect to mutable references and unsafe blocks

**Inlining Special Cases:**

The inline expansion pass must handle these cases carefully:

1. **Mutual Recursion Detection**
   - **Detect**: `CoreLetRecExpr` with multiple bindings (`let rec f = ... and g = ...`)
   - **Policy**: NEVER inline any function in a mutually recursive group
   - **Reason**: Inlining one breaks references from others
   - **Test**: isEven/isOdd mutual recursion example

2. **Single Recursion**
   - **Policy**: Never inline directly recursive functions
   - **Reason**: Would cause infinite expansion
   - **Detection**: Function name appears in its own body

3. **Functions Containing Unsafe Blocks**
   - **Policy**: Never inline functions containing `CoreUnsafe` anywhere in body
   - **Reason**: Preserve explicit safety boundaries
   - **Detection**: AST traversal looking for CoreUnsafe nodes

4. **Functions Containing Mutable References**
   - **Policy**: Never inline functions that create, deref, or assign references
   - **Reason**: Reference identity and side effects matter
   - **Detection**: Check for CoreRef, CoreDeref, CoreAssign in body

5. **External Function References**
   - **Policy**: Never inline external functions
   - **Reason**: External functions are opaque JavaScript code
   - **Already handled**: External functions aren't defined in vibefun anyway

6. **Stack Depth Considerations**
   - **Policy**: Limit inlining depth to prevent stack overflow
   - **Threshold**: Consider inlining depth in cost model
   - **Reason**: Deep inlining can increase recursion depth at runtime

**Inlining Cost Model Enhancement:**
- Factor in: function size, use count, recursion, depth, purity
- O1 threshold: < 20 nodes OR used once
- O2 threshold: < 50 nodes OR used < 3 times
- Reject: Recursive, mutual recursive, contains unsafe/refs, too large

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
- Guard side-effect preservation
- Nominal variant type preservation

**Pattern Match Optimization Safety:**

Pattern match optimization is complex and must preserve semantics carefully:

1. **Pattern Match Guards**
   - **Structure**: `CoreMatchCase` has optional `guard?: CoreExpr`
   - **Guards can have side effects** (especially in unsafe blocks)
   - **Evaluation order matters**: Guards evaluated sequentially until one succeeds

2. **Guard Handling Policy**
   - **Conservative approach**: Don't reorder patterns that have guards
   - **Reason**: Guards may have side effects, reordering changes observable behavior
   - **Allowed**: Optimize guard expressions themselves (constant folding, etc.)
   - **Example to preserve**:
     ```
     match n {
         | x when checkAndLog(x < 0) => "negative"  // Logs!
         | 0 => "zero"
         | _ => "positive"
     }
     ```
     Reordering could change logging behavior

3. **Safe Pattern Reorderings**
   - **Without guards**: Can reorder for efficiency
     - Literals before variables
     - Constructors before wildcards
   - **With guards**: Keep order unless proven pure
   - **Remove unreachable**: Patterns after wildcard (no guard) are unreachable

4. **Nominal Variant Type Preservation**
   - **Vibefun uses nominal typing for variants**: Name matters, not structure
   - **Cannot merge patterns** from different variant types even if structurally similar
   - **Example**:
     ```
     type Status = Active | Pending
     type State = Active | Pending  // Different type!
     ```
     Patterns for Status.Active and State.Active must not be merged

5. **Exhaustiveness Preservation**
   - **Critical**: Pattern optimization must not break exhaustiveness
   - **Never remove**: Cases that affect exhaustiveness checking
   - **Always verify**: Optimized match is still exhaustive if original was

6. **Decision Tree Generation**
   - Convert sequential pattern matching to efficient decision trees
   - **Preserve**: All reachable cases
   - **Optimize**: Common pattern sequences
   - **Generate jump tables**: For literal patterns (integers, strings)

**Pattern Match Edge Cases:**
- **Nested patterns**: Preserve structure for correctness
- **Or-patterns** (already desugared): Multiple cases, must handle all
- **List patterns** (Cons/Nil): Special optimization opportunities
- **Record patterns** (width subtyping): Extra fields allowed, be careful

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
26. Add language feature integration tests (NEW)
27. Add type system preservation tests (NEW)
28. Add JavaScript runtime edge case tests (NEW)
29. Add benchmark/example programs
30. Final validation with `npm run verify`

**Deliverables:**
- Complete documentation of optimizer
- Integration guide for CLI (future)
- Integration guide for pipeline (future)
- Benchmarks showing optimization impact
- Comprehensive test suite covering all language features
- Type system preservation verification

**Expanded Testing Requirements:**

Beyond existing pass-specific tests, add these comprehensive test categories:

1. **Language Feature Integration Tests** (`optimizer.language-features.test.ts`)
   - **Mutable references**:
     - Test ref creation, deref, assignment aren't optimized away
     - Test functions containing refs aren't inlined
     - Test CSE doesn't duplicate refs
   - **Mutually recursive functions**:
     - Test isEven/isOdd example
     - Test functions in group aren't inlined
     - Test optimization preserves mutual references
   - **Record updates**:
     - Test update fusion when applicable
     - Test identity update elimination
     - Test update-then-access constant propagation
   - **Pattern match guards**:
     - Test guard side effects preserved
     - Test patterns with guards not reordered unsafely
     - Test guard expressions themselves optimized
   - **Unsafe blocks**:
     - Test expressions inside unsafe aren't optimized
     - Test functions containing unsafe aren't inlined
   - **External functions**:
     - Test external calls not optimized
     - Test external function overloading preserved
   - **Multi-line strings**:
     - Test multi-line string literals handled correctly

2. **Type System Preservation Tests** (`optimizer.types.test.ts`)
   - **Polymorphic type preservation**:
     - Test identity function stays polymorphic after optimization
     - Test type variable scoping preserved
     - Test let-polymorphism maintained
   - **Width subtyping (records)**:
     - Test record optimizations respect subtyping
     - Test extra fields preserved
     - Test structural typing semantics maintained
   - **Nominal variant types**:
     - Test variant patterns not incorrectly merged
     - Test nominal type boundaries respected
   - **Type re-checking integration**:
     - Integration with type checker to re-type-check optimized AST
     - Property test: `∀ expr. type(optimize(expr)) = type(expr)`

3. **JavaScript Runtime Edge Case Tests** (`optimizer.js-runtime.test.ts`)
   - **Number precision limits**:
     - Test MAX_SAFE_INTEGER boundaries in constant folding
     - Test overflow handling (don't fold if exceeds safe range)
     - Test integer arithmetic correctness near boundaries
   - **Special numeric values**:
     - Test NaN propagation: `NaN + 1` → `NaN`
     - Test Infinity handling: `1 / 0` not folded (runtime error)
     - Test -Infinity behavior
   - **Division by zero**:
     - Test division by zero kept as runtime error (not folded)
   - **Stack depth considerations**:
     - Test that aggressive inlining doesn't create deeply nested structures
     - Test recursion depth isn't increased unsafely

4. **Source Location Preservation Tests** (`optimizer.locations.test.ts`)
   - Test all transformations preserve `loc` fields
   - Test synthetic nodes have valid locations
   - Test error messages still point to correct source locations
   - Test source maps remain valid after optimization

5. **Semantic Preservation Integration Tests** (`optimizer.semantics.test.ts`)
   - **Property**: `∀ expr. eval(optimize(expr)) ≈ eval(expr)` (modulo performance)
   - Test complex programs optimize correctly
     - Fibonacci (recursion handling)
     - List operations (pipeline optimizations)
     - Higher-order functions (inlining + beta reduction)
     - Nested pattern matches
   - Test optimization doesn't change observable behavior
   - Test side effects preserved correctly

6. **Fixed-Point Convergence Tests** (`optimizer.convergence.test.ts`)
   - Test optimization reaches fixed point
   - Test iteration limits respected (max 10 iterations)
   - Test idempotence: `optimize(optimize(expr)) = optimize(expr)`
   - Test cascading optimizations converge properly

7. **Optimization Level Tests** (existing, but verify comprehensiveness)
   - Test O0, O1, O2 behaviors as specified
   - Test each level's pass configuration
   - Test performance characteristics (O1 faster than O2, etc.)

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
