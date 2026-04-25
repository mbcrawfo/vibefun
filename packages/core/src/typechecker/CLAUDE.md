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

## Let-Binding Paths

Three code paths handle `let` / `let rec` bindings post-Phase-C of PR #74:

1. **Top-level non-recursive** — `CoreLetDecl` branch in `typechecker.ts`.
2. **Top-level recursive (any binding count)** — `CoreLetRecGroup` branch in
   `typechecker.ts`. The desugarer lowers single-binding `let rec x = …;` into
   a one-element `CoreLetRecGroup`, so all top-level recursive forms route here.
3. **Expression-level recursive (any binding count)** — `inferLetRecExpr` in
   `infer/infer-bindings.ts`. Single-binding `let rec x = … in body` is
   lowered to a one-element `CoreLetRecExpr` for the same reason.

Plus the canonical `inferLet` for non-recursive expression-level bindings.
The desugarer collapse means **the recursive-vs-non-recursive split lives at
exactly two layers (top-level / expression), not three.**

### Soundness invariants (centralised in `infer/let-binding-helpers.ts`)

All three paths plus `inferLet` must enforce the same three invariants —
PR #73 took nine review rounds because they were inlined and drifted.
They now live in `let-binding-helpers.ts`; **call the helper, don't inline**.

- `enforceMutableRefBinding` — when `binding.mutable`, unify the RHS against
  `Ref<fresh>` and throw **VF4018** at `binding.value.loc` on failure.
- `computeBindingScheme` — skip `generalize` when `binding.mutable` OR
  `pattern.kind !== "CoreVarPattern"`. Without the mutable skip, ref
  aliasing (`let mut b = a`) reopens the polymorphic-ref hole because
  `isSyntacticValue(CoreVar)` returns `true`.
- `propagateSubstAcrossDeclarations` (top-level only) — fold the binding's
  final substitution through every prior `declarationTypes` entry *and*
  `env.values`. Both halves together; missing one causes
  `--emit typed-ast` drift or stale schemes in subsequent decls.

### Cross-path equivalence matrix

`tests/spec-validation/sections/07b-let-binding-matrix.ts` runs every soundness
scenario through every surface let-form. Adding a new form or scenario means
adding one line to that file — divergence between paths surfaces as a single
flat-list cell. Adding a new top-level let path (or breaking the helpers)
fails matrix tests immediately.

## `constraints.ts`

Currently only referenced by its own test file — unused by the inference pipeline. Treat it as work-in-progress or dead code; confirm the intent before extending it.

## Maintenance

If files in `infer/` are added, renamed, or removed, update the DI setup list in this file so the wiring description still matches `infer/index.ts`. Likewise update the `constraints.ts` note if it becomes active.
