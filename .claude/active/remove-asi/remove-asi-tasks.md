# Remove ASI - Task Checklist

**Created**: 2025-11-11
**Last Updated**: 2025-11-11

## Phase 0: Pre-flight Check
- [ ] Run `npm run verify` - ensure clean starting point
- [ ] Run `git status` - ensure clean working directory
- [ ] Document baseline test statistics
- [ ] Commit: Starting point established

## Phase 1: Update Language Specification
- [ ] Update `docs/spec/02-lexical-structure/basic-structure.md`
  - [ ] Remove ASI rules (lines 35-141)
  - [ ] Document required semicolons
  - [ ] Add examples
  - [ ] Document lambda newline exception
- [ ] Update `docs/spec/.agent-map.md`
- [ ] Update `docs/spec/README.md`
- [ ] Update `docs/spec/02-lexical-structure/README.md`
- [ ] Search all spec files for "ASI" and update
- [ ] Update code examples in:
  - [ ] `docs/spec/04-expressions/`
  - [ ] `docs/spec/05-pattern-matching/`
  - [ ] `docs/spec/06-functions/`
  - [ ] `docs/spec/10-javascript-interop/`
- [ ] Update `packages/core/src/parser/CLAUDE.md`
- [ ] Commit: "docs: update language spec to require semicolons"

## Phase 2: Add Semicolons to All Code (BEFORE Parser Changes)

### 2.1 Update Parser Test Files
- [ ] `parser/asi.test.ts` (update for now, delete later)
- [ ] `parser/large-literals.test.ts`
- [ ] `parser/types.test.ts`
- [ ] `parser/operator-edge-cases.test.ts`
- [ ] `parser/deep-nesting.test.ts`
- [ ] `parser/overloading.test.ts`
- [ ] `parser/declarations.test.ts`
- [ ] `parser/parser.test.ts`
- [ ] `parser/parser-integration.test.ts`
- [ ] `parser/patterns.test.ts`
- [ ] `parser/expressions.test.ts`
- [ ] `parser/parser-errors.test.ts`
- [ ] `parser/operator-sections.test.ts`
- [ ] `parser/record-shorthand.test.ts`
- [ ] `parser/tuples.test.ts`
- [ ] `parser/while-loops.test.ts`
- [ ] `parser/lambda-precedence.test.ts`
- [ ] `parser/unicode-edge-cases.test.ts`

### 2.2 Update Example Files
- [ ] `examples/external-blocks.vf`
- [ ] `examples/js-interop-overloading.vf`
- [ ] Search for other `.vf` files

### 2.3 Update Spec Code Examples
- [ ] All code blocks in `docs/spec/**/*.md`

### 2.4 Update Code Comments
- [ ] `packages/core/src/parser/*.ts`
- [ ] `packages/core/src/lexer/*.ts`
- [ ] `packages/core/src/types/*.ts`
- [ ] `packages/core/src/typechecker/*.ts`
- [ ] `packages/core/src/codegen/*.ts`

### 2.5 Update Desugarer Tests
- [ ] `desugarer/blocks.test.ts`
- [ ] `desugarer/desugarer.test.ts`
- [ ] `desugarer/integration.test.ts`
- [ ] All other desugarer test files (~30 total)

- [ ] Commit: "test: add semicolons to all test code and examples"

## Phase 3: Update Parser Implementation

### 3.1 Remove ASI Helper Functions
- [ ] Remove `shouldInsertSemicolon()` from `parser-helpers.ts`
- [ ] Remove `isExpressionContinuation()`
- [ ] Remove `isLineContinuation()`
- [ ] Remove `isStatementStart()`
- [ ] Add new `expectSemicolon()` with clear errors

### 3.2 Update Top-Level Declaration Parsing
- [ ] Update `parseModule()` in `parser.ts`
- [ ] Require explicit semicolons
- [ ] Handle EOF correctly (no semicolon needed)
- [ ] Add error messages

### 3.3 Update Block Expression Parsing
- [ ] Update block parsing in `parse-expressions.ts`
- [ ] Require semicolons after statements
- [ ] Require trailing semicolon
- [ ] Keep record parsing unchanged

### 3.4 Update Block vs Record Disambiguation
- [ ] Simplify `parseBraceExpression()` logic
- [ ] Use semicolon presence for disambiguation

### 3.5 Update External Block Parsing
- [ ] Update `parseExternalBlock()` in `parse-declarations.ts`
- [ ] Require semicolons after items
- [ ] Add error messages

### 3.6 Verify Let Expression Parsing
- [ ] Check `parseLetExpr()` requires semicolons

### 3.7 Preserve Lambda Newline Handling
- [ ] Keep newline before `FAT_ARROW` special case
- [ ] Test `(x, y)\n=> body` works

### 3.8 Review Parser State
- [ ] Review `inRecordContext` flag in `parser-base.ts`
- [ ] Review NEWLINE token handling

### 3.9 Update Parser Error Messages
- [ ] Search for "semicolon", "ASI", "newline" in errors
- [ ] Update all error messages
- [ ] Make messages helpful

- [ ] Commit: "refactor(parser): remove ASI and require explicit semicolons"

## Phase 4: Update Tests

### 4.1 Remove ASI Test File
- [ ] Delete `packages/core/src/parser/asi.test.ts`

### 4.2 Create Semicolon-Required Test File
- [ ] Create `semicolon-required.test.ts`
- [ ] Test missing semicolons produce errors
- [ ] Test error messages are helpful
- [ ] Test records still work
- [ ] Test lambda newlines still work
- [ ] Test edge cases (empty blocks, trailing semicolons, EOF, etc.)
- [ ] Test external block semicolons

### 4.3 Update Expression Tests
- [ ] Review `parse-expressions.test.ts`
- [ ] Update any other expression tests
- [ ] Verify all pass

### 4.4 Update Declaration Tests
- [ ] Review `parse-declarations.test.ts`
- [ ] Update any other declaration tests
- [ ] Verify all pass

### 4.5 Update Integration Tests
- [ ] Review end-to-end tests
- [ ] Update syntax

### 4.6 Update While Loop Tests
- [ ] Review `while-loops.test.ts`
- [ ] Ensure blocks require semicolons

- [ ] Commit: "test: update tests for required semicolons"

## Phase 5: Verification and Validation

### 5.1 Run Quality Checks
- [ ] `npm run check` - passes
- [ ] `npm run lint` - passes
- [ ] `npm test` - passes
- [ ] `npm run format` - run

### 5.2 Verify No ASI References
- [ ] Search for "ASI"
- [ ] Search for "automatic semicolon"
- [ ] Search for "semicolon insertion"
- [ ] Update/remove all found references

### 5.3 Review Later Compiler Stages
- [ ] Check desugarer - no ASI assumptions
- [ ] Check typechecker - no ASI assumptions
- [ ] Check codegen - no ASI assumptions
- [ ] Verify error messages don't mention ASI

### 5.4 Manual Testing
- [ ] Compile all example files
- [ ] Test error messages for missing semicolons
- [ ] Test multi-line expression strategies

### 5.5 Test Edge Cases
- [ ] Empty blocks: `{}`
- [ ] Trailing semicolons: `{ x; y; }`
- [ ] Single statement: `{ x; }`
- [ ] Records with commas: `{ x: 1, y: 2 }`
- [ ] Records with newlines: `{ x: 1\ny: 2 }`
- [ ] Records with trailing comma: `{ x: 1, y: 2, }`
- [ ] Lambda newlines: `(x, y)\n=> x + y`
- [ ] Single-param lambda: `x\n=> x + 1`
- [ ] Comments: `let x = 1; // comment`
- [ ] EOF: last declaration without semicolon

- [ ] Commit: "chore: verify semicolon changes complete"

## Phase 6: Update Project Documentation

### 6.1 Update CLAUDE.md
- [ ] Remove ASI references
- [ ] Add to Technical Decisions section
- [ ] Update syntax examples

### 6.2 Update README Files
- [ ] Root `README.md`
- [ ] Package READMEs
- [ ] Folder READMEs

### 6.3 Document Breaking Changes
- [ ] List what changed
- [ ] Provide migration guidance
- [ ] Show before/after examples

### 6.4 Update Coding Standards
- [ ] `.claude/CODING_STANDARDS.md`
- [ ] Update vibefun examples

### 6.5 Update Other Documentation
- [ ] CI/CD docs
- [ ] Contributor guides
- [ ] package.json descriptions

- [ ] Commit: "docs: update project documentation for required semicolons"

## Phase 7: Final Verification

### 7.1 Document Modified Files
- [ ] Create checklist of all modified files

### 7.2 Verify All Commits Made
- [ ] Phase 1 commit
- [ ] Phase 2 commit
- [ ] Phase 3 commit
- [ ] Phase 4 commit
- [ ] Phase 5 commit
- [ ] Phase 6 commit

### 7.3 Final Checklist
- [ ] All tests pass
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Code formatted
- [ ] All examples compile
- [ ] No ASI references remain
- [ ] Error messages helpful
- [ ] Documentation consistent
- [ ] CLAUDE.md updated
- [ ] Breaking changes documented

- [ ] Final commit: "feat!: remove ASI and require explicit semicolons"

## Status

**Current Phase**: Not started
**Phases Completed**: 0/7
**Overall Progress**: 0%

## Notes

- Phase 2 MUST complete BEFORE Phase 3
- Do NOT run tests during Phase 2 (will fail)
- Make commits at end of each phase
- Verify quality checks pass before final commit
