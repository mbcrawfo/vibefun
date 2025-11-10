# Parser Updates Task Checklist

**Last Updated**: 2025-11-09
**Status**: Not Started (Plan Corrected v2.1)

---

## Phase 0: Lambda Precedence ✅ 0/2

- [ ] 0.1 Add parseLambda() method to handle single-param lambdas (x => expr)
- [ ] 0.2 Update parseExpression() to call parseLambda() as entry point
- [ ] **Test**: Lambda precedence tests - `x => y => z` parses as `x => (y => z)`

---

## Phase 1: AST Type Updates ✅ 0/4

- [ ] 1.1 Add Tuple and While to `packages/core/src/types/ast.ts` Expr union
- [ ] 1.2 Add TuplePattern to `packages/core/src/types/ast.ts` Pattern union
- [ ] 1.3 Remove ListCons from Expr union, ensure BinaryOp includes "Cons"
- [ ] 1.4 Add CoreTuple, CoreWhile, CoreTuplePattern to `packages/core/src/types/core-ast.ts`
- [ ] **Test**: Run `npm run check` - all type checks pass

---

## Phase 2: Fix Precedence Chain ✅ 0/7

- [ ] 2.1 Split parseAdditive() into parseConcat() (level 12, &) and parseAdditive() (level 13, +/-)
- [ ] 2.2 Move parseComposition() from level 10 position to level 4 (after parsePipe)
- [ ] 2.3 Reorder RefAssign and Cons in precedence chain
- [ ] 2.4 Update parseLambda (0) to call parseRefAssign (1)
- [ ] 2.5 Update parseRefAssign (1) to call parseTypeAnnotation (2)
- [ ] 2.6 Update all 16 precedence methods to call next level in correct order
- [ ] 2.7 Update all method comments with correct precedence levels
- [ ] **Test**: Comprehensive precedence tests - verify `x => y := z : Type |> f >> g || a && b == c < d :: e & f + g * h.i()`

---

## Phase 3: Implement Missing Expressions ✅ 0/6

- [ ] 3.1 Add While loop parsing to parsePrimary()
- [ ] 3.2 Add Tuple expression parsing to parseLambdaOrParen() with arity validation
- [ ] 3.3a Add record field shorthand to parseRecordExpr() - normal construction (line 866-877)
- [ ] 3.3b Add record field shorthand to parseRecordExpr() - update spread case (line 837-850)
- [ ] 3.4 Make If else branch optional (insert Unit if missing)
- [ ] 3.5 Add operator section rejection with helpful error
- [ ] **Test**: Run expression tests - all new features work

---

## Phase 4: Fix Match Expressions ✅ 0/4

- [ ] 4.1 Validate empty match BEFORE loop (check for RBRACE after skipping newlines)
- [ ] 4.2 Restructure parseMatchExpr() loop to check RBRACE BEFORE expecting PIPE
- [ ] 4.3 Ensure all cases require leading pipe (including first case)
- [ ] 4.4 Add lambda-in-match test cases
- [ ] **Test**: Run match tests - leading pipe required, lambdas work, no RBRACE errors

---

## Phase 5: Implement ASI ✅ 0/6

- [ ] 5.1 Add shouldInsertSemicolon() helper method
- [ ] 5.2 Add isExpressionContinuation() helper
- [ ] 5.3 Add isLineContinuation() helper
- [ ] 5.4 Add isStatementStart() helper
- [ ] 5.5 Integrate ASI in parseModule() with explicit pattern: check("SEMICOLON") || shouldInsertSemicolon()
- [ ] 5.6 Integrate ASI in parseBlockExpr() with explicit pattern: check("SEMICOLON") || shouldInsertSemicolon()
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

**Phases Completed**: 0/12 (0%)
**Tasks Completed**: 0/67 (0%)

**Current Phase**: Phase 0 - Lambda Precedence (then Phase 1 - AST Updates)
**Current Task**: Not started

**Note**: Plan corrected to v2.1 with fixes for precedence chain, lambda integration, record shorthand, match loops, ASI integration, and While desugaring.

---

## Notes

- Test after EACH phase before moving to next
- Run `npm run verify` after Phase 10 to ensure no pipeline breakage
- Keep test coverage above 90%
- Document any deviations from plan
