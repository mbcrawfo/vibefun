# Group 3: Multi-Argument Call Site Desugaring

## Problem
The desugarer converts multi-parameter lambdas to curried form (`(x, y) => body` becomes `(x) => (y) => body`) but does NOT convert multi-argument call sites. `f(a, b)` remains as `CoreApp { func: f, args: [a, b] }`. The typechecker then sees an arity mismatch: the function has type `(Int) -> (Int) -> Int` (arity 1) but is being called with 2 arguments.

Curried call syntax `f(a)(b)` works correctly -- only the multi-arg shorthand is broken.

## Impact
Affects any test that calls a multi-parameter function with `f(a, b)` syntax instead of `f(a)(b)`.

## Affected Sections
- 03-type-system: 2 tests (function type inference, generic function)
- 04-expressions: masked by other failures but would affect multi-arg calls
- 06-functions: 5 tests (named function, currying, partial application, three-arg, function as argument)
- 12-compilation: 1 test (functions compile to callable JS)

## Estimated Complexity
Small - In the desugarer's `App` case, when `args.length > 1`, transform to nested single-arg applications: `CoreApp(CoreApp(func, [arg0]), [arg1])`.
