# Section 12: Compilation - Failure Analysis

## Summary
- Total tests: 11
- Passing: 3
- Failing: 8
- Key issues: (1) stdlib module-qualified functions (`String.fromInt`, `List.length`) unresolvable at type-check time, (2) variant constructors not registered in type environment from `type` declarations, (3) multi-arg call sites not desugared to curried form, (4) `while` not usable as top-level statement, (5) pattern matching on user-defined variants fails due to missing constructor bindings

## Root Causes

### RC-1: Stdlib module-qualified functions are unreachable
**Affected tests:** "multi-param lambda desugars to curried form", "partial application works after desugaring", "records compile to JS objects", "lists compile and operate correctly"
**Description:** The builtin type environment registers stdlib functions under flat dotted keys like `"String.fromInt"`, `"List.length"`, etc. (in `packages/core/src/typechecker/builtins.ts`). However, the parser treats `String.fromInt(42)` as `App(RecordAccess(Var("String"), "fromInt"), [42])`. The typechecker then tries to resolve `Var("String")` as a variable, which does not exist in the environment. The flat key `"String.fromInt"` is never matched because the expression is structurally a record field access, not a variable lookup.

**Evidence:**
```
error[VF4100]: Undefined variable 'String'
  --> <stdin>:4:30
```
All tests using `String.fromInt(...)` or `List.length(...)` fail identically. The underlying data IS in the environment, but the resolution path (parser AST -> typechecker inference) never consults the flat dotted keys.

**Estimated complexity:** Medium -- requires either (a) adding module namespace objects to the type environment so `String` resolves as a record-like value with fields, or (b) special-casing `RecordAccess` on known module names to look up the dotted key, or (c) a pre-resolution pass that rewrites `RecordAccess(Var("String"), "fromInt")` to `Var("String.fromInt")`.

### RC-2: Variant constructors not registered in type environment
**Affected tests:** "pattern matching compiles correctly", "variant constructors compile correctly"
**Description:** When a `type` declaration like `type Shape = Circle(Float) | Rect(Float, Float)` is processed, the constructors `Circle` and `Rect` are never added to the type environment as value bindings. In `packages/core/src/typechecker/typechecker.ts` line 241-244, `CoreTypeDecl` is a no-op ("already processed in buildEnvironment"). In `packages/core/src/typechecker/environment.ts` line 128, `buildEnvironment` has a TODO: "Handle other declaration types (LetDecl, TypeDecl, etc.) when type checker is implemented." Neither location actually registers constructors.

This causes two failures:
1. **Expression context:** `let c = Green;` fails with `Undefined variable 'Green'` because `Green` is not in `env.values`.
2. **Pattern context:** `| Circle(r) => ...` fails with `Undefined constructor 'Circle'` because `checkVariantPattern` in `patterns.ts` looks up `pattern.constructor` in `env.values`.

**Evidence:**
```
error[VF4100]: Undefined variable 'Green'
  --> <stdin>:3:9

error[VF4102]: Undefined constructor 'Circle'
  --> <stdin>:4:5
```

**Estimated complexity:** Medium -- need to process `CoreTypeDecl` with `CoreVariantTypeDef` in the typechecker to register each constructor as a value binding with the appropriate type scheme (e.g., `Circle : (Float) -> Shape`, `Green : Color`). Must handle parameterized type constructors and generic variant types.

### RC-3: Multi-argument call sites not desugared to curried form
**Affected tests:** "functions compile to callable JS"
**Description:** The spec (`docs/spec/12-compilation/desugaring.md` lines 54-61) states that `add(10, 20)` should desugar to `((add(10))(20))`. The desugarer in `packages/core/src/desugarer/desugarer.ts` (lines 157-162) converts lambda definitions to curried form (`(a, b) => ...` becomes `(a) => (b) => ...`) but does NOT convert multi-argument call sites. The `App` case preserves all arguments in `CoreApp.args`. The typechecker then sees a function of type `Int -> (Int -> Int)` (arity 1) being called with 2 arguments, causing an arity mismatch.

**Evidence:**
```
error[VF4021]: Cannot unify functions with different arity: 1 vs 2
  --> <stdin>:3:14
  |
3 | let result = add(10, 20);
  |              ^
```

Compiling `let add = (a: Int, b: Int) => a + b; let result = add(10)(20);` works correctly (curried call succeeds), confirming the lambda desugaring works but call-site desugaring is missing.

**Estimated complexity:** Small -- in the desugarer's `App` case, when `args.length > 1`, transform to nested single-arg applications: `CoreApp(CoreApp(func, [arg0]), [arg1])` etc.

### RC-4: `while` loops cannot be used as top-level statements
**Affected tests:** "while loop desugars correctly"
**Description:** The test code places `while !i < 5 { ... };` at the top level (as a module-level statement). The parser's declaration parser (`parse-declarations.ts`) only accepts declaration keywords (`let`, `type`, `external`, `import`, `export`) at the top level. The `while` expression is parsed inside `parsePrimary` (in `parse-expression-primary.ts`) so it's only available inside expression contexts (blocks, let bindings). The error `VF2001: Unexpected keyword in declaration: while` confirms the parser rejects it at the top level.

Additionally, there is a secondary issue: the block expression parser (`parseBlockExpr` in `parse-expression-complex.ts`) requires a semicolon after EVERY expression before `}`. So `while cond { body }` inside a block would need `while cond { stmt; };` -- the while body block must also have trailing semicolons.

**Evidence:**
```
error[VF2001]: Unexpected keyword in declaration: while
  --> <stdin>:4:1
  |
4 | while !i < 5 {
  | ^
```

**Estimated complexity:** Small/Medium -- the test could be rewritten to wrap the while in a `let _ = { ... }` block, OR the parser could be extended to allow expression statements at the top level. The language design question is whether top-level expressions should be allowed.

### RC-5: Combined effect of RC-1 + RC-3 on some tests
**Affected tests:** "multi-param lambda desugars to curried form", "partial application works after desugaring"
**Description:** These tests have TWO failures stacked:
1. They use `String.fromInt(result)` which fails due to RC-1 (stdlib module functions unreachable).
2. The "multi-param lambda" test also calls `add(1)(2)(3)` which would work (curried calls are fine), but execution never reaches that point due to the `String.fromInt` failure.
3. The "partial application" test calls `add(1)` then `inc(5)` which would work since curried calls are fine, but again blocked by RC-1.

If RC-1 were fixed, these two tests would likely pass (the curried call syntax `add(1)(2)(3)` is already supported).

**Estimated complexity:** N/A -- resolved by fixing RC-1.

## Dependencies

### What fixing these enables:
- **RC-1 (stdlib resolution):** Unblocks ALL tests that use `String.fromInt`, `List.length`, or any module-qualified stdlib function. This is a cross-cutting issue affecting tests in many other sections too.
- **RC-2 (variant constructors):** Unblocks pattern matching on user-defined types, variant construction in expressions. Critical for idiomatic vibefun code.
- **RC-3 (call-site desugaring):** Unblocks natural multi-argument function call syntax `f(a, b)`. Without this, users must write `f(a)(b)`.
- **RC-4 (top-level while):** Depends on a design decision about top-level expression statements.

### Cross-section dependencies:
- RC-1 likely affects sections 11 (stdlib), 04 (expressions), and others that use `String.fromInt` in test output.
- RC-2 likely affects sections 03 (type system), 05 (pattern matching), and 04 (expressions) for variant-related tests.
- RC-3 likely affects section 06 (functions) tests that use multi-arg call syntax.

### Suggested fix order:
1. **RC-3** (Small) -- add call-site currying in desugarer
2. **RC-1** (Medium) -- stdlib module function resolution
3. **RC-2** (Medium) -- variant constructor registration in type environment
4. **RC-4** (Small/Medium) -- top-level expression statements or test rewrite
