# Bug #4: Multiple Declarations Can't Reference Each Other

**Status:** 🔜 Not Started
**Priority:** High (Phase 1)
**Complexity:** Medium
**Last Updated:** 2025-10-30

## Problem Statement

When a module contains multiple top-level declarations, subsequent declarations cannot reference previous declarations because the environment is not threaded between them. Each declaration is type-checked in isolation using the initial environment, so bindings from earlier declarations are never available to later ones.

## Affected Tests

**File:** `packages/core/src/typechecker/typechecker.test.ts`

### Test 1: Line 543
```typescript
it.skip("should type check record construction and access", () => {
    const input = `
    let person = { name: "Alice", age: 30 }
    let name = person.name
    let age = person.age
    `;
    const result = typeCheck(desugar(parse(tokenize(input, "test.vf"))));

    expect(result.declarationTypes.has("person")).toBe(true);
    expect(result.declarationTypes.has("name")).toBe(true);
    expect(result.declarationTypes.has("age")).toBe(true);
});
```

### Test 2: Line 1184
```typescript
it.skip("should type check record update expressions", () => {
    const input = `
    let person = { name: "Alice", age: 30 }
    let updated = { person | age: 31 }
    `;
    const result = typeCheck(desugar(parse(tokenize(input, "test.vf"))));

    expect(result.declarationTypes.has("person")).toBe(true);
    expect(result.declarationTypes.has("updated")).toBe(true);
});
```

### Expected Behavior
- First declaration creates a binding (e.g., `person`)
- Second declaration can reference the first binding in its value expression
- Third declaration can reference both previous bindings
- All declarations are successfully type-checked

### Actual Behavior
- Each declaration is type-checked with the initial environment
- When type-checking `let name = person.name`, `person` is not in the environment
- Results in "undefined variable: person" error

## Root Cause Analysis

### Location in Code
**File:** `packages/core/src/typechecker/typechecker.ts`
**Lines:** 44-63

```typescript
export function typeCheck(module: CoreModule): TypedModule {
    // Build type environment from module declarations
    const env = buildEnvironment(module as unknown as Module);  // Initial env

    // Map to store inferred types for top-level declarations
    const declarationTypes = new Map<string, Type>();

    // Type check each top-level declaration
    for (const decl of module.declarations) {
        typeCheckDeclaration(decl, env, declarationTypes);  // BUG: env never updated!
    }

    return {
        module,
        env,
        declarationTypes,
    };
}
```

### The Issue

The environment `env` is created once from `buildEnvironment()` and then passed unchanged to every declaration. When we type-check:

```vibefun
let person = { name: "Alice", age: 30 }  // person added to declarationTypes, NOT env
let name = person.name                    // person is NOT in env - error!
```

The `declarationTypes` map is updated, but not the environment used for inference.

### In typeCheckDeclaration

At line 76:
```typescript
case "CoreLetDecl": {
    const ctx = createContext(env);  // Creates fresh context with original env
    const result = inferExpr(ctx, decl.value);  // person not found!
    // ...
}
```

Each declaration gets a fresh context with the same initial environment, so bindings from previous declarations are never added.

## Proposed Fix

### Algorithm: Environment Threading

Thread the environment through each declaration:

1. Start with initial environment from `buildEnvironment()`
2. For each declaration:
   - Type-check with current environment
   - Add bindings to environment
   - Pass updated environment to next declaration
3. Return final environment

### Implementation

#### Modify typeCheck() Function

```typescript
export function typeCheck(module: CoreModule): TypedModule {
    // Build initial type environment from module declarations
    let env = buildEnvironment(module as unknown as Module);  // Make mutable

    // Map to store inferred types for top-level declarations
    const declarationTypes = new Map<string, Type>();

    // Type check each top-level declaration, threading environment
    for (const decl of module.declarations) {
        const updatedEnv = typeCheckDeclaration(decl, env, declarationTypes);
        env = updatedEnv;  // Thread environment through
    }

    return {
        module,
        env,  // Return final environment
        declarationTypes,
    };
}
```

#### Modify typeCheckDeclaration() Signature

Change the function to return the updated environment:

```typescript
function typeCheckDeclaration(
    decl: CoreDeclaration,
    env: TypeEnv,
    declarationTypes: Map<string, Type>
): TypeEnv {  // Return updated environment
    switch (decl.kind) {
        case "CoreLetDecl": {
            const ctx = createContext(env);
            const result = inferExpr(ctx, decl.value);

            const patternResult = checkPattern(
                ctx.env,
                decl.pattern,
                result.type,
                result.subst,
                ctx.level
            );

            // Create updated environment with new bindings
            const newEnv: TypeEnv = {
                values: new Map(env.values),
                types: env.types,
            };

            // Add all pattern bindings to environment
            for (const [name, type] of patternResult.bindings) {
                declarationTypes.set(name, type);

                // Generalize the type before adding to environment
                const scheme = generalize(env, 0, type);

                newEnv.values.set(name, {
                    kind: "Value",
                    scheme: scheme,
                    loc: decl.loc,
                });
            }

            return newEnv;  // Return updated environment
        }

        case "CoreTypeDecl": {
            // Type declarations already handled by buildEnvironment
            // Return unchanged environment
            return env;
        }

        case "CoreExternalDecl": {
            // After fixing Bug #1, add external to environment
            const newEnv: TypeEnv = {
                values: new Map(env.values),
                types: env.types,
            };

            // Convert signature to type and add to environment
            const externalType = /* convert signature */;
            newEnv.values.set(decl.name, {
                kind: "External",
                scheme: { vars: [], type: externalType },
                loc: decl.loc,
            });

            declarationTypes.set(decl.name, externalType);
            return newEnv;
        }

        case "CoreLetRecGroup": {
            // After fixing Bug #3, add all bindings to environment
            const newEnv: TypeEnv = {
                values: new Map(env.values),
                types: env.types,
            };

            // ... mutual recursion logic ...
            // For each binding in the group:
            for (const [name, type] of inferredTypes) {
                const scheme = generalize(env, 0, type);
                newEnv.values.set(name, {
                    kind: "Value",
                    scheme: scheme,
                    loc: /* ... */,
                });
                declarationTypes.set(name, instantiate(scheme, 0));
            }

            return newEnv;
        }
    }
}
```

## Implementation Plan

### Step 1: Modify typeCheckDeclaration Return Type

Change the function signature to return `TypeEnv`:
```typescript
function typeCheckDeclaration(
    decl: CoreDeclaration,
    env: TypeEnv,
    declarationTypes: Map<string, Type>
): TypeEnv
```

### Step 2: Update Each Case to Return Environment

For each `case` in the `switch` statement:
- **CoreLetDecl:** Create new env with pattern bindings, return it
- **CoreTypeDecl:** Return unchanged env (types handled in buildEnvironment)
- **CoreExternalDecl:** Create new env with external binding, return it
- **CoreLetRecGroup:** Create new env with all mutual bindings, return it

### Step 3: Thread Environment in typeCheck()

Update the main `typeCheck()` function:
```typescript
let env = buildEnvironment(module as unknown as Module);
for (const decl of module.declarations) {
    env = typeCheckDeclaration(decl, env, declarationTypes);
}
```

### Step 4: Handle Generalization Correctly

When adding bindings to the environment, generalize types appropriately:
- Top-level bindings should be generalized (polymorphic)
- Use `generalize(env, level, type)` before creating scheme
- Level should be 0 for top-level

### Step 5: Test the Fix

1. Un-skip both tests (lines 543 and 1184)
2. Run `npm test -- typechecker.test.ts -t "record construction"`
3. Run `npm test -- typechecker.test.ts -t "record update"`
4. Verify both pass
5. Check that subsequent declarations can use previous bindings

### Step 6: Add Comprehensive Tests

Test various declaration sequences:
```typescript
// Simple reference
let x = 42
let y = x + 1

// Multiple references
let a = 1
let b = 2
let c = a + b

// Function reference
let double = (x) => x * 2
let result = double(21)

// Higher-order reference
let apply = (f, x) => f(x)
let incremented = apply((x) => x + 1, 5)
```

## Files to Modify

- `packages/core/src/typechecker/typechecker.ts`
  - Lines 44-63: Modify `typeCheck()` to thread environment
  - Lines 68-145: Modify `typeCheckDeclaration()` to return TypeEnv
  - Each case in the switch: Add environment update logic
- `packages/core/src/typechecker/typechecker.test.ts`
  - Remove `.skip` at line 543
  - Remove `.skip` at line 1184

## Success Criteria

- [ ] `typeCheckDeclaration()` returns updated TypeEnv
- [ ] `typeCheck()` threads environment through declarations
- [ ] Subsequent declarations can reference previous declarations
- [ ] Tests at lines 543 and 1184 pass when un-skipped
- [ ] Record construction and access work across declarations
- [ ] Record update expressions work across declarations
- [ ] All 1341 previously passing tests still pass
- [ ] `npm run verify` passes with no errors

## Dependencies

- **Enables:** Bugs #1, #2, and #3 will benefit from proper environment threading
- **May require updates from:** Bug #1 (external declarations) and Bug #3 (mutual recursion) to properly update environment

## Notes

- This is a **critical** fix for basic module functionality
- Without environment threading, modules can only contain isolated declarations
- This is a standard compiler pattern (environment threading)
- Must ensure proper generalization of top-level bindings for polymorphism
- Must be careful with environment immutability (create new maps, don't mutate)
- This fix will likely expose or interact with Bugs #1, #2, and #3

## References

- **Compiler design:** Environment threading is standard practice
- **Type systems:** Generalization at top-level enables let-polymorphism
- **OCaml/SML:** Similar module-level declaration semantics
