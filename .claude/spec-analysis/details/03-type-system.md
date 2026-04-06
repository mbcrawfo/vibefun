# 03 - Type System: Spec Validation Analysis

## Summary

Section 03 covers the Vibefun type system: primitive types, type inference (Hindley-Milner), records, variants, generics, tuples, union types, recursive types, type aliases, and subtyping. Out of 54 tests, 25 pass and 29 fail. The failures stem from a small number of root causes that cascade widely, with two dominant issues: (1) standard library module-qualified functions (`String.fromInt`, `String.fromFloat`, `String.fromBool`) cannot be called from user code because the parser represents `String.fromInt(x)` as a record field access on an undefined variable `String`, even though the type checker registers `"String.fromInt"` as a flat name in its builtin environment; and (2) user-defined type declarations (variant types, type aliases, generic record types) are not registered in the type checker's environment, so their constructors and aliases are unavailable during type checking.

**Actual test results (from running `pnpm run spec:validate --section 03-type-system --verbose`):**
- 25 PASS, 29 FAIL, 0 ERROR

## Failure Categories

### Category 1: Standard Library Module-Qualified Functions Not Callable

- **Tests affected:** Int type, Float type, Bool type, Int division truncates toward zero, negative Int division truncates toward zero, Bool type supports logical operators, function type inference, record immutable update (spread), field order does not matter, single element is not a tuple (just grouping), Hindley-Milner infers function parameter types
- **Count:** 11 tests
- **Root cause:** The builtin environment (`packages/core/src/typechecker/builtins.ts`) registers standard library functions using dot-qualified flat names like `"String.fromInt"`, `"String.fromFloat"`, `"Int.toString"`, etc. However, the parser represents `String.fromInt(x)` as a `RecordAccess` AST node: a field access `.fromInt` on the variable `String`. When the type checker encounters `String` as a variable reference, it reports `VF4100: Undefined variable 'String'` because `String` is not in the value environment -- only `"String.fromInt"` (as a single key) is. The `withOutput()` test helper wraps test code with calls like `String.fromInt(x)` for console output, so any test that needs runtime output verification using `String.fromInt`, `String.fromFloat`, or `String.fromBool` will fail. Additionally, `String.fromBool` does not exist at all in the builtins -- it is entirely missing from the builtin registration.
- **Spec reference:** `03-type-system/primitive-types.md` (conversion functions section), `11-stdlib/numeric.md`
- **Evidence:**
  - `echo 'let x: Int = 42;' | ... compile -` succeeds (compiles fine)
  - `echo '...String.fromInt(x)...' | ... run -` fails with `VF4100: Undefined variable 'String'`
  - Features being tested (integer arithmetic, booleans, records, etc.) actually work when tested without `String.fromInt`
- **Scope estimate:** Medium (2-8 hours)
- **Complexity:** Medium
- **Notes:** `String.fromBool` is additionally completely unregistered in builtins, requiring a separate addition. Many of these 11 tests would pass immediately if this issue were fixed, since the underlying features (int arithmetic, bool logic, records, tuples) already work correctly.

### Category 2: User-Defined Variant Type Constructors Not Registered in Type Environment

- **Tests affected:** variant type definition and construction, variant with data, variant pattern matching, recursive variant type (single constructor), recursive variant type with multiple constructors, mutually recursive types with and
- **Count:** 6 tests
- **Root cause:** The `buildEnvironment()` function in `packages/core/src/typechecker/environment.ts` only processes `ExternalDecl` declarations. Line 128 contains `// TODO: Handle other declaration types (LetDecl, TypeDecl, etc.) when type checker is implemented`. When user code declares `type Color = Red | Green | Blue;`, the parser and code generator correctly produce constructors (`Red`, `Green`, `Blue` as JS objects), but the type checker never registers these constructors in its value environment. Attempting to use `Red` results in `VF4100: Undefined variable 'Red'`. For parameterized variant types like `type Option<T> = Some(T) | None`, an additional issue arises: the code generator hits an internal error `Function type must have at least one parameter` (exit code 5) when trying to generate the `None` constructor for user-defined types.
- **Spec reference:** `03-type-system/variant-types.md`, `03-type-system/recursive-types.md`
- **Evidence:**
  - `type Color = Red | Green | Blue;` compiles to correct JS, but `let c = Red;` after it fails with `VF4100`
  - `type Option<T> = Some(T) | None;` causes exit code 5 (internal error)
  - The built-in `List`, `Option`, `Result` variants work because their constructors (`Cons`, `Nil`, `Some`, `None`, `Ok`, `Err`) are manually registered in `builtins.ts`
- **Scope estimate:** Large (1-3 days)
- **Complexity:** High
- **Notes:** The "variant constructors are functions" test passes because `Some` is pre-registered as a builtin. The nominal typing test passes because it only checks that a compile error occurs (which it does, but for the wrong reason: undefined constructors rather than nominal type mismatch).

### Category 3: Type Alias Transparency Not Implemented

- **Tests affected:** type alias is transparent
- **Count:** 1 test
- **Root cause:** The type checker does not expand type aliases. When code declares `type UserId = Int;` and then `let id: UserId = 42;`, the type checker sees `UserId` as a distinct type constructor rather than expanding it to `Int`, resulting in `VF4020: Cannot unify Int with UserId`. Type alias declarations are parsed and code-generated (as no-ops, since aliases have no runtime representation), but the type checker never records the alias relationship.
- **Spec reference:** `03-type-system/type-aliases.md` (transparent type aliases section)
- **Evidence:**
  - `echo 'type UserId = Int; let id: UserId = 42;' | ... compile -` fails with `VF4020: Cannot unify Int with UserId`
- **Scope estimate:** Medium (2-8 hours)
- **Complexity:** Medium
- **Notes:** The "generic type alias" test passes because it only checks compilation of `type Callback<T> = (T) -> Unit;`, which is a no-op in the type checker.

### Category 4: Generic Record Type Definitions Not Resolved

- **Tests affected:** generic type definition
- **Count:** 1 test
- **Root cause:** When code declares `type Box<T> = { value: T };` and then `let b: Box<Int> = { value: 42 };`, the type checker cannot resolve `Box<Int>` to `{ value: Int }`. It produces `VF4024: Cannot unify types: { value: Int } with Box<Int>`. The type checker does not expand generic type definitions when they appear in type annotations.
- **Spec reference:** `03-type-system/generic-types.md`
- **Evidence:**
  - `echo 'type Box<T> = { value: T }; let b: Box<Int> = { value: 42 };' | ... compile -` fails with `VF4024`
- **Scope estimate:** Medium (2-8 hours)
- **Complexity:** Medium
- **Notes:** This is closely related to Category 3 (type alias transparency) and could be solved as part of the same effort.

### Category 5: Explicit Type Parameters on Functions Not Parsed

- **Tests affected:** polymorphic identity function, generic function
- **Count:** 2 tests
- **Root cause:** The parser does not support explicit type parameter syntax on lambda expressions. Code like `let id = <T>(x: T): T => x;` fails at parse time with `VF2101: Unexpected token: 'OP_LT'`. The parser sees the `<` as a less-than operator rather than the start of a type parameter list. The spec defines that functions can declare type parameters with `<T>` prefix syntax, but this is not yet implemented in the parser.
- **Spec reference:** `03-type-system/type-inference.md` (Type Variable Syntax section), `03-type-system/generic-types.md`
- **Evidence:**
  - `echo 'let id = <T>(x: T): T => x;' | ... compile -` fails with `VF2101: Unexpected token: 'OP_LT'`
  - `echo 'let first = <A, B>(a: A, b: B): A => a;' | ... compile -` same error
- **Scope estimate:** Medium (2-8 hours)
- **Complexity:** Medium
- **Notes:** Type inference already works for polymorphic functions without explicit annotations (the `let-polymorphism generalization` test passes). This feature is about supporting optional explicit type parameter declarations.

### Category 6: Multi-Argument Function Calls (Curried vs Tupled)

- **Tests affected:** function type inference (partially - combined with Category 1)
- **Count:** 1 test (contributes to function type inference failure alongside Category 1)
- **Root cause:** All multi-parameter functions in Vibefun are auto-curried. `(x: Int, y: Int) => x + y` compiles to `(x) => (y) => x + y`. The test calls `add(2, 3)` which the type checker rejects with `VF4021: Cannot unify functions with different arity: 1 vs 2` because `add` is a 1-argument function (returning another function). The correct curried call would be `add(2)(3)`. However, the test uses tupled calling convention `add(2, 3)`.
- **Spec reference:** `06-functions.md` (currying section), `03-type-system/type-inference.md`
- **Evidence:**
  - `echo 'let add = (x: Int, y: Int) => x + y; let result = add(2, 3);' | ... compile -` fails with `VF4021`
  - `echo 'let add = (x: Int, y: Int) => x + y; let result = add(2)(3);' | ... compile -` succeeds
- **Scope estimate:** Small (1-2 hours) if tests are adjusted to use curried calling; Medium (2-8 hours) if multi-arg call desugaring needs to be implemented
- **Complexity:** Low-Medium
- **Notes:** This may be a test issue rather than a compiler bug. The spec describes auto-currying. However, many languages with auto-currying also support tupled calling syntax as sugar. Clarification needed on whether `f(a, b)` should desugar to `f(a)(b)`.

### Category 7: Tuples Not Implemented in Type Checker

- **Tests affected:** tuple construction, tuple destructuring, triple tuple, nested tuples
- **Count:** 4 tests
- **Root cause:** The type checker explicitly reports `VF4017: Tuple type inference not yet implemented` when encountering tuple expressions. Tuples are parsed correctly (the parser produces `Tuple` AST nodes), but the type inference pass throws this error. The single-element case `(42)` is correctly treated as grouping (not a tuple), and the zero-element case `()` works as Unit.
- **Spec reference:** `03-type-system/tuples.md`
- **Evidence:**
  - `echo 'let pair = (1, "hello");' | ... compile -` fails with `VF4017: Tuple type inference not yet implemented`
- **Scope estimate:** Large (1-3 days)
- **Complexity:** High
- **Notes:** Some tuple-related negative tests pass correctly: "tuple index access is forbidden" and "tuple destructuring arity mismatch rejected" both pass, likely because the parser/typechecker rejects these before reaching the unimplemented tuple inference.

### Category 8: String Literal Union Types Not Parsed

- **Tests affected:** string literal union type
- **Count:** 1 test
- **Root cause:** The parser does not support string literals in type definitions. `type Status = "pending" | "active" | "complete";` fails with `VF2301: Expected type expression` at the first string literal. The parser's type expression grammar only handles identifiers, generic types, function types, and record types -- not string literal types.
- **Spec reference:** `03-type-system/union-types.md` (String Literal Union Types section)
- **Evidence:**
  - `echo 'type Status = "pending" | "active" | "complete";' | ... compile -` fails with `VF2301`
- **Scope estimate:** Medium (2-8 hours)
- **Complexity:** Medium
- **Notes:** The negative test "string literal union rejects invalid literal" passes, but only because compilation fails at parse time for any string literal union type, not because the compiler validates the literal value.

### Category 9: Missing Validation of Type Declarations

- **Tests affected:** unguarded recursion rejected, recursive type alias rejected, missing required fields rejected
- **Count:** 3 tests
- **Root cause:** The type checker does not validate type declarations. It treats `TypeDecl` as a no-op (line 241-244 of `typechecker.ts`: "Type declarations are already processed in buildEnvironment / Nothing to do here"). Since `buildEnvironment` also does not process type declarations (only externals), no validation occurs. Unguarded recursive types (`type Bad = Bad;`), recursive type aliases (`type Loop = (Int, Loop);`), and missing record fields all compile without error. For missing fields, the width subtyping implementation during unification is symmetric (ignores extra fields in either direction), so `{ name: "Alice" }` unifies with `{ name: String, age: Int }` because the common field `name` matches and the missing field `age` is ignored.
- **Spec reference:** `03-type-system/recursive-types.md` (guarded recursion requirement), `03-type-system/type-aliases.md` (recursive alias prohibition), `03-type-system/record-types.md` (required fields), `03-type-system/subtyping.md`
- **Evidence:**
  - `echo 'type Bad = Bad;' | ... compile -` succeeds (should fail)
  - `echo 'type Loop = (Int, Loop);' | ... compile -` succeeds (should fail)
  - `echo 'let greet = (p: { name: String, age: Int }) => p.name; let partial = { name: "Alice" }; let result = greet(partial);' | ... compile -` succeeds (should fail -- missing `age`)
- **Scope estimate:** Medium (2-8 hours) for recursion checks; Medium (2-8 hours) for directional record subtyping
- **Complexity:** Medium-High
- **Notes:** The missing-fields issue is fundamentally about width subtyping being bidirectional in unification. The spec says width subtyping allows extra fields in the argument, but the current implementation ignores missing fields too. Fixing this requires directional subtyping at call sites (argument can have extra fields, but must have all required fields).

## Dependencies

1. **Category 2 (variant constructors) depends on Category 3 (type aliases)** -- Both require the type checker to process `TypeDecl` nodes. A unified approach to type declaration processing would address both.
2. **Category 4 (generic record types) depends on Category 3** -- Generic type expansion is a superset of alias expansion.
3. **Category 1 (stdlib functions) is independent** -- Can be fixed separately from all other categories.
4. **Category 5 (explicit type params) is independent** -- Parser-level change, independent of type checker issues.
5. **Category 7 (tuples) is independent** -- Self-contained feature implementation.
6. **Category 8 (string literal unions) is independent** -- Parser + type checker addition.
7. **Category 9 (validation) depends on Categories 2/3** -- Can only validate type declarations once they are being processed.

## Summary Table

| Category | Tests | Root Cause | Scope | Complexity |
|----------|-------|------------|-------|------------|
| 1. Stdlib module-qualified functions not callable | 11 | Parser sees `String.fromInt` as field access on undefined var `String`; builtin registered as flat key `"String.fromInt"` | Medium | Medium |
| 2. User-defined variant constructors not in type env | 6 | `buildEnvironment()` has TODO for TypeDecl processing; constructors not registered | Large | High |
| 3. Type alias transparency not implemented | 1 | Type aliases not expanded during unification; `UserId` treated as distinct from `Int` | Medium | Medium |
| 4. Generic record type definitions not resolved | 1 | `Box<Int>` not expanded to `{ value: Int }` in type annotations | Medium | Medium |
| 5. Explicit type params on functions not parsed | 2 | Parser doesn't recognize `<T>` before lambda params; `<` treated as operator | Medium | Medium |
| 6. Multi-arg function calls (curried vs tupled) | 1 | Auto-currying means `add(2, 3)` fails; must use `add(2)(3)` | Small-Medium | Low-Medium |
| 7. Tuples not implemented in type checker | 4 | `VF4017: Tuple type inference not yet implemented` -- explicit placeholder error | Large | High |
| 8. String literal union types not parsed | 1 | Parser rejects string literals in type position with `VF2301` | Medium | Medium |
| 9. Missing validation of type declarations | 3 | Type declarations not validated (recursion, required fields, aliases) | Medium | Medium-High |
