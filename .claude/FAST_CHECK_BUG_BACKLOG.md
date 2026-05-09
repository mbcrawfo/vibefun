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
| VF-FC-0002 | `packages/core/src/optimizer/` (suspected; codegen-observable) | n/a — discovered while authoring fixed-input spec-validation tests for evaluation order (chunk 09, F-52); not surfaced by a property | 3 | <pre>let mut counter = ref(0);<br>let tick = () => {<br>  let _x = 1;<br>  counter := !counter + 1;<br>  true;<br>};<br>tick();<br>// !counter is 0, expected 1</pre> | n/a | Compiled JS (via `compile - --emit js`) is `const tick = (_unused0) => (() => { const _x = 1; return true; })();` — the inner `let _ = (counter := …) in true` (wildcard-let from block desugaring) is collapsed to just `true`, dropping the side-effecting `:=`. Reordering to put the `:=` *before* the let-binding makes the assignment survive (this is why the existing AND/OR short-circuit tests at `tests/e2e/spec-validation/04-expressions.test.ts:177–204` work). None of the four optimizer passes I scanned (`dead-code-elim`, `inline`, `beta-reduction`, `eta-reduction`) obviously folds wildcard-let → body — `eliminateDeadLet` explicitly gates on `pattern.kind === "CoreVarPattern"` so wildcards are skipped. Suspected: a fixed-point interaction across multiple passes, or a pass not yet inspected (`constant-folding`, `cse`, `pattern-match-opt`). Worth dumping per-pass output via the optimizer's iteration loop to identify the collapsing pass. **Halt the PR for human triage** — this elides observable side effects and likely affects more than the F-52 test. F-52 was worked around by reordering tick's body (assignment before the let); a comment in `04-expressions.test.ts` notes this. | Open |

## Triage tiers (reference)

- **Tier 1 — Trivial:** off-by-one / missing guard / wrong identity. Fix < 20 LOC, one file. Fix in same commit as the property; add the shrunken counterexample as a fixed regression test alongside.
- **Tier 2 — Localized:** correctness bug confined to one module, no public API change. Skip + backlog in commit N; fix and re-enable in commit N+1, same PR. Remove the backlog entry on fix.
- **Tier 3 — Soundness/design:** typechecker accepts ill-typed program; optimizer changes observable semantics; codegen emits incorrect JS. Skip + backlog + **halt the PR** for human triage.
