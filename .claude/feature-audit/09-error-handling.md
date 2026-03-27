# Feature Audit: Error Handling

**Spec files**: 09-error-handling.md
**Date**: 2026-03-26

## Results

### Result Type Usage

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 1 | Create Ok value `Ok(42)` | Result Type | positive | FAIL | Compiles but runtime error: `Ok is not defined` in generated JS. Codegen emits `Ok(42)` but never defines the `Ok` constructor function. Match destructuring expects `{$tag: "Ok", $0: value}` objects. |
| 2 | Create Err value `Err("failed")` | Result Type | positive | FAIL | Same issue: `Err is not defined` at runtime. Constructor not emitted in codegen output. |
| 3 | Pattern match on Result (Ok and Err) | Result Type | positive | FAIL | Compile succeeds. Runtime fails because `Ok`/`Err` constructors not defined. Match arms correctly check `$match.$tag === "Ok"` etc. |
| 4 | Nested Result operations `Ok(Ok(10))` | Result Type | positive | FAIL | Same constructor-not-defined issue. Compiles, fails at runtime. |

### Option Type Usage

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 5 | Create Some value `Some(42)` | Option Type | positive | FAIL | Compiles but runtime error: `Some is not defined`. Same underlying codegen issue as Ok/Err. |
| 6 | Pattern match on Option (Some + None) with None as value | Option Type | positive | FAIL | Compiler internal error: "Function type must have at least one parameter" when `None` is assigned to a variable that is later matched against `Some(v)`. Using `None` alone (`let x = None;` with no subsequent typed match) compiles fine, but typing it as `Option<Int>` or matching it in a context with `Some` causes internal crash. |
| 7 | Safe division returning Option (None for zero) | Error Handling Patterns | positive | FAIL | Same compiler internal error when a function returns `None` in one branch and `Some(v)` in another. The `None` variant crashes the compiler's codegen/type-inference pipeline with "Function type must have at least one parameter". |

### Division by Zero

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 8 | Float `1.0 / 0.0` returns Infinity | Division by Zero | positive | PASS | Outputs `Infinity` as expected. Codegen emits `1.0 / 0.0` directly (no Math.trunc for floats). |
| 8b | Float `-10.0 / 0.0` returns -Infinity | Division by Zero | positive | FAIL | `-10.0` as a literal expression fails with `Cannot unify Float with Int`. Unary negation on floats is not supported. Workaround via FFI negate function produces correct `-Infinity`. The underlying IEEE 754 behavior works but the syntax doesn't. |
| 9 | Float `0.0 / 0.0` returns NaN | Division by Zero | positive | PASS | Outputs `NaN` as expected. |
| 9b | `NaN == NaN` returns false (IEEE 754) | Float Special Values | positive | PASS | Correctly returns `false`. |
| 10 | Integer `1 / 0` should runtime panic | Division by Zero | positive | FAIL | No panic. Codegen emits `Math.trunc(1 / 0)` which evaluates to `Infinity` in JS. The spec requires a runtime panic for integer division by zero, but no runtime check is generated. |

### Integer Overflow

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 11 | Large integer precision loss (53-bit safe) | Integer Overflow | positive | PASS | `maxSafe + 1 = 9007199254740992` (exact), `maxSafe + 2 = 9007199254740992` (precision lost, not 9007199254740993). Matches spec exactly. |

### Error Handling Patterns

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 12 | Safe division function returning Result | Error Propagation | positive | FAIL | Compiles but runtime fails: `Ok is not defined`. Same constructor emission bug. |
| 13 | Chaining Result operations (manual matching) | Error Propagation | positive | FAIL | Compiles but runtime fails: `Ok is not defined`. |
| 14 | Converting between Option and Result | Error Propagation | positive | FAIL | First version hit compiler internal error (None value). Revised version compiles but runtime fails: `Some is not defined`. |

### Negative Tests (Exhaustiveness)

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 15 | Missing Err case in Result match | Pattern Exhaustiveness | negative | PASS | Compiler correctly rejects with `error[VF4400]: Non-exhaustive pattern match. Missing cases: Err`. |
| 16 | Missing None case in Option match | Pattern Exhaustiveness | negative | PASS | Compiler correctly rejects with `error[VF4400]: Non-exhaustive pattern match. Missing cases: None`. |

### Additional Spec Items Tested

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 17 | `panic()` function | Panic | positive | FAIL | Compiles but `panic` is not defined at runtime. Codegen emits `panic(msg)` but no `function panic(msg) { throw new Error(msg); }` is generated. |
| 18 | Stack overflow from infinite recursion | Stack Overflow | positive | PASS | Correctly produces `RangeError: Maximum call stack size exceeded`. |
| 19 | `Float.isNaN()` | Float Special Values | positive | FAIL | Compiler rejects: `Undefined variable 'Float'`. The Float module from stdlib is not available. |
| 20 | `Float.isInfinite()` | Float Special Values | positive | FAIL | Same: `Undefined variable 'Float'`. |
| 21 | Float arithmetic with `+`, `-`, `*` | Float Special Values | positive | FAIL | `1.0 + 2.0`, `0.0 - 10.0`, `inf + 1.0` all fail with `Cannot unify Float with Int`. Only `/` (division) is overloaded for Float; other arithmetic operators are Int-only. This blocks testing spec items like `inf + 1.0 = Infinity`, `inf * 2.0 = Infinity`, `inf - inf = NaN`, `0.0 * inf = NaN`. |
| 22 | `inf / inf` returns NaN | Float Special Values | positive | PASS | Correctly returns `NaN`. |
| 23 | `unwrap` pattern (match + panic) | Panic | positive | FAIL | Compiles, but fails at runtime because both `Some` constructor and `panic` function are not defined. |

## Summary

- **Total: 23 tests**
- **Pass: 8**
- **Fail: 15**

## Critical Issues Found

### 1. Variant constructors not emitted in codegen (affects 10 tests)
The generated JavaScript uses `Ok(42)`, `Err("msg")`, `Some(v)`, and `None` as function calls, but these constructor functions are never defined in the output. The match destructuring correctly checks `$match.$tag === "Ok"` etc., but there's no way to create the tagged objects in the first place. This is the single most impactful bug, blocking all Result and Option usage at runtime.

### 2. `None` as a typed value crashes compiler (affects 3 tests)
Assigning `None` to a variable and then using it in a context where the type must unify with `Option<T>` (e.g., matching with `Some(v)`, or annotating as `Option<Int>`) causes an internal compiler error: "Function type must have at least one parameter".

### 3. Integer division by zero does not panic (affects 1 test)
The spec requires integer division by zero to cause a runtime panic. The codegen emits `Math.trunc(1 / 0)` which silently evaluates to `Infinity` in JavaScript rather than throwing.

### 4. `panic()` built-in not emitted (affects 2 tests)
The `panic` function is accepted by the compiler but not defined in the generated JavaScript output.

### 5. Float arithmetic operators (`+`, `-`, `*`) are Int-only (affects 2 tests)
Only `/` (division) supports Float operands. The `+`, `-`, and `*` operators are typed as `(Int, Int) -> Int`, making the spec's float special value operations (like `inf + 1.0`) impossible without FFI workarounds.

### 6. `Float` module not available (affects 2 tests)
`Float.isNaN()` and `Float.isInfinite()` fail because the `Float` module is undefined. These are stdlib features referenced in the error handling spec.
