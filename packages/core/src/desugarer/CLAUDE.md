# Desugarer Module

Transforms Surface AST (parser output) into Core AST (typechecker input) by eliminating syntactic sugar: `if`/`then`/`else` → `match`, pipes, composition, list concatenations, curried lambdas, etc.

## Critical: Callback Injection

Helper files (`buildConsChain.ts`, `desugarPipe.ts`, `desugarComposition.ts`, `desugarListWithConcats.ts`, `curryLambda.ts`, `desugarVariantConstructor.ts`, `desugarRecordTypeField.ts`, `desugarListPattern.ts`, etc.) deliberately receive `desugar`, `desugarPattern`, or `desugarTypeExpr` as **function parameters** instead of importing them. This avoids import cycles.

`desugarer.ts` wires the callbacks via local closures (e.g., `buildConsChainLocal`, `desugarListWithConcatsLocal`) and passes them down. When you add a new helper that needs to recurse back into `desugar`, follow the same pattern — **do not add a direct import**, or you'll reintroduce cycles.

## FreshVarGen

`FreshVarGen` generates unique `$`-prefixed variable names used for compiler-internal bindings (e.g. `$tmp0`). One instance is created per `desugar()` invocation and **threaded through every recursive call**. Do not instantiate ad-hoc `FreshVarGen`s inside helpers — always accept the caller's instance as a parameter, or names will collide.

## Spec Alignment

Surface forms desugared here must match the semantics in `docs/spec/`. When adding or changing sugar (new operator, new literal form, block semantics) update the spec in the same change.

## Maintenance

If helper files are added, renamed, split, or removed, update the list above and the callback-injection pattern description so it still matches the actual code.
