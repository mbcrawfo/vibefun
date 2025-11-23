# Desugarer Completion - Context & Key Information

**Created:** 2025-11-23
**Last Updated:** 2025-11-23 (Revised after comprehensive audit)

## Key Files

### Core Implementation Files

**Main Desugarer:**
- `packages/core/src/desugarer/desugarer.ts` (676 lines)
  - Main orchestrator function
  - Pattern desugaring (lines 433-499) - **NEEDS FIX for TypeAnnotatedPattern**
  - Or-pattern expansion (lines 195-227)
  - While loop transformation (lines 349-414)
  - If-expression to match (lines 167-192)

**Helper Modules:**
- `packages/core/src/desugarer/curryLambda.ts` - Lambda currying
- `packages/core/src/desugarer/desugarPipe.ts` - Pipe operator (|>)
- `packages/core/src/desugarer/desugarComposition.ts` - Composition operators (>>, <<)
- `packages/core/src/desugarer/desugarBinOp.ts` - Binary operators
- `packages/core/src/desugarer/desugarBlock.ts` - Block expressions
- `packages/core/src/desugarer/desugarListLiteral.ts` - List literals to cons/nil
- `packages/core/src/desugarer/desugarListPattern.ts` - List patterns to variant patterns
- `packages/core/src/desugarer/desugarListWithConcats.ts` - List spreads
- `packages/core/src/desugarer/buildConsChain.ts` - Helper for cons chains

**Utilities:**
- `packages/core/src/desugarer/FreshVarGen.ts` - Fresh variable generation
- `packages/core/src/desugarer/DesugarError.ts` - Error handling

**Type-related:**
- `packages/core/src/desugarer/desugarTypeDefinition.ts`
- `packages/core/src/desugarer/desugarTypeExpr.ts`
- `packages/core/src/desugarer/desugarTypeParam.ts`
- `packages/core/src/desugarer/desugarConstructorDef.ts`

### Test Files (28 files, ~211 tests - corrected baseline)

**Main Test Suites:**
- `packages/core/src/desugarer/desugarer.test.ts` (43 tests) - Comprehensive unit tests
- `packages/core/src/desugarer/lambdas.test.ts` (16 tests) - Lambda currying
- `packages/core/src/desugarer/pipes.test.ts` (13 tests) - Pipe operator
- `packages/core/src/desugarer/composition.test.ts` (12 tests) - Function composition
- `packages/core/src/desugarer/blocks.test.ts` (15 tests) - Block expressions
- `packages/core/src/desugarer/lists.test.ts` (14 tests) - List literals
- `packages/core/src/desugarer/list-spread.test.ts` (11 tests) - List spreads
- `packages/core/src/desugarer/patterns.test.ts` (14 tests) - Pattern matching
- `packages/core/src/desugarer/or-patterns.test.ts` (9 tests) - Or-patterns
- `packages/core/src/desugarer/records.test.ts` (13 tests) - Record expressions
- `packages/core/src/desugarer/conditionals.test.ts` (12 tests) - If-expressions
- `packages/core/src/desugarer/pass-through.test.ts` (20 tests) - Pass-through constructs
- `packages/core/src/desugarer/integration.test.ts` (9 tests) - Integration tests

**Test Files to Create:**
- `type-annotated-patterns.test.ts` - TypeAnnotatedPattern edge cases (complex patterns, guards)
- `exhaustiveness.test.ts` - Exhaustiveness checking after desugaring
- `transformation-order.test.ts` - Verify transformation dependencies

**Test Files to Enhance:**
- `or-patterns.test.ts` - Add guards, deeply nested cases
- `list-spread.test.ts` - Add multiple spread cases
- `records.test.ts` - Add record spread edge cases
- `blocks.test.ts` - Add empty/deeply nested blocks
- `lambdas.test.ts` - Add single param and many param cases
- `integration.test.ts` - Add complex multi-transformation tests
- `desugarer.test.ts` - Add fresh variable collision tests
- ALL test files - Add comprehensive location preservation tests

### AST Type Definitions

**Surface AST:**
- `packages/core/src/types/ast.ts`
  - Pattern union includes `TypeAnnotatedPattern`
  - Expr union includes all surface syntax

**Core AST:**
- `packages/core/src/types/core-ast.ts`
  - Simplified AST for type checker
  - No `CoreTypeAnnotatedPattern` (type annotations stripped)
  - Fewer node types than surface AST
  - **CONTAINS CoreWhile (dead code)** - while loops actually desugar to CoreLetRecExpr

### Documentation Files

**Requirements:**
- `.claude/desugarer-requirements.md` (1,319 lines)
  - Comprehensive transformation specifications
  - **NEEDS UPDATE** after implementation decisions

**Design:**
- `.claude/design/language-design.md` - Original language design
- `docs/spec/` - Language specification

**Standards:**
- `.claude/CODING_STANDARDS.md` - Coding conventions
- `.claude/DOCUMENTATION_RULES.md` - Documentation rules

## Critical Code Locations

### Bug: Missing TypeAnnotatedPattern Handler

**Location:** `packages/core/src/desugarer/desugarer.ts:433-499`

**Current Code Structure:**
```typescript
function desugarPattern(pattern: Pattern, gen: FreshVarGen): CorePattern {
  switch (pattern.kind) {
    case "VarPattern":
      // ... handled
    case "WildcardPattern":
      // ... handled
    case "LiteralPattern":
      // ... handled
    case "VariantPattern":
      // ... handled
    case "TuplePattern":
      // ... handled
    case "RecordPattern":
      // ... handled
    case "OrPattern":
      // ... handled
    case "ListPattern":
      // ... handled (delegates to desugarListPattern)
    // MISSING: case "TypeAnnotatedPattern":
    default:
      throw new DesugarError(
        `Unknown pattern kind: ${(pattern as any).kind}`,
        pattern.loc
      );
  }
}
```

**Fix Required:**
```typescript
case "TypeAnnotatedPattern": {
  // Strip the type annotation and desugar the inner pattern
  return desugarPattern(pattern.pattern, gen);
}
```

**Test Location for Dereference (shows pass-through):**
`packages/core/src/desugarer/desugarer.test.ts:452-464`

## Design Decisions Made

### 1. Mutable References as Core Operations

**Decision:** Keep `!ref` as `CoreUnaryOp` "Deref" and `ref := val` as `CoreBinOp` "RefAssign"

**Rationale:**
- Simpler approach
- Consistent with other operators
- Code generator handles runtime semantics
- Avoids need for standard library Ref.get/Ref.set functions at this stage

**Impact:**
- No changes needed to current implementation
- Update requirements doc to reflect this decision
- Code generator must handle these operators

### 2. String Concatenation as Core Operation

**Decision:** Keep `"a" & "b"` as `CoreBinOp` "Concat"

**Rationale:**
- Current implementation already does this
- Code generator can optimize string concatenation
- Simpler than desugaring to function calls
- Consistent with other binary operators

**Impact:**
- No changes needed to current implementation
- Update requirements doc (currently says desugar to String.concat)
- Code generator must handle Concat operator

### 3. Comprehensive Test Coverage

**Decision:** Add extensive edge case tests, not just essential tests

**Rationale:**
- Desugarer is critical pipeline phase
- Edge cases often reveal subtle bugs
- Better to catch issues now than during type checking
- Sets high quality bar for project

**Target:** 350+ total tests (currently ~211, accounting for expanded edge cases)

### 4. No Developer Tooling (For Now)

**Decision:** Don't add `--show-desugared` CLI flag in this phase

**Rationale:**
- Focus on completing core functionality
- Tooling can be added later as separate feature
- Keep scope focused and achievable

**Future Work:** Add tooling in separate task

### 5. CoreWhile Dead Code Removal

**Decision:** Remove CoreWhile type from core-ast.ts and type checker

**Background:**
- CoreWhile was added as a placeholder (Nov 10, commit fd44caf)
- When while desugaring was implemented (commit eac42ee), it created CoreLetRecExpr instead
- CoreWhile was never used but never removed from AST

**Evidence:**
- `desugarer.ts:349-414` - Creates CoreLetRecExpr (recursive functions)
- `core-ast.ts:58, 312-319` - CoreWhile defined but never constructed
- `typechecker/infer.ts:243-245` - Placeholder throws error (unreachable code)
- `typechecker/types.ts:565` - CoreWhile case in isConstant (unreachable)

**Impact:**
- Remove 3 locations of dead code
- Clarifies that while loops are always desugared
- Prevents developer confusion

### 6. Type Checker Compatibility

**Finding:** Type checker exists and does NOT need type annotations from patterns

**Type Checker Status:**
- **Fully implemented** at `packages/core/src/typechecker/`
- Uses **Hindley-Milner Algorithm W** with level-based generalization
- Pattern checking in `typechecker/patterns.ts`

**How Pattern Type Checking Works:**
```typescript
checkPattern(pattern: CorePattern, expectedType: Type): Map<string, Type>
```
- Takes `expectedType` as input (inferred from context)
- Checks pattern structure against expected type
- Uses unification to resolve constraints
- Returns variable bindings

**Why Annotations Aren't Needed:**
- Type checker infers from context, not annotations
- Pattern structure drives inference
- Annotations are **optional** (for documentation/disambiguation)
- Standard ML/OCaml approach: annotations checked but don't drive inference

**Conclusion:** Stripping type annotations in desugarer is **correct**. Type checker can validate annotations separately if needed (future enhancement).

### 7. Parser-Desugarer Boundary

**Purpose:** Document what parser handles vs what desugarer handles

**Parser Responsibilities:**
1. **If-without-else** - Parser inserts `else ()`
   - AST evidence: `ast.ts` line 66 shows `else_: Expr` (not optional)
   - Parser always provides complete if-else to desugarer

2. **Record field shorthand** - Parser expands `{name, age}`
   - AST evidence: `RecordField` always has `value: Expr`
   - No shorthand representation in AST
   - Parser expands to `{name: name, age: age}` before desugarer sees it

**Desugarer Responsibilities:**
1. **TypeAnnotatedPattern** - Strip type annotations from patterns
2. **While loops** - Transform to recursive functions
3. **Or-patterns** - Expand to multiple match cases
4. **List literals** - Transform to Cons/Nil chains
5. **Pipe/composition** - Transform to function applications
6. **Block expressions** - Transform to nested let bindings
7. **Lambda currying** - Transform multi-param to single-param
8. **List patterns** - Transform to variant patterns
9. **If-expressions** - Transform complete if-else to match expressions

**Contract Tests Needed:**
- Verify parser always provides complete if-else
- Verify parser expands record shorthand
- Verify AST structure assumptions

## Transformation Summary

### Transformations Fully Implemented ✅

1. List literals → Cons/Nil chains
2. List literals with spreads → Cons + List.concat
3. Multi-parameter lambdas → Curried lambdas
4. Multi-argument applications → Nested applications
5. Pipe operator (|>) → Function application
6. Composition operators (>>, <<) → Lambda expressions
7. String concatenation (&) → CoreBinOp (pass-through)
8. While loops → Recursive functions
9. Block expressions → Nested let bindings
10. List patterns → Variant patterns (Cons/Nil)
11. Or-patterns → Multiple match cases
12. Type definitions desugaring
13. If-then-else → Match on boolean
14. Binary operators → CoreBinOp (pass-through)
15. Unary operators → CoreUnaryOp (pass-through)
16. List cons operator (::) → CoreVariant "Cons"

### Transformations Needing Fix 🔧

1. **TypeAnnotatedPattern** - Missing handler (critical bug)
2. **CoreWhile dead code** - Remove from core-ast.ts and type checker

### Parser-Handled (Not Desugarer) ✅

1. **If-without-else** - Parser inserts `else ()` automatically
2. **Record field shorthand** - Parser expands `{name, age}` to `{name: name, age: age}`

## Fresh Variable Naming Conventions

The `FreshVarGen` class generates unique variable names with prefixes:
- `$loop_N` - While loop functions
- `$composed_N` - Function composition
- `$piped_N` - Pipe operator intermediates
- `$tmp_N` - Temporary bindings in blocks
- Counter increments for each new variable

**Example:**
```typescript
const gen = new FreshVarGen();
gen.freshVar("loop");  // "$loop_0"
gen.freshVar("loop");  // "$loop_1"
gen.freshVar("tmp");   // "$tmp_0"
```

## Edge Cases to Test

### Complex Or-Patterns

```vibefun
match value {
  | Some(Left(x)) | Some(Right(x)) | Ok(x) | Default(x) => x
}
```

**Expansion:** Creates 4 separate match cases, all binding `x`

### List Spreads in Multiple Positions

```vibefun
[1, ...xs, 2, ...ys, 3]
```

**Desugaring:** `Cons(1, List.concat(xs, Cons(2, List.concat(ys, Cons(3, Nil)))))`

### Nested While Loops

```vibefun
while cond1 {
  while cond2 {
    body
  }
}
```

**Desugaring:** Outer loop function calls inner loop function

### Complex Pipe Chains

```vibefun
value
  |> f
  |> (x => x + 1)
  |> g
  |> h
```

**Desugaring:** Nested applications with fresh variables for intermediates

### Record Spreads with Shadowing

```vibefun
{ ...person, age: 30, ...overrides }
```

**Behavior:** Later fields override earlier ones (preserved for code generator)

## Performance Considerations

**Current Approach:**
- Functional, immutable transformations
- No premature optimization
- Focus on correctness first

**Known Areas:**
- Nested let chains for blocks (many nodes created)
- Or-pattern expansion (duplicates patterns)
- Deep recursion for nested structures

**Future Optimization Opportunities:**
- Flatten let chains
- Share common subexpressions
- Tail-call optimization for recursive desugar calls

## Testing Strategy

### Test Organization

Each transformation has dedicated test file:
- Unit tests for the transformation function
- Edge cases specific to that transformation
- Integration tests combining with other transformations

### Test Patterns

```typescript
describe('FeatureName', () => {
  describe('basic cases', () => {
    it('should handle simple case', () => { ... });
  });

  describe('edge cases', () => {
    it('should handle empty input', () => { ... });
    it('should handle nested structures', () => { ... });
  });

  describe('error cases', () => {
    it('should throw on invalid input', () => { ... });
  });
});
```

### Test Coverage Goals

- Every public function tested
- All edge cases covered
- Error paths tested
- Integration tests for combinations
- Minimum 90% code coverage

## Related Components

### Upstream (Feeds Into Desugarer)

**Parser:**
- Location: `packages/core/src/parser/`
- Produces Surface AST
- May handle some transformations (if-without-else, field shorthand)

### Downstream (Consumes Desugarer Output)

**Type Checker:**
- Location: `packages/core/src/type-checker/` (not yet implemented)
- Will consume Core AST
- Simpler due to fewer node types
- Desugarer quality directly impacts type checker complexity

**Code Generator:**
- Location: `packages/core/src/codegen/` (partially implemented)
- Converts Core AST to JavaScript
- Must handle CoreBinOp "Concat", CoreUnaryOp "Deref", CoreBinOp "RefAssign"

## Common Patterns

### Pattern: Recursive Desugaring

Most transformations recursively desugar child nodes:

```typescript
case "SomeNode": {
  const { child1, child2, loc } = node;
  return {
    kind: "CoreSomeNode",
    child1: desugar(child1, gen),
    child2: desugar(child2, gen),
    loc
  };
}
```

### Pattern: Fresh Variable Generation

When introducing new bindings:

```typescript
const tmpVar = gen.freshVar("tmp");
return {
  kind: "CoreLet",
  pattern: { kind: "CoreVarPattern", name: tmpVar, loc },
  value: desugar(value, gen),
  body: desugar(body, gen),
  loc
};
```

### Pattern: Preserving Location

Always preserve `loc` from original AST:

```typescript
return {
  kind: "CoreNode",
  // ... fields
  loc: originalNode.loc  // ✅ Always preserve
};
```

## Quality Checklist

Before marking complete:
- [ ] All tests pass (232+ existing, 70+ new)
- [ ] Type checking passes (`npm run check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Code formatted (`npm run format`)
- [ ] No `any` types used
- [ ] All error paths tested
- [ ] Documentation updated
- [ ] Location info preserved in all transformations
- [ ] Fresh variable generation used where needed
- [ ] Functional style maintained
