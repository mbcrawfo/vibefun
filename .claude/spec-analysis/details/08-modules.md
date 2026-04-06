# 08 - Modules: Spec Validation Analysis

## Summary

Section 08 tests the Vibefun module system: exports, imports (named, namespace, type), re-exports, module resolution, and initialization semantics. Of 16 tests, 14 fail and 2 pass. The 2 passing tests ("self-import is error" and "import missing module is error") pass for the wrong reason -- they expect compilation errors and get them, but from the lexer rejecting single-quoted strings rather than from actual module-resolution logic.

The failures stem from two independent root causes operating at different pipeline stages:

1. **All 14 failing tests** use single-quoted strings for import paths (e.g., `from './lib'`), but the Vibefun lexer only supports double-quoted strings. This causes an immediate `VF1400: Unexpected character` error at the lexer stage, before any module logic is reached.

2. **Even if the single-quote issue were fixed**, the CLI compilation pipeline (`compilePipeline` in `packages/cli/src/commands/compile.ts`) processes only a single file. There is no integration with the existing `ModuleLoader` class (`packages/core/src/module-loader/module-loader.ts`). Imported symbols are never resolved or added to the type environment, so all cross-file references fail with `VF4100: Undefined variable`.

The module-loader, module-resolver, and module-graph infrastructure exist in `@vibefun/core` with tests and fixtures, but they are never invoked from the CLI.

## Failure Categories

### Category 1: Single-Quoted Strings in Import Paths (Test Fixture Bug)

- **Tests affected:** All 14 failing tests (export let binding, export type definition, export function, named import, namespace import with * as, .vf extension optional in imports, module initializes exactly once, re-export from another module, index.vf resolution for directory imports, type import, mixed type and value import, export wildcard re-export, import with explicit .vf extension, exported external declaration)
- **Root cause:** All test fixtures embed Vibefun source code that uses single-quoted strings for import paths (e.g., `import { x } from './lib'`). The Vibefun lexer (`packages/core/src/lexer/`) only supports double-quoted strings as specified in `docs/spec/02-lexical-structure/tokens.md`. The lexer fails with `VF1400: Unexpected character: '` before any parsing or module logic executes. Notably, the language spec's module section (`docs/spec/08-modules.md`) uses single-quoted strings in all its import examples, creating an inconsistency with the lexical structure spec.
- **Spec reference:** `docs/spec/02-lexical-structure/tokens.md` (String Literals section -- only double-quoted strings), `docs/spec/08-modules.md` (all examples use single quotes)
- **Scope estimate:** Small (1-2 hours) -- fix all test fixtures to use double-quoted strings, OR add single-quote string support to the lexer to match the module spec examples
- **Complexity:** Low
- **Notes:** The 2 passing tests ("self-import is error", "import missing module is error") also use single-quoted import paths but happen to pass because they expect compilation errors. They pass for the wrong reason (lexer failure, not module-resolution error). There is also an inconsistency in the language spec: the lexical structure section defines only double-quoted strings, but the modules section uses single-quoted strings throughout its examples. This should be reconciled.

### Category 2: CLI Lacks Multi-File Compilation Pipeline

- **Tests affected:** All 14 failing tests (same list) -- even after fixing single quotes, these would still fail
- **Root cause:** The CLI's `compilePipeline()` function (`packages/cli/src/commands/compile.ts`) reads and compiles a single source file through the lexer, parser, desugarer, typechecker, and codegen. It does not use the `ModuleLoader` class that exists in `packages/core/src/module-loader/`. The `run` command (`packages/cli/src/commands/run.ts`) has the same limitation. Imported symbols are never resolved -- the typechecker (`packages/core/src/typechecker/typechecker.ts`, line 274) explicitly skips `CoreImportDecl` with a comment "Import declarations are trusted (not verified in this phase)". The type environment builder (`packages/core/src/typechecker/environment.ts`) does not process imports at all, so imported names are undefined in scope.
- **Spec reference:** `docs/spec/08-modules.md` (entire section: imports, exports, module resolution, initialization order)
- **Scope estimate:** XL (3+ days) -- requires integrating the existing module-loader with the CLI pipeline, implementing multi-file typechecking (imported bindings into type environment), multi-file codegen (bundling or separate file emission), and module initialization ordering
- **Complexity:** High
- **Notes:** Significant infrastructure already exists: `ModuleLoader` handles file discovery, path resolution (including `.vf` extension, `index.vf` directory resolution, and path mappings), and caching. `ModuleGraphBuilder` and `CycleDetector` handle dependency analysis. What is missing is the orchestration layer that connects this infrastructure to the compilation pipeline and makes the typechecker and codegen module-aware.

### Category 3: Re-exports Not Supported in Compilation Pipeline

- **Tests affected:** re-export from another module, export wildcard re-export
- **Root cause:** `ReExportDecl` nodes are defined in the surface AST (`packages/core/src/types/ast.ts`, line 325) and parsed by the parser (`packages/core/src/parser/parse-declarations.ts`, `parseReExportDecl`), but the desugarer does NOT handle them. If a `ReExportDecl` reaches the desugarer, it hits the `default` case and throws `"Unknown declaration kind: ReExportDecl"`. There is no `CoreReExportDecl` in the core AST (`packages/core/src/types/core-ast.ts`), and the codegen has no re-export emission logic. The module-resolver (`packages/core/src/module-resolver/resolver.ts`) does recognize `ReExportDecl` for graph building, but this never feeds into the compilation pipeline.
- **Spec reference:** `docs/spec/08-modules.md` (Re-exports section, Re-Export Semantics section)
- **Scope estimate:** Large (1-3 days) -- need to add `CoreReExportDecl` to core AST, handle in desugarer, add codegen emission for named and wildcard re-exports, integrate with multi-file resolution
- **Complexity:** Medium
- **Notes:** This is a sub-problem of Category 2. Re-exports fundamentally require multi-file compilation because they reference other modules. The module-resolver already processes `ReExportDecl` for dependency graph building.

### Category 4: Namespace Imports Not Supported in Codegen

- **Tests affected:** namespace import with * as
- **Root cause:** The parser supports `import * as Name` syntax (`packages/core/src/parser/parse-declarations.ts`, line 762), producing an `ImportItem` with `name: "*"` and an alias. However, the codegen's `emitImportDecl` (`packages/core/src/codegen/es2020/emit-declarations.ts`, line 381) only emits named import syntax (`import { ... } from "..."`), not namespace import syntax (`import * as Name from "..."`). Additionally, accessing namespace members via dot notation (e.g., `Lib.x`) would require the typechecker to understand namespace-typed bindings, which it does not.
- **Spec reference:** `docs/spec/08-modules.md` (Imports section: "Import all as namespace")
- **Scope estimate:** Medium (2-8 hours) -- need codegen support for `import * as` syntax and typechecker support for namespace member access
- **Complexity:** Medium
- **Notes:** This is a sub-problem of Category 2. Namespace imports require understanding the shape (exported members) of the target module, which requires multi-file compilation.

### Category 5: Type-Only and Mixed Imports Not Resolved

- **Tests affected:** type import, mixed type and value import
- **Root cause:** `import type { Color } from './types'` is parsed correctly, and `import { type Color, defaultColor } from './lib'` is also parsed. The desugarer passes them through to `CoreImportDecl` with `isType` flags. The codegen correctly filters out type-only imports (emitting nothing for pure type imports). However, since the multi-file pipeline is missing, the imported type names are never added to the type environment, so type annotations using imported types fail with undefined variable errors.
- **Spec reference:** `docs/spec/08-modules.md` (Imports section: "Import types", "Mixed imports")
- **Scope estimate:** Part of Category 2 (requires multi-file type resolution)
- **Complexity:** Medium
- **Notes:** The parsing and codegen infrastructure for type imports is complete. Only the cross-module type resolution is missing.

### Category 6: Module Resolution Features (Extension, Index Files)

- **Tests affected:** .vf extension optional in imports, import with explicit .vf extension, index.vf resolution for directory imports
- **Root cause:** The `PathResolver` in `packages/core/src/module-loader/path-resolver.ts` implements `.vf` extension resolution and `index.vf` directory resolution. However, since the CLI never invokes the module-loader, these resolution features are never exercised. The compiler simply parses the import path string but never resolves it to a file on disk.
- **Spec reference:** `docs/spec/08-modules.md` (File Extension Rules section, Index file convention section)
- **Scope estimate:** Part of Category 2 (requires CLI integration with module-loader)
- **Complexity:** Low (infrastructure exists)
- **Notes:** The path-resolver has tests and works correctly in isolation. Integration is the only missing piece.

### Category 7: Module Initialization Semantics

- **Tests affected:** module initializes exactly once
- **Root cause:** Module initialization ordering and singleton semantics require the runtime to load and execute modules in dependency order, caching initialized modules. This is fundamentally a multi-file concern. The current single-file pipeline has no concept of module initialization ordering.
- **Spec reference:** `docs/spec/08-modules.md` (Module Initialization Order section, Module Caching section)
- **Scope estimate:** Part of Category 2 (requires multi-file bundling or runtime module system)
- **Complexity:** High
- **Notes:** The generated JS uses ES module syntax (`import`/`export`), so Node.js's native module system would handle initialization ordering if the CLI compiled all files to `.js` and let Node.js run the entry point. This would be simpler than implementing a custom module runtime.

## Dependencies

- **Category 1 (single quotes)** is independent and can be fixed immediately by updating test fixtures.
- **Categories 2-7** all depend on integrating the module-loader with the CLI compilation pipeline. Category 2 is the prerequisite for all others.
- The module-loader (`packages/core/src/module-loader/`) and module-resolver (`packages/core/src/module-resolver/`) infrastructure already exists with path resolution, cycle detection, and dependency graph building. The primary work is:
  1. CLI integration: invoke `ModuleLoader.loadModules()` from the compile/run commands
  2. Multi-file typechecking: resolve imported bindings into the type environment
  3. Multi-file codegen: compile all discovered modules (or bundle them)
  4. Add `ReExportDecl` support to the desugarer and codegen
  5. Add namespace import (`import * as`) support to codegen

## Summary Table

| Category | Tests | Root Cause | Scope | Complexity |
|----------|-------|------------|-------|------------|
| Single-quoted strings in test fixtures | 14 (all failing) | Lexer only supports double-quoted strings; test fixtures use single quotes | Small | Low |
| CLI lacks multi-file pipeline | 14 (all failing) | `compilePipeline()` processes single file; ModuleLoader not integrated | XL | High |
| Re-exports not in compilation pipeline | 2 (re-export, wildcard re-export) | ReExportDecl not handled by desugarer or codegen | Large | Medium |
| Namespace imports not in codegen | 1 (namespace import) | Codegen only emits named imports, not `import * as` | Medium | Medium |
| Type/mixed imports not resolved | 2 (type import, mixed import) | Parsing/codegen done but type env never populated from imports | Part of multi-file | Medium |
| Module resolution features | 3 (extension, index.vf) | PathResolver exists but CLI never calls it | Part of multi-file | Low |
| Module initialization semantics | 1 (init exactly once) | Single-file pipeline has no module ordering concept | Part of multi-file | High |
