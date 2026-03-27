# CLI Package Source

The `@vibefun/cli` package provides the command-line interface for the Vibefun compiler.

## Documentation Sync Requirement

**Critical**: The user-facing CLI documentation at `docs/cli/` must be kept in sync with any changes to the CLI. When adding, modifying, or removing commands, options, or behaviors:

1. Review and update the relevant documentation pages:
   - `docs/cli/README.md` - Overview, command table, global options, exit codes
   - `docs/cli/compile.md` - Compile command reference
   - `docs/cli/run.md` - Run command reference
2. Verify that examples in the documentation still work
3. Ensure exit codes and option descriptions match the implementation

## Module Guide

- **`commands/`** - Command implementations (`compile.ts`, `run.ts`)
- **`output/`** - Output formatting (diagnostics, AST serialization)
- **`utils/`** - Shared utilities (colors, file I/O, timing)
- **`index.ts`** - CLI entry point (commander setup, argument parsing)

## Test Organization

- **Unit/integration tests**: Colocated with source (e.g., `commands/compile.test.ts`)
- **E2E tests**: In `tests/` directory, spawn the actual CLI binary
