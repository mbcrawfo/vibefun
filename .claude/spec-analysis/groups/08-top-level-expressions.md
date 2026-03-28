# Group 8: Top-Level Expression Statements

## Problem
The parser only accepts declarations (`let`, `type`, `external`, `import`, `export`) at the top level of a module. Expression statements like `x := 20;`, `while ... { ... };`, and bare function calls cannot appear at the top level. They must be wrapped in `let _ = ...;` or placed inside a function/block body.

This affects both real language usability and test code that places expressions at the top level via the `withOutput`/`withOutputs` helpers.

## Affected Sections
- 04-expressions: 2 tests (while loop, while loop returns Unit)
- 07-mutable-references: 5 tests (update ref, while loop with mutable counter, mutations through aliases, record with ref field)
- 12-compilation: 1 test (while loop desugars correctly)

## Estimated Complexity
Medium - Either extend the parser to allow expression statements at the top level (treating them as implicit `let _ = expr`), or rewrite tests. The former is more aligned with the spec.
