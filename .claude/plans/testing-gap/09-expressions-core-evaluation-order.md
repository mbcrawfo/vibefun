# Chunk 09 — Expressions core: evaluation-order assertions

## Context

The spec promises strict left-to-right evaluation across function application, binary operators, record construction, list construction, blocks, pipes, and reference assignment. Most of these promises currently have **no test that demonstrates the order with observable side effects** (audit 04a F-44 through F-56). This chunk adds `ref` + `console_log` based ordering assertions to the spec-validation suite.

Closes: 04a F-44, F-45, F-46, F-49, F-50, F-51, F-52, F-54, F-55, F-56.

## Spec under test

- `docs/spec/04-expressions/04-evaluation-order.md` — left-to-right evaluation rules for each construct.

## Pre-flight orphan check

- `tests/e2e/spec-validation/04-expressions.test.ts` — verify which evaluation-order assertions already exist. Audit says none are explicitly side-effect-validated; spot-check before writing.

## Coverage baseline

```bash
pnpm run test:coverage
```

## Implementation steps

All tests go in `tests/e2e/spec-validation/04-expressions.test.ts` (Layer: V), under a new `describe("evaluation order")` block.

The pattern: build a `ref(0)` counter and a helper that increments-then-returns, then weave it into the construct under test, capturing the resulting counter value and the printed sequence. Use `withOutputs` to print multiple side-effect markers in order.

### Helper sketch (inline per test)

```vibefun
let counter = ref(0);
let tick = (label: String) => {
    let _ = unsafe { console_log(label) };
    let _ = unsafe { counter := !counter + 1 };
    !counter
};
```

Then for each construct, capture the order of `tick("a")`, `tick("b")`, etc. in stdout.

### Tests

1. **F-44 general principles** — combined `f(g(), h())` test asserting `g` printed before `h` before `f`.
2. **F-45 function application argument order** — `add(tick("first"), tick("second"))` outputs `first\nsecond`. Add a property test (Layer: P) over a multi-arg generator to confirm consistent left-to-right across argument counts 2–5.
3. **F-46 binary operator order** — `tick("L") + tick("R")` prints `L\nR`. Repeat for `*` and `&` (string concat). **Do not include `&&` or `||`** — those are short-circuiting and would produce false-positive ordering observations; see the bug-triage note on Line 59.
4. **F-49 record construction order** — `{ x: tick("x"), y: tick("y"), z: tick("z") }` prints `x\ny\nz`.
5. **F-50 list construction order** — `[tick("a"), tick("b"), tick("c")]` prints `a\nb\nc`.
6. **F-51 if expression order** — already partly in chunk 08 F-36, but this is the **scrutinee-then-branch** assertion: `if tick("cond") > 0 then tick("then") else tick("else")` for both true and false paths, asserting `cond` always prints before the branch.
7. **F-52 match scrutinee evaluated once** — `match tick("scrut") { | _ => tick("body") }` prints exactly `scrut\nbody`, with counter ending at 2 (not 3+ if scrutinee re-evaluated per pattern).
8. **F-54 block sequential** — `{ tick("a"); tick("b"); tick("c") }` prints `a\nb\nc`.
9. **F-55 pipe operator order** — `tick("val") |> (x) => tick("f")` prints `val\nf` (LHS evaluated first, then function applied).
10. **F-56 reference assignment order** — `let r = ref(0); unsafe { r := tick("rhs") }; tick("done")` prints `rhs\ndone` (RHS evaluated before assignment completes).

## Behavior expectations (for bug-triage)

- **Any reversal of expected order** (e.g., right-to-left binop, function before args) means the codegen evaluation strategy disagrees with the spec. File the bug; do not adjust the test to match.
- **Match scrutinee evaluated more than once** (F-52): if counter ends at 3+, the match desugarer is re-emitting the scrutinee per pattern arm. Spec mandates single evaluation. File a bug.
- **Short-circuit `&&`/`||` interference**: F-46 explicitly avoids short-circuit by using `+`/`*`/`&`. Don't substitute `&&`/`||` — the audit's evaluation-order claim refers to non-short-circuiting binops. (Short-circuit semantics are a separate F-NN entry; audit doesn't flag a gap there.)

## If a test reveals a bug

Tests-only PR. Find → file → hold. These bugs are likely codegen issues, not parser/typechecker.

## Verification

- `pnpm run verify`
- `pnpm run test:coverage` ≥ baseline
- For property tests added (F-45): `FC_NUM_RUNS=1000 FC_SEED=random pnpm test`

## Out of scope

- 04a F-15, F-23, F-26, etc. — non-evaluation-order gaps in chunk 08.
- Documentation of evaluation order itself — spec is authoritative; this chunk only validates code conformance.
