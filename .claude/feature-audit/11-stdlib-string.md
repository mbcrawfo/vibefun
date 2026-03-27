# Feature Audit: Standard Library - String

**Spec files**: 11-stdlib/string.md
**Date**: 2026-03-26

## Results

### String Basics

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 1 | String literal `"hello"` | Core type | positive | PASS | Outputs `hello` correctly |
| 2 | String concatenation `&` | String.concat / operator | positive | PASS | `"hello" & " " & "world"` produces `hello world` |
| 3 | Empty string `""` | Core type | positive | PASS | Empty string concatenates correctly |
| 4 | String equality `==` | (operators) | positive | PASS | `"abc" == "abc"` returns `true` |
| 5 | String inequality `!=` | (operators) | positive | PASS | `"abc" != "def"` returns `true` |

### String Module Functions (from spec)

All String module namespace functions fail with `error[VF4100]: Undefined variable 'String'`. The `String` namespace is not bound as a variable in the compiler, so `String.xxx(...)` calls cannot be resolved.

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 6 | `String.length` | string.md - String.length | positive | FAIL | Undefined variable 'String' |
| 7 | `String.concat` | string.md - String.concat | positive | FAIL | Undefined variable 'String' |
| 8 | `String.fromInt` | string.md - String.fromInt | positive | FAIL | Undefined variable 'String' |
| 9 | `String.fromFloat` | string.md - String.fromFloat | positive | FAIL | Undefined variable 'String' |
| 10 | `String.toUpperCase` | string.md - String.toUpperCase | positive | FAIL | Undefined variable 'String' |
| 11 | `String.toLowerCase` | string.md - String.toLowerCase | positive | FAIL | Undefined variable 'String' |
| 12 | `String.trim` | string.md - String.trim | positive | FAIL | Undefined variable 'String' |
| 13 | `String.split` | string.md - String.split | positive | FAIL | Undefined variable 'String' |
| 14 | `String.contains` | string.md - String.contains | positive | FAIL | Undefined variable 'String' |
| 15 | `String.startsWith` | string.md - String.startsWith | positive | FAIL | Undefined variable 'String' |
| 16 | `String.endsWith` | string.md - String.endsWith | positive | FAIL | Undefined variable 'String' |
| 20 | `String.toInt` | string.md - String.toInt | positive | FAIL | Undefined variable 'String' |
| 21 | `String.toFloat` | string.md - String.toFloat | positive | FAIL | Undefined variable 'String' |

### String Module Functions (not in spec, from task list)

These functions were listed in the audit task but do not appear in the String module spec (`11-stdlib/string.md`). They all fail with the same `Undefined variable 'String'` error.

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 17 | `String.indexOf` | NOT IN SPEC | positive | FAIL | Undefined variable 'String'; also not specified |
| 18 | `String.substring` | NOT IN SPEC | positive | FAIL | Undefined variable 'String'; also not specified |
| 19 | `String.replace` | NOT IN SPEC | positive | FAIL | Undefined variable 'String'; also not specified |
| 22 | `String.padStart` | NOT IN SPEC | positive | FAIL | Undefined variable 'String'; also not specified |
| 23 | `String.padEnd` | NOT IN SPEC | positive | FAIL | Undefined variable 'String'; also not specified |

### String Escape Sequences

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 24 | Newline `\n` | (lexical) | positive | PASS | `"line1\nline2"` outputs two lines |
| 25 | Tab `\t` | (lexical) | positive | PASS | `"col1\tcol2"` outputs tab-separated |
| 26 | Backslash `\\` | (lexical) | positive | PASS | `"back\\slash"` outputs `back\slash` |
| 27 | Quote `\"` | (lexical) | positive | PASS | `"say \"hello\""` outputs `say "hello"` |
| 28 | Hex escape `\x41` | (lexical) | positive | PASS | `"\x41"` outputs `A` |
| 29 | Unicode escape `\u0041` | (lexical) | positive | PASS | `"\u0041"` outputs `A` |

## Summary

- **Total**: 29 tests
- **Pass**: 11
- **Fail**: 18

### Key Findings

1. **String basics work well**: String literals, concatenation with `&`, empty strings, equality, and inequality all work correctly.

2. **All String module namespace functions are unimplemented**: Every `String.xxx(...)` call fails with `error[VF4100]: Undefined variable 'String'`. The compiler does not bind `String` as a module namespace. This affects all 18 spec'd functions (length, concat, fromInt, fromFloat, toUpperCase, toLowerCase, trim, split, contains, startsWith, endsWith, toInt, toFloat) plus the 5 additional functions tested (indexOf, substring, replace, padStart, padEnd).

3. **All escape sequences work**: `\n`, `\t`, `\\`, `\"`, `\x41`, and `\u0041` all compile and produce correct output.

4. **Spec gap**: The task listed `indexOf`, `substring`, `replace`, `padStart`, and `padEnd` as String module functions but these do not appear in the spec file (`docs/spec/11-stdlib/string.md`). They cannot be tested anyway since the String namespace is unresolved.

5. **Workaround available**: String-to-int/float conversion can be done via `external` declarations (e.g., `external intToStr: (Int) -> String = "String";`), but native `String.fromInt` etc. do not work.
