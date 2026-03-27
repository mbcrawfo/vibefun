# Feature Audit: Pattern Matching

**Spec files**: 05-pattern-matching/*.md
**Date**: 2026-03-26

## Results

### Basic Patterns

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 1 | Wildcard pattern `_` | pattern-basics.md | positive | PASS | `match x { | _ => "matched" }` works correctly |
| 2 | Variable pattern | pattern-basics.md | positive | PASS | `match x { | Some(v) => intToStr(v) | None => "none" }` binds and returns correctly |
| 3 | Integer literal pattern | pattern-basics.md | positive | PASS | `| 0 => "zero" | 1 => "one" | _ => "other"` selects correct branch |
| 4 | String literal pattern | pattern-basics.md | positive | PASS | `| "hello" => "greeting"` matches correctly |
| 5 | Boolean literal pattern (matching) | pattern-basics.md | positive | PASS | `| true => "yes" | false => "no"` selects correctly at runtime (requires wildcard fallback due to exhaustiveness bug) |
| 5b | Boolean exhaustiveness | exhaustiveness.md | positive | **FAIL** | `true \| false` is NOT recognized as exhaustive for Bool; compiler requires wildcard. Spec says Bool is a finite type and should be enumerable. |
| 5c | Float literal pattern (single) | pattern-basics.md | positive | PASS | `| 3.14 => "pi"` matches Float correctly |
| 5d | Float literal pattern (`0.0`) | pattern-basics.md | positive | **FAIL** | `| 0.0 => "zero"` causes `Cannot unify Int with Float`; `0.0` appears to be parsed as Int 0 in pattern context |
| 5e | Variable pattern (bare) | pattern-basics.md | positive | PASS | `| value => intToStr(value)` binds any value |

### Variant Patterns

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 6 | Some(x) pattern with binding | data-patterns.md | positive | PASS | `Some(v)` extracts value correctly |
| 7 | None pattern (in match) | data-patterns.md | positive | PASS | `None` arm in match works when Some value is provided |
| 7b | None as value (standalone) | data-patterns.md | positive | **FAIL** | Using `None` as a standalone value crashes compiler: "Internal error: Function type must have at least one parameter". Cannot construct a None value to test the None match arm at runtime. |
| 8 | Ok(x) / Err(e) patterns | data-patterns.md | positive | PASS | Both Ok and Err patterns extract values correctly |
| 9 | Nested variant `Some(Ok(x))` | data-patterns.md/advanced-patterns.md | positive | PASS | Three-level nesting works: `Some(Ok(42))` matched by `Some(Ok(v))` |

### List Patterns

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 10 | Empty list pattern `[]` | data-patterns.md | positive | PASS | `| [] => "empty"` matches empty list |
| 11 | Single element list `[x]` | data-patterns.md | positive | PASS | `| [x] => "single: " & intToStr(x)` extracts correctly |
| 12 | Multiple elements `[x, y]` | data-patterns.md | positive | PASS | `| [x, y] => ...` matches and binds both elements |
| 13 | Head-tail pattern `[x, ...rest]` | data-patterns.md | positive | PASS | Spread pattern captures rest of list |
| 14 | Nested list in variant `Ok([first, ...rest])` | data-patterns.md | positive | PASS | List pattern nested inside Ok variant works |
| 14b | Cons pattern `x :: rest` | data-patterns.md | negative | **FAIL** | `| x :: rest =>` is not supported in patterns; parser error: "Expected '=>' after match pattern, but found OP_CONS". Spec shows `[x, ...rest]` syntax only, but the AI coding guide shows `x :: rest` in patterns. |
| 14c | Matching specific list lengths | data-patterns.md | positive | PASS | `[] \| [_] \| [_, _] \| [_, _, _] \| _` works correctly |
| 14d | Discard rest with `..._` | data-patterns.md | positive | PASS | `[first, second, ..._]` discards remaining elements |

### Record Patterns

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 15 | Record partial match `{ name: n }` | data-patterns.md | positive | PASS | Partial record matching extracts single field |
| 15b | Record with literal value `{ status: "ok" }` | data-patterns.md | positive | PASS | Matching specific field values works |
| 16 | Record multiple fields `{ name: n, age: a }` | data-patterns.md | positive | PASS | Multiple field extraction works |
| 16b | Record field shorthand `{ name, age }` | data-patterns.md | positive | PASS | Shorthand binds field to same-named variable |
| 16c | Record in variant `Ok({ value: v })` | data-patterns.md | positive | PASS | Record pattern nested in variant works |
| 16d | List in record `{ items: [first, ...rest] }` | data-patterns.md | positive | PASS | List pattern inside record pattern works |

### Advanced Patterns

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 17 | Deep nesting `Some(Ok(v))` / `Some(Err(e))` / `None` | advanced-patterns.md | positive | PASS | All three arms of nested variant match work |
| 18 | Pattern guard `when v > 0` | advanced-patterns.md | positive | PASS | Guard condition filters matching correctly |
| 18b | Guard fallthrough (zero case) | advanced-patterns.md | positive | PASS | `Some(0)` falls through guarded arms to unguarded `Some(v)` arm |
| 18c | Guard with `&&` condition | advanced-patterns.md | positive | PASS | `when v > 0 && v < 100` compound guard works |
| 18d | Guard referencing outer scope | advanced-patterns.md | positive | PASS | `when v > threshold` references outer variable correctly |
| 19 | Or-patterns (top-level) `0 \| 1 \| 2` | advanced-patterns.md | positive | PASS | Multiple literal alternatives share same result expression |
| 19b | Or-patterns with strings | advanced-patterns.md | positive | PASS | `"active" \| "pending" \| "running"` works |
| 19c | Nested or-pattern `Ok("success" \| "completed")` | advanced-patterns.md | positive | **FAIL** | Internal error: "Or-pattern should have been expanded at match level". Spec says nested or-patterns inside constructors should work. |
| 20 | As-patterns (not supported) | advanced-patterns.md | negative | PASS | Correctly rejected with parse error; spec documents as-patterns are not supported |

### Exhaustiveness Checking

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 21 | Complete match on Option (`Some \| None`) | exhaustiveness.md | positive | PASS | Compiles without error |
| 22 | Non-exhaustive Option (missing None) | exhaustiveness.md | negative | PASS | Correctly rejects with "Missing cases: None" |
| 22b | Guards do not affect exhaustiveness | exhaustiveness.md | negative | **FAIL** | Match with only guarded variable patterns compiles successfully; spec says guards should NOT contribute to exhaustiveness. At runtime, unmatched values throw "Match exhausted". |
| 22c | Non-exhaustive nested (missing Err) | exhaustiveness.md | negative | PASS | Correctly rejects `Ok(Some(v)) \| Ok(None)` missing `Err` case |
| 23 | Wildcard makes match exhaustive | exhaustiveness.md | positive | PASS | Single `| _ => "anything"` compiles |
| 24 | Bool exhaustiveness (`true \| false`) | exhaustiveness.md | positive | **FAIL** | `true \| false` NOT recognized as exhaustive; requires wildcard. Spec says finite types should be enumerable. (Same as 5b) |
| 24b | Int non-exhaustive (no wildcard) | exhaustiveness.md | negative | PASS | Correctly rejects Int literals without wildcard |
| 24c | List exhaustive (`[] \| [_, ..._]`) | exhaustiveness.md | positive | PASS | Empty + non-empty covers all list cases |
| 24d | List non-exhaustive (missing `[]`) | exhaustiveness.md | negative | PASS | Correctly rejects with "Missing cases: Nil" |

### Let Destructuring

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 25 | Let with variant pattern `let Some(x) = ...` | N/A | positive | **FAIL** | Internal error: "Variant patterns cannot be used in simple destructuring contexts" |
| 25b | Let with record destructuring `let { name, age } = r` | data-patterns.md | positive | PASS | Record destructuring in let works correctly |

### Match as Expression

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 26 | Match result assigned to variable | pattern-basics.md | positive | PASS | `let result = match x { ... }` assigns correctly |
| 27 | Match in function return position | pattern-basics.md | positive | PASS | `let f = (x) => match x { ... }` returns match result |

### Edge Cases

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 28 | Single-arm match with wildcard | pattern-basics.md | positive | PASS | `match n { | _ => "always" }` compiles and runs |
| 29 | Match on string with many cases | pattern-basics.md | positive | PASS | 5 string cases with wildcard fallback all work |
| 30 | Deeply nested `Some(Ok(Some(v)))` | advanced-patterns.md | positive | PASS | Four-level variant nesting works at compile and runtime |

### Built-in Type Support

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 31 | Built-in Option without explicit type def | N/A | positive | **FAIL** | Compiles but generated JS does not emit `const Some = ...` constructor definition. Runtime error: "Some is not defined". Must define `type Option<T> = Some(T) \| None;` explicitly. |

## Summary

- **Total**: 40 tests
- **Pass**: 31
- **Fail**: 9

## Bugs Found

### Critical Bugs

1. **None value crashes compiler** (test 7b): Using `None` as a standalone value causes "Internal error: Function type must have at least one parameter". Nullary variant constructors cannot be used as expressions, only in patterns.

2. **Built-in Option/Result constructors not emitted in codegen** (test 31): When using `Some(42)` without an explicit `type Option<T> = Some(T) | None;` declaration, the compiler accepts the code but the generated JavaScript does not define the `Some`/`None`/`Ok`/`Err` constructors, causing runtime ReferenceError.

3. **Guard-only matches not checked for exhaustiveness** (test 22b): A match expression with only guarded variable patterns compiles without error. Per the spec, guards should not count toward exhaustiveness, so `| x when x > 0 => ... | x when x < 0 => ...` should be rejected. Instead it compiles and can throw "Match exhausted" at runtime.

### Moderate Bugs

4. **Boolean exhaustiveness not recognized** (tests 5b, 24): `| true => ... | false => ...` is not considered exhaustive for Bool. Spec says Bool is a finite type whose constructors should be enumerable.

5. **Nested or-patterns cause internal error** (test 19c): `Ok("success" | "completed")` crashes with "Or-pattern should have been expanded at match level". The spec shows this as valid syntax.

6. **Float literal `0.0` misidentified as Int in patterns** (test 5d): The literal `0.0` in a match pattern triggers "Cannot unify Int with Float", suggesting `0.0` is parsed as Int 0 in pattern context.

### Minor / Expected Limitations

7. **Let variant destructuring not supported** (test 25): `let Some(x) = expr;` gives an internal error. This is arguably correct since variant destructuring is partial/refutable.

8. **Cons `::` operator not supported in patterns** (test 14b): `x :: rest` syntax is not available in patterns; must use `[x, ...rest]` instead. The AI coding guide mentions `::` in patterns but the parser does not support it.

9. **User-defined variant constructors not supported** (documented known issue): Constructors like `MySome`, `MyNone`, `Circle`, etc. are not recognized. Only built-in `Some`/`None`/`Ok`/`Err` work (and only with explicit type definition).
