# CLI MVP Implementation Plan

**Status:** Complete
**Last Updated:** 2026-01-31

## Summary

Implement the vibefun CLI MVP as specified in `.claude/design/cli-mvp.md`. The MVP provides single-file compilation with debugging capabilities (AST dumps, timing) and proper error handling.

## Scope

### In Scope (MVP)
- `vibefun compile <file>` command
- Options: `--output/-o`, `--emit/-e` (js, ast, typed-ast)
- Global options: `--version`, `--help`, `--quiet`, `--verbose`, `--color`, `--no-color`, `--json`
- Human-readable and JSON error output
- Proper exit codes (0, 1, 2, 4, 5)
- Atomic file writes
- UTF-8, BOM, and line ending handling

### Out of Scope (Deferred)
- Multi-file projects and module resolution
- Watch mode
- `check`, `run` commands
- Configuration files (vibefun.json)
- Source maps
- Optimizations

## Architecture

```
packages/cli/src/
├── index.ts              # Entry point, commander setup
├── commands/
│   └── compile.ts        # Compile command implementation
├── output/
│   ├── diagnostic.ts     # Error formatting (human + JSON)
│   └── ast-json.ts       # AST serialization for --emit
└── utils/
    ├── timer.ts          # Timing for --verbose
    ├── colors.ts         # Terminal color utilities
    └── file-io.ts        # File reading/writing

packages/core/src/
├── codegen/
│   └── index.ts          # Stubbed code generator (NEW)
└── index.ts              # Updated exports
```

## Implementation Phases

### Phase 1: Core Package Exports
Export desugarer (`desugarModule`) and typechecker (`typeCheck`, `TypedModule`) from `@vibefun/core` so CLI can access full pipeline.

> **Note:** Initial investigation suggests these exports may already exist. Verify before implementing.

### Phase 2: Stubbed Code Generator
Create `packages/core/src/codegen/` with a stub that produces placeholder JS output. This allows the CLI to run the full pipeline without blocking on codegen implementation.

### Phase 3: CLI Utilities
Implement utility modules:
- `timer.ts` - Track timing per phase, format for verbose output
- `colors.ts` - Handle terminal colors with env/TTY detection
- `file-io.ts` - UTF-8/BOM handling, atomic writes

### Phase 4: Output Modules
Implement output formatting:
- `diagnostic.ts` - Format errors for human and JSON output
- `ast-json.ts` - Serialize AST for --emit modes

### Phase 5: Compile Command
Implement the main compile command with full pipeline integration.

### Phase 6: CLI Entry Point
Update `index.ts` with global options and proper command wiring.

### Phase 7: Tests
- Unit tests for each utility/output module
- Integration tests for compile command
- E2E tests for CLI binary

## Key Design Decisions

### Stubbed Code Generator
The code generator produces:
```javascript
// Vibefun compiled output (codegen stub)
// Source: <filename>
export {};
```
This is valid ES module syntax that runs without error.

## Codegen Stub Limitations

The code generator is intentionally stubbed for MVP, producing placeholder JavaScript.

### What This Enables Testing
- Full compilation pipeline (lexer → parser → desugarer → typechecker → codegen)
- All CLI options (--verbose, --json, --emit, -o, etc.)
- Error handling and exit codes
- File I/O (atomic writes, directory creation)
- AST/typed-AST JSON output

### What Cannot Be Tested Until Codegen Implemented
- Generated code has correct semantics
- Variables and functions work at runtime
- Actual JavaScript output matches vibefun semantics

### Test Strategy
Tests like `node output.js` will PASS because `export {};` is valid ES module syntax.
These tests verify "compilation completes without error" not "generated code is correct".

This is acceptable for MVP. Semantic tests will be added when codegen is implemented.

### Error Handling
- Pipeline errors throw `VibefunDiagnostic`
- I/O errors result in exit code 4
- Internal errors result in exit code 5
- Multi-error reporting deferred (currently stops at first error)

### Color Detection
Priority: CLI flags > env vars > CI detection > TTY detection

## Dependencies

### Core Package Additions
- Export: `desugarModule`, `typeCheck`, `TypedModule`
- Export: `CoreModule`, `CoreExpr`, `CoreDeclaration` types
- New: `generate` from codegen module

### CLI Dependencies
- `commander` (existing) - CLI argument parsing
- No new external dependencies for MVP (use native ANSI codes)

## Success Criteria

From cli-mvp.md:
1. `vibefun compile main.vf` produces valid, executable JavaScript
2. `vibefun compile main.vf -o out.js` writes to specified path
3. Error messages include file, line, column, and source context
4. `--emit ast` outputs valid JSON to stdout
5. `--emit typed-ast` outputs valid JSON with types to stdout
6. `--verbose` shows timing breakdown per phase
7. `--json` produces machine-parseable diagnostics
8. Empty files compile to valid empty JS modules
9. Exit codes correctly indicate success/failure type
10. `--help` and `--version` work correctly
11. Color output respects `--no-color` / `NO_COLOR`
12. Output files are written atomically
