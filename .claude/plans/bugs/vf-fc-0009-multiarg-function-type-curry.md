# VF-FC-0009 — Curry multi-parameter function types `(A,B)->R`

**Tier:** 3 (soundness/design) · **Phase:** 2 (#6) · **Status:** Open

## Context

Every multi-parameter function **type** fails to typecheck — both external declarations
and plain `let` annotations:

```vibefun
external add2: (Int, Int) -> Int = "((a,b)=>a+b)";
let r = unsafe { add2(3, 4) };          // VF4021
let add: (Int,Int) -> Int = (a,b) => a+b;  // VF4021
```

Spec `docs/spec/10-javascript-interop/external-declarations.md:296-305` states `(A,B)->R`
and `A->B->R` are the **same type** (auto-currying). The implementation does not curry the
*type*, only the *terms*.

## Root cause

`convertTypeExpr` (`packages/core/src/typechecker/infer/infer-primitives.ts:396-400`,
`CoreFunctionType` case) lowers surface `(A,B)->R` to the uncurried `Fun([A,B], R)`. But the
desugarer curries every lambda and every application into nested single-arg `CoreApp`
(`packages/core/src/desugarer/desugarer.ts:190-205`). `inferApp` then unifies the callee
against `Fun([oneArg], ret)`; a 2-param `Fun` mismatches arity → `VF4021`
("Cannot unify functions with different arity: 2 vs 1").

## TDD plan

### Red — failing test first
- **Unit:** in the typechecker primitives/conversion test, assert `convertTypeExpr` of
  `(Int,Int)->Int` yields nested `Fun([Int], Fun([Int], Int))` (single-param chain).
- **Integration/spec:** add a test that `let add: (Int,Int) -> Int = (a,b) => a+b; add(3,4)`
  typechecks and runs to `7`, and a multi-arg external compiles/runs in
  `tests/e2e/spec-validation/10-javascript-interop.test.ts`.

Run; confirm `VF4021`.

### Green — the fix
In `convertTypeExpr`'s `CoreFunctionType` case, when there are ≥2 params, build a right-nested
chain of single-param `Fun`s: `(A,B,C)->R` ⟶ `Fun([A], Fun([B], Fun([C], R)))`. Keep a single
canonical (curried) representation rather than loosening `unify`/`inferApp` (simpler, avoids
two representations of the same type). Preserve location info on each synthesised `Fun`.

## Test layers (CLAUDE.md directive 5)
- **Unit:** `convertTypeExpr` currying (2-param, 3-param, 1-param unchanged, 0-param/Unit).
- **Integration:** typechecker function-annotation tests; multi-arg external resolution.
- **Spec-validation:** `10-javascript-interop.test.ts` — multi-arg external compiles + runs;
  also a multi-param annotated `let` runs.
- **let-binding-matrix sync:** add the multi-param annotated `let` form to
  `tests/e2e/let-binding-matrix.test.ts`.
- **AI-guide:** the spec already documents `(A,B)->R` ≡ `A->B->R` auto-currying
  (`external-declarations.md:304`), so a *new* guide entry may not be required. Verify the
  AI-guide's function-type section is accurate and doesn't imply multi-param annotations are
  unsupported; update only if it misstates the (previously-broken) behavior.

## Cross-cutting concerns
**Do before VF-FC-0008** — overload arity/shape validation (`VF4803`) and arity resolution
must operate on the curried `Fun` representation. **Enables VF-FC-0010** (multi-arg externals
must typecheck before their returns can be marshalled). Shares the `10-javascript-interop`
test file with 0008/0010/0011 (edit sequentially).

## Verification
```bash
pnpm --filter @vibefun/core test
pnpm run test:e2e
pnpm run verify
```

## Backlog cleanup
Remove the VF-FC-0009 row from `.claude/FAST_CHECK_BUG_BACKLOG.md` on fix.
