# Parser ref() Implementation - Task List

**Created:** 2025-11-22
**Last Updated:** 2025-11-22
**Status:** Not Started

## Phase 1: Parser Validation (Core Implementation)

**Status:** 🔜 Not Started

### Tasks

- [ ] **Add validation logic to parseLetDeclaration**
  - File: `packages/core/src/parser/parse-declarations.ts`
  - After line 195 (where value is parsed)
  - Check if `mutable === true`
  - Validate value is `App` node with `func.name === "ref"`
  - Throw helpful error if validation fails

- [ ] **Create helpful error message**
  - Message: "Mutable bindings must use ref() syntax"
  - Include location information
  - Provide suggestion: `Use: let mut ${name} = ref(value)`

- [ ] **Test validation manually**
  - Try parsing `let mut x = 0;` (should error)
  - Try parsing `let mut x = ref(0);` (should work)

---

## Phase 2: Add Parser Tests

**Status:** 🔜 Not Started

### Tasks

- [ ] **Add test section in declarations.test.ts**
  - New `describe` block: "mutable binding ref() validation"
  - Add after existing test sections

- [ ] **Add positive test cases (should parse)**
  - `let mut x = ref(0);` - basic literal
  - `let mut x = ref(Some(42));` - constructor in ref
  - `let mut x = ref([1, 2, 3]);` - complex value in ref

- [ ] **Add negative test cases (should error)**
  - `let mut x = 0;` - direct literal
  - `let mut x = someFunction();` - function call
  - `let mut x = None;` - constructor without ref

- [ ] **Verify new tests pass**
  - Run `npm test declarations.test.ts`
  - All 6 new tests should pass

---

## Phase 3: Fix Existing Test Files

**Status:** 🔜 Not Started

### Tasks

- [ ] **Update declarations.test.ts line 54**
  - Change: `let mut counter = 0;`
  - To: `let mut counter = ref(0);`

- [ ] **Update declarations.test.ts line 75**
  - Change: `let mut rec state = initialState();`
  - To: `let mut rec state = ref(initialState());`

- [ ] **Update parser-integration.test.ts line 334**
  - Change: `let mut count = 0;`
  - To: `let mut count = ref(0);`

- [ ] **Verify updated tests pass**
  - Run `npm test` (scoped to these test files)
  - All existing tests should still pass

---

## Phase 4: Fix Fixture Files

**Status:** 🔜 Not Started

### Tasks

- [ ] **Update control-flow.vf line 23**
  - File: `packages/core/src/parser/snapshot-tests/control-flow.vf`
  - Change: `let mut counter = 0;`
  - To: `let mut counter = ref(0);`

- [ ] **Update declarations.vf line 46**
  - File: `packages/core/src/parser/snapshot-tests/declarations.vf`
  - Change: `let mut counter = 0;`
  - To: `let mut counter = ref(0);`

- [ ] **Update expressions.vf line 48**
  - File: `packages/core/src/parser/snapshot-tests/expressions.vf`
  - Change: `let mut counter = 0;`
  - To: `let mut counter = ref(0);`

---

## Phase 5: Update Snapshots & Verify

**Status:** 🔜 Not Started

### Tasks

- [ ] **Regenerate snapshots**
  - Run `npm test` to auto-update snapshot files
  - Review snapshot changes to ensure they're correct
  - Snapshots should show `App` node with `ref` function

- [ ] **Run full test suite**
  - Command: `npm test`
  - All 500+ tests should pass

- [ ] **Run type checking**
  - Command: `npm run check`
  - Should pass with no type errors

- [ ] **Run linting**
  - Command: `npm run lint`
  - Should pass with no lint errors

- [ ] **Run formatting check**
  - Command: `npm run format`
  - Should format code correctly

- [ ] **Run all checks together**
  - Command: `npm run verify`
  - All checks should pass

---

## Phase 6: Update Spec Documentation

**Status:** 🔜 Not Started

### Tasks

- [ ] **Find discrepancy note in spec**
  - File: `docs/spec/07-mutable-references.md`
  - Around lines 50-60
  - Note documents parser limitation

- [ ] **Remove discrepancy note**
  - Delete the NOTE section about parser not supporting ref()
  - Keep all other documentation (it's already correct)

- [ ] **Verify spec is accurate**
  - Read through mutable references section
  - Ensure all examples use `ref()` syntax
  - Confirm spec matches implementation

---

## Final Verification

**Status:** 🔜 Not Started

### Checklist

- [ ] Parser validates `mut` bindings require `ref()` syntax
- [ ] Helpful error message shown when validation fails
- [ ] All new parser tests pass (6 tests)
- [ ] All existing tests updated with correct syntax (3 files)
- [ ] All fixture files use `ref()` syntax (3 files)
- [ ] Snapshots regenerated and reviewed (3 files)
- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes (all 500+ tests)
- [ ] `npm run format` applied
- [ ] Spec documentation updated (discrepancy note removed)
- [ ] Manual testing: `let mut x = 0;` gives helpful error
- [ ] Manual testing: `let mut x = ref(0);` parses successfully

---

## Summary

**Total Phases:** 6
**Phases Completed:** 0/6 (0%)

**Files to Modify:**
- 1 parser implementation file
- 2 test files
- 3 fixture files
- 1 spec documentation file
- 3 snapshot files (auto-generated)

**Total:** 10 files

---

## Notes

- Implementation order matters: Add validation → Add tests → Fix files → Update snapshots
- Snapshots are auto-generated, just review and commit them
- All quality checks must pass before considering task complete
- Error messages should be helpful and guide users to correct syntax
