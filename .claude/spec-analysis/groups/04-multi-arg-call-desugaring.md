# Group 4: Multi-Argument Call Desugaring

## Root Issue
Multi-parameter function definitions are correctly curried during desugaring (`(x, y) => body` becomes `(x) => (y) => body`), but multi-argument function calls are NOT desugared to match. `f(a, b)` is passed through as a multi-arg `CoreApp` instead of being desugared to `f(a)(b)`. The typechecker then rejects the arity mismatch (VF4021).

## Affected Sections
03-type-system, 06-functions, 12-compilation

## Affected Tests (count)
~5 tests directly. However, this is a fundamental calling convention issue -- the spec says `add(1, 2)` and `add(1)(2)` should be equivalent.

## Details
The desugarer's `App` case (line 157-163 of `desugarer.ts`) passes through all arguments as `CoreApp.args[]` without currying. The typechecker's `inferApp` constructs a multi-param expected function type and tries to unify it with the 1-param curried actual type, producing VF4021.

The fix is straightforward: in the desugarer, transform `App { func, args: [a, b, c] }` into nested single-arg `CoreApp` nodes: `CoreApp(CoreApp(CoreApp(func, a), b), c)`.

Note: Curried calls `f(a)(b)` already work correctly. This only affects the `f(a, b)` sugar.

## Individual Failures
- **03**: 1 test (function type inference, combined with stdlib issue)
- **06**: 3 tests (named function definition, function as argument, mixed calling conventions)
- **12**: 1 test (functions compile to callable JS)

## Estimated Fix Scope
Small (1-2 hours). Straightforward desugarer transformation. An existing unit test expects multi-arg `CoreApp` and would need updating.
