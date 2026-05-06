# Vibefun Spec Implementation Audit

A deep audit comparing every claim in the [vibefun language specification](../../docs/spec/) against the compiler implementation and test suite. Captured 2026-05-06 against commit `e786b4e`.

## Executive Summary

The audit examined **45 spec files** (~14,400 lines), **87 source files** across 12 compiler subsystems, and **246 test files** (unit, integration, snapshot, e2e, property-based, spec-validation).

| Metric | Count |
|---|---|
| Total features audited | ~615 normative claims (F-NN entries across 17 docs) |
| ❌ Missing features | 60 |
| ⚠️ Partially-implemented features | 20 |
| ❌ Untested implemented features | 28 |
| ⚠️ Thinly-tested implemented features | 95 |
| Redundancy candidates | 19 (17 confirmed-keep, 2 needs human review) |
| Orphan spec files (no audit referenced) | 0 |
| Orphan test files (no audit referenced by basename) | 81 |

### Headline findings

1. **Four entire stdlib modules are unimplemented** — `Array`, `Map`, `Set`, `Json` (56 functions). All listed in `docs/spec/11-stdlib/` but the runtime, type signatures, and tests are all absent. See `11b-stdlib-extra.md`. This single cluster accounts for >70% of all P1 feature gaps.
2. **Spec-validation layer (V) is the most under-tested layer.** ~70% of testing-gap entries have a missing V-layer test — features have unit/integration coverage but never get exercised through the full CLI pipeline. See `testing-gaps.md`.
3. **Error-code layer is structurally tested but per-code thinly tested.** 127 VFxxxx codes are registered (14 lexer, 38 parser, 2 desugarer, 62 typechecker, 8 modules, 3 warnings), but many lack dedicated unit tests asserting the code is emitted on the right input. See `03c-types-errors.md`.
4. **Try-catch and while loops are implemented but missing from the spec appendix.** `13-appendix.md` flags this — the syntax summary and keyword table omit them. Spec doc fix, not a code fix.
5. **No silent acceptance of future features.** The negative audit in `13-appendix.md` confirms reserved keywords (`for`, `async`, etc.) are correctly rejected at parse time.

### Coverage baseline

`pnpm run test:coverage` at audit start (recorded in `_coverage-baseline.txt`):

- Lines: **92.80%** (7038 / 7584)
- Statements: **91.92%** (7300 / 7941)
- Functions: **92.59%** (1076 / 1162)
- Branches: **86.71%** (3996 / 4608)

All comfortably above the configured CI thresholds (lines/statements/functions 88%, branches 81%). Any follow-up work driven by this audit's gap reports must defend ≥ these numbers.

## Document Index

### Per-Section Audits

| Doc | Spec scope | Headline findings |
|---|---|---|
| [`02-lexical-structure.md`](./02-lexical-structure.md) | Tokens, comments, operators, semicolons | 52 features, 0 missing, 23 testing gaps. See caveat below re: orphan tests inflating "untested" verdicts. |
| [`03a-types-core.md`](./03a-types-core.md) | Primitives, tuples, type inference, value restriction, type aliases | 46 features, 1 ⚠️ partial (recursive type aliases), 5 testing gaps |
| [`03b-types-composite.md`](./03b-types-composite.md) | Records, variants, generics, unions, recursive, subtyping | 24 features, 2 gaps, 5 testing gaps |
| [`03c-types-errors.md`](./03c-types-errors.md) | Error reporting + VF0001-VF0249 catalog | 35 features, 8 gaps (max-errors limit, error-type tracking, recovery), 8 testing gaps |
| [`04a-expressions-core.md`](./04a-expressions-core.md) | Basic exprs, control flow, evaluation order | 56 features, 6 partials, 15 testing gaps |
| [`04b-expressions-data-fns.md`](./04b-expressions-data-fns.md) | Data literals, functions, composition, pipe | 29 features, 0 missing, 8 testing gaps |
| [`05-pattern-matching.md`](./05-pattern-matching.md) | Patterns, guards, exhaustiveness | 54 features, 0 missing, 3 testing gaps |
| [`06-functions.md`](./06-functions.md) | Currying, recursion, HOF, closures | 25 features, 0 missing, 3 testing gaps |
| [`07-mutable-references.md`](./07-mutable-references.md) | `Ref<T>`, `:=`, `!`, `let mut`, value restriction | 16 features, 2 partials, 3 testing gaps |
| [`08-modules.md`](./08-modules.md) | Imports/exports, cycles, resolution | 32 features, 2 gaps, 4 testing gaps |
| [`09-error-handling.md`](./09-error-handling.md) | `Result`, `Option`, panic, division-by-zero | 29 features, 5 gaps, 4 testing gaps |
| [`10-javascript-interop.md`](./10-javascript-interop.md) | `external`, `unsafe`, opaque types, FFI | 36 features, 6 incomplete, 5 testing gaps |
| [`11a-stdlib-core.md`](./11a-stdlib-core.md) | List, Option, Result, String | 37 features, all implemented, 4 testing gaps |
| [`11b-stdlib-extra.md`](./11b-stdlib-extra.md) | Numeric, Array, Collections, Math, Json | **94 features, 56 ❌ Missing (Array/Map/Set/Json modules entirely absent)** |
| [`12-compilation.md`](./12-compilation.md) | Desugaring, codegen, runtime, CLI | 61 features, 3 gaps (source maps, runtime checks, TCO), 3 testing gaps |
| [`13-appendix.md`](./13-appendix.md) | Syntax summary + future-features negative audit | 50 features, 3 doc gaps (try-catch/while missing from summary), 3 testing gaps |
| [`cross-cutting.md`](./cross-cutting.md) | Property arbitraries, let-binding matrix, fixtures, snapshots, orphans | 19 cross-cutting features, 2 missing meta-tests; 0 orphan spec files; 81 orphan test files |

### Synthesis

| Doc | Purpose |
|---|---|
| [`feature-gaps.md`](./feature-gaps.md) | Every ❌ Missing / ⚠️ Partial entry, prioritized P1/P2/P3 |
| [`testing-gaps.md`](./testing-gaps.md) | Every ✅-implemented-but-untested entry, layer-tagged [U,I,S,E,V,P] |
| [`redundancies.md`](./redundancies.md) | Candidate consolidations with conservative verdicts |

### Infrastructure

| Doc | Purpose |
|---|---|
| [`_methodology.md`](./_methodology.md) | The procedure each audit chunk followed (extract features, locate impl, locate tests, assess, detect redundancy) |
| [`_template.md`](./_template.md) | Per-section audit document shape |
| [`_coverage-baseline.txt`](./_coverage-baseline.txt) | Coverage snapshot at audit start |

## How to Use This Audit

The audit is a snapshot that drives downstream work. Typical use:

1. **Filing remediation work.** Pull from `feature-gaps.md` (prioritized) and `testing-gaps.md` (layer-tagged) to file follow-up tickets. Each entry cites a per-section doc and F-NN ID, so the original spec/impl/test mapping is one click away.
2. **Resolving a specific gap.** Open the per-section audit for full context — Sources Reviewed, full feature inventory, exact `file:line` citations.
3. **Reviewing a redundancy candidate.** Open `redundancies.md`. Most are confirmed-keep (layer-distinguished). The 2 marked "Needs human review" are the only candidates worth closer inspection before any deletion.
4. **When the spec or implementation changes substantially.** Regenerate the audit (it is a snapshot, not living docs). The methodology in `_methodology.md` is the durable artifact.

## Quality Caveats

This audit was generated by 17 parallel subagents reading their assigned spec slice, then aggregated by 3 synthesis agents. A few known limitations:

1. **Some per-section audits cite tests by feature description rather than by exact filename.** This caused 81 test files to appear as "orphans" in `cross-cutting.md`'s reverse-mapping check. Most are not truly uncovered — they are real tests of cited features that just weren't listed in the audit doc's "Sources Reviewed" by basename. The orphan list in `cross-cutting.md` categorizes them by which per-section audit *should* have referenced them.

2. **Some "Untested" verdicts are false positives.** Spot-check found that `02-lexical-structure.md` reports NFC normalization as untested, but `packages/core/src/lexer/unicode-normalization.test.ts` (a 230-line dedicated test file) exists and exercises it. The audit doc didn't reference this file by name. **Before remediating any "Untested" entry from `testing-gaps.md`, cross-check the orphan list in `cross-cutting.md` for a test file that may already exist.**

3. **Coverage assessment is judgmental.** "⚠️ Thin" vs "✅ Adequate" is a per-agent call. Don't treat these as hard verdicts — read the test list before deciding remediation effort.

4. **Redundancy candidates are conservative.** Per `.claude/CODING_STANDARDS.md` § Property-Based Testing, properties never replace fixed tests. The synthesis bias errs toward keeping tests; only 2 of 19 candidates were flagged as worth a closer look.

5. **The audit does not check for performance, benchmarks, or spec ambiguities.** It compares spec text to code/tests and stops there.

## Verification Performed

- Every in-scope spec file (45 total, excluding `01-introduction.md` and `README.md`) is referenced in some audit doc's "Sources Reviewed" — confirmed by grep.
- Every VFxxxx error code defined in `packages/core/src/diagnostics/codes/` is referenced in `03c-types-errors.md`.
- Synthesis docs reference per-section findings by F-NN ID for traceability.
- Spot-checks: random feature in `06-functions.md` (F-04 full application evaluation) verified — cited implementation files exist; cited test exists.

## Maintenance

This audit is a snapshot, not living docs. Regenerate when significant spec/impl churn happens. The durable artifacts are:

- `_methodology.md` — the procedure
- `_template.md` — the document shape
- This `README.md` — the index

Per-section docs and synthesis docs should be regenerated in full from scratch on each refresh, not edited piecemeal.
