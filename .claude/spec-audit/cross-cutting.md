# Audit: Cross-Cutting Infrastructure

## Sources Reviewed

**Cross-cutting infrastructure** (not tied to a single spec section):
- `packages/core/src/types/test-arbitraries/` — surface AST, core AST, token, type, source, optimizable-expr arbitraries
- `packages/stdlib/src/test-arbitraries/` — variants arbitraries (Option, Result)
- `tests/e2e/let-binding-matrix.test.ts` (~280 lines) — let-form × scenario matrix
- `packages/core/src/typechecker/stdlib-sync.test.ts` — runtime ↔ signature sync
- `tests/e2e/spec-validation/helpers.ts` — file-based assertion helpers
- `packages/cli/tests/fixtures/` — `.vf` ↔ `.js` pairs
- `packages/core/src/module-loader/__fixtures__/` — multi-file project fixtures
- `packages/core/src/parser/snapshot-tests/__snapshots__/` — parser snapshots
- `packages/core/src/codegen/es2020/snapshot-tests/__snapshots__/` — codegen snapshots
- `packages/core/src/utils/` — AST visitors, equality, substitution (cross-cutting compiler utilities)
- `packages/core/src/diagnostics/test-helpers.ts` — diagnostic test infrastructure
- `vitest.config.ts` (root + workspace overrides) — coverage thresholds, exclusions
- `vitest.setup.ts` — fast-check global config (seed, numRuns)

**16 per-section audit docs** read for orphan detection:
`02-lexical-structure.md`, `03a-types-core.md`, `03b-types-composite.md`, `03c-types-errors.md`, `04a-expressions-core.md`, `04b-expressions-data-fns.md`, `05-pattern-matching.md`, `06-functions.md`, `07-mutable-references.md`, `08-modules.md`, `09-error-handling.md`, `10-javascript-interop.md`, `11a-stdlib-core.md`, `11b-stdlib-extra.md`, `12-compilation.md`, `13-appendix.md`.

## Feature Inventory

### F-CC01: Token arbitrary (`token-arb.ts`)

- **Spec ref**: `.claude/CODING_STANDARDS.md` § Property-Based Testing — generators "live next to other test helpers"
- **Status**: ✅ Implemented
- **Implementation**: `packages/core/src/types/test-arbitraries/token-arb.ts` (~360 lines) — exports arbitraries for keywords, identifiers, literals, operators, locations
- **Tests**:
  - Unit: `packages/core/src/types/test-arbitraries/token-arb.test.ts:*` — meta-tests verify the arbitrary always produces well-formed Token shapes
  - Used by: lexer property tests (search for `token-arb` imports across `packages/core/src/lexer/`)
- **Coverage assessment**: ✅ Adequate
- **Notes**: Arbitrary covers every TokenKind variant; meta-test ensures totality of generation.

### F-CC02: Surface AST arbitrary (`ast-arb.ts`)

- **Spec ref**: same standard
- **Status**: ✅ Implemented
- **Implementation**: `packages/core/src/types/test-arbitraries/ast-arb.ts` (~520 lines) — recursive AST generator with depth control
- **Tests**:
  - Unit: `packages/core/src/types/test-arbitraries/ast-arb.test.ts` — meta-tests for shape and termination
  - Used by parser/desugarer property tests
  - Helpers: `ast-equality.ts`, `ast-pretty.ts` for assertions
- **Coverage assessment**: ✅ Adequate
- **Notes**: Verify the arbitrary covers every Expr node kind — confirmed by reading constructor case list.

### F-CC03: Core AST arbitrary (`core-ast-arb.ts`)

- **Spec ref**: same standard
- **Status**: ✅ Implemented
- **Implementation**: `packages/core/src/types/test-arbitraries/core-ast-arb.ts` (~870 lines) — generates already-desugared core AST
- **Tests**:
  - Unit: `packages/core/src/types/test-arbitraries/core-ast-arb.test.ts`
  - Used by: typechecker, codegen, optimizer property tests
- **Coverage assessment**: ✅ Adequate
- **Notes**: Surface vs Core split allows each pipeline phase to property-test on the right input shape.

### F-CC04: Type arbitrary (`type-arb.ts`)

- **Spec ref**: same standard
- **Status**: ✅ Implemented
- **Implementation**: `packages/core/src/types/test-arbitraries/type-arb.ts` (~700 lines) — generates Types and TypeSchemes for unification/inference property tests
- **Tests**:
  - Unit: `packages/core/src/types/test-arbitraries/type-arb.test.ts`
  - Used by: `unify.test.ts`, `infer-*` property tests
- **Coverage assessment**: ✅ Adequate
- **Notes**: Recently fixed for record width subtyping soundness oracle (commit `e786b4e`).

### F-CC05: Stdlib variants arbitrary (`variants-arb.ts`)

- **Spec ref**: same standard
- **Status**: ✅ Implemented
- **Implementation**: `packages/stdlib/src/test-arbitraries/variants-arb.ts` — Option/Result generators
- **Tests**:
  - Unit: `packages/stdlib/src/test-arbitraries/variants-arb.test.ts`
  - Used by: `option.test.ts`, `result.test.ts` for monad-law property tests
- **Coverage assessment**: ✅ Adequate

### F-CC06: Source arbitrary (`source-arb.ts`)

- **Spec ref**: same standard
- **Status**: ✅ Implemented
- **Implementation**: `packages/core/src/types/test-arbitraries/source-arb.ts` (~110 lines) — random source-string generator
- **Tests**: No dedicated `source-arb.test.ts` exists — meta-test missing.
- **Coverage assessment**: ⚠️ Thin
- **Notes**: Compare with token/ast/core-ast/type arbs — each has a `.test.ts` validating the generator. `source-arb` lacks one. If the generator silently degenerates (e.g. always produces empty strings), property tests using it would still pass with no coverage.

### F-CC07: Optimizable-expr arbitrary (`optimizable-expr-arb.ts`)

- **Spec ref**: same standard
- **Status**: ✅ Implemented
- **Implementation**: `packages/core/src/types/test-arbitraries/optimizable-expr-arb.ts` (~50 lines) — generates exprs that should be reducible by optimizer
- **Tests**: No dedicated meta-test exists.
- **Coverage assessment**: ⚠️ Thin
- **Notes**: Same gap as F-CC06 — meta-test absent.

### F-CC08: Let-binding matrix (`tests/e2e/let-binding-matrix.test.ts`)

- **Spec ref**: `CLAUDE.md` § Comprehensive Testing — "Let-binding matrix sync — when adding or changing a let / let rec form ... add the form to tests/e2e/let-binding-matrix.test.ts so every soundness scenario runs through every form"
- **Status**: ✅ Implemented
- **Implementation**: `tests/e2e/let-binding-matrix.test.ts` (~280 lines) — 5 forms × 8 scenarios = 40 cells
  - Forms: top-let-nonrec, top-let-rec-single, top-let-rec-group, expr-let-nonrec, expr-let-rec
  - Scenarios: polymorphic-id, value-restriction, mutable-ref, recursive-fn, mutual-recursion, monomorphism, shadowing, level-discipline
- **Tests**: This *is* the test — each cell is a fixed scenario.
- **Coverage assessment**: ✅ Adequate
- **Notes**: Soundness invariants tested across every form; cross-path divergence surfaces as a failing cell. Critical for typechecker refactor safety.

### F-CC09: Stdlib sync test (`stdlib-sync.test.ts`)

- **Spec ref**: implicit in `CLAUDE.md` — runtime exports must match typechecker module signatures
- **Status**: ✅ Implemented
- **Implementation**: `packages/core/src/typechecker/stdlib-sync.test.ts`
- **Tests**: covers all 7 implemented stdlib modules (List, Option, Result, String, Int, Float, Math) and 6 variant constructors (Cons, Nil, Some, None, Ok, Err).
- **Coverage assessment**: ✅ Adequate (for *implemented* modules)
- **Notes**: When Array/Map/Set/Json modules land (see `11b-stdlib-extra.md` F-39…F-94 ❌ Missing), this test must be expanded to gate them.

### F-CC10: Spec-validation helpers (`tests/e2e/spec-validation/helpers.ts`)

- **Spec ref**: convention; emerged from PR consolidating 08-modules
- **Status**: ✅ Implemented
- **Implementation**: `tests/e2e/spec-validation/helpers.ts` (~150 lines) — `expectCompiles`, `expectCompileError(source, code?)`, `expectFileCompiles`, `expectFileCompileError`, `expectRunOutput`, `expectFileRunOutput`, `expectRuntimeError`, `withOutput`, `withOutputs`, `createTempProject`
- **Tests**: indirectly tested by every spec-validation suite (`02-lexical-structure.test.ts` … `12-compilation.test.ts`) — if a helper breaks, downstream tests fail.
- **Coverage assessment**: ✅ Adequate
- **Notes**: No dedicated unit test for the helpers themselves. Acceptable because every helper is exercised across multiple spec-validation tests.

### F-CC11: CLI fixtures (`packages/cli/tests/fixtures/`)

- **Spec ref**: convention
- **Status**: ✅ Implemented
- **Implementation**: 17 `.vf` fixture files paired with `.js` expected outputs, plus error fixtures (BOM, unicode, comments, multi-error)
- **Tests**: consumed by `packages/cli/tests/{compilation,emit-modes,error-handling,flags,output-validity,run,stdin}.test.ts`
- **Coverage assessment**: ✅ Adequate

### F-CC12: Module loader fixtures (`packages/core/src/module-loader/__fixtures__/`)

- **Spec ref**: convention
- **Status**: ✅ Implemented
- **Implementation**: 7 fixture projects — single-module, simple-import, diamond-dependency, re-export, circular, type-only-cycle, value-cycle
- **Tests**: consumed by `module-loader.test.ts`, `path-resolver.test.ts`, `path-mapping.test.ts`, `package-resolver.test.ts`, `cycle-detector.test.ts`, `resolver.test.ts`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Fixture projects mirror real-world structure; no dedicated test validates that fixtures themselves remain valid `.vf` projects after refactors. Worth noting as ⚠️ Thin defensive testing of fixtures.

### F-CC13: Parser snapshot suite (`packages/core/src/parser/snapshot-tests/`)

- **Spec ref**: convention
- **Status**: ✅ Implemented
- **Implementation**: 8 snapshot test files — `snapshot-control-flow.test.ts`, `snapshot-data-structures.test.ts`, `snapshot-declarations.test.ts`, `snapshot-expressions.test.ts`, `snapshot-functions.test.ts`, `snapshot-modules.test.ts`, `snapshot-patterns.test.ts`, `snapshot-real-world.test.ts`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Per-section audits each cite specific snapshot files (`functions.test.ts`, `patterns.test.ts`, etc.). `snapshot-modules.test.ts` and `snapshot-real-world.test.ts` were not cited (orphans — see Orphan Tests section below).

### F-CC14: Codegen snapshot suite (`packages/core/src/codegen/es2020/snapshot-tests/`)

- **Spec ref**: convention
- **Status**: ✅ Implemented
- **Implementation**: 6 snapshot test files mirroring parser snapshots — `snapshot-control-flow.test.ts`, `snapshot-data-structures.test.ts`, `snapshot-declarations.test.ts`, `snapshot-expressions.test.ts`, `snapshot-functions.test.ts`, `snapshot-patterns.test.ts`, `snapshot-real-world.test.ts`
- **Coverage assessment**: ✅ Adequate
- **Notes**: `snapshot-real-world.test.ts` is an orphan (see below).

### F-CC15: Codegen execution-tests suite (`packages/core/src/codegen/es2020/execution-tests/`)

- **Spec ref**: `CLAUDE.md` cites these as the integration layer for "compile + run real .vf code"
- **Status**: ✅ Implemented
- **Implementation**: 11 execution test files — `numeric.test.ts`, `operators.test.ts`, `pattern-matching.test.ts`, `functions.test.ts`, `records.test.ts`, `mutable-refs.test.ts`, `user-defined-types.test.ts`, `module-reexports.test.ts`, `prefix-bang.test.ts`, `float-arithmetic.test.ts`, `misc.test.ts`
- **Coverage assessment**: ✅ Adequate
- **Notes**: `misc.test.ts` is an orphan — its content should be inspected to determine which spec section to file findings under.

### F-CC16: AST visitor / utility test suite (`packages/core/src/utils/`)

- **Spec ref**: implicit — these are compiler infrastructure
- **Status**: ✅ Implemented
- **Implementation**: `ast-analysis.ts`, `ast-transform.ts`, `expr-equality.ts`, `substitution.ts`
- **Tests**: 8 colocated test files (ast-analysis, ast-transform-{fold-expr,transform-children,transform-expr,visit-expr}, expr-equality-{equals,equivalent}, substitution-{core,expressions})
- **Coverage assessment**: ✅ Adequate
- **Notes**: Pure compiler infrastructure; not directly tied to spec features but supports every phase. Per-section audits did not cite these.

### F-CC17: Diagnostics test infrastructure (`packages/core/src/diagnostics/test-helpers.ts`)

- **Spec ref**: implicit
- **Status**: ✅ Implemented
- **Implementation**: `test-helpers.ts` provides utilities for asserting diagnostic emission in tests
- **Tests**: `test-helpers.test.ts` — meta-tests
- **Coverage assessment**: ✅ Adequate

### F-CC18: CLI utility tests (`packages/cli/src/utils/`)

- **Spec ref**: implicit
- **Status**: ✅ Implemented
- **Implementation**: `file-io.ts`, `timer.ts`, `format-error.ts` — CLI helpers
- **Tests**: `file-io.test.ts`, `timer.test.ts`, `format-error.test.ts`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Pure utility tests; not spec-bound.

### F-CC19: Vitest configuration

- **Spec ref**: `CLAUDE.md` § Quality Checks; `CODING_STANDARDS.md` § Property-Based Testing
- **Status**: ✅ Implemented
- **Implementation**:
  - Root `vitest.config.ts` — coverage thresholds (lines 88%, branches 81%, functions 88%, statements 88%); excludes test infrastructure
  - `tests/e2e/vitest.config.ts` — 60s test timeout for CLI spawns
  - `vitest.setup.ts` — `fc.configureGlobal({ seed, numRuns })` for deterministic per-PR runs
- **Tests**: enforced by CI (the `Check coverage decrease` step compares against `main`)
- **Coverage assessment**: ✅ Adequate
- **Notes**: Current monorepo combined coverage at audit start: lines 92.80%, statements 91.92%, functions 92.59%, branches 86.71% — all comfortably above thresholds.

## Feature Gaps (this section)

- **F-CC06** Source arbitrary — no meta-test (`source-arb.test.ts` missing). Risk: silently-broken generator wouldn't be detected.
- **F-CC07** Optimizable-expr arbitrary — no meta-test. Same risk.

## Testing Gaps (this section)

- **F-CC06**, **F-CC07**: add meta-tests modeled on `token-arb.test.ts`/`type-arb.test.ts` to confirm the generator is total and produces well-shaped output.
- **F-CC09** Stdlib sync test — does not yet gate Array/Map/Set/Json (because they are not implemented per `11b-stdlib-extra.md`). When those modules land, expand the sync test in the same commit.
- **F-CC12** Module loader fixtures — no test asserts each fixture itself is a valid `.vf` project (i.e. the fixtures are not validated against the spec's module rules). A drift between fixture content and spec semantics would only surface indirectly via the consuming tests.

## Testing Redundancies (this section)

_None._ Each cross-cutting feature serves a distinct concern (token vs surface vs core AST arbitraries; matrix vs sync vs helpers). No two arbitraries cover the same input space; no two test suites assert the same observable.

## Orphan Spec Files

**Count**: 0.

A reverse-mapping check (each `.md` under `docs/spec/` excluding `01-introduction.md`, top-level `README.md`, `CLAUDE.md`, `.agent-map.md`) confirms every in-scope spec file is cited as "Sources Reviewed" in at least one per-section audit doc. Total in-scope spec files: 45.

## Orphan Tests

**Count**: 81 `*.test.ts` files are not cited by basename in any per-section audit doc.

These are not necessarily *uncovered* features — most are tests that the per-section audits referenced under generic descriptions (e.g. "lexer integration tests") instead of by exact filename. The list below is what a future audit-completeness pass should reconcile, not a list of broken or missing tests.

### Genuinely cross-cutting (no spec-section bucket — already covered by F-CCxx above)

- `packages/core/src/types/test-arbitraries/{ast-arb,core-ast-arb,token-arb,type-arb}.test.ts` (4) — F-CC01..04
- `packages/core/src/utils/{ast-analysis,ast-transform-fold-expr,ast-transform-transform-children,ast-transform-transform-expr,ast-transform-visit-expr,expr-equality-equals,expr-equality-equivalent,substitution-core,substitution-expressions}.test.ts` (9) — F-CC16
- `packages/core/src/diagnostics/test-helpers.test.ts` (1) — F-CC17
- `packages/core/src/types/{environment,token}.test.ts` (2) — F-CC16-adjacent (token-shape tests, env data structure)
- `packages/cli/src/{format-error,utils/file-io,utils/timer}.test.ts` (3) — F-CC18

### Should be referenced by `02-lexical-structure.md`

`packages/core/src/lexer/{comments,identifiers,numbers-edge-cases,numbers-formats,numbers-location,operators-edge-cases,operators-invalid,operators-multi-char,operators-punctuation,strings,unicode-normalization,whitespace-tracking}.test.ts` (12) — these are the granular lexer test files; the lexical audit should cite each by filename.

### Should be referenced by `04a-expressions-core.md` or `02-lexical-structure.md` (parser-level)

`packages/core/src/parser/{deep-nesting,empty-blocks,expression-functions,expression-lists,import-namespace,keyword-field-names,lambda-precedence,mixed-imports,multiple-spreads,operator-sections,parser-errors,parser-integration-basic,parser-integration-phase4,semicolon-required,trailing-commas,tuple-types,tuples,unicode-edge-cases}.test.ts` (18) — split between expression-core, expression-data-fns, modules (imports), and lexical (semicolons, unicode, trailing commas).

`packages/core/src/parser/snapshot-tests/{snapshot-modules,snapshot-real-world}.test.ts` (2) — `snapshot-modules` belongs to `08-modules.md`; `snapshot-real-world` is integration-level and should be cited under `12-compilation.md`.

### Should be referenced by `12-compilation.md`

- `packages/core/src/codegen/codegen.test.ts`
- `packages/core/src/codegen/es2020/{emit-declarations,emit-expressions}.test.ts`
- `packages/core/src/codegen/es2020/execution-tests/misc.test.ts`
- `packages/core/src/codegen/es2020/snapshot-tests/snapshot-real-world.test.ts`
- `packages/core/src/desugarer/{conditionals,desugarBinOp,desugarListLiteral,desugarListPattern,desugarListWithConcats,desugarRecordTypeField,desugarTypeDefinition,desugarTypeExpr,FreshVarGen,lowerLetBinding}.test.ts` (10)
- `packages/core/src/optimizer/{optimizer,passes/beta-reduction,passes/cse,passes/eta-reduction}.test.ts` (4)
- `packages/core/src/config/config-loader.test.ts` (1) — vibefun.json loading

### Should be referenced by `03a-types-core.md` or `03b-types-composite.md`

- `packages/core/src/typechecker/{division-lowering,environment,format,module-type,type-annotation-let,typechecker-basic,unify-test-helpers}.test.ts` (7)
- `packages/core/src/typechecker/module-signatures/index.test.ts` (1) — should be in `03a` or `08-modules`

### Should be referenced by `08-modules.md`

- `packages/core/src/typechecker/module-import.test.ts`

### Should be referenced by `09-error-handling.md`

- `tests/e2e/try-catch.test.ts` — verifies try-catch behavior end-to-end

### Should be referenced by `11a-stdlib-core.md`

- `packages/stdlib/src/index.test.ts` — index re-export integrity

## Recommended Reconciliation

For a fully-tight reverse mapping, the affected per-section audits should be amended to list each file by filename in their "Sources Reviewed". This is bookkeeping, not a new finding. The synthesis docs (`feature-gaps.md`, `testing-gaps.md`, `redundancies.md`) do not depend on this reconciliation since they aggregate F-NN entries, not file lists.
