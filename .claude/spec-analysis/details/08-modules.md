# Section 08: Modules - Failure Analysis

## Summary
- Total tests: 9
- Passing: 0
- Failing: 9
- Key issues: Two blocking root causes affect all 9 tests: (1) the test code uses single-quoted import paths which the lexer does not support, and (2) the CLI compilation pipeline is single-file only and never invokes the module loader/resolver, so imported bindings are never brought into scope. Even if both were fixed, the typechecker does not populate the type environment from import declarations.

## Root Causes

### RC-1: Single-quote string literals not supported by the lexer
**Affected tests:** All 9 tests
**Description:** Every test file uses single-quoted strings for import paths (e.g., `from './lib'`). The Vibefun lexer only recognizes double-quoted strings (`"..."`). When the lexer encounters a single quote, it throws VF1400 (Unexpected character). This is the first error hit by every test, preventing any further compilation.
**Evidence:**
```
error[VF1400]: Unexpected character: '''
  --> main.vf:1:19
  |
1 | import { x } from './lib';
  |                   ^
```
The lexer in `packages/core/src/lexer/lexer.ts` only dispatches to `readString()` when encountering `"` (line 198). The string parser (`packages/core/src/lexer/string-parser.ts`) only handles double-quoted strings.
**Estimated complexity:** Simple -- this is a test authoring issue. The tests should use double-quoted import paths to match the language's string literal syntax. Alternatively, if the spec intends to support single-quoted strings, the lexer would need a small addition.

### RC-2: CLI pipeline does not support multi-file compilation
**Affected tests:** All 9 tests
**Description:** The CLI `compile` and `run` commands use `compilePipeline()` which processes a single source file through lexer -> parser -> desugarer -> typechecker -> codegen. It never invokes the module loader (`packages/core/src/module-loader/`) or module resolver (`packages/core/src/module-resolver/`). These systems exist and have their own unit tests, but they are not wired into the CLI compilation pipeline. As a result, `import` statements parse correctly (with double quotes) but imported bindings are never resolved or loaded.
**Evidence:**
- `packages/cli/src/commands/compile.ts`: `compilePipeline()` takes a single `source` string and `filename` -- no module resolution step
- `packages/cli/src/commands/run.ts`: calls `compilePipeline()` directly, same single-file path
- Grepping for `loadAndResolveModules` or `module-resolver` or `module-loader` in `packages/cli/src/` returns zero results
- Compiling a file with `import { x } from "./lib"` produces `error[VF4100]: Undefined variable 'x'` because imports are parsed but never resolved
**Estimated complexity:** Large -- requires integrating the existing module loader and resolver into the CLI pipeline. The pieces exist (`loadAndResolveModules` in `packages/core/src/module-resolver/resolver.ts`, `loadModules` in `packages/core/src/module-loader/module-loader.ts`) but the CLI needs a new multi-file compilation flow that: (1) discovers all modules from the entry point, (2) resolves the dependency graph, (3) compiles modules in topological order, and (4) bundles or emits the combined output.

### RC-3: Typechecker does not populate environment from imports
**Affected tests:** All 9 tests (would surface after RC-1 and RC-2 are fixed)
**Description:** Even if imports were resolved and modules loaded, the typechecker's `buildEnvironment()` function (in `packages/core/src/typechecker/environment.ts`) does not process import declarations. It only handles builtins, type definitions, and external declarations. The `CoreImportDecl` case in the typechecker (line 274-277 of `typechecker.ts`) is a no-op comment: "Import declarations are trusted (not verified in this phase)". Imported bindings are never added to the type environment.
**Evidence:**
```typescript
// packages/core/src/typechecker/typechecker.ts, line 274-277
case "CoreImportDecl":
    // Import declarations are trusted (not verified in this phase)
    // Nothing to do here, return unchanged environment
    return env;
```
The `buildEnvironment` function in `environment.ts` does not mention imports at all -- it only processes builtins, type declarations, and external type declarations.
**Estimated complexity:** Medium -- the typechecker needs to receive type information from resolved modules and add imported bindings to the type environment before checking the importing module. This requires a cross-module type checking strategy (either passing pre-computed type environments or doing a multi-pass approach).

### RC-4: Re-export codegen not wired to multi-file output
**Affected tests:** "re-export from another module"
**Description:** While re-export declarations (`export { x } from './inner'`) parse correctly and the codegen has `emitImportDecl` and export emission logic, there is no multi-file compilation flow to actually resolve and include re-exported modules. This is a consequence of RC-2 but adds the additional complexity that re-exports need transitive resolution.
**Evidence:** The parser correctly produces `ReExportDecl` AST nodes. The codegen in `emit-declarations.ts` handles `CoreImportDecl`. However, without multi-file resolution, re-exports cannot function.
**Estimated complexity:** Medium (incremental on top of RC-2) -- once multi-file compilation exists, re-exports need to be handled in the module graph resolution and code generation phases.

## Dependencies

### What these fixes depend on:
- **RC-1 (single quotes)**: Independent fix, either in tests or in the lexer
- **RC-2 (CLI multi-file)**: Depends on the existing module-loader and module-resolver packages being correct and complete
- **RC-3 (typechecker imports)**: Depends on RC-2 being done first (need resolved modules to populate type info)
- **RC-4 (re-exports)**: Depends on RC-2 and RC-3

### What fixing these enables:
- All 9 module tests
- Any future tests involving multi-file programs
- Tests in other sections that might benefit from module imports (stdlib, etc.)
- The practical usability of the language for real projects (multi-file is essential)

### Recommended fix order:
1. Fix RC-1 (change test strings from single to double quotes -- trivial)
2. Implement RC-2 (wire module loader/resolver into CLI pipeline -- large)
3. Implement RC-3 (cross-module type checking -- medium)
4. Handle RC-4 (re-export resolution -- medium, builds on RC-2/RC-3)
