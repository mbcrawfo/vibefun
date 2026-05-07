# Chunk 14 — Stdlib core (List, String) + Math (pi/e + trig + log/exp/pow/sqrt)

## Context

Closes 11a String/List edge cases and 11b Math constants/transcendentals. The Math trig + inverse functions (tan/asin/acos/atan/atan2) currently have **no tests at any layer** (audit's biggest single-section testing gap after 02 lexical).

Closes: 11a F-10, F-29, F-30, F-31, F-32; 11b F-15, F-16, F-17, F-18, F-19, F-20, F-21, F-22, F-23, F-24, F-25, F-26, F-27, F-28, F-29.

## Spec under test

- `docs/spec/11-stdlib/list.md` — `List.flatten`.
- `docs/spec/11-stdlib/string.md` — `split`, `contains`, `startsWith`, `endsWith` edge cases.
- `docs/spec/11-stdlib/math.md` — `pi`, `e`, trigonometric, inverse trigonometric, `exp`, `log`, `log10`, `log2`, `pow`, `sqrt`.

## Pre-flight orphan check

- `packages/stdlib/src/list.test.ts`, `string.test.ts`, `math.test.ts` (all orphan-listed) — read first. The audit's claim of "no tests for asin/acos/atan/tan" was confirmed in pre-plan exploration: `math.test.ts` only has Pythagorean identity for sin/cos and a single atan2 case.

## Coverage baseline

```bash
pnpm run test:coverage
```

## Implementation steps

### Stdlib core — small additions

1. **`packages/stdlib/src/list.test.ts`** (extend) — Layer: U.
   - F-10: `List.flatten([])` → `[]`; `List.flatten([[], []])` → `[]`; `List.flatten([[1], [2, 3]])` → `[1, 2, 3]`. (Spec note: flatten is **one level only**; nested levels are NOT flattened.)
2. **`packages/stdlib/src/string.test.ts`** (extend) — Layer: U.
   - F-29 split edge cases: `String.split("", ",")` → `[""]`; `String.split("hello", "")` → per-char split (verify spec).
   - F-30 contains: `String.contains("hello", "")` → `true`.
   - F-31 startsWith: `String.startsWith("hi", "")` → `true`; `String.startsWith("hi", "hello")` → `false`.
   - F-32 endsWith: same shape.

### Math — constants and analytic functions

3. **`packages/stdlib/src/math.test.ts`** (extend) — Layer: U + P.
   - F-17 sin: `Math.sin(0)` ≈ 0; `Math.sin(Math.pi / 2)` ≈ 1 (within 1e-10).
   - F-18 cos: `Math.cos(0)` ≈ 1; `Math.cos(Math.pi)` ≈ -1.
   - F-19 tan: `Math.tan(0)` ≈ 0; property test `tan(x) ≈ sin(x) / cos(x)` for `x ∈ (-π/4, π/4)` (avoid asymptotes).
   - F-20 asin: property `asin(sin(x)) ≈ x` for `x ∈ [-π/2, π/2]`.
   - F-21 acos: property `acos(cos(x)) ≈ x` for `x ∈ [0, π]`.
   - F-22 atan: property `atan(tan(x)) ≈ x` for `x ∈ (-π/2, π/2)`.
   - F-23 atan2: quadrant tests — `atan2(0, 1)` ≈ 0; `atan2(1, 0)` ≈ π/2; `atan2(0, -1)` ≈ π; `atan2(-1, 0)` ≈ -π/2. Plus property: `atan2(sin(θ), cos(θ)) ≈ θ` for `θ ∈ (-π, π)`.
   - F-24 exp: `Math.exp(0)` === 1; `Math.exp(1)` ≈ Math.e.
   - F-25 log: `Math.log(1)` === 0; `Math.log(Math.e)` ≈ 1.
   - F-26 log10: `Math.log10(1)` === 0; `Math.log10(100)` ≈ 2.
   - F-27 log2: `Math.log2(1)` === 0; `Math.log2(8)` ≈ 3.

### V-layer for Math

4. **`tests/e2e/spec-validation/11-stdlib.test.ts`** (extend) — Layer: V.
   - F-15 pi: program using `Math.pi` in a computation (e.g., circle area), assert known value.
   - F-16 e: program using `Math.e` (e.g., `Math.log(Math.e)`).
   - F-17–F-23: V-layer mirrors of the unit assertions for at least one specific value per function (sin, cos, tan, asin, acos, atan, atan2). Don't duplicate property tests at V-layer; the V test asserts the function is wired through the stdlib import.
   - F-24–F-27: V-layer mirrors of exp/log/log10/log2 for one value each.
   - F-28 pow: `Math.pow(2)(10)` === 1024 (curried).
   - F-29 sqrt: `Math.sqrt(2)` ≈ 1.414.

## Behavior expectations (for bug-triage)

- F-22 atan property: `atan(tan(x))` is numerically unstable near ±π/2. Use `x ∈ [-π/2 + 0.1, π/2 - 0.1]` and tolerance ≈ 1e-10. If failure persists, the Vibefun stdlib's atan is delegating to a non-standard implementation; check that `Math.atan` aliases `Math.atan` from JS.
- F-23 atan2 quadrant: if any quadrant returns a wrong value, the stdlib's atan2 likely has its arguments swapped relative to JS's convention. Spec must define the order (`atan2(y, x)` per math convention vs. `atan2(x, y)`); the test enforces whichever the spec specifies.
- F-29 String.split with empty separator: spec must define behaviour (per-char, error, or no-op). Read it; assert accordingly.

## If a test reveals a bug

Tests-only PR. Find → file → hold.

## Verification

- `pnpm run verify`
- `pnpm run test:coverage` ≥ baseline
- For all property tests added: `FC_NUM_RUNS=1000 FC_SEED=random pnpm test`

## Out of scope

- Math.round/floor/ceil/trunc/sign/min/max/random — chunk 15.
- Int.toString / Float.toString — chunk 15.
