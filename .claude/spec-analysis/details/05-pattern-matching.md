# Section 05: Pattern Matching - Failure Analysis

## Summary
- Total tests: 27
- Passing: 16
- Failing: 11
- Key issues: Most failures stem from 3 root causes: (1) `String.fromInt` module-qualified name resolution is broken (7 tests), (2) user-defined non-generic variant constructors are not registered in the type environment (1 test), (3) nullary constructor `None` typed as zero-param function crashes type formatter (1 test), (4) exhaustiveness checker doesn't recognize `true`/`false` as covering `Bool` (1 test), (5) tuple type inference not implemented (1 test).

## Root Causes

### RC-1: Module-qualified builtin names (`String.fromInt`) not resolvable as expressions
**Affected tests:** variable pattern binds value, variant pattern - Some, list pattern - single element, list pattern - head and tail, list pattern - specific length, nested variant in variant, list pattern - specific length (sum)
**Description:** The typechecker registers builtins as flat names like `"String.fromInt"` in the type environment (see `builtins.ts:226`). However, when the parser encounters `String.fromInt(x)`, it parses it as a `RecordAccess` expression on `Var("String")`. The typechecker then tries to resolve `String` as a variable, which fails with `VF4100: Undefined variable 'String'`. There is no mechanism to translate `RecordAccess(Var("String"), "fromInt")` into a lookup of the flat key `"String.fromInt"`.
**Evidence:**
```
error[VF4100]: Undefined variable 'String'
  --> <stdin>:3:10
  |
3 |   | x => String.fromInt(x)
  |          ^
```
Verified that the underlying pattern matching features (variable binding, list destructuring, etc.) all work correctly when `String.fromInt` is removed from test code.
**Estimated complexity:** Medium - Requires either (a) adding a namespace/module resolution pass that converts `Var("String").fromInt` into a flat builtin lookup, or (b) restructuring how builtins are registered to use actual module/namespace objects, or (c) special-casing builtin module prefixes in the typechecker's variable resolution. Option (a) is likely simplest.
**Note:** This is a cross-cutting issue affecting many spec sections, not specific to pattern matching. The pattern matching features themselves work correctly.

### RC-2: User-defined non-generic variant type constructors not registered in type environment
**Affected tests:** or-pattern with variant constructors
**Description:** When a user defines a variant type without type parameters like `type Color = Red | Green | Blue`, the constructors `Red`, `Green`, `Blue` are never added to the type environment. The typechecker's `buildEnvironment()` in `environment.ts` only processes `ExternalDecl` and `ExternalBlock` declarations, ignoring `TypeDecl`. The `typeCheckDeclaration()` handler for `CoreTypeDecl` (line 241-244 in `typechecker.ts`) returns the environment unchanged, stating "Type declarations are already processed in buildEnvironment" -- but they are not. Built-in variants like `Option` and `Result` work because their constructors (`Some`, `None`, `Ok`, `Err`) are explicitly registered in `builtins.ts`. User-defined variant constructors have no equivalent registration path.
**Evidence:**
```
error[VF4100]: Undefined variable 'Green'
  --> <stdin>:2:9
  |
2 | let c = Green;
  |         ^
```
The code generator (`emit-declarations.ts:240-299`) correctly emits variant constructors as JS constants/functions, but the typechecker blocks compilation before codegen runs.
**Estimated complexity:** Medium - Need to add constructor registration logic in either `buildEnvironment` or `typeCheckDeclaration` for `CoreTypeDecl`/`CoreVariantTypeDef`. Must create proper type schemes for each constructor (nullary constructors get the type directly, constructors with args get function types). Also need to handle type parameters correctly for generic user-defined types.

### RC-3: Nullary constructor `None` typed as zero-param function crashes type formatter
**Affected tests:** variant pattern - None
**Description:** In `builtins.ts:99`, `None` is registered with `funType([], optionOfT)` -- a function type with zero parameters. When a type annotation like `Option<Int>` is provided and the typechecker needs to display a type error (during unification), `typeToString()` in `format.ts:23` throws `"Function type must have at least one parameter"` because it requires at least one param in the `Fun` type. This surfaces as an internal error (exit code 5) instead of a proper type error.
**Evidence:**
```
Internal error: Function type must have at least one parameter
```
Triggered by: `let x: Option<Int> = None;`
Works fine without type annotation: `let x = None;` compiles successfully.
**Estimated complexity:** Small - Either (a) represent nullary constructors as the result type directly (not a `Fun` type) in the builtin registration, or (b) handle zero-param `Fun` types in `typeToString`. Option (a) is semantically correct since `None` is a value, not a function.

### RC-4: Exhaustiveness checker doesn't recognize `true`/`false` as covering `Bool`
**Affected tests:** exhaustive match on bool, literal pattern matching - bool
**Description:** The exhaustiveness checker in `patterns.ts:351-403` only handles variant types (`App` types) for constructor coverage analysis. `Bool` is a `Const` type (`{ type: "Const", name: "Bool" }`), not an `App` type, so it falls through to the literal pattern check. The literal check (line 389-392) conservatively requires a wildcard/variable catch-all for any literal patterns, returning `["<other values>"]` even when both `true` and `false` are covered. This causes two failures: (1) `match true { | true => ... | false => ... }` is rejected as non-exhaustive at compile time, and (2) the same pattern in a runtime test fails because compilation is rejected.
**Evidence:**
```
error[VF4400]: Non-exhaustive pattern match. Missing cases: <other values>
  --> <stdin>:2:14
  |
2 | let result = match true {
  |              ^
```
**Estimated complexity:** Small - Add a special case in `checkExhaustiveness` for `Bool` (`Const` type with name `"Bool"`) that checks if both `true` and `false` literal patterns are present.

### RC-5: Tuple type inference not implemented
**Affected tests:** tuple pattern matching with correct arity
**Description:** The typechecker explicitly throws `VF4017: Tuple type inference not yet implemented` when encountering tuple expressions like `(1, 2)`. This is a known unimplemented feature, not a bug.
**Evidence:**
```
error[VF4017]: Tuple type inference not yet implemented
  --> <stdin>:2:12
  |
2 | let pair = (1, 2);
  |            ^
```
**Estimated complexity:** Large - Requires implementing tuple type inference in the typechecker (creating product types, unification for tuples), tuple pattern matching in the exhaustiveness checker, and potentially codegen updates for tuple representation.

## Test Classification by Root Cause

| Test | Root Cause | Actual Pattern Matching Bug? |
|------|-----------|------------------------------|
| literal pattern matching - bool | RC-4 | Yes (exhaustiveness) |
| variable pattern binds value | RC-1 | No (String.fromInt) |
| variant pattern - Some | RC-1 | No (String.fromInt) |
| variant pattern - None | RC-3 | No (None type representation) |
| list pattern - single element | RC-1 | No (String.fromInt) |
| list pattern - head and tail | RC-1 | No (String.fromInt) |
| list pattern - specific length | RC-1 | No (String.fromInt) |
| nested variant in variant | RC-1 | No (String.fromInt) |
| or-pattern with variant constructors | RC-2 | No (constructor registration) |
| exhaustive match on bool | RC-4 | Yes (exhaustiveness) |
| tuple pattern matching with correct arity | RC-5 | No (tuples unimplemented) |

## Dependencies

### Fixing RC-1 (String.fromInt) would unblock:
- 7 tests in this section
- Many tests in other sections (06-functions, 08-modules, etc.) that also use `String.fromInt`
- This is the highest-impact fix across the entire spec validation suite

### Fixing RC-2 (user-defined variant constructors) would unblock:
- 1 test here, plus any future tests using non-builtin variant types
- This is foundational for the type system -- without it, user-defined ADTs only work for codegen but not type checking

### Fixing RC-3 (None type representation) would unblock:
- 1 test here, and any test using explicit `Option<T>` type annotations with `None`

### Fixing RC-4 (Bool exhaustiveness) would unblock:
- 2 tests here (exhaustive bool match, bool literal pattern)

### Fixing RC-5 (tuples) would unblock:
- 1 test here, plus any future tuple-related tests

### Recommended fix order:
1. RC-1 (highest cross-section impact)
2. RC-2 (foundational type system feature)
3. RC-3 (small fix, unblocks variant usage)
4. RC-4 (small fix, improves exhaustiveness)
5. RC-5 (large effort, lower priority)
