# Chunk 07 — Types core and composite

## Context

Closes a small cluster of type-system testing gaps in `03a-types-core.md` and `03b-types-composite.md`: list element type homogeneity, complex tuple shapes, deeply nested tuple destructuring, tuple error message wording, literal-union annotations, keyword-as-record-field, variant constructor partial application, standalone union types, and function type variance.

Closes: 03a F-10, F-13, F-15, F-21, F-46; 03b F-05, F-09, F-13, F-19.

## Spec under test

- `docs/spec/03-type-system/01-primitives-and-tuples.md` — list homogeneity, tuple shapes.
- `docs/spec/03-type-system/03-records-and-variants.md` — keyword field names, variant constructor functions.
- `docs/spec/03-type-system/06-unions-and-recursion.md` — string-literal type annotations and variant union types.
- `docs/spec/03-type-system/04-error-reporting.md` — error message wording for arity/order mismatch on tuples.
- `docs/spec/03-type-system/05-subtyping-and-variance.md` — function-type variance (or lack thereof).

## Pre-flight orphan check

- `packages/core/src/typechecker/infer-records.test.ts`, `infer-primitives.test.ts`, `patterns-checking.test.ts` — verify which gaps already have implicit coverage.
- `packages/core/src/parser/types-parser.test.ts` (if exists) for parsing-only assertions.

## Coverage baseline

```bash
pnpm run test:coverage
```

## Implementation steps

1. **`packages/core/src/typechecker/infer-primitives.test.ts`** (extend) — Layer: U.
   - F-10 (03a): typecheck `[1, 2.0, 3]` and assert TypeMismatch (likely VF4001 or VF4020). Reference spec: list elements share a single homogeneous type.
   - F-13 (03a): typecheck `let p: ((Int, String), (Bool, Float)) = ((1, "a"), (true, 2.5));` and assert success; then a mismatched-shape variant and assert error.
2. **`packages/core/src/typechecker/patterns-checking.test.ts`** (extend) — Layer: U.
   - F-15 (03a): pattern `((a, b), (c, (d, e)))` against value of matching shape; assert all five binders take primitive types correctly. Add property test (Layer: P) over generated nested-tuple patterns up to depth 5 asserting pattern-binding is consistent with type inference.
3. **`tests/e2e/spec-validation/03-type-system.test.ts`** (extend) — Layer: V.
   - F-10, F-13, F-15: end-to-end equivalents of the unit assertions above (compile + run with `console_log`).
   - F-21 (03a): compile `let p: (String, Int) = (1, "x");` and assert error message contains the substring `(Int, String)` and `(String, Int)` (the exact wording is in the spec). If wording differs, **the message format spec is the contract** — file a bug if code disagrees.
   - F-46 (03a): typecheck literal-union annotation `let s: "yes" | "no" = "maybe";` and assert error.
   - F-05 (03b): construct and access a record with a keyword field: `let r = { type: "foo" }; r.type` round-trip through V layer.
   - F-13 (03b): standalone union type — `type Color = | Red | Green | Blue` and assert pattern matching across the union compiles.
   - F-19 (03b): function type variance — declare `type FromP3D = (Point3D) -> Int; type FromP2D = (Point2D) -> Int;` then attempt `let g: FromP3D = (someP2DFn);` and assert TypeMismatch even when width subtyping would allow `Point3D <: Point2D` at call sites. (Spec says functions are invariant in arg position.)
4. **`packages/core/src/typechecker/constraints.test.ts`** (extend) — Layer: U.
   - F-09 (03b): partial variant application — typecheck `let f = Rectangle(3.14); f(2.0)` and assert the inferred type of `f` is `(Float) -> Shape` (or whatever the variant's curried signature is). The audit specifies this is currently untested at U-level despite being in the variant constructor spec.

## Behavior expectations (for bug-triage)

- F-21 message wording: the **spec is the contract**. If the test reveals the actual message uses different separators or capitalisation than the spec, file a bug against the implementation — the test asserts the spec text. If you believe the spec wording is wrong, do not silently match implementation; open a separate spec-clarification ticket and pause the chunk until that resolves.
- F-19 variance: if function types unify too liberally, type system is unsound. File a bug; do NOT weaken the test to match implementation.
- F-09 partial variant: if `f` infers to `Shape` instead of `(Float) -> Shape`, the desugarer/typechecker isn't curryifying variant constructors per spec. File a bug.

## If a test reveals a bug

Tests-only PR. Find → file → hold.

## Verification

- `pnpm run verify`
- `pnpm run test:coverage` ≥ baseline
- For F-15 property test: `FC_NUM_RUNS=1000 FC_SEED=random pnpm test`

## Out of scope

- Recursive type aliases (03a F-NN partial) — that's a feature-gap entry in `feature-gaps.md`, not a testing gap.
- Subtyping rules beyond function variance — would require a wider spec-validation matrix; out of scope here.
