# CLI MVP Task List

**Last Updated:** 2026-01-31

## Phase 1: Core Package Exports

- [ ] Add desugarer exports to `packages/core/src/index.ts`
  - Export `desugarModule` from desugarer
- [ ] Add typechecker exports to `packages/core/src/index.ts`
  - Export `typeCheck`, `TypedModule`, `TypeCheckOptions`
- [ ] Add Core AST type exports
  - Export `CoreModule`, `CoreExpr`, `CoreDeclaration`, `CorePattern`
- [ ] Verify exports work: `npm run build -w @vibefun/core`

## Phase 2: Stubbed Code Generator

- [ ] Create `packages/core/src/codegen/index.ts`
- [ ] Implement `generate(typedModule, options)` stub
  - Returns `{ code: string }` with placeholder JS
  - Output: `// Vibefun compiled output (codegen stub)\nexport {};`
- [ ] Export from `packages/core/src/index.ts`
- [ ] Write unit tests for code generator stub

## Phase 3: CLI Utility Modules

### Timer (`src/utils/timer.ts`)
- [ ] Create Timer class with start/stop methods
- [ ] Implement `getTimings()` returning PhaseTimings
- [ ] Implement `formatVerbose(filename)` for human output
- [ ] Implement `toJSON()` for JSON output
- [ ] Write unit tests

### Colors (`src/utils/colors.ts`)
- [ ] Implement `shouldUseColor(options)` with detection logic
  - Handle --color/--no-color flags
  - Handle NO_COLOR/FORCE_COLOR env vars
  - Handle CI env var
  - Handle TTY detection
- [ ] Implement color functions (red, yellow, cyan, dim, bold)
- [ ] Write unit tests

### File I/O (`src/utils/file-io.ts`)
- [ ] Implement `stripBom(content)` - remove UTF-8 BOM
- [ ] Implement `normalizeLineEndings(content)` - convert to LF
- [ ] Implement `readSourceFile(path)` with error handling
- [ ] Implement `writeAtomic(path, content)` - temp file + rename
- [ ] Write unit tests

## Phase 4: Output Modules

### Diagnostics (`src/output/diagnostic.ts`)
- [ ] Define `JsonDiagnostic` interface matching cli-mvp.md spec
- [ ] Implement `formatDiagnosticHuman(diagnostic, source, useColor)`
- [ ] Implement `formatDiagnosticsJson(diagnostics, timings?)`
- [ ] Implement `toJsonDiagnostic(diagnostic)` conversion
- [ ] Write unit tests

### AST JSON (`src/output/ast-json.ts`)
- [ ] Define `AstOutput` interface
- [ ] Implement `serializeSurfaceAst(module, filename)`
- [ ] Implement `serializeTypedAst(typedModule, filename)`
  - Include declaration types as formatted strings
- [ ] Implement `countNodes(module)` helper
- [ ] Write unit tests

## Phase 5: Compile Command

### Main Implementation (`src/commands/compile.ts`)
- [ ] Define `CompileOptions` interface
- [ ] Implement input reading with BOM/line ending handling
- [ ] Implement pipeline execution with timing:
  - Lexer with token count
  - Parser with node count
  - Desugarer
  - TypeChecker
  - CodeGen (stubbed)
- [ ] Implement `--emit ast` mode (stdout JSON)
- [ ] Implement `--emit typed-ast` mode (stdout JSON)
- [ ] Implement `--emit js` mode (file output)
- [ ] Implement atomic file writing
- [ ] Implement error handling with proper exit codes
- [ ] Implement `--verbose` timing output
- [ ] Implement `--quiet` mode
- [ ] Implement `--json` error output
- [ ] Write integration tests

## Phase 6: CLI Entry Point

### Update `src/index.ts`
- [ ] Add global options to program:
  - `--quiet/-q`
  - `--verbose`
  - `--json`
  - `--color`
  - `--no-color`
- [ ] Update compile command:
  - Add `--emit/-e` option with choices
  - Wire up to compile function
- [ ] Remove/stub `check` and `run` commands
- [ ] Ensure proper option inheritance (global → command)

## Phase 7: E2E Tests and Fixtures

### Test Fixtures (`test-fixtures/`)
- [ ] Create `simple.vf` - basic valid program
- [ ] Create `empty.vf` - empty file
- [ ] Create `unicode.vf` - unicode identifiers
- [ ] Create `type-error.vf` - type error program
- [ ] Create `parse-error.vf` - syntax error program

### E2E Tests (`src/cli.e2e.test.ts`)
- [ ] Test basic compilation creates output file
- [ ] Test custom output path with -o
- [ ] Test nested output path creates directories
- [ ] Test empty file produces valid output
- [ ] Test `--emit ast` outputs valid JSON
- [ ] Test `--emit typed-ast` outputs valid JSON
- [ ] Test file not found returns exit code 4
- [ ] Test parse error returns exit code 1
- [ ] Test type error returns exit code 1
- [ ] Test missing argument returns exit code 2
- [ ] Test `--verbose` shows timing
- [ ] Test `--json` produces JSON output
- [ ] Test `--quiet` suppresses output
- [ ] Test `--no-color` disables colors
- [ ] Test `--version` outputs version
- [ ] Test `--help` outputs help

## Phase 8: Final Verification

- [ ] Run `npm run verify` (check, lint, test, format)
- [ ] Run manual verification commands from cli-mvp.md
- [ ] Update CLAUDE.md if needed
- [ ] Clean up any TODO comments

## Dependencies

```
Phase 1 ─────────┬─────────────────────────────────────────┐
                 │                                         │
Phase 2 ─────────┼─────────────────────────────────────────┤
                 │                                         │
Phase 3 ─────────┘                                         │
                                                           │
Phase 4 ───────────────────────────────────────────────────┤
                                                           │
Phase 5 ◄──────────────────────────────────────────────────┘
                 │
Phase 6 ◄────────┘
                 │
Phase 7 ◄────────┘
                 │
Phase 8 ◄────────┘
```

Phases 1-4 can be done in parallel. Phase 5 depends on all of them. Phases 6-8 are sequential.
