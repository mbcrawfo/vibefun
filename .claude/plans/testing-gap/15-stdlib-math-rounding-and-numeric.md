# Chunk 15 — Math rounding + numeric stdlib

## Context

Closes the remaining `11b-stdlib-extra.md` gaps not covered by chunk 14: rounding family (round/floor/ceil/trunc), sign, min/max, random, plus Int.toString safe-integer property and Float.toString V-validation.

Closes: 11b F-01, F-06, F-30, F-31, F-32, F-33, F-35, F-36, F-37, F-38.

## Spec under test

- `docs/spec/11-stdlib/math.md` — round/floor/ceil/trunc/sign/min/max/random.
- `docs/spec/11-stdlib/numeric.md` — Int.toString, Float.toString.

## Pre-flight orphan check

- `packages/stdlib/src/math.test.ts`, `int.test.ts`, `float.test.ts` — verify what's already covered. Audit notes only single fixed-example or property coverage for several.

## Coverage baseline

```bash
pnpm run test:coverage
```

## Implementation steps

### Numeric — Int / Float toString

1. **`packages/stdlib/src/int.test.ts`** (extend) — Layer: P.
   - F-01: property over safe-integer range `fc.integer({ min: Number.MIN_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER })`. Assert `Int.toString(n)` round-trips through `parseInt` to the same `n`.
2. **`tests/e2e/spec-validation/11-stdlib.test.ts`** (extend) — Layer: V.
   - F-06 Float.toString deterministic format: V-layer case asserting `Float.toString(1.5)` produces a consistent string (e.g., `"1.5"`). Avoid testing platform-dependent precision; just deterministic for fixed inputs.

### Math rounding

3. **`packages/stdlib/src/math.test.ts`** (extend) — Layer: U.
   - F-30 round (Float→Float): `Math.round(0.5)`, `Math.round(1.5)`, `Math.round(-0.5)`. **Verify spec wording on banker's rounding vs. always-up** before asserting; behaviour at .5 differs across libraries.
   - F-31 floor: `Math.floor(-0.0)`, `Math.floor(2.0)` (integer values), `Math.floor(1e15)` (large values). Assert returns Float type (not Int).
   - F-32 ceil: same shape as floor.
   - F-33 trunc: `Math.trunc(1.7)` === 1; `Math.trunc(-1.7)` === -1.
   - F-35 sign: `Math.sign(-3.14)` === -1; `Math.sign(0)` === 0; `Math.sign(2.5)` === 1. (Spec must define `sign(0)` — may be 0 or +0 depending; verify.)

### Math V-layer

4. **`tests/e2e/spec-validation/11-stdlib.test.ts`** (extend) — Layer: V.
   - F-30–F-35 V mirrors: one specific value per function through the stdlib import.
   - F-36 min: `Math.min(2.5)(1.0)` (curried) === 1.0.
   - F-37 max: `Math.max(2.5)(1.0)` === 2.5.
   - F-38 random:
     ```typescript
     it("Math.random produces values in [0, 1)", () => {
         expectRunOutput(
             withOutputs(
                 'let a = unsafe { Math.random() }; let b = unsafe { Math.random() };',
                 ["if a >= 0.0 && a < 1.0 then \"a-ok\" else \"a-bad\"", "if b >= 0.0 && b < 1.0 then \"b-ok\" else \"b-bad\""],
             ),
             "a-ok\nb-ok",
         );
     });
     ```
     Best-effort assertion (random can theoretically hit boundary on a billion runs, but the [0,1) contract per spec means our test is correct even if practically rare).

## Behavior expectations (for bug-triage)

- F-30 round: if .5-rounding direction disagrees with spec, file a bug. Don't relax the assertion to "either direction is fine."
- F-31/F-32 type: if `Math.floor(2.0)` returns Int, the stdlib has narrowed the return type below spec (Float→Float). File a bug.
- F-38 random: if either output is out of `[0, 1)`, either the FFI binding to JS's `Math.random` is wrong (returning something else) or spec contract differs.

## If a test reveals a bug

Tests-only PR. Find → file → hold.

## Verification

- `pnpm run verify`
- `pnpm run test:coverage` ≥ baseline
- For F-01 property: `FC_NUM_RUNS=1000 FC_SEED=random pnpm test`

## Out of scope

- Math.pi/e (chunk 14)
- Trig + log/exp/pow/sqrt (chunk 14)
- New Math functions not yet in spec (none flagged)
