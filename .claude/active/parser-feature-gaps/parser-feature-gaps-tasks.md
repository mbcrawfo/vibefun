# Parser Feature Gaps - Task Checklist

**Last Updated**: 2025-11-20
**Approach**: Test-Driven Development (TDD)
**Status**: In Progress - Phase 1 Complete! (3/18 features done, 17%)

## Task Format

Each task follows: `[ ] Feature - Write tests → Implement → Verify`

## Phase 1: Pattern Matching Features

### 1.1 Pattern Guards (when clauses) ✅ COMPLETE

- [x] Create `packages/core/src/parser/pattern-guards.test.ts`
- [x] Write test: Basic guard `match x with | n when n > 0 => "positive"`
- [x] Write test: Guard with complex expression `when x > 0 && x < 100`
- [x] Write test: Guard with multiple bindings from pattern
- [x] Write test: Guard that evaluates to false should not match
- [x] Write test: Multiple patterns with different guards
- [x] Write test: Nested match expressions with guards
- [x] Write test: Guard error cases (non-boolean guard expression)
- [x] Run tests to verify current state
- [x] `when` keyword already exists in lexer
- [x] `guard?: Expr` field already exists in MatchCase AST node
- [x] Guard parsing already implemented in `parse-expressions.ts`
- [x] **FIXED BUG**: Changed guard parsing from `parseLogicalAnd` to `parseLogicalOr` to support `||` operators in guards
- [x] Verify all guard tests pass (27/27 tests passing)
- [x] Run `npm run verify` to ensure quality (all checks passing)

**Status**: ✅ COMPLETE - Guards were already implemented, but had a bug preventing `||` operators. Bug fixed and comprehensive tests added.

**Acceptance**: All guard tests pass, spec examples covered, guards work in all pattern contexts

### 1.2 Type Annotations in Patterns ✅ COMPLETE

- [x] Create `packages/core/src/parser/pattern-type-annotations.test.ts`
- [x] Write test: Variable pattern with type `(x: Int) in match`
- [x] Write test: Tuple pattern with types `((x: Int, y: String))`
- [x] Write test: Record pattern with field types `{ name: String, age: Int }`
- [x] Write test: Constructor pattern with typed params `Some(x: Int)`
- [x] Write test: Nested patterns with type annotations
- [x] Write test: Type annotation with complex types `(list: List<Int>)`
- [x] Write test: Error cases (type mismatch, invalid syntax)
- [x] Run tests (expect failures)
- [x] Add `TypeAnnotatedPattern` to Pattern AST type (new kind)
- [x] Update `parse-patterns.ts` to parse `:` followed by type after patterns
- [x] Add forward declaration and setter for parseTypeExpr in parse-patterns.ts
- [x] Wire up setParseTypeExpr in parser.ts initialization
- [x] Implement type annotation parsing in parenthesized pattern section
- [x] Add support for record shorthand with type annotations `{ (name: String), age }`
- [x] Verify all 26 tests pass
- [x] Run `npm run verify` - all checks passing (2227 total tests)

**Status**: ✅ COMPLETE - Type annotations fully implemented and tested

**Acceptance**: Type annotations parse correctly in all pattern contexts, AST preserves type info

### 1.3 Nested Or-Patterns ✅ COMPLETE

- [x] Create `packages/core/src/parser/nested-or-patterns.test.ts`
- [x] Write test: Basic nested or `Ok("success" | "complete")`
- [x] Write test: Deeply nested or-patterns
- [x] Write test: Or-patterns in record field positions `{ status: "active" | "pending" }`
- [x] Write test: Or-patterns in tuple positions `(x, 1 | 2 | 3)`
- [x] Write test: Or-patterns in list elements `["a" | "b", x]`
- [x] Write test: Combined with guards in match expressions
- [x] Write test: Boolean literals in or-patterns `true | false`
- [x] Run tests to check current implementation (24/27 passing)
- [x] **FIXED BUG**: Or-pattern lookahead missing BOOL_LITERAL and LPAREN tokens
- [x] Verify all 27 tests pass
- [x] Run `npm run verify` - all checks passing (2254 total tests)

**Status**: ✅ COMPLETE - Nested or-patterns were mostly working, fixed lookahead bug for boolean literals and parenthesized patterns

**Acceptance**: Nested or-patterns parse correctly in all contexts (constructors, tuples, records, lists)

---

## Phase 2: Lambda Expression Features

### 2.1 Lambda Parameter Type Annotations

- [ ] Create `packages/core/src/parser/lambda-annotations.test.ts`
- [ ] Write test: Single param with type `(x: Int) => x + 1`
- [ ] Write test: Multiple params with types `(x: Int, y: String) => ...`
- [ ] Write test: Complex type annotation `(f: (Int) -> Int) => f(42)`
- [ ] Write test: Generic type in param `(list: List<T>) => ...`
- [ ] Write test: Partial type annotations `(x: Int, y) => ...` (if allowed)
- [ ] Write test: Error cases (invalid type syntax)
- [ ] Run tests
- [ ] Add `type?: TypeExpr` to lambda parameter AST nodes
- [ ] Update lambda parameter parsing to handle `:` type syntax
- [ ] Verify tests pass
- [ ] Run `npm run verify`

**Acceptance**: Lambda parameters can have type annotations, AST preserves types

### 2.2 Lambda Return Type Annotations

- [ ] Write test: Return type only `(x): Int => x + 1`
- [ ] Write test: Both param and return types `(x: Int): Int => x + 1`
- [ ] Write test: Complex return type `(x): Option<Int> => Some(x)`
- [ ] Write test: Function return type `(x): (Int) -> Int => ...`
- [ ] Write test: Block body with return type `(x): Int => { return x + 1; }`
- [ ] Write test: Error cases (syntax errors)
- [ ] Run tests
- [ ] Add `returnType?: TypeExpr` to lambda AST node
- [ ] Update lambda parsing to handle `:` after parameter list
- [ ] Ensure disambiguation from parameter type annotations
- [ ] Verify tests pass
- [ ] Run `npm run verify`

**Acceptance**: Lambda return types parse correctly, AST preserves return type info

### 2.3 Lambda Parameter Destructuring

- [ ] Write test: Record destructuring `({ name, age }) => ...`
- [ ] Write test: Tuple destructuring `((x, y)) => ...`
- [ ] Write test: List pattern destructuring `([first, ...rest]) => ...`
- [ ] Write test: Nested destructuring `({ user: { name } }) => ...`
- [ ] Write test: Destructuring with type annotations `({ name }: { name: String }) => ...`
- [ ] Write test: Mixed destructured and simple params (if allowed)
- [ ] Write test: Error cases (invalid patterns)
- [ ] Run tests
- [ ] Update lambda parameter parsing to accept patterns, not just identifiers
- [ ] Verify pattern parser is properly integrated
- [ ] Verify tests pass
- [ ] Run `npm run verify`

**Acceptance**: Lambda params can use any pattern syntax, destructuring works correctly

---

## Phase 3: External Declaration Features

### 3.1 Generic External Declarations

- [ ] Create `packages/core/src/parser/external-generics.test.ts`
- [ ] Write test: Single type param `external identity: <T>(T) -> T`
- [ ] Write test: Multiple type params `external map: <A, B>(List<A>, (A) -> B) -> List<B>`
- [ ] Write test: Generic in external block
- [ ] Write test: Exported generic external
- [ ] Write test: Generic external with from clause
- [ ] Write test: Error cases (invalid type param syntax)
- [ ] Run tests
- [ ] Add `typeParams?: TypeParam[]` to external declaration AST node
- [ ] Update external parsing to handle `<...>` before function name
- [ ] Verify tests pass
- [ ] Run `npm run verify`

**Acceptance**: External declarations can have type parameters, AST preserves generics

### 3.2 External Type Declarations

- [ ] Write test: Type inside external block `external { type Response = {...} }`
- [ ] Write test: Generic external type
- [ ] Write test: Multiple types in external block
- [ ] Write test: External type with from clause
- [ ] Write test: Exported external type
- [ ] Write test: Error cases
- [ ] Run tests
- [ ] Update external block parser to accept type declarations
- [ ] Handle mixed value and type externals in same block
- [ ] Verify tests pass
- [ ] Run `npm run verify`

**Acceptance**: Type declarations work inside external blocks

### 3.3 Opaque Type Constructors

- [ ] Write test: Opaque type `type Headers: Type = "Headers"`
- [ ] Write test: Generic opaque type `type Map<K, V>: Type = "Map"`
- [ ] Write test: Opaque type in external signatures
- [ ] Write test: Error cases (invalid Type usage)
- [ ] Run tests
- [ ] Verify `Type` identifier is recognized in type position
- [ ] Add opaque type flag to AST if needed
- [ ] Verify tests pass
- [ ] Run `npm run verify`

**Acceptance**: Opaque type constructors parse with Type identifier

---

## Phase 4: Module System Features

### 4.1 Import * as Namespace

- [ ] Create `packages/core/src/parser/import-namespace.test.ts`
- [ ] Write test: Basic namespace import `import * as List from './list'`
- [ ] Write test: Type namespace import `import type * as Types from './types'`
- [ ] Write test: Namespace with re-export
- [ ] Write test: Error cases (invalid syntax)
- [ ] Run tests
- [ ] Add namespace import form to import AST node
- [ ] Update import parsing to recognize `* as identifier`
- [ ] Verify tests pass
- [ ] Run `npm run verify`

**Acceptance**: Namespace imports parse correctly

### 4.2 Mixed Type/Value Imports

- [ ] Write test: Mixed import `import { type User, getUser } from './api'`
- [ ] Write test: Multiple types and values
- [ ] Write test: Renamed mixed imports `import { type User as U, getUser } from './api'`
- [ ] Write test: Error cases
- [ ] Run tests
- [ ] Add `isType: boolean` flag to import specifier nodes
- [ ] Update import specifier parsing to handle per-item `type` keyword
- [ ] Verify tests pass
- [ ] Run `npm run verify`

**Acceptance**: Can mix type and value imports in single statement

---

## Phase 5: Data Literal Features

### 5.1 Record Field Shorthand

- [ ] Review existing `packages/core/src/parser/record-shorthand.test.ts`
- [ ] Compare tests against spec requirements (data-literals.md:153-181)
- [ ] Add test: Shorthand in expression `let name = "A"; { name, age: 30 }`
- [ ] Add test: Shorthand in pattern `match obj with | { name, age } => ...`
- [ ] Add test: Mixed shorthand and full syntax
- [ ] Add test: Shorthand with complex expressions (if allowed)
- [ ] Add test: Error cases (shorthand for undefined variable)
- [ ] Run tests
- [ ] Enhance implementation if gaps found
- [ ] Verify all tests pass
- [ ] Run `npm run verify`

**Acceptance**: Field shorthand works per spec in all contexts

### 5.2 Trailing Commas

- [ ] Create `packages/core/src/parser/trailing-commas.test.ts`
- [ ] Write test: List trailing comma `[1, 2, 3,]`
- [ ] Write test: Record trailing comma `{ name: "A", age: 30, }`
- [ ] Write test: Tuple trailing comma `(1, 2, 3,)`
- [ ] Write test: Function param trailing comma `fn(a, b, c,)`
- [ ] Write test: Type param trailing comma `Map<K, V,>`
- [ ] Write test: Function type param trailing comma `(a: Int, b: Int,) -> Int`
- [ ] Write test: Pattern context trailing commas
- [ ] Write test: Record type trailing comma `{ name: String, age: Int, }`
- [ ] Write test: Multiple trailing commas should error `[1, 2,,]`
- [ ] Run tests
- [ ] Update all comma-separated list parsers to accept optional trailing comma
- [ ] Update: Record expression parser
- [ ] Update: List expression parser
- [ ] Update: Tuple parser
- [ ] Update: Function call parser
- [ ] Update: Type parsers (record type, function type, type params)
- [ ] Update: Pattern parsers
- [ ] Verify all tests pass
- [ ] Run `npm run verify`

**Acceptance**: Trailing commas allowed in all comma-separated contexts per spec

### 5.3 Multiple Spreads

- [ ] Write test: Multiple list spreads `[...a, ...b, ...c]`
- [ ] Write test: Multiple record spreads `{ ...a, ...b, x: 1 }`
- [ ] Write test: Spread ordering semantics (right-to-left override)
- [ ] Write test: Spread in middle positions `[1, ...mid, 2]`
- [ ] Write test: Combined with trailing commas
- [ ] Write test: Error cases (spread in invalid positions)
- [ ] Run tests
- [ ] Update record/list parsing to allow multiple spreads
- [ ] Verify spread semantics are correct
- [ ] Verify tests pass
- [ ] Run `npm run verify`

**Acceptance**: Multiple spreads work correctly with proper semantics

---

## Phase 6: Type System Features

### 6.1 Tuple Type Syntax

- [ ] Review spec `tuples.md` for tuple type syntax
- [ ] Write test: Tuple type annotation `let x: (Int, String) = (1, "a")`
- [ ] Write test: Nested tuple types `((Int, Int), String)`
- [ ] Write test: Tuple in function return `(): (Int, String) => ...`
- [ ] Write test: Tuple vs function type disambiguation
- [ ] Write test: Error cases
- [ ] Run tests
- [ ] Determine if tuple types need distinct AST node or are same as product types
- [ ] Implement distinct parsing if needed
- [ ] Verify tests pass
- [ ] Run `npm run verify`

**Acceptance**: Tuple types parse correctly and are distinct from function types if needed

### 6.2 Recursive Type Definitions

- [ ] Write test: Simple recursive type `type List<T> = Nil | Cons(T, List<T>)`
- [ ] Write test: Mutually recursive types `type Foo = ... Bar ... and Bar = ... Foo ...`
- [ ] Write test: Recursive record type `type Node = { value: Int, next: Option<Node> }`
- [ ] Write test: Deeply nested recursion
- [ ] Write test: Error cases (if any restrictions)
- [ ] Run tests to verify current support
- [ ] Enhance if needed
- [ ] Verify tests pass
- [ ] Run `npm run verify`

**Acceptance**: Recursive type definitions work correctly

---

## Phase 7: Syntax Edge Cases

### 7.1 Empty Blocks

- [ ] Write test: Empty block expression `{}`
- [ ] Write test: Empty block in lambda `() => {}`
- [ ] Write test: Empty block evaluates to Unit type
- [ ] Write test: Empty block in match arm
- [ ] Write test: Error cases (if any)
- [ ] Run tests
- [ ] Update block parser to accept zero statements
- [ ] Verify empty block produces correct AST (block with empty statement list)
- [ ] Verify tests pass
- [ ] Run `npm run verify`

**Acceptance**: Empty blocks parse and behave per spec

### 7.2 Multi-line Variant Types

- [ ] Write test: Variant with `|` on new lines
```
type Option<T> =
  | Some(T)
  | None
```
- [ ] Write test: Leading `|` syntax
- [ ] Write test: Comments between variants
- [ ] Write test: Mixed single/multi-line
- [ ] Write test: Error cases (invalid line breaks)
- [ ] Run tests
- [ ] Update type definition parser to handle newlines before `|`
- [ ] Verify tests pass
- [ ] Run `npm run verify`

**Acceptance**: Multi-line variant syntax works per spec

---

## Cross-Cutting Tasks

### Documentation
- [ ] Update CLAUDE.md if major changes to parser architecture
- [ ] Add code comments explaining complex parsing logic
- [ ] Update AST type definitions with JSDoc comments

### Quality Assurance
- [ ] Run full test suite after each phase: `npm test`
- [ ] Run type checking after each phase: `npm run check`
- [ ] Run linting after each phase: `npm run lint`
- [ ] Run formatter after each phase: `npm run format`
- [ ] Or use combined: `npm run verify`

### Integration Testing
- [ ] Create integration tests combining multiple new features
- [ ] Test guards + type annotations in patterns
- [ ] Test lambda destructuring + type annotations
- [ ] Test trailing commas + spreads
- [ ] Test complex nested structures with all new features

### Regression Testing
- [ ] Verify all existing tests still pass after each change
- [ ] Check no breaking changes to existing AST structure (if possible)
- [ ] Ensure backward compatibility with existing valid code

---

## Progress Tracking

### Phases Completed: 1/7 (Phase 1 Complete! ✅)

- [x] Phase 1: Pattern Matching Features (3/3 features - 100%) ✅
  - [x] 1.1 Pattern Guards ✅
  - [x] 1.2 Type Annotations in Patterns ✅
  - [x] 1.3 Nested Or-Patterns ✅
- [ ] Phase 2: Lambda Expression Features (0/3 features)
- [ ] Phase 3: External Declaration Features (0/3 features)
- [ ] Phase 4: Module System Features (0/2 features)
- [ ] Phase 5: Data Literal Features (0/3 features)
- [ ] Phase 6: Type System Features (0/2 features)
- [ ] Phase 7: Syntax Edge Cases (0/2 features)

### Total Features: 3/18 completed (17%)

---

## Notes

- Mark tasks complete immediately upon finishing
- Update "Last Updated" timestamp when making changes
- If a feature is found to already work during testing, still add comprehensive tests
- Document any deviations from spec or implementation challenges
- Run `npm run verify` after each feature completion

## Next Action

**Phase 1 Complete! ✅** All pattern matching features implemented and tested.

Start Phase 2: Lambda Expression Features - Begin with Phase 2.1 (Lambda Parameter Type Annotations). Create test file and write comprehensive tests following TDD approach.
