# Feature Audit: Standard Library - Numeric and Math

**Spec files**: 11-stdlib/numeric.md, 11-stdlib/math.md
**Date**: 2026-03-26
**Test directory**: /tmp/vf-audit-stdlib-numeric/

## Results

### Int Module Functions

All `Int.*` functions fail at compile time with `error[VF4100]: Undefined variable 'Int'`. The `Int` namespace is not bound in the compiler environment.

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 1 | `Int.toString` | numeric.md Int.toString | positive | FAIL | Undefined variable 'Int' -- namespace not bound |
| 2 | `Int.toFloat` | numeric.md Int.toFloat | positive | FAIL | Undefined variable 'Int' -- namespace not bound |
| 3 | `Int.abs` | numeric.md Int.abs | positive | FAIL | Undefined variable 'Int' -- namespace not bound |
| 4 | `Int.max` | numeric.md Int.max | positive | FAIL | Undefined variable 'Int' -- namespace not bound |
| 5 | `Int.min` | numeric.md Int.min | positive | FAIL | Undefined variable 'Int' -- namespace not bound |
| 6 | `Int.clamp` | task list (not in spec) | positive | FAIL | Not in spec; undefined variable 'Int' |
| 7 | `Int.compare` | task list (not in spec) | positive | FAIL | Not in spec; undefined variable 'Int' |
| 8 | `Int.gcd` | task list (not in spec) | positive | FAIL | Not in spec; undefined variable 'Int' |

### Float Module Functions

All `Float.*` functions fail at compile time with `error[VF4100]: Undefined variable 'Float'`. The `Float` namespace is not bound in the compiler environment.

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 9 | `Float.toString` | numeric.md Float.toString | positive | FAIL | Undefined variable 'Float' -- namespace not bound |
| 10 | `Float.toInt` | numeric.md Float.toInt | positive | FAIL | Undefined variable 'Float' -- namespace not bound |
| 11 | `Float.abs` | numeric.md Float.abs | positive | FAIL | Undefined variable 'Float' -- namespace not bound |
| 12 | `Float.max` | task list (not in numeric spec) | positive | FAIL | Not in numeric spec; undefined variable 'Float' |
| 13 | `Float.min` | task list (not in numeric spec) | positive | FAIL | Not in numeric spec; undefined variable 'Float' |
| 14 | `Float.clamp` | task list (not in spec) | positive | FAIL | Not in spec; undefined variable 'Float' |
| 15 | `Float.compare` | task list (not in spec) | positive | FAIL | Not in spec; undefined variable 'Float' |
| 16 | `Float.floor` | numeric.md Float.floor | positive | FAIL | Undefined variable 'Float' -- namespace not bound |
| 17 | `Float.ceil` | numeric.md Float.ceil | positive | FAIL | Undefined variable 'Float' -- namespace not bound |
| 18 | `Float.round` | numeric.md Float.round | positive | FAIL | Undefined variable 'Float' -- namespace not bound |
| 19 | `Float.sqrt` | task list (not in numeric spec; in math.md as Math.sqrt) | positive | FAIL | Undefined variable 'Float' -- namespace not bound |
| 20 | `Float.pow` | task list (not in numeric spec; in math.md as Math.pow) | positive | FAIL | Undefined variable 'Float' -- namespace not bound |
| 21 | `Float.sin` | task list (not in numeric spec; in math.md as Math.sin) | positive | FAIL | Undefined variable 'Float' -- namespace not bound |
| 22 | `Float.cos` | task list (not in numeric spec; in math.md as Math.cos) | positive | FAIL | Undefined variable 'Float' -- namespace not bound |
| 23 | `Float.tan` | task list (not in numeric spec; in math.md as Math.tan) | positive | FAIL | Undefined variable 'Float' -- namespace not bound |
| 24 | `Float.log` | task list (not in numeric spec; in math.md as Math.log) | positive | FAIL | Undefined variable 'Float' -- namespace not bound |
| 25 | `Float.exp` | task list (not in numeric spec; in math.md as Math.exp) | positive | FAIL | Undefined variable 'Float' -- namespace not bound |

### String Conversion Functions

All `String.*` and cross-module conversion functions fail at compile time with `error[VF4100]: Undefined variable 'String'` or `'Int'`/`'Float'`.

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 26 | `String.fromInt` | string.md String.fromInt | positive | FAIL | Undefined variable 'String' -- namespace not bound |
| 27 | `String.fromFloat` | string.md String.fromFloat | positive | FAIL | Undefined variable 'String' -- namespace not bound |
| 28 | `Int.fromString` | AI coding guide (not a named spec entry) | positive | FAIL | Undefined variable 'Int' -- namespace not bound |
| 28b | `String.toInt` | string.md String.toInt | positive | FAIL | Undefined variable 'String' -- namespace not bound |
| 29 | `Float.fromString` | AI coding guide (not a named spec entry) | positive | FAIL | Undefined variable 'Float' -- namespace not bound |
| 29b | `String.toFloat` | string.md String.toFloat | positive | FAIL | Undefined variable 'String' -- namespace not bound |

### Math Module

All `Math.*` functions and constants fail at compile time with `error[VF4100]: Undefined variable 'Math'`. The `Math` namespace is not bound in the compiler environment.

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 30 | `Math.pi` | math.md Math.pi | positive | FAIL | Undefined variable 'Math' -- namespace not bound |
| 31 | `Math.e` | math.md Math.e | positive | FAIL | Undefined variable 'Math' -- namespace not bound |
| 32 | `Math.sqrt` | math.md Math.sqrt | positive | FAIL | Undefined variable 'Math' -- namespace not bound |
| 33 | `Math.pow` | math.md Math.pow | positive | FAIL | Undefined variable 'Math' -- namespace not bound |
| 34 | `Math.exp` | math.md Math.exp | positive | FAIL | Undefined variable 'Math' -- namespace not bound |
| 35 | `Math.log` | math.md Math.log | positive | FAIL | Undefined variable 'Math' -- namespace not bound |
| 36 | `Math.log10` | math.md Math.log10 | positive | FAIL | Undefined variable 'Math' -- namespace not bound |
| 37 | `Math.sin` | math.md Math.sin | positive | FAIL | Undefined variable 'Math' -- namespace not bound |
| 38 | `Math.cos` | math.md Math.cos | positive | FAIL | Undefined variable 'Math' -- namespace not bound |
| 39 | `Math.tan` | math.md Math.tan | positive | FAIL | Undefined variable 'Math' -- namespace not bound |
| 40 | `Math.asin` | math.md Math.asin | positive | FAIL | Undefined variable 'Math' -- namespace not bound |
| 41 | `Math.acos` | math.md Math.acos | positive | FAIL | Undefined variable 'Math' -- namespace not bound |
| 42 | `Math.atan` | math.md Math.atan | positive | FAIL | Undefined variable 'Math' -- namespace not bound |
| 43 | `Math.atan2` | math.md Math.atan2 | positive | FAIL | Undefined variable 'Math' -- namespace not bound |
| 44 | `Math.floor` | math.md Math.floor | positive | FAIL | Undefined variable 'Math' -- namespace not bound |
| 45 | `Math.ceil` | math.md Math.ceil | positive | FAIL | Undefined variable 'Math' -- namespace not bound |
| 46 | `Math.round` | math.md Math.round | positive | FAIL | Undefined variable 'Math' -- namespace not bound |
| 47 | `Math.abs` | math.md Math.abs | positive | FAIL | Undefined variable 'Math' -- namespace not bound |
| 48 | `Math.max` | math.md Math.max | positive | FAIL | Undefined variable 'Math' -- namespace not bound |
| 49 | `Math.min` | math.md Math.min | positive | FAIL | Undefined variable 'Math' -- namespace not bound |
| 50 | `Math.random` | math.md Math.random | positive | FAIL | Undefined variable 'Math' -- namespace not bound |

### Primitive Arithmetic & Comparison (supplementary tests)

These test the underlying operators that the namespace functions would wrap.

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| S1 | Int arithmetic (+, -, *, /, %) | numeric.md Arithmetic Operators | positive | PASS | All 5 operators work correctly: 10+5=15, 10-3=7, 4*7=28, 10/3=3, 10%3=1 |
| S2 | Int division truncation toward zero | numeric.md | positive | PASS | 7/2=3, -7/2=-3, 7/-2=-3, -7/-2=3 (matches spec) |
| S3 | Float division | numeric.md Arithmetic Operators | positive | PASS | 10.0/3.0=3.333..., 7.0/2.0=3.5 |
| S4 | Float arithmetic (+, -, *) | numeric.md Arithmetic Operators | positive | FAIL | `Cannot unify Float with Int` -- Float +, -, * operators not working |
| S5 | Int comparison operators | numeric.md Comparison Operators | positive | PASS | All 6 operators work: <, >, ==, !=, <=, >= |
| S6 | Float comparison operators | numeric.md Comparison Operators | positive | FAIL | `Cannot unify Float with Int` -- Float comparisons not working |
| S7 | Mixed Int+Float rejection | numeric.md Type Safety | negative | PASS | Correctly rejects 5 + 2.0 with type error |
| S8 | Mixed Int*Float rejection | numeric.md Type Safety | negative | PASS | Correctly rejects 3.14 * 2 with type error |
| S9 | Mixed Int/Float rejection | numeric.md Type Safety | negative | PASS | Correctly rejects 10 / 2.5 with type error |
| S10 | Mixed Int<Float rejection | numeric.md Comparison Operators | negative | PASS | Correctly rejects 5 < 3.14 with type error |

## Summary

- **Total tests**: 62 (50 namespace function tests + 6 supplementary tests + 6 additional float/comparison tests)
- **Pass**: 8
- **Fail**: 54

### Root Cause Analysis

All 50 namespace function tests fail for the same root cause: **the namespace variables `Int`, `Float`, `String`, and `Math` are not bound in the compiler's type environment**. Every namespace access produces `error[VF4100]: Undefined variable '<Namespace>'`. This means the entire standard library module system for numeric and math operations is unimplemented.

### Additional Findings

1. **Float arithmetic bug**: Float addition (`+`), subtraction (`-`), and multiplication (`*`) produce `Cannot unify Float with Int` errors. Only Float division (`/`) works correctly. Float comparisons (`<`, `>`, `==`, etc.) also fail with the same error.
2. **Int arithmetic works**: All Int operators (+, -, *, /, %) work correctly, including correct truncation-toward-zero behavior for integer division.
3. **Type safety works**: Mixed Int/Float operations are correctly rejected by the type checker.
4. **Spec vs task list mismatch**: Several features in the task list (`Int.clamp`, `Int.compare`, `Int.gcd`, `Float.max`, `Float.min`, `Float.clamp`, `Float.compare`, `Float.sqrt/pow/sin/cos/tan/log/exp`) are not defined in the numeric.md spec. The math functions exist only in math.md under the `Math.*` namespace.
