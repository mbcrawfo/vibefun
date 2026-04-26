# Fast-check Rollout — Master Plan

This is the umbrella document for the multi-PR rollout that adds fast-check
property-based testing across the vibefun project. Per-PR plans live alongside
this file (`fast-check-pr2-lexer.md`, `fast-check-pr3-parser.md`, …); each
references this document for shared rules so the per-PR files stay short and
focused.

## Why

Most of vibefun's 229 vitest test files are fixed-input examples. Hidden bugs
in compiler infrastructure (typechecker soundness, optimizer semantic
preservation, codegen correctness, parser/desugarer round-trips, stdlib
algebraic laws) are exactly what property-based testing finds and fixed
examples miss. We add fast-check, walk every test file, and add property tests
where they add real value — without dropping coverage.

## Status

- **PR 1 (Infrastructure + stdlib):** complete. fast-check 4.7.0 wired in,
  deterministic seed, extended coverage gate to all four metrics, weekly
  fuzz workflow, stdlib arbitraries, 8 stdlib test files enhanced. Coverage
  net-positive across all four metrics.
- **PR 2 (Token + lexer):** see `fast-check-pr2-lexer.md`.
- **PR 3 (Surface AST + parser):** complete (this PR). Surface-AST
  arbitraries + minimal pretty-printer added under
  `packages/core/src/types/test-arbitraries/`; 20 of 37 property-test-marked
  parser test files now carry property tests covering round-trip,
  trailing-comma equivalence, operator precedence preservation,
  determinism, location coverage, pattern-name non-emptiness, and crash
  oracles. Coverage held at PR 1 floor (lines 91.84%, branches 84.69%,
  functions 91.81%, statements 90.89%); spec-validate stays at 378/378.
  The 17 remaining property-test-marked files are eligible for follow-up
  commits — the arbitraries and pretty-printer are reusable.
- **PR 4 (Desugarer + utils + module-resolver):** see
  `fast-check-pr4-desugarer-utils.md`.
- **PR 5 (Typechecker):** see `fast-check-pr5-typechecker.md`.
- **PR 6 (Optimizer + codegen + execution-tests):** see
  `fast-check-pr6-optimizer-codegen.md`.
- **PR 7 (CLI + e2e + cleanup):** see `fast-check-pr7-cli-e2e.md`.

Each subsequent PR builds on the previous because arbitraries layer on each
other. **Branch management is handled manually outside these plans** — the
plans assume the appropriate working branch is already checked out before
each PR's baseline step runs.

## Shared rules (apply to every PR)

### Per-file commit recipe

```bash
# Edit one test file, run the standard checks
pnpm run check && pnpm run lint && pnpm test && pnpm run test:coverage
# Verify all four metrics in coverage/coverage-summary.json are >= baseline
git add <test file> [+ arbitrary file if first commit in module]
git commit -m "Add property-based tests to <relative path>

<one-line summary of properties added>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Triage step (mandatory at the start of every PR)

Before any property code is written, spawn an Explore subagent that:
1. Reads every test file in the PR's scope.
2. Classifies each in
   `.claude/plans/triage/<pr-number>-<domain>.csv` with columns
   `path,disposition,justification` where
   `disposition ∈ {property-tests, fixed-only, snapshot-skip, defer-bug-backlog}`.
3. For `property-tests`, names the specific properties to add (round-trip /
   idempotence / algebraic law / structural invariant / crash oracle).

The CSV is the first commit of the PR. Implementation batches read it and
only touch files marked `property-tests`.

### Subagent constraints (every implementation batch)

- Read the triage CSV first; only touch files marked `property-tests`.
- Add property-based tests **alongside** existing fixed tests; never delete or
  modify existing fixed assertions.
- Do not modify production source files. Tier 1 source-fix commits go through a
  separate, explicitly-authorized commit.
- Do not modify `vitest.config.ts`, the CI workflow, or any `package.json`.
- Reuse arbitraries from the appropriate `test-arbitraries/` module; never
  redefine generators per-file.
- Cap `numRuns` at the global default (100); only override via an explicit
  comment justifying the override, and never above 1000.
- One commit per file. Each commit must run
  `pnpm run check && pnpm run lint && pnpm test && pnpm run test:coverage` and
  verify all four coverage metrics ≥ baseline before committing.
- On a property failure: classify per the bug triage tiers below, act, and
  continue. **Halt and escalate on Tier 3.**

### Bug triage tiers

- **Tier 1 — Trivial (fix in same commit):** off-by-one, missing guard, wrong
  identity element, fix < 20 LOC in one file. Add the shrunken counterexample
  as a fixed regression test alongside the property.
- **Tier 2 — Localized (separate commit, same PR):** correctness bug confined
  to one module, no public API change. Commit N: skip + backlog entry. Commit
  N+1: fix and re-enable; remove backlog entry.
- **Tier 3 — Soundness or design (skip + halt + human triage):** typechecker
  accepts ill-typed program; optimizer changes observable semantics; codegen
  produces incorrect JS. `it.skip` with `[BUG: VF-FC-####]` + backlog entry +
  **halt the PR** for human triage.

### Coverage protocol per PR

1. **Baseline:** at PR start, capture current
   `coverage/coverage-summary.json` (already done at the rollout start; for
   subsequent PRs, the floor is the previous PR's HEAD).
2. **Per-commit gate:** every commit must keep all four metrics ≥ baseline.
3. **PR close:** run `pnpm run verify` and `pnpm run spec:validate`. Confirm
   all four metrics ≥ baseline.

### Out of scope (every PR)

- `tests/spec-validation/` (custom runner, not vitest). Spec ambiguities
  surfaced by properties go to the backlog with a `spec-clarification` tag.
- Snapshot tests (`parser/snapshot-tests/`, `codegen/es2020/snapshot-tests/`).
  Regression oracles by design.
- Replacing existing fixed tests. Fast-check is additive.
- Tier D (fully type-correct Core AST) generators. Route through the actual
  typechecker on generated surface programs when typed-Core inputs are needed.

## Verification at end of each PR

1. `pnpm run verify` — full pipeline (build + check + lint + test + test:e2e +
   format:check).
2. `pnpm run test:coverage` — confirm all four metrics ≥ baseline.
3. `pnpm run spec:validate` — confirm no spec regressions.
4. Manual: open `.claude/FAST_CHECK_BUG_BACKLOG.md` and confirm every Tier 2/3
   entry has a shrunken counterexample, seed, and conjecture.
5. Manual: re-run `time pnpm run test` and confirm runtime increase from PR
   baseline is within budget (target: ≤ 10% per PR, ≤ 50% across the rollout).
6. After the final PR, manually trigger the weekly `property-fuzz.yml`
   workflow with `numRuns: 5000` to surface long-tail bugs.

## Coverage floor (post-PR-1, the floor for PR 2 onward)

| Metric | Floor |
| --- | --- |
| lines | 91.84% |
| branches | 84.69% |
| functions | 91.81% |
| statements | 90.89% |

These numbers update at the close of every PR; the new floor is whatever the
last merged PR landed at.
