# Compiler Core Source

This directory contains the Vibefun compiler implementation. Each module handles a stage of the compilation pipeline.

## Module Guide

| Module | Purpose |
|--------|---------|
| `lexer/` | Tokenization |
| `parser/` | AST generation |
| `desugarer/` | Surface syntax → Core AST |
| `typechecker/` | Type inference & checking (Hindley-Milner) |
| `optimizer/` | AST optimizations |
| `codegen/` | JavaScript emission |
| `config/` | Compiler configuration (`vibefun.json`) |
| `module-loader/` | Module discovery, parsing, caching |
| `module-resolver/` | Dependency graph, cycle detection, compile order |
| `diagnostics/` | Error/warning system (`VFxxxx` codes) |
| `types/` | Shared type definitions (Surface AST, Core AST, TypeEnv, Token) |
| `utils/` | Shared AST utilities (visitor, equality, substitution) |

Nested `CLAUDE.md` files inside these folders are loaded automatically when you work there — there is no need to enumerate them here.

## Critical: Error System

When adding compiler errors:
- **User-facing errors** → `throwDiagnostic("VFxxxx", loc, params)`
- **Internal bugs** → plain `throw new Error(...)`

See `./diagnostics/README.md` for the full usage guide and `./diagnostics/codes/README.md` for the process of adding new codes. After adding or changing codes run `pnpm docs:errors`.

## Architecture

See `../../../docs/compiler-architecture/` for the pipeline overview.

## Maintenance

When a module folder is added, renamed, or removed under `src/`, update the table above in the same commit. Keep the one-line purpose descriptions accurate.
