# VF-FC-0011 — Document `Any` as an opaque type (not a top type)

**Tier:** 3 (design) → resolves to **spec + test only** · **Phase:** 0 (#3) · **Status:** Open

## Context

`Any` is the FFI escape-hatch type. The spec was ambiguous: "equivalent to TypeScript's
any/unknown" (implies top type) vs "can only pass to externals that accept Any" (implies
opacity). **Decision (owner):** `Any` is **opaque** — it unifies only with `Any`; values
must round-trip through externals. This is already the implemented behavior, so this is a
spec-clarification + a previously-deferred test, with little or no code change.

## Root cause

`packages/core/src/typechecker/unify.ts` — `Any` is represented as `Const "Any"` and
`unify` has no special case, so it unifies only with itself. That matches the chosen
"opaque" semantics; the bug was the ambiguous spec and a missing test.

## TDD plan

### Red — failing test first
Add the deferred spec-validation test in
`tests/e2e/spec-validation/10-javascript-interop.test.ts` (replace the placeholder
comment) asserting that a concrete use of an `Any` value is a type error:

```ts
expectCompileError(
  'external to_any: (Int) -> Any = "((x)=>x)"; let x = unsafe { to_any(42) }; let y = x + 1;',
  "VF4020",
);
```

This should already pass against current code — run it to confirm the opaque behavior is
real. (If it does NOT error, the code does need a fix; see Green.) Also confirm the existing
Any↔Any pass-through test still passes.

### Green — the fix
1. **Spec:** clarify `docs/spec/10-javascript-interop/external-declarations.md:104-126` to
   state `Any` is opaque — it only flows to/from externals declared with `Any`; it does
   **not** unify with concrete types (it is not a TS-style top type).
2. **Code (only if the red test does not already error):** add an explicit `Any`-vs-other
   case in `unify` that produces `VF4020` with a clear message. If the test already errors,
   add a short comment in `unify.ts` documenting the intentional opacity instead.
3. **AI-guide (only if behavior changes):** no behavior changes here (`Any` is already
   opaque), so a guide update is **not** expected; update `.claude/VIBEFUN_AI_CODING_GUIDE.md`
   only if it currently implies `Any` is a top type.

## Test layers (CLAUDE.md directive 5)
- **Spec-validation:** the new `expectCompileError` + the existing Any↔Any pass-through.
- **Unit (optional):** a case in `unify.test.ts` asserting `Any` unifies with `Any` only.
- **Spec doc + AI-guide:** as above.

## Cross-cutting concerns
Lives in `10-javascript-interop.test.ts` alongside VF-FC-0008/0009/0010 — edit sequentially.
Confirm VF-FC-0009 (currying) and VF-FC-0010 (marshalling) don't change `Any`'s behavior.

## Verification
```bash
pnpm run test:e2e
pnpm run check && pnpm run lint && pnpm test && pnpm run format
```

## Backlog cleanup
Remove the VF-FC-0011 row from `.claude/FAST_CHECK_BUG_BACKLOG.md` once spec + test land.
