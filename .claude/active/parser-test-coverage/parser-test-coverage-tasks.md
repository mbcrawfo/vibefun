# Parser Test Coverage Enhancement - Task Checklist

**Last Updated**: 2025-11-11
**Status**: Ready to Start

## Task Format

Each task: `[ ] Test file/area - Create/enhance tests for [feature]`

---

## New Test Files to Create

### 1. Pattern Matching Tests

#### Pattern Guards (when clauses)
- [ ] Create `packages/core/src/parser/pattern-guards.test.ts`
- [ ] Add basic guard test: `| n when n > 0 => "positive"`
- [ ] Add guard with equality: `| x when x == 42 => ...`
- [ ] Add guard with boolean variable
- [ ] Add multiple guards in same match
- [ ] Add guards with multiple conditions: `when x > 0 && x < 100`
- [ ] Add guards with function calls
- [ ] Add guards using pattern bindings: `| Some(x) when x > 0 => ...`
- [ ] Add guards in nested matches
- [ ] Add guard with wildcard pattern
- [ ] Add guard always true/false
- [ ] Add guards with or-patterns integration
- [ ] Add guards with record pattern field bindings
- [ ] Add guards with list pattern element bindings
- [ ] Add error case: guard with non-boolean expression (parser accepts, type error later)
- [ ] Add error case: guard with syntax error
- [ ] Verify all tests pass
- [ ] Run `npm run verify`

**Acceptance**: Guards fully tested with spec examples, edge cases, and errors

#### Pattern Type Annotations
- [ ] Create `packages/core/src/parser/pattern-type-annotations.test.ts`
- [ ] Add variable pattern with type: `(x: Int)`
- [ ] Add tuple pattern with types: `((x: Int, y: String))`
- [ ] Add record pattern with types: `{ name: String, age: Int }`
- [ ] Add constructor pattern with typed param: `Some(x: Int)`
- [ ] Add nested pattern type annotations
- [ ] Add type annotation with complex types: `(list: List<Int>)`
- [ ] Add type annotation with generic types
- [ ] Add type annotation with function types: `(f: (Int) -> Int)`
- [ ] Add type annotation in nested contexts
- [ ] Add edge case: type annotation with wildcard (if allowed)
- [ ] Add edge case: partial type annotations in tuple (if allowed)
- [ ] Add error case: invalid type syntax
- [ ] Add error case: type annotation in unsupported position
- [ ] Add error case: mismatched parentheses
- [ ] Verify all tests pass
- [ ] Run `npm run verify`

**Acceptance**: Type annotations in patterns fully tested

#### Nested Or-Patterns
- [ ] Create `packages/core/src/parser/nested-or-patterns.test.ts`
- [ ] Add constructor with literal or: `Ok("success" | "complete")`
- [ ] Add list element or: `[("a" | "b"), x]`
- [ ] Add record field or: `{ status: ("active" | "pending") }`
- [ ] Add deeply nested: `Ok(Some(1 | 2 | 3))`
- [ ] Add multiple nested or-patterns: `(("a" | "b"), ("x" | "y"))`
- [ ] Add or-patterns with guards
- [ ] Add or-pattern at top level (verify existing tests are comprehensive)
- [ ] Add edge case: or-pattern with constructors (if valid)
- [ ] Add error case: variable binding in or-pattern
- [ ] Add error case: inconsistent types in or-pattern
- [ ] Verify all tests pass
- [ ] Run `npm run verify`

**Acceptance**: Nested or-patterns fully tested with edge cases

---

### 2. Lambda Expression Tests

#### Lambda Type Annotations
- [ ] Create `packages/core/src/parser/lambda-annotations.test.ts`
- [ ] Add single param with type: `(x: Int) => x + 1`
- [ ] Add multiple params with types: `(x: Int, y: String) => ...`
- [ ] Add complex type annotation: `(f: (Int) -> Int) => f(42)`
- [ ] Add generic type in param: `(list: List<T>) => ...`
- [ ] Add return type only: `(x): Int => x + 1`
- [ ] Add both param and return types: `(x: Int): Int => x + 1`
- [ ] Add complex return type: `(x): Option<Int> => Some(x)`
- [ ] Add function return type: `(x): (Int) -> Int => ...`
- [ ] Add block body with return type: `(x): Int => { x + 1 }`
- [ ] Add empty param list with return type: `(): Int => 42`
- [ ] Add edge case: partial type annotations (if allowed)
- [ ] Add edge case: single param without parens with type (syntax?)
- [ ] Add error case: invalid type syntax
- [ ] Add error case: misplaced type annotations
- [ ] Verify all tests pass
- [ ] Run `npm run verify`

**Acceptance**: All lambda type annotation forms tested

#### Lambda Destructuring Parameters
- [ ] Create `packages/core/src/parser/lambda-destructuring.test.ts`
- [ ] Add record destructuring: `({ name, age }) => ...`
- [ ] Add record with field renaming: `({ name: n }) => ...`
- [ ] Add nested record destructuring: `({ user: { name } }) => ...`
- [ ] Add partial record destructuring
- [ ] Add tuple destructuring: `((x, y)) => x + y`
- [ ] Add nested tuple destructuring: `((x, (y, z))) => ...`
- [ ] Add tuple with wildcards: `((x, _)) => x`
- [ ] Add list destructuring: `([first, second]) => ...`
- [ ] Add list with rest: `([first, ...rest]) => ...`
- [ ] Add list empty pattern: `([]) => ...`
- [ ] Add destructuring with type annotations: `({ name }: { name: String }) => ...`
- [ ] Add deep nesting destructuring
- [ ] Add edge case: multiple destructured params (if allowed)
- [ ] Add error case: invalid pattern in param position
- [ ] Verify all tests pass
- [ ] Run `npm run verify`

**Acceptance**: Lambda destructuring parameters fully tested

---

### 3. External Declaration Tests

#### External Generics
- [ ] Create `packages/core/src/parser/external-generics.test.ts`
- [ ] Add single type param: `external identity: <T>(T) -> T`
- [ ] Add multiple type params: `external map: <A, B>(List<A>, (A) -> B) -> List<B>`
- [ ] Add type param in return only: `external create: <T>() -> T`
- [ ] Add nested generics: `external nest: <A>(List<List<A>>) -> A`
- [ ] Add generic in external block
- [ ] Add multiple generic functions in block
- [ ] Add exported generic external
- [ ] Add generic external with from clause
- [ ] Add edge case: type param used multiple times
- [ ] Add edge case: type param not used (if valid)
- [ ] Add error case: invalid type param syntax
- [ ] Add error case: unclosed type param list
- [ ] Verify all tests pass
- [ ] Run `npm run verify`

**Acceptance**: Generic external declarations fully tested

#### External Type Declarations
- [ ] Create `packages/core/src/parser/external-types.test.ts`
- [ ] Add simple type in external: `external { type Response = { status: Int } }`
- [ ] Add generic external type: `external { type Box<T> = { value: T } }`
- [ ] Add multiple types in block
- [ ] Add type and value in same block
- [ ] Add external type with from clause
- [ ] Add exported external type
- [ ] Add opaque type constructor: `type Headers: Type = "Headers"`
- [ ] Add generic opaque type: `type Map<K, V>: Type = "Map"`
- [ ] Add opaque type in external signatures
- [ ] Add recursive external type
- [ ] Add external type referencing other external types
- [ ] Add error case: invalid type syntax in external
- [ ] Add error case: invalid Type usage
- [ ] Verify all tests pass
- [ ] Run `npm run verify`

**Acceptance**: External type declarations fully tested

---

### 4. Module System Tests

#### Import Namespace
- [ ] Create `packages/core/src/parser/import-namespace.test.ts`
- [ ] Add basic namespace import: `import * as List from './list'`
- [ ] Add type namespace: `import type * as Types from './types'`
- [ ] Add namespace from different path formats
- [ ] Add namespace re-export
- [ ] Add namespace with long paths
- [ ] Add namespace from core modules
- [ ] Add error case: invalid identifier after `as`
- [ ] Add error case: missing `from` clause
- [ ] Add error case: invalid path
- [ ] Verify all tests pass
- [ ] Run `npm run verify`

**Acceptance**: Namespace imports fully tested

#### Mixed Type/Value Imports
- [ ] Create `packages/core/src/parser/import-mixed.test.ts`
- [ ] Add type and value: `import { type User, getUser } from './api'`
- [ ] Add multiple types and values: `import { type A, type B, fnX, fnY } from './mod'`
- [ ] Add with renames: `import { type User as U, getUser as get } from './api'`
- [ ] Add all types: `import { type A, type B } from './types'`
- [ ] Add all values: `import { a, b } from './values'`
- [ ] Add mixed with re-export
- [ ] Add error case: `type` keyword in wrong position
- [ ] Add error case: invalid mixed syntax
- [ ] Verify all tests pass
- [ ] Run `npm run verify`

**Acceptance**: Mixed imports fully tested

---

### 5. Data Literal Tests

#### Trailing Commas
- [ ] Create `packages/core/src/parser/trailing-commas.test.ts`
- [ ] Add list trailing comma: `[1, 2, 3,]`
- [ ] Add record trailing comma: `{ a: 1, b: 2, }`
- [ ] Add tuple trailing comma: `(1, 2, 3,)`
- [ ] Add function call trailing comma: `fn(a, b, c,)`
- [ ] Add record type trailing comma: `{ name: String, age: Int, }`
- [ ] Add function type param trailing comma: `(Int, String,) -> Int`
- [ ] Add type parameters trailing comma: `Map<K, V,>`
- [ ] Add tuple type trailing comma: `(Int, String, Bool,)`
- [ ] Add list pattern trailing comma: `[a, b, c,]`
- [ ] Add record pattern trailing comma: `{ name, age, }`
- [ ] Add tuple pattern trailing comma: `(a, b, c,)`
- [ ] Add function params trailing comma: `let fn = (a, b, c,) => ...`
- [ ] Add type params in definition: `type Box<T,> = ...`
- [ ] Add edge case: trailing comma after single element
- [ ] Add edge case: empty list/record (no trailing comma)
- [ ] Add edge case: nested trailing commas
- [ ] Add error case: multiple trailing commas `[1, 2,,]`
- [ ] Verify all tests pass
- [ ] Run `npm run verify`

**Acceptance**: Trailing commas tested in all contexts

#### Multiple Spreads
- [ ] Create `packages/core/src/parser/multiple-spreads.test.ts`
- [ ] Add multiple list spreads: `[...a, ...b, ...c]`
- [ ] Add spreads with elements: `[1, ...mid, 2, ...end]`
- [ ] Add all spreads: `[...a, ...b]`
- [ ] Add multiple record spreads: `{ ...a, ...b, x: 1 }`
- [ ] Add record override semantics test
- [ ] Add all record spreads: `{ ...a, ...b, ...c }`
- [ ] Add edge case: empty array spread `[...[], 1]`
- [ ] Add combined with trailing commas: `[...a, ...b,]`
- [ ] Add error case: spread in invalid position (if any)
- [ ] Add error case: invalid spread syntax (if any)
- [ ] Verify all tests pass
- [ ] Run `npm run verify`

**Acceptance**: Multiple spreads fully tested

---

### 6. Syntax Edge Cases Tests

#### Empty Blocks
- [ ] Create `packages/core/src/parser/empty-blocks.test.ts`
- [ ] Add empty block expression: `{}`
- [ ] Add empty block in let: `let x = {}`
- [ ] Add empty block in lambda: `() => {}`
- [ ] Add empty block as match arm: `| pattern => {}`
- [ ] Add empty block in if: `if true then {} else 42`
- [ ] Add empty block in while: `while false {}`
- [ ] Add nested empty blocks: `{ {} }`
- [ ] Add verify empty block has Unit type (integration with type checker)
- [ ] Add empty block in typed context
- [ ] Verify all tests pass
- [ ] Run `npm run verify`

**Acceptance**: Empty blocks fully tested

#### Multi-line Syntax
- [ ] Create `packages/core/src/parser/multiline-syntax.test.ts`
- [ ] Add variant on separate lines with leading `|`:
```
type Option<T> =
  | Some(T)
  | None
```
- [ ] Add mixed single and multi-line variants
- [ ] Add comments between variants
- [ ] Add very long variant definitions
- [ ] Add multi-line match expressions (enhance if needed)
- [ ] Add multi-line function chains with pipes
- [ ] Add multi-line record literals
- [ ] Add edge case: indentation variations
- [ ] Add edge case: empty lines between clauses
- [ ] Add edge case: comments in various positions
- [ ] Verify all tests pass
- [ ] Run `npm run verify`

**Acceptance**: Multi-line syntax fully tested

---

### 7. Lexical Tests

#### Escape Sequences
- [ ] Create `packages/core/src/parser/escape-sequences.test.ts`
- [ ] Add basic escapes: `\n`, `\r`, `\t`, `\\`, `\"`, `\'`
- [ ] Add all basic escapes from spec
- [ ] Add hex escape: `\x41` for "A"
- [ ] Add 4-digit unicode: `\u0041`
- [ ] Add variable-length unicode: `\u{1F600}`
- [ ] Add maximum values for each escape type
- [ ] Add emoji with ZWJ sequences (if in spec)
- [ ] Add escape at end of string
- [ ] Add multiple escapes in sequence: `"\n\n\n"`
- [ ] Add multi-line strings: `"""..."""` (if in spec)
- [ ] Add escapes in multi-line strings
- [ ] Add newline handling in multi-line strings
- [ ] Add error case: invalid escape sequences
- [ ] Add error case: incomplete escape sequence
- [ ] Verify all tests pass
- [ ] Run `npm run verify`

**Acceptance**: All escape sequences fully tested

#### Float Literals
- [ ] Create `packages/core/src/parser/float-literals.test.ts`
- [ ] Add decimal: `3.14`
- [ ] Add leading zero: `0.5`
- [ ] Add no leading zero: `.5` (if valid)
- [ ] Add trailing zero: `1.0`
- [ ] Add positive exponent: `1e10`, `1.5e10`
- [ ] Add negative exponent: `1e-10`, `1.5e-10`
- [ ] Add leading zeros in exponent: `1e010`
- [ ] Add capital E: `1E10`
- [ ] Add very large floats
- [ ] Add very small floats
- [ ] Add maximum precision
- [ ] Add special values: `Infinity`, `-Infinity`, `NaN` (if supported in literals)
- [ ] Add error case: invalid float syntax
- [ ] Add error case: multiple decimal points
- [ ] Add error case: invalid exponent
- [ ] Verify all tests pass
- [ ] Run `npm run verify`

**Acceptance**: Float literal edge cases fully tested

---

## Existing Test Files to Enhance

### Enhance expressions.test.ts
- [ ] Review current tests in `expressions.test.ts`
- [ ] Add more pipe chain tests (multi-line, complex)
- [ ] Add more operator precedence edge cases
- [ ] Add operator associativity edge cases
- [ ] Add deeply nested expression tests
- [ ] Add tests combining all expression types
- [ ] Add complex expression integration tests
- [ ] Verify all tests pass
- [ ] Run `npm run verify`

**Acceptance**: Expression tests enhanced with edge cases

### Enhance patterns.test.ts
- [ ] Review current tests in `patterns.test.ts`
- [ ] Add more complex pattern combinations
- [ ] Add tests for all pattern types in all contexts (match, let, lambda)
- [ ] Add pattern nesting limits
- [ ] Add pattern error cases
- [ ] Add integration tests with other features
- [ ] Verify all tests pass
- [ ] Run `npm run verify`

**Acceptance**: Pattern tests enhanced with combinations

### Enhance types.test.ts
- [ ] Review current tests in `types.test.ts`
- [ ] Add deeply nested generic types: `Map<String, List<Option<Int>>>`
- [ ] Add more `>>` split handling tests (enhance existing)
- [ ] Add very long type expressions
- [ ] Add type error cases
- [ ] Add complex type combinations
- [ ] Verify all tests pass
- [ ] Run `npm run verify`

**Acceptance**: Type tests enhanced with nesting and edge cases

### Enhance declarations.test.ts
- [ ] Review current tests in `declarations.test.ts`
- [ ] Add let with complex patterns: `let (a, b) = tuple`
- [ ] Add let with record patterns: `let { name } = person`
- [ ] Add let with all pattern types
- [ ] Add mutually recursive let edge cases
- [ ] Add pattern binding error cases
- [ ] Verify all tests pass
- [ ] Run `npm run verify`

**Acceptance**: Declaration tests enhanced with pattern bindings

### Verify record-shorthand.test.ts
- [ ] Review existing `record-shorthand.test.ts`
- [ ] Compare against spec requirements (data-literals.md:153-181)
- [ ] Add missing spec examples
- [ ] Add shorthand in all contexts (expressions, patterns)
- [ ] Add mixed shorthand and explicit syntax
- [ ] Add error cases
- [ ] Verify all tests pass
- [ ] Run `npm run verify`

**Acceptance**: Record shorthand verified against spec

### Enhance tuples.test.ts
- [ ] Review current tests in `tuples.test.ts`
- [ ] Add tuple type tests (not just tuple expressions)
- [ ] Add tuple vs function type disambiguation tests
- [ ] Add nested tuple types
- [ ] Add tuple in various contexts
- [ ] Verify all tests pass
- [ ] Run `npm run verify`

**Acceptance**: Tuple tests enhanced with type tests

### Enhance while-loops.test.ts
- [ ] Review current tests in `while-loops.test.ts`
- [ ] Add while with refs (comprehensive)
- [ ] Add while with break/continue (if supported)
- [ ] Add nested while loops
- [ ] Add while with complex conditions
- [ ] Add while edge cases
- [ ] Verify all tests pass
- [ ] Run `npm run verify`

**Acceptance**: While loop tests enhanced

### Enhance parser-errors.test.ts
- [ ] Review current tests in `parser-errors.test.ts`
- [ ] Add error cases for all new features
- [ ] Verify error messages are helpful
- [ ] Verify error locations are accurate
- [ ] Add recovery tests (if parser has error recovery)
- [ ] Verify all tests pass
- [ ] Run `npm run verify`

**Acceptance**: Error tests enhanced for new features

---

## Integration and Coverage Tasks

### Integration Testing
- [ ] Create integration tests combining multiple new features
- [ ] Test guards + type annotations in patterns
- [ ] Test lambda destructuring + type annotations
- [ ] Test trailing commas + spreads
- [ ] Test complex nested structures with all new features
- [ ] Test all features in realistic code examples
- [ ] Verify all integration tests pass
- [ ] Run `npm run verify`

**Acceptance**: Feature combinations thoroughly tested

### Coverage Verification
- [ ] Run `npm run test:coverage`
- [ ] Review coverage report
- [ ] Identify any remaining gaps
- [ ] Add tests for uncovered lines
- [ ] Verify line coverage > 90%
- [ ] Verify branch coverage > 85%
- [ ] Verify function coverage 100% for public API
- [ ] Document any intentionally untested code

**Acceptance**: Coverage targets met

### Spec Compliance Validation
- [ ] Review all spec sections
- [ ] Verify every spec example has a test
- [ ] Document any spec ambiguities found
- [ ] Document any deviations from spec
- [ ] Create issue for spec clarifications if needed
- [ ] Update documentation with findings

**Acceptance**: Full spec compliance validated

---

## Documentation Tasks

### Update Documentation
- [ ] Update `parser-test-coverage-context.md` with findings
- [ ] Document any spec ambiguities discovered
- [ ] Note any implementation issues found
- [ ] Update coverage metrics
- [ ] Document testing patterns used

**Acceptance**: Documentation current and accurate

### Code Comments
- [ ] Add JSDoc comments to complex test scenarios
- [ ] Document any skipped tests with reasons
- [ ] Add spec references in test file headers
- [ ] Document any test helpers created

**Acceptance**: Test code well documented

---

## Quality Assurance Tasks

### Test Quality Review
- [ ] Review all test names for clarity
- [ ] Verify tests follow Arrange-Act-Assert pattern
- [ ] Remove any duplicate tests
- [ ] Verify tests are independent
- [ ] Verify tests are deterministic
- [ ] Check proper use of describe blocks
- [ ] Verify no commented-out tests (unless documented)
- [ ] Verify no skipped tests (unless documented)

**Acceptance**: All tests meet quality standards

### Final Verification
- [ ] Run full test suite: `npm test`
- [ ] Run type checking: `npm run check`
- [ ] Run linting: `npm run lint`
- [ ] Run formatter: `npm run format`
- [ ] Run all checks: `npm run verify`
- [ ] Verify no regressions
- [ ] Verify all quality checks pass

**Acceptance**: All quality checks passing

---

## Progress Tracking

### New Test Files: 0/15 completed

- [ ] pattern-guards.test.ts
- [ ] pattern-type-annotations.test.ts
- [ ] nested-or-patterns.test.ts
- [ ] lambda-annotations.test.ts
- [ ] lambda-destructuring.test.ts
- [ ] external-generics.test.ts
- [ ] external-types.test.ts
- [ ] import-namespace.test.ts
- [ ] import-mixed.test.ts
- [ ] trailing-commas.test.ts
- [ ] multiple-spreads.test.ts
- [ ] empty-blocks.test.ts
- [ ] multiline-syntax.test.ts
- [ ] escape-sequences.test.ts
- [ ] float-literals.test.ts

### Enhanced Test Files: 0/8 completed

- [ ] expressions.test.ts
- [ ] patterns.test.ts
- [ ] types.test.ts
- [ ] declarations.test.ts
- [ ] record-shorthand.test.ts
- [ ] tuples.test.ts
- [ ] while-loops.test.ts
- [ ] parser-errors.test.ts

### Overall Progress: 0/23 test file tasks completed

---

## Notes

- Mark tasks complete immediately upon finishing
- Update "Last Updated" timestamp when making changes
- Run coverage report periodically: `npm run test:coverage`
- If a test reveals a parser bug, file it in feature gaps plan
- Document any deviations from spec with justification
- Coordinate with feature implementation plan for new features

## Next Action

Start with high-priority test files: pattern-guards.test.ts, trailing-commas.test.ts, or lambda-annotations.test.ts based on feature implementation priority.
