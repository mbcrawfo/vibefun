# Fast-check Bug Backlog

Tracks bugs surfaced by property-based tests during the fast-check rollout. See
`.claude/CODING_STANDARDS.md` "Property-based testing" section for the triage
flow (Tier 1 fix-now / Tier 2 fix-this-PR / Tier 3 halt-and-escalate).

When a property fails:
1. Reproduce locally with the printed seed.
2. Classify per the tiers below.
3. For Tier 2/3, add an entry here AND `it.skip("[BUG: VF-FC-####] ...")` in
   the test file with a comment linking back to this entry.
4. Closed entries move to commit history; only **open** bugs live here.

## Open

| ID | File | Property | Tier | Counterexample (shrunken) | Seed | Conjecture | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| VF-FC-0001 | `packages/core/src/types/test-arbitraries/optimizable-expr-arb.test.ts` | `optimizableExprArb` typechecks without unregistered throws | 2 | `CoreLambda { param: CoreVariantPattern { constructor: "A", args: [] }, body: CoreLet { pattern: CoreVariantPattern, value: CoreUnitLit, body: CoreRecord { fields: [] } } }` | 1447445058 | `lambdaArb` in `core-ast-arb.ts` uses the full `CorePattern` arb for the lambda parameter, but the typechecker requires `CoreVarPattern` or `CoreWildcardPattern` (post-desugaring invariant). Fix: restrict the param arb in `lambdaArb`, then re-enable the property. | Open |

## Triage tiers (reference)

- **Tier 1 — Trivial:** off-by-one / missing guard / wrong identity. Fix < 20 LOC, one file. Fix in same commit as the property; add the shrunken counterexample as a fixed regression test alongside.
- **Tier 2 — Localized:** correctness bug confined to one module, no public API change. Skip + backlog in commit N; fix and re-enable in commit N+1, same PR. Remove the backlog entry on fix.
- **Tier 3 — Soundness/design:** typechecker accepts ill-typed program; optimizer changes observable semantics; codegen emits incorrect JS. Skip + backlog + **halt the PR** for human triage.
