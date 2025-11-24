# Module Resolution Tasks

**Created:** 2025-11-23
**Last Updated:** 2025-11-23

## Overview

This implementation consists of two major components:
1. **Module Loader**: Discovers and parses all modules transitively from entry point
2. **Module Resolver**: Analyzes dependency graph, detects cycles, emits warnings

## Phase 1: Warning Infrastructure

### Setup
- [ ] Create `packages/core/src/utils/warning.ts`
- [ ] Implement `VibefunWarning` class
  - [ ] Constructor: `(message, location?, help?)`
  - [ ] Method: `format(source: string): string`
  - [ ] Support location highlighting (reuse error code)
- [ ] Create `CompilerDiagnostics` type
  - [ ] `{ errors: VibefunError[], warnings: VibefunWarning[] }`
- [ ] Export from `packages/core/src/utils/index.ts`

### Tests
- [ ] Test warning creation
- [ ] Test warning formatting with location
- [ ] Test warning formatting without location
- [ ] Test help text display
- [ ] Test CompilerDiagnostics type usage

### Quality Checks
- [ ] Run `npm run verify`
- [ ] Ensure no `any` types
- [ ] Add JSDoc comments

---

## Phase 2: Module Loader (Discovery & Parsing)

### Core Implementation
- [ ] Create directory: `packages/core/src/module-loader/`
- [ ] Implement `ModuleLoader` class
  - [ ] Constructor
  - [ ] Method: `loadModules(entryPoint: string): Map<string, Module>`
  - [ ] Method: `loadModule(path: string): Module` (private)
  - [ ] Method: `discoverImports(module: Module): string[]` (private)
  - [ ] Method: `resolvePath(from: string, importPath: string): string` (private)
  - [ ] Cache: `Map<string, Module>` to prevent duplicate parsing

### Path Resolution
- [ ] Implement path resolution logic
  - [ ] Resolve relative imports (`./file`, `../parent/file`)
  - [ ] Handle absolute paths
  - [ ] Normalize paths (remove `.`, `..` segments)
  - [ ] Use Node.js `path` module for cross-platform support
  - [ ] Add `.vf` extension if not present

### Integration with Parser
- [ ] Import existing `Lexer` class
- [ ] Import existing `Parser` class
- [ ] Read file contents using `fs.readFileSync`
- [ ] Create `Lexer` instance with file contents
- [ ] Create `Parser` instance with tokens
- [ ] Parse to get `Module` AST
- [ ] Handle parse errors gracefully

### Discovery Algorithm
- [ ] Implement transitive closure discovery
  - [ ] Start with entry point
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
- [ ] Handle file not found (throw clear error)
- [ ] Handle parse errors (let them propagate)
- [ ] Handle circular imports during loading (not an error, just cache them)
- [ ] Handle invalid import paths (throw clear error)

### Public API
- [ ] Export `loadModules(entryPoint: string): Map<string, Module>` function
- [ ] Export from `packages/core/src/module-loader/index.ts`
- [ ] Add JSDoc documentation

### Tests
- [ ] Test single module (no imports)
- [ ] Test two modules (A imports B)
- [ ] Test three modules (A imports B, B imports C)
- [ ] Test diamond dependency (A imports B and C, both import D)
- [ ] Test shared dependency (A imports C, B imports C, only parsed once)
- [ ] Test relative path resolution (`./`, `../`)
- [ ] Test path normalization
- [ ] Test missing file error
- [ ] Test circular imports (should not error during loading)
- [ ] Test type-only imports (still discovered)
- [ ] Test re-exports

### Quality Checks
- [ ] Run `npm run verify`
- [ ] Ensure 90%+ test coverage
- [ ] Add JSDoc comments
- [ ] No `any` types

---

## Phase 3: Module Graph Construction

### Core Implementation
- [ ] Create directory: `packages/core/src/module-resolver/` (if not done in Phase 2)
- [ ] Implement `ModuleGraph` class
  - [ ] Add module: `addModule(path: string): void`
  - [ ] Add dependency: `addDependency(from: string, to: string, isTypeOnly: boolean): void`
  - [ ] Get dependencies: `getDependencies(path: string): string[]`
  - [ ] Get all modules: `getModules(): string[]`
  - [ ] Check for cycle: `hasCycle(): boolean`
  - [ ] Topological sort: `getTopologicalOrder(): string[] | null`
- [ ] Implement `ModuleGraphBuilder` class
  - [ ] Build graph from `Map<string, Module>`
  - [ ] Extract imports from each `Module` AST
  - [ ] Handle `ImportDecl` nodes
  - [ ] Handle `ReExportDecl` nodes
  - [ ] Distinguish type-only imports (`import type`)
  - [ ] Create edges in graph

### Tests
- [ ] Test `ModuleGraph` creation
- [ ] Test adding modules and dependencies
- [ ] Test dependency queries
- [ ] Test graph with no cycles
- [ ] Test graph with cycles
- [ ] Test topological sort (acyclic graph)
- [ ] Test topological sort (cyclic graph)
- [ ] Test `ModuleGraphBuilder` with simple imports
- [ ] Test `ModuleGraphBuilder` with type-only imports
- [ ] Test `ModuleGraphBuilder` with re-exports
- [ ] Test `ModuleGraphBuilder` with wildcard imports
- [ ] Test building graph from module map

### Quality Checks
- [ ] Run `npm run verify`
- [ ] Ensure 90%+ test coverage
- [ ] Add JSDoc comments

---

## Phase 4: Circular Dependency Detection

### Core Implementation
- [ ] Implement `CircularDependencyDetector` class
  - [ ] Method: `detectCycles(graph: ModuleGraph): Cycle[]`
  - [ ] DFS-based cycle detection
  - [ ] Track visited/visiting/visited states
  - [ ] Detect back edges
  - [ ] Extract complete cycle paths
- [ ] Define `Cycle` type
  - [ ] `path: string[]` - modules in cycle
  - [ ] `isTypeOnly: boolean` - all edges type-only?
  - [ ] `locations: SourceLocation[]` - import locations
- [ ] Implement cycle path extraction
  - [ ] Given back edge, extract full cycle
  - [ ] Include all modules in cycle
  - [ ] Preserve order (A → B → C → A)
- [ ] Implement type-only cycle detection
  - [ ] Check if ALL edges in cycle are type-only
  - [ ] If any edge is value import, cycle is problematic

### Tests
- [ ] Test simple cycle detection (A → B → A)
- [ ] Test complex cycle (A → B → C → A)
- [ ] Test multiple cycles in same graph
- [ ] Test type-only cycle (should be marked as such)
- [ ] Test mixed cycle (some type, some value - should warn)
- [ ] Test no cycles (empty result)
- [ ] Test self-import (A → A)
- [ ] Test cycle path extraction accuracy
- [ ] Test location tracking for imports in cycle

### Quality Checks
- [ ] Run `npm run verify`
- [ ] Ensure 90%+ test coverage
- [ ] Add JSDoc comments

---

## Phase 5: Warning Generation

### Core Implementation
- [ ] Implement `generateCircularDependencyWarning(cycle: Cycle): VibefunWarning`
  - [ ] Format cycle path with arrows (A → B → C → A)
  - [ ] Include source locations for each import
  - [ ] Add explanation of danger
  - [ ] Provide actionable suggestions
  - [ ] Link to documentation
- [ ] Follow spec format (docs/spec/08-modules.md:221-233)
  - [ ] "Warning: Circular dependency detected"
  - [ ] Show cycle path
  - [ ] Show import locations
  - [ ] Explain runtime error risk
  - [ ] Suggest solutions (lazy eval, extract module, DI)
  - [ ] Link to spec

### Tests
- [ ] Test warning message format
- [ ] Test cycle path formatting (2 modules)
- [ ] Test cycle path formatting (3+ modules)
- [ ] Test location display
- [ ] Test suggestion text
- [ ] Test documentation link
- [ ] Verify matches spec examples

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

### Additional Tests
- [ ] Edge case: self-import (module imports itself)
- [ ] Edge case: deeply nested imports (10+ levels)
- [ ] Edge case: multiple independent cycles
- [ ] Edge case: all type-only imports (no warnings)
- [ ] Edge case: wildcard imports in cycle
- [ ] Edge case: re-exports in cycle
- [ ] Error case: missing module (should be handled gracefully)

### Coverage Analysis
- [ ] Run `npm run test:coverage`
- [ ] Verify 90%+ coverage for all new files
- [ ] Add tests for any uncovered branches
- [ ] Add tests for any uncovered edge cases

### Quality Checks
- [ ] All tests pass: `npm test`
- [ ] Type checking passes: `npm run check`
- [ ] Linting passes: `npm run lint`
- [ ] Format check passes: `npm run format:check`
- [ ] Full verification: `npm run verify`

---

## Phase 8: Documentation

### Compiler Architecture Docs
- [ ] Review `docs/architecture/compiler-architecture/` structure
- [ ] Check if module resolution fits high-level scope
- [ ] If appropriate:
  - [ ] Add "Module Resolution" section to `04-compilation-pipeline.md`
  - [ ] Explain module loader (discovery & parsing)
  - [ ] Explain module resolver (graph analysis)
  - [ ] Explain position in pipeline (loading after parsing, resolution before type checking)
  - [ ] Describe module graph structure (high-level)
  - [ ] Describe cycle detection (high-level)
  - [ ] Include diagram if helpful
- [ ] Keep it high-level (architecture, not implementation)

### Code Documentation
- [ ] Ensure all public APIs have JSDoc comments
- [ ] Ensure all classes have JSDoc comments
- [ ] Ensure complex algorithms have explanatory comments
- [ ] Add examples to JSDoc where helpful

### Do NOT
- [ ] ❌ Update root CLAUDE.md
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

**Phases Completed:** 0/8 (0%)
**Tasks Completed:** 0/TBD
**Current Phase:** Not started
**Blockers:** None

**Components:**
- Module Loader: Not started
- Module Resolver: Not started
