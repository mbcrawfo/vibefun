# Group 5: Nullary Constructor Type Representation

## Problem
Two related issues with nullary constructors (`None`, `Nil`):

1. **Type formatting crash**: `None` and `Nil` are registered with `funType([], resultType)` - a function type with zero parameters. When `typeToString()` tries to format these types (during error messages), it throws `"Function type must have at least one parameter"`, producing an internal error (exit code 5) instead of a proper diagnostic.

2. **Annotation unification crash**: When `None` is used with an explicit type annotation like `let x: Option<Int> = None`, the typechecker crashes trying to unify the zero-param function type.

## Impact
Masks real type errors with unhelpful internal crashes. Affects any code that triggers type errors involving nullary constructors.

## Affected Sections
- 03-type-system: 2 tests (variant with data, recursive variant type)
- 05-pattern-matching: 1 test (variant pattern - None)
- 09-error-handling: 1 test (Option type - None variant)

## Estimated Complexity
Simple - Either (a) fix `typeToString` to handle zero-param function types gracefully, or (b) change nullary constructor representation to use the result type directly instead of a `Fun` type. Option (b) is more correct since `None` is a value, not a function.
