# Vibefun CLI Requirements Analysis

## Executive Summary

This document defines comprehensive requirements for the vibefun CLI, covering two primary usage scenarios:
1. **Manual single-file compilation** - Developer compiling individual `.vf` files
2. **Build tool integration** - Webpack, Vite, esbuild, and similar tools invoking the compiler

The CLI must orchestrate a complete compilation pipeline (lexer → parser → desugarer → typechecker → optimizer → codegen), handle multi-module projects with sophisticated module resolution, and provide structured error output suitable for both human consumption and programmatic parsing.

---

## Part 1: CLI Commands and Options

### 1.1 Core Commands

#### `vibefun compile <file> [options]`
Compile one or more `.vf` files to JavaScript.

**Arguments:**
- `<file>` - Entry point `.vf` file (required)

**Options:**
| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--output <path>` | `-o` | Output file/directory | `<input>.js` |
| `--outdir <dir>` | `-d` | Output directory for multi-file projects | `./dist` |
| `--source-map` | `-s` | Generate source maps | `false` |
| `--source-map-inline` | | Embed source map in output | `false` |
| `--runtime-checks <mode>` | | Type checking mode: `ffi`, `all`, `none` | `ffi` |
| `--optimize` | `-O` | Enable optimizations | `false` |
| `--no-optimize` | | Disable optimizations | |
| `--project <path>` | `-p` | Path to vibefun.json | auto-detect |
| `--emit <type>` | | Output type: `js`, `ast`, `typed-ast` | `js` |
| `--target <version>` | | ES target: `es2020`, `es2022`, etc. | `es2020` |
| `--watch` | `-w` | Watch mode for incremental compilation | `false` |

#### `vibefun check <file> [options]`
Type-check without generating output.

**Options:**
| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--project <path>` | `-p` | Path to vibefun.json | auto-detect |
| `--watch` | `-w` | Watch mode | `false` |
| `--strict` | | Stricter type checking | `false` |

#### `vibefun run <file> [options]`
Compile and immediately execute.

**Options:**
| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--` | | Arguments passed to program | none |
| `--no-optimize` | | Disable optimizations | |

#### `vibefun init [dir]`
Initialize a new vibefun project.

**Creates:**
- `vibefun.json` with default configuration
- `src/main.vf` starter file
- `.gitignore` with appropriate patterns

#### `vibefun fmt <file|dir> [options]`
Format vibefun source files (future).

#### `vibefun repl`
Interactive REPL (future).

### 1.2 Global Options

| Option | Short | Description |
|--------|-------|-------------|
| `--version` | `-v` | Print version and exit |
| `--help` | `-h` | Print help and exit |
| `--quiet` | `-q` | Suppress non-error output |
| `--verbose` | | Verbose output for debugging |
| `--color` | | Force color output |
| `--no-color` | | Disable color output |
| `--json` | | Output diagnostics as JSON (for tooling) |

---

## Part 2: Module Resolution Requirements

### 2.1 Resolution Algorithm

The CLI must implement the following resolution order:

1. **Relative imports** (`./` or `../` prefix):
   - Try: `<resolved-path>.vf`
   - Try: `<resolved-path>/index.vf`
   - Error if neither exists

2. **Path-mapped imports** (from `vibefun.json`):
   - Match against `compilerOptions.paths` patterns
   - Apply replacement and resolve as relative

3. **Package imports** (no prefix):
   - Search `node_modules/<package>.vf`
   - Search `node_modules/<package>/index.vf`
   - Walk up directory tree and repeat
   - Support scoped packages: `@org/package`

### 2.2 Module Graph Construction

Requirements for multi-module compilation:

- **Transitive discovery**: Starting from entry point, discover all transitively imported modules
- **Circular dependency detection**: Identify cycles and emit VF5900 warnings
- **Topological sorting**: Determine safe compilation order
- **Self-import detection**: Error on direct self-imports (VF5004)
- **Type-only import optimization**: Type-only imports don't create runtime dependencies

### 2.3 Configuration File Handling

**Project root detection:**
```
/project/src/utils/helpers.vf  (entry point)
        ↓ walk up
/project/src/utils/
/project/src/
/project/           → found vibefun.json ✓
```

**Fallback behavior:**
- If no `vibefun.json`, use `package.json` location as root
- If neither found, use entry file's directory

### 2.4 Case Sensitivity

- Emit VF5901 warning when import path case differs from filesystem
- Critical for cross-platform compatibility (macOS vs Linux)

---

## Part 3: Error Handling Requirements

### 3.1 Diagnostic Output Format

**Human-readable (default):**
```
error[VF4001]: Type mismatch
  --> src/main.vf:10:15
   |
10 | let result = compute() + "hello"
   |              ^^^^^^^^^
   |
   = expected: Int
   =      got: String
   |
   = hint: Use String.fromInt() for conversion
```

**JSON format (--json flag):**
```json
{
  "diagnostics": [
    {
      "code": "VF4001",
      "severity": "error",
      "message": "Type mismatch",
      "file": "src/main.vf",
      "line": 10,
      "column": 15,
      "endLine": 10,
      "endColumn": 24,
      "expected": "Int",
      "actual": "String",
      "hint": "Use String.fromInt() for conversion"
    }
  ],
  "errorCount": 1,
  "warningCount": 0
}
```

### 3.2 Error Code Ranges

| Range | Phase | Examples |
|-------|-------|----------|
| VF1xxx | Lexer | VF1001 unexpected char, VF1002 unterminated string |
| VF2xxx | Parser | VF2001 unexpected token, VF2002 missing expression |
| VF3xxx | Desugarer | VF3001 invalid pattern |
| VF4xxx | Type Checker | VF4001 type mismatch, VF4002 undefined variable |
| VF49xx | Type Warnings | VF4900 non-exhaustive match, VF4901 unreachable |
| VF5xxx | Modules | VF5001 module not found, VF5004 self-import |

### 3.3 Multi-Error Reporting

- Report up to **10 errors per file** before stopping
- Use **error types** to prevent cascading errors
- Report **independent errors** in parallel
- Maintain **deterministic order** (source order)

### 3.4 Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Compilation error(s) |
| 2 | CLI usage error (bad arguments) |
| 3 | Configuration error |
| 4 | I/O error (file not found, permissions) |
| 5 | Internal compiler error (bug) |

---

## Part 4: Build Tool Integration Requirements

### 4.1 Programmatic API

The `@vibefun/core` package must expose a stable API for build tools:

```typescript
// Single-file compilation
compileFile(path: string, options: CompileOptions): CompileResult

// Multi-file project compilation
compileProject(entryPoint: string, options: ProjectOptions): ProjectResult

// Check-only (no codegen)
checkFile(path: string, options: CheckOptions): CheckResult

// Incremental compilation support
createCompilerHost(): CompilerHost
```

### 4.2 CompileResult Interface

```typescript
interface CompileResult {
  success: boolean;
  code?: string;           // Generated JavaScript
  map?: string;            // Source map (if requested)
  diagnostics: Diagnostic[];
  dependencies: string[];  // Files this module depends on
  exports: ExportInfo[];   // What this module exports
}
```

### 4.3 Webpack Loader Usage Pattern

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.vf$/,
        use: 'vibefun-loader',
      }
    ]
  }
};
```

Requirements for loader implementation:
- Return compiled JavaScript with source maps
- Report dependency list for watch mode
- Stream errors through webpack's error channel
- Support loader options (runtime checks, optimization)

### 4.4 Vite Plugin Usage Pattern

```javascript
// vite.config.js
import vibefun from 'vite-plugin-vibefun';

export default {
  plugins: [vibefun()],
};
```

Requirements:
- Transform `.vf` files on demand
- Hot Module Replacement (HMR) support
- Proper error overlay integration
- Source map support for debugging

### 4.5 esbuild Plugin Usage Pattern

```javascript
const vibefunPlugin = require('esbuild-plugin-vibefun');

require('esbuild').build({
  entryPoints: ['src/main.vf'],
  bundle: true,
  plugins: [vibefunPlugin()],
});
```

Requirements:
- Fast, streaming compilation
- Namespace handling for `.vf` files
- Error reporting compatible with esbuild format

---

## Part 5: Watch Mode Requirements

### 5.1 File Watching Behavior

- Watch entry file and all transitively imported modules
- Detect new imports when files change
- Debounce rapid changes (100ms window)
- Clear screen and show compilation status

### 5.2 Incremental Compilation

- Only recompile changed files and their dependents
- Cache parsed ASTs and type information
- Invalidate cache when dependencies change
- Track file modification times

### 5.3 Watch Mode Output

```
[10:23:45] Starting compilation...
[10:23:45] Compiled 12 modules in 234ms
[10:23:45] Watching for changes...

[10:24:12] File changed: src/utils.vf
[10:24:12] Recompiling 3 modules...
[10:24:12] Compiled in 45ms

[10:25:01] File changed: src/main.vf
error[VF4001]: Type mismatch
  --> src/main.vf:15:3
   ...
[10:25:01] Compilation failed with 1 error

[10:25:30] File changed: src/main.vf
[10:25:30] Compiled in 23ms
```

---

## Part 6: Source Map Requirements

### 6.1 Source Map Format

- **Version 3** source maps (standard format)
- Support both external (`.js.map`) and inline
- Map generated JavaScript back to original `.vf` source
- Include original source content (optional, configurable)

### 6.2 Mapping Granularity

- Map each expression to source location
- Map function declarations
- Map pattern matching branches
- Preserve variable names where possible

### 6.3 Multi-File Projects

- Each output file has corresponding source map
- Maps reference original `.vf` files with relative paths
- Support `sourceRoot` for path prefixing

---

## Part 7: Test Scenarios

### 7.1 Single-File Compilation Scenarios

| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Basic compilation | `hello.vf` with `let x = 42` | `hello.js` with equivalent JS |
| Type error | `error.vf` with type mismatch | Error message, exit code 1 |
| Syntax error | `bad.vf` with parse error | Error at correct location |
| Empty file | `empty.vf` with no content | Valid but empty module |
| Unicode identifiers | `unicode.vf` with `let π = 3.14` | Proper JS output |
| Complex patterns | Pattern matching with guards | Correct runtime behavior |
| Output path | `-o dist/out.js` | File at specified path |
| Source maps | `--source-map` | `.js` + `.js.map` files |

### 7.2 Multi-Module Scenarios

| Scenario | Setup | Expected |
|----------|-------|----------|
| Simple import | A imports B | Both compiled, A loads B |
| Diamond dependency | A→B, A→C, B→D, C→D | D compiled once |
| Circular reference | A→B→A (functions only) | Warning VF5900, compiles |
| Circular value | A→B→A (top-level value) | Warning, may fail at runtime |
| Type-only cycle | A type-imports B, B type-imports A | No warning, works |
| Self-import | A imports A | Error VF5004 |
| Missing module | A imports nonexistent | Error VF5001 with suggestions |
| Case mismatch | Import `./Utils` for `./utils.vf` | Warning VF5901 |

### 7.3 Configuration Scenarios

| Scenario | Config | Expected |
|----------|--------|----------|
| Path mapping | `@/*: ./src/*` | `@/utils` resolves to `./src/utils.vf` |
| Multiple mappings | Two patterns match | First matching used |
| No config | No vibefun.json | Works with defaults |
| Invalid config | Malformed JSON | Error with helpful message |
| Nested project | Config in parent dir | Found and used |

### 7.4 Error Handling Scenarios

| Scenario | Input | Expected |
|----------|-------|----------|
| Multiple errors | File with 3 type errors | All 3 reported |
| Cascading prevention | Error then uses of error | Only original error |
| Error recovery | Parse error mid-file | Continue parsing after |
| Stack overflow | Deeply nested expression | Graceful error, not crash |
| File not found | Nonexistent path | Clear error message |
| Permission denied | Unreadable file | I/O error with path |
| Disk full | Write fails | I/O error, no partial output |

### 7.5 Watch Mode Scenarios

| Scenario | Action | Expected |
|----------|--------|----------|
| Initial compile | Start watch | All files compiled |
| Single file change | Edit one file | Only affected recompiled |
| Add import | Add new import statement | New file discovered, compiled |
| Remove import | Remove import | Dependency dropped |
| Introduce error | Add type error | Error shown, watching continues |
| Fix error | Correct the error | Success, output updated |
| Add new file | Create new .vf file | Picked up on import |
| Delete file | Remove imported file | Error, module not found |

### 7.6 Build Tool Integration Scenarios

| Scenario | Tool | Expected |
|----------|------|----------|
| Webpack build | webpack build | All .vf files compiled, bundled |
| Webpack dev | webpack serve | HMR works, errors in overlay |
| Vite dev | vite | Fast transforms, source maps work |
| Vite build | vite build | Optimized output |
| esbuild bundle | esbuild | Single bundle with .vf compiled |
| Concurrent access | Multiple tools | No file lock issues |

---

## Part 8: Edge Cases

### 8.1 Input Edge Cases

- **Empty file**: Should produce valid empty module
- **Only comments**: Same as empty
- **Very long lines**: Handle without truncation errors
- **Large files**: 100K+ lines should work (may be slow)
- **Binary content**: Clear error, not crash
- **Encoding issues**: Require UTF-8, reject invalid with error
- **BOM**: Handle UTF-8 BOM gracefully
- **Mixed line endings**: Handle CR, LF, CRLF
- **Trailing newline**: Optional, handle presence/absence

### 8.2 Path Edge Cases

- **Spaces in path**: `/path/to/my file.vf` must work
- **Unicode path**: `/path/to/文件.vf` must work
- **Symlinks**: Resolve correctly, detect cycles
- **Relative paths**: `./` and `../` from various depths
- **Absolute paths**: Handle on all platforms
- **Windows paths**: Handle backslashes and drive letters
- **Very long paths**: Handle near filesystem limits
- **Special characters**: Quotes, brackets, etc. in paths

### 8.3 Module Resolution Edge Cases

- **Package with `.vf` in name**: `my-package.vf` (not extension)
- **Directory named like file**: `utils/` and `utils.vf` both exist
- **Scoped package edge**: `@scope/` with special chars
- **Cyclic symlinks**: Detect and error
- **node_modules depth**: Very deep nesting
- **Workspace packages**: Monorepo with linked packages

### 8.4 Compilation Edge Cases

- **Deeply nested expressions**: 1000+ levels
- **Very long identifiers**: Handle at parser, unique in output
- **Maximum integer values**: Near JS number limits
- **Complex generics**: Many type parameters, deep nesting
- **Mutual recursion**: Many functions, type inference
- **Pattern complexity**: Many patterns, many guards

### 8.5 Output Edge Cases

- **Reserved words**: Output avoids JS reserved words
- **Name collisions**: Multiple same-name in different scopes
- **Unicode in strings**: Proper escaping in output
- **Large output**: Streaming for memory efficiency
- **Read-only output dir**: Clear error message
- **Existing output file**: Overwrite behavior

---

## Part 9: Non-Functional Requirements

### 9.1 Performance Targets

- **Cold start**: <100ms to first output for small files
- **Incremental**: <50ms for single-file recompilation
- **Memory**: <500MB for typical projects
- **Parallelization**: Use available CPU cores for multi-file

### 9.2 Compatibility

- **Node.js**: 18.x minimum, 20.x+ recommended
- **Platforms**: Windows, macOS, Linux
- **Terminal**: Support basic and advanced (color, cursor)
- **CI environments**: Detect and adjust output

### 9.3 Stability

- **No crashes**: All errors handled gracefully
- **Partial output**: Never leave partial files on error
- **Atomic writes**: Use temp files and rename
- **Signal handling**: Clean shutdown on SIGINT/SIGTERM

---

## Part 10: Future Considerations

### 10.1 Planned Features

- **REPL**: Interactive evaluation
- **Language server**: LSP for IDE integration
- **Formatter**: Code formatting tool
- **Package manager**: Dependency management
- **Playground**: Web-based try-it environment

### 10.2 Integration Points

- **LSP messages**: Diagnostics format compatible with LSP
- **IDE extensions**: VS Code, JetBrains, Vim/Neovim
- **CI tools**: GitHub Actions, GitLab CI, CircleCI
- **Linters**: ESLint integration for JS output
- **Bundlers**: Tree-shaking compatibility

---

## Summary

This requirements document covers:
- **11 CLI commands/options** with detailed specifications
- **3-level module resolution** (relative, mapped, package)
- **Structured error handling** with JSON output for tooling
- **Build tool integration** patterns for webpack/vite/esbuild
- **Watch mode** with incremental compilation
- **Source maps** for debugging support
- **50+ test scenarios** across various categories
- **25+ edge cases** to handle robustly
- **Non-functional requirements** for performance and stability

The CLI implementation should prioritize:
1. Correct error output (most important for DX)
2. Module resolution accuracy
3. Build tool integration API
4. Watch mode for development workflow
5. Source maps for debugging
