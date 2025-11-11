# Parser Module Structure

The parser is organized into focused modules for maintainability:

## Files

- **parser-base.ts** - Base class with parser state and token utilities
- **parse-expressions.ts** - Expression parsing (precedence climbing)
- **parse-patterns.ts** - Pattern parsing
- **parse-types.ts** - Type expression parsing
- **parse-declarations.ts** - Declaration parsing
- **parser.ts** - Main `Parser` class that composes all modules

## Public API

The `Parser` class maintains the same interface:
- `parse()` - Parse complete module
- `parseExpression()` - Parse single expression
- `parsePattern()` - Parse pattern (for tests)
- `parseTypeExpr()` - Parse type expression (for tests)

## Circular Dependencies

Modules use dependency injection to avoid import cycles. Initialization happens in `parser.ts`:

```typescript
Expressions.setParsePattern(Patterns.parsePattern);
Expressions.setParseTypeExpr(Types.parseTypeExpr);
Declarations.setParseExpression(Expressions.parseExpression);
// etc.
```

All parsing functions take `ParserBase` as their first parameter.
