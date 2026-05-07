# Chunk 01 — Arbitrary and fixture meta-tests

## Context

The cross-cutting audit (`.claude/spec-audit/cross-cutting.md`) identified two property-test arbitraries with no meta-test (so a silently-broken generator wouldn't be caught) and one fixture cluster with no validation that each fixture is itself a valid `.vf` project. Closing these gaps de-risks every later chunk that uses property tests or module-loader fixtures: if `source-arb` ever produces malformed source, every property test that uses it would silently pass on vacuous inputs.

Closes: F-CC06, F-CC07, F-CC12.

## Spec under test

This chunk has no direct spec citation — it tests test-infrastructure invariants. The relevant policy citations are:

- `.claude/CODING_STANDARDS.md` § Property-Based Testing — arbitraries live next to test helpers; reuse across files; meta-test the generator.
- `.claude/CODING_STANDARDS.md` § Test Coverage Requirements — every public function gets a unit test.

Existing meta-test to model on: `packages/core/src/types/test-arbitraries/token-arb.test.ts`.

## Pre-flight orphan check

- F-CC06 `source-arb.ts` — search for `source-arb.test.ts`. Audit says missing; expected to be confirmed missing.
- F-CC07 `optimizable-expr-arb.ts` — search for `optimizable-expr-arb.test.ts`. Audit says missing; expected confirmed.
- F-CC12 module-loader fixtures — search `packages/core/src/**/__fixtures__/` and look for any `*fixtures*.test.ts`. If a meta-test already validates fixtures (e.g., a parameterised "compile every fixture" runner), close by citation.

## Coverage baseline

```bash
pnpm run test:coverage
# Record combined % (lines/statements/functions/branches) here in the PR description
```

## Implementation steps

1. **`packages/core/src/types/test-arbitraries/source-arb.test.ts`** (new) — Mirror `token-arb.test.ts` shape. Layer: U.
   - Property: every generated source string is non-empty and contains only printable ASCII + the documented Unicode ranges (per `source-arb.ts`'s declared character set).
   - Property: every generated source either lexes successfully or produces a *registered* `VFxxxx` lexer error (no uncategorised throws).
   - Property: shrinking terminates within 1000 steps (no infinite shrink).
2. **`packages/core/src/types/test-arbitraries/optimizable-expr-arb.test.ts`** (new) — Same shape as the source-arb meta-test. Layer: U.
   - Property: every generated expression typechecks without crashing the typechecker (it may produce a type error; it must not throw an unregistered exception).
   - Property: structural invariant — every node has a `Location` and the expression is reachable via a single root.
3. **`packages/core/src/module-loader/__fixtures__.test.ts`** (or wherever fixtures live — see audit) — Layer: U + I.
   - Find every fixture root via a glob (e.g., `packages/core/**/__fixtures__/*/`).
   - For each fixture: invoke the public CLI compile entry point against the fixture root and assert exit code 0 with no diagnostics. (Match `tests/e2e/helpers.ts` patterns.)
   - This is a meta-test, not a coverage-driver. Keep it under 100 LOC.

## Behavior expectations (for bug-triage)

- If the source-arb meta-test's "lex without unregistered throw" property fails, the generator is producing input the lexer didn't anticipate — file as a Tier 2 fast-check bug per `.claude/FAST_CHECK_BUG_BACKLOG.md` and halt the chunk.
- If the fixture meta-test reveals a fixture that no longer compiles, the fixture's owning module has drifted from the spec — file the bug; do not "fix" the fixture in this chunk.

## If a test reveals a bug

Tests-only PR. Note finding in PR description; file separate fix PR. Do not modify the arbitrary, the fixture, or the affected production code in this chunk.

## Verification

- `pnpm run verify`
- `pnpm run test:coverage` — must defend baseline
- `FC_NUM_RUNS=1000 FC_SEED=random pnpm test` — fuzz the new property assertions before committing the default-seed run

## Out of scope

- Adding new arbitraries (this chunk only meta-tests existing ones).
- F-CC09 stdlib-sync expansion — that's a feature gap pending Array/Map/Set/Json modules.
