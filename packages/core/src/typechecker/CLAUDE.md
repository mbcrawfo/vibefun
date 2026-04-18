# Typechecker Module

Hindley-Milner (Algorithm W) type inference with level-based generalization for let-polymorphism. Consumes Core AST, produces a typed module.

## Critical: `infer/` Subfolder Dependency Injection

The inference engine is split across `infer/infer-primitives.ts` (the dispatcher holding `inferExpr`) and several specialized modules (`infer-bindings`, `infer-functions`, `infer-operators`, `infer-structures`). They form a cycle — the specialized modules recurse back into `inferExpr`, but `infer-primitives` must be able to dispatch to them.

`infer/index.ts` resolves this at import time by calling:

- `setInferExpr(inferExpr)` on **every** specialized module (bindings, functions, operators, structures).
- `setInferenceFunctions({ inferLambda, inferApp, inferBinOp, inferUnaryOp, inferLet, inferLetRecExpr, inferRecord, inferRecordAccess, inferRecordUpdate, inferVariant, inferMatch })` on `infer-primitives`.

**Adding a new inferer** means: write the handler in the right specialized file, export a `setInferExpr` if the file is new, then wire it in `infer/index.ts`. Missing wiring fails loudly at first call ("not initialized"), never silently.

## InferenceContext vs TypeEnv

- `TypeEnv` lives in `types/environment.ts` and is **per-module**, persistent. Never mutate it in place — `typechecker.ts` returns a new env after each declaration.
- `InferenceContext` (`infer/infer-context.ts`) is **per-expression**: `{ env, subst, level }`. Pass it by value through recursion. `InferResult` carries only `{ type, subst }`.

## Substitution Threading

Always `applySubst(ctx.subst, ty)` before unifying a type you just pulled from the context. Combine substitutions with `composeSubst` — never merge maps directly, or shadowed mappings produce unsound unifications.

## Level-Based Generalization

`Type` carries a `level`; `generalize` quantifies only variables whose level exceeds the current binding's level. This enforces the value restriction and the soundness of polymorphic let bindings. Do not modify `generalize` or the level-bumping in `infer-bindings` without tests that exercise polymorphic lets, mutable refs, and escaping type variables.

## `constraints.ts`

Currently only referenced by its own test file — unused by the inference pipeline. Treat it as work-in-progress or dead code; confirm the intent before extending it.

## Maintenance

If files in `infer/` are added, renamed, or removed, update the DI setup list in this file so the wiring description still matches `infer/index.ts`. Likewise update the `constraints.ts` note if it becomes active.
