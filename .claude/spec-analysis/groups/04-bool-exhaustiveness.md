# Group 4: Bool Exhaustiveness and If-Then-Else

## Problem
The exhaustiveness checker in `patterns.ts` treats all literal patterns as non-exhaustive unless a wildcard/catch-all is present. It does not special-case `Bool` to recognize that `true | false` covers all possible values. Since `if-then-else` desugars to `match cond { | true => a | false => b }`, all if-then-else expressions fail with `VF4400: Non-exhaustive pattern match`.

## Impact
Blocks all if-then-else usage and match expressions on Bool values.

## Affected Sections
- 04-expressions: 6 tests (if-then-else, nested if-else, if without else, while loop, while returns Unit, match with variants)
- 05-pattern-matching: 2 tests (exhaustive match on bool, literal pattern matching - bool)
- 07-mutable-references: indirectly (while loop with mutable counter)

## Estimated Complexity
Small - Add a special case in `checkExhaustiveness` for `Bool` that checks if both `true` and `false` literal patterns are present.
