# Large File Breakup - Task Checklist

**Created:** 2025-11-23
**Last Updated:** 2025-11-23 23:07

## Overview

9 phases of file refactoring work. Each phase is independent and can be completed in any order.

---

## Phase 1: Lexer Core (lexer.ts)

**Status:** ✅ Done
**Files:** 1 → 7
**Complexity:** Medium

### Tasks

- [x] Create `packages/core/src/lexer/character-utils.ts` (54 lines)
  - Extract `isDigit()`, `isHexDigit()`, `isIdentifierStart()`, `isIdentifierContinue()`
- [x] Create `packages/core/src/lexer/identifier-parser.ts` (72 lines)
  - Extract `readIdentifier()` function
- [x] Create `packages/core/src/lexer/number-parser.ts` (244 lines)
  - Extract `readNumber()`, `readDecimalNumber()`, `readHexNumber()`, `readBinaryNumber()`
- [x] Create `packages/core/src/lexer/string-parser.ts` (242 lines)
  - Extract string and escape sequence parsing functions
- [x] Create `packages/core/src/lexer/operator-parser.ts` (178 lines)
  - Extract `readOperatorOrPunctuation()` function
- [x] Create `packages/core/src/lexer/comment-handler.ts` (107 lines)
  - Extract `skipWhitespaceAndComments()` and related functions
- [x] Update `packages/core/src/lexer/lexer.ts` to use extracted modules (219 lines)
  - Import parser functions
  - Delegate to parser functions in `tokenize()` method
  - Make necessary helper methods public
- [x] Update `packages/core/src/lexer/index.ts` to export new modules
- [x] Run `npm run verify` to ensure all tests pass
- [x] Verify lexer.ts is now under 1,000 lines

---

## Phase 2: Lexer Integration Tests (lexer-integration.test.ts)

**Status:** ✅ Done
**Files:** 1 → 4
**Complexity:** Low

### Tasks

- [x] Create `lexer-integration-syntax.test.ts` (320 lines)
  - Move function definitions, type definitions, pattern matching, pipes, mixed content, operators suites
- [x] Create `lexer-integration-features.test.ts` (401 lines)
  - Move complete programs, location tracking, edge cases, real-world examples, external blocks, mutable references
- [x] Create `lexer-integration-advanced.test.ts` (514 lines)
  - Move complete module programs, complex pattern matching, multi-feature combinations
- [x] Create `lexer-integration-realistic.test.ts` (250 lines)
  - Move large realistic programs suite
- [x] Delete original `lexer-integration.test.ts`
- [x] Run `npm run verify` to ensure all tests pass
- [x] Verify all new files are under 1,000 lines (target <500)

---

## Phase 3: Operators Tests (operators.test.ts)

**Status:** ✅ Done
**Files:** 1 → 4
**Complexity:** Low

### Tasks

- [x] Create `operators-punctuation.test.ts` (381 lines)
  - Move single-character punctuation test suite
- [x] Create `operators-multi-char.test.ts` (372 lines)
  - Move multi-character operators test suite
- [x] Create `operators-edge-cases.test.ts` (361 lines)
  - Move operator edge cases test suite
- [x] Create `operators-invalid.test.ts` (48 lines)
  - Move invalid characters test suite
- [x] Delete original `operators.test.ts`
- [x] Run `npm run verify` to ensure all tests pass
- [x] Verify all new files are under 1,000 lines

---

## Phase 4: Expression Tests (expressions.test.ts)

**Status:** ✅ Done
**Files:** 1 → 8 (helper + 7 test files)
**Complexity:** Medium

### Tasks

- [x] Create `packages/core/src/parser/expression-test-helpers.ts` (16 lines)
  - Extract shared `parseExpression()` helper function
- [x] Create `expression-literals.test.ts` (283 lines)
  - Move literals, variables, parenthesized expressions, error cases
- [x] Create `expression-operators.test.ts` (488 lines)
  - Move binary operators suite (all 7 subsections)
- [x] Create `expression-unary-postfix.test.ts` (310 lines)
  - Move unary operators and postfix dereference suites
- [x] Create `expression-functions.test.ts` (441 lines)
  - Move function calls, lambdas, type annotations
- [x] Create `expression-control-flow.test.ts` (582 lines)
  - Move block expressions, unsafe blocks, if expressions and match expressions suites
- [x] Create `expression-lists.test.ts` (283 lines)
  - Move lists and list spreads suites
- [x] Create `expression-records.test.ts` (685 lines)
  - Move all record-related test suites
- [x] Delete original `expressions.test.ts`
- [x] Run `npm run verify` to ensure all tests pass
- [x] Verify all new files are under 1,000 lines

---

## Phase 5: Parser Integration Tests (parser-integration.test.ts)

**Status:** ✅ Done
**Files:** 1 → 4 (helper + 3 test files)
**Complexity:** Low

### Tasks

- [x] Create `packages/core/src/parser/parser-test-helpers.ts` (17 lines)
  - Extract shared `parseModule()` helper function
- [x] Create `parser-integration-basic.test.ts` (388 lines)
  - Move simple functions, recursive functions, types, imports, externals, exports, real-world examples
- [x] Create `parser-integration-patterns.test.ts` (131 lines)
  - Move pattern matching and complex expressions suites
- [x] Create `parser-integration-phase4.test.ts` (541 lines)
  - Move all Phase 4 new features integration tests
- [x] Delete original `parser-integration.test.ts`
- [x] Run `npm run verify` to ensure all tests pass
- [x] Verify all new files are under 1,000 lines

---

## Phase 6: Expression Parser (parse-expressions.ts)

**Status:** ✅ Done
**Files:** 1 → 5
**Complexity:** High

### Tasks

- [x] Create `parse-expression-operators.ts` (584 lines)
  - Move all precedence chain functions (parseLambda → parseMultiplicative)
  - Move parseUnary() and parseCall()
  - Keep parseExpression() entry point here
- [x] Create `parse-expression-primary.ts` (369 lines)
  - Move parsePrimary() function
  - Handle literals, if, while, variables, etc.
- [x] Create `parse-expression-lambda.ts` (462 lines)
  - Move isOperatorToken(), parseLambdaParam(), isLikelyLambda(), parseLambdaOrParen()
- [x] Create `parse-expression-complex.ts` (479 lines)
  - Move parseMatchExpr(), parseRecordExpr(), parseBlockExpr(), parseLetExpr()
- [x] Create `parse-expressions.ts` aggregator (100 lines)
  - Set up dependency injection between modules
  - Re-export public API (parseExpression, parseBlockExpr)
- [x] Update imports in `parse-declarations.ts` and other files
- [x] Run `npm run verify` to ensure all tests pass
- [x] Verify all new files are under 1,000 lines

---

## Phase 7: Type Inference (infer.ts)

**Status:** ✅ Done
**Files:** 1 → 7 (+ new directory)
**Complexity:** High

### Tasks

- [x] Create `packages/core/src/typechecker/infer/` directory
- [x] Create `infer/infer-context.ts` (146 lines)
  - Move InferenceContext, InferResult types
  - Move instantiate(), substituteTypeVars()
  - Move createContext()
- [x] Create `infer/infer-primitives.ts` (318 lines)
  - Keep main inferExpr() dispatcher
  - Move literal inference
  - Move inferVar(), inferTypeAnnotation(), inferUnsafe()
  - Move convertTypeExpr()
- [x] Create `infer/infer-functions.ts` (128 lines)
  - Move inferLambda(), inferApp()
- [x] Create `infer/infer-operators.ts` (267 lines)
  - Move inferBinOp(), getBinOpTypes(), inferUnaryOp(), getUnaryOpTypes()
- [x] Create `infer/infer-bindings.ts` (330 lines)
  - Move inferLet(), inferLetRecExpr()
  - Move generalize()
- [x] Create `infer/infer-structures.ts` (441 lines)
  - Move inferRecord(), inferRecordAccess(), inferRecordUpdate()
  - Move inferVariant(), inferMatch()
- [x] Create `infer/index.ts` (61 lines)
  - Wire up dependency injection
  - Re-export all public functions
- [x] Update imports throughout typechecker module (from `./infer.js` to `./infer/index.js`)
- [x] Delete original `infer.ts`
- [x] Run `npm run verify` to ensure all tests pass
- [x] Verify all new files are under 1,000 lines (largest: 441 lines)

---

## Phase 8: Typechecker Tests (typechecker.test.ts)

**Status:** ✅ Done
**Files:** 1 → 6
**Complexity:** Low

### Tasks

- [x] Create `packages/core/src/typechecker/typechecker-test-helpers.ts` (~50 lines)
  - Extract testLoc constant and createModule helper
- [x] Create `typechecker-basic.test.ts` (~300 lines)
  - Move basic type checking tests
  - Move simple arithmetic, type annotations, comparison operators
- [x] Create `typechecker-records.test.ts` (~250 lines)
  - Move all record-related test suites
- [x] Create `typechecker-pattern-matching.test.ts` (~350 lines)
  - Move pattern matching test suites
- [x] Create `typechecker-recursion.test.ts` (~300 lines)
  - Move recursion, mutual recursion, let expressions
- [x] Create `typechecker-higher-order.test.ts` (~350 lines)
  - Move higher-order functions and polymorphic composition tests
- [x] Delete original `typechecker.test.ts`
- [x] Run `npm run verify` to ensure all tests pass
- [x] Verify all new files are under 1,000 lines

---

## Phase 9: Inference Tests (infer.test.ts)

**Status:** ✅ Done
**Files:** 1 → 5
**Complexity:** Low

### Tasks

- [x] Create `infer-primitives.test.ts` (364 lines)
  - Move literals, variables, lambdas, applications, complex expressions, type annotations
- [x] Create `infer-operators.test.ts` (201 lines)
  - Move binary operators and unary operators test suites
- [x] Create `infer-bindings.test.ts` (450 lines)
  - Move let-bindings, RefAssign/Deref, value restriction, unsafe blocks
- [x] Create `infer-records.test.ts` (393 lines)
  - Move records test suite and record type annotations
- [x] Create `infer-patterns.test.ts` (814 lines)
  - Move variants and match expressions test suites
- [x] Delete original `infer.test.ts`
- [x] Run `npm run verify` to ensure all tests pass
- [x] Verify all new files are under 1,000 lines

---

## Phase 10: Update Coding Standards

**Status:** ✅ Done
**Files:** Update 1 file (.claude/CODING_STANDARDS.md)
**Complexity:** Low

### Tasks

- [x] Read current `.claude/CODING_STANDARDS.md` file
- [x] Add new "File Size Limits" section with:
  - Maximum 1,000 line guideline
  - Refactoring requirements when threshold is exceeded
  - Exception documentation format (comment block)
  - Examples of valid exception reasons
  - Guidance on file organization patterns
- [x] Add file size check to "Code Review Checklist" section
- [x] Include exception comment template in documentation
- [x] Add examples of good multi-file module organization
- [x] Commit updated coding standards

### Exception Comment Template

```typescript
/**
 * FILE SIZE EXCEPTION
 *
 * This file exceeds the 1,000 line guideline.
 *
 * Reason: [Explain why this file cannot be reasonably split]
 *
 * Examples of valid reasons:
 * - Generated code that should not be manually edited
 * - Large lookup tables or constant definitions that must stay together
 * - Complex state machine with tightly coupled logic
 *
 * Last reviewed: [Date]
 * Reviewer: [Name]
 */
```

---

## Final Verification

**Status:** ✅ Done

### Tasks

- [x] Run `npm run verify` for entire project (all 2,730 tests passing)
- [x] Check test coverage hasn't decreased (maintained)
- [x] Verify all files in `.claude/large-files.txt` have been refactored (all 9 files completed)
- [x] Generate new large files list to confirm (<1,000 lines each) - NO FILES >= 1,000 lines
- [x] Update any documentation references to old file structures (imports updated)
- [x] Verify coding standards have been updated with file size limits (Phase 10 completed)
- [ ] Archive this task folder to `.claude/archive/large-file-breakup/` (deferred to user)

---

## Summary Statistics

| Phase | Status | Files Created | Largest File | Complexity |
|-------|--------|---------------|--------------|------------|
| Phase 1: Lexer Core | ✅ | 7 | 244 lines | Medium |
| Phase 2: Lexer Integration Tests | ✅ | 4 | 514 lines | Low |
| Phase 3: Operators Tests | ✅ | 4 | 381 lines | Low |
| Phase 4: Expression Tests | ✅ | 8 | 685 lines | Medium |
| Phase 5: Parser Integration Tests | ✅ | 4 | 541 lines | Low |
| Phase 6: Expression Parser | ✅ | 5 | 584 lines | High |
| Phase 7: Type Inference | ✅ | 7 | 441 lines | High |
| Phase 8: Typechecker Tests | ✅ | 6 | 350 lines | Low |
| Phase 9: Inference Tests | ✅ | 5 | 814 lines | Low |
| Phase 10: Update Coding Standards | ✅ | 1 (updated) | N/A | Low |
| **Total** | **9/10** | **52** | **814 lines** | **-** |

**Progress:** 9/10 phases completed (90%)
