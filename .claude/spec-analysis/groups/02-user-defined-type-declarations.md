# Group 2: User-Defined Type Declaration Processing

## Root Issue
The typechecker does not process `TypeDecl` nodes. `buildEnvironment()` in `environment.ts` has a TODO for handling `TypeDecl`, and `typeCheckDeclaration` for `CoreTypeDecl` returns the environment unchanged. This means:
- Variant constructors from user types (e.g., `Red`, `Green`, `Blue` from `type Color = Red | Green | Blue`) are never registered as values
- Type aliases (e.g., `type UserId = Int`) are not expanded during unification
- Generic type definitions (e.g., `type Box<T> = { value: T }`) are not resolved in annotations
- Nullary constructors (e.g., `None`) are typed as `funType([])` which crashes `typeToString`
- No validation of type declarations (recursive aliases, unguarded recursion)

## Affected Sections
03-type-system, 04-expressions, 05-pattern-matching, 09-error-handling, 11-stdlib, 12-compilation

## Affected Tests (count)
~20 tests directly, plus indirect effects on tests that redefine Option/Result.

## Details
This group ties together several failures that all stem from the typechecker's incomplete handling of `TypeDecl`:

1. **Variant constructor registration** (Medium-Large): User-defined constructors (`Red`, `Circle(5.0)`) are never added to the value environment. Only builtin variants (`Some`, `None`, `Ok`, `Err`, `Cons`, `Nil`) work because they're manually registered in `builtins.ts`.

2. **Type alias transparency** (Medium): `type UserId = Int` creates a distinct type instead of being transparent. The typechecker never records alias relationships.

3. **Generic type definition resolution** (Medium): `Box<Int>` is not expanded to `{ value: Int }` in annotations.

4. **Nullary constructor crash** (Small): `funType([])` causes `typeToString` to crash with "Function type must have at least one parameter". Affects `let x: Option<Int> = None`.

5. **Type declaration validation** (Medium): No validation for recursive aliases, unguarded recursion, or directional record subtyping (missing required fields).

## Individual Failures
- **03**: 6 tests (variant types), 1 test (type alias), 1 test (generic type def), 3 tests (validation)
- **04**: 2 tests (match with user variants)
- **05**: 1 test (or-pattern with user variants), 1 test (None annotation crash)
- **09**: 1 test (None variant crash)
- **11**: 2 tests (None annotation crash), ~19 tests (type redefinition conflicts)
- **12**: 2 tests (variant constructors, pattern matching)

## Estimated Fix Scope
Large (1-3 days). Requires implementing type declaration processing in the typechecker: extracting constructors, creating type schemes, registering them in the value environment, expanding aliases during unification, and adding validation passes.
