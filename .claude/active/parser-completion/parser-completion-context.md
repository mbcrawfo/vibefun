# Parser Completion - Context & Key Files (REVISED)

**Created:** 2025-11-02
**Last Updated:** 2025-11-02 (Deep Analysis + User Decisions)
**Revision:** Critical findings incorporated, all decisions finalized

## Overview

This document tracks key files, decisions, and context for completing the vibefun parser implementation to achieve 100% spec coverage.

**CRITICAL UPDATE:** Deep analysis revealed major discrepancies between spec and parser. Plan has been significantly revised.

## Critical Findings Summary

### 🚨 Syntax Mismatch Found
**Record Update Syntax:**
- **Spec:** `{ ...person, age: 31 }` (spread syntax)
- **Parser:** `{ person | age: 31 }` (pipe syntax)
- **Resolution:** Migrate parser to spec syntax
- **Impact:** HIGH - requires rewriting existing code

### Missing Features
1. **List spread** - `[1, 2, ...rest]` - in spec, not parser
2. **Postfix deref** - `expr!` - in spec, not parser

### Incorrect Plan Assumptions
- ❌ **RefAssign (`:=`)** - Plan assumed needs work, but ALREADY DONE
- ❌ **ref() function** - Plan proposed special handling, but works as normal call

## Key Files

### Primary Implementation Files

#### Parser Core
- **`packages/core/src/parser/parser.ts`** (main parser implementation)
  - ~2167 lines of TypeScript
  - Recursive descent parser
  - Handles all language constructs
  - **Key methods to modify:**
    - `parseRecordExpr()` - Lines 775-851 - REWRITE for spread syntax
    - `parsePrimary()` - Lines 1005-1028 - ADD list spread support
    - `parseCall()` - Lines 531-575 - ADD postfix ! handling
    - `parseDeclaration()` - Modify for re-exports

#### AST Definitions
- **`packages/core/src/types/ast.ts`** (AST node type definitions)
  - Current structures:
    - `RecordUpdate` - may need modification for spread
    - `ListElement` - ALREADY supports spread! (line 26)
    - `UnaryOp` with `Deref` - ALREADY exists (line 138)
    - `BinaryOp` with `RefAssign` - ALREADY exists (line 130)
  - Need to add:
    - `ReExportDeclaration` - new node for re-exports
  - Update:
    - `Declaration` union to include `ReExportDeclaration`
    - Possibly `Record` or `RecordUpdate` for spread syntax

#### Parser Entry Point
- **`packages/core/src/parser/index.ts`** (public API exports)
  - Exports Parser class and parse function
  - Re-exports AST types
  - Will need to export new `ReExportDeclaration`

### Test Files

#### Existing Tests (~346 tests) - CORRECTED BASELINE
- **`packages/core/src/parser/parser.test.ts`** - Basic parser tests
- **`packages/core/src/parser/expressions.test.ts`** - Expression parsing (~120 tests)
  - **NEEDS UPDATES:** Record tests using pipe syntax must convert to spread
- **`packages/core/src/parser/patterns.test.ts`** - Pattern matching (~45 tests)
- **`packages/core/src/parser/types.test.ts`** - Type expressions (~35 tests)
- **`packages/core/src/parser/declarations.test.ts`** - Declarations (~50 tests)
  - Will add re-export tests here
- **`packages/core/src/parser/overloading.test.ts`** - External overloading (~10 tests)
- **`packages/core/src/parser/parser-errors.test.ts`** - Error handling (~20 tests)
  - Will expand significantly
- **`packages/core/src/parser/parser-integration.test.ts`** - Integration tests (~25 tests)
  - Will expand significantly

#### New Test Files to Create
- **`packages/core/src/parser/parser-edge-cases.test.ts`** - Edge cases (~10 tests)

### Related Files

#### Lexer
- **`packages/core/src/lexer/lexer.ts`** - Tokenization
  - Already handles `DOT_DOT_DOT` token (verified)
  - Already handles `BANG` token
  - Already handles `COLON_EQ` token for `:=`
  - No lexer changes needed

#### Type System
- **`packages/core/src/types/type.ts`** - Type system definitions
  - Includes `Ref<T>` type definition
  - Used by type checker, not parser

#### Specification
- **`vibefun-spec.md`** - Language specification (root)
  - Source of truth for language features
  - Key sections:
    - Lines 404-407: Record spread syntax `{...r, f: v}`
    - Lines 687-689: List spread syntax `[1, 2, ...rest]`
    - Lines 256-263, 1554: Ref operations (!x, :=)
    - Lines 1005-1011: Re-exports

## Design Decisions

### Phase 0: Record Spread Syntax (CRITICAL DECISION - ALL FINALIZED)

#### Decision: Which syntax to use?
**Question:** Spec shows `{...r, f: v}`, parser has `{r | f: v}`. Which to use?
**Answer:** ✅ FINALIZED - Use spec syntax (spread)
**Rationale:** Spec is source of truth, spread syntax more familiar to JS developers

#### Decision: Handle breaking change?
**Question:** Changing syntax breaks existing code. How to handle?
**Answer:** ✅ FINALIZED - Accept breaking change (pre-1.0)
**Rationale:** Pre-1.0 allows breaking changes, simplest approach

#### Decision: AST structure for record spread
**Options:**
1. Keep `RecordUpdate` separate, modify parsing ✅ CHOSEN
2. Merge into `Record` with optional spread field ❌ REJECTED

**Answer:** ✅ FINALIZED - Option 1 (keep separate)
**Rationale:** Cleaner separation of concerns
- `Record` for construction: `{ x: 1, y: 2 }`
- `RecordUpdate` for updates: `{ ...base, x: 1 }`
- Parser distinguishes by presence of spread

**Final structure:**
```typescript
// Keep these separate (FINALIZED)
{ kind: "Record"; fields: RecordField[]; loc: Location }
{ kind: "RecordUpdate"; base: Expr; updates: RecordField[]; loc: Location }
```

#### Decision: Multiple spread semantics
**Question:** `{...a, ...b, x: 1}` - is this valid? What semantics?
**Answer:** ✅ FINALIZED - JavaScript semantics (rightmost wins)
**Rationale:**
- Multiple spreads allowed
- Later spreads/fields override earlier ones
- Order matters: `{...a, x: 1, ...b}` - b.x overrides explicit x
- Consistent with JavaScript spread operator

**Implementation:** ✅ FINALIZED - Nested RecordUpdate nodes
```typescript
// Parser creates nested RecordUpdate nodes for multiple spreads
// Example: {...a, ...b, x: 1}
// Becomes: RecordUpdate(RecordUpdate(a, [...b fields]), [x: 1])

// AST structure unchanged:
{ kind: "RecordUpdate"; record: Expr; updates: RecordField[] }

// Parser strategy:
// 1. Parse first spread: create RecordUpdate(a, [])
// 2. Parse second spread: wrap in RecordUpdate(prev, [...b fields])
// 3. Parse fields: add to updates array of outermost RecordUpdate
// 4. Desugarer flattens/processes the nesting
```

**Benefits of this approach:**
- No AST changes needed - keeps existing structure
- Parser logic straightforward - recursive nesting
- Desugarer controls semantics - can optimize
- Separates concerns cleanly

#### Decision: Spread-only records
**Question:** Should `{...obj}` with no additional fields be allowed?
**Answer:** ✅ FINALIZED - Yes, allow for shallow copy use case
**Rationale:**
- **Use case:** Shallow copying is common in functional programming
- **JavaScript consistency:** Matches JS spread behavior
- **Pragmatic:** Without this, copying requires stdlib function or ugly workarounds
- **Implementation:** Creates `RecordUpdate(obj, [])` with empty updates
- **Semantics:** Identity/shallow copy operation
- **Alternative rejected:** Requiring `Record.copy(obj)` is more verbose, less natural

**Examples:**
```vibefun
// Shallow copy
let copy = {...original}

// Type casting (if needed)
let typed: SomeType = {...untyped}

// Pass-through with potential future modifications
let config = {...baseConfig}
```

### Phase 1: List Spread

#### Decision: Already supported in AST
**Finding:** `ListElement` union already includes `Spread` variant (ast.ts line 26)
**Action:** Just implement parser, no AST changes needed

#### Implementation approach
```typescript
// In parseList()
if (this.check("DOT_DOT_DOT")) {
    this.advance();
    const expr = this.parseExpression();
    elements.push({ kind: "Spread", expr });
} else {
    const expr = this.parseExpression();
    elements.push({ kind: "Element", expr });
}
```

### Phase 2: Postfix Dereference

#### Decision: Postfix vs Prefix `!`
**Challenge:** `!` has two meanings:
1. Prefix logical NOT: `!true` → `false`
2. Postfix dereference: `ref!` → value

**Implementation:**
- `parseUnary()` handles prefix `!` → `UnaryOp` with `op: "LogicalNot"` ✅ Already done
- `parseCall()` handles postfix `!` → `UnaryOp` with `op: "Deref"` ❌ Needs implementation

**Examples and precedence:**
```vibefun
!x        // LogicalNot(Var("x"))
x!        // Deref(Var("x"))
!!x       // LogicalNot(Deref(Var("x"))) - postfix ! binds tighter
!(!x)     // LogicalNot(LogicalNot(Var("x")))
x!!       // Deref(Deref(Var("x"))) - double deref, loops through parseCall
```

#### Decision: Postfix ! precedence
**Precedence:** Same as `.` field access (level 14)
**Location:** In `parseCall()` loop, after DOT handling

**Rationale:** Postfix operators bind tightest, consistent with field access

### Phase 3: Re-exports (FINALIZED)

#### Decision: AST structure
**Question:** Extend `ExportDeclaration` or create new `ReExportDeclaration`?
**Answer:** ✅ FINALIZED - Create new `ReExportDeclaration` (simplified design)
**Rationale:** Cleaner separation of concerns

**Final structure:**
```typescript
export type ReExportDeclaration = {
    kind: "ReExportDecl";
    items: ImportItem[] | null;  // null for export *
    from: string;
    loc: Location;
};
```

**Design note:** ✅ FINALIZED - `exported` field removed
- Original plan included `exported: boolean` field
- Decision: Remove it - redundant since node kind already indicates exported
- Simpler, cleaner structure
- Less boilerplate in AST construction

**Benefits:**
- Clear distinction: Export vs ReExport
- Easier for downstream (desugarer, type-checker) to handle
- No optional fields mixing concepts
- No redundant fields
- Explicit AST structure

### Phase -1: Error Messages (NEW - ADDED 2025-11-02)

#### Error Message Definitions
**Objective:** Define exact error messages before implementing error handling

**Error Cases:**

| Syntax Error | Example | Error Message |
|-------------|---------|---------------|
| Empty spread in record | `{...}` | "Expected expression after spread operator '...' in record" |
| Empty spread in list | `[...]` | "Expected expression after spread operator '...' in list" |
| Invalid spread position | `{..., x: 1}` | "Unexpected comma before spread operator. Spread must come after '{'" |
| Missing closing brace | `{...obj, x: 1` | "Expected '}' after record fields" |
| Missing closing bracket | `[...items` | "Expected ']' after list elements" |
| Spread in wrong context | `let {...x} = y` | (Pattern context - different error, handled by pattern parser) |

**Note:** Multiple spreads like `{...a, ...b}` should **succeed** and create nested RecordUpdate nodes

**Deliverable:** These error messages will be implemented in Phase 0 and Phase 1

### Test Strategy

#### Integration Tests Philosophy
**Goal:** Test realistic programs combining multiple features
**Approach:** 50-100 line programs showcasing:
- Ref operations in real use cases (counters, state management)
- Spread operations in data transformations
- Module organization with re-exports
- Complex pattern matching scenarios

#### Error Recovery Philosophy
**Goal:** Helpful error messages for common mistakes
**Approach:** Test malformed syntax, verify:
- Error message clarity
- Location accuracy
- Helpful suggestions

**Note:** Parser throws on first error (no recovery). This is acceptable.

#### Edge Case Philosophy
**Goal:** Ensure parser handles extremes gracefully
**Categories:**
- Deep nesting (stress recursion limits)
- Large inputs (stress performance)
- Unicode edge cases (stress string handling)
- Ambiguous syntax (stress disambiguation logic)

## Audit Results Summary

From comprehensive parser audit (2025-11-02):

### Actual vs Planned Coverage

**Original assessment:** ~98% complete, ~305 tests

**Revised assessment after deep analysis:**

| Category | Spec Features | Implemented | Tested | Status |
|----------|---------------|-------------|---------|--------|
| Lexical | 8 | 8 | 8 | ✅ 100% |
| Expressions | 35 | 33 | 33 | ⚠️ 94% (missing list spread, postfix !) |
| Functions | 7 | 7 | 7 | ✅ 100% |
| Patterns | 9 | 9 | 9 | ✅ 100% |
| Types | 12 | 12 | 12 | ✅ 100% |
| Modules | 7 | 6 | 6 | ⚠️ 86% (missing re-exports) |
| Interop | 7 | 7 | 7 | ✅ 100% |
| **Records** | - | - | - | ❌ **WRONG SYNTAX** |
| **TOTAL** | **85** | **82** | **82** | **~96%** |

### Critical Issues (Pre-Fix)
1. ❌ Record syntax doesn't match spec (pipe vs spread)
2. ❌ List spread not implemented
3. ❌ Postfix ! (deref) not implemented
4. ❌ Re-exports not implemented

### Features Already Complete (Corrections to Original Plan)
1. ✅ RefAssign (`:=`) - parser.ts lines 299-316
2. ✅ ref() function - works as normal function call
3. ✅ Prefix ! (logical NOT) - parser.ts lines 506-521
4. ✅ All pattern matching features
5. ✅ All type expression features

### Parser Quality Assessment
- **Code Quality:** Excellent, well-structured
- **Test Coverage:** Comprehensive but needs syntax fixes
- **Error Handling:** Robust with good location info
- **Maintainability:** Very good, clear code
- **Performance:** Good (no benchmarks yet)

## Resolved Questions (All Finalized)

### Question 1: Record spread precedence
**Q:** In `{...a, x: 1, ...b}`, does `b.x` override the explicit `x: 1`?
**A:** ✅ FINALIZED - Yes (JavaScript rightmost-wins semantics). Later bindings override earlier.

### Question 2: Multiple list spreads
**Q:** Is `[...xs, ...ys, ...zs]` valid?
**A:** ✅ FINALIZED - Yes. AST supports it, parser will allow it.

### Question 3: Empty spreads
**Q:** Are `{...}` and `[...]` valid?
**A:** ✅ FINALIZED - No, parse errors. Add to error tests.

### Question 4: Spread of non-record/list
**Q:** What if spread applied to wrong type? `{...42}`
**A:** ✅ FINALIZED - Parser accepts, type-checker rejects. Not parser's concern.

### Question 5: Breaking change handling
**Q:** How to handle record syntax change?
**A:** ✅ FINALIZED - Accept breaking change (pre-1.0 allows it). Just change the syntax.

### Question 6: Record AST structure
**Q:** Keep RecordUpdate separate or merge into Record?
**A:** ✅ FINALIZED - Keep separate RecordUpdate node. Cleaner design.

### Question 7: Re-export AST structure
**Q:** New node or extend existing?
**A:** ✅ FINALIZED - New ReExportDeclaration node. Better separation.

### Question 8: Multiple spread handling (NEW 2025-11-02)
**Q:** How to handle `{...a, ...b, x: 1}` in parser? Nested nodes or array of spreads?
**A:** ✅ FINALIZED - Nested RecordUpdate nodes. Keep AST simple, parser creates nesting.

### Question 9: Spread-only records (NEW 2025-11-02)
**Q:** Should `{...obj}` with no fields be allowed?
**A:** ✅ FINALIZED - Yes, for shallow copy use case. Pragmatic choice.

### Question 10: ReExportDeclaration `exported` field (NEW 2025-11-02)
**Q:** Include redundant `exported: boolean` field (always true)?
**A:** ✅ FINALIZED - No, remove it. Node kind already indicates it's exported.

### Question 11: Pre-Phase 0 validation (NEW 2025-11-02)
**Q:** What validation before starting implementation?
**A:** ✅ FINALIZED - Comprehensive codebase audit + error message definitions (Phase -1).

## Dependencies

### No Breaking Changes to AST
Changes are mostly additive:
1. New `ReExportDeclaration` node (new)
2. Maybe modify `RecordUpdate` parsing (modify)
3. Use existing `ListElement` spread support (no change)
4. Use existing `UnaryOp` Deref support (no change)

### Breaking Changes to Parser
1. **Record syntax change** - affects existing tests, possibly downstream
2. All other changes are additive

### Downstream Impact
These components will need updates:
1. **Desugarer** - Handle record spread, list spread, re-exports
2. **Type Checker** - Type check spread operations
3. **Code Generator** - Generate JS for spread operations

**Note:** This task focuses ONLY on parser. Downstream updates are separate.

## References

### Specification Sections
- **Record spread:** Lines 404-407
- **List spread:** Lines 687-689
- **Ref operations:** Lines 256-263, 1554
- **Re-exports:** Lines 1005-1011
- **Pattern matching:** Lines 843-958
- **Operators:** Lines 1548-1573 (precedence table)

### Similar Languages
- **JavaScript/TypeScript:** Spread syntax `{...obj}`, `[...arr]`
- **OCaml:** Record update `{ record with field = value }`
- **F#:** Record update `{ record with Field = value }`
- **Rust:** Struct update `Struct { field, ..base }`

### Parser Implementation Patterns
- **Recursive descent** - Standard approach
- **Precedence climbing** - For binary operators
- **Lookahead disambiguation** - For ambiguous syntax
- **AST-driven** - Structure follows language grammar

### Code Style
Follow `.claude/CODING_STANDARDS.md`:
- No `any` types - STRICT
- Explicit return types - ALWAYS
- Functional style preferred - Use when appropriate
- Comprehensive tests - REQUIRED
- JSDoc for public APIs - REQUIRED

## Progress Tracking

Track progress in `parser-completion-tasks.md`.

Update this file when:
- Key decisions are made ✅
- New questions arise
- Significant context discovered ✅
- Approach changes ✅

## Change Log

### 2025-11-02: Final User Q&A and Decision Finalization
- ✅ FINALIZED: Nested RecordUpdate approach for multiple spreads
- ✅ FINALIZED: Allow spread-only records `{...obj}` for shallow copy use case
- ✅ FINALIZED: Remove `exported` field from ReExportDeclaration (redundant)
- ✅ FINALIZED: Add Phase -1 for comprehensive audit and error message definitions
- ✅ Corrected test baseline: ~346 parser tests (not ~305)
- ✅ Updated target: ~461 total tests (346 + ~115 new)
- ✅ All 11 questions now resolved
- ✅ Plan, context, and tasks documents updated

### 2025-11-02: User Decision Finalization (Initial)
- ✅ FINALIZED: Use JavaScript rightmost-wins spread semantics
- ✅ FINALIZED: Accept breaking change (pre-1.0)
- ✅ FINALIZED: Keep separate RecordUpdate AST node
- ✅ FINALIZED: Create new ReExportDeclaration node
- ✅ Questions 1-7 resolved
- ✅ Plan ready for user Q&A

### 2025-11-02: Deep Analysis & Revision
- ✅ Identified record syntax mismatch (CRITICAL)
- ✅ Found missing list spread feature
- ✅ Corrected RefAssign status (already done)
- ✅ Found postfix ! missing
- ✅ Clarified re-export AST design
- ✅ Revised all phases and tasks
- ✅ Updated timeline (10-15 hours vs 6-9)
- ✅ Reordered phases (Phase 0 now critical)

### 2025-11-02: Initial Plan
- Created original plan (now superseded)
- Made incorrect assumptions about RefAssign
- Missed record syntax discrepancy
- Missed list spread feature

## Implementation Notes

### Critical Path
1. **Phase -1 (Preparation) is MUST-DO-FIRST** ✨ NEW
   - Audit codebase for all affected files
   - Define error messages before implementing
   - Verify baseline test count
   - Prevent surprises in Phase 0

2. Phase 0 (Record spread) is MUST-DO-SECOND
   - Highest risk
   - Affects existing code
   - Get it working before adding other features
   - Benefits from Phase -1 preparation

3. Phase 1 (List spread) is natural follow-up
   - Similar parsing logic
   - While in "spread" mindset

4. Phases 2-3 are independent
   - Can be done in any order
   - Lower risk

5. Phases 4-5 are final cleanup
   - Test coverage
   - Documentation
   - Validation

### Testing Strategy During Implementation
- After Phase 0: Run full test suite, fix regressions
- After each phase: Run relevant test subset
- Before Phase 5: Run full verification

### Rollback Plan
If Phase 0 (record spread) proves too difficult:
- Revert to pipe syntax
- Update spec to match parser
- Document decision
- Continue with other phases

(This is backup only - prefer fixing parser to match spec)
