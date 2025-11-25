# Module Resolution Tasks

**Created:** 2025-11-23
**Last Updated:** 2025-11-24

## Overview

This implementation consists of two major components:
1. **Module Loader**: Discovers and parses all modules transitively from entry point (with path resolution, symlink handling, error collection)
2. **Module Resolver**: Analyzes dependency graph using Tarjan's SCC, detects ALL cycles, emits warnings with codes

**Scope Change:** Expanded from 8 to 9 phases with comprehensive edge case coverage, integration testing, and user documentation. Approximately 2x original scope for production-ready implementation.

## Phase 1: Warning Infrastructure

### Setup
- [ ] Create `packages/core/src/utils/warning.ts`
- [ ] Implement `VibefunWarning` class
  - [ ] Constructor: `(code: string, message, location?, help?)`
  - [ ] Property: `code: string` - warning code (W001, W002, etc.)
  - [ ] Method: `format(source: string): string`
  - [ ] Support location highlighting (reuse error code)
  - [ ] Include warning code in formatted output
- [ ] Create `CompilerDiagnostics` type
  - [ ] `{ errors: VibefunError[], warnings: VibefunWarning[] }`
- [ ] Create warning code registry
  - [ ] `WarningCode` enum or const object
  - [ ] `W001: "circular-dependency"` mapping
  - [ ] Helper function to get warning by code
- [ ] Export from `packages/core/src/utils/index.ts`

### Tests
- [ ] Test warning creation with code
- [ ] Test warning formatting with location
- [ ] Test warning formatting without location
- [ ] Test help text display
- [ ] Test warning code in formatted output
- [ ] Test CompilerDiagnostics type usage
- [ ] Test warning code registry

### Quality Checks
- [ ] Run `npm run verify`
- [ ] Ensure no `any` types
- [ ] Add JSDoc comments

---

## Phase 1.5: Path Resolution Utilities

### Core Implementation
- [ ] Create directory: `packages/core/src/module-loader/`
- [ ] Create file: `packages/core/src/module-loader/path-resolver.ts`
- [ ] Implement `resolveImportPath(from: string, to: string): string`
  - [ ] Handle relative imports (`./file`, `../parent/file`)
  - [ ] Resolve to absolute paths
  - [ ] Normalize paths (remove `.`, `..` segments)
  - [ ] Use Node.js `path` module for cross-platform support
- [ ] Implement `resolveModulePath(basePath: string): string | null`
  - [ ] If path ends with `.vf`: try as-is (don't append `.vf.vf`)
  - [ ] If path does NOT end with `.vf`: try with `.vf` extension
  - [ ] Try directory with `index.vf`
  - [ ] Return null if neither exists
  - [ ] File precedence over directory (if both exist)
  - [ ] Both `./utils` and `./utils.vf` should resolve to same cached module
- [ ] Implement symlink resolution
  - [ ] Use `fs.realpathSync()` to resolve symlinks
  - [ ] Detect circular symlinks (error)
  - [ ] Return canonical real paths
- [ ] Handle path normalization edge cases
  - [ ] Trailing slashes: `./foo/` → try `./foo/index.vf`
  - [ ] Current directory: `./.` → try `./index.vf`
  - [ ] Complex relative: `./a/../b` → normalize to `./b`
  - [ ] Going outside project: `../../../../../../file`
- [ ] Cross-platform path handling
  - [ ] Windows: `\` separators, drive letters (`C:\`)
  - [ ] Unix: `/` separators
  - [ ] Use `path.sep`, `path.normalize`, `path.resolve`

### Tests
- [ ] Test relative path resolution (`./`, `../`)
- [ ] Test absolute path passthrough
- [ ] Test path normalization (`.`, `..` removal)
- [ ] Test file precedence over directory
- [ ] Test directory with index.vf
- [ ] Test missing file returns null
- [ ] Test `.vf` extension added if missing
- [ ] Test explicit `.vf` in import path (doesn't try `.vf.vf`)
- [ ] Test `./utils` and `./utils.vf` resolve to same cached module
- [ ] Test symlink resolution
- [ ] Test symlink and original resolve to same path
- [ ] Test circular symlink detection (error)
- [ ] Test trailing slash handling
- [ ] Test current directory resolution
- [ ] Test Unicode in paths
- [ ] Test very long paths
- [ ] Test Windows paths (if on Windows)
- [ ] Test cross-platform path separators

### Quality Checks
- [ ] Run `npm run verify`
- [ ] Ensure 90%+ test coverage
- [ ] Add JSDoc comments
- [ ] No `any` types

---

## Phase 2: Module Loader (Discovery & Parsing)

### Core Implementation
- [ ] Create file: `packages/core/src/module-loader/module-loader.ts`
- [ ] Implement `ModuleLoader` class
  - [ ] Constructor
  - [ ] Method: `loadModules(entryPoint: string): Map<string, Module>`
  - [ ] Method: `loadModule(path: string): Module | null` (private, returns null on error)
  - [ ] Method: `discoverImports(module: Module): string[]` (private)
  - [ ] Method: `resolvePath(from: string, importPath: string): string` (private, use Phase 1.5)
  - [ ] Cache: `Map<string, Module>` keyed by REAL PATH (after symlink resolution)
  - [ ] Error collection: Array to collect all errors during loading
  - [ ] Method: `collectError(error: VibefunError): void` (private)
  - [ ] Method: `throwCollectedErrors(): void` (private, throws if errors exist)

### Error Collection Strategy
- [ ] Implement error collection (not fail-fast)
  - [ ] Create error array in ModuleLoader
  - [ ] On parse error: collect and continue
  - [ ] On missing file: collect and continue
  - [ ] On permission error: collect and continue
  - [ ] After discovery: throw all collected errors together
- [ ] Implement helpful error messages
  - [ ] Missing files: suggest similar filenames (typo detection)
  - [ ] Parse errors: include exact location
  - [ ] Permission errors: include full path and permissions
  - [ ] Invalid paths: explain what was expected

### Integration with Parser
- [ ] Import existing `Lexer` class
- [ ] Import existing `Parser` class
- [ ] Read file contents using `fs.readFileSync`
- [ ] Create `Lexer` instance with file contents
- [ ] Create `Parser` instance with tokens
- [ ] Parse to get `Module` AST
- [ ] Handle parse errors gracefully

### Entry Point Validation
- [ ] Validate entry point exists before starting discovery
- [ ] If entry point is directory, try resolving to `dir/index.vf`
- [ ] Clear error message for missing entry point:
      "Entry point not found: src/main.vf\n  Tried: src/main.vf, src/main/index.vf"
- [ ] Entry point parse errors included in error collection

### Discovery Algorithm
- [ ] Implement transitive closure discovery
  - [ ] Start with entry point (after validation)
  - [ ] Parse entry point module
  - [ ] Extract all import statements
  - [ ] Resolve import paths to absolute paths
  - [ ] For each import (if not in cache):
    - [ ] Parse the imported module
    - [ ] Add to cache
    - [ ] Add to queue for import discovery
  - [ ] Repeat until queue is empty
- [ ] Return complete module map

### Error Handling
- [ ] Handle file not found (collect error, continue)
- [ ] Handle parse errors (collect error, continue)
- [ ] Handle permission errors (collect error, continue)
- [ ] Handle circular imports during loading (not an error, just cache them)
- [ ] Handle invalid import paths (collect error, continue)
- [ ] Collect all errors during discovery
- [ ] Throw all errors together at end if any exist

### Public API
- [ ] Export `loadModules(entryPoint: string): Map<string, Module>` function
- [ ] Export from `packages/core/src/module-loader/index.ts`
- [ ] Add JSDoc documentation

### Tests
- [ ] Test single module (no imports)
- [ ] Test two modules (A imports B)
- [ ] Test three modules (A imports B, B imports C)
- [ ] Test diamond dependency (A imports B and C, both import D)
- [ ] Test shared dependency (A imports C, B imports C, only parsed once via cache)
- [ ] Test relative path resolution (`./`, `../`)
- [ ] Test path normalization
- [ ] Test symlink resolution (symlink and original = same module)
- [ ] Test module cache keyed by real path
- [ ] Test missing file error (collected, not thrown immediately)
- [ ] Test parse error (collected, continues loading other modules)
- [ ] Test permission error (collected, continues loading)
- [ ] Test multiple errors reported together
- [ ] Test typo suggestions for missing files
- [ ] Test circular imports (should not error during loading)
- [ ] Test type-only imports (still discovered)
- [ ] Test re-exports (discovered as dependencies)
- [ ] Test empty modules (no imports/exports)
- [ ] Test duplicate imports (same module imported multiple times in one file)
- [ ] Test entry point doesn't exist (clear error)
- [ ] Test entry point is directory with index.vf
- [ ] Test entry point is directory without index.vf (error)

### Quality Checks
- [ ] Run `npm run verify`
- [ ] Ensure 90%+ test coverage
- [ ] Add JSDoc comments
- [ ] No `any` types

---

## Phase 3: Module Graph Construction

### Core Implementation
- [ ] Create directory: `packages/core/src/module-resolver/`
- [ ] Create file: `packages/core/src/module-resolver/module-graph.ts`
- [ ] Define `DependencyEdge` type with import location
  - [ ] `to: string` - target module path
  - [ ] `isTypeOnly: boolean` - type-only import?
  - [ ] `importLoc: Location` - source location of import statement (for warnings)
- [ ] Implement `ModuleGraph` class
  - [ ] Store edges as `Map<string, DependencyEdge[]>` (from → edges)
  - [ ] Add module: `addModule(path: string): void`
  - [ ] Add dependency: `addDependency(from: string, to: string, isTypeOnly: boolean, loc: Location): void`
  - [ ] Handle dual imports: if edge exists, upgrade to value if new edge is value
  - [ ] Get dependency edges: `getDependencyEdges(from: string): DependencyEdge[]`
  - [ ] Get dependencies: `getDependencies(path: string): string[]`
  - [ ] Get all modules: `getModules(): string[]`
  - [ ] Check for cycle: `hasCycle(): boolean`
  - [ ] Topological sort: `getTopologicalOrder(): string[] | null`
  - [ ] Check if edge is type-only: `isTypeOnlyEdge(from: string, to: string): boolean`
- [ ] Implement `ModuleGraphBuilder` class
  - [ ] Build graph from `Map<string, Module>`
  - [ ] Extract imports from each `Module` AST
  - [ ] Handle `ImportDecl` nodes
  - [ ] Handle `ReExportDecl` nodes (create dependency edges)
  - [ ] Distinguish type-only imports (`import type`)
  - [ ] Handle mixed imports (both type-only and value from same module)
  - [ ] Create edges in graph with correct type-only flag
  - [ ] Wildcard imports (`import * as`) treated as value imports
  - [ ] Pass import Location to `addDependency()` for warning messages

### Re-Export Name Conflict Detection
- [ ] During graph construction, track exported names per module
- [ ] For wildcard re-exports (`export * from`), collect all re-exported names
- [ ] Detect name conflicts (same name re-exported from multiple sources)
- [ ] Generate compile-time error for conflicts:
      "Name conflict in re-exports: 'map' is exported from both './array' and './list'"
- [ ] Test: wildcard re-export name conflict detected
- [ ] Test: explicit re-exports with same name detected
- [ ] Test: no conflict when same module re-exported via different paths

### Tests
- [ ] Test `DependencyEdge` type stores location
- [ ] Test `ModuleGraph` creation
- [ ] Test adding modules and dependencies with location
- [ ] Test dual import edge handling (type + value → value)
- [ ] Test `getDependencyEdges()` returns edges with locations
- [ ] Test dependency queries
- [ ] Test graph with no cycles
- [ ] Test graph with cycles
- [ ] Test topological sort (acyclic graph)
- [ ] Test topological sort (cyclic graph)
- [ ] Test `ModuleGraphBuilder` with simple imports
- [ ] Test `ModuleGraphBuilder` with type-only imports
- [ ] Test `ModuleGraphBuilder` with mixed imports (type + value)
- [ ] Test `ModuleGraphBuilder` with re-exports
- [ ] Test `ModuleGraphBuilder` with wildcard imports
- [ ] Test building graph from module map
- [ ] Test self-imports (A → A)
- [ ] Test edge type-only flag correct for each case

### Quality Checks
- [ ] Run `npm run verify`
- [ ] Ensure 90%+ test coverage
- [ ] Add JSDoc comments

---

## Phase 4: Circular Dependency Detection

### Core Implementation
- [ ] Create file: `packages/core/src/module-resolver/cycle-detector.ts`
- [ ] Implement `CircularDependencyDetector` class
  - [ ] Method: `detectCycles(graph: ModuleGraph): Cycle[]`
  - [ ] **Tarjan's SCC algorithm** (not simple DFS)
  - [ ] Track index, lowlink, and stack for each node
  - [ ] Find all strongly connected components
  - [ ] Filter SCCs to actual cycles (2+ nodes OR self-edge)
  - [ ] Extract complete cycle paths for each SCC
- [ ] Define `Cycle` type
  - [ ] `path: string[]` - modules in cycle
  - [ ] `isTypeOnly: boolean` - all edges type-only?
  - [ ] `locations: SourceLocation[]` - import locations
- [ ] Implement Tarjan's algorithm
  - [ ] Initialize index counter and stack
  - [ ] For each node, run strongConnect if not visited
  - [ ] Track lowlink values to find SCC roots
  - [ ] Pop stack when SCC found
  - [ ] Return all SCCs as cycles
- [ ] Implement cycle path extraction
  - [ ] Given SCC, extract meaningful cycle path
  - [ ] Include all modules in SCC
  - [ ] Preserve order (A → B → C → A)
  - [ ] **Sort modules in SCC alphabetically by absolute path** (deterministic order)
  - [ ] Ensures reproducible builds (same input → same compilation order)
- [ ] Implement self-import detection as ERROR
  - [ ] Self-imports (A → A) create 1-node SCC with self-edge
  - [ ] Detect self-import as **compile-time ERROR** (not warning)
  - [ ] Generate clear error: "Module cannot import itself: [path]"
  - [ ] Rationale: Self-imports serve no useful purpose and indicate a mistake
- [ ] Implement type-only cycle detection
  - [ ] Check if ALL edges in cycle are type-only
  - [ ] If any edge is value import, cycle is problematic
  - [ ] Query graph for edge type-only status

### Tests
- [ ] Test simple cycle detection (A → B → A)
- [ ] Test complex cycle (A → B → C → A)
- [ ] Test long cycle (10+ modules in cycle)
- [ ] **Test multiple independent cycles** (both detected)
- [ ] Test type-only cycle (should be marked as such)
- [ ] Test mixed cycle (some type, some value - should warn)
- [ ] Test no cycles (empty result)
- [ ] **Test self-import** (A → A) - should be compile-time ERROR
- [ ] Test self-import error message is clear
- [ ] Test cycle path extraction accuracy
- [ ] Test location tracking for imports in cycle
- [ ] Test cyclic modules returned in deterministic (alphabetical) order
- [ ] **Test re-exports in cycles** (A exports B, B exports C, C imports A)
- [ ] Test Tarjan's algorithm finds all SCCs
- [ ] Test SCC filtering (only actual cycles, not single nodes)
- [ ] Verify O(V+E) performance on large graph

### Quality Checks
- [ ] Run `npm run verify`
- [ ] Ensure 90%+ test coverage
- [ ] Add JSDoc comments

---

## Phase 5: Warning Generation

### Core Implementation
- [ ] Create file: `packages/core/src/module-resolver/warning-generator.ts`
- [ ] Implement `generateCircularDependencyWarning(cycle: Cycle): VibefunWarning`
  - [ ] **Use warning code W001**
  - [ ] Format cycle path with arrows (A → B → C → A)
  - [ ] Include source locations for each import
  - [ ] Add explanation of danger
  - [ ] Provide actionable suggestions
  - [ ] Link to warning code documentation
- [ ] Follow spec format (docs/spec/08-modules.md:221-233)
  - [ ] "Warning [W001]: Circular dependency detected"
  - [ ] Show cycle path
  - [ ] Show import locations
  - [ ] Explain runtime error risk
  - [ ] Suggest solutions (lazy eval, extract module, DI)
  - [ ] Link to `docs/compiler/warning-codes.md#w001`
- [ ] Define warning code constant
  - [ ] `W001 = "circular-dependency"`

### Tests
- [ ] Test warning message format
- [ ] **Test warning code W001 included**
- [ ] Test cycle path formatting (2 modules)
- [ ] Test cycle path formatting (3+ modules)
- [ ] Test long cycle formatting (10+ modules)
- [ ] Test location display
- [ ] Test suggestion text
- [ ] Test documentation link
- [ ] Verify matches spec examples
- [ ] **Snapshot test for warning format** (prevent regressions)

### Quality Checks
- [ ] Run `npm run verify`
- [ ] Ensure 90%+ test coverage
- [ ] Add JSDoc comments

---

## Phase 6: Module Resolver API

### Core Implementation
- [ ] Implement `resolveModules(modules: Map<string, Module>): ModuleResolution`
  - [ ] Build module graph from input modules
  - [ ] Detect circular dependencies
  - [ ] Generate warnings for value cycles
  - [ ] Compute topological order
  - [ ] Return `ModuleResolution` object
- [ ] Implement `loadAndResolveModules(entryPoint: string): ModuleResolution`
  - [ ] Call `loadModules(entryPoint)`
  - [ ] Call `resolveModules(modules)`
  - [ ] Return combined result
- [ ] Define `ModuleResolution` type
  - [ ] `compilationOrder: string[]`
  - [ ] `warnings: VibefunWarning[]`
  - [ ] `graph: ModuleGraph`
  - [ ] `modules: Map<string, Module>`
- [ ] Export public API from `packages/core/src/module-resolver/index.ts`
  - [ ] Export `resolveModules` function
  - [ ] Export `loadAndResolveModules` function
  - [ ] Export `ModuleResolution` type
  - [ ] Export `Cycle` type (for tooling)
- [ ] Export from `packages/core/src/module-loader/index.ts`
  - [ ] Export `loadModules` function
- [ ] Update `packages/core/src/index.ts` to export module resolver and loader

### Tests
- [ ] Test `resolveModules` with no cycles
- [ ] Test `resolveModules` with type-only cycle
- [ ] Test `resolveModules` with value cycle
- [ ] Test compilation order correctness
- [ ] Test warning generation
- [ ] Test with single module
- [ ] Test with empty input
- [ ] Test with large module graph (10+ modules)
- [ ] Test `loadAndResolveModules` convenience function
- [ ] Integration test: realistic multi-module program from file

### Quality Checks
- [ ] Run `npm run verify`
- [ ] Ensure 90%+ test coverage
- [ ] Add JSDoc comments
- [ ] Update exports in package.json if needed

---

## Phase 7: Comprehensive Testing

### Path Resolution Edge Case Tests
- [ ] **Test symlinks** (same module via symlink and real path)
- [ ] **Test circular symlinks** (should error)
- [ ] **Test case sensitivity** (cross-platform behavior)
- [ ] Test path normalization (`./a/../b` → `./b`)
- [ ] **Test empty modules** (no imports/exports)
- [ ] **Test Unicode in file paths** (non-ASCII characters)
- [ ] **Test very deep import chains** (100+ levels, no stack overflow)
- [ ] **Test index file precedence** (`foo.vf` vs `foo/index.vf`)
- [ ] Test trailing slash (`./foo/` → `./foo/index.vf`)
- [ ] Test current directory (`./.` → `./index.vf`)

### Error Handling Tests
- [ ] **Test missing imports** (file doesn't exist)
- [ ] **Test parse errors during loading** (malformed .vf files)
- [ ] **Test permission errors** (unreadable files)
- [ ] **Test malformed paths** (invalid path syntax)
- [ ] **Test error collection** (multiple errors reported together)
- [ ] **Test typo suggestions** (suggest similar filenames)

### Cycle Detection Tests (Beyond Basic)
- [ ] **Test self-imports** (A → A)
- [ ] Test long cycles (10+ modules in cycle)
- [ ] **Test multiple independent cycles** (all detected, not just first)
- [ ] **Test re-exports in cycles** (A exports B, B exports C, C imports A)
- [ ] **Test mixed type/value cycles** (some edges type-only, some value)
- [ ] Test type-only cycle doesn't warn
- [ ] Test value cycle does warn

### Performance Tests
- [ ] **Test 1000-module graph** (cycle detection speed)
- [ ] **Test wide imports** (one module imports 100 modules)
- [ ] **Test deep hierarchies** (100 levels of imports)
- [ ] Verify O(V+E) complexity in practice
- [ ] Profile memory usage for large graphs

### Runtime Behavior Tests (DEFERRED - blocked on code generator)
Instead of implementing runtime tests now, create a design doc:
- [ ] Create `.claude/design/runtime-integration-tests.md`
- [ ] Document test scenarios for when code generator is ready:
  - [ ] Cyclic module initialization order
  - [ ] Deferred initialization semantics
  - [ ] Type-only cycles at runtime
  - [ ] Module singleton semantics
  - [ ] Error propagation during init
- [ ] Define expected JavaScript output patterns
- [ ] Define Node.js test harness approach
- [ ] Mark as "blocked on code generator"

### Test Infrastructure (Dual Approach)

**Fixture-based tests (version controlled):**
- [ ] Create `packages/core/src/module-loader/__fixtures__/` directory
- [ ] Create `simple-import/` fixture - Basic A imports B
- [ ] Create `diamond-dependency/` fixture - A → B,C → D
- [ ] Create `type-only-cycle/` fixture - Safe circular type imports
- [ ] Create `value-cycle/` fixture - Unsafe circular value imports

**Temp directory tests (isolation for edge cases):**
- [ ] Use Node.js `fs.mkdtempSync()` for test isolation
- [ ] Create symlinks dynamically for symlink tests
- [ ] Set permissions dynamically for permission tests
- [ ] Clean up temp dirs after each test
- [ ] Use for: symlink tests, permission tests, Unicode paths, case sensitivity

### Example Programs
- [ ] Create `examples/module-resolution/` directory
- [ ] Example: safe-types/ - Type-only circular imports (no warning)
  - [ ] moduleA.vf
  - [ ] moduleB.vf
  - [ ] README explaining pattern
- [ ] Example: unsafe-values/ - Value circular imports (warning)
  - [ ] moduleA.vf
  - [ ] moduleB.vf
  - [ ] README explaining problem
- [ ] Example: lazy-eval/ - Safe pattern with lazy evaluation
  - [ ] moduleA.vf
  - [ ] moduleB.vf
  - [ ] README explaining pattern
- [ ] Example: complex-cycle/ - Multi-module cycle
  - [ ] moduleA.vf
  - [ ] moduleB.vf
  - [ ] moduleC.vf
  - [ ] README explaining detection

### Integration Test Cases
- [ ] Realistic multi-module programs (5+ modules)
- [ ] Mixed safe/unsafe patterns
- [ ] Diamond dependencies (A → B,C → D)
- [ ] Shared dependencies (multiple importers)
- [ ] All module features (imports, exports, re-exports, type-only)

### Coverage Analysis
- [ ] Run `npm run test:coverage`
- [ ] Verify 90%+ coverage for all new files
- [ ] Add tests for any uncovered branches
- [ ] Add tests for any uncovered edge cases
- [ ] Ensure all error paths tested

### Quality Checks
- [ ] All tests pass: `npm test`
- [ ] Type checking passes: `npm run check`
- [ ] Linting passes: `npm run lint`
- [ ] Format check passes: `npm run format:check`
- [ ] Full verification: `npm run verify`

---

## Phase 7.5: Integration Testing

### Type Checker Integration
- [ ] Test forward references in cycles
  - [ ] Module A uses type from Module B
  - [ ] Module B uses type from Module A
  - [ ] Type checker handles gracefully
- [ ] Test type-only cycles don't cause type errors
- [ ] Test value cycles with proper type checking
- [ ] Verify types resolved across modules in correct order
- [ ] Test type checking respects compilation order

### Code Generator Integration
- [ ] Test module initialization order in generated JavaScript
- [ ] Verify generated JS handles cycles correctly
- [ ] Test initialization happens in dependency order (where possible)
- [ ] Verify runtime behavior matches spec
  - [ ] Modules initialized exactly once
  - [ ] Dependencies fully initialized before dependents
  - [ ] Cycles work with deferred initialization
- [ ] Run generated JavaScript with Node.js (integration test)

### Desugarer Integration
- [ ] Verify desugaring happens in dependency order
- [ ] Test sugar in cyclic modules handled correctly
- [ ] Ensure desugared ASTs maintain module structure
- [ ] Verify transformations don't break module graph
- [ ] Test all desugaring features work across modules

### End-to-End Compilation Tests
- [ ] Compile complete multi-module programs from .vf to .js
- [ ] Run generated JavaScript with Node.js
- [ ] Verify output correctness
- [ ] Test example programs from docs compile and run
- [ ] Verify warnings appear but don't halt compilation
- [ ] Test programs with and without circular dependencies

### Test Cases
- [ ] Multi-file program with no cycles (should compile cleanly)
- [ ] Multi-file program with type-only cycles (compile with no warnings)
- [ ] Multi-file program with value cycles (compile with warnings)
- [ ] Complex program using all module features
- [ ] Program with shared dependencies (diamond pattern)
- [ ] Program demonstrating safe circular dependency patterns
- [ ] Program demonstrating unsafe circular dependency patterns

### Success Criteria
- [ ] Module resolution integrates seamlessly with existing phases
- [ ] No regressions in existing tests
- [ ] End-to-end compilation works for multi-file programs
- [ ] Generated JavaScript executes correctly
- [ ] All integration tests pass

### Quality Checks
- [ ] Run `npm run verify`
- [ ] Ensure integration tests pass
- [ ] Ensure no regressions in existing functionality

---

## Phase 8: Documentation

### Error and Warning Code Documentation
- [ ] Create directory: `docs/compiler/`
- [ ] Create `docs/compiler/error-codes.md`
  - [ ] Document all error codes with examples
  - [ ] Include fixes and explanations for each
  - [ ] Make it searchable by code
  - [ ] Format: Code, Description, Example, How to Fix
- [ ] Create `docs/compiler/warning-codes.md`
  - [ ] **W001: Circular dependency (value cycle)**
  - [ ] Include cycle visualization examples
  - [ ] Provide refactoring patterns to fix cycles
  - [ ] Explain when cycles are acceptable (type-only)
  - [ ] Link to detailed fixing guide
  - [ ] Format: Code, Description, Example, Suggestions, See Also

### User Guide - Module Resolution
- [ ] Create directory: `docs/guides/`
- [ ] Create `docs/guides/module-resolution.md`
  - [ ] How Vibefun finds imported modules
  - [ ] Resolution algorithm details
    - [ ] File vs directory precedence (`foo.vf` before `foo/index.vf`)
    - [ ] Extension resolution rules (`.vf` optional in imports)
    - [ ] Index file conventions
    - [ ] Relative path resolution (`./`, `../`)
  - [ ] Symlink handling (resolved to real paths)
  - [ ] Cross-platform considerations (Windows vs Unix)
  - [ ] Search order for packages (when implemented)
  - [ ] Troubleshooting common issues
    - [ ] Module not found
    - [ ] Ambiguous imports
    - [ ] Circular dependencies
  - [ ] Examples with code snippets

### User Guide - Fixing Circular Dependencies
- [ ] Create `docs/guides/fixing-circular-dependencies.md`
  - [ ] Why circular dependencies are problematic
  - [ ] Runtime behavior with cycles
  - [ ] When are they acceptable (type-only cycles)
  - [ ] Detailed refactoring patterns:
    - [ ] **Pattern 1: Lazy evaluation**
      - [ ] Explanation
      - [ ] Before/after code in Vibefun
      - [ ] When to use
    - [ ] **Pattern 2: Extract shared module**
      - [ ] Explanation
      - [ ] Before/after code
      - [ ] When to use
    - [ ] **Pattern 3: Dependency injection**
      - [ ] Explanation
      - [ ] Before/after code
      - [ ] When to use
    - [ ] **Pattern 4: Event emitters**
      - [ ] Explanation
      - [ ] Before/after code
      - [ ] When to use
  - [ ] Best practices for module organization
  - [ ] Common anti-patterns to avoid
  - [ ] Examples from real-world scenarios

### Compiler Architecture Docs
- [ ] Update `docs/architecture/02-compilation-pipeline.md`
  - [ ] Add module loader and resolver phases to pipeline
  - [ ] Document position in pipeline
  - [ ] Explain separation between loader (I/O) and resolver (pure logic)
  - [ ] Document module graph structure (high-level)
  - [ ] Describe Tarjan's SCC algorithm (high-level)
  - [ ] Explain type-only vs value cycle distinction
  - [ ] Include diagrams if helpful
  - [ ] Keep it high-level (architecture, not implementation)

### Code Documentation
- [ ] Ensure all public APIs have JSDoc comments
- [ ] Ensure all classes have JSDoc comments
- [ ] Ensure complex algorithms have explanatory comments
  - [ ] Tarjan's SCC implementation
  - [ ] Path resolution algorithm
  - [ ] Error collection strategy
- [ ] Add examples to JSDoc where helpful

### Package and Spec Updates
- [ ] Rename `packages/stdlib` package.json name from `@vibefun/stdlib` to `@vibefun/std`
- [ ] Update all internal imports across the monorepo that reference `@vibefun/stdlib`
- [ ] Update spec `docs/spec/08-modules.md` examples to use `@vibefun/std`
  - [ ] Update import examples throughout the file
  - [ ] Update any references to stdlib package name
- [ ] Verify module resolution: standard node_modules lookup for `@vibefun/*` (no special handling)
- [ ] Update root package.json workspace references if needed

### Do NOT
- [ ] ❌ Update root CLAUDE.md (per documentation rules)
- [ ] ❌ Add implementation details to architecture docs
- [ ] ❌ Add status indicators or progress tracking

---

## Final Verification

### Before Completion
- [ ] All phases completed
- [ ] All tests passing
- [ ] All quality checks passing (`npm run verify`)
- [ ] Test coverage ≥90%
- [ ] Documentation complete
- [ ] Example programs working
- [ ] No TODOs or FIXMEs in code
- [ ] Clean git history (squash WIP commits if needed)

### Ready for Integration
- [ ] Module loader API is stable
- [ ] Module resolver API is stable
- [ ] Both exported from @vibefun/core
- [ ] Ready for type checker integration
- [ ] Ready for future CLI integration

---

## Progress Summary

**Phases Completed:** 0/9 (0%)
**Estimated Tasks:** ~200 (expanded from ~100 in original plan)
**Tasks Completed:** 0
**Current Phase:** Not started
**Blockers:** None

**Major Components:**
- **Phase 1**: Warning Infrastructure (with codes)
- **Phase 1.5**: Path Resolution Utilities (NEW - symlinks, normalization)
- **Phase 2**: Module Loader (with error collection)
- **Phase 3**: Module Graph (with dual imports, re-exports)
- **Phase 4**: Cycle Detection (Tarjan's SCC for all cycles)
- **Phase 5**: Warning Generation (with codes, snapshot tests)
- **Phase 6**: Module Resolver API
- **Phase 7**: Comprehensive Testing (extensive edge cases)
- **Phase 7.5**: Integration Testing (NEW - type checker, code gen, desugarer)
- **Phase 8**: Documentation (4 new docs)

**Scope Expansion Summary:**
- Added symlink resolution and cross-platform path handling
- Added error collection (collect all, not fail-fast)
- Changed to Tarjan's SCC (detect ALL cycles, not just first)
- Added warning code system (W001, W002, etc.)
- Added integration testing phase
- Added 4 user-facing documentation files
- Approximately 2x original task count for production-ready implementation
