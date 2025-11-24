# Module Resolution System Implementation Plan

**Created:** 2025-11-23
**Last Updated:** 2025-11-23
**Status:** Planning
**Branch:** module-resolution

## Overview

Build a complete module resolution system that detects circular dependencies and emits warnings, as specified in `docs/spec/08-modules.md`. This enables multi-module compilation and is foundational for the type checker to work across files.

## Goals

1. Detect circular dependencies between modules
2. Emit warnings for problematic circular value dependencies
3. Allow safe type-only circular dependencies
4. Provide clear, actionable warning messages
5. Determine correct compilation order (topological sort)

## Position in Compilation Pipeline

Module resolution fits between parsing and type checking:

```
1. Lexer          → Tokenize each .vf file
2. Parser         → Build AST for each file (produces Module nodes)
3. Module Resolver ← NEW: Build dependency graph, detect cycles, emit warnings
4. Desugarer      → Transform ASTs in dependency order
5. Type Checker   → Type check across modules in topological order
6. Optimizer      → Optional optimizations
7. Code Generator → Emit JavaScript
```

The module resolver:
- Takes a collection of parsed AST `Module` nodes
- Extracts import/export information
- Builds a dependency graph
- Detects circular dependencies
- Returns compilation order and warnings

## Implementation Phases

### Phase 1: Warning Infrastructure

**Goal:** Create warning system parallel to existing error system

**Deliverables:**
- `packages/core/src/utils/warning.ts` with `VibefunWarning` class
- `CompilerDiagnostics` type: `{ errors: VibefunError[], warnings: VibefunWarning[] }`
- Warning formatting and display (reuse error infrastructure)
- Export from `packages/core/src/utils/index.ts`
- Tests for warning creation and formatting

**Design:**
- Similar API to `VibefunError` (location, message, help text)
- Warnings don't halt compilation (unlike errors)
- Formatted output distinguishes warnings from errors

### Phase 2: Module Graph Construction

**Goal:** Build dependency graph from parsed AST modules

**Deliverables:**
- Create `packages/core/src/module-resolver/` directory
- `ModuleGraph` class with nodes (modules) and edges (imports)
- `ModuleGraphBuilder` to extract imports from `Module` AST nodes
- Path resolution (relative to absolute)
- Tests for graph construction

**Design:**
```typescript
class ModuleGraph {
  addModule(path: string, module: Module): void
  addDependency(from: string, to: string, isTypeOnly: boolean): void
  getTopologicalOrder(): string[]
  getDependencies(path: string): string[]
  hasCycle(): boolean
}
```

**Key Decisions:**
- Graph nodes are absolute file paths
- Edges track whether import is type-only
- Relative paths (`./foo`, `../bar`) resolved to absolute
- Handles named imports, wildcard imports, re-exports

### Phase 3: Circular Dependency Detection

**Goal:** Detect cycles using graph algorithms

**Deliverables:**
- `CircularDependencyDetector` class
- DFS-based cycle detection with back-edge tracking
- Distinction between type-only and value cycles
- Cycle path extraction (for warning messages)
- Tests for various cycle patterns

**Design:**
```typescript
class CircularDependencyDetector {
  detectCycles(graph: ModuleGraph): Cycle[]
}

type Cycle = {
  path: string[]              // Module paths in cycle (A → B → C → A)
  isTypeOnly: boolean         // True if all edges are type-only imports
  locations: SourceLocation[] // Import locations for each edge
}
```

**Algorithm:**
- Depth-first search with visited/visiting/visited states
- Back edges indicate cycles
- Track complete cycle path for helpful messages
- Type-only cycle: ALL edges in cycle use `import type`
- Value cycle: at least ONE edge imports values/functions

### Phase 4: Warning Generation

**Goal:** Generate spec-compliant, helpful warning messages

**Deliverables:**
- Warning message generation per `docs/spec/08-modules.md:221-233`
- Include cycle path visualization
- Provide actionable suggestions
- Link to documentation
- Tests for message formatting

**Warning Format:**
```
Warning: Circular dependency detected
  Module cycle: src/moduleA.vf → src/moduleB.vf → src/moduleA.vf

  at src/moduleA.vf:1:1:
    import { functionB } from './moduleB';

  This can cause runtime errors if modules call imported functions
  during initialization.

  Suggestions:
  - Use lazy evaluation (wrap in functions)
  - Break cycle by extracting shared code to new module
  - Use dependency injection patterns

  See: docs/spec/08-modules.md#circular-dependencies
```

**Key Points:**
- Show complete cycle path with arrows
- Include source locations for imports
- Explain the danger (runtime errors)
- Provide concrete suggestions
- Link to documentation

### Phase 5: Module Resolver API

**Goal:** Create public API for compilation pipeline

**Deliverables:**
- Main `resolveModules()` function
- Clean return type with all needed information
- Integration with compilation pipeline
- Public exports from `packages/core/src/module-resolver/index.ts`
- Integration tests

**API Design:**
```typescript
export function resolveModules(
  modules: Map<string, Module>
): ModuleResolution;

type ModuleResolution = {
  compilationOrder: string[]    // Topologically sorted module paths
  warnings: VibefunWarning[]    // Circular dependency warnings
  graph: ModuleGraph            // Dependency graph (for debugging/tooling)
};
```

**Usage:**
```typescript
// After parsing all modules
const modules = new Map<string, Module>();
modules.set('/path/to/A.vf', parsedModuleA);
modules.set('/path/to/B.vf', parsedModuleB);

const resolution = resolveModules(modules);
// Use resolution.compilationOrder for type checking order
// Display resolution.warnings to user
```

### Phase 6: Comprehensive Testing

**Goal:** Ensure correctness and robustness

**Test Coverage:**
- Unit tests for each class (ModuleGraph, CircularDependencyDetector, etc.)
- Integration tests for realistic multi-module programs
- Edge cases: empty graphs, single modules, large graphs
- Test cases:
  - Simple cycles (A → B → A)
  - Complex cycles (A → B → C → D → A)
  - Type-only cycles (should not warn)
  - Mixed cycles (some type-only edges, some value edges)
  - Multiple independent cycles
  - No cycles (topological sort correctness)
- Example programs in `examples/` demonstrating safe vs unsafe patterns
- Target: 90%+ test coverage

### Phase 7: Documentation

**Goal:** Document the module resolution system

**Deliverables:**
- Add "Module Resolution" section to compiler architecture docs
  - File: `docs/architecture/compiler-architecture/04-compilation-pipeline.md`
  - Only if this fits the high-level scope of those docs
- Explain position in pipeline
- Document module graph structure
- Describe cycle detection algorithm
- Include diagrams if helpful

**Do NOT:**
- Update root CLAUDE.md (per documentation rules)
- Document implementation details (keep it high-level)
- Include status indicators

## Success Criteria

- ✅ Module graph correctly built from AST imports
- ✅ Circular dependencies detected accurately
- ✅ Type-only cycles don't trigger warnings
- ✅ Value cycles emit spec-compliant warnings
- ✅ Topological sort provides correct compilation order
- ✅ All quality checks pass (`npm run verify`)
- ✅ 90%+ test coverage for new code
- ✅ Integration ready for future type checker updates

## Non-Goals (Future Work)

- CLI integration (CLI not implemented yet, will be designed later)
- Module caching or incremental compilation
- Module bundling or dead code elimination
- npm package resolution
- Source map support for module boundaries

## Dependencies

- Existing error infrastructure (`packages/core/src/utils/error.ts`)
- AST types (`Module`, `ImportDecl`, `ReExportDecl`)
- Parser producing valid `Module` nodes

## Risks & Mitigations

**Risk:** Complexity of module initialization semantics
**Mitigation:** Follow spec precisely, add comprehensive tests

**Risk:** Path resolution across different OS (Windows vs Unix)
**Mitigation:** Use Node.js `path` module for cross-platform compatibility

**Risk:** Large module graphs could be slow
**Mitigation:** Use efficient graph algorithms (DFS is O(V+E)), profile if needed

## Timeline Estimation

Not included per project guidelines.

## References

- Language Spec: `docs/spec/08-modules.md`
- Existing Error System: `packages/core/src/utils/error.ts`
- Parser Architecture: `packages/core/src/parser/CLAUDE.md`
- AST Types: `packages/core/src/types/ast.ts`
