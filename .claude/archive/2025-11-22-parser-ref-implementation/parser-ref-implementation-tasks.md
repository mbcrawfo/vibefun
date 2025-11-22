# Parser ref() Implementation - Task List

**Created:** 2025-11-22
**Last Updated:** 2025-11-22 (Completed)
**Status:** ✅ Complete

## Phase 1: Parser Validation (Core Implementation)

**Status:** ✅ Complete

### Tasks

- [x] **Add validation logic to parseLetDeclaration**
  - File: `packages/core/src/parser/parse-declarations.ts`
  - After line 195 (where value is parsed)
  - Check if `mutable === true`
  - Validate value is `App` node with `func.name === "ref"`
  - Throw helpful error if validation fails

- [x] **Create helpful error message**
  - Message: "Mutable bindings must use ref() syntax"
  - Include location information
  - Provide suggestion: `Use: let mut ${name} = ref(value)`

- [x] **Test validation manually**
  - Try parsing `let mut x = 0;` (should error)
  - Try parsing `let mut x = ref(0);` (should work)

---

## Phase 2: Add Parser Tests

**Status:** ✅ Complete

### Tasks

- [x] **Add test section in declarations.test.ts**
  - New `describe` block: "mutable binding ref() validation"
  - Add after existing test sections

- [x] **Add positive test cases (should parse)**
  - `let mut x = ref(0);` - basic literal
  - `let mut x = ref(Some(42));` - constructor in ref
  - `let mut x = ref([1, 2, 3]);` - complex value in ref

- [x] **Add negative test cases (should error)**
  - `let mut x = 0;` - direct literal
  - `let mut x = someFunction();` - function call
  - `let mut x = None;` - constructor without ref

- [x] **Verify new tests pass**
  - Run `npm test declarations.test.ts`
  - All 6 new tests should pass

---

## Phase 3: Fix Existing Test Files

**Status:** ✅ Complete

### Tasks

- [x] **Update declarations.test.ts line 54**
  - Change: `let mut counter = 0;`
  - To: `let mut counter = ref(0);`

- [x] **Update declarations.test.ts line 75**
  - Change: `let mut rec state = initialState();`
  - To: `let mut rec state = ref(initialState());`

- [x] **Update parser-integration.test.ts line 334**
  - Change: `let mut count = 0;`
  - To: `let mut count = ref(0);`

- [x] **Verify updated tests pass**
  - Run `npm test` (scoped to these test files)
  - All existing tests should still pass

---

## Phase 4: Fix Fixture Files

**Status:** ✅ Complete

### Tasks

- [x] **Update control-flow.vf line 23**
  - File: `packages/core/src/parser/snapshot-tests/control-flow.vf`
  - Change: `let mut counter = 0;`
  - To: `let mut counter = ref(0);`

- [x] **Update declarations.vf line 46**
  - File: `packages/core/src/parser/snapshot-tests/declarations.vf`
  - Change: `let mut counter = 0;`
  - To: `let mut counter = ref(0);`

- [x] **Update expressions.vf line 48**
  - File: `packages/core/src/parser/snapshot-tests/expressions.vf`
  - Change: `let mut counter = 0;`
  - To: `let mut counter = ref(0);`

---

## Phase 5: Update Snapshots & Verify

**Status:** ✅ Complete

### Tasks

- [x] **Regenerate snapshots**
  - Run `npm test` to auto-update snapshot files
  - Review snapshot changes to ensure they're correct
  - Snapshots should show `App` node with `ref` function

- [x] **Run full test suite**
  - Command: `npm test`
  - All 500+ tests should pass

- [x] **Run type checking**
  - Command: `npm run check`
  - Should pass with no type errors

- [x] **Run linting**
  - Command: `npm run lint`
  - Should pass with no lint errors

- [x] **Run formatting check**
  - Command: `npm run format`
  - Should format code correctly

- [x] **Run all checks together**
  - Command: `npm run verify`
  - All checks should pass

---

## Phase 6: Update Spec Documentation

**Status:** ✅ Complete

### Tasks

- [x] **Find discrepancy note in spec**
  - File: `docs/spec/07-mutable-references.md`
  - Around lines 50-60
  - Note documents parser limitation

- [x] **Remove discrepancy note**
  - Delete the NOTE section about parser not supporting ref()
  - Keep all other documentation (it's already correct)

- [x] **Verify spec is accurate**
  - Read through mutable references section
  - Ensure all examples use `ref()` syntax
  - Confirm spec matches implementation

---

## Final Verification

**Status:** ✅ Complete

### Checklist

- [x] Parser validates `mut` bindings require `ref()` syntax
- [x] Helpful error message shown when validation fails
- [x] All new parser tests pass (6 tests)
- [x] All existing tests updated with correct syntax (3 files)
- [x] All fixture files use `ref()` syntax (3 files)
- [x] Snapshots regenerated and reviewed (3 files)
- [x] `npm run check` passes
- [x] `npm run lint` passes
- [x] `npm test` passes (all 2633 tests)
- [x] `npm run format` applied
- [x] Spec documentation updated (discrepancy note removed)
- [x] Manual testing: `let mut x = 0;` gives helpful error
- [x] Manual testing: `let mut x = ref(0);` parses successfully

---

## Summary

**Total Phases:** 6
**Phases Completed:** 6/6 (100%)

**Files Modified:**
- 1 parser implementation file
- 2 test files
- 3 fixture files
- 1 spec documentation file (already correct)
- 3 snapshot files (auto-generated)

**Total:** 10 files

**Completion Date:** 2025-11-22

---

## Notes

- Implementation order matters: Add validation → Add tests → Fix files → Update snapshots
- Snapshots are auto-generated, just review and commit them
- All quality checks must pass before considering task complete
- Error messages should be helpful and guide users to correct syntax
