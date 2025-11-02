# Parser Completion Plan (REVISED)

**Created:** 2025-11-02
**Last Updated:** 2025-11-02 (Deep Analysis + User Decisions)
**Status:** Ready to implement - All decisions finalized
**Revision:** Critical issues identified, plan updated, user decisions incorporated

## Critical Findings from Deep Analysis

### 🚨 Major Issues Discovered

1. **SYNTAX MISMATCH: Record Updates**
   - **Spec (line 680):** `{ ...person, age: 31 }` (spread syntax)
   - **Parser (lines 794-827):** `{ person | age: 31 }` (pipe syntax)
   - **Decision:** ✅ FINALIZED - Migrate to spec syntax (spread)
   - **Breaking Change:** ✅ FINALIZED - Accept breaking change (pre-1.0)
   - **Impact:** HIGH - requires rewriting existing working code

2. **MISSING FEATURE: List Spread**
   - **Spec (lines 687-689):** `[1, 2, ...rest]`
   - **Parser:** Not implemented
   - **AST:** Already supports it! (`ListElement` union)
   - **Decision:** Implement now
   - **Impact:** MEDIUM - straightforward addition

3. **INCORRECT ASSUMPTION: RefAssign**
   - **Original plan:** Assumed needs implementation
   - **Reality:** ✅ Already fully implemented (parser.ts lines 299-316)
   - **Correction:** Only postfix `!` needs work

4. **AST DESIGN: Re-exports**
   - **Original plan:** Left as "TBD"
   - **Decision:** ✅ FINALIZED - Create new `ReExportDeclaration` node
   - **Impact:** Clean separation of concerns

## Revised Implementation Phases

### Phase 0: Record Spread Syntax Migration (NEW - CRITICAL)

**Goal:** Replace `{r | f: v}` with `{...r, f: v}` to match spec

**Impact:** HIGH RISK - modifies existing working feature

#### 0.1 AST Analysis & Design
**File:** `packages/core/src/types/ast.ts`

**Current structure:**
```typescript
{ kind: "RecordUpdate"; record: Expr; updates: RecordField[]; loc: Location }
```

**Options:**
1. **Keep RecordUpdate separate** ✅ CHOSEN
   - Parser detects spread, creates RecordUpdate AST
   - Cleaner separation: Record vs RecordUpdate

2. **Merge into Record with optional spread** ❌ REJECTED
   - `{ kind: "Record"; fields: RecordField[]; spread?: Expr; loc: Location }`
   - Single node type, but mixes two concepts

**Decision:** ✅ FINALIZED - Keep separate RecordUpdate node

#### 0.2 Parser Implementation
**File:** `packages/core/src/parser/parser.ts`

**Remove:** Lines 794-827 (pipe-based record update)

**Add:** Spread-based parsing in `parseRecordExpr()`
- Check for `DOT_DOT_DOT` token
- Parse spread expression
- Parse remaining fields
- Support multiple spreads: `{...a, ...b, x: 1}`
- **Semantics:** ✅ FINALIZED - JavaScript rightmost-wins (later overrides earlier)

**Disambiguation:**
- `{...x}` - record with spread only
- `{...x, y: 1}` - record with spread and field
- `{x: 1}` - normal record construction

#### 0.3 Test Migration
**File:** `packages/core/src/parser/expressions.test.ts`

- Find all tests using `{r | f: v}` syntax
- Convert to `{...r, f: v}` syntax
- Verify no regressions

#### 0.4 New Spread Tests (~15 tests)
- Basic: `{...person, age: 31}`
- Multiple fields: `{...person, age: 31, name: "Bob"}`
- Multiple spreads: `{...base, ...overrides, x: 1}`
- Spread only: `{...obj}`
- Nested: `{...obj, nested: {...obj.nested, x: 1}}`
- Precedence: `{...a, x: 1, ...b}` (later spreads override)
- Edge: empty spread, spread with no fields after

**Estimated time:** 3-4 hours (risky - existing code changes)

---

### Phase 1: List Spread in Expressions (NEW)

**Goal:** Support `[1, 2, ...rest]` syntax from spec

**Impact:** LOW RISK - AST ready, straightforward addition

#### 1.1 Parser Implementation
**File:** `packages/core/src/parser/parser.ts` (lines 1005-1028)

**Current:** Only creates `{ kind: "Element", expr }`

**Add:**
- Check for `DOT_DOT_DOT` before parsing expression
- If found, create `{ kind: "Spread", expr }`
- Support: `[...xs]`, `[1, ...xs]`, `[...xs, 5]`, `[...xs, ...ys]`

**Implementation:**
```typescript
// In list parsing loop
if (this.check("DOT_DOT_DOT")) {
    this.advance(); // consume ...
    const expr = this.parseExpression();
    elements.push({ kind: "Spread", expr });
} else {
    const expr = this.parseExpression();
    elements.push({ kind: "Element", expr });
}
```

#### 1.2 Testing (~10 tests)
**File:** `packages/core/src/parser/expressions.test.ts` (add to list tests)

- Basic: `[1, 2, ...rest]`
- Multiple: `[...xs, ...ys]`
- Mixed: `[1, ...middle, 5]`
- Only spread: `[...items]`
- Multiple spreads: `[...a, ...b, ...c]`
- Nested: `[[...inner]]`
- In expressions: `[...xs] |> map(f)`
- Edge: `[...[1,2,3]]` (spread of literal)

**Estimated time:** 1-2 hours

---

### Phase 2: Postfix Dereference Operator

**Goal:** Implement `expr!` for dereference (the ONLY ref operation needed)

**Impact:** LOW RISK - clean addition, no existing code affected

**Corrections from original plan:**
- ❌ RefAssign - already implemented
- ❌ ref() function - already works as normal call
- ✅ Postfix ! - THIS is what needs implementation

#### 2.1 AST Verification
**File:** `packages/core/src/types/ast.ts`

Already exists:
```typescript
{ kind: "UnaryOp"; op: "Deref"; expr: Expr; loc: Location }
```

No AST changes needed.

#### 2.2 Parser Implementation
**File:** `packages/core/src/parser/parser.ts`

**Modify:** `parseCall()` method (after line 567, after DOT handling)

**Add postfix BANG clause:**
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

**Handles:**
- `x!` - simple deref
- `x!!` - double deref (loops back through)
- `obj.field!` - deref after field access
- `f()!` - deref after function call

#### 2.3 Testing (~15 tests)
**File:** `packages/core/src/parser/expressions.test.ts`

- Simple: `x!`
- Chained: `x!!`, `x!!!`
- After access: `obj.field!`
- After call: `getRef()!`
- In operators: `x! + 1`, `x! * 2`
- In if: `if x! then y else z`
- In match: `match x! { ... }`
- Precedence: `!x!` (NOT of deref)
- Precedence: `-x!` (negate of deref)
- With RefAssign: `x := y!`
- Complex: `(obj.getRef())! + 5`

**Estimated time:** 1-2 hours

---

### Phase 3: Re-exports with ReExportDeclaration

**Goal:** Support `export { x } from "module"` with clean AST

**Impact:** LOW RISK - new feature, no existing code affected

**Decision:** Create new `ReExportDeclaration` node (cleaner design)

#### 3.1 AST Implementation
**File:** `packages/core/src/types/ast.ts`

**Decision:** ✅ FINALIZED - Create new `ReExportDeclaration` node (not extending existing)

**Add:**
```typescript
export type ReExportDeclaration = {
    kind: "ReExportDecl";
    items: ImportItem[] | null;  // null for export *
    from: string;
    exported: boolean;  // always true
    loc: Location;
};
```

**Update:** `Declaration` type union to include `ReExportDeclaration`

**Export:** From `index.ts`

#### 3.2 Parser Implementation
**File:** `packages/core/src/parser/parser.ts`

**Modify:** Export parsing in `parseDeclaration()`

**Strategy:**
1. After parsing `export { items }` or `export *`
2. Check for `from` keyword
3. If present, parse module path
4. Create `ReExportDeclaration` instead of normal export

**Handle:**
- `export { x, y } from "./mod"` - named
- `export { x as y } from "./mod"` - aliased
- `export * from "./mod"` - namespace
- `export { type T } from "./mod"` - type only
- `export { type T, value } from "./mod"` - mixed

#### 3.3 Testing (~10 tests)
**File:** `packages/core/src/parser/declarations.test.ts`

- Named: `export { x } from "./mod"`
- Multiple: `export { x, y, z } from "./mod"`
- Aliased: `export { x as y } from "./mod"`
- Namespace: `export * from "./mod"`
- Type: `export { type T } from "./types"`
- Mixed: `export { type T, value } from "./mod"`
- Multiple mixed: `export { type T, type U, a, b } from "./mod"`
- Errors: missing from, missing path, invalid path
- Edge: empty `export {} from "./mod"`

**Estimated time:** 1-2 hours

---

### Phase 4: Enhanced Test Coverage

**Goal:** Comprehensive integration, error recovery, and edge case testing

**Total:** ~50 new tests across three categories

#### 4.1 Integration Tests (~20 tests)
**File:** `packages/core/src/parser/parser-integration.test.ts`

Test realistic programs (50-100 lines each):

1. **Counter with refs and deref**
   ```vibefun
   let counter = ref(0)
   let increment = () => counter := counter! + 1
   let getValue = () => counter!
   ```

2. **List processing with spreads**
   ```vibefun
   let items = [1, 2, 3]
   let extended = [...items, 4, 5]
   let combined = [...items, ...extended]
   ```

3. **Module system with re-exports**
   ```vibefun
   export { type User, createUser } from "./user"
   export * from "./utils"
   ```

4. **Complex pattern matching**
   ```vibefun
   match userRef! {
       | { status: Active, data: Some(info) } when info.verified => process(info)
       | { status: Pending, data: _ } => wait()
       | _ => handleError()
   }
   ```

5. **Pipeline with spreads and composition**
   ```vibefun
   data
       |> filter((x) => x > 0)
       |> map((x) => [x, ...extras])
       |> flatten
   ```

6. **External API with overloading**
7. **Nested match with guards**
8. **Higher-order functions with complex types**
9. **Record operations with spreads**
10. **Mixed module imports/exports/re-exports**
11-20. More complex scenarios

#### 4.2 Error Recovery Tests (~20 tests)
**File:** `packages/core/src/parser/parser-errors.test.ts`

Test malformed syntax with helpful errors:

**Unclosed delimiters:**
- `{ x: 1` - missing `}`
- `[1, 2` - missing `]`
- `(a + b` - missing `)`
- `"hello` - missing closing quote

**Missing keywords:**
- `if x then y` - missing else
- `match x` - missing cases
- `let x` - missing = and value
- `type T` - missing = and definition

**Invalid tokens:**
- `let @x = 5` - @ invalid
- `type T = #` - # invalid
- `x $ y` - $ not an operator

**Mismatched delimiters:**
- `{ x: [1, 2 }` - bracket type mismatch
- `(a + [b)]` - paren/bracket mismatch

**Missing separators:**
- `let x = 1 let y = 2` - missing semicolon
- `[1 2 3]` - missing commas
- `{ x: 1 y: 2 }` - missing comma

**Invalid patterns:**
- `match x { Some() =>` - missing body
- `match x { | }` - empty case

**Type syntax errors:**
- `type T = <` - incomplete generic
- `List<Int` - unclosed generic
- `(Int) ->` - incomplete function type

**Spread errors:**
- `{...}` - spread without expression
- `[...]` - spread without expression
- `{..., x: 1}` - comma before spread

**Verify:**
- Error messages are clear and actionable
- Line/column information is accurate
- Suggestions provided when applicable

#### 4.3 Edge Case Tests (~10 tests)
**File:** `packages/core/src/parser/parser-edge-cases.test.ts` (new)

Test extreme inputs:

**Deep nesting:**
- 20+ nested expressions: `(((((...)))))`
- 20+ nested types: `List<List<List<...>>>`
- 20+ nested patterns: `Some(Some(Some(...)))`
- Deep match nesting

**Large literals:**
- 10KB+ strings
- Extreme scientific notation: `1e308`, `1e-308`
- Long numbers with separators: `1_000_000_000_000`
- Deeply nested lists: `[[[[[...]]]]]`

**Unicode edge cases:**
- Emoji identifiers: `let 🚀 = 42`
- Unicode math: `let π = 3.14`
- RTL text in strings
- Zero-width characters
- Surrogate pairs: `"\u{1F600}"`

**Operator precedence:**
- Complex chains: `a |> b >> c << d`
- Mixed: `x + y * z |> f`
- Double negation: `--x`
- Deref vs NOT: `!!x`, `!x!`

**Ambiguous syntax resolution:**
- Empty braces: `{}`
- Single expr in braces: `{ x; }` vs `{ x: x }`
- Generic vs comparison: `x<y>z`, `f<A>()`
- Spread vs three dots in other contexts

**Estimated time:** 3-4 hours

---

### Phase 5: Validation & Documentation

**Goal:** Ensure quality and update documentation

#### 5.1 Quality Checks

Run all checks in sequence:
```bash
npm run verify  # check + lint + test + format
```

Individual checks:
```bash
npm run check      # TypeScript (~0 errors expected)
npm run lint       # ESLint (0 warnings)
npm test           # All tests (~395+ tests passing)
npm run format     # Prettier formatting
```

**Acceptance criteria:**
- All quality checks pass
- No regressions in existing tests
- Test count: ~395-405 tests total
- Coverage remains high (90%+)

#### 5.2 Documentation Updates

**1. Spec updates (if needed)**
- Record update syntax should already match (spec is correct)
- Verify all examples use correct syntax
- No changes needed if spec is already correct

**2. Parser documentation**
**File:** `packages/core/src/parser/parser.ts`
- Add JSDoc for new/modified methods
- Document spread parsing strategy
- Document postfix ! disambiguation
- Add spec line references

**3. Design documentation**
**File:** `.claude/design/parser-architecture.md` (create)
- Document disambiguation strategies:
  - Postfix ! vs prefix !
  - Block vs record with spreads
  - `>>` token splitting for generics
- Explain precedence decisions
- Note spread parsing approach
- Record AST design choice

**4. Update CLAUDE.md (minimal)**
- Only if stable architectural changes
- Follow Documentation Rules strictly
- Do NOT add status or progress info

**5. Update context files**
**File:** `.claude/active/parser-completion/parser-completion-context.md`
- Document final design decisions
- Record spread syntax choice
- AST design for re-exports
- Any deviations from original plan

**Estimated time:** 1 hour

---

## Revised Success Criteria

- [ ] Record spread syntax migrated from pipe to spread
- [ ] List spread fully implemented
- [ ] Postfix ! (deref) working correctly
- [ ] Re-exports with ReExportDeclaration AST node
- [ ] Test count reaches ~395-405 tests
- [ ] All quality checks pass (check, lint, test, format)
- [ ] 100% spec coverage achieved
- [ ] Documentation updated
- [ ] No regressions in existing tests

---

## Corrected Feature Status

### What's Actually Missing:
1. ❌ **Record spread syntax** - Parser uses wrong syntax (pipe vs spread)
2. ❌ **List spread** - Not implemented at all
3. ❌ **Postfix !** - Dereference operator missing
4. ❌ **Re-exports** - Module re-export syntax missing
5. ⚠️ **Enhanced tests** - Need more comprehensive coverage

### What's Already Done (Corrections):
1. ✅ **RefAssign (`:=`)** - Fully implemented (parser.ts lines 299-316)
2. ✅ **ref() function** - Works as regular function call
3. ✅ **Prefix ! (LogicalNot)** - Fully implemented
4. ✅ **All other spec features** - Complete

---

## Risk Analysis (Revised)

### High Risk
1. **Record spread migration** (Phase 0)
   - Affects existing working code
   - Requires test updates
   - May affect downstream components
   - Mitigation: Careful testing, check desugarer/type-checker

### Medium Risk
2. **List spread** (Phase 1)
   - New feature, but well-defined
   - AST already supports it
   - Straightforward implementation

3. **Test scope** (Phase 4)
   - 100+ new tests is ambitious
   - May find edge cases requiring fixes
   - Mitigation: Phase testing as we go

### Low Risk
4. **Postfix !** (Phase 2)
   - Clean addition to parseCall()
   - No existing code affected
   - Well-defined behavior

5. **Re-exports** (Phase 3)
   - New feature, clean design
   - Separate AST node
   - No existing code affected

---

## Timeline Estimate (Revised)

- **Phase 0** (Record spread migration): 3-4 hours
  - Risky: modifying existing feature
  - Need to update existing tests

- **Phase 1** (List spread): 1-2 hours
  - Straightforward: AST ready

- **Phase 2** (Postfix !): 1-2 hours
  - Simple: clean postfix operator

- **Phase 3** (Re-exports): 1-2 hours
  - Moderate: new AST node + parsing

- **Phase 4** (Enhanced tests): 3-4 hours
  - Time-consuming: writing 50+ tests

- **Phase 5** (Validation & docs): 1 hour
  - Standard: run checks, write docs

**Total: 10-15 hours** for complete implementation

---

## Implementation Order (Critical Path)

1. **Phase 0 FIRST** (Record spread) - Most risky, get it done early
2. **Phase 1** (List spread) - While in "spread parsing" mindset
3. **Phase 2** (Postfix !) - Independent, can be done anytime
4. **Phase 3** (Re-exports) - Independent, can be done anytime
5. **Phase 4** (Enhanced tests) - After all features work
6. **Phase 5** (Validation) - Final quality check

**Rationale:** Tackle the riskiest work (record spread) first while fresh. Group similar work (spreads) together.

---

## Notes

- **Original plan had incorrect assumptions** - RefAssign already done
- **Critical syntax mismatch found** - Record update syntax wrong
- **Missing feature identified** - List spread not in original plan
- **AST design clarified** - ReExportDeclaration (not TBD anymore)
- **Test scope maintained** - Keep comprehensive coverage despite ~100 new tests
- **Focus on correctness over speed** - Phase 0 is risky and needs care

---

## Decision Log

| Decision | Rationale | Date | Status |
|----------|-----------|------|--------|
| Use spec record syntax (`{...r, f: v}`) | Spec is source of truth, JS-like syntax more familiar | 2025-11-02 | ✅ FINALIZED |
| JavaScript spread semantics (rightmost wins) | Multiple spreads allowed, later overrides earlier | 2025-11-02 | ✅ FINALIZED |
| Accept breaking change (pre-1.0) | Pre-1.0 allows breaking changes, simplest approach | 2025-11-02 | ✅ FINALIZED |
| Keep separate RecordUpdate AST node | Cleaner than merging into Record with optional spread | 2025-11-02 | ✅ FINALIZED |
| Create new ReExportDeclaration node | Cleaner separation vs extending ExportDeclaration | 2025-11-02 | ✅ FINALIZED |
| Implement list spread now | Achieve full spec parity, AST already ready | 2025-11-02 | ✅ FINALIZED |
| Keep full test scope (~115 new) | Comprehensive coverage worth the effort | 2025-11-02 | ✅ FINALIZED |
| Phase 0 first | Get risky work done early | 2025-11-02 | ✅ FINALIZED |
