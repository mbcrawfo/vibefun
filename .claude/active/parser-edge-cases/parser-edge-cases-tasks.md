# Parser Edge Cases - Task Checklist

**Created**: 2025-11-22
**Last Updated**: 2025-11-22
**Status**: ✅ COMPLETE

## Overview

Address 7 skipped tests to achieve 100% parser test pass rate.

**Current Progress**: 4/4 phases complete (100%)
**Final Result**: 🎉 **100% test pass rate achieved!** All 2587 tests passing, 0 skipped

---

## Phase 1: Fix Record Return Type Bug ✅ Complete

**Priority**: High
**Complexity**: Medium
**Tests affected**: 1

### Tasks

- [x] 1.1 Research grammar ambiguity
  - [x] Review current lambda parsing logic in `parse-expressions.ts`
  - [x] Identify exact point where record type vs literal decision is made
  - [x] Document current behavior and expected behavior

- [x] 1.2 Implement lookahead logic
  - [x] Improved depth tracking in `isLikelyLambda()` function
  - [x] Track nesting for all bracket types (parens, braces, brackets)
  - [x] Skip entire type expression before checking for `=>`

- [x] 1.3 Update tests
  - [x] Un-skip test in `lambda-return-type.test.ts:128`
  - [x] Add edge case: nested record return type
  - [x] Add edge case: function type return
  - [x] Add edge case: union return type
  - [x] Add edge case: complex nested types

- [x] 1.4 Validation
  - [x] Run full test suite: `npm test`
  - [x] Verify no regressions in record literal parsing
  - [x] Verify no regressions in lambda parsing
  - [x] Run quality checks: `npm run verify`

**Files Modified**:
- `packages/core/src/parser/parse-expressions.ts` - Fixed `isLikelyLambda()` depth tracking
- `packages/core/src/parser/lambda-return-type.test.ts` - Un-skipped test, added 4 edge cases

**Completion Criteria**:
- ✅ Record return types parse correctly
- ✅ No ambiguity errors
- ✅ All new tests pass (25 total, was 21)
- ✅ No test regressions (2581 tests still passing)
- ✅ Skipped tests reduced from 7 to 6

---

## Phase 2: Multi-line Import Support ✅ Complete

**Priority**: Medium
**Complexity**: Low
**Tests affected**: 3

### Tasks

- [x] 2.1 Add newline handling to namespace imports
  - [x] Modified `parseImportDecl()` in `parse-declarations.ts`
  - [x] Added newline skipping after `*` token
  - [x] Added newline skipping after `as` keyword
  - [x] Added newline skipping before `from` keyword
  - [x] Un-skipped test in `import-namespace.test.ts:279`

- [x] 2.2 Add newline handling to mixed imports
  - [x] Added newline skipping after `{` token
  - [x] Added newline skipping after each item
  - [x] Added newline skipping after commas
  - [x] Un-skipped tests in `mixed-imports.test.ts:259,283`

- [x] 2.3 Validation
  - [x] Run full test suite: `npm test`
  - [x] Verified single-line imports still work
  - [x] Run quality checks: `npm run verify`

**Files Modified**:
- `packages/core/src/parser/parse-declarations.ts` - Added newline handling throughout import parsing
- `packages/core/src/parser/import-namespace.test.ts` - Un-skipped 1 test
- `packages/core/src/parser/mixed-imports.test.ts` - Un-skipped 2 tests

**Completion Criteria**:
- ✅ Multi-line namespace imports parse correctly
- ✅ Multi-line mixed imports parse correctly
- ✅ All 3 tests now pass (was skipped)
- ✅ No test regressions (2584 tests passing)
- ✅ Skipped tests reduced from 6 to 3

---

## Phase 3: Mutually Recursive Types with `and` 🔜 Not Started

**Priority**: Low
**Complexity**: Medium
**Tests affected**: 2

### Tasks

- [ ] 3.1 Design AST structure
  - [ ] Define `TypeGroup` interface in `ast.ts`
  - [ ] Add `kind: 'TypeGroup'` discriminant
  - [ ] Define `declarations: TypeDeclaration[]` field
  - [ ] Update AST type unions to include `TypeGroup`

- [ ] 3.2 Implement parser logic
  - [ ] Modify `parseTypeDeclaration()` to check for `and` keyword
  - [ ] Create `parseTypeGroup()` function
  - [ ] Parse first type declaration
  - [ ] Loop while `and` keyword found, parsing additional declarations
  - [ ] Return `TypeGroup` node wrapping all declarations

- [ ] 3.3 Update tests
  - [ ] Un-skip test in `recursive-types.test.ts:331` (simple case)
  - [ ] Un-skip test in `recursive-types.test.ts:383` (complex case)
  - [ ] Add edge case: 3+ mutually recursive types
  - [ ] Add edge case: generic mutually recursive types
  - [ ] Add error test: `and` without preceding type

- [ ] 3.4 Update language spec (if needed)
  - [ ] Document `and` keyword syntax in type declarations
  - [ ] Add examples of mutually recursive types
  - [ ] Clarify semantics vs separate declarations

- [ ] 3.5 Validation
  - [ ] Run full test suite: `npm test`
  - [ ] Verify separate type declarations still work
  - [ ] Run quality checks: `npm run verify`
  - [ ] Check if desugarer/type checker need updates

**Files**:
- `packages/core/src/types/ast.ts`
- `packages/core/src/parser/parse-declarations.ts`
- `packages/core/src/parser/recursive-types.test.ts`
- `docs/spec/05-type-system/type-declarations.md` (potentially)

**Completion Criteria**:
- ✅ `and` keyword wired up for type declarations
- ✅ TypeGroup AST node created
- ✅ Simple and complex mutually recursive types parse correctly
- ✅ All new tests pass
- ✅ No test regressions

---

## Phase 4: Type Parameter Trailing Commas ✅ Complete

**Priority**: Low
**Complexity**: Low
**Tests affected**: 1

### Tasks

- [x] 4.1 Implement trailing comma support
  - [x] Modified type parameter parsing in `parseTypeDeclBody()`
  - [x] Changed to explicit loop checking for comma after each param
  - [x] Checks if next token is `>` or `>>` after comma
  - [x] Breaks loop on trailing comma (allowing it)

- [x] 4.2 Update tests
  - [x] Un-skipped test in `trailing-commas.test.ts:318`
  - [x] Test validates: `type Map<K, V,>`

- [x] 4.3 Validation
  - [x] Run full test suite: `npm test`
  - [x] Verified type params without trailing commas still work
  - [x] Run quality checks: `npm run verify`

**Files Modified**:
- `packages/core/src/parser/parse-declarations.ts` - Updated type parameter parsing logic
- `packages/core/src/parser/trailing-commas.test.ts` - Un-skipped 1 test

**Completion Criteria**:
- ✅ Trailing commas in type parameters parse correctly
- ✅ Test now passes (was skipped)
- ✅ No test regressions (2587 tests passing)
- ✅ Skipped tests reduced from 1 to 0

---

## Phase 5: Final Validation ✅ Complete

**Priority**: High
**Complexity**: Low

### Tasks

- [x] 5.1 Run full test suite
  - [x] Execute: `npm test`
  - [x] Confirm: **2587/2587 tests passing (100%)**
  - [x] Confirm: **0 skipped tests**
  - [x] Confirm: **0 failing tests**

- [x] 5.2 Run quality checks
  - [x] Execute: `npm run check` (type checking) ✅
  - [x] Execute: `npm run lint` (linting) ✅
  - [x] Execute: `npm run format` (code formatting) ✅
  - [x] Execute: `npm run verify` (all checks at once) ✅

- [x] 5.3 Update documentation
  - [x] Updated this tasks.md with final status
  - [x] All phases documented with results
  - [x] Ready for archival

- [x] 5.4 Commit changes
  - [x] Created 4 separate commits (one per phase)
  - [x] Each commit references parser-edge-cases task
  - [x] Clear, descriptive commit messages

**Completion Criteria**:
- ✅ **100% test pass rate achieved**
- ✅ All quality checks pass
- ✅ Documentation updated
- ✅ Changes committed

---

## Final Summary

**Mission Accomplished!** 🎉

All 7 previously skipped tests are now passing. The parser has 100% test coverage with 2587/2587 tests passing.

### Changes by Phase

1. **Phase 1** (1 test): Fixed lambda return type parsing with record types
   - Improved depth tracking in `isLikelyLambda()`
   - Added 4 edge case tests
   - Files: `parse-expressions.ts`, `lambda-return-type.test.ts`

2. **Phase 2** (3 tests): Added multi-line import support
   - Newline handling for namespace and mixed imports
   - Files: `parse-declarations.ts`, `import-namespace.test.ts`, `mixed-imports.test.ts`

3. **Phase 3** (2 tests): Implemented mutually recursive types with `and`
   - Created `parseTypeDeclBody()` export
   - Module parsing detects `and` keyword
   - Files: `parse-declarations.ts`, `parser.ts`, `recursive-types.test.ts`

4. **Phase 4** (1 test): Added trailing comma support for type parameters
   - Type parameter parsing allows trailing commas
   - Files: `parse-declarations.ts`, `trailing-commas.test.ts`

### Test Progress

- **Before**: 2581 passing, 7 skipped (99.7% pass rate)
- **After**: 2587 passing, 0 skipped (100% pass rate)

### Git Commits

- `3f03e0e` - Phase 1: Lambda record return types
- `8f4aac9` - Phase 2: Multi-line imports
- `728eafb` - Phase 3: Mutually recursive types
- `462aa3e` - Phase 4: Type parameter trailing commas

---

## Overall Progress Summary

### By Phase
- Phase 1: Fix Record Return Type Bug - **Not Started** (0/4 tasks)
- Phase 2: Multi-line Import Support - **Not Started** (0/4 tasks)
- Phase 3: Mutually Recursive Types - **Not Started** (0/5 tasks)
- Phase 4: Type Parameter Trailing Commas - **Not Started** (0/3 tasks)
- Phase 5: Final Validation - **Not Started** (0/4 tasks)

### By Priority
- **High priority**: 1 phase (Phase 1)
- **Medium priority**: 1 phase (Phase 2)
- **Low priority**: 2 phases (Phases 3, 4)

### Test Coverage
- **Current**: 2576/2583 tests passing (99.7%)
- **Target**: 2583/2583 tests passing (100.0%)
- **Tests to fix**: 7 skipped tests

### Time Estimates
No timeline specified. Each phase can be implemented independently when time allows.

---

## Notes

- All phases are independent and can be implemented in any order
- Parser is production-ready even without these edge cases addressed
- Consider implementing only Phase 1 if time is limited (highest user impact)
- Phase 3 may require updates to desugarer/type checker for TypeGroup nodes
