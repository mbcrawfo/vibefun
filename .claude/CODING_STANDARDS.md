# Vibefun Coding Standards

This document outlines the coding standards and best practices for the vibefun project.

## Core Principles

1. **Type Safety First**: Never use `any`. Always provide explicit types.
2. **Functional by Default**: Prefer functional patterns over imperative ones.
3. **Test Everything**: All code must have comprehensive test coverage.
4. **Quality Over Speed**: Take time to write clean, well-tested code.

## TypeScript Style Guide

### Type Safety

**DO**:
```typescript
// Explicit return types for public functions
export function tokenize(source: string): Token[] {
    // ...
}

// Use proper union types
type Result<T, E> =
    | { ok: true; value: T }
    | { ok: false; error: E };

// Use const assertions for literal types
const TOKEN_TYPES = ['identifier', 'keyword', 'operator'] as const;
type TokenType = typeof TOKEN_TYPES[number];
```

**DON'T**:
```typescript
// Never use any
function processData(data: any) { } // ❌

// Don't omit return types for public APIs
export function parse(tokens) { } // ❌

// Don't use type assertions unless absolutely necessary
const value = data as string; // ⚠️ Use only when TypeScript can't infer correctly
```

### Functional Style

**DO**:
```typescript
// Pure functions
function add(a: number, b: number): number {
    return a + b;
}

// Use map, filter, reduce instead of loops
function getActiveUsers(users: User[]): User[] {
    return users.filter(user => user.active);
}

// Immutable data transformations
function updateUser(user: User, updates: Partial<User>): User {
    return { ...user, ...updates };
}

// Function composition
const processData = pipe(
    validateInput,
    transformData,
    formatOutput
);

// Use const for everything that doesn't change
const result = compute();
```

**DON'T**:
```typescript
// Avoid mutations
function addItem(array: string[], item: string): void {
    array.push(item); // ❌ Mutates input
}

// Avoid imperative loops when functional alternatives exist
function double(numbers: number[]): number[] {
    const result = []; // ❌ Prefer map
    for (let i = 0; i < numbers.length; i++) {
        result.push(numbers[i] * 2);
    }
    return result;
}

// Use const, not let when possible
let x = 5; // ❌ Use const if x doesn't change
x = 10;
```

### When to Use Classes

Classes are acceptable and encouraged for:

1. **Lexers and Parsers**: Stateful components that need internal cursor/position tracking
2. **Type Checkers**: Complex state management for type environments
3. **Code Generators**: Managing output buffer and source maps
4. **Error Handling**: Custom error classes
5. **Visitors**: When implementing visitor patterns for AST traversal

**Good use of classes**:
```typescript
class Lexer {
    private position: number = 0;
    private line: number = 1;
    private column: number = 1;

    constructor(private readonly source: string) {}

    nextToken(): Token {
        // Stateful parsing logic
    }

    private advance(): void {
        this.position++;
        this.column++;
    }
}

class Parser {
    private current: number = 0;

    constructor(private readonly tokens: Token[]) {}

    parse(): Module {
        return this.parseModule();
    }

    private parseModule(): Module {
        // Recursive descent parsing
    }
}
```

**Prefer functions for**:
```typescript
// Pure transformations
function desugar(expr: Expr): CoreExpr {
    // Stateless transformation
}

// Utilities
function isKeyword(str: string): str is Keyword {
    return KEYWORDS.has(str as Keyword);
}

// Type operations
function unify(t1: Type, t2: Type, subst: Substitution): Substitution {
    // Pure type unification
}
```

### Naming Conventions

- **Files**: kebab-case (`lexer.ts`, `type-checker.ts`)
- **Types**: PascalCase (`Token`, `Expr`, `TypeEnv`)
- **Functions**: camelCase (`tokenize`, `parseExpr`, `inferType`)
- **Constants**: UPPER_SNAKE_CASE for true constants (`MAX_DEPTH`, `PRIMITIVE_TYPES`)
- **Private members**: prefix with underscore (`_position`, `_currentToken`)
- **Type parameters**: Single uppercase letter or PascalCase (`T`, `TValue`, `TError`)

```typescript
// Good naming
type Token = { /* ... */ };
const MAX_RECURSION_DEPTH = 1000;

function parseExpression(tokens: Token[]): Expr {
    // ...
}

class Parser {
    private _current: number = 0;
}
```

### Error Handling

**DO**:
```typescript
// Use custom error classes with location information
throw new ParserError(
    'Unexpected token',
    token.loc,
    'Expected an expression'
);

// Use Result types for expected failures
type ParseResult = Result<Expr, ParserError>;

function tryParse(tokens: Token[]): ParseResult {
    try {
        const expr = parse(tokens);
        return { ok: true, value: expr };
    } catch (error) {
        return { ok: false, error: error as ParserError };
    }
}

// Provide helpful error messages
throw new TypeError(
    `Type mismatch: expected ${typeToString(expected)}, got ${typeToString(actual)}`,
    loc,
    `Consider adding a type annotation or converting the value`
);
```

**DON'T**:
```typescript
// Don't throw generic errors
throw new Error('failed'); // ❌ Not helpful

// Don't swallow errors
try {
    parse(tokens);
} catch {
    // ❌ No error handling
}

// Don't lose location information
throw new Error('Parse error'); // ❌ Where did it happen?
```

## Testing Standards

### Test Organization

```typescript
// tests should be colocated with source files
// src/lexer/lexer.ts
// src/lexer/lexer.test.ts

import { describe, it, expect } from 'vitest';
import { Lexer } from './lexer.js';

describe('Lexer', () => {
    describe('tokenize', () => {
        it('should tokenize integer literals', () => {
            const lexer = new Lexer('42', 'test.vf');
            const tokens = lexer.tokenize();

            expect(tokens).toHaveLength(2); // INT_LITERAL + EOF
            expect(tokens[0]).toMatchObject({
                type: 'INT_LITERAL',
                value: 42
            });
        });

        it('should handle negative numbers', () => {
            // ...
        });

        it('should throw on invalid syntax', () => {
            const lexer = new Lexer('@#$', 'test.vf');
            expect(() => lexer.tokenize()).toThrow(LexerError);
        });
    });

    describe('edge cases', () => {
        it('should handle empty input', () => {
            // ...
        });

        it('should handle very large numbers', () => {
            // ...
        });
    });
});
```

### Test Coverage Requirements

- **Unit tests**: Every public function/method
- **Edge cases**: Empty inputs, boundary conditions, large inputs
- **Error cases**: All error paths must be tested
- **Integration tests**: Test component interactions
- **Minimum coverage**: Aim for 90%+ coverage

### Test Naming

- Use descriptive test names that explain what is being tested
- Follow pattern: `should <expected behavior> when <condition>`
- Group related tests with `describe` blocks

```typescript
describe('TypeChecker', () => {
    describe('inferType', () => {
        it('should infer Int type for integer literals', () => { });
        it('should infer function type from lambda expressions', () => { });
        it('should throw TypeError when types do not unify', () => { });
    });

    describe('unify', () => {
        it('should unify identical types', () => { });
        it('should unify type variables with concrete types', () => { });
        it('should detect infinite types (occurs check)', () => { });
    });
});
```

## Code Review Checklist

Before submitting code, verify:

- [ ] No `any` types used
- [ ] All functions have explicit return types
- [ ] Functional style preferred over imperative (where appropriate)
- [ ] Classes only used for stateful components
- [ ] Comprehensive test coverage
- [ ] All tests pass: `npm run test`
- [ ] Type checking passes: `npm run check`
- [ ] Linting passes: `npm run lint`
- [ ] Code is formatted: `npm run format`
- [ ] Error messages are helpful and include locations
- [ ] Documentation updated (if API changes)

## Workflow

After making any code changes:

```bash
# Run all checks (recommended)
npm run verify

# Or run individually:
npm run check      # Type checking
npm run lint       # Linting
npm run test       # Tests
npm run format     # Format code
```

For CI/CD (doesn't modify files):
```bash
npm run verify:ci  # Uses format:check instead of format
```

## File Structure

Organize code logically:

```
src/
├── lexer/
│   ├── lexer.ts           # Main lexer class
│   ├── lexer.test.ts      # Lexer tests
│   └── index.ts           # Public exports
├── parser/
│   ├── parser.ts
│   ├── parser.test.ts
│   └── index.ts
├── types/
│   ├── ast.ts             # AST type definitions
│   ├── token.ts           # Token types
│   ├── type.ts            # Type system types
│   └── index.ts           # Re-export all types
└── utils/
    ├── error.ts           # Error classes
    ├── error.test.ts
    └── index.ts
```

## Documentation

- Use JSDoc for public APIs
- Include examples in documentation
- Document complex algorithms with comments
- Keep CLAUDE.md updated with design decisions

```typescript
/**
 * Tokenizes Vibefun source code into a stream of tokens.
 *
 * @param source - The source code to tokenize
 * @param filename - The filename for error reporting
 * @returns An array of tokens
 * @throws {LexerError} When invalid syntax is encountered
 *
 * @example
 * ```typescript
 * const tokens = tokenize('let x = 42', 'example.vf');
 * ```
 */
export function tokenize(source: string, filename: string): Token[] {
    // ...
}
```

## Performance Considerations

- Prefer immutable data structures (they're fast in modern JS)
- Use `Map` and `Set` for lookups instead of objects/arrays
- Avoid premature optimization
- Profile before optimizing
- Document performance-critical sections

```typescript
// Good: Use Map for fast lookups
const typeEnv: Map<string, TypeScheme> = new Map();

// Good: Use Set for membership testing
const keywords: Set<string> = new Set(['let', 'type', 'match']);

// Avoid: Linear search in arrays
const keywords: string[] = ['let', 'type', 'match'];
if (keywords.includes(token)) { } // O(n) lookup
```

## Import/Export Guidelines

- Use named exports (not default exports)
- Import types with `type` keyword when possible
- Use index.ts files for public module APIs
- Keep imports organized (prettier will sort them)

```typescript
// Good
import type { Token, TokenType } from './types/index.js';
import { tokenize } from './lexer/index.js';

export { tokenize, type Token, type TokenType };

// Avoid default exports
export default class Lexer { } // ❌
```

## Additional Resources

- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [Functional Programming in TypeScript](https://gcanti.github.io/fp-ts/)
- See `.claude/plans/` for architectural decisions
- See `CLAUDE.md` for project context and decisions
