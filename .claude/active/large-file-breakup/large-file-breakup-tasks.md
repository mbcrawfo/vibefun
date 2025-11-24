# Large File Breakup - Task Checklist

**Created:** 2025-11-23
**Last Updated:** 2025-11-23 19:54

## Overview

9 phases of file refactoring work. Each phase is independent and can be completed in any order.

---

## Phase 1: Lexer Core (lexer.ts)

**Status:** 🔜 Not Started
**Files:** 1 → 7
**Complexity:** Medium

### Tasks

- [ ] Create `packages/core/src/lexer/character-utils.ts` (~80 lines)
  - Extract `isDigit()`, `isHexDigit()`, `isIdentifierStart()`, `isIdentifierContinue()`
- [ ] Create `packages/core/src/lexer/identifier-parser.ts` (~100 lines)
  - Extract `readIdentifier()` function
- [ ] Create `packages/core/src/lexer/number-parser.ts` (~250 lines)
  - Extract `readNumber()`, `readDecimalNumber()`, `readHexNumber()`, `readBinaryNumber()`
- [ ] Create `packages/core/src/lexer/string-parser.ts` (~250 lines)
  - Extract string and escape sequence parsing functions
- [ ] Create `packages/core/src/lexer/operator-parser.ts` (~150 lines)
  - Extract `readOperatorOrPunctuation()` function
- [ ] Create `packages/core/src/lexer/comment-handler.ts` (~120 lines)
  - Extract `skipWhitespaceAndComments()` and related functions
- [ ] Update `packages/core/src/lexer/lexer.ts` to use extracted modules (~300 lines)
  - Import parser functions
  - Delegate to parser functions in `tokenize()` method
  - Make necessary helper methods public
- [ ] Update `packages/core/src/lexer/index.ts` to export new modules
- [ ] Run `npm run verify` to ensure all tests pass
- [ ] Verify lexer.ts is now under 1,000 lines

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

**Status:** 🔜 Not Started
**Files:** 1 → 7
**Complexity:** Medium

### Tasks

- [ ] Create `packages/core/src/parser/expression-test-helpers.ts` (~30 lines)
  - Extract shared `parseExpression()` helper function
- [ ] Create `expression-literals.test.ts` (~280 lines)
  - Move literals, variables, parenthesized expressions, error cases
- [ ] Create `expression-operators.test.ts` (~490 lines)
  - Move binary operators suite (all 7 subsections)
- [ ] Create `expression-unary-postfix.test.ts` (~320 lines)
  - Move unary operators and postfix dereference suites
- [ ] Create `expression-functions.test.ts` (~560 lines)
  - Move function calls, lambdas, type annotations, blocks, unsafe blocks
- [ ] Create `expression-control-flow.test.ts` (~325 lines)
  - Move if expressions and match expressions suites
- [ ] Create `expression-lists.test.ts` (~290 lines)
  - Move lists and list spreads suites
- [ ] Create `expression-records.test.ts` (~690 lines)
  - Move all record-related test suites
- [ ] Delete original `expressions.test.ts`
- [ ] Run `npm run verify` to ensure all tests pass
- [ ] Verify all new files are under 1,000 lines

---

## Phase 5: Parser Integration Tests (parser-integration.test.ts)

**Status:** 🔜 Not Started
**Files:** 1 → 3
**Complexity:** Low

### Tasks

- [ ] Create `packages/core/src/parser/parser-test-helpers.ts` (~30 lines)
  - Extract shared `parseModule()` helper function
- [ ] Create `parser-integration-basic.test.ts` (~360 lines)
  - Move simple functions, recursive functions, types, imports, externals, exports, real-world examples
- [ ] Create `parser-integration-patterns.test.ts` (~180 lines)
  - Move pattern matching and complex expressions suites
- [ ] Create `parser-integration-phase4.test.ts` (~530 lines)
  - Move all Phase 4 new features integration tests
- [ ] Delete original `parser-integration.test.ts`
- [ ] Run `npm run verify` to ensure all tests pass
- [ ] Verify all new files are under 1,000 lines

---

## Phase 6: Expression Parser (parse-expressions.ts)

**Status:** 🔜 Not Started
**Files:** 1 → 5
**Complexity:** High

### Tasks

- [ ] Create `parse-expression-operators.ts` (~550 lines)
  - Move all precedence chain functions (parseLambda → parseMultiplicative)
  - Move parseUnary() and parseCall()
  - Keep parseExpression() entry point here
- [ ] Create `parse-expression-primary.ts` (~350 lines)
  - Move parsePrimary() function
  - Handle literals, if, while, variables, etc.
- [ ] Create `parse-expression-lambda.ts` (~450 lines)
  - Move isOperatorToken(), parseLambdaParam(), isLikelyLambda(), parseLambdaOrParen()
- [ ] Create `parse-expression-complex.ts` (~460 lines)
  - Move parseMatchExpr(), parseRecordExpr(), parseBlockExpr(), parseLetExpr()
- [ ] Create `parse-expressions.ts` aggregator (~50 lines)
  - Set up dependency injection between modules
  - Re-export public API (parseExpression, parseBlockExpr)
- [ ] Update imports in `parse-declarations.ts` and other files
- [ ] Run `npm run verify` to ensure all tests pass
- [ ] Verify all new files are under 1,000 lines

---

## Phase 7: Type Inference (infer.ts)

**Status:** 🔜 Not Started
**Files:** 1 → 7 (+ new directory)
**Complexity:** High

### Tasks

- [ ] Create `packages/core/src/typechecker/infer/` directory
- [ ] Create `infer/infer-context.ts` (~150 lines)
  - Move InferenceContext, InferResult types
  - Move instantiate(), substituteTypeVars(), generalize()
  - Move createContext()
- [ ] Create `infer/infer-primitives.ts` (~180 lines)
  - Keep main inferExpr() dispatcher
  - Move literal inference
  - Move inferVar(), inferTypeAnnotation(), inferUnsafe()
- [ ] Create `infer/infer-functions.ts` (~100 lines)
  - Move inferLambda(), inferApp()
- [ ] Create `infer/infer-operators.ts` (~250 lines)
  - Move inferBinOp(), getBinOpTypes(), inferUnaryOp(), getUnaryOpTypes()
- [ ] Create `infer/infer-bindings.ts` (~350 lines)
  - Move inferLet(), inferLetRecExpr()
- [ ] Create `infer/infer-structures.ts` (~450 lines)
  - Move inferRecord(), inferRecordAccess(), inferRecordUpdate()
  - Move inferVariant(), inferMatch()
  - Move convertTypeExpr()
- [ ] Create `infer/index.ts` (~20 lines)
  - Re-export all public functions
- [ ] Update imports throughout typechecker module (from `./infer.js` to `./infer/index.js`)
- [ ] Run `npm run verify` to ensure all tests pass
- [ ] Verify all new files are under 1,000 lines

---

## Phase 8: Typechecker Tests (typechecker.test.ts)

**Status:** 🔜 Not Started
**Files:** 1 → 6
**Complexity:** Low

### Tasks

- [ ] Create `packages/core/src/typechecker/typechecker-test-helpers.ts` (~50 lines)
  - Extract testLoc constant and createModule helper
- [ ] Create `typechecker-basic.test.ts` (~300 lines)
  - Move basic type checking tests
  - Move simple arithmetic, type annotations, comparison operators
- [ ] Create `typechecker-records.test.ts` (~250 lines)
  - Move all record-related test suites
- [ ] Create `typechecker-pattern-matching.test.ts` (~350 lines)
  - Move pattern matching test suites
- [ ] Create `typechecker-recursion.test.ts` (~300 lines)
  - Move recursion, mutual recursion, let expressions
- [ ] Create `typechecker-higher-order.test.ts` (~350 lines)
  - Move higher-order functions and polymorphic composition tests
- [ ] Delete original `typechecker.test.ts`
- [ ] Run `npm run verify` to ensure all tests pass
- [ ] Verify all new files are under 1,000 lines

---

## Phase 9: Inference Tests (infer.test.ts)

**Status:** 🔜 Not Started
**Files:** 1 → 5
**Complexity:** Low

### Tasks

- [ ] Create `infer-primitives.test.ts` (~350 lines)
  - Move literals, variables, lambdas, applications, complex expressions, type annotations
- [ ] Create `infer-operators.test.ts` (~150 lines)
  - Move binary operators and unary operators test suites
- [ ] Create `infer-bindings.test.ts` (~350 lines)
  - Move let-bindings, RefAssign/Deref, value restriction, unsafe blocks
- [ ] Create `infer-records.test.ts` (~300 lines)
  - Move records test suite and record type annotations
- [ ] Create `infer-patterns.test.ts` (~850 lines)
  - Move variants and match expressions test suites
- [ ] Delete original `infer.test.ts`
- [ ] Run `npm run verify` to ensure all tests pass
- [ ] Verify all new files are under 1,000 lines

---

## Phase 10: Update Coding Standards

**Status:** 🔜 Not Started
**Files:** Update 1 file (.claude/CODING_STANDARDS.md)
**Complexity:** Low

### Tasks

- [ ] Read current `.claude/CODING_STANDARDS.md` file
- [ ] Add new "File Size Limits" section with:
  - Maximum 1,000 line guideline
  - Refactoring requirements when threshold is exceeded
  - Exception documentation format (comment block)
  - Examples of valid exception reasons
  - Guidance on file organization patterns
- [ ] Add file size check to "Code Review Checklist" section
- [ ] Include exception comment template in documentation
- [ ] Add examples of good multi-file module organization
- [ ] Commit updated coding standards

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

**Status:** 🔜 Not Started

### Tasks

- [ ] Run `npm run verify` for entire project
- [ ] Check test coverage hasn't decreased
- [ ] Verify all files in `.claude/large-files.txt` have been refactored
- [ ] Generate new large files list to confirm (<1,000 lines each)
- [ ] Update any documentation references to old file structures
- [ ] Verify coding standards have been updated with file size limits
- [ ] Archive this task folder to `.claude/archive/large-file-breakup/`

---

## Summary Statistics

| Phase | Status | Files Created | Largest File | Complexity |
|-------|--------|---------------|--------------|------------|
| Phase 1: Lexer Core | 🔜 | 7 | ~300 lines | Medium |
| Phase 2: Lexer Integration Tests | 🔜 | 4 | ~499 lines | Low |
| Phase 3: Operators Tests | 🔜 | 4 | ~385 lines | Low |
| Phase 4: Expression Tests | 🔜 | 7 | ~690 lines | Medium |
| Phase 5: Parser Integration Tests | 🔜 | 3 | ~530 lines | Low |
| Phase 6: Expression Parser | 🔜 | 5 | ~550 lines | High |
| Phase 7: Type Inference | 🔜 | 7 | ~450 lines | High |
| Phase 8: Typechecker Tests | 🔜 | 6 | ~350 lines | Low |
| Phase 9: Inference Tests | 🔜 | 5 | ~850 lines | Low |
| Phase 10: Update Coding Standards | 🔜 | 1 (updated) | N/A | Low |
| **Total** | **0/10** | **48** | **~850 lines** | **-** |

**Progress:** 0/10 phases completed (0%)
