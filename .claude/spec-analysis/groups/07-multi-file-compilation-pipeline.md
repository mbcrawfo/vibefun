# Group 7: Multi-File Compilation Pipeline (Module System)

## Root Issue
The CLI's `compilePipeline()` processes a single file. The `ModuleLoader`, `ModuleGraphBuilder`, `CycleDetector`, and path resolution infrastructure all exist in `@vibefun/core` but are never invoked from the CLI. Imported symbols are never resolved or added to the type environment.

Additionally, all module test fixtures use single-quoted strings for import paths (`from './lib'`), but the lexer only supports double-quoted strings.

## Affected Sections
08-modules (all 14 failing tests)

## Affected Tests (count)
14 tests (all module tests). The 2 "passing" tests pass for the wrong reason (lexer error on single quotes, not actual module validation).

## Details
Sub-issues:
1. **Single-quoted strings in test fixtures** (Small): All test fixtures use `'` but the lexer only supports `"`. The module spec examples also use single quotes, creating a spec inconsistency.
2. **CLI integration with module-loader** (XL): The compile/run commands need to invoke `ModuleLoader.loadModules()` and feed the module graph into the compilation pipeline.
3. **Multi-file typechecking** (Large): Imported bindings need to be resolved into the type environment.
4. **Multi-file codegen** (Large): All discovered modules need to be compiled (or bundled).
5. **Re-exports** (Large): `ReExportDecl` exists in the surface AST but not in the core AST, desugarer, or codegen.
6. **Namespace imports** (Medium): Codegen only emits named imports, not `import * as`.
7. **Module initialization ordering** (High complexity): Could leverage Node.js ES module semantics.

## Individual Failures
All 14 failing tests in section 08.

## Estimated Fix Scope
XL (3+ days). Significant infrastructure exists but the orchestration and integration work is substantial. The single-quote test fixture fix is Small and independent.
