# Bug #3: Mutual Recursion Environment Not Updated

**Status:** 🔜 Not Started
**Priority:** High (Phase 2)
**Complexity:** Medium
**Last Updated:** 2025-10-30

## Problem Statement

Mutually recursive function groups using `let rec ... and ...` syntax are not properly type-checked. The `CoreLetRecGroup` case creates a synthetic `CoreLetRecExpr` and calls `inferExpr()`, but the environment updates made inside `inferLetRecExpr()` are lost, so the bindings can't be extracted afterward.

## Affected Test

**File:** `packages/core/src/typechecker/typechecker.test.ts`
**Line:** 359
**Test:** `it.skip("should type check mutual recursion (isEven/isOdd)")`

```typescript
it.skip("should type check mutual recursion (isEven/isOdd)", () => {
    const input = `
    let rec isEven = n => match n { | 0 => true | n => isOdd(n - 1) }
        and isOdd = n => match n { | 0 => false | n => isEven(n - 1) }
    `;
    const result = typeCheck(desugar(parse(tokenize(input, "test.vf"))));

    expect(result.declarationTypes.has("isEven")).toBe(true);
    expect(result.declarationTypes.has("isOdd")).toBe(true);

    const isEvenType = result.declarationTypes.get("isEven")!;
    const isOddType = result.declarationTypes.get("isOdd")!;

    expect(isEvenType.kind).toBe("FunctionType");
    expect(isOddType.kind).toBe("FunctionType");
});
```

### Expected Behavior
- Both `isEven` and `isOdd` should type-check successfully
- Both should have function type `(Int) -> Bool`
- Cross-references should resolve (isEven calls isOdd, isOdd calls isEven)
- Types should be added to `declarationTypes` map

### Actual Behavior
- `inferLetRecExpr()` updates `ctx.env` internally but changes are lost
- When we try to extract types at line 115, `ctx.env.values.get(name)` returns `undefined`
- Bindings never make it into `declarationTypes`

## Root Cause Analysis

### Location in Code
**File:** `packages/core/src/typechecker/typechecker.ts`
**Lines:** 91-123

```typescript
case "CoreLetRecGroup": {
    // Type check mutually recursive function group
    const ctx = createContext(env);

    // Create a synthetic expression for the let rec group
    const letRecExpr: CoreExpr = {
        kind: "CoreLetRecExpr",
        bindings: decl.bindings,
        body: {
            kind: "CoreUnitLit",
            loc: decl.loc,
        },
        loc: decl.loc,
    };

    // Infer the let rec expression (this updates the environment)
    inferExpr(ctx, letRecExpr);  // BUG: ctx passed by value, not reference

    // Extract the inferred types from the updated environment
    for (const binding of decl.bindings) {
        if (binding.pattern.kind === "CoreVarPattern") {
            const name = binding.pattern.name;
            const bindingScheme = ctx.env.values.get(name);  // LINE 115 - undefined!
            if (bindingScheme && bindingScheme.kind === "Value") {
                const type = instantiate(bindingScheme.scheme, 0);
                declarationTypes.set(name, type);
            }
        }
    }
    break;
}
```

### The Issue

1. **inferExpr() doesn't return environment:** The `InferResult` type only contains `type` and `subst`, not the updated environment
2. **Context passed by value:** TypeScript objects are passed by reference, but we don't capture the modifications
3. **Environment changes lost:** `inferLetRecExpr()` modifies `ctx.env` internally, but those changes don't propagate back

### How inferLetRecExpr Works

In `packages/core/src/typechecker/infer.ts`, the `inferLetRecExpr` function:
1. Creates placeholder types for all bindings
2. Adds them to the environment
3. Infers each binding with all names in scope
4. Unifies placeholders with inferred types
5. Updates the environment with generalized types

**But** the environment updates are local to that function and never escape.

## Proposed Fix

We have three options:

### Option 1: Return Environment from inferExpr (Most General)

Modify `InferResult` to optionally include the updated environment:

```typescript
// In infer.ts
export type InferResult = {
    type: Type;
    subst: Substitution;
    env?: TypeEnv;  // Optional updated environment
};
```

**Pros:**
- General solution that could help with other cases
- Clean separation of concerns

**Cons:**
- Requires changes throughout inference code
- Most expressions don't need to return environments
- Could be confusing when to include env vs not

### Option 2: Return Bindings Map from inferLetRecExpr (Cleaner)

Have `inferLetRecExpr` return the computed bindings:

```typescript
// Modify inferLetRecExpr signature
function inferLetRecExpr(
    ctx: InferenceContext,
    expr: CoreLetRecExpr
): InferResult & { bindings: Map<string, TypeScheme> } {
    // ... existing logic ...

    return {
        type: bodyType,
        subst: finalSubst,
        bindings: computedBindings,  // Return the bindings map
    };
}
```

Then in `typeCheckDeclaration`:
```typescript
case "CoreLetRecGroup": {
    const ctx = createContext(env);
    const letRecExpr: CoreExpr = { /* ... */ };

    const result = inferExpr(ctx, letRecExpr) as InferResult & {
        bindings: Map<string, TypeScheme>;
    };

    // Extract types from returned bindings
    for (const [name, scheme] of result.bindings) {
        const type = instantiate(scheme, 0);
        declarationTypes.set(name, type);
    }

    break;
}
```

**Pros:**
- Minimal changes required
- Type-safe
- Only affects mutual recursion

**Cons:**
- Requires type assertion or union type
- Couples the inference result to declaration handling

### Option 3: Don't Use Synthetic Expression (Recommended)

Inline the mutual recursion logic directly in the `CoreLetRecGroup` case instead of creating a synthetic expression:

```typescript
case "CoreLetRecGroup": {
    const ctx = createContext(env);

    // Create placeholder types for all bindings
    const placeholders = new Map<string, Type>();
    const tempEnv: TypeEnv = {
        values: new Map(ctx.env.values),
        types: ctx.env.types,
    };

    // Add all bindings with placeholder types
    for (const binding of decl.bindings) {
        if (binding.pattern.kind === "CoreVarPattern") {
            const name = binding.pattern.name;
            const placeholder: Type = {
                kind: "TypeVar",
                name: `t${ctx.level}_${name}`,
                level: ctx.level,
            };
            placeholders.set(name, placeholder);
            tempEnv.values.set(name, {
                kind: "Value",
                scheme: { vars: [], type: placeholder },
                loc: binding.loc,
            });
        }
    }

    // Infer each binding with all names in scope
    let currentSubst: Substitution = new Map();
    const inferredTypes = new Map<string, Type>();

    for (const binding of decl.bindings) {
        if (binding.pattern.kind === "CoreVarPattern") {
            const name = binding.pattern.name;
            const inferCtx: InferenceContext = {
                env: tempEnv,
                subst: currentSubst,
                level: ctx.level + 1,
            };

            // Infer the binding value
            const result = inferExpr(inferCtx, binding.value);

            // Unify placeholder with inferred type
            const placeholder = placeholders.get(name)!;
            const placeholderApplied = applySubst(result.subst, placeholder);
            const unifySubst = unify(placeholderApplied, result.type);
            currentSubst = composeSubst(unifySubst, result.subst);

            // Store the inferred type
            const finalType = applySubst(currentSubst, result.type);
            inferredTypes.set(name, finalType);
        }
    }

    // Generalize and store all bindings
    for (const [name, type] of inferredTypes) {
        const generalizedType = generalize(ctx.env, ctx.level, type);
        const instantiatedType = instantiate(generalizedType, 0);
        declarationTypes.set(name, instantiatedType);
    }

    break;
}
```

**Pros:**
- Self-contained solution
- No changes to inference code needed
- Clear and explicit logic
- Matches Bug #2's approach

**Cons:**
- Code duplication with `inferLetRecExpr`
- Longer case handler

## Implementation Plan

### Step 1: Choose Approach

**Recommendation:** Use Option 3 (inline logic) because:
- It's self-contained
- Doesn't require changing inference infrastructure
- Similar to Bug #2's fix
- Clear and maintainable

### Step 2: Implement the Fix

1. Replace the synthetic expression approach with inline logic
2. Create placeholders for all bindings
3. Add all bindings to temporary environment
4. Infer each binding with all names in scope
5. Unify placeholders with inferred types
6. Generalize and store results

### Step 3: Handle Edge Cases

- **Non-variable patterns:** Only support simple variable patterns in mutual recursion
- **Empty binding list:** Handle gracefully
- **Type variable levels:** Ensure correct level management to prevent escape

### Step 4: Test the Fix

1. Un-skip the test at line 359
2. Run `npm test -- typechecker.test.ts -t "mutual recursion"`
3. Verify both `isEven` and `isOdd` are correctly typed
4. Check that cross-references work

### Step 5: Add Additional Tests

Consider testing:
```typescript
// Three-way mutual recursion
let rec f = x => if x then g(false) else true
    and g = y => if y then h(false) else false
    and h = z => if z then f(true) else true

// Mutual recursion with different arities
let rec listToTree = lst => match lst { ... treeToList(...) ... }
    and treeToList = tree => match tree { ... listToTree(...) ... }
```

## Files to Modify

- `packages/core/src/typechecker/typechecker.ts` (lines 91-123)
- `packages/core/src/typechecker/typechecker.test.ts` (remove .skip at line 359)

## Success Criteria

- [ ] Mutual recursion logic is inlined in CoreLetRecGroup case
- [ ] All bindings are correctly typed and added to declarationTypes
- [ ] Cross-references between mutually recursive functions work
- [ ] Test at line 359 passes when un-skipped
- [ ] isEven and isOdd are correctly typed as `(Int) -> Bool`
- [ ] All 1341 previously passing tests still pass
- [ ] `npm run verify` passes with no errors

## Dependencies

- **Builds on:** Bug #2 fix (single recursive let) - similar algorithm
- **May require:** Bug #4 fix (environment threading) for subsequent declarations

## Notes

- Mutual recursion is essential for many functional programming patterns
- The algorithm is standard ML-style mutual recursion (like OCaml's `let rec ... and`)
- Must carefully manage type variable levels to prevent escape
- All bindings must be in scope before inferring any of them
- This is more complex than Bug #2 but uses the same fundamental approach

## References

- **Algorithm W with mutual recursion:** Standard ML definition
- **OCaml let rec and:** Direct language analog
- **Pierce TAPL:** Chapter on recursive types and let-polymorphism
