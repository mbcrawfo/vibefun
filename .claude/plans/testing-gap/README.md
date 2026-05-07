# Testing Gap Remediation Plan

This folder contains the chunked implementation plan for closing the **123 testing gaps** documented in `.claude/spec-audit/testing-gaps.md`. Each chunk produces one PR (~500 LOC target). This README is the index; the per-chunk files below carry the full methodology (orphan-check, coverage discipline, spec citations, tests-only constraint).

## Chunk index

| # | File | Audit refs |
|---|---|---|
| 01 | [01-arbitrary-and-fixture-meta-tests.md](./01-arbitrary-and-fixture-meta-tests.md) | F-CC06, F-CC07, F-CC12 |
| 02 | [02-diagnostics-meta-and-conventions.md](./02-diagnostics-meta-and-conventions.md) | 03c F-03/F-10/F-11/F-12/F-19/F-20 |
| 03 | [03-diagnostics-per-code-factory-batch-1.md](./03-diagnostics-per-code-factory-batch-1.md) | 03c F-22/F-23/F-24/F-25 |
| 04 | [04-diagnostics-per-code-factory-batch-2.md](./04-diagnostics-per-code-factory-batch-2.md) | 03c F-26/F-27/F-28/F-29/F-30/F-31 |
| 05 | [05-lexer-real-gaps.md](./05-lexer-real-gaps.md) | 02 F-01/F-03/F-04/F-07/F-08/F-09/F-10/F-13/F-20/F-28/F-30/F-47/F-50 |
| 06 | [06-lexer-spec-validation-tokens.md](./06-lexer-spec-validation-tokens.md) | 02 F-12/F-29/F-32/F-33/F-34/F-37/F-38/F-39 |
| 07 | [07-types-core-and-composite.md](./07-types-core-and-composite.md) | 03a F-10/F-13/F-15/F-21/F-46; 03b F-05/F-09/F-13/F-19 |
| 08 | [08-expressions-core-non-eval.md](./08-expressions-core-non-eval.md) | 04a F-08/F-15/F-23/F-26/F-28/F-29/F-30/F-31/F-36/F-38/F-40/F-43 |
| 09 | [09-expressions-core-evaluation-order.md](./09-expressions-core-evaluation-order.md) | 04a F-44/F-45/F-46/F-49/F-50/F-51/F-52/F-54/F-55/F-56 |
| 10 | [10-expressions-data-and-functions.md](./10-expressions-data-and-functions.md) | 04b F-04/F-05/F-07/F-09/F-10/F-15/F-16/F-17/F-18/F-22 |
| 11 | [11-patterns-functions-refs.md](./11-patterns-functions-refs.md) | 05 F-28/F-35/F-51; 06 F-06/F-21/F-24; 07 F-10/F-11/F-14 |
| 12 | [12-modules-and-error-handling.md](./12-modules-and-error-handling.md) | 08 F-06/F-23/F-26/F-29/F-30; 09 F-07/F-13/F-18/F-21/F-24/F-26/F-27 |
| 13 | [13-javascript-interop.md](./13-javascript-interop.md) | 10 F-03/F-04/F-05/F-06/F-07/F-18/F-19/F-20/F-21/F-22/F-25/F-31 |
| 14 | [14-stdlib-core-and-math-trig.md](./14-stdlib-core-and-math-trig.md) | 11a F-10/F-29/F-30/F-31/F-32; 11b F-15/F-16/F-17–F-29 |
| 15 | [15-stdlib-math-rounding-and-numeric.md](./15-stdlib-math-rounding-and-numeric.md) | 11b F-01/F-06/F-30/F-31/F-32/F-33/F-35/F-36/F-37/F-38 |
| 16 | [16-compilation-and-appendix.md](./16-compilation-and-appendix.md) | 12 F-11/F-13/F-38; 13 F-19/F-25/F-31/F-33/F-36 |

## Rules every chunk must follow

1. **Tests-only PRs.** Don't change application code. If a test reveals a bug, file a separate fix PR and hold this chunk until it merges.
2. **Pre-flight orphan check.** Before writing tests, grep the feature and cross-reference `.claude/spec-audit/cross-cutting.md`'s orphan list. Many "untested" verdicts are false positives covered by orphan tests.
3. **Defend the coverage baseline.** Audit baseline: lines 92.80% / statements 91.92% / functions 92.59% / branches 86.71%. CI fails on regression.
4. **No `it.skip` in spec-validation.** A real bug → halt the chunk for triage.
5. **Spec citation per test.** Every new test references the spec file/section it validates so reviewers can resolve "spec says vs. code does" diffs.

## Misclassified entries

Six entries in `testing-gaps.md` are actually feature gaps, not test gaps. They are **out of scope** for this plan and listed in the post-snapshot addendum at the bottom of `.claude/spec-audit/feature-gaps.md` ("Feature gaps incorrectly identified as testing gaps"). Chunks 02, 04, 13, and 16 reference that addendum in their "Out of scope" sections.
