# Parser Completion Plan

**Created:** 2025-11-02
**Last Updated:** 2025-11-02
**Status:** Ready to implement

## Overview

Complete the vibefun parser implementation to achieve 100% spec coverage. Current parser is 98% complete with ~305 tests. Need to add:
1. Full Ref type support (ref expressions, dereference, assignment)
2. Re-export syntax for modules
3. Enhanced test coverage (integration, error recovery, edge cases)

## Current State

### What's Working ✓
- All lexical features (comments, identifiers, literals, keywords, operators)
- All expression types (literals, variables, calls, operators, if, match, records, lists, lambdas, blocks, pipes)
- All function features (definitions, currying, recursion, mutual recursion, composition)
- Complete pattern matching (all pattern types, guards, or-patterns)
- Full type system parsing (annotations, primitives, functions, generics, records, variants, unions)
- Module imports (named, namespace, type imports, mixed)
- Module exports (declarations, external)
- JavaScript interop (external declarations, blocks, overloading, unsafe blocks)
- ~305 comprehensive tests with excellent coverage

### What's Missing ✗
1. **Ref operations**: ref(expr), dereference (!), assignment (:=)
2. **Re-exports**: `export { x } from "module"` syntax
3. **Enhanced tests**: More integration, error recovery, and edge case coverage

## Implementation Phases

### Phase 1: Ref Types & Operations

**Goal:** Add full mutable reference support as specified in the language spec.

#### 1.1 AST Node Updates
**File:** `packages/core/src/types/ast.ts`

Add or verify these AST nodes exist:
```typescript
// Ref creation: ref(value)
export interface RefExpr extends BaseNode {
    type: 'RefExpr';
    value: Expr;
}

// Dereference: expr!
export interface DerefExpr extends BaseNode {
    type: 'DerefExpr';
    operand: Expr;
}

// Assignment: lhs := rhs
export interface AssignExpr extends BaseNode {
    type: 'AssignExpr';
    left: Expr;
    right: Expr;
}
```

Update `Expr` type union to include these nodes.

#### 1.2 Parser Implementation
**File:** `packages/core/src/parser/parser.ts`

**Challenge:** Disambiguate `!` operator
- Prefix `!` before expression → Logical NOT
- Postfix `!` after expression → Dereference

**Implementation approach:**
1. Parse `ref` as a regular identifier (already works as function call)
2. Add postfix `!` parsing in `parsePostfix()` or similar
3. Verify `:=` operator parsing (likely already implemented in binary operators)

**Key methods to modify:**
- `parsePostfixExpression()` - add dereference handling
- Verify `parseBinaryExpression()` includes `:=` at correct precedence (precedence 1)

#### 1.3 Testing
**File:** `packages/core/src/parser/ref-operations.test.ts` (new)

Test categories:
- **Ref creation**: `ref(42)`, `ref(person)`, `ref({ x: 1 })`, nested refs
- **Dereference**: `x!`, `person.age!`, `(getRef())!`, `array[0]!`
- **Assignment**: `x := 10`, `obj.field := value`, `array[i] := x`
- **Combinations**: `(ref(5))! + 10`, `(x!)! := 20`, precedence tests
- **In patterns**: Ref types in pattern matching contexts
- **Error cases**: Invalid ref usage, type mismatches

**Target:** ~25 tests

### Phase 2: Re-exports

**Goal:** Support exporting items from other modules (barrel modules, re-export patterns).

#### 2.1 AST Updates
**File:** `packages/core/src/types/ast.ts`

Update `ExportDeclaration` to support re-exports:
```typescript
export interface ExportDeclaration extends BaseNode {
    type: 'ExportDeclaration';
    declaration: Declaration | null;  // null for re-exports
    exportItems?: ImportItem[];        // For re-exports
    from?: string;                     // Module path for re-exports
}
```

Or create a separate `ReExportDeclaration` node:
```typescript
export interface ReExportDeclaration extends BaseNode {
    type: 'ReExportDeclaration';
    items: ImportItem[] | null;  // null for export *
    from: string;
}
```

#### 2.2 Parser Implementation
**File:** `packages/core/src/parser/parser.ts`

Modify `parseExport()` method:
1. After parsing `export { items }`, check for `from` keyword
2. If `from` present, parse module path
3. Create appropriate AST node
4. Handle `export *` syntax: `export * from "module"`
5. Support type re-exports: `export { type T } from "mod"`

**Syntax to support:**
```vibefun
export { x, y } from "./module"
export { x as y } from "./module"
export * from "./module"
export { type User, getUser } from "./api"
```

#### 2.3 Testing
**File:** `packages/core/src/parser/declarations.test.ts` (add to existing)

Test cases:
- Named re-exports: `export { map, filter } from "./list"`
- Aliased re-exports: `export { map as listMap } from "./list"`
- Namespace re-exports: `export * from "./utils"`
- Type re-exports: `export { type User } from "./types"`
- Mixed re-exports: `export { type T, value } from "./mod"`
- Error cases: Missing from clause, invalid syntax

**Target:** ~10 tests

### Phase 3: Enhanced Test Coverage

**Goal:** Add comprehensive integration, error recovery, and edge case tests.

#### 3.1 Integration Tests
**File:** `packages/core/src/parser/parser-integration.test.ts` (expand existing)

Add realistic end-to-end programs testing:
- Refs + pattern matching
- Pipes + composition operators
- Complex module systems (imports + exports + re-exports)
- External blocks with overloading and types
- Nested match expressions with guards
- Higher-order functions with complex types
- Large programs (100+ lines)

**Examples:**
```vibefun
// Counter with refs
let counter = ref(0)
let increment = () => counter := counter! + 1
let decrement = () => counter := counter! - 1
let getValue = () => counter!

// Module re-exports
export { type User, createUser, updateUser } from "./user"
export * from "./utils"

// Complex pattern matching with refs
match userRef! {
    | { status: Active, data: Some(info) } when info.verified => processVerified(info)
    | { status: Pending, data: _ } => waitForVerification()
    | _ => handleError()
}
```

**Target:** ~20 tests

#### 3.2 Error Recovery Tests
**File:** `packages/core/src/parser/parser-errors.test.ts` (expand existing)

Add malformed syntax tests:
- Unclosed delimiters: `{ x: 1`, `[1, 2`, `(a + b`
- Missing keywords: `if x then y` (no else), `match x` (no cases)
- Invalid tokens: `let @x = 5`, `type T = #`
- Mismatched brackets: `{ x: [1, 2 }`
- Missing separators: `let x = 1 let y = 2` (no semicolon)
- Invalid pattern syntax: `match x { Some() =>` (no body)
- Type syntax errors: `type T = <`, `List<Int`

Verify:
- Error messages are helpful
- Errors include location information
- Errors suggest fixes when possible

**Target:** ~20 tests

#### 3.3 Edge Case Tests
**File:** `packages/core/src/parser/parser-edge-cases.test.ts` (new)

Test extreme cases:
- **Deep nesting**: 20+ levels of nested expressions, types, patterns
- **Large literals**:
  - Very long strings (10KB+)
  - Large numbers (scientific notation with extreme exponents)
  - Deeply nested list literals
- **Unicode edge cases**:
  - Emoji in identifiers: `let 🚀 = 42`
  - RTL text in strings
  - Zero-width characters
  - Surrogate pairs
- **Operator precedence**:
  - Complex chains: `a |> b >> c << d`
  - Mixed operators: `x + y * z |> f`
  - Negation chains: `--x`, `!!x`
- **Ambiguous syntax**:
  - Block vs record: `{}`, `{ x }`, `{ x; }`
  - Generic vs comparison: `x<y>z`, `f<A>()`
  - Match case body parsing with `|`

**Target:** ~10 tests

### Phase 4: Validation & Documentation

**Goal:** Ensure quality and update documentation.

#### 4.1 Quality Checks

Run all checks in sequence:
```bash
npm run verify  # Runs check, lint, test, format
```

Individual checks:
```bash
npm run check      # TypeScript type checking
npm run lint       # ESLint
npm test           # All tests (~370+ after additions)
npm run format     # Prettier formatting
```

All must pass before completion.

#### 4.2 Documentation Updates

**Files to update:**
1. **CLAUDE.md** (if needed, following Documentation Rules)
   - Only update stable architectural info
   - Do NOT add implementation status
   - Do NOT reference progress documents

2. **.claude/design/parser-architecture.md** (create if useful)
   - Document disambiguation strategies (!, {}, >>)
   - Explain precedence handling
   - Note design decisions

3. **Parser inline comments** (packages/core/src/parser/parser.ts)
   - Add JSDoc for new methods
   - Document tricky disambiguation logic
   - Note spec references where relevant

## Success Criteria

- [x] Ref operations fully parsed (ref, !, :=)
- [x] Re-exports working (all variants)
- [x] Test count reaches ~370+ tests
- [x] All quality checks pass (check, lint, test, format)
- [x] 100% spec coverage achieved
- [x] Documentation updated
- [x] No regressions in existing tests

## Risk Analysis

### Low Risk Areas
- Re-exports: Straightforward addition to existing export parsing
- Additional tests: No risk, pure additions
- Documentation: No risk

### Medium Risk Areas
- **Ref operations**: Need careful disambiguation of `!` operator
  - Mitigation: Context-based parsing (postfix vs prefix)
  - Extensive tests for edge cases

- **AST changes**: Could affect downstream components
  - Mitigation: Only add new node types, don't modify existing
  - Run full test suite to catch issues

### Complexity Notes

**Disambiguating `!`:**
```vibefun
!x      // Logical NOT (prefix unary)
x!      // Dereference (postfix unary)
!!x     // NOT of dereference
!(!x)   // NOT of NOT
```

Strategy: Parse postfix `!` with higher precedence than prefix `!`.

**Re-export parsing:**
```vibefun
export { x }           // Regular export (already works)
export { x } from "m"  // Re-export (new)
```

Strategy: Check for `from` keyword after parsing export items.

## Notes

- Parser is already 98% complete - this is polish, not foundation work
- Existing test quality is excellent - we're adding more coverage, not fixing gaps
- No breaking changes to existing parser behavior
- All additions are additive (new features, more tests)

## Timeline Estimate

- Phase 1 (Ref operations): 2-3 hours (implementation + tests)
- Phase 2 (Re-exports): 1-2 hours (implementation + tests)
- Phase 3 (Enhanced tests): 2-3 hours (writing comprehensive tests)
- Phase 4 (Validation & docs): 1 hour (checks + documentation)

**Total: 6-9 hours** for complete implementation with thorough testing.
