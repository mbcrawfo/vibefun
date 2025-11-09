# Lexer Requirements Sync - Implementation Tasks

**Last Updated**: 2025-11-09

## Phase 0: Pre-flight Validation & Preparation ✅

- [x] Verify gap analysis assumptions
  - [x] Count current keywords in Keyword type (17 found, missing "try" and "catch")
  - [x] Check current test keyword count (test says 16, should be 19)
  - [x] Verify no reserved keyword handling exists (confirmed - none exists)
- [x] Check for .vf example files using reserved keywords
  - [x] Find all .vf files (2 found: js-interop-overloading.vf, external-blocks.vf)
  - [x] Grep for reserved keyword usage (none found - safe to proceed)
  - [x] Update examples if needed (not needed)
- [x] Verify workspace dependencies
  - [x] Check CLI for token type imports (none found - clean)
  - [x] Check stdlib for token type imports (none found - clean)
- [x] Get test coverage baseline
  - [x] Run coverage report
  - [x] Document current coverage % (80.73% overall, 99.32% lexer, 1866 tests passing)
- [x] Create working branch
  - [x] `git checkout -b lexer-requirements-sync`
  - [x] Verify clean working directory (clean)

## Phase 1: Add Missing Keywords ✅

- [x] Update token.ts
  - [x] Add "try" to Keyword type
  - [x] Add "catch" to Keyword type
- [x] Update lexer.ts (KEYWORDS Set is in token.ts)
  - [x] Add "try" to KEYWORDS Set
  - [x] Add "catch" to KEYWORDS Set
- [x] Update identifiers.test.ts
  - [x] Add "and" to keyword test array
  - [x] Add "try" to keyword test array
  - [x] Add "catch" to keyword test array
  - [x] Update test assertion from "16" to "19"
- [x] Verify implementation
  - [x] Run `npm run verify` - all checks passed
  - [x] All 1869 tests pass (up from 1866)
- [x] Commit changes
  - [x] `git add .`
  - [x] `git commit` with comprehensive message (89f9d0b)

## Phase 2: Reserved Keywords ⏳

- [ ] Update token.ts
  - [ ] Add RESERVED_KEYWORDS array with 8 keywords
  - [ ] Export isReservedKeyword() function
- [ ] Update lexer.ts
  - [ ] Import RESERVED_KEYWORDS and isReservedKeyword
  - [ ] Add check in readIdentifier() after reading value
  - [ ] Throw error with helpful message for reserved keywords
- [ ] Create reserved-keywords.test.ts
  - [ ] Test each of 8 reserved keywords throws error
  - [ ] Test error message format
  - [ ] Test reserved keywords OK in strings
  - [ ] Test reserved keywords OK in comments
  - [ ] Test location information in errors
- [ ] Verify implementation
  - [ ] Run `npm test -w @vibefun/core -- reserved-keywords.test`
  - [ ] All tests pass
- [ ] Commit changes
  - [ ] `git add .`
  - [ ] `git commit -m "feat(lexer): add reserved keyword validation"`

## Phase 3: Add Missing Test Coverage ⏳

- [ ] Update or create float-edge-cases.test.ts
  - [ ] Test leading zeros as decimal (0123 = 123)
  - [ ] Test .5 throws error (no digit before decimal)
  - [ ] Test 5. throws error (no digit after decimal)
  - [ ] Test 1e010 parses correctly
  - [ ] Test 1.5e+00 parses correctly
  - [ ] Test 1.23e-05 parses correctly
  - [ ] Verify 1.2.3 error (should already exist)
- [ ] Verify implementation
  - [ ] Run `npm test -w @vibefun/core -- numbers.test`
  - [ ] Run `npm test -w @vibefun/core -- float-edge-cases.test` (if new file)
  - [ ] All tests pass
- [ ] Commit changes
  - [ ] `git add .`
  - [ ] `git commit -m "test(lexer): add comprehensive float edge case tests"`

## Phase 4: Unicode NFC Normalization ⏳

- [ ] Update lexer.ts - identifiers
  - [ ] Add normalization in readIdentifier() after line 189
  - [ ] Add comment explaining NFC normalization
- [ ] Update lexer.ts - strings
  - [ ] Add normalization in readSingleLineString() before line 598
  - [ ] Add normalization in readMultiLineString() before line 627
  - [ ] Add TODO comment about potential spec change
- [ ] Create unicode-normalization.test.ts
  - [ ] Test composed vs decomposed identifier (café)
  - [ ] Test multiple Unicode cases (ñ, ü, etc.)
  - [ ] Test duplicate identifier detection with different forms
  - [ ] Test composed vs decomposed in strings
  - [ ] Test multi-line strings get normalized
- [ ] Update existing tests if needed
  - [ ] Check identifiers.test.ts for Unicode tests
  - [ ] Check strings.test.ts for Unicode tests
- [ ] Verify implementation
  - [ ] Run `npm test -w @vibefun/core -- unicode-normalization.test`
  - [ ] Run full lexer test suite
  - [ ] All tests pass
- [ ] Performance benchmark
  - [ ] Create large test file (optional)
  - [ ] Measure compilation time (optional)
  - [ ] Document results in context.md
- [ ] Commit changes
  - [ ] `git add .`
  - [ ] `git commit -m "feat(lexer): add Unicode NFC normalization for identifiers and strings"`

## Phase 5: Code Quality & Documentation ⏳

- [ ] Add documentation to lexer.ts
  - [ ] Add comment block to readOperatorOrPunctuation() explaining maximal munch
  - [ ] Document operator lookahead priority table
  - [ ] Add JSDoc where missing
- [ ] Review code quality
  - [ ] Check for any TODO comments that need addressing
  - [ ] Verify error messages are helpful
- [ ] Verify implementation
  - [ ] Run `npm run check` - type checking
  - [ ] Run `npm run lint` - linting
- [ ] Commit changes
  - [ ] `git add .`
  - [ ] `git commit -m "docs(lexer): add documentation for maximal munch and operators"`

## Phase 6: Token Renames ⏳

### Step 1: Pre-rename Audit
- [ ] Run grep audit for all renamed tokens
  - [ ] Grep for "EQ" usages
  - [ ] Grep for "EQ_EQ" usages
  - [ ] Grep for "BANG_EQ" usages
  - [ ] Grep for "LT_EQ" usages
  - [ ] Grep for "GT_EQ" usages
  - [ ] Grep for "AMP_AMP" usages
  - [ ] Grep for "PIPE_PIPE" usages
  - [ ] Grep for "AMP" usages
  - [ ] Grep for "COLON_COLON" usages
  - [ ] Grep for "COLON_EQ" usages
  - [ ] Grep for "DOT_DOT_DOT" usages
- [ ] Document all affected files (estimate)
  - [ ] Count lexer.ts locations
  - [ ] Count parser.ts locations
  - [ ] Count test file locations

### Step 2: Rename Token Types
- [ ] Update token.ts TokenType union
  - [ ] EQ → EQUALS
  - [ ] EQ_EQ → EQ
  - [ ] BANG_EQ → NEQ
  - [ ] LT_EQ → LTE
  - [ ] GT_EQ → GTE
  - [ ] AMP_AMP → AND_AND
  - [ ] PIPE_PIPE → OR_OR
  - [ ] AMP → AMPERSAND
  - [ ] COLON_COLON → CONS
  - [ ] COLON_EQ → ASSIGN
  - [ ] DOT_DOT_DOT → SPREAD

### Step 3: Update Lexer
- [ ] Update all token emissions in lexer.ts (~30 locations)
  - [ ] Update operator token returns
  - [ ] Update punctuation token returns
- [ ] Verify lexer changes
  - [ ] Run `npm test -w @vibefun/core -- lexer`
  - [ ] Fix any test failures
  - [ ] All lexer tests pass

### Step 4: Update Parser
- [ ] Update all token type checks in parser.ts (~14 locations)
  - [ ] Update `if (token.type === "...")` statements
  - [ ] Update `this.match("...")` calls
- [ ] Verify parser changes
  - [ ] Run `npm test -w @vibefun/core -- parser`
  - [ ] Fix any test failures
  - [ ] All parser tests pass

### Step 5: Update Test Files
- [ ] Update lexer test files
  - [ ] Update lexer.test.ts
  - [ ] Update identifiers.test.ts
  - [ ] Update operators.test.ts
  - [ ] Update strings.test.ts (has token type arrays)
  - [ ] Update comments.test.ts if needed
  - [ ] Update lexer-integration.test.ts if needed
- [ ] Update parser test files
  - [ ] Update parser.test.ts
  - [ ] Update parser-integration.test.ts if needed
- [ ] Update desugarer test files
  - [ ] Update desugarer.test.ts if needed
- [ ] Update any other affected test files found in audit
- [ ] Verify all tests
  - [ ] Run `npm test -w @vibefun/core`
  - [ ] All tests pass

### Step 6: Workspace Verification
- [ ] Check CLI package
  - [ ] Verify no token type imports (should be clean from Phase 0)
  - [ ] Build CLI: `npm run build -w @vibefun/cli`
- [ ] Check stdlib package
  - [ ] Verify no token type imports (should be clean from Phase 0)
  - [ ] Build stdlib: `npm run build -w @vibefun/stdlib`

### Step 7: Final Verification
- [ ] Update index.ts exports if needed
  - [ ] Check packages/core/src/types/index.ts
  - [ ] Check packages/core/src/index.ts
- [ ] Run full verification suite
  - [ ] `npm run check` - type checking passes
  - [ ] `npm run lint` - linting passes
  - [ ] `npm test` - all tests pass
  - [ ] `npm run format` - code formatted
- [ ] Test coverage check
  - [ ] Run `npm run test:coverage -w @vibefun/core`
  - [ ] Verify coverage ≥90%
  - [ ] Compare to Phase 0 baseline
- [ ] Manual testing (if .vf examples exist)
  - [ ] Compile example files
  - [ ] Verify no regressions
- [ ] Commit changes
  - [ ] `git add .`
  - [ ] `git commit -m "refactor(lexer): rename tokens to match spec conventions"`

## Final Phase: Completion ⏳

- [ ] Run final verification
  - [ ] `npm run verify` - all checks pass
  - [ ] No TypeScript errors
  - [ ] All tests passing
  - [ ] Code formatted
- [ ] Review all changes
  - [ ] `git log --oneline`
  - [ ] Review commit messages
  - [ ] Verify all phases complete
- [ ] Update progress documents
  - [ ] Mark all phases complete in tasks.md
  - [ ] Update context.md with final notes
  - [ ] Update plan.md "Last Updated" date
- [ ] Create pull request (if applicable)
  - [ ] Push branch: `git push -u origin lexer-requirements-sync`
  - [ ] Create PR with comprehensive description
  - [ ] Link to LEXER_REQUIREMENTS.md
  - [ ] Describe all changes made

## Completion Criteria ✅

All items must be checked:
- [ ] All 19 active keywords recognized and tested
- [ ] All 8 reserved keywords throw helpful errors
- [ ] Unicode NFC normalization applied to identifiers
- [ ] Unicode NFC normalization applied to string literals
- [ ] All token types renamed to match spec
- [ ] All tests pass with new token names
- [ ] Test coverage ≥90%
- [ ] `npm run verify` passes
- [ ] No TypeScript errors
- [ ] Documentation added
- [ ] All commits have clear messages
- [ ] No breaking changes for users (internal only)

---

## Notes

- Mark tasks complete (✅) as you finish them
- If you encounter blockers, document them here
- Update "Last Updated" date when making changes
- Keep this file in sync with actual progress
