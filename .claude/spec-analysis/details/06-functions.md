# Section 06: Functions - Failure Analysis

## Summary
- Total tests: 17
- Passing: 0
- Failing: 17
- Key issues: All 17 tests fail because `String.fromInt`/`String.fromBool` module-qualified calls are not resolved (the `String` namespace is not accessible as a variable). Additionally, 3 tests have secondary issues: multi-argument call syntax `f(a, b)` fails with arity mismatch, zero-argument lambdas crash internally, and lambda pattern destructuring is unimplemented.

## Root Causes

### RC-1: Module-qualified stdlib functions not resolvable (`String.fromInt`, `String.fromBool`)
**Affected tests:** ALL 17 tests
**Description:** The type checker registers builtins like `String.fromInt` as flat string keys (e.g., `env.set("String.fromInt", ...)`) in `builtins.ts`. However, the parser resolves `String.fromInt(x)` as `CoreRecordAccess(Var("String"), "fromInt")` -- i.e., it tries to look up `String` as a variable first, which doesn't exist, producing error `VF4100: Undefined variable 'String'`. There is a fundamental mismatch between how builtins are registered (dot-concatenated strings) and how the type checker resolves dotted expressions (record field access on a variable).
**Evidence:**
```
error[VF4100]: Undefined variable 'String'
  --> <stdin>:4:30
  |
4 | let _ = unsafe { console_log(String.fromInt(result)) };
  |                              ^
```
**Estimated complexity:** Medium -- Requires either (a) implementing a module/namespace resolution system that maps `String` to a namespace object containing `fromInt`, `fromBool`, etc., or (b) adding special-case handling in the type checker to resolve `RecordAccess(Var("ModuleName"), "func")` patterns against the builtin registry. Option (b) is simpler but less principled.

### RC-2: `String.fromBool` not registered as a builtin
**Affected tests:** mutually recursive functions with rec/and, mutual recursion - odd case (2 tests)
**Description:** Even if RC-1 were fixed, `String.fromBool` is not registered in `builtins.ts` at all. Only `String.fromInt` and `String.fromFloat` are registered. The mutual recursion tests use `String.fromBool(result)` to convert boolean results to string output.
**Evidence:** No match for `fromBool` anywhere in `packages/core/src/`. The builtins file (`packages/core/src/typechecker/builtins.ts`) registers `String.fromInt`, `String.fromFloat`, `String.length`, `String.concat`, but no `String.fromBool`.
**Estimated complexity:** Simple -- Add `String.fromBool` to builtins.ts and its corresponding codegen implementation.

### RC-3: Multi-argument call syntax `f(a, b)` not supported for curried functions
**Affected tests:** named function definition, automatic currying - partial application, curried call syntax, three-argument currying, function as argument (5 tests, but masked by RC-1)
**Description:** The desugarer correctly curries multi-parameter lambdas (`(x, y) => body` becomes `(x) => (y) => body`), creating nested single-parameter `CoreLambda` nodes that produce `(Int) -> (Int) -> Int` function types. However, the desugarer does NOT curry multi-argument application nodes -- `f(a, b)` remains as `CoreApp { func: f, args: [a, b] }`. The type checker's `inferApp` then creates an expected type `(Int, Int) -> T` (2-param function) which fails to unify with the actual curried type `(Int) -> (Int) -> Int` (1-param function).

The fix needs to happen in either the desugarer (convert `CoreApp { args: [a, b] }` to nested `CoreApp { args: [a] } applied to b`) or in the type checker (handle multi-arg application by iteratively applying one arg at a time).
**Evidence:**
```
error[VF4021]: Cannot unify functions with different arity: 1 vs 2
  --> <stdin>:2:14
  |
2 | let result = add(2, 3);
  |              ^
```
Note: `add(2)(3)` (curried call syntax) works correctly when the function is defined with multi-params because the parser produces nested `App` nodes each with 1 arg, which matches the curried lambda representation.
**Estimated complexity:** Medium -- The desugarer needs to flatten multi-arg `App` nodes into nested single-arg applications to match the curried lambda representation. Alternatively, the type checker could iteratively apply args.

### RC-4: Zero-argument lambda `() => expr` causes internal error
**Affected tests:** zero-argument lambda (1 test, also masked by RC-1)
**Description:** The desugarer's `curryLambda` function throws an internal error `"Lambda with zero parameters"` when encountering a lambda with no parameters. The parser successfully produces a `Lambda { params: [] }` node, but the desugarer does not handle this case. According to the spec, `() => expr` should be valid and equivalent to a function that takes a Unit argument.
**Evidence:**
```
Internal error: Lambda with zero parameters
```
From `curryLambda.ts` line 33: `throw new Error("Lambda with zero parameters");`
**Estimated complexity:** Small -- The desugarer needs to handle zero-param lambdas, likely by converting them to single-param lambdas taking a Unit/wildcard parameter, e.g., `(_) => expr`.

### RC-5: Lambda pattern destructuring not implemented in type checker
**Affected tests:** lambda with pattern destructuring (1 test, also masked by RC-1)
**Description:** The type checker's `inferLambda` explicitly rejects non-variable patterns in lambda parameters with error `VF4017: Pattern matching in lambda parameters not yet implemented`. The test uses `({ x, y }: { x: Int, y: Int }) => x` which parses correctly but is rejected during type inference.
**Evidence:**
```
error[VF4017]: Pattern matching in lambda parameters not yet implemented
  --> <stdin>:1:12
  |
1 | let getX = ({ x, y }: { x: Int, y: Int }) => x;
  |            ^
```
From `infer-functions.ts` lines 44-48: explicit check rejects non-`CoreVarPattern` params.
**Estimated complexity:** Medium -- Requires desugaring pattern params into a variable param + match expression in the body (e.g., `(p) => match p { | { x, y } => x }`), or adding pattern type inference to `inferLambda`.

## Test-to-Root-Cause Mapping

| Test | RC-1 (String.*) | RC-2 (fromBool) | RC-3 (multi-arg) | RC-4 (zero-arg) | RC-5 (destructuring) |
|------|:---:|:---:|:---:|:---:|:---:|
| named function definition | X | | X | | |
| function with type annotation | X | | | | |
| function with block body | X | | | | |
| automatic currying - partial application | X | | X | | |
| curried call syntax | X | | X | | |
| three-argument currying | X | | X | | |
| recursive function (rec) | X | | | | |
| fibonacci | X | | | | |
| mutually recursive (rec/and) | X | X | | | |
| mutual recursion odd case | X | X | | | |
| function as argument | X | | X | | |
| function as return value | X | | | | |
| lambda with type annotations | X | | | | |
| lambda with pattern destructuring | X | | | | X |
| zero-argument lambda | X | | | X | |
| forward composition | X | | | | |
| backward composition | X | | | | |

## Fix Priority

1. **RC-1** (Module-qualified stdlib resolution) -- Fixes all 17 tests' primary blocker. Most impactful single fix.
2. **RC-3** (Multi-argument call syntax) -- Unblocks 5 tests that would still fail after RC-1.
3. **RC-2** (`String.fromBool` missing) -- Simple addition, unblocks 2 tests.
4. **RC-4** (Zero-argument lambda) -- Small fix, unblocks 1 test.
5. **RC-5** (Lambda pattern destructuring) -- Medium effort, unblocks 1 test.

After fixing RC-1 + RC-2 + RC-3 + RC-4: 16 of 17 tests should pass (all except pattern destructuring).
After fixing all 5: all 17 tests should pass.

## Dependencies

- **RC-1 blocks everything**: No test can pass without module-qualified name resolution working.
- **RC-1 is shared across sections**: The `String.fromInt`/`String.fromBool` issue affects nearly every spec validation test that produces output (sections 02, 03, 04, 05, 07, 11, 12 likely have similar failures).
- **RC-3 affects section 04**: Multi-argument function calls tested in 04-expressions would also fail.
- **RC-4 affects section 04**: Zero-argument lambda also tested in 04-expressions (`no-argument function call`, `lambda with no params`).
- **RC-5 may affect section 05**: Pattern matching in function params relates to pattern matching features.
