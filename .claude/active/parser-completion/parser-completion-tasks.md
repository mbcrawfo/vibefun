# Parser Completion - Task Checklist

**Created:** 2025-11-02
**Last Updated:** 2025-11-02
**Status:** Not Started

## Overview

Task checklist for completing vibefun parser to 100% spec coverage.

Target: Add ref operations, re-exports, and enhanced test coverage.

---

## Phase 1: Ref Types & Operations

**Status:** 🔜 Not Started
**Goal:** Full mutable reference support (ref, !, :=)

### 1.1 AST Node Updates

- [ ] Read current AST definitions in `packages/core/src/types/ast.ts`
- [ ] Verify if `AssignExpr` exists (for `:=` operator)
- [ ] Add `RefExpr` node (if needed - may be just function call)
- [ ] Add `DerefExpr` node for postfix `!`
- [ ] Update `Expr` type union to include new nodes
- [ ] Ensure types are exported from index.ts
- [ ] Run type check: `npm run check`

### 1.2 Parser Implementation

- [ ] Read current postfix parsing in `parsePostfixExpression()`
- [ ] Read current unary parsing in `parseUnaryExpression()`
- [ ] Verify `:=` operator parsing in `parseBinaryExpression()`
- [ ] Implement postfix `!` parsing for dereference
  - [ ] Add after `.` access and `[]` indexing
  - [ ] Handle chaining: `x!!`, `obj.field!`
- [ ] Test `ref()` parsing (should already work as function call)
- [ ] Verify `:=` precedence (should be 1, right-associative)
- [ ] Add JSDoc comments for new/modified methods
- [ ] Run type check: `npm run check`

### 1.3 Ref Operations Testing

- [ ] Create `packages/core/src/parser/ref-operations.test.ts`
- [ ] Test ref creation:
  - [ ] `ref(42)`
  - [ ] `ref("hello")`
  - [ ] `ref({ x: 1, y: 2 })`
  - [ ] `ref([1, 2, 3])`
  - [ ] Nested: `ref(ref(5))`
- [ ] Test dereference:
  - [ ] Simple: `x!`
  - [ ] Field access: `person.age!`
  - [ ] Chained: `getRef()!`
  - [ ] Double: `doubleRef!!`
  - [ ] Array: `array[0]!`
- [ ] Test assignment:
  - [ ] Simple: `x := 10`
  - [ ] Field: `obj.field := value`
  - [ ] Index: `array[i] := x`
  - [ ] Chained: `x := y := 0`
- [ ] Test combinations:
  - [ ] `(ref(5))! + 10`
  - [ ] `x! * 2`
  - [ ] `if x! > 0 then ...`
  - [ ] `match x! { ... }`
- [ ] Test precedence:
  - [ ] `!x!` (NOT of deref)
  - [ ] `x! + y` (deref before add)
  - [ ] `x := y + z` (add before assign)
- [ ] Run tests: `npm test ref-operations.test.ts`

**Subtotal:** ~25 tests

---

## Phase 2: Re-exports

**Status:** 🔜 Not Started
**Goal:** Support `export { x } from "module"` syntax

### 2.1 AST Design Decision

- [ ] Review current `ExportDeclaration` in ast.ts
- [ ] Review how desugarer/type-checker use exports
- [ ] Decide: Extend ExportDeclaration vs new ReExportDeclaration
- [ ] Document decision in context.md

### 2.2 AST Implementation

- [ ] Implement chosen AST structure
- [ ] Update `Declaration` type union if needed
- [ ] Export new types from index.ts
- [ ] Run type check: `npm run check`

### 2.3 Parser Implementation

- [ ] Read current `parseExport()` method
- [ ] Modify to check for `from` keyword after export items
- [ ] Parse module path after `from`
- [ ] Handle named re-exports: `export { x, y } from "mod"`
- [ ] Handle aliased re-exports: `export { x as y } from "mod"`
- [ ] Handle namespace re-exports: `export * from "mod"`
- [ ] Handle type re-exports: `export { type T } from "mod"`
- [ ] Handle mixed re-exports: `export { type T, val } from "mod"`
- [ ] Add JSDoc comments
- [ ] Run type check: `npm run check`

### 2.4 Re-export Testing

- [ ] Add tests to `packages/core/src/parser/declarations.test.ts`
- [ ] Test named re-exports:
  - [ ] `export { x } from "./mod"`
  - [ ] `export { x, y, z } from "./mod"`
- [ ] Test aliased re-exports:
  - [ ] `export { x as y } from "./mod"`
  - [ ] `export { x as a, y as b } from "./mod"`
- [ ] Test namespace re-exports:
  - [ ] `export * from "./mod"`
  - [ ] `export * from "../parent/mod"`
- [ ] Test type re-exports:
  - [ ] `export { type T } from "./types"`
  - [ ] `export { type T, type U } from "./types"`
- [ ] Test mixed re-exports:
  - [ ] `export { type T, value } from "./mod"`
- [ ] Test error cases:
  - [ ] Missing from: `export { x } "mod"` (missing from keyword)
  - [ ] Missing path: `export { x } from`
  - [ ] Invalid path: `export { x } from 123`
- [ ] Run tests: `npm test declarations.test.ts`

**Subtotal:** ~10 tests

---

## Phase 3: Enhanced Test Coverage

**Status:** 🔜 Not Started
**Goal:** Add integration, error recovery, and edge case tests

### 3.1 Integration Tests

- [ ] Expand `packages/core/src/parser/parser-integration.test.ts`
- [ ] Test refs with pattern matching:
  - [ ] `match userRef! { ... }`
  - [ ] Refs in nested patterns
- [ ] Test pipes with composition:
  - [ ] `data |> f >> g >> h`
  - [ ] Complex pipelines with refs
- [ ] Test module combinations:
  - [ ] File with imports, exports, and re-exports
  - [ ] Multiple import styles in one file
- [ ] Test external blocks:
  - [ ] Large external block with types and overloads
  - [ ] Multiple external blocks in one file
- [ ] Test complex programs:
  - [ ] Counter with refs (50+ lines)
  - [ ] List processing with pipes (50+ lines)
  - [ ] API wrapper with externals (50+ lines)
  - [ ] Module system example (multiple declarations)
- [ ] Run tests: `npm test parser-integration.test.ts`

**Subtotal:** ~20 tests

### 3.2 Error Recovery Tests

- [ ] Expand `packages/core/src/parser/parser-errors.test.ts`
- [ ] Test unclosed delimiters:
  - [ ] `{ x: 1` (missing `}`)
  - [ ] `[1, 2` (missing `]`)
  - [ ] `(a + b` (missing `)`)
  - [ ] `"hello` (missing `"`)
- [ ] Test missing keywords:
  - [ ] `if x then y` (no else)
  - [ ] `match x` (no cases)
  - [ ] `let x` (no = or value)
  - [ ] `type T` (no = or definition)
- [ ] Test invalid tokens:
  - [ ] `let @x = 5` (@ not valid)
  - [ ] `type T = #` (# not valid)
  - [ ] `let x = 1 $ 2` ($ not valid operator)
- [ ] Test mismatched brackets:
  - [ ] `{ x: [1, 2 }` (bracket mismatch)
  - [ ] `(a + [b)]` (bracket mismatch)
- [ ] Test missing separators:
  - [ ] `let x = 1 let y = 2` (no semicolon)
  - [ ] `[1 2 3]` (no commas)
  - [ ] `{ x: 1 y: 2 }` (no comma)
- [ ] Test invalid patterns:
  - [ ] `match x { Some() =>` (no body)
  - [ ] `match x { | }` (no pattern)
- [ ] Test type syntax errors:
  - [ ] `type T = <` (incomplete generic)
  - [ ] `List<Int` (unclosed generic)
  - [ ] `(Int) -> ` (incomplete function type)
- [ ] Verify error quality:
  - [ ] Check error messages are helpful
  - [ ] Check line/column info is accurate
  - [ ] Check suggestions when applicable
- [ ] Run tests: `npm test parser-errors.test.ts`

**Subtotal:** ~20 tests

### 3.3 Edge Case Tests

- [ ] Create `packages/core/src/parser/parser-edge-cases.test.ts`
- [ ] Test deep nesting:
  - [ ] 20+ nested expressions: `(((((...))))`
  - [ ] 20+ nested types: `List<List<List<...>>>`
  - [ ] 20+ nested patterns: `Some(Some(Some(...)))`
  - [ ] Deep match nesting
- [ ] Test large literals:
  - [ ] Very long string (10KB+)
  - [ ] Large number: `1e308`
  - [ ] Long number with separators: `1_000_000_000_000`
  - [ ] Deeply nested list: `[[[[[...]]]]]`
- [ ] Test unicode edge cases:
  - [ ] Emoji identifiers: `let 🚀 = 42`
  - [ ] Unicode math: `let π = 3.14`
  - [ ] RTL text in strings
  - [ ] Zero-width characters
  - [ ] Surrogate pairs: `\u{1F600}`
- [ ] Test operator precedence:
  - [ ] `a |> b >> c << d`
  - [ ] `x + y * z |> f`
  - [ ] `--x` (double negation)
  - [ ] `!!x` (double NOT/deref)
- [ ] Test ambiguous syntax:
  - [ ] `{}` (empty block or record?)
  - [ ] `{ x }` (block with variable or shorthand record?)
  - [ ] `x<y>z` (comparison or generic?)
  - [ ] `f<A>()` (generic call)
- [ ] Run tests: `npm test parser-edge-cases.test.ts`

**Subtotal:** ~10 tests

---

## Phase 4: Validation & Documentation

**Status:** 🔜 Not Started
**Goal:** Ensure quality and update docs

### 4.1 Quality Checks

- [ ] Run all tests: `npm test`
  - [ ] Verify all ~370+ tests pass
  - [ ] Check for any regressions
  - [ ] Review test output
- [ ] Run type checking: `npm run check`
  - [ ] No TypeScript errors
  - [ ] All types properly defined
- [ ] Run linting: `npm run lint`
  - [ ] No ESLint errors
  - [ ] Code follows style guide
- [ ] Run formatting: `npm run format`
  - [ ] All code properly formatted
  - [ ] No Prettier changes needed
- [ ] Run comprehensive check: `npm run verify`
  - [ ] All above checks pass

### 4.2 Documentation

- [ ] Review CLAUDE.md
  - [ ] Check if parser section needs updates (per Documentation Rules)
  - [ ] Update ONLY if stable architectural changes
  - [ ] Do NOT add implementation status
- [ ] Create `.claude/design/parser-architecture.md` (if useful)
  - [ ] Document disambiguation strategies
  - [ ] Explain `!` operator handling
  - [ ] Explain `{}` disambiguation
  - [ ] Document `>>` token splitting
  - [ ] Note precedence decisions
- [ ] Update parser inline comments
  - [ ] Add JSDoc for new methods
  - [ ] Document tricky logic
  - [ ] Add spec references where relevant
- [ ] Update this task file
  - [ ] Mark all tasks complete
  - [ ] Update "Last Updated" timestamp
  - [ ] Change status to "✅ Complete"

### 4.3 Final Validation

- [ ] Review all changes
  - [ ] No breaking changes to existing code
  - [ ] All additions are properly tested
  - [ ] Code quality meets standards
- [ ] Count total tests added
  - [ ] Ref operations: ~25
  - [ ] Re-exports: ~10
  - [ ] Integration: ~20
  - [ ] Error recovery: ~20
  - [ ] Edge cases: ~10
  - [ ] **Total new: ~85 tests**
  - [ ] **Grand total: ~390 tests**
- [ ] Verify 100% spec coverage
  - [ ] All spec features implemented
  - [ ] All features tested
  - [ ] No known gaps

---

## Summary Progress

### By Phase
- [ ] Phase 1: Ref Types & Operations (0/25 tests)
- [ ] Phase 2: Re-exports (0/10 tests)
- [ ] Phase 3: Enhanced Test Coverage (0/50 tests)
- [ ] Phase 4: Validation & Documentation (0 tasks)

### Overall
- **Tests Added:** 0/85
- **Total Tests:** ~305/~390
- **Spec Coverage:** 98%/100%
- **Status:** 🔜 Not Started

---

## Notes

- Mark items complete immediately upon finishing
- Update "Last Updated" timestamp when making changes
- Document blockers or issues as they arise
- Update context.md with key decisions

---

**Next Steps:** Begin Phase 1 - Read AST definitions and plan ref operation implementation.
