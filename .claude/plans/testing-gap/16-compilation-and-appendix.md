# Chunk 16 — Compilation pass details and appendix syntax

## Context

Closes 12 (compilation) gaps around pattern guard evaluation/fallthrough and if-without-else UnitLit injection, plus 13 (appendix) operator-precedence and KEYWORDS-table gaps.

Closes: 12 F-11, F-13, F-38; 13 F-19, F-25, F-31, F-33, F-36.

## Spec under test

- `docs/spec/12-compilation/01-desugaring.md` — if-without-else UnitLit injection.
- `docs/spec/12-compilation/02-codegen.md` — guard evaluation/fallthrough semantics.
- `docs/spec/13-appendix.md` — KEYWORDS table (note: `try`, `catch`, `while` missing from the table is a docs gap, not a test gap; the U-test below enumerates **what's actually in the keywords set**, which is the source of truth).
- `docs/spec/04-expressions/03-operators.md` — composition `>>`/`<<` and pipe `|>` precedence; list/record indexing operator `[]`.

## Pre-flight orphan check

- `packages/core/src/desugarer/desugarer-integration.test.ts` — already covers guard/desugar at integration level; verify which specific gaps are uncovered.
- `packages/core/src/parser/snapshot-tests/` — likely contains snapshots; F-13 wants a focused snapshot.
- `packages/core/src/lexer/reserved-keywords.test.ts` — orphan; may already enumerate keywords.

## Coverage baseline

```bash
pnpm run test:coverage
```

## Implementation steps

### Compilation (12)

1. **`packages/core/src/codegen/es2020/execution-tests/`** (new file `pattern-guards-overlapping.test.ts` or extend existing) — Layer: U + I.
   - F-11 / F-38: nested patterns with overlapping shapes and multiple guards. Construct a match where:
     - first arm: `Cons(x, _)` guarded by `x > 10` — fails for x=5
     - second arm: `Cons(x, _)` guarded by `x > 0` — succeeds for x=5
     - third arm: `_` — should not be reached for x=5
   - Assert the second arm is selected. Then a value `x=15` selects the first arm.
   - F-38 fallthrough: when all guards fail on a matched constructor, the matcher must continue to the next pattern (not throw a non-exhaustive error if a later pattern would match).
2. **Snapshot the desugared form of if-without-else** — Layer: S.
   - F-13: spec citation `docs/spec/12-compilation/01-desugaring.md` places the UnitLit injection at the **desugarer stage**, not the parser. Add the snapshot under `packages/core/src/desugarer/snapshot-tests/` (create the directory if it doesn't exist) — or extend an existing desugarer snapshot file. Compile `if c then e` and snapshot the **post-desugar core AST**, which should show an explicit `UnitLit` in the else branch.
   - The test verifies *desugarer behaviour*, not parser behaviour. If the parser produces an `IfExpr` with `else: undefined` and the desugarer fills in `UnitLit`, that's the contract; the parser snapshot is uninteresting.
   - Implementer pre-flight: read `packages/core/src/desugarer/desugarer-integration.test.ts` to confirm where the desugarer is exercised; place the snapshot adjacent to other desugarer snapshots.

### Appendix (13)

3. **`packages/core/src/lexer/reserved-keywords.test.ts`** (extend if not already — orphan) — Layer: U.
   - F-25: assert the live `KEYWORDS` set (or whatever the lexer's keyword constant is named) equals a hardcoded list of every keyword the implementation actually accepts.
   - **Oracle hierarchy** (resolves the appendix-table conflict):
     1. **The runtime `KEYWORDS` set is authoritative** — it's what the lexer actually accepts and reject; the test pins to that list (which currently includes `try`, `catch`, `while`).
     2. The appendix table in `docs/spec/13-appendix.md` is a documentation mirror that **must be updated to match** runtime. The doc fix is a separate PR (route via the post-snapshot addendum in `feature-gaps.md`); this chunk does not touch the appendix.
     3. A separate "appendix-vs-runtime parity" tripwire test can be added *after* the doc fix lands — out of scope for this chunk.
   - Net effect for this chunk: hardcode the test's expected list to whatever the runtime set contains today. Do not assert against the appendix table.
4. **`tests/e2e/spec-validation/04-expressions.test.ts`** or `02-lexical-structure.test.ts` (extend) — Layer: V + U.
   - F-19 / F-36 pipe + composition precedence: `f >> g |> value` should parse as `(f >> g) |> value`. Add:
     - U-layer parser test asserting AST shape.
     - V-layer runtime assertion verifying the value of `inc >> double |> 3`.
   - F-31 composition operators: focused operator-semantics tests at U-layer in `packages/core/src/desugarer/desugarer-integration.test.ts` (extend).
   - F-33 list/record indexing operator `[]`: indexing on a list and a record — both U + V. Error cases: out-of-bounds list indexing, missing-key record indexing — assert the spec-defined behaviour (some langs return Option, some panic; verify spec).

## Behavior expectations (for bug-triage)

- F-13: if the snapshot does NOT show UnitLit in the else branch, the desugarer is leaving a partial AST — file a bug.
- F-19 precedence: if `f >> g |> value` parses as `f >> (g |> value)`, precedence is reversed — file a bug. Spec defines composition as tighter than pipe.
- F-25 KEYWORDS: if `try`/`catch`/`while` are missing from the runtime set, parser would silently accept them as identifiers — file a parser bug.
- F-33 indexing: spec-defined behaviour for out-of-bounds is the contract; if implementation differs, file accordingly.

## If a test reveals a bug

Tests-only PR. Find → file → hold.

## Verification

- `pnpm run verify`
- `pnpm run test:coverage` ≥ baseline
- For F-13 snapshot: confirm reviewers see the UnitLit in the snapshot diff before merging.

## Out of scope

- Source maps (12 F-19) — feature gap.
- Documentation fix for missing keywords in appendix table — separate doc PR.
- TCO (12 partial) — feature gap.
