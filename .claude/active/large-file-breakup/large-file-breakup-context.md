# Large File Breakup - Context

**Created:** 2025-11-23
**Last Updated:** 2025-11-23

## Key Files

### Files to Refactor

#### Lexer Module
- `packages/core/src/lexer/lexer.ts` (1,036 lines)
- `packages/core/src/lexer/lexer-integration.test.ts` (1,448 lines)
- `packages/core/src/lexer/operators.test.ts` (1,132 lines)

#### Parser Module
- `packages/core/src/parser/expressions.test.ts` (3,018 lines)
- `packages/core/src/parser/parser-integration.test.ts` (1,057 lines)
- `packages/core/src/parser/parse-expressions.ts` (1,811 lines)

#### Type Checker Module
- `packages/core/src/typechecker/infer.ts` (1,478 lines)
- `packages/core/src/typechecker/typechecker.test.ts` (1,752 lines)
- `packages/core/src/typechecker/infer.test.ts` (2,007 lines)

### Reference Documents

- `.claude/CODING_STANDARDS.md` - Project coding standards
- `.claude/DOCUMENTATION_RULES.md` - Documentation guidelines
- `CLAUDE.md` - Project overview and structure
- `.claude/large-files.txt` - Generated list of large files

---

## Technical Decisions

### File Organization Pattern

All refactorings follow the module organization pattern from coding standards:

```
module/
├── implementation-file.ts       # Core implementation
├── helper-module-1.ts           # Extracted helpers
├── helper-module-2.ts           # Extracted helpers
└── index.ts                     # Public API (re-exports)
```

**OR** for complex modules:

```
module/
├── index.ts                     # Public API
├── module-aspect-1.ts           # Implementation aspect 1
├── module-aspect-2.ts           # Implementation aspect 2
└── module-aspect-3.ts           # Implementation aspect 3
```

### Import Strategy

1. **Always use named exports** (never default exports)
2. **Use `import type`** for type-only imports
3. **Import from index.ts** for public APIs
4. **Avoid circular dependencies** using:
   - `import type` for type references
   - Dependency injection for cross-module function calls
   - Aggregator pattern (index.ts re-exports)

### Testing Patterns

1. **Co-locate tests** with source files
2. **Use describe blocks** for organization
3. **Create shared test helpers** when duplication is significant
4. **Accept some duplication** in test setup for independence

---

## Refactoring Strategies by File Type

### Implementation Files (lexer.ts, parse-expressions.ts, infer.ts)

**Strategy:** Extract by functional responsibility

**Pattern:**
- Identify logical components with clear boundaries
- Extract pure functions or related function groups
- Use dependency injection for cross-module calls
- Create aggregator file if needed

**Example:**
```typescript
// number-parser.ts
import type { Token } from "../types/index.js";
import type { Lexer } from "./lexer.js";

export function readNumber(lexer: Lexer): Token {
    // Implementation using lexer.peek(), lexer.advance()
}
```

```typescript
// lexer.ts (simplified)
import { readNumber } from "./number-parser.js";

export class Lexer {
    tokenize(): Token[] {
        // ...
        if (isDigit(char)) {
            tokens.push(readNumber(this));
        }
        // ...
    }
}
```

### Test Files

**Strategy:** Split by feature area or test category

**Pattern:**
- Group related test suites together
- Each file tests a cohesive subset of functionality
- Create shared test helpers if significant duplication
- Maintain clear describe block structure

**Example:**
```typescript
// expression-literals.test.ts
import { describe, it, expect } from "vitest";
import { parseExpression } from "./test-helpers.js";

describe("Parser - Expression Literals", () => {
    describe("integer literals", () => {
        it("should parse positive integers", () => {
            // ...
        });
    });

    describe("string literals", () => {
        // ...
    });
});
```

---

## Circular Dependency Management

### Problem

When splitting files, circular dependencies can arise:
- Module A exports function `foo()` that calls `bar()`
- Module B exports function `bar()` that calls `foo()`

### Solutions

#### 1. Import Type Pattern
Use `import type` for type-only references:

```typescript
// module-a.ts
import type { Lexer } from "./lexer.js";

export function parseNumber(lexer: Lexer): Token {
    // Only uses Lexer as a parameter type
}
```

#### 2. Dependency Injection
Pass dependencies as parameters:

```typescript
// parse-expression-operators.ts
let parsePrimaryFn: () => Expr;

export function setParsePrimary(fn: () => Expr): void {
    parsePrimaryFn = fn;
}

export function parseExpression(): Expr {
    // Can call parsePrimaryFn()
}
```

```typescript
// index.ts (aggregator)
import { parseExpression, setParsePrimary } from "./parse-expression-operators.js";
import { parsePrimary } from "./parse-expression-primary.js";

setParsePrimary(parsePrimary);

export { parseExpression };
```

#### 3. Aggregator Pattern
Create index.ts that wires up dependencies:

```typescript
// infer/index.ts
export { inferExpr } from './infer-primitives.js';
export { instantiate, generalize } from './infer-context.js';
// All modules can import from './infer/index.js'
```

---

## File Naming Conventions

### Source Files
- **kebab-case**: `parse-expressions.ts`, `infer-context.ts`
- **Descriptive names**: Indicate purpose (`number-parser.ts`, not `utils.ts`)
- **Module prefixes**: Group related files (`infer-primitives.ts`, `infer-operators.ts`)

### Test Files
- **Match source name** with `.test.ts` suffix
- **Descriptive categories** for split tests (`expression-literals.test.ts`)
- **Module prefix for grouping** (`lexer-integration-*.test.ts`)

---

## Quality Assurance

### After Each File Split

Run the complete verification suite:

```bash
npm run verify
```

This runs:
1. `npm run check` - Type checking
2. `npm run lint` - Linting
3. `npm test` - All tests
4. `npm run format:check` - Format checking

### Manual Verification

- [ ] All imports resolve correctly
- [ ] No circular dependency warnings
- [ ] Test coverage maintained or improved
- [ ] File sizes under target (<1,000 lines)
- [ ] Clear, logical file organization

---

## Implementation Order

The 9 phases can be tackled in any order, but recommended sequence:

1. **Start with test files** - Lower risk, no circular dependencies
2. **Then implementation files** - More complex, requires careful dependency management
3. **Verify after each phase** - Catch issues early

**Suggested order:**
1. Phase 2: Lexer Integration Tests (straightforward split)
2. Phase 3: Operators Tests (straightforward split)
3. Phase 5: Parser Integration Tests (straightforward split)
4. Phase 8: Typechecker Tests (straightforward split)
5. Phase 9: Inference Tests (straightforward split)
6. Phase 1: Lexer Core (moderate complexity)
7. Phase 4: Expression Tests (most test files)
8. Phase 6: Expression Parser (circular dependencies)
9. Phase 7: Type Inference (circular dependencies + directory restructure)

---

## Common Patterns

### Pattern 1: Extract Helper Functions
**Used in:** lexer.ts, parse-expressions.ts

Extract related functions into separate modules that operate on main class instance.

### Pattern 2: Split Test Suites
**Used in:** All test files

Move describe blocks into separate test files grouped by feature area.

### Pattern 3: Create Subdirectory with Index
**Used in:** infer.ts

Create subdirectory with multiple implementation files and index.ts re-exports.

### Pattern 4: Shared Test Helpers
**Used in:** Test files with significant duplication

Create `test-helpers.ts` with shared setup code and utilities.

---

## File Size Policy

### New Standard: 1,000 Line Maximum

After completing this refactoring, the project will enforce a 1,000 line maximum for all TypeScript files (source and test).

**When a file exceeds 1,000 lines:**
1. Refactor into smaller modules following the patterns documented here
2. Extract logical components into separate files
3. Use index.ts for public API re-exports

**Rare exceptions allowed with documentation:**
If a file legitimately cannot be split, add this comment block at the top:

```typescript
/**
 * FILE SIZE EXCEPTION
 *
 * This file exceeds the 1,000 line guideline.
 *
 * Reason: [Specific reason why splitting is not feasible]
 *
 * Last reviewed: [Date]
 * Reviewer: [Name]
 */
```

**Valid exception reasons:**
- Generated code that must not be manually edited
- Large constant/lookup tables that must stay together for semantic reasons
- Complex tightly-coupled state machines where separation would harm clarity
- Integration test suites that test cross-cutting end-to-end scenarios

**Invalid exception reasons:**
- "Haven't had time to refactor yet" (use TODO comment instead)
- "Too hard to split" (usually indicates need for better design)
- "Works fine as-is" (maintainability matters)

### Enforcement

The coding standards will be updated in Phase 10 to include:
- File size limits in the "Code Review Checklist"
- Exception documentation format
- Examples of good file organization
- Refactoring guidance

---

## Notes

- Some duplication is acceptable (especially in tests)
- Prioritize clarity over DRY (Don't Repeat Yourself)
- Each file should have a single, clear responsibility
- File names should make purpose obvious
- Follow existing project patterns
- Future files must stay under 1,000 lines (enforced by updated coding standards)
