# CLI MVP Task List

**Last Updated:** 2026-01-31

## Phase 1: Core Package Exports ✅ COMPLETE

- [x] Verify desugarer exports exist in `packages/core/src/index.ts`
  - Added `desugarModule` export
- [x] Verify typechecker exports exist in `packages/core/src/index.ts`
  - Added `typeCheck`, `TypedModule`, `TypeCheckOptions`, `typeToString` exports
- [x] Verify Core AST type exports exist
  - Added `CoreModule`, `CoreExpr`, `CoreDeclaration`, `CorePattern` exports
- [x] Verify exports work: `npm run build -w @vibefun/core`

## Phase 2: Stubbed Code Generator ✅ COMPLETE

- [x] Create `packages/core/src/codegen/index.ts`
- [x] Implement `generate(typedModule, options)` stub
  - Returns `{ code: string }` with placeholder JS
  - Output includes source filename and declaration count
- [x] Export from `packages/core/src/index.ts`
- [x] Write unit tests for code generator stub

## Phase 3: CLI Utility Modules ✅ COMPLETE

### Timer (`src/utils/timer.ts`)
- [x] Create Timer class with start/stop methods
- [x] Implement `getTimings()` returning PhaseTimings
- [x] Implement `formatVerbose(filename)` for human output
- [x] Implement `toJSON()` for JSON output
- [x] Track output byte size for codegen phase
- [x] Implement `formatBytes(bytes)` - human-readable size (1.2KB, 2.3MB)
- [x] Write unit tests

### Colors (`src/utils/colors.ts`)
- [x] Implement `shouldUseColor(options)` with detection logic
  - Handle --color/--no-color flags
  - Handle NO_COLOR/FORCE_COLOR env vars
  - Handle CI env var
  - Handle TTY detection
- [x] Implement color functions (red, yellow, cyan, dim, bold)
- [x] Write unit tests

### File I/O (`src/utils/file-io.ts`)
- [x] Implement `stripBom(content)` - remove UTF-8 BOM
- [x] Implement `normalizeLineEndings(content)` - convert to LF
- [x] Implement `readSourceFile(path)` with error handling
- [x] Implement `writeAtomic(path, content)` - temp file + rename
- [x] Write unit tests

## Phase 4: Output Modules ✅ COMPLETE

### Diagnostics (`src/output/diagnostic.ts`)
- [x] Define `JsonDiagnostic` interface matching cli-mvp.md spec
- [x] Implement `formatDiagnosticHuman(diagnostic, source, useColor)`
- [x] Implement `formatDiagnosticsJson(diagnostics, timings?)`
- [x] Implement `toJsonDiagnostic(diagnostic)` conversion
- [x] Implement `formatSuccessJson` for success output
- [x] Handle --verbose --json combination (timing in JSON output)
- [x] Write unit tests

### AST JSON (`src/output/ast-json.ts`)
- [x] Define `AstOutput` interface
- [x] Implement `serializeSurfaceAst(module, filename)`
- [x] Implement `serializeTypedAst(typedModule, filename)`
  - Include declaration types as formatted strings
- [x] Implement `countNodes(module)` helper
- [x] Write unit tests

## Phase 5: Compile Command ✅ COMPLETE

### Main Implementation (`src/commands/compile.ts`)
- [x] Define `CompileOptions` interface
- [x] Implement input reading with BOM/line ending handling
- [x] Implement pipeline execution with timing:
  - Lexer with token count
  - Parser with node count
  - Desugarer
  - TypeChecker
  - CodeGen (stubbed)
- [x] Implement `--emit ast` mode (stdout JSON)
- [x] Implement `--emit typed-ast` mode (stdout JSON)
- [x] Implement `--emit js` mode (file output)
- [x] Implement atomic file writing
- [x] Implement error handling with proper exit codes
- [x] Implement `--verbose` timing output
- [x] Implement `--quiet` mode
- [x] Implement `--json` error output
- [x] Create parent directories for output path (recursive mkdir)
- [x] Handle --verbose --json: include timing in JSON output
- [x] Write integration tests

**Note:** Multi-error collection deferred - current implementation stops at first error. This matches the plan's "Deferred" section.

## Phase 6: CLI Entry Point ✅ COMPLETE

### Update `src/index.ts`
- [x] Add global options to program:
  - `--quiet/-q`
  - `--verbose`
  - `--json`
  - `--color`
  - `--no-color`
- [x] Update compile command:
  - Add `--emit/-e` option with choices
  - Wire up to compile function
- [x] Stub `check` and `run` commands (deferred to post-MVP)
- [x] Ensure proper option inheritance (global → command)

## Phase 7: E2E Tests and Fixtures ✅ COMPLETE

### Test Fixtures (`test-fixtures/`)
- [x] Create `simple.vf` - basic valid program
- [x] Create `empty.vf` - empty file
- [x] Create `unicode.vf` - unicode identifiers
- [x] Create `type-error.vf` - type error program
- [x] Create `parse-error.vf` - syntax error program
- [x] Create `comments-only.vf` - file containing only `// comment`
- [x] Create `multi-error.vf` - file with 3+ distinct errors
- [x] Create `with-bom.vf` - UTF-8 file with BOM prefix
- [x] Create `path with spaces/test.vf` - file in directory with spaces

### E2E Tests (`src/cli.e2e.test.ts`)
- [x] Test basic compilation creates output file
- [x] Test custom output path with -o
- [x] Test nested output path creates directories
- [x] Test empty file produces valid output
- [x] Test `--emit ast` outputs valid JSON
- [x] Test `--emit typed-ast` outputs valid JSON
- [x] Test file not found returns exit code 4
- [x] Test parse error returns exit code 1
- [x] Test type error returns exit code 1
- [x] Test missing argument returns exit code 2
- [x] Test `--verbose` shows timing
- [x] Test `--json` produces JSON output
- [x] Test `--quiet` suppresses output
- [x] Test `--no-color` disables colors
- [x] Test `--version` outputs version
- [x] Test `--help` outputs help
- [x] Test comments-only file produces valid empty module
- [x] Test file with UTF-8 BOM compiles correctly
- [x] Test file path with spaces works
- [x] Test overwriting existing output file works atomically
- [x] Test atomic writes: failed compile leaves no partial file
- [x] Test `--verbose --json` includes timing in JSON output
- [x] Test generated JS is valid ES module (loadable by Node.js)

**Note:** Multi-error collection test deferred - current implementation only reports first error.

## Phase 8: Final Verification ✅ COMPLETE

- [x] Run `npm run verify` (check, lint, test, format) - All 3,623 tests pass
- [x] Run manual verification commands from cli-mvp.md
  - Basic compilation produces valid JS that runs with Node.js
  - Custom output path with -o works
  - Nested output paths create directories
  - Empty files compile to valid empty modules
  - Unicode identifiers compile correctly
  - --emit ast outputs valid JSON
  - --emit typed-ast outputs valid JSON
  - --verbose shows timing breakdown
  - --verbose --json includes timing in JSON output
  - Type errors show location and context
  - JSON error format is valid
  - Exit code 4 for file not found
  - Atomic writes: failed compile leaves no partial file
  - --help and --version work correctly
- [x] CLAUDE.md already up to date
- [x] No TODO comments to clean up

## CLI MVP COMPLETE

All phases implemented and verified. The CLI MVP is ready for use.

### Summary of Deliverables

**Core Features:**
- `vibefun compile <file>` with full pipeline (lexer → parser → desugarer → typechecker → codegen stub)
- Custom output path with `-o`
- Auto-creation of nested output directories

**Debugging Features:**
- `--emit ast` - Surface AST as JSON
- `--emit typed-ast` - Typed Core AST as JSON
- `--verbose` - Timing breakdown per phase with metadata

**Output Modes:**
- Human-readable errors with source context and colors
- `--json` - Machine-parseable JSON output
- `--quiet` - Suppress non-error output
- `--no-color` / `--color` - Control color output

**Reliability:**
- Proper exit codes (0/1/2/4/5)
- Atomic file writes (temp + rename)
- UTF-8 BOM handling
- Line ending normalization

**Test Coverage:**
- 130 CLI tests (unit + integration + E2E)
- 3,493 core tests
- 33 E2E tests covering all major scenarios
