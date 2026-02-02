# ES2020 Code Generator Module

This module generates ES2020 JavaScript from typed Core AST.

## Files

- **generator.ts** - Main ES2020Generator class, wires dependencies
- **emit-expressions.ts** - Expression emission functions
- **emit-patterns.ts** - Pattern emission for destructuring and match
- **emit-declarations.ts** - Declaration emission
- **emit-operators.ts** - Operator precedence and parenthesization
- **context.ts** - EmitContext type for tracking emission state
- **reserved-words.ts** - JavaScript reserved word escaping
- **runtime-helpers.ts** - $eq and ref helper generation

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

## Key Design Decisions

1. **Context-aware emission**: Track statement vs expression mode
2. **Precedence-based parenthesization**: Minimal parens for readability
3. **Conditional helpers**: Only emit ref/$eq when used
4. **IIFE for scoping**: Let expressions in expression context use IIFEs
5. **Curried functions**: All lambdas are single-parameter
6. **Tagged variants**: `{ $tag: "Name", $0: arg, $1: arg2 }`
7. **Tuples as arrays**: JavaScript arrays represent tuples
8. **Unit as undefined**: `()` maps to JavaScript `undefined`

## Testing

- **Unit tests** in `tests/` directory test individual emission functions
- **Snapshot tests** in `snapshot-tests/` validate full compilation output
- **Execution tests** use Node's `vm` module to verify runtime semantics
