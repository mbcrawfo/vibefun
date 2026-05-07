# Chunk 11 — Patterns, functions, and mutable references

## Context

Closes small clusters in three sections: pattern matching depth/exhaustiveness/or-pattern types (05); arity messages, polymorphic recursion, name shadowing (06); composite refs, ref-pattern-matching error, mutable rebinding (07).

Closes: 05 F-28, F-35, F-51; 06 F-06, F-21, F-24; 07 F-10, F-11, F-14.

## Spec under test

- `docs/spec/05-pattern-matching/02-patterns.md` — pattern depth, or-patterns.
- `docs/spec/05-pattern-matching/04-exhaustiveness.md` — tuple exhaustiveness rules (the audit notes a Phase 5.1 limitation: pairwise non-exhaustive tuples currently still require a catch-all).
- `docs/spec/06-functions.md` — arity validation, polymorphic recursion (forbidden), name shadowing.
- `docs/spec/07-mutable-references.md` — `Ref<T>` over composites, pattern matching on refs forbidden, `let mut` reassignment.

## Pre-flight orphan check

- `packages/core/src/typechecker/patterns-checking.test.ts`, `patterns-exhaustiveness.test.ts`, `infer-patterns.test.ts` — orphan tests covering pattern logic. Verify which gaps are already covered.
- `packages/core/src/typechecker/infer-bindings-recursive.test.ts` — likely covers some polymorphic recursion territory.

## Coverage baseline

```bash
pnpm run test:coverage
```

## Implementation steps

### Patterns (05)

1. **`packages/core/src/typechecker/patterns-checking.test.ts`** (extend) — Layer: P.
   - F-28: property test generating nested constructor patterns up to depth 12; assert each typechecks without crashing the typechecker. Reuse the AST arbitrary in `packages/core/src/types/test-arbitraries/core-ast-arb.ts` if it supports pattern generation; otherwise build a small focused arbitrary inline.
2. **`tests/e2e/spec-validation/05-pattern-matching.test.ts`** (extend) — Layer: V.
   - F-35: `match (a, b) { | (true, _) => 1 | (false, _) => 2 }` — assert this **compiles** without a non-exhaustiveness warning despite being pairwise non-exhaustive at the second component (audit: Phase 5.1 limitation; current spec accepts the catch-all on first component as sufficient). Test documents current spec behaviour.
3. **`packages/core/src/typechecker/patterns-checking.test.ts`** (extend) — Layer: U.
   - F-51: typecheck `match x { | 0 | "zero" => () | _ => () }` and assert TypeMismatch (or-pattern alternatives must unify in type).
   - V counterpart: `tests/e2e/spec-validation/05-pattern-matching.test.ts` `expectCompileError(...)`.

### Functions (06)

4. **`packages/core/src/typechecker/infer-bindings-basic.test.ts`** (extend) — Layer: U.
   - F-06: arity error wording. `let f = (a, b) => a + b; let _ = f(1);` — assert error message matches the spec wording (read `06-functions.md` for the exact phrasing). If wording differs, file a bug.
5. **`packages/core/src/typechecker/infer-bindings-recursive.test.ts`** (extend) — Layer: U.
   - F-21: polymorphic recursion rejection. Build a `let rec f = (xs) => f(List.map((x) => x, xs))` (or similar) where the recursive call instantiates the type parameter at a different type than the binding — assert unification failure.
6. **`tests/e2e/spec-validation/06-functions.test.ts`** (extend) — Layer: V.
   - F-21: V-layer counterpart of polymorphic recursion rejection.
   - F-24: name shadowing — `let x = 1; let f = (x) => x + 10; f(5)` returns 15. Inner `x` binding shadows outer.

### Mutable references (07)

7. **`packages/core/src/typechecker/infer-primitives.test.ts`** or new `infer-refs.test.ts` (extend / new) — Layer: U + I.
   - F-10: `Ref<{ x: Int }>` (record), `Ref<Some(Int)>` (variant), `List<Ref<Int>>` — typecheck each and assert structural type equality. Add integration test running each through the desugarer.
8. **`tests/e2e/spec-validation/07-mutable-references.test.ts`** (extend) — Layer: V.
   - F-11: `let r = ref(Some(5)); match r { | Some(x) => x | None => 0 }` — assert TypeMismatch (you can't pattern-match a Ref directly; must `!r` first). Document expected error code.
   - F-14: `let mut x = ref(0); x = ref(10);` should reassign the binding. Assert `!x === 10` after reassignment. (Note: `let mut` for non-ref is also valid; audit specifically tests rebinding to a new ref.)

## Behavior expectations (for bug-triage)

- F-35: if the test fails because typechecker rejects the pattern as non-exhaustive at the *second* tuple component, the exhaustiveness checker has been tightened beyond Phase 5.1 — in which case the spec needs updating to match (file a docs bug, not a code bug).
- F-51: or-pattern type unification — if `0 | "zero"` is accepted, the pattern type checker has a soundness gap.
- F-11: pattern matching on Ref directly should fail with a clear "Ref<T> is not pattern-matchable" or equivalent error. If it produces a generic TypeMismatch, the diagnostic is too vague — file a UX bug (low priority, code is correct in rejecting).
- F-14: if `x = ref(10)` produces "cannot reassign immutable binding", `let mut` is broken — file a bug.

## If a test reveals a bug

Tests-only PR. Find → file → hold.

## Verification

- `pnpm run verify`
- `pnpm run test:coverage` ≥ baseline
- For F-28 property: `FC_NUM_RUNS=1000 FC_SEED=random pnpm test`

## Out of scope

- Tuple exhaustiveness improvement (lifting the Phase 5.1 limitation) — feature work, not test work.
- Other 07 partials flagged as feature gaps (audit lists 2) — route elsewhere.
