# CLI MVP Context

**Last Updated:** 2026-01-31 (Gap analysis update)

## Key Files Reference

### Requirements
- `.claude/design/cli-mvp.md` - Authoritative MVP specification

### Existing CLI
- `packages/cli/src/index.ts` - Current minimal CLI (94 lines, only lexer+parser work)
- `packages/cli/package.json` - Dependencies: commander, @vibefun/core

### Core Package
- `packages/core/src/index.ts` - Current exports (Lexer, Parser, diagnostics)
- `packages/core/src/desugarer/index.ts` - Exports `desugarModule`
- `packages/core/src/desugarer/desugarer.ts:641` - `desugarModule` implementation
- `packages/core/src/typechecker/index.ts` - Exports from typechecker
- `packages/core/src/typechecker/typechecker.ts` - `typeCheck` function, `TypedModule` type

### Type Definitions
- `packages/core/src/types/ast.ts` - Surface AST (Module, Expr, etc.)
- `packages/core/src/types/core-ast.ts` - Core AST (CoreModule, CoreExpr, etc.)
- `packages/core/src/types/environment.ts` - Type system types (Type, TypeEnv)

## Current Pipeline Status

| Phase | Status | Location |
|-------|--------|----------|
| Lexer | Implemented, exported | `lexer/lexer.ts` |
| Parser | Implemented, exported | `parser/parser.ts` |
| Desugarer | Implemented, exported | `desugarer/desugarer.ts` |
| TypeChecker | Implemented, exported | `typechecker/typechecker.ts` |
| Optimizer | Implemented, exported | `optimizer/` (not needed for MVP) |
| Code Generator | NOT IMPLEMENTED | N/A |

## Core Functions to Export

### From Desugarer
```typescript
// packages/core/src/desugarer/index.ts
export { desugarModule } from "./desugarer.js";
```

`desugarModule(module: Module): CoreModule`
- Takes Surface AST from parser
- Returns Core AST for typechecker

### From TypeChecker
```typescript
// packages/core/src/typechecker/typechecker.ts
export function typeCheck(module: CoreModule, options?: TypeCheckOptions): TypedModule;

export type TypedModule = {
    module: CoreModule;
    env: TypeEnv;
    declarationTypes: Map<string, Type>;
};
```

## Error System

### VibefunDiagnostic
The unified error type used throughout the compiler:
- Has `format(source: string)` method for human-readable output
- Contains: code, severity, message, location, phase
- Error codes: VF1xxx (lexer), VF2xxx (parser), VF3xxx (desugarer), VF4xxx (typechecker)

### Exit Code Mapping
| Exit Code | Condition |
|-----------|-----------|
| 0 | Success |
| 1 | VibefunDiagnostic thrown (compilation error) |
| 2 | Commander parse error (bad arguments) |
| 4 | Node.js file system error (ENOENT, EACCES, etc.) |
| 5 | Any other Error (internal bug) |

## CLI Architecture Notes

### Commander.js Usage
Current CLI uses commander v14.0.3:
```typescript
import { Command } from "commander";
const program = new Command();
program
    .name("vibefun")
    .version("0.1.0")
    .command("compile")
    .argument("<file>")
    .option("-o, --output <path>")
    .action((file, options) => { ... });
```

### Global vs Command Options
- Global options (--quiet, --verbose, --json) go on `program`
- Command options (-o, --emit) go on `.command("compile")`
- Access global: `program.opts()`
- Access command: passed to action handler

## Type Formatting for JSON Output

The typechecker's `Type` is an internal representation. For `--emit typed-ast`, need to convert to strings:

```typescript
// packages/core/src/typechecker/format.ts
export function typeToString(type: Type): string;
export function formatType(type: Type): string;  // Alias
```

Already exported from `@vibefun/core` - use for `--emit typed-ast` output.

## Warning Collection

The diagnostics module provides warning collection:

```typescript
// packages/core/src/diagnostics/
export class WarningCollector { ... }
```

Use for collecting non-fatal warnings during compilation (e.g., VF4900 non-exhaustive match).

## AST Node Counting

For `--verbose` output showing node counts, recursively count AST nodes:

```typescript
function countNodes(module: Module): number {
    let count = 0;
    // Count declarations
    for (const decl of module.declarations) {
        count += countDeclNodes(decl);
    }
    return count;
}
```

## Testing Infrastructure

### Vitest Configuration
Project uses vitest. Tests colocated with source:
- `src/utils/timer.ts` → `src/utils/timer.test.ts`

### Test Command
```bash
npm test -w @vibefun/cli
```

### E2E Testing Pattern
```typescript
import { execSync } from "child_process";

it("compiles file", () => {
    const result = execSync("node dist/index.js compile test.vf", {
        cwd: "/path/to/cli",
        encoding: "utf-8"
    });
});
```
