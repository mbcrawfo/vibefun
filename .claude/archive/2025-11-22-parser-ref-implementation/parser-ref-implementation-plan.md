# Parser ref() Implementation Plan

**Created:** 2025-11-22
**Last Updated:** 2025-11-22
**Status:** Planning
**Branch:** parser-ref-implementation

## Overview

Implement parser validation to enforce that mutable variable declarations (`let mut`) must use `ref()` syntax, matching the language specification. Update all tests, fixtures, and documentation to use the correct syntax.

## Background

The vibefun language specification requires mutable bindings to use explicit `ref()` syntax:
```vibefun
let mut counter = ref(0);  // Correct per spec
```

However, the parser currently accepts direct value assignment:
```vibefun
let mut counter = 0;  // Currently parses, but violates spec
```

This discrepancy was documented in commit `aa00678` (2025-11-22). The parser needs to enforce the spec-compliant syntax.

## Design Decision: Keep Explicit `ref()` Syntax

After thorough analysis, we decided to maintain the explicit `ref()` syntax rather than auto-wrapping values because:

1. **Type System Consistency**: Auto-wrapping creates ambiguity in type inference (does `Int` refer to the ref's contents or wrapper?)
2. **Language Philosophy**: Violates vibefun's "Explicitness Over Implicitness" principle
3. **Edge Case Complexity**: Unclear semantics for ref-of-ref, pattern matching, function calls
4. **ML Family Alignment**: OCaml and Reason use explicit `ref`, F#'s `let mutable` is a different feature
5. **Implementation Simplicity**: Validation is simpler than auto-wrapping logic

## Current State Analysis

### What's Already Working
- **Function call parsing**: `parseCall` fully supports `ref(value)` syntax
- **Type checker**: Built-in `ref` function with type `forall a. (a) -> Ref<a>`
- **AST representation**: `ref(0)` is a standard `App` node
- **Documentation**: All spec files use correct `ref()` syntax

### What Needs Implementation
1. **Parser validation**: Enforce `mut` bindings have `ref()` call syntax
2. **Test updates**: Fix 5 test files using incorrect syntax
3. **Fixture updates**: Fix 3 `.vf` fixture files
4. **Snapshot regeneration**: Update after fixture changes
5. **Validation tests**: Add parser tests for error cases

## Implementation Phases

### Phase 1: Parser Validation (Core Implementation)

**File:** `packages/core/src/parser/parse-declarations.ts`

Add validation in `parseLetDeclaration` function (currently at lines 161-196):

```typescript
// After parsing value expression (currently line 195)
const value = parseExpression(parser);

// Add validation for mutable bindings
if (mutable) {
  // Check if value is ref() call
  if (
    value.kind !== "App" ||
    value.func.kind !== "Var" ||
    value.func.name !== "ref"
  ) {
    throw new ParserError(
      "Mutable bindings must use ref() syntax",
      value.loc,
      `Use: let mut ${pattern.name} = ref(${getExpressionHint(value)})`
    );
  }
}
```

**Error Message Design:**
- Clear explanation: "Mutable bindings must use ref() syntax"
- Helpful suggestion with actual code: `let mut x = ref(value)`
- Include location information for good IDE integration

### Phase 2: Add Parser Tests

**File:** `packages/core/src/parser/declarations.test.ts`

Add new test section after existing tests:

```typescript
describe("mutable binding ref() validation", () => {
  it("should accept mut bindings with ref() call", () => {
    const code = "let mut x = ref(0);";
    const result = parseModule(code);
    expect(result.kind).toBe("Module");
  });

  it("should accept ref() with complex expressions", () => {
    const code = "let mut x = ref(Some(42));";
    const result = parseModule(code);
    expect(result.kind).toBe("Module");
  });

  it("should accept ref() with nested values", () => {
    const code = "let mut x = ref([1, 2, 3]);";
    const result = parseModule(code);
    expect(result.kind).toBe("Module");
  });

  it("should reject mut bindings without ref()", () => {
    const code = "let mut x = 0;";
    expect(() => parseModule(code)).toThrow(
      "Mutable bindings must use ref() syntax"
    );
  });

  it("should reject mut bindings with other function calls", () => {
    const code = "let mut x = someFunction();";
    expect(() => parseModule(code)).toThrow(
      "Mutable bindings must use ref() syntax"
    );
  });

  it("should reject mut bindings with direct constructors", () => {
    const code = "let mut x = None;";
    expect(() => parseModule(code)).toThrow(
      "Mutable bindings must use ref() syntax"
    );
  });
});
```

### Phase 3: Fix Existing Test Files

**Files to update with correct syntax:**

1. `packages/core/src/parser/declarations.test.ts:54`
   ```typescript
   // Before: let mut counter = 0;
   // After:  let mut counter = ref(0);
   ```

2. `packages/core/src/parser/declarations.test.ts:75`
   ```typescript
   // Before: let mut rec state = initialState();
   // After:  let mut rec state = ref(initialState());
   ```

3. `packages/core/src/parser/parser-integration.test.ts:334`
   ```typescript
   // Before: let mut count = 0;
   // After:  let mut count = ref(0);
   ```

### Phase 4: Fix Fixture Files

**Update 3 `.vf` fixture files:**

1. `packages/core/src/parser/snapshot-tests/control-flow.vf:23`
2. `packages/core/src/parser/snapshot-tests/declarations.vf:46`
3. `packages/core/src/parser/snapshot-tests/expressions.vf:48`

All need: `let mut counter = 0;` → `let mut counter = ref(0);`

### Phase 5: Update Snapshots & Verify

After fixture changes, snapshots will be outdated:

```bash
npm test  # Will update snapshots automatically
```

Then run full verification:

```bash
npm run verify  # Runs: check, lint, test, format
```

Ensure all 500+ tests pass.

### Phase 6: Update Spec Documentation

**File:** `docs/spec/07-mutable-references.md`

Remove the discrepancy note (around lines 50-60) that documents the parser limitation. The note was added as a temporary placeholder and should be removed once the parser supports ref().

## Implementation Strategy

### Validation Approach

**Chosen: Parser-time validation (Option A)**

Validate at parse time rather than type-check time because:
- Earlier, clearer error messages
- Fails fast with helpful suggestions
- Consistent with other syntax errors
- Simpler implementation

**Alternative considered: Type-checker validation (Option B)**
- Would allow more flexibility
- But gives later errors with less context
- More complex to provide good error messages

### Error Message Format

```
Error: Mutable bindings must use ref() syntax
  --> example.vf:1:17
   |
 1 | let mut x = 0;
   |             ^ expected ref() call
   |
 = help: Use: let mut x = ref(0)
```

## Testing Strategy

### Test Coverage

1. **Valid cases:**
   - Basic literals: `ref(0)`, `ref("hello")`, `ref(true)`
   - Constructors: `ref(None)`, `ref(Some(42))`
   - Complex values: `ref([1, 2, 3])`, `ref({ a: 1 })`
   - Nested: `ref(ref(0))` (Ref<Ref<Int>>)

2. **Invalid cases:**
   - Direct literals: `let mut x = 0;`
   - Function calls: `let mut x = compute();`
   - Constructors: `let mut x = None;`
   - Variables: `let mut x = y;`

3. **Edge cases:**
   - Non-mutable bindings (should still accept anything): `let x = 0;`
   - Type annotations: `let mut x: Ref<Int> = ref(0);`

### Snapshot Test Updates

Three fixture files will have updated snapshots:
- `control-flow.vf.snap`
- `declarations.vf.snap`
- `expressions.vf.snap`

Changes will be minimal (just the `ref()` wrapper in AST).

## Files Modified

**Implementation (1 file):**
- `packages/core/src/parser/parse-declarations.ts` - Add validation logic

**Tests (2 files):**
- `packages/core/src/parser/declarations.test.ts` - Fix syntax, add validation tests
- `packages/core/src/parser/parser-integration.test.ts` - Fix syntax

**Fixtures (3 files):**
- `packages/core/src/parser/snapshot-tests/control-flow.vf`
- `packages/core/src/parser/snapshot-tests/declarations.vf`
- `packages/core/src/parser/snapshot-tests/expressions.vf`

**Documentation (1 file):**
- `docs/spec/07-mutable-references.md` - Remove discrepancy note

**Snapshots (3 files, auto-generated):**
- `control-flow.vf.snap`
- `declarations.vf.snap`
- `expressions.vf.snap`

**Total: 10 files** (7 manual edits + 3 auto-generated snapshots)

## Verification Checklist

After implementation:

- [ ] Parser validation added to `parseLetDeclaration`
- [ ] New validation tests pass
- [ ] All existing tests updated with correct syntax
- [ ] All fixture files use `ref()` syntax
- [ ] Snapshots regenerated and committed
- [ ] `npm run check` passes (type checking)
- [ ] `npm run lint` passes (linting)
- [ ] `npm test` passes (all 500+ tests)
- [ ] `npm run format` passes (formatting)
- [ ] Spec documentation updated (discrepancy note removed)
- [ ] Error messages are helpful and include suggestions

## Success Criteria

1. Parser enforces `let mut x = ref(value)` syntax
2. Helpful error message when syntax is violated
3. All tests pass with updated syntax
4. No breaking changes to valid code
5. Documentation reflects implementation

## Notes

- This is a **spec compliance fix**, not a language design change
- The spec already documents the correct syntax
- No type system changes needed (ref is already a built-in)
- No standard library changes needed
- No code generation changes needed
- This only affects parsing and validation
