# ES2020 Code Generator

Emits ES2020 JavaScript from a typed Core module.

## Files

- `generator.ts` — entry point; wires dependency injection and drives emission.
- `context.ts` — `EmitContext` (output buffer, indent, fresh-var generator, source-map state).
- `emit-declarations.ts`, `emit-expressions.ts`, `emit-patterns.ts`, `emit-operators.ts` — the per-node emitters.
- `runtime-helpers.ts` — small JS helpers inserted into generated output.
- `reserved-words.ts` — ES2020 reserved-name list for identifier sanitization.

## Public API

`generate(typedModule, options?)` returns `{ code }` and is the main entry point. `index.ts` also re-exports advanced-usage helpers: `createContext`, the `EmitContext` type, `escapeIdentifier`, `isReservedWord`, `RESERVED_WORDS`, and operator-precedence utilities (`PRECEDENCE`, `needsParens`, `getBinaryPrecedence`, `getUnaryPrecedence`, `JS_BINARY_OP`, `JS_UNARY_OP`, `ATOM_PRECEDENCE`, `CALL_PRECEDENCE`, `MEMBER_PRECEDENCE`). Keep `index.ts` in sync with this list.

## Critical: Circular Dependency Wiring

Emitters recurse across each other (expressions emit patterns, patterns emit expressions, declarations emit both). `generator.ts` resolves the cycle at initialization:

```ts
Expressions.setEmitPattern(Patterns.emitPattern);
Patterns.setEmitExpr(Expressions.emitExpr);
Declarations.setEmitExpr(Expressions.emitExpr);
Declarations.setEmitPattern(Patterns.emitPattern);
```

Every emit function receives `EmitContext` as a parameter for state tracking. Follow the same pattern when adding a new emitter: error-throwing stub setter in the file, wiring in `generator.ts`.

## Testing

- Unit tests live next to each emitter (`*.test.ts`).
- **Runtime semantics** are covered in `./execution-tests/` (VM-sandboxed execution of generated code).
- **Full-pipeline output** is snapshotted in `./snapshot-tests/`.

## Maintenance

If emitter files are added, split, or renamed, update the file list and the DI wiring snippet above in the same commit.
