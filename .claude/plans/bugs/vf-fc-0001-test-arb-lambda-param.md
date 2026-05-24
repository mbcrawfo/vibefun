# VF-FC-0001 — Restrict `lambdaArb` parameter to var/wildcard patterns

**Tier:** 2 (localized) · **Phase:** 0 (#1) · **Status:** Open

## Context

`optimizableExprArb`'s property "typechecks without unregistered throws" fails: the
generator produces `CoreLambda` nodes whose `param` is an arbitrary `CorePattern`
(e.g. `CoreVariantPattern`), but post-desugaring the compiler holds the invariant that a
lambda parameter is only a `CoreVarPattern` or `CoreWildcardPattern`. The arbitraries
build Core AST directly, bypassing the desugarer, so they can violate the invariant and
the typechecker throws a raw `Error` instead of a `VibefunDiagnostic`.

Shrunken counterexample (seed `1447445058`):
`CoreLambda { param: CoreVariantPattern { constructor: "A", args: [] }, body: CoreLet {...} }`.

## Root cause

`packages/core/src/types/test-arbitraries/core-ast-arb.ts` — `lambdaArb` (~line 370)
uses the full `corePatternArb` for the lambda parameter. It must be restricted to the
shapes the typechecker accepts for lambda params.

## TDD plan

### Red — failing test first
Re-enable the skipped property in
`packages/core/src/types/test-arbitraries/optimizable-expr-arb.test.ts` (remove the
`it.skip` / `[BUG: VF-FC-0001]` marker). Reproduce deterministically with
`FC_SEED=1447445058 pnpm --filter @vibefun/core test optimizable-expr-arb`. Confirm it
throws the unregistered error.

### Green — the fix
In `lambdaArb`, replace the parameter arbitrary with
`fc.oneof(coreVarPatternArb, coreWildcardPatternArb)` (reuse the existing pattern
arbitraries in `core-ast-arb.ts`; if a wildcard arb doesn't exist, add a trivial
`fc.constant({ kind: "CoreWildcardPattern", loc })`). Re-run the property to confirm green.

## Test layers (CLAUDE.md directive 5)
- **Unit/property:** the re-enabled property is the coverage. No other layer applies — this
  is test infrastructure, not language behavior.
- No spec / e2e / AI-guide impact.

## Cross-cutting concerns
None. Fully isolated to the test-arbitraries directory (excluded from `dist/` and coverage).

## Verification
```bash
pnpm --filter @vibefun/core test optimizable-expr-arb
FC_SEED=random FC_NUM_RUNS=1000 pnpm --filter @vibefun/core test optimizable-expr-arb
pnpm run check && pnpm run lint && pnpm run format
```

## Backlog cleanup
Per Tier 2: fix in the same commit as re-enabling the property; remove the VF-FC-0001 row
from `.claude/FAST_CHECK_BUG_BACKLOG.md`.
