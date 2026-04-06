# Group 1: Stdlib Module-Qualified Name Resolution & Runtime

## Root Issue
The compiler cannot resolve module-qualified stdlib function calls like `String.fromInt(42)`. The parser produces `RecordAccess(Var("String"), "fromInt")` but the typechecker registers builtins as flat keys like `"String.fromInt"`. There is no mechanism to bridge these two representations. Additionally, even if resolution worked, there is no JavaScript runtime implementation for any stdlib function -- the codegen only emits `ref()` and `$eq()` helpers.

## Affected Sections
02-lexical-structure, 03-type-system, 04-expressions, 05-pattern-matching, 06-functions, 07-mutable-references, 09-error-handling, 10-javascript-interop, 11-stdlib, 12-compilation

## Affected Tests (count)
~150+ tests across all sections. This is the single largest blocker in the entire spec validation suite. In many cases, the underlying features work correctly but the test harness uses `String.fromInt`/`String.fromFloat`/`String.fromBool` for output verification.

## Details
This group combines three tightly coupled sub-issues:

1. **Name resolution gap** (Medium, all sections): `RecordAccess(Var("String"), "fromInt")` cannot be resolved to the flat builtin key `"String.fromInt"`. Requires either a module namespace system, a desugaring pass for known module prefixes, or registering pseudo-module objects in the value environment.

2. **Missing stdlib runtime codegen** (Large, primarily section 11): No JavaScript implementations exist for stdlib functions. The `@vibefun/std` package is a placeholder. Each stdlib function needs a JS implementation (many are trivial wrappers, e.g., `String.fromInt` → `String(n)`).

3. **Builtin registration gaps** (Small):
   - `String.fromBool` entirely missing from `builtins.ts`
   - `Float.isNaN`, `Float.isInfinite`, `Float.isFinite` missing
   - `List.flatten` missing
   - No `Math` module functions registered at all (`Math.sqrt`, `Math.floor`, `Math.ceil`, `Math.abs` etc.)
   - Parameter order mismatch: builtins use function-first (e.g., `(fn, list)`) but spec uses data-first (e.g., `(list, fn)`) for 33 List/Option/Result functions

4. **List spread `concat` name mismatch** (Small): The list spread desugarer (`desugarListWithConcats.ts:64`) generates `CoreVar("concat")`, but builtins register `"List.concat"`. This is a different bug from the module-qualified access pattern -- it's a `CoreVar` lookup failure, not a `RecordAccess` issue. Using the flat key `"List.concat"` as the `CoreVar` name would fix the typechecker lookup, but the codegen would still need a JS runtime implementation for the function.

5. **External function inline codegen bug** (Small): External functions with lambda JS bodies (e.g., `external intToStr: (Int) -> String = "(n) => String(n)"`) have their bodies inlined instead of called -- producing `(n) => String(n)(result)` instead of `((n) => String(n))(result)`. This affects potential workarounds using inline externals.

## Individual Failures
- **02**: 12 tests (boolean/integer/float literal output, pipe, unary minus)
- **03**: 11 tests (primitive types, division, booleans, records, inference)
- **04**: 43 tests (nearly all expression tests needing runtime output)
- **05**: 8 tests (pattern binding, variant matching, list patterns)
- **06**: 15 tests (functions, recursion, composition, closures)
- **07**: 12 tests (dereference, assignment, aliasing, counters)
- **09**: 10 tests (float ops, Result/Option types, special values)
- **10**: 4 tests (unsafe block expressions, pipe with external, wrapping)
- **11**: 52 tests (all stdlib function tests)
- **12**: 9 tests (currying, pipes, composition, records, lists)

## Estimated Fix Scope
- Name resolution: Medium (2-8 hours) -- core architectural fix
- Stdlib runtime: Large (2-4 days) -- ~46 functions to implement with correct currying behavior and variant representation interaction (e.g., `List.fold` must work with `{ $tag: "Cons", $0: value, ... }` representation)
- Builtin gaps: Small (1-2 hours) -- add missing signatures, fix parameter order
- List spread name fix: Small (1 hour)
- Total: Large to XL

## Important Note on Test Count
The ~150+ figure represents tests where stdlib name resolution is **at least one** blocker. Many of these tests have additional overlapping blockers (multi-arg call desugaring, float operator types, user-defined type registration, etc.). After fixing only this group, the actual number of newly-passing tests will be lower. The figure should be read as "tests unblocked from this particular barrier" not "tests that will pass."
