# VF-FC-0010 — Marshal FFI `null`/`undefined` → `None` for `Option<T>` externals

**Tier:** 3 (soundness) · **Phase:** 3 (#10) · **Status:** Open · after VF-FC-0006, VF-FC-0009

## Context

An external typed `-> Option<T>` that returns JS `null` lets the raw `null` reach a `match`,
exhausting it at runtime:

```vibefun
external js_maybe: (Bool) -> Option<Int> = "(b) => b ? 5 : null";
match unsafe { js_maybe(false) } { | Some(_) => "got" | None => "none" }
// runtime: Error: Match exhausted
```

Spec `docs/spec/10-javascript-interop/type-safety.md:58-77`: a JS `null`/`undefined` returned
from an external typed `-> Option<T>` is marshalled to `None`; any other value → `Some(value)`.
**Decision (owner):** marshalling is **unconditional**; the `--runtime-checks=ffi|all|none`
flag is **out of scope** (separate future task).

## Root cause

No return-value marshalling is emitted for external calls. The codegen external-call path
(`packages/core/src/codegen/es2020/emit-expressions/`) emits the bare call regardless of the
declared return type, so `null` flows straight into the `match`.

## TDD plan

### Red — failing test first
Flip the `[BUG: VF-FC-0010]` test in `tests/e2e/spec-validation/10-javascript-interop.test.ts`
from asserting `"Match exhausted"` to `expectRunOutput(..., "none")`, and add:
- a `Some` case: external returns a value → `match` hits `Some` (e.g. `js_maybe(true)` → `"got"`);
- an `undefined` case: external returns `undefined` → `None`.

Run; confirm current "Match exhausted" fails the new assertions.

### Green — the fix
When emitting an external **call** whose declared return type is `Option<T>`, wrap the result:

```js
(($r) => $r == null ? <None> : <Some>($r))(<call>)
```

using `== null` (covers both `null` and `undefined`) and the codegen's existing `None`/`Some`
constructors (reuse, don't hand-roll the tag shape). Thread the declared return type into the
external-call emitter so it can detect `Option<T>`. Update spec `type-safety.md` to state the
marshalling is unconditional (not gated by `--runtime-checks`).

## Test layers (CLAUDE.md directive 5)
- **Unit:** external-call emitter test — `Option<T>` return wraps with the null-check; non-Option
  returns are unchanged.
- **Execution-tests:** `packages/core/src/codegen/es2020/execution-tests/` — null→None,
  undefined→None, value→Some.
- **Spec-validation:** the three flipped/added cases above.
- **AI-guide + spec doc:** document unconditional null→Option marshalling at the FFI boundary.

## Cross-cutting concerns
**After VF-FC-0006** (reuse the runtime-helper/gating style if a helper is preferred over inline)
and **after VF-FC-0009** (multi-arg externals must typecheck first). Same test file as
0008/0009/0011 (edit sequentially). `--runtime-checks` flag deliberately deferred — note in
`tasks.md` residual items.

## Verification
```bash
pnpm --filter @vibefun/core test
pnpm run test:e2e
pnpm run verify
```

## Backlog cleanup
Remove the VF-FC-0010 row from `.claude/FAST_CHECK_BUG_BACKLOG.md` on fix.
