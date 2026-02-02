# ES2020 Code Generator Module

This module generates ES2020 JavaScript from typed Core AST.

## Public API

The module exports a single `generate()` function via `index.ts`:
- `generate(typedModule, options?)` - Generate JavaScript from TypedModule

## Circular Dependencies

Modules use dependency injection to avoid import cycles. Initialization happens in `generator.ts`:

```typescript
Expressions.setEmitPattern(Patterns.emitPattern);
Patterns.setEmitExpr(Expressions.emitExpr);
Declarations.setDependencies({ ... });
```

All emit functions take `EmitContext` as a parameter for state tracking.

## Testing

Tests are organized following the project's coding standards (colocated with source files):

- **Unit tests** (colocated): `*.test.ts` files alongside source files test individual emission functions
- **Execution tests** in `execution-tests/` - Runtime semantics validation using Node's `vm` module
- **Snapshot tests** in `snapshot-tests/` - Full compilation output validation (see [CLAUDE.md](./snapshot-tests/CLAUDE.md))
