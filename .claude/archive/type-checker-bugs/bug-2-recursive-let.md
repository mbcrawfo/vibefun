# Bug #2: Recursive CoreLetDecl Not Supported

**Status:** 🔜 Not Started
**Priority:** High (Phase 2)
**Complexity:** Medium
**Last Updated:** 2025-10-30

## Problem Statement

Single recursive functions using `let rec` syntax are not properly type-checked. The `CoreLetDecl` AST node has a `recursive: boolean` flag, but the type checker doesn't check or handle this flag, leading to "undefined variable" errors when the function references itself.

## Affected Test

**File:** `packages/core/src/typechecker/typechecker.test.ts`
**Line:** 254
**Test:** `it.skip("should type check recursive factorial with pattern matching")`

```typescript
it.skip("should type check recursive factorial with pattern matching", () => {
    const input = `
    let rec factorial = (n) => match n {
        | 0 => 1
        | m => m * factorial(m - 1)
    }`;
    const result = typeCheck(desugar(parse(tokenize(input, "test.vf"))));

    expect(result.declarationTypes.has("factorial")).toBe(true);
    const factorialType = result.declarationTypes.get("factorial")!;
    expect(factorialType.kind).toBe("FunctionType");
});
```

### Expected Behavior
- Function `factorial` should type-check successfully
- Should have function type `(Int) -> Int`
- Self-reference to `factorial` within the body should resolve correctly
- Pattern matching should work

### Actual Behavior
- Type checker doesn't recognize `decl.recursive === true`
- When inferring the lambda body, `factorial` is not in scope
- Results in "undefined variable: factorial" error

## Root Cause Analysis

### Location in Code
**File:** `packages/core/src/typechecker/typechecker.ts`
**Lines:** 74-88

```typescript
case "CoreLetDecl": {
    // Type check let declaration by inferring the value expression
    const ctx = createContext(env);

    // Infer the type of the value expression
    const result = inferExpr(ctx, decl.value);  // BUG: Doesn't check decl.recursive!

    // Check the pattern and get variable bindings
    const patternResult = checkPattern(
        ctx.env,
        decl.pattern,
        result.type,
        result.subst,
        ctx.level
    );

    // Store the inferred types for all pattern variables
    for (const [name, type] of patternResult.bindings) {
        declarationTypes.set(name, type);
    }
    break;
}
```

### The Issue
The code never checks `decl.recursive`. For recursive bindings:
1. The name needs to be in the environment **before** type-checking the value expression
2. Currently, it infers the value without the binding in scope
3. So references to `factorial` inside the function body are undefined

### CoreAST Structure
```typescript
// In types/core-ast.ts
export type CoreLetDecl = {
    kind: "CoreLetDecl";
    pattern: CorePattern;
    value: CoreExpr;
    recursive: boolean;  // <-- This flag is ignored!
    loc: Location;
};
```

## Proposed Fix

### Algorithm for Recursive Let

For `let rec x = expr`:

1. **Create a placeholder type variable** for the binding
2. **Add the binding to the environment** with the placeholder type
3. **Infer the value expression** with the binding in scope
4. **Unify the placeholder** with the inferred type
5. **Generalize and store** the final type

### Implementation

```typescript
case "CoreLetDecl": {
    const ctx = createContext(env);

    if (decl.recursive && decl.pattern.kind === "CoreVarPattern") {
        // Handle recursive binding
        const name = decl.pattern.name;

        // Create placeholder type for recursive reference
        const placeholderType: Type = {
            kind: "TypeVar",
            name: `t${ctx.level}`,
            level: ctx.level,
        };

        // Create temporary environment with binding in scope
        const tempEnv: TypeEnv = {
            values: new Map(ctx.env.values),
            types: ctx.env.types,
        };
        tempEnv.values.set(name, {
            kind: "Value",
            scheme: { vars: [], type: placeholderType },
            loc: decl.loc,
        });

        // Infer with name in scope
        const result = inferExpr({ ...ctx, env: tempEnv }, decl.value);

        // Unify placeholder with inferred type
        const unifySubst = unify(
            applySubst(result.subst, placeholderType),
            result.type
        );
        const finalSubst = composeSubst(unifySubst, result.subst);
        const finalType = applySubst(finalSubst, result.type);

        // Generalize and store
        const generalizedType = generalize(ctx.env, ctx.level, finalType);
        declarationTypes.set(name, instantiate(generalizedType, 0));

    } else {
        // Handle non-recursive binding (existing code)
        const result = inferExpr(ctx, decl.value);

        const patternResult = checkPattern(
            ctx.env,
            decl.pattern,
            result.type,
            result.subst,
            ctx.level
        );

        for (const [name, type] of patternResult.bindings) {
            declarationTypes.set(name, type);
        }
    }

    break;
}
```

## Implementation Plan

### Step 1: Add Recursive Handling to CoreLetDecl Case

1. Check `decl.recursive` flag
2. If recursive and pattern is a simple variable:
   - Create placeholder type variable
   - Add temporary binding to environment
   - Infer value expression with binding in scope
   - Unify placeholder with inferred type
3. If non-recursive:
   - Use existing logic

### Step 2: Handle Non-Variable Patterns

If the pattern is not a simple variable (e.g., tuple pattern), recursive binding may not make sense or may need special handling. For now, we can:
- Only support recursive binding for `CoreVarPattern`
- Throw an error if `recursive: true` with non-variable pattern
- Or fall back to non-recursive behavior

### Step 3: Update Type Variable Generation

Ensure we're using the helper functions correctly:
- Use `freshTypeVar(level)` if available
- Or create type variables manually with unique names

### Step 4: Test the Fix

1. Un-skip the test at line 254
2. Run `npm test -- typechecker.test.ts -t "recursive factorial"`
3. Verify the test passes
4. Check that the type is correctly inferred as `(Int) -> Int`

### Step 5: Add Additional Tests

Consider adding more recursive function tests:
```typescript
// Simple recursive function
let rec sum = (n) => if n == 0 then 0 else n + sum(n - 1)

// Recursive function with multiple parameters
let rec power = (base, exp) =>
    if exp == 0 then 1 else base * power(base, exp - 1)

// Recursive function returning different types
let rec replicate = (n, x) =>
    if n <= 0 then [] else x :: replicate(n - 1, x)
```

## Files to Modify

- `packages/core/src/typechecker/typechecker.ts` (lines 74-88)
- `packages/core/src/typechecker/typechecker.test.ts` (remove .skip at line 254)

## Success Criteria

- [ ] `decl.recursive` flag is checked in CoreLetDecl case
- [ ] Recursive functions can reference themselves in their body
- [ ] Test at line 254 passes when un-skipped
- [ ] Factorial function is correctly typed as `(Int) -> Int`
- [ ] All 1341 previously passing tests still pass
- [ ] `npm run verify` passes with no errors

## Dependencies

- **Requires:** Bug #4 fix (environment threading) may be needed if subsequent declarations reference the recursive function
- **Enables:** Bug #3 fix (mutual recursion) will build on this approach

## Notes

- This fix is critical for functional programming - recursion is fundamental
- The algorithm is well-established (standard ML-style recursive let)
- Must ensure type variable levels are handled correctly to prevent escape
- Generalization must happen at the correct level
- This fix will inform the approach for Bug #3 (mutual recursion)

## References

- **Algorithm W with levels:** Pierce's TAPL Chapter 22
- **Let-polymorphism:** Damas-Milner type system
- **OCaml recursive let:** Similar semantics to what we want
