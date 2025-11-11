# Remove ASI and Make Semicolons Required - Implementation Plan

**Created**: 2025-11-11
**Last Updated**: 2025-11-11
**Status**: Ready to begin

## Overview

This plan outlines the complete removal of Automatic Semicolon Insertion (ASI) from the vibefun language, making semicolons explicitly required in most contexts. This is a breaking change that will require updating all existing code, tests, examples, and documentation.

## Design Decisions

### Semicolon Requirements

**Semicolons REQUIRED in:**
- After top-level module declarations (`let`, `type`, `external`, `import`)
- After every statement in block expressions `{ ... }` (including trailing semicolons)
- After every item in external blocks

**Semicolons NOT required in:**
- Record literals (commas and newlines continue to work as separators)
- After EOF (last declaration before end of file doesn't need semicolon)

### Special Cases

**Lambda Newlines**: The special case allowing newlines before the fat arrow is preserved:
```vibefun
(x, y)
=> x + y
```
This remains valid for multi-line parameter lists.

**Trailing Semicolons**: REQUIRED - Every statement in a block must end with a semicolon:
```vibefun
{
  let x = 1;
  let y = 2;
  x + y;
}
```

**Block vs Record Disambiguation**: With required semicolons, the parser can distinguish:
- `{ x; }` → block (has semicolon)
- `{ x }` → record (no semicolon)
- `{ x: value }` → record (has colon)

**Multi-line Expressions**: Without ASI, long expressions must use:
- Binary operators that continue the expression
- Explicit parentheses to group
- Cannot simply break across lines without continuation

### Migration Strategy

**No version flag or migration tool** - This is a clean breaking change. Users must update their code manually.

## Implementation Phases

### Phase 0: Pre-flight Check

**Objective**: Verify clean starting state

**Actions**:
1. Run `npm run verify` to ensure all checks pass
2. Run `git status` to ensure clean working directory
3. Verify all tests pass (establish baseline)
4. Document current test statistics for comparison

**Exit Criteria**:
- All quality checks pass
- Working directory is clean
- Baseline established

---

### Phase 1: Update Language Specification

**Objective**: Update all language documentation to reflect required semicolons

**Actions**:

**1.1 Update Basic Structure Document**:
- File: `docs/spec/02-lexical-structure/basic-structure.md`
- Remove all ASI rules and documentation (lines 35-141)
- Add new section documenting required semicolon rules
- Include examples of correct semicolon usage
- Document lambda newline exception
- Document multi-line expression limitations

**1.2 Update Specification Index Files**:
- `docs/spec/.agent-map.md` - Update semicolon references (line 11)
- `docs/spec/README.md` - Update if mentions ASI
- `docs/spec/02-lexical-structure/README.md` - Update folder index

**1.3 Search and Update All Spec Files**:
- Search all 54 markdown files in `docs/spec/` for:
  - "ASI" or "automatic semicolon"
  - Code examples needing semicolons
- Key directories to check:
  - `docs/spec/04-expressions/` (block examples)
  - `docs/spec/05-pattern-matching/` (match blocks)
  - `docs/spec/06-functions/` (function examples)
  - `docs/spec/10-javascript-interop/` (external examples)
- Update all found references

**1.4 Update Parser Documentation**:
- `packages/core/src/parser/CLAUDE.md` - Remove ASI documentation, update parser design notes

**Exit Criteria**:
- No "ASI" references in documentation
- All spec code examples have proper semicolons
- Semicolon rules clearly documented

**Commit Point**: "docs: update language spec to require semicolons"

---

### Phase 2: Add Semicolons to All Code (CRITICAL: Before Parser Changes)

**Objective**: Update all existing vibefun code with required semicolons BEFORE changing the parser

⚠️ **CRITICAL**: This phase must complete BEFORE Phase 3. Do NOT run tests yet - they will fail until parser is updated.

**Actions**:

**2.1 Update Test Files with Semicolons**:

Scan and update ALL test files in `packages/core/src/`:

**Parser tests** (18 files):
- `parser/asi.test.ts` (will be deleted later, but update for now)
- `parser/large-literals.test.ts`
- `parser/types.test.ts`
- `parser/operator-edge-cases.test.ts`
- `parser/deep-nesting.test.ts`
- `parser/overloading.test.ts`
- `parser/declarations.test.ts`
- `parser/parser.test.ts`
- `parser/parser-integration.test.ts`
- `parser/patterns.test.ts`
- `parser/expressions.test.ts`
- `parser/parser-errors.test.ts`
- `parser/operator-sections.test.ts`
- `parser/record-shorthand.test.ts`
- `parser/tuples.test.ts`
- `parser/while-loops.test.ts`
- `parser/lambda-precedence.test.ts`
- `parser/unicode-edge-cases.test.ts`

Add semicolons to vibefun code strings:
- Top-level declarations
- Block statements (including trailing)
- External block items
- Keep commas in record literals

**2.2 Update Example Files**:
- `examples/external-blocks.vf` - Add semicolons to all declarations and external items
- `examples/js-interop-overloading.vf` - Add semicolons
- Search for any other `.vf` files in project

**2.3 Update Spec Code Examples**:
- All code blocks in `docs/spec/**/*.md` files
- Focus on:
  - `04-expressions/` - Block and expression examples
  - `05-pattern-matching/` - Match expression blocks
  - `06-functions/` - Function definition examples
  - `10-javascript-interop/` - External declaration examples
- Ensure consistency with new rules

**2.4 Update Code Comments with Examples**:
- `packages/core/src/parser/*.ts` - Example syntax in comments
- `packages/core/src/lexer/*.ts` - Example syntax in comments
- `packages/core/src/types/*.ts` - Example syntax in comments
- `packages/core/src/typechecker/*.ts` - Example syntax in comments
- `packages/core/src/codegen/*.ts` - Example syntax in comments
- Any other files with `.vf` code examples in comments

**2.5 Update Desugarer Test Code**:
- Scan ALL files in `packages/core/src/desugarer/*.test.ts` (~30 files)
- Critical files:
  - `desugarer/blocks.test.ts` - Block desugaring examples
  - `desugarer/desugarer.test.ts` - General desugaring
  - `desugarer/integration.test.ts` - Integration tests
- Update vibefun code with semicolons

**Exit Criteria**:
- All vibefun code in tests has proper semicolons
- All examples have proper semicolons
- All documentation code has proper semicolons
- All comments with code examples updated
- DO NOT run tests (they will fail)

**Commit Point**: "test: add semicolons to all test code and examples"

---

### Phase 3: Update Parser Implementation

**Objective**: Modify parser to require explicit semicolons and remove ASI logic

**Actions**:

**3.1 Remove ASI Helper Functions**:
- File: `packages/core/src/parser/parser-helpers.ts`
- Remove or disable these functions:
  - `shouldInsertSemicolon()` - Main ASI decision logic
  - `isExpressionContinuation()` - Tokens preventing ASI after them
  - `isLineContinuation()` - Tokens preventing ASI before them
  - `isStatementStart()` - Tokens triggering ASI
- Keep any helper functions still useful for error messages
- Add new helper: `expectSemicolon()` with clear error messages:
  - "Expected semicolon after declaration"
  - "Expected semicolon after statement"
  - Provide helpful context

**3.2 Update Top-Level Declaration Parsing**:
- File: `packages/core/src/parser/parser.ts`
- Update `parseModule()` function (lines 127-135):
  - Require explicit `SEMICOLON` tokens after each declaration
  - Remove newline-based separation logic
  - Add clear error when semicolon missing
  - **Special case**: Handle EOF correctly (no semicolon needed after last declaration before EOF)
- Test this with single and multiple declarations

**3.3 Update Block Expression Parsing**:
- File: `packages/core/src/parser/parse-expressions.ts`
- Update block parsing logic (lines 1451-1477):
  - Require explicit `SEMICOLON` tokens after every statement
  - **Require trailing semicolon** before closing brace
  - Remove ASI-based newline handling (`shouldInsertSemicolon` calls)
  - Add error: "Expected semicolon after statement in block"
  - **Keep record literal parsing unchanged** - commas and newlines still work

**3.4 Update Block vs Record Disambiguation**:
- File: `packages/core/src/parser/parse-expressions.ts` (lines 816-886)
- Update `parseBraceExpression()` logic:
  - Simplify disambiguation: semicolon presence now clearly indicates block
  - Logic: `{ identifier; }` → block (has semicolon)
  - Logic: `{ identifier }` → record (no semicolon)
  - Logic: `{ identifier: value }` → record (has colon)
- May be able to simplify look-ahead logic

**3.5 Update External Block Parsing**:
- File: `packages/core/src/parser/parse-declarations.ts` (lines 471-508)
- Update `parseExternalBlock()` and related functions:
  - Require `SEMICOLON` tokens after each external declaration item
  - Remove newline-based separation logic
  - Add error: "Expected semicolon after external declaration"
- Handle both single externals and external blocks

**3.6 Verify Let Expression Parsing**:
- File: `packages/core/src/parser/parse-expressions.ts`
- Verify `parseLetExpr()` in blocks requires trailing semicolon
- Should already be handled by general block statement logic (3.3)
- Add explicit test case if needed

**3.7 Preserve Lambda Newline Handling**:
- File: `packages/core/src/parser/parser-helpers.ts` (line 45)
- **KEEP** the special case allowing newlines before `FAT_ARROW`
- This is an intentional exception to semicolon-required rule
- Ensure `(x, y)\n=> body` still works correctly
- Ensure single-param form `x\n=> body` still works

**3.8 Review Parser State Management**:
- File: `packages/core/src/parser/parser-base.ts`
- Review `inRecordContext` flag (line 30):
  - Still needed to distinguish records from blocks
  - May be able to simplify logic with explicit semicolons
- Review NEWLINE token handling:
  - May be able to ignore NEWLINE tokens in more contexts
  - Except for lambda special case
  - Records still use newlines as separators

**3.9 Update All Parser Error Messages**:
- Search all parser files for error messages mentioning:
  - "semicolon" or ";"
  - "ASI"
  - "newline" (in context of statement separation)
- Update to reflect new required-semicolon behavior
- Make error messages helpful:
  - Suggest adding semicolon
  - Show where semicolon is expected
  - Distinguish between different contexts

**Exit Criteria**:
- ASI logic completely removed or disabled
- Parser requires explicit semicolons in appropriate contexts
- Lambda newline exception preserved
- Record parsing unchanged
- Error messages updated and helpful

**Commit Point**: "refactor(parser): remove ASI and require explicit semicolons"

---

### Phase 4: Update Tests

**Objective**: Update test suite to verify new semicolon requirements

**Actions**:

**4.1 Remove ASI Test File**:
- Delete: `packages/core/src/parser/asi.test.ts`
- This 360-line file is no longer relevant
- All ASI behavior is being removed

**4.2 Create Comprehensive Semicolon-Required Test File**:
- Create: `packages/core/src/parser/semicolon-required.test.ts`

**Test categories**:

1. **Missing semicolons produce errors**:
   - Missing after top-level `let` declaration
   - Missing after top-level `type` declaration
   - Missing after top-level `external` declaration
   - Missing after top-level `import` declaration
   - Missing after block statements
   - Missing trailing semicolon in block

2. **Error messages are helpful**:
   - Error includes "Expected semicolon"
   - Error shows location
   - Error suggests fix

3. **Records still work without semicolons**:
   - `{ x: 1, y: 2 }` works
   - `{ x: 1\ny: 2 }` works (newline separator)
   - `{ x: 1, y: 2, }` works (trailing comma)

4. **Lambda newline exception works**:
   - `(x, y)\n=> body` works
   - `x\n=> body` works
   - Multi-line parameter lists work

5. **Edge cases**:
   - Empty blocks: `{}` (valid or requires `{;}`?)
   - Single statement blocks: `{ x; }`
   - Nested blocks with semicolons
   - Comments after semicolons: `let x = 1; // comment`
   - EOF handling: last declaration doesn't need semicolon

6. **External block semicolons**:
   - External block items require semicolons
   - Error when missing

**4.3 Update Expression Tests**:
- Review and update:
  - `packages/core/src/parser/parse-expressions.test.ts`
  - `packages/core/src/parser/block-expressions.test.ts` (if exists)
  - Any other expression-related tests
- Verify they pass with updated syntax
- Add new test cases if gaps found

**4.4 Update Declaration Tests**:
- Review and update:
  - `packages/core/src/parser/parse-declarations.test.ts`
  - `packages/core/src/parser/external-declarations.test.ts` (if exists)
  - Any other declaration-related tests
- Verify they pass with updated syntax

**4.5 Update Integration Tests**:
- Review any end-to-end parser tests
- Update syntax to include required semicolons
- Test full programs compile correctly

**4.6 Update While Loop Tests**:
- File: `packages/core/src/parser/while-loops.test.ts`
- Ensure while loop body blocks require proper semicolons
- Test nested blocks in while loops

**Exit Criteria**:
- All parser tests pass
- Comprehensive test coverage of new semicolon requirements
- Error cases properly tested
- Edge cases covered

**Commit Point**: "test: update tests for required semicolons"

---

### Phase 5: Verification and Validation

**Objective**: Comprehensive verification that change is complete and correct

**Actions**:

**5.1 Run Quality Checks**:
```bash
npm run check      # Type checking - must pass
npm run lint       # Linting - must pass
npm test           # All tests - must pass
npm run format     # Format code
```

Or run all at once:
```bash
npm run verify
```

All checks must pass before proceeding.

**5.2 Verify No ASI References Remain**:

Search entire codebase for:
- "ASI" (case-insensitive)
- "automatic semicolon"
- "semicolon insertion"
- "newline" (in context of statement separation)
- "automatic" (might catch variations)

Update or remove any remaining references:
- Code comments
- Documentation
- Error messages
- Variable names
- Test names

**5.3 Review Later Compiler Stages**:

Verify no assumptions about ASI in:
- **Desugarer**: `packages/core/src/desugarer/`
  - Should operate on AST (no semicolon concerns)
  - Verify tests pass

- **Type checker**: `packages/core/src/typechecker/`
  - Should operate on AST (no semicolon concerns)
  - Verify no example code assumes ASI

- **Code generator**: `packages/core/src/codegen/`
  - Should operate on AST (no semicolon concerns)
  - JavaScript output may add semicolons

- **Optimizer** (if exists): Same as above

Check that error messages don't mention ASI.

**5.4 Manual Testing with Examples**:

1. **Compile all example files**:
   - `examples/external-blocks.vf`
   - `examples/js-interop-overloading.vf`
   - Any other `.vf` files

2. **Test error messages for common mistakes**:
   - Create test file missing semicolons
   - Verify error messages are helpful
   - Test: forgot semicolon after declaration
   - Test: forgot semicolon in block
   - Test: forgot trailing semicolon

3. **Test multi-line expression strategies**:
   - Long expression with operators (should work)
   - Long expression with parentheses (should work)
   - Long expression without continuation (should fail helpfully)

**5.5 Test Edge Cases**:

Manually verify these scenarios:
- Empty blocks: `{}`
- Trailing semicolons: `{ x; y; }`
- Single statement: `{ x; }`
- Records with commas: `{ x: 1, y: 2 }`
- Records with newlines: `{ x: 1\ny: 2 }`
- Records with trailing comma: `{ x: 1, y: 2, }`
- Lambda newlines: `(x, y)\n=> x + y`
- Single-param lambda: `x\n=> x + 1`
- Comments: `let x = 1; // comment`
- Multiple declarations: `let x = 1; let y = 2;`
- EOF handling: last declaration without semicolon

**Exit Criteria**:
- All quality checks pass
- No ASI references remain
- All examples compile correctly
- Error messages are helpful
- Edge cases work correctly

**Commit Point**: "chore: verify semicolon changes complete"

---

### Phase 6: Update Project Documentation

**Objective**: Update project-level documentation to reflect the change

**Actions**:

**6.1 Update CLAUDE.md**:
- File: `/Users/michael/Projects/vibefun/CLAUDE.md`
- Remove any ASI references
- Add to "Technical Decisions" section:
  - Document semicolon-required design decision
  - Explain rationale (clarity, consistency, easier parsing)
  - Document record literal exception
  - Document lambda newline exception
- Update any syntax examples

**6.2 Update README Files**:
- Search for README files mentioning syntax:
  - Root `README.md`
  - Package READMEs in workspaces
  - Any folder READMEs
- Update with new semicolon requirements
- Update any code examples

**6.3 Document Breaking Changes**:
- Create or update changelog/breaking changes document
- List what changed:
  - Semicolons now required (was optional via ASI)
  - Where semicolons are required
  - What remains unchanged (records, lambda newlines)
- Provide migration guidance:
  - How to update existing code
  - Common patterns
  - Tools (none, manual update required)

**6.4 Update Coding Standards**:
- File: `.claude/CODING_STANDARDS.md`
- If mentions ASI or semicolons, update to reflect new requirements
- Update any vibefun code examples

**6.5 Update Other Documentation**:
- Check for any CI/CD documentation
- Check for any contributor guides
- Update package.json descriptions if relevant

**Exit Criteria**:
- CLAUDE.md reflects new design
- All README files updated
- Breaking changes documented
- Migration guidance provided

**Commit Point**: "docs: update project documentation for required semicolons"

---

### Phase 7: Final Commit and Verification

**Objective**: Create final commit and verify completeness

**Actions**:

**7.1 Document Modified Files**:

Create a checklist of all modified file categories:
- [ ] Language specification files (Phase 1)
- [ ] Parser test files (Phase 2.1)
- [ ] Example `.vf` files (Phase 2.2)
- [ ] Spec code examples (Phase 2.3)
- [ ] Code comments (Phase 2.4)
- [ ] Desugarer tests (Phase 2.5)
- [ ] Parser implementation (Phase 3)
- [ ] Test suite (Phase 4)
- [ ] Project documentation (Phase 6)

**7.2 Git Commit Strategy**:

Commits should be made at these points:
1. After Phase 1: "docs: update language spec to require semicolons"
2. After Phase 2: "test: add semicolons to all test code and examples"
3. After Phase 3: "refactor(parser): remove ASI and require explicit semicolons"
4. After Phase 4: "test: update tests for required semicolons"
5. After Phase 5: "chore: verify semicolon changes complete"
6. After Phase 6: "docs: update project documentation for required semicolons"

Each commit should be a logical, reviewable unit.

**7.3 Final Verification Checklist**:

- [ ] All tests pass (`npm test`)
- [ ] Type checking passes (`npm run check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Code formatted (`npm run format`)
- [ ] All examples compile successfully
- [ ] No "ASI" references remain in codebase
- [ ] All error messages updated and helpful
- [ ] Documentation is consistent
- [ ] CLAUDE.md updated
- [ ] Breaking changes documented
- [ ] All planned commits made

**7.4 Compare Before/After**:
- Compare test statistics (should be similar count)
- Verify no unexpected test failures
- Check that error messages are improved
- Confirm parser code is simpler/cleaner

**Exit Criteria**:
- All verification items checked
- All commits made
- Working directory clean
- Ready for PR or merge

**Final Commit**: "feat!: remove ASI and require explicit semicolons"

---

## Risk Mitigation

### Identified Risks

1. **Missing vibefun code in obscure test files**
   - Mitigation: Comprehensive grep searches for `.vf` code patterns
   - Mitigation: Run tests frequently to catch missed locations

2. **Unexpected parser interactions**
   - Mitigation: Thorough testing in Phase 4-5
   - Mitigation: Manual testing of edge cases
   - Mitigation: Review all parser state management

3. **Breaking existing workflows**
   - Mitigation: Document breaking changes clearly
   - Mitigation: Update all examples and documentation
   - Mitigation: Provide migration guidance

4. **Incomplete error messages**
   - Mitigation: Phase 3.9 specifically addresses error messages
   - Mitigation: Phase 5.4 manually tests error messages
   - Mitigation: Ensure errors are helpful and actionable

### Rollback Strategy

If critical issues are discovered:
1. Identify the problematic commit using git log
2. Use `git revert <commit>` to undo specific changes
3. Or use `git reset --hard <commit>` to return to earlier state
4. Re-evaluate approach and address issues
5. Resume from appropriate phase

### Success Criteria

The implementation is successful when:
- All quality checks pass
- All tests pass
- All examples compile
- No ASI references remain
- Error messages are helpful
- Documentation is complete and accurate
- Breaking changes are clearly documented
- Code is cleaner and more maintainable

## Timeline Estimate

- Phase 0: 15 minutes
- Phase 1: 2-3 hours (spec updates)
- Phase 2: 4-6 hours (updating all code)
- Phase 3: 3-4 hours (parser implementation)
- Phase 4: 2-3 hours (test updates)
- Phase 5: 2-3 hours (verification)
- Phase 6: 1-2 hours (documentation)
- Phase 7: 30 minutes (final verification)

**Total**: 15-22 hours of focused work

This can be spread across multiple work sessions, with natural break points after each phase commit.
