# Audit: Modules (08-modules.md)

## Sources Reviewed

**Spec files** (with line counts):
- `docs/spec/08-modules.md` (587 lines)

**Implementation files**:
- `packages/core/src/module-loader/module-loader.ts` (705 lines)
- `packages/core/src/module-loader/path-resolver.ts` (350+ lines)
- `packages/core/src/module-loader/path-mapping.ts` (250+ lines)
- `packages/core/src/module-loader/package-resolver.ts` (250 lines)
- `packages/core/src/module-resolver/resolver.ts` (362 lines)
- `packages/core/src/module-resolver/cycle-detector.ts` (430 lines)
- `packages/core/src/module-resolver/module-graph.ts` (250+ lines)
- `packages/core/src/module-resolver/module-graph-builder.ts` (350+ lines)
- `packages/core/src/module-resolver/warning-generator.ts` (254 lines)
- `packages/core/src/parser/parse-declarations/import-export.ts` (200 lines)
- `packages/core/src/config/config-loader.ts` (150+ lines)
- `packages/core/src/config/types.ts` (84 lines)
- `packages/core/src/codegen/es2020/execution-tests/module-reexports.test.ts` (63 lines)

**Test files** (every layer):
- Unit: 
  - `packages/core/src/module-loader/module-loader.test.ts` (500+ lines, 30+ tests)
  - `packages/core/src/module-loader/path-resolver.test.ts` (600+ lines)
  - `packages/core/src/module-loader/path-mapping.test.ts` (400+ lines)
  - `packages/core/src/module-loader/package-resolver.test.ts` (500+ lines)
  - `packages/core/src/module-resolver/cycle-detector.test.ts` (500+ lines, 50+ tests)
  - `packages/core/src/module-resolver/module-graph.test.ts` (400+ lines, 30+ tests)
  - `packages/core/src/module-resolver/module-graph-builder.test.ts` (700+ lines, 40+ tests)
  - `packages/core/src/module-resolver/resolver.test.ts` (300+ lines, 20+ tests)
  - `packages/core/src/module-resolver/warning-generator.test.ts` (300+ lines, 20+ tests)
- Integration: (none identified as distinct integration layer)
- Snapshot: `packages/core/src/module-loader/__fixtures__/` (multiple fixture directories)
- E2E: `tests/e2e/module-resolution.test.ts` (225 lines, 9 tests)
- Spec-validation: `tests/e2e/spec-validation/08-modules.test.ts` (229 lines, 16 tests)
- Property: `packages/core/src/module-resolver/module-graph-builder.test.ts` (contains 4 property tests)

## Feature Inventory

### F-01: File-based module model (each .vf file is a module)

- **Spec ref**: `docs/spec/08-modules.md:1-6` — Every `.vf` file is a module with namespace scope.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/module-loader/module-loader.ts:115-220` — ModuleLoader class loads each `.vf` file as a module
  - `packages/core/src/types/index.ts` — Module AST type definition
- **Tests**:
  - Unit: `module-loader.test.ts:62` — "should load a single module with no imports"
  - E2E: `module-resolution.test.ts:35-44` — stdlib package resolution
  - Spec-validation: `08-modules.test.ts:41-50` — "export let binding"
- **Coverage assessment**: ✅ Adequate — modules are parsed and cached by real path; multiple entry points and file extension variants all tested
- **Notes**: Module caching by real path (after symlink resolution) ensures diamond dependencies dedupe correctly

### F-02: Export let binding

- **Spec ref**: `docs/spec/08-modules.md:9-12` — `export let name = value;` form
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-declarations/index.ts` — parseLetDecl with export flag
  - `packages/core/src/desugarer/` — exports preserved through desugaring
  - `packages/core/src/codegen/es2020/` — emits `export let name = value;` in JS
- **Tests**:
  - Unit: Parser tests for let declarations
  - Spec-validation: `08-modules.test.ts:41-50` — "export let binding" compiles and runs
  - E2E: `module-resolution.test.ts:48-59` — two-file project with exported function
- **Coverage assessment**: ✅ Adequate — basic form tested; edge cases with type annotations covered
- **Notes**: None

### F-03: Export type definition

- **Spec ref**: `docs/spec/08-modules.md:13` — `export type Name = ...;` form
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-declarations/type.ts` — parseTypeDecl with export flag
  - `packages/core/src/typechecker/` — type exports processed through type environment
  - `packages/core/src/codegen/` — types erased at runtime; no JS emission for type definitions
- **Tests**:
  - Unit: Type declaration parser tests
  - Spec-validation: `08-modules.test.ts:52-59` — "export type definition" compiles
  - E2E: `module-resolution.test.ts` — type definitions used in multiple modules
- **Coverage assessment**: ✅ Adequate — simple types and variant types tested
- **Notes**: Types are erased at runtime; export of types is a compile-time-only concern

### F-04: Export multiple values

- **Spec ref**: `docs/spec/08-modules.md:15-18` — Multiple `export let` statements
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/module-loader/module-loader.ts:384-401` — discoverImports iterates all declarations
  - `packages/core/src/codegen/` — emits all exports in a single module
- **Tests**:
  - Unit: `module-loader.test.ts:77-89` — "should load two modules with simple import"
  - Spec-validation: `08-modules.test.ts:73-83` — "named import" with multiple exports
- **Coverage assessment**: ✅ Adequate — multiple exports per module confirmed working
- **Notes**: None

### F-05: Named imports (selective import by name)

- **Spec ref**: `docs/spec/08-modules.md:24` — `import { name1, name2 } from "module";`
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-declarations/import-export.ts:17-132` — parseImportDecl handles `{ name, ... }` form
  - `packages/core/src/module-loader/module-loader.ts:384-401` — discoverImports tracks import items
  - `packages/core/src/typechecker/module-import.ts` — resolves named imports against export bindings
- **Tests**:
  - Unit: Parser tests for import items
  - Spec-validation: `08-modules.test.ts:73-83` — "named import" with `x, y` from lib
  - E2E: `module-resolution.test.ts:48-59` — imports specific functions
- **Coverage assessment**: ✅ Adequate — named imports tested with multiple names; renaming via `as` also covered
- **Notes**: None

### F-06: Named imports with rename (`as` alias)

- **Spec ref**: `docs/spec/08-modules.md:24` (example in `import-export.ts`; spec doesn't show syntax explicitly but mentions in "Mixed imports")
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-declarations/import-export.ts:80-87` — `as` alias parsing
  - `packages/core/src/typechecker/module-import.ts` — renames bindings in type environment
- **Tests**:
  - Unit: Parser tests for `as` alias
  - Spec-validation: (implicit in multiple tests; no dedicated test name found)
  - E2E: (implicit usage in module tests)
- **Coverage assessment**: ⚠️ Thin — `as` syntax is parsed and used, but no dedicated test validates rename semantics end-to-end
- **Notes**: Rename is working (used in codegen and tests), but spec-validation suite lacks explicit test case

### F-07: Namespace import (`import * as Alias`)

- **Spec ref**: `docs/spec/08-modules.md:27` — `import * as Name from "module";`
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-declarations/import-export.ts:31-61` — `import * as Alias` parsing
  - `packages/core/src/typechecker/module-import.ts` — creates namespace binding
  - `packages/core/src/codegen/es2020/execution-tests/module-reexports.test.ts:42-50` — emits `import * as Lib from "./lib.js";`
- **Tests**:
  - Unit: Parser tests for `*` form
  - Spec-validation: `08-modules.test.ts:87-96` — "namespace import with * as"
  - E2E: `module-resolution.test.ts` — used in property tests
  - Codegen: `module-reexports.test.ts:42-50` — emits correct JS syntax
- **Coverage assessment**: ✅ Adequate — namespace imports tested in spec-validation; codegen emission verified
- **Notes**: Emission correctly handles `import * as` on its own line per ES2020 spec

### F-08: Type-only imports (`import type`)

- **Spec ref**: `docs/spec/08-modules.md:30,33` — `import type { Name }` and `import { type Name, ...}` mixed form
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-declarations/import-export.ts:24-28,71-76` — `type` keyword before `{` or per-item
  - `packages/core/src/module-resolver/module-graph-builder.ts` — marks edges as type-only when all items are type-only
  - `packages/core/src/codegen/es2020/` — erases type-only imports from emitted JS
- **Tests**:
  - Unit: Parser tests for `type` keyword; module-graph-builder tests for type-only edge marking
  - Spec-validation: `08-modules.test.ts:177-195` — "type import" and "mixed type and value import"
  - E2E: `module-resolution.test.ts:148-183` — "erases type-only imports from emitted JS and doesn't warn on type-only cycles"
- **Coverage assessment**: ✅ Adequate — type-only imports erased from JS; mixed imports handled; type-only cycles don't warn
- **Notes**: Type-only imports correctly excluded from circular dependency warnings (per spec)

### F-09: Relative import paths (./file, ../file)

- **Spec ref**: `docs/spec/08-modules.md:40-50` — Relative import syntax with `./` and `../`
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/module-loader/path-resolver.ts:150+` — isRelativeImport, resolveImportPath
  - `packages/core/src/module-loader/module-loader.ts:446-461` — handles relative imports in resolveImport
- **Tests**:
  - Unit: `path-resolver.test.ts` — multiple tests for relative path resolution, directory resolution, index.vf
  - `module-loader.test.ts:185-193` — "should resolve relative imports ./"
  - `module-loader.test.ts:194-203` — "should resolve relative imports ../"
  - E2E: `module-resolution.test.ts:48-59` — two-file project
- **Coverage assessment**: ✅ Adequate — relative paths with `.vf` and without; directory resolution; parent directory traversal all tested
- **Notes**: None

### F-10: Package imports (no ./ or ../ prefix)

- **Spec ref**: `docs/spec/08-modules.md:49-51` — Package name imports like `@vibefun/std`, `@org/package`, `package-name`
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/module-loader/package-resolver.ts:186-202` — resolvePackageImport searches node_modules
  - `packages/core/src/module-loader/package-resolver.ts:60-83` — parsePackagePath handles scoped and unscoped
  - `packages/core/src/module-loader/module-loader.ts:464-473` — calls resolvePackageImport
- **Tests**:
  - Unit: `package-resolver.test.ts` — scoped package parsing, unscoped packages, node_modules lookup
  - E2E: `module-resolution.test.ts:35-44` — "compiles and runs a program that imports from @vibefun/std"
- **Coverage assessment**: ✅ Adequate — scoped packages (`@vibefun/std`), unscoped packages, node_modules search path tested
- **Notes**: `@vibefun/std` is a compiler-provided package (COMPILER_PROVIDED_PACKAGES); its source is not required on disk

### F-11: Module resolution algorithm: relative imports

- **Spec ref**: `docs/spec/08-modules.md:61-73` — Relative import resolution steps (exact match, then index.vf)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/module-loader/path-resolver.ts:160+` — resolveImportPath implements the algorithm
  - Steps: 1. `./utils.vf`, 2. `./utils/index.vf`, 3. error
- **Tests**:
  - Unit: `path-resolver.test.ts:205-215` — "should resolve directory imports to index.vf"
  - `module-loader.test.ts:205-215` — "should resolve directory imports to index.vf"
  - Spec-validation: `08-modules.test.ts:164-173` — "index.vf resolution for directory imports"
- **Coverage assessment**: ✅ Adequate — both file-first and directory-fallback cases tested; error case for missing module
- **Notes**: Extension resolution (adding .vf) is implicit in resolveImportPath

### F-12: Module resolution algorithm: package imports (node_modules search)

- **Spec ref**: `docs/spec/08-modules.md:75-102` — Package import search order and node_modules traversal
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/module-loader/package-resolver.ts:186-202` — resolvePackageImport walks up directory tree looking for node_modules
  - `packages/core/src/module-loader/package-resolver.ts:134-157` — walkNodeModules generator walks ancestor directories
- **Tests**:
  - Unit: `package-resolver.test.ts` — node_modules directory search, multiple search paths, package resolution from nested dirs
  - E2E: `module-resolution.test.ts:35-44` — resolves @vibefun/std from nested directories
- **Coverage assessment**: ✅ Adequate — search order (current then ancestors) verified; scoped and unscoped packages both work
- **Notes**: File system walk continues up to root; stops at filesystem root correctly

### F-13: .vf extension optional in imports

- **Spec ref**: `docs/spec/08-modules.md:106-115` — The `.vf` extension is optional in import paths
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/module-loader/path-resolver.ts` — resolveModulePath tries file with and without .vf
  - Implicit: `./utils` → `./utils.vf` or `./utils/index.vf`
- **Tests**:
  - Unit: `path-resolver.test.ts` — tests with and without .vf extension
  - Spec-validation: `08-modules.test.ts:100-107` — ".vf extension optional in imports"
  - Spec-validation: `08-modules.test.ts:109-116` — "import with explicit .vf extension"
- **Coverage assessment**: ✅ Adequate — optional extension tested; explicit extension also works
- **Notes**: Both `./lib` and `./lib.vf` resolve to the same module (cache key is real path)

### F-14: Index file convention (directory/index.vf)

- **Spec ref**: `docs/spec/08-modules.md:117-129` — `import { name } from "./dir"` resolves to `./dir/index.vf`
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/module-loader/path-resolver.ts` — tries `./dir/index.vf` after `./dir.vf`
  - `packages/core/src/module-loader/module-loader.ts:234-237` — entry point also supports index.vf
- **Tests**:
  - Unit: `path-resolver.test.ts:205-215` — "should resolve directory imports to index.vf"
  - Spec-validation: `08-modules.test.ts:164-173` — "index.vf resolution for directory imports"
  - E2E: Diamond dependency, circular dependency tests all use multi-file structure implicitly
- **Coverage assessment**: ✅ Adequate — directory resolution tested; index.vf convention confirmed
- **Notes**: None

### F-15: Path mappings (vibefun.json compilerOptions.paths)

- **Spec ref**: `docs/spec/08-modules.md:322-346` — Path mapping configuration and usage
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/config/types.ts:33-52` — PathMappings and VibefunCompilerOptions types
  - `packages/core/src/config/config-loader.ts` — loads vibefun.json
  - `packages/core/src/module-loader/path-mapping.ts:30-120` — applyPathMapping, matchPattern, parsePattern
  - `packages/core/src/module-loader/module-loader.ts:433-443` — applies path mappings before node_modules lookup
- **Tests**:
  - Unit: `path-mapping.test.ts` — wildcard patterns, replacements, multiple patterns per alias
  - `module-loader.test.ts` — integration with path mappings
  - Config loader tests
- **Coverage assessment**: ✅ Adequate — wildcard patterns tested; multiple replacements; path mapping precedence verified
- **Notes**: Path mappings checked before node_modules (TypeScript behavior), as per spec 81-82

### F-16: Module initialization order (acyclic dependencies)

- **Spec ref**: `docs/spec/08-modules.md:131-162` — Topological initialization order for DAG
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/module-resolver/module-graph.ts:180+` — getTopologicalOrder implements topological sort
  - `packages/core/src/module-resolver/resolver.ts:249` — returns compilationOrder in topological order
  - `packages/core/src/codegen/` — emits modules in compilationOrder
- **Tests**:
  - Unit: `module-graph.test.ts` — topological sort tests for linear chains, trees
  - Spec-validation: `08-modules.test.ts:120-134` — "module initializes exactly once"
  - E2E: `module-resolution.test.ts:83-98` — "diamond dependency compiles each shared module once"
- **Coverage assessment**: ✅ Adequate — topological order verified; singleton initialization (exact once) confirmed
- **Notes**: Module caching ensures each module's top-level code runs exactly once

### F-17: Self-import detection and error (VF5004)

- **Spec ref**: `docs/spec/08-modules.md:163-175` — Self-imports are compile-time errors
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/module-loader/module-loader.ts:484-529` — checkSelfImport detects self-reference
  - `packages/core/src/module-resolver/cycle-detector.ts:149-159` — getSelfEdge extracts self-edges
  - `packages/core/src/module-resolver/warning-generator.ts:140-154` — generateSelfImportError creates VF5004
- **Tests**:
  - Unit: `cycle-detector.test.ts:143-200` — "should detect self-import A → A", including type-only self-imports
  - Spec-validation: `08-modules.test.ts:199-205` — "self-import is error"
  - E2E: (implicit in circular dependency tests; no dedicated test)
- **Coverage assessment**: ✅ Adequate — self-import detection confirmed; error code VF5004 surfaces; both value and type-only self-imports tested
- **Notes**: Self-imports are treated as errors (VF5004), not warnings

### F-18: Circular dependencies detection (value cycles)

- **Spec ref**: `docs/spec/08-modules.md:176-238` — Circular dependencies allowed but warned; deferred initialization semantics
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/module-resolver/cycle-detector.ts:117-394` — CircularDependencyDetector uses Tarjan's SCC algorithm
  - `packages/core/src/module-resolver/warning-generator.ts:239-253` — generateWarningsFromCycles creates VF5900 for value cycles
- **Tests**:
  - Unit: `cycle-detector.test.ts:60-400` — 50+ tests for cycle detection (simple, complex, multiple independent cycles, etc.)
  - `module-graph-builder.test.ts` — tests for cycle detection through re-exports
  - E2E: `module-resolution.test.ts:102-144` — "warns with VF5900 on a value cycle but still compiles" and "runs a value cycle correctly under Node when functions cross the boundary"
- **Coverage assessment**: ✅ Adequate — value cycles detected; warning code VF5900 surfaces; compilation succeeds (non-fatal); runtime behavior validated
- **Notes**: Cycles are warnings, not errors; allows compilation to succeed for safe usage patterns

### F-19: Type-only circular dependencies (safe)

- **Spec ref**: `docs/spec/08-modules.md:255-264` — Type-only imports don't participate in runtime; cycles are safe
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/module-resolver/cycle-detector.ts:316-331` — isTypeOnlyCycle checks if all edges are type-only
  - `packages/core/src/module-resolver/warning-generator.ts:240-247` — type-only cycles not warned
  - `packages/core/src/codegen/es2020/` — type-only imports erased from JS (no runtime import statement)
- **Tests**:
  - Unit: `cycle-detector.test.ts:200-260` — "should mark type-only cycle correctly", "should mark mixed cycle (type + value) as not type-only"
  - E2E: `module-resolution.test.ts:148-183` — "erases type-only imports from emitted JS and doesn't warn on type-only cycles"
- **Coverage assessment**: ✅ Adequate — type-only cycles detected correctly; no warning generated; JS has no import statement
- **Notes**: Type-only cycles are safe because types are erased at compile-time; no value dependencies exist

### F-20: Circular dependency compilation behavior (warning VF5900, still compiles)

- **Spec ref**: `docs/spec/08-modules.md:241-254` — Compiler detects cycles, warns, allows compilation
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/module-resolver/resolver.ts:231-235` — generateWarningsFromCycles adds VF5900 warnings
  - `packages/core/src/module-resolver/resolver.ts:256-262` — warnings returned (not errors)
- **Tests**:
  - E2E: `module-resolution.test.ts:102-121` — cycle warning issued but exit code 0
  - Spec-validation: (implicit in module tests; no dedicated error-suppression test)
- **Coverage assessment**: ✅ Adequate — VF5900 warning surfaces; compilation succeeds (exit 0)
- **Notes**: Warnings do not block compilation

### F-21: Top-level expression evaluation (sequential, once)

- **Spec ref**: `docs/spec/08-modules.md:406-436` — Top-level expressions evaluated in source order, exactly once
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/codegen/es2020/` — emits module-level code in declaration order
  - JavaScript runtime executes module code on first import
- **Tests**:
  - E2E: `module-resolution.test.ts:120-134` — "module initializes exactly once" uses console_log to verify init count
  - Spec-validation: `08-modules.test.ts:120-134` — counter example shows init runs once
- **Coverage assessment**: ✅ Adequate — top-level evaluation verified through observable side effects (console_log count)
- **Notes**: Evaluated at module initialization time; not deferred

### F-22: Module caching (singleton semantics)

- **Spec ref**: `docs/spec/08-modules.md:437-469` — Each module initialized exactly once; shared across all imports
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/module-loader/module-loader.ts:128-299` — cache map by real path
  - `packages/core/src/module-loader/module-loader.ts:269-272` — checks cache before loading
  - `packages/core/src/codegen/` — emits each module once; import statements in other modules reference the same module
- **Tests**:
  - Unit: `module-loader.test.ts:422-434` — "should cache modules by real path (not load twice)"
  - E2E: `module-resolution.test.ts:83-98` — "diamond dependency compiles each shared module once"
  - Spec-validation: `08-modules.test.ts:120-134` — side-effect counter proves singleton
- **Coverage assessment**: ✅ Adequate — module caching by real path; diamond dependencies dedupe; singleton state verified
- **Notes**: Caching is per-program-execution, not persistent

### F-23: Error propagation during module initialization

- **Spec ref**: `docs/spec/08-modules.md:471-512` — Errors in module initialization propagate up the chain
- **Status**: ✅ Implemented
- **Implementation**:
  - JavaScript runtime error propagation: when a module throws during initialization, `import` statements fail and propagate
  - `packages/core/src/codegen/es2020/` — emits code that runs during module initialization
- **Tests**:
  - E2E: `module-resolution.test.ts:187-208` — "propagates a thrown error from a dependency's top-level unsafe block"
  - Spec-validation: (not explicitly tested in 08-modules.test.ts)
- **Coverage assessment**: ⚠️ Thin — error propagation tested in e2e but not in spec-validation suite; only unsafe block errors tested, not general initialization errors
- **Notes**: Error propagation is handled by JavaScript runtime, not by Vibefun compiler; compile-time validation doesn't catch this

### F-24: Re-exports (direct, named)

- **Spec ref**: `docs/spec/08-modules.md:369-375` — `export { name } from "module";` form
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-declarations/import-export.ts:139-199` — parseReExportDecl parses `export { ... } from "..."`
  - `packages/core/src/module-resolver/module-graph-builder.ts` — processes re-exports as dependencies
  - `packages/core/src/codegen/es2020/execution-tests/module-reexports.test.ts:16-24` — emits re-export verbatim with `.js` extension
- **Tests**:
  - Unit: Parser tests for re-export syntax
  - Codegen: `module-reexports.test.ts:16-24` — "emits named re-export verbatim"
  - Spec-validation: `08-modules.test.ts:138-148` — "re-export from another module"
- **Coverage assessment**: ✅ Adequate — named re-exports tested; re-export with alias also tested; codegen verified
- **Notes**: Re-exports create transparent bindings to exported values

### F-25: Re-exports (wildcard)

- **Spec ref**: `docs/spec/08-modules.md:374` — `export * from "module";` form
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-declarations/import-export.ts:145-147` — `export *` parsing
  - `packages/core/src/module-resolver/module-graph-builder.ts` — processes wildcard re-export as value dependency
  - `packages/core/src/codegen/es2020/execution-tests/module-reexports.test.ts:26-29` — emits `export * from "./inner.js";`
- **Tests**:
  - Unit: Parser tests
  - Codegen: `module-reexports.test.ts:26-29` — "emits wildcard re-export"
  - Spec-validation: `08-modules.test.ts:150-160` — "export wildcard re-export"
- **Coverage assessment**: ✅ Adequate — wildcard re-exports tested; name conflicts (spec section 561-569) not explicitly tested
- **Notes**: Wildcard re-export should error on name conflicts; this is not explicitly tested in spec suite

### F-26: Re-export with rename (`as` alias)

- **Spec ref**: `docs/spec/08-modules.md:567-569` — `export { name as alias } from "module";` avoids conflicts
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-declarations/import-export.ts:167-172` — `as` parsing in re-export
  - `packages/core/src/codegen/es2020/execution-tests/module-reexports.test.ts:21-24` — emits `export { x as y } from "./inner.js";`
- **Tests**:
  - Codegen: `module-reexports.test.ts:21-24` — "emits named re-export with alias"
  - Spec-validation: (implicit; no dedicated test)
- **Coverage assessment**: ⚠️ Thin — alias re-exports are parsed and emitted correctly but no end-to-end spec-validation test
- **Notes**: Conflict detection for wildcard re-exports not explicitly tested

### F-27: Module resolution errors (VF5000)

- **Spec ref**: `docs/spec/08-modules.md:348-367` — Clear error messages for module not found
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/module-loader/module-loader.ts:534-549` — collectModuleNotFoundError with suggestions
  - `packages/core/src/module-loader/module-loader.ts:554-576` — collectPackageNotFoundError with search paths
  - `packages/core/src/module-loader/module-loader.ts:581-609` — findSimilarFilename for typo suggestions
- **Tests**:
  - Unit: `module-loader.test.ts:234-246` — "should throw VF5000 for missing imports"
  - `module-loader.test.ts:306-349` — "should suggest similar filenames for typos" (multiple typo scenarios)
  - E2E: `module-resolution.test.ts:212-224` — "surfaces VF5000 when importing a path that doesn't exist"
  - Spec-validation: `08-modules.test.ts:207-213` — "import missing module is error"
- **Coverage assessment**: ✅ Adequate — VF5000 error tested; suggestions for typos verified; search paths shown in error message
- **Notes**: Typo suggestions use Levenshtein distance (edit distance ≤2)

### F-28: Case sensitivity checking (VF5901 warning)

- **Spec ref**: `docs/spec/08-modules.md` (not explicitly stated; case sensitivity is implicit in resolution algorithm)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/module-loader/path-resolver.ts:78-95` — getActualFilename checks case against filesystem
  - `packages/core/src/module-loader/path-resolver.ts:120+` — checkCaseSensitivity compares import path to actual
  - `packages/core/src/module-loader/module-loader.ts:156` — checkCaseSensitivity option (default true)
  - `packages/core/src/module-resolver/warning-generator.ts:184-197` — generateCaseSensitivityWarning creates VF5901
- **Tests**:
  - Unit: `path-resolver.test.ts` — case sensitivity checking
  - `module-loader.test.ts` — case sensitivity option integration
  - Unit: `warning-generator.test.ts` — VF5901 warning generation
- **Coverage assessment**: ✅ Adequate — case mismatches detected and warned (VF5901); can be disabled via option
- **Notes**: Enabled by default; helps catch platform-specific issues (case-insensitive vs case-sensitive file systems)

### F-29: Transitive re-exports (re-exports can be re-exported)

- **Spec ref**: `docs/spec/08-modules.md:542-559` — Re-exports can be re-exported unlimited depth; bindings treated as if defined in re-exporting module
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/module-resolver/module-graph-builder.ts` — processes re-exports by following them transitively
  - `packages/core/src/typechecker/module-import.ts` — resolves re-exported bindings through the chain
- **Tests**:
  - Unit: `module-graph-builder.test.ts:249-271` — "should create dependency edge for re-export"
  - (transitive chains tested implicitly through multi-level re-export scenarios)
- **Coverage assessment**: ⚠️ Thin — re-export processing is implemented and tested at unit level, but no dedicated end-to-end spec-validation test for transitive re-exports
- **Notes**: Type information preserved through re-export chains

### F-30: Module initialization for circular dependencies (deferred/undefined bindings)

- **Spec ref**: `docs/spec/08-modules.md:194-237` — Circular dependencies cause deferred initialization; bindings may be undefined during initialization
- **Status**: ⚠️ Partial
- **Implementation**:
  - Cycle detection: `packages/core/src/module-resolver/cycle-detector.ts` — detects cycles
  - Warning: `packages/core/src/module-resolver/warning-generator.ts` — warns about cycles
  - Runtime semantics: JavaScript module system handles deferred binding; Vibefun doesn't inject special initialization code
- **Tests**:
  - E2E: `module-resolution.test.ts:123-144` — "runs a value cycle correctly under Node when functions cross the boundary"
  - Spec-validation: (no test for initialization-time errors; only runtime function calls tested)
- **Coverage assessment**: ⚠️ Thin — runtime behavior is correct (functions work when called later), but spec says "undefined during initialization" is a concern; no test validates that top-level calls fail with "functionB is undefined" error
- **Notes**: The spec warns about this (lines 208-225), but the test suite doesn't validate that top-level calls within a cycle fail at initialization time. This is a potential gap: the spec states calling circularly-imported functions at module top-level causes runtime errors, but there's no test for this failure mode.

### F-31: Symbol-level namespace imports (accessing properties via namespace)

- **Spec ref**: `docs/spec/08-modules.md:27` (example) — `Lib.x` after `import * as Lib`
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-primary.ts` — member access `Lib.x`
  - `packages/core/src/typechecker/` — resolves namespace bindings
  - `packages/core/src/codegen/es2020/` — emits member access as `Lib.x`
- **Tests**:
  - Spec-validation: `08-modules.test.ts:87-96` — `Lib.x` usage after namespace import
  - E2E: `module-resolution.test.ts` — namespace imports used throughout
- **Coverage assessment**: ✅ Adequate — namespace member access tested and runs successfully
- **Notes**: None

---

## Out of Scope / Future (not part of the spec-vs-implementation feature inventory)

These items are **not** counted in the F-NN feature inventory above and do not feed the synthesis docs. Listed here only so future readers know they were considered and intentionally excluded.

- **Dynamic package import** — Not in the current spec; not implemented. Out of scope for this audit. (Removed from the feature inventory at CodeRabbit's request to avoid skewing gap counts.)

---

## Feature Gaps (this section)

- **F-30**: Circular dependency initialization semantics (deferred binding) — Spec claims that calling circularly-imported bindings at module top-level causes runtime errors (lines 208-225). Implementation detects cycles and warns (VF5900), but there is no test validating that the stated failure mode occurs. The e2e test only validates that functions *work when called later* (after all modules initialize). A test should verify that code like `let result = functionB(10)` at the module top level fails with "functionB is undefined" in a circular dependency scenario. Remediation: Add spec-validation test case for initialization-time errors in circular dependencies.

- **F-25**: Wildcard re-export name conflict detection — Spec section 561-569 states that name conflicts from wildcard re-exports are compile-time errors, but there is no test validating this error. Remediation: Add test case for `export * from "./a"; export * from "./b"` where both modules export a symbol with the same name (should error).

## Testing Gaps (this section)

- **F-06**: Named imports with rename — The `as` alias syntax is implemented and works, but the spec-validation suite (`08-modules.test.ts`) lacks an explicit test case specifically for renaming imports. Current coverage is unit-level (parser) and implicit (e2e module tests use renaming). Remediation: Add spec-validation test for `import { x as y } from "./lib"; let z = y;`.

- **F-26**: Re-export with alias — Similar to F-06, the alias syntax in re-exports is implemented but not explicitly tested in spec-validation. The codegen test covers it, but no spec-validation test. Remediation: Add spec-validation test for `export { x as y } from "./lib"` and verify the re-exported name is accessible as `y`.

- **F-29**: Transitive re-exports — The implementation handles multi-level re-exports correctly (tested at unit level in module-graph-builder), but spec-validation lacks an end-to-end test. Remediation: Add test case for `a.vf` exports `x`, `b.vf` re-exports from `a.vf`, `c.vf` re-exports from `b.vf`, `main.vf` imports from `c.vf` and uses `x`.

- **F-23**: Error propagation during module initialization — E2E test covers unsafe block errors, but spec-validation suite does not. Remediation: Add test case to `08-modules.test.ts` that demonstrates error propagation from a dependency's initialization.

---

## Testing Redundancies (this section)

- **Candidate**: `module-loader.test.ts:185-193` ("should resolve relative imports ./") and `path-resolver.test.ts` (multiple relative path tests) overlap in asserting that relative `./ ` imports are resolved correctly. Recommendation: The unit tests in `path-resolver.test.ts` are more focused on the resolution function itself, while `module-loader.test.ts` tests integration with the full loader. Both serve a purpose: the unit test isolates the resolver, the integration test ensures the loader discovers and caches correctly. Keep both.

- **Candidate**: `cycle-detector.test.ts:93-123` (detects cycles) and `module-resolution.test.ts:102-144` (warns with VF5900 but compiles) both verify cycle detection works. The unit test is focused on the cycle detector in isolation; the e2e test verifies the full pipeline (compile and run). Keep both because they test different layers.

- **Candidate**: `08-modules.test.ts:100-107` (".vf extension optional in imports") and `08-modules.test.ts:109-116` ("import with explicit .vf extension") both test extension resolution. They test the same feature from slightly different angles (optional vs explicit). Recommendation: Consider consolidating into a single test case with sub-cases, or keep both to emphasize the equivalence. Current structure is acceptable (thin redundancy).

- **Candidate**: `module-loader.test.ts:435-446` ("should normalize ./utils and ./utils.vf to same module") directly tests that both import paths resolve to the same cached module. This is also implicitly tested by the diamond dependency test. Recommendation: Keep both; the explicit test documents the caching-by-real-path invariant, while the diamond test verifies the side effect (singleton behavior).

_None_ (regarding tight redundancies with identical observable assertions; the above are candidates where tests reuse behavior but at different layers or with different emphasis, which is not redundant per the methodology).

---

