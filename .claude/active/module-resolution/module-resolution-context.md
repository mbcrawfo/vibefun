# Module Resolution Context

**Created:** 2025-11-23
**Last Updated:** 2025-11-24

## Key Files

### Specification
- `docs/spec/08-modules.md` - Complete module system specification
  - Lines 124-300: Module initialization order
  - Lines 156-244: Circular dependency handling semantics
  - Lines 221-233: Compiler warning format and requirements

### Existing Infrastructure
- `packages/core/src/utils/error.ts` - Error system (template for warnings)
- `packages/core/src/types/ast.ts:365-369` - `Module` AST type
- `packages/core/src/types/ast.ts:323-329` - Import/export declaration types
- `packages/core/src/types/ast.ts:352-356` - `ImportItem` type

### New Files (To Be Created)
- `packages/core/src/utils/warning.ts` - Warning system (Phase 1)
- `packages/core/src/module-loader/path-resolver.ts` - Path resolution utilities (Phase 1.5)
- `packages/core/src/module-loader/module-loader.ts` - Module discovery and loading (Phase 2)
- `packages/core/src/module-resolver/module-graph.ts` - Dependency graph (Phase 3)
- `packages/core/src/module-resolver/cycle-detector.ts` - Tarjan's SCC algorithm (Phase 4)
- `packages/core/src/module-resolver/warning-generator.ts` - Warning formatting (Phase 5)
- `packages/core/src/module-resolver/index.ts` - Public API (Phase 6)
- `docs/compiler/error-codes.md` - Error code documentation (Phase 8)
- `docs/compiler/warning-codes.md` - Warning code documentation (Phase 8)
- `docs/guides/module-resolution.md` - User guide for module resolution (Phase 8)
- `docs/guides/fixing-circular-dependencies.md` - User guide for fixing cycles (Phase 8)

### Parser Architecture
- `packages/core/src/parser/CLAUDE.md` - Modular parser design with dependency injection
- `packages/core/src/parser/parse-expressions.ts` - Example of parser structure
- `packages/core/src/parser/parse-patterns.ts` - Example of parser structure

## Current State

### What Exists
- ✅ AST types for modules, imports, exports
- ✅ Parser can produce `Module` nodes
- ✅ Mature error infrastructure with location tracking
- ✅ Comprehensive module specification in docs
- ✅ Test infrastructure (Vitest)

### What Doesn't Exist
- ❌ Module resolution system (greenfield implementation)
- ❌ Warning infrastructure (only errors exist)
- ❌ Multi-file compilation support
- ❌ Module graph construction
- ❌ Circular dependency detection
- ❌ CLI support for multiple files

## Design Decisions

### 1. Separation of Module Loader and Module Resolver

**Decision:** Implement two separate components with distinct responsibilities:
- **ModuleLoader**: Discovery, file I/O, parsing, caching
- **ModuleResolver**: Pure graph analysis, cycle detection, warnings

**Rationale:**
- **Testability**: Module resolver is pure (no I/O), dramatically easier to test
- **Single Responsibility**: Each component does one thing well
- **Reusability**: Module resolver works with modules from any source (files, memory, network)
- **Flexibility**: Can swap in different loaders (FileLoader, MemoryLoader, TestLoader)
- **Future-proof**: Enables in-memory compilation (REPL), virtual filesystems, incremental compilation
- **Clear dependencies**: Module resolver only depends on AST types, not filesystem

**Alternative Considered:** Single component that does everything (discovery + analysis)
**Rejected Because:**
- Mixed concerns (I/O + graph algorithms)
- Hard to test (requires filesystem mocking)
- Limited reusability (can't use for in-memory modules)
- More dependencies (couples graph analysis to file I/O)

**How They Work Together:**
```typescript
// Example: Multi-file compilation
const entryPoint = 'src/main.vf';

// Step 1: Module Loader discovers & parses all modules
const modules = loadModules(entryPoint);
// Handles: main.vf imports file1.vf, file1.vf imports file3.vf,
//          file2.vf also imports file3.vf (only parsed once due to cache)

// Step 2: Module Resolver analyzes dependencies
const resolution = resolveModules(modules);
// Detects cycles, generates warnings, computes compilation order

// Step 3: Use results for compilation
for (const modulePath of resolution.compilationOrder) {
  const ast = resolution.modules.get(modulePath);
  // Desugar, type check, generate code...
}
```

**Benefits for Testing:**
```typescript
// Module resolver: easy to test (pure function, no I/O)
it('should detect circular dependencies', () => {
  const modules = new Map();
  modules.set('/A.vf', createModuleAST([importFrom('/B.vf')]));
  modules.set('/B.vf', createModuleAST([importFrom('/A.vf')]));

  const resolution = resolveModules(modules);
  expect(resolution.warnings).toHaveLength(1);
});

// Module loader: test with real or mocked filesystem
it('should discover transitive imports', () => {
  // Write test files or use in-memory filesystem
  const modules = loadModules('test/main.vf');
  expect(modules.size).toBe(3); // main, file1, file2
});
```

### 2. Warning System Design

**Decision:** Create `VibefunWarning` class parallel to `VibefunError`

**Rationale:**
- Reuse existing error formatting infrastructure
- Warnings don't halt compilation (key difference from errors)
- Consistent API for diagnostics
- Easy to extend in future (linting warnings, deprecation warnings, etc.)

**Alternative Considered:** Warnings as a subclass of errors
**Rejected Because:** Semantically different - errors halt compilation, warnings don't

### 3. Module Graph Representation

**Decision:** Graph nodes are absolute file paths, edges track import metadata

**Rationale:**
- Absolute paths avoid ambiguity across different working directories
- Edge metadata (type-only flag) needed for cycle detection
- Simple, efficient representation for graph algorithms
- Easy to serialize/debug

**Alternative Considered:** Nodes as Module AST objects
**Rejected Because:** Too heavyweight, paths are sufficient for graph analysis

### 4. Type-Only vs Value Cycles

**Decision:** Type-only circular imports don't trigger warnings

**Rationale:**
- Per spec: type-only imports don't run code at initialization
- Safe because types are erased at runtime
- Common pattern in complex type systems (TypeScript allows this)
- Reduces false positives

**Implementation:** Track `isTypeOnly` boolean on graph edges, cycle is type-only only if ALL edges are type-only

### 5. Topological Sort for Compilation Order

**Decision:** Return topologically sorted module list for type checking

**Rationale:**
- Type checker needs to process dependencies before dependents
- Topological sort gives valid ordering (if no cycles)
- For cyclic graphs: best-effort ordering, rely on type checker to handle forward references
- Standard algorithm (Kahn's or DFS-based)

### 6. Path Resolution Strategy

**Decision:** Resolve all relative paths to absolute paths immediately (in module loader)

**Rationale:**
- Eliminates ambiguity across different import contexts
- Easier to detect cycles (same module = same absolute path)
- Cross-platform compatibility using Node.js `path` module
- Matches how module loaders work (Node, bundlers)

**Edge Cases:**
- Handle `./`, `../`, absolute paths uniformly
- Normalize paths (remove `.`, `..` segments)
- Use platform-appropriate separators

### 7. Warning Message Format

**Decision:** Follow spec format (docs/spec/08-modules.md:221-233)

**Required Elements:**
1. "Warning: Circular dependency detected"
2. Cycle path with arrows: A → B → C → A
3. Source locations for import statements
4. Explanation of the danger
5. Actionable suggestions
6. Link to documentation

**Rationale:**
- Spec is prescriptive about format
- Helpful warnings reduce user frustration
- Suggestions guide users to solutions
- Consistency across all warnings

### 8. Module Loading and Resolution as Separate Phases

**Decision:** Module loading and resolution are distinct compilation phases

**Rationale:**
- Clean separation of concerns
- All modules must be discovered and parsed before analyzing dependencies
- Independent from lexing/parsing implementation details
- Can be tested in isolation
- Matches mental model: load all modules → analyze dependencies → compile

**Pipeline Position:**
```
Module Loading (recursive) → Module Resolution (graph analysis) → Desugar → Type Check → Generate
```

**Loading Phase:**
1. Parse entry point
2. Discover imports
3. Parse each import (recursively)
4. Repeat until no new modules
5. Result: `Map<string, Module>`

**Resolution Phase:**
1. Build dependency graph
2. Detect cycles
3. Generate warnings
4. Compute topological order
5. Result: `ModuleResolution`

### 9. Error Collection Strategy (NEW)

**Decision:** Module loader collects all errors before reporting (not fail-fast)

**Rationale:**
- Better user experience - fix multiple issues at once
- Continue discovering modules even if some fail to parse
- Report all errors together at the end
- Reduces iteration time for developers

**Implementation:**
- Collect parse errors, missing file errors, permission errors
- Store errors in array while continuing discovery
- After discovery complete, throw if any errors collected
- Each error includes file path and detailed context

**Alternative Considered:** Fail-fast on first error
**Rejected Because:** Forces users to fix errors one at a time, slower workflow

### 10. Symlink Resolution (NEW)

**Decision:** Follow Node.js/TypeScript symlink handling rules using `fs.realpathSync()`

**Rationale:**
- Industry standard approach (matches developer expectations)
- Prevents duplicate modules (symlink and original as different modules)
- Module cache keyed by real path ensures consistency
- Works correctly across platforms

**Implementation:**
- All paths resolved to real paths using `fs.realpathSync()`
- Module cache keyed by real path (not symlink path)
- Circular symlinks detected and reported as errors
- Symlinked file and original file treated as identical module

**Alternative Considered:** Don't resolve symlinks (use symlink paths directly)
**Rejected Because:** Causes duplicate module instances, breaks module singleton semantics

### 11. Index File Precedence (NEW)

**Decision:** Follow Node.js/TypeScript precedence - file before directory

**Rationale:**
- Industry standard (matches Node.js, TypeScript, bundlers)
- Predictable resolution behavior
- Explicit files take precedence over implicit directories
- Prevents ambiguity

**Resolution Algorithm:**
For `import "./foo"`:
1. Try `./foo.vf` (exact file) - **if exists, use this**
2. Try `./foo/index.vf` (directory with index) - **only if file doesn't exist**
3. Error if neither exists

**Alternative Considered:** Directory precedence over file
**Rejected Because:** Not standard, would confuse developers

### 12. Cycle Detection Algorithm (NEW)

**Decision:** Use Tarjan's Strongly Connected Components (SCC) algorithm

**Rationale:**
- Finds ALL cycles in one pass (not just first cycle)
- Better user experience (see all problems at once)
- Same O(V+E) complexity as simple DFS
- Standard algorithm for SCC detection
- Handles self-imports, multiple independent cycles

**Implementation:**
- Tarjan's algorithm finds all SCCs in graph
- Each SCC with 2+ nodes or self-edge is a cycle
- Report all cycles found (not just first)
- Extract meaningful cycle paths for warnings

**Alternative Considered:** Simple DFS with back-edge detection
**Rejected Because:** Only finds one cycle, requires multiple passes for all cycles

### 13. Warning Code System (NEW)

**Decision:** All warnings have unique codes (W001, W002, etc.)

**Rationale:**
- Easier documentation lookups ("what is W001?")
- Tool integration (parsers can recognize codes)
- Enables warning suppression by code (future)
- Matches error code systems (TypeScript, Rust, etc.)
- Professional, polished developer experience

**Implementation:**
- `VibefunWarning` class includes `code: string` property
- Warning registry maps codes to types
- `W001`: Circular dependency (value cycle)
- Future: W002, W003, etc.
- Documentation in `docs/compiler/warning-codes.md`

**Alternative Considered:** No warning codes
**Rejected Because:** Harder to document, search, and reference

### 14. Dual Import Edge Handling (NEW)

**Decision:** Mixed type-only and value imports create single value edge

**Rationale:**
- Simplifies graph structure (one edge per module pair)
- Conservative approach (value subsumes type)
- Correct cycle detection (if ANY import is value, cycle is value)
- Matches runtime behavior (value import loads module)

**Implementation:**
```typescript
import type { TypeA } from "./mod"  // Type-only edge initially
import { valueB } from "./mod"      // Upgrades edge to value

// Result: Single edge from current → "./mod", isTypeOnly = false
```

**Algorithm:**
- When adding edge, check if edge already exists
- If exists and new edge is value, upgrade to value
- If exists and both type-only, keep as type-only
- Value import always wins

**Alternative Considered:** Two separate edges (one type, one value)
**Rejected Because:** Complicates graph, cycle detection, and topological sort

## Implementation Patterns

### Parser Dependency Injection Pattern

The parser uses a pattern to avoid circular dependencies between parsing modules:

```typescript
// parse-expressions.ts
export function parseExpression(parser: ParserBase, ...): Expr {
  // Can call parser.parsePattern() via dependency injection
}

// parser.ts
class ParserBase {
  parsePattern: (parser: ParserBase, ...) => Pattern;
  parseExpression: (parser: ParserBase, ...) => Expr;

  constructor() {
    this.parsePattern = setParsePattern();
    this.parseExpression = setParseExpression();
  }
}
```

**Lesson:** This pattern could be useful if module resolver needs to be split into multiple files.

### Error Infrastructure Pattern

Errors support rich formatting with location information:

```typescript
class VibefunError extends Error {
  constructor(
    message: string,
    public location?: SourceLocation,
    public help?: string
  ) { }

  format(source: string): string {
    // Returns formatted error with source context
  }
}
```

**Lesson:** Warnings should follow same pattern for consistency.

## Open Questions

### 1. How to handle missing modules?

**Question:** What if `import { foo } from './missing'` references a file that doesn't exist?

**Answer:** Module loader throws an error (file not found) during the discovery phase. Module resolver assumes all modules in the input map exist and are valid.

**Responsibility:** Module loader handles file I/O errors. Module resolver handles logical errors (cycles).

### 2. Re-exports and cycles?

**Question:** Do re-exports (`export { foo } from './other'`) participate in cycles?

**Current Plan:** Yes, treat re-exports as dependencies (they import and export). Edge in graph from re-exporting module to imported module.

### 3. Wildcard imports?

**Question:** How to handle `import * as Foo from './foo'`?

**Current Plan:** Treated as value import (creates dependency edge, isTypeOnly = false). Conservative approach.

### 4. Should we detect "bad" initialization patterns?

**Question:** Beyond cycles, should we warn about module-level function calls?

```vibefun
import { dangerousFunction } from './other';
let result = dangerousFunction(); // Called during init!
```

**Current Plan:** Out of scope for this phase. Focus on circular dependency detection only. This could be a future linter rule.

### 5. Performance for large codebases?

**Question:** Will DFS scale to thousands of modules?

**Answer:** Yes, DFS is O(V+E), very efficient. TypeScript compiler handles tens of thousands of files. Not a concern for initial implementation.

## Testing Strategy

### Unit Tests
- `ModuleGraph`: add modules, add dependencies, query graph
- `CircularDependencyDetector`: various cycle patterns
- `VibefunWarning`: formatting, location tracking
- Path resolution: relative to absolute conversion

### Integration Tests
- Multi-module programs with realistic import patterns
- Examples from spec (lines 156-244)
- Edge cases: single module, empty graph, deeply nested imports

### Example Programs
Create in `examples/circular-deps/`:
- `safe-types.vf` - Type-only circular imports (no warning)
- `unsafe-values.vf` - Value circular imports (warning)
- `lazy-eval.vf` - Safe pattern using lazy evaluation
- `complex-cycle.vf` - Multi-module cycle (A→B→C→A)

## Future Enhancements (Out of Scope)

1. **Module Caching:** Cache parsed/resolved modules for faster recompilation
2. **Incremental Compilation:** Only re-resolve changed modules
3. **Module Bundling:** Combine modules into single output file
4. **Tree Shaking:** Dead code elimination across modules
5. **Package Resolution:** npm-style package imports (`import { foo } from 'package'`)
6. **Path Aliases:** Support for `@/utils` style imports
7. **Watch Mode:** Automatically recompile on file changes
8. **Linting:** Additional warnings for code quality (unused imports, etc.)

## Related Work

### TypeScript
- Allows type-only circular imports
- Warns about value circular dependencies in some cases
- Module resolution: Node-style, classical, bundler modes

### OCaml
- No circular dependencies allowed (compilation error)
- Forces refactoring to break cycles
- More strict than Vibefun

### F#
- Project files define compilation order explicitly
- No automatic cycle detection
- Requires manual ordering

**Vibefun's Approach:** Middle ground - allow cycles but warn about dangerous patterns.
