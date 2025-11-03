# Parser Completion - Task Checklist (REVISED)

**Created:** 2025-11-02
**Last Updated:** 2025-11-02 (Phases 0-3 Completed)
**Status:** Phases 0-3 Complete ✅ - Ready for Phase 4 (Enhanced Test Coverage)
**Revision:** Core parser features complete (record spread, list spread, postfix deref, re-exports), all tests passing (1763/1763)

## Overview

Task checklist for completing vibefun parser to 100% spec coverage.

**MAJOR CHANGES:**
- **Phase -1 added (preparation work) - NEW 2025-11-02**
- Phase 0 added (record spread migration) - CRITICAL
- Phase 1 changed (list spread, not refs)
- Phase 2 scope reduced (only postfix !, RefAssign already done)
- AST design decisions ✅ FINALIZED by user (all 4 decisions)
- ~118 new tests planned (was 85, adjusted after decisions)
- All breaking change and semantic decisions resolved
- Test baseline corrected: ~346 tests (not ~305)

---

## Phase -1: Pre-Implementation Preparation (NEW - ADDED 2025-11-02)

**Status:** ✅ COMPLETE (2025-11-02)
**Goal:** Audit codebase and define error messages before starting implementation
**Risk:** LOW - no code changes, just preparation
**Actual Time:** ~2 hours

### -1.1 Comprehensive Codebase Audit ✅ COMPLETE

- [x] Run grep for pipe syntax: `rg '\{\s*\w+\s*\|' --type ts`
- [x] Document all affected files and line numbers
- [x] Count total instances found: **45 occurrences across 15 files**
- [x] Identify affected test files:
  - [x] Parser tests: **5 test cases** (expressions.test.ts: 3, parser-integration.test.ts: 2)
  - [x] Desugarer tests: **13 tests** (records.test.ts - NO MIGRATION NEEDED, AST-based)
  - [x] Type-checker tests: **2 false positives** (string templates, not syntax)
  - [x] Optimizer tests: None found
  - [x] Integration tests: Already counted in parser tests
- [x] Run grep for RecordUpdate references: `rg 'RecordUpdate' --type ts`
- [x] Identify files that reference RecordUpdate
- [x] Check if any need updates for nested RecordUpdate approach: **Minimal impact confirmed**
- [x] Document audit results in context.md under "Phase -1 Audit Results"
- [x] Update test migration estimate based on actual count: **10 items (5 tests + 5 comments)**

**Key Findings:**
- Migration scope: **5 parser tests + 5 code comments = 10 items**
- Desugarer tests are **integration validators only** - no migration needed
- No example `.vf` files exist - no external migration
- Downstream impact: **MINIMAL** (LOW RISK confirmed)

### -1.2 Error Message Definitions ✅ COMPLETE

- [x] Review error cases from plan.md Phase -1 section
- [x] Define exact error message for empty spread in record: `{...}`
- [x] Define exact error message for empty spread in list: `[...]`
- [x] Define exact error message for invalid spread position: `{..., x: 1}`
- [x] Define error message for missing closing brace: `{...obj, x: 1`
- [x] Define error message for missing closing bracket: `[...items`
- [x] Create error message table in context.md (already added)
- [x] Verify error messages are clear, actionable, and helpful
- [x] Add suggestions to error messages where applicable

**All error messages defined in context.md Phase -1 section.**

### -1.3 Baseline Test Count Verification ✅ COMPLETE

- [x] Run full test suite: `npm test 2>&1 | grep -E "Test Files|Tests|passing"`
- [x] Document current parser test count: **346 tests** (VERIFIED)
- [x] Document current total test count: **1705 tests**
- [x] Calculate new target: **~346 + ~120-125 = ~466-471 parser tests**
- [x] Update context.md with verified baseline
- [x] Update tasks.md summary with verified numbers
- [x] Update plan.md success criteria with correct targets

**Verified Baselines:**
- Current parser tests: **346** ✅
- Current total tests: **1705** ✅
- Target parser tests: **~466-471** ✅
- Target total tests: **~1825-1830** ✅

**Subtotal Phase -1:** ~2 hours preparation work ✅ COMPLETE

---

## Phase 0: Record Spread Syntax Migration (NEW - CRITICAL)

**Status:** 🔜 Not Started
**Goal:** Replace `{r | f: v}` with `{...r, f: v}` to match spec
**Risk:** HIGH - modifies existing working code

### 0.1 AST Design Decision ✅ ALL FINALIZED

- [x] ✅ DECISION MADE: Keep separate RecordUpdate node (Option 1)
- [x] ✅ DECISION MADE: JavaScript rightmost-wins semantics for multiple spreads
- [x] ✅ DECISION MADE: Accept breaking change (pre-1.0 allows it)
- [x] ✅ DECISION MADE: Nested RecordUpdate nodes for `{...a, ...b, x: 1}`
- [x] ✅ DECISION MADE: Allow spread-only records `{...obj}` for shallow copy
- [ ] Review current `RecordUpdate` AST structure
- [ ] Confirm AST structure matches finalized decision:
  - ✅ Keep `{ kind: "RecordUpdate"; record: Expr; updates: RecordField[] }`
  - ✅ NO changes needed - use nesting for multiple spreads
- [ ] Review how desugarer handles RecordUpdate
- [ ] Document nested RecordUpdate approach in code comments

### 0.2 AST Verification (No Changes Needed)

- [ ] Verify `RecordUpdate` node exists in `packages/core/src/types/ast.ts`
- [ ] Verify structure: `{ kind: "RecordUpdate"; record: Expr; updates: RecordField[] }`
- [ ] Confirm no AST modifications needed (nesting approach keeps structure)
- [ ] Run type check to ensure no issues: `npm run check`

### 0.3 Parser Implementation - Record Spread

- [ ] Read current `parseRecordExpr()` (lines 775-851)
- [ ] Identify all pipe-based record update logic to remove (lines 794-827)
- [ ] Design new parsing logic for spread syntax using nested RecordUpdate
- [ ] Implement spread detection:
  - [ ] Check for `DOT_DOT_DOT` token at start of record
  - [ ] Parse spread expression
  - [ ] For multiple spreads, wrap in nested RecordUpdate nodes
  - [ ] Continue parsing remaining fields (can be more spreads or regular fields)
  - [ ] Apply JavaScript rightmost-wins semantics via nesting
- [ ] Implement nested RecordUpdate construction:
  - [ ] `{...a}` → `RecordUpdate(a, [])`  ✅ Spread-only allowed
  - [ ] `{...a, x: 1}` → `RecordUpdate(a, [x: 1])`
  - [ ] `{...a, ...b}` → `RecordUpdate(RecordUpdate(a, [...b fields]), [])`
  - [ ] `{...a, ...b, x: 1}` → `RecordUpdate(RecordUpdate(a, [...b fields]), [x: 1])`
- [ ] Implement disambiguation:
  - [ ] `{...x}` - record with spread only (shallow copy) ✅ ALLOWED
  - [ ] `{...x, y: 1}` - record with spread and fields
  - [ ] `{x: 1}` - normal record construction (unchanged)
- [ ] Handle edge cases:
  - [ ] Empty spread: `{...}` - error with message from Phase -1
  - [ ] Multiple spreads: `{...a, ...b, x: 1}` ✅ Create nested RecordUpdate
  - [ ] Spread order: `{...a, x: 1, ...b}` - nesting preserves rightmost-wins
- [ ] Add JSDoc comments explaining:
  - [ ] Spread syntax support
  - [ ] Nested RecordUpdate approach
  - [ ] JavaScript rightmost-wins semantics
- [ ] Run type check: `npm run check`

### 0.4 Test Migration - Convert Pipe to Spread

- [ ] Search for all tests using `{r | f: v}` syntax
  - File: `packages/core/src/parser/expressions.test.ts`
  - Search pattern: `\{.*\|.*\}`
- [ ] Count affected tests (estimate: 5-10 tests)
- [ ] Convert each test to spread syntax `{...r, f: v}`
- [ ] Run converted tests: `npm test expressions.test.ts`
- [ ] Fix any failures
- [ ] Verify no regressions

### 0.5 New Record Spread Tests

- [ ] Create test section in expressions.test.ts for record spreads
- [ ] Test basic spread:
  - [ ] `{...person, age: 31}`
  - [ ] `{...obj, field: value}`
- [ ] Test multiple fields:
  - [ ] `{...person, age: 31, name: "Bob"}`
  - [ ] `{...obj, a: 1, b: 2, c: 3}`
- [ ] Test multiple spreads (creates nested RecordUpdate):
  - [ ] `{...base, ...overrides}` - verify nested AST
  - [ ] `{...a, ...b, x: 1}` - verify nested with fields
  - [ ] `{...a, x: 1, ...b}` - order matters, rightmost wins
  - [ ] `{...a, ...b, ...c}` - triple nesting
- [ ] Test spread only (shallow copy use case):
  - [ ] `{...obj}` ✅ ALLOWED - verify RecordUpdate(obj, [])
  - [ ] Verify AST structure for spread-only
- [ ] Test nested spreads:
  - [ ] `{...obj, nested: {...obj.nested, x: 1}}`
- [ ] Test precedence and semantics:
  - [ ] `{...a, x: 1, ...b}` - verify b.x overrides explicit x (via nesting)
  - [ ] `{x: 1, ...a}` - verify a.x overrides explicit x
- [ ] Test edge cases:
  - [ ] Spread with no fields after: `{...obj, ...obj2}`
  - [ ] Complex expressions in spread: `{...getObj(), x: 1}`
  - [ ] Expression as spread source: `{...if cond then a else b, x: 1}`
- [ ] Test errors with defined messages:
  - [ ] `{...}` - empty spread (use message from Phase -1)
  - [ ] `{..., x: 1}` - comma before spread
- [ ] Run tests: `npm test expressions.test.ts`
- [ ] Verify all tests pass
- [ ] Verify nested RecordUpdate AST structure in tests

**Subtotal Phase 0:** ~20 new tests + ~5 migrated tests + ~5 comment updates = ~30 total items
**Estimated Time:** 4-5 hours (adjusted from 3-4 hours for comment updates)

---

## Phase 1: List Spread in Expressions (NEW)

**Status:** ✅ COMPLETE (2025-11-02)
**Goal:** Support `[1, 2, ...rest]` syntax from spec
**Risk:** LOW - AST already supports it
**Actual Time:** ~30 minutes

### 1.1 Parser Implementation - List Spread

- [x] Read current list parsing (lines 1005-1028 in parser.ts)
- [x] Verify `ListElement` AST supports spread (ast.ts line 26)
- [x] Modify list parsing loop in `parsePrimary()`:
  - [x] Before parsing each element, check for `DOT_DOT_DOT`
  - [x] If found, consume `...` and parse expression
  - [x] Create `{ kind: "Spread", expr }` element
  - [x] Otherwise, create `{ kind: "Element", expr }` element
- [x] Handle multiple spreads: `[...xs, ...ys]`
- [x] Handle mixed: `[1, ...xs, 2]`
- [x] Add JSDoc comments
- [x] Run type check: `npm run check`

### 1.2 List Spread Testing

- [x] Create test section in expressions.test.ts
- [x] Test basic spread:
  - [x] `[1, 2, ...rest]`
  - [x] `[...items]`
- [x] Test multiple spreads:
  - [x] `[...xs, ...ys]`
  - [x] `[...a, ...b, ...c]`
- [x] Test mixed:
  - [x] `[1, ...middle, 5]`
  - [x] `[...start, 1, 2, ...end]`
- [x] Test nested:
  - [x] `[[...inner]]`
  - [x] `[...[1, 2, 3]]` - spread of literal
- [x] Test in expressions:
  - [x] `[...xs] |> map(f)`
  - [x] `[...xs, a + b]` - with binary op
- [x] Test edge cases:
  - [x] Spread only: `[...items]`
  - [x] Multiple consecutive: `[...a, ...b, ...c]`
  - [x] Complex expr: `[...getList(), 1]`
- [x] Run tests: `npm test expressions.test.ts`

**Subtotal Phase 1:** 12 tests ✅ COMPLETE

---

## Phase 2: Postfix Dereference Operator (REVISED)

**Status:** ✅ COMPLETE (2025-11-02)
**Goal:** Implement `expr!` for dereference
**Risk:** LOW - clean addition
**Actual Time:** ~45 minutes

**CORRECTIONS FROM ORIGINAL PLAN:**
- ❌ RefAssign already implemented - NO WORK NEEDED
- ❌ ref() function already works - NO WORK NEEDED
- ✅ Only postfix ! needs implementation

### 2.1 AST Verification

- [x] Verify `UnaryOp` with `op: "Deref"` exists (ast.ts line 138)
- [x] Verify type is exported
- [x] No AST changes needed

### 2.2 Parser Implementation - Postfix Bang

- [x] Read current `parseCall()` method (lines 531-575)
- [x] Add postfix BANG handling after DOT clause:
  ```typescript
  else if (this.match("BANG")) {
      expr = {
          kind: "UnaryOp",
          op: "Deref",
          expr,
          loc: expr.loc,
      };
  }
  ```
- [x] Verify loops back for chaining: `x!!` works
- [x] Test precedence with prefix NOT: `!x!` vs `x!!`
- [x] Add JSDoc comments
- [x] Run type check: `npm run check`

### 2.3 Postfix Deref Testing

- [x] Create test section in expressions.test.ts
- [x] Test simple deref:
  - [x] `x!`
  - [x] `counter!`
- [x] Test chained:
  - [x] `x!!` - double deref
  - [x] `x!!!` - triple deref
- [x] Test after access:
  - [x] `obj.field!`
  - [x] `record.value!` (avoided `ref` keyword)
- [x] Test after call:
  - [x] `getRef()!`
  - [x] `f(x)!`
- [x] Test in operators:
  - [x] `x! + 1`
  - [x] `x! * 2`
  - [x] `x! == y!`
- [x] Test in control flow:
  - [x] `if x! then y else z`
- [x] Test precedence:
  - [x] `!x!` - NOT of deref (postfix binds first)
  - [x] `-x!` - negate of deref
- [x] Test complex:
  - [x] `obj.getRef()! + 5` (method call then deref)
- [x] Run tests: `npm test expressions.test.ts`

**Subtotal Phase 2:** 15 tests ✅ COMPLETE

---

## Phase 3: Re-exports with ReExportDeclaration (REVISED)

**Status:** ✅ COMPLETE (2025-11-02)
**Goal:** Support `export { x } from "module"` with clean AST
**Risk:** LOW - new feature, clean design
**Actual Time:** ~45 minutes

**DECISION:** Use new `ReExportDeclaration` node (not extending ExportDeclaration)

### 3.1 AST Implementation - ReExportDeclaration ✅ COMPLETE

- [x] ✅ DECISION MADE: Create new ReExportDeclaration node (not extending ExportDeclaration)
- [x] ✅ DECISION MADE: Remove `exported` field (redundant - node kind indicates exported)
- [x] Add new type in `packages/core/src/types/ast.ts`:
  ```typescript
  export type ReExportDeclaration = {
      kind: "ReExportDecl";
      items: ImportItem[] | null;  // null for export *
      from: string;
      loc: Location;
  };
  ```
  **Note:** `exported: boolean` field removed - redundant since node kind already indicates it's exported
- [x] Update `Declaration` type union to include `ReExportDeclaration`
- [x] Export from index.ts
- [x] Run type check: `npm run check`

### 3.2 Parser Implementation - Re-exports

- [x] Read current export parsing in `parseDeclaration()`
- [x] Design re-export detection strategy:
  - After parsing `export { items }` or `export *`
  - Check for `from` keyword
  - If present, it's a re-export not a regular export
- [x] Implement re-export parsing:
  - [x] Named: `export { x, y } from "./mod"`
  - [x] Aliased: `export { x as y } from "./mod"`
  - [x] Namespace: `export * from "./mod"`
  - [x] Type: `export { type T } from "./mod"`
  - [x] Mixed: `export { type T, value } from "./mod"`
- [x] Create `ReExportDeclaration` AST node
- [x] Handle errors:
  - [x] Missing module path after `from`
  - [x] Invalid module path (not string)
- [x] Add JSDoc comments
- [x] Run type check: `npm run check`

### 3.3 Re-export Testing

- [x] Add tests to `packages/core/src/parser/declarations.test.ts`
- [x] Test named re-exports:
  - [x] `export { x } from "./mod"`
  - [x] `export { x, y, z } from "./mod"`
- [x] Test aliased:
  - [x] `export { x as y } from "./mod"`
  - [x] `export { x as a, y as b } from "./mod"`
- [x] Test namespace:
  - [x] `export * from "./mod"`
  - [x] `export * from "../parent/mod"`
- [x] Test type re-exports:
  - [x] `export { type T } from "./types"`
  - [x] `export { type T, type U } from "./types"`
- [x] Test mixed:
  - [x] `export { type T, value } from "./mod"`
  - [x] `export { type T, type U, a, b } from "./mod"`
- [x] Test edge cases:
  - [x] Empty: `export {} from "./mod"` (valid)
  - [x] Relative paths: `../`, `./`, `../../`
- [x] Run tests: `npm test declarations.test.ts`

**Subtotal Phase 3:** 12 tests ✅ COMPLETE

---

## Phase 4: Enhanced Test Coverage

**Status:** 🔜 Not Started
**Goal:** Comprehensive integration, error, and edge case testing
**Risk:** MEDIUM - large test suite to write

### 4.1 Integration Tests

- [ ] Expand `packages/core/src/parser/parser-integration.test.ts`
- [ ] Test 1: Counter with refs and deref
  - [ ] 50+ line program using ref, :=, !
  - [ ] Verify all operations parse correctly
- [ ] Test 2: List processing with spreads
  - [ ] Use list spreads in transformations
  - [ ] Combine with pipes and map/filter
- [ ] Test 3: Module system with re-exports
  - [ ] Multiple re-export forms
  - [ ] Combined with imports and regular exports
- [ ] Test 4: Record operations with spreads
  - [ ] Nested record updates
  - [ ] Multiple spreads
  - [ ] Combined with pattern matching
- [ ] Test 5: Complex pattern matching
  - [ ] Ref dereference in match: `match x! { ... }`
  - [ ] Nested patterns with guards
- [ ] Test 6: Pipeline with spreads and composition
  - [ ] Pipe operator with spread operations
  - [ ] Function composition
- [ ] Test 7: External API with overloading
  - [ ] Reuse/expand existing test
- [ ] Test 8: Nested match with guards
  - [ ] Deep nesting
  - [ ] Multiple guard conditions
- [ ] Test 9: Higher-order functions with complex types
  - [ ] Type annotations
  - [ ] Generic functions
- [ ] Test 10: Mixed module imports/exports/re-exports
  - [ ] All import forms
  - [ ] All export forms
  - [ ] Re-exports
- [ ] Tests 11-20: Additional realistic scenarios
  - [ ] Data transformation pipelines
  - [ ] State management patterns
  - [ ] API wrapper patterns
  - [ ] Recursive data structures
  - [ ] Complex type expressions
- [ ] Run tests: `npm test parser-integration.test.ts`

**Subtotal 4.1:** ~20 tests

### 4.2 Error Recovery Tests

- [ ] Expand `packages/core/src/parser/parser-errors.test.ts`
- [ ] Unclosed delimiters (4 tests):
  - [ ] `{ x: 1` - missing `}`
  - [ ] `[1, 2` - missing `]`
  - [ ] `(a + b` - missing `)`
  - [ ] `"hello` - missing quote
- [ ] Missing keywords (4 tests):
  - [ ] `if x then y` - missing else
  - [ ] `match x` - missing cases
  - [ ] `let x` - missing = and value
  - [ ] `type T` - missing = and definition
- [ ] Invalid tokens (3 tests):
  - [ ] `let @x = 5` - @ invalid
  - [ ] `type T = #` - # invalid
  - [ ] `x $ y` - $ not an operator
- [ ] Mismatched delimiters (2 tests):
  - [ ] `{ x: [1, 2 }` - bracket mismatch
  - [ ] `(a + [b)]` - paren/bracket mismatch
- [ ] Missing separators (3 tests):
  - [ ] `let x = 1 let y = 2` - missing semicolon
  - [ ] `[1 2 3]` - missing commas
  - [ ] `{ x: 1 y: 2 }` - missing comma
- [ ] Invalid patterns (2 tests):
  - [ ] `match x { Some() =>` - missing body
  - [ ] `match x { | }` - empty case
- [ ] Type syntax errors (3 tests):
  - [ ] `type T = <` - incomplete generic
  - [ ] `List<Int` - unclosed generic
  - [ ] `(Int) ->` - incomplete function type
- [ ] Spread errors (3 tests):
  - [ ] `{...}` - spread without expression
  - [ ] `[...]` - spread without expression
  - [ ] `{..., x: 1}` - invalid syntax
- [ ] Verify error quality:
  - [ ] Check error messages are clear
  - [ ] Check line/column info accurate
  - [ ] Check suggestions when applicable
- [ ] Run tests: `npm test parser-errors.test.ts`

**Subtotal 4.2:** ~20 tests

### 4.3 Edge Case Tests

- [ ] Create `packages/core/src/parser/parser-edge-cases.test.ts`
- [ ] Deep nesting (4 tests):
  - [ ] 20+ nested expressions: `(((((...)))))`
  - [ ] 20+ nested types: `List<List<List<...>>>`
  - [ ] 20+ nested patterns: `Some(Some(Some(...)))`
  - [ ] Deep match nesting
- [ ] Large literals (4 tests):
  - [ ] 10KB+ string
  - [ ] Extreme scientific: `1e308`, `1e-308`
  - [ ] Long number: `1_000_000_000_000`
  - [ ] Deeply nested list: `[[[[[...]]]]]`
- [ ] Unicode edge cases (5 tests):
  - [ ] Emoji identifiers: `let 🚀 = 42`
  - [ ] Unicode math: `let π = 3.14`
  - [ ] RTL text in strings
  - [ ] Zero-width characters
  - [ ] Surrogate pairs: `"\u{1F600}"`
- [ ] Operator precedence (4 tests):
  - [ ] Complex chains: `a |> b >> c << d`
  - [ ] Mixed: `x + y * z |> f`
  - [ ] Double negation: `--x`
  - [ ] Deref vs NOT: `!!x`, `!x!`
- [ ] Ambiguous syntax (3 tests):
  - [ ] Empty braces: `{}`
  - [ ] Single expr: `{ x; }` vs `{ x: x }`
  - [ ] Generic vs comparison: `x<y>z`, `f<A>()`
- [ ] Run tests: `npm test parser-edge-cases.test.ts`

**Subtotal 4.3:** ~20 edge case tests (revised from 10)

**Total Phase 4:** ~60 tests (revised up from 50)

---

## Phase 5: Validation & Documentation

**Status:** 🔜 Not Started
**Goal:** Ensure quality and update docs

### 5.1 Quality Checks

- [ ] Run all tests: `npm test`
  - [ ] Verify target: ~395-405 tests pass
  - [ ] Review any failures
  - [ ] Check for flaky tests
  - [ ] Verify no regressions
- [ ] Run type checking: `npm run check`
  - [ ] Target: 0 TypeScript errors
  - [ ] Verify all types properly defined
  - [ ] Check exported types
- [ ] Run linting: `npm run lint`
  - [ ] Target: 0 ESLint errors
  - [ ] Fix any style issues
  - [ ] Verify code style consistency
- [ ] Run formatting: `npm run format`
  - [ ] Apply Prettier formatting
  - [ ] Verify no unexpected changes
- [ ] Run comprehensive check: `npm run verify`
  - [ ] All above checks in one command
  - [ ] Target: all passing

### 5.2 Parser Documentation

- [ ] Update `packages/core/src/parser/parser.ts` inline docs
  - [ ] Add JSDoc for new methods
  - [ ] Document spread parsing strategy
  - [ ] Document postfix ! disambiguation
  - [ ] Add spec line references
  - [ ] Explain complex logic sections

### 5.3 Design Documentation

- [ ] Create `.claude/design/parser-architecture.md`
  - [ ] Document disambiguation strategies:
    - [ ] Postfix ! vs prefix ! (context-based)
    - [ ] Block vs record with spreads (lookahead)
    - [ ] `>>` token splitting for generics
  - [ ] Explain precedence decisions
  - [ ] Note spread parsing approach
  - [ ] Document record AST design choice
  - [ ] Reference spec sections

### 5.4 Update CLAUDE.md

- [ ] Review CLAUDE.md for necessary updates
  - [ ] Follow Documentation Rules strictly
  - [ ] Only update stable architectural info
  - [ ] Do NOT add implementation status
  - [ ] Do NOT reference progress documents
- [ ] Update only if architectural changes warrant it
- [ ] Commit changes

### 5.5 Update Context Files

- [ ] Update `parser-completion-context.md`
  - [ ] Document final design decisions
  - [ ] Record spread syntax implementation notes
  - [ ] AST design rationale for re-exports
  - [ ] Any deviations from plan
  - [ ] Lessons learned
- [ ] Update `parser-completion-tasks.md` (this file)
  - [ ] Mark all tasks complete
  - [ ] Update "Last Updated" timestamp
  - [ ] Change status to "✅ Complete"
  - [ ] Add completion notes

### 5.6 Final Verification

- [ ] Verify 100% spec coverage
  - [ ] All spec features implemented
  - [ ] All features tested
  - [ ] No known gaps
- [ ] Review test count
  - [ ] Baseline: ~346 parser tests (CORRECTED from ~305)
  - [ ] Phase -1: 0 tests (preparation only)
  - [ ] Phase 0: ~25-30 tests (20 new + 5-10 migrated)
  - [ ] Phase 1: ~10 tests
  - [ ] Phase 2: ~15 tests
  - [ ] Phase 3: ~10 tests
  - [ ] Phase 4: ~60 tests
  - [ ] **Total new/updated: ~120-125 tests**
  - [ ] **Target: ~466-471 parser tests** (346 + 120-125)
  - [ ] **Target: ~1825-1830 total tests** (1705 + 120-125)
- [ ] Verify no regressions
  - [ ] All existing tests still pass
  - [ ] No behavior changes (except record syntax)
  - [ ] Parser API unchanged

---

## Summary Progress

### By Phase
- [x] Phase -1: Pre-Implementation Preparation ✅ COMPLETE (~2 hours)
- [x] Phase 0: Record Spread Migration ✅ COMPLETE (~4 hours, 19 tests)
- [x] Phase 1: List Spread ✅ COMPLETE (~30 minutes, 12 tests)
- [x] Phase 2: Postfix Deref ✅ COMPLETE (~45 minutes, 15 tests)
- [x] Phase 3: Re-exports ✅ COMPLETE (~45 minutes, 12 tests)
- [ ] Phase 4: Enhanced Tests (0/60 tests, MEDIUM RISK) - 3-4 hours
- [ ] Phase 5: Validation & Docs (0 tasks) - 1 hour

### Overall
- **Tests Added/Updated:** 58/~120-125 (48% complete)
- **Parser Tests:** 397/~466-471 (85% of target)
- **Total Tests:** 1763/~1825-1830 (96% of target)
- **Spec Coverage:** 100%/100% (core features) ✅
- **Status:** Phases 0-3 Complete ✅ - Ready for Phase 4 (Enhanced Tests)
- **Actual Time:** ~8 hours total (Phase -1: 2h, Phase 0: 4h, Phases 1-3: 2h)
- **Remaining:** Phase 4 (3-4h) + Phase 5 (1h) = 4-5h
- **Confidence:** 98% (all core features working)

---

## Implementation Order (Critical Path)

1. ~~**Phase -1**~~ - ✅ COMPLETE - Preparation (audit + error messages)
2. ~~**Phase 0**~~ - ✅ COMPLETE - Record spread (most risky, do early after prep)
3. ~~**Phase 1**~~ - ✅ COMPLETE - List spread (while in spread mindset)
4. ~~**Phase 2**~~ - ✅ COMPLETE - Postfix ! (independent, anytime)
5. ~~**Phase 3**~~ - ✅ COMPLETE - Re-exports (independent, anytime)
6. **Phase 4 NEXT** - Enhanced tests (after features work) ⬅️ START HERE
7. **Phase 5** - Validation (final check)

---

## Notes

- Mark items complete immediately upon finishing
- Update "Last Updated" timestamp when making changes
- Document blockers or issues as they arise
- Update context.md with key decisions
- Run tests after each phase to catch regressions early
- Phase 0 is critical - take time to do it right
- If blocked, document in context.md and seek guidance

---

## Risk Mitigation

### Phase 0 (High Risk)
- [ ] Review desugarer/type-checker usage before changing AST
- [ ] Implement behind feature flag if possible
- [ ] Test incrementally (one change at a time)
- [ ] Have rollback plan ready

### Phase 4 (Medium Risk - Test Volume)
- [ ] Write tests incrementally
- [ ] Run tests frequently
- [ ] Don't let test count intimidate - break into chunks
- [ ] Prioritize quality over quantity

---

## Finalized Decisions Summary

All critical decisions have been made by the user (2025-11-02):

| Decision | Choice | Status |
|----------|--------|--------|
| Record syntax | Use spec syntax (`{...r, f: v}`) | ✅ FINALIZED |
| Breaking change | Accept (pre-1.0) | ✅ FINALIZED |
| Spread semantics | JavaScript rightmost-wins | ✅ FINALIZED |
| RecordUpdate AST | Keep separate node | ✅ FINALIZED |
| **Multiple spread handling** | **Nested RecordUpdate nodes** | **✅ FINALIZED** |
| **Spread-only records** | **Allow `{...obj}` for shallow copy** | **✅ FINALIZED** |
| **ReExportDeclaration `exported` field** | **Remove it (redundant)** | **✅ FINALIZED** |
| **Pre-Phase 0 validation** | **Add Phase -1 for audit + error messages** | **✅ FINALIZED** |
| ReExportDeclaration AST | Create new node | ✅ FINALIZED |
| Multiple spreads allowed | Yes (via nesting) | ✅ FINALIZED |
| Empty spreads | Parse error with defined message | ✅ FINALIZED |

---

**Next Steps:** Begin Phase -1 - Comprehensive audit and error message definitions before implementation.
