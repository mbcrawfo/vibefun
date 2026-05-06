# Audit Methodology

This audit produces feature-gap, testing-gap, and testing-redundancy reports for every section of the vibefun language specification. Each per-section subagent must follow this methodology so the synthesis pass can mechanically aggregate results.

## Coverage Baseline

`pnpm run test:coverage` was run at the start of this audit to record a snapshot of the test floor. The audit itself produces no code, but any follow-up implementation/test work driven by the gaps in `feature-gaps.md` or `testing-gaps.md` must defend ≥ this floor.

Baseline values are captured in `_coverage-baseline.txt` in this directory after the test:coverage run completes.

## Per-Section Procedure

Each subagent owns one audit chunk and produces exactly one document at the assigned path. The subagent must:

### 1. Extract features

Read every spec file in scope. Convert each normative claim into a numbered feature entry `F-NN`. A normative claim is anything the implementation must satisfy — a parse rule, a type rule, an evaluation rule, an error condition, a runtime guarantee, an emitted-code constraint.

Be exhaustive. A spec like `03-type-system/type-inference.md` has dozens of distinct claims (every inference rule, every error case, every monomorphism / value-restriction edge case). Do not collapse them — each claim is its own F-NN. Aim for granularity that lets a later remediation plan cite the audit directly.

### 2. Locate implementation

For each feature, search the codebase for the implementing function/branch and record `file:lines`. Search aggressively before declaring something missing — a single feature can be implemented across multiple files (parser admits the syntax, desugarer lowers it, typechecker checks it, codegen emits it). Use file globs across `packages/core/src/`, `packages/cli/src/`, `packages/stdlib/src/`.

If still unfound, mark `❌ Missing`. If only some layers implement it (e.g. parser accepts but typechecker doesn't), mark `⚠️ Partial` and explain which layer is missing.

### 3. Locate tests at every layer

For each feature, find tests at all relevant layers and record every match. Empty layers must be explicitly written as `(none)` — silence is ambiguous.

Layers to check:

- **Unit**: `packages/*/src/**/*.test.ts` — colocated with the implementation file
- **Integration**: known integration test files like `desugarer-integration.test.ts`, `parser-integration-*.test.ts`, `typechecker/*.integration.test.ts`, `codegen/es2020/execution-tests/*.test.ts`
- **Snapshot**: `packages/core/src/parser/snapshot-tests/`, `packages/core/src/codegen/es2020/snapshot-tests/`, any other `.snap`/`__snapshots__` content
- **E2E**: `tests/e2e/*.test.ts` (outside spec-validation), e.g. `module-resolution.test.ts`, `prefix-bang.test.ts`, `try-catch.test.ts`, `let-binding-matrix.test.ts`
- **Spec-validation**: `tests/e2e/spec-validation/NN-*.test.ts`
- **Property**: tests using arbitraries from `packages/core/src/types/test-arbitraries/` or `packages/stdlib/src/test-arbitraries/`

Record the file path and the test name (the `it("…")` description). Tests are linked to features by a substring/keyword match plus reading the test body to confirm it asserts the spec claim — not by filename heuristics alone.

### 4. Coverage assessment

For each feature, assign one of:

- `✅ Adequate` — the feature's behavior, error path, and at least one edge case have a test that would catch a regression. Edge cases mean: empty inputs, boundary values, negative cases, interaction with adjacent features.
- `⚠️ Thin` — only the happy path is covered. Or only one layer (e.g. unit) covers it when multiple layers should.
- `❌ Untested` — no test asserts the spec claim directly. (A feature can be ❌ Untested even when implemented — that is precisely the testing gap we want to surface.)

### 5. Redundancy detection

Two tests are redundant only when they assert **the same observable behavior on the same input class**. Examples:

- ✅ Redundant: two snapshot tests of identical AST output for the same source string
- ✅ Redundant: a unit test in `lexer.test.ts` and an integration test in `parser-integration-basic.test.ts` both asserting that `42` lexes to `INT_LITERAL` with no other context
- ❌ NOT redundant: a fixed-input test of `1 + 2` and a property test that `add` is commutative — properties augment fixed tests, never replace them (`.claude/CODING_STANDARDS.md` § Property-Based Testing)
- ❌ NOT redundant: two operator tests with different operands (`1 + 2` vs `0 + 0`) — boundary coverage is not duplication
- ❌ NOT redundant: a unit test of `desugarLet` and an execution test exercising `let` end-to-end — different layers catch different regressions

When in doubt, do not flag. The audit bias is toward more tests; redundancies are flagged as *candidates* with the duplicated assertion stated explicitly so a human can confirm before any deletion.

### 6. Output discipline

- Write only to the assigned `.claude/spec-audit/<file>.md`.
- Do not modify source code, tests, or any other documentation.
- Do not run pnpm/npm scripts (the baseline already captured the relevant state).
- Cite `file:line` ranges precisely for every implementation and test reference.

## Document Shape

Use the template in `_template.md`. Every audit doc must have, in order:

1. `# Audit: <Section> (<spec path>)`
2. `## Sources Reviewed` — exhaustive list of spec files, implementation files, test files
3. `## Feature Inventory` — every F-NN entry per the template
4. `## Feature Gaps (this section)` — pulled from `❌`/`⚠️` Status entries
5. `## Testing Gaps (this section)` — pulled from `❌`/`⚠️` Coverage assessment entries on `✅` Implemented features
6. `## Testing Redundancies (this section)` — candidate consolidations with rationale

The synthesis pass aggregates section 4 of every doc into `feature-gaps.md`, section 5 into `testing-gaps.md`, section 6 into `redundancies.md`.

## Verification

After all per-section audits complete, the synthesis agent runs these checks:

1. Every file in `docs/spec/` (excluding `01-introduction.md` and top-level `README.md`) appears in some "Sources Reviewed" list.
2. Every `*.test.ts` in the repo appears in at least one audit doc's test column. The cross-cutting agent is responsible for the reverse-mapping check and lists orphans in `cross-cutting.md`.
3. Every VFxxxx code defined in `packages/core/src/diagnostics/codes/` appears in `03c-types-errors.md` or another audit doc.
4. Synthesis docs cite per-section findings by F-NN ID (so a reader can trace back to context).
