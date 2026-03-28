# Group 7: Zero-Parameter Lambdas and Empty Blocks

## Problem
Two related desugarer gaps:

1. **Zero-parameter lambdas**: `() => expr` is parsed correctly but the desugarer's `curryLambda` throws `"Lambda with zero parameters"`. The spec says this should be valid.

2. **Empty block expressions**: `{}` (empty block) triggers `"Empty block expression"` in the desugarer. The spec says empty blocks should be valid and return Unit.

Both are desugarer crashes on edge cases of otherwise-working features.

## Affected Sections
- 02-lexical-structure: 1 test (empty blocks valid without semicolons)
- 04-expressions: 2 tests (no-argument function call, empty block returns Unit)
- 06-functions: 1 test (zero-argument lambda)

## Estimated Complexity
Small - Both are simple edge case handling:
- Zero-param lambda: convert to single-param lambda taking Unit/wildcard
- Empty block: return a Unit literal
