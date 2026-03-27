# Feature Audit: Lexical Structure

**Spec files**: 02-lexical-structure/basic-structure.md, tokens.md, operators.md
**Date**: 2026-03-26

## Results

### Comments

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 1 | Single-line comments `// comment` | basic-structure.md | positive | PASS | Code with `//` comments compiles and runs correctly |
| 2 | Multi-line comments `/* comment */` | basic-structure.md | positive | PASS | Code with `/* ... */` comments compiles and runs correctly |
| 3 | Nested multi-line comments `/* outer /* inner */ outer */` | basic-structure.md, operators.md | positive | PASS | Nested comments are correctly handled |

### Semicolons

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 4 | Semicolons required between declarations | basic-structure.md | positive | PASS | Code with semicolons between `let` declarations compiles and runs |
| 5 | Missing semicolons between declarations | basic-structure.md | negative | PASS | Compiler correctly rejects missing semicolons with error `VF2107: Expected ';' or newline between declarations` |

### Number Literals

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 6 | Integer decimal literals `42` | tokens.md | positive | PASS | `42` correctly parsed, outputs `42` |
| 7 | Integer hex literals `0xFF` | tokens.md | positive | PASS | `0xFF` correctly parsed as `255` |
| 8 | Integer binary literals `0b1010` | tokens.md | positive | PASS | `0b1010` correctly parsed as `10` |
| 9 | Integer with underscores `1_000_000` | tokens.md | positive | PASS | `1_000_000` correctly parsed as `1000000` |
| 10 | Float standard `3.14` | tokens.md | positive | PASS | `3.14` correctly parsed, outputs `3.14` |
| 11 | Float scientific notation `1e10` | tokens.md | positive | PASS | `1e10` correctly parsed, outputs `10000000000` |
| 12 | Float scientific negative exponent `3.14e-2` | tokens.md | positive | PASS | `3.14e-2` correctly parsed, outputs `0.0314` |
| 13 | Negative numbers `-42` | operators.md | positive | PASS | `-42` correctly parsed via unary minus, outputs `-42` |

### String Literals

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 14 | Basic string `"hello"` | tokens.md | positive | PASS | Basic string literal works correctly |
| 15 | String with escape sequences `\n`, `\t`, `\\`, `\"` | tokens.md | positive | PASS | All four escape sequences produce correct output (newline, tab, backslash, quote) |
| 16 | String with hex escape `\x41` | tokens.md | positive | PASS | `\x41` correctly produces `A` |
| 17 | String with unicode escape `\u0041` | tokens.md | positive | PASS | `\u0041` correctly produces `A` |
| 18 | Empty string `""` | tokens.md | positive | PASS | Empty string is accepted and produces empty output |

### Boolean Literals

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 19 | `true` and `false` | tokens.md | positive | PASS | Both boolean literals work; `true` outputs `true`, `false` outputs `false` |

### Unit Literal

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 20 | `()` unit value | tokens.md | positive | PASS | Unit literal `()` accepted with type annotation `Unit` |

### Operators

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 21 | Arithmetic on Int: `+`, `-`, `*`, `/`, `%` | operators.md | positive | PASS | All five operators produce correct results: 10+3=13, 10-3=7, 10*3=30, 10/3=3 (integer division), 10%3=1 |
| 22 | Arithmetic on Float: `+`, `-`, `*`, `/` | operators.md | positive | **FAIL** | `10.0 + 3.0` fails with `VF4020: Cannot unify Float with Int`. Also fails for `*`. The type checker does not allow arithmetic operators on Float literals. |
| 23 | Comparison: `==`, `!=`, `<`, `<=`, `>`, `>=` | operators.md | positive | PASS | All six comparison operators produce correct boolean results |
| 24 | Logical: `&&`, `||` | operators.md | positive | PASS | AND and OR produce correct results for all truth table entries |
| 25 | Logical NOT: `!` on Bool | operators.md | positive | PASS | `!true` = `false`, `!false` = `true` |
| 26 | String concatenation: `&` | operators.md | positive | PASS | `"hello" & " " & "world"` correctly produces `hello world` |
| 27 | Unary minus: `-x` | operators.md | positive | PASS | `-x` where `x = 10` correctly produces `-10` |
| 28 | Pipe operator: `\|>` | operators.md | positive | PASS | `5 \|> double \|> addOne` correctly produces `11` (5*2=10, 10+1=11) |
| 29 | Composition operators: `>>`, `<<` | operators.md | positive | PASS | `double >> addOne` (forward) produces 11, `double << addOne` (backward) produces 12. Both are correct. |
| 30 | List cons: `::` | operators.md | positive | PASS | `1 :: 2 :: 3 :: []` correctly builds list `[1, 2, 3]` |

### Negative Tests for Literals

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 31 | Invalid hex digits `0xGHI` | operators.md | negative | PASS | Compiler correctly rejects with `VF1102: Invalid hex literal: expected at least one hex digit after 0x` |
| 32 | Unterminated string | operators.md | negative | PASS | Compiler correctly rejects with `VF1001: Unterminated string: newline in single-line string` |

## Summary

- **Total**: 32 tests
- **Pass**: 31
- **Fail**: 1

### Failures

1. **Test 22 - Float arithmetic**: Arithmetic operators (`+`, `-`, `*`, `/`) do not work on Float values. `10.0 + 3.0` produces `VF4020: Cannot unify Float with Int`. The spec (operators.md) lists arithmetic operators as applicable to both Int and Float, but the type checker appears to constrain them to Int only. This is a type checker bug, not a lexer issue -- Float literals are correctly lexed (tests 10-12 pass), but the type checker fails when applying arithmetic operators to Float operands.

### Test Files

All test files are located in `/tmp/vf-audit-lexical/`.
