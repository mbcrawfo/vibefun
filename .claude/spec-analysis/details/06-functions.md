# 06 - Functions: Spec Validation Analysis

## Summary

Section 06 tests core function features: named definitions, currying, partial application, recursion, mutual recursion, higher-order functions, lambdas, composition, and closures. Of 22 tests, 20 fail and 2 pass. The 2 passing tests are negative tests (compile-error assertions).

The underlying function features are surprisingly well-implemented -- most compile and generate correct JavaScript. The failures are overwhelmingly caused by **two cross-cutting infrastructure issues**: (1) stdlib module access (`String.fromInt`) is not wired up for runtime output, and (2) multi-argument call syntax `f(x, y)` is rejected by the type checker even though the spec mandates it. A smaller set of tests hit genuinely unimplemented function features (zero-arg lambdas, lambda parameter destructuring).

## Failure Categories

### Category 1: Stdlib Module Access Not Implemented (`String.fromInt` / `String.fromBool`)

- **Tests affected:** function with type annotation, function with block body, automatic currying - partial application, curried call syntax, three-argument currying, recursive function with rec keyword, recursive function - fibonacci, mutually recursive functions with rec/and, mutual recursion - odd case, function as return value, lambda with type annotations, forward composition creates new function, backward composition creates new function, closure captures outer variable, lambda with return type annotation (15 tests)
- **Root cause:** The test harness wraps output in `String.fromInt(result)` or `String.fromBool(result)` via `withOutput()`. The compiler's builtins register these as flat keys (e.g., `"String.fromInt"` in the type environment map), but the parser treats `String.fromInt` as a record field access (`CoreRecordAccess(CoreVar("String"), "fromInt")`). The type checker then looks up `String` as a variable and fails with `VF4100: Undefined variable 'String'`. This is a **module resolution** gap: the builtins system doesn't match how the parser represents module-qualified names.
- **Spec reference:** `06-functions.md` does not directly specify `String.fromInt`, but the spec's examples throughout use module-qualified stdlib calls. The stdlib spec is in `11-stdlib/string.md`.
- **Scope estimate:** Medium (2-8 hours)
- **Complexity:** Medium
- **Notes:** This is the single biggest blocker across the entire spec validation suite, not just section 06. Many sections (02, 03, 04, 09, 11, 12) rely on `String.fromInt` for output. Fixing this one issue would likely unblock 15 of the 20 failing tests in this section alone (assuming the underlying feature already works). Verified that the compiled JS for features like recursion, mutual recursion, composition, closures, and return type annotations all produce correct runtime results when tested manually. Additionally, `String.fromBool` is not even registered as a builtin (only `String.fromInt` and `String.fromFloat` exist), so the mutual recursion tests would still need that builtin added.

### Category 2: Multi-Argument Call Syntax Not Supported in Type Checker (VF4021)

- **Tests affected:** named function definition, function as argument, mixed calling conventions for 3-arg function (3 tests)
- **Root cause:** The spec states that `add(2, 3)` should be equivalent to `add(2)(3)` -- multi-argument calls are syntactic sugar for sequential curried application. The desugarer correctly curries function _definitions_ (e.g., `(x, y) => x + y` becomes `(x) => (y) => x + y`), and the code generator emits curried JS. However, the type checker's `inferApp` in `infer-functions.ts` constructs an expected function type with all arguments at once: `funType([Int, Int], result)`. When it tries to unify this 2-param expected type against the actual 1-param curried type `(Int) -> (Int) -> Int`, the unifier in `unify.ts` rejects the mismatch with `VF4021: Cannot unify functions with different arity: 1 vs 2`. The fix requires `inferApp` to either: (a) apply arguments one at a time (sequentially unifying each), or (b) the desugarer should flatten multi-arg `CoreApp` nodes into chained single-arg applications. Single-arg calls like `add(2)(3)` already work correctly.
- **Spec reference:** `06-functions.md` section "Calling Conventions" -- explicitly states `add(1, 2)` and `add(1)(2)` are equivalent. Also section "Mixed styles": `add(1, 2)(3)` and `add(1)(2, 3)` should both work.
- **Scope estimate:** Medium (2-8 hours)
- **Complexity:** Medium
- **Notes:** These 3 tests also depend on `String.fromInt` for output, so fixing multi-arg calls alone would not make them pass -- both Category 1 and Category 2 must be fixed. The curried equivalent `add(2)(3)` compiles and runs correctly today, confirming that function definitions and single-arg application are properly implemented.

### Category 3: Zero-Argument Lambda Not Implemented (Internal Error)

- **Tests affected:** zero-argument lambda (1 test)
- **Root cause:** The parser correctly parses `() => 42` as a Lambda with 0 parameters. However, the desugarer's `curryLambda` function (`desugarer/curryLambda.ts:33`) explicitly throws `Error("Lambda with zero parameters")` when params.length is 0. The spec (`04-expressions/functions-composition.md`) explicitly shows `() => 42` as valid syntax for a zero-parameter lambda. The desugarer needs to handle this case, likely by creating a `CoreLambda` with a unit-typed parameter or special-casing the zero-arg case. Exit code 5 indicates an internal/unhandled error.
- **Spec reference:** `04-expressions/functions-composition.md` -- Lambda Syntax section shows `() => 42;` as valid. `06-functions.md` does not explicitly cover zero-arg but the overall design supports it.
- **Scope estimate:** Small (1-2 hours)
- **Complexity:** Low
- **Notes:** This test also depends on `String.fromInt` for output, so both this fix and Category 1 are needed for the test to pass.

### Category 4: Lambda Parameter Destructuring Not Implemented (VF4017)

- **Tests affected:** lambda with pattern destructuring (1 test)
- **Root cause:** The type checker explicitly rejects non-`CoreVarPattern` patterns in lambda parameters with `VF4017: Pattern matching in lambda parameters not yet implemented` (in `infer-functions.ts:44-48`). The test uses `({ x, y }: { x: Int, y: Int }) => x` which produces a record pattern for the lambda parameter. The spec (`04-expressions/functions-composition.md` "Destructuring in Lambda Parameters") defines record, list, and nested destructuring in lambda params.
- **Spec reference:** `04-expressions/functions-composition.md` -- "Destructuring in Lambda Parameters" section with examples for record, list, and nested destructuring.
- **Scope estimate:** Large (1-3 days)
- **Complexity:** High
- **Notes:** This is a standalone feature that doesn't depend on other categories. The parser already parses destructuring patterns; the type checker is the blocker. Implementation requires desugaring to `(temp) => match temp { | pattern => body }`, coordinating parser (already works), desugarer, type checker, and code generator.

## Dependencies

- **Category 1 (String module access)** is a cross-cutting dependency that blocks 15/20 tests in this section and many tests across other sections. It depends on the module system / stdlib access infrastructure.
- **Category 2 (multi-arg calls)** is a core type checker feature that blocks 3 tests. Combined with Category 1, fixing both would unblock these 3 tests.
- **Category 3 (zero-arg lambdas)** is self-contained but also needs Category 1 to pass the test.
- **Category 4 (lambda destructuring)** is self-contained and independent.
- **No tests in this section have circular dependencies** on other section 06 features -- each test is relatively isolated.

## Summary Table

| Category | Tests | Root Cause | Scope | Complexity |
|----------|-------|------------|-------|------------|
| Stdlib module access (`String.fromInt`) | 15 | Module-qualified names parsed as record access on undefined variable; builtins use flat keys | Medium (2-8 hours) | Medium |
| Multi-argument call syntax | 3 | Type checker builds multi-param expected type instead of sequential curried application; unifier rejects arity mismatch | Medium (2-8 hours) | Medium |
| Zero-argument lambda | 1 | Desugarer throws internal error on 0-param lambda; needs unit-param handling | Small (1-2 hours) | Low |
| Lambda parameter destructuring | 1 | Type checker rejects non-variable patterns in lambda params (VF4017); not yet implemented | Large (1-3 days) | High |
