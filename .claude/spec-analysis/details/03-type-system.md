# Section 03: Type System - Failure Analysis

## Summary
- Total tests: 44
- Passing: 19
- Failing: 25
- Key issues: Six distinct root causes account for all 25 failures. The two most impactful are: (1) `String.fromInt`/`String.fromBool` module-qualified calls cannot be resolved (affects 12 tests that need runtime output), and (2) user-defined type declarations (variants, aliases, generics) are not registered in the type environment (affects 9 tests). Additional issues include multi-arg call arity mismatch, tuple type inference being unimplemented, string literal union types not parseable, and explicit type parameter syntax on lambdas not being parsed.

## Root Causes

### RC-1: Module-qualified stdlib functions not resolvable (`String.fromInt`, `String.fromBool`, `String.fromFloat`)
**Affected tests:** Int type, Float type, Bool type, Int division truncates toward zero, negative Int division truncates toward zero, Bool logical AND, Bool logical OR, function type inference, record immutable update (spread), tuple destructuring, single element is not a tuple, generic function (12 tests)
**Description:** The type checker registers builtins like `String.fromInt` as flat string keys (e.g., `env.set("String.fromInt", ...)`) in `builtins.ts`. However, the parser resolves `String.fromInt(x)` as `App(RecordAccess(Var("String"), "fromInt"), ...)` -- it tries to look up `String` as a variable first, which doesn't exist, producing error `VF4100: Undefined variable 'String'`. All `expectRunOutput` tests that use `String.fromInt()`, `String.fromFloat()`, or `String.fromBool()` via the `withOutput()` helper are affected.

Additionally, `String.fromBool` is not registered in `builtins.ts` at all. Only `String.fromInt` and `String.fromFloat` exist. The Bool tests would still fail even after fixing the namespace resolution.
**Evidence:**
```
error[VF4100]: Undefined variable 'String'
  --> <stdin>:3:30
  |
3 | let _ = unsafe { console_log(String.fromInt(x)) };
  |                              ^
```
**Estimated complexity:** Medium -- Requires either (a) a module/namespace resolution system mapping `String` to a namespace object, or (b) special-case handling in the type checker to resolve `RecordAccess(Var("ModuleName"), "func")` patterns against the builtin registry. Option (b) is simpler but less principled. Adding `String.fromBool` is trivial once resolution works.

### RC-2: User-defined type declarations not registered in type environment
**Affected tests:** variant type definition and construction, variant pattern matching, generic type definition, type alias is transparent, recursive variant type with multiple constructors (5 tests directly; 4 more indirectly)
**Description:** The `buildEnvironment()` function in `environment.ts` has a TODO at line 128: `// TODO: Handle other declaration types (LetDecl, TypeDecl, etc.) when type checker is implemented`. Meanwhile, the typechecker's `CoreTypeDecl` handler (line 241-244 of `typechecker.ts`) says "Type declarations are already processed in buildEnvironment" and does nothing. This means:

1. **Variant constructors** from user-defined types are never added to the value environment. `type Color = Red | Green | Blue; let c = Red;` fails because `Red` is an undefined variable.
2. **Type aliases** (e.g., `type UserId = Int`) are never registered, so `let id: UserId = 42` fails with "Cannot unify Int with UserId" because `UserId` is treated as an opaque type name rather than an alias for `Int`.
3. **Generic type definitions** (e.g., `type Box<T> = { value: T }`) are not registered, so `let b: Box<Int> = { value: 42 }` fails with "Cannot unify types: { value: Int } with Box<Int>".

Note: Variant constructors from **builtin** types (Some, None, Cons, Nil) ARE registered in `builtins.ts` and work fine. Only **user-defined** variants are broken.
**Evidence:**
```
error[VF4100]: Undefined variable 'Red'
  --> <stdin>:2:9
  |
2 | let c = Red;
  |         ^

error[VF4020]: Cannot unify Int with UserId
  --> <stdin>:2:18
  |
2 | let id: UserId = 42;
  |                  ^

error[VF4024]: Cannot unify types: { value: Int } with Box<Int>
  --> <stdin>:2:19
  |
2 | let b: Box<Int> = { value: 42 };
  |                   ^
```
**Estimated complexity:** Large -- Requires implementing the `CoreTypeDecl` processing in the type checker to: (a) register variant constructors with proper polymorphic type schemes in the value environment, (b) resolve type aliases transparently during unification, and (c) handle generic type definitions with proper type parameter substitution.

### RC-3: Multi-argument call syntax `f(a, b)` produces arity mismatch with curried functions
**Affected tests:** function type inference, generic function (2 tests directly; more masked by RC-1)
**Description:** The desugarer curries multi-parameter lambdas (`(x, y) => body` becomes `(x) => (y) => body`), but does NOT curry multi-argument application nodes. `add(2, 3)` remains as `CoreApp { func: add, args: [2, 3] }`. The type checker's `inferApp` creates an expected type `(Int, Int) -> T` (2-param function) which fails to unify with the actual curried type `(Int) -> (Int) -> Int` (1-param function).
**Evidence:**
```
error[VF4021]: Cannot unify functions with different arity: 1 vs 2
  --> <stdin>:2:14
  |
2 | let result = add(2, 3);
  |              ^
```
**Estimated complexity:** Small -- Either desugar multi-arg `CoreApp` into nested single-arg applications, or modify the type checker's `inferApp` to iteratively apply arguments one at a time against curried function types.

### RC-4: Tuple type inference not implemented
**Affected tests:** tuple construction, tuple destructuring, triple tuple, nested tuples (4 tests)
**Description:** The type checker explicitly throws a "not yet implemented" error for tuple expressions. Error code `VF4017` is thrown with the message "Tuple type inference not yet implemented". This affects all tests that construct tuples with `(1, "hello")` syntax. The "single element is not a tuple" and "unit is zero-element tuple" tests are NOT affected because `(42)` is just grouping (parsed as `42`) and `()` is parsed as Unit.
**Evidence:**
```
error[VF4017]: Tuple type inference not yet implemented
  --> <stdin>:1:9
  |
1 | let t = (1, "hello");
  |         ^
```
**Estimated complexity:** Medium -- Requires implementing tuple type inference in the type checker, tuple pattern matching, and ensuring tuple types flow through unification correctly. The `Tuple` type variant already exists in the type system (`type: "Tuple"`) and tuple destructuring patterns exist in the AST, so the infrastructure is partially in place.

### RC-5: String literal union types not parseable in type position
**Affected tests:** string literal union type (1 test)
**Description:** The parser does not accept string literals in type position. `type Status = "pending" | "active" | "complete"` fails with `VF2301: Expected type expression` at the first string literal. The parser's type expression handler does not recognize string tokens as valid type expressions.
**Evidence:**
```
error[VF2301]: Expected type expression
  --> <stdin>:1:15
  |
1 | type Status = "pending" | "active" | "complete";
  |               ^
```
**Estimated complexity:** Medium -- Requires extending the parser's type expression grammar to accept string literals as singleton types, and extending the type system to support literal types (string literal types). The `Union` type variant exists but needs literal type support.

### RC-6: Explicit type parameter syntax `<T>` not parsed in lambda expressions
**Affected tests:** polymorphic identity function (1 test)
**Description:** The syntax `let id = <T>(x: T): T => x;` with explicit type parameters on lambdas is not parsed. The parser encounters `<` after `=` and reports `VF2101: Unexpected token: 'OP_LT'`. The parser does not recognize `<T>` as a type parameter list prefix for lambda expressions.
**Evidence:**
```
error[VF2101]: Unexpected token: 'OP_LT'
  --> <stdin>:1:10
  |
1 | let id = <T>(x: T): T => x;
  |          ^
```
**Estimated complexity:** Medium -- Requires extending the parser to recognize `<TypeParams>` before lambda parameter lists. The parser already handles type parameters in `type` declarations (e.g., `type Option<T> = ...`), so the tokenization infrastructure exists, but lambda-level type parameter parsing needs to be added. Additionally, the type checker needs to handle explicit type parameters during inference.

### RC-7: Internal crash on zero-parameter function types in error formatting
**Affected tests:** variant with data, recursive variant type (2 tests)
**Description:** The builtin registrations for `Nil` and `None` use `funType([], listOfT)` and `funType([], optionOfT)` respectively -- function types with zero parameters. When any type error triggers formatting of these types (via `typeToString` in `format.ts`), it throws `"Function type must have at least one parameter"` at line 24, producing an internal error (exit code 5) instead of a proper diagnostic.

The "variant with data" test (`type Option<T> = Some(T) | None; let x = Some(42); let y: Option<Int> = None;`) triggers this because `Option<Int>` is not a registered type (RC-2), causing a unification failure, and the error formatting then encounters the zero-param Fun type for `None`.

The "recursive variant type" test (`type IntList = Nil | Cons(Int, IntList); let xs = Cons(1, Cons(2, Nil));`) triggers this because `Cons(1, Cons(2, Nil))` is a multi-arg call that fails arity check (RC-3), and the error message formatting encounters the zero-param Fun type for the builtin `Nil`/`Cons`.
**Evidence:**
```
Internal error: Function type must have at least one parameter
---EXIT:5
```
Source: `format.ts` line 23-24:
```typescript
if (!firstParam) {
    throw new Error("Function type must have at least one parameter");
}
```
Builtin registration in `builtins.ts`:
```typescript
env.set("Nil", polyScheme([tVarId], funType([], listOfT)));
env.set("None", polyScheme([tVar2Id], funType([], optionOfT)));
```
**Estimated complexity:** Simple -- Either (a) fix `typeToString` to handle zero-param function types gracefully (render as `() -> T`), or (b) change the representation of nullary constructors to not use `Fun` types (use the result type directly). Option (a) is a quick fix; option (b) is more correct.

### RC-8: Missing required record fields not rejected (too-permissive width subtyping)
**Affected tests:** missing required fields rejected (1 test)
**Description:** The test expects `greet({ name: "Alice" })` to fail when `greet` expects `{ name: String, age: Int }`. But the compiler accepts it (exit code 0). The type checker's record unification apparently uses width subtyping too permissively -- it allows records with fewer fields than required rather than only allowing records with extra fields. This is inverted from what width subtyping should do: `{ name, age, city }` should be passable where `{ name }` is expected (extra fields OK), but `{ name }` should NOT be passable where `{ name, age }` is expected (missing fields).
**Evidence:**
```
Expected compilation error (exit 1), got exit code 0
```
The source compiles without error:
```
let greet = (p: { name: String, age: Int }) => p.name;
let partial = { name: "Alice" };
let result = greet(partial);
```
**Estimated complexity:** Small -- The record unification logic needs to be fixed to ensure all required fields in the expected type are present in the actual type. The current implementation likely only checks that fields present in the actual type match, without verifying all expected fields exist.

## Dependencies

### What these fixes depend on
- RC-1 (namespace resolution) is a prerequisite for testing most runtime behavior since nearly all `expectRunOutput` tests use `String.fromInt/fromFloat/fromBool`
- RC-2 (type declarations) is foundational -- variant types, type aliases, and generic types are used pervasively in later spec sections (pattern matching, modules, etc.)
- RC-3 (multi-arg calls) blocks any test using multi-parameter functions with the `f(a, b)` call syntax
- RC-7 (format crash) should be fixed immediately as it masks real errors with unhelpful internal crashes

### What these fixes enable
- Fixing RC-1 + RC-3 would unblock the majority of runtime output tests across ALL spec sections (not just 03)
- Fixing RC-2 would unblock variant pattern matching (section 05), user-defined types throughout, and module exports
- Fixing RC-4 (tuples) is self-contained and enables tuple-related tests
- Fixing RC-5 (string literal unions) and RC-6 (explicit type params) are isolated features

### Suggested fix order
1. RC-7 (trivial crash fix, prevents confusing internal errors)
2. RC-1 (unblocks ~60%+ of all spec validation tests across all sections)
3. RC-3 (unblocks multi-arg function calls, affects many sections)
4. RC-2 (unblocks user-defined types, large but high-impact)
5. RC-8 (small fix for record subtyping correctness)
6. RC-4 (tuple inference)
7. RC-5, RC-6 (lower priority, isolated features)
