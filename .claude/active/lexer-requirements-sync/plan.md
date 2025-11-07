# Lexer Requirements Sync Plan

**Last Updated**: 2025-01-07

## Overview
Update the vibefun lexer to fully comply with LEXER_REQUIREMENTS.md specification, addressing 2 critical gaps, 5 implementation discrepancies, and comprehensive test coverage improvements.

## User Decisions
- **Reserved keywords**: Throw hard error when encountered
- **String normalization**: Apply NFC normalization to string literal values
- **Token naming**: Rename tokens to match spec (EQ_EQ → EQ, etc.)
- **Unit literal**: Keep as separate tokens (no change needed)

## Implementation Phases

### Phase 0: Pre-flight Validation & Preparation (20 mins)
**Objective**: Understand current state, verify assumptions, and prepare for implementation

**Tasks**:

1. **Verify gap analysis assumptions**:
   ```bash
   # Count current keywords in Keyword type
   grep -A 20 "type Keyword =" packages/core/src/types/token.ts

   # Check current test keyword count
   grep "should tokenize all" packages/core/src/lexer/identifiers.test.ts

   # Verify no reserved keyword handling exists
   grep -r "reserved" packages/core/src/lexer --include="*.ts"
   ```

2. **Check for .vf example files** that might use reserved keywords:
   ```bash
   find . -name "*.vf" -type f
   grep -r "async\|await\|trait\|impl\|where\|do\|yield\|return" --include="*.vf" .
   ```

3. **Verify workspace dependencies**:
   ```bash
   # Check if CLI imports token types
   grep -r "TokenType\|Token" packages/cli/src --include="*.ts"

   # Check if stdlib imports token types
   grep -r "TokenType\|Token" packages/stdlib/src --include="*.ts"
   ```

4. **Get test coverage baseline**:
   ```bash
   npm run test:coverage -w @vibefun/core
   ```
   - Note current coverage % for comparison after changes

5. **Create working branch**:
   ```bash
   git checkout -b lexer-requirements-sync
   git status  # Verify clean working directory
   ```

### Phase 1: Add Missing Keywords (30 mins)
**Files**: `token.ts`, `identifiers.test.ts`

**Current State**: Lexer has 17/19 keywords ("try" and "catch" missing), test array has 16 keywords (missing "and", "try", "catch")

**Changes**:
- Add `"try"` and `"catch"` to Keyword type in token.ts
- Add to KEYWORDS Set in lexer.ts
- Update test array in identifiers.test.ts to include "and", "try", "catch" (3 additions)
- Update test assertion from "should tokenize all 16 keywords" to "should tokenize all 19 keywords"

### Phase 2: Reserved Keywords (1-2 hours)
**Files**: `token.ts`, `lexer.ts`, `reserved-keywords.test.ts` (new)

**Changes**:
- Add RESERVED_KEYWORDS array with 8 keywords
- Add isReservedKeyword() function
- Update readIdentifier() to check and error on reserved keywords
- Error message: "'X' is a reserved keyword for future language features"
- Create comprehensive test file

### Phase 3: Add Missing Test Coverage (1 hour)
**Files**: `numbers.test.ts`

**New Test Cases**:
1. **Leading zeros are decimal (not octal)**:
   - `0123` should equal decimal 123 (not octal 83 like JavaScript)
   - Explicit test to document vibefun behavior differs from JS

2. **Invalid float formats (should throw errors)**:
   - `.5` - no digit before decimal point (invalid)
   - `5.` - no digit after decimal point (invalid)
   - `1.2.3` - multiple decimal points (already tested, verify coverage)

3. **Scientific notation edge cases**:
   - `1e010` - leading zeros in exponent (valid)
   - `1.5e+00` - explicit +0 exponent (valid)
   - `1.23e-05` - negative exponent with leading zero (valid)
   - Verify all parse correctly to expected numeric values

**Note**: Current implementation already handles .5 and 5. rejection correctly (lexer.ts:377), but lacks explicit tests for this behavior

### Phase 4: Unicode NFC Normalization (45 mins)
**Files**: `lexer.ts`, `identifiers.test.ts`, `strings.test.ts`

**Code Changes**:

1. **In `readIdentifier()` (lexer.ts:~189)**:
   ```typescript
   // After reading all identifier characters, before keyword check:
   value = value.normalize('NFC');
   ```
   - Add comment explaining NFC normalization ensures café (composed) === café (decomposed)

2. **In `readSingleLineString()` (lexer.ts:~598)**:
   ```typescript
   // After escape processing complete, before returning token:
   value = value.normalize('NFC');
   ```

3. **In `readMultiLineString()` (lexer.ts:~627)**:
   ```typescript
   // After escape processing complete, before returning token:
   value = value.normalize('NFC');
   ```

**Test Changes**:
- Add test in identifiers.test.ts: composed vs decomposed Unicode identifiers (café U+00E9 vs U+0065+U+0301)
- Add test in strings.test.ts: composed vs decomposed Unicode in string literals
- Verify normalized values are equal when used as identifiers or compared as strings

**Note**: String normalization is per user decision. LEXER_REQUIREMENTS.md notes this "requires spec clarification" - may need future revision

### Phase 5: Code Quality & Documentation (30 mins)
**Files**: `lexer.ts`

**Changes**:
- Add comment block explaining maximal munch to readOperatorOrPunctuation()
- Document operator lookahead priority table
- Add JSDoc where missing

### Phase 6: Token Renames (4-5 hours) **MOST DISRUPTIVE**
**Files**: All files using token types

**Token Rename Table**:
```
Old Name       → New Name     (Usage)
EQ             → EQUALS       (Assignment =)
EQ_EQ          → EQ           (Comparison ==)
BANG_EQ        → NEQ          (Not equal !=)
LT_EQ          → LTE          (Less/equal <=)
GT_EQ          → GTE          (Greater/equal >=)
AMP_AMP        → AND_AND      (Logical AND &&)
PIPE_PIPE      → OR_OR        (Logical OR ||)
AMP            → AMPERSAND    (String concat &)
COLON_COLON    → CONS         (List cons ::)
COLON_EQ       → ASSIGN       (Ref assign :=)
DOT_DOT_DOT    → SPREAD       (Spread ...)
```

**Incremental Approach**:

1. **Pre-rename audit** (grep for all usages):
   ```bash
   # Find all token type string literals that will change
   grep -r '"EQ"' packages/core/src --include="*.ts"
   grep -r '"EQ_EQ"' packages/core/src --include="*.ts"
   grep -r '"BANG_EQ"' packages/core/src --include="*.ts"
   grep -r '"LT_EQ"' packages/core/src --include="*.ts"
   grep -r '"GT_EQ"' packages/core/src --include="*.ts"
   grep -r '"AMP_AMP"' packages/core/src --include="*.ts"
   grep -r '"PIPE_PIPE"' packages/core/src --include="*.ts"
   grep -r '"AMP"' packages/core/src --include="*.ts"
   grep -r '"COLON_COLON"' packages/core/src --include="*.ts"
   grep -r '"COLON_EQ"' packages/core/src --include="*.ts"
   grep -r '"DOT_DOT_DOT"' packages/core/src --include="*.ts"
   ```
   - Document all affected files

2. **Rename token types** in `token.ts`:
   - Update TokenType union type
   - TypeScript will catch some usage errors, but not string literals

3. **Update lexer.ts** (~30 locations):
   - Update all `return { type: "OLD_NAME" }` statements
   - Run `npm test -w @vibefun/core -- lexer` to verify

4. **Update parser.ts** (~14 locations):
   - Update all token type checks and match() calls
   - Run `npm test -w @vibefun/core -- parser` to verify

5. **Update test files** (estimate ~50+ locations):
   - `lexer.test.ts` - General lexer tests
   - `identifiers.test.ts` - Keyword/identifier tests
   - `operators.test.ts` - Operator token tests
   - `strings.test.ts` - String literal tests (has token type arrays)
   - `parser.test.ts` - Parser unit tests
   - `parser-integration.test.ts` - Parser integration tests
   - `desugarer.test.ts` - May have token assertions
   - Any other files found in audit step

6. **Check workspace packages**:
   - Verify CLI doesn't import/use token types directly
   - Verify stdlib doesn't import/use token types directly

7. **Update exports** in `index.ts` files if needed

8. **Final verification**:
   - `npm run verify` - All checks must pass
   - Manually test a few example .vf files if available

## New Test Files Required

The following new test files need to be created to provide comprehensive coverage for the new features:

### 1. `packages/core/src/lexer/reserved-keywords.test.ts` (Phase 2)
**Purpose**: Test reserved keyword error handling

**Test cases**:
- Each of the 8 reserved keywords (`async`, `await`, `trait`, `impl`, `where`, `do`, `yield`, `return`) throws an error when used as an identifier
- Error messages are helpful and mention "reserved keyword for future language features"
- Reserved keywords can still appear in strings and comments
- Location information is accurate in error messages

### 2. `packages/core/src/lexer/float-edge-cases.test.ts` (Phase 3)
**Purpose**: Test edge cases for float and integer parsing

**Test cases**:
- Leading zeros are decimal: `0123 === 123` (not octal like JavaScript)
- Invalid float without leading digit: `.5` throws error
- Invalid float without trailing digit: `5.` throws error
- Scientific notation with leading zeros: `1e010`, `1.5e+00`, `1.23e-05` all parse correctly
- Multiple decimal points: `1.2.3` throws error (verify existing coverage)

### 3. `packages/core/src/lexer/unicode-normalization.test.ts` (Phase 4)
**Purpose**: Test Unicode NFC normalization for identifiers and strings

**Test cases for identifiers**:
- Composed vs decomposed Unicode treated as same identifier:
  - `café` (U+00E9 - composed é)
  - `café` (U+0065 U+0301 - decomposed e + combining accent)
  - Both should produce identical token values after normalization
- Test multiple Unicode edge cases (ñ, ü, etc.)
- Verify error on duplicate identifier using different normalization forms

**Test cases for strings**:
- Composed vs decomposed Unicode in string literals produce same normalized value
- Verify string comparison works correctly after normalization
- Test multi-line strings also get normalized

## Completion Criteria
- ✅ All 19 active keywords recognized and tested
- ✅ All 8 reserved keywords throw helpful errors
- ✅ Unicode NFC normalization applied to identifiers
- ✅ Unicode NFC normalization applied to string literals
- ✅ All token types renamed to match spec
- ✅ All tests pass with new token names
- ✅ Test coverage remains ≥90%
- ✅ `npm run verify` passes
- ✅ No TypeScript errors
- ✅ Documentation added

## Estimated Time: 7-10 hours

## Risk Assessment & Mitigation

### High Risk: Token Renames (Phase 6)
**Risk**: Token renames affect 50+ locations across lexer, parser, and test files. String literals won't be caught by TypeScript.

**Mitigation**:
- Comprehensive grep audit before starting (Phase 6 step 1)
- Incremental changes with testing after each file
- Update lexer first, verify with lexer tests
- Update parser second, verify with parser tests
- Update test files last
- Keep tests running continuously to catch breakages immediately

**Rollback Strategy**:
```bash
# If Phase 6 becomes too problematic:
git stash  # Save any partial work
git checkout main
git branch -D lexer-requirements-sync

# Create new branch with just Phases 1-5 complete:
git checkout -b lexer-requirements-partial
# Cherry-pick commits for Phases 1-5 only
```

### Medium Risk: Unicode Normalization Performance
**Risk**: `.normalize('NFC')` called on every identifier and string could impact performance on large files.

**Mitigation**:
- Implement as specified first (correctness over performance)
- Add performance benchmark after implementation:
  ```bash
  # Create large test file with 10K identifiers
  time vibefun compile large-file.vf
  ```
- If performance issue detected, optimize:
  - Only normalize identifiers/strings containing non-ASCII characters
  - Cache normalized values
  - Profile to identify bottlenecks

**Monitoring**: Compare compilation time before/after normalization on realistic codebases.

### Medium Risk: Reserved Keywords Breaking Existing Code
**Risk**: If any .vf example files use reserved keywords, they'll break after Phase 2.

**Mitigation**:
- Phase 0 step 2 audits for reserved keyword usage in .vf files
- If found, update examples before implementing reserved keyword errors
- Reserved keywords are future-looking, unlikely to be in current examples

### Low Risk: String Normalization Spec Ambiguity
**Risk**: LEXER_REQUIREMENTS notes string normalization "requires spec clarification" - decision may need reverting.

**Mitigation**:
- Document in code comments that this is per user decision
- Add TODO comment mentioning potential spec change
- Easy to remove `.normalize('NFC')` calls from string functions if spec changes
- Keep git history clear with dedicated commit for string normalization

### Test Coverage Protection
**Current coverage**: ~90% (verify in Phase 0)

**Protection**:
- Get baseline coverage in Phase 0
- Run coverage after each phase
- Ensure coverage stays ≥90% throughout
- If coverage drops, add tests before proceeding to next phase
