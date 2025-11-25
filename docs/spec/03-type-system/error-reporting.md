# Type Error Reporting

This document specifies how the Vibefun type checker reports errors, including message format, error recovery, and multi-error reporting behavior.

## Error Reporting Guarantees

### Minimal Requirements

1. **At least one error on failure**: When type checking fails, the compiler reports at least one error
2. **Location information**: All errors include source location (file, line, column)
3. **Deterministic**: The same source code produces the same errors in the same order

### Multi-Error Reporting

- Type checker MAY report multiple independent errors in a single pass
- Type checker SHOULD avoid cascading errors (errors caused by previous errors)
- Derived errors (errors caused by prior type failures) SHOULD be suppressed
- Implementation SHOULD report up to 10 errors per file before stopping

## Error Message Format

Vibefun uses TypeScript-style concise error messages focused on what's wrong and how to fix it.

### Standard Format

```
error[VF0001]: Type mismatch
  --> src/example.vf:10:15
   |
10 | let result = compute() + "hello"
   |              ^^^^^^^^^
   |
   = expected: Int
   =      got: String
   |
   = hint: Use String.fromInt() for conversion
```

### Format Components

| Component | Required | Description |
|-----------|----------|-------------|
| Error code | Yes | Unique identifier (VF0001-VF0299) |
| Brief message | Yes | One-line description of the error |
| Location | Yes | File path, line number, column number |
| Source context | Yes | Relevant source line(s) with caret indicator |
| Expected type | When applicable | The type that was expected |
| Actual type | When applicable | The type that was found |
| Hint | Optional | Actionable suggestion for fixing the error |

### Error Codes

All type errors have a unique 4-digit code in the format `VF0000`. Error codes enable:
- Documentation lookup via `--explain VF0001`
- Programmatic error handling in tooling
- Consistent error identification across versions

See [Error Catalog](./error-catalog.md) for the complete list of error codes.

## Type Display Conventions

When displaying types in error messages, the compiler follows these conventions:

### Basic Types

| Type | Display |
|------|---------|
| Primitives | `Int`, `String`, `Bool`, `Float`, `Unit` |
| Type variables | `'a`, `'b`, `'c` (sequential lowercase letters) |
| References | `Ref<Int>`, `Ref<'a>` |

### Compound Types

| Type | Display |
|------|---------|
| Function (1 param) | `Int -> String` |
| Function (n params) | `(Int, String) -> Bool` |
| Generic application | `List<Int>`, `Option<'a>` |
| Tuple | `(Int, String)`, `(Bool, Int, String)` |

### Record Types

| Condition | Display |
|-----------|---------|
| 3 or fewer fields | `{ x: Int, y: Int }` |
| More than 3 fields | `{ name: String, age: Int, ... }` |

Field order in display is alphabetical by field name.

### Variant Types

Variants display by their declared name: `Option<Int>`, `Result<String, Error>`

### Type Variable Naming

- Use `'a`, `'b`, `'c` sequentially within a single error message
- Naming is consistent within one error (same variable = same letter)
- Naming resets between independent errors
- If more than 26 variables needed, continue with `'a1`, `'b1`, etc.

## Error Recovery Strategy

### Overview

The type checker uses **error type placeholders** to continue checking after errors, enabling multiple independent errors to be reported.

### Error Type Behavior

When an error occurs (e.g., undefined variable, type mismatch), the type checker:

1. Records the primary error with full location and type information
2. Returns a special "error type" that represents the failed inference
3. Continues type checking the rest of the program

Error types have special unification behavior:
- An error type unifies with ANY type without generating new errors
- This prevents cascading errors from a single root cause

### Example

```vibefun
let x = unknownVar      // VF0050: Undefined variable 'unknownVar'
let y = x + 1           // No error: error type + Int = error type
let z = y * 2           // No error: error type * Int = error type
let w = 10 / valid      // VF0050: Undefined variable 'valid' (independent)
```

Only two errors are reported because `y` and `z` errors would be derived from the `x` error.

### Primary vs Derived Errors

| Classification | Report? | Criteria |
|----------------|---------|----------|
| Primary | Yes | First error at a location, no prior error types involved |
| Derived | No | Expected or actual type contains an error type |

### Recovery by Error Type

| Error | Recovery Action | Result Type |
|-------|-----------------|-------------|
| Undefined variable | Log error, create error type | Error placeholder |
| Undefined type | Log error, create error type | Error placeholder |
| Type mismatch | Log error, return error type | Error placeholder |
| Occurs check failure | Log error, skip binding | Error placeholder |
| Arity mismatch | Log error, return error type | Error placeholder |
| Missing record field | Log error, use error for field | Error placeholder |
| Non-exhaustive match | Log **warning**, continue | Original type |
| Unreachable pattern | Log **warning**, continue | Original type |
| Value restriction | Log error, keep monomorphic | Monomorphic type |

### Cascading Prevention

The type checker prevents cascading errors by:

1. Tracking error types through type inference
2. Suppressing errors where expected or actual type is an error type
3. Only reporting primary, independent errors
4. Grouping related errors when they share a common cause

## Error Severity Levels

| Severity | Description | Stops Compilation? |
|----------|-------------|-------------------|
| Error | Type system violation | Yes |
| Warning | Potentially problematic code (unreachable patterns) | No |

## IDE Integration Considerations

The error reporting system is designed for IDE integration:

- **Structured output**: Errors can be serialized to JSON for tooling
- **Precise locations**: Character-level offsets enable precise highlighting
- **Multiple errors**: IDE can show all errors without repeated compilation
- **Error codes**: Enable quick-fix suggestions and documentation lookup

## Related Documentation

- [Error Catalog](./error-catalog.md) - Complete list of error codes with examples
- [Type Inference](./type-inference.md) - How types are inferred
- [Pattern Matching Exhaustiveness](../05-pattern-matching/exhaustiveness.md) - Pattern matching errors
