# Parser Test Coverage Enhancement Plan

**Last Updated**: 2025-11-11
**Status**: Planning Complete
**Focus**: Comprehensive test coverage for existing and new parser features

## Overview

This plan addresses test coverage gaps identified in the parser audit. While the parser has solid test coverage for basic functionality (~50% edge cases covered), many advanced features, edge cases, and error scenarios lack comprehensive testing. This plan ensures the parser is thoroughly validated against the specification.

## Objectives

1. **Close Coverage Gaps**: Add tests for all under-tested features
2. **Spec Validation**: Verify every spec example has corresponding tests
3. **Edge Case Coverage**: Test boundary conditions and complex scenarios
4. **Error Validation**: Ensure all error paths are tested
5. **Integration Testing**: Test feature combinations and interactions

## Test Coverage Philosophy

### Categories of Tests

1. **Basic Functionality**: Core feature works as specified
2. **Edge Cases**: Boundary conditions, empty inputs, large inputs, nesting limits
3. **Error Cases**: Invalid syntax produces appropriate errors
4. **Integration**: Features combined with other language features
5. **Spec Compliance**: Every example in spec has a test

### Testing Principles

- **One test, one thing**: Each test validates a single behavior
- **Descriptive names**: Test names explain what is being validated
- **Arrange-Act-Assert**: Clear test structure
- **No redundancy**: Avoid duplicate tests
- **Comprehensive**: Cover all code paths

## Test File Organization

### New Test Files to Create

These test files don't currently exist and are needed:

1. `packages/core/src/parser/pattern-guards.test.ts` - Pattern guard (when clause) tests
2. `packages/core/src/parser/pattern-type-annotations.test.ts` - Type annotations in patterns
3. `packages/core/src/parser/nested-or-patterns.test.ts` - Or-pattern nesting and edge cases
4. `packages/core/src/parser/lambda-annotations.test.ts` - Lambda parameter/return type annotations
5. `packages/core/src/parser/lambda-destructuring.test.ts` - Lambda destructuring parameters
6. `packages/core/src/parser/external-generics.test.ts` - Generic external declarations
7. `packages/core/src/parser/external-types.test.ts` - Type declarations in external blocks
8. `packages/core/src/parser/import-namespace.test.ts` - Import * as namespace
9. `packages/core/src/parser/import-mixed.test.ts` - Mixed type/value imports
10. `packages/core/src/parser/trailing-commas.test.ts` - Comprehensive trailing comma tests
11. `packages/core/src/parser/multiple-spreads.test.ts` - Multiple spreads in records/lists
12. `packages/core/src/parser/empty-blocks.test.ts` - Empty block expressions
13. `packages/core/src/parser/multiline-syntax.test.ts` - Multi-line variants and other syntax
14. `packages/core/src/parser/escape-sequences.test.ts` - All string escape sequences
15. `packages/core/src/parser/float-literals.test.ts` - Float edge cases (exponents, etc.)

### Existing Test Files to Enhance

These files exist but need additional tests:

1. `packages/core/src/parser/expressions.test.ts` - Add edge cases
2. `packages/core/src/parser/patterns.test.ts` - Add complex pattern combinations
3. `packages/core/src/parser/types.test.ts` - Add nested generic tests
4. `packages/core/src/parser/declarations.test.ts` - Add pattern binding tests
5. `packages/core/src/parser/record-shorthand.test.ts` - Verify against spec
6. `packages/core/src/parser/tuples.test.ts` - Add tuple type tests
7. `packages/core/src/parser/while-loops.test.ts` - Add edge cases with refs
8. `packages/core/src/parser/parser-errors.test.ts` - Add error cases for new features

## Detailed Test Plans

### 1. Pattern Guards (when clauses)
**File**: `pattern-guards.test.ts`

#### Basic Cases
- Simple guard: `| n when n > 0 => "positive"`
- Guard with equality: `| x when x == 42 => "the answer"`
- Guard with boolean variable: `| x when isValid => "valid"`
- Multiple guards in same match: different patterns, different guards

#### Complex Guards
- Guards with multiple conditions: `when x > 0 && x < 100`
- Guards with function calls: `when isEven(n)`
- Guards using pattern bindings: `| Some(x) when x > 0 => ...`
- Guards in nested matches

#### Edge Cases
- Guard with wildcard pattern: `| _ when condition => ...`
- Guard always true: `when true`
- Guard always false: `when false`
- Guard with side effects (test behavior, not purity enforcement)
- Multiple patterns, same guard

#### Error Cases
- Guard with non-boolean expression (type error, but parser should accept)
- Guard with undefined variable
- Syntax errors in guard expression

#### Integration
- Guards with or-patterns
- Guards with record patterns using field bindings
- Guards with list patterns using element bindings
- Guards in nested pattern contexts

### 2. Type Annotations in Patterns
**File**: `pattern-type-annotations.test.ts`

#### Basic Cases
- Variable pattern: `(x: Int)`
- Tuple pattern: `((x: Int, y: String))`
- Record pattern: `{ name: String, age: Int }`
- Constructor pattern: `Some(x: Int)`

#### Complex Cases
- Nested type annotations: `((x: List<Int>, y: Option<String>))`
- Generic types in patterns
- Function types in patterns: `(f: (Int) -> Int)`
- Record types with nested types

#### Edge Cases
- Type annotation with wildcard: `(_: Int)` - is this allowed?
- Partial type annotations in tuple: `(x: Int, y)` - is this allowed?
- Type annotations in or-patterns (likely not allowed)

#### Error Cases
- Invalid type syntax in annotation
- Type annotation in unsupported pattern position
- Mismatched parentheses with type annotations

### 3. Nested Or-Patterns
**File**: `nested-or-patterns.test.ts`

#### Basic Cases
- Constructor with literal or: `Ok("success" | "complete")`
- List element or: `[("a" | "b"), x]`
- Record field or: `{ status: ("active" | "pending") }`

#### Complex Cases
- Deeply nested: `Ok(Some(1 | 2 | 3))`
- Multiple nested or-patterns: `(("a" | "b"), ("x" | "y"))`
- Or-patterns combined with other patterns

#### Edge Cases
- Or-pattern at top level (already tested, ensure comprehensive)
- Or-pattern with constructors: `(Some(x) | None)` - is this valid?
- Or-pattern span (no variable binding allowed)

#### Error Cases
- Variable binding in or-pattern (should error)
- Inconsistent types in or-pattern branches

### 4. Lambda Annotations
**File**: `lambda-annotations.test.ts`

#### Parameter Type Annotations
- Single param: `(x: Int) => x + 1`
- Multiple params: `(x: Int, y: String) => ...`
- Complex types: `(f: (Int) -> Int) => f(42)`
- Generic types: `(list: List<T>) => ...`
- All params typed vs some typed (if allowed)

#### Return Type Annotations
- Return type only: `(x): Int => x + 1`
- Both param and return: `(x: Int): Int => x + 1`
- Complex return: `(x): Option<Int> => Some(x)`
- Block body with return type

#### Edge Cases
- Empty param list with return type: `(): Int => 42`
- Single param without parens, with type - syntax: `x: Int => ...` (is this valid?)
- Type annotation with destructuring (if supported)

#### Error Cases
- Invalid type syntax
- Misplaced type annotations
- Syntax ambiguities

### 5. Lambda Destructuring
**File**: `lambda-destructuring.test.ts`

#### Record Destructuring
- Simple: `({ name, age }) => ...`
- Nested: `({ user: { name } }) => ...`
- With field renaming: `({ name: n }) => ...`
- Partial destructuring

#### Tuple Destructuring
- Simple: `((x, y)) => x + y`
- Nested: `((x, (y, z))) => ...`
- With wildcards: `((x, _)) => x`

#### List Destructuring
- Fixed elements: `([first, second]) => ...`
- With rest: `([first, ...rest]) => ...`
- Empty list: `([]) => ...` (as guard pattern?)

#### Edge Cases
- Multiple destructured params: `({ name }, { age }) => ...` (is this valid?)
- Destructuring with type annotations
- Deep nesting

#### Error Cases
- Invalid pattern in param position
- Patterns that can't be used in param context (if any)

### 6. External Generics
**File**: `external-generics.test.ts`

#### Basic Cases
- Single type param: `external identity: <T>(T) -> T`
- Multiple type params: `external map: <A, B>(List<A>, (A) -> B) -> List<B>`
- Type param in return only: `external create: <T>() -> T`

#### Complex Cases
- Nested generics: `external nest: <A>(List<List<A>>) -> A`
- Generic in external block: `external { fn: <T>(...) }`
- Multiple generic functions in block

#### Edge Cases
- Type param used multiple times
- Type param not used (is this valid?)
- Generic with from clause

#### Error Cases
- Invalid type param syntax
- Type param shadowing
- Unclosed type param list

### 7. External Type Declarations
**File**: `external-types.test.ts`

#### Basic Cases
- Simple type in external: `external { type Response = { status: Int } }`
- Generic external type: `external { type Box<T> = { value: T } }`
- Multiple types in block

#### Complex Cases
- Type and value in same block
- External type with from clause
- Exported external types
- Opaque type constructors: `type Headers: Type = "Headers"`

#### Edge Cases
- Recursive external type
- External type referencing other external types

#### Error Cases
- Invalid type syntax in external
- External type with invalid modifiers

### 8. Import Namespace
**File**: `import-namespace.test.ts`

#### Basic Cases
- Basic namespace import: `import * as List from './list'`
- Type namespace: `import type * as Types from './types'`
- From different path formats

#### Edge Cases
- Namespace re-export
- Namespace with long paths
- Namespace from core modules

#### Error Cases
- Invalid identifier after `as`
- Missing `from` clause
- Invalid path

### 9. Mixed Imports
**File**: `import-mixed.test.ts`

#### Basic Cases
- Type and value: `import { type User, getUser } from './api'`
- Multiple types and values: `import { type A, type B, fnX, fnY } from './mod'`
- With renames: `import { type User as U, getUser as get } from './api'`

#### Edge Cases
- All types: `import { type A, type B } from './types'`
- All values: `import { a, b } from './values'` (normal import)
- Mixed with re-export

#### Error Cases
- `type` keyword in wrong position
- Invalid mixed syntax

### 10. Trailing Commas
**File**: `trailing-commas.test.ts`

#### Expression Contexts
- List: `[1, 2, 3,]`
- Record: `{ a: 1, b: 2, }`
- Tuple: `(1, 2, 3,)`
- Function call: `fn(a, b, c,)`

#### Type Contexts
- Record type: `{ name: String, age: Int, }`
- Function type params: `(Int, String,) -> Int`
- Type parameters: `Map<K, V,>`
- Tuple type: `(Int, String, Bool,)`

#### Pattern Contexts
- List pattern: `[a, b, c,]`
- Record pattern: `{ name, age, }`
- Tuple pattern: `(a, b, c,)`

#### Declaration Contexts
- Function parameters: `let fn = (a, b, c,) => ...`
- Type parameters in definition: `type Box<T,> = ...`

#### Edge Cases
- Trailing comma after single element: `[1,]`, `(1,)`
- Empty list/record (no trailing comma): `[]`, `{}`
- Nested trailing commas: `[[1,2,],]`

#### Error Cases
- Multiple trailing commas: `[1, 2,,]` (should error)
- Trailing comma before closing in invalid context

### 11. Multiple Spreads
**File**: `multiple-spreads.test.ts`

#### List Spreads
- Multiple spreads: `[...a, ...b, ...c]`
- Spreads with elements: `[1, ...mid, 2, ...end]`
- All spreads: `[...a, ...b]`

#### Record Spreads
- Multiple spreads: `{ ...a, ...b, x: 1 }`
- Override semantics: later spreads override earlier
- All spreads: `{ ...a, ...b, ...c }`

#### Edge Cases
- Empty array spread: `[...[], 1]`
- Spread of spread: `[...[...a]]` (is this valid in parser?)
- Combined with trailing commas: `[...a, ...b,]`

#### Error Cases (if any)
- Spread in invalid position
- Invalid spread syntax

### 12. Empty Blocks
**File**: `empty-blocks.test.ts`

#### Basic Cases
- Empty block expression: `{}`
- Empty block in let: `let x = {}`
- Empty block in lambda: `() => {}`

#### Edge Cases
- Empty block as match arm: `| pattern => {}`
- Empty block in if: `if true then {} else 42`
- Empty block in while: `while false {}`
- Nested empty blocks: `{ {} }`

#### Type Behavior
- Verify empty block has Unit type
- Empty block in typed context

### 13. Multi-line Syntax
**File**: `multiline-syntax.test.ts`

#### Variant Types
- Variants on separate lines with leading `|`:
```
type Option<T> =
  | Some(T)
  | None
```
- Mixed single and multi-line
- Comments between variants
- Very long variant definitions

#### Other Multi-line
- Multi-line match expressions (already tested, enhance)
- Multi-line function chains with pipes
- Multi-line record literals

#### Edge Cases
- Indentation variations
- Empty lines between clauses
- Comments in various positions

### 14. Escape Sequences
**File**: `escape-sequences.test.ts`

#### Basic Escapes
- `\n`, `\r`, `\t`, `\\`, `\"`, `\'`
- All basic escapes from spec

#### Unicode Escapes
- `\xHH`: hex escape `\x41` for "A"
- `\uHHHH`: 4-digit unicode `\u0041`
- `\u{H...H}`: variable-length unicode `\u{1F600}`

#### Edge Cases
- Maximum values for each escape type
- Emoji with ZWJ sequences (if in spec)
- Invalid escape sequences (error cases)
- Escape at end of string
- Multiple escapes in sequence: `"\n\n\n"`

#### Multi-line Strings
- `"""..."""` syntax (if in spec)
- Escapes in multi-line strings
- Newline handling in multi-line strings

### 15. Float Literals
**File**: `float-literals.test.ts`

#### Basic Floats
- Decimal: `3.14`
- Leading zero: `0.5`
- No leading zero: `.5` (if valid)
- Trailing zero: `1.0`

#### Exponent Notation
- Positive exponent: `1e10`, `1.5e10`
- Negative exponent: `1e-10`, `1.5e-10`
- Leading zeros in exponent: `1e010` (spec shows this)
- Capital E: `1E10`

#### Edge Cases
- Very large floats
- Very small floats
- Maximum precision
- Special values: `Infinity`, `-Infinity`, `NaN` (if supported in literals)

#### Error Cases
- Invalid float syntax
- Multiple decimal points
- Invalid exponent

## Enhancement Plans for Existing Files

### expressions.test.ts
- [ ] Add more pipe chain tests (multi-line, complex)
- [ ] Add more operator precedence edge cases
- [ ] Add tests for operator associativity edge cases
- [ ] Add deeply nested expression tests
- [ ] Add tests combining all expression types

### patterns.test.ts
- [ ] Add more complex pattern combinations
- [ ] Add tests for all pattern types in all contexts (match, let, lambda)
- [ ] Add pattern nesting limits
- [ ] Add pattern error cases

### types.test.ts
- [ ] Add deeply nested generic types: `Map<String, List<Option<Int>>>`
- [ ] Add `>>` split handling tests (already exists, enhance)
- [ ] Add very long type expressions
- [ ] Add type error cases

### declarations.test.ts
- [ ] Add let with complex patterns: `let (a, b) = tuple`
- [ ] Add let with record patterns: `let { name } = person`
- [ ] Add let with all pattern types
- [ ] Add mutually recursive let edge cases

### record-shorthand.test.ts
- [ ] Verify all spec examples are tested
- [ ] Add shorthand in all contexts
- [ ] Add mixed shorthand and explicit
- [ ] Add error cases

### tuples.test.ts
- [ ] Add tuple type tests (not just tuple expressions)
- [ ] Add tuple vs function type disambiguation
- [ ] Add nested tuple types

### while-loops.test.ts
- [ ] Add while with refs (comprehensive)
- [ ] Add while with break/continue (if supported)
- [ ] Add nested while loops
- [ ] Add while with complex conditions

### parser-errors.test.ts
- [ ] Add error cases for all new features
- [ ] Verify error messages are helpful
- [ ] Verify error locations are accurate
- [ ] Add recovery tests (if parser has error recovery)

## Testing Strategy

### Test-First Approach
Even though these are tests for existing features, write tests first:
1. Read spec section
2. Extract examples
3. Write tests for examples
4. Run tests
5. If tests pass, good! If fail, fix parser
6. Add edge cases and error tests

### Spec Compliance Validation
For each test file:
1. Reference the relevant spec section at top of file
2. Ensure every spec example has a corresponding test
3. Add note if spec is ambiguous
4. Document any intentional deviations

### Coverage Metrics
After completion, verify:
- Line coverage > 90%
- Branch coverage > 85%
- All public parser methods tested
- All AST node types constructed in tests

## Quality Assurance

### Running Tests
```bash
npm test                    # All tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage report
npm test -w @vibefun/core   # Core package only
```

### Test Quality Checks
- [ ] All tests have descriptive names
- [ ] Tests follow Arrange-Act-Assert pattern
- [ ] No commented-out tests
- [ ] No skipped tests (unless documented why)
- [ ] Tests are independent (can run in any order)
- [ ] Tests use appropriate matchers

### After Each Test File
```bash
npm run verify  # Full quality check
```

## Success Criteria

### Per Test File
- [ ] All spec examples covered
- [ ] Basic, edge, and error cases included
- [ ] Tests are clear and maintainable
- [ ] All tests passing
- [ ] No regressions in other tests

### Overall Completion
- [ ] All 15 new test files created
- [ ] All 8 existing files enhanced
- [ ] Test coverage > 90%
- [ ] All spec examples have tests
- [ ] All quality checks passing
- [ ] Documentation updated

## Timeline

Work proceeds at sustainable pace with focus on quality over speed. Test files can be created in parallel or sequentially based on preference and complexity.

## Next Steps

1. Begin with high-priority test files (trailing commas, guards, lambda features)
2. Create test files in phases matching feature implementation plan
3. Update `parser-test-coverage-tasks.md` after each completion
4. Run coverage report periodically to track progress
