# PR 5 — Typechecker Property Tests

Refer to `fast-check-master.md` for the shared rules.

## Context

The typechecker is the highest-risk soundness surface in the compiler. A
soundness bug here (e.g. accepting a program that generates ill-typed JS)
silently propagates: codegen emits broken code, runtime throws a confusing
TypeError, and the user is left to debug a compiler bug masquerading as a
program bug. Property-based testing is uniquely good at catching soundness
violations because it generates programs the human author of the typechecker
never imagined.

**This PR has the strictest halt-on-failure rule** (see "Bug handling" below).

## Scope

~28 test files under `packages/core/src/typechecker/`:

- Top-level: `typechecker.test.ts`, `unify.test.ts`, `constraints.test.ts`,
  `types.test.ts`, `patterns.test.ts`, `format.test.ts`, `resolver.test.ts`,
  `environment.test.ts`, `declarations.test.ts`.
- `infer/`: `index.test.ts`, `infer-{bindings,context,functions,operators,primitives,structures,let-binding-helpers}.test.ts`.
- `module-signatures/`: `index.test.ts`, `stdlib-sync.test.ts`,
  `signature-builders.test.ts`.

Plus 1 file in `packages/core/src/types/`:
- `environment.test.ts` (Type, TypeScheme, TypeEnv data-structure tests).

## Baseline

PR 5's floor is whatever PR 4 closed at. With the appropriate working branch
already checked out:

```bash
pnpm run test:coverage
cp coverage/coverage-summary.json .claude/plans/triage/pr5-baseline-coverage.json
```

## Triage step (commit 1)

Spawn an Explore subagent:

> Read every `*.test.ts` under `packages/core/src/typechecker/` and
> `packages/core/src/types/environment.test.ts`. Classify as `property-tests`,
> `fixed-only`, or `defer-bug-backlog`. For `property-tests`, name the
> properties. Output `.claude/plans/triage/pr5-typechecker.csv`.
>
> Bias **strongly** toward `property-tests` for unification, substitution,
> generalization, and instantiation — these are textbook algebraic
> properties. Keep error-message tests as `fixed-only`.

## Critical files

New: `packages/core/src/types/test-arbitraries/type-arb.ts`
- `typeArb({ depth })` — recursive: variables, primitives, function arrows,
  applications, tuples, records.
- `typeSchemeArb({ depth, maxBoundVars })` — `forall α₁..αₙ. T`.
- `typeEnvArb({ size })` — `Map<string, TypeScheme>` with realistic shapes
  (some monomorphic, some polymorphic).
- `substitutionArb` — already exists from PR 4; reuse.
- `constraintArb` — equality and instance constraints over generated types.

Re-export from the test-arbitraries barrel.

For "well-typed surface program → run typechecker → use as Tier-D Core input,"
build a small helper:
- `wellTypedSurfaceProgramArb` — generates surface AST that is *likely* to
  typecheck (no undefined references; consistent number/string usage). Pipe
  through the actual typechecker; properties live downstream of that.

This is intentionally pragmatic: don't try to *guarantee* well-typedness in
the generator. Generate plausibly-well-typed programs, run the typechecker,
and use successful runs as fuel for downstream properties.

## Property targets

### Unification (`unify.ts`)

- **Reflexivity:** `unify(t, t)` succeeds with the empty substitution (or a
  substitution that is the identity on `t`).
- **Symmetry:** if `unify(a, b) === σ`, then `unify(b, a) === σ` (modulo
  variable renaming).
- **Soundness:** if `unify(a, b) === σ`, then `apply(σ, a) === apply(σ, b)`.
- **Most-general:** if `unify(a, b) === σ`, and if `apply(τ, a) === apply(τ, b)`
  for some other substitution `τ`, then `τ` factors through `σ` (this is
  harder to test directly; settle for soundness).
- **Failure on incompatible primitives:** `unify(Int, String)` always fails.

### Substitution (already partially in PR 4)

- **Identity composition:** `compose(σ, identity) === σ`.
- **Associativity:** `compose(compose(σ, τ), ρ) === compose(σ, compose(τ, ρ))`.
- **Apply-compose distributivity:** `apply(compose(σ, τ), t) === apply(σ, apply(τ, t))`.

### Generalization / instantiation

- **Round-trip:** `instantiate(generalize(env, t))` is α-equivalent to `t`.
- **Generalization captures only free type variables not in env:** for any
  type `t` and env, `generalize(env, t)` quantifies over `freeVars(t) - freeVars(env)`.
- **Instantiation produces fresh variables:** two calls to `instantiate(scheme)`
  produce schemes whose bound vars don't collide.

### Constraint solver

- **Determinism:** `solve(constraints) === solve(constraints)` for the same
  input.
- **Empty constraint set yields empty substitution.**
- **Consistency:** for any solvable constraint set, the resulting
  substitution satisfies every constraint when applied.

### Inference (highest-risk)

- **Soundness on generated well-typed surface programs:** for any program
  that the typechecker accepts, the inferred types are consistent with the
  declared types and with operator type signatures. (This requires generating
  programs and may be hard; settle for narrower properties as needed.)
- **Re-running infer on the same program produces the same type:** infer is
  a function.
- **Inferring a literal returns the literal's primitive type.**

### Module signatures

- **`stdlib-sync` round-trip:** loading the stdlib signature, serializing it,
  reloading produces the same signature.

## Out-of-scope-this-PR triage candidates

- Error-message tests for specific `VFxxxx` codes: `fixed-only`.
- Module-signature tests that depend on the actual stdlib filesystem layout:
  `fixed-only`.
- The `format.ts` pretty-printer for types: a thin file; properties may
  not add much.

## Bug handling — STRICT

This PR's halt-on-failure rule is non-negotiable:

- **Any unification soundness failure** (i.e. `unify(a, b) === σ` but
  `apply(σ, a) !== apply(σ, b)`): **Tier 3**, halt the PR, escalate.
- **Any inference soundness failure** (program typechecks but inferred type
  contradicts the codegen output): **Tier 3**, halt the PR, escalate.
- **Substitution non-idempotence under composition:** Tier 2 (very localised
  fix in `substitution.ts`); skip + fix + re-enable in same PR.
- **Determinism failure:** Tier 2.
- **Anything in module-signature serialization round-trip:** Tier 2.

## Verification

Per `fast-check-master.md`. Specifically: any Tier 3 finding **stops** the PR.
Do not pile additional skipped properties on top of a pending soundness bug.

### Cross-layer validation gates (required before merge)

```bash
pnpm run verify        # build + check + lint + test + test:e2e + format:check
pnpm run spec:validate # spec-suite must remain at 378/378 (or current count)
```

If typechecker changes affect inferred types or type-system behaviour for
user code, update `.claude/VIBEFUN_AI_CODING_GUIDE.md` and add coverage to
`tests/e2e/let-binding-matrix.test.ts` per the project's sync rules in
CLAUDE.md.

## Post-implementation coverage check

```bash
pnpm run test:coverage
# compare coverage/coverage-summary.json against
# .claude/plans/triage/pr5-baseline-coverage.json and confirm
# lines, statements, functions, and branches are all >= baseline
```

## Risks specific to this PR

- **Type-arbitrary depth and breadth must be tuned carefully.** Too shallow
  and unification soundness is trivially satisfied; too deep and generation
  blows the runtime budget.
- **Generalization properties depend on the choice of α-equivalence.**
  Use the `equivalent` helper from utils, not raw `===`.
- **Inference soundness is genuinely hard to test.** Don't try to express it
  as a single property; decompose into "the inferred type unifies with the
  constraint-system solution," "operator types match the declared types from
  module-signatures," etc.
- **The `wellTypedSurfaceProgramArb` is a research project disguised as a
  helper.** Start small: generate `let x = <int|string|bool literal>` and
  build up. If it grows beyond ~200 LOC, drop it and stick to narrower
  properties on Type/TypeScheme directly.
