# Vibefun CLI Reference

The `vibefun` command-line tool compiles and runs Vibefun source files (`.vf`).

## Quick Start

```bash
# Compile a file to JavaScript
vibefun compile src/main.vf -o dist/main.js

# Compile from stdin to stdout
echo 'let x = 42;' | vibefun compile

# Compile and run
vibefun run src/main.vf

# Run from stdin
echo 'let greeting = "hello";' | vibefun run
```

## Commands

| Command | Description |
|---------|-------------|
| [`compile`](./compile.md) | Compile a `.vf` file to JavaScript |
| [`run`](./run.md) | Compile and execute a `.vf` file |

## Global Options

These options can be used with any command:

| Option | Description |
|--------|-------------|
| `-q, --quiet` | Suppress non-error output |
| `--verbose` | Show timing, phase durations, and statistics |
| `--json` | Output diagnostics and results as JSON |
| `--color` | Force color output (overrides auto-detection) |
| `--no-color` | Disable color output |
| `-V, --version` | Print version number |
| `-h, --help` | Show help |

### Color Detection

Color output is automatically enabled when writing to a terminal (TTY). The detection priority is:

1. `--no-color` flag (disables)
2. `--color` flag (enables)
3. `NO_COLOR` environment variable (any value disables)
4. `FORCE_COLOR` environment variable (any value enables)
5. `CI` environment variable (disables)
6. TTY detection (enabled if stdout is a TTY)

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Compilation error (parse, type, or semantic error) |
| `2` | Usage error (invalid arguments or options) |
| `4` | I/O error (file not found, permission denied) |
| `5` | Internal error (unexpected compiler failure) |

For the `run` command, exit codes from the executed script are propagated directly. Compilation errors use the codes above.

## stdin/stdout Support

Both `compile` and `run` support reading source code from stdin. When no file argument is provided (or when `-` is passed), input is read from stdin.

For `compile`, when reading from stdin with no `--output` flag, the compiled JavaScript is written to stdout instead of a file. This enables Unix pipeline composition:

```bash
# Pipe through compilation
cat src/main.vf | vibefun compile | node --input-type=module

# Chain with other tools
vibefun compile src/main.vf --emit ast | jq '.ast'
```
