# VF-FC-0003 — Empty-list value restriction (monomorphic `let xs = []`)

**Tier:** 3 (soundness) · **Phase:** 1 (#5) · **Status:** Open

## Context

`let xs = []` must be **monomorphic** — the value restriction prevents generalisation, so
the first concrete use fixes the element type (spec `docs/spec/04-expressions/data-literals.md`
§Empty List Type Inference, lines 380–421). Currently the typechecker accepts `xs` at both
`List<Int>` and `List<String>` within one module, i.e. it is wrongly generalised. Soundness bug.

```vibefun
let xs = [];
let useInt = (ys: List<Int>) => 0;
let useStr = (ys: List<String>) => 0;
let _ = useInt(xs);
let _ = useStr(xs);   // compiles cleanly — should fail
```

## Root cause

`[]` desugars to `CoreVariant("Nil", [])`. `isSyntacticValue` (in
`packages/core/src/typechecker/.../types.ts`) returns `true` for it (vacuously, since it has
no args), so `computeBindingScheme` in
`packages/core/src/typechecker/infer/infer-bindings.ts` generalises the binding's type
variable. The value restriction should treat a constructed value whose type contains
unconstrained type variables as non-generalisable here (mirroring how `ref(x)` is excluded).

## TDD plan

### Red — failing test first
Replace the deferred placeholder in `tests/e2e/spec-validation/04-expressions.test.ts`
("empty list value restriction") with:

```ts
expectCompileError("let xs = []; let _: List<Int> = xs; let _: List<String> = xs;");
```

Run `pnpm run test:e2e`; confirm it currently compiles (test fails).

### Green — the fix
Extend the value-restriction predicate so empty/nullary constructed variants are not
generalised. Preferred: in `isSyntacticValue`, return `false` for a `CoreVariant` whose args
are empty (or, more precisely, do not generalise a binding whose inferred type still has free
type variables that aren't justified by a syntactic value — mirror the `ref` carve-out).
Verify that:
- non-empty list literals (`[1,2,3]`) still typecheck and remain usable;
- genuinely polymorphic value bindings (e.g. `let id = (x) => x`) still generalise;
- a single concrete use of `[]` works (`let xs = []; let _: List<Int> = xs;`).

## Test layers (CLAUDE.md directive 5)
- **Unit:** `isSyntacticValue` / `computeBindingScheme` tests (empty variant not generalised;
  lambdas/non-empty constructors still generalise).
- **Integration:** typechecker test for the two-incompatible-uses program → error; one-use → ok.
- **Spec-validation:** the `expectCompileError` above + a positive single-use case.
- **let-binding-matrix sync:** add the empty-list binding form to
  `tests/e2e/let-binding-matrix.test.ts` so every `let`/`let rec` path runs this scenario.
- **AI-guide:** note empty-list monomorphism if not already documented.

## Cross-cutting concerns
`isSyntacticValue` is shared by **every** binding generalisation path — high blast radius.
After the change, run the full typechecker suite and the let-binding matrix to catch
regressions. Sequenced before VF-FC-0004 (also touches inference/generalisation).

## Verification
```bash
pnpm --filter @vibefun/core test
pnpm run test:e2e
pnpm run verify
pnpm run test:coverage   # ≥ baseline
```

## Backlog cleanup
Remove the VF-FC-0003 row from `.claude/FAST_CHECK_BUG_BACKLOG.md` on fix.
