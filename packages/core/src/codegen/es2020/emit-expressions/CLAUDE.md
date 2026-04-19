# Expression Emission Sub-Module

Per-expression-kind emitters for ES2020 codegen. The dispatcher `index.ts`
switches on `CoreExpr.kind` and delegates to the focused sub-files below.

## Files

- `escape-string.ts` — string literal escaping utility (also exported publicly).
- `literals.ts` — int/float/string emission.
- `variables.ts` — variable reference emission (handles external bindings).
- `operators.ts` — binary/unary operator emission with precedence handling.
- `functions.ts` — lambda + application emission.
- `collections.ts` — tuple, record, record-access, record-update, variant.
- `control.ts` — let, let-rec, match (uses `emitMatchPattern` DI wrapper).
- `shared-state.ts` — module-scope DI holders for pattern / match-pattern /
  name-extraction functions, plus their `setXxx` setters. Sub-files import
  the getter wrappers instead of the raw function variables.
- `index.ts` — dispatcher `emitExpr`; re-exports `escapeString` and the
  three `setXxx` setters for `generator.ts`.

## Internal cyclic imports

Sub-files that recurse (operators, functions, collections, control) import
`emitExpr` from `./index.js`. This is a module cycle that ESM resolves
correctly: `emitExpr` is never invoked at module load time, only when the
generator runs user code, so the live-binding is always wired by then.

## Maintenance

If a new expression kind is added, add a case to the dispatcher in `index.ts`
**and** add the emitter function to the appropriate sub-file (by category).
When a new sub-file is added, list it above.
