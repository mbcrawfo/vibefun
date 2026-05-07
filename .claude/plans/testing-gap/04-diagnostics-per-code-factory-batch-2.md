# Chunk 04 — Per-VFxxxx factory tests, batch 2 (VF4300–VF4806)

## Context

Continuation of chunk 03. Same pattern, applied to the remaining typechecker code groups.

Closes 03c F-26, F-27, F-28, F-29, F-30, F-31.

## Spec under test

- `packages/core/src/diagnostics/codes/typechecker/infinite.ts` — VF4300 (InfiniteType / occurs-check), VF4301 (RecursiveTypeAlias).
- `packages/core/src/diagnostics/codes/typechecker/pattern.ts` — VF4400–VF4405 (pattern matching).
- `packages/core/src/diagnostics/codes/typechecker/record.ts` — VF4500–VF4504 (record errors).
- `packages/core/src/diagnostics/codes/typechecker/variant.ts` — VF4600–VF4602 (variant errors).
- `packages/core/src/diagnostics/codes/typechecker/polymorphism.ts` — VF4700 (ValueRestriction), VF4701 (TypeEscape).
- `packages/core/src/diagnostics/codes/typechecker/ffi.ts` — VF4800, VF4801, VF4802, VF4803, VF4805, VF4806. (VF4804 is for not-yet-implemented overload resolution; still factory-test it, since it's a registered code.)

## Pre-flight orphan check

Same as chunk 03: `factory.test.ts` covers generic shape; per-code tests are value-asserting additions. Verify orphan tests don't already cover specific codes:
- VF4300/4301: `unification.test.ts` and `recursive-type-aliases.test.ts` may exercise these — but **integration coverage isn't a substitute for a factory test**.
- VF4801/4802/4803: `environment.test.ts` (orphan) **does** exercise emission via `buildEnvironment` (verified in pre-plan exploration: `expect(() => buildEnvironment(module)).toThrow(/VF4801/)` etc.). Audit's "never thrown" claim is false; chunk closes the U-layer factory gap, the V-layer gap is in chunk 13.

## Coverage baseline

```bash
pnpm run test:coverage
```

## Implementation steps

Use the same uniform pattern as chunk 03.

### File layout (~25 codes total)

- `packages/core/src/diagnostics/codes/typechecker/infinite.test.ts` (new) — VF4300, VF4301 (~2 codes).
- `packages/core/src/diagnostics/codes/typechecker/pattern.test.ts` (new) — VF4400–VF4405 (~6 codes).
- `packages/core/src/diagnostics/codes/typechecker/record.test.ts` (new) — VF4500–VF4504 (~5 codes).
- `packages/core/src/diagnostics/codes/typechecker/variant.test.ts` (new) — VF4600–VF4602 (~3 codes).
- `packages/core/src/diagnostics/codes/typechecker/polymorphism.test.ts` (new) — VF4700, VF4701 (~2 codes).
- `packages/core/src/diagnostics/codes/typechecker/ffi.test.ts` (new) — VF4800–VF4806 (~7 codes; the audit notes VF4800/4801/4802/4803/4804 are "never asserted" — at U-layer factory level this chunk closes that).

Same test pattern as chunk 03. Strict uniformity.

## Behavior expectations (for bug-triage)

- VF4701 TypeEscape: the audit notes this is "never asserted." If the factory test passes (the *factory* renders correctly) but no integration test triggers the code, that's fine for this chunk — emission coverage is chunk 12/13's job. If a code can't be factory-tested because `params` is not knowable from the definition alone, file a clarification bug against `codes/typechecker/<file>.ts`.
- VF4804: the definition explicitly says "not yet supported." Factory-test the rendered text but do NOT add an emission test in this chunk.
- VF4900 unreachable warning is excluded: it's a feature gap (warning registered but never produced). See Step 0 addendum.

## If a test reveals a bug

Tests-only PR. Find → file → hold.

## Verification

- `pnpm run verify`
- `pnpm run test:coverage` ≥ baseline
- After both batches (03 and 04) merge: total per-code factory test count should equal the count of typechecker codes registered.

## Out of scope

- Spec-validation V-layer assertions for these codes — partly covered by other section chunks (e.g., FFI VF4801–4803 V-layer in chunk 13).
- Multi-error reporting test (03c F-04) — feature gap.
