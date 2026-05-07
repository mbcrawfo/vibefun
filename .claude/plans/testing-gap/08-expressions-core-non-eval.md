# Chunk 08 — Expressions core (non-evaluation-order gaps)

## Context

Section 04a is the second-largest cluster (24 testing gaps). This chunk closes the **non-evaluation-order** subset: partial application, division-by-zero, chained comparisons, deref/NOT disambiguation, field access, pipe, cons, composition, if short-circuit, match guards, while loop type errors, try/catch in unsafe. Chunk 09 closes the evaluation-order subset.

Closes: 04a F-08, F-15, F-23, F-26, F-28, F-29, F-30, F-31, F-36, F-38, F-40, F-43.

## Spec under test

- `docs/spec/04-expressions/01-basic-expressions.md` — partial application, division semantics, chained comparisons.
- `docs/spec/04-expressions/02-control-flow.md` — if short-circuit, match guards, while loop typing, try/catch in unsafe.
- `docs/spec/04-expressions/03-operators.md` — `!` deref vs NOT, field access, pipe `|>`, cons `::`, composition `>>`/`<<`.

## Pre-flight orphan check

- `tests/e2e/spec-validation/04-expressions.test.ts` — read first to identify existing cases.
- `packages/core/src/desugarer/desugarer-integration.test.ts` (orphan) — covers pipe/composition desugaring; this chunk's V-layer cases are additive, not duplicative.
- `packages/core/src/typechecker/division-lowering.test.ts` (orphan) — covers division typing; F-15 here is V-layer runtime, distinct.

## Coverage baseline

```bash
pnpm run test:coverage
```

## Implementation steps

All tests go in `tests/e2e/spec-validation/04-expressions.test.ts` (Layer: V), unless noted.

1. **F-08 partial application**:
   ```typescript
   it("supports partial application via currying", () => {
       expectRunOutput(
           withOutput("let add = (a) => (b) => a + b; let add5 = add(5);", "Int.toString(add5(3))"),
           "8",
       );
   });
   ```
2. **F-15 division by zero (runtime panic)** — `expectRuntimeError("...let x = 10 / 0; ...")`. Assert the error message contains the spec-defined panic phrase (read `09-error-handling.md` for exact wording).
3. **F-23 chained comparisons** — `expectCompileError("let x = 5; let r = 1 < x < 10;")`. Asserts the typechecker rejects `1 < x < 10` (parse may succeed; the type error is the contract). Spec citation: 04a says chained comparisons are disallowed.
4. **F-26 NOT vs deref** — already partially covered in chunk 06 F-38; here the focus is on cross-validating in section 04. Add one case: `let r = ref(true); !(!r)` — outer `!` is logical NOT on Bool, inner `!` is deref.
5. **F-28 field access** — `let p = { x: 1, y: 2 }; p.x` round-trip; chained `r.a.b` for nested record.
6. **F-29 pipe operator runtime** — `5 |> Int.toString` produces `"5"`. (Audit notes desugarer-tested but no V.)
7. **F-30 cons operator** — `1 :: [2, 3]` produces `[1, 2, 3]` (use `List.length` and head check).
8. **F-31 composition `>>`/`<<`**:
   ```typescript
   it("composes functions left-to-right with >>", () => {
       expectRunOutput(
           withOutput("let inc = (x) => x + 1; let double = (x) => x * 2; let f = inc >> double;", "Int.toString(f(3))"),
           "8",
       );
   });
   ```
   And the mirror for `<<`.
9. **F-36 if short-circuit (with side effects)** — Use a ref counter:
   ```typescript
   it("only evaluates the taken branch of an if expression", () => {
       expectRunOutput(
           withOutput(
               "let counter = ref(0); let _r = if true then unsafe { counter := !counter + 1 } else unsafe { counter := !counter + 100 };",
               "Int.toString(!counter)",
           ),
           "1",
       );
   });
   ```
10. **F-38 match guards** — `match x { | n when n > 0 => "pos" | _ => "nonpos" }` for x=5 and x=-3.
11. **F-40 while loop type errors** — two cases:
    - `expectCompileError("let _ = while 42 { () };")` (condition must be Bool)
    - `expectCompileError("let _ = while true { 42; };")` (body must be Unit if not the last expr — verify exact spec; the audit says body must produce Unit)
    - The audit suggests both; check spec wording on body type before asserting.
12. **F-43 try/catch in unsafe** — single E2E:
    ```typescript
    it("supports try/catch inside an unsafe block", () => {
        expectRunOutput(
            withOutput(
                'external js_throw: () -> Unit = "(() => { throw new Error(\\"x\\"); })";\nlet _r = unsafe { try { js_throw() } catch (e) { () } };',
                '"caught"',
            ),
            "caught",
        );
    });
    ```
    (Adjust to the actual try/catch syntax in the spec; this chunk should compile + run successfully.)

## Behavior expectations (for bug-triage)

- F-15 division: spec at `09-error-handling.md` defines a specific Error message. If runtime emits a different message, file the wording bug.
- F-23 chained comparison: parser may currently accept the syntax (associating left-to-right giving `(1 < x) < 10`, type error from comparing Bool with Int). The test asserts an error code emerges; if it compiles cleanly, the typechecker has a soundness gap.
- F-31 `>>` direction: spec defines `f >> g` as "first f then g". If `(inc >> double)(3) === 7` instead of `8`, composition is reversed.
- F-36 short-circuit: if both branches' side effects fire, the codegen is treating `if` as eager — file a bug.

## If a test reveals a bug

Tests-only PR. Find → file → hold.

## Verification

- `pnpm run verify`
- `pnpm run test:coverage` ≥ baseline

## Out of scope

- Evaluation-order assertions (F-44 onward) — chunk 09.
- Pipe and composition precedence interactions — chunk 16.
