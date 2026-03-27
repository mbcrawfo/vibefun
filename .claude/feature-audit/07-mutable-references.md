# Feature Audit: Mutable References

**Spec files**: 07-mutable-references.md
**Date**: 2026-03-26

## Results

### Ref Creation

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 1 | Basic ref creation: `let mut x = ref(0)` | Creating References | positive | PASS | Compiles and runs. Codegen emits `const x = { $value: ref(0) }` (double-wrapped: outer `{$value:}` for mut + inner `{$value:}` from ref helper) |
| 2 | Ref with string: `let mut s = ref("hello")` | Creating References | positive | PASS | Compiles and runs correctly |
| 3 | Ref with float: `let mut f = ref(3.14)` | Creating References | positive | PASS | Compiles and runs correctly |
| 4 | Ref with Option (Some): `let mut x = ref(Some(42))` | Refs with Variants | positive | FAIL | Compiles but runtime error: `Some is not defined`. Known issue with variant constructors not emitted in codegen |
| 5 | Ref with Option (None): `let mut state = ref(None)` | Refs with Variants | positive | FAIL | Compiles but runtime error: `None is not defined`. Same known constructor issue |

### Dereference (`!` operator)

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 6 | Dereference with `!`: `let val = !x` | Reading References | positive | FAIL | Type error: `Cannot unify types: Ref<Int> with Bool`. The `!` operator always treats operand as Bool (logical NOT), never as dereference |
| 7 | Dereference in expression: `!x + 1` | Reading References | positive | FAIL | Same error. `!` on Ref always fails with Bool unification error |
| 8 | Deref with type annotation: `let mut x: Ref<Int> = ref(0); !x` | Reading References | positive | FAIL | Even with explicit `Ref<Int>` annotation, `!` still treated as logical NOT |
| 9 | Deref Ref<Bool>: `let mut flag = ref(true); !flag` | Disambiguation | positive | FAIL | `Cannot unify types: Ref<Bool> with Bool`. Ref<Bool> is not disambiguated either |

### Assignment (`:=` operator)

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 10 | Basic assignment at top level: `let _ = x := 5` | Updating References | positive | PASS | Compiles and runs. Codegen: `x.$value = 5` |
| 11 | Multiple assignments at top level | Updating References | positive | PASS | Compiles and runs correctly |
| 12 | Assignment in single-expression lambda: `(val) => x := val` | Updating References | positive | PASS | Compiles and runs. Codegen: `(val) => (x.$value = val, undefined)` |
| 13 | Assignment in block body: `{ let _ = x := val; val; }` | Updating References | positive | FAIL | `Pattern matching in let-bindings not yet implemented`. `:=` cannot be bound to `let _ =` inside function blocks |
| 14 | Increment pattern: `x := !x + 1` | Updating References | positive | FAIL | Blocked by dereference bug. `!x` treated as logical NOT |
| 15 | Top-level `:=` as statement: `x := 5;` | Updating References | positive | FAIL | Parser error: `Expected declaration keyword`. `:=` is not a valid top-level statement form; must be wrapped in `let _ = ...` |

### `let mut` Requirement

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 16 | `let mut` required for ref bindings (positive) | Mut Keyword Requirement | positive | PASS | `let mut counter = ref(0)` compiles correctly |
| 17 | Missing `mut` should fail: `let x = ref(0)` | Mut Keyword Requirement | negative | FAIL | Compiles without error. Spec says this should be a compile-time error. At runtime, `ref` helper is not emitted, so `ref is not defined` |
| 18 | `let x = ref(0)` with `:=` should fail | Mut Keyword Requirement | negative | FAIL | `let x = ref(0); x := 5` compiles AND runs. No `mut` enforcement at all. Codegen produces `const x = ref(0)` (single-wrapped, unlike `let mut` which double-wraps) |

### While Loop

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 19 | Basic while loop at top level | Imperative Factorial example | positive | FAIL | Parser: `Unexpected keyword in declaration: while`. `while` is not a valid top-level declaration |
| 20 | While as expression: `let _ = while ... { }` | Imperative Factorial example | positive | FAIL | `Pattern matching in let-bindings not yet implemented` |
| 21 | While in block expression | Imperative Factorial example | positive | FAIL | `Non-let expression in block (except final expression)`. While cannot appear as a statement in blocks |
| 22 | While in function body | Imperative Factorial example | positive | FAIL | Blocked by `Mutable let-bindings not yet implemented` inside function bodies |

### `let mut` in Function Bodies

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 23 | `let mut` inside function body | Basic Example: Counter, makeCounter | positive | FAIL | `Mutable let-bindings not yet implemented`. `let mut` only works at top level |

### Refs in Closures

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 24 | Closure capturing a ref (makeCounter pattern) | Refs in Closures | positive | FAIL | Multiple blockers: zero-param lambda internal error, `let mut` not in function bodies, deref broken |
| 25 | Multiple closures sharing a ref (top-level ref, lambda assign) | Refs in Closures | positive | PARTIAL | Simple single-expression lambda capturing top-level ref works for `:=` assignment, but deref `!` is broken so can't read back |

### Swap Pattern

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 26 | Swap two refs using temp variable | Multiple Refs example | positive | FAIL | Blocked by dereference bug. `let temp = !x` fails |

### `!` Operator Disambiguation

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 27 | `!` on Bool = logical NOT | Disambiguation | positive | PASS | `!true` correctly evaluates to `false` |
| 28 | `!` on Ref = dereference | Disambiguation | positive | FAIL | `!ref` always treated as logical NOT. No type-based disambiguation implemented |
| 29 | Both in same file | Disambiguation | positive | FAIL | Deref use blocks compilation |

### Negative Tests (should be rejected)

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 30 | Assigning to non-ref: `x := 5` where x is Int | Type Checking Rules | negative | PASS | Correctly rejects: `Cannot unify types: Int with Ref<'n>` |
| 31 | Wrong type assignment: `x := "hello"` where x is Ref<Int> | Type Checking Rules | negative | PASS | Correctly rejects: `Cannot unify String with Int` |
| 32 | Deref non-ref: `!x` where x is Int | Type Checking Rules | negative | PASS | Rejected, but with wrong reason: `Cannot unify Int with Bool` (treats `!` as logical NOT, not as failed dereference) |

### Codegen Issues

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 33 | Double-wrapping of `let mut` refs | N/A (implementation) | observation | ISSUE | `let mut x = ref(0)` generates `{ $value: { $value: 0 } }`. The outer wrap is for `mut`, inner for `ref()`. Assignment `x.$value = val` sets outer wrap, but dereference (if it worked) would need to read from the correct level. Inconsistent with non-mut codegen which is singly wrapped |

## Summary

- **Total: 33 tests**
- **Pass: 9**
- **Fail: 22**
- **Partial: 1**
- **Observation: 1**

## Critical Blockers

The mutable references feature has **three critical blockers** that cascade into most test failures:

1. **`!` dereference not implemented (BLOCKER)**: The `!` operator always resolves to logical NOT, never to dereference. The type-based disambiguation described in the spec is not implemented. This blocks ALL read-back from refs, making the feature fundamentally unusable for its intended purpose.

2. **`let mut` not enforced (SPEC VIOLATION)**: `let x = ref(0)` without `mut` compiles without error. The spec requires `mut` for ref bindings. Additionally, `:=` works on non-`mut` bindings.

3. **`let mut` only works at top level (INCOMPLETE)**: `let mut` inside function bodies produces `Mutable let-bindings not yet implemented`. This prevents the most common ref patterns (local mutable state in functions, makeCounter, imperative algorithms).

### Additional Issues

4. **`:=` unusable in block bodies**: Assignment expressions can't be bound with `let _ =` inside function blocks (`Pattern matching in let-bindings not yet implemented`). Only works at top level or as single-expression lambda body.

5. **`while` loop completely non-functional**: Cannot be used at top level (not a declaration), in `let _ =` bindings, in blocks, or in function bodies. Every position fails.

6. **Codegen double-wrapping**: `let mut x = ref(0)` produces doubly-wrapped `{ $value: { $value: 0 } }`. Assignment sets the outer `$value`, which is inconsistent with the ref's inner structure.

7. **Variant constructors (Some/None) not emitted in generated JS**: `ref(Some(42))` compiles but `Some` is undefined at runtime (known issue, not specific to refs).
