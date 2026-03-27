# Feature Audit: Primitive Types

**Spec files**: 03-type-system/primitive-types.md
**Date**: 2026-03-26

## Results

### Int Type

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 1 | Int literal declaration `let x: Int = 42` | primitive-types.md "Int" | positive | PASS | Compiles and outputs `42` |
| 2 | Int addition `1 + 2` | primitive-types.md "Arithmetic Operations" | positive | PASS | Outputs `3` |
| 3 | Int subtraction `5 - 3` | primitive-types.md "Arithmetic Operations" | positive | PASS | Outputs `2` |
| 4 | Int multiplication `3 * 4` | primitive-types.md "Arithmetic Operations" | positive | PASS | Outputs `12` |
| 5 | Int division truncates toward zero `7 / 2 = 3` | primitive-types.md "Arithmetic Operations" | positive | PASS | Outputs `3`; generated JS uses `Math.trunc(7 / 2)` |
| 6 | Int division negative truncation `-7 / 2 = -3` | primitive-types.md "Arithmetic Operations" | positive | PASS | Outputs `-3` (toward zero, not floor); generated JS uses `Math.trunc` |
| 7 | Int modulo `7 % 3 = 1` | primitive-types.md "Arithmetic Operations" | positive | PASS | Outputs `1` |
| 8 | Unary negation `-42` | primitive-types.md "Numeric Literal Typing" | positive | PASS | Outputs `-42` |

### Float Type

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 9 | Float literal `3.14` | primitive-types.md "Float" | positive | PASS | Compiles and outputs `3.14` |
| 10 | Float addition `1.5 + 2.5` | primitive-types.md "Arithmetic Operations" | positive | **FAIL** | Compiler error: `Cannot unify Float with Int`. Even with explicit `Float` type annotations on operands and result, `+` refuses Float operands. The `+` operator appears hardcoded to Int. |
| 11 | Float subtraction `5.0 - 3.0` | primitive-types.md "Arithmetic Operations" | positive | **FAIL** | Same error as #10: `Cannot unify Float with Int`. The `-` operator does not accept Float operands. |
| 12 | Float multiplication `2.0 * 3.0` | primitive-types.md "Arithmetic Operations" | positive | **FAIL** | Same error as #10: `Cannot unify Float with Int`. The `*` operator does not accept Float operands. |
| 13 | Float division `7.0 / 2.0 = 3.5` | primitive-types.md "Arithmetic Operations" | positive | PASS | Outputs `3.5`. Division correctly handles Float (no `Math.trunc`). |
| 14 | Scientific notation `1e3` | primitive-types.md "Numeric Literal Typing" | positive | PASS | Outputs `1000`; correctly inferred as Float. |

### String Type

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 15 | String literal and concatenation with `&` | primitive-types.md "String" | positive | PASS | `"Hello" & " " & "world"` outputs `Hello world` |
| 16 | String comparison with `==` | primitive-types.md "Comparison Operations" | positive | PASS | `"hello" == "hello"` is `true`; `"hello" == "world"` is `false` |
| 17 | Empty string `""` | primitive-types.md "String" | positive | PASS | Empty string works in concatenation: `"prefix" & "" & "suffix"` outputs `prefixsuffix` |

### Bool Type

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 18 | Bool true | primitive-types.md "Bool" | positive | PASS | `let b: Bool = true` compiles and outputs `true` |
| 19 | Bool false | primitive-types.md "Bool" | positive | PASS | `let b: Bool = false` compiles and outputs `false` |
| 20 | Bool AND `true && false` | primitive-types.md "Bool" | positive | PASS | Outputs `false` |
| 21 | Bool OR `false || true` | primitive-types.md "Bool" | positive | PASS | Outputs `true` |
| 22 | Bool NOT `!true` | operators.md "Reference Operators" | positive | PASS | `!true` outputs `false`; `!false` outputs `true`. The `!` operator is overloaded for both Ref dereference and logical NOT based on operand type. |

### Unit Type

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 23 | Unit literal `()` | primitive-types.md "Unit" | positive | PASS | `let nothing: Unit = ()` compiles successfully |

### No Automatic Coercion (Negative Tests)

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 24 | Mixed Int + Float should fail: `5 + 2.0` | primitive-types.md "No Automatic Coercion" | negative | PASS | Correctly rejected: `Cannot unify Float with Int` |
| 25 | Mixed Int == Float should fail: `1 == 1.0` | primitive-types.md "Comparison Operations" | negative | PASS | Correctly rejected: `Cannot unify Float with Int` |
| 26 | Assigning Int to Float annotation: `let x: Float = 42` | primitive-types.md "Numeric Literal Typing" | negative | PASS | Correctly rejected: `Cannot unify Int with Float` |

### Type Annotations

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 27 | Explicit Int annotation `let x: Int = 42` | primitive-types.md "Int" | positive | PASS | Compiles and runs correctly |
| 28 | Explicit Float annotation `let y: Float = 3.14` | primitive-types.md "Float" | positive | PASS | Compiles and runs correctly |
| 29 | Explicit String annotation `let s: String = "hello"` | primitive-types.md "String" | positive | PASS | Compiles and runs correctly |
| 30 | Explicit Bool annotation `let b: Bool = true` | primitive-types.md "Bool" | positive | PASS | Compiles and runs correctly |

### Comparison Operators

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 31 | Int equality `42 == 42` | primitive-types.md "Comparison Operations" | positive | PASS | `true`; also verified `42 == 43` returns `false` |
| 32 | Int inequality `1 != 2` | primitive-types.md "Comparison Operations" | positive | PASS | Outputs `true` |
| 33 | Int less than `1 < 2` | primitive-types.md "Comparison Operations" | positive | PASS | `true`; also verified `2 < 1` returns `false` |
| 34 | Int greater than `2 > 1` | primitive-types.md "Comparison Operations" | positive | PASS | Outputs `true` |
| 35 | Int less-or-equal `1 <= 1` | primitive-types.md "Comparison Operations" | positive | PASS | `true` for equal values; verified `2 <= 1` returns `false` |
| 36 | Int greater-or-equal `2 >= 1` | primitive-types.md "Comparison Operations" | positive | PASS | Outputs `true` |

## Summary

- **Total: 36 tests**
- **Pass: 33**
- **Fail: 3**

## Failures Detail

### FAIL #10, #11, #12: Float arithmetic with `+`, `-`, `*` operators

**Severity**: High

The `+`, `-`, and `*` operators do not work with Float operands. The type checker rejects `Float + Float`, `Float - Float`, and `Float * Float` with the error `Cannot unify Float with Int`, even when operands are explicitly annotated as Float.

Interestingly, `/` (division) works correctly with Float operands, producing IEEE 754 floating-point results. This suggests the `/` operator has special handling (likely due to the documented "division defaults to Float" behavior), but `+`, `-`, and `*` are hardcoded to Int only.

**Spec expectation** (from primitive-types.md):
```vibefun
let x: Float = 10.0;
let y: Float = 5.0;
x + y;     // Float
x - y;     // Float
x * y;     // Float
```

**Actual behavior**: All three produce `error[VF4020]: Cannot unify Float with Int`.

**Impact**: Float arithmetic (other than division) is completely unusable. Any program requiring floating-point computation (math, physics, financial calculations) cannot perform basic addition, subtraction, or multiplication on Float values.

## Incidental Observation

While testing Bool NOT (test #22), the initial approach using `if a == false then true else false` produced a surprising `Non-exhaustive pattern match` error (VF4400) even though both `then` and `else` branches were present. This appears to be an if-expression type checker issue, not a primitive types bug per se, but it was observed during this audit. The workaround is to use the `!` operator for logical NOT.
