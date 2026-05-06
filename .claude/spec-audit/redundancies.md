# Testing Redundancies — Vibefun

Candidate consolidations that would reduce test maintenance load **without losing regression coverage**. Each candidate must be reviewed before any test is removed; this list is conservative by construction.

## Decision Rules

- **Two tests are redundant only if they assert the same observable behavior on the same input class.** Different inputs (operator with `1+2` vs `0+0`) are NOT redundant.
- **Property tests never replace fixed tests.** A monad-law property test plus a regression test for a specific bug are both kept.
- **Layer differences are NOT redundancy.** A unit test of `desugarBinOp` and an execution test running `1 + 2` exercise different concerns.
- **Snapshot ↔ assertion of the same emission IS redundant.** Two snapshots of identical AST output for the same source are flagged.

A candidate is only worth consolidating if removing one test would not weaken any layer's regression coverage of the spec claim.

## Summary

- Total candidates: 19
- Sections reporting candidates: `03a-types-core`, `03b-types-composite`, `03c-types-errors`, `06-functions`, `07-mutable-references`, `08-modules`, `09-error-handling`
- Sections reporting zero: `02-lexical-structure`, `04a-expressions-core`, `04b-expressions-data-fns`, `05-pattern-matching`, `10-javascript-interop`, `11a-stdlib-core`, `11b-stdlib-extra`, `12-compilation`, `13-appendix`, `cross-cutting`

## Candidates by Section

### 03a-types-core

- **Candidate** (per `03a-types-core.md` redundancy entry):
  - Test A: `packages/core/src/typechecker/infer-primitives.test.ts:"should infer Int type for integer literals"`
  - Test B: `tests/e2e/spec-validation/03-type-system.test.ts:"Int type"`
  - **Duplicated assertion**: Both assert that integer literals are inferred as `Int`.
  - **Per-section recommendation**: Keep both. Unit test is fast and isolated; e2e test validates full pipeline. Different test targets.
  - **Synthesis recommendation**: Confirm keep — different layers (unit vs full pipeline e2e) exercise different concerns; per decision rules, layer differences are not redundancy.

- **Candidate** (per `03a-types-core.md` redundancy entry):
  - Test A: `packages/core/src/typechecker/infer-primitives.test.ts:"should infer Float type for float literals"`
  - Test B: `tests/e2e/spec-validation/03-type-system.test.ts:"Float type"`
  - **Duplicated assertion**: Both assert that float literals are inferred as `Float`.
  - **Per-section recommendation**: Same reasoning as Int — keep both.
  - **Synthesis recommendation**: Confirm keep — layer-distinguished (unit vs e2e).

- **Candidate** (per `03a-types-core.md` redundancy entry):
  - Test A: `packages/core/src/typechecker/infer-primitives.test.ts:"should infer String type for string literals"`
  - Test B: `tests/e2e/spec-validation/03-type-system.test.ts:"String type"`
  - **Duplicated assertion**: Both assert that string literals are inferred as `String`.
  - **Per-section recommendation**: Same reasoning as Int — keep both.
  - **Synthesis recommendation**: Confirm keep — layer-distinguished (unit vs e2e).

- **Candidate** (per `03a-types-core.md` redundancy entry):
  - Test A: `packages/core/src/typechecker/infer-primitives.test.ts:"should infer Bool type for boolean literals"`
  - Test B: `tests/e2e/spec-validation/03-type-system.test.ts:"Bool type"`
  - **Duplicated assertion**: Both assert that boolean literals are inferred as `Bool`.
  - **Per-section recommendation**: Same reasoning as Int — keep both.
  - **Synthesis recommendation**: Confirm keep — layer-distinguished (unit vs e2e).

- **Candidate** (per `03a-types-core.md` redundancy entry):
  - Test A: `packages/core/src/typechecker/infer-primitives.test.ts:"should infer Unit type for unit literals"`
  - Test B: `tests/e2e/spec-validation/03-type-system.test.ts:"Unit type"`
  - **Duplicated assertion**: Both assert that unit literals are inferred as `Unit`.
  - **Per-section recommendation**: Same reasoning as Int — keep both.
  - **Synthesis recommendation**: Confirm keep — layer-distinguished (unit vs e2e).

### 03b-types-composite

- **Candidate** (per `03b-types-composite.md` redundancy entry):
  - Test A: `unify.test.ts:"should unify identical record types"` (line 390)
  - Test B: Multiple `infer-records.test.ts` tests covering record construction and field inference.
  - **Duplicated assertion**: Both validate that record types unify / are inferred correctly.
  - **Per-section recommendation**: Keep both — unit tests of unification are independent of inference tests; complementary layers.
  - **Synthesis recommendation**: Confirm keep — unification algorithm vs inference algorithm are different concerns.

- **Candidate** (per `03b-types-composite.md` redundancy entry):
  - Test A: `tests/e2e/spec-validation/03-type-system.test.ts:"width subtyping - extra fields allowed"`
  - Test B: `unify.test.ts:"should support width subtyping when actual (r2) has extra fields"`
  - **Duplicated assertion**: Both assert width subtyping accepts records with extra fields.
  - **Per-section recommendation**: Keep both — unit test validates algorithm, E2E test validates user-visible behavior end-to-end.
  - **Synthesis recommendation**: Confirm keep — layer-distinguished (algorithm vs user-visible pipeline).

- **Candidate** (per `03b-types-composite.md` redundancy entry):
  - Test A: `desugarer/records.test.ts` (24 tests covering record syntax)
  - Test B: `parser/expression-records.test.ts` (record syntax tests)
  - **Duplicated assertion**: Both cover record syntax acceptance/lowering.
  - **Per-section recommendation**: Keep both — desugarer tests validate lowering semantics (field merging, spread expansion), parser tests validate syntactic acceptance.
  - **Synthesis recommendation**: Confirm keep — parsing vs desugaring are distinct compiler phases; not redundant per decision rules.

- **Candidate** (per `03b-types-composite.md` redundancy entry):
  - Test A: `recursive-types.test.ts` (parser)
  - Test B: `spec-validation/03-type-system.test.ts` (recursive variant tests)
  - **Duplicated assertion**: Both test recursive variant parsing.
  - **Per-section recommendation**: Keep both — parser test validates syntax, E2E test validates semantics (execution, type checking).
  - **Synthesis recommendation**: Confirm keep — syntax vs semantics + execution are different concerns.

- **Candidate** (per `03b-types-composite.md` redundancy entry):
  - Test A: Multiple tests in `type-declarations.test.ts` (currying)
  - Test B: Variant constructor inference tests + desugarer currying tests
  - **Duplicated assertion**: All validate variant constructor function behavior.
  - **Per-section recommendation**: Keep — different layers test different aspects (scheme generation, type inference, desugaring).
  - **Synthesis recommendation**: Confirm keep — layer-distinguished across scheme generation, inference, and desugaring.

### 03c-types-errors

- **Candidate** (per `03c-types-errors.md` redundancy entry):
  - Test A: `diagnostic.test.ts:120-160`
  - Test B: `factory.test.ts:100-200`
  - **Duplicated assertion**: Both test diagnostic creation and formatting.
  - **Per-section recommendation**: They test different layers (core diagnostic class vs factory function); both appropriate, no consolidation recommended.
  - **Synthesis recommendation**: Confirm keep — class-level vs factory-level testing is layer-distinguished.

- **Candidate** (per `03c-types-errors.md` redundancy entry):
  - Test A: `modules.test.ts` (all module codes VF5000-VF5101)
  - Test B: Other tests that may touch module error codes
  - **Duplicated assertion**: Comprehensive coverage of module error codes.
  - **Per-section recommendation**: Thorough and not redundant; the dedicated test file is appropriate.
  - **Synthesis recommendation**: Confirm keep — dedicated unit-test file for the code catalog is the right structure; not redundant.

- **Candidate** (per `03c-types-errors.md` redundancy entry):
  - Test A: E2E tests in `03-type-system.test.ts` (covering many VF4xxx type system error codes)
  - Test B: Unit tests in diagnostics module
  - **Duplicated assertion**: Both could surface the same type-system error codes.
  - **Per-section recommendation**: E2E tests exercise the full pipeline; unit tests test code creation/formatting in isolation. Both are valuable, not redundant.
  - **Synthesis recommendation**: Confirm keep — pipeline integration vs creation/formatting are different concerns.

### 06-functions

- **Candidate** (per `06-functions.md` redundancy entry):
  - Test A: `packages/core/src/desugarer/lambdas.test.ts:86-120` ("should curry two-parameter lambda")
  - Test B: `packages/core/src/desugarer/desugarer-primitives.test.ts:221-248` ("should desugar multi-argument applications into curried applications")
  - **Duplicated assertion**: Both verify that multi-param lambdas / applications produce nested single-param lambdas.
  - **Per-section recommendation**: Keep both — first tests the currying function directly; second tests the full App desugaring path. Different purposes (internal desugarer structure vs. surface syntax behavior).
  - **Synthesis recommendation**: Confirm keep — currying primitive vs full App-desugaring path are layer-distinguished.

- **Candidate** (per `06-functions.md` redundancy entry):
  - Test A: `tests/e2e/spec-validation/06-functions.test.ts:54-88` (currying / partial application tests)
  - Test B: `packages/core/src/codegen/es2020/execution-tests/functions.test.ts:13-72` (curried function application tests)
  - **Duplicated assertion**: Both validate currying semantics end-to-end.
  - **Per-section recommendation**: Keep both — spec-validation focuses on language semantics (partial application, mixed calling styles); execution tests focus on runtime behavior. Complementary layers.
  - **Synthesis recommendation**: Confirm keep — spec-semantics vs codegen-runtime are different concerns.

- **Candidate** (per `06-functions.md` redundancy entry):
  - Test A: `tests/e2e/spec-validation/06-functions.test.ts:104-143` (recursive and mutual recursion)
  - Test B: `packages/core/src/typechecker/typechecker-recursion.test.ts` (unit tests)
  - **Duplicated assertion**: Both cover recursion.
  - **Per-section recommendation**: Keep both — full pipeline vs algorithm-in-isolation. Unit tests are faster and catch algorithm bugs earlier; spec-validation tests catch pipeline integration issues.
  - **Synthesis recommendation**: Confirm keep — layer-distinguished (typechecker algorithm vs pipeline execution).

### 07-mutable-references

- **Candidate** (per `07-mutable-references.md` redundancy entry):
  - Test A: `packages/core/src/codegen/es2020/execution-tests/prefix-bang.test.ts:78-91`
  - Test B: `packages/core/src/codegen/es2020/execution-tests/mutable-refs.test.ts:77-89`
  - **Duplicated assertion**: Both assert the property `!(ref x) === x` with identical arbitraries (safe integers in [-1000, 1000]).
  - **Per-section recommendation**: Keep both — one lives in `prefix-bang.test.ts` (home for `!` disambiguation), one in `mutable-refs.test.ts` (home for ref semantics); intentional duplication is documented in comments and justified by navigability.
  - **Synthesis recommendation**: Needs human review — this is the closest case to "same observable behavior on same input class" in the audit (same property, same arbitrary, same execution layer). The audit's navigability rationale is reasonable, but per the strict decision rule this is the only candidate that meets the literal redundancy bar. Recommend keeping per the documented rationale unless test-file ownership is restructured.

- **Candidate** (per `07-mutable-references.md` redundancy entry):
  - Test A: `tests/e2e/spec-validation/07-mutable-references.test.ts:31-38` ("dereference with !" and "dereference string ref")
  - Test B: `packages/core/src/codegen/es2020/execution-tests/prefix-bang.test.ts:15-40` (ref/bool deref tests)
  - **Duplicated assertion**: Both exercise dereferencing behavior.
  - **Per-section recommendation**: Spec-validation tests focus on language specification coverage via the CLI; execution tests focus on runtime semantics. Not redundant — different layers.
  - **Synthesis recommendation**: Confirm keep — CLI/spec-validation vs codegen-execution are different layers.

- **Candidate** (per `07-mutable-references.md` redundancy entry):
  - Test A: `packages/core/src/parser/declarations.test.ts:207-242` (mut + ref syntax acceptance)
  - Test B: `tests/e2e/spec-validation/07-mutable-references.test.ts:14-29` (create ref with mut keyword)
  - **Duplicated assertion**: Both touch mut + ref creation syntax.
  - **Per-section recommendation**: Unit (parser) vs E2E (full pipeline). Not redundant — unit tests rapid parser iteration, E2E tests full pipeline.
  - **Synthesis recommendation**: Confirm keep — layer-distinguished (parser-only vs full pipeline).

### 08-modules

- **Candidate** (per `08-modules.md` redundancy entry):
  - Test A: `module-loader.test.ts:185-193` ("should resolve relative imports ./")
  - Test B: `path-resolver.test.ts` (multiple relative path tests)
  - **Duplicated assertion**: Both assert relative `./` imports resolve correctly.
  - **Per-section recommendation**: Keep both — `path-resolver.test.ts` isolates the resolver function, `module-loader.test.ts` tests integration with the full loader.
  - **Synthesis recommendation**: Confirm keep — function-isolation vs integration are different concerns.

- **Candidate** (per `08-modules.md` redundancy entry):
  - Test A: `cycle-detector.test.ts:93-123` (detects cycles)
  - Test B: `module-resolution.test.ts:102-144` (warns with VF5900 but compiles)
  - **Duplicated assertion**: Both verify cycle detection works.
  - **Per-section recommendation**: Keep both — unit test focuses on the cycle detector in isolation; e2e test verifies the full pipeline.
  - **Synthesis recommendation**: Confirm keep — algorithm-in-isolation vs full-pipeline e2e.

- **Candidate** (per `08-modules.md` redundancy entry):
  - Test A: `08-modules.test.ts:100-107` (".vf extension optional in imports")
  - Test B: `08-modules.test.ts:109-116` ("import with explicit .vf extension")
  - **Duplicated assertion**: Both test extension resolution within the same e2e file.
  - **Per-section recommendation**: Consider consolidating into a single test case with sub-cases, or keep both to emphasize the equivalence. Current structure is acceptable (thin redundancy).
  - **Synthesis recommendation**: Needs human review — these are at the same layer in the same file with two near-identical inputs differing only by the explicit `.vf` suffix. Consolidation into a parameterized test would be safe; alternatively keep as-is for spec-equivalence emphasis. No regression risk either way.

- **Candidate** (per `08-modules.md` redundancy entry):
  - Test A: `module-loader.test.ts:435-446` ("should normalize ./utils and ./utils.vf to same module")
  - Test B: Diamond dependency test (implicitly covers same caching invariant)
  - **Duplicated assertion**: Both touch the singleton/caching-by-real-path invariant.
  - **Per-section recommendation**: Keep both — explicit test documents the invariant; diamond test verifies the side effect (singleton behavior).
  - **Synthesis recommendation**: Confirm keep — explicit-invariant test and emergent-side-effect test serve different documentation/regression roles.

### 09-error-handling

- **Candidate** (per `09-error-handling.md` redundancy entry):
  - Test A: `result.test.ts:29-32` "unwrap returns value on Ok and throws on Err"
  - Test B: `result.test.ts:124-130` property test "unwrap inverts Ok"
  - **Duplicated assertion**: The Ok-path of `unwrap` is covered by both; the property test is stronger via fast-check.
  - **Per-section recommendation**: Keep both because the fixed test also covers the Err exception case which the property test does not. The exception case should be split into a separate dedicated test for error message validation.
  - **Synthesis recommendation**: Confirm keep — per the project's coding standards (`Property tests never replace fixed tests`) and because the fixed test also covers the Err-throws case, both must remain. Splitting the Err case into its own test is a tidy-up but not a redundancy fix.

- **Candidate** (per `09-error-handling.md` redundancy entry):
  - Test A: `option.test.ts:27-32` "isSome / isNone discriminate"
  - Test B: `option.test.ts:106-112` property test "isSome and isNone are mutually exclusive and exhaustive"
  - **Duplicated assertion**: Both assert that `isSome` and `isNone` correctly discriminate `Option`.
  - **Per-section recommendation (superseded)**: The original per-section note read "the fixed test is redundant and could be removed in favor of keeping only the property test." This recommendation is **explicitly superseded by synthesis** — see below. It is recorded here only to show that the per-section author identified a behavioral overlap; the directive to remove the fixed test was incorrect.
  - **Synthesis recommendation**: Confirm keep. The project's `.claude/CODING_STANDARDS.md` § Property-Based Testing states: "Property tests **augment** existing fixed-input tests — they never replace them. Coverage from fixed tests must be preserved." The fixed test must remain; do not consolidate. The per-section recommendation above must not be acted on.

## Notes

Across 17 audit docs, 19 candidates were flagged but only two (`prefix-bang`/`mutable-refs` shared property test, and the `08-modules` `.vf`-extension pair) come close to the strict "same observable behavior on same input class" bar — and the first is justified by intentional navigability and the second is at most a parameterization opportunity. Every other candidate is layer-distinguished (unit vs e2e, parser vs desugarer, algorithm vs pipeline, fixed vs property), which the decision rules explicitly say is **not** redundancy. The single per-section "consider removing" suggestion (Option `isSome`/`isNone`) directly contradicts the project's own Property-Based Testing standard. Net result: **zero genuinely safe consolidations**; one possible parameterization tidy-up; the rest should remain as-is.
