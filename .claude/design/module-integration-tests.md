# Module Integration Tests — Gaps to Close

## Context

An audit of module-system runtime coverage found three behaviors the
compiler claims to support but that no test exercises end-to-end:

1. A value cycle across modules whose generated JS actually runs under Node.
2. `import type` cycles that are erased from the emitted JS.
3. Errors thrown during a dependency's top-level init propagating to the
   importer.

Adjacent behavior is already covered — module singleton semantics at
`tests/spec-validation/sections/08-modules.ts:176`, diamond dependencies at
`tests/e2e/module-resolution.test.ts:82`, re-export emission at
`packages/core/src/codegen/es2020/execution-tests/module-reexports.test.ts` —
and the VF5900 compile-time warning for value cycles is tested at
`tests/e2e/module-resolution.test.ts:101` but stops at `compileFile` and
never runs the emitted JS.

This document specifies the three tests to add. Each is self-contained and
uses only syntax that compiles today.

## Test 1 — Value cycle runs under Node

**Gap.** `tests/e2e/module-resolution.test.ts:101` asserts only that VF5900
is emitted for a value cycle; it does not `runFile`, and the cycle it
constructs (`export let fromA = 10;`) doesn't exercise cross-module function
access. We need a runtime test where `a` calls into `b` and `b` calls into
`a`.

**Location.** Add to `tests/e2e/module-resolution.test.ts` inside the existing
`describe("circular dependency", …)` block, next to the VF5900 warning test.

**Source.**
```vibefun
// a.vf
import { getFromB } from "./b";
export let baseA = 10;
export let useB = () => getFromB();

// b.vf
import { baseA } from "./a";
export let baseB = 20;
export let getFromB = () => baseA + baseB;

// main.vf  (uses WRAPPER from helpers.ts)
import { useB } from "./a";
let _ = unsafe { console_log(String.fromInt(useB())) };
```

**Assertions.**
- `runFile("main.vf", …).exitCode === 0`
- `result.stdout.trim() === "30"`
- Compile may still emit VF5900 (that's fine — the point is that the
  generated JS executes correctly despite the cycle).

**Why this matters.** Proves the codegen produces JS whose import/export
order doesn't cause a TDZ error when functions on each side close over
bindings from the other.

## Test 2 — Type-only cycles emit no runtime import

**Gap.** `tests/spec-validation/sections/08-modules.ts:231` ("type import")
and `:244` ("mixed type and value import") use `check: "compiles"` only.
Nothing verifies that the generated JS actually omits the type-only side,
which is the whole point of `import type`.

**Location.** Add to `tests/e2e/module-resolution.test.ts` as a new
`describe("type-only imports", …)` block. E2e is the right layer because the
test needs both (a) to read the emitted `.js` files and (b) to run them
under Node.

**Source.**
```vibefun
// a.vf
import type { TypeB } from "./b";
export type TypeA = { label: String };
export let makeA = (): TypeA => { label: "a" };

// b.vf
import type { TypeA } from "./a";
export type TypeB = { tag: String };
export let makeB = (): TypeB => { tag: "b" };

// main.vf  (uses WRAPPER)
import { makeA } from "./a";
import { makeB } from "./b";
let _ = unsafe { console_log(makeA().label ++ "-" ++ makeB().tag) };
```

**Assertions.**
- `compileFile("main.vf", …).exitCode === 0`
- The compile output does **not** contain `VF5900` (type-only cycles are not
  a cycle at runtime and must not warn).
- `readFileSync(join(dir, "a.js"), "utf-8")` does not contain `"./b"` or
  `"./b.js"`.
- `readFileSync(join(dir, "b.js"), "utf-8")` does not contain `"./a"` or
  `"./a.js"`.
- `runFile("main.vf", …).exitCode === 0`
- `result.stdout.trim() === "a-b"`

**Why this matters.** Pins the contract that `import type` is erased from
the emitted JS. Without this, a regression that accidentally kept type-only
imports as runtime imports would reintroduce a runtime cycle and the only
signal would be a VF5900 warning the user thought they'd eliminated.

## Test 3 — Init-time error propagation

**Gap.** Vibefun has no `throw` expression, so init-time failure has to go
through an FFI-imported JS thrower invoked from a top-level `unsafe` block.
No test covers this path today, so a regression that swallowed init errors
(e.g. a generated-code change that wrapped top-level side effects in
try/catch) would go unnoticed.

**Location.** Add to `tests/e2e/module-resolution.test.ts` as a new
`describe("init-time errors", …)` block.

**Source.**
```vibefun
// thrower.vf
external js_throw: (String) -> Unit = "((msg) => { throw new Error(msg); })";
let _ = unsafe { js_throw("init failed") };
export let value = 42;

// main.vf  (uses WRAPPER)
import { value } from "./thrower";
let _ = unsafe { console_log(String.fromInt(value)) };
```

**Assertions.**
- `compileFile("main.vf", …).exitCode === 0` (error is runtime, not
  compile-time).
- `runFile("main.vf", …).exitCode !== 0`
- `result.stderr` contains `"init failed"`
- `result.stdout` does **not** contain `"42"` (importer code must not run
  after the dependency's init threw).

**Why this matters.** Confirms that a throw during a dependency's top-level
`unsafe` block aborts the importer's initialization as Node's ESM semantics
require. A regression that swallowed init errors (e.g. wrapping top-level
side effects in a try/catch in generated code) would silently let downstream
modules run with partially-initialized exports.

## Implementation notes

- Use the existing `createTempProject` / `runFile` / `compileFile` helpers
  in `tests/e2e/helpers.ts`. The `WRAPPER` constant at the top of
  `module-resolution.test.ts` already injects `@vibefun/std` + `console_log`.
- Test 2's JS-content assertions should use `readFileSync` on the emitted
  files under `p.dir`, matching the pattern already used at
  `module-resolution.test.ts:73-75` (which checks `existsSync` on emitted
  `.js` files).
- No new harness is needed. The existing e2e suite spawns the real CLI and
  runs the emitted JS under Node, which is everything these tests require.

## Out of scope

Two behaviors that might look related are deliberately excluded:

- **Deferred-mutation visibility across a cycle.** Would require top-level
  reassignment (`count = count + 1`), which Vibefun doesn't have — mutation
  goes through `Ref<T>` / `let mut`. Revisit only if the language grows
  top-level mutable bindings.
- **`throw`-expression init errors.** Vibefun has no `throw` expression.
  Test 3 above covers the FFI-via-`unsafe` form, which is the only legal
  way to fail at init today.
