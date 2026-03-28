# Group 10: Module System Integration

## Problem
The CLI compilation pipeline is single-file only and never invokes the module loader/resolver. The module-loader and module-resolver packages exist and have unit tests, but are not wired into the CLI. Additionally, the typechecker does not populate the type environment from import declarations.

Sub-issues:
1. **Test quoting**: All module tests use single-quoted import paths but the lexer only supports double quotes
2. **CLI single-file pipeline**: `compilePipeline()` processes one file, never invokes module resolution
3. **Typechecker ignores imports**: `CoreImportDecl` handler is a no-op
4. **Re-export resolution**: Depends on multi-file compilation working

## Affected Sections
- 08-modules: 9 tests (all)

## Estimated Complexity
Large - Requires:
1. Fix test quotes (trivial)
2. Integrate module loader/resolver into CLI pipeline (large)
3. Cross-module type checking (medium)
4. Re-export handling (medium, incremental)
