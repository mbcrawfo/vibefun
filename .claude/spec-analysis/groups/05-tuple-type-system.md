# Group 5: Tuple Type System

## Root Issue
Tuple type inference is explicitly unimplemented. The typechecker throws `VF4017: Tuple type inference not yet implemented` when encountering `CoreTuple` expressions. Tuples are parsed correctly and the code generator has `emitTuple` (generates JS arrays), but the typechecker blocks compilation.

## Affected Sections
03-type-system, 04-expressions, 05-pattern-matching

## Affected Tests (count)
~7 tests directly.

## Details
Implementing tuples requires:
- Type inference for tuple expressions (`(1, "hello")` → `(Int, String)`)
- Tuple type unification
- Tuple pattern matching type checking (the pattern matcher has a placeholder)
- Tuple destructuring in let-bindings
- Integration with exhaustiveness checking

The parser, desugarer, and codegen already handle tuples. The gap is entirely in the typechecker.

## Individual Failures
- **03**: 4 tests (tuple construction, destructuring, triple tuple, nested tuples)
- **04**: 1 test (tuple literal)
- **05**: 2 tests (tuple pattern matching, tuple pattern with literals)

## Estimated Fix Scope
Large (1-3 days). Requires implementing tuple type inference in the type checker including construction, unification, pattern matching, and exhaustiveness analysis.
