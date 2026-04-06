# 11 - Standard Library: Spec Validation Analysis

## Summary

Section 11 tests the standard library modules: String, Int, Float, List, Option, Result, and Math. Of 53 tests, only 1 passes (String concatenation with `&`). The 52 failures stem from a fundamental architectural gap: the compiler registers stdlib function type signatures as flat keys (e.g., `"String.fromInt"`) in the type environment, but the parser produces `RecordAccess(Var("String"), "fromInt")` AST nodes. The typechecker tries to look up `String` as a variable, fails with `VF4100: Undefined variable`, and compilation aborts. Even if this type resolution issue were fixed, there is no code generation infrastructure to emit JavaScript runtime implementations for these stdlib functions. Additionally, several spec-defined functions are missing from the builtin type environment entirely, and the parameter order in builtins.ts does not match the spec or tests.

## Failure Categories

### Category 1: Module-Qualified Name Resolution (Core Architectural Issue)

- **Tests affected:** All 52 failing tests. Every test that calls a stdlib function via `Module.function()` syntax (e.g., `String.fromInt(42)`, `List.length(xs)`, `Option.map(x, fn)`, `Float.toInt(3.7)`, `Int.abs(-5)`, `Result.map(x, fn)`, etc.)
- **Root cause:** The parser represents `String.fromInt(42)` as `App(RecordAccess(Var("String"), "fromInt"), [42])`. The typechecker tries to resolve `String` via variable lookup in the type environment, which fails with `VF4100: Undefined variable 'String'`. Although `"String.fromInt"` exists as a flat key in the builtin environment (registered by `getBuiltinEnv()` in `packages/core/src/typechecker/builtins.ts`), there is no mechanism to resolve `RecordAccess` on a module-like identifier into the flat key `"String.fromInt"`. The desugarer passes `RecordAccess` through as `CoreRecordAccess` without any special handling for stdlib module access patterns.
- **Spec reference:** `docs/spec/11-stdlib/string.md`, `docs/spec/11-stdlib/numeric.md`, `docs/spec/11-stdlib/list.md`, `docs/spec/11-stdlib/option.md`, `docs/spec/11-stdlib/result.md`, `docs/spec/11-stdlib/math.md`
- **Scope estimate:** Large (1-3 days)
- **Complexity:** High
- **Notes:** The fix requires either: (a) modifying the desugarer or typechecker to recognize module-qualified identifiers (e.g., when a `RecordAccess` target is a known stdlib module name, rewrite it to a flat `CoreVar("String.fromInt")` call), or (b) implementing a proper module system where `String`, `List`, `Int`, `Float`, `Option`, `Result` are actual module-like namespace objects in the type environment. This is the single most impactful issue -- fixing it removes the dominant early blocker for all 52 failing tests (though Categories 3/4/5/6 introduce additional typechecker-level failures that would surface afterward).

### Category 2: Missing Code Generation for Stdlib Functions

- **Tests affected:** All 52 failing tests (would surface once Category 1 is fixed)
- **Root cause:** There is no runtime JavaScript implementation of stdlib functions. The codegen (`packages/core/src/codegen/es2020/`) only injects `ref()` and `$eq()` runtime helpers. It does not emit implementations for `String.fromInt`, `List.map`, `Option.map`, etc. Even if type checking passes, the generated JavaScript would reference undefined functions at runtime.
- **Spec reference:** All files in `docs/spec/11-stdlib/`
- **Scope estimate:** Large (1-3 days)
- **Complexity:** Medium
- **Notes:** Each stdlib function needs a JavaScript implementation injected into the generated output (or provided via an imported runtime module). Many are straightforward JS wrappers -- e.g., `String.fromInt` maps to `String(n)`, `List.length` maps to array `.length`, `Float.floor` maps to `Math.floor()` -- but they all need to be implemented and conditionally emitted. The current codegen for `CoreRecordAccess` emits `record.field` which would produce `String.fromInt(42)` in JS, but there's no `String` object with a `fromInt` method.

### Category 3: Parameter Order Mismatch in Builtin Type Signatures

- **Tests affected:** All List, Option, and Result function tests (33 tests): `List.map`, `List.filter`, `List.fold`, `List.foldRight`, `List.head`, `List.tail`, `List.reverse`, `List.concat`, `List.flatten`, `Option.map`, `Option.flatMap`, `Option.getOrElse`, `Option.isSome`, `Option.isNone`, `Result.map`, `Result.mapErr`, `Result.flatMap`, `Result.unwrapOr`, `Result.isOk`, `Result.isErr`
- **Root cause:** The builtin type signatures in `builtins.ts` use function-first parameter order (e.g., `List.map: (fn, list) -> List<U>`), but the spec and tests use data-first parameter order (e.g., `List.map: (List<A>, fn) -> List<B>`). Examples:
  - `List.map` builtin: `((T) -> U, List<T>) -> List<U>` vs spec: `(List<A>, (A) -> B) -> List<B>`
  - `Option.map` builtin: `((T) -> U, Option<T>) -> Option<U>` vs spec: `(Option<A>, (A) -> B) -> Option<B>`
  - `Option.getOrElse` builtin: `(T, Option<T>) -> T` vs spec: `(Option<A>, A) -> A`
  - `Result.unwrapOr` builtin: `(T, Result<T, E>) -> T` vs spec: `(Result<T, E>, T) -> T`
- **Spec reference:** `docs/spec/11-stdlib/list.md`, `docs/spec/11-stdlib/option.md`, `docs/spec/11-stdlib/result.md`
- **Scope estimate:** Small (1-2 hours)
- **Complexity:** Low
- **Notes:** This is a straightforward fix: swap the parameter order in each builtin type signature to match the spec. Would surface as type errors once Category 1 is fixed.

### Category 4: Missing Builtin Type Signatures

- **Tests affected:** `String.fromBool` (1 test directly), `Float.isNaN`, `Float.isInfinite`, `Float.isFinite` (3 tests), `List.flatten` (1 test) = 5 tests total
- **Root cause:** Several functions specified in the language spec are not registered in `getBuiltinEnv()` in `builtins.ts`:
  - `String.fromBool: (Bool) -> String` -- referenced in `docs/spec/02-lexical-structure/operators.md` and `docs/spec/04-expressions/basic-expressions.md` but missing from builtins (and from `docs/spec/11-stdlib/string.md`)
  - `Float.isNaN: (Float) -> Bool` -- specified in `docs/spec/11-stdlib/numeric.md` but not in builtins
  - `Float.isInfinite: (Float) -> Bool` -- specified in `docs/spec/11-stdlib/numeric.md` but not in builtins
  - `Float.isFinite: (Float) -> Bool` -- specified in `docs/spec/11-stdlib/numeric.md` but not in builtins
  - `List.flatten: <A>(List<List<A>>) -> List<A>` -- specified in `docs/spec/11-stdlib/list.md` but not in builtins
- **Spec reference:** `docs/spec/11-stdlib/numeric.md`, `docs/spec/11-stdlib/list.md`, `docs/spec/02-lexical-structure/operators.md`
- **Scope estimate:** Small (1-2 hours)
- **Complexity:** Low
- **Notes:** Adding these signatures to `getBuiltinEnv()` is straightforward. The corresponding runtime implementations would also need to be added as part of Category 2.

### Category 5: Zero-Argument Constructor Type Annotation Bug

- **Tests affected:** `Option.getOrElse` (exit code 5), `Option.isNone` (exit code 5) = 2 tests
- **Root cause:** The expression `let x: Option<Int> = None;` produces an internal compiler error: "Function type must have at least one parameter" (exit code 5). The `None` constructor is typed as `() -> Option<T>` (a zero-argument function), and when a type annotation `Option<Int>` is provided, the typechecker fails trying to unify a zero-argument function type with the annotated type. `let x = None;` without annotation works fine. `let x: Option<Int> = Some(5);` also works. This is a pre-existing typechecker bug unrelated to stdlib but triggered by these tests.
- **Spec reference:** `docs/spec/11-stdlib/option.md`, `docs/spec/03-type-system/variant-types.md`
- **Scope estimate:** Medium (2-8 hours)
- **Complexity:** Medium
- **Notes:** This bug is not stdlib-specific -- it affects any zero-argument variant constructor (like `None`, `Nil`) used with a type annotation. The tests could work around this by removing the type annotation (e.g., `let x = None;`), but the underlying bug should be fixed. Even without this bug, these tests would still fail due to Categories 1 and 2.

### Category 6: User Type Redefinition Conflicts with Built-in Types

- **Tests affected:** All tests that include `type Option<T> = Some(T) | None;` or `type Result<T, E> = Ok(T) | Err(E);` (approximately 19 tests)
- **Root cause:** The tests redundantly redefine `Option` and `Result` as user types, even though these are already built-in types. Redefining creates a new type name that conflicts with the built-in type. For example, trying to assign `Some(5)` to a user-defined `Option<Int>` fails with `VF4020: Cannot unify Option with Option2` (when renamed) because the `Some` constructor is bound to the built-in `Option`, not the user-defined one. The tests likely include these definitions for self-containment, not realizing the types are built-in.
- **Spec reference:** `docs/spec/11-stdlib/option.md`, `docs/spec/11-stdlib/result.md`
- **Scope estimate:** Small (1-2 hours) -- test fix only
- **Complexity:** Low
- **Notes:** This is purely a test authoring issue. The tests should not redefine `Option` and `Result` since they are built-in types. Removing the `type` declarations from the tests would eliminate this conflict. Note that when these type declarations are present with the same name (e.g., `type Option<T> = Some(T) | None;`), the compiler produces them as duplicate user types that shadow or conflict with the built-in. This issue is secondary to Categories 1 and 2 -- even with correct type declarations, the stdlib function calls would still fail.

## Dependencies

- **Category 1 (name resolution) blocks all other categories.** No stdlib function can pass the typechecker until module-qualified names are properly resolved.
- **Category 2 (codegen) blocks all runtime tests.** Even with correct type checking, the generated JavaScript has no stdlib function implementations.
- **Category 3 (parameter order) would only surface after Category 1 is fixed.** Once name resolution works, type unification would fail due to argument order mismatches.
- **Category 4 (missing signatures) is independent but low priority** since it only adds 5 more functions to the existing builtins infrastructure.
- **Category 5 (zero-arg constructor bug) is independent** of stdlib work but affects 2 tests in this section. It is a typechecker bug that should be fixed separately.
- **Category 6 (type redefinition)** is a test authoring issue that should be fixed in the test file itself.

The critical path to making these tests pass is: Category 1 (resolve module names) -> Category 2 (codegen runtime) -> Category 3 (fix param order) + Category 4 (add missing signatures) + Category 6 (fix tests).

## Summary Table

| Category | Tests | Root Cause | Scope | Complexity |
|----------|-------|------------|-------|------------|
| Module-qualified name resolution | 52 | Parser produces `RecordAccess(Var("String"), "fromInt")` but typechecker has no mechanism to resolve module-like identifiers to flat builtin keys like `"String.fromInt"` | Large (1-3 days) | High |
| Missing stdlib codegen/runtime | 52 | No JavaScript implementations emitted for stdlib functions; codegen only has `ref()` and `$eq()` helpers | Large (1-3 days) | Medium |
| Parameter order mismatch | 33 | Builtins use function-first order (e.g., `(fn, list)`) but spec/tests use data-first (e.g., `(list, fn)`) | Small (1-2 hours) | Low |
| Missing builtin type signatures | 5 | `String.fromBool`, `Float.isNaN/isInfinite/isFinite`, `List.flatten` not registered in `getBuiltinEnv()` | Small (1-2 hours) | Low |
| Zero-arg constructor annotation bug | 2 | `let x: Option<Int> = None;` crashes with "Function type must have at least one parameter" (exit code 5) | Medium (2-8 hours) | Medium |
| User type redefinition in tests | 19 | Tests redefine built-in `Option`/`Result` types, causing constructor/type conflicts | Small (1-2 hours) | Low |
