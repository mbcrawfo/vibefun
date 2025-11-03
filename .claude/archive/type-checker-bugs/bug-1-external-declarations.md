# Bug #1: External Declarations Not Added to declarationTypes

**Status:** 🔜 Not Started
**Priority:** High (Phase 1)
**Complexity:** Low
**Last Updated:** 2025-10-30

## Problem Statement

External function declarations (FFI bindings to JavaScript) are not being added to the `declarationTypes` map during type checking, even though they should be processed by `buildEnvironment()`.

## Affected Test

**File:** `packages/core/src/typechecker/typechecker.test.ts`
**Line:** 109
**Test:** `it.skip("should type check external function declaration")`

```typescript
it.skip("should type check external function declaration", () => {
    const input = `external log: (String) -> Unit = "console.log"`;
    const result = typeCheck(desugar(parse(tokenize(input, "test.vf"))));

    expect(result.declarationTypes.has("log")).toBe(true);
    const logType = result.declarationTypes.get("log")!;
    expect(logType.kind).toBe("FunctionType");
});
```

### Expected Behavior
- External declaration `log` should appear in `result.declarationTypes`
- Should have type `(String) -> Unit` (function type)

### Actual Behavior
- `result.declarationTypes.has("log")` returns `false`
- The external declaration is not being stored

## Root Cause Analysis

### Location in Code
**File:** `packages/core/src/typechecker/typechecker.ts`
**Lines:** 131-143

```typescript
case "CoreExternalDecl":
    // External declarations are processed in buildEnvironment
    // but we need to store them in declarationTypes
    {
        const binding = env.values.get(decl.name);  // LINE 135 - Returns undefined!
        if (binding) {
            if (binding.kind === "Value" || binding.kind === "External") {
                const type = instantiate(binding.scheme, 0);
                declarationTypes.set(decl.name, type);
            }
        }
    }
    break;
```

### The Issue
`env.values.get(decl.name)` returns `undefined` even though `buildEnvironment()` should have processed the external declaration and added it to the environment.

### Possible Causes

1. **buildEnvironment() doesn't process CoreExternalDecl correctly**
   - The environment building step might be skipping external declarations
   - Need to check `packages/core/src/typechecker/environment.ts`

2. **Name mismatch**
   - External declarations might be stored with a different key (e.g., module-qualified names)
   - Need to verify how external names are stored vs looked up

3. **Type mismatch in buildEnvironment()**
   - The `buildEnvironment()` function expects a `Module` type
   - We're passing `module as unknown as Module` (type cast)
   - External declarations might be handled differently in the desugared AST

## Investigation Steps

### Step 1: Check buildEnvironment() implementation
**File:** `packages/core/src/typechecker/environment.ts`

Look for how `CoreExternalDecl` is handled:
```typescript
// Does buildEnvironment() handle external declarations?
// Search for: "CoreExternalDecl" or "External"
```

### Step 2: Add debug logging
Add temporary logging to understand what's happening:

```typescript
case "CoreExternalDecl":
    {
        console.log("Processing external:", decl.name);
        console.log("Env keys:", Array.from(env.values.keys()));
        const binding = env.values.get(decl.name);
        console.log("Binding found:", binding);
        // ... rest of code
    }
```

### Step 3: Check if externals need different handling
External declarations might need to be added to the environment manually in the `typeCheckDeclaration` function rather than relying on `buildEnvironment()`.

## Proposed Fix

### Option 1: Fix buildEnvironment() (Most Likely)

If `buildEnvironment()` isn't processing external declarations, add handling:

```typescript
// In environment.ts - buildEnvironment()
case "ExternalDecl":
case "CoreExternalDecl":
    {
        const externalType = // ... convert signature to Type
        env.values.set(decl.name, {
            kind: "External",
            scheme: { vars: [], type: externalType },
            loc: decl.loc
        });
    }
    break;
```

### Option 2: Handle in typeCheckDeclaration()

If externals shouldn't go through buildEnvironment, process them directly:

```typescript
case "CoreExternalDecl":
    {
        // Convert the external signature to a Type
        const externalType = convertSignatureToType(decl.signature);

        // Store in declarationTypes
        declarationTypes.set(decl.name, externalType);

        // Also add to environment for subsequent declarations
        env.values.set(decl.name, {
            kind: "External",
            scheme: { vars: [], type: externalType },
            loc: decl.loc
        });
    }
    break;
```

### Option 3: Check Type Cast Issue

The issue might be the type cast at line 45:
```typescript
const env = buildEnvironment(module as unknown as Module);
```

If `buildEnvironment()` expects a non-desugared `Module` but receives a `CoreModule`, it might not have handlers for `CoreExternalDecl`. Need to:
- Either update `buildEnvironment()` to handle `CoreModule`
- Or create a separate `buildEnvironmentFromCore()` function

## Implementation Plan

1. **Investigate buildEnvironment()**
   - Read `packages/core/src/typechecker/environment.ts`
   - Check if it handles external declarations
   - Understand the expected input type

2. **Identify the Root Cause**
   - Add debug logging to see what's in the environment
   - Determine if externals are being processed at all

3. **Implement the Fix**
   - Based on investigation, apply the appropriate fix option
   - Ensure external declarations are added to both `env.values` and `declarationTypes`

4. **Un-skip the Test**
   - Remove `.skip` from line 109
   - Run `npm test -- typechecker.test.ts`
   - Verify the test passes

5. **Verify No Regressions**
   - Run full test suite: `npm test`
   - Ensure 1342/1342 tests pass
   - Run `npm run verify` for complete quality check

## Files to Modify

- `packages/core/src/typechecker/typechecker.ts` (lines 131-143)
- Possibly `packages/core/src/typechecker/environment.ts`
- `packages/core/src/typechecker/typechecker.test.ts` (remove .skip at line 109)

## Success Criteria

- [ ] External declarations are added to `declarationTypes` map
- [ ] Test at line 109 passes when un-skipped
- [ ] All 1341 previously passing tests still pass
- [ ] `npm run verify` passes with no errors

## Notes

- This is a critical bug because external declarations are fundamental to JavaScript interop
- The fix should be straightforward once we understand where the environment building breaks
- This is a good first bug to tackle due to its low complexity
