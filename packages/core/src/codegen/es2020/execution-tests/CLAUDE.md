# Execution Tests for ES2020 Codegen

Runtime-semantics validation for the ES2020 generator. Compiles Vibefun sources through the **full pipeline** (lexer → parser → desugarer → typechecker → codegen) and runs the output in Node's `vm` sandbox.

## Why This Looks Heavy

Every test recompiles from source. That's deliberate — these tests exist to catch semantics regressions that only surface when every phase runs together. If you want to test a single emission function in isolation, write a unit test next to the source file instead.

## VM Sandboxing Is Not Optional

`compileAndRun` creates a `vm.createContext({ ... })` with an explicit globals list (`Math`, `Array`, `Object`, `String`, `Number`, `Boolean`, `JSON`, `Error`, `Map`, `Set`, `RegExp`, `Infinity`, `NaN`, `undefined`, `console`). If generated code relies on a global that isn't in the context, the test fails with a ReferenceError. When you add a new codegen feature that needs another global, update this list and add a test for it.

## Export Stripping

`vm.runInContext` does **not** understand ES module `export { ... }` syntax. `stripExports` removes the trailing `export { … };` line before running. If the generator ever emits a different export syntax (e.g., default exports, multiple lines), update the regex in `stripExports` or the tests will silently fail.

## Shared Helpers

`execution-test-helpers.ts` exposes `compileAndRun`, `compileAndGetExport`, `compileAndRunSucceeds`, and `compileToJs`. Reuse these — don't inline the pipeline or the VM setup in individual test files.

## Maintenance

If the global list in `compileAndRun`, the `stripExports` regex, or the helper names change, update the corresponding section above.
