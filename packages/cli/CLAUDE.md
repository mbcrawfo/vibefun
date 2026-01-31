# CLI Package

The `@vibefun/cli` package provides the command-line interface for the Vibefun compiler.

## Test Organization

- **`tests/`** - End-to-end tests only. These tests spawn the actual CLI binary and verify its behavior through stdin/stdout/stderr and exit codes.
- **`src/`** - Unit and integration tests should be colocated with the code under test (e.g., `src/commands/compile.test.ts` tests `src/commands/compile.ts`).
