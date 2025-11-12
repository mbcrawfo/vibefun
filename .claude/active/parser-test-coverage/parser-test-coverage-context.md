# Parser Test Coverage Enhancement - Context

**Last Updated**: 2025-11-11

## Purpose

This document provides context for enhancing parser test coverage. It serves as a reference for understanding what needs to be tested, where tests should be located, and how to structure comprehensive test cases.

## Current Test Coverage State

### Well-Tested Areas ✅

Based on existing test files in `packages/core/src/parser/`:

- **Basic expressions** (`expressions.test.ts`) - Literals, operators, function calls
- **Declarations** (`declarations.test.ts`) - Let bindings, type definitions
- **Patterns** (`patterns.test.ts`) - Basic pattern matching
- **Types** (`types.test.ts`) - Type expressions and annotations
- **Tuples** (`tuples.test.ts`) - Tuple expressions
- **While loops** (`while-loops.test.ts`) - Loop syntax
- **Parser errors** (`parser-errors.test.ts`) - Error handling
- **Integration** (`parser-integration.test.ts`) - End-to-end parsing
- **Record shorthand** (`record-shorthand.test.ts`) - Field shorthand syntax
- **Deep nesting** (`deep-nesting.test.ts`) - Nested structures
- **Large literals** (`large-literals.test.ts`) - Large numbers and strings
- **Operator edge cases** (`operator-edge-cases.test.ts`) - Operator interactions
- **Unicode edge cases** (`unicode-edge-cases.test.ts`) - Unicode identifiers
- **Lambda precedence** (`lambda-precedence.test.ts`) - Lambda operator precedence
- **Semicolon required** (`semicolon-required.test.ts`) - Semicolon rules

### Under-Tested Areas ❌

Features lacking comprehensive test coverage:

1. **Pattern guards** (when clauses) - NO dedicated test file
2. **Type annotations in patterns** - NOT tested
3. **Nested or-patterns** - NOT comprehensively tested
4. **Lambda parameter type annotations** - NOT tested
5. **Lambda return type annotations** - NOT tested
6. **Lambda destructuring parameters** - NOT verified
7. **External generic declarations** - NOT tested
8. **External type declarations** - NOT tested
9. **Import * as namespace** - NOT verified
10. **Mixed type/value imports** - NOT tested
11. **Trailing commas** - NOT comprehensively tested across all contexts
12. **Multiple spreads** - NOT tested
13. **Empty blocks** - NOT verified
14. **Multi-line syntax** - NOT comprehensively tested
15. **Escape sequences** - NOT fully tested
16. **Float literal edge cases** - NOT fully tested

## Test File Locations

### Directory Structure

All parser tests are located in:
```
packages/core/src/parser/
├── parser.ts                           # Main parser
├── parser.test.ts                      # Basic parser tests
├── expressions.test.ts                 # Expression tests
├── patterns.test.ts                    # Pattern tests
├── types.test.ts                       # Type tests
├── declarations.test.ts                # Declaration tests
├── tuples.test.ts                      # Tuple tests
├── while-loops.test.ts                 # While loop tests
├── record-shorthand.test.ts            # Record shorthand tests
├── parser-errors.test.ts               # Error tests
├── parser-integration.test.ts          # Integration tests
├── deep-nesting.test.ts                # Deep nesting tests
├── large-literals.test.ts              # Large literal tests
├── operator-edge-cases.test.ts         # Operator edge cases
├── unicode-edge-cases.test.ts          # Unicode tests
├── lambda-precedence.test.ts           # Lambda precedence
├── semicolon-required.test.ts          # Semicolon rules
│
│   # NEW TEST FILES TO CREATE:
├── pattern-guards.test.ts              # Pattern guards (when)
├── pattern-type-annotations.test.ts    # Type annotations in patterns
├── nested-or-patterns.test.ts          # Nested or-patterns
├── lambda-annotations.test.ts          # Lambda type annotations
├── lambda-destructuring.test.ts        # Lambda destructuring
├── external-generics.test.ts           # External generics
├── external-types.test.ts              # External type declarations
├── import-namespace.test.ts            # Import * as
├── import-mixed.test.ts                # Mixed imports
├── trailing-commas.test.ts             # Trailing commas
├── multiple-spreads.test.ts            # Multiple spreads
├── empty-blocks.test.ts                # Empty blocks
├── multiline-syntax.test.ts            # Multi-line syntax
├── escape-sequences.test.ts            # String escapes
└── float-literals.test.ts              # Float edge cases
```

### Naming Convention

Test files are named to match what they test:
- Feature tests: `{feature-name}.test.ts` (e.g., `pattern-guards.test.ts`)
- Category tests: `{category}.test.ts` (e.g., `expressions.test.ts`)
- Integration tests: `{scope}-{aspect}.test.ts` (e.g., `parser-integration.test.ts`)

## Specification References

### Pattern Matching Tests

**Guards (when clauses)**
- **Spec**: `docs/spec/05-pattern-matching/advanced-patterns.md:135-308`
- **Key points**:
  - Guards execute after pattern match succeeds
  - Pattern bindings available in guard
  - Guards must be boolean expressions
  - Guards do not bind variables themselves
  - Multiple patterns can have different guards

**Type Annotations in Patterns**
- **Spec**: `docs/spec/05-pattern-matching/advanced-patterns.md:463-487`
- **Key points**:
  - Syntax: `(x: Type)` in patterns
  - Type must match scrutinee type
  - Allowed in variable, tuple, and record patterns
  - Type checker validates annotations

**Nested Or-Patterns**
- **Spec**: `docs/spec/05-pattern-matching/advanced-patterns.md:411`
- **Key points**:
  - Or-patterns can be nested in constructors
  - Example: `Ok("success" | "complete")`
  - No variable binding in or-pattern branches
  - Both branches must have same type

### Lambda Expression Tests

**Parameter Type Annotations**
- **Spec**: `docs/spec/04-expressions/functions-composition.md:40`
- **Syntax**: `(x: Int) => x + 1`
- **Multiple params**: `(x: Int, y: String) => ...`

**Return Type Annotations**
- **Spec**: `docs/spec/04-expressions/functions-composition.md:44`
- **Syntax**: `(x): Int => x + 1`
- **With param types**: `(x: Int): Int => x + 1`

**Parameter Destructuring**
- **Spec**: `docs/spec/04-expressions/functions-composition.md:55-71`
- **Record**: `({ name, age }) => ...`
- **Tuple**: `((x, y)) => ...`
- **Nested**: `({ user: { name } }) => ...`

### Data Literal Tests

**Trailing Commas**
- **Spec**: `docs/spec/04-expressions/data-literals.md:432-477`
- **Key point**: Explicitly allowed in all contexts
- **Lists**: `[1, 2, 3,]`
- **Records**: `{ a: 1, b: 2, }`
- **Tuples**: `(1, 2, 3,)`

**Record Field Shorthand**
- **Spec**: `docs/spec/04-expressions/data-literals.md:153-181`
- **Syntax**: `{ name, age }` where variables bind to fields
- **Mixed**: `{ name, age: 30 }` combining shorthand and explicit

**Multiple Spreads**
- **Spec**: Throughout `data-literals.md`
- **Lists**: `[...a, ...b, ...c]`
- **Records**: `{ ...a, ...b, x: 1 }`
- **Semantics**: Right-to-left override for records

### External Declaration Tests

**Generic Externals**
- **Spec**: `docs/spec/10-javascript-interop/external-declarations.md:325`
- **Syntax**: `external map: <A, B>(Array<A>, (A) -> B) -> Array<B>`
- **Type parameters before function name**

**External Type Declarations**
- **Spec**: `docs/spec/10-javascript-interop/external-declarations.md:399-443`
- **Syntax**: Type declarations inside external blocks
- **Example**: `external { type Response = { status: Int } }`

**Opaque Type Constructors**
- **Spec**: `docs/spec/10-javascript-interop/external-declarations.md:360-397`
- **Syntax**: `type Headers: Type = "Headers"`
- **Type identifier signals opaque type**

### Module System Tests

**Import Namespace**
- **Spec**: `docs/spec/08-modules.md:27`
- **Syntax**: `import * as List from './list'`
- **Type namespace**: `import type * as Types from './types'`

**Mixed Imports**
- **Spec**: `docs/spec/08-modules.md:33`
- **Syntax**: `import { type User, getUser } from './api'`
- **Per-item type keyword**

### Type System Tests

**Recursive Types**
- **Spec**: `docs/spec/03-type-system/recursive-types.md`
- **Self-referential**: `type List<T> = Nil | Cons(T, List<T>)`
- **Mutually recursive**: With `and` keyword

**Tuple Types**
- **Spec**: `docs/spec/03-type-system/tuples.md`
- **Syntax**: May need disambiguation from function params
- **Example**: `(Int, String)` as type

### Lexical Tests

**Escape Sequences**
- **Spec**: `docs/spec/02-lexical-structure/tokens.md:114-123`
- **Basic**: `\n`, `\r`, `\t`, `\\`, `\"`, `\'`
- **Hex**: `\xHH`
- **Unicode**: `\uHHHH`, `\u{H...H}`

**Float Literals**
- **Spec**: `docs/spec/02-lexical-structure/tokens.md:86`
- **Exponents**: `1e10`, `1e-10`, `1e010` (with leading zeros)
- **Decimal**: `3.14`, `0.5`, `1.0`

**Multi-line Strings**
- **Spec**: `docs/spec/02-lexical-structure/tokens.md:106-112`
- **Syntax**: `"""..."""`

### Syntax Edge Cases

**Empty Blocks**
- **Spec**: `docs/spec/04-expressions/functions-composition.md:167`
- **Syntax**: `{}`
- **Evaluates to**: Unit

**Multi-line Variants**
- **Spec**: `docs/spec/03-type-system/variant-types.md:18-21`
- **Leading pipe syntax**:
```
type Option<T> =
  | Some(T)
  | None
```

## Test Structure and Patterns

### Standard Test File Template

```typescript
import { describe, it, expect } from 'vitest';
import { Parser } from './parser.js';
import type { /* Relevant AST types */ } from '../types/index.js';

/**
 * Tests for [Feature Name]
 *
 * Spec reference: docs/spec/[path]:[lines]
 *
 * This test file validates:
 * - Basic functionality
 * - Edge cases
 * - Error cases
 * - Integration with other features
 */

describe('[Feature Name]', () => {
  describe('basic cases', () => {
    it('should parse [specific case]', () => {
      const source = 'code example';
      const parser = new Parser(source, 'test.vf');
      const ast = parser.parse();

      expect(ast).toMatchObject({
        // Expected AST structure
      });
    });

    // More basic tests...
  });

  describe('complex cases', () => {
    it('should parse [complex case]', () => {
      // Test complex scenarios
    });
  });

  describe('edge cases', () => {
    it('should handle [edge case]', () => {
      // Boundary conditions, limits, etc.
    });
  });

  describe('error cases', () => {
    it('should throw on [invalid syntax]', () => {
      const source = 'invalid code';
      const parser = new Parser(source, 'test.vf');

      expect(() => parser.parse()).toThrow(ParserError);
      expect(() => parser.parse()).toThrow(/expected .../);
    });
  });

  describe('integration', () => {
    it('should work with [other feature]', () => {
      // Test feature combinations
    });
  });
});
```

### Test Naming Conventions

- Use `should` in test names: "should parse basic guard"
- Be specific: "should parse guard with multiple conditions"
- Describe the behavior, not implementation: "should throw on invalid syntax"
- Group related tests in describe blocks

### Assertion Patterns

**AST Structure Testing**
```typescript
// Use toMatchObject for partial matching
expect(ast).toMatchObject({
  type: 'MatchExpr',
  arms: [
    {
      pattern: { type: 'VarPattern', name: 'x' },
      guard: { type: 'BinaryExpr', op: '>' }
    }
  ]
});

// Use toEqual for exact matching
expect(ast).toEqual({
  // Complete AST structure
});
```

**Error Testing**
```typescript
// Test that error is thrown
expect(() => parser.parse()).toThrow();

// Test error type
expect(() => parser.parse()).toThrow(ParserError);

// Test error message
expect(() => parser.parse()).toThrow(/expected pattern/);

// Test error with specific message
expect(() => parser.parse()).toThrow('Expected expression');
```

**Location Testing**
```typescript
// Verify source locations are tracked
expect(ast.loc).toMatchObject({
  start: { line: 1, column: 0 },
  end: { line: 1, column: 10 }
});
```

### Test Data Patterns

**Minimal Examples**
```typescript
// Use minimal examples to test specific feature
const source = 'x when x > 0 => "positive"';
```

**Comprehensive Examples**
```typescript
// Use realistic examples for integration tests
const source = `
match result with
| Ok(value) when value > 0 => "positive"
| Ok(value) when value < 0 => "negative"
| Ok(_) => "zero"
| Error(msg) => msg
`;
```

**Edge Case Examples**
```typescript
// Test boundaries
const maxInt = '9007199254740991';  // MAX_SAFE_INTEGER
const deepNesting = '((((((((((x))))))))))';
const longString = '"' + 'a'.repeat(10000) + '"';
```

## Common Testing Scenarios

### Testing New Features

1. **Read spec section** - Understand requirements
2. **Extract examples** - Get test cases from spec
3. **Create test file** - Use template above
4. **Write basic tests** - Cover main functionality
5. **Add edge cases** - Boundary conditions
6. **Add error cases** - Invalid syntax
7. **Add integration** - Combine with other features
8. **Run tests** - Verify implementation
9. **Check coverage** - Ensure all paths tested

### Testing Existing Features

1. **Review existing tests** - Understand current coverage
2. **Identify gaps** - What's missing?
3. **Add missing tests** - Fill coverage gaps
4. **Run tests** - Verify no regressions
5. **Check coverage** - Measure improvement

### Testing Error Cases

Focus on:
- **Syntax errors**: Invalid token sequences
- **Structural errors**: Missing required elements
- **Semantic errors**: Type mismatches (if parser catches them)
- **Edge cases**: Unusual but valid syntax
- **Error messages**: Helpful and accurate
- **Error locations**: Correct line/column

## Coverage Goals

### Target Metrics

- **Line coverage**: > 90%
- **Branch coverage**: > 85%
- **Function coverage**: 100% of public API
- **Statement coverage**: > 90%

### Coverage Tracking

```bash
# Run tests with coverage
npm run test:coverage

# View coverage report
# Opens in browser: coverage/index.html
```

### Coverage Gaps

Focus coverage on:
- All exported functions
- All AST node types
- All error paths
- All edge cases in parsing logic
- Complex parsing algorithms

## Integration with Feature Implementation

### Test-First Approach

When implementing new features (per feature gaps plan):
1. Write tests FIRST (from this plan)
2. Run tests (expect failures)
3. Implement feature
4. Run tests (expect success)
5. Refactor
6. Re-run tests

### Test and Implementation Separation

- **This plan**: Focuses on test creation and coverage
- **Feature gaps plan**: Focuses on implementation
- **Coordination**: Tests from this plan verify implementations from feature plan

## Quality Standards

### Test Quality Checklist

For each test file:
- [ ] Clear, descriptive test names
- [ ] Comprehensive coverage (basic, edge, error, integration)
- [ ] No duplicate tests
- [ ] Tests are independent (can run in any order)
- [ ] Tests are deterministic (same result every time)
- [ ] Proper use of describe blocks for organization
- [ ] Spec references documented at top of file
- [ ] All tests passing
- [ ] No skipped or commented tests (unless documented why)

### Code Quality in Tests

- [ ] No `any` types in test code
- [ ] Proper TypeScript types for all variables
- [ ] Clear variable names
- [ ] Helper functions for repeated patterns
- [ ] Comments explaining complex test scenarios
- [ ] Consistent code style (prettier formatted)

## Running Tests

### Common Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test pattern-guards.test.ts

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run tests for specific package
npm test -w @vibefun/core
```

### CI Integration

Tests run automatically on:
- Pre-commit hooks (if configured)
- Pull requests
- Main branch pushes

CI command: `npm run verify:ci`

## Documentation

### Updating Documentation

When adding significant test coverage:
- [ ] Update this context file with new insights
- [ ] Document any spec ambiguities found
- [ ] Note any deviations from spec (with justification)
- [ ] Update coverage metrics

### Test Documentation

Each test file should have:
- JSDoc comment at top with spec reference
- Description of what is being tested
- Note any special considerations
- Document any skipped tests

## Success Criteria

### Per Test File

- [ ] All spec examples covered
- [ ] Basic, edge, and error cases included
- [ ] Tests follow project standards
- [ ] All tests passing
- [ ] Coverage improved
- [ ] No regressions

### Overall

- [ ] All 15 new test files created
- [ ] All existing files enhanced
- [ ] Coverage > 90%
- [ ] All quality checks passing
- [ ] Spec compliance validated
- [ ] Documentation updated

## Notes

- Tests should be **readable** - they serve as documentation
- Tests should be **maintainable** - easy to update when spec changes
- Tests should be **comprehensive** - cover all behaviors
- Tests should be **fast** - parser tests should be quick
- Tests should be **reliable** - no flaky tests

## References

### Testing Resources

- Vitest documentation: https://vitest.dev/
- Project testing standards: `/.claude/CODING_STANDARDS.md`
- Language spec: `/docs/spec/`
- Existing test examples: All `.test.ts` files in parser directory
