# Feature Audit: Standard Library - List

**Spec files**: 11-stdlib/list.md
**Date**: 2026-03-26

## Results

### List Construction

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 1 | List literal `[1, 2, 3]` | List Construction | positive | PASS | Compiles, runs, elements accessible via pattern match |
| 2 | Empty list `[]` | List Construction | positive | PASS | Compiles, matches `[]` pattern correctly |
| 3 | Cons operator `1 :: [2, 3]` | List Construction | positive | PASS | Builds list correctly; chaining `1 :: 2 :: 3 :: []` also works |
| 4a | List spread (at end) `[0, 1, ...xs]` | List Construction | positive | PASS | Spread at end of literal works correctly |
| 4b | List spread (only) `[...xs]` | List Construction | positive | PASS | Spread-only literal works |
| 4c | List spread (at start) `[...xs, 4, 5]` | List Construction | positive | FAIL | Compiler error: `Undefined variable 'concat'`. Spread only works at the end of a list literal. |
| 4d | List spread (in middle) `[0, ...xs, 4]` | List Construction | positive | FAIL | Compiler error: `Undefined variable 'concat'`. Same issue as 4c. Spec shows `[0, ...nums, 4]` as valid syntax but compiler rejects it. |

### List Functions (Namespace Access)

All `List.*` function calls fail with **`error[VF4100]: Undefined variable 'List'`**. The `List` module namespace is not available as a bound variable in the compiler. This is a known limitation noted in the task instructions.

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 5 | `List.map` | Core Functions / List.map | positive | FAIL | `Undefined variable 'List'` -- namespace not bound |
| 5b | `[1,2,3] \|> List.map(...)` | Core Functions / List.map | positive | FAIL | Same error via pipe operator |
| 6 | `List.filter` | Core Functions / List.filter | positive | FAIL | `Undefined variable 'List'` |
| 7a | `List.fold` | Core Functions / List.fold | positive | FAIL | `Undefined variable 'List'` |
| 7b | `List.foldRight` | Core Functions / List.foldRight | positive | FAIL | `Undefined variable 'List'` |
| 8 | `List.head` | Core Functions / List.head | positive | FAIL | `Undefined variable 'List'` |
| 9 | `List.tail` | Core Functions / List.tail | positive | FAIL | `Undefined variable 'List'` |
| 10 | `List.length` | Core Functions / List.length | positive | FAIL | `Undefined variable 'List'` |
| 11 | `List.reverse` | Core Functions / List.reverse | positive | FAIL | `Undefined variable 'List'` |
| 12 | `List.concat` | Core Functions / List.concat | positive | FAIL | `Undefined variable 'List'` |
| 13 | `List.contains` | Additional Common Ops / List.contains | positive | FAIL | `Undefined variable 'List'` |
| 14 | `List.find` | Task requirement (not in spec) | positive | FAIL | `Undefined variable 'List'` -- also not in the spec's function list |
| 15 | `List.findIndex` | Task requirement (not in spec) | positive | FAIL | `Undefined variable 'List'` -- also not in the spec's function list |
| 16 | `List.groupBy` | Task requirement (not in spec) | positive | FAIL | `Undefined variable 'List'` -- also not in the spec's function list |
| 17 | `List.take` | Additional Common Ops / List.take | positive | FAIL | `Undefined variable 'List'` |
| 18 | `List.drop` | Additional Common Ops / List.drop | positive | FAIL | `Undefined variable 'List'` |
| 19 | `List.zip` | Task requirement (not in spec) | positive | FAIL | `Undefined variable 'List'` -- also not in the spec's function list |
| 20 | `List.flatten` | Core Functions / List.flatten | positive | FAIL | `Undefined variable 'List'` |
| 21 | `List.sort` | Task requirement (not in spec) | positive | FAIL | `Undefined variable 'List'` -- also not in the spec's function list |

### List Pattern Matching

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 22 | Match empty list `[]` | Pattern Matching | positive | PASS | Correctly matches empty list pattern |
| 23a | Match `[x, ...rest]` (head + spread) | Pattern Matching | positive | PASS | Destructures head and tail correctly |
| 23b | Match `h :: t` (cons pattern) | Pattern Matching | positive | FAIL | Parser error: `Expected '=>' after match pattern, but found OP_CONS`. The `::` cons operator is not supported in patterns; only `[x, ...rest]` spread syntax works. |
| 24 | Match specific length `[x, y]` | Pattern Matching | positive | PASS | Correctly matches exactly 2-element list |
| 25a | Match `[x, ...rest]` (single + spread) | Pattern Matching | positive | PASS | Works correctly |
| 25b | Match `[a, b, ...rest]` (multi + spread) | Pattern Matching | positive | PASS | Works correctly, binds 2 elements + rest |

### Bonus: Recursive List Processing (workaround for missing stdlib)

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| B1 | Recursive sum using pattern matching | Examples | positive | PASS | `let rec sum = (list) => match list { \| [] => 0 \| [x, ...xs] => x + sum(xs) }` works correctly, returns 15 for `[1,2,3,4,5]` |

## Summary

- **Total**: 33 tests
- **Pass**: 11
- **Fail**: 22

### Key Findings

1. **List construction fundamentals work well**: List literals, empty lists, cons operator (`::`), and spread-at-end all function correctly.

2. **List spread is limited**: The spec shows `[0, ...nums, 4]` as valid syntax (spread in middle/start position), but the compiler only supports spread at the END of a list literal (e.g., `[0, 1, ...xs]`). Spread at the start or middle fails with `Undefined variable 'concat'`, suggesting the codegen for non-tail spread positions is not implemented.

3. **ALL List module functions are unimplemented**: Every `List.*` namespace call (`List.map`, `List.filter`, `List.fold`, etc.) fails with `Undefined variable 'List'`. The `List` module namespace is not bound in the compiler's scope. This affects all 19 tested List function calls.

4. **Pattern matching on lists works well**: Empty list match, specific-length match, and spread patterns (`[x, ...rest]`, `[a, b, ...rest]`) all work correctly. However, the `h :: t` cons pattern syntax is NOT supported in match arms (only the `[h, ...t]` spread syntax works).

5. **Recursive list processing works**: Users can work around the missing stdlib by writing recursive functions using pattern matching, which functions correctly.

6. **Spec vs. implementation gap**: The spec documents `List.find`, `List.findIndex`, `List.groupBy`, `List.zip`, and `List.sort` in the task requirements, but these functions are not actually specified in the List module spec document (`11-stdlib/list.md`). Regardless, none of them work since the `List` namespace itself is not available.
