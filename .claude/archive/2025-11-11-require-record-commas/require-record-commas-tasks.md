# Require Record Commas - Task Checklist

**Created**: 2025-11-11
**Last Updated**: 2025-11-11 23:30

## Phase 1: Update Parser - Record Expressions ✅

**File**: `packages/core/src/parser/parse-expressions.ts`

### Task 1.1: Update Record Construction Loop (lines 1368-1423)
**Status**: ✅ Done

**Changes**:
- [x] Locate the field parsing loop in `parseRecordExpr`
- [x] After parsing each field, add newline skipping logic
- [x] Add RBRACE check (break if found)
- [x] Replace `if (parser.check("COMMA"))` with enhanced error handling:
  ```typescript
  if (!parser.check("COMMA")) {
      const nextToken = parser.peek();
      throw parser.error(
          `Expected ',' between record fields`,
          parser.peek(-1).loc,
          `Found ${nextToken.type} instead. Add a comma to separate fields.`
      );
  }
  parser.advance(); // Consume comma
  ```
- [x] Add newline skipping after comma
- [x] Keep trailing comma check (if RBRACE after comma, break)
- [x] Remove the `else if (!parser.check("IDENTIFIER"))` fallback logic
- [x] Test locally to verify basic record parsing works

**Key lines modified**: 1426-1455 (lines 1408-1421)

### Task 1.2: Update Record Update Loop (lines 1288-1353)
**Status**: ✅ Done

**Changes**:
- [x] Locate the record update parsing loop
- [x] Apply same comma requirement logic as construction loop
- [x] Ensure commas required between spreads and fields
- [x] Maintain trailing comma support
- [x] Add proper newline skipping

**Key lines modified**: 1289-1374 (lines 1288-1353)

### Task 1.3: Update Block Disambiguation (lines 840-850)
**Status**: ✅ Done

**Changes**:
- [x] Locate shorthand detection logic (around line 848)
- [x] Remove `|| nextToken.type === "IDENTIFIER"` from line 848
- [x] Verify logic only continues on COMMA or RBRACE
- [x] **IMPORTANT**: Verify `{ name }` still works (RBRACE after identifier should match)
- [x] Add comment explaining:
  - Why IDENTIFIER is not a continuation (commas required between fields)
  - That single-field records like `{ name }` still work via RBRACE detection

**Key line modified**: Lines 844-850

---

## Phase 2: Update Language Specification ✅

**Status**: ✅ Done

### Task 2.1: Update basic-structure.md
**File**: `docs/spec/02-lexical-structure/basic-structure.md`

**Changes**:
- [x] Find record syntax examples
- [x] Add explicit section: "Commas are required between all record fields"
- [x] Update examples to show commas consistently
- [x] Add note about trailing commas being optional

**Note**: Examples already correct (lines 90-94), no changes needed

### Task 2.2: Update record-types.md
**File**: `docs/spec/03-type-system/record-types.md`

**Changes**:
- [x] Review all record type examples
- [x] Verify commas are shown in all examples
- [x] Add clarification that comma requirement matches expressions and patterns
- [x] Update any prose describing comma usage

**Updated**: Added explicit syntax note (line 7) with consistency message

### Task 2.3: Update data-literals.md
**File**: `docs/spec/04-expressions/data-literals.md`

**Changes**:
- [x] Find record literal section
- [x] Add explicit statement: "Commas are required between fields"
- [x] Update multi-line examples to include commas
- [x] Clarify trailing comma rule (lines 42-47)
- [x] Remove any language suggesting commas are optional
- [x] Add consistency note: "This matches record types and patterns"

**Updated**: Added explicit syntax section (lines 30-42) with examples and error message

---

## Phase 3: Update Existing Tests ✅

**Status**: ✅ Done

### Task 3.1: Update record-shorthand.test.ts
**File**: `packages/core/src/parser/record-shorthand.test.ts`

**Changes**:
- [x] Line 97-101: Add commas to `{ name\n age\n active }`
- [x] Line 108-116: Add commas to multi-line shorthand tests
- [x] Review all test cases to ensure commas present
- [x] Update test descriptions if they mention optional commas
- [x] Run tests to verify they still pass

**Updated**: Lines 97-101, 108-116 (18 lines changed)

### Task 3.2: Update expressions.test.ts
**File**: `packages/core/src/parser/expressions.test.ts`

**Changes**:
- [x] Review lines 2265-2341 (record expression tests)
- [x] Verify all record tests have commas
- [x] Add commas if any are missing
- [x] Run tests to verify they still pass

**Result**: No changes needed - all tests already had commas

### Task 3.3: Update semicolon-required.test.ts ⚠️ CRITICAL
**File**: `packages/core/src/parser/semicolon-required.test.ts`

**Changes**:
- [x] Locate test "should recognize records with newlines" (lines 257-266)
- [x] Change test from `.not.toThrow()` to `.toThrow()`
- [x] Update test to expect a parser error about missing commas
- [x] Update test description to reflect new behavior

**Updated**: Lines 257-266 (4 lines changed)

**Current test** (validates OLD behavior):
```typescript
it("should recognize records with newlines", () => {
    expect(() =>
        parse(`
            let x = {
                a: 1
                b: 2
            };
        `),
    ).not.toThrow();
});
```

**New test** (validates NEW behavior):
```typescript
it("should require commas between record fields", () => {
    expect(() =>
        parse(`
            let x = {
                a: 1
                b: 2
            };
        `),
    ).toThrow(/Expected ',' between record fields/);
});
```

---

## Phase 4: Add Comprehensive Error Tests ✅

**Status**: ✅ Done

**File**: `packages/core/src/parser/expressions.test.ts`

### Task 4.1: Create new test suite
- [x] Add `describe("Record field comma requirements", () => { ... })`

**Created**: Lines 2343-2496 (154 lines)

### Task 4.2: Add negative tests (should error)
- [x] Test: Missing comma between regular fields (same line)
  - Input: `{ x: 1 y: 2 }`
  - Expected: Error with "Expected ',' between record fields"

- [x] Test: Missing comma between shorthand fields
  - Input: `{ x y z }`
  - Expected: Error with "Expected ',' between record fields"

- [x] Test: Missing comma in multi-line
  - Input: `{\n  x: 1\n  y: 2\n}`
  - Expected: Error with "Expected ',' between record fields"

- [x] Test: Missing comma after spread
  - Input: `{ ...base x: 1 }`
  - Expected: Error with "Expected ',' between record fields"

- [x] Test: Missing comma in mixed shorthand/regular
  - Input: `{ x age: 30 }`
  - Expected: Error with "Expected ',' between record fields"

### Task 4.3: Add positive tests (should parse)
- [x] Test: Trailing comma acceptance
  - Input: `{ x: 1, y: 2, }`
  - Expected: Parses successfully

- [x] Test: Single field without comma
  - Input: `{ x: 1 }`
  - Expected: Parses successfully

- [x] Test: Single shorthand field
  - Input: `{ name }`
  - Expected: Parses successfully (no comma needed)

- [x] Test: Multiple fields with commas
  - Input: `{ x: 1, y: 2, z: 3 }`
  - Expected: Parses successfully

- [x] Test: Nested records with commas
  - Input: `{ outer: { inner: 1, x: 2 }, y: 3 }`
  - Expected: Parses successfully

- [x] Test: Multi-line with commas
  - Input: `{\n  x: 1,\n  y: 2\n}`
  - Expected: Parses successfully

- [x] Test: Empty record variations
  - Inputs: `{}`, `{ }`, `{\n}`, `{\n\n}`
  - Expected: All parse successfully

- [x] Test: Trailing comma with newlines
  - Input: `{ x: 1, y: 2,\n\n}`
  - Expected: Parses successfully

### Task 4.4: Add additional edge case tests
- [x] Test: Comment-induced newline without comma
  - Input: `{ x: 1, // comment\n y: 2 }`
  - Expected: Error (comma required before y)
  - **Note**: Placeholder for future comment support

- [x] Test: Multiple consecutive missing commas
  - Input: `{ x: 1 y: 2 z: 3 }`
  - Expected: Error on first missing comma

- [x] Test: Nested record with missing comma
  - Input: `{ a: 1, b: { x: 1 y: 2 }, c: 3 }`
  - Expected: Error in nested record

- [x] Test: Shorthand after regular without comma
  - Input: `{ x: 1 name }`
  - Expected: Error "Expected ',' between record fields"

**Total new tests**: 20 test cases (exceeded plan of 17)

---

## Phase 5: Update Example Files ✅

**Status**: ✅ Done

### Task 5.1: Check external-blocks.vf
**File**: `examples/external-blocks.vf`

**Changes**:
- [x] Search for all record literals
- [x] Verify commas between all fields
- [x] Add commas if any are missing
- [x] Test parsing with new parser

**Result**: No changes needed - already correct

### Task 5.2: Check js-interop-overloading.vf
**File**: `examples/js-interop-overloading.vf`

**Changes**:
- [x] Search for all record literals
- [x] Verify commas between all fields
- [x] Add commas if any are missing
- [x] Test parsing with new parser

**Result**: No changes needed - already correct

### Task 5.3: Check for other .vf files
- [x] Search for any other `.vf` files in project
- [x] Review and update as needed

**Result**: All example files already use commas consistently

---

## Phase 6: Update Documentation & Comments ✅

**Status**: ✅ Done

### Task 6.1: Search for relevant comments
- [x] Search for "record" in parser files
- [x] Search for "comma" in parser files
- [x] Search for "optional" in context of records

**Result**: No outdated references found

### Task 6.2: Update comments in parse-expressions.ts
**File**: `packages/core/src/parser/parse-expressions.ts`

**Changes**:
- [x] Update function-level JSDoc for `parseRecordExpr`
- [x] Update inline comments about comma handling
- [x] Remove references to "optional commas"
- [x] Add note about consistency with patterns/types

**Updated**: JSDoc (lines 1237-1257) accurate, inline comments added (lines 842-843, 1342, 1400)

### Task 6.3: Update comments in other parser files
- [x] Check parse-patterns.ts for record-related comments
- [x] Check parse-types.ts for record-related comments
- [x] Update code examples in comments to show commas

**Result**: Already consistent - no changes needed

### Task 6.4: Check README and other docs
- [x] Search for record examples in README.md
- [x] Update any found examples to include commas

**Result**: No updates needed

---

## Phase 7: Document the Design Change ✅

**Status**: ✅ Done

**File**: `.claude/design/require-record-commas-rationale.md`

### Task 7.1: Create rationale document
- [x] Create file in `.claude/design/`
- [x] Document background (2025-11-10 decision)
- [x] Explain why decision is being reversed
- [x] List benefits of requiring commas
- [x] Describe breaking change implications
- [x] Include alternatives considered
- [x] Document final design decisions

**Created**: 334-line comprehensive design rationale document with:
- Background and historical context
- Clear rationale (consistency, clarity, familiarity, simplicity)
- Alternatives considered with rejection reasons
- Benefits for users and implementation
- Breaking change impact and migration path
- Implementation details
- Future considerations
- References to commits and plans

---

## Phase 8: Run Quality Checks ✅

**Status**: ✅ Done

### Task 8.1: Run all quality checks
- [x] Run `npm run check` - Type checking
- [x] Run `npm run lint` - Linting
- [x] Run `npm test` - All tests
- [x] Run `npm run format` - Code formatting

**Results**: All checks passed

### Task 8.2: Address any failures
- [x] Review failure messages if any
- [x] Fix issues found
- [x] Re-run checks until all pass

**Result**: Fixed one eslint warning (unused variable)

### Task 8.3: Verify no regressions
- [x] Confirm test count matches or increases (new tests added)
- [x] Verify no unexpected test failures
- [x] Check that type checking is clean
- [x] Ensure code is properly formatted

**Verification**:
- ✅ 2,173 tests passing (20 new tests added)
- ✅ No test failures
- ✅ Type checking clean
- ✅ Code properly formatted
- ✅ No linting issues

---

## Phase 9: Task Documentation ⏳

**Status**: ✅ Done

- [x] Create `.claude/active/require-record-commas/` directory
- [x] Create `require-record-commas-plan.md`
- [x] Create `require-record-commas-context.md`
- [x] Create `require-record-commas-tasks.md` (this file)

---

## Overall Progress

**Phases Completed**: 9/9 (100%) ✅

**Status Legend**:
- ✅ Done
- ⏳ In Progress
- 🔜 Not Started

**Implementation Status**: COMPLETE

**Last Updated**: 2025-11-11 23:30 (All phases completed, ready to archive)

**Plan Updates Applied**:
- ✅ Added semicolon-required.test.ts to Phase 3 (critical missing test file)
- ✅ Enhanced error messages with context about what was found
- ✅ Clarified single-field record behavior (`{ name }` still works)
- ✅ Added 7 additional edge case tests (17 total instead of 10)
- ✅ Updated time estimates (2.5-3.5 hours instead of 2-3 hours)

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
