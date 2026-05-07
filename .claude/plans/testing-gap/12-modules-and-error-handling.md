# Chunk 12 — Modules and error handling

## Context

Closes 08 module-loader gaps (import rename, init error propagation, re-export alias, transitive re-exports, top-level call inside circular dependency) and 09 error-handling gaps (unwrap messages, integer overflow property, panic E2E, stack overflow surfacing).

Closes: 08 F-06, F-23, F-26, F-29, F-30; 09 F-07, F-13, F-18, F-21, F-24, F-26, F-27.

## Spec under test

- `docs/spec/08-modules.md` — imports, exports, rename (`as`), re-exports with alias, transitive re-exports, circular dependency initialization order.
- `docs/spec/09-error-handling.md` — `Result.unwrap` and `Option.unwrap` messages, panic semantics, integer overflow handling, stack overflow surface.

## Pre-flight orphan check

- `tests/e2e/spec-validation/08-modules.test.ts`, `09-error-handling.test.ts` — read first.
- `packages/core/src/codegen/es2020/execution-tests/module-reexports.test.ts` and `user-defined-types.test.ts` (orphans) — already cover transitive re-exports at codegen level. The V-layer test in this chunk is additive.
- `packages/stdlib/src/result.test.ts`, `option.test.ts` — already assert `unwrap` throws with regex like `/unwrap called on Err/`. The audit's F-07/F-13 gap may be a false positive — verify; if covered, close by citation.

## Coverage baseline

```bash
pnpm run test:coverage
```

## Implementation steps

### Modules (08) — all V-layer in `tests/e2e/spec-validation/08-modules.test.ts`

1. **F-06 named import with rename** —
   ```typescript
   it("supports named imports with `as` rename", () => {
       const project = createTempProject({
           "lib.vf": 'export let foo = 42;',
           "main.vf": 'import { foo as bar } from "./lib"; let _ = unsafe { console_log(Int.toString(bar)) };',
       });
       expectFileRunOutput("main.vf", project.path, "42");
   });
   ```
2. **F-23 init error propagation** — module that throws in an unsafe block at top level; importer should fail with the propagated error.
3. **F-26 re-export with alias** — `lib.vf` exports `x`; `mid.vf` re-exports `export { x as y } from "./lib"`; `main.vf` imports `y`. Assert resolution.
4. **F-29 transitive re-export chain** — `a.vf` exports `f`; `b.vf` re-exports from `a`; `c.vf` re-exports from `b`; `main.vf` imports from `c`. Assert call.
5. **F-30 circular dependency top-level call** — module A and B form a cycle. A's top level invokes a function from B. Per spec, this should fail at module initialization (B's binding is undefined when A runs). `expectFileRuns` returns non-zero or an explicit error message.

### Error handling (09)

6. **`packages/stdlib/src/result.test.ts`** (extend if not already covered) — Layer: U.
   - F-07: assert `Result.unwrap(Err("e"))` throws with the **exact** message from `09-error-handling.md` (read the spec for wording).
7. **`packages/stdlib/src/option.test.ts`** (extend if not already covered) — Layer: U.
   - F-13: same shape for `Option.unwrap(None)`.
   - F-24, F-26: hardcoded panic messages — assert exact-string equality (regex if message has a dynamic component).
8. **`tests/e2e/spec-validation/09-error-handling.test.ts`** (extend) — Layer: V.
   - F-21 panic E2E:
     ```typescript
     expectRuntimeError(
         withOutput('let _ = unsafe { panic("boom") };', '"never"'),
         "boom",
     );
     ```
9. **`packages/stdlib/src/int.test.ts`** (extend) — Layer: U + P.
   - F-18: property test over the safe-integer boundary. `fc.property(fc.bigInt(2n**52n, 2n**53n + 100n), (n) => { /* assert toString round-trips and arithmetic does not crash */ })`. Document expected lossy-but-non-crashing behaviour.
10. **`tests/e2e/spec-stack-overflow.test.ts`** (new in `tests/e2e/`, NOT in spec-validation since it's a runtime surface check) — Layer: E.
    - F-27: deep recursion fixture (compile a `.vf` file with non-tail-recursive function calling itself 100k deep). Run via CLI; assert exit non-zero and stderr contains `Maximum call stack size exceeded`. Use a new file outside spec-validation because spec-validation is gating and this test is OS/Node-version sensitive.

## Behavior expectations (for bug-triage)

- F-30 circular init: if the program runs to completion successfully, the cycle resolution is doing something the spec doesn't permit — file a bug. Spec says deferred bindings are `undefined` at top-level call sites within the cycle.
- F-07/F-13 unwrap message: if message text differs from spec, **the spec is the contract** — the message is part of the public API.
- F-27 stack overflow: if the program runs to completion (e.g., the recursion was tail-call-optimized) on Node, increase recursion depth until it fails or document that current Node version performs TCO for this shape (audit notes TCO is a partial feature gap).

## If a test reveals a bug

Tests-only PR. Find → file → hold.

## Verification

- `pnpm run verify`
- `pnpm run test:coverage` ≥ baseline
- For F-18 property: `FC_NUM_RUNS=1000 FC_SEED=random pnpm test`

## Out of scope

- Implementing TCO (12 F-NN partial) — feature gap.
- Multi-error reporting in the typechecker (03c F-04) — feature gap.
