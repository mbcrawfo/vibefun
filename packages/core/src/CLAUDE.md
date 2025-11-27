# Compiler Core Source

This directory contains the Vibefun compiler implementation. Each module handles a stage of the compilation pipeline.

## Module Guide

| Module | Purpose | Docs |
|--------|---------|------|
| lexer/ | Tokenization | — |
| parser/ | AST generation | [CLAUDE.md](./parser/CLAUDE.md) |
| desugarer/ | Surface syntax → Core AST | — |
| typechecker/ | Type inference & checking | — |
| optimizer/ | AST optimizations | — |
| config/ | Compiler configuration (vibefun.json) | — |
| module-loader/ | Module discovery & parsing | — |
| module-resolver/ | Dependency graph & cycle detection | — |
| diagnostics/ | Error system (VFxxxx codes) | [README](./diagnostics/README.md), [Adding Codes](./diagnostics/codes/README.md) |
| types/ | Shared type definitions | — |
| utils/ | Common utilities | — |

> **Maintenance:** When adding or removing folders in `src/`, update this module guide to keep it accurate.

## Critical: Error System

When adding compiler errors:
- **User-facing errors** → `throwDiagnostic("VFxxxx", loc, params)`
- **Internal bugs** → plain `throw new Error(...)`

See [diagnostics/README.md](./diagnostics/README.md) for full usage guide.

## Architecture

See [docs/compiler-architecture/](../../../docs/compiler-architecture/) for pipeline overview.
