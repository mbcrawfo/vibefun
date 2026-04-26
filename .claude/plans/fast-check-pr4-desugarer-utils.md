# PR 4 — Desugarer + Utils + Module-Resolver Property Tests

Refer to `fast-check-master.md` for the shared rules.

## Context

This PR covers the three modules that operate on AST/Core AST as data
structures: the desugarer (lowers surface AST to Core AST), the utils
(equality, substitution, AST analysis, AST transforms), and the
module-resolver (cycle detection, dependency graphs). All three are
algorithmically rich and have strong algebraic properties: idempotence,
determinism, reflexivity, symmetry, transitivity, and graph-theoretic
invariants.

The leverage here is high: a single reflexivity property
(`exprEquals(e, e) === true`) fires across every CoreExpr shape that gets
generated. A cycle-detection property (`every node belongs to exactly one
SCC`) fires across every randomly generated module graph.

## Scope

- **Desugarer (~34 files)** in `packages/core/src/desugarer/`:
    - Top-level: `desugarer-{integration,primitives,structural}.test.ts`,
      `integration.test.ts`, `pass-through.test.ts`.
    - Specific lowerings: `desugarBlock.test.ts`, `desugarBinOp.test.ts`,
      `desugarComposition.test.ts`, `desugarListLiteral.test.ts`,
      `desugarListPattern.test.ts`, `desugarListWithConcats.test.ts`,
      `desugarPipe.test.ts`, `desugarRecordTypeField.test.ts`,
      `desugarTypeDefinition.test.ts`, `desugarTypeExpr.test.ts`,
      `desugarVariantConstructor.test.ts`, `lowerLetBinding.test.ts`,
      `buildConsChain.test.ts`, `curryLambda.test.ts`.
    - Forms: `blocks.test.ts`, `composition.test.ts`, `conditionals.test.ts`,
      `lambdas.test.ts`, `lists.test.ts`, `list-spread.test.ts`,
      `patterns.test.ts`, `pipes.test.ts`, `records.test.ts`,
      `type-annotated-patterns.test.ts`, `while-loops.test.ts`.
    - Or-patterns: `or-patterns-{basic,patterns,validation}.test.ts`.
    - Misc: `FreshVarGen.test.ts`.

- **Utils (~9 files)** in `packages/core/src/utils/`:
    - `expr-equality-equals.test.ts`, `expr-equality-equivalent.test.ts`,
      `substitution-core.test.ts`, `substitution-expressions.test.ts`,
      `ast-analysis.test.ts`, `ast-transform-{fold-expr,transform-children,transform-expr,visit-expr}.test.ts`.

- **Module-resolver (~5 files)** in `packages/core/src/module-resolver/`:
    - `cycle-detector.test.ts`, `module-graph.test.ts`,
      `module-graph-builder.test.ts`, `resolver.test.ts`,
      `warning-generator.test.ts`.

- **Module-loader (~4 files)** in `packages/core/src/module-loader/`:
    - `module-loader.test.ts`, `package-resolver.test.ts`,
      `path-mapping.test.ts`, `path-resolver.test.ts`.
    - Most of these are I/O-bound; mostly `fixed-only` in triage.

## Baseline

PR 4's floor is whatever PR 3 closed at. With the appropriate working branch
already checked out:

```bash
pnpm run test:coverage
cp coverage/coverage-summary.json .claude/plans/triage/pr4-baseline-coverage.json
```

## Triage step (commit 1)

Spawn an Explore subagent:

> Read every `*.test.ts` under `packages/core/src/{desugarer,utils,module-resolver,module-loader}/`.
> Classify as `property-tests`, `fixed-only`, or `defer-bug-backlog`.
> For `property-tests`, name properties (idempotence, determinism,
> reflexivity, symmetry, transitivity, structural invariant). Output
> `.claude/plans/triage/pr4-desugarer-utils.csv`.

## Critical files

New: `packages/core/src/types/test-arbitraries/core-ast-arb.ts`
- **Tier A** — recursive `coreExprArb` with no scope/binding correctness.
  Free vars may reference undefined names. Use for "function does not throw"
  oracles.
- **Tier B** — well-formed structurally. Honors the
  `codegen/es2020/CLAUDE.md` invariant: `let rec` lives only in
  `CoreLetRecGroup` / `CoreLetRecExpr`, never in `CoreLet`. Locations
  attached to every node.

No Tier C/D in this PR — those land in PR 5 if needed.

Generators:
- `corePatternArb({ depth })`
- `coreTypeExprArb({ depth })`
- `coreExprArb({ depth, tier: "A" | "B" })`
- `coreDeclArb({ depth, tier })`
- `coreModuleArb({ depth, tier })`
- `substitutionArb` — `Map<string, Type>` for substitution properties.
- `moduleGraphArb({ size, density })` — random DAGs and random cyclic graphs
  for cycle-detector properties. Generate node counts up to 20 with a density
  parameter (probability of edge). Generate **labeled** edges so cycle output
  is comparable.

Re-export from the test-arbitraries barrel.

## Property targets

### Desugarer

- **Determinism:** `desugar(e) === desugar(e)` — bit-equal across runs.
- **Type/Pattern preservation through desugar where applicable:** for example,
  `desugar(let pat = e in body)` should preserve `pat` if it's already in
  Core form.
- **Fresh-var freshness:** generated fresh vars never collide with user-bound
  names or with each other.
- **`buildConsChain` produces a right-associated chain:** for any list of
  generated elements, the result is `Cons(e1, Cons(e2, ... Nil))`.
- **No CoreUnsafe leakage:** if the input does not contain `unsafe { … }`,
  the desugared output does not synthesize one.
- **Or-pattern flattening:** desugaring nested `(p1 | p2) | p3` produces the
  same pattern as `p1 | p2 | p3`.

### Utils

- **`exprEquals` reflexivity:** `exprEquals(e, e) === true` for any CoreExpr.
- **`exprEquals` symmetry:** `exprEquals(a, b) === exprEquals(b, a)`.
- **`exprEquals` transitivity:** `exprEquals(a, b) && exprEquals(b, c) ⇒ exprEquals(a, c)`.
- **α-equivalence respected:** `exprEquivalent(a, b) === true` for two ASTs
  that differ only in bound-variable names. (Use `exprEquivalent` here, not
  `exprEquals`; the latter is structural and treats bound names as
  significant.)
- **Substitution identity:** `subst({})(e) === e` (empty substitution is
  identity).
- **Substitution composition associativity:** `subst(σ ∘ τ) === subst(σ) ∘ subst(τ)`.
- **Free vars vs. bound vars:** for any expr, `freeVars(e) ∪ boundVars(e) =
  allVarRefs(e)` and the two sets are disjoint.
- **`fold-expr` is total:** doesn't throw on any tier-A CoreExpr.
- **`transform-expr` with identity transform is identity:**
  `transformExpr(id)(e) === e`.

### Module-resolver

- **Cycle detector total:** does not throw on any generated graph.
- **Cycle detection on a generated DAG returns no cycles.**
- **Cycle detection on a generated single cycle returns exactly that cycle**
  (modulo rotation).
- **Cycle detection determinism:** output sorted alphabetically and stable
  across runs.
- **`module-graph` invariants:** every edge endpoint exists as a node;
  bidirectional consistency between `getDependencies` and `getDependents`.

### Module-loader (most likely `fixed-only`)

I/O-bound. The handful of pure-function helpers (path normalization, package
manifest parsing) might benefit from properties (`normalize` idempotent,
`resolve(path) === resolve(resolve(path))`), but most files don't.

## Out-of-scope-this-PR triage candidates

- Tests that exercise specific desugaring shapes for one historical bug:
  `fixed-only`.
- Tests that depend on real filesystem fixtures: `fixed-only`.

## Verification

Per `fast-check-master.md`. Coverage drift watch: the desugarer is large and
property-test coverage may overlap heavily with existing fixed-test coverage,
producing little net change. That's fine — the value is in catching bugs the
fixed tests miss, not in raw coverage gains.

### Cross-layer validation gates (required before merge)

```bash
pnpm run verify        # build + check + lint + test + test:e2e + format:check
pnpm run spec:validate # spec-suite must remain at 378/378 (or current count)
```

If desugarer changes alter the surface→Core mapping for any user-observable
form, update `.claude/VIBEFUN_AI_CODING_GUIDE.md` and re-check
`tests/e2e/let-binding-matrix.test.ts` per the project's sync rules in
CLAUDE.md.

## Post-implementation coverage check

```bash
pnpm run test:coverage
# compare coverage/coverage-summary.json against
# .claude/plans/triage/pr4-baseline-coverage.json and confirm
# lines, statements, functions, and branches are all >= baseline
```

## Risks specific to this PR

- **Tier A core-ast generation may produce ASTs that violate parser
  invariants** (e.g. references to undefined variables). That's OK for
  desugarer/util properties because the desugarer doesn't typecheck. For
  module-resolver, only generate well-formed graphs (Tier B).
- **The `exprEquals`/`equivalent` distinction matters.** Use the
  α-equivalence-aware function when generators produce different bound-var
  names; otherwise transitivity will fail spuriously.
- **`fc.letrec` recursion in core-ast-arb is the most complex generator yet.**
  Validate with explicit shape distribution checks (use `fc.statistics` during
  generator development) before relying on it in test files.
