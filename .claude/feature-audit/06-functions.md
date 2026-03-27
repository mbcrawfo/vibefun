# Feature Audit: Functions

**Spec files**: 06-functions.md
**Date**: 2026-03-26

## Results

### Function Definition

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 1 | Named function `let add = (x, y) => x + y` | Function Definitions | positive | PASS | Compiles and runs; must use curried call `add(3)(4)` since uncurried `add(3, 4)` fails (see #8) |
| 2 | Single parameter `let inc = (x) => x + 1` | Function Definitions | positive | PASS | `inc(41)` returns 42 |
| 3 | Type annotations `let add = (x: Int, y: Int): Int => x + y` | Function Definitions | positive | PASS | Works with curried call style `add(10)(20)` |

### Automatic Currying

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 4 | Multi-arg auto-curried: `let add1 = add(1)` | Automatic Currying | positive | PASS | Partial application returns a function as expected |
| 5 | Partial application: `add(1)` returns function, `add(1)(2)` returns result | Automatic Currying | positive | PASS | Both `add1(2)` and `add(1)(2)` return 3 |
| 6 | Full application: `add(1, 2)` uncurried style | Calling Conventions | positive | **FAIL** | Error: "Cannot unify functions with different arity: 1 vs 2". Uncurried multi-arg calls are not supported despite spec saying `(A, B) -> C` is sugar for `(A) -> (B) -> C` and both call styles should work |

### Calling Styles

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 7 | Curried call: `f(1)(2)` | Calling Conventions | positive | PASS | Works correctly |
| 8 | Uncurried call: `f(1, 2)` | Calling Conventions | positive | **FAIL** | Same as #6. Error: "Cannot unify functions with different arity: 1 vs 2". All uncurried multi-arg calls fail, including 3-arg `add3(1, 2, 3)` |
| 9 | Mixed: partial then apply `let g = f(1); g(2)` | Calling Conventions | positive | PASS | Works correctly |

### Recursive Functions

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 10a | Recursion with `if/then/else`: `let rec factorial = (n) => if n == 0 then 1 else ...` | Recursive Functions | positive | **FAIL** | Error: "Non-exhaustive pattern match. Missing cases: <other values>". ALL if/then/else expressions fail with this error, even `if true then 1 else 2`. This is a fundamental bug in the exhaustiveness checker being applied to if/then/else |
| 10b | Recursion with `match`: `let rec fact = (n) => match n { \| 0 => 1 \| _ => ... }` | Recursive Functions | positive | PASS | `factorial(5)` returns 120. Workaround for the if/then/else bug |
| 11 | Recursive function using match with int literal pattern | Recursive Functions | positive | PASS | `fact(6)` returns 720. Int literal patterns in match work correctly |

### Mutual Recursion

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 12a | `let rec ... and ...` with `if/then/else` | Mutually Recursive Functions | positive | **FAIL** | Same if/then/else exhaustiveness bug as #10a |
| 12b | `let rec ... and ...` with `match` (two-way) | Mutually Recursive Functions | positive | PASS | `isEven(4)` returns true, `isOdd(3)` returns true. Works correctly with match |
| 12c | Three-way mutual recursion with `and` | Mutually Recursive Functions | positive | PASS | Three mutually recursive functions `a`, `b`, `c` using `let rec ... and ... and ...` work correctly |

### Higher-Order Functions

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 13 | Function as parameter: `let apply = (f, x) => f(x)` | Higher-Order Functions | positive | PASS | `apply(inc)(42)` returns 43 |
| 14 | Function returning function: `let makeAdder = (x) => (y) => x + y` | Higher-Order Functions | positive | PASS | `makeAdder(5)(10)` returns 15 |
| 15 | Passing lambda as argument: `apply((x) => x + 1)(42)` | Anonymous Functions | positive | PASS | Returns 43. Inline lambdas work as arguments |

### Closures

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 16 | Closure capturing outer variable: `let x = 10; let f = (y) => x + y` | (implicit in Functions) | positive | PASS | `f(5)` returns 15. Closures correctly capture outer scope |
| 17 | Nested closures | (implicit in Functions) | positive | PASS | Two-level nesting: outer `x=10`, inner captures `z=x+y`, innermost captures `z`. `f(5)(3)` returns 18 |

### Generic Functions

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 18 | Generic identity (inferred): `let id = (x) => x` used with Int and String | Type Inference with Currying | positive | PASS | `id(42)` returns 42, `id("hello")` returns "hello". Polymorphism works via inference |
| 19 | Explicit generic: `let id = <T>(x: T): T => x` | Function Definitions | positive | **FAIL** | Error: "Unexpected token: 'OP_LT'" at the `<`. The parser does not support explicit type parameter syntax on lambda expressions |

### Function Composition

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 20a | Pipe operator: `42 \|> inc` | (referenced in spec as pipeline style) | positive | PASS | Returns 43 |
| 20b | Pipe chain: `5 \|> inc \|> double` | (referenced in spec as pipeline style) | positive | PASS | `inc(5)=6`, `double(6)=12`. Returns 12 |
| 21a | Forward composition `>>`: `let f = inc >> double` | Function Composition | positive | PASS | `f(5)` returns 12. `inc(5)=6, double(6)=12` |
| 21b | Forward compose with different types: `inc >> intToStr` | Function Composition | positive | PASS | `f(41)` returns "42". Cross-type composition works |
| 22a | Backward composition `<<`: `let g = double << inc` | Function Composition | positive | PASS | `g(5)` returns 12. `double(inc(5)) = double(6) = 12` |
| 22b | Backward compose with different types: `intToStr << inc` | Function Composition | positive | PASS | `g(41)` returns "42" |

### Block Body Functions

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 23 | Function with block body: `let f = (x) => { let y = x + 1; y * 2; }` | Function Definitions | positive | PASS | `f(10)` returns 22. Block bodies work, last expression is return value |

### Zero-Parameter Functions

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 24 | Zero parameter function: `let f = () => 42` | (not explicitly in spec) | positive | **FAIL** | Internal error: "Lambda with zero parameters". The compiler crashes instead of producing a useful error or compiling successfully |

### Negative Tests

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 25a | Calling non-function should fail | Arity Validation Semantics | negative | PASS | Error: "Cannot unify types: Int with Int -> 'n". Correctly rejected |
| 25b | Over-application (too many args) should fail | Arity Validation Semantics | negative | PASS | `add(1)(2)(3)` gives error: "Cannot unify types: Int with Int -> 'r". Correctly rejected at compile time |
| 26 | Wrong argument type should fail | Error Messages | negative | PASS | `add("hello")` gives error: "Cannot unify Int with String". Correctly rejected |

## Summary

- **Total**: 29 tests
- **Pass**: 22
- **Fail**: 7

### Failure Breakdown

| Category | Failures | Description |
|----------|----------|-------------|
| Uncurried multi-arg calls | 3 (#6, #8, #8-3arg) | `f(a, b)` syntax rejected despite spec saying it should work as sugar for `f(a)(b)` |
| if/then/else exhaustiveness | 2 (#10a, #12a) | ALL if/then/else expressions fail with "Non-exhaustive pattern match" error. This is a fundamental bug not specific to functions but heavily impacts the function spec examples. Even `if true then 1 else 2` fails. |
| Explicit generic syntax | 1 (#19) | `<T>(x: T): T => x` syntax not supported by parser |
| Zero-parameter lambda | 1 (#24) | `() => 42` causes internal compiler error |

### Key Findings

1. **Uncurried calls completely broken**: The spec explicitly states that `add(1, 2)` and `add(1)(2)` should be equivalent, but only the curried form works. This is the most impactful deviation from the spec since most code examples use uncurried syntax.

2. **if/then/else universally broken**: Every form of if/then/else triggers a spurious exhaustiveness error. This forces all conditional logic to use `match` expressions instead. This is not a functions-specific bug but it severely impacts function definitions (especially recursive functions as shown in the spec).

3. **Curried calling works well**: Curried calls `f(a)(b)`, partial application, and step-by-step application all work correctly.

4. **Higher-order functions and closures work**: Functions as values, passing functions as arguments, returning functions, and closures all work as specified.

5. **Composition operators work**: Both `>>` (forward) and `<<` (backward) composition work correctly, including with different types.

6. **Mutual recursion works**: The `let rec ... and ...` syntax works for 2-way and 3-way mutual recursion (when using `match` instead of `if/then/else`).
