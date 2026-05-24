# VF-FC-0008 — Make external overload validation reachable post-desugar

**Tier:** 3 (soundness/design) · **Phase:** 2 (#7) · **Status:** Open · depends on VF-FC-0009

## Context

External overloading validation and arity resolution are unreachable end-to-end:

```vibefun
external f: (Int) -> Int = "doIt";
external f: (Int, Int) -> Int = "other";
// compiles cleanly; spec requires VF4801 (inconsistent JS name)
```

Spec `docs/spec/10-javascript-interop/external-declarations.md:237-260` defines:
`VF4801` (same overload group must share one jsName), `VF4802` (same `from`),
`VF4803` (all overloads must be function shapes), plus arity-based resolution.

## Root cause

`buildEnvironment.groupDeclarationsByName` (`packages/core/src/typechecker/environment.ts`)
only groups declarations whose `kind` is `"ExternalDecl"`/`"ExternalBlock"`. But the desugarer
rewrites those to `CoreExternalDecl` **before** `typechecker.ts:80` calls `buildEnvironment`
(via a `module as unknown as Module` cast). So no overload group ever forms: `VF4801/4802/4803`
never fire, and the per-decl `CoreExternalDecl` handler (`typechecker.ts:325`) binds each
external as `kind:"External"`, silently overwriting earlier same-named decls — a later call
then fails arity unification (`VF4021`). `environment.test.ts` only passes because it calls
`buildEnvironment` on the *pre-desugar* `Module`.

## TDD plan

### Red — failing test first
Replace the deferred placeholder in `tests/e2e/spec-validation/10-javascript-interop.test.ts`
with cases:
- inconsistent jsName → `expectCompileError(..., "VF4801")`
- inconsistent `from` → `VF4802`
- non-function overload shape → `VF4803`
- positive: a valid overload group resolves by arity (compiles + runs).

Run; confirm they compile cleanly today (tests fail).

### Green — the fix
Group/validate on the **post-desugar** `CoreExternalDecl` nodes. Add
`validateExternalOverloads(coreModule)` in `environment.ts` that groups `CoreExternalDecl` by
name and enforces VF4801/4802/4803; invoke it from `typeCheck()` (`typechecker.ts`). Build the
overload group binding (`kind:"ExternalOverload"`) so same-named decls no longer overwrite each
other, and arity resolution can pick the right overload. Ensure resolution matches VF-FC-0009's
curried `Fun` representation.

## Test layers (CLAUDE.md directive 5)
- **Unit:** `environment.ts` overload grouping/validators run on `CoreExternalDecl` (not just
  pre-desugar `Module`); update `environment.test.ts` to exercise the post-desugar path.
- **Integration:** `typechecker.ts` end-to-end — overload group forms, arity resolves.
- **Spec-validation:** the four cases above.

## Cross-cutting concerns
**After VF-FC-0009** (currying) — shape/arity logic must see curried function types. Same test
file as 0009/0010/0011. Touches `typechecker.ts` external handling (coordinate with 0010 which
touches external **codegen**, not typecheck).

## Verification
```bash
pnpm --filter @vibefun/core test
pnpm run test:e2e
pnpm run verify
```

## Backlog cleanup
Remove the VF-FC-0008 row from `.claude/FAST_CHECK_BUG_BACKLOG.md` on fix.
