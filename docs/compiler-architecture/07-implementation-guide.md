# Implementation Guide

This document provides practical guidance for implementing compiler features following established patterns and best practices.

## Overview

This guide covers:
- When to use classes vs functions
- Module organization patterns
- TypeScript best practices
- Testing strategies by phase
- Helper function composition
- Performance considerations
- Code review guidelines

## Classes vs Functions

### Use Classes When

**State management is essential:**

```typescript
// ✓ Good - Lexer needs position tracking
class Lexer {
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;

  constructor(
    private source: string,
    private filename: string
  ) {}

  tokenize(): Token[] {
    const tokens: Token[] = [];
    while (!this.isAtEnd()) {
      tokens.push(this.nextToken());
    }
    return tokens;
  }

  private advance(): void {
    this.position++;
    this.column++;
  }
}
```

**Multiple methods share state:**

```typescript
// ✓ Good - Parser maintains token position
class Parser {
  private position: number = 0;

  constructor(
    private tokens: Token[],
    private filename: string
  ) {}

  parseModule(): Module {
    return this.parseDeclarations();
  }

  private parseDeclarations(): Declaration[] {
    // Uses this.position
  }

  private currentToken(): Token {
    return this.tokens[this.position];
  }
}
```

### Use Functions When

**Operations are pure (no side effects):**

```typescript
// ✓ Good - Pure transformation
export function desugarPipe(expr: SurfaceExpr): CoreExpr {
  if (expr.type === 'Pipe') {
    return {
      type: 'CoreApp',
      func: expr.right,
      arg: expr.left,
      loc: expr.loc
    };
  }
  return expr;
}
```

**No state between calls:**

```typescript
// ✓ Good - Stateless utility
export function getASTSize(expr: CoreExpr): number {
  switch (expr.type) {
    case 'CoreVar':
      return 1;
    case 'CoreLambda':
      return 1 + getASTSize(expr.body);
    case 'CoreApp':
      return 1 + getASTSize(expr.func) + getASTSize(expr.arg);
    // ... other cases
  }
}
```

**Simple data transformations:**

```typescript
// ✓ Good - Map one structure to another
export function typeToString(type: Type): string {
  switch (type.kind) {
    case 'TypeVar':
      return type.name;
    case 'TypeCon':
      return type.name;
    case 'FunctionType':
      return `${typeToString(type.from)} -> ${typeToString(type.to)}`;
    // ... other cases
  }
}
```

### Decision Guide

```
Need mutable state? ──Yes──> Use Class
       │
       No
       │
       ▼
Multiple methods   ──Yes──> Use Class (maybe)
share data?              │
       │                 │
       No                └──> Consider if functions + shared params work
       │
       ▼
Use Function
```

## Module Organization

### Directory Structure

Every module follows this pattern:

```
module-name/
├── module-name.ts        # Main implementation
├── module-name.test.ts   # Tests
├── helpers.ts            # Internal utilities (optional)
├── helpers.test.ts       # Helper tests (optional)
└── index.ts              # Public API exports
```

### Index.ts Pattern

**Purpose:** Clearly define public API

```typescript
// index.ts - Export public API only
export { Lexer } from './lexer.js';
export { tokenize } from './lexer.js';
export type { Token, TokenType } from './token.js';

// Note: Internal helpers are NOT exported
```

### Implementation File

**Pattern:**

```typescript
// lexer.ts
import type { Token, Location } from '../types/index.js';
import { LexerError } from '../utils/error.js';

export class Lexer {
  // Public API
  tokenize(): Token[] { /* ... */ }

  // Private helpers (not exported from index)
  private advance(): void { /* ... */ }
  private peek(): string { /* ... */ }
}

// Helper function (not exported from index)
function isWhitespace(char: string): boolean {
  return /\s/.test(char);
}
```

### Imports

**Always import from index.ts:**

```typescript
// ✓ Good - Import from index
import { Parser } from '../parser/index.js';
import type { Token } from '../types/index.js';

// ✗ Bad - Import from implementation file
import { Parser } from '../parser/parser.js';
```

**Use type imports when only importing types:**

```typescript
// ✓ Good - Explicit type import
import type { Token, Location } from '../types/index.js';
import { tokenize } from '../lexer/index.js';

// ✗ Bad - Mixing when you only need types
import { Token, Location } from '../types/index.js';
```

## TypeScript Patterns

### Type Safety

**Always use explicit return types for public functions:**

```typescript
// ✓ Good - Explicit return type
export function tokenize(source: string, filename: string): Token[] {
  // ...
}

// ✗ Bad - Implicit return type
export function tokenize(source: string, filename: string) {
  // ...
}
```

**Never use `any`:**

```typescript
// ✗ Bad - Using any
function process(data: any): any {
  return data.value;
}

// ✓ Good - Proper types
function process<T>(data: { value: T }): T {
  return data.value;
}
```

**Use discriminated unions for variants:**

```typescript
// ✓ Good - Discriminated union
type Expr =
  | { type: 'Variable'; name: string; loc: Location }
  | { type: 'Lambda'; param: string; body: Expr; loc: Location }
  | { type: 'App'; func: Expr; arg: Expr; loc: Location };

function processExpr(expr: Expr): void {
  switch (expr.type) {
    case 'Variable':
      // TypeScript knows expr is Variable here
      console.log(expr.name);
      break;
    case 'Lambda':
      // TypeScript knows expr is Lambda here
      processExpr(expr.body);
      break;
    // ...
  }
}
```

### Immutability Patterns

**Use readonly for immutable fields:**

```typescript
class Lexer {
  constructor(
    private readonly source: string,  // Cannot be reassigned
    private readonly filename: string
  ) {}
}
```

**Create new objects instead of mutating:**

```typescript
// ✓ Good - Create new object
function renameVariable(expr: CoreExpr, oldName: string, newName: string): CoreExpr {
  if (expr.type === 'CoreVar' && expr.name === oldName) {
    return { ...expr, name: newName };  // New object
  }
  return expr;
}

// ✗ Bad - Mutate object
function renameVariable(expr: CoreExpr, oldName: string, newName: string): CoreExpr {
  if (expr.type === 'CoreVar' && expr.name === oldName) {
    expr.name = newName;  // Mutation!
  }
  return expr;
}
```

### Error Handling

**Always include location and helpful messages:**

```typescript
// ✓ Good - Helpful error with location
if (this.currentToken.type !== 'IDENTIFIER') {
  throw new ParserError(
    `Expected identifier, got ${this.currentToken.type}`,
    this.currentToken.loc,
    'Variable names must be valid identifiers'
  );
}

// ✗ Bad - Generic error without context
if (this.currentToken.type !== 'IDENTIFIER') {
  throw new Error('Parse error');
}
```

## Testing Strategies

### Testing by Phase

**Lexer tests:**

```typescript
describe('Lexer', () => {
  describe('tokenize', () => {
    it('should tokenize integer literals', () => {
      const lexer = new Lexer('42', 'test.vf');
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(2);  // INT + EOF
      expect(tokens[0]).toMatchObject({
        type: 'INT_LITERAL',
        value: 42
      });
    });

    it('should handle strings with escape sequences', () => {
      const lexer = new Lexer('"hello\\nworld"', 'test.vf');
      const tokens = lexer.tokenize();

      expect(tokens[0].value).toBe('hello\nworld');
    });

    it('should throw on invalid syntax', () => {
      const lexer = new Lexer('@invalid', 'test.vf');
      expect(() => lexer.tokenize()).toThrow(LexerError);
    });
  });
});
```

**Parser tests:**

```typescript
describe('Parser', () => {
  describe('parseExpr', () => {
    it('should parse function application', () => {
      const tokens = tokenize('f x', 'test.vf');
      const parser = new Parser(tokens, 'test.vf');
      const expr = parser.parseExpr();

      expect(expr).toMatchObject({
        type: 'App',
        func: { type: 'Variable', name: 'f' },
        arg: { type: 'Variable', name: 'x' }
      });
    });

    it('should respect precedence', () => {
      const tokens = tokenize('x + y * z', 'test.vf');
      const parser = new Parser(tokens, 'test.vf');
      const expr = parser.parseExpr();

      // Should parse as: x + (y * z)
      expect(expr).toMatchObject({
        type: 'BinaryOp',
        op: '+',
        left: { type: 'Variable', name: 'x' },
        right: {
          type: 'BinaryOp',
          op: '*',
          left: { type: 'Variable', name: 'y' },
          right: { type: 'Variable', name: 'z' }
        }
      });
    });
  });
});
```

**Desugarer tests:**

```typescript
describe('desugarPipe', () => {
  it('should desugar simple pipe', () => {
    const surface: SurfaceExpr = {
      type: 'Pipe',
      left: { type: 'Variable', name: 'x', loc },
      right: [{ type: 'Variable', name: 'f', loc }],
      loc
    };

    const core = desugarPipe(surface);

    expect(core).toMatchObject({
      type: 'CoreApp',
      func: { type: 'CoreVar', name: 'f' },
      arg: { type: 'CoreVar', name: 'x' }
    });
  });

  it('should preserve locations', () => {
    const surface = /* ... */;
    const core = desugarPipe(surface);
    expect(core.loc).toEqual(surface.loc);
  });
});
```

**Optimizer tests:**

```typescript
describe('constantFoldingPass', () => {
  it('should fold integer addition', () => {
    const input: CoreExpr = {
      type: 'CoreBinaryOp',
      op: '+',
      left: { type: 'CoreInt', value: 2, loc },
      right: { type: 'CoreInt', value: 3, loc },
      loc
    };

    const result = constantFoldingPass.transform(input);

    expect(result).toMatchObject({
      type: 'CoreInt',
      value: 5
    });
  });

  it('should not fold if variables present', () => {
    const input: CoreExpr = /* x + 3 */;
    const result = constantFoldingPass.transform(input);
    expect(result).toEqual(input);  // Unchanged
  });
});
```

### Test Organization

**Group related tests:**

```typescript
describe('Lexer', () => {
  describe('number literals', () => {
    it('should tokenize integers', () => { /* ... */ });
    it('should tokenize floats', () => { /* ... */ });
    it('should handle underscores', () => { /* ... */ });
    it('should reject invalid numbers', () => { /* ... */ });
  });

  describe('string literals', () => {
    it('should tokenize basic strings', () => { /* ... */ });
    it('should handle escape sequences', () => { /* ... */ });
    it('should reject unterminated strings', () => { /* ... */ });
  });
});
```

### Test Coverage

**Aim for comprehensive coverage:**

- ✅ Happy path cases
- ✅ Edge cases (empty input, very large input)
- ✅ Error cases (invalid input)
- ✅ Boundary conditions
- ✅ Location preservation
- ✅ Precedence and associativity (for parser)

### Snapshot Testing

**For complex output:**

```typescript
it('should parse complex expression correctly', () => {
  const source = 'let f = (x, y) => x + y in f 1 2';
  const tokens = tokenize(source, 'test.vf');
  const ast = new Parser(tokens, 'test.vf').parseModule();

  expect(ast).toMatchSnapshot();
});
```

**Benefits:**
- Catch unexpected changes
- Visualize AST structure
- Easy to review

**Update snapshots:**
```bash
npm test -- -u
```

## Helper Function Composition

### Pure Helper Functions

**Extract common patterns:**

```typescript
// Instead of repeating this pattern:
function transform1(expr: CoreExpr): CoreExpr {
  if (expr.type === 'CoreApp') {
    return {
      type: 'CoreApp',
      func: transform1(expr.func),
      arg: transform1(expr.arg),
      loc: expr.loc
    };
  }
  // ... other cases
}

// Extract to helper:
function mapChildren(
  expr: CoreExpr,
  mapper: (child: CoreExpr) => CoreExpr
): CoreExpr {
  switch (expr.type) {
    case 'CoreApp':
      return {
        ...expr,
        func: mapper(expr.func),
        arg: mapper(expr.arg)
      };
    case 'CoreLambda':
      return {
        ...expr,
        body: mapper(expr.body)
      };
    // ... other cases
  }
}

// Use helper:
function transform1(expr: CoreExpr): CoreExpr {
  // Apply transformation at this level
  const transformed = /* ... */;
  // Recursively transform children
  return mapChildren(transformed, transform1);
}
```

### Composition Patterns

**Pipeline transformations:**

```typescript
function desugarAll(expr: SurfaceExpr): CoreExpr {
  let result = expr;
  result = desugarPipe(result);
  result = desugarComposition(result);
  result = curryLambda(result);
  return result;
}
```

**Higher-order functions:**

```typescript
type Transform = (expr: CoreExpr) => CoreExpr;

function composeTransforms(...transforms: Transform[]): Transform {
  return (expr: CoreExpr) =>
    transforms.reduce((e, t) => t(e), expr);
}

const pipeline = composeTransforms(
  optimize1,
  optimize2,
  optimize3
);

const result = pipeline(expr);
```

## Performance Considerations

### Avoid Premature Optimization

**Do:**
- ✅ Write clear, correct code first
- ✅ Profile before optimizing
- ✅ Optimize hot paths only
- ✅ Measure impact of optimizations

**Don't:**
- ❌ Optimize without profiling
- ❌ Sacrifice clarity for micro-optimizations
- ❌ Optimize cold paths

### Efficient Patterns

**Use Map/Set for lookups:**

```typescript
// ✓ Good - O(1) lookup
const keywords = new Set([
  'let', 'type', 'match', 'if', 'then', 'else'
]);

function isKeyword(word: string): boolean {
  return keywords.has(word);
}

// ✗ Bad - O(n) lookup
const keywords = ['let', 'type', 'match', 'if', 'then', 'else'];

function isKeyword(word: string): boolean {
  return keywords.includes(word);  // O(n)
}
```

**Avoid unnecessary allocations:**

```typescript
// ✓ Good - Return original if no change
function optimize(expr: CoreExpr): CoreExpr {
  if (!shouldOptimize(expr)) {
    return expr;  // No allocation
  }
  return { ...expr, /* changes */ };
}

// ✗ Bad - Always allocate
function optimize(expr: CoreExpr): CoreExpr {
  return { ...expr };  // Unnecessary allocation
}
```

**Cache expensive computations:**

```typescript
class TypeChecker {
  private typeCache = new Map<CoreExpr, Type>();

  inferType(expr: CoreExpr): Type {
    // Check cache first
    const cached = this.typeCache.get(expr);
    if (cached) return cached;

    // Compute type
    const type = /* ... */;

    // Cache result
    this.typeCache.set(expr, type);
    return type;
  }
}
```

### Complexity Guidelines

| Operation | Target Complexity |
|-----------|------------------|
| Lexing | O(n) - linear scan |
| Parsing | O(n) - single pass |
| Desugaring | O(n) - tree traversal |
| Type checking | O(n log n) - with env lookups |
| Single optimization pass | O(n) - tree traversal |
| Full optimization (O2) | O(n × k) - k iterations |

## Code Review Checklist

Before submitting code:

**Type Safety:**
- [ ] No `any` types used
- [ ] Explicit return types for public functions
- [ ] Proper use of discriminated unions

**Error Handling:**
- [ ] Errors include location information
- [ ] Error messages are clear and helpful
- [ ] Hints provided where appropriate

**Testing:**
- [ ] Unit tests for all public functions
- [ ] Edge cases covered
- [ ] Error cases tested
- [ ] Locations preserved in transformations

**Code Quality:**
- [ ] No mutations (immutable patterns used)
- [ ] Functions are pure (where possible)
- [ ] Classes only used for stateful components
- [ ] Imports from index.ts (not implementation files)

**Documentation:**
- [ ] JSDoc for public APIs
- [ ] Complex logic has comments
- [ ] README/CLAUDE.md updated if needed

**Performance:**
- [ ] No obvious performance issues
- [ ] Efficient data structures used (Map/Set for lookups)
- [ ] No unnecessary allocations

**Quality Checks:**
```bash
npm run verify  # Runs all checks below:
npm run check   # TypeScript type checking
npm run lint    # ESLint
npm test        # All tests
npm run format  # Prettier formatting
```

## Common Patterns Summary

### AST Node Creation

```typescript
// Always include type and location
const node: CoreExpr = {
  type: 'CoreApp',
  func: /* ... */,
  arg: /* ... */,
  loc: originalNode.loc
};
```

### AST Transformation

```typescript
function transform(expr: CoreExpr): CoreExpr {
  // Check if transformation applies
  if (shouldTransform(expr)) {
    return /* transformed version */;
  }

  // Recurse into children
  return mapChildren(expr, transform);
}
```

### Error Throwing

```typescript
throw new PhaseError(
  'Clear description of what went wrong',
  location,
  'Helpful hint for fixing the issue'
);
```

### Testing Pattern

```typescript
describe('Component', () => {
  it('should handle normal case', () => {
    const input = /* ... */;
    const result = component(input);
    expect(result).toEqual(expected);
  });

  it('should preserve locations', () => {
    const input = /* ... */;
    const result = component(input);
    expect(result.loc).toEqual(input.loc);
  });

  it('should throw on invalid input', () => {
    const invalid = /* ... */;
    expect(() => component(invalid)).toThrow(ErrorType);
  });
});
```

## Quick Reference

### When to Use Classes vs Functions

| Use Case | Pattern |
|----------|---------|
| State management needed | Class |
| Multiple methods share state | Class |
| Pure transformation | Function |
| No state between calls | Function |
| Stateless utility | Function |

### Import Patterns

```typescript
// Types only
import type { Token, Location } from '../types/index.js';

// Values only
import { tokenize } from '../lexer/index.js';

// Mixed (separate type imports)
import type { Token } from '../types/index.js';
import { Lexer } from '../lexer/index.js';
```

### Testing Commands

```bash
npm test                    # Run all tests
npm test -- lexer           # Run tests matching "lexer"
npm test -- -u              # Update snapshots
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage
```

### Quality Commands

```bash
npm run verify              # All checks
npm run check               # Type checking
npm run lint                # Linting
npm test                    # Tests
npm run format              # Format code
npm run format:check        # Check formatting (read-only)
```

## Next Steps

Now that you understand implementation patterns:

1. **Review existing code** in `packages/core/src/`
2. **Read coding standards** in `.claude/CODING_STANDARDS.md`
3. **Study examples** of each pattern in the codebase
4. **Start implementing** following these patterns
5. **Run quality checks** before committing

**Key resources:**
- **[CODING_STANDARDS.md](/.claude/CODING_STANDARDS.md)** - Detailed coding conventions
- **[03-design-patterns.md](./03-design-patterns.md)** - Architectural patterns
- **[06-extensibility.md](./06-extensibility.md)** - How to extend the compiler
- **Source code** - Best examples of these patterns in action

---

**Last Updated:** 2025-11-23
