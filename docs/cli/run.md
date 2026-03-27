# run

Compile and execute a Vibefun source file.

## Synopsis

```
vibefun run [file]
```

## Description

The `run` command compiles a `.vf` source file through the full compilation pipeline and immediately executes the resulting JavaScript using Node.js.

The compiled JavaScript is piped to `node --input-type=module` via stdin, so no intermediate files are created on disk.

### Input

- **File**: Pass a `.vf` file path as the argument
- **stdin**: Omit the file argument or pass `-` to read source from stdin

### Output

The executed script's stdout and stderr are passed through directly to the terminal. The `run` command itself produces no output on success (unless `--verbose` is used, which prints compilation timing to stderr).

If compilation fails, error diagnostics are printed to stderr and the script is not executed.

### Exit Codes

The exit code reflects both compilation and execution:

| Code | Meaning |
|------|---------|
| `0` | Compilation and execution succeeded |
| `1` | Compilation error (syntax, type, or semantic error) |
| `4` | I/O error (file not found, permission denied) |
| `5` | Internal compiler error |
| Other | Exit code from the executed script |

If the compiled script calls `process.exit(n)` or exits with a non-zero code, that code is propagated.

## Examples

### Basic Usage

```bash
# Run a file
vibefun run src/main.vf

# Run from stdin
echo 'let x = 42;' | vibefun run

# Run from stdin using "-" argument
cat src/main.vf | vibefun run -
```

### With Global Options

```bash
# Show compilation timing
vibefun --verbose run src/main.vf

# Suppress all non-error output
vibefun --quiet run src/main.vf

# Get compilation errors as JSON
vibefun --json run src/main.vf
```

## Limitations

When reading source from stdin (`vibefun run -`), the executed script cannot also read from stdin, because the source input has already been consumed. This is the same limitation as other language runners (e.g., `python -c`, `node -e`) when combined with input pipes.
