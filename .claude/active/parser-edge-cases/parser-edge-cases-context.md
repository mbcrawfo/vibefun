# Parser Edge Cases - Context & Key Information

**Last Updated**: 2025-11-22

## Quick Summary

This task addresses 7 remaining skipped tests (0.3% of test suite) to achieve 100% parser test pass rate. Parent task parser-feature-gaps completed all 18 planned features. These are optional enhancements for edge cases and known limitations.

## Current Metrics

- **Total tests**: 2583
- **Passing**: 2576 (99.7%)
- **Skipped**: 7 (0.3%)
- **Failing**: 0
- **Test files**: 96 total, 34 parser-specific

## Key Files & Locations

### Implementation Files

**Primary parser files**:
- `packages/core/src/parser/parse-expressions.ts` - Expression parsing (Phase 1)
- `packages/core/src/parser/parse-declarations.ts` - Import/type declarations (Phases 2, 3, 4)
- `packages/core/src/types/ast.ts` - AST definitions (Phase 3)

**Helper modules**:
- `packages/core/src/parser/parse-types.ts` - Type annotation parsing
- `packages/core/src/lexer/lexer.ts` - Tokenization (already supports `and` keyword)

### Test Files with Skipped Tests

1. `packages/core/src/parser/lambda-return-type.test.ts:128` - Record return types
2. `packages/core/src/parser/import-namespace.test.ts:279` - Multi-line namespace import
3. `packages/core/src/parser/mixed-imports.test.ts:259` - Multi-line mixed import (opening brace)
4. `packages/core/src/parser/mixed-imports.test.ts:283` - Multi-line mixed import (alternative format)
5. `packages/core/src/parser/recursive-types.test.ts:331` - Mutually recursive types with `and`
6. `packages/core/src/parser/recursive-types.test.ts:383` - Complex mutually recursive types
7. `packages/core/src/parser/trailing-commas.test.ts:318` - Type parameter trailing comma

### Language Specification

- `docs/spec/05-type-system/type-declarations.md` - Type syntax (Phase 3 may need updates)
- `docs/spec/02-syntax/declarations.md` - Import/export syntax
- `docs/spec/02-syntax/expressions.md` - Lambda expression syntax

## Skipped Test Details

### 1. Record Return Types in Lambdas (Phase 1)

**Location**: `lambda-return-type.test.ts:128`
**Type**: Known parser bug
**Priority**: Medium

**Test code**:
```typescript
it.skip('should parse lambda with record return type', () => {
    const source = `(user): { name: String, age: Int } => user`;
    const lexer = new Lexer(source, 'test.vf');
    const parser = new Parser(lexer.tokenize(), 'test.vf');
    const expr = parser.parseExpression();
    // ... assertions
});
```

**Error**: "Expected ';' after declaration"

**Root cause**: When parser sees `{` after `:`, it cannot distinguish record type from record literal.

**Impact**: Users must use type aliases as workaround:
```vibefun
type UserRecord = { name: String, age: Int };
(user): UserRecord => user  // This works
```

---

### 2. Multi-line Namespace Import (Phase 2a)

**Location**: `import-namespace.test.ts:279`
**Type**: Limitation - multi-line handling
**Priority**: Low

**Test code**:
```typescript
it.skip('should handle multi-line namespace import', () => {
    const source = `import *
    as List
    from "./list";`;
    // ... test expects success
});
```

**Impact**: Minimal - formatters typically avoid this pattern. Users can write on one line.

---

### 3-4. Multi-line Mixed Imports (Phase 2b)

**Location**: `mixed-imports.test.ts:259,283`
**Type**: Limitation - multi-line handling
**Priority**: Low

**Test code**:
```typescript
it.skip('should handle newline after opening brace', () => {
    const source = `import {
    type User,
    getUser
} from "./api";`;
    // ... test expects success
});
```

**Impact**: Minimal - same as namespace imports. Single-line imports work fine.

---

### 5-6. Mutually Recursive Types with `and` (Phase 3)

**Location**: `recursive-types.test.ts:331,383`
**Type**: Feature not implemented
**Priority**: Low

**Test code (simple case)**:
```typescript
it.skip('should parse mutually recursive types with and keyword', () => {
    const source = `
        type Expr = Lit(Int) | Lambda(Pattern, Expr)
        and Pattern = PVar(String) | PExpr(Expr);
    `;
    // ... test expects TypeGroup or connected declarations
});
```

**Test code (complex case)**:
```typescript
it.skip('should parse multiple mutually recursive types', () => {
    const source = `
        type A = B(B) | ABase(Int)
        and B = C(C) | BBase(String)
        and C = A(A) | CBase(Bool);
    `;
    // ... test expects 3-way mutual recursion
});
```

**Current workaround**: Separate declarations work fine
```vibefun
type Expr = Lit(Int) | Lambda(Pattern, Expr);
type Pattern = PVar(String) | PExpr(Expr);
```

**Impact**: Low - workaround exists, `and` keyword just makes mutual dependency explicit.

---

### 7. Type Definition Trailing Comma (Phase 4)

**Location**: `trailing-commas.test.ts:318`
**Type**: Edge case - rare syntax
**Priority**: Very low

**Test code**:
```typescript
it.skip('should allow trailing comma in type parameters', () => {
    const source = `type Map<K, V,> = { get: (K) -> Option<V> };`;
    // ... test expects success
});
```

**Impact**: Very low - rare pattern, no practical use case.

---

## Design Decisions

### Phase 1: Grammar Ambiguity Resolution Strategy

**Problem**: `{` can start either a type or an expression.

**Considered approaches**:

1. **Deep lookahead** (chosen)
   - Look ahead for `:` patterns inside braces (indicates type)
   - Look for `=>` after closing brace (confirms lambda)
   - Pros: No grammar changes, localized fix
   - Cons: More complex parser logic

2. **Require parentheses around record types**
   - Syntax: `(user): ({ name: String, age: Int }) => user`
   - Pros: Unambiguous grammar
   - Cons: User-facing syntax change, inconsistent with other contexts

3. **Contextual keywords**
   - Use `type` keyword: `(user): type { name: String, age: Int } => user`
   - Pros: Clear intent
   - Cons: Verbose, not idiomatic for ML-family languages

**Decision**: Use deep lookahead. Maintains clean syntax while resolving ambiguity.

### Phase 3: AST Structure for Type Groups

**Problem**: How to represent mutually recursive type declarations?

**Considered approaches**:

1. **TypeGroup node** (recommended)
   ```typescript
   interface TypeGroup extends Declaration {
       kind: 'TypeGroup';
       declarations: TypeDeclaration[];
   }
   ```
   - Pros: Clean separation, explicit grouping, easy to process
   - Cons: New AST node type

2. **Extend TypeDeclaration**
   ```typescript
   interface TypeDeclaration extends Declaration {
       kind: 'TypeDeclaration';
       name: string;
       // ...
       andClauses?: TypeDeclaration[];  // Additional types
   }
   ```
   - Pros: No new node type
   - Cons: Asymmetric (first type has special status), harder to iterate

3. **Link types in environment**
   - Keep separate declarations, mark as mutually recursive in type environment
   - Pros: No AST changes
   - Cons: Parser shouldn't know about type environment, separation of concerns

**Decision**: Use TypeGroup node (Option 1). Clean, symmetric, follows separation of concerns.

---

## Technical Notes

### Newline Handling Pattern

The parser already has a robust pattern for skipping newlines:
```typescript
private skipNewlines(): void {
    while (this.current().type === 'NEWLINE') {
        this.advance();
    }
}
```

Used throughout parser in contexts where newlines are insignificant. Phase 2 simply extends this pattern to imports.

### Lexer Support for `and` Keyword

The lexer already recognizes `and` as a keyword token:
```typescript
// From lexer/lexer.ts
const KEYWORDS = new Set([
    // ... other keywords
    'and',
    // ...
]);
```

Phase 3 just needs to wire up the parsing logic.

### Trailing Comma Precedent

The parser already supports trailing commas in:
- Function arguments: `foo(1, 2, 3,)`
- List literals: `[1, 2, 3,]`
- Record literals: `{ x: 1, y: 2, }`
- Import specifiers: `import { foo, bar, } from "./mod";`

Phase 4 extends this to type parameters for consistency.

---

## Testing Strategy

### Test Pyramid

For each phase:
1. **Un-skip target test** - Verify original issue is fixed
2. **Add edge cases** - Cover variations and corner cases
3. **Regression tests** - Ensure no existing tests break
4. **Integration tests** - Verify interaction with other features

### Example Edge Cases by Phase

**Phase 1** (record return types):
- Nested records: `(): { user: { name: String } } => ...`
- Tuple returns: `(): (Int, String) => ...`
- Union returns: `(): Result<Int, String> => ...`
- Function type returns: `(): (Int) -> String => ...`

**Phase 2** (multi-line imports):
- Multiple newlines: `import *\n\n\nas List...`
- Mixed whitespace: tabs, spaces, newlines
- Comments between tokens (if supported)

**Phase 3** (mutually recursive types):
- 3+ mutually recursive types
- Mix of variant and record types
- Generic mutually recursive types
- Error: `and` without preceding type declaration

**Phase 4** (trailing commas):
- Single type param with comma: `type Id<T,> = T;`
- Multiple params: `type Pair<A, B,> = ...;`
- No params: `type Unit<> = ...;` (should still work)

---

## Related Work

### Completed in parser-feature-gaps

All these features successfully implemented:
- Pattern guards (`when` clauses)
- Type annotations in patterns
- Nested or-patterns
- Lambda parameter/return type annotations
- Lambda parameter destructuring
- Generic external declarations
- Import * as namespace
- Mixed type/value imports
- Record field shorthand
- Trailing commas (in most contexts)
- Multiple spreads
- Tuple types
- Recursive type definitions (simple)
- Empty blocks
- Multi-line variant types

### Not in Scope

These are explicitly not part of current language spec:
- For loops
- Async/await
- Traits/type classes
- Generators
- Effect system
- Module functors
- Active patterns
- String interpolation

See `docs/spec/13-appendix/future-features.md` for details.

---

## Success Metrics

- All 2583 tests passing (100% pass rate)
- Zero skipped tests
- No regressions in existing tests
- Quality checks pass: `npm run verify`
- Code coverage maintained or improved

## Open Questions

1. **Phase 1**: Should record types in return position require parentheses for clarity? Or keep current approach?

2. **Phase 3**: Should `and` keyword create a new top-level declaration type, or be sugar that desugars to separate declarations?

3. **Phase 3**: Should mutually recursive types have special semantics, or is grouping purely syntactic?

4. **All phases**: Should we update the language spec with these edge cases, or treat them as implementation details?

## Resources

- Parser implementation: `packages/core/src/parser/`
- Test suite: 34 parser test files, 2583 total tests
- Language spec: `docs/spec/` (54 files across 13 sections)
- Parent task docs: `.claude/active/parser-feature-gaps/`
