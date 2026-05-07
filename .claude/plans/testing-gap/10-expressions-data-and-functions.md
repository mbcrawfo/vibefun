# Chunk 10 — Expressions: data literals & functions

## Context

Closes the `04b-expressions-data-fns.md` testing gaps: record field shorthand inference, keyword-as-record-field round-trip, empty-list value restriction, cons as standalone expression, multi-line list, lambda type annotations / destructuring / non-recursion, operator section rejection, block sequential execution.

Closes: 04b F-04, F-05, F-07, F-09, F-10, F-15, F-16, F-17, F-18, F-22.

## Spec under test

- `docs/spec/04-expressions/05-data-literals.md` — record shorthand, keyword fields, empty list.
- `docs/spec/04-expressions/06-functions.md` — lambdas, destructuring params, recursion restriction, operator-section absence, block semantics.

## Pre-flight orphan check

- `tests/e2e/spec-validation/04-expressions.test.ts` — read first; some lambda cases may already exist.
- `packages/core/src/typechecker/infer-bindings-basic.test.ts`, `infer-records.test.ts` — covers some shorthand inference; this chunk's V cases are additive.

## Coverage baseline

```bash
pnpm run test:coverage
```

## Implementation steps

1. **`packages/core/src/typechecker/infer-records.test.ts`** (extend) — Layer: U.
   - F-04: typecheck `let x = 5; let r = { x };` and assert `r.x : Int`.
2. **`tests/e2e/spec-validation/04-expressions.test.ts`** (extend) — Layer: V.
   - F-04: end-to-end shorthand round-trip.
   - F-05: `let r = { type: "foo" }; r.type` → `"foo"`. Same as 03b F-05 but in this section's V file (per audit's explicit V-layer tag here).
   - F-07: `let xs = [];` should be monomorphic — assert `let xs = []; let _ = xs : List<Int>; let _ = xs : List<String>` produces a TypeMismatch on the second annotation (value restriction prevents generalisation).
   - F-09: `let xs = 1 :: [2, 3];` — assert runs and produces `[1, 2, 3]`.
   - F-10: multi-line list literal:
     ```vibefun
     let xs = [
       1,
       2,
       3,
     ];
     ```
     Assert compiles and `List.length(xs) === 3`.
   - F-15: lambda type annotation enforcement — `expectCompileError("let f = (x: Int) => x; let _ = f(\"a\");")`.
   - F-16: lambda destructuring param — `let f = ({x, y}) => x + y; f({x: 1, y: 2})` runs, returns 3.
   - F-17: lambda recursion rejection — `let fact = (n) => if n == 0 then 1 else n * fact(n - 1);` should fail with "fact undefined" (lambdas don't see their own binding; only `let rec` does). `expectCompileError`.
   - F-18: operator section — `expectCompileError("let inc = (+ 1);");` and `expectCompileError("let plus = (+);");`. Assert specific parse error.
   - F-22: block sequential — `{ let _ = unsafe { console_log("a") }; let _ = unsafe { console_log("b") }; () }` prints `a\nb` in order.
3. **`packages/core/src/typechecker/infer-bindings-basic.test.ts`** (extend) — Layer: U.
   - F-17: assert that `(n) => fact(n - 1)` typechecks against an outer `fact` (lambda recursion via outer binding works), but the **let-bound lambda** does NOT see itself — exact form per spec.
   - F-18: parser-level rejection of `(+)` and `(+ 1)` (use parser-level test, not typechecker).

## Behavior expectations (for bug-triage)

- F-07 value restriction: if `let xs = [];` accepts a polymorphic type, soundness is broken. File a bug.
- F-15: if `f("a")` runs without a type error, the lambda annotation is being ignored — bug.
- F-17: if a let-bound lambda **does** see itself, that's either a feature change (lambdas became implicitly `let rec`) or a bug. Spec mandates explicit `let rec`. File a bug.
- F-18: spec explicitly disallows operator sections. If parser accepts, file a bug.

## If a test reveals a bug

Tests-only PR. Find → file → hold.

## Verification

- `pnpm run verify`
- `pnpm run test:coverage` ≥ baseline

## Out of scope

- `let rec` recursion (the working alternative to F-17) — not flagged as a gap.
- Currying mechanics — covered by 06-functions section.
