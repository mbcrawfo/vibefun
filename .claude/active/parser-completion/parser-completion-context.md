# Parser Completion - Context & Key Files

**Created:** 2025-11-02
**Last Updated:** 2025-11-02

## Overview

This document tracks key files, decisions, and context for completing the vibefun parser implementation to achieve 100% spec coverage.

## Key Files

### Primary Implementation Files

#### Parser Core
- **`packages/core/src/parser/parser.ts`** (main parser implementation)
  - ~1500 lines of TypeScript
  - Recursive descent parser
  - Handles all language constructs
  - Key methods:
    - `parseExpression()` - entry point for expressions
    - `parseBinaryExpression()` - operator precedence climbing
    - `parsePostfixExpression()` - postfix operators (., [], ())
    - `parseUnaryExpression()` - prefix operators (!, -)
    - `parseExport()` - export declarations
    - `parseDeclaration()` - top-level declarations

#### AST Definitions
- **`packages/core/src/types/ast.ts`** (AST node type definitions)
  - Defines all AST node types
  - Uses discriminated unions for type safety
  - BaseNode includes location info for error messages
  - Need to add: RefExpr, DerefExpr (verify AssignExpr exists)

#### Parser Entry Point
- **`packages/core/src/parser/index.ts`** (public API exports)
  - Exports Parser class and parse function
  - Re-exports AST types

### Test Files

#### Existing Tests (~305 tests)
- **`packages/core/src/parser/parser.test.ts`** - Basic parser tests
- **`packages/core/src/parser/expressions.test.ts`** - Expression parsing (~120 tests)
- **`packages/core/src/parser/patterns.test.ts`** - Pattern matching (~45 tests)
- **`packages/core/src/parser/types.test.ts`** - Type expressions (~35 tests)
- **`packages/core/src/parser/declarations.test.ts`** - Declarations (~50 tests)
- **`packages/core/src/parser/overloading.test.ts`** - External overloading (~10 tests)
- **`packages/core/src/parser/parser-errors.test.ts`** - Error handling (~20 tests)
- **`packages/core/src/parser/parser-integration.test.ts`** - Integration tests (~25 tests)

#### New Test Files to Create
- **`packages/core/src/parser/ref-operations.test.ts`** - Ref type operations (~25 tests)
- **`packages/core/src/parser/parser-edge-cases.test.ts`** - Edge cases (~10 tests)

#### Test Files to Expand
- **`parser-errors.test.ts`** - Add ~20 more error recovery tests
- **`parser-integration.test.ts`** - Add ~20 more integration tests
- **`declarations.test.ts`** - Add ~10 re-export tests

### Related Files

#### Lexer
- **`packages/core/src/lexer/lexer.ts`** - Tokenization
  - Already handles all operators including `:=` and `!`
  - Recognizes `ref` keyword
  - No changes needed for this task

#### Type System
- **`packages/core/src/types/type.ts`** - Type system definitions
  - Includes `Ref<T>` type definition
  - Used by type checker, not parser

#### Specification
- **`vibefun-spec.md`** - Language specification (root)
  - Source of truth for language features
  - Sections relevant to parser:
    - Lexical Structure (lines 76-276)
    - Type System (lines 278-605)
    - Expressions (lines 607-725)
    - Functions (lines 727-841)
    - Pattern Matching (lines 843-958)
    - Modules (lines 960-1035)
    - JavaScript Interop (lines 1037-1272)

## Design Decisions

### Ref Operations Implementation

#### Decision: How to parse `!` operator

**Challenge:** The `!` operator has two meanings:
1. Prefix logical NOT: `!true` → `false`
2. Postfix dereference: `ref!` → value

**Decision:** Context-based parsing
- Prefix position → Logical NOT
- Postfix position → Dereference

**Implementation:**
- `parseUnaryExpression()` handles prefix `!`
- `parsePostfixExpression()` handles postfix `!`
- Higher precedence for postfix prevents ambiguity

**Examples:**
```vibefun
!x        // LogicalNot(Var("x"))
x!        // Deref(Var("x"))
!!x       // LogicalNot(Deref(Var("x")))
!(!x)     // LogicalNot(LogicalNot(Var("x")))
```

#### Decision: How to parse `ref(value)`

**Decision:** Parse as regular function call
- `ref` is just an identifier
- Parser treats it like any function call
- Type checker gives it special meaning

**Rationale:**
- No special syntax needed
- Consistent with functional style
- Simpler parser logic

#### Decision: Assignment operator `:=`

**Implementation:** Binary operator at precedence level 1 (lowest)
- Right-associative
- Lower than pipe operator

**Note:** Likely already implemented - need to verify.

### Re-export Implementation

#### Decision: AST representation

**Option A:** Extend ExportDeclaration
```typescript
interface ExportDeclaration {
    type: 'ExportDeclaration';
    declaration: Declaration | null;
    exportItems?: ImportItem[];
    from?: string;
}
```

**Option B:** Separate ReExportDeclaration
```typescript
interface ReExportDeclaration {
    type: 'ReExportDeclaration';
    items: ImportItem[] | null;  // null for *
    from: string;
}
```

**Decision:** TBD during implementation
- Option A: Simpler, fewer node types
- Option B: Clearer separation of concerns

**Rationale:** Check how downstream code (desugarer, type checker) handles exports.

#### Decision: Re-export syntax support

Support all these forms:
```vibefun
export { x, y } from "./mod"           // Named
export { x as y } from "./mod"         // Aliased
export * from "./mod"                  // Namespace
export { type T } from "./mod"         // Type
export { type T, value } from "./mod"  // Mixed
```

### Test Strategy

#### Integration Tests Philosophy

**Goal:** Test realistic programs, not just isolated features

**Approach:**
- 50-100 line programs
- Combine multiple features
- Real-world patterns (counters, list processing, API wrappers)

**Examples:**
- State management with refs
- Module systems with re-exports
- Pipeline composition
- External API bindings

#### Error Recovery Philosophy

**Goal:** Ensure helpful error messages

**Approach:**
- Test common mistakes
- Verify error location accuracy
- Check error message quality
- No need for parser to "recover" (continue parsing after error)

**Current behavior:** Parser throws on first error (acceptable)

#### Edge Case Philosophy

**Goal:** Ensure parser handles extreme inputs gracefully

**Approach:**
- Deep nesting (stress test recursion)
- Large inputs (stress test performance)
- Unicode edge cases (stress test string handling)
- Ambiguous syntax (stress test disambiguation)

## Audit Results Summary

From comprehensive parser audit (2025-11-02):

### Coverage Statistics
| Category | Features | Implemented | Tested | Coverage |
|----------|----------|-------------|---------|----------|
| Lexical | 8 | 8 | 8 | 100% |
| Expressions | 35 | 34 | 34 | 97% |
| Functions | 7 | 7 | 7 | 100% |
| Patterns | 9 | 9 | 9 | 100% |
| Types | 12 | 12 | 12 | 100% |
| Modules | 7 | 6 | 6 | 86% |
| Interop | 7 | 7 | 7 | 100% |
| **TOTAL** | **85** | **83** | **83** | **~98%** |

### Missing Features (Pre-Implementation)
1. ✗ Ref operations (ref, !, :=)
2. ✗ Re-exports (`export { x } from "mod"`)
3. ⚠️ Enhanced test coverage

### Parser Quality Assessment
- **Code Quality:** Excellent
- **Test Coverage:** Comprehensive (~305 tests)
- **Error Handling:** Robust with location info
- **Maintainability:** Well-structured, commented
- **Performance:** Good (no benchmarks yet)

## Open Questions

### Question 1: Ref operator syntax
**Q:** Is dereference `!` prefix or postfix?
**A:** Based on spec examples (`counter!`), it's postfix.

### Question 2: Assignment in expressions
**Q:** Can `:=` be used in expression context or only statements?
**A:** Check spec - likely expression (everything is an expression in vibefun).

### Question 3: Re-export namespace imports
**Q:** Does `export * from "mod"` include types?
**A:** Need to check spec or decide based on JavaScript behavior.

### Question 4: Dereference chaining
**Q:** Is `x!!` valid (double deref)?
**A:** Should be, if x is a ref to a ref. Parser should support it.

## Dependencies

### No Breaking Changes
- All changes are additive
- No modifications to existing AST nodes
- No changes to existing parser logic
- Only additions: new nodes, new parsing paths, new tests

### Downstream Impact
These components may need updates after parser changes:
1. **Desugarer** (`packages/core/src/desugarer/`) - Handle new AST nodes
2. **Type Checker** (`packages/core/src/type-checker/`) - Type check refs, re-exports
3. **Code Generator** - Generate JavaScript for refs

**Note:** This task focuses ONLY on parser. Downstream updates are separate tasks.

## References

### Specification Sections
- **Ref Types:** Lines 256-262, 1487 (operators), type system mentions
- **Re-exports:** Lines 1005-1011 (modules section)
- **Pattern Matching:** Lines 843-958
- **JavaScript Interop:** Lines 1037-1272

### Similar Languages
- **OCaml:** `ref`, `!`, `:=` operators (similar semantics)
- **F#:** Ref cells with similar syntax
- **Rust:** Deref operator (different semantics but similar syntax)

### Code Style
Follow `.claude/CODING_STANDARDS.md`:
- No `any` types
- Explicit return types
- Functional style preferred
- Comprehensive tests
- JSDoc for public APIs

## Progress Tracking

Track progress in `parser-completion-tasks.md`.

Update this file when:
- Key decisions are made
- New questions arise
- Significant context discovered
- Approach changes

Keep this file up-to-date throughout implementation.
