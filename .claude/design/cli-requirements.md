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
- `<file>` - Entry point `.vf` file (required), or `-` for stdin, or glob pattern

**Input Modes:**
- Single file: `vibefun compile src/main.vf`
- Stdin: `vibefun compile -` (reads source from stdin, requires `-o`)
- Glob pattern: `vibefun compile 'src/**/*.vf'` (compiles all matching files)

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
| `--exclude <pattern>` | | Glob pattern to exclude (repeatable) | none |
| `--dry-run` | | Show what would be compiled without compiling | `false` |
| `--parallel` | | Compile independent modules in parallel | `true` |
| `--stdout` | | Write output to stdout (single file only) | `false` |

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

### 1.3 Option Behavior Specifications

#### `--strict` Mode

When `--strict` is enabled on the `check` command:

| Behavior | Default | Strict |
|----------|---------|--------|
| Unused variables | Warning (VF4902) | Error |
| Unused imports | Warning (VF5902) | Error |
| Implicit unit return | Allowed | Warning (VF4904) |
| Non-exhaustive match | Warning (VF4900) | Error |
| Missing type annotations on exports | Allowed | Warning |

#### `--runtime-checks` Modes

| Mode | What's Checked | Performance Impact |
|------|----------------|-------------------|
| `none` | Nothing at runtime | Fastest |
| `ffi` (default) | External function boundaries only | Minimal (~1-2%) |
| `all` | All function calls, pattern matches, field access | Significant (~10-20%) |

**FFI mode checks:**
- Values crossing `external` declaration boundaries
- Results from unsafe blocks
- JavaScript values passed to Vibefun callbacks

**All mode additionally checks:**
- Every function application matches expected arity
- Every pattern match has valid input
- Every record field access exists
- Every variant construction has correct payload

#### `--emit` Output Formats

| Format | Description | Use Case |
|--------|-------------|----------|
| `js` (default) | JavaScript + optional source map | Production |
| `ast` | Surface AST as JSON | Tooling, debugging parser |
| `typed-ast` | Core AST with type annotations as JSON | Tooling, debugging typechecker |

**AST JSON format:**
```json
{
  "version": "1.0",
  "sourceFile": "src/main.vf",
  "ast": { ... },
  "locations": true
}
```

**Typed-AST includes:**
- Core AST (after desugaring)
- Inferred types on all expressions
- Resolved type variables
- Type environment at each scope

#### `--target` ES Versions

| Target | Features Available | Minimum Runtime |
|--------|-------------------|-----------------|
| `es2020` (default) | Optional chaining, nullish coalescing, BigInt | Node 14+, modern browsers |
| `es2022` | Top-level await, class fields, `.at()` | Node 16+, modern browsers |
| `esnext` | Latest ES features | Latest Node, latest browsers |

**Code generation differences:**
- Lower targets may use polyfill patterns
- Higher targets use native syntax when available
- All targets use ES modules (`import`/`export`)

#### `--verbose` Output Levels

| Flag | Output Shown |
|------|--------------|
| (none) | Errors, warnings, success message |
| `--quiet` | Errors only (no warnings, no success) |
| `--verbose` | Above + timing per phase, files processed, cache hits |

**Verbose output example:**
```
[lexer]     src/main.vf      2ms
[parser]    src/main.vf      5ms
[desugar]   src/main.vf      1ms
[typecheck] src/main.vf     12ms (cache miss)
[codegen]   src/main.vf      3ms
Total: 23ms (1 file, 0 cached)
```

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

### 3.2 Error Code Catalog

#### 3.2.1 Lexer Errors (VF1xxx)

| Code | Error | Description |
|------|-------|-------------|
| VF1001 | Unexpected character | Character not valid in any token context |
| VF1002 | Unterminated string | String literal missing closing quote |
| VF1003 | Invalid escape sequence | Unknown escape like `\q` in string |
| VF1004 | Invalid numeric literal | Malformed number like `0x` or `1.2.3` |
| VF1005 | Unexpected end of file | EOF in middle of token (string, comment) |
| VF1006 | Invalid character in identifier | Identifier contains invalid Unicode category |
| VF1007 | Unterminated block comment | `/*` without matching `*/` |
| VF1008 | Number too large | Integer exceeds JavaScript safe integer range |
| VF1009 | Invalid Unicode escape | `\u{...}` with invalid code point |

#### 3.2.2 Parser Errors (VF2xxx)

| Code | Error | Description |
|------|-------|-------------|
| VF2001 | Unexpected token | Token not valid in current context |
| VF2002 | Missing expression | Expression expected but not found |
| VF2003 | Invalid pattern syntax | Malformed pattern in match/let |
| VF2004 | Duplicate parameter | Function has repeated parameter name |
| VF2005 | Missing required clause | Missing `else` in `if`, missing `then`, etc. |
| VF2006 | Invalid import syntax | Malformed import statement |
| VF2007 | Invalid export syntax | Malformed export statement |
| VF2008 | Unexpected keyword | Keyword used in expression position |
| VF2009 | Invalid operator usage | Operator missing operand or misused |
| VF2010 | Missing closing delimiter | Unclosed `(`, `[`, `{`, or similar |
| VF2011 | Invalid type syntax | Malformed type annotation |
| VF2012 | Duplicate field name | Record literal has repeated field |

#### 3.2.3 Desugarer Errors (VF3xxx)

| Code | Error | Description |
|------|-------|-------------|
| VF3001 | Invalid pattern | Pattern not valid in context |
| VF3002 | Invalid binding in let | Let binding pattern is invalid |
| VF3003 | Invalid guard expression | Guard is not a boolean expression |
| VF3004 | Invalid or-pattern binding | Or-pattern arms bind different variables |

#### 3.2.4 Type Checker Errors (VF4xxx)

| Code | Error | Description |
|------|-------|-------------|
| VF4001 | Type mismatch | Expected type differs from actual type |
| VF4002 | Undefined variable | Variable not in scope |
| VF4003 | Occurs check failed | Infinite type detected (e.g., `'a = List<'a>`) |
| VF4004 | No such field | Record access on non-existent field |
| VF4005 | Duplicate record field | Record type has repeated field name |
| VF4006 | Wrong arity | Function/variant called with wrong argument count |
| VF4007 | Ambiguous type | Type cannot be inferred, annotation required |
| VF4008 | Rigid type escape | Type variable escapes its scope |
| VF4009 | Invalid dereference | `!` applied to non-Ref type |
| VF4010 | Invalid assignment | `:=` applied to non-Ref type |
| VF4011 | Value restriction | Polymorphic value with mutable reference |
| VF4012 | Cannot unify | Types are incompatible and cannot be unified |
| VF4013 | Expected function | Application to non-function type |
| VF4014 | Undefined type | Type constructor not in scope |
| VF4015 | Wrong type arity | Generic type applied to wrong number of args |
| VF4016 | Undefined variant | Variant constructor not in scope |
| VF4017 | Invalid variant payload | Variant constructor payload type mismatch |
| VF4018 | Recursive type error | Invalid recursive type definition |
| VF4019 | Expected record type | Field access on non-record type |
| VF4020 | Expected variant type | Pattern match on non-variant type |

#### 3.2.5 Type Checker Warnings (VF49xx)

| Code | Warning | Description |
|------|---------|-------------|
| VF4900 | Non-exhaustive match | Pattern match doesn't cover all cases |
| VF4901 | Unreachable pattern | Pattern can never match (shadowed) |
| VF4902 | Unused variable | Variable declared but never used |
| VF4903 | Redundant annotation | Type annotation matches inferred type |
| VF4904 | Implicit unit | Expression result implicitly discarded |
| VF4905 | Partial function | Function may not handle all inputs |

#### 3.2.6 Module Errors (VF5xxx)

| Code | Error | Description |
|------|-------|-------------|
| VF5001 | Module not found | Import path doesn't resolve to file |
| VF5002 | Duplicate export | Same name exported twice |
| VF5003 | Undefined export | Exporting name not defined in module |
| VF5004 | Self-import | Module imports itself |
| VF5005 | Invalid import path | Import path contains invalid characters |
| VF5006 | Module init error | Error during module initialization |
| VF5007 | Undefined import | Importing name not exported by module |
| VF5008 | Namespace conflict | Duplicate namespace import name |
| VF5009 | Re-export conflict | Wildcard re-exports cause name collision |
| VF5010 | Circular type-only | Type-only cycle (informational, not error) |

#### 3.2.7 Module Warnings (VF59xx)

| Code | Warning | Description |
|------|---------|-------------|
| VF5900 | Circular dependency | Runtime circular dependency detected |
| VF5901 | Case mismatch | Import path case differs from filesystem |
| VF5902 | Unused import | Imported name never used |
| VF5903 | Deprecated module | Importing deprecated module |

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

### 5.3 Compilation Cache

**Cache Location:**
- Default: `.vibefun-cache/` in project root (next to vibefun.json)
- Configurable via `cacheDir` in vibefun.json
- Cache is project-specific, not shared across projects

**Cache Contents:**
- Parsed ASTs (per-file)
- Type inference results (per-file)
- Module dependency graph
- File modification timestamps
- Compiler version hash (cache invalidated on version change)

**Cache Invalidation:**
- File content hash changed
- Compiler version changed
- Configuration changed (vibefun.json)
- Direct dependency changed
- Transitive dependency changed

**Cache Format:**
- Binary format for speed
- Version-tagged for forward compatibility
- Atomic writes to prevent corruption

**Cache Limits:**
- No size limit by default
- Can configure max cache size in vibefun.json
- LRU eviction when limit reached

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
| Hexadecimal literals | `let x = 0xFF` | Correct integer value |
| Binary literals | `let x = 0b1010` | Correct integer value |
| Numeric underscores | `let x = 1_000_000` | Correct integer value |
| All escape sequences | `"\n\t\r\\\"\'"` | Proper string escaping |
| Unicode escapes | `"\u{1F600}"` | Proper Unicode handling |
| Record patterns | `match r { { x, y } => ... }` | Correct destructuring |
| Variant patterns | `match opt { Some(x) => ..., None => ... }` | Correct variant matching |
| Tuple patterns | `let (a, b, c) = triple` | Correct tuple destructuring |
| Nested patterns | `match x { Some({ a: (b, c) }) => ... }` | Deep pattern compilation |
| As-patterns | `match x { Some(v) as opt => ... }` | Binding and pattern |
| Or-patterns | `match x { 1 \| 2 \| 3 => ... }` | Alternative patterns |
| Guard expressions | `match x { n if n > 0 => ... }` | Conditional patterns |
| Nested lambdas | `(x) => (y) => x + y` | Proper closure capture |
| Lambda in match | `match f { Some(fn) => fn(x) }` | Lambda extraction |
| Pipeline operator | `x \|> f \|> g` | Left-to-right composition |
| Ref operations | `ref(0)`, `!r`, `r := 1` | Mutable reference compilation |
| Comparison chains | `a < b && b < c` | Short-circuit evaluation |
| Type annotations | `let x: Int = 42` | Explicit types respected |
| Polymorphic annotations | `let id: 'a -> 'a = (x) => x` | Generic type handling |
| Occurs check error | `let f = (x) => f` | VF4003 error reported |
| Value restriction | `let r = ref([])` | VF4011 error or warning |

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
| Re-export chain | A re-exports B, C imports from A | Transitive re-export works |
| Wildcard re-export | `export * from './a'` | All exports forwarded |
| Re-export conflict | `export * from './a'` and `./b'` with same name | Error VF5009 |
| Partial import | `import { x } from './m'` where x doesn't exist | Error VF5007 |
| Namespace import | `import * as M from './m'` | All exports in namespace |
| Namespace conflict | Two `import * as X` in same file | Error VF5008 |
| Mixed import styles | Named and namespace from same module | Both work independently |
| Standard library | `import { Option } from '@vibefun/std'` | Resolves via node_modules |
| Deep relative | `../../utils` from nested directory | Correct path resolution |
| Index resolution | `./utils` vs `./utils/index` | Both resolve to index.vf |
| Type-only re-export | `export type { T } from './types'` | Type forwarded correctly |
| Side-effect import | `import './init'` | Module executes, no bindings |
| Unused import | Import not used in code | Warning VF5902 |
| Namespace member | `M.foo` after namespace import | Correct member access |
| Qualified type | `M.SomeType` in type position | Namespace type access |
| Re-export rename | `export { x as y } from './m'` | Name changed in export |
| Transitive deps | A→B→C→D, only A specified | All four compiled |
| Parallel modules | A→B, A→C (B, C independent) | B, C can compile in parallel |

### 7.3 Configuration Scenarios

| Scenario | Config | Expected |
|----------|--------|----------|
| Path mapping | `@/*: ./src/*` | `@/utils` resolves to `./src/utils.vf` |
| Multiple mappings | Two patterns match | First matching used |
| No config | No vibefun.json | Works with defaults |
| Invalid config | Malformed JSON | Error with helpful message, exit code 3 |
| Nested project | Config in parent dir | Found and used |
| Empty config | `{}` (valid but empty) | Works with defaults |
| Unknown keys | Config has extra properties | Silently ignored (forward compat) |
| Overlapping paths | `@/*` and `@/utils/*` both match | Most specific wins |
| Malformed paths | `paths: { "@/*": "not-array" }` | Error with helpful message |
| Config with BOM | UTF-8 BOM in vibefun.json | Handled gracefully |
| Config encoding | Non-UTF8 config file | Error with encoding hint |
| Explicit project | `--project ./other/vibefun.json` | Uses specified config |
| Missing explicit | `--project ./nonexistent.json` | Error, file not found |
| Path to directory | Mapped path resolves to directory | Tries index.vf |
| Absolute path mapping | `@/: /absolute/path/` | Absolute paths work |

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
| Config change | Modify vibefun.json | Full recompile triggered |
| Rapid edits | Multiple saves in <100ms | Debounced to single compile |
| Delete and recreate | File deleted then recreated quickly | Handles atomic save pattern |
| Directory rename | Parent directory renamed | Watches continue or restart |
| SIGINT handling | Ctrl+C during compilation | Clean shutdown, no partial output |
| SIGTERM handling | kill signal | Clean shutdown |
| Circular introduced | Edit creates circular dep | Warning shown, compile continues |
| Circular fixed | Edit removes circular dep | Warning cleared |
| New dependency added | npm install new package | Picked up on next import |
| node_modules change | Package updated externally | Recompile if imported |
| Output directory deleted | `dist/` removed during watch | Recreated on next compile |
| Permission change | File becomes unreadable | Error shown, watching continues |

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

### 8.6 Type System Edge Cases

- **Empty records**: `{}` as type - valid, represents any record
- **Unit patterns**: Pattern matching on `()` - single case
- **Polymorphic recursion**: Functions polymorphic over their own recursion - requires annotation
- **Deeply nested generics**: `Option<List<Result<Option<Int>, String>>>` - handled
- **Recursive type aliases**: `type Tree = Node<Tree>` - requires explicit variant
- **Shadowed type variables**: `<'a>(<'a>('a) -> 'a) -> ...` - inner shadows outer
- **Infinite types**: `let f = (x) => f` - VF4003 occurs check error
- **Rank-2 types**: Not supported in this version
- **Empty variant types**: Type with no constructors - allowed for phantom types

### 8.7 Runtime Edge Cases

- **Stack overflow**: Infinite recursion - JS stack error, include VF source location if possible
- **Large closures**: Functions capturing 100+ variables - handled, may be slow
- **Ref aliasing**: `let r = ref(1); let s = r` - same ref, expected behavior
- **Circular ref data**: `r := { self: r }` via refs - allowed, may cause JSON issues
- **FFI null/undefined**: JS null from external - must use Option wrapper
- **FFI NaN/Infinity**: JS special floats - valid Float values
- **FFI BigInt**: JS BigInt from external - not supported, use Int

### 8.8 JavaScript Interop Edge Cases

- **VF identifier = JS reserved**: `let class = 1` - renamed in output (`class$1`)
- **VF identifier = strict reserved**: `let arguments = 1` - renamed in output
- **ES modules output**: Always ES modules, never CommonJS
- **Dynamic import**: Not supported in this version
- **Top-level await**: Not supported in this version
- **Symbol interop**: JS Symbols - no direct support, use external
- **Prototype access**: `obj.__proto__` - not accessible, use external
- **this binding**: No `this` keyword - use explicit parameters
- **Generators**: Not supported in this version
- **Async/await**: Not supported in this version (future consideration)

### 8.9 Build System Edge Cases

- **Monorepo workspaces**: npm/pnpm workspaces - follow symlinks correctly
- **pnpm strict mode**: Symlinked node_modules - resolve through symlinks
- **Yarn PnP**: Plug'n'Play - not supported, must use node_modules
- **Bundled dependencies**: node_modules/pkg/node_modules - searched correctly
- **Optional dependencies**: Missing optional dep - error on import, not on install
- **Peer dependencies**: Not resolved by compiler, must be installed

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
- **15+ CLI commands/options** with detailed specifications
- **3-level module resolution** (relative, mapped, package)
- **Complete error code catalog** with 60+ defined error/warning codes
- **Structured error handling** with JSON output for tooling
- **Build tool integration** patterns for webpack/vite/esbuild
- **Watch mode** with incremental compilation and cache specification
- **Source maps** for debugging support
- **80+ test scenarios** across various categories
- **50+ edge cases** to handle robustly including type system and interop
- **Non-functional requirements** for performance and stability
- **Defined option behaviors** for --strict, --runtime-checks, --emit, --target, --verbose

The CLI implementation should prioritize:
1. Correct error output (most important for DX)
2. Module resolution accuracy
3. Build tool integration API
4. Watch mode for development workflow
5. Source maps for debugging
