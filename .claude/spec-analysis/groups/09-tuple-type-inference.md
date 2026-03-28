# Group 9: Tuple Type Inference

## Problem
The typechecker explicitly throws `VF4017: Tuple type inference not yet implemented` when encountering tuple expressions like `(1, "hello")`. The `Tuple` type variant exists in the type system and tuple patterns exist in the AST, but the inference logic is not implemented.

## Affected Sections
- 03-type-system: 4 tests (tuple construction, destructuring, triple, nested tuples)
- 04-expressions: 1 test (tuple literal)
- 05-pattern-matching: 1 test (tuple pattern matching)

## Estimated Complexity
Large - Requires implementing:
- Tuple type inference in the typechecker
- Tuple pattern matching in the exhaustiveness checker
- Tuple unification
- Codegen for tuple values (likely as JS arrays)
