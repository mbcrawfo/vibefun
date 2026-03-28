# Group 6: Prefix `!` Operator Disambiguation (Deref vs Logical NOT)

## Problem
The parser statically assigns prefix `!` as `LogicalNot` and only postfix `expr!` as `Deref`. The spec says prefix `!x` should be dereference when `x` has type `Ref<T>`, with type-based disambiguation. All mutable reference tests use `!x` (prefix) for dereference, which the parser treats as boolean NOT.

When the typechecker encounters `LogicalNot` on a `Ref<Int>`, it tries to unify `Ref<Int>` with `Bool` and fails.

## Impact
Blocks all mutable reference dereference operations using the spec's syntax.

## Affected Sections
- 07-mutable-references: 6 tests (dereference with !, dereference string ref, update ref with computed value, ! as dereference for Ref, while loop with mutable counter, mutations through aliases)
- 04-expressions: indirectly (while loop tests that use !ref)

## Estimated Complexity
Medium - Requires either (a) emitting an ambiguous `!` AST node resolved during type checking, or (b) a post-typechecking rewrite that converts `LogicalNot` on `Ref<T>` to `Deref`.
