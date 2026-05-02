# Spec Validation Suite (e2e)

These tests validate the Vibefun compiler against the language
specification by compiling and running real `.vf` source through the
CLI. They are **gating**: any failure breaks `pnpm run verify` and CI.

## Authoring rules

- **No skipping.** Every test passes or fails. `it.skip` is never
  acceptable here — a failure means the implementation drifted from the
  spec, and that is exactly what this suite exists to catch.
- **Minimize feature dependencies.** Each test should exercise only the
  feature it validates plus the bare minimum needed to run. If an
  unrelated regression starts breaking tests that aren't aimed at it,
  rewrite those tests to avoid the broken feature — don't widen the
  blast radius.
- **All `.vf` code goes through the CLI.** Never import compiler
  internals; the suite tests the full pipeline (lexer → parser →
  desugarer → typechecker → codegen → node).
- **Build first.** The CLI must be compiled (`pnpm run build`) before
  these tests run. `pnpm run verify` does this for you.

## Helpers

`./helpers.ts` exposes the assertion vocabulary used throughout this
folder:

| Helper | What it checks |
|---|---|
| `expectCompiles(source)` | exit 0 from `compile -` |
| `expectCompileError(source, errorCode?)` | exit 1, optional error code substring |
| `expectRunOutput(source, expected)` | exit 0 from `run -`; stdout matches (trimmed) |
| `expectRuntimeError(source, errorMsg?)` | compiles cleanly; runtime exits non-zero |
| `expectRuns(source)` | compiles and runs cleanly; output ignored |
| `withOutput(code, outputExpr)` | inject stdlib imports + a single `console_log` |
| `withOutputs(code, outputExprs)` | one `console_log` per expression |

For multi-file projects, use `createTempProject` (re-exported from
`../helpers.js`); see `08-modules.test.ts` for the pattern.

## Adding tests

Add `it()` calls inside the appropriate section file's `describe` tree.
Keep dividers as nested `describe` blocks so failures point at the
right subtopic. New section file? Drop it next to the others as
`NN-name.test.ts`; vitest's `**/*.test.ts` glob picks it up
automatically.

## Maintenance

This file refers to specific helper names and the `08-modules.test.ts`
pattern. Update it in the same commit if you rename helpers, change the
multi-file approach, or restructure how tests are grouped.
