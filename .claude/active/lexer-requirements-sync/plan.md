# Lexer Requirements Sync Plan

**Last Updated**: 2025-11-07

## Overview
Update the vibefun lexer to fully comply with LEXER_REQUIREMENTS.md specification, addressing 2 critical gaps, 5 implementation discrepancies, and comprehensive test coverage improvements.

## User Decisions
- **Reserved keywords**: Throw hard error when encountered
- **String normalization**: Apply NFC normalization to string literal values
- **Token naming**: Rename tokens to match spec (EQ_EQ → EQ, etc.)
- **Unit literal**: Keep as separate tokens (no change needed)

## Implementation Phases

### Phase 0: Pre-flight Validation (15 mins)
**Objective**: Understand current state and scope of changes

**Tasks**:
1. Audit all token type references in codebase
2. Check if CLI or stdlib import token types
3. Verify current test coverage baseline
4. Create backup branch

### Phase 1: Add Missing Keywords (30 mins)
**Files**: `token.ts`, `identifiers.test.ts`

**Changes**:
- Add `"try"` and `"catch"` to Keyword type
- Add to KEYWORDS Set
- Update test array to include "and", "try", "catch"
- Update test assertion from 16 to 19

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

**New Tests**:
- Float edge cases (leading zeros in exponents, etc.)
- Invalid float formats (.5, 5., multiple decimals)
- Explicit test for leading zeros as decimal (0123 = 123, not octal)

### Phase 4: Unicode NFC Normalization (45 mins)
**Files**: `lexer.ts`, `identifiers.test.ts`, `strings.test.ts`

**Changes**:
- Apply `.normalize('NFC')` to identifiers in readIdentifier()
- Apply `.normalize('NFC')` to string values after escape processing
- Add tests for composed vs decomposed Unicode
- **Note**: String normalization per user decision, spec notes this needs clarification

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
1. Audit parser for all token usage patterns
2. Rename types in token.ts
3. Update lexer.ts token emissions
4. Run tests - fix lexer issues
5. Update parser.ts
6. Run tests - fix parser issues
7. Update remaining test files
8. Check workspace packages for imports
9. Update index.ts exports

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

## Key Risks & Mitigation
- **Token renames touch many files** → Use incremental testing after each change
- **Reserved keywords may break examples** → Audit example code before implementing
- **Parser uses token types extensively** → Systematic grep audit before changes
- **String normalization is a decision** → Document as user choice, may need future revisit
