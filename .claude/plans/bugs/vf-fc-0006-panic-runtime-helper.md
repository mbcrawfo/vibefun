# VF-FC-0006 — Emit a runtime helper for the `panic` builtin

**Tier:** 3 (core primitive non-functional) · **Phase:** 3 (#9) · **Status:** Open

## Context

`panic` is a registered builtin and typechecks/compiles, but dies at runtime:

```vibefun
let _crash = unsafe { panic("boom") };
// compiles (exit 0), then: ReferenceError: panic is not defined
```

Spec `docs/spec/09-error-handling.md:97-127` requires `panic` to throw a JS `Error` with the
message and stop execution immediately.

## Root cause

`panic` is registered in the typechecker (`packages/core/src/typechecker/builtins.ts:126-127`,
type `(String) -> Never`), but codegen has no runtime binding. `emitVar`
(`packages/core/src/codegen/es2020/emit-expressions/variables.ts`) finds no `External` binding
for `panic`, falls through to the regular-identifier path, and emits the undefined global
`panic`.

## TDD plan

### Red — failing test first
- **Unit** (`emit-expressions/variables.test.ts`): `emitVar("panic", ctx)` returns `"$panic"`
  and sets the usage flag `ctx.shared.needsPanicHelper === true`.
- **E2E:** flip the `[BUG: VF-FC-0006]` test in
  `tests/e2e/spec-validation/09-error-handling.test.ts` from asserting
  `"panic is not defined"` to:
  `expectRuntimeError(withOutput('let _crash = unsafe { panic("boom") };', '"never"'), "boom")`.

Run; confirm current behavior (undefined-global) fails the new assertions.

### Green — the fix
Mirror the existing `$intDiv`/`$intMod` gating exactly:
- `packages/core/src/codegen/es2020/runtime-helpers.ts`: add `generatePanicHelper()` →
  `const $panic = (m) => { throw new Error(m); };`; add `needsPanic` to `RuntimeHelperFlags`
  and include the helper when the flag is set.
- `packages/core/src/codegen/es2020/context.ts`: add `needsPanicHelper = false` to shared state.
- `variables.ts` `emitVar`: if `name === "panic"`, set `ctx.shared.needsPanicHelper = true` and
  return `"$panic"`.
- `generator.ts`: thread `needsPanic: ctx.shared.needsPanicHelper` into the flags passed to
  `generateRuntimeHelpers`.

## Test layers (CLAUDE.md directive 5)
- **Unit:** `variables.test.ts` (flag + name mapping), `runtime-helpers.test.ts` (helper throws).
- **Integration:** `generator` test — flag reaches `generateRuntimeHelpers`, preamble includes `$panic`.
- **Execution-tests:** `packages/core/src/codegen/es2020/execution-tests/` — a program calling
  `panic` throws with the supplied message.
- **Spec-validation:** the flipped `09-error-handling.test.ts` case.

## Cross-cutting concerns
Extend `RuntimeHelperFlags` **once** here; **VF-FC-0010 reuses the same gating pattern**, so do
0006 first. Independent of 0007 (the stdlib unwrap strings).

## Verification
```bash
pnpm --filter @vibefun/core test
pnpm run test:e2e
pnpm run verify
```

## Backlog cleanup
Remove the VF-FC-0006 row from `.claude/FAST_CHECK_BUG_BACKLOG.md` on fix.
