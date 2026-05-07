# Chunk 02 — Diagnostics meta-tests and conventions

## Context

The diagnostics module has 127 registered VFxxxx codes across 14 lexer / 38 parser / 2 desugarer / 62 typechecker / 8 modules / 3 warnings (per audit). It's structurally tested (registry, factory shape, warning-collector) but lacks **meta-tests that assert spec-mandated conventions**: deterministic error ordering, the warning code 900-999 reservation, the `'a, 'b, 'c` type-variable naming sequence, and the docs/errors round-trip.

Closes 03c F-03, F-10, F-11, F-12, F-19, F-20.

## Spec under test

- `docs/spec/03-type-system/04-error-reporting.md` — error ordering ("errors are reported in source order"), type display convention (`Int`, `String`, `Bool`, `Float`, `Unit`), and type variable naming convention (`'a`, `'b`, `'c` in order encountered).
- `packages/core/src/diagnostics/codes/README.md` — error code ranges; the warning range is **VF4900–VF4999** (the audit's "900-999 range" phrasing means the last three digits within the 4xxx typechecker prefix). All F-10 assertions in this chunk use the explicit `VF4900–VF4999` range; do not rephrase.
- `docs/errors/` (auto-generated) — must stay in sync with `packages/core/src/diagnostics/codes/`.

## Pre-flight orphan check

- F-03 deterministic ordering — search for any test of error ordering. Audit says none; verify by grep `error.*order` in `packages/core/src/typechecker/`.
- F-10 warning range — search registry tests. `registry.test.ts` may already enumerate codes; check whether it asserts severity-by-range.
- F-11 type display, F-12 type variable naming — search `format.test.ts` (orphan typechecker file). It already covers some formatting; the meta-tests here should be **additive** assertions that the *convention* holds across all primitives, not duplicates.
- F-19 registry size = 127 — `registry.test.ts` may already count something. Verify.
- F-20 docs/errors sync — there may already be a CI step. Check `package.json` scripts and `.github/workflows/` for any `pnpm docs:errors` invocation.

If any of these is already covered, close by citation in the PR description.

## Coverage baseline

```bash
pnpm run test:coverage
# Record in PR
```

## Implementation steps

1. **`packages/core/src/diagnostics/registry.test.ts`** (extend) — Layer: U.
   - F-19: assert `registry.size === <N>` where N is the current registered-code count. Use the actual count (read it once, hardcode it; the test acts as a tripwire — adding/removing a code requires updating the assertion).
   - F-10: iterate every diagnostic in the registry; assert any with `severity: "warning"` has `code` matching `/^VF49\d{2}$/` (i.e., in the **VF4900–VF4999** warning range).
2. **`packages/core/src/typechecker/error-ordering.test.ts`** (new) — Layer: U + I.
   - F-03: typecheck a fixture with multiple independent errors arranged at known source locations. Run typechecker twice; assert error order is stable run-to-run. (If typechecker currently throws on first error, this test reduces to "first-encountered location is the first reported" — note the limitation in a comment, since multi-error reporting is a feature gap routed elsewhere.)
3. **`packages/core/src/typechecker/format.test.ts`** (extend, do not duplicate) — Layer: U.
   - F-11: snapshot or string-equality test asserting `formatType` produces exactly `Int`, `String`, `Bool`, `Float`, `Unit` for each primitive — once for each. Reject lowercase / aliased forms.
   - F-12: type-check a generic identity binding `let f = (x) => x` and assert the displayed type uses `'a` for the first free variable. Then a 2-arg generic to assert `'a, 'b` in source order.
4. **`tests/e2e/docs-errors-sync.test.ts`** (new) — Layer: E.
   - F-20: run `pnpm docs:errors` against the working tree, then `git diff -- docs/errors/` and assert empty output (no untracked or modified files under `docs/errors/`). The test must restore `docs/errors/` to its pre-run state on teardown (e.g., `git checkout -- docs/errors/`) so a CI failure doesn't leave the working tree dirty for subsequent tests. (If a CI step already does this, prefer extending it; otherwise add the e2e.)

## Behavior expectations (for bug-triage)

- If F-19 fails, someone added/removed a VFxxxx code without updating the registry — bisect to the offending commit; the fix is just updating the assertion (after confirming the new code is documented).
- If F-10 fails, a warning was filed under a non-warning numeric range or an error was filed under a warning range — the spec range docs (`codes/README.md`) and the code definition disagree; route to the diagnostics owner.
- If F-12 fails with `t1, t2` instead of `'a, 'b`, the typechecker's type-display path regressed — file as a real bug.
- If F-20 fails, the docs generator drifted from code definitions — re-run `pnpm docs:errors` and commit the regenerated files (this is the only "code change" allowed in this chunk: regenerated docs, not source).

## If a test reveals a bug

Tests-only PR. Note finding in PR description; file separate fix PR. Exception: a regenerated `docs/errors/` directory from F-20 is acceptable as part of this chunk (the docs are auto-generated; regeneration isn't a feature change).

## Verification

- `pnpm run verify`
- `pnpm run test:coverage` ≥ baseline
- Before committing F-03's stable-order test: run twice to confirm determinism on the developer's machine

## Out of scope

- 03c F-04 multi-error reporting — feature gap (typechecker currently throws on first error).
- Per-VFxxxx factory tests — chunks 03 and 04.
- 03c F-32 VF4900 emission — feature gap (warning is registered but never produced; routed to feature plan).
