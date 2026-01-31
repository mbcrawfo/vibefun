# Vibefun CLI MVP Requirements

## Overview

This document defines the **minimal viable product** for the vibefun CLI. The MVP has two goals:

1. **Core functionality** - Compile a single `.vf` file to JavaScript
2. **Compiler debugging** - Inspect internals to aid compiler development

**Explicitly deferred from MVP:**
- Multi-file projects and module resolution
- Watch mode and incremental compilation
- Build tool integration (webpack/vite/esbuild)
- Configuration files (vibefun.json)
- Source maps
- Optimizations
- Runtime type checking
- Commands: `check`, `run`, `init`, `fmt`, `repl`

---

## MVP Command

### `vibefun compile <file>`

Compile a single `.vf` file to JavaScript.

**Arguments:**
- `<file>` - Path to `.vf` source file (required)

**Options:**
| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--output <path>` | `-o` | Output file path | `<input-basename>.js` |
| `--emit <type>` | `-e` | Output type: `js`, `ast`, `typed-ast` | `js` |

**Behavior:**
- Runs full pipeline: lexer → parser → desugarer → typechecker → codegen
- Reports errors to stderr in human-readable format
- Writes output to file (or terminal for ast/typed-ast)

**Examples:**
```bash
# Basic compilation
vibefun compile src/main.vf

# Specify output path
vibefun compile src/main.vf -o dist/main.js

# Debug: dump surface AST (parser output)
vibefun compile src/main.vf --emit ast

# Debug: dump typed AST (after type inference)
vibefun compile src/main.vf --emit typed-ast
```

---

## Global Options

| Option | Short | Description |
|--------|-------|-------------|
| `--version` | `-v` | Print version and exit |
| `--help` | `-h` | Print help (global or command-specific) |
| `--quiet` | `-q` | Suppress non-error output |
| `--verbose` | | Verbose output (timing, phases, token/node counts) |
| `--color` | | Force color output |
| `--no-color` | | Disable color output |
| `--json` | | Output diagnostics as JSON |

---

## Debugging Options Detail

### `--verbose` Output

Show timing and statistics for each compilation phase. Critical for identifying slow phases and regressions.

```
[lexer]     src/main.vf      2ms   (48 tokens)
[parser]    src/main.vf      5ms   (23 AST nodes)
[desugar]   src/main.vf      1ms
[typecheck] src/main.vf     12ms
[codegen]   src/main.vf      3ms   (1.2KB output)
Total: 23ms
```

### `--json` Output

Machine-parseable diagnostic output for tooling and test automation:

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
      "endColumn": 24
    }
  ],
  "errorCount": 1,
  "warningCount": 0
}
```

---

## `--emit` Output Formats (Debugging)

### `js` (default)

Standard JavaScript output.

### `ast`

Surface AST as JSON (pre-desugaring). Useful for debugging parser.

```json
{
  "version": "1.0",
  "sourceFile": "src/main.vf",
  "format": "surface-ast",
  "ast": { ... }
}
```

### `typed-ast`

Core AST with inferred types (post-desugaring, post-typechecking). Useful for debugging type inference.

```json
{
  "version": "1.0",
  "sourceFile": "src/main.vf",
  "format": "typed-core-ast",
  "ast": { ... },
  "types": { ... }
}
```

---

## Error Output

### Human-Readable Format (default)

```
error[VF4001]: Type mismatch
  --> src/main.vf:10:15
   |
10 | let result = compute() + "hello"
   |              ^^^^^^^^^
   |
   = expected: Int
   =      got: String
```

### Error Code Categories (MVP subset)

| Range | Category |
|-------|----------|
| VF1xxx | Lexer errors |
| VF2xxx | Parser errors |
| VF3xxx | Desugarer errors |
| VF4xxx | Type checker errors |

**MVP Error Codes:**

| Code | Description |
|------|-------------|
| VF1001 | Unexpected character |
| VF1002 | Unterminated string |
| VF1003 | Invalid escape sequence |
| VF1004 | Invalid numeric literal |
| VF1005 | Unexpected end of file |
| VF2001 | Unexpected token |
| VF2002 | Missing expression |
| VF2003 | Invalid pattern syntax |
| VF2005 | Missing required clause |
| VF2010 | Missing closing delimiter |
| VF4001 | Type mismatch |
| VF4002 | Undefined variable |
| VF4003 | Occurs check failed |
| VF4006 | Wrong arity |
| VF4013 | Expected function |
| VF4014 | Undefined type |
| VF4016 | Undefined variant |

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Compilation error(s) |
| 2 | CLI usage error (bad arguments) |
| 4 | I/O error (file not found, permissions) |
| 5 | Internal compiler error (bug) |

---

## Test Scenarios

### Basic Compilation

| Scenario | Command | Expected |
|----------|---------|----------|
| Compile simple file | `vibefun compile hello.vf` | Creates `hello.js` |
| Specify output | `vibefun compile main.vf -o out.js` | Creates `out.js` |
| Create output directory | `vibefun compile main.vf -o dist/out.js` | Creates `dist/` and `out.js` |

### Debug Output

| Scenario | Command | Expected |
|----------|---------|----------|
| Dump AST | `vibefun compile main.vf --emit ast` | JSON AST to terminal |
| Dump typed AST | `vibefun compile main.vf --emit typed-ast` | JSON typed AST to terminal |
| Verbose timing | `vibefun compile main.vf --verbose` | Phase timing shown |
| JSON diagnostics | `vibefun compile bad.vf --json` | JSON error format |
| Verbose + JSON | `vibefun compile main.vf --verbose --json` | Timing in JSON format |

### Error Cases

| Scenario | Input | Expected |
|----------|-------|----------|
| File not found | `vibefun compile noexist.vf` | Error, exit 4 |
| No file argument | `vibefun compile` | Usage error, exit 2 |
| Syntax error | Invalid `.vf` file | Parser error with location, exit 1 |
| Type error | Type mismatch | Type error with expected/actual, exit 1 |
| Multiple errors | File with 3 errors | All errors reported, exit 1 |
| Lexer error | Invalid character | Error with location, exit 1 |

### Global Options

| Scenario | Command | Expected |
|----------|---------|----------|
| Version | `vibefun --version` | Version string (e.g., "0.1.0") |
| Help | `vibefun --help` | Usage information, exit 0 |
| Command help | `vibefun compile --help` | Compile-specific help |
| Quiet mode | `vibefun compile main.vf -q` | No success message, only errors |
| No color | `vibefun compile main.vf --no-color` | Plain text output |
| Force color | `vibefun compile main.vf --color` | Colored output even in pipe |

---

## Implementation Notes

### Dependencies

- **commander**: CLI argument parsing (already in project)
- **@vibefun/core**: Compiler pipeline

Note: Consider whether chalk/picocolors is needed or if basic ANSI escapes suffice for MVP.

### Architecture

```
@vibefun/cli/
├── src/
│   ├── index.ts           # Entry point, commander setup
│   ├── commands/
│   │   └── compile.ts     # compile command implementation
│   ├── output/
│   │   ├── diagnostic.ts  # Error formatting (human + JSON)
│   │   └── ast-json.ts    # AST serialization for --emit
│   └── utils/
│       ├── timer.ts       # Timing utilities for --verbose
│       └── colors.ts      # Terminal color utilities
├── bin/
│   └── vibefun.js         # Executable entry (#!/usr/bin/env node)
└── package.json
```

### Color Output Detection

- Auto-detect TTY for color support
- Respect `--color` / `--no-color` flags
- Respect `NO_COLOR` and `FORCE_COLOR` environment variables
- Default to no color in CI environments (detect via `CI` env var)

### Output Path Logic

```
input: src/main.vf
default output: src/main.js

input: src/main.vf -o dist/out.js
output: dist/out.js (creates dist/ if needed)

input: main.vf --emit ast
output: printed to terminal (JSON)
```

---

## Deferred to Post-MVP

These features are intentionally excluded from MVP. Priority order for post-MVP:

### Priority 1 (Immediate follow-up)
1. **Source maps** (`--source-map`) - Critical for debugging generated JS
2. **Check command** (`vibefun check`) - Type-check without codegen
3. **Run command** (`vibefun run`) - Compile and execute in one step

### Priority 2 (Development workflow)
4. **Watch mode** (`--watch`) - Recompile on file changes
5. **Stdin input** - `vibefun compile -` for piping
6. **Stdout output** - `--stdout` for piping

### Priority 3 (Project support)
7. **Multi-file compilation** - Import/export support
8. **Module resolution** - Relative imports, node_modules
9. **Configuration** - `vibefun.json` project files
10. **Path mappings** - `@/` style aliases

### Priority 4 (Production features)
11. **Optimizations** - Dead code elimination, constant folding
12. **Runtime checks** - FFI validation modes
13. **Build tool integration** - Webpack/Vite plugin APIs
14. **Target selection** - ES version targeting

### Priority 5 (Ecosystem)
15. **Project initialization** - `vibefun init` command
16. **Formatter** - `vibefun fmt` command
17. **REPL** - Interactive mode
18. **Caching** - Compilation cache for performance

---

## Success Criteria

The CLI MVP is complete when:

1. `vibefun compile main.vf` produces valid, executable JavaScript
2. `vibefun compile main.vf -o out.js` writes to specified path
3. Error messages include file, line, column, and source context
4. `--emit ast` outputs valid JSON representation of surface AST
5. `--emit typed-ast` outputs valid JSON with inferred types
6. `--verbose` shows timing breakdown per phase with counts
7. `--json` produces machine-parseable diagnostics
9. Exit codes correctly indicate success/failure type (0/1/2/4/5)
10. `--help` and `--version` work correctly
11. Color output works and respects `--no-color` / `NO_COLOR`

---

## Verification Plan

After implementation, verify MVP with these tests:

```bash
# Basic compilation
echo 'let x = 42' > test.vf
vibefun compile test.vf
node test.js  # should run without error

# Output path
vibefun compile test.vf -o out.js
ls out.js  # should exist

# AST debugging
vibefun compile test.vf --emit ast | jq .  # valid JSON

# Typed AST debugging
vibefun compile test.vf --emit typed-ast | jq .  # valid JSON with types

# Verbose output
vibefun compile test.vf --verbose  # shows timing

# Error handling
echo 'let x: Int = "hello"' > bad.vf
vibefun compile bad.vf  # shows type error with location
vibefun compile bad.vf --json | jq .  # JSON error format
vibefun compile missing.vf; echo $?  # exit code 4

# Help
vibefun --help
vibefun compile --help
vibefun --version
```
