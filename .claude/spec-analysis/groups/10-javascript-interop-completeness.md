# Group 10: JavaScript Interop Completeness

## Root Issue
Several JavaScript interop features are incomplete: multi-line unsafe blocks, unsafe block enforcement, and try/catch expressions.

## Affected Sections
10-javascript-interop

## Affected Tests (count)
3 tests directly (others in section 10 fail due to stdlib name resolution, which is Group 1).

## Details
1. **Multi-line unsafe blocks** (Small): The unsafe block parser doesn't skip newlines after `{` and only parses a single expression. Fix: use `parseBlockExprFn` instead of `parseExpressionFn`.

2. **Unsafe block enforcement** (Medium): The typechecker doesn't track whether the current context is inside an `unsafe` block. External function calls compile without `unsafe` wrappers. Needs an `inUnsafe` context flag.

3. **Try/catch expressions** (Large): Keywords are reserved but no AST node, parser handling, or codegen exists. This is a new feature requiring full pipeline support.

## Individual Failures
- **10**: 1 test (nested unsafe blocks -- multi-line), 1 test (unsafe enforcement -- wrong reason for passing), 1 test (try-catch)

## Estimated Fix Scope
Medium to Large (1-3 days total). Multi-line unsafe is a quick fix. Enforcement is medium. Try/catch is a full feature implementation.
