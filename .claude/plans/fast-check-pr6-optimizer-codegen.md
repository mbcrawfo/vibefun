# PR 6 — Optimizer + Codegen + Execution-Tests Property Tests

Refer to `fast-check-master.md` for the shared rules.

## Context

The optimizer and codegen are the back-end of the compiler. The most valuable
property here is **semantic preservation**: optimized code must behave
identically to unoptimized code on every input, and emitted JavaScript must
behave identically to its Core IR semantics. Both are testable via the
existing execution-tests harness — generate a Core program, run it, then
optimize it and run again, and compare outputs.

This PR has the largest runtime impact of any in the rollout because each
property run can spawn JS execution. **Cap `numRuns` aggressively in this
PR** (25–50 default; never above 100 for execution-based properties).

## Scope

- **Optimizer (~9 files)** in `packages/core/src/optimizer/`:
    - Top-level: `optimizer.test.ts`, `optimizer.integration.test.ts`.
    - Passes (`passes/`): `beta-reduction.test.ts`,
      `constant-folding.test.ts`, `cse.test.ts`, `dead-code-elim.test.ts`,
      `eta-reduction.test.ts`, `inline.test.ts`, `pattern-match-opt.test.ts`.

- **Codegen (~8 files)** in `packages/core/src/codegen/es2020/`:
    - `generator.test.ts`, `runtime-helpers.test.ts`,
      `emit-{declarations,expressions,operators,patterns}.test.ts`,
      `rename-shadows.test.ts`, `reserved-words.test.ts`, `codegen.test.ts`
      (parent dir).

- **Codegen execution-tests (11 files)** in
  `packages/core/src/codegen/es2020/execution-tests/`:
    - `numeric.test.ts`, `misc.test.ts`, `user-defined-types.test.ts`,
      `float-arithmetic.test.ts`, `prefix-bang.test.ts`, `operators.test.ts`,
      `functions.test.ts`, `mutable-refs.test.ts`,
      `pattern-matching.test.ts`, `records.test.ts`,
      `module-reexports.test.ts`.

- **Diagnostics (~5 files)** in `packages/core/src/diagnostics/`:
    - `registry.test.ts`, `diagnostic.test.ts`, `factory.test.ts`,
      `warning-collector.test.ts`, `test-helpers.test.ts`,
      `codes/modules.test.ts`. Most are `fixed-only`; include here for
      completeness.

**Excluded:** `packages/core/src/codegen/es2020/snapshot-tests/*` (6 files) —
snapshot oracles, mark `snapshot-skip`.

## Baseline

PR 6's floor is whatever PR 5 closed at. With the appropriate working branch
already checked out:

```bash
pnpm run test:coverage
cp coverage/coverage-summary.json .claude/plans/triage/pr6-baseline-coverage.json
time pnpm run test  # capture runtime baseline — critical for this PR
```

Save the runtime baseline: this is the PR most likely to blow the runtime
budget.

## Triage step (commit 1)

Spawn an Explore subagent:

> Read every `*.test.ts` under
> `packages/core/src/{optimizer,codegen/es2020,diagnostics}/`. Skip
> `codegen/es2020/snapshot-tests/`. Classify as `property-tests`,
> `fixed-only`, `snapshot-skip`, or `defer-bug-backlog`. For
> `property-tests`, name the properties (semantic preservation,
> idempotence, structural invariant, no-crash oracle). Note for any
> execution-tests file the expected runtime cost: each property run will
> spawn Node.
>
> Output `.claude/plans/triage/pr6-optimizer-codegen.csv` with columns
> `path,disposition,justification`.

## Critical files

Reuse existing arbitraries from PRs 2–5. New helpers:

`packages/core/src/codegen/es2020/test-arbitraries/optimizable-expr-arb.ts` (or
co-located in `core-ast-arb.ts`):
- `optimizableExprArb` — generates Core expressions where optimizer passes
  are guaranteed to terminate (no recursive bindings deeper than 4, no
  pathological lambdas).

`packages/core/src/codegen/es2020/test-arbitraries/runnable-program-arb.ts`:
- `runnableProgramArb` — generates a Core module that compiles to JS and runs
  to completion in < 100ms with no I/O. Produces a tuple of
  `(coreModule, expectedStdout)` so semantic-preservation tests can check
  optimizer output against the unoptimized output.

For this PR, the global `numRuns` default stays at 100 (set in
`vitest.setup.ts`); execution-heavy property tests **must** opt down via
explicit `fc.assert(prop, { numRuns: 25 })` or `{ numRuns: 10 }` and document
the cap in a comment next to the property. Treat 25–50 as the typical budget
for a property that spawns Node; 10 for full pipeline runs. Cheap properties
(no Node spawn) keep the default.

## Property targets

### Optimizer

- **Each pass is a function:** running a pass twice on the same input
  produces the same output (determinism).
- **Confluent passes are idempotent:** `pass(pass(e)) === pass(e)` for
  constant folding, dead-code elim, beta and eta reduction.
- **Semantic preservation (the headline property):** for any
  `runnableProgramArb`-generated module, the unoptimized run output equals
  the optimized run output (compare stdout). Cap `numRuns: 25` per file.
- **CoreUnsafe preservation:** passes never run inside `CoreUnsafe` blocks
  (verify by inspecting the optimized AST: any `CoreUnsafe` subtree in the
  input appears verbatim in the output).
- **`O0` is identity:** running the optimizer at `OptimizationLevel.O0`
  returns the input unchanged.

### Codegen

- **`escapeIdentifier(reservedWord)` is never a reserved word:** for any
  string in `RESERVED_WORDS`, the escaped result lexes as a valid identifier.
- **Operator precedence:** for nested binary operations with explicit parens
  in Core, the emitted JS preserves the parens (verify by re-parsing the
  emitted JS via `Function` constructor or a JS parser if available;
  fallback: regex-check for explicit parens).
- **`rename-shadows` produces unique top-level names:** after the pass, no
  two top-level bindings share the same JS identifier.
- **Generator is total:** `generate(typedModule)` does not throw on any
  well-typed Core module (use `wellTypedSurfaceProgramArb` from PR 5 piped
  through the typechecker).

### Execution-tests

- **Compile + run does not throw on any `runnableProgramArb` input.**
- **Specific subdomain executions:**
    - `numeric.test.ts`: arithmetic over generated integer/float pairs
      matches Math/JS results.
    - `pattern-matching.test.ts`: generated patterns match generated values
      consistently with a reference matcher.
    - `mutable-refs.test.ts`: `ref` / `!ref` / `:=` round-trip preserves
      values.

Cap `numRuns: 10–25` for these. Document the cap in a comment.

### Diagnostics

Mostly `fixed-only`. Possible properties:

- **`registry` totality:** `getDiagnostic(any code in DIAGNOSTIC_CODES)`
  never throws.
- **`warning-collector`:** adding then querying preserves order.
- **`factory`:** generated arguments match the diagnostic's parameter list.

Don't bias toward properties here; most tests are exact-match.

## Out-of-scope-this-PR triage candidates

- Error-code/message tests: `fixed-only`.
- Snapshot tests: `snapshot-skip`.
- Module-reexports tests that depend on filesystem fixtures: `fixed-only`.

## Verification

Per `fast-check-master.md`, plus:

- **Runtime budget check:** after the last commit, re-run `time pnpm run test`
  and compare to the runtime baseline saved at PR start. The increase must be
  ≤ 10%; if it exceeds, lower `numRuns` for the most expensive files until it
  fits.

### Cross-layer validation gates (required before merge)

```bash
pnpm run verify        # build + check + lint + test + test:e2e + format:check
pnpm run spec:validate # spec-suite pass count must not decrease
```

If optimizer/codegen changes affect observable program behaviour or emitted
JS shape, update `.claude/VIBEFUN_AI_CODING_GUIDE.md` and the
let-binding-matrix tests per the project's sync rules in CLAUDE.md.

## Post-implementation coverage check

```bash
pnpm run test:coverage
# compare coverage/coverage-summary.json against
# .claude/plans/triage/pr6-baseline-coverage.json and confirm
# lines, statements, functions, and branches are all >= baseline
```

## Risks specific to this PR

- **Execution-test runtime explosion.** Each property run can spawn Node.
  Default 100 runs × 11 execution-test files × even 100ms per run is 110s
  added to the suite. Cap aggressively. Track per-file runtime in the triage
  CSV.
- **Semantic-preservation property requires the full pipeline.** If the
  generated Core module fails to typecheck or codegen, the test infrastructure
  must classify the failure as a generator bug, not a property failure. Add
  meta-tests on `runnableProgramArb` asserting every sample compiles and runs
  without throwing.
- **Optimizer soundness is Tier 3.** A semantic-preservation failure means
  the optimizer is changing observable program behavior. Halt the PR, escalate
  immediately.
- **`rename-shadows` properties depend on the existing α-renaming pass
  invariant.** If the property reveals a collision, that's likely a real bug
  in the renamer; treat as Tier 2 unless it cascades.
