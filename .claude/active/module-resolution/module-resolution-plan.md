# Module Resolution System Implementation Plan

**Created:** 2025-11-23
**Last Updated:** 2025-11-23
**Status:** Planning
**Branch:** module-resolution

## Overview

Build a complete module resolution system that detects circular dependencies and emits warnings, as specified in `docs/spec/08-modules.md`. This enables multi-module compilation and is foundational for the type checker to work across files.

The system consists of two separate components following the **separation of concerns** principle:
1. **ModuleLoader**: Discovers and parses all modules transitively from an entry point
2. **ModuleResolver**: Analyzes dependency graph, detects cycles, emits warnings

## Goals

1. Discover all modules transitively from entry point (module loader)
2. Build dependency graph from parsed modules (module resolver)
3. Detect circular dependencies between modules (module resolver)
4. Emit warnings for problematic circular value dependencies (module resolver)
5. Allow safe type-only circular dependencies (module resolver)
6. Provide clear, actionable warning messages (module resolver)
7. Determine correct compilation order via topological sort (module resolver)

## Architecture: Separation of Concerns

### Module Loader (Discovery & Parsing)
- **Responsibility**: File I/O, discovery, parsing, caching
- **Input**: Entry point file path (`main.vf`)
- **Output**: `Map<string, Module>` (all discovered modules)
- **Behavior**:
  - Recursively discovers imports (transitive closure)
  - Parses each module once (caching prevents duplicates)
  - Resolves import paths to absolute paths
  - Handles: `import { x } from './file1'` causes `file1.vf` to be discovered

### Module Resolver (Graph Analysis)
- **Responsibility**: Pure graph analysis, cycle detection, warnings
- **Input**: `Map<string, Module>` (pre-loaded modules)
- **Output**: `ModuleResolution` (compilation order + warnings)
- **Behavior**:
  - Builds dependency graph from import declarations
  - Detects circular dependencies using DFS
  - Distinguishes type-only vs value cycles
  - Generates warnings for problematic cycles
  - Computes topological sort for compilation order

### Why Separate?

**Pros of Separation:**
- ✅ Module resolver is pure (no I/O) - highly testable
- ✅ Clear single responsibility for each component
- ✅ Module resolver reusable for different sources (files, memory, network)
- ✅ Easy to test resolver with constructed ASTs
- ✅ Can substitute different loaders (test, file, cached)
- ✅ Future-proof for virtual filesystems, in-memory compilation (REPL)

**Example: How They Work Together:**
```typescript
// Module Loader: discovers & parses
const modules = loadModules('src/main.vf');
// => Map {
//   '/abs/path/src/main.vf' => Module { ... },
//   '/abs/path/src/file1.vf' => Module { ... },
//   '/abs/path/src/file2.vf' => Module { ... },
//   '/abs/path/src/file3.vf' => Module { ... }  // Both file1 and file2 import this
// }

// Module Resolver: analyzes dependencies
const resolution = resolveModules(modules);
// => ModuleResolution {
//   compilationOrder: ['/abs/path/src/file3.vf', '/abs/path/src/file1.vf', ...],
//   warnings: [VibefunWarning { ... }],
//   graph: ModuleGraph { ... }
// }
```

## Position in Compilation Pipeline

```
1. Lexer             → Tokenize entry point .vf file
2. Parser            → Build AST for entry point (produces Module node)
3. Module Loader     ← NEW: Discover & parse all imported modules recursively
4. Module Resolver   ← NEW: Build dependency graph, detect cycles, emit warnings
5. Desugarer         → Transform ASTs in dependency order
6. Type Checker      → Type check across modules in topological order
7. Optimizer         → Optional optimizations
8. Code Generator    → Emit JavaScript
```

**Key Insight:** Steps 1-3 happen recursively (parse main → discover imports → parse imports → discover more imports → ...) until all modules are discovered. Then step 4 analyzes the complete graph.

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

### Phase 2: Module Loader (Discovery & Parsing)

**Goal:** Discover and parse all modules transitively from entry point

**Deliverables:**
- Create `packages/core/src/module-loader/` directory
- `ModuleLoader` class with module discovery logic
- Module cache to prevent duplicate parsing
- Path resolution utilities (relative to absolute)
- Integration with existing lexer and parser
- Tests for module discovery and caching

**Design:**
```typescript
class ModuleLoader {
  private cache: Map<string, Module> = new Map();

  loadModules(entryPoint: string): Map<string, Module>
  private loadModule(path: string): Module
  private discoverImports(module: Module): string[]
  private resolvePath(from: string, importPath: string): string
}

export function loadModules(entryPoint: string): Map<string, Module>;
```

**Algorithm:**
1. Start with entry point file path
2. Parse entry point → add to cache
3. Extract imports from parsed module
4. For each import path:
   - Resolve to absolute path
   - If not in cache: parse it, add to cache, queue for import discovery
5. Repeat step 3-4 until no new modules discovered
6. Return complete module cache

**Key Decisions:**
- Cache keyed by absolute file paths (prevents `file3.vf` being parsed twice)
- Relative paths resolved immediately to absolute
- File reading and parsing happen here
- Errors for missing files thrown here

### Phase 3: Module Graph Construction

**Goal:** Build dependency graph from parsed AST modules

**Deliverables:**
- Create `packages/core/src/module-resolver/` directory
- `ModuleGraph` class with nodes (modules) and edges (imports)
- `ModuleGraphBuilder` to extract imports from `Module` AST nodes
- Tests for graph construction

**Design:**
```typescript
class ModuleGraph {
  addModule(path: string): void
  addDependency(from: string, to: string, isTypeOnly: boolean): void
  getTopologicalOrder(): string[]
  getDependencies(path: string): string[]
  hasCycle(): boolean
}
```

**Key Decisions:**
- Graph nodes are absolute file paths (no Module ASTs stored in graph)
- Edges track whether import is type-only
- Handles named imports, wildcard imports, re-exports
- Pure data structure (no I/O)

### Phase 4: Circular Dependency Detection

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
- Depth-first search with visited/visiting/visiting states
- Back edges indicate cycles
- Track complete cycle path for helpful messages
- Type-only cycle: ALL edges in cycle use `import type`
- Value cycle: at least ONE edge imports values/functions

### Phase 5: Warning Generation

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

### Phase 6: Module Resolver API

**Goal:** Create public API for compilation pipeline

**Deliverables:**
- Main `resolveModules()` function (pure, takes pre-loaded modules)
- Main `loadAndResolveModules()` convenience function (combines loader + resolver)
- Clean return type with all needed information
- Public exports from `packages/core/src/module-resolver/index.ts`
- Public exports from `packages/core/src/module-loader/index.ts`
- Integration tests

**API Design:**
```typescript
// Pure resolver (takes pre-loaded modules)
export function resolveModules(
  modules: Map<string, Module>
): ModuleResolution;

// Convenience function (loads + resolves)
export function loadAndResolveModules(
  entryPoint: string
): ModuleResolution;

type ModuleResolution = {
  compilationOrder: string[]    // Topologically sorted module paths
  warnings: VibefunWarning[]    // Circular dependency warnings
  graph: ModuleGraph            // Dependency graph (for debugging/tooling)
  modules: Map<string, Module>  // All loaded modules
};
```

**Usage Examples:**
```typescript
// Option 1: Use convenience function (typical case)
const resolution = loadAndResolveModules('src/main.vf');
// Internally: loads all modules, then resolves them

// Option 2: Separate loading and resolution (for testing or advanced use)
const modules = loadModules('src/main.vf');
const resolution = resolveModules(modules);

// Option 3: Completely custom loading (tests, in-memory compilation)
const modules = new Map<string, Module>();
modules.set('/path/to/A.vf', constructedModuleA);
modules.set('/path/to/B.vf', constructedModuleB);
const resolution = resolveModules(modules);  // Pure, no I/O
```

### Phase 7: Comprehensive Testing

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

### Phase 8: Documentation

**Goal:** Document the module resolution system

**Deliverables:**
- Add "Module Resolution" section to compiler architecture docs
  - File: `docs/architecture/compiler-architecture/04-compilation-pipeline.md`
  - Only if this fits the high-level scope of those docs
- Explain position in pipeline
- Document separation between module loader and module resolver
- Document module graph structure (high-level)
- Describe cycle detection algorithm (high-level)
- Include diagrams if helpful

**Do NOT:**
- Update root CLAUDE.md (per documentation rules)
- Document implementation details (keep it high-level)
- Include status indicators

## Success Criteria

**Module Loader:**
- ✅ Discovers all modules transitively from entry point
- ✅ Caching prevents duplicate parsing (file3.vf parsed once even if imported by multiple modules)
- ✅ Path resolution correct (relative → absolute)
- ✅ Handles missing files with clear errors

**Module Resolver:**
- ✅ Module graph correctly built from AST imports
- ✅ Circular dependencies detected accurately
- ✅ Type-only cycles don't trigger warnings
- ✅ Value cycles emit spec-compliant warnings
- ✅ Topological sort provides correct compilation order

**Integration:**
- ✅ Both components work together via clean API
- ✅ Pure module resolver can be tested without file I/O
- ✅ All quality checks pass (`npm run verify`)
- ✅ 90%+ test coverage for new code
- ✅ Ready for future type checker integration

## Non-Goals (Future Work)

- CLI integration (CLI not implemented yet, will be designed later)
- Incremental compilation (cache invalidation, watch mode)
- Module bundling or dead code elimination
- npm package resolution (node_modules, package.json)
- Source map support for module boundaries
- Module preloading or lazy loading

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
