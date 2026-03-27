# compile

Compile a Vibefun source file to JavaScript.

## Synopsis

```
vibefun compile [file] [options]
```

## Description

The `compile` command runs the full compilation pipeline on a `.vf` source file:

1. **Lexer** - Tokenize source code
2. **Parser** - Build the AST
3. **Desugarer** - Transform surface syntax to core AST
4. **Type Checker** - Infer and validate types
5. **Code Generator** - Emit JavaScript (ES2020)

### Input

- **File**: Pass a `.vf` file path as the argument
- **stdin**: Omit the file argument or pass `-` to read from stdin

### Output

- **File** (default for file input): Writes `.js` file alongside the source (e.g., `main.vf` → `main.js`), or to the path specified by `--output`
- **stdout** (default for stdin input): When reading from stdin with no `--output`, the compiled JavaScript is written to stdout

## Options

| Option | Description |
|--------|-------------|
| `-o, --output <path>` | Write output to the specified file path. Creates parent directories if needed. |
| `-e, --emit <type>` | Output type: `js` (default), `ast`, or `typed-ast` |

### Emit Types

- **`js`** (default) - Compile to JavaScript. Output is written to a file or stdout depending on input source.
- **`ast`** - Output the surface AST as JSON to stdout. No file is written. Useful for tooling and debugging.
- **`typed-ast`** - Output the type-checked AST as JSON to stdout, including inferred types for all declarations. No file is written.

## Examples

### Basic Compilation

```bash
# Compile to default output path (main.vf → main.js)
vibefun compile src/main.vf

# Compile to a specific output path
vibefun compile src/main.vf -o dist/main.js

# Compile with verbose timing output
vibefun --verbose compile src/main.vf
```

### stdin/stdout

```bash
# Compile from stdin, output JS to stdout
echo 'let x = 42;' | vibefun compile

# Compile from stdin using "-" argument
cat src/main.vf | vibefun compile -

# Compile from stdin to a file
echo 'let x = 42;' | vibefun compile -o output.js
```

### AST Output

```bash
# View the surface AST
vibefun compile src/main.vf --emit ast

# View the typed AST with inferred types
vibefun compile src/main.vf --emit typed-ast

# Pipe AST to jq for inspection
vibefun compile src/main.vf --emit ast | jq '.ast.declarations[0]'
```

### JSON Output

```bash
# Get structured output for tooling
vibefun --json compile src/main.vf

# JSON with timing information
vibefun --json --verbose compile src/main.vf
```

**JSON success output** (file input):
```json
{
  "success": true,
  "diagnostics": [],
  "output": "src/main.js"
}
```

**JSON success output** (stdin input):
```json
{
  "success": true,
  "diagnostics": [],
  "code": "// Vibefun compiled output\nconst x = 42;\nexport {};\n"
}
```

**JSON error output**:
```json
{
  "success": false,
  "diagnostics": [
    {
      "code": "VF2001",
      "severity": "error",
      "message": "Unexpected end of input",
      "location": { "file": "main.vf", "line": 1, "column": 8 },
      "phase": "parser"
    }
  ]
}
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Compilation succeeded |
| `1` | Compilation error (syntax, type, or semantic error) |
| `2` | Usage error (invalid emit type, bad arguments) |
| `4` | I/O error (file not found, permission denied, write failure) |
| `5` | Internal compiler error |
