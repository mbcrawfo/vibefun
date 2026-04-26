# PR 7 — CLI + E2E + Cleanup

Refer to `fast-check-master.md` for the shared rules.

## Context

The final PR closes out the rollout. The CLI and e2e suites have the lowest
fast-check leverage (most tests are exact-argv regressions or fixed-input
end-to-end checks), but a handful of property targets exist —
`formatError`'s totality, generated-stdlib-program execution, and CLI-flag
combinations — and adding them ensures every layer of the suite has at least
some property coverage.

This PR also handles the cleanup: triaging every entry in
`.claude/FAST_CHECK_BUG_BACKLOG.md`, filing follow-up issues for non-trivial
bugs, and running the weekly fuzz workflow once with high `numRuns` to
surface long-tail bugs before declaring the rollout done.

## Scope

- **CLI src (1 file)** in `packages/cli/src/`:
    - `format-error.test.ts`.

- **CLI e2e (8 files)** in `packages/cli/tests/`:
    - `compilation.test.ts`, `emit-modes.test.ts`, `error-handling.test.ts`,
      `flags.test.ts`, `global-commands.test.ts`, `output-validity.test.ts`,
      `run.test.ts`, `stdin.test.ts`.

- **E2E (7 files)** in `tests/e2e/`:
    - `smoke.test.ts`, `float-arithmetic.test.ts`, `prefix-bang.test.ts`,
      `try-catch.test.ts`, `user-defined-types.test.ts`,
      `module-resolution.test.ts`, `let-binding-matrix.test.ts`.

## Baseline

PR 7's floor is whatever PR 6 closed at. With the appropriate working branch
already checked out:

```bash
pnpm run test:coverage
cp coverage/coverage-summary.json .claude/plans/triage/pr7-baseline-coverage.json
time pnpm run test
time pnpm run test:e2e  # e2e baseline — critical
```

## Triage step (commit 1)

Spawn an Explore subagent:

> Read every `*.test.ts` under `packages/cli/{src,tests}/` and `tests/e2e/`.
> Classify as `property-tests`, `fixed-only`, or `defer-bug-backlog`.
> Bias **toward `fixed-only`**: most CLI/e2e tests are
> argv-or-fixture-based regressions where property-based testing adds little.
> Identify the small set with real algebraic properties (`formatError`
> totality, generated-program execution).
>
> Output `.claude/plans/triage/pr7-cli-e2e.csv`.

## Critical files

No new arbitraries module needed. Reuse from PRs 1–6:

- `runnableProgramArb` (from PR 6) — for "generated stdlib programs run
  without crash" properties in e2e.
- Existing stdlib arbitraries (PR 1) — for stdin-driven CLI tests.

If a `formatError` property needs an arbitrary `Error | Diagnostic | unknown`,
add a small file `packages/cli/src/test-arbitraries/format-error-arb.ts`
exporting `errorishArb`. Otherwise inline.

## Property targets

### `format-error.test.ts`

- **`formatError` is total:** does not throw on any `Error | Diagnostic |
  unknown` input. Use `fc.anything()` plus arbitraries for the structured
  cases.
- **Output type invariant:** always returns a string (or whatever the API
  promises).
- **`unknown` payload doesn't leak `[object Object]`:** for any non-error
  input, the formatted output contains some indication that the input was
  not an Error.

### CLI e2e (most files: `fixed-only`)

A handful of property targets if leverage justifies them:

- **`emit-modes.test.ts`:** for any combination of `--emit ast|core|js`,
  the CLI exits successfully on a tiny well-formed program.
- **`flags.test.ts`:** for any subset of mutually-compatible flags, the CLI
  parses them without exit-code 2 (which indicates an argparse error).
  Cap `numRuns: 10`; CLI spawn is slow.
- **`output-validity.test.ts`:** for any tiny program, the emitted JS
  parses (use `Function` constructor or a JS parser).

### Repo e2e (`tests/e2e/`)

Most files: `fixed-only`. Two candidates:

- **`smoke.test.ts`:** add a property test that any
  `runnableProgramArb`-generated program compiles and runs to completion via
  the CLI. Cap `numRuns: 5`; each run spawns Node twice.
- **`let-binding-matrix.test.ts`:** if the matrix encodes a property
  (e.g. "every let-binding form supports the same set of soundness
  scenarios"), express it as a property; otherwise `fixed-only`.

## Cleanup tasks (final commits of the PR)

After per-file commits land:

1. **Bug backlog triage:**
    - Open `.claude/FAST_CHECK_BUG_BACKLOG.md`.
    - For every Tier 3 entry: file a GitHub issue (or whatever tracker the
      project uses). Link the issue from the backlog entry. Update status to
      `tracked`.
    - For every Tier 2 entry that's still open: file an issue and mark
      `tracked`. (If the original PR fixed it, the entry should already be
      removed.)
    - Move closed entries from the backlog to commit history (delete the
      rows; commit history is the durable record).

2. **Final verify (cross-layer gates required before merge):**
    - `pnpm run verify` — build + check + lint + test + test:e2e + format:check.
    - `pnpm run spec:validate` — spec-suite must remain at 378/378 (or
      current count).
    - `pnpm run test:coverage` and confirm
      `coverage/coverage-summary.json` is ≥
      `.claude/plans/triage/pr7-baseline-coverage.json` for lines,
      statements, functions, and branches.
    - If CLI/e2e changes affect language semantics or user-observable
      output, update `.claude/VIBEFUN_AI_CODING_GUIDE.md` and the
      let-binding-matrix tests per the project's sync rules in CLAUDE.md.
    - Re-run the unseeded weekly job (`property-fuzz.yml`) manually with
      `numRuns: 5000` to surface long-tail bugs before declaring done. Any
      failures get triaged into the backlog.

3. **Rollout summary commit:**
    - Update `fast-check-master.md` with final coverage numbers.
    - Append a "Done" section listing total property tests added per PR,
      bugs found and fixed, runtime delta, and any open Tier 3 entries
      tracked elsewhere.

## Out-of-scope

- Replacing fixed CLI argv tests with property versions: argv space is too
  small to generate meaningfully.
- Replacing e2e module-resolution tests with generated module trees:
  filesystem coupling is too tight; brittle.

## Verification

Per `fast-check-master.md`, plus:

- **Runtime budget check:** confirm `time pnpm run test:e2e` is within 50% of
  the pre-rollout baseline measured in PR 1.

## Risks specific to this PR

- **CLI spawn overhead.** Each generated program executes the full CLI
  pipeline. Default 100 runs is too many. Cap aggressively (5–10).
- **Generator quality matters most here.** Bad `runnableProgramArb`
  generators produce programs that fail to compile, masking the property's
  signal as "generator bug" or "compile error" rather than runtime crash. Add
  meta-tests asserting every sample compiles cleanly before relying on it
  in e2e properties.
- **Filesystem dependence.** CLI e2e tests use `TempDir` and real `node`
  spawns. Property tests in this layer must not pollute the temp directory or
  leak between runs.

## When the PR is done

After this PR merges, the rollout is complete. Drop a final note in
`fast-check-master.md`:

```markdown
## Rollout complete

- PRs 1–7 merged.
- Final coverage: lines X.XX%, branches X.XX%, functions X.XX%, statements X.XX%.
- Total property tests added: ~N.
- Bugs found and fixed: M (Tier 1 + Tier 2). Open Tier 3 entries: K (tracked
  in <issue tracker>).
- Runtime delta: +X% on `pnpm run test`, +Y% on `pnpm run test:e2e`.
- Weekly `property-fuzz.yml` workflow active.
```
