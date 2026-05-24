# VF-FC-0002 — Optimizer must not drop side-effecting wildcard-let

**Tier:** 3 (soundness) · **Phase:** 1 (#4) · **Status:** Open · **HIGHEST RISK**

## Context

A side effect is silently elided by the compiler:

```vibefun
let mut counter = ref(0);
let tick = () => {
  let _x = 1;
  counter := !counter + 1;
  true;
};
tick();
// after tick(), !counter is 0 — should be 1
```

The block `{ let _x = 1; counter := …; true; }` desugars so the `:=` becomes the *value*
of a wildcard-let: `let _ = (counter := …) in true`, nested under the var-let
`let _x = 1 in …`. Compiled JS collapses the inner wildcard-let to just `true`, dropping
the assignment. This elides observable side effects — a soundness bug.

## Root cause — NOT YET PINPOINTED (resolve empirically as step 1)

Static analysis was inconclusive. Every named optimizer pass appears to guard correctly:
- `packages/core/src/optimizer/passes/dead-code-elim.ts:~76` — `if (pattern.kind !== "CoreVarPattern") return expr;` (skips wildcards).
- `inline.ts` — skips non-`CoreVarPattern` bindings.
- `beta-reduction.ts`, `constant-folding.ts`, `eta-reduction.ts`, `pattern-match-opt.ts`, `cse.ts` — none fold `wildcard-let → body`.

Yet the side effect disappears. **Key clue:** an *outer* wildcard-let (`:=` first) survives,
but a wildcard-let *nested under a var-let* is dropped — so the defect is position/nesting
dependent: an optimizer-driver/pass interaction, **or** codegen's `CoreLet` +
`CoreWildcardPattern` emission (not ruled out by the agents).

Desugar shape confirmed at `packages/core/src/desugarer/desugarBlock.ts:~73-80`:
non-final block expressions become `CoreLet{ pattern: CoreWildcardPattern, value: <expr>, body: rest }`.

## TDD plan

### Step 1 (red, diagnostic-first) — LOCALIZE before fixing
This is part of the fix, not a guess. Determine where the drop happens:
1. Compile the repro to JS with the optimizer **disabled** vs **enabled** (and emit core
   AST before/after optimization). If the assignment survives with the optimizer off but
   not on → it's the optimizer. If it's gone even with the optimizer off → it's codegen.
2. If optimizer: bisect by disabling passes one at a time in the driver
   `packages/core/src/optimizer/optimizer.ts` (and check the fixed-point loop), dumping the
   intermediate core AST, until the exact collapsing pass/interaction is identified.
3. If codegen: inspect the `CoreLet` emitter's handling of `CoreWildcardPattern` — confirm
   whether it emits `value` (with its side effect) before the body, or only the body.

Record the located site (file:line) here before writing the fix.

### Step 2 (red) — deterministic regression test at the located site
- **Optimizer-pass unit test** (if the drop is in a pass), in that pass's `*.test.ts`:
  a `CoreLet{ pattern: CoreWildcardPattern, value: CoreBinOp(RefAssign, …), body: CoreBoolLit(true) }`
  must NOT be transformed to its `body`.
- **and/or codegen unit test** (if the drop is in codegen): emitting the same node must
  produce JS that performs the assignment before yielding `true`.

### Step 3 (red) — execution/e2e regression
Add to `tests/e2e/spec-validation/04-expressions.test.ts` the `tick()` repro asserting the
side effect survives end-to-end (e.g. `expectRunOutput(withOutput(<repro>, "String.fromInt(!counter)"), "1")`).

### Green — the fix
- Add a reusable purity predicate `hasSideEffects(expr: CoreExpr): boolean` in
  `packages/core/src/utils/ast-analysis.ts` (next to `containsUnsafe`/`containsRef`),
  detecting `CoreBinOp` `RefAssign` (and `unsafe`/external calls). Reuse the existing
  visitor used by `containsUnsafe`.
- Guard wildcard-let elimination wherever the diagnostic located it:
  - optimizer: refuse to drop a `let _ = value in body` when `hasSideEffects(value)`;
  - and/or codegen: always emit the `value` of a wildcard-let as a statement before `body`.

## Test layers (CLAUDE.md directive 5)
- **Unit:** `hasSideEffects` (ast-analysis test) + the located-site test.
- **Integration:** optimizer fixed-point test (full pass pipeline preserves the assignment).
- **Execution-tests:** `packages/core/src/codegen/es2020/execution-tests/` — run the
  compiled repro, assert the counter increments.
- **Spec-validation:** the `tick()` e2e above. Re-audit the F-52 reorder workaround comment
  at `04-expressions.test.ts:177-204` — once fixed, the workaround note can be removed and
  the natural (assignment-not-last) ordering tested directly.

## Cross-cutting concerns
**Must land before VF-FC-0005 (reassignment) and VF-FC-0012 (indexing)** — those introduce
new side-effecting/observable constructs that the optimizer must preserve. `hasSideEffects`
becomes shared infrastructure those bugs can rely on.

## Verification
```bash
pnpm --filter @vibefun/core test
pnpm run test:e2e
pnpm run verify
```

## Backlog cleanup
Tier 3: keep the entry until fixed; on fix, add the regression tests, re-enable any
`[BUG: VF-FC-0002]` skip, and remove the row from `.claude/FAST_CHECK_BUG_BACKLOG.md`.
Record the finally-identified root-cause site in the commit message.
