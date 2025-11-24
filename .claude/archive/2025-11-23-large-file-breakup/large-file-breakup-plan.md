# Large File Breakup - Implementation Plan

**Created:** 2025-11-23
**Last Updated:** 2025-11-23

## Overview

Refactor 9 TypeScript files (currently >1,000 lines each) into 44 smaller, more maintainable files following the project's coding standards (target <1,000 lines per file, ideally <500 lines).

## Goals

1. **Meet Coding Standards**: All files under 1,000 lines (ideally under 500)
2. **Maintain Test Coverage**: No reduction in test coverage
3. **Preserve Functionality**: No behavior changes, only structural improvements
4. **Improve Maintainability**: Logical file organization with clear responsibilities

## Files to Refactor

| File | Current Lines | Target Files | Largest New File |
|------|---------------|--------------|------------------|
| lexer.ts | 1,036 | 7 | ~300 lines |
| lexer-integration.test.ts | 1,448 | 4 | ~499 lines |
| operators.test.ts | 1,132 | 4 | ~385 lines |
| expressions.test.ts | 3,018 | 7 | ~690 lines |
| parser-integration.test.ts | 1,057 | 3 | ~530 lines |
| parse-expressions.ts | 1,811 | 4 | ~550 lines |
| infer.ts | 1,478 | 6 | ~450 lines |
| typechecker.test.ts | 1,752 | 5 | ~350 lines |
| infer.test.ts | 2,007 | 5 | ~850 lines |

**Total**: 9 original files → 44 new files

---

## Phase 1: Lexer Core (lexer.ts)

**Current:** 1,036 lines
**Target:** 7 files, largest ~300 lines

### Proposed Structure

```
packages/core/src/lexer/
├── lexer.ts                    # Main Lexer class (~300 lines)
├── character-utils.ts          # Character classification (~80 lines)
├── identifier-parser.ts        # Identifier parsing (~100 lines)
├── number-parser.ts            # Number parsing (~250 lines)
├── string-parser.ts            # String parsing (~250 lines)
├── operator-parser.ts          # Operator/punctuation parsing (~150 lines)
├── comment-handler.ts          # Comment handling (~120 lines)
└── index.ts                    # Public exports
```

### Strategy

- Extract specialized parser functions into separate modules
- Each parser module takes Lexer instance as parameter
- Main Lexer class delegates to parser functions
- Use `import type { Lexer }` in parser files to avoid circular dependencies
- Public API remains unchanged

### Key Decisions

- Keep Lexer class stateful (manages position, line, column)
- Parser functions are pure operations on Lexer state
- Character classification utilities are standalone functions

---

## Phase 2: Lexer Integration Tests (lexer-integration.test.ts)

**Current:** 1,448 lines
**Target:** 4 files, largest ~499 lines

### Proposed Structure

```
packages/core/src/lexer/
├── lexer-integration-syntax.test.ts      # Basic syntax (~302 lines)
├── lexer-integration-features.test.ts    # Language features (~383 lines)
├── lexer-integration-advanced.test.ts    # Advanced patterns (~499 lines)
├── lexer-integration-realistic.test.ts   # Realistic programs (~244 lines)
```

### Strategy

- Split by complexity level and feature grouping
- Each file maintains clear describe blocks
- No shared state between test files

---

## Phase 3: Operators Tests (operators.test.ts)

**Current:** 1,132 lines
**Target:** 4 files, largest ~385 lines

### Proposed Structure

```
packages/core/src/lexer/
├── operators-punctuation.test.ts     # Single-character (~385 lines)
├── operators-multi-char.test.ts      # Multi-character (~380 lines)
├── operators-edge-cases.test.ts      # Edge cases (~365 lines)
├── operators-invalid.test.ts         # Invalid characters (~50 lines)
```

### Strategy

- Split by operator category (single-char, multi-char, edge cases)
- Each file tests a cohesive subset of operator functionality

---

## Phase 4: Expression Tests (expressions.test.ts)

**Current:** 3,018 lines (largest file!)
**Target:** 7 files, largest ~690 lines

### Proposed Structure

```
packages/core/src/parser/
├── expression-literals.test.ts          # Literals & basics (~280 lines)
├── expression-operators.test.ts         # Binary operators (~490 lines)
├── expression-unary-postfix.test.ts     # Unary & postfix (~320 lines)
├── expression-functions.test.ts         # Functions & lambdas (~560 lines)
├── expression-control-flow.test.ts      # If/match expressions (~325 lines)
├── expression-lists.test.ts             # List operations (~290 lines)
└── expression-records.test.ts           # Record operations (~690 lines)
```

### Strategy

- Split by expression category
- Create shared test helper module for `parseExpression()` helper
- Records file is largest but cohesive (many edge cases)

### Key Decisions

- Option A: Duplicate `parseExpression()` helper in each file
- Option B: Create `expression-test-helpers.ts` shared module
- **Recommendation:** Option B for cleaner organization

---

## Phase 5: Parser Integration Tests (parser-integration.test.ts)

**Current:** 1,057 lines
**Target:** 3 files, largest ~530 lines

### Proposed Structure

```
packages/core/src/parser/
├── parser-integration-basic.test.ts      # Core features (~360 lines)
├── parser-integration-patterns.test.ts   # Pattern matching (~180 lines)
└── parser-integration-phase4.test.ts     # Phase 4 features (~530 lines)
```

### Strategy

- Split by feature maturity level
- Phase 4 features grouped together (refs, spreads, re-exports, guards)
- Create shared `test-helpers.ts` with `parseModule()` function

---

## Phase 6: Expression Parser (parse-expressions.ts)

**Current:** 1,811 lines
**Target:** 4 files, largest ~550 lines

### Proposed Structure

```
packages/core/src/parser/
├── parse-expression-operators.ts     # Precedence chain (~550 lines)
├── parse-expression-primary.ts       # Primary expressions (~350 lines)
├── parse-expression-lambda.ts        # Lambda/paren handling (~450 lines)
├── parse-expression-complex.ts       # Match/record/block/let (~460 lines)
└── parse-expressions.ts              # Aggregator/public API (~50 lines)
```

### Strategy

- Extract by expression type and parsing complexity
- Use dependency injection pattern (already used in parser)
- Aggregator file maintains public API (`parseExpression`, `parseBlockExpr`)
- Use `import type` to avoid circular dependencies

### Key Decisions

- Keep `parseExpression()` entry point in operators file
- Other modules import `parseExpression()` for recursion
- No circular dependency issues (operators is the top-level dispatcher)

---

## Phase 7: Type Inference (infer.ts)

**Current:** 1,478 lines
**Target:** 6 files, largest ~450 lines

### Proposed Structure

```
packages/core/src/typechecker/infer/
├── index.ts                    # Public API exports (~20 lines)
├── infer-context.ts            # Context & type schemes (~150 lines)
├── infer-primitives.ts         # Simple expressions (~180 lines)
├── infer-functions.ts          # Lambdas & application (~100 lines)
├── infer-operators.ts          # Operator inference (~250 lines)
├── infer-bindings.ts           # Let-bindings (~350 lines)
└── infer-structures.ts         # Records/variants/patterns (~450 lines)
```

### Strategy

- Extract by inference domain (primitives, functions, operators, etc.)
- Create `infer/` subdirectory with index.ts for exports
- Main dispatcher `inferExpr()` stays in `infer-primitives.ts`
- Shared types exported from `infer-context.ts`

### Key Decisions

- Change imports from `./typechecker/infer.js` to `./typechecker/infer/index.js`
- Avoid circular dependencies by keeping dispatcher in primitives file
- All modules can import `inferExpr()` without cycles

---

## Phase 8: Typechecker Tests (typechecker.test.ts)

**Current:** 1,752 lines
**Target:** 5 files, largest ~350 lines

### Proposed Structure

```
packages/core/src/typechecker/
├── typechecker-basic.test.ts            # Basic type checking (~300 lines)
├── typechecker-records.test.ts          # Record operations (~250 lines)
├── typechecker-pattern-matching.test.ts # Pattern matching (~350 lines)
├── typechecker-recursion.test.ts        # Recursion & let (~300 lines)
└── typechecker-higher-order.test.ts     # Higher-order functions (~350 lines)
```

### Strategy

- Split by feature area
- Create shared `test-helpers.ts` with `testLoc` and `createModule`
- All files well under 500 lines

---

## Phase 9: Inference Tests (infer.test.ts)

**Current:** 2,007 lines (second largest file!)
**Target:** 5 files, largest ~850 lines

### Proposed Structure

```
packages/core/src/typechecker/
├── infer-primitives.test.ts     # Literals, variables, lambdas (~350 lines)
├── infer-operators.test.ts      # Binary & unary operators (~150 lines)
├── infer-bindings.test.ts       # Let-bindings, refs, value restriction (~350 lines)
├── infer-records.test.ts        # Record operations (~300 lines)
└── infer-patterns.test.ts       # Variants & pattern matching (~850 lines)
```

### Strategy

- Split by inference domain (matching Phase 7 structure)
- Pattern matching is largest but cohesive (many test cases)
- Duplicate shared setup (acceptable for test independence)

---

## General Principles

### For All Refactorings

1. **No Behavior Changes**: Only structural improvements
2. **Maintain Tests**: All existing tests must continue to pass
3. **Follow Coding Standards**: Use index.ts pattern, kebab-case naming
4. **Run Quality Checks**: `npm run verify` after each phase
5. **Update Imports**: Ensure all import paths are correct
6. **Test Independently**: Each new file should have clear purpose

### Import/Export Patterns

- Use named exports only (no default exports)
- Use `import type` for type-only imports
- Create `index.ts` for public API in multi-file modules
- Maintain existing public APIs

### Testing Strategy

After each phase:
1. Run `npm run check` (type checking)
2. Run `npm run lint` (linting)
3. Run `npm test` (all tests)
4. Run `npm run format` (formatting)
5. Verify no behavior changes

---

## Success Criteria

- [ ] All files under 1,000 lines (ideally under 500)
- [ ] No reduction in test coverage
- [ ] All quality checks passing
- [ ] Logical file organization
- [ ] Clear file naming and structure
- [ ] No circular dependencies
- [ ] Public APIs unchanged (or explicitly documented if changed)

---

## Risks and Mitigations

### Risk: Circular Dependencies
**Mitigation:** Use `import type` and dependency injection patterns

### Risk: Test Coverage Loss
**Mitigation:** Run tests after each file split, verify coverage reports

### Risk: Breaking Public APIs
**Mitigation:** Use aggregator/index files to maintain existing import paths

### Risk: Import Path Updates
**Mitigation:** Carefully update all imports, verify with type checking

---

---

## Phase 10: Update Coding Standards

**Purpose:** Formalize the 1,000-line limit in project coding standards

### Changes to CODING_STANDARDS.md

Add new section under "Code Review Checklist" or "File Structure":

#### File Size Limits

**Maximum file size: 1,000 lines**

All TypeScript files (source and test) should remain under 1,000 lines. When a file approaches or exceeds this threshold:

1. **Refactor the file** into smaller, focused modules
2. **Extract logical components** into separate files
3. **Follow module organization patterns** (use index.ts for public APIs)

**If refactoring is not feasible**, add a comment block at the top of the file explaining why:

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

**Guidelines:**
- Prefer multiple small files over one large file
- Target <500 lines per file when possible
- Each file should have a single, clear responsibility
- Use index.ts to re-export public APIs from multi-file modules
- Test files can be split by feature area or test category

**File size exceptions are rare and require justification.**

### Implementation

- [ ] Update `.claude/CODING_STANDARDS.md` with file size limits section
- [ ] Add to code review checklist: "Files under 1,000 lines (or exception documented)"
- [ ] Document the exception comment format
- [ ] Add examples of good file organization patterns

---

## Notes

- Phase 4 (expressions.test.ts) is the largest refactoring (3,018 → 7 files)
- Phase 9 (infer.test.ts) has the largest resulting file (~850 lines for patterns)
- Some test files will have duplicated setup code (acceptable for independence)
- Consider creating shared test helper modules to reduce duplication
- Phase 10 ensures future files won't grow beyond reasonable size
