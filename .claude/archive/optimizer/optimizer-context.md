# Optimizer Implementation Context

**Last Updated**: 2025-10-30

## Purpose

This document captures key context, design decisions, important patterns, and critical information for implementing the vibefun optimizer.

## Key Files and Locations

### Core AST Definitions

**Location**: `packages/core/src/types/core-ast.ts`

The optimizer works with the **Core AST** (desugared, simplified form):

- `core-ast.ts` - Contains all Core AST node types
- `token.ts` - Token types (needed for literals)
- `type.ts` - Type system types (for preserving type annotations)

**Complete Core AST Nodes** (19 expression types):
```typescript
// From src/types/core-ast.ts
type CoreExpr =
  // Literals (5)
  | CoreIntLit         // Integer literals: 42
  | CoreFloatLit       // Float literals: 3.14
  | CoreStringLit      // String literals: "hello", """multi-line"""
  | CoreBoolLit        // Boolean literals: true, false
  | CoreUnitLit        // Unit value: ()
  // Variables and Bindings (3)
  | CoreVar            // Variables: x, y, foo
  | CoreLet            // Let binding: let x = expr in body
  | CoreLetRecExpr     // Mutually recursive: let rec f = ... and g = ... in body
  // Functions (2)
  | CoreLambda         // Single-param functions: (x) => body
  | CoreApp            // Application: f(x)
  // Control Flow (1)
  | CoreMatch          // Pattern matching with optional guards
  // Data Structures (5)
  | CoreRecord         // Record literals: { x: 1, y: 2 }
  | CoreRecordAccess   // Field access: record.field
  | CoreRecordUpdate   // Record update: { ...record, field: value }
  | CoreVariant        // Variant constructor: Some(42), Cons(1, Nil)
  // Operations (2)
  | CoreBinOp          // Binary: +, -, *, /, &&, ||, &, RefAssign (:=)
  | CoreUnaryOp        // Unary: -, !, Deref (!)
  // Other (2)
  | CoreTypeAnnotation // Type annotations: (expr: Type)
  | CoreUnsafe         // Unsafe block: unsafe { ... }
```

**Note on References**:
- Reference creation: `ref(value)` likely represented as `CoreApp` or `CoreVariant`
- Dereference: `!ref` represented as `CoreUnaryOp` with `Deref`
- Assignment: `ref := value` represented as `CoreBinOp` with `RefAssign`

## Language Feature Coverage Matrix

This matrix systematically documents which optimizations apply to each Core AST construct.

### Legend
- ✅ **Optimize** - Optimization pass applies to this node
- ❌ **Never** - Never optimize (semantic constraint)
- ⚠️ **Careful** - Special handling required
- 🔍 **Recurse** - Optimize children only, not the node itself
- N/A - Not applicable

### Complete Coverage Matrix

| Core AST Node | Const Fold | Beta Reduce | Inline | Dead Code | Eta | Pattern | CSE | Notes |
|---------------|------------|-------------|--------|-----------|-----|---------|-----|-------|
| **CoreIntLit** | ✅ | N/A | N/A | N/A | N/A | N/A | ✅ | Fold in arithmetic |
| **CoreFloatLit** | ✅ | N/A | N/A | N/A | N/A | N/A | ✅ | Fold in arithmetic |
| **CoreStringLit** | ✅ | N/A | N/A | N/A | N/A | N/A | ✅ | Concat folding |
| **CoreBoolLit** | ✅ | N/A | N/A | N/A | N/A | N/A | ✅ | Logical ops folding |
| **CoreUnitLit** | N/A | N/A | N/A | N/A | N/A | N/A | N/A | No optimizations |
| **CoreVar** | N/A | ✅ | ✅ | ✅ | ✅ | N/A | ✅ | Substitute, inline, CSE |
| **CoreLet** | 🔍 | 🔍 | ✅ | ✅ | 🔍 | N/A | 🔍 | Inline binding, eliminate if unused |
| **CoreLetRecExpr** | 🔍 | 🔍 | ❌ | ⚠️ | 🔍 | N/A | 🔍 | NEVER inline funcs in group |
| **CoreLambda** | 🔍 | ✅ | ⚠️ | N/A | ✅ | N/A | ⚠️ | Beta reduce when applied, eta reduce |
| **CoreApp** | 🔍 | ✅ | 🔍 | N/A | N/A | N/A | ✅ | Beta reduction target |
| **CoreMatch** | 🔍 | 🔍 | 🔍 | ✅ | 🔍 | ✅ | 🔍 | Optimize known values, patterns |
| **CoreRecord** | 🔍 | 🔍 | 🔍 | N/A | N/A | N/A | ⚠️ | CSE if pure fields |
| **CoreRecordAccess** | ⚠️ | 🔍 | 🔍 | N/A | N/A | N/A | ⚠️ | Fold if known record + field |
| **CoreRecordUpdate** | ⚠️ | 🔍 | 🔍 | N/A | N/A | N/A | ⚠️ | Identity elim, update fusion |
| **CoreVariant** | 🔍 | 🔍 | 🔍 | N/A | N/A | N/A | ✅ | CSE if pure args |
| **CoreBinOp** | ✅ | 🔍 | 🔍 | N/A | N/A | N/A | ⚠️ | Fold if literals; NEVER fold RefAssign |
| **CoreUnaryOp** | ✅ | 🔍 | 🔍 | N/A | N/A | N/A | ⚠️ | Fold if literal; NEVER fold Deref |
| **CoreTypeAnnotation** | 🔍 | 🔍 | 🔍 | N/A | 🔍 | N/A | N/A | Preserve annotation |
| **CoreUnsafe** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | BLACK BOX - never optimize inside |

### Special Cases Requiring Careful Handling

#### Mutable Reference Operations (❌ NEVER)
| Operation | Representation | Policy |
|-----------|----------------|--------|
| Create | `CoreApp` or `CoreVariant` with `ref` | Never optimize, never inline |
| Deref | `CoreUnaryOp(Deref, ref)` | Never fold, never CSE |
| Assign | `CoreBinOp(RefAssign, ref, value)` | Never fold, never eliminate |

**Reason**: Reference identity and side effects must be preserved.

#### Mutually Recursive Functions (❌ NEVER INLINE)
- **Node**: `CoreLetRecExpr` with multiple bindings
- **Policy**: Treat all bindings as a unit, never inline any function in the group
- **Reason**: Inlining one breaks references from others

#### Pattern Match Guards (⚠️ CAREFUL)
- **Node**: `CoreMatchCase` with `guard?: CoreExpr`
- **Policy**: Don't reorder patterns with guards (side effects)
- **Allowed**: Optimize guard expressions themselves
- **Reason**: Guards evaluated sequentially, order matters

#### Unsafe Blocks (❌ BLACK BOX)
- **Node**: `CoreUnsafe`
- **Policy**: Never optimize contents, never inline functions containing unsafe
- **Reason**: User explicitly marked as requiring special handling

### Existing Utilities

**Location**: `packages/core/src/utils/`

Existing utilities that the optimizer can leverage:
- Error handling utilities (error.ts)
- Other utilities as discovered

**New utilities to add**:
- AST visitor/transformer
- Substitution (capture-avoiding)
- Free variable analysis
- Expression equivalence checking
- Cost models

### Type Checker Output

**Location**: `packages/core/src/typechecker/`

The type checker produces **Typed Core AST**:
- Each `CoreExpr` node has type information attached
- Type annotations are preserved in the AST
- The optimizer must maintain these type annotations

**Key Point**: The optimizer input and output are both Typed Core AST with the same type signature.

### Desugarer

**Location**: `packages/core/src/desugarer/`

Understanding what the desugarer does helps identify optimization opportunities:

**Key Desugarings**:
1. Multi-param functions → Curried lambdas: `(x, y) => body` → `(x) => (y) => body`
2. Pipe operator → Applications: `x |> f` → `f(x)`
3. Composition → Lambdas: `f >> g` → `(x) => g(f(x))`
4. If-then-else → Match: `if cond then e1 else e2` → `match cond { true => e1, false => e2 }`
5. List literals → Cons/Nil: `[1, 2]` → `Cons(1, Cons(2, Nil))`
6. Record updates → Explicit copying
7. Or-patterns → Multiple cases

**Optimization Implication**: Many optimization opportunities arise from desugared code (especially beta reduction opportunities from pipes/composition).

## Type System Interactions

The optimizer must respect and preserve vibefun's type system features.

### Width Subtyping (Records)

**Vibefun uses width subtyping for records**: A record with extra fields is a subtype.

**Example**:
```vibefun
type Point2D = { x: Int, y: Int }
type Point3D = { x: Int, y: Int, z: Int }  // Point3D is subtype of Point2D
```

**Optimization Implications**:
1. **Record access optimization**: Can't assume exact field match
2. **CSE on records**: Must account for structural typing
3. **Pattern matching**: Extra fields allowed in patterns
4. **Constant folding**: Record with extra fields still valid

**Policy**: Record optimizations must preserve width subtyping semantics.

### Nominal Typing (Variants)

**Vibefun uses nominal typing for variants**: Name matters, not structure.

**Example**:
```vibefun
type Status = Active | Pending
type State = Active | Pending  // Different type! Same structure, different name
```

**Optimization Implications**:
1. **Pattern optimization**: Can't merge patterns from different variant types
2. **Even if structurally identical**: Status.Active ≠ State.Active
3. **Exhaustiveness**: Type name matters for exhaustiveness checking

**Policy**: Never merge or conflate patterns from nominally different types.

### Let-Polymorphism

**Vibefun supports let-polymorphism**: Functions can have polymorphic types.

**Example**:
```vibefun
let identity = (x) => x  // identity: ∀ 'a. 'a -> 'a

let intId = identity(42)        // identity instantiated to Int -> Int
let strId = identity("hello")   // identity instantiated to String -> String
```

**Optimization Implications**:
1. **Inlining polymorphic functions**: Must preserve instantiation at each call site
2. **Type variable scoping**: Level-based scoping must be preserved
3. **Monomorphization** (future): Could specialize polymorphic functions per type

**Policy**: Optimization must preserve polymorphic types. Each call site may have different type.

### Type Preservation Invariant

**Critical Requirement**: Every optimization must be type-preserving.

**Invariant**: `∀ expr: type(optimize(expr)) = type(expr)`

**Verification Strategy**:
1. Run type checker on original AST → Type T
2. Run optimizer on AST → Optimized AST
3. Run type checker on optimized AST → Type T'
4. Assert: T = T' (no type errors)

**Testing**: Integration tests with type checker to verify preservation.

## JavaScript Runtime Constraints

Vibefun compiles to JavaScript, which imposes runtime limitations on optimizations.

### Number Precision Limits

**JavaScript has only IEEE 754 doubles** (no separate int type):

**Constraints**:
- **Safe integer range**: -(2^53 - 1) to (2^53 - 1)
- **MAX_SAFE_INTEGER**: 9007199254740991
- **MIN_SAFE_INTEGER**: -9007199254740991
- Outside this range: Precision is lost

**Optimization Implications**:
1. **Constant folding**: Must handle overflow correctly
2. **Don't fold if result exceeds safe range**: Risk of incorrect result
3. **Example**: `MAX_SAFE_INTEGER + 1` → Don't fold (runtime behavior preserved)

**Policy**: Constant folding must respect JavaScript number limits.

### Special Numeric Values

**JavaScript has special values**: NaN, Infinity, -Infinity

**Semantics**:
- **NaN propagation**: `NaN + 1` → `NaN`, `NaN == NaN` → `false`
- **Infinity**: `1 / 0` → `Infinity` (runtime error in some contexts)
- **Division by zero**: Keep as runtime behavior (don't fold)

**Policy**: Preserve JavaScript semantics for special values.

### No Tail Call Optimization

**JavaScript does not guarantee tail call optimization** (even in strict mode).

**Constraint**: Cannot optimize tail-recursive functions to loops.

**Implication**:
1. Recursive functions will use stack space
2. Deep recursion can overflow stack
3. Vibefun cannot provide TCO guarantee

**Policy**: Don't attempt tail call optimization. Document limitation.

### Stack Depth Limitations

**JavaScript has limited call stack** (varies by implementation):

**Typical limits**: ~10,000-50,000 call frames

**Optimization Implications**:
1. **Aggressive inlining**: Could increase recursion depth at runtime
2. **Inline depth limit**: Consider in cost model
3. **Deep recursion**: Already problematic, but inlining can make worse

**Policy**: Inlining cost model should consider stack depth impact.

### Evaluation Order

**JavaScript evaluates left-to-right** (strictly defined):

**Example**:
```javascript
f(g(), h())  // g() evaluated before h()
```

**Optimization Implications**:
1. **Don't reorder function arguments**: Observable if side effects
2. **Don't reorder pattern match guards**: Evaluated sequentially
3. **Preserve evaluation order**: Critical for semantics

**Policy**: All optimizations must preserve left-to-right evaluation order.

## Design Decisions

### Decision 1: Work on Typed Core AST

**Rationale**:
- Core AST is simplified, making optimization easier
- Type information enables type-directed optimizations
- Desugaring has already eliminated syntactic complexity
- Preserving types ensures correctness

**Implication**: All optimizations must preserve types and type annotations.

### Decision 2: Multiple Passes with Fixed-Point Iteration

**Rationale**:
- Different optimizations enable each other
- Constant folding → Dead code elim → More constant folding
- Single pass insufficient for maximal optimization

**Implementation**:
```typescript
function optimize(ast: CoreExpr, level: OptimizationLevel): CoreExpr {
  let current = ast;
  let previous: CoreExpr;
  let iterations = 0;
  const maxIterations = 10;

  do {
    previous = current;
    current = applyPasses(current, level);
    iterations++;
  } while (!astEquals(current, previous) && iterations < maxIterations);

  return current;
}
```

### Decision 3: Configurable Optimization Levels

**Rationale**: Different use cases need different tradeoffs
- Development: Fast compilation, easy debugging (-O0)
- Production: Maximum performance (-O2)

**Levels**:
- **O0**: No optimization (pass-through)
- **O1**: Safe, fast optimizations (constant fold, beta reduce, dead code)
- **O2**: All optimizations, multiple iterations

### Decision 4: Conservative with Side Effects

**Rationale**: Preserve semantics strictly

**Rules**:
- Never optimize inside `CoreUnsafe` blocks
- Never inline functions that might have side effects
- Never optimize `CoreExternal` function calls
- Assume `CoreRef`, `CoreDeref`, `CoreAssign` have effects

### Decision 5: Preserve Source Locations

**Rationale**: Error messages must remain useful after optimization

**Implementation**: Every transformation must copy location information from input nodes to output nodes.

### Decision 6: Use Existing Infrastructure

**Rationale**: Don't duplicate code, leverage existing utilities

**Approach**:
- Add new types to `src/types/` (don't create optimizer/types.ts)
- Add new utilities to `src/utils/` (don't create optimizer/utils/)
- Keep optimizer module focused on optimization passes only

## Important Patterns

### Pattern 1: Capture-Avoiding Substitution

When performing beta reduction: `((x) => body)(arg)` → `body[x := arg]`

**Challenge**: Variable capture
```typescript
// Bad (variable capture):
((x) => (y) => x + y)(y)  →  (y) => y + y  // Wrong! y is captured

// Good (rename to avoid capture):
((x) => (y) => x + y)(y)  →  (y') => y + y'  // Correct
```

**Implementation Approach**:
1. Compute free variables in `arg`
2. Find bound variables in `body`
3. Rename bound variables that conflict
4. Perform substitution

### Pattern 2: Cost Model for Inlining

Not all inlining is beneficial. Need heuristics.

**Metrics**:
- AST size (node count)
- Expression complexity
- Number of uses (inline if used once)
- Recursivity (don't inline recursive functions)

**Thresholds** (proposal):
- O1: Inline if size < 20 nodes OR used once
- O2: Inline if size < 50 nodes OR used < 3 times

### Pattern 3: Expression Equivalence

For CSE, need to determine when two expressions are equivalent.

**Equivalence Rules**:
- Literals: Same type and value
- Variables: Same name (after substitution)
- Operations: Same operator, equivalent operands
- Structural recursion for complex expressions

**Caution**: Don't consider expressions with side effects as equivalent (even if structurally similar).

### Pattern 4: AST Transformation

General pattern for optimization passes:

```typescript
abstract class OptimizationPass {
  abstract name: string;

  abstract transform(expr: CoreExpr): CoreExpr;

  // Helper: Deep transformation (recurse into subexpressions)
  protected transformChildren(expr: CoreExpr): CoreExpr {
    // Pattern match on expr type
    // Recursively transform children
    // Return new expression with transformed children
  }
}
```

**Key**: Always transform bottom-up (children first) to enable optimizations to compose.

### Pattern 5: Fixed-Point Detection

Optimization converges when AST stops changing.

**Approach**:
- Deep equality check on AST nodes
- Compare before and after each iteration
- Stop when equal or max iterations reached

**Caution**: Ensure termination (max iteration limit).

## Critical Type Information

### Type Preservation Requirement

**Every optimization must be type-preserving.**

If input has type `T`, output must have type `T`.

**Verification Strategy**:
1. Run type checker on original AST
2. Run optimizer
3. Run type checker on optimized AST
4. Assert: Same type, no errors

**Test Template**:
```typescript
it('should preserve types', () => {
  const input = /* some typed core expr */;
  const inputType = inferType(input);

  const optimized = constantFold(input);
  const outputType = inferType(optimized);

  expect(outputType).toEqual(inputType);
});
```

### Type-Directed Optimization Opportunities

The type system enables optimizations:

1. **Known record types**: Direct field access optimization
2. **Monomorphization**: Specialize polymorphic functions
3. **Unboxing**: Avoid boxing for known numeric types
4. **Exhaustiveness**: Type system guarantees exhaustive patterns

**Note**: These are advanced optimizations for Phase 4+.

## Constraints and Limitations

### Constraint 1: JavaScript Runtime Limitations

Vibefun compiles to JavaScript, which has limitations:

1. **No TCO**: JavaScript doesn't guarantee tail call optimization
2. **Number precision**: Only IEEE 754 doubles (no arbitrary precision)
3. **Stack size**: Deep recursion can overflow

**Implication**: Some optimizations (like tail call elimination) are difficult or impossible.

### Constraint 2: Preserve Semantics Exactly

**Strict requirement**: Optimizer must not change program behavior.

**Edge cases to handle**:
- Integer overflow (JavaScript number limits)
- Division by zero (should remain runtime error)
- NaN and Infinity (preserve behavior)
- Side effects in unsafe blocks

### Constraint 3: Compilation Speed

**Requirement**: Optimization shouldn't make compilation too slow.

**Strategies**:
- O0 should be instant (no-op)
- O1 should be fast (single pass, simple optimizations)
- O2 can be slower (acceptable for production builds)

### Constraint 4: External Function Opacity

**Assumption**: Cannot reason about external function behavior.

**Rules**:
- Never inline external functions
- Never assume external functions are pure
- Never optimize external function calls

## Testing Insights

### Test Data Sources

**Existing test suites to reference**:
1. Desugarer tests (`src/desugarer/*.test.ts`) - Show Core AST patterns
2. Type checker tests (`src/typechecker/*.test.ts`) - Show type preservation expectations
3. Parser tests (`src/parser/*.test.ts`) - Show complex language constructs

### Property-Based Testing Opportunities

Consider property-based tests for:
1. **Type preservation**: `∀ expr. type(optimize(expr)) = type(expr)`
2. **Semantic preservation**: `∀ expr. eval(optimize(expr)) = eval(expr)`
3. **Idempotence**: `∀ expr. optimize(optimize(expr)) = optimize(expr)`

### Integration Test Strategy

**Approach**: End-to-end tests through full pipeline (when integrated):
1. Write small vibefun programs
2. Compile with -O0 and -O2
3. Assert: Both produce same output
4. Assert: -O2 code is faster/smaller

## Performance Considerations

### What to Measure

1. **Compilation time**: Optimizer shouldn't slow compilation too much
2. **Generated code size**: Measure AST node count reduction
3. **Generated code performance**: Measure runtime improvement (future, when code gen exists)

### Optimization Impact Metrics

Track per-pass statistics:
- Number of constant folds performed
- Number of functions inlined
- Number of dead code eliminations
- AST size reduction (%)
- Number of iterations to fixed point

**Example**:
```typescript
interface OptimizationMetrics {
  constantFolds: number;
  betaReductions: number;
  etaReductions: number;
  inlines: number;
  deadCodeEliminations: number;
  cseEliminations: number;
  iterations: number;
  astSizeBefore: number;
  astSizeAfter: number;
  timeMs: number;
}
```

## Common Pitfalls to Avoid

### Pitfall 1: Variable Capture

Always use capture-avoiding substitution. Test with shadowed variables.

### Pitfall 2: Infinite Loops

Fixed-point iteration must terminate. Always have max iteration limit.

### Pitfall 3: Breaking Semantics

Test extensively that optimization preserves behavior. Include edge cases.

### Pitfall 4: Type System Violations

Every transformation must preserve types. Verify with type checker.

### Pitfall 5: Lost Source Locations

Always copy location information. Test that error messages still work.

### Pitfall 6: Over-Aggressive Inlining

Inlining everything can increase code size. Use cost model.

### Pitfall 7: Assuming Purity

Only assume purity for proven-pure code. External functions and unsafe blocks are opaque.

## References

### Related Research Papers

1. **"Compiling with Continuations"** - Andrew Appel (optimization strategies)
2. **"The Implementation of Functional Programming Languages"** - Simon Peyton Jones (pattern matching compilation)
3. **"A Simple Applicative Language"** - Philip Wadler (deforestation)
4. **"Secrets of the Glasgow Haskell Compiler"** - Simon Marlow & Simon Peyton Jones (optimization case studies)

### Similar Compilers to Study

1. **OCaml** - Excellent functional language optimizer
2. **F#** - Functional on .NET with practical optimizations
3. **Elm** - Functional to JavaScript with good optimization
4. **ReScript** - OCaml-like to JavaScript
5. **PureScript** - Haskell-like to JavaScript with sophisticated optimizations

## Next Steps

When starting implementation:

1. Read the Core AST types in `src/types/ast.ts` thoroughly
2. Study desugarer output to understand common patterns
3. Study type checker to understand type annotations
4. Start with Phase 1: Build foundation before optimization passes
5. Follow test-driven development: Write tests first
6. Run `npm run verify` after every change
