# Module Resolution System Implementation Plan

**Created:** 2025-11-23
**Last Updated:** 2025-11-24
**Status:** Planning (Audit amendments integrated)
**Audit:** 2025-11-24 - Scope expanded per audit findings
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
8. **[NEW]** Resolve package imports via node_modules (`@vibefun/std`, `@org/package`)
9. **[NEW]** Support vibefun.json path mappings (`@/*: ./src/*`)
10. **[NEW]** Detect import conflicts (duplicate imports, shadowing) as compile-time errors
11. **[NEW]** Emit case sensitivity warnings for cross-platform safety (VF5901)

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
//   warnings: [VibefunDiagnostic { ... }],
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

### Phase 1: Diagnostic System Verification

**Goal:** Verify existing diagnostic infrastructure meets module resolution needs

**Background:** The unified diagnostic system already exists in `packages/core/src/diagnostics/`:
- `VibefunDiagnostic` class handles both errors and warnings via `severity` property
- `WarningCollector` class for accumulating non-fatal warnings
- `DiagnosticRegistry` for all VFxxxx codes
- Factory functions: `throwDiagnostic()` and `createDiagnostic()`
- Test helpers: `expectDiagnostic()`, `expectWarning()`

**Existing Module Codes (in `codes/modules.ts`):**
- VF5000: ModuleNotFound
- VF5001: ImportNotExported
- VF5002: DuplicateImport
- VF5003: ImportShadowed
- VF5100: DuplicateExport
- VF5101: ReexportConflict
- VF5900: CircularDependency (warning)
- VF5901: CaseSensitivityMismatch (warning)

**Deliverables:**
- Verify VF5900 (CircularDependency) message template supports cycle path formatting
- Verify VF5901 (CaseSensitivityMismatch) message template supports path comparison
- Add VF5004 (SelfImport) for self-import error detection
- Add VF5005 (EntryPointNotFound) for entry point validation
- Review diagnostic README for usage patterns

**Design:**
- Use `createDiagnostic("VF5900", loc, { cycle: "..." })` for warnings
- Use `throwDiagnostic("VF5000", loc, { path: "..." })` for errors
- Accumulate warnings in `WarningCollector`
- Format with `diagnostic.format(source)`

### Phase 1.5: Path Resolution Utilities

**Goal:** Build robust, cross-platform path resolution with symlink support, package resolution, and config loading

**Deliverables:**
- Create `packages/core/src/module-loader/path-resolver.ts`
- Implement `resolveImportPath(from: string, to: string): string`
- Implement `resolveModulePath(importPath: string): string | null`
- Implement symlink resolution using `fs.realpathSync()`
- Implement path normalization (handle `..`, `.`, trailing slashes)
- Handle cross-platform paths (Windows `\` vs Unix `/`, drive letters)
- Detect and error on circular symlinks
- **[NEW]** Create `packages/core/src/module-loader/package-resolver.ts`
- **[NEW]** Implement `resolvePackageImport(importPath: string, fromDir: string): string | null`
- **[NEW]** Create `packages/core/src/module-loader/config-loader.ts`
- **[NEW]** Implement `loadVibefunConfig(projectRoot: string): VibefunConfig | null`
- **[NEW]** Implement case sensitivity checking with VF5901 warning
- Tests for all edge cases

**Design:**
```typescript
// Resolve import path from importing file to imported file
export function resolveImportPath(
  fromFile: string,      // Absolute path to importing file
  importPath: string     // Import path from source code
): string;               // Returns absolute real path (symlinks resolved)

// Resolve module path using Node.js/TypeScript rules
export function resolveModulePath(
  basePath: string       // Absolute path to try resolving from
): string | null;        // Returns real path to .vf file or null if not found
```

**Resolution Algorithm** (following Node.js/TypeScript):
1. For `import "./foo"`:
   - If path ends with `.vf`: try path as-is (don't append `.vf.vf`)
   - If path does NOT end with `.vf`:
     - Try `<dir>/foo.vf` (exact file)
     - Try `<dir>/foo/index.vf` (directory with index)
   - Return null if neither exists
2. If both file and directory exist, file takes precedence
3. Resolve symlinks using `fs.realpathSync()` (canonical path)
4. Normalize paths: `./a/../b` → `./b`
5. Handle trailing slashes: `./foo/` → try `./foo/index.vf`
6. Handle current directory: `./.` → try `./index.vf`
7. Both `./utils` and `./utils.vf` should resolve to same cached module

**Symlink Handling:**
- All paths resolved to real paths using `fs.realpathSync()`
- Module cache keyed by real path (prevents duplicate modules)
- Circular symlinks detected and reported as errors
- Symlinked files treated as same module as original

**Key Decisions:**
- Follow Node.js/TypeScript resolution rules exactly
- File precedence over directory (if both `foo.vf` and `foo/index.vf` exist)
- Symlinks always resolved to real paths
- Cross-platform support using Node.js `path` module

**[NEW] Package Import Resolution:**
```typescript
// Resolve package imports (no ./ or ../ prefix)
export function resolvePackageImport(
  importPath: string,      // e.g., '@vibefun/std' or '@myorg/package'
  fromDir: string          // Directory of importing file
): string | null;          // Returns absolute path or null if not found
```

**Package Resolution Algorithm:**
1. Determine if import is a package (doesn't start with `./ ` or `../`)
2. Check vibefun.json path mappings first (if configured)
3. Search node_modules in current and ancestor directories:
   - `<dir>/node_modules/<package>.vf`
   - `<dir>/node_modules/<package>/index.vf`
   - `<parent>/node_modules/...` (continue up tree)
4. Support scoped packages: `@org/package` → `node_modules/@org/package`
5. Return null if not found (error handled by caller)

**[NEW] vibefun.json Path Mappings:**
```typescript
type VibefunConfig = {
  compilerOptions?: {
    paths?: Record<string, string[]>;  // e.g., { "@/*": ["./src/*"] }
  };
};

export function loadVibefunConfig(projectRoot: string): VibefunConfig | null;
export function applyPathMapping(
  importPath: string,
  config: VibefunConfig,
  projectRoot: string
): string | null;
```

**Path Mapping Resolution:**
1. Load `vibefun.json` from project root (walk up from entry point)
2. For each path pattern in `paths`:
   - Match import against pattern (e.g., `@/utils` matches `@/*`)
   - Apply replacement (e.g., `./src/*` → `./src/utils`)
   - Try each mapping in order until one resolves
3. If no mapping matches, fall back to package/relative resolution

**[NEW] Case Sensitivity Warning (VF5901):**
- When file is found via case-insensitive match but case differs:
  ```
  warning[VF5901]: Module path './Utils' has different casing than on disk: './utils'
    --> src/main.vf:1:1
     |
   1 | import { x } from './Utils';
     |                   ^^^^^^^^
     |
   = hint: Use the exact casing as the file on disk
  ```
- Check actual filename case after resolution using `fs.readdirSync()`
- Use `createDiagnostic("VF5901", loc, { actual: importPath, expected: realPath })`

### Phase 2: Module Loader (Discovery & Parsing)

**Goal:** Discover and parse all modules transitively with comprehensive error collection

**Deliverables:**
- Create `packages/core/src/module-loader/` directory
- `ModuleLoader` class with module discovery logic
- **Module cache keyed by real path** (after symlink resolution)
- **Error collection** (collect all errors, report together)
- Path resolution integration (use Phase 1.5 utilities)
- Integration with existing lexer and parser
- **Helpful error messages** (typo suggestions, clear locations)
- Tests for module discovery, caching, and error handling

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
2. **Validate entry point exists** (if not, clear error with tried paths)
3. If entry point is a directory, resolve to `dir/index.vf`
4. Parse entry point → add to cache
5. Extract imports from parsed module
6. For each import path:
   - Resolve to absolute path
   - If not in cache: parse it, add to cache, queue for import discovery
7. Repeat step 5-6 until no new modules discovered
8. Return complete module cache

**Entry Point Validation:**
- If entry point doesn't exist, error with: "Entry point not found: src/main.vf\n  Tried: src/main.vf, src/main/index.vf"
- Entry point parse errors included in error collection

**Error Collection Strategy:**
- **Collect all errors before reporting** (not fail-fast)
- Continue discovering modules even if some fail to parse
- Collect parse errors, missing file errors, permission errors
- Report all errors together at the end
- Allows users to fix multiple issues in one iteration

**Helpful Error Messages:**
- Missing files: Suggest similar filenames (typo detection)
- Parse errors: Show exact location and context
- Permission errors: Include full path and permissions info
- Invalid paths: Explain what was expected

**Key Decisions:**
- Cache keyed by **real paths** after symlink resolution (prevents duplicates)
- Relative paths resolved immediately to absolute using Phase 1.5 utilities
- Symlinks resolved to real paths before caching
- File reading and parsing happen here
- Error collection (not fail-fast) enables better user experience

### Phase 3: Module Graph Construction

**Goal:** Build dependency graph from parsed AST modules with proper edge tracking and import conflict detection

**Deliverables:**
- Create `packages/core/src/module-resolver/` directory
- `ModuleGraph` class with nodes (modules) and edges (imports)
- `ModuleGraphBuilder` to extract imports from `Module` AST nodes
- **Dual import edge handling** (mixed type-only and value imports)
- **Re-export tracking** (re-exports create dependency edges)
- **[NEW]** Import conflict detection (duplicates, shadowing)
- **[NEW]** Circular re-export handling
- Tests for graph construction including edge cases

**Design:**
```typescript
// Edge stores import location for warning messages
type DependencyEdge = {
  to: string;           // Target module path
  isTypeOnly: boolean;  // Type-only import?
  importLoc: Location;  // Source location of import statement (for warnings)
};

class ModuleGraph {
  private edges: Map<string, DependencyEdge[]>;  // from → edges[]

  addModule(path: string): void
  addDependency(from: string, to: string, isTypeOnly: boolean, loc: Location): void
  getDependencyEdges(from: string): DependencyEdge[]
  getTopologicalOrder(): string[]
  getDependencies(path: string): string[]
  hasCycle(): boolean
}
```

**Dual Import Edge Handling:**
When a module has both type-only and value imports from the same source:
```typescript
import type { TypeA } from "./mod"  // Type-only edge
import { valueB } from "./mod"      // Value edge
```
- Create **single edge** marked as value import (value subsumes type)
- Edge is considered value import if ANY import is value
- This ensures cycle detection works correctly

**Re-Export Tracking:**
```typescript
export { x } from "./other"  // Creates dependency edge
export * from "./other"      // Creates dependency edge
```
- Re-exports treated as dependencies for cycle detection
- Edge tracked as value import (conservative approach)
- Necessary for detecting cycles through re-exports

**Re-Export Name Conflict Detection:**
Per spec (08-modules.md:540-549), wildcard re-export name conflicts are compile-time errors:
```typescript
export * from './array';  // exports `map`
export * from './list';   // also exports `map` - ERROR!
```
- During graph construction, track exported names per module
- For wildcard re-exports, collect all re-exported names
- Detect name conflicts (same name from multiple sources)
- Generate compile-time error: "Name conflict in re-exports: 'map' is exported from both './array' and './list'"

**[NEW] Import Conflict Detection:**
Detect duplicate imports and import/local shadowing as compile-time errors:

```typescript
// Duplicate import from different modules → ERROR
import { x } from './a';
import { x } from './b';  // Error: Duplicate import of 'x'

// Import shadowed by local declaration → ERROR
import { x } from './a';
let x = 1;  // Error: Import 'x' is shadowed by local declaration
```

**Detection Algorithm:**
1. During graph construction, track imported names per module
2. For each import statement:
   - Check if name already imported from different module → error
   - Check if name conflicts with local declaration → error
3. Exception: Same name imported multiple times from SAME module → deduplicate (not error)
4. Exception: Function parameters shadow imports → allowed (different scope)

**Error Messages:**
```
Error: Duplicate import of 'x'
  at src/main.vf:1:1:
    import { x } from './a';
  and src/main.vf:2:1:
    import { x } from './b';

Error: Import 'x' is shadowed by local declaration
  at src/main.vf:3:1:
    let x = 1;
  Import was at src/main.vf:1:1:
    import { x } from './a';
```

**[NEW] Circular Re-Export Handling:**
Ensure circular re-exports don't cause infinite loops:
```typescript
// a.vf
export * from './b';

// b.vf
export * from './a';  // Cycle!
```

**Behavior:**
- Re-exports create dependency edges (detected as cycle)
- Warn with VF5900 but don't infinite loop
- Each module resolved once (break cycle at second visit)
- Mark edge as "re-export" for cycle message clarity

**Key Decisions:**
- Graph nodes are absolute **real file paths** (symlinks resolved)
- Edges track whether import is type-only
- Mixed imports (type + value) create value edge
- Re-exports create dependency edges
- Handles named imports, wildcard imports, re-exports
- Pure data structure (no I/O)

### Phase 4: Circular Dependency Detection

**Goal:** Detect ALL cycles using Tarjan's strongly connected components algorithm

**Deliverables:**
- `CircularDependencyDetector` class
- **Tarjan's SCC algorithm** for finding all strongly connected components
- Distinction between type-only and value cycles
- Cycle path extraction for each SCC (for warning messages)
- **Self-import detection** (module importing itself)
- Tests for various cycle patterns including multiple cycles

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

**Algorithm - Tarjan's SCC:**
- **Finds all strongly connected components** in O(V+E) time
- Each SCC represents a group of mutually reachable modules (cycle)
- Reports ALL cycles in the graph (not just first one)
- Single-node SCCs without self-edges are not cycles
- Self-imports (A → A) detected as 1-node SCC with self-edge

**Self-Import Handling:**
- Self-imports (module importing itself) are **compile-time ERRORS** (not warnings)
- Self-import creates 1-node SCC with self-edge in Tarjan's algorithm
- Generate clear error message: "Module cannot import itself: [path]"
- Rationale: Self-imports serve no useful purpose and indicate a mistake

**Type-Only vs Value Cycles:**
- Type-only cycle: **ALL** edges in cycle use `import type`
- Value cycle: **at least ONE** edge imports values/functions
- Mixed cycles (some type-only, some value) are value cycles
- Type-only cycles don't trigger warnings (safe at runtime)

**Deterministic Cyclic Order:**
- When returning modules in SCC, sort alphabetically by absolute path
- Ensures reproducible builds (same input → same compilation order)
- Modules within a cycle are compiled in alphabetical order

**Why Tarjan's Algorithm:**
- Finds ALL cycles in one pass (better than finding one at a time)
- Same O(V+E) complexity as simple DFS
- Better user experience (see all problems at once)
- Standard algorithm for SCC detection

### Phase 5: Warning Generation

**Goal:** Generate spec-compliant, helpful warning messages using unified diagnostic system

**Deliverables:**
- Warning message generation per `docs/spec/08-modules.md:221-233`
- **Use VF5900** for circular dependencies
- Include cycle path visualization in message template parameters
- Provide actionable suggestions in hint template
- **Snapshot tests** for warning format regression prevention
- Tests for message formatting

**Warning Format (using VibefunDiagnostic.format()):**
```
warning[VF5900]: Circular dependency detected: src/moduleA.vf → src/moduleB.vf → src/moduleA.vf
  --> src/moduleA.vf:1:1
   |
 1 | import { functionB } from './moduleB';
   | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
 = hint: Consider restructuring modules to break the cycle
```

**Implementation:**
```typescript
const warning = createDiagnostic("VF5900", importLoc, {
  cycle: "src/moduleA.vf → src/moduleB.vf → src/moduleA.vf"
});
warningCollector.add(warning);
```

**Key Points:**
- Use `createDiagnostic("VF5900", ...)` for circular dependency warnings
- Use `createDiagnostic("VF5901", ...)` for case sensitivity warnings
- Cycle path passed as template parameter `{cycle}`
- `VibefunDiagnostic.format(source)` handles source context display
- **Snapshot tests** ensure format doesn't regress

**Module Warning Codes:**
- `VF5900`: Circular dependency (value cycle)
- `VF5901`: Case sensitivity mismatch (cross-platform safety)

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
  compilationOrder: string[]       // Topologically sorted module paths
  warnings: VibefunDiagnostic[]    // Circular dependency warnings (via WarningCollector)
  graph: ModuleGraph               // Dependency graph (for debugging/tooling)
  modules: Map<string, Module>     // All loaded modules
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

**Goal:** Ensure correctness and robustness with extensive edge case coverage

**Unit Tests for Each Component:**
- `ModuleGraph`: add modules, add dependencies, query graph
- `CircularDependencyDetector`: various cycle patterns with Tarjan's
- Warning generation: use `expectWarning()` for VF5900/VF5901 validation
- Path resolution: relative to absolute, normalization, symlinks
- Module loader: discovery, caching, error collection

**Cycle Detection Test Cases:**
- Simple cycles (A → B → A)
- Complex cycles (A → B → C → D → A)
- **Self-imports** (A → A)
- Type-only cycles (should not warn)
- Mixed cycles (some type-only edges, some value edges)
- **Multiple independent cycles** (detect all, not just first)
- **Re-exports in cycles** (A exports from B, B exports from C, C imports A)
- **Long cycles** (10+ modules)
- No cycles (topological sort correctness)

**Path Resolution Edge Cases:**
- **Symlinks** (same module via symlink and real path)
- **Circular symlinks** (should error)
- **Case sensitivity** (cross-platform testing, VF5901 warning)
- Path normalization (`./a/../b` → `./b`)
- **Empty modules** (modules with no imports/exports)
- **Unicode in file paths** (non-ASCII characters)
- **Very deep import chains** (100+ levels)
- **Index file precedence** (`foo.vf` vs `foo/index.vf`)
- **[NEW]** Package imports (`@vibefun/std`, `@org/package`)
- **[NEW]** node_modules search up directory tree
- **[NEW]** vibefun.json path mappings
- **[NEW]** Path mapping with wildcards (`@/*` → `./src/*`)
- **[NEW]** Missing vibefun.json (graceful handling)
- **[NEW]** Invalid vibefun.json (clear error)

**Error Handling Tests:**
- **Missing imports** (file doesn't exist)
- **Parse errors during loading** (malformed .vf files)
- **Permission errors** (unreadable files)
- **Malformed paths** (invalid path syntax)
- **Error collection** (multiple errors reported together)
- **Typo suggestions** (suggest similar filenames)
- **[NEW]** Duplicate imports from different modules → error
- **[NEW]** Duplicate import from same module → deduplicate (allowed)
- **[NEW]** Import shadowed by let declaration → error
- **[NEW]** Import shadowed by function parameter → allowed (different scope)
- **[NEW]** Circular re-exports → warning (not infinite loop)
- **[NEW]** Package not found → clear error with search paths
- **[NEW]** Package exists but no .vf entry point → error

**Performance Tests:**
- **1000-module graph** (cycle detection speed)
- **Wide imports** (one module imports 100 modules)
- **Deep hierarchies** (100 levels of nesting)
- Verify O(V+E) complexity in practice

**Runtime Behavior Tests (DEFERRED - blocked on code generator):**
Instead of implementing runtime tests now, create a design doc:
- Create `.claude/design/runtime-integration-tests.md`
- Document test scenarios for when code generator is ready:
  - Cyclic module initialization order
  - Deferred initialization semantics
  - Type-only cycles at runtime
  - Module singleton semantics
  - Error propagation during init
- Define expected JavaScript output patterns
- Define Node.js test harness approach

**Test Infrastructure (Dual Approach):**

*Fixture-based tests (version controlled):*
- Create `packages/core/src/module-loader/__fixtures__/`
- Pre-made test modules for common patterns:
  - `simple-import/` - Basic A imports B
  - `diamond-dependency/` - A → B,C → D
  - `type-only-cycle/` - Safe circular type imports
  - `value-cycle/` - Unsafe circular value imports

*Temp directory tests (isolation for edge cases):*
- Use Node.js `fs.mkdtempSync()` for test isolation
- Create symlinks, set permissions dynamically
- Clean up after each test
- Use for: symlink tests, permission tests, Unicode paths, case sensitivity

**Integration Tests:**
- Realistic multi-module programs
- Mixed safe/unsafe patterns
- Example programs demonstrating best practices

**Example Programs:**
- `examples/module-resolution/safe-types/` - Type-only circular imports
- `examples/module-resolution/unsafe-values/` - Value circular imports
- `examples/module-resolution/lazy-eval/` - Safe lazy evaluation pattern
- `examples/module-resolution/complex-cycle/` - Multi-module cycle

**Target:** 90%+ test coverage for all new code

### Phase 7.5: Integration Testing

**Goal:** Verify module resolution integrates correctly with other compiler phases

**Type Checker Integration:**
- Test forward references in cycles
  - Module A uses type from Module B
  - Module B uses type from Module A
  - Type checker should handle gracefully
- Test type-only cycles don't cause type errors
- Test value cycles with proper type checking
- Verify types resolved across modules in correct order

**Code Generator Integration:**
- Test module initialization order in generated JavaScript
- Verify generated JS handles cycles correctly
- Test that initialization happens in dependency order (where possible)
- Verify runtime behavior matches spec
  - Modules initialized exactly once
  - Dependencies fully initialized before dependents
  - Cycles work with deferred initialization

**Desugarer Integration:**
- Verify desugaring happens in dependency order
- Test sugar in cyclic modules handled correctly
- Ensure desugared ASTs maintain module structure
- Verify transformations don't break module graph

**End-to-End Compilation Tests:**
- Compile complete multi-module programs from .vf to .js
- Run generated JavaScript with Node.js
- Verify output correctness
- Test example programs from docs compile and run
- Verify warnings appear but don't halt compilation
- Test programs with and without circular dependencies

**Test Cases:**
- Multi-file program with no cycles (should compile cleanly)
- Multi-file program with type-only cycles (should compile with no warnings)
- Multi-file program with value cycles (should compile with warnings)
- Complex program using all module features (imports, exports, re-exports)
- Program with shared dependencies (diamond pattern)

**Success Criteria:**
- Module resolution integrates seamlessly with existing phases
- No regressions in existing tests
- End-to-end compilation works for multi-file programs
- Generated JavaScript executes correctly
- All integration tests pass

### Phase 8: Documentation

**Goal:** Document the module resolution system and create user-facing guides

**Deliverables:**

**1. Error and Warning Code Documentation:**
- Note: Documentation is auto-generated from `DiagnosticDefinition` objects
- Run `npm run docs:errors` to generate from registry
- Verify generated docs for module codes (VF5xxx) are complete:
  - **VF5900: Circular dependency (value cycle)**
  - **VF5901: Case sensitivity mismatch**
  - VF5000-VF5005: Import/entry point errors
  - VF5100-VF5101: Export errors

**2. User Guide - Module Resolution:**
- Create `docs/guides/module-resolution.md`
  - How Vibefun finds imported modules
  - Resolution algorithm details (file vs directory, precedence)
  - Extension resolution rules (.vf optional)
  - Index file conventions
  - Symlink handling
  - Cross-platform considerations
  - Search order for packages (when implemented)
  - Troubleshooting common issues

**3. User Guide - Fixing Circular Dependencies:**
- Create `docs/guides/fixing-circular-dependencies.md`
  - Why circular dependencies are problematic
  - When are they acceptable (type-only cycles)
  - Detailed refactoring patterns:
    - **Lazy evaluation** (wrap in functions)
    - **Extract shared module** (break cycle)
    - **Dependency injection** (invert dependencies)
    - **Event emitters** (decouple modules)
  - Examples of each pattern in Vibefun
  - Before/after code samples
  - Best practices for module organization

**4. Architecture Documentation:**
- Update `docs/architecture/compiler-architecture/02-compilation-pipeline.md`
  - Add module loader and resolver phases
  - Document position in pipeline
  - Explain separation between loader (I/O) and resolver (pure logic)
  - Document module graph structure (high-level)
  - Describe Tarjan's SCC algorithm (high-level)
  - Explain type-only vs value cycle distinction
  - Include diagrams if helpful
  - Keep it high-level (architecture, not implementation)

**5. Package and Spec Updates:**
- Rename `packages/stdlib` package.json name from `@vibefun/stdlib` to `@vibefun/std`
- Update all internal imports across the monorepo
- Update spec `docs/spec/08-modules.md` examples to use `@vibefun/std`
- Module resolution: standard node_modules lookup for `@vibefun/*` (no special handling)

**Do NOT:**
- Update root CLAUDE.md (per documentation rules)
- Document implementation details in architecture docs
- Include status indicators or progress tracking

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
- ~~npm package resolution (node_modules, package.json)~~ **[NOW IN SCOPE]**
- Source map support for module boundaries
- Module preloading or lazy loading
- npm package.json `main`/`exports` field parsing (use simple .vf resolution)

## Dependencies

- Existing diagnostic infrastructure (`packages/core/src/diagnostics/`)
  - `VibefunDiagnostic` class, `WarningCollector`, factory functions
  - Module codes already defined: VF5000-VF5101, VF5900-VF5901
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
- Diagnostic System: `packages/core/src/diagnostics/` (README.md for usage guide)
- Module Codes: `packages/core/src/diagnostics/codes/modules.ts`
- Parser Architecture: `packages/core/src/parser/CLAUDE.md`
- AST Types: `packages/core/src/types/ast.ts`

---

## Audit Amendments Summary (2025-11-24)

This plan was audited and the following scope expansions were approved:

| Amendment | Description | Phase |
|-----------|-------------|-------|
| Package imports | node_modules lookup for `@vibefun/std`, `@org/package` | 1.5 |
| Path mappings | vibefun.json `compilerOptions.paths` support | 1.5 |
| Case sensitivity | VF5901 warning for cross-platform safety | 1.5, 5 |
| Import conflicts | Duplicate imports and shadowing as compile errors | 3 |
| Circular re-exports | Detect and warn, don't infinite loop | 3, 4 |

**New Files Added:**
- `packages/core/src/module-loader/package-resolver.ts`
- `packages/core/src/module-loader/config-loader.ts`
- `docs/guides/vibefun-json.md`

**Key Decisions from Audit:**
- Import name validation (checking exported names exist) is the **type checker's** responsibility, not module resolution
- This matches TypeScript's approach and maintains clean separation of concerns
