# Group 6: Zero-Argument Lambda & Empty Block Expression

## Root Issue
Two related "not yet implemented" cases in the desugarer that throw internal errors (exit code 5):
1. `() => expr` throws "Lambda with zero parameters" in `curryLambda.ts:34`
2. `{}` (empty block) throws "Empty block expression" in `desugarBlock.ts:32`

Both are cases where the parser produces valid AST but the desugarer doesn't handle the edge case.

## Affected Sections
02-lexical-structure, 04-expressions, 06-functions, 07-mutable-references

## Affected Tests (count)
~6 tests directly.

## Details
**Zero-arg lambda**: The `CoreLambda` type requires exactly one `param: CorePattern`, so zero-param lambdas have no representation. The fix is to desugar `() => expr` to a lambda with a unit pattern parameter `(_: Unit) => expr`.

**Empty block**: The fix is to return `CoreUnitLit` when `exprs.length === 0` instead of throwing.

These are independent fixes but grouped together as they're both small desugarer gaps that cause internal errors.

## Individual Failures
- **02**: 1 test (empty blocks valid without semicolons)
- **04**: 4 tests (no-arg function call, lambda with no params, AND/OR short-circuit tests that define `() => {...}`)
- **06**: 1 test (zero-argument lambda)
- **07**: 1 test (closure captures ref / makeCounter pattern uses `() => {...}`)

## Estimated Fix Scope
Small (1-2 hours total for both fixes).
