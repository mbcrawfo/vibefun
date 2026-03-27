# Feature Audit: Standard Library - Result

**Spec files**: 11-stdlib/result.md
**Date**: 2026-03-26
**Test directory**: /tmp/vf-audit-stdlib-result/

## Results

### Result Construction

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 1a | `Ok(42)` with built-in type (no typedef) | Result Type | positive | FAIL | Compiles but runtime ReferenceError: `Ok` is not defined. Codegen does not emit constructor functions for built-in Ok/Err. |
| 1b | `Ok(42)` with explicit `type Result<T, E> = Ok(T) \| Err(E)` | Result Type | positive | PASS | Output: `Ok:42`. User-defined type generates constructor functions correctly. |
| 2 | `Err("failed")` with explicit typedef | Result Type | positive | PASS | Output: `Err:failed`. |
| 3 | User-defined variant type `MyOk(T) \| MyErr(E)` | Result Type | positive | FAIL | Compile error: `Undefined variable 'MyOk'`. Non-builtin variant constructors defined with `type` are not available as values. Only `Ok`/`Err`/`Some`/`None` (well-known names) are recognized, but only when the type is redeclared with `type Result<T,E> = Ok(T) \| Err(E)`. |

### Result Namespace Functions (Result.map, etc.)

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 4 | `Result.map` | Core Functions | positive | FAIL | Compile error: `Undefined variable 'Result'`. The `Result` namespace module is not implemented. |
| 5 | `Result.mapErr` | Core Functions | positive | FAIL | Compile error: `Undefined variable 'Result'`. Same as above. |
| 6 | `Result.flatMap` | Core Functions | positive | FAIL | Compile error: `Undefined variable 'Result'`. Same as above. |
| 7 | `Result.unwrapOr` | Core Functions | positive | FAIL | Compile error: `Undefined variable 'Result'`. Same as above. |
| 8 | `Result.isOk` | Core Functions | positive | FAIL | Compile error: `Undefined variable 'Result'`. Same as above. |
| 9 | `Result.isErr` | Core Functions | positive | FAIL | Compile error: `Undefined variable 'Result'`. Same as above. |
| 31 | `Result.map` (spec syntax) | Core Functions | positive | FAIL | Compile error: `Undefined variable 'Result'`. |
| 32 | `Result.flatMap` (spec syntax) | Core Functions | positive | FAIL | Compile error: `Undefined variable 'Result'`. |
| 33 | `Result.unwrap` (spec syntax) | Core Functions | positive | FAIL | Compile error: `Undefined variable 'Result'`. |
| 34 | `Result.unwrapOr` (spec syntax) | Core Functions | positive | FAIL | Compile error: `Undefined variable 'Result'`. |

### Manual Implementations of Spec Functions (curried calls)

These test the underlying language features needed to implement Result functions, using manual pattern-matching implementations.

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 4c | `map` pattern (manual) | Core Functions | positive | PASS | Output: `Ok:10`. Manual `resultMap(x)((v) => v * 2)` with curried calls works. |
| 5c | `mapErr` pattern (manual) | Core Functions | positive | PASS | Output: `Error: parse failed`. |
| 6c | `flatMap` pattern (manual) | Core Functions | positive | PASS | Output: `Ok:10`. Chaining `safeDivide(v)(10)` works. |
| 7c | `unwrapOr` pattern (manual) | Core Functions | positive | PASS | Output: `a:42`, `b:0`. |
| 8b | `isOk` pattern (manual) | Core Functions | positive | PASS | Output: `a:true`, `b:false`. |
| 9b | `isErr` pattern (manual) | Core Functions | positive | PASS | Output: `a:false`, `b:true`. |
| 10 | `fold` pattern (manual) | Additional Patterns | positive | PASS | Output: `Success: 42`, `Error: failed`. |
| 11 | `unwrap` pattern (manual) | Core Functions | positive | PASS | Output: `unwrap Ok: 42`. (Used sentinel value for Err case since panic isn't expressible.) |
| 22 | `map` on Err value (passes through) | Core Functions | positive | PASS | Output: `Err:bad`. Map on Err correctly returns Err unchanged. |
| 23 | `mapErr` on Ok value (passes through) | Core Functions | positive | PASS | Output: `Ok:42`. MapErr on Ok correctly returns Ok unchanged. |
| 26b | `unwrap` on Ok and Err | Core Functions | positive | PASS | Output: `unwrap Ok:42`, `unwrap Err:-9999`. Works correctly. |

### Result Pattern Matching

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 12 | Match Ok with binding `\| Ok(v) => ...` | Pattern Matching | positive | PASS | Output: `Got Ok with value: 42`. |
| 13 | Match Err with binding `\| Err(e) => ...` | Pattern Matching | positive | PASS | Output: `Got Err with message: something went wrong`. |
| 14 | Non-exhaustive match on Result (missing Err) | Edge Cases | negative | PASS | Correctly rejected: `Non-exhaustive pattern match. Missing cases: Err`. |
| 15 | Nested Result: `Ok(Ok(42))` | Edge Cases | positive | PASS | Output: `Nested Ok: 42`. Nested pattern `Ok(Ok(v))`, `Ok(Err(e))`, `Err(e)` all work. |

### Result as Return Type

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 16 | Function returning Result via match | Core Functions | positive | PASS | Output: `Ok:5`, `Err:Division by zero`. safeDivide works correctly. |
| 17 | Chaining Result operations with match | Error Handling Patterns | positive | PASS | Output: `Final: 5`. Two-step division chain works. |
| 25 | `if-then-else` returning Result (let binding) | Core Functions | positive | FAIL | Compile error: `Non-exhaustive pattern match. Missing cases: <other values>`. The compiler treats `if true then Ok(42) else Err("nope")` as non-exhaustive. |
| 25b | `if-then-else` returning Result (function body) | Core Functions | positive | FAIL | Same error as 25. Even with explicit return type annotation on the function, `if b then Ok(42) else Err("nope")` fails. |

### Converting Between Result and Option

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 18 | `toOption` (Result to Option with None) | Additional Patterns | positive | FAIL | Internal compiler error: `Function type must have at least one parameter`. The `None` constructor (0-arg variant) causes ICE when used as a value expression. |
| 18e | `toOption` returning only Some (no None) | Additional Patterns | positive | PASS | Output: `Some:42`. Cross-type conversion works when avoiding 0-arg constructors. |
| 19 | `fromOption` (Option to Result with None) | Additional Patterns | positive | FAIL | Same ICE as test 18. The `None` constructor as a value triggers the compiler crash. |

### Error Handling Patterns

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 20 | Railway-oriented programming | Error Handling Patterns | positive | PASS | Output: `Ok:50`, `Err:Must be positive`, `Err:Must be less than 100`. (Required wildcard `_` instead of `false` in bool match for exhaustiveness.) |
| 24 | flatMap error short-circuit | Core Functions | positive | PASS | Output: `Err:Division by zero`. Second flatMap is skipped when first returns Err. |
| 27 | `Result.or` pattern (Err, Ok) | Additional Patterns | positive | PASS | Output: `Ok:42`. Returns first Ok found. |
| 37 | `Result.or` pattern (Err, Err) | Additional Patterns | positive | PASS | Output: `Err:second`. Returns last Err when all fail. |
| 38 | `Result.or` pattern (Ok, Ok) | Additional Patterns | positive | PASS | Output: `Ok:1`. Returns first Ok. |
| 28 | `unwrapOrElse` pattern | Additional Patterns | positive | PASS | Output: `result:-1`. Error handler function invoked correctly. |
| 36 | Result with multiple error types (variant E) | Error Handling Patterns | positive | FAIL | Compile error: `Undefined variable 'ValidationError'`. User-defined variant constructors are not available as values. |

### Additional Spec Patterns

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 21b | Pipe operator with Result (data-last) | Core Functions | positive | PASS | Output: `Ok:6`. `x \|> resultMap((v) => v + 1)` works with data-last argument order. |
| 29c | `tap` pattern (side effect + return) | Additional Patterns | positive | PASS | Output: `tapped: 42`, `Ok:42`. Works using `let unused = f(v)` in block. Note: `let _ = f(v)` in block fails with "Pattern matching in let-bindings not yet implemented". |
| 30 | `mapBoth` pattern (map Ok and Err) | Additional Patterns | positive | PASS | Output: `Ok:10`, `Err:Error: bad`. |

### Multi-arg Call Syntax

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 4b | `resultMap(x, f)` multi-arg call | N/A | positive | FAIL | Compile error: `Cannot unify functions with different arity: 1 vs 2`. Multi-arg calls must use curried syntax `resultMap(x)(f)`. |

## Summary

- **Total**: 47 tests
- **Pass**: 29
- **Fail**: 18

### Failure Categories

1. **Result namespace module not implemented (10 failures)**: All `Result.map`, `Result.flatMap`, `Result.isOk`, `Result.isErr`, `Result.unwrap`, `Result.unwrapOr`, `Result.mapErr` calls fail with `Undefined variable 'Result'`. The spec defines these as `Result.functionName(...)` but the namespace module is not available.

2. **Built-in Ok/Err constructors missing from codegen (1 failure)**: `Ok(42)` without an explicit `type Result<T,E> = Ok(T) | Err(E)` compiles but fails at runtime with `ReferenceError: Ok is not defined`. The type checker recognizes built-in constructors but codegen doesn't emit them.

3. **User-defined variant constructors not available as values (2 failures)**: `MyOk(42)` or `ValidationError("msg")` fail with `Undefined variable`. Only the well-known names `Ok`/`Err` work (and only when redeclared via `type`).

4. **if-then-else with variant return types (2 failures)**: `if cond then Ok(x) else Err(y)` fails with `Non-exhaustive pattern match` even though both branches return the same Result type. The workaround is using `match` with wildcard patterns.

5. **0-arg variant constructor (None) as value causes ICE (2 failures)**: Using `None` as a value expression (not in patterns) triggers `Internal error: Function type must have at least one parameter`. This blocks Result-to-Option conversion.

### Key Observations

- **Pattern matching on Result works correctly** when using explicit `type` declarations. `Ok(v)`, `Err(e)`, nested patterns, and exhaustiveness checking all work as specified.
- **Manual implementations of all spec functions work** using pattern matching and curried calls. The language primitives support the Result patterns; only the namespace module is missing.
- **Curried call syntax is required**: `f(a)(b)` works, `f(a, b)` does not. This affects how spec examples should be written.
- **Block expressions with `let unused = expr;` work** as a workaround for sequencing side effects, since `let _ = expr;` fails.
- **Pipe operator works** with Result values when functions use data-last argument order.
