# Chunk 13 — JavaScript interop

## Context

Closes 13 testing gaps in section 10: arity-based external overloading (parser side), pure-function overload restriction, overload validation error codes (V-layer only — emission already implemented), opaque types Json/JsObject/Promise/Error/Any, null→Option pattern, parser VF2007.

Closes: 10 F-03, F-04, F-05, F-06, F-07, F-18, F-19, F-20, F-21, F-22, F-25, F-31.

## Spec under test

- `docs/spec/10-javascript-interop/01-external-declarations.md` — external declarations, arity-based overloading.
- `docs/spec/10-javascript-interop/02-opaque-types.md` — Json, JsObject, Promise, Error, Any.
- `docs/spec/10-javascript-interop/03-unsafe-blocks.md` — unsafe block semantics.
- `docs/spec/10-javascript-interop/04-overload-validation.md` — overload uniqueness rules (VF4801–VF4803).

## Pre-flight orphan check

**Important pre-plan finding**: `packages/core/src/typechecker/environment.test.ts` (orphan file) **already covers** VF4801, VF4802, VF4803 emission at U-layer:
- `expect(() => buildEnvironment(module)).toThrow(/VF4801/)` (line 167)
- `/VF4802/` at lines 178, 189
- `/VF4803/` at line 200

So the audit's "error code defined but never thrown; no test" claim is a false positive at U-level. **This chunk only adds V-layer tests for these codes**, not U.

VF4804 (arity-based call-site resolution) is genuinely a feature gap — definition says "not yet supported" — and is excluded from this chunk per Step 0 addendum.

## Coverage baseline

```bash
pnpm run test:coverage
```

## Implementation steps

All V-layer tests in `tests/e2e/spec-validation/10-javascript-interop.test.ts`. Use `expectCompiles`, `expectCompileError` with the relevant code, and `expectRunOutput`.

1. **F-03 arity-based external overloading (parser stores multiple)** — parse a `.vf` file that declares two `external` functions with the same Vibefun name but different arities; assert compile success at parser level (typechecker may still reject if not implemented; per F-30/VF4804 it currently does, so this test asserts parse-level only and skips runtime).
   - If full pipeline rejects with VF4804, document and split this into "parser accepts" (U-layer parser test) and "typechecker rejects" (V-layer expectCompileError VF4804).
2. **F-04 only externals can be overloaded** — `expectCompileError("let f = (x) => x; let f = (x: Int) => x + 1;")`. Should fail with a duplicate-binding error (VF4801 or another DuplicateDeclaration code).
3. **F-05 V-layer for VF4801 (same jsName)** —
   ```typescript
   expectCompileError(
       'external f: (Int) -> Int = "doIt"; external f: (Int, Int) -> Int = "doIt";',
       "VF4801",
   );
   ```
4. **F-06 V-layer for VF4802 (same `from` clause)** — analogous structure with two externals importing the same name from the same module.
5. **F-07 V-layer for VF4803 (mixed function/non-function shapes)** — declare a function external and a value external with the same Vibefun name; assert VF4803.
6. **F-18 Json opaque type** — external returning `Json`, parse + access via JS interop:
   ```typescript
   it("supports opaque Json type via FFI", () => {
       expectRunOutput(
           withOutput(
               'external js_parse: (String) -> Json = "JSON.parse";\nexternal json_to_string: (Json) -> String = "JSON.stringify";\nlet j = unsafe { js_parse("{\\"x\\": 1}") };',
               "unsafe { json_to_string(j) }",
           ),
           '{"x":1}',
       );
   });
   ```
7. **F-19 JsObject** — analogous round-trip via an external that produces `JsObject`.
8. **F-20 Promise<T>** — declare an external returning `Promise<String>`, await/resolve through interop. (Verify spec mechanism for awaiting; if Vibefun lacks `await`, the test needs a JS-side `then` chain via FFI.)
9. **F-21 Error opaque type** — assert `try { ... } catch (e) { /* e: Error */ }` typechecks `e` as `Error`. Add U-layer assertion in `packages/core/src/typechecker/infer-bindings-errors-and-edges.test.ts`.
10. **F-22 Any opaque type** — `Any` should unify with concrete types (this is its purpose for FFI). U-layer assertion in `packages/core/src/typechecker/constraints.test.ts`. V-layer: external returning `Any` cast to a concrete via pattern check.
11. **F-25 null→Option pattern** — external returning `Option<T>` for a JS function that returns `null`:
    ```typescript
    expectRunOutput(
        withOutput(
            'external js_maybe: (Bool) -> Option<Int> = "(b) => b ? 5 : null";',
            'match unsafe { js_maybe(false) } { | Some(_) => "got" | None => "none" }',
        ),
        "none",
    );
    ```
    (Verify the FFI marshalling rule for null→None in the spec; if not auto-converted, this test may need an explicit wrapper.)
12. **F-31 VF2007 parser error** — external block missing semicolons. `expectCompileError("external f: () -> Unit = \"x\"\nexternal g: () -> Unit = \"y\"", "VF2007")` (no `;` between statements).

## Behavior expectations (for bug-triage)

- F-25: if the external returns the null directly without `null→None` conversion, the FFI marshaller is missing a check — file a bug *only if the spec mandates auto-conversion*. Some specs require explicit user-side wrapping; check `10-javascript-interop/02-opaque-types.md`.
- F-22: `Any` failing to unify with a concrete type means it's been treated as a fresh type variable rather than a top type — file a soundness-adjacent bug.

## If a test reveals a bug

Tests-only PR. Find → file → hold.

## Verification

- `pnpm run verify`
- `pnpm run test:coverage` ≥ baseline

## Out of scope

- VF4804 arity-based call-site overload resolution — feature gap.
- Async/await semantics beyond what current Promise<T> typing supports — may surface design questions; route to a separate spec-clarification ticket.
