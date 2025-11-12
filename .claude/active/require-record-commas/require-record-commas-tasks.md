# Require Record Commas - Task Checklist

**Created**: 2025-11-11
**Last Updated**: 2025-11-11

## Phase 1: Update Parser - Record Expressions ⏳

**File**: `packages/core/src/parser/parse-expressions.ts`

### Task 1.1: Update Record Construction Loop (lines 1368-1423)
**Status**: 🔜 Not Started

**Changes**:
- [ ] Locate the field parsing loop in `parseRecordExpr`
- [ ] After parsing each field, add newline skipping logic
- [ ] Add RBRACE check (break if found)
- [ ] Replace `if (parser.check("COMMA"))` with `parser.expect("COMMA", "Expected ',' between record fields")`
- [ ] Add newline skipping after comma
- [ ] Keep trailing comma check (if RBRACE after comma, break)
- [ ] Remove the `else if (!parser.check("IDENTIFIER"))` fallback logic
- [ ] Test locally to verify basic record parsing works

**Key lines to modify**: ~1408-1421

### Task 1.2: Update Record Update Loop (lines 1288-1353)
**Status**: 🔜 Not Started

**Changes**:
- [ ] Locate the record update parsing loop
- [ ] Apply same comma requirement logic as construction loop
- [ ] Ensure commas required between spreads and fields
- [ ] Maintain trailing comma support
- [ ] Add proper newline skipping

**Key lines to modify**: ~1288-1353

### Task 1.3: Update Block Disambiguation (lines 840-850)
**Status**: 🔜 Not Started

**Changes**:
- [ ] Locate shorthand detection logic (around line 848)
- [ ] Remove `|| nextToken.type === "IDENTIFIER"` from line 848
- [ ] Verify logic only continues on COMMA or RBRACE
- [ ] Add comment explaining why IDENTIFIER is not a continuation

**Key line to modify**: Line 848

---

## Phase 2: Update Language Specification ⏳

**Status**: 🔜 Not Started

### Task 2.1: Update basic-structure.md
**File**: `docs/spec/02-lexical-structure/basic-structure.md`

**Changes**:
- [ ] Find record syntax examples
- [ ] Add explicit section: "Commas are required between all record fields"
- [ ] Update examples to show commas consistently
- [ ] Add note about trailing commas being optional

### Task 2.2: Update record-types.md
**File**: `docs/spec/03-type-system/record-types.md`

**Changes**:
- [ ] Review all record type examples
- [ ] Verify commas are shown in all examples
- [ ] Add clarification that comma requirement matches expressions and patterns
- [ ] Update any prose describing comma usage

### Task 2.3: Update data-literals.md
**File**: `docs/spec/04-expressions/data-literals.md`

**Changes**:
- [ ] Find record literal section
- [ ] Add explicit statement: "Commas are required between fields"
- [ ] Update multi-line examples to include commas
- [ ] Clarify trailing comma rule (lines 42-47)
- [ ] Remove any language suggesting commas are optional
- [ ] Add consistency note: "This matches record types and patterns"

---

## Phase 3: Update Existing Tests ⏳

**Status**: 🔜 Not Started

### Task 3.1: Update record-shorthand.test.ts
**File**: `packages/core/src/parser/record-shorthand.test.ts`

**Changes**:
- [ ] Line 97-101: Add commas to `{ name\n age\n active }`
- [ ] Line 108-116: Add commas to multi-line shorthand tests
- [ ] Review all test cases to ensure commas present
- [ ] Update test descriptions if they mention optional commas
- [ ] Run tests to verify they still pass

**Estimated test updates**: 4-6 test cases

### Task 3.2: Update expressions.test.ts
**File**: `packages/core/src/parser/expressions.test.ts`

**Changes**:
- [ ] Review lines 2265-2341 (record expression tests)
- [ ] Verify all record tests have commas
- [ ] Add commas if any are missing
- [ ] Run tests to verify they still pass

**Estimated test updates**: 0-2 test cases (most already have commas)

---

## Phase 4: Add Comprehensive Error Tests ⏳

**Status**: 🔜 Not Started

**File**: `packages/core/src/parser/expressions.test.ts`

### Task 4.1: Create new test suite
- [ ] Add `describe("Record field comma requirements", () => { ... })`

### Task 4.2: Add negative tests (should error)
- [ ] Test: Missing comma between regular fields (same line)
  - Input: `{ x: 1 y: 2 }`
  - Expected: Error with "Expected ',' between record fields"

- [ ] Test: Missing comma between shorthand fields
  - Input: `{ x y z }`
  - Expected: Error with "Expected ',' between record fields"

- [ ] Test: Missing comma in multi-line
  - Input: `{\n  x: 1\n  y: 2\n}`
  - Expected: Error with "Expected ',' between record fields"

- [ ] Test: Missing comma after spread
  - Input: `{ ...base x: 1 }`
  - Expected: Error with "Expected ',' between record fields"

- [ ] Test: Missing comma in mixed shorthand/regular
  - Input: `{ x age: 30 }`
  - Expected: Error with "Expected ',' between record fields"

### Task 4.3: Add positive tests (should parse)
- [ ] Test: Trailing comma acceptance
  - Input: `{ x: 1, y: 2, }`
  - Expected: Parses successfully

- [ ] Test: Single field without comma
  - Input: `{ x: 1 }`
  - Expected: Parses successfully

- [ ] Test: Multiple fields with commas
  - Input: `{ x: 1, y: 2, z: 3 }`
  - Expected: Parses successfully

- [ ] Test: Nested records with commas
  - Input: `{ outer: { inner: 1, x: 2 }, y: 3 }`
  - Expected: Parses successfully

- [ ] Test: Multi-line with commas
  - Input: `{\n  x: 1,\n  y: 2\n}`
  - Expected: Parses successfully

**Total new tests**: ~10 test cases

---

## Phase 5: Update Example Files ⏳

**Status**: 🔜 Not Started

### Task 5.1: Check external-blocks.vf
**File**: `examples/external-blocks.vf`

**Changes**:
- [ ] Search for all record literals
- [ ] Verify commas between all fields
- [ ] Add commas if any are missing
- [ ] Test parsing with new parser

### Task 5.2: Check js-interop-overloading.vf
**File**: `examples/js-interop-overloading.vf`

**Changes**:
- [ ] Search for all record literals
- [ ] Verify commas between all fields
- [ ] Add commas if any are missing
- [ ] Test parsing with new parser

### Task 5.3: Check for other .vf files
- [ ] Search for any other `.vf` files in project
- [ ] Review and update as needed

**Expected changes**: Minimal (examples already use commas)

---

## Phase 6: Update Documentation & Comments ⏳

**Status**: 🔜 Not Started

### Task 6.1: Search for relevant comments
- [ ] Search for "record" in parser files
- [ ] Search for "comma" in parser files
- [ ] Search for "optional" in context of records

### Task 6.2: Update comments in parse-expressions.ts
**File**: `packages/core/src/parser/parse-expressions.ts`

**Changes**:
- [ ] Update function-level JSDoc for `parseRecordExpr`
- [ ] Update inline comments about comma handling
- [ ] Remove references to "optional commas"
- [ ] Add note about consistency with patterns/types

### Task 6.3: Update comments in other parser files
- [ ] Check parse-patterns.ts for record-related comments
- [ ] Check parse-types.ts for record-related comments
- [ ] Update code examples in comments to show commas

### Task 6.4: Check README and other docs
- [ ] Search for record examples in README.md
- [ ] Update any found examples to include commas

---

## Phase 7: Document the Design Change ⏳

**Status**: 🔜 Not Started

**File**: `.claude/design/require-record-commas-rationale.md`

### Task 7.1: Create rationale document
- [ ] Create file in `.claude/design/`
- [ ] Document background (2025-11-10 decision)
- [ ] Explain why decision is being reversed
- [ ] List benefits of requiring commas
- [ ] Describe breaking change implications
- [ ] Include alternatives considered
- [ ] Document final design decisions

**Estimated time**: 10-15 minutes

---

## Phase 8: Run Quality Checks ⏳

**Status**: 🔜 Not Started

### Task 8.1: Run all quality checks
- [ ] Run `npm run check` - Type checking
- [ ] Run `npm run lint` - Linting
- [ ] Run `npm test` - All tests
- [ ] Run `npm run format` - Code formatting

**Or combined**:
- [ ] Run `npm run verify`

### Task 8.2: Address any failures
- [ ] Review failure messages if any
- [ ] Fix issues found
- [ ] Re-run checks until all pass

### Task 8.3: Verify no regressions
- [ ] Confirm test count matches or increases (new tests added)
- [ ] Verify no unexpected test failures
- [ ] Check that type checking is clean
- [ ] Ensure code is properly formatted

**Expected outcome**: All checks pass ✅

---

## Phase 9: Task Documentation ⏳

**Status**: ✅ Done

- [x] Create `.claude/active/require-record-commas/` directory
- [x] Create `require-record-commas-plan.md`
- [x] Create `require-record-commas-context.md`
- [x] Create `require-record-commas-tasks.md` (this file)

---

## Overall Progress

**Phases Completed**: 1/9 (11%)

**Status Legend**:
- ✅ Done
- ⏳ In Progress
- 🔜 Not Started

**Last Updated**: 2025-11-11 (after creating task documentation)

---

## Notes

- Keep this file updated as tasks are completed
- Mark tasks complete immediately upon finishing
- Add any discovered issues or complications to notes
- Update "Last Updated" timestamp when making changes

## Dependencies

- Phase 1 must complete before Phase 8 (parser changes before testing)
- Phase 3 should complete before Phase 1 testing (update test expectations first)
- Phase 8 depends on all previous phases completing
- Other phases can be done in any order

## Recommended Order

1. Phase 3: Update existing tests (prepare expectations)
2. Phase 1: Update parser (implement changes)
3. Phase 4: Add error tests (comprehensive coverage)
4. Phase 5: Update examples (if needed)
5. Phase 2: Update specs (documentation)
6. Phase 6: Update comments (code documentation)
7. Phase 7: Create rationale (design documentation)
8. Phase 8: Run quality checks (verification)
