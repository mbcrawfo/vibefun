# Require Commas Between Record Fields - Implementation Plan

**Created**: 2025-11-11
**Status**: Approved, Ready for Implementation

## Summary

Update Vibefun to require commas between all record fields in expressions, matching the existing behavior in patterns and types. Trailing commas remain optional.

## Context

This plan reverses a design decision from 2025-11-10 that made commas optional in record expressions to support multi-line syntax without commas. After discussion, the decision was made to require commas everywhere for consistency and clarity.

## Implementation Approach

**Simple & Consistent**: Commas required everywhere, no newline substitution. This matches JavaScript/TypeScript and ensures consistency across all record contexts (expressions, patterns, and types).

## Phases

### Phase 1: Update Parser - Record Expressions

**File**: `packages/core/src/parser/parse-expressions.ts`

**Changes to `parseRecordExpr` function (lines 1256-1436)**:

#### 1. Record Construction Loop (lines 1368-1423)

Current behavior:
- Commas are optional between fields
- Fields can be separated by newlines without commas
- Loop continues if next token is IDENTIFIER even without comma

New behavior:
- After parsing each field, skip newlines
- If not at RBRACE, expect COMMA (throw error if missing)
- After comma, skip newlines and check for trailing comma
- Remove fallback logic checking for IDENTIFIER without comma

Implementation:
```typescript
// After parsing field...

// Skip newlines after field
while (parser.check("NEWLINE")) {
    parser.advance();
}

// Check if we're at the end
if (parser.check("RBRACE")) {
    break; // End of record
}

// Require comma before next field - enhanced error message
if (!parser.check("COMMA")) {
    const nextToken = parser.peek();
    throw parser.error(
        `Expected ',' between record fields`,
        parser.peek(-1).loc,
        `Found ${nextToken.type} instead. Add a comma to separate fields.`
    );
}
parser.advance(); // Consume comma

// Skip newlines after comma
while (parser.check("NEWLINE")) {
    parser.advance();
}

// Check for trailing comma
if (parser.check("RBRACE")) {
    break; // Trailing comma allowed
}
```

#### 2. Record Update Loop (lines 1288-1353)

Apply same logic for fields and spreads:
- Require comma between each spread/field
- Handle trailing commas
- Skip newlines appropriately

#### 3. Block Disambiguation (lines 840-850)

Update shorthand detection at line 848:
- Remove `|| nextToken.type === "IDENTIFIER"` from continuation check
- Records only detected by COMMA or RBRACE after identifier
- This prevents `{ name\n age }` from being detected as a record (will be a block instead)
- **IMPORTANT**: Single-field records like `{ name }` should still work (RBRACE after identifier)
- No comma needed for single field (no "between" to separate)

### Phase 2: Update Language Specification

**Files**:
- `docs/spec/02-lexical-structure/basic-structure.md`
- `docs/spec/03-type-system/record-types.md`
- `docs/spec/04-expressions/data-literals.md`

**Changes**:
- Add explicit section: "Commas are required between all record fields"
- Update all examples to show commas (add if missing)
- Clarify: "Trailing commas are optional but recommended"
- Add note: "This matches the syntax for record types and patterns"
- Update multi-line examples to include commas
- Remove any language suggesting commas are optional

### Phase 3: Update Existing Tests

**Files**:
- `packages/core/src/parser/record-shorthand.test.ts`
  - Lines 97-101, 108-116: Add commas to newline-separated fields
- `packages/core/src/parser/expressions.test.ts`
  - Lines 2265-2341: Verify all have commas
- `packages/core/src/parser/semicolon-required.test.ts` ⚠️ **NEW**
  - Lines 257-266: Update test "should recognize records with newlines"
  - Change from expecting success to expecting error
  - This test validates the OLD behavior (comma-less records)

**Actions**:
- Add commas to all newline-separated record fields in test inputs
- Verify all record tests have commas between fields
- Update test descriptions if they mention optional commas
- **Update semicolon-required.test.ts** to expect error for comma-less records

### Phase 4: Add Comprehensive Error Tests

**File**: `packages/core/src/parser/expressions.test.ts`

Add new test suite: "Record field comma requirements"

Test cases to add:
1. **Missing comma between regular fields (same line)**
   - Input: `{ x: 1 y: 2 }`
   - Expected: Error "Expected ',' between record fields"

2. **Missing comma between shorthand fields**
   - Input: `{ x y z }`
   - Expected: Error "Expected ',' between record fields"

3. **Missing comma in multi-line records**
   - Input: `{\n  x: 1\n  y: 2\n}`
   - Expected: Error "Expected ',' between record fields"

4. **Missing comma after spread operator**
   - Input: `{ ...base x: 1 }`
   - Expected: Error "Expected ',' between record fields"

5. **Missing comma in mixed shorthand/regular**
   - Input: `{ x age: 30 }`
   - Expected: Error "Expected ',' between record fields"

6. **Trailing comma acceptance** (positive test)
   - Input: `{ x: 1, y: 2, }`
   - Expected: Parses successfully

7. **Single field without comma** (positive test)
   - Input: `{ x: 1 }`
   - Expected: Parses successfully

8. **Multiple fields with commas** (positive test)
   - Input: `{ x: 1, y: 2, z: 3 }`
   - Expected: Parses successfully

9. **Nested records with commas** (positive test)
   - Input: `{ outer: { inner: 1, x: 2 }, y: 3 }`
   - Expected: Parses successfully

10. **Multi-line with commas** (positive test)
    - Input: `{\n  x: 1,\n  y: 2\n}`
    - Expected: Parses successfully

11. **Single shorthand field** (positive test)
    - Input: `{ name }`
    - Expected: Parses successfully (no comma needed for single field)

12. **Comment-induced newline without comma** (negative test)
    - Input: `{ x: 1, // comment\n y: 2 }`
    - Expected: Error (newline after comment requires comma before next field)

13. **Multiple consecutive missing commas**
    - Input: `{ x: 1 y: 2 z: 3 }`
    - Expected: Error on first missing comma

14. **Nested record with missing comma**
    - Input: `{ a: 1, b: { x: 1 y: 2 }, c: 3 }`
    - Expected: Error for missing comma in nested record

15. **Shorthand after regular without comma**
    - Input: `{ x: 1 name }`
    - Expected: Error "Expected ',' between record fields"

16. **Empty record with whitespace variations** (positive tests)
    - Inputs: `{}`, `{ }`, `{\n}`, `{\n\n}`
    - Expected: All parse successfully

17. **Trailing comma with newlines** (positive test)
    - Input: `{ x: 1, y: 2,\n\n}`
    - Expected: Parses successfully

### Phase 5: Update Example Files

**Files**:
- `examples/external-blocks.vf`
- `examples/js-interop-overloading.vf`
- Any other `.vf` files in examples/

**Actions**:
- Search for all record literals in example files
- Add commas where missing (most already have them)
- Verify examples parse with new parser

### Phase 6: Update Documentation & Comments

**Search patterns**:
- "record" in parser files
- "comma" in parser files
- Code examples in JSDoc comments

**Files to check**:
- `packages/core/src/parser/parse-expressions.ts`
- `packages/core/src/parser/parse-patterns.ts`
- `packages/core/src/parser/parse-types.ts`
- Any README files mentioning records

**Actions**:
- Update inline comments mentioning record syntax
- Update JSDoc comments describing record parsing
- Update code examples in comments to include commas
- Remove references to "optional commas"

### Phase 7: Document the Design Change

**Create**: `.claude/design/require-record-commas-rationale.md`

**Content**:
- Background: Previous decision (2025-11-10) and why it's being reversed
- Rationale for requiring commas:
  - Consistency across all record contexts (expressions, patterns, types)
  - Clarity: explicit field separation
  - Alignment with similar languages (JS, TS, Rust)
  - Simpler parser implementation
- Benefits:
  - No ambiguity in field separation
  - Consistent syntax across language
  - Familiar to developers from other languages
- Breaking change communication:
  - This is a breaking change
  - Affects code with newline-separated fields
  - Simple fix: add commas between fields
  - Acceptable since language is in early development

### Phase 8: Run Quality Checks

**Command**:
```bash
npm run verify
```

This runs:
- `npm run check` - Type checking
- `npm run lint` - Linting
- `npm test` - All tests
- `npm run format` - Code formatting

**Verify**:
- All tests pass
- Type checking passes
- Linting passes
- Code properly formatted

**If tests fail**:
- Review failure messages
- Update any missed test cases
- Re-run verification

### Phase 9: Create Task Documentation

**Create**: `.claude/active/require-record-commas/`

Files:
- `require-record-commas-plan.md` - This plan document
- `require-record-commas-context.md` - Research findings and key decisions
- `require-record-commas-tasks.md` - Detailed checklist with status tracking

## Edge Cases Covered

1. **Empty records**: `{}`
   - No change needed, already works

2. **Single field**: `{ x: 1 }`
   - No comma needed (no "between")
   - Already works

3. **Trailing comma**: `{ x: 1, y: 2, }`
   - Remains valid (explicitly supported)
   - No change to trailing comma logic

4. **Nested records**: `{ outer: { inner: 1, x: 2 }, y: 3 }`
   - Commas required at all nesting levels
   - Recursive parsing handles naturally

5. **Comments between fields**: `{ x: 1, /* comment */ y: 2 }`
   - Handled by newline skipping logic (comments produce newlines)

6. **Multiple newlines**: `{ x: 1,\n\n\n  y: 2 }`
   - Handled by `while (parser.check("NEWLINE"))` loop

7. **Spreads**: `{ ...base, x: 1, y: 2 }`
   - Commas required before/after like regular fields
   - Same logic applies in record update loop

8. **Mixed shorthand and regular**: `{ name, age: 30, active }`
   - Commas required between all fields
   - Works with updated parsing logic

9. **Single-field records**: `{ name }` or `{ x: 1 }`
   - No comma needed (nothing to separate)
   - RBRACE detection still identifies these as records
   - Block disambiguation logic preserves this behavior

## Breaking Change Notes

- This reverses the 2025-11-10 design decision to allow optional commas
- Any `.vf` code with newline-separated fields without commas will break
- Simple fix for users: add commas between all record fields
- Language is in early development, breaking changes are acceptable
- No existing production code to migrate (development phase)

## Design Decisions

### Why Require Commas Everywhere?

Three alternatives were considered:

1. **Commas required everywhere** ← **CHOSEN**
   - Simplest implementation
   - Matches JavaScript/TypeScript
   - Consistent with patterns and types
   - Clear, explicit syntax

2. **Context-sensitive: commas OR newlines**
   - Complex implementation (requires line tracking)
   - Previous attempts (2025-11-10) had 6-49 test failures
   - Ambiguous rules for users

3. **Strict: comma XOR newline**
   - Strange restriction
   - Limits flexibility unnecessarily

Decision: **Alternative 1** chosen for simplicity and consistency.

### Why Match Patterns/Types Exactly?

Patterns and types already require commas. Having different rules for expressions would be confusing and inconsistent. Full consistency makes the language easier to learn and use.

## Success Criteria

- ✅ Parser requires commas in all record expressions
- ✅ Helpful error messages for missing commas: "Expected ',' between record fields"
- ✅ All tests pass with updated syntax
- ✅ Spec clearly documents comma requirement
- ✅ All examples updated with commas
- ✅ Consistent behavior across expressions, patterns, and types
- ✅ Quality checks pass (verify, lint, test, format)
- ✅ No regressions in other parser functionality

## Implementation Notes

### Parser Change Pattern

The key change is converting from:

```typescript
// OLD: Optional comma
if (parser.check("COMMA")) {
    parser.advance();
    // ...
} else if (!parser.check("IDENTIFIER")) {
    break;
}
```

To:

```typescript
// NEW: Required comma
if (parser.check("RBRACE")) {
    break;
}
parser.expect("COMMA", "Expected ',' between record fields");
// ... handle trailing comma
```

### Error Message

Use enhanced error message with context:
- Primary: "Expected ',' between record fields"
- Secondary: Show what was found instead (e.g., "Found IDENTIFIER instead")
- Hint: "Add a comma to separate fields"
- Location: Point to the token after the field (where comma should be)

Implementation:
```typescript
if (!parser.check("COMMA")) {
    const nextToken = parser.peek();
    throw parser.error(
        `Expected ',' between record fields`,
        parser.peek(-1).loc,
        `Found ${nextToken.type} instead. Add a comma to separate fields.`
    );
}
```

## Timeline

Expected implementation time:
- Phase 1 (Parser): 40-50 minutes (enhanced error messages)
- Phase 2 (Spec): 15-20 minutes
- Phase 3 (Update tests): 15-20 minutes (added semicolon-required.test.ts)
- Phase 4 (New tests): 30-40 minutes (17 test cases instead of 10)
- Phase 5 (Examples): 5-10 minutes
- Phase 6 (Comments): 10-15 minutes
- Phase 7 (Rationale): 10-15 minutes
- Phase 8 (Quality): 5-10 minutes

**Total**: ~2.5-3.5 hours

## References

- Research findings: See `require-record-commas-context.md`
- Previous decision: `.claude/archive/2025-11-10-test-2-missing-comma-in-record.md`
- Parser implementation: `packages/core/src/parser/parse-expressions.ts:1256-1436`
- Spec files: `docs/spec/` (multiple files)
