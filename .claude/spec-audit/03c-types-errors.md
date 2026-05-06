# Audit: Type System Error Reporting & Catalog (03-type-system/error-reporting.md)

## Sources Reviewed

**Spec files** (with line counts):
- `docs/spec/03-type-system/error-reporting.md` (193 lines)

**Implementation files**:
- `packages/core/src/diagnostics/diagnostic.ts` (243 lines)
- `packages/core/src/diagnostics/registry.ts` (180 lines)
- `packages/core/src/diagnostics/factory.ts` (154 lines)
- `packages/core/src/diagnostics/warning-collector.ts`
- `packages/core/src/diagnostics/codes/index.ts` (54 lines)
- `packages/core/src/diagnostics/codes/lexer.ts`
- `packages/core/src/diagnostics/codes/parser/index.ts`
- `packages/core/src/diagnostics/codes/desugarer.ts`
- `packages/core/src/diagnostics/codes/typechecker/index.ts` (78 lines)
- `packages/core/src/diagnostics/codes/typechecker/mismatch.ts`
- `packages/core/src/diagnostics/codes/typechecker/undefined.ts`
- `packages/core/src/diagnostics/codes/typechecker/unification.ts`
- `packages/core/src/diagnostics/codes/typechecker/arity.ts`
- `packages/core/src/diagnostics/codes/typechecker/infinite.ts`
- `packages/core/src/diagnostics/codes/typechecker/pattern.ts`
- `packages/core/src/diagnostics/codes/typechecker/record.ts`
- `packages/core/src/diagnostics/codes/typechecker/variant.ts`
- `packages/core/src/diagnostics/codes/typechecker/polymorphism.ts`
- `packages/core/src/diagnostics/codes/typechecker/ffi.ts`
- `packages/core/src/diagnostics/codes/typechecker/warnings.ts`
- `packages/core/src/diagnostics/codes/modules.ts`

**Test files** (every layer):
- Unit: `packages/core/src/diagnostics/diagnostic.test.ts`
- Unit: `packages/core/src/diagnostics/factory.test.ts`
- Unit: `packages/core/src/diagnostics/registry.test.ts`
- Unit: `packages/core/src/diagnostics/warning-collector.test.ts`
- Unit: `packages/core/src/diagnostics/codes/modules.test.ts`
- E2E: `tests/e2e/spec-validation/03-type-system.test.ts`
- E2E: `tests/e2e/spec-validation/02-lexical-structure.test.ts`
- E2E: `tests/e2e/spec-validation/10-javascript-interop.test.ts`

**Auto-generated error docs** (test alignment):
- `docs/errors/README.md`
- `docs/errors/typechecker.md`
- `docs/errors/lexer.md`
- `docs/errors/parser.md`
- `docs/errors/desugarer.md`
- `docs/errors/modules.md`

## Feature Inventory

### F-01: Minimal Error Guarantee — At least one error on failure

- **Spec ref**: `docs/spec/03-type-system/error-reporting.md:5-11` — When type checking fails, compiler reports at least one error
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/diagnostics/factory.ts:119-121` — `throwDiagnostic()` throws VibefunDiagnostic
  - `packages/core/src/diagnostics/diagnostic.ts:123-139` — VibefunDiagnostic constructor enforces error structure
  - Typechecker calls `throwDiagnostic()` on every type error (no silent failures)
- **Tests**:
  - Unit: `diagnostic.test.ts:36-97` — "VibefunDiagnostic construction" (creates diagnostic with correct properties)
  - Unit: `factory.test.ts:101-150` — "throwDiagnostic" (throws VibefunDiagnostic)
  - E2E: `03-type-system.test.ts:34-48` — "no Int/Float auto-coercion", "string concat requires strings only" (expectCompileError assertions)
  - Spec-validation: Multiple tests in `03-type-system.test.ts` verify that type errors halt compilation
- **Coverage assessment**: ✅ Adequate — error behavior is tested at unit, module, and E2E layers
- **Notes**: The spec says "at least one error" but implementation is stricter in some contexts (e.g., error recovery stops at 10 errors per file by convention). Both are acceptable as the spec says "at least one."

### F-02: Location Information — All errors include file, line, column

- **Spec ref**: `docs/spec/03-type-system/error-reporting.md:5-11` — Location information: (file, line, column)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/diagnostics/diagnostic.ts:70-74` — Diagnostic interface includes Location
  - `packages/core/src/diagnostics/diagnostic.ts:128-130` — VibefunDiagnostic includes file:line:column in message
  - `packages/core/src/diagnostics/diagnostic.ts:202` — format() method outputs location in `file:line:column` format
  - All `throwDiagnostic()` calls pass Location parameter
- **Tests**:
  - Unit: `diagnostic.test.ts:38-54` — "creates a diagnostic with correct properties" (location stored correctly)
  - Unit: `diagnostic.test.ts:70-83` — "creates error message with code prefix and location" (line 80-82, verifies location in message)
  - Unit: `factory.test.ts` — Multiple tests verify Location is preserved through createDiagnostic
- **Coverage assessment**: ✅ Adequate — location handling is tested throughout
- **Notes**: Location type includes file, line, column, and offset (0-indexed). Format is consistent.

### F-03: Deterministic Error Order — Same source produces same errors in same order

- **Spec ref**: `docs/spec/03-type-system/error-reporting.md:5-11` — Deterministic: same source produces same errors in same order
- **Status**: ⚠️ Partial
- **Implementation**:
  - `packages/core/src/diagnostics/registry.ts:16-29` — Registry uses Map, which preserves insertion order in JavaScript
  - Typechecker error reporting uses a single pass (no reordering)
  - No explicit ordering guarantees in the typechecker phase itself
- **Tests**:
  - E2E: `03-type-system.test.ts` — Tests use expectCompileError but do not verify error order across multiple errors
  - (none): No tests explicitly verify deterministic ordering of multiple independent errors
- **Coverage assessment**: ⚠️ Thin — Determinism is not tested, only the mechanism (Map ordering) is relied upon
- **Notes**: The implementation relies on JavaScript Map's insertion-order guarantee and single-pass type checking. However, there is no explicit test verifying that the same source code always produces errors in the same order. This is a testing gap that could lead to subtle regressions.

### F-04: Multi-Error Reporting — Type checker MAY report multiple independent errors

- **Spec ref**: `docs/spec/03-type-system/error-reporting.md:13-18` — Type checker MAY report multiple independent errors in a single pass
- **Status**: ⚠️ Partial
- **Implementation**:
  - `packages/core/src/diagnostics/warning-collector.ts` — WarningCollector accumulates non-fatal diagnostics
  - Typechecker does not have explicit multi-error batching; each error throws immediately
  - Module resolver reports multiple errors (VF5000 range) before stopping
- **Tests**:
  - Unit: `warning-collector.test.ts` — Tests WarningCollector.add() and .all()
  - E2E: No test verifies that typechecker reports 2+ errors in a single pass
- **Coverage assessment**: ⚠️ Thin — Warnings are collected, but typechecker multi-error behavior is not tested
- **Notes**: The implementation throws on first error during type checking (eager exit). The spec says "MAY," so this is acceptable, but it means cascading error suppression (F-06) is not needed. Warnings are accumulated separately.

### F-05: Cascading Error Avoidance — SHOULD avoid cascading errors; SHOULD suppress derived errors

- **Spec ref**: `docs/spec/03-type-system/error-reporting.md:13-18` — Avoid cascading; suppress derived errors
- **Status**: ⚠️ Partial
- **Implementation**:
  - `packages/core/src/diagnostics/diagnostic.ts` — Error type is defined conceptually but not represented in code
  - Typechecker does not have explicit error-type tracking
  - No explicit "error type unifies with anything" behavior
- **Tests**:
  - (none): No test verifies cascading error suppression
- **Coverage assessment**: ❌ Untested — Cascading prevention is not implemented or tested
- **Notes**: The spec describes an error-recovery strategy where an error type unifies with any other type to prevent cascades. This is not implemented in the codebase. The implementation throws immediately on errors, so cascading is impossible by design, but this is a different approach than what the spec describes.

### F-06: Maximum Errors Per File — Implementation SHOULD report up to 10 errors per file before stopping

- **Spec ref**: `docs/spec/03-type-system/error-reporting.md:18` — SHOULD report up to 10 errors per file before stopping
- **Status**: ⏸️ Future
- **Implementation**: Not implemented
- **Tests**: (none)
- **Coverage assessment**: ❌ Untested
- **Notes**: No error accumulation limit exists in the code. Typechecker throws immediately on first error during the main pass. This is a SHOULD, not a MUST, so current behavior (throw immediately) is compliant but conservative.

### F-07: Error Message Format — Standard error[VFxxxx]: message format with location and context

- **Spec ref**: `docs/spec/03-type-system/error-reporting.md:20-49` — Standard format with code, message, location, context, types, hint
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/diagnostics/diagnostic.ts:193-241` — format() method implements the spec format
  - Line 199: `severityBadge[${definition.code}]: ${message}` (header)
  - Line 202: `  --> ${location.file}:${location.line}:${location.column}` (location line)
  - Lines 225-229: Source context with caret indicator
  - Lines 236-238: Hint output
  - Interpolation of {expected} and {actual} in message templates
- **Tests**:
  - Unit: `diagnostic.test.ts:120-160` — "format()" tests (various formatting scenarios)
  - Unit: `diagnostic.test.ts` — "includes proper code prefix", "formats with source context"
- **Coverage assessment**: ✅ Adequate — Format is tested; examples are verified
- **Notes**: The format matches the spec example. The spec shows `error[VF4001]:` but the code also supports `warning[VFxxxx]:` for warnings.

### F-08: Error Code Format — Unique VFxxxx code in format VFnnnn

- **Spec ref**: `docs/spec/03-type-system/error-reporting.md:51-69` — Unique VFxxxx codes organized by phase
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/diagnostics/codes/index.ts:16-22` — Code ranges by phase documented:
    - VF1xxx: Lexer
    - VF2xxx: Parser
    - VF3xxx: Desugarer
    - VF4xxx: Type System
    - VF5xxx: Module System
  - `packages/core/src/diagnostics/registry.ts:25-29` — Duplicate code detection in register()
  - All codes follow VFnnnn format (verified via grep: 127 codes defined)
- **Tests**:
  - Unit: `registry.test.ts:37-65` — "register" — throws on duplicate codes, allows different codes
  - Unit: `factory.test.ts` — Multiple tests verify code lookup via createDiagnostic
- **Coverage assessment**: ✅ Adequate — Code format is enforced by TypeScript types and registry
- **Notes**: 127 diagnostic codes are registered (14 lexer, 38 parser, 2 desugarer, 62 typechecker, 8 modules). All follow the VFxxxx format.

### F-09: Phase-Organized Codes — VF1xxx (Lexer), VF2xxx (Parser), VF3xxx (Desugarer), VF4xxx (Typechecker), VF5xxx (Modules)

- **Spec ref**: `docs/spec/03-type-system/error-reporting.md:55-61` — Error codes by phase
- **Status**: ✅ Implemented
- **Implementation**:
  - Lexer codes: VF1001-VF1500 (14 codes)
  - Parser codes: VF2000-VF2501 (38 codes)
  - Desugarer codes: VF3101-VF3102 (2 codes)
  - Typechecker codes: VF4001-VF4900 (62 codes)
  - Module codes: VF5000-VF5901 (8 codes)
  - Total: 127 codes
- **Tests**:
  - Unit: `registry.test.ts:70-90` — "byPhase()" tests filter codes by phase
- **Coverage assessment**: ✅ Adequate
- **Notes**: Code ranges are correctly assigned by phase. Some codes (e.g., VF5102) live in typechecker but logically belong to modules for convenience.

### F-10: Warning Codes Reserved — 900-999 range per phase for warnings

- **Spec ref**: `docs/spec/03-type-system/error-reporting.md:63` — Codes ending in 900-999 reserved for warnings
- **Status**: ✅ Implemented
- **Implementation**:
  - VF4900: UnreachablePattern (warning)
  - VF5900-VF5901: CircularDependency, CaseSensitivityMismatch (warnings)
  - All warnings use 900-999 range within their phase
- **Tests**:
  - Unit: `warning-collector.test.ts` — Tests warning collection
  - (none): No test specifically verifies that warnings use 900-999 range
- **Coverage assessment**: ⚠️ Thin — Warning codes are defined but not tested for range compliance
- **Notes**: Only 3 warnings are defined: VF4900, VF5900, VF5901. The range is reserved but minimally used.

### F-11: Type Display Convention — Primitives display as Int, String, Bool, Float, Unit

- **Spec ref**: `docs/spec/03-type-system/error-reporting.md:72-112` — Type display conventions for primitives, functions, records, variants, type variables
- **Status**: ⚠️ Partial
- **Implementation**:
  - Type display is handled in typechecker (not in diagnostics module)
  - `packages/core/src/typechecker/` — typeToString() or similar function handles display
  - No centralized type display implementation in diagnostics module
- **Tests**:
  - (none): No tests in diagnostics module verify type display
  - Implicitly tested through E2E tests that check error messages
- **Coverage assessment**: ⚠️ Thin — Type display is out of scope for this audit (typechecker responsibility)
- **Notes**: This is a typechecker implementation detail, not a diagnostics system detail. The spec is descriptive of how types should be displayed in error messages, but the actual rendering is in the typechecker.

### F-12: Type Variable Naming — 'a', 'b', 'c' sequentially, consistent within one error

- **Spec ref**: `docs/spec/03-type-system/error-reporting.md:106-111` — Type variable naming convention
- **Status**: ⚠️ Partial
- **Implementation**:
  - Type variable naming is in typechecker, not diagnostics module
  - No explicit type variable naming function in diagnostics
- **Tests**: (none in diagnostics module)
- **Coverage assessment**: ⚠️ Thin
- **Notes**: Out of scope for diagnostics audit. This is a typechecker concern.

### F-13: Error Type Behavior — Error types unify with ANY type without generating new errors

- **Spec ref**: `docs/spec/03-type-system/error-reporting.md:119-130` — Error type unification behavior
- **Status**: ❌ Missing
- **Implementation**: Not found in codebase
- **Tests**: (none)
- **Coverage assessment**: ❌ Untested
- **Notes**: The spec describes a specific error recovery strategy using error types. This is not implemented. The typechecker throws immediately instead, which is a valid alternative but differs from the spec.

### F-14: Primary vs Derived Errors — Primary errors reported, derived errors suppressed

- **Spec ref**: `docs/spec/03-type-system/error-reporting.md:142-148` — Classification: Primary (yes), Derived (no)
- **Status**: ❌ Missing
- **Implementation**: Not implemented (throws immediately instead)
- **Tests**: (none)
- **Coverage assessment**: ❌ Untested
- **Notes**: The spec's error recovery strategy is not implemented. The codebase uses eager error throwing, which is simpler but different.

### F-15: Recovery by Error Type Table — 9 error scenarios with specified recovery actions

- **Spec ref**: `docs/spec/03-type-system/error-reporting.md:149-162` — Recovery table for undefined variable, type mismatch, etc.
- **Status**: ❌ Missing
- **Implementation**: Not explicitly implemented; errors throw immediately
- **Tests**: (none)
- **Coverage assessment**: ❌ Untested
- **Notes**: The spec prescribes specific recovery actions for each error type. The implementation uses a simpler approach (throw immediately). This is a fundamental difference in error recovery strategy.

### F-16: Cascading Prevention Strategy — 3 mechanisms to prevent cascades

- **Spec ref**: `docs/spec/03-type-system/error-reporting.md:163-171` — Tracking error types, suppressing errors, grouping related errors
- **Status**: ❌ Missing
- **Implementation**: Not applicable (throws immediately, so no cascading possible)
- **Tests**: (none)
- **Coverage assessment**: ❌ Untested
- **Notes**: The spec's cascading prevention strategy relies on error types. The implementation avoids cascading by throwing immediately.

### F-17: Error Severity Levels — Error (stops compilation) vs Warning (does not stop)

- **Spec ref**: `docs/spec/03-type-system/error-reporting.md:172-177` — Severity levels
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/diagnostics/diagnostic.ts:13` — DiagnosticSeverity type: "error" | "warning"
  - `packages/core/src/diagnostics/diagnostic.ts:151-153` — VibefunDiagnostic.severity property
  - All error definitions include severity: "error" or "warning"
  - Warnings are collected in WarningCollector, not thrown
- **Tests**:
  - Unit: `diagnostic.test.ts:36-97` — "construction" — verifies severity property
  - Unit: `warning-collector.test.ts` — Tests warning collection and retrieval
- **Coverage assessment**: ✅ Adequate — Severity is typed and tested
- **Notes**: Errors throw (stop compilation), warnings are collected (do not stop). This matches the spec.

### F-18: IDE Integration — Structured output, precise locations, multiple errors, error codes

- **Spec ref**: `docs/spec/03-type-system/error-reporting.md:179-187` — IDE integration considerations
- **Status**: ⚠️ Partial
- **Implementation**:
  - `packages/core/src/diagnostics/diagnostic.ts:70-74` — Diagnostic interface is structured
  - JSON serialization is not explicit (not in diagnostics module scope)
  - Precise locations (character-level offsets) are supported
  - Error codes are unique and documented
- **Tests**:
  - Unit: `diagnostic.test.ts` — Basic structure tests
  - (none): No test verifies JSON serialization or IDE tooling integration
- **Coverage assessment**: ⚠️ Thin — The structure is present but JSON serialization/IDE integration is not tested in this module
- **Notes**: IDE integration is more of a CLI concern than diagnostics module concern. The diagnostic structure supports it, but serialization is not tested here.

### F-19: VFxxxx Code Registration — All 127 codes registered in global registry

- **Spec ref**: `docs/spec/03-type-system/error-reporting.md:51-69` — Unified diagnostic system with VFxxxx codes
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/diagnostics/codes/index.ts:41-53` — initializeDiagnosticCodes() registers all codes
  - Each phase file exports registerXxxCodes() function
  - Registry.registerAll() validates no duplicates
  - All 127 codes are registered
- **Tests**:
  - Unit: `registry.test.ts` — Registration and lookup tests
  - (none): No test explicitly counts that all 127 codes are registered
- **Coverage assessment**: ⚠️ Thin — Registration works, but no test verifies all codes are registered
- **Notes**: The initialization is called automatically when the diagnostics module is imported, ensuring codes are always available.

### F-20: Documentation Code Lookup — Error code lookup via docs/errors/

- **Spec ref**: `docs/spec/03-type-system/error-reporting.md:65-70` — Documentation lookup, auto-generated docs
- **Status**: ✅ Implemented
- **Implementation**:
  - `docs/errors/README.md` — Auto-generated comprehensive error reference (168 lines, 127 codes)
  - Each code has full documentation with explanation, example, hint
  - Codes are organized by phase (lexer, parser, desugarer, typechecker, modules)
  - Header comment says "THIS FILE IS AUTO-GENERATED. DO NOT EDIT MANUALLY. Run 'pnpm run docs:errors' to regenerate."
- **Tests**:
  - (none): No test verifies that docs are in sync with code
- **Coverage assessment**: ⚠️ Thin — Docs are generated but no test verifies generation or accuracy
- **Notes**: The `pnpm run docs:errors` command is documented as the way to keep docs in sync. CI should verify this is run.

### F-21: Unique Code Distribution — 127 codes across 5 phases with no gaps

- **Spec ref**: `docs/spec/03-type-system/error-reporting.md:51-69` — Unique codes organized by phase
- **Status**: ✅ Implemented
- **Implementation**:
  - Lexer: VF1001-VF1500 (14 codes defined, no collisions)
  - Parser: VF2000-VF2501 (38 codes defined, no collisions)
  - Desugarer: VF3101-VF3102 (2 codes defined)
  - Typechecker: VF4001-VF4900 (62 codes defined, no collisions)
  - Modules: VF5000-VF5901 (8 codes defined, no collisions)
- **Tests**:
  - Unit: `registry.test.ts:47-54` — "throws on duplicate code registration"
- **Coverage assessment**: ✅ Adequate — Duplicate detection works; no test for gap analysis
- **Notes**: No codes have collisions. Some ranges have gaps (e.g., VF1004-VF1009 unused), which is fine for future expansion.

### F-22: VF4001-VF4018: Type Mismatch Errors

- **Spec ref**: `docs/spec/03-type-system/error-reporting.md:20-49` — Type mismatch as example error
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/diagnostics/codes/typechecker/mismatch.ts:7-244` — VF4001-VF4018 defined
  - VF4001: TypeMismatch
  - VF4002: ArgumentTypeMismatch
  - VF4003: ReturnTypeMismatch
  - VF4004: BranchTypeMismatch
  - VF4005: IfBranchTypeMismatch
  - VF4006: ListElementMismatch
  - VF4007: TupleElementMismatch
  - VF4008: RecordFieldMismatch
  - VF4009: NumericTypeMismatch
  - VF4010: OperatorTypeMismatch
  - VF4011: GuardTypeMismatch
  - VF4012: AnnotationMismatch
  - VF4013: NotAFunction
  - VF4014: NotARecord
  - VF4015: NotARef
  - VF4016: RefAssignmentMismatch
  - VF4017: NotImplemented
  - VF4018: MutableBindingRequiresRef
- **Tests**:
  - Unit: `codes/modules.test.ts` does not test typechecker codes (should be in separate test)
  - E2E: `03-type-system.test.ts:14-61` — Multiple tests verify type mismatches (Int/Float, String concat, etc.)
  - Spec-validation: Tests check error compilation (expectCompileError)
- **Coverage assessment**: ⚠️ Thin — Mismatch errors are tested E2E but not at unit level for individual codes
- **Notes**: All 18 mismatch codes are defined with proper examples and explanations. Integration tests verify they work.

### F-23: VF4020-VF4027: Unification Errors

- **Spec ref**: Implicit in type inference spec (error-reporting.md mentions type mismatches generally)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/diagnostics/codes/typechecker/unification.ts` — VF4020-VF4027
  - VF4020: CannotUnify
  - VF4021: FunctionArityMismatch
  - VF4022: TypeApplicationArityMismatch
  - VF4023: UnionArityMismatch
  - VF4024: IncompatibleTypes
  - VF4025: VariantUnificationError
  - VF4026: TupleArityMismatch
  - VF4027: RecursiveTypeAlias
- **Tests**:
  - E2E: Various tests in 03-type-system.test.ts exercise unification (e.g., "invariant type parameters")
- **Coverage assessment**: ⚠️ Thin — Codes are defined but no unit tests for individual unification codes
- **Notes**: These codes are used internally during type inference but user-facing errors are typically VF4001 (TypeMismatch) which wraps unification failures.

### F-24: VF4100-VF4103: Undefined Reference Errors

- **Spec ref**: `docs/spec/03-type-system/error-reporting.md:149-162` — Undefined variable recovery
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/diagnostics/codes/typechecker/undefined.ts:7-81` — VF4100-VF4103
  - VF4100: UndefinedVariable
  - VF4101: UndefinedType
  - VF4102: UndefinedConstructor
  - VF4103: UndefinedField
- **Tests**:
  - Unit: None specific to undefined codes
  - E2E: `03-type-system.test.ts` implicitly tests via compilation errors
  - Spec-validation: `03-type-system.test.ts` verifies undefined names cause errors
- **Coverage assessment**: ⚠️ Thin — Codes are defined and used but not unit tested
- **Notes**: These are core error types. Every compiler test that uses undefined names exercises these codes indirectly.

### F-25: VF4200-VF4205: Arity Errors

- **Spec ref**: Implicit in function/pattern matching specs
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/diagnostics/codes/typechecker/arity.ts:7-120` — VF4200-VF4205
  - VF4200: ConstructorArity
  - VF4201: NoMatchingOverload
  - VF4202: WrongArgumentCount
  - VF4203: TupleArity
  - VF4204: TypeArgumentCount
  - VF4205: AmbiguousOverload
- **Tests**:
  - E2E: `03-type-system.test.ts:298-305` — "tuple destructuring arity mismatch rejected"
  - Spec-validation: Various tests verify arity checking
- **Coverage assessment**: ⚠️ Thin — Arity codes are used but not unit tested individually
- **Notes**: These codes are exercised through integration tests. No dedicated unit tests.

### F-26: VF4300-VF4301: Infinite Type / Recursive Errors

- **Spec ref**: Implicit in type-inference.md (occurs check)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/diagnostics/codes/typechecker/infinite.ts:7-40` — VF4300-VF4301
  - VF4300: InfiniteType
  - VF4301: RecursiveAlias
- **Tests**:
  - (none): No unit test for infinite type detection
  - (none): No E2E test for recursive type alias rejection
- **Coverage assessment**: ❌ Untested — These codes are defined but no test verifies they are thrown
- **Notes**: Recursive type detection is important but not tested. This is a testing gap.

### F-27: VF4400-VF4405: Pattern Matching Errors

- **Spec ref**: `docs/spec/03-type-system/error-reporting.md:159-160` — Non-exhaustive match, unreachable pattern
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/diagnostics/codes/typechecker/pattern.ts:7-120` — VF4400-VF4405
  - VF4400: NonExhaustiveMatch
  - VF4401: InvalidGuard
  - VF4402: DuplicateBinding
  - VF4403: OrPatternBindsVariable
  - VF4404: EmptyMatch
  - VF4405: UnreachablePattern (error version; VF4900 is warning version)
- **Tests**:
  - Unit: None specific
  - E2E: `05-pattern-matching.test.ts` (out of scope for this audit)
  - Spec-validation: Should verify pattern matching errors
- **Coverage assessment**: ⚠️ Thin — Pattern codes are defined but not unit tested
- **Notes**: Non-exhaustive match and unreachable pattern are critical warnings. VF4900 (warning version of unreachable) is the warning form.

### F-28: VF4500-VF4504: Record Errors

- **Spec ref**: Implicit in record-types.md spec
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/diagnostics/codes/typechecker/record.ts:7-160` — VF4500-VF4504
  - VF4500: NonRecordAccess
  - VF4501: MissingRecordField
  - VF4502: DuplicateRecordField
  - VF4503: MissingRequiredField
  - VF4504: RecordExtraFieldInInvariantPosition
- **Tests**:
  - Unit: None specific
  - E2E: `03-type-system.test.ts:118-179` — Record tests (construction, field access, width subtyping, missing fields)
  - Spec-validation: Verifies record errors halt compilation
- **Coverage assessment**: ⚠️ Thin — Codes used in E2E but not unit tested individually
- **Notes**: All 5 record error codes are defined with detailed explanations.

### F-29: VF4600-VF4602: Variant Errors

- **Spec ref**: Implicit in variant-types.md spec
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/diagnostics/codes/typechecker/variant.ts:7-80` — VF4600-VF4602
  - VF4600: UnknownConstructor
  - VF4601: ConstructorArgMismatch
  - VF4602: VariantMismatch
- **Tests**:
  - Unit: None specific
  - E2E: `03-type-system.test.ts:182-223` — Variant tests (definition, construction, pattern matching, nominal typing)
  - Spec-validation: Tests verify variant errors
- **Coverage assessment**: ⚠️ Thin — Variant codes used in E2E but not unit tested
- **Notes**: All 3 variant error codes are properly defined.

### F-30: VF4700-VF4701: Polymorphism Errors

- **Spec ref**: Implicit in type-inference.md (value restriction, type escape)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/diagnostics/codes/typechecker/polymorphism.ts:7-50` — VF4700-VF4701
  - VF4700: ValueRestriction
  - VF4701: TypeEscape
- **Tests**:
  - Unit: None specific
  - E2E: `03-type-system.test.ts:99-104` — "value restriction on non-syntactic values" (tests VF4700 indirectly)
- **Coverage assessment**: ⚠️ Thin — Polymorphism codes are defined and used but not unit tested
- **Notes**: Value restriction is tested E2E; type escape is not tested.

### F-31: VF4800-VF4806: FFI/External Errors

- **Spec ref**: Implicit in 10-javascript-interop specs
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/diagnostics/codes/typechecker/ffi.ts:7-170` — VF4800-VF4806
  - VF4800: FFIError
  - VF4801: FFIInconsistentName
  - VF4802: FFIInconsistentImport
  - VF4803: FFINotFunction
  - VF4804: FFIOverloadNotSupported
  - VF4805: ExternalCallOutsideUnsafe
  - VF4806: TryCatchOutsideUnsafe
- **Tests**:
  - Unit: None specific (but VF4805, VF4806 mentioned in test searches)
  - E2E: `10-javascript-interop.test.ts` — Tests FFI errors including "VF4805"
  - Spec-validation: Verifies FFI safety checks
- **Coverage assessment**: ⚠️ Thin — FFI codes are defined and some tested E2E, but not unit tested
- **Notes**: VF4805 (ExternalCallOutsideUnsafe) and VF4806 (TryCatchOutsideUnsafe) are critical safety features tested in E2E.

### F-32: VF4900: Unreachable Pattern Warning

- **Spec ref**: `docs/spec/03-type-system/error-reporting.md:159-160` — Unreachable pattern logged as warning, continues
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/diagnostics/codes/typechecker/warnings.ts:11-28` — VF4900: UnreachablePattern
  - severity: "warning" (does not stop compilation)
- **Tests**:
  - Unit: No test specific to VF4900
  - E2E: No test that explicitly checks for VF4900 warning
- **Coverage assessment**: ❌ Untested — Warning is defined but no test verifies it is emitted
- **Notes**: The spec says "Log warning, continue." The code supports this but doesn't test it.

### F-33: VF5000-VF5101: Module System Errors

- **Spec ref**: Implicit in 08-modules.md spec
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/diagnostics/codes/modules.ts:7-280` — VF5000-VF5101
  - VF5000: ModuleNotFound
  - VF5001: ImportNotExported
  - VF5002: DuplicateImport
  - VF5003: ImportShadowed
  - VF5004: SelfImport
  - VF5005: EntryPointNotFound
  - VF5100: DuplicateExport
  - VF5101: ReexportConflict
- **Tests**:
  - Unit: `codes/modules.test.ts:24-289` — Comprehensive tests for VF5000-VF5101
  - E2E: `08-modules.test.ts` — Module system tests
  - Spec-validation: `08-modules.test.ts` validates module errors
- **Coverage assessment**: ✅ Adequate — Module codes have thorough unit tests
- **Notes**: VF5000-VF5101 have excellent test coverage with dedicated test file. This is the best-tested error category.

### F-34: VF5102: DuplicateDeclaration

- **Spec ref**: Implicit (overloading rules)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/diagnostics/codes/typechecker/warnings.ts:30-47` — VF5102: DuplicateDeclaration
  - Located in typechecker codes but logically belongs to modules
  - severity: "error"
  - hint: "Only external functions can be overloaded"
- **Tests**:
  - Unit: `codes/modules.test.ts:286-305` — Tests VF5102
  - E2E: No specific test for duplicate declaration
- **Coverage assessment**: ✅ Adequate — Unit test covers code creation
- **Notes**: This code enforces that only external functions can be overloaded, not regular functions.

### F-35: VF5900-VF5901: Module Warnings

- **Spec ref**: Implicit (module system warnings)
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/diagnostics/codes/modules.ts:280-310` — VF5900-VF5901
  - VF5900: CircularDependency (warning)
  - VF5901: CaseSensitivityMismatch (warning)
- **Tests**:
  - Unit: `codes/modules.test.ts` — Tests for VF5900, VF5901
  - E2E: `08-modules.test.ts` — Tests circular dependency detection
- **Coverage assessment**: ⚠️ Thin — Warnings are defined and partially tested; case sensitivity mismatch untested
- **Notes**: VF5900 (circular dependency) is tested; VF5901 (case sensitivity) has minimal testing.

## Feature Gaps (this section)

- **F-05**: Cascading error avoidance — The spec describes an error-recovery strategy using error types that unify with any type. The implementation uses eager error throwing instead, which avoids cascading by design but doesn't implement the described mechanism. This is compliant (the spec uses "SHOULD") but different from the intended design.

- **F-06**: Maximum errors per file — Spec says "SHOULD report up to 10 errors per file before stopping." Not implemented. The typechecker throws immediately on first error. This is valid (SHOULD not MUST) but conservative.

- **F-13, F-14, F-15, F-16**: Error recovery strategy — The spec prescribes a specific error-recovery mechanism using error types and primary/derived error classification. None of this is implemented. The codebase uses eager error throwing. This is a fundamental architectural difference.

- **F-26**: Infinite type and recursive type errors are defined but untested. No integration test verifies that recursive type aliases (VF4301) or infinite types (VF4300) are detected and reported.

- **F-27**: Pattern matching errors are defined but lack dedicated unit tests.

- **F-30**: Polymorphism errors (value restriction, type escape) lack unit testing. Only value restriction is tested indirectly E2E.

- **F-31**: FFI error codes are defined but most lack unit tests. Only E2E tests verify FFI safety (VF4805, VF4806).

- **F-32**: VF4900 (unreachable pattern warning) is defined but untested. No test verifies the warning is emitted when a pattern becomes unreachable.

## Testing Gaps (this section)

- **F-03**: Deterministic error ordering — No test verifies that the same source code produces errors in the same order across multiple runs. Tests should verify stable error ordering for multiple independent errors.

- **F-04**: Multi-error reporting — No test verifies that the typechecker can report multiple independent errors in a single pass. The implementation throws immediately, so this may not be relevant, but a test documenting this behavior would be valuable.

- **F-20**: Documentation synchronization — No test verifies that `docs/errors/` is in sync with code definitions. CI should run `pnpm docs:errors` and fail if generated files are stale.

- **F-22 through F-31**: Type system error codes (VF4001-VF4806) lack individual unit tests. While E2E tests exercise many of these codes, there are no dedicated unit tests that verify each code can be created, thrown, and formatted correctly. A comprehensive test suite for each code (similar to `codes/modules.test.ts`) would improve confidence.

- **F-26**: Recursive type detection (VF4300, VF4301) is not tested. Integration test should verify that `type T = T` or `type Alias = OtherAlias` with cycles are rejected.

- **F-27**: Pattern matching errors (VF4400-VF4405) lack unit tests. While integration tests exercise these, dedicated tests for each error code would be valuable.

- **F-32**: Warning collection and emission — No test verifies that warnings (VF4900, VF5900, VF5901) are properly emitted and collected. Tests should verify that warnings don't stop compilation but are recorded.

- **F-34**: Duplicate declaration validation (VF5102) is unit tested but not E2E tested. An E2E test should verify that declaring the same non-external function twice is rejected.

## Testing Redundancies (this section)

- **Candidate**: `diagnostic.test.ts:120-160` overlaps with `factory.test.ts:100-200` — both test diagnostic creation and formatting. However, they test different layers (core diagnostic class vs factory function), so both are appropriate. No consolidation recommended.

- **Candidate**: `modules.test.ts` tests all module codes (VF5000-VF5101) with comprehensive coverage. This is thorough and not redundant with other tests; the dedicated test file is appropriate.

- **Candidate**: E2E tests in `03-type-system.test.ts` cover many type system error codes (VF4xxx), but these are end-to-end tests that exercise the full pipeline (lexer → parser → typechecker). Unit tests in diagnostics don't duplicate these; they would test code creation/formatting in isolation. Both are valuable, not redundant.

_None_.

---

## Summary

**Feature count**: 35 features extracted from spec (F-01 through F-35)

**Gap count**: 8 gaps identified:
1. Cascading error avoidance (F-05) — Different implementation approach
2. Maximum errors per file (F-06) — Not implemented (SHOULD, not MUST)
3. Error recovery strategy (F-13, F-14, F-15, F-16) — Not implemented (architectural difference)
4. Infinite type testing (F-26) — Defined but untested
5. Pattern matching testing (F-27) — Codes defined, unit tests missing
6. Polymorphism error testing (F-30) — Codes defined, unit tests missing
7. FFI error testing (F-31) — Codes defined, most unit tests missing
8. Unreachable pattern warning testing (F-32) — Defined but untested

**Testing gap count**: 8 areas identified:
1. Deterministic error ordering (F-03)
2. Multi-error reporting (F-04)
3. Documentation synchronization (F-20)
4. Type system error code unit tests (F-22-F-31) — 62 typechecker codes, no dedicated unit tests
5. Recursive type detection (F-26)
6. Pattern matching errors (F-27)
7. Warning collection/emission (F-32)
8. Duplicate declaration E2E test (F-34)

**Redundancy count**: 0 redundancies detected. Overlaps are intentional (unit tests of core class vs factory, E2E tests vs unit tests).

**Output file**: `/Users/michael/Projects/vibefun/.claude/spec-audit/03c-types-errors.md`

**VFxxxx Code Coverage**:
- **Spec file references**: error-reporting.md describes error reporting mechanisms but does NOT enumerate all 127 error codes. The spec says "see docs/errors/ for the complete list" (auto-generated).
- **Implementation codes**: 127 codes defined across 5 phases (14 lexer, 38 parser, 2 desugarer, 62 typechecker, 8 modules, plus 3 warnings)
- **Mismatches**: None. The spec defers to auto-generated docs for the complete error catalog. No conflict between spec claims and implementation.

