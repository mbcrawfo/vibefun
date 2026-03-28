# Section 11: Standard Library - Failure Analysis

## Summary
- Total tests: 20
- Passing: 1 (String concatenation with `&`)
- Failing: 19
- Key issues: The compiler has no module-qualified name resolution. Stdlib functions are registered as flat dotted names (e.g., `"String.fromInt"`) but the parser produces `RecordAccess(Var("String"), "fromInt")`, causing `VF4100: Undefined variable 'String'` for every stdlib call. Secondary issues include missing runtime implementations, missing builtin definitions, argument order mismatches, and test/spec misalignment.

## Root Causes

### RC-1: No Module-Qualified Name Resolution
**Affected tests:** All 19 failing tests
**Description:** The parser parses `String.fromInt(42)` as `App(RecordAccess(Var("String"), "fromInt"), [42])`. The typechecker looks up `"String"` in the value environment but only flat keys like `"String.fromInt"` exist -- there is no `"String"` binding. This produces `VF4100: Undefined variable 'String'` for every `Module.function()` call.

**Evidence:**
```
$ echo 'let x = String.fromInt(42);' | vibefun run -
error[VF4100]: Undefined variable 'String'
```
The AST shows `RecordAccess(Var("String"), "fromInt")` -- the typechecker tries to resolve `Var("String")` first and fails.

**Estimated complexity:** Medium (50-200 lines). Requires either: (A) adding module namespace objects to the value environment, (B) a special resolution pass recognizing `RecordAccess(Var("Module"), "method")` and rewriting to lookup of `"Module.method"`, or (C) parser-level detection of known module prefixes.

### RC-2: Missing Runtime Implementations for Stdlib Functions
**Affected tests:** All 19 (blocked by RC-1, but would fail at runtime even if RC-1 were fixed)
**Description:** The codegen has no JavaScript implementations for any stdlib function. `runtime-helpers.ts` only contains `ref()` and `$eq()`. The stdlib package (`packages/stdlib/src/index.ts`) is a placeholder. Each of the ~46 builtin functions needs a JS implementation working with the compiler's internal representation (e.g., lists as `{$tag: "Cons", $0: value, $1: rest}`).
**Evidence:** `runtime-helpers.ts` only has `ref()` and `$eq()` helpers
**Estimated complexity:** Large (200+ lines). ~46 functions need JS implementations, either as runtime helpers, inline codegen, or an imported runtime library.

### RC-3: Missing Builtin Type Definitions
**Affected tests:** String.fromBool, Float.fromInt, Int.fromFloat
**Description:** Tests reference functions absent from both builtins and spec:
- `String.fromBool` -- not in builtins or spec
- `Float.fromInt` -- spec uses `Int.toFloat` instead
- `Int.fromFloat` -- spec uses `Float.toInt` instead
**Evidence:** Functions not found in builtins.ts or spec docs
**Estimated complexity:** Simple (1-2 lines). Either add aliases in builtins and spec, or fix the tests to use spec-correct names.

### RC-4: Argument Order Mismatch Between Spec and Builtins
**Affected tests:** List.map, List.filter, List.fold
**Description:** Spec defines data-first order (`List.map(list, fn)`), but builtins.ts uses function-first (`List.map(fn, list)`). Tests follow the spec.
**Evidence:**
- builtins.ts: `List.map: ((T) -> U, List<T>) -> List<U>` (fn first)
- spec: `List.map: <A, B>(List<A>, (A) -> B) -> List<B>` (list first)
- tests: `List.map(xs, (x: Int) => x * 2)` (list first)
**Estimated complexity:** Simple (1-2 lines per function). Update builtins.ts to match the spec's data-first argument order.

### RC-5: Test/Spec Misalignment on List.head Return Type
**Affected tests:** List.map, List.head, List.filter, List.reverse (tests that use `List.head` for output)
**Description:** Tests use `List.head(xs)` as if it returns `T` directly (e.g., `String.fromInt(List.head(doubled))`), but both spec and builtins define `List.head: (List<T>) -> Option<T>`. Tests need to unwrap the Option.
**Evidence:** Test code calls `List.head(xs)` without Option unwrapping
**Estimated complexity:** Simple. Fix test assertions to unwrap the Option.

## Dependencies
- **RC-1** (module resolution) is the primary blocker -- all 19 failures stem from it
- **RC-2** (runtime implementations) is the secondary blocker
- RC-3, RC-4, RC-5 are alignment issues
- Fixing RC-1 + RC-2 would also unblock tests in **other sections** that use `String.fromInt()` / `String.fromFloat()` in their `withOutput` helper for output assertions (affects sections 02, 03, 04, 05, 06, 07, 09, 10, 12)
