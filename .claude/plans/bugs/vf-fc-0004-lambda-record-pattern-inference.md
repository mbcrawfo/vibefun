# VF-FC-0004 — Infer record-pattern lambda parameters

**Tier:** 3 (spec/impl divergence) · **Phase:** 2 (#8) · **Status:** Open

## Context

A documented spec example fails to compile:

```vibefun
let f = ({ x, y }) => x + y;
let result = f({ x: 1, y: 2 });
// error[VF4500]: Cannot access field on non-record type type variable
```

Spec `docs/spec/04-expressions/functions-composition.md:53-71` (§Destructuring in Lambda
Parameters) shows `let getCoords = ({ x, y }) => (x, y);` with **no annotation** —
destructuring should be inferred. With an explicit annotation
(`({x,y}: {x: Int, y: Int}) => x + y`) it compiles, confirming the gap is inference.

## Root cause

The desugarer (`packages/core/src/desugarer/curryLambda.ts:135-170`) lifts `({x,y}) => body`
into `($tmp) => match $tmp { | {x,y} => body }`. The typechecker gives `$tmp` a fresh type
variable and has no rule to infer the record type from the pattern's field set, so matching a
record pattern against a free tyvar fails (`VF4500`). Vibefun records are **closed** (no row
polymorphism), so the closed record type implied by the pattern's fields can be synthesised
directly.

## TDD plan

### Red — failing test first
Replace the deferred placeholder in `tests/e2e/spec-validation/04-expressions.test.ts`
("lambda destructuring parameter") with:

```ts
expectRunOutput(
  withOutput("let f = ({ x, y }) => x + y; let result = f({ x: 1, y: 2 });", "String.fromInt(result)"),
  "3",
);
```

Run; confirm `VF4500` (test fails).

### Green — the fix
In pattern inference (`packages/core/src/typechecker/infer/patterns.ts` /
`infer-functions.ts`): when a **record pattern** is checked against a free type variable,
instantiate that variable to the **closed** record type implied by the pattern's named fields
(each field a fresh type var, later constrained by the body). Mirror the existing path used
when a variant/tuple pattern meets a free tyvar, if one exists. Keep it sound for closed
records — do not introduce row polymorphism.

## Test layers (CLAUDE.md directive 5)
- **Unit:** pattern-inference test (record pattern vs fresh tyvar → closed record type).
- **Integration:** typechecker test for the unannotated destructuring lambda; also nested
  destructuring and a field used at a concrete type.
- **Spec-validation:** the `expectRunOutput` above; add the spec's `getCoords` tuple example.
- **AI-guide:** the spec already documents unannotated destructuring
  (`functions-composition.md:53-71`), so a *new* guide entry may not be required. Verify the
  AI-guide doesn't imply an annotation is needed; update only if it misstates the
  (previously-broken) behavior.

## Cross-cutting concerns
Sequenced after VF-FC-0003 (both touch inference/generalisation) to avoid interaction
surprises; otherwise independent of 0008/0009. Touches `04-expressions.test.ts` (sequential
with 0002/0003/0012).

## Verification
```bash
pnpm --filter @vibefun/core test
pnpm run test:e2e
pnpm run verify
```

## Backlog cleanup
Remove the VF-FC-0004 row from `.claude/FAST_CHECK_BUG_BACKLOG.md` on fix.
