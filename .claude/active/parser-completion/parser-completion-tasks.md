# Parser Completion - Task Checklist (REVISED)

**Created:** 2025-11-02
**Last Updated:** 2025-11-02
**Status:** Not Started
**Revision:** Critical findings incorporated, plan completely revised

## Overview

Task checklist for completing vibefun parser to 100% spec coverage.

**MAJOR CHANGES:**
- Phase 0 added (record spread migration) - CRITICAL
- Phase 1 changed (list spread, not refs)
- Phase 2 scope reduced (only postfix !, RefAssign already done)
- AST design decisions finalized
- ~100 new tests planned (was 85)

---

## Phase 0: Record Spread Syntax Migration (NEW - CRITICAL)

**Status:** 🔜 Not Started
**Goal:** Replace `{r | f: v}` with `{...r, f: v}` to match spec
**Risk:** HIGH - modifies existing working code

### 0.1 AST Design Decision

- [ ] Review current `RecordUpdate` AST structure
- [ ] Review how desugarer/type-checker use RecordUpdate
- [ ] Decide: Keep separate RecordUpdate vs merge into Record
  - Option 1: Keep `{ kind: "RecordUpdate"; base: Expr; updates: RecordField[] }`
  - Option 2: Merge `{ kind: "Record"; fields: RecordField[]; spread?: Expr }`
- [ ] Document decision in context.md
- [ ] Plan handling of multiple spreads: `{...a, ...b, x: 1}`

### 0.2 AST Implementation

- [ ] Modify AST structure in `packages/core/src/types/ast.ts`
- [ ] Update `RecordUpdate` or `Record` node as decided
- [ ] Support multiple spreads if decided
- [ ] Export types from index.ts
- [ ] Run type check: `npm run check`

### 0.3 Parser Implementation - Record Spread

- [ ] Read current `parseRecordExpr()` (lines 775-851)
- [ ] Identify all pipe-based record update logic to remove
- [ ] Design new parsing logic for spread syntax
- [ ] Implement spread detection:
  - [ ] Check for `DOT_DOT_DOT` token at start of record
  - [ ] Parse spread expression
  - [ ] Continue parsing remaining fields
  - [ ] Handle multiple spreads
- [ ] Implement disambiguation:
  - [ ] `{...x}` - record with spread only
  - [ ] `{...x, y: 1}` - record with spread and fields
  - [ ] `{x: 1}` - normal record construction (unchanged)
- [ ] Handle edge cases:
  - [ ] Empty spread: `{...}` - should error
  - [ ] Multiple spreads: `{...a, ...b, x: 1}`
  - [ ] Spread order: `{...a, x: 1, ...b}` - later overrides
- [ ] Add JSDoc comments explaining spread logic
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

- [ ] Create test section in expressions.test.ts
- [ ] Test basic spread:
  - [ ] `{...person, age: 31}`
  - [ ] `{...obj, field: value}`
- [ ] Test multiple fields:
  - [ ] `{...person, age: 31, name: "Bob"}`
  - [ ] `{...obj, a: 1, b: 2, c: 3}`
- [ ] Test multiple spreads:
  - [ ] `{...base, ...overrides}`
  - [ ] `{...a, ...b, x: 1}`
  - [ ] `{...a, x: 1, ...b}` - order matters
- [ ] Test spread only:
  - [ ] `{...obj}`
- [ ] Test nested:
  - [ ] `{...obj, nested: {...obj.nested, x: 1}}`
- [ ] Test precedence:
  - [ ] `{...a, x: 1, ...b}` - b.x overrides explicit x
  - [ ] `{...a, ...b, ...c}` - rightmost wins
- [ ] Test edge cases:
  - [ ] Spread with no fields after
  - [ ] Complex expressions in spread: `{...getObj(), x: 1}`
- [ ] Test errors:
  - [ ] `{...}` - empty spread (should error)
  - [ ] `{..., x: 1}` - comma before spread
- [ ] Run tests: `npm test expressions.test.ts`

**Subtotal Phase 0:** ~15 new tests + ~5-10 migrated tests

---

## Phase 1: List Spread in Expressions (NEW)

**Status:** 🔜 Not Started
**Goal:** Support `[1, 2, ...rest]` syntax from spec
**Risk:** LOW - AST already supports it

### 1.1 Parser Implementation - List Spread

- [ ] Read current list parsing (lines 1005-1028 in parser.ts)
- [ ] Verify `ListElement` AST supports spread (ast.ts line 26)
- [ ] Modify list parsing loop in `parsePrimary()`:
  - [ ] Before parsing each element, check for `DOT_DOT_DOT`
  - [ ] If found, consume `...` and parse expression
  - [ ] Create `{ kind: "Spread", expr }` element
  - [ ] Otherwise, create `{ kind: "Element", expr }` element
- [ ] Handle multiple spreads: `[...xs, ...ys]`
- [ ] Handle mixed: `[1, ...xs, 2]`
- [ ] Add JSDoc comments
- [ ] Run type check: `npm run check`

### 1.2 List Spread Testing

- [ ] Create test section in expressions.test.ts
- [ ] Test basic spread:
  - [ ] `[1, 2, ...rest]`
  - [ ] `[...items]`
- [ ] Test multiple spreads:
  - [ ] `[...xs, ...ys]`
  - [ ] `[...a, ...b, ...c]`
- [ ] Test mixed:
  - [ ] `[1, ...middle, 5]`
  - [ ] `[...start, 1, 2, ...end]`
- [ ] Test nested:
  - [ ] `[[...inner]]`
  - [ ] `[...[1, 2, 3]]` - spread of literal
- [ ] Test in expressions:
  - [ ] `[...xs] |> map(f)`
  - [ ] `match [...xs] { ... }`
- [ ] Test edge cases:
  - [ ] Spread only: `[...items]`
  - [ ] Multiple consecutive: `[...a, ...b, ...c]`
  - [ ] Complex expr: `[...getList(), 1]`
- [ ] Test errors:
  - [ ] `[...]` - empty spread (should error)
- [ ] Run tests: `npm test expressions.test.ts`

**Subtotal Phase 1:** ~10 tests

---

## Phase 2: Postfix Dereference Operator (REVISED)

**Status:** 🔜 Not Started
**Goal:** Implement `expr!` for dereference
**Risk:** LOW - clean addition

**CORRECTIONS FROM ORIGINAL PLAN:**
- ❌ RefAssign already implemented - NO WORK NEEDED
- ❌ ref() function already works - NO WORK NEEDED
- ✅ Only postfix ! needs implementation

### 2.1 AST Verification

- [ ] Verify `UnaryOp` with `op: "Deref"` exists (ast.ts line 138)
- [ ] Verify type is exported
- [ ] No AST changes needed

### 2.2 Parser Implementation - Postfix Bang

- [ ] Read current `parseCall()` method (lines 531-575)
- [ ] Add postfix BANG handling after DOT clause:
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
- [ ] Verify loops back for chaining: `x!!` works
- [ ] Test precedence with prefix NOT: `!x!` vs `x!!`
- [ ] Add JSDoc comments
- [ ] Run type check: `npm run check`

### 2.3 Postfix Deref Testing

- [ ] Create test section in expressions.test.ts
- [ ] Test simple deref:
  - [ ] `x!`
  - [ ] `counter!`
- [ ] Test chained:
  - [ ] `x!!` - double deref
  - [ ] `x!!!` - triple deref
- [ ] Test after access:
  - [ ] `obj.field!`
  - [ ] `record.ref!`
- [ ] Test after call:
  - [ ] `getRef()!`
  - [ ] `f(x)!`
- [ ] Test in operators:
  - [ ] `x! + 1`
  - [ ] `x! * 2`
  - [ ] `x! == y!`
- [ ] Test in control flow:
  - [ ] `if x! then y else z`
  - [ ] `match x! { ... }`
- [ ] Test precedence:
  - [ ] `!x!` - NOT of deref (postfix binds first)
  - [ ] `-x!` - negate of deref
  - [ ] `x! + y!` - deref before add
- [ ] Test with RefAssign:
  - [ ] `x := y!` - assign deref value
  - [ ] `x! := 5` - ERROR (type checker should catch, parser allows)
- [ ] Test complex:
  - [ ] `(obj.getRef())! + 5`
  - [ ] `(if cond then ref1 else ref2)!`
- [ ] Run tests: `npm test expressions.test.ts`

**Subtotal Phase 2:** ~15 tests

---

## Phase 3: Re-exports with ReExportDeclaration (REVISED)

**Status:** 🔜 Not Started
**Goal:** Support `export { x } from "module"` with clean AST
**Risk:** LOW - new feature, clean design

**DECISION:** Use new `ReExportDeclaration` node (not extending ExportDeclaration)

### 3.1 AST Implementation - ReExportDeclaration

- [ ] Add new type in `packages/core/src/types/ast.ts`:
  ```typescript
  export type ReExportDeclaration = {
      kind: "ReExportDecl";
      items: ImportItem[] | null;  // null for export *
      from: string;
      exported: boolean;  // always true
      loc: Location;
  };
  ```
- [ ] Update `Declaration` type union to include `ReExportDeclaration`
- [ ] Export from index.ts
- [ ] Run type check: `npm run check`

### 3.2 Parser Implementation - Re-exports

- [ ] Read current export parsing in `parseDeclaration()`
- [ ] Design re-export detection strategy:
  - After parsing `export { items }` or `export *`
  - Check for `from` keyword
  - If present, it's a re-export not a regular export
- [ ] Implement re-export parsing:
  - [ ] Named: `export { x, y } from "./mod"`
  - [ ] Aliased: `export { x as y } from "./mod"`
  - [ ] Namespace: `export * from "./mod"`
  - [ ] Type: `export { type T } from "./mod"`
  - [ ] Mixed: `export { type T, value } from "./mod"`
- [ ] Create `ReExportDeclaration` AST node
- [ ] Handle errors:
  - [ ] Missing module path after `from`
  - [ ] Invalid module path (not string)
- [ ] Add JSDoc comments
- [ ] Run type check: `npm run check`

### 3.3 Re-export Testing

- [ ] Add tests to `packages/core/src/parser/declarations.test.ts`
- [ ] Test named re-exports:
  - [ ] `export { x } from "./mod"`
  - [ ] `export { x, y, z } from "./mod"`
- [ ] Test aliased:
  - [ ] `export { x as y } from "./mod"`
  - [ ] `export { x as a, y as b } from "./mod"`
- [ ] Test namespace:
  - [ ] `export * from "./mod"`
  - [ ] `export * from "../parent/mod"`
- [ ] Test type re-exports:
  - [ ] `export { type T } from "./types"`
  - [ ] `export { type T, type U } from "./types"`
- [ ] Test mixed:
  - [ ] `export { type T, value } from "./mod"`
  - [ ] `export { type T, type U, a, b } from "./mod"`
- [ ] Test edge cases:
  - [ ] Empty: `export {} from "./mod"` (valid)
  - [ ] Relative paths: `../`, `./`, `../../`
- [ ] Test errors:
  - [ ] Missing from: `export { x } "./mod"` (missing from keyword)
  - [ ] Missing path: `export { x } from`
  - [ ] Invalid path: `export { x } from 123` (not string)
- [ ] Run tests: `npm test declarations.test.ts`

**Subtotal Phase 3:** ~10 tests

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
  - [ ] Target: ~395-405 total tests
  - [ ] Phase 0: ~20 tests (15 new + 5 migrated)
  - [ ] Phase 1: ~10 tests
  - [ ] Phase 2: ~15 tests
  - [ ] Phase 3: ~10 tests
  - [ ] Phase 4: ~60 tests
  - [ ] **Total new/updated: ~115 tests**
  - [ ] **Grand total: ~420 tests**
- [ ] Verify no regressions
  - [ ] All existing tests still pass
  - [ ] No behavior changes (except record syntax)
  - [ ] Parser API unchanged

---

## Summary Progress

### By Phase
- [ ] Phase 0: Record Spread Migration (0/20 tests, HIGH RISK)
- [ ] Phase 1: List Spread (0/10 tests, LOW RISK)
- [ ] Phase 2: Postfix Deref (0/15 tests, LOW RISK)
- [ ] Phase 3: Re-exports (0/10 tests, LOW RISK)
- [ ] Phase 4: Enhanced Tests (0/60 tests, MEDIUM RISK)
- [ ] Phase 5: Validation & Docs (0 tasks)

### Overall
- **Tests Added/Updated:** 0/~115
- **Total Tests:** ~305/~420
- **Spec Coverage:** 96%/100%
- **Status:** 🔜 Not Started
- **Estimated Time:** 10-15 hours

---

## Implementation Order (Critical Path)

1. **Phase 0 FIRST** - Record spread (most risky, do early)
2. **Phase 1** - List spread (while in spread mindset)
3. **Phase 2** - Postfix ! (independent, anytime)
4. **Phase 3** - Re-exports (independent, anytime)
5. **Phase 4** - Enhanced tests (after features work)
6. **Phase 5** - Validation (final check)

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

**Next Steps:** Begin Phase 0 - Review AST and decide on record spread design.
