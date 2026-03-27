# Feature Audit: Tuples

**Spec files**: 03-type-system/tuples.md
**Date**: 2026-03-26

## Results

### Tuple Construction

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 1 | Pair tuple `(1, 2)` | "Tuples are constructed using comma-separated expressions enclosed in parentheses" | positive | FAIL | `VF4017: Tuple type inference not yet implemented` |
| 2 | Triple tuple `(1, "hello", true)` | Same section | positive | FAIL | `VF4017: Tuple type inference not yet implemented` |
| 3 | Tuple with type annotation `let t: (Int, String) = (1, "hello")` | "Tuple types are written using comma-separated types in parentheses" | positive | FAIL | `VF4017: Tuple type inference not yet implemented` -- tuple type annotation is parsed but value construction fails |

### Tuple Destructuring

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 4 | Let destructuring `let (a, b) = (1, 2)` | "Let destructuring" section | positive | FAIL | `VF4017: Tuple type inference not yet implemented` (fails on the RHS tuple literal) |
| 5 | Triple destructuring `let (a, b, c) = (1, "hello", true)` | Same section | positive | FAIL | `VF4017: Tuple type inference not yet implemented` |
| 6 | Nested tuple destructuring `let ((a, b), c) = ((1, 2), 3)` | "Nested Destructuring" section | positive | FAIL | `VF4017: Tuple type inference not yet implemented` |

### Tuples in Functions

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 7 | Tuple as function parameter type | "Tuples in Function Signatures" | positive | FAIL | Tuple type annotation `(Int, Int)` in signature is parsed successfully, but let-destructuring inside body fails: `VF4017: Pattern matching in let-bindings not yet implemented` |
| 7b | Tuple type in signature (pass-through only) | Same section | positive | PASS | A function with tuple type annotations that merely returns the parameter (no destructuring, no construction) compiles and runs |
| 8 | Tuple as function return type | Same section | positive | FAIL | `VF4017: Tuple type inference not yet implemented` (fails when constructing tuple return value) |
| 9 | Function taking and returning tuples | Same section | positive | FAIL | `VF4017: Pattern matching in let-bindings not yet implemented` (fails at destructuring inside body) |

### Tuples in Pattern Matching

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 10 | Match on tuple `match t { \| (0, y) => ... }` | "Tuples in Pattern Matching" | positive | FAIL | `VF4017: Tuple type inference not yet implemented` (fails constructing the tuple to match on) |
| 11 | Tuple with wildcard pattern `match t { \| (_, y) => ... }` | Same section | positive | FAIL | `VF4017: Tuple type inference not yet implemented` |
| 12 | Nested tuple pattern | Same section | positive | FAIL | `VF4017: Tuple type inference not yet implemented` |

### Edge Cases

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 13 | Single parenthesized expression is NOT a tuple | "Single-Element Tuples" section | positive | PASS | `(42)` correctly compiles to just `42` and outputs `single-paren: 42` |
| 14 | Unit `()` is distinct from tuple | "Unit Type as Empty Tuple" section | positive | PASS | `let u: Unit = ()` compiles and runs correctly |
| 15 | Tuple of tuples `((1, 2), (3, 4))` | "Nested tuples" in Syntax section | positive | FAIL | `VF4017: Tuple type inference not yet implemented` |

### Negative Tests

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 16 | Arity mismatch in destructuring | "Arity mismatch in destructuring" section | negative | FAIL | Compilation fails, but with `VF4017: Tuple type inference not yet implemented` instead of the expected arity mismatch error. Cannot validate the specific error because tuples are not implemented. |
| 17 | Type mismatch in tuple annotation | "Tuple type equivalence" section | negative | FAIL | Compilation fails, but with `VF4017: Tuple type inference not yet implemented` instead of the expected type mismatch error. Cannot validate the specific error because tuples are not implemented. |

## Summary

- **Total**: 18 tests (including supplementary test 7b)
- **Pass**: 3 (tests 7b, 13, 14)
- **Fail**: 15

### Key Findings

**Tuples are not implemented.** The compiler recognizes tuple syntax at the parsing level (tuple types in annotations are parsed, and the AST has tuple nodes) but the type checker explicitly rejects them with error `VF4017: Tuple type inference not yet implemented`.

The three passing tests are tangentially related to tuples:
1. **Test 7b**: Tuple type annotations in function signatures are parsed and accepted -- but only when no actual tuple values are constructed or destructured in the body
2. **Test 13**: Single parenthesized expressions `(42)` are correctly treated as grouping, not tuples
3. **Test 14**: Unit `()` works correctly as the zero-element "tuple"

Two distinct unimplemented features block tuple usage:
- **Tuple value construction** (`VF4017: Tuple type inference not yet implemented`) -- any expression like `(a, b)` fails
- **Tuple let-destructuring** (`VF4017: Pattern matching in let-bindings not yet implemented`) -- `let (a, b) = expr` fails even when `expr` is a parameter with a tuple type annotation

All spec features from `03-type-system/tuples.md` remain unimplemented apart from type annotation parsing and the edge cases above.
