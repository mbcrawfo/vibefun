# Shared Type Definitions

Type declarations used across every compiler phase. These files are imported everywhere, so breaking changes ripple. Treat them as a stable contract.

## Two ASTs Coexist

- **`ast.ts` — Surface AST.** Parser output. Includes sugar: `if`/`then`/`else`, pipes, composition, list concatenation, record updates, while loops, etc.
- **`core-ast.ts` — Core AST.** Post-desugaring. Only the minimal set the typechecker and codegen consume (match, lambda, records, variants, …).

Every transformation between them happens in `desugarer/`. Never add surface-only sugar nodes to `core-ast.ts`, and never expect core-only nodes in `ast.ts`.

## `environment.ts` Has Subtle Semantics

- `TypeEnv` uses **`Map<string, …>`**, not object literals. Access via `.get` / `.set` (or the helpers `lookupValue`, `addValue`, …). Property access returns `undefined`.
- `ValueBinding` has three variants. `ExternalOverload` carries **multiple type signatures** for one name — used for FFI declarations that have type-directed overloads. Handle all three kinds when you switch on `kind`.
- `Type` for type variables carries `{ id, level }`. The `level` drives generalization / the value restriction — **do not strip it** when constructing or rewriting types.

## `Location` Is Load-Bearing

`Location` (`{ file, line, column, offset }`) is embedded on every AST node because diagnostics render source snippets from it. When you construct new nodes (desugarer, optimizer, helpers), preserve the `loc` of the originating surface node — synthetic nodes should at least reuse a nearby location.

## Other Files

- `token.ts` — lexer output tokens; `TokenKind` enumerates everything the parser can see.
- `optimizer.ts` — shared optimizer types (`OptimizationLevel`, `OptimizerOptions`, `OptimizationMetrics`).

## Maintenance

If a file here is split, renamed, or a new AST variant is added, update this list and confirm every phase still handles the new kind exhaustively (`switch` on `kind` / `type`).
