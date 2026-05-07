# Chunk 03 — Per-VFxxxx factory tests, batch 1 (typechecker codes VF4001–VF4205)

## Context

The audit's 03c F-22/F-23/F-24/F-25 entries note that the typechecker codes VF4001–VF4205 are tested *via E2E and integration paths* but lack **per-code factory tests** — direct assertions that `createDiagnostic("VF4xxx", loc, params)` produces the correct `code`, `severity`, formatted message, and hint per its `DiagnosticDefinition`. Without these, a regression that flips two adjacent codes' templates wouldn't be caught until it surfaced in an unrelated E2E.

This chunk covers ~46 codes in four files: type-mismatch (`mismatch.ts`), unification (`unification.ts`), undefined (`undefined.ts`), arity (`arity.ts`).

Closes 03c F-22, F-23, F-24, F-25.

## Spec under test

- `packages/core/src/diagnostics/codes/typechecker/mismatch.ts` — VF4001–VF4018 (TypeMismatch family).
- `packages/core/src/diagnostics/codes/typechecker/unification.ts` — VF4020–VF4027 (UnificationFailure, RecursiveTypeAlias, etc.).
- `packages/core/src/diagnostics/codes/typechecker/undefined.ts` — VF4100–VF4103 (UndefinedVariable, UndefinedType, etc.).
- `packages/core/src/diagnostics/codes/typechecker/arity.ts` — VF4200–VF4205 (Arity codes).

Each `DiagnosticDefinition` is the spec for its code: `title`, `severity`, `messageTemplate`, optional `hintTemplate`, `relatedCodes`. The factory test asserts the definition is faithfully rendered.

## Pre-flight orphan check

- `packages/core/src/diagnostics/factory.test.ts` (orphan) — already covers factory mechanics generically. Read it first; this chunk adds **per-code** tests, not duplicates of the generic shape. If `factory.test.ts` already iterates the registry and asserts a property like "every code produces a non-empty message", the new tests should be value-asserting (exact strings / regex), not shape-asserting.
- Existing per-code coverage may exist as side-effect of E2E tests in `tests/e2e/spec-validation/03-type-system.test.ts`. Those don't replace per-code unit tests, but list them in the PR description so reviewers know overlap exists.

## Coverage baseline

```bash
pnpm run test:coverage
# Record in PR
```

## Implementation steps

Use a uniform per-code test pattern. **Strict uniformity is critical** — reviewers will skim ~46 cases.

For each code in `mismatch.ts`, `unification.ts`, `undefined.ts`, `arity.ts`:

1. Build the `params` object from the `messageTemplate` placeholders (use minimal but realistic values — a concrete `Type` instance, a known identifier name, a plausible Location).
2. Call `createDiagnostic("VF<code>", loc, params)`.
3. Assert: `result.code === "VF<code>"`, `result.severity === <expected>`, `result.message === <expected formatted string>`, and (if `hintTemplate` defined) `result.hint === <expected formatted string>`.

### File layout

- `packages/core/src/diagnostics/codes/typechecker/mismatch.test.ts` (new) — VF4001 through VF4018 (~18 codes × ~6 LOC each = ~120 LOC + scaffolding).
- `packages/core/src/diagnostics/codes/typechecker/unification.test.ts` (new) — VF4020 through VF4027 (~8 codes).
- `packages/core/src/diagnostics/codes/typechecker/undefined.test.ts` (new) — VF4100 through VF4103 (~4 codes).
- `packages/core/src/diagnostics/codes/typechecker/arity.test.ts` (new) — VF4200 through VF4205 (~6 codes).

### Uniform test name shape

```typescript
describe("VF<code> — <title>", () => {
    it("produces the expected diagnostic", () => {
        const diag = createDiagnostic("VF<code>", loc, params);
        expect(diag).toMatchObject({ code: "VF<code>", severity: "<sev>" });
        expect(diag.message).toBe("<expected>");
        expect(diag.hint).toBe("<expected>"); // omit if no hintTemplate
    });
});
```

## Behavior expectations (for bug-triage)

- If a `message` assertion fails on first run, either the hardcoded expected string is wrong (typo in test) OR the `messageTemplate` produces a different formatting than its docs claim. Compare the test value to the actual rendered output; if the rendered output disagrees with `docs/errors/VF<code>.md`, file a bug — the message is the user-facing contract.
- If a `severity` assertion fails, someone changed a code's severity without updating the test — verify against `codes/README.md`.
- If `code` doesn't match, the registry has the code under a different definition object — likely a copy-paste error in the codes file.

## If a test reveals a bug

Tests-only PR. Find → file → hold the chunk. Do not "fix" by changing the expected string in the test to match buggy output.

## Verification

- `pnpm run verify`
- `pnpm run test:coverage` ≥ baseline
- Visual review: every test in the new files has the same shape. Diff against the template above.

## Out of scope

- VF4300–VF4806 — chunk 04.
- VF4900 unreachable-pattern emission — feature gap (route elsewhere).
- Lexer (VF1xxx), parser (VF2xxx), desugarer (VF3xxx), modules (VF5xxx) per-code factory tests — not in audit testing-gap scope (audit treats them as "structurally tested" with adequate per-code coverage already).
