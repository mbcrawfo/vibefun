# Type Checker Bugs Overview

**Last Updated:** 2025-10-30

## Status Summary

- **Total Skipped Tests:** 9 tests in `packages/core/src/typechecker/typechecker.test.ts`
- **Distinct Bugs:** 6 bugs affecting different functionality
- **Current Test Status:** 1341/1342 passing (99.9%)
- **Goal:** Fix all 9 skipped tests to achieve 100% test pass rate

## Bug Summary Table

| Bug # | Issue | Tests | Complexity | Status | Doc |
|-------|-------|-------|------------|--------|-----|
| **1** | External declarations not in declarationTypes | 1 | Low | 🔜 Not Started | [bug-1-external-declarations.md](./bug-1-external-declarations.md) |
| **2** | Recursive CoreLetDecl not supported | 1 | Medium | 🔜 Not Started | [bug-2-recursive-let.md](./bug-2-recursive-let.md) |
| **3** | Mutual recursion env not updated | 1 | Medium | 🔜 Not Started | [bug-3-mutual-recursion.md](./bug-3-mutual-recursion.md) |
| **4** | Multiple declarations can't reference each other | 2 | Medium | 🔜 Not Started | [bug-4-environment-threading.md](./bug-4-environment-threading.md) |
| **5** | Exhaustiveness on polymorphic lambda params | 3 | High | 🔜 Not Started | [bug-5-polymorphic-exhaustiveness.md](./bug-5-polymorphic-exhaustiveness.md) |
| **6** | Record patterns in lambdas | 1 | High | 🔜 Not Started | [bug-6-record-patterns.md](./bug-6-record-patterns.md) |

## Recommended Fix Order

### Phase 1: Low-Hanging Fruit
1. **Bug #1 (External declarations)** - Simple debugging fix in environment building
2. **Bug #4 (Environment threading)** - Critical for multi-declaration support

**Rationale:** These are straightforward fixes that enable basic functionality and have low risk of breaking existing tests.

### Phase 2: Recursive Bindings
3. **Bug #2 (Recursive let)** - Add recursive flag handling
4. **Bug #3 (Mutual recursion)** - Fix environment propagation

**Rationale:** Recursive bindings are a core feature. Bug #2's fix will inform Bug #3's approach.

### Phase 3: Advanced Type System Features
5. **Bug #5 (Polymorphic exhaustiveness)** - Requires bidirectional typing
6. **Bug #6 (Record patterns)** - Bidirectional typing + implementation verification

**Rationale:** These require architectural decisions about bidirectional type checking or may need language-level changes (requiring type annotations).

## Detailed Bug Information

### Bug #1: External Declarations Not Added to declarationTypes
- **File:** `typechecker.ts:131-143`
- **Skipped Test:** Line 109 - "should type check external function declaration"
- **Root Cause:** `env.values.get(decl.name)` returns `undefined` at line 135
- **Fix Approach:** Debug why `buildEnvironment()` doesn't add externals to `env.values`

### Bug #2: Recursive CoreLetDecl Not Supported
- **File:** `typechecker.ts:74-88`
- **Skipped Test:** Line 254 - "should type check recursive factorial with pattern matching"
- **Root Cause:** `decl.recursive` flag is not checked; name not in scope during value inference
- **Fix Approach:** Add recursive handling with placeholder type variable

### Bug #3: Mutual Recursion Environment Not Updated
- **File:** `typechecker.ts:91-123`
- **Skipped Test:** Line 359 - "should type check mutual recursion (isEven/isOdd)"
- **Root Cause:** `inferExpr()` doesn't return updated environment; changes lost
- **Fix Approach:** Either return env from inferExpr or inline the logic

### Bug #4: Multiple Declarations Can't Reference Each Other
- **File:** `typechecker.ts:44-63`
- **Skipped Tests:**
  - Line 543 - "should type check record construction and access"
  - Line 1184 - "should type check record update expressions"
- **Root Cause:** Environment not threaded between declaration type checking
- **Fix Approach:** Update `typeCheck()` to thread env through each declaration

### Bug #5: Exhaustiveness Checking on Polymorphic Types
- **File:** Pattern matching inference with type variables
- **Skipped Tests:**
  - Line 671 - "should type check Option pattern matching"
  - Line 1097 - "should type check Result type with error handling"
  - Line 1326 - "should type check higher-order functions with ADTs"
- **Root Cause:** Type variables can't provide constructor information for exhaustiveness
- **Fix Approach:** Implement bidirectional typing or require type annotations

### Bug #6: Record Pattern Matching in Lambdas
- **File:** Pattern matching with record destructuring
- **Skipped Test:** Line 1016 - "should type check record pattern matching"
- **Root Cause:** Circular dependency in type inference for record patterns
- **Fix Approach:** Bidirectional typing + verify record pattern implementation

## Implementation Strategy

### For Each Bug:
1. Read the specific bug plan document
2. Understand the root cause and proposed fix
3. Implement the fix in relevant files
4. Un-skip the affected test(s)
5. Run `npm test` to verify the fix
6. Run `npm run verify` for full quality check
7. Update bug status in this overview document

### Testing Protocol:
- Before fixing: Note current test count (1341/1342 passing)
- After each fix: Ensure no regressions (all previously passing tests still pass)
- After un-skipping: Verify newly enabled tests pass
- Final verification: All 1342 tests passing

## Known Limitations (Not Bugs)

These are documented limitations, NOT bugs:
- **Literal types:** Not supported (parser limitation)
- **Primitive union narrowing:** Not supported (no pattern type annotations)
- **Module import verification:** Deferred (trusts imports)
- **Promise type:** External type only (not built-in)

## Progress Tracking

### Bugs Fixed: 0/6
### Tests Fixed: 0/9
### Overall Progress: 0%

Update this section as bugs are fixed.

## Files to Modify

Based on the analysis, the following files will likely need changes:

- `packages/core/src/typechecker/typechecker.ts` - Main type checker (all bugs)
- `packages/core/src/typechecker/environment.ts` - Environment building (Bug #1)
- `packages/core/src/typechecker/infer.ts` - Type inference (Bugs #2, #3, #5, #6)
- `packages/core/src/typechecker/patterns.ts` - Pattern checking (Bug #6)
- `packages/core/src/typechecker/typechecker.test.ts` - Un-skip tests

## References

- Type checker implementation: `packages/core/src/typechecker/`
- Test file: `packages/core/src/typechecker/typechecker.test.ts`
- Type checker docs: `.claude/active/type-checker/`
- Language spec: `vibefun-spec.md`
