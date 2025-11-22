# Parser ref() Implementation - Context

**Created:** 2025-11-22
**Last Updated:** 2025-11-22

## Key Files

### Parser Implementation
- **`packages/core/src/parser/parse-declarations.ts`** (lines 161-196)
  - Contains `parseLetDeclaration` function
  - Currently accepts any expression for mutable bindings
  - Needs validation logic added after line 195

- **`packages/core/src/parser/parse-expressions.ts`** (lines 509-594)
  - Contains `parseCall` function for function call parsing
  - Already fully supports `ref(value)` syntax
  - No changes needed here

### Type System
- **`packages/core/src/typechecker/builtins.ts`** (lines 405-409)
  - Defines `ref` as built-in with type `forall a. (a) -> Ref<a>`
  - No changes needed

### AST Types
- **`packages/core/src/types/ast.ts`**
  - `App` node represents function application (including `ref(0)`)
  - `LetDecl` node has `mutable: boolean` flag
  - No AST changes needed

### Test Files Needing Updates
1. **`packages/core/src/parser/declarations.test.ts`**
   - Line 54: `let mut counter = 0;` → `let mut counter = ref(0);`
   - Line 75: `let mut rec state = initialState();` → `let mut rec state = ref(initialState());`
   - Add new validation test section

2. **`packages/core/src/parser/parser-integration.test.ts`**
   - Line 334: `let mut count = 0;` → `let mut count = ref(0);`

### Fixture Files Needing Updates
1. **`packages/core/src/parser/snapshot-tests/control-flow.vf`**
   - Line 23: Update mutable variable declaration

2. **`packages/core/src/parser/snapshot-tests/declarations.vf`**
   - Line 46: Update mutable variable declaration

3. **`packages/core/src/parser/snapshot-tests/expressions.vf`**
   - Line 48: Update mutable variable declaration

### Snapshot Files (Auto-Updated)
- `control-flow.vf.snap` - Will show `ref()` wrapper in AST
- `declarations.vf.snap` - Will show `ref()` wrapper in AST
- `expressions.vf.snap` - Will show `ref()` wrapper in AST

### Documentation
- **`docs/spec/07-mutable-references.md`**
  - Contains correct spec (already documents `ref()` syntax)
  - Around lines 50-60: Remove temporary discrepancy note
  - Rest of document is correct, no changes needed

## Important Design Decisions

### Why Explicit `ref()` Syntax?

**Decision:** Keep `let mut x = ref(value)` syntax (no auto-wrapping)

**Rationale:**
1. **Type System Consistency**: Auto-wrapping creates ambiguity in type inference
2. **Language Philosophy**: Maintains vibefun's "Explicitness Over Implicitness" principle
3. **Edge Case Complexity**: Avoids confusion with ref-of-ref, pattern matching, etc.
4. **ML Family Alignment**: Consistent with OCaml/Reason (explicit `ref`)
5. **Implementation Simplicity**: Validation is simpler than auto-wrapping logic

Full analysis documented in research notes.

### Why Parser Validation vs Type Checker Validation?

**Decision:** Validate at parse time (Option A)

**Rationale:**
- Earlier error detection
- Clearer error messages with better context
- Consistent with other syntax errors
- Simpler implementation
- Fails fast with helpful suggestions

**Alternative considered:** Type-checker validation would be more flexible but would give later errors with less helpful context.

### Error Message Design

**Format:**
```
Error: Mutable bindings must use ref() syntax
  --> file.vf:line:col
   |
 n | let mut x = 0;
   |             ^ expected ref() call
   |
 = help: Use: let mut x = ref(0)
```

**Principles:**
- Clear explanation of the problem
- Show exactly where the error occurred
- Provide concrete, actionable suggestion
- Include example of correct syntax

## Technical Context

### How `ref()` Works

1. **Syntax**: `ref(value)` is a regular function call
2. **Parsing**: Uses existing `parseCall` function → creates `App` AST node
3. **Type**: Built-in function with type `forall a. (a) -> Ref<a>`
4. **Runtime**: Creates a mutable cell of type `Ref<T>`

### AST Representation of `let mut x = ref(0)`

```typescript
{
  kind: "LetDecl",
  pattern: { kind: "VarPat", name: "x" },
  mutable: true,
  value: {
    kind: "App",           // Function application
    func: {
      kind: "Var",
      name: "ref"
    },
    args: [{
      kind: "IntLit",
      value: 0
    }]
  }
}
```

### Current Parser Behavior

The parser already accepts `ref(value)` syntax because it's just a regular function call. The issue is it ALSO accepts `let mut x = value` which violates the spec.

**What works now:**
- `let mut x = ref(0);` ✅ Parses correctly
- `let mut x = 0;` ✅ Also parses (but shouldn't!)

**What we're adding:**
- Validation to reject the second form

## Related Commits

- **`aa00678`** (2025-11-22): "fix: document mutable reference syntax spec discrepancy"
  - Documented that parser doesn't support ref() yet
  - Added notes to test fixtures explaining discrepancy
  - This implementation resolves that discrepancy

## Testing Notes

### Existing Test Count
- Total tests before changes: ~500+ tests
- All should continue passing after updates

### New Tests to Add
- 6 new parser tests for ref() validation
- 3 positive cases (valid syntax)
- 3 negative cases (invalid syntax)

### Snapshot Updates
- 3 snapshot files will change
- Changes are minimal (just AST structure updates)
- Snapshots are auto-generated, just commit them

## Language Spec References

- **Mutable References**: `docs/spec/07-mutable-references.md`
  - Lines 36-53: Documents required `ref()` syntax
  - Lines 54-92: Ref operations (`:=`, `!`)
  - Lines 334-359: Pattern matching restrictions

- **Type System**: `docs/spec/04-type-system.md`
  - Ref<T> is a built-in type constructor
  - Type inference for refs works automatically

- **Language Philosophy**: `docs/spec/01-introduction.md`
  - Lines 33-40: "Explicitness Over Implicitness" principle

## Implementation Order

Follow this order to minimize test failures during development:

1. **First:** Add parser validation logic
   - Tests will start failing (expected)

2. **Second:** Add validation tests
   - These will pass (testing the new validation)

3. **Third:** Update existing test files
   - Tests will start passing again

4. **Fourth:** Update fixture files
   - Snapshot tests will fail (expected)

5. **Fifth:** Regenerate snapshots
   - All tests should pass

6. **Finally:** Update documentation
   - Remove discrepancy note

## Edge Cases to Consider

1. **Nested refs**: `let mut x = ref(ref(0));`
   - Valid! Type is `Ref<Ref<Int>>`
   - Should parse without error

2. **Type annotations**: `let mut x: Ref<Int> = ref(0);`
   - Valid with type annotation
   - Validation only checks for `ref()` call

3. **Complex expressions in ref**: `let mut x = ref(if c then 1 else 0);`
   - Valid! Any expression can go inside ref()
   - Should parse without error

4. **Non-mutable bindings**: `let x = 0;`
   - Should NOT require ref()
   - Validation only applies when `mutable === true`

## Common Pitfalls to Avoid

1. **Don't validate non-mutable bindings**
   - Only check when `mutable === true`

2. **Don't restrict what's inside ref()**
   - `ref(value)` can contain any expression
   - Don't validate the argument to ref()

3. **Don't forget to update all test fixtures**
   - Missing one will cause snapshot tests to fail

4. **Don't forget to regenerate snapshots**
   - Run `npm test` to update them automatically

## Success Indicators

- Parser rejects `let mut x = 0;` with helpful error
- Parser accepts `let mut x = ref(0);` without error
- All existing tests pass with updated syntax
- Snapshots reflect correct AST structure
- Error messages guide users to correct syntax
