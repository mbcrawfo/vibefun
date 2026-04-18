# Parser Module Structure

Recursive-descent parser that turns tokens into the Surface AST. Split across focused files for maintainability.

## Files

- `parser-base.ts` — base class with cursor, lookahead, and `check`/`match`/`expect` helpers.
- `parse-declarations.ts` — top-level declarations (let, type, import, export, external).
- `parse-expressions.ts` — expression aggregator; wires the expression sub-modules.
  - `parse-expression-primary.ts` — literals, identifiers, parenthesized / block / record / lambda entry.
  - `parse-expression-operators.ts` — operator precedence climbing.
  - `parse-expression-lambda.ts` — lambda and parenthesized-lambda disambiguation.
  - `parse-expression-complex.ts` — `match`, `let` in expressions, records, block bodies.
- `parse-patterns.ts` — pattern parsing.
- `parse-types.ts` — type-expression parsing.
- `parser.ts` — composes everything; exposes the `Parser` class.

## Public API

The `Parser` class:

- `parse()` — full module.
- `parseExpression()` — single expression.
- `parsePattern()`, `parseTypeExpr()` — exposed for tests.

## Critical: Dependency Injection Across Files

The expression, pattern, and type parsers need to call each other, which would create import cycles. Resolution:

- Each sub-module exports `setXxx(fn)` setters, initialized to **error-throwing stubs** so a missing wire fails loudly.
- `parse-expressions.ts` wires the expression sub-modules via `Primary.setComplexParsers`, `Operators.setParsePrimary`, `Lambda.setDependencies`, `Complex.setDependencies`.
- `parser.ts` injects `parsePattern` and `parseTypeExpr` into `parse-expressions.ts`.
- Entry points call `initializeOnce()` before delegating.

Every parsing function takes `ParserBase` as its first parameter. When you add a new file, follow this pattern: error-throwing stubs, `setXxx` exporters, wired in the aggregator.

## Maintenance

If sub-files here are added, split, renamed, or removed, update the file list and wiring description above in the same commit.
