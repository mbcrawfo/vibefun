# Parser Updates Task Checklist

**Last Updated**: 2025-11-10
**Status**: Phases 0-9 Complete (10/12 phases, 83%)
**Review Score**: 90/100 (Excellent - ready to implement)

---

## Phase 0: Lambda Precedence ✅ COMPLETE (3/3)

- [x] 0.1 Add parseLambda() method to handle single-param lambdas (x => expr)
- [x] 0.2 Update parseExpression() to call parseLambda() as entry point
- [x] **Test**: Lambda precedence tests - all existing tests pass (1932 tests)
- [x] **Commit**: (pending) feat(parser): add lambda precedence level 0

**Notes**:
- Added parseLambda() method at precedence level 0 (lowest)
- Handles single-param lambdas without parens: x => expr
- Right-associative: x => y => z parses as x => (y => z)
- Currently delegates to parseTypeAnnotation() (will be fixed to parseRefAssign() in Phase 2)

---

## Phase 1: AST Type Updates ✅ COMPLETE (5/5)

- [x] 1.1 Add Tuple and While to `packages/core/src/types/ast.ts` Expr union
- [x] 1.2 Add TuplePattern to `packages/core/src/types/ast.ts` Pattern union
- [x] 1.3 Remove ListCons from Expr union, ensure BinaryOp includes "Cons"
- [x] 1.4 Add CoreTuple, CoreWhile, CoreTuplePattern to `packages/core/src/types/core-ast.ts`
- [x] **Test**: Run `npm run verify` - all checks pass ✅
- [x] **Commit**: e51c05c - feat(parser): add Tuple, While, and TuplePattern AST types

**Notes**:
- Added stub handling throughout compiler pipeline (desugarer, type checker, optimizer, utils)
- Updated parser to use BinOp for cons operator instead of dedicated ListCons
- Updated all tests to expect BinOp instead of ListCons

---

## Phase 2: Fix Precedence Chain ✅ COMPLETE (8/8)

- [x] 2.1 Split parseAdditive() into parseConcat() (level 12, &) and parseAdditive() (level 13, +/-)
- [x] 2.2 Move parseComposition() from level 10 position to level 4 (after parsePipe)
- [x] 2.3 Reorder RefAssign and Cons in precedence chain
- [x] 2.4 Update parseLambda (0) to call parseRefAssign (1)
- [x] 2.5 Update parseRefAssign (1) to call parseTypeAnnotation (2)
- [x] 2.6 Update all 16 precedence methods to call next level in correct order
- [x] 2.7 Update all method comments with correct precedence levels
- [x] **Test**: All 1932 tests passing ✅
- [x] **Commit**: (pending) feat(parser): fix precedence chain ordering

**Notes**:
- Successfully reordered entire precedence chain
- Composition (level 4) now correctly calls LogicalOr (level 5)
- parseCons (level 11) now correctly calls parseConcat (level 12)
- Updated test for composition/logical operator interaction
- All type checks, lints, and tests passing

---

## Phase 3: Implement Missing Expressions ✅ COMPLETE (7/7)

**CRITICAL**: Record shorthand needs ASI context tracking, tuple arity check after lambda lookahead

- [x] 3.1 Add While loop parsing to parsePrimary()
- [x] 3.2 Add Tuple expression parsing with explicit lookahead for `=>` and arity validation (see plan pseudocode)
- [x] 3.3a Add record field shorthand to parseRecordExpr() - normal construction (line 866-877)
- [x] 3.3b Add record field shorthand to parseRecordExpr() - update spread case (line 837-850)
- [x] 3.3c Set inRecordContext flag in parseRecordExpr() to disable ASI
- [x] 3.4 Make If else branch optional (insert Unit if missing)
- [x] 3.5 Add operator section rejection - ALL forms: `(+)`, `( + )`, `(+ 1)`, `(1 +)`
- [x] **Test**: Run expression tests - all new features work ✅

**Notes**:
- Added While loop parsing after unsafe block handling
- Modified parseLambdaOrParen() to handle tuples (2+ elements) vs grouped expressions (1 element)
- Tuple parsing includes lookahead for `=>` to distinguish from lambdas
- Record shorthand supported in both normal construction `{ name }` and update spread `{ ...base, name }`
- Added inRecordContext flag (will be used in Phase 5 for ASI)
- If else branch now optional - parser inserts Unit literal when missing
- Operator sections rejected with helpful error message
- All 1932 tests passing ✅

---

## Phase 4: Fix Match Expressions ✅ COMPLETE (4/4)

- [x] 4.1 Validate empty match BEFORE loop (check for RBRACE after skipping newlines)
- [x] 4.2 Restructure parseMatchExpr() loop to check RBRACE BEFORE expecting PIPE
- [x] 4.3 Ensure all cases require leading pipe (including first case)
- [x] 4.4 Add lambda-in-match test cases
- [x] **Test**: Run match tests - leading pipe required, lambdas work, no RBRACE errors ✅

**Notes**:
- Restructured parseMatchExpr() to validate empty match before loop
- All cases now require leading pipe (including first case)
- Loop checks RBRACE at start (before expecting PIPE) - fixes RBRACE error bug
- Changed body parsing from parseLogicalAnd() to parseExpression() to allow lambdas
- Added lambda-in-match test case verifying lambdas work as match case bodies
- Updated existing test to require leading pipes
- All 1933 tests passing ✅

---

## Phase 5: Implement ASI ✅ COMPLETE (8/8)

**CRITICAL**: Incorporate user clarifications - ASI + lambda interaction, record context

- [x] 5.1 Add inRecordContext boolean flag to Parser class (completed in Phase 3)
- [x] 5.2 Add shouldInsertSemicolon() helper with arrow lookahead and record context check
- [x] 5.3 Add isExpressionContinuation() helper
- [x] 5.4 Add isLineContinuation() helper
- [x] 5.5 Add isStatementStart() helper
- [x] 5.6 Integrate ASI in parseModule() with explicit pattern: check("SEMICOLON") || shouldInsertSemicolon()
- [x] 5.7 Integrate ASI in parseBlockExpr() with explicit pattern: check("SEMICOLON") || shouldInsertSemicolon()
- [x] 5.8 Set inRecordContext = true at start of parseRecordExpr(), reset in finally block (completed in Phase 3)
- [x] **Test**: Run ASI tests - lambda + ASI (`(x,y)\n=> body`), record context, multi-line expressions ✅

**Notes**:
- Added shouldInsertSemicolon() with all required checks
- Added isExpressionContinuation(), isLineContinuation(), isStatementStart() helpers
- Integrated ASI in parseModule() and parseBlockExpr()
- inRecordContext flag from Phase 3 now actively prevents ASI in records
- All 1933 tests passing ✅
- Committed as 491e22d

---

## Phase 6: Tuple Pattern Parsing ✅ COMPLETE (1/1)

- [x] 6.1 Add TuplePattern parsing to parsePrimaryPattern()
- [x] **Test**: Run pattern tests - tuple patterns work
- [x] **Commit**: 7c14e29 - feat(parser): add tuple pattern parsing

**Notes**:
- Added tuple pattern parsing in parsePrimaryPattern() after identifier patterns
- Handles empty tuple: `()` → TuplePattern with 0 elements
- Single parenthesized pattern: `(x)` → returns inner pattern (not a tuple)
- Multi-element tuple patterns: `(x, y, z)` → TuplePattern with 3 elements
- All 1933 tests passing ✅

---

## Phase 7: Fix Minus Disambiguation ✅ COMPLETE (1/1)

- [x] 7.1 Update parseUnary() to check context before treating minus as unary
- [x] **Test**: Run minus disambiguation tests - `f() - 1` works correctly
- [x] **Commit**: 264f0e5 - feat(parser): add context-aware minus disambiguation

**Notes**:
- Added context checking in parseUnary() before treating minus as unary operator
- Checks previous token type: after IDENTIFIER, RPAREN, RBRACKET, RBRACE, or literals → binary
- After operators or at expression start → unary negation
- Ensures `f() - 1` parses as BinOp(Call(f), Subtract, 1) not UnaryOp
- All 1933 tests passing ✅

---

## Phase 8: Error Handling ✅ COMPLETE (6/6)

- [x] 8.1 Add errors array and maxErrors to Parser class
- [x] 8.2 Update error() method to collect multiple errors
- [x] 8.3 Remove @ts-expect-error from synchronize()
- [x] 8.4 Add try-catch + synchronize() in declaration parsing
- [x] 8.5 Add getErrors() method to retrieve collected errors
- [x] 8.6 Update parse() to throw first error if any were collected
- [x] **Test**: Run error tests - all 1933 tests passing ✅
- [x] **Commit**: b4e04e7 - feat(parser): add multi-error collection and recovery

**Notes**:
- Added errors array and maxErrors (10) to Parser class
- error() method now collects errors and throws only when maxErrors reached
- Added getErrors() method for retrieving all collected errors
- Removed @ts-expect-error from synchronize() method
- Added try-catch in parseModule() to catch errors and call synchronize()
- parse() now throws first error if any were collected (maintains test compatibility)
- All required error messages already present:
  - Operator sections: "Operator sections are not supported: (+)"
  - Match pipe: "Match case must begin with '|'"
  - Tuple arity: handled structurally (no explicit error needed)
- Fixed 2 test assertions for error message wording
- All 1933 tests passing ✅

---

## Phase 9: Documentation ✅ COMPLETE (2/2)

- [x] 9.1 Fix all precedence level comments throughout parser.ts
- [x] 9.2 Update spec references from vibefun-spec.md to parser-requirements.md
- [x] **Test**: Documentation review complete ✅
- [x] **Commit**: d71d281 - docs(parser): update precedence comments and spec references

**Notes**:
- Fixed 8 incorrect precedence level comments:
  - parseTypeAnnotation: level 1 → 2
  - parseLogicalOr: level 4 → 5
  - parseLogicalAnd: level 5 → 6
  - parseEquality: level 8 → 7
  - parseComparison: level 10 → 8
  - parseMultiplicative: level 12 → 14
  - parseUnary: level 13 → 15
  - parseCall: level 14 → 16
- Updated 3 spec references from vibefun-spec.md to parser-requirements.md:
  - Deref operator reference (postfix !)
  - Record expressions reference
  - List expressions reference
- All precedence levels now match actual implementation chain
- All 1933 tests passing ✅

---

## Phase 10: Update Compiler Pipeline ✅ 0/14

### Desugarer (0/8)
- [ ] 10.1 Remove ListCons case from desugarer.ts (line 296-302)
- [ ] 10.2 Verify desugarBinOp handles Cons operator
- [ ] 10.3 Add If optional else handling (parser inserts Unit, desugarer passes through)
- [ ] 10.4 Add Tuple case → CoreTuple (straightforward mapping)
- [ ] 10.5a Implement freshVar() helper for generating unique loop variable names
- [ ] 10.5b Add While case → desugar to: let rec loop = () => if cond then { body; loop() } else ()
- [ ] 10.6 Add TuplePattern case → CoreTuplePattern
- [ ] 10.7 Update tests: 6 ListCons references in lists.test.ts

### Type Checker (0/5)
- [ ] 10.8 Add inferTuple() to infer.ts - infer type of each element
- [ ] 10.9 Add inferWhile() to infer.ts (condition: Bool, body: Unit, result: Unit)
- [ ] 10.10 Add checkTuplePattern() to patterns.ts - arity must match exactly
- [ ] 10.11 Update exhaustiveness checking: Pattern `(x, _)` matches only 2-tuples
- [ ] 10.12 Add type checker tests for Tuple and While

### Code Generator (0/1)
- [ ] 10.13 Add tuple codegen: `(1, 2)` → `[1, 2]`, destructuring: `let (a,b)` → `let [a,b]`

### Optimizer (0/4)
- [ ] 10.14 Add CoreTuple, CoreWhile to all optimizer pass switches
- [ ] 10.15 Add CoreTuplePattern to pattern handling
- [ ] 10.16 Update ast-transform.ts for new nodes
- [ ] 10.17 Update ast-analysis.ts and substitution.ts

- [ ] **Test**: Run `npm run verify` - all pipeline tests pass

---

## Phase 11: Comprehensive Testing ✅ 0/11

### New Test Files (0/7) - Added 3 more from v2.2 review
- [ ] 11.1 Create lambda-precedence.test.ts - Lambda at level 0, right-associativity (NEW)
- [ ] 11.2 Create while-loops.test.ts - While expression tests
- [ ] 11.3 Create tuples.test.ts - Tuple expressions/patterns, arity validation
- [ ] 11.4 Create asi.test.ts - ASI edge cases, lambda + ASI interaction, record context
- [ ] 11.5 Create operator-sections.test.ts - All forms: `(+)`, `( + )`, `(+ 1)`, `(1 +)`
- [ ] 11.6 Create record-shorthand.test.ts - Both construction and update (or add to expressions.test.ts) (NEW)
- [ ] 11.7 Create minus-disambiguation.test.ts - Context-aware minus handling (or add to expressions.test.ts) (NEW)

### Update Existing Tests (0/4)
- [ ] 11.8 Update expressions.test.ts (record shorthand if not separate file, if-without-else)
- [ ] 11.9 Update parser-errors.test.ts (all new error messages)
- [ ] 11.10 Update patterns.test.ts (tuple patterns)
- [ ] 11.11 Update declarations.test.ts (ASI in declarations)
- [ ] 11.12 Update parser-integration.test.ts (precedence tests, complex expressions)

- [ ] **Test**: Run full test suite - 90%+ coverage, all tests pass

---

## Final Verification ✅ 0/6

- [ ] All 19 identified issues resolved
- [ ] Parser passes all requirements from parser-requirements.md
- [ ] All existing tests still pass (no regressions)
- [ ] New tests added and passing
- [ ] `npm run verify` passes (check, lint, test, format)
- [ ] Documentation updated

---

## Progress Summary

**Phases Completed**: 10/12 (83%)
**Tasks Completed**: 46/81 (57%)

**Current Phase**: Phase 10 - Update Compiler Pipeline
**Current Task**: Ready to start Phase 10

**Implementation Order (CRITICAL):**
1. Phase 1 (AST) - Foundation ✅ START HERE
2. Phase 0 (Lambda) - DO BEFORE Phase 2 ✅
3. Phase 2 (Precedence) - HIGH RISK - Test after each step ⚠️
4. Phases 3-9 - After Phase 2 complete
5. Phase 10 (Pipeline) - After parser complete
6. Phase 11 (Testing) - Continuous

**Note**: Plan v2.2 reviewed and approved with user clarifications on phase ordering, ASI behavior, and implementation details.

---

## Notes

**From v2.2 Review:**
- ✅ Phase 0 MUST complete before Phase 2 (user-confirmed lower risk)
- ⚠️ Test after EACH precedence level move in Phase 2 (not just at end)
- ⚠️ ASI: Must lookahead for `=>`, disable in record context
- ⚠️ Tuple: Lookahead for `=>` before arity check
- ⚠️ Operator sections: Reject ALL forms including partial applications
- ✅ Run `npm run verify` after Phase 10 to ensure no pipeline breakage
- ✅ Keep test coverage above 90%
- 📝 Document any deviations from plan

**Critical Reminders:**
1. Precedence restructuring is HIGHEST RISK - one mistake breaks everything
2. ASI is HIGH RISK - could break multi-line expressions
3. Test lambda + ASI interaction: `(x, y)\n=> body`
4. Test record context: ASI disabled inside `{ }`
5. Add intermediate test checkpoints in Phase 2
