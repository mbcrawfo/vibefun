# Module Resolution Context

**Created:** 2025-11-23
**Last Updated:** 2025-11-23

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

### 1. Warning System Design

**Decision:** Create `VibefunWarning` class parallel to `VibefunError`

**Rationale:**
- Reuse existing error formatting infrastructure
- Warnings don't halt compilation (key difference from errors)
- Consistent API for diagnostics
- Easy to extend in future (linting warnings, deprecation warnings, etc.)

**Alternative Considered:** Warnings as a subclass of errors
**Rejected Because:** Semantically different - errors halt compilation, warnings don't

### 2. Module Graph Representation

**Decision:** Graph nodes are absolute file paths, edges track import metadata

**Rationale:**
- Absolute paths avoid ambiguity across different working directories
- Edge metadata (type-only flag) needed for cycle detection
- Simple, efficient representation for graph algorithms
- Easy to serialize/debug

**Alternative Considered:** Nodes as Module AST objects
**Rejected Because:** Too heavyweight, paths are sufficient for graph analysis

### 3. Type-Only vs Value Cycles

**Decision:** Type-only circular imports don't trigger warnings

**Rationale:**
- Per spec: type-only imports don't run code at initialization
- Safe because types are erased at runtime
- Common pattern in complex type systems (TypeScript allows this)
- Reduces false positives

**Implementation:** Track `isTypeOnly` boolean on graph edges, cycle is type-only only if ALL edges are type-only

### 4. Topological Sort for Compilation Order

**Decision:** Return topologically sorted module list for type checking

**Rationale:**
- Type checker needs to process dependencies before dependents
- Topological sort gives valid ordering (if no cycles)
- For cyclic graphs: best-effort ordering, rely on type checker to handle forward references
- Standard algorithm (Kahn's or DFS-based)

### 5. Path Resolution Strategy

**Decision:** Resolve all relative paths to absolute paths immediately

**Rationale:**
- Eliminates ambiguity across different import contexts
- Easier to detect cycles (same module = same absolute path)
- Cross-platform compatibility using Node.js `path` module
- Matches how module loaders work (Node, bundlers)

**Edge Cases:**
- Handle `./`, `../`, absolute paths uniformly
- Normalize paths (remove `.`, `..` segments)
- Use platform-appropriate separators

### 6. Warning Message Format

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

### 7. Module Resolver as Separate Phase

**Decision:** Module resolution is a distinct compilation phase after parsing

**Rationale:**
- Clean separation of concerns
- All modules must be parsed before building graph
- Independent of lexing/parsing logic
- Can be tested in isolation
- Matches mental model: parse, then analyze dependencies

**Pipeline Position:**
```
Parse All Modules → Resolve Modules → Desugar → Type Check → Generate
```

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

**Current Plan:** This is a separate error (file not found), not part of circular dependency detection. Module resolver assumes all modules in the input map exist.

**Future:** File resolution layer before module resolution.

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
