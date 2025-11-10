# Parser Updates Task Checklist

**Last Updated**: 2025-11-09
**Status**: Not Started

---

## Phase 1: AST Type Updates ✅ 0/4

- [ ] 1.1 Add Tuple and While to `packages/core/src/types/ast.ts` Expr union
- [ ] 1.2 Add TuplePattern to `packages/core/src/types/ast.ts` Pattern union
- [ ] 1.3 Remove ListCons from Expr union, ensure BinaryOp includes "Cons"
- [ ] 1.4 Add CoreTuple, CoreWhile, CoreTuplePattern to `packages/core/src/types/core-ast.ts`
- [ ] **Test**: Run `npm run check` - all type checks pass

---

## Phase 2: Fix Precedence Chain ✅ 0/6

- [ ] 2.1 Move parseRefAssign() to come BEFORE parseTypeAnnotation()
- [ ] 2.2 Move parseComposition() to after parsePipe() (level 4)
- [ ] 2.3 Move parseCons() to after parseComparison() (level 11)
- [ ] 2.4 Split parseAdditive() into parseConcat() (level 12) and parseAdditive() (level 13)
- [ ] 2.5 Update all precedence method calls to match new order
- [ ] 2.6 Update precedence comments to reflect correct levels
- [ ] **Test**: Run precedence tests - all pass

---

## Phase 3: Implement Missing Expressions ✅ 0/5

- [ ] 3.1 Add While loop parsing to parsePrimary()
- [ ] 3.2 Add Tuple expression parsing to parseLambdaOrParen()
- [ ] 3.3 Add record field shorthand to parseRecordExpr() (normal + spread cases)
- [ ] 3.4 Make If else branch optional (insert Unit if missing)
- [ ] 3.5 Add operator section rejection with helpful error
- [ ] **Test**: Run expression tests - all new features work

---

## Phase 4: Fix Match Expressions ✅ 0/3

- [ ] 4.1 Restructure parseMatchExpr() to require leading pipe for ALL cases
- [ ] 4.2 Add empty match validation (require at least one case)
- [ ] 4.3 Add lambda-in-match test cases
- [ ] **Test**: Run match tests - leading pipe required, lambdas work

---

## Phase 5: Implement ASI ✅ 0/4

- [ ] 5.1 Add shouldInsertSemicolon() helper method
- [ ] 5.2 Add isExpressionContinuation() helper
- [ ] 5.3 Add isLineContinuation() helper
- [ ] 5.4 Add isStatementStart() helper
- [ ] 5.5 Integrate ASI in parseModule() after declarations
- [ ] 5.6 Integrate ASI in parseBlockExpr() between expressions
- [ ] **Test**: Run ASI tests - multi-line expressions work correctly

---

## Phase 6: Tuple Pattern Parsing ✅ 0/1

- [ ] 6.1 Add TuplePattern parsing to parsePrimaryPattern()
- [ ] **Test**: Run pattern tests - tuple patterns work

---

## Phase 7: Fix Minus Disambiguation ✅ 0/1

- [ ] 7.1 Update parseUnary() to check context before treating minus as unary
- [ ] **Test**: Run minus disambiguation tests - `f() - 1` works correctly

---

## Phase 8: Error Handling ✅ 0/4

- [ ] 8.1 Add errors array and maxErrors to Parser class
- [ ] 8.2 Update error() method to collect multiple errors
- [ ] 8.3 Remove @ts-expect-error from synchronize()
- [ ] 8.4 Add try-catch + synchronize() in declaration parsing
- [ ] 8.5 Add all required error messages (tuple arity, match pipe, operator sections)
- [ ] **Test**: Run error tests - proper messages, multiple errors collected

---

## Phase 9: Documentation ✅ 0/2

- [ ] 9.1 Fix all precedence level comments throughout parser.ts
- [ ] 9.2 Update spec references from vibefun-spec.md to parser-requirements.md
- [ ] **Test**: Documentation review complete

---

## Phase 10: Update Compiler Pipeline ✅ 0/12

### Desugarer (0/7)
- [ ] 10.1 Remove ListCons case from desugarer.ts (line 296-302)
- [ ] 10.2 Verify desugarBinOp handles Cons operator
- [ ] 10.3 Add If optional else handling (insert Unit if missing)
- [ ] 10.4 Add Tuple case → CoreTuple
- [ ] 10.5 Add While case → recursive let binding desugaring
- [ ] 10.6 Add TuplePattern case → CoreTuplePattern
- [ ] 10.7 Update tests: 6 ListCons references in lists.test.ts

### Type Checker (0/5)
- [ ] 10.8 Add inferTuple() to infer.ts
- [ ] 10.9 Add inferWhile() to infer.ts (condition: Bool, result: Unit)
- [ ] 10.10 Add checkTuplePattern() to patterns.ts
- [ ] 10.11 Update exhaustiveness checking for tuple types
- [ ] 10.12 Add type checker tests for Tuple and While

### Optimizer (0/4)
- [ ] 10.13 Add CoreTuple, CoreWhile to all optimizer pass switches
- [ ] 10.14 Add CoreTuplePattern to pattern handling
- [ ] 10.15 Update ast-transform.ts for new nodes
- [ ] 10.16 Update ast-analysis.ts and substitution.ts

- [ ] **Test**: Run `npm run verify` - all pipeline tests pass

---

## Phase 11: Comprehensive Testing ✅ 0/8

### New Test Files (0/4)
- [ ] 11.1 Create while-loops.test.ts
- [ ] 11.2 Create tuples.test.ts
- [ ] 11.3 Create asi.test.ts
- [ ] 11.4 Create operator-sections.test.ts

### Update Existing Tests (0/4)
- [ ] 11.5 Update expressions.test.ts (record shorthand, if without else)
- [ ] 11.6 Update parser-errors.test.ts (all new error messages)
- [ ] 11.7 Update patterns.test.ts (tuple patterns)
- [ ] 11.8 Update declarations.test.ts (ASI in declarations)
- [ ] 11.9 Update parser-integration.test.ts (precedence tests)

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

**Phases Completed**: 0/11 (0%)
**Tasks Completed**: 0/61 (0%)

**Current Phase**: Phase 1 - AST Type Updates
**Current Task**: Not started

---

## Notes

- Test after EACH phase before moving to next
- Run `npm run verify` after Phase 10 to ensure no pipeline breakage
- Keep test coverage above 90%
- Document any deviations from plan
