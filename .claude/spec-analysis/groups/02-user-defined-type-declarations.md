# Group 2: User-Defined Type Declarations

## Problem
When a user defines a variant type (`type Color = Red | Green | Blue`) or type alias (`type UserId = Int`) or generic type (`type Box<T> = { value: T }`), the typechecker does not process these declarations. `buildEnvironment()` has a TODO for TypeDecl handling, and the typechecker's `CoreTypeDecl` handler is a no-op that claims "already processed in buildEnvironment" -- but it isn't.

This means:
- Variant constructors are never added to the value environment
- Type aliases are not transparent (treated as opaque unrelated types)
- Generic type definitions are not registered

Built-in variants (Some, None, Ok, Err, Cons, Nil) work because they're explicitly registered in `builtins.ts`.

## Impact
Affects any test that defines or uses user-defined types. ~15 tests directly, many more indirectly.

## Affected Sections
- 03-type-system: 9 tests (variant definition, variant with data, variant constructors as functions, generic type definition, type alias, recursive variants, generic type alias)
- 04-expressions: 1 test (match with variants)
- 05-pattern-matching: 1 test (or-pattern with variant constructors)
- 12-compilation: 2 tests (pattern matching compiles, variant constructors compile)

## Estimated Complexity
Large - Requires implementing `CoreTypeDecl` processing to:
1. Register variant constructors with proper type schemes in the value environment
2. Handle type alias transparency during unification
3. Handle generic type parameter substitution
4. Handle recursive type definitions
