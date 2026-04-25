# Spec Validation Test Suite

## Purpose

This is a custom integration test suite that validates the Vibefun compiler against the language specification. It compiles and executes real `.vf` source code through the CLI — it is **not** a unit test framework and does **not** use vitest. Tests are run via `pnpm run spec:validate`.

**CRITICAL:** When making changes to the architecture or code structure of this test suite you must update this document to be in sync with the source code.

## When to use this suite vs `tests/e2e/`

Spec-validation tests are **informative**, not gating:

- The runner only exits non-zero on infrastructure errors. Feature failures are tolerated by design — they signal unimplemented or partially-implemented spec items, which is useful signal but not a merge blocker.
- The suite is **not** part of `pnpm run verify`.
- CI runs the suite but tolerates feature failures here.

Therefore, **most actual regression tests belong in `tests/e2e/`**, not here. Use this suite *only* for tests that exist to track spec conformance — "section 7 says X works; does it?" Use `tests/e2e/` for any test you want to gate merges on: soundness regressions, refactor safety nets, anything whose failure should fail `pnpm run verify`.

That said, **changes to user-visible syntax or language semantics still require updating `tests/spec-validation/sections/`** (and rerunning `pnpm run spec:validate` to commit any expected-pass flips) per the root `CLAUDE.md`'s Comprehensive Testing rule. The conformance signal is what makes the suite useful — moving regression tests out doesn't excuse leaving the spec view stale.

Rule of thumb: if you'd be upset that a CI run was green while this test was red, the test belongs in `tests/e2e/`.

## Architecture

```
tests/spec-validation/
├── run.ts                       # Entry point (CLI parsing, orchestration)
├── framework/
│   ├── types.ts                 # All type definitions (TestResult, SpecTest, Report, etc.)
│   ├── helpers.ts               # CLI invocation + assertion helpers + temp file utilities
│   ├── runner.ts                # Global test registry + synchronous executor
│   └── reporter.ts              # Console, markdown, and file report formatters
├── sections/                    # Test files, one per spec section
│   ├── 02-lexical-structure.ts
│   ├── 03-type-system.ts
│   ├── 04-expressions.ts
│   ├── 05-pattern-matching.ts
│   ├── 06-functions.ts
│   ├── 07-mutable-references.ts
│   ├── 08-modules.ts
│   ├── 09-error-handling.ts
│   ├── 10-javascript-interop.ts
│   ├── 11-stdlib.ts
│   └── 12-compilation.ts
└── tsconfig.json
```

## How It Works

### Test Registration

Tests register themselves via side-effect imports in `run.ts`. Each section file calls `test()` from the runner, which pushes tests into a global array. All execution is **synchronous** — no async/await anywhere.

```typescript
import { test } from "../framework/runner.ts";

const S = "04-expressions";

test(S, "04-expressions/operators.md", "integer addition", () =>
    expectRunOutput(withOutput(`let x = 1 + 2;`, `String.fromInt(x)`), "3")
);
```

The `test()` function takes four arguments:
1. **section** — section identifier string (e.g., `"04-expressions"`)
2. **specRef** — path to the relevant spec document (e.g., `"04-expressions/operators.md"`)
3. **name** — human-readable test name
4. **run** — synchronous function returning `TestResult` (`{ status: "pass" | "fail" | "error", message?: string }`)

### CLI Invocation

All tests run `.vf` code through the actual compiler CLI (`packages/cli/dist/index.js`) using `spawnSync`. The CLI **must be built first** (`pnpm run build`). Key settings:
- Timeout: 30 seconds
- Environment: `NO_COLOR=1` to disable ANSI codes
- Infrastructure errors (process timeout, signal kill) throw exceptions, which the runner catches and records as `"error"` status

### Three-Way Test Status

| Status | Meaning | Exit code impact |
|--------|---------|-----------------|
| `pass` | Feature works as specified | None |
| `fail` | Feature doesn't match spec (expected for incomplete features) | None |
| `error` | Test framework / infrastructure failure | Causes exit code 1 |

The runner exits 0 even when tests fail — failures represent unimplemented features, which is normal. Only `error` status (infrastructure problems) causes a non-zero exit.

## Assertion Helpers

All are in `framework/helpers.ts`. Each returns a `TestResult`.

| Helper | What it checks |
|--------|---------------|
| `expectCompiles(source)` | Source compiles successfully (exit 0) |
| `expectCompileError(source, errorCode?)` | Compilation fails (exit 1), optionally with specific error code in stderr |
| `expectRunOutput(source, expected)` | Compiles, runs, stdout matches `expected` (both trimmed, exact match) |
| `expectRuntimeError(source, errorMsg?)` | Compiles successfully, then fails at runtime. Optionally checks stderr for message |
| `expectRuns(source)` | Compiles and runs without error (output ignored) |

### Output Wrapping

Vibefun has no built-in print statement. To test runtime output, use `withOutput` / `withOutputs` which inject `console_log` via FFI:

```typescript
// Single output
withOutput(`let x = 42;`, `String.fromInt(x)`)
// Produces:
//   external console_log: (String) -> Unit = "console.log";
//   let x = 42;
//   let _ = unsafe { console_log(String.fromInt(x)) };

// Multiple outputs
withOutputs(`let x = 1; let y = 2;`, [`String.fromInt(x)`, `String.fromInt(y)`])
// Each expression gets its own console_log line
```

The output expression must produce a `String`. Use `String.fromInt(...)`, `String.fromFloat(...)`, etc. as needed.

### Multi-File Tests (Modules)

Section `08-modules.ts` defines a local `moduleTest` helper that manages temp directories:

```typescript
function moduleTest(
    files: Record<string, string>,  // relative path -> file content
    mainFile: string,                // which file to compile/run
    check: "compiles" | "runs" | "output",
    expected?: string,               // expected stdout for "output" check
): TestResult
```

It uses `createTempDir()`, `writeTempFile()`, and `cleanupTempDir()` from the helpers. The temp directory is always cleaned up via `finally`.

## Running Tests

```bash
pnpm run spec:validate                              # Run all tests
pnpm run spec:validate -- --verbose                  # Show per-test results
pnpm run spec:validate -- --section 03-type-system   # Single section
pnpm run spec:validate -- --filter "pattern match"   # Filter by name (case-insensitive)
pnpm run spec:validate -- --markdown                 # Markdown output for CI
pnpm run spec:validate -- --report ./reports         # Write summary.txt, details.json, report.md
```

## Writing New Tests

### Adding tests to an existing section

Add `test()` calls to the appropriate section file. Follow the existing pattern:

```typescript
test(S, "XX-section/relevant-doc.md", "descriptive test name", () =>
    expectRunOutput(
        withOutput(`let result = someFeature();`, `String.fromInt(result)`),
        "expected output"
    )
);
```

### Adding a new section

1. Create `sections/XX-new-section.ts`
2. Add a side-effect import in `run.ts`: `import "./sections/XX-new-section.ts";`

### Key rules

- **No test skipping.** Every test either passes or fails. Failures are signal, not noise.
- **Minimize feature dependencies.** Each test should use only the features it's validating plus the bare minimum needed to run. If an unrelated broken feature causes a test to fail, rewrite the test to avoid it.
- **Tests are synchronous.** The `run` function must return `TestResult` directly, not a Promise.
- **All `.vf` code goes through the CLI.** Never import compiler internals — this suite tests the full pipeline.
- **Build first.** The CLI must be compiled (`pnpm run build`) before running spec validation.
