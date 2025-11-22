# Parser Edge Cases - Implementation Plan

**Created**: 2025-11-22
**Status**: Ready to start
**Parent Task**: parser-feature-gaps (100% complete)

## Goal

Address 7 remaining skipped tests to achieve 100% parser test pass rate. Currently at 99.7% (2576/2583 passing tests).

## Context

The parser-feature-gaps task successfully completed all 18 planned features. The remaining work consists of optional enhancements for edge cases and known limitations identified during comprehensive testing.

## Current State

- **Passing tests**: 2576/2583 (99.7%)
- **Skipped tests**: 7 (0.3%)
- **Failing tests**: 0
- **Test files**: 96 total (34 parser-specific)

## Skipped Tests Breakdown

1. **Record return types in lambdas** (1 test) - Grammar ambiguity bug
2. **Multi-line namespace import** (1 test) - Newline handling limitation
3. **Multi-line mixed imports** (2 tests) - Newline handling limitation
4. **Mutually recursive types with `and`** (2 tests) - Feature not wired up
5. **Type definition trailing comma** (1 test) - Edge case syntax

## Implementation Phases

### Phase 1: Fix Record Return Type Bug (Highest Priority)

**Impact**: Medium - affects ergonomic lambda syntax
**Effort**: Medium - requires resolving grammar ambiguity
**Tests affected**: 1

#### Problem

Lambda expressions with record return types fail to parse:
```vibefun
(user): { name: String, age: Int } => user
```
Error: "Expected ';' after declaration"

#### Root Cause

Grammar ambiguity - when the parser sees `{` after `:` in a lambda, it cannot distinguish between:
- A record type annotation (intended): `{ name: String, age: Int }`
- A record literal expression (not valid here)

#### Solution Approach

1. **Enhance lookahead logic** in lambda return type parsing
   - When encountering `{` after `:`, perform deeper lookahead
   - Check if the pattern matches type syntax (`:` between fields) vs expression syntax
   - Look for `=>` after closing `}` to confirm this is a lambda

2. **Modify parse-expressions.ts**
   - Update `parseLambdaExpression()` function
   - Add `parseRecordTypeInReturnPosition()` helper
   - Handle the ambiguity explicitly with contextual parsing

3. **Testing**
   - Un-skip test in `lambda-return-type.test.ts:128`
   - Add edge cases: nested records, tuple returns, union returns
   - Verify no regressions in record literal parsing

#### Files to Modify

- `packages/core/src/parser/parse-expressions.ts`
- `packages/core/src/parser/lambda-return-type.test.ts`

---

### Phase 2: Multi-line Import Support (Medium Priority)

**Impact**: Low - formatting nicety
**Effort**: Low - straightforward newline handling
**Tests affected**: 3

#### Problems

**2a. Namespace imports with newlines**
```vibefun
import *
    as List
    from "./list";
```
Fails because parser doesn't skip newlines between tokens.

**2b. Mixed imports with newlines after opening brace**
```vibefun
import {
    type User,
    getUser
} from "./api";
```
Similar issue - newlines not handled after `{`.

#### Solution Approach

1. **Add newline skipping** in import parser
   - After `*` in namespace imports
   - After `{` in destructured imports
   - Between import specifiers
   - Similar to how other statements handle newlines

2. **Modify parse-declarations.ts**
   - Update `parseImportDeclaration()` function
   - Add `this.skipNewlines()` calls at appropriate positions
   - Ensure trailing newlines before `from` keyword are also handled

3. **Testing**
   - Un-skip tests in:
     - `import-namespace.test.ts:279`
     - `mixed-imports.test.ts:259,283`
   - Add additional multi-line formatting edge cases

#### Files to Modify

- `packages/core/src/parser/parse-declarations.ts`
- `packages/core/src/parser/import-namespace.test.ts`
- `packages/core/src/parser/mixed-imports.test.ts`

---

### Phase 3: Mutually Recursive Types with `and` (Low Priority)

**Impact**: Low - workaround exists (separate declarations)
**Effort**: Medium - new grammar feature requiring AST changes
**Tests affected**: 2

#### Problem

The `and` keyword exists in the lexer but isn't wired up for type declarations:
```vibefun
type Expr = Lit(Int) | Lambda(Pattern, Expr)
and Pattern = PVar(String) | PExpr(Expr);
```

This syntax allows mutually recursive types to be defined in a single declaration group, making the mutual dependency explicit.

#### Current Workaround

Users can achieve mutual recursion with separate declarations:
```vibefun
type Expr = Lit(Int) | Lambda(Pattern, Expr);
type Pattern = PVar(String) | PExpr(Expr);
```

This works but doesn't make the mutual dependency explicit.

#### Solution Approach

1. **Update AST** to represent type declaration groups
   - Option A: Add `TypeGroup` node containing multiple `TypeDeclaration`s
   - Option B: Extend `TypeDeclaration` to have `andClauses: TypeDeclaration[]`
   - Recommend Option A for cleaner separation

2. **Modify type declaration parser**
   - After parsing first type declaration, check for `and` keyword
   - If found, parse additional type declarations
   - Group them into a single AST node
   - Update desugarer to handle type groups

3. **Testing**
   - Un-skip tests in `recursive-types.test.ts:331,383`
   - Add edge cases: 3+ mutually recursive types, nested `and` chains
   - Test error handling for malformed `and` syntax

4. **Language spec update**
   - Document `and` keyword syntax in type declaration section
   - Clarify semantics vs separate declarations

#### Files to Modify

- `packages/core/src/types/ast.ts`
- `packages/core/src/parser/parse-declarations.ts`
- `packages/core/src/parser/recursive-types.test.ts`
- `docs/spec/05-type-system/type-declarations.md` (potentially)

---

### Phase 4: Type Parameter Trailing Commas (Lowest Priority)

**Impact**: Very low - rare syntax pattern
**Effort**: Low - simple parser addition
**Tests affected**: 1

#### Problem

Trailing commas not supported in type parameter lists:
```vibefun
type Map<K, V,> = { get: (K) -> Option<V> };
```

#### Solution Approach

1. **Modify type parameter parsing**
   - In `parseTypeParameters()` function
   - After parsing each type parameter and comma, check if next token is `>`
   - If so, allow the trailing comma
   - Similar to existing trailing comma logic in other contexts

2. **Testing**
   - Un-skip test in `trailing-commas.test.ts:318`
   - Ensure consistency with other trailing comma behavior

#### Files to Modify

- `packages/core/src/parser/parse-declarations.ts`
- `packages/core/src/parser/trailing-commas.test.ts`

---

### Phase 5: Testing & Validation

After each phase:

1. **Run tests**: `npm test` - ensure phase tests pass
2. **Check for regressions**: Verify all previously passing tests still pass
3. **Quality checks**: `npm run verify` (type check, lint, format)
4. **Update task tracking**: Mark phase complete in tasks.md

Final validation:

1. **Full test suite**: All 2583 tests must pass
2. **No skipped tests**: Confirm 0 skipped tests remain
3. **Quality checks**: All must pass
4. **Documentation**: Update if language spec changed

---

## Success Criteria

- ✅ All 2583 tests passing (100% pass rate)
- ✅ Zero skipped tests
- ✅ No test regressions
- ✅ All quality checks pass (`npm run verify`)
- ✅ Language spec updated if needed

## Risk Assessment

**Low Risk Overall** - All changes are additive:
- Phase 1: Moderate complexity, but well-isolated to lambda parsing
- Phase 2: Low complexity, straightforward newline handling
- Phase 3: Moderate complexity, requires AST changes but well-scoped
- Phase 4: Minimal complexity

No risk of breaking existing functionality since we're only un-skipping tests and adding support for currently unsupported syntax.

## Alternative Approaches

### Option A: Selective Implementation
Implement only Phase 1 (record return types) as it has the highest user impact, and leave the other edge cases for future work.

### Option B: Close Current Task
Since parser-feature-gaps achieved 100% of planned features:
- Archive parser-feature-gaps task
- Leave these 7 edge cases as known limitations
- Move on to type checker or code generator work
- Address edge cases only if users request them

## Dependencies

None - this work is independent and doesn't block other compiler development.

## Timeline Considerations

No timeline specified. Each phase can be implemented independently when time allows. The parser is production-ready even without these edge cases addressed.
