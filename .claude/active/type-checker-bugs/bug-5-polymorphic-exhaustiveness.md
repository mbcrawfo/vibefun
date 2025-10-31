# Bug #5: Exhaustiveness Checking on Polymorphic Lambda Parameters

**Status:** 🔜 Not Started
**Priority:** Medium (Phase 4)
**Complexity:** High
**Last Updated:** 2025-10-30

## Problem Statement

Pattern matching on polymorphic lambda parameters fails exhaustiveness checking because the parameter type is a fresh type variable, and the exhaustiveness checker cannot determine which variant constructors apply to an unresolved type variable. This is a fundamental limitation of pure Hindley-Milner type inference without bidirectional type checking.

## Affected Tests

**File:** `packages/core/src/typechecker/typechecker.test.ts`

### Test 1: Line 671 - Option Pattern Matching
```typescript
it.skip("should type check Option pattern matching", () => {
    const input = `
    type Option<T> = Some(T) | None

    let unwrapOr = (opt, default) => match opt {
        | Some(x) => x
        | None => default
    }
    `;
    const result = typeCheck(desugar(parse(tokenize(input, "test.vf"))));
    expect(result.declarationTypes.has("unwrapOr")).toBe(true);
});
```

### Test 2: Line 1097 - Result Error Handling
```typescript
it.skip("should type check Result type with error handling", () => {
    const input = `
    type Result<T, E> = Ok(T) | Err(E)

    let mapError = (result, f) => match result {
        | Ok(x) => Ok(x)
        | Err(e) => Err(f(e))
    }
    `;
    const result = typeCheck(desugar(parse(tokenize(input, "test.vf"))));
    expect(result.declarationTypes.has("mapError")).toBe(true);
});
```

### Test 3: Line 1326 - Higher-Order Functions with ADTs
```typescript
it.skip("should type check higher-order functions with ADTs", () => {
    const input = `
    type Option<T> = Some(T) | None

    let mapOption = (opt, f) => match opt {
        | Some(x) => Some(f(x))
        | None => None
    }
    `;
    const result = typeCheck(desugar(parse(tokenize(input, "test.vf"))));
    expect(result.declarationTypes.has("mapOption")).toBe(true);
});
```

### Expected Behavior
- Lambda parameters get fresh type variables initially
- Pattern match should constrain the type to be the variant type
- Exhaustiveness checking should verify all constructors are covered
- Type inference should unify the parameter type with the variant type
- Function should be properly polymorphic

### Actual Behavior
- Parameter `opt` gets fresh type variable `α`
- Pattern match sees `Some(x)` and `None` constructors
- Exhaustiveness checker tries to look up constructors for `α`
- Type variable `α` doesn't have associated constructors (it's abstract)
- Exhaustiveness checking fails or produces incorrect results

## Root Cause Analysis

### The Fundamental Issue

This is a **circular dependency** in type inference:

1. **To check exhaustiveness:** Need to know which constructors belong to the type
2. **To know the constructors:** Need to know the concrete type
3. **To know the concrete type:** Need to complete type inference
4. **Type inference depends on:** Pattern matching being valid

### How It Breaks Down

```typescript
let unwrapOr = (opt, default) => match opt { | Some(x) => x | None => default }
```

**Inference flow:**
1. `opt` gets fresh type variable `α`
2. `default` gets fresh type variable `β`
3. Pattern match on `opt`:
   - See constructor `Some(x)` → constrain `α` to be `Option<γ>` for some `γ`
   - See constructor `None` → also constrains `α` to be `Option<?>`
4. **Exhaustiveness check** runs but `α` is still a type variable
5. Can't determine if all `Option` constructors are covered

### Why This Works in OCaml/Haskell

Languages like OCaml and Haskell use **bidirectional type checking**:
- **Expected types flow downward** (top-down)
- **Inferred types flow upward** (bottom-up)
- Pattern matching can receive an **expected type** from context
- Exhaustiveness checking uses the expected type, not the inferred type

Our type checker uses pure **Algorithm W** (Hindley-Milner):
- Purely bottom-up inference
- No expected types
- Pattern matching must infer types from constructors alone

## Possible Solutions

### Option 1: Require Type Annotations (Simplest)

**Approach:** Require explicit type annotations for polymorphic pattern matches

```vibefun
let unwrapOr: (Option<T>, T) -> T = (opt, default) => match opt {
    | Some(x) => x
    | None => default
}
```

**Pros:**
- No type system changes needed
- Clear and explicit
- Matches Rust's approach

**Cons:**
- Less ergonomic
- More verbose
- Defeats purpose of type inference

**Implementation:**
- Document this as a language limitation
- Update tests to use type annotations
- Provide helpful error message when exhaustiveness fails on type variables

### Option 2: Implement Bidirectional Type Checking (Comprehensive)

**Approach:** Extend the type checker with bidirectional typing

Changes needed:
1. **Add expected types to inference context**
2. **Propagate expected types downward through expressions**
3. **Use expected types in pattern matching**
4. **Check exhaustiveness against expected types**

```typescript
// Add expected type to context
type InferenceContext = {
    env: TypeEnv;
    subst: Substitution;
    level: number;
    expected?: Type;  // Optional expected type
};

// Modify inferExpr to use expected types
function inferExpr(
    ctx: InferenceContext,
    expr: CoreExpr,
    expected?: Type
): InferResult {
    switch (expr.kind) {
        case "CoreMatchExpr": {
            // Use expected type for exhaustiveness checking
            const scrutineeType = expected || inferScrutinee(...);
            checkExhaustiveness(patterns, scrutineeType);  // Now has concrete type!
            // ...
        }
    }
}
```

**Pros:**
- Solves the problem completely
- Enables more sophisticated type checking
- Better error messages
- More inference without annotations

**Cons:**
- Significant implementation effort
- Requires refactoring the entire type checker
- Needs careful design to preserve soundness
- May introduce new edge cases

**Implementation phases:**
1. Add expected type parameter throughout inference
2. Implement checking mode (when expected type provided)
3. Implement synthesis mode (when inferring type)
4. Update pattern matching to use expected types
5. Update exhaustiveness checking to use expected types
6. Add subsumption checking (inferred ≤ expected)

### Option 3: Defer Exhaustiveness Checking (Pragmatic)

**Approach:** Collect pattern matches and check exhaustiveness after unification completes

```typescript
// During inference, collect pattern matches
const deferredExhaustivenessChecks: Array<{
    patterns: CorePattern[];
    scrutineeType: Type;
    loc: Location;
}> = [];

// After all inference and unification
for (const check of deferredExhaustivenessChecks) {
    const concreteType = applySubst(finalSubst, check.scrutineeType);
    checkExhaustiveness(check.patterns, concreteType);
}
```

**Pros:**
- Moderate implementation effort
- Works within current architecture
- No language changes needed

**Cons:**
- May still fail if type remains abstract
- Exhaustiveness errors reported after type inference
- More complex control flow

**Implementation:**
1. Create deferred check queue
2. Modify `inferMatchExpr` to defer checking
3. After `typeCheck` completes, run deferred checks
4. Report exhaustiveness errors with proper locations

### Option 4: Constructor-Based Type Inference (Advanced)

**Approach:** When we see constructors in patterns, immediately constrain the type

```typescript
// When inferring match expression
case "CoreMatchExpr": {
    // Collect all constructors used in patterns
    const constructors = getAllConstructorsFromPatterns(expr.patterns);

    // Find the variant type that has these constructors
    const variantType = findVariantTypeByConstructors(ctx.env, constructors);

    if (variantType) {
        // Unify scrutinee type with variant type immediately
        const concreteScrutineeType = instantiate(variantType, ctx.level);
        // ... now we can check exhaustiveness on concrete type
    }
}
```

**Pros:**
- Works within Algorithm W
- Leverages constructor information
- No type annotations needed

**Cons:**
- Fails if multiple variant types share constructor names
- Requires constructor name uniqueness
- May break valid programs with constructor overloading

## Recommended Approach

### Short Term: Option 1 (Type Annotations)

For the current release:
1. Document this as a known limitation
2. Update tests to use type annotations
3. Provide clear error message: "Cannot check exhaustiveness on polymorphic type. Add type annotation."

```typescript
// In exhaustiveness checker
function checkExhaustiveness(patterns: Pattern[], scrutineeType: Type): void {
    if (scrutineeType.kind === "TypeVar") {
        throw new TypeCheckerError(
            "Cannot check pattern exhaustiveness on polymorphic type",
            patterns[0].loc,
            "Add a type annotation to make the type concrete"
        );
    }
    // ... rest of checking
}
```

### Long Term: Option 2 (Bidirectional Typing)

For future enhancement:
1. Research bidirectional type checking implementations
2. Design the extension carefully
3. Implement in phases
4. Add comprehensive tests

This would significantly improve the type system and enable:
- Better type inference
- Clearer error messages
- More powerful pattern matching
- Potential for row polymorphism improvements

## Implementation Plan (Short Term)

### Step 1: Document the Limitation

Add to `vibefun-spec.md` and type checker documentation:

```markdown
### Pattern Matching on Polymorphic Types

When pattern matching on lambda parameters without type annotations,
exhaustiveness checking may fail because the type is not yet concrete.
In such cases, provide explicit type annotations:

```vibefun
// Without annotation - may fail
let unwrapOr = (opt, default) => match opt { ... }

// With annotation - works
let unwrapOr: (Option<T>, T) -> T = (opt, default) => match opt { ... }
```
```

### Step 2: Update Tests to Use Annotations

Modify the three affected tests to include type annotations:

```typescript
it("should type check Option pattern matching with annotations", () => {
    const input = `
    type Option<T> = Some(T) | None

    let unwrapOr: (Option<T>, T) -> T = (opt, default) => match opt {
        | Some(x) => x
        | None => default
    }
    `;
    // ...
});
```

### Step 3: Improve Error Message

Add helpful error when exhaustiveness checking encounters type variable:

```typescript
if (scrutineeType.kind === "TypeVar") {
    throw new TypeCheckerError(
        `Cannot verify pattern exhaustiveness on polymorphic type '${typeToString(scrutineeType)}'`,
        loc,
        "Consider adding a type annotation to specify the concrete type"
    );
}
```

### Step 4: Un-skip Tests and Verify

1. Remove `.skip` from all three tests
2. Verify they pass with type annotations
3. Run full test suite to ensure no regressions

## Files to Modify

- `packages/core/src/typechecker/exhaustiveness.ts` (improve error message)
- `packages/core/src/typechecker/typechecker.test.ts` (lines 671, 1097, 1326 - update tests)
- `vibefun-spec.md` (document limitation)
- `.claude/active/type-checker/` (update documentation)

## Success Criteria

- [ ] Limitation documented in language spec
- [ ] Helpful error message when exhaustiveness fails on type variable
- [ ] Tests updated to use type annotations
- [ ] All three tests pass when un-skipped
- [ ] All 1341 previously passing tests still pass
- [ ] `npm run verify` passes with no errors

## Future Work

If implementing bidirectional typing (Option 2):

1. **Research phase:** Study implementations in OCaml, Haskell, TypeScript
2. **Design phase:** Design the bidirectional extension
3. **Implementation phase:**
   - Add expected types to inference context
   - Implement checking vs synthesis modes
   - Update pattern matching
   - Update exhaustiveness checking
4. **Testing phase:** Comprehensive tests for bidirectional features
5. **Documentation phase:** Update spec and docs

## Notes

- This is a **fundamental limitation** of Algorithm W, not a bug per se
- Type annotations are a reasonable requirement for complex polymorphic patterns
- Most real-world code has type annotations for public APIs anyway
- Bidirectional typing would be a significant improvement but requires careful design
- OCaml requires similar annotations in some cases
- Rust requires explicit types in many situations and is still well-loved

## References

- **Bidirectional typing:** Dunfield & Krishnaswami (2013) - "Complete and Easy Bidirectional Typechecking for Higher-Rank Polymorphism"
- **Local type inference:** Pierce & Turner (2000) - "Local Type Inference"
- **Practical examples:** TypeScript's bidirectional checking, Haskell's type inference
- **Algorithm W limitations:** Well-documented in type theory literature
