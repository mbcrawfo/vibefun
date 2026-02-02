# Snapshot Tests for ES2020 Code Generator

This directory contains snapshot tests that capture the generated JavaScript output for various Vibefun programs.

## Purpose

Snapshot tests validate the complete code generation output by:

1. Compiling `.vf` fixture files through the full pipeline (lexer → parser → desugarer → typechecker → codegen)
2. Capturing the generated JavaScript as a snapshot
3. Comparing future runs against these snapshots to detect unintended changes

## Directory Structure

```
snapshot-tests/
├── __snapshots__/           # Vitest snapshot files (auto-generated)
│   └── *.test.ts.snap       # Snapshot data
├── *.vf                     # Fixture files (Vibefun source code)
├── snapshot-*.test.ts       # Test files that compile fixtures
├── test-helpers.ts          # Shared compilation helper
└── CLAUDE.md                # This file
```

## Fixture Files

| File | Coverage |
|------|----------|
| `expressions.vf` | Literals, operators, lambdas, function application |
| `declarations.vf` | Let bindings, type declarations, exports |
| `patterns.vf` | Pattern matching, destructuring |
| `data-structures.vf` | Records, tuples, variants |
| `functions.vf` | Curried functions, recursion |
| `real-world.vf` | Realistic usage patterns |

## Running Snapshot Tests

```bash
# Run all snapshot tests
npm test -w @vibefun/core -- snapshot

# Run specific snapshot test
npm test -w @vibefun/core -- snapshot-expressions

# Update snapshots after intentional changes
npm test -w @vibefun/core -- snapshot -u
```

## When to Update Snapshots

Update snapshots (`npm test -- -u`) when:

- Code generation output format changes intentionally
- New features are added that affect output
- Bug fixes change the generated code

**Always review snapshot diffs carefully** before updating to ensure changes are intentional.

## Adding New Snapshot Tests

1. Create a new `.vf` fixture file with representative Vibefun code
2. Create a corresponding `snapshot-<name>.test.ts` test file:

```typescript
import { describe, expect, it } from "vitest";
import { compileFixture } from "./test-helpers.js";

describe("Codegen Snapshot - <Name>", () => {
    it("should compile <name>.vf", () => {
        const { code } = compileFixture("<name>.vf");
        expect(code).toMatchSnapshot();
    });
});
```

3. Run the test to generate the initial snapshot
4. Review the generated snapshot file in `__snapshots__/`

## Test Helper

The `compileFixture()` function in `test-helpers.ts` runs the full compilation pipeline on a fixture file and returns the generated JavaScript code. This ensures snapshots capture the real end-to-end output.
