# Parser Edge Cases - Task Checklist

**Created**: 2025-11-22
**Last Updated**: 2025-11-22
**Status**: Not started

## Overview

Address 7 skipped tests to achieve 100% parser test pass rate.

**Current Progress**: 0/4 phases complete (0%)

---

## Phase 1: Fix Record Return Type Bug ⏳ Not Started

**Priority**: High
**Complexity**: Medium
**Tests affected**: 1

### Tasks

- [ ] 1.1 Research grammar ambiguity
  - [ ] Review current lambda parsing logic in `parse-expressions.ts`
  - [ ] Identify exact point where record type vs literal decision is made
  - [ ] Document current behavior and expected behavior

- [ ] 1.2 Implement lookahead logic
  - [ ] Add `parseRecordTypeInReturnPosition()` helper function
  - [ ] Implement pattern detection for record types (`:` between field-value pairs)
  - [ ] Add lookahead for `=>` after closing `}`
  - [ ] Update `parseLambdaExpression()` to use new logic

- [ ] 1.3 Update tests
  - [ ] Un-skip test in `lambda-return-type.test.ts:128`
  - [ ] Add edge case: nested record return type
  - [ ] Add edge case: tuple return type
  - [ ] Add edge case: union return type
  - [ ] Add edge case: function type return type

- [ ] 1.4 Validation
  - [ ] Run full test suite: `npm test`
  - [ ] Verify no regressions in record literal parsing
  - [ ] Verify no regressions in lambda parsing
  - [ ] Run quality checks: `npm run verify`

**Files**:
- `packages/core/src/parser/parse-expressions.ts`
- `packages/core/src/parser/lambda-return-type.test.ts`

**Completion Criteria**:
- ✅ Record return types parse correctly
- ✅ No ambiguity errors
- ✅ All new tests pass
- ✅ No test regressions

---

## Phase 2: Multi-line Import Support 🔜 Not Started

**Priority**: Medium
**Complexity**: Low
**Tests affected**: 3

### Tasks

- [ ] 2.1 Add newline handling to namespace imports
  - [ ] Modify `parseImportDeclaration()` in `parse-declarations.ts`
  - [ ] Add `skipNewlines()` after `*` token
  - [ ] Add `skipNewlines()` before `as` keyword
  - [ ] Add `skipNewlines()` before `from` keyword
  - [ ] Un-skip test in `import-namespace.test.ts:279`

- [ ] 2.2 Add newline handling to mixed imports
  - [ ] Add `skipNewlines()` after `{` token
  - [ ] Add `skipNewlines()` before each import specifier
  - [ ] Add `skipNewlines()` before closing `}`
  - [ ] Un-skip tests in `mixed-imports.test.ts:259,283`

- [ ] 2.3 Add edge case tests
  - [ ] Multiple consecutive newlines
  - [ ] Mix of tabs, spaces, newlines
  - [ ] Newlines in various import positions

- [ ] 2.4 Validation
  - [ ] Run full test suite: `npm test`
  - [ ] Verify single-line imports still work
  - [ ] Run quality checks: `npm run verify`

**Files**:
- `packages/core/src/parser/parse-declarations.ts`
- `packages/core/src/parser/import-namespace.test.ts`
- `packages/core/src/parser/mixed-imports.test.ts`

**Completion Criteria**:
- ✅ Multi-line namespace imports parse correctly
- ✅ Multi-line mixed imports parse correctly
- ✅ All new tests pass
- ✅ No test regressions

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

## Phase 4: Type Parameter Trailing Commas 🔜 Not Started

**Priority**: Low
**Complexity**: Low
**Tests affected**: 1

### Tasks

- [ ] 4.1 Implement trailing comma support
  - [ ] Modify `parseTypeParameters()` in `parse-declarations.ts`
  - [ ] After parsing type param and comma, check for `>`
  - [ ] If next token is `>`, allow the trailing comma
  - [ ] Ensure consistent with other trailing comma patterns

- [ ] 4.2 Update tests
  - [ ] Un-skip test in `trailing-commas.test.ts:318`
  - [ ] Add edge case: single type param with comma
  - [ ] Add edge case: multiple type params with comma

- [ ] 4.3 Validation
  - [ ] Run full test suite: `npm test`
  - [ ] Verify type params without trailing commas still work
  - [ ] Run quality checks: `npm run verify`

**Files**:
- `packages/core/src/parser/parse-declarations.ts`
- `packages/core/src/parser/trailing-commas.test.ts`

**Completion Criteria**:
- ✅ Trailing commas in type parameters parse correctly
- ✅ All new tests pass
- ✅ No test regressions

---

## Phase 5: Final Validation ✅ Not Started

**Priority**: High
**Complexity**: Low

### Tasks

- [ ] 5.1 Run full test suite
  - [ ] Execute: `npm test`
  - [ ] Confirm: 2583/2583 tests passing (100%)
  - [ ] Confirm: 0 skipped tests
  - [ ] Confirm: 0 failing tests

- [ ] 5.2 Run quality checks
  - [ ] Execute: `npm run check` (type checking)
  - [ ] Execute: `npm run lint` (linting)
  - [ ] Execute: `npm run format` (code formatting)
  - [ ] Or use: `npm run verify` (all checks at once)

- [ ] 5.3 Update documentation
  - [ ] Update this tasks.md with final status
  - [ ] Update context.md with any new learnings
  - [ ] Update CLAUDE.md if needed
  - [ ] Archive task to `.claude/archive/` if fully complete

- [ ] 5.4 Commit changes
  - [ ] Review all changes
  - [ ] Create git commit with descriptive message
  - [ ] Reference this task in commit message

**Completion Criteria**:
- ✅ 100% test pass rate achieved
- ✅ All quality checks pass
- ✅ Documentation updated
- ✅ Changes committed

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
