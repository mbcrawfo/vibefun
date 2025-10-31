# Bug #6: Record Pattern Matching in Lambdas

**Status:** 🔜 Not Started
**Priority:** Medium (Phase 4)
**Complexity:** High
**Last Updated:** 2025-10-30

## Problem Statement

Record patterns used in match expressions within lambda functions fail because of a circular dependency in type inference: we need the type to check the pattern, but we need the pattern to infer the type. Additionally, record pattern support in match expressions may not be fully implemented.

## Affected Test

**File:** `packages/core/src/typechecker/typechecker.test.ts`
**Line:** 1016
**Test:** `it.skip("should type check record pattern matching")`

```typescript
it.skip("should type check record pattern matching", () => {
    const input = `
    let getName = (p) => match p {
        | { name } => name
    }
    `;
    const result = typeCheck(desugar(parse(tokenize(input, "test.vf"))));

    expect(result.declarationTypes.has("getName")).toBe(true);
    const getNameType = result.declarationTypes.get("getName")!;
    expect(getNameType.kind).toBe("FunctionType");
});
```

### Expected Behavior
- Parameter `p` should be inferred as having a record type with at least a `name` field
- Record pattern `{ name }` should destructure and bind the `name` field
- Function should return the type of the `name` field
- Function type should be something like `({ name: T, ... }) -> T`

### Actual Behavior
- Parameter `p` gets fresh type variable `α`
- Pattern `{ name }` requires `α` to be a record type with `name` field
- Circular dependency: need type to check pattern, need pattern to infer type
- May also fail if record patterns aren't fully implemented in match expressions

## Root Cause Analysis

### Issue 1: Bidirectional Typing Problem (Like Bug #5)

Similar to Bug #5, this is a circular dependency:

```typescript
let getName = (p) => match p { | { name } => name }
```

**Inference flow:**
1. `p` gets fresh type variable `α`
2. Match on `p`:
   - Pattern `{ name }` needs `α` to be a record type
   - But `α` is abstract - we don't know it's a record yet
3. Need to constrain `α` to be `{ name: β, ... }` for some `β`
4. But pattern checking might not be able to work with abstract types

### Issue 2: Record Pattern Implementation

The test comment says:
> "Record patterns in lambdas need type information"
> "This requires pattern matching in match expressions, which may not be fully supported"

This suggests that **record patterns in match expressions** might not be fully implemented or tested.

### Investigation Needed

Check if record patterns work in match expressions at all:

**File:** `packages/core/src/typechecker/patterns.ts`

Look for:
```typescript
case "CoreRecordPattern": {
    // Is this implemented?
    // Does it handle match expression context?
}
```

## Possible Solutions

### Option 1: Require Type Annotations (Like Bug #5 Solution)

**Approach:** Require explicit type annotation for record pattern matching

```vibefun
let getName: ({ name: String }) -> String = (p) => match p {
    | { name } => name
}
```

**Pros:**
- Simple and explicit
- No type system changes
- Consistent with Bug #5 solution

**Cons:**
- Verbose
- Less ergonomic

### Option 2: Implement Bidirectional Type Checking

**Approach:** Same as Bug #5 - implement bidirectional typing to propagate expected types

With expected types, record patterns could work:
```typescript
// When inferring match expression
case "CoreMatchExpr": {
    // Expected type for scrutinee comes from context
    const expectedScrutineeType = ctx.expected;

    // Check pattern against expected type
    checkPattern(pattern, expectedScrutineeType);

    // Now we know p : { name: String, ... }
}
```

**Pros:**
- Complete solution
- Enables many type system improvements
- Natural and ergonomic

**Cons:**
- Significant implementation effort
- Same as Bug #5 - requires full bidirectional typing

### Option 3: Generate Record Type Constraints from Pattern

**Approach:** When we see a record pattern, immediately constrain the type to be a record

```typescript
// When checking record pattern against type variable
case "CoreRecordPattern": {
    if (scrutineeType.kind === "TypeVar") {
        // Generate a fresh record type
        const recordType: Type = {
            kind: "RecordType",
            fields: new Map(
                pattern.fields.map(field => [
                    field.name,
                    freshTypeVar(ctx.level)  // Fresh type for each field
                ])
            ),
            // Optional: add row variable for extensibility
        };

        // Unify scrutinee type with generated record type
        const subst = unify(scrutineeType, recordType);

        // Continue pattern checking with concrete record type
    }
}
```

**Pros:**
- Works within current architecture
- No language changes needed
- Enables record pattern inference

**Cons:**
- May be unsound if not careful
- Need to handle row polymorphism correctly
- Complex interaction with other type constraints

### Option 4: Only Support Record Patterns with Type Annotations

**Approach:** Similar to Option 1, but be explicit in the pattern checker

```typescript
case "CoreRecordPattern": {
    if (scrutineeType.kind === "TypeVar") {
        throw new TypeCheckerError(
            "Cannot use record pattern on polymorphic type",
            pattern.loc,
            "Add a type annotation to specify the record type"
        );
    }

    if (scrutineeType.kind !== "RecordType") {
        throw new TypeCheckerError(
            "Record pattern requires a record type",
            pattern.loc
        );
    }

    // Continue with concrete record type
}
```

## Implementation Plan

### Step 1: Verify Record Pattern Implementation

Check if record patterns are fully implemented:

1. Read `packages/core/src/typechecker/patterns.ts`
2. Find the `CoreRecordPattern` case
3. Verify it handles:
   - Field destructuring
   - Binding creation
   - Type checking
   - Match expression context

If not implemented, implement it first before addressing the bidirectional typing issue.

### Step 2: Choose Approach

**Recommendation for short term:** Option 1 or 4 (require annotations)

Reasons:
- Consistent with Bug #5 solution
- Simple and explicit
- No risk of unsoundness
- Can be improved later with bidirectional typing

**Long term:** Option 2 (bidirectional typing)

### Step 3: Implement Record Pattern Support (If Needed)

If record patterns aren't fully implemented in match expressions:

```typescript
// In patterns.ts
case "CoreRecordPattern": {
    if (scrutineeType.kind !== "RecordType") {
        if (scrutineeType.kind === "TypeVar") {
            throw new TypeCheckerError(
                "Cannot use record pattern with polymorphic type",
                pattern.loc,
                "Add a type annotation to specify the record type"
            );
        }
        throw new TypeCheckerError(
            `Expected record type, got ${typeToString(scrutineeType)}`,
            pattern.loc
        );
    }

    // Extract field bindings
    const bindings = new Map<string, Type>();

    for (const field of pattern.fields) {
        const fieldType = scrutineeType.fields.get(field.name);

        if (!fieldType) {
            // With row polymorphism, missing fields might be ok
            // Without row polymorphism, this is an error
            throw new TypeCheckerError(
                `Record does not have field '${field.name}'`,
                field.loc
            );
        }

        // If field has a sub-pattern, check it recursively
        if (field.pattern) {
            const subResult = checkPattern(
                env,
                field.pattern,
                fieldType,
                subst,
                level
            );
            for (const [name, type] of subResult.bindings) {
                bindings.set(name, type);
            }
        } else {
            // Simple binding: { name } means bind 'name' to the field value
            bindings.set(field.name, fieldType);
        }
    }

    return {
        bindings,
        subst,
    };
}
```

### Step 4: Update Test with Type Annotation

Modify the test to use type annotations:

```typescript
it("should type check record pattern matching with annotations", () => {
    const input = `
    let getName: ({ name: String }) -> String = (p) => match p {
        | { name } => name
    }
    `;
    const result = typeCheck(desugar(parse(tokenize(input, "test.vf"))));

    expect(result.declarationTypes.has("getName")).toBe(true);
    const getNameType = result.declarationTypes.get("getName")!;
    expect(getNameType.kind).toBe("FunctionType");
});
```

### Step 5: Document the Limitation

Add to language spec and type checker docs:

```markdown
### Record Pattern Matching

Record patterns in match expressions require concrete record types.
When pattern matching on lambda parameters, provide explicit type annotations:

```vibefun
// Without annotation - may fail
let getName = (p) => match p { | { name } => name }

// With annotation - works
let getName: ({ name: String }) -> String = (p) => match p { | { name } => name }
```
```

### Step 6: Test and Verify

1. Un-skip the test at line 1016
2. Verify it passes with type annotation
3. Test various record patterns:
   - Simple field extraction: `{ name }`
   - Multiple fields: `{ name, age }`
   - Nested patterns: `{ person: { name } }`
4. Run full test suite

## Files to Modify

- `packages/core/src/typechecker/patterns.ts` (implement/improve CoreRecordPattern)
- `packages/core/src/typechecker/typechecker.test.ts` (line 1016 - update test)
- `vibefun-spec.md` (document limitation)
- `.claude/active/type-checker/` (update documentation)

## Success Criteria

- [ ] Record pattern support verified/implemented in patterns.ts
- [ ] Clear error message when using record patterns on type variables
- [ ] Test updated to use type annotation
- [ ] Test at line 1016 passes when un-skipped
- [ ] Function correctly typed with record parameter
- [ ] Limitation documented in language spec
- [ ] All 1341 previously passing tests still pass
- [ ] `npm run verify` passes with no errors

## Dependencies

- **Related to:** Bug #5 (same fundamental issue - bidirectional typing)
- **May require:** Full record pattern implementation in patterns.ts

## Future Work

If implementing bidirectional typing (same as Bug #5):
- Record patterns would work naturally with expected types
- Could infer record types from patterns
- More ergonomic and powerful

See Bug #5 plan for details on bidirectional typing implementation.

## Notes

- Record patterns are less common than variant patterns in functional programming
- Type annotations for record patterns are reasonable
- This is similar to TypeScript requiring type annotations for object destructuring in some cases
- Row polymorphism (structural subtyping) makes this more complex
- Our current record type system uses width subtyping
- Must ensure sound interaction with width subtyping

## References

- **Record patterns:** ML/OCaml record destructuring
- **Row polymorphism:** "Extensible Records with Scoped Labels" - Leijen (2005)
- **Bidirectional typing:** Same references as Bug #5
- **TypeScript destructuring:** Similar patterns and limitations
