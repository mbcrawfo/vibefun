# Module Resolution Tasks

**Created:** 2025-11-23
**Last Updated:** 2025-11-23

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

## Phase 2: Module Graph Construction

### Core Implementation
- [ ] Create directory: `packages/core/src/module-resolver/`
- [ ] Implement `ModuleGraph` class
  - [ ] Add module: `addModule(path: string, module: Module): void`
  - [ ] Add dependency: `addDependency(from: string, to: string, isTypeOnly: boolean): void`
  - [ ] Get dependencies: `getDependencies(path: string): string[]`
  - [ ] Get all modules: `getModules(): string[]`
  - [ ] Check for cycle: `hasCycle(): boolean`
  - [ ] Topological sort: `getTopologicalOrder(): string[] | null`
- [ ] Implement `ModuleGraphBuilder` class
  - [ ] Extract imports from `Module` AST
  - [ ] Handle `ImportDecl` nodes
  - [ ] Handle `ReExportDecl` nodes
  - [ ] Distinguish type-only imports (`import type`)
  - [ ] Resolve relative paths to absolute

### Path Resolution
- [ ] Implement `resolvePath(from: string, to: string): string`
  - [ ] Handle `./relative` paths
  - [ ] Handle `../parent` paths
  - [ ] Handle absolute paths
  - [ ] Normalize paths (remove `.`, `..` segments)
  - [ ] Use Node.js `path` module for cross-platform support

### Tests
- [ ] Test `ModuleGraph` creation
- [ ] Test adding modules and dependencies
- [ ] Test dependency queries
- [ ] Test graph with no cycles
- [ ] Test graph with cycles
- [ ] Test topological sort (acyclic graph)
- [ ] Test topological sort (cyclic graph)
- [ ] Test path resolution (relative)
- [ ] Test path resolution (parent directory)
- [ ] Test path resolution (absolute)
- [ ] Test `ModuleGraphBuilder` with simple imports
- [ ] Test `ModuleGraphBuilder` with type-only imports
- [ ] Test `ModuleGraphBuilder` with re-exports
- [ ] Test `ModuleGraphBuilder` with wildcard imports

### Quality Checks
- [ ] Run `npm run verify`
- [ ] Ensure 90%+ test coverage
- [ ] Add JSDoc comments

---

## Phase 3: Circular Dependency Detection

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

## Phase 4: Warning Generation

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

## Phase 5: Module Resolver API

### Core Implementation
- [ ] Implement `resolveModules(modules: Map<string, Module>): ModuleResolution`
  - [ ] Build module graph from input modules
  - [ ] Detect circular dependencies
  - [ ] Generate warnings for value cycles
  - [ ] Compute topological order
  - [ ] Return `ModuleResolution` object
- [ ] Define `ModuleResolution` type
  - [ ] `compilationOrder: string[]`
  - [ ] `warnings: VibefunWarning[]`
  - [ ] `graph: ModuleGraph`
- [ ] Export public API from `packages/core/src/module-resolver/index.ts`
  - [ ] Export `resolveModules` function
  - [ ] Export `ModuleResolution` type
  - [ ] Export `Cycle` type (for tooling)
- [ ] Update `packages/core/src/index.ts` to export module resolver

### Tests
- [ ] Test `resolveModules` with no cycles
- [ ] Test `resolveModules` with type-only cycle
- [ ] Test `resolveModules` with value cycle
- [ ] Test compilation order correctness
- [ ] Test warning generation
- [ ] Test with single module
- [ ] Test with empty input
- [ ] Test with large module graph (10+ modules)
- [ ] Integration test: realistic multi-module program

### Quality Checks
- [ ] Run `npm run verify`
- [ ] Ensure 90%+ test coverage
- [ ] Add JSDoc comments
- [ ] Update exports in package.json if needed

---

## Phase 6: Comprehensive Testing

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

## Phase 7: Documentation

### Compiler Architecture Docs
- [ ] Review `docs/architecture/compiler-architecture/` structure
- [ ] Check if module resolution fits high-level scope
- [ ] If appropriate:
  - [ ] Add "Module Resolution" section to `04-compilation-pipeline.md`
  - [ ] Explain position in pipeline (after parsing, before type checking)
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
- [ ] Module resolver API is stable
- [ ] Exported from @vibefun/core
- [ ] Ready for type checker integration
- [ ] Ready for future CLI integration

---

## Progress Summary

**Phases Completed:** 0/7 (0%)
**Tasks Completed:** 0/TBD
**Current Phase:** Not started
**Blockers:** None
