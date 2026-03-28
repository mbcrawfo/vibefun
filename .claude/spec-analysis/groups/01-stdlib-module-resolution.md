# Group 1: Stdlib Module-Qualified Name Resolution

## Problem
The compiler registers stdlib builtins as flat dotted keys (e.g., `"String.fromInt"`) in the type environment, but the parser produces `RecordAccess(Var("String"), "fromInt")` for `String.fromInt(x)`. The typechecker tries to resolve `String` as a variable, which doesn't exist. There is no mechanism to bridge from the parsed AST form to the flat builtin keys.

## Impact
This is the single highest-impact issue. It affects **~120+ tests across all 11 sections** because virtually every `expectRunOutput` test uses the `withOutput` helper, which calls `String.fromInt()`, `String.fromFloat()`, or `String.fromBool()`.

## Sub-issues
1. **No namespace/module resolution for builtins** - The core resolution gap between parser output and type environment
2. **Missing `String.fromBool` builtin** - Not registered in builtins.ts at all (affects Bool-output tests in sections 02, 05, 06, 07)
3. **Missing stdlib runtime implementations** - codegen has no JS implementations for stdlib functions (only `ref()` and `$eq()` exist in runtime-helpers.ts)
4. **Desugarer emits bare `concat` instead of `List.concat`** - List spread desugars to `Var("concat")` but builtins use `"List.concat"` (section 04)
5. **Argument order mismatch** - builtins.ts uses function-first for List.map/filter/fold, spec uses data-first (section 11)

## Affected Sections
- 02-lexical-structure: 10 tests
- 03-type-system: 12 tests
- 04-expressions: ~30 tests
- 05-pattern-matching: 7 tests
- 06-functions: 17 tests (all)
- 07-mutable-references: 11 tests
- 09-error-handling: 7 tests
- 10-javascript-interop: 3 tests
- 11-stdlib: 19 tests (all)
- 12-compilation: 4 tests

## Estimated Complexity
- Namespace resolution: Medium (50-200 lines)
- String.fromBool addition: Simple (1-2 lines)
- Runtime implementations: Large (200+ lines for ~46 functions)
- Desugarer concat fix: Simple (depends on namespace resolution)
- Argument order fix: Simple (a few lines per function)
