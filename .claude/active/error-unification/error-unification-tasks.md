# Error Unification - Task List

**Last Updated:** 2025-11-25 (Review Amendments Applied)

## Phase 1: Infrastructure
**Status:** Not Started

- [ ] Create `packages/core/src/diagnostics/` directory structure
- [ ] Implement `diagnostic.ts`:
  - [ ] `DiagnosticSeverity` type
  - [ ] `DiagnosticPhase` type
  - [ ] `DiagnosticExample` interface (bad, good, description)
  - [ ] `DiagnosticDefinition` interface:
    - [ ] Core fields: code, title, messageTemplate, severity, phase, category
    - [ ] Optional hint: hintTemplate
    - [ ] Documentation fields: explanation (required), example (required)
    - [ ] Optional documentation: relatedCodes, seeAlso
  - [ ] `Diagnostic` interface
  - [ ] `VibefunDiagnostic` class with `format(source?)` method
- [ ] Implement `registry.ts`:
  - [ ] `DiagnosticRegistry` class
  - [ ] `get(code)` method
  - [ ] `all()` method
  - [ ] `byPhase(phase)` method
  - [ ] `bySeverity(severity)` method (NEW - for warnings)
  - [ ] `explain(code)` method
  - [ ] Duplicate detection on registration
- [ ] Implement `factory.ts`:
  - [ ] `interpolate()` helper for message templates
  - [ ] `createDiagnostic()` function
  - [ ] `throwDiagnostic()` function
- [ ] Implement `warning-collector.ts` (NEW):
  - [ ] `WarningCollector` class
  - [ ] `add(warning)` method
  - [ ] `getWarnings()` method
  - [ ] `hasWarnings()` method
  - [ ] `clear()` method
- [ ] Implement `test-helpers.ts` (NEW):
  - [ ] `expectDiagnostic(fn, code)` function
  - [ ] `expectWarning(collector, code)` function
- [ ] Create `codes/index.ts` with empty placeholder exports
- [ ] Create `diagnostics/index.ts` public exports
- [ ] Write unit tests (side-by-side with source files):
  - [ ] `diagnostic.test.ts` - class creation, formatting with source
  - [ ] `registry.test.ts` - lookup, duplicate detection, severity filtering
  - [ ] `factory.test.ts` - interpolation, creation
  - [ ] `warning-collector.test.ts` - accumulation, retrieval
  - [ ] `test-helpers.test.ts` - helper functions
- [ ] Implement `interpolate()` with missing placeholder handling:
  - [ ] Leave unmatched `{placeholder}` as-is in output
  - [ ] Add test cases for missing placeholders
- [ ] Implement registry duplicate detection:
  - [ ] Throw Error at registration time for duplicates
  - [ ] Add test case for duplicate code detection
- [ ] Implement `format()` source line truncation:
  - [ ] Add `MAX_LINE_LENGTH = 120` constant
  - [ ] Implement `truncateAroundColumn()` helper
  - [ ] Preserve caret visibility for truncated lines
  - [ ] Add test cases for long line truncation
- [ ] Run `npm run verify` - all tests pass

## Phase 2: Lexer Migration
**Status:** Not Started

- [ ] Create `codes/lexer.ts` with VF1xxx definitions:
  - [ ] VF1001 UnterminatedString
  - [ ] VF1002 UnterminatedStringEOF
  - [ ] VF1003 UnterminatedMultilineString
  - [ ] VF1010 InvalidEscapeSequence
  - [ ] VF1011 InvalidHexEscape
  - [ ] VF1012 InvalidUnicodeEscape
  - [ ] VF1100 InvalidNumberSeparator
  - [ ] VF1101 InvalidBinaryLiteral
  - [ ] VF1102 InvalidHexLiteral
  - [ ] VF1103 InvalidOctalLiteral
  - [ ] VF1104 InvalidScientificNotation
  - [ ] VF1300 UnterminatedComment
  - [ ] VF1400 UnexpectedCharacter
- [ ] Register lexer codes in registry
- [ ] Migrate `string-parser.ts` throw sites
- [ ] Migrate `number-parser.ts` throw sites
- [ ] Migrate `comment-handler.ts` throw sites
- [ ] Migrate `operator-parser.ts` throw sites
- [ ] Migrate `lexer.ts` throw sites
- [ ] Update lexer tests to expect new error format
- [ ] Run `npm run verify` - all tests pass

## Phase 3: Parser Migration
**Status:** Not Started

- [ ] Create `codes/parser.ts` with VF2xxx definitions:
  - [ ] VF2001 UnexpectedToken
  - [ ] VF2010 ExpectedDeclaration
  - [ ] VF2011 ExpectedEquals
  - [ ] VF2100 ExpectedExpression
  - [ ] VF2101 ExpectedClosingBrace
  - [ ] VF2102 ExpectedClosingParen
  - [ ] VF2103 ExpectedClosingBracket
  - [ ] VF2104 ExpectedClosingAngle (NEW - for generics)
  - [ ] VF2105 ExpectedArrow (NEW - for function types)
  - [ ] VF2200 ExpectedPattern
  - [ ] VF2300 ExpectedTypeName
  - [ ] VF2400 InvalidImportSpecifier (NEW)
  - [ ] VF2401 MalformedExport (NEW)
  - [ ] VF2402 ExpectedModulePath (NEW)
  - [ ] VF2500 TooManyErrors
- [ ] Register parser codes in registry
- [ ] Refactor `parser-base.ts` error helper to use diagnostics
- [ ] Migrate `parse-declarations.ts`
- [ ] Migrate `parse-expressions.ts`
- [ ] Migrate `parse-patterns.ts`
- [ ] Migrate `parse-types.ts`
- [ ] Update parser tests to expect new error format (use `expectDiagnostic()`)
- [ ] Run `npm run verify` - all tests pass

## Phase 4: Desugarer Migration
**Status:** Not Started

- [ ] Create `codes/desugarer.ts` with VF3xxx definitions:
  - [ ] VF3101 UndefinedListElement
  - (Note: VF3001-VF3003, VF3100 are internal errors, remain plain Error)
  - (Note: desugarListWithConcats.ts errors are internal assertions, remain plain Error)
- [ ] Register desugarer codes in registry
- [ ] Add `source` parameter to `desugar()` entry point
- [ ] Migrate `desugarer.ts` throw sites (keep internal errors as plain Error)
- [ ] Migrate `desugarListPattern.ts`
- [ ] Migrate `buildConsChain.ts`
- [ ] Migrate `desugarListLiteral.ts`
- [ ] Delete `DesugarError.ts`
- [ ] Update desugarer tests (use `expectDiagnostic()`)
- [ ] Run `npm run verify` - all tests pass

## Phase 5a: Type Checker Codes & Basic Migration
**Status:** Not Started

**Goal:** Define VF4xxx codes and set up infrastructure for type checker migration.

- [ ] Create `codes/typechecker.ts` with VF4xxx definitions (~52 codes):
  - [ ] VF4001 TypeMismatch
  - [ ] VF4002 ArgumentTypeMismatch
  - [ ] VF4003 ReturnTypeMismatch
  - [ ] VF4004 BranchTypeMismatch
  - [ ] VF4005 IfBranchTypeMismatch
  - [ ] VF4006 ListElementMismatch
  - [ ] VF4007 TupleElementMismatch
  - [ ] VF4008 RecordFieldMismatch
  - [ ] VF4009 NumericTypeMismatch
  - [ ] VF4010 OperatorTypeMismatch
  - [ ] VF4011 GuardTypeMismatch
  - [ ] VF4012 AnnotationMismatch
  - [ ] VF4013 NotAFunction
  - [ ] VF4014 NotARecord
  - [ ] VF4015 NotARef
  - [ ] VF4016 RefAssignmentMismatch
  - [ ] VF4020-VF4025 Unification errors (from unify.ts)
  - [ ] VF4100 UndefinedVariable
  - [ ] VF4101 UndefinedType
  - [ ] VF4102 UndefinedConstructor
  - [ ] VF4103 UndefinedField
  - [ ] VF4200 ConstructorArity
  - [ ] VF4201 NoMatchingOverload
  - [ ] VF4202 WrongArgumentCount
  - [ ] VF4203 TupleArity
  - [ ] VF4204 TypeArgumentCount
  - [ ] VF4300 InfiniteType
  - [ ] VF4301 RecursiveAlias
  - [ ] VF4400 NonExhaustiveMatch
  - [ ] VF4401 InvalidGuard
  - [ ] VF4402 DuplicateBinding
  - [ ] VF4403 OrPatternBindingMismatch
  - [ ] VF4500 NonRecordAccess
  - [ ] VF4501 MissingRecordField
  - [ ] VF4502 DuplicateRecordField
  - [ ] VF4600 UnknownConstructor
  - [ ] VF4601 ConstructorArgMismatch
  - [ ] VF4602 VariantMismatch
  - [ ] VF4700 ValueRestriction
  - [ ] VF4701 TypeEscape
  - [ ] VF4800-VF4803 FFI errors (4 codes):
    - [ ] VF4800 FFIError
    - [ ] VF4801 FFIInconsistentName
    - [ ] VF4802 FFIInconsistentImport
    - [ ] VF4803 FFINotFunction
  - [ ] VF4900 UnreachablePattern (warning)
- [ ] Add VF4205 AmbiguousOverload (resolver.ts)
- [ ] Add VF5102 DuplicateDeclaration (environment.ts)
- [ ] Register typechecker codes in registry
- [ ] Add `source` parameter to `typecheck()` entry point
- [ ] Create `UnifyContext` type in typechecker module:
  ```typescript
  interface UnifyContext {
      loc: Location;
      source?: string;
  }
  ```
- [ ] Create `typechecker/format.ts` with utilities:
  - [ ] Move `typeToString()` from errors.ts
  - [ ] Move `typeSchemeToString()` from errors.ts
  - [ ] Move `findSimilarStrings()` from errors.ts
  - [ ] Move `levenshteinDistance()` from errors.ts
- [ ] Migrate `typechecker.ts` factory calls to `throwDiagnostic()`
- [ ] Keep `TypeCheckerError` temporarily (for `infer/*.ts` files)
- [ ] Run `npm run verify` - all tests pass

## Phase 5b: Unification & Pattern Migration
**Status:** Not Started

**Goal:** Migrate unify.ts and patterns.ts with the UnifyContext pattern.

- [ ] Add `UnifyContext` parameter to `unify()` signature
- [ ] Update all `unify()` call sites (~15-20 changes):
  - [ ] `typechecker.ts`
  - [ ] `infer/*.ts` files
  - [ ] `constraints.ts`
  - [ ] `patterns.ts`
- [ ] Convert `unify.ts` user-facing errors (10 errors) to VF4xxx diagnostics:
  - [ ] VF4020 CannotUnify (line 205)
  - [ ] VF4021 FunctionArityMismatch (line 211)
  - [ ] VF4022 TypeApplicationArityMismatch (line 235)
  - [ ] VF4023 UnionArityMismatch (line 268)
  - [ ] VF4024 IncompatibleTypes (line 308)
  - [ ] VF4025 VariantUnificationError (lines 451, 456, 472)
  - [ ] VF4300 InfiniteType/OccursCheck (line 327)
  - [ ] Tuple arity mismatch (line 288)
- [ ] Leave internal assertion errors as plain `Error` (7 errors):
  - [ ] "Missing parameter at index" (lines 221, 479)
  - [ ] "Missing argument at index" (line 246)
  - [ ] "Missing type at index" (line 276)
  - [ ] "Missing element at index" (line 298)
  - [ ] "Missing field type" (line 425)
  - [ ] "Missing constructor" (line 468)
- [ ] Convert `patterns.ts` user-facing errors (10-11 errors) to VF4xxx diagnostics:
  - [ ] VF4102 UndefinedConstructor (line 163)
  - [ ] VF4600 NotValueBinding (line 167)
  - [ ] VF4200 ConstructorArity (lines 183, 202)
  - [ ] VF4402 DuplicateBinding (lines 229, 279)
  - [ ] VF4500 NonRecordAccess (line 257)
  - [ ] VF4501 MissingRecordField (line 270)
- [ ] Leave internal errors as plain `Error` (3 errors):
  - [ ] "Unknown pattern kind" (line 81)
  - [ ] "Unknown literal type" (line 135)
  - [ ] "Missing argument pattern" (line 220)
- [ ] Update relevant tests
- [ ] Run `npm run verify` - all tests pass

## Phase 5c: Inference Migration & Cleanup
**Status:** Not Started

**Goal:** Complete the type checker migration and remove old infrastructure.

- [ ] Migrate all `infer/*.ts` files to `throwDiagnostic()`:
  - [ ] `infer-primitives.ts`
  - [ ] `infer-operators.ts`
  - [ ] `infer-functions.ts`
  - [ ] `infer-structures.ts`
  - [ ] `infer-patterns.ts`
  - [ ] `infer-records.ts`
  - [ ] `infer-variants.ts`
- [ ] Migrate `resolver.ts` (4 throws):
  - [ ] VF4100 "Undefined function"
  - [ ] VF4201 "No matching signature"
  - [ ] VF4205 "Ambiguous call"
  - [ ] Leave internal error as plain Error
- [ ] Migrate `environment.ts` (5 throws):
  - [ ] VF5102 "Duplicate declaration"
  - [ ] VF4801 "Inconsistent JavaScript names"
  - [ ] VF4802 "Inconsistent module imports"
  - [ ] VF4803 "Must have function type"
  - [ ] Leave internal error as plain Error
- [ ] Migrate `constraints.ts` if applicable
- [ ] Delete `TypeCheckerError` class from `errors.ts`
- [ ] Delete factory functions from `errors.ts`:
  - [ ] `createTypeMismatchError()`
  - [ ] `createUndefinedVariableError()`
  - [ ] `createNonExhaustiveError()`
  - [ ] `createOccursCheckError()`
  - [ ] `createOverloadError()`
  - [ ] `createUndefinedTypeError()`
  - [ ] `createMissingFieldError()`
  - [ ] `createNonRecordAccessError()`
  - [ ] `createUndefinedConstructorError()`
  - [ ] `createConstructorArityError()`
  - [ ] `createValueRestrictionError()`
  - [ ] `createEscapeError()`
  - [ ] `createInvalidGuardError()`
- [ ] Update typechecker tests (use `expectDiagnostic()`)
- [ ] Verify all call sites use new diagnostic pattern
- [ ] Run `npm run verify` - all tests pass

## Phase 6: Module System Integration
**Status:** Not Started

- [ ] Create `codes/modules.ts` with VF5xxx definitions:
  - [ ] VF5000 ModuleNotFound
  - [ ] VF5001 ImportNotExported
  - [ ] VF5002 DuplicateImport
  - [ ] VF5003 ImportShadowed
  - [ ] VF5100 DuplicateExport
  - [ ] VF5101 ReexportConflict
  - [ ] VF5900 CircularDependency (warning)
  - [ ] VF5901 CaseSensitivityMismatch (warning)
- [ ] Register module codes in registry
- [ ] Update module-resolution plan to reference new codes
- [ ] (Module resolver implementation uses these codes when built)
- [ ] Run `npm run verify` - all tests pass

## Phase 7: Documentation Generation
**Status:** Not Started

### 7.1: Generator Script
- [ ] Create `scripts/generate-error-docs.ts`:
  - [ ] Import all codes from registry
  - [ ] Group codes by phase
  - [ ] Generate `docs/errors/README.md` index:
    - [ ] Quick reference table (code, name, severity, description)
    - [ ] Links to phase-specific files
    - [ ] Auto-generated header comment
  - [ ] Generate `docs/errors/{phase}.md` for each phase:
    - [ ] Phase overview with category table
    - [ ] Individual error sections with:
      - [ ] Code and title as heading
      - [ ] Severity badge
      - [ ] Message template
      - [ ] Explanation section
      - [ ] Example section (Problem/Solution code blocks)
      - [ ] Related codes section with links
      - [ ] See Also section with spec links
  - [ ] Add `--check` flag for CI validation:
    - [ ] Compare generated content with existing files
    - [ ] Exit non-zero if any files would change
    - [ ] Print helpful message listing changed files
- [ ] Create `docs/errors/` directory

### 7.2: NPM Scripts
- [ ] Add npm scripts to root `package.json`:
  - [ ] `"docs:errors": "tsx scripts/generate-error-docs.ts"`
  - [ ] `"docs:errors:check": "tsx scripts/generate-error-docs.ts --check"`
- [ ] Test both scripts work correctly

### 7.3: CI Integration
- [ ] Update `.github/workflows/ci.yml`:
  - [ ] Add "Check error documentation is up to date" step
  - [ ] Run `npm run docs:errors:check` after format check
  - [ ] Verify CI fails when docs are stale
- [ ] Document expected failure output in plan

### 7.4: Internal Documentation
- [ ] Create `packages/core/src/diagnostics/README.md`:
  - [ ] Architecture overview (diagnostic.ts, registry.ts, factory.ts, etc.)
  - [ ] Usage examples (throwDiagnostic, WarningCollector)
  - [ ] Link to codes/README.md for adding new codes
- [ ] Create `packages/core/src/diagnostics/codes/README.md`:
  - [ ] Step-by-step guide for adding new error codes
  - [ ] Code range table (VF1xxx=lexer, VF2xxx=parser, etc.)
  - [ ] Subcategory allocation for each phase
  - [ ] Complete error definition template with all required fields
  - [ ] Registration instructions (export from codes/index.ts)
  - [ ] Test writing instructions (expectDiagnostic pattern)
  - [ ] Documentation regeneration instructions
  - [ ] Quality checklist for new codes

### 7.5: Finalization
- [ ] Update `docs/spec/.agent-map.md`:
  - [ ] Add reference to `docs/errors/`
  - [ ] Update error-related queries
- [ ] Generate initial documentation with `npm run docs:errors`
- [ ] Verify generated docs look correct
- [ ] Run `npm run verify`
- [ ] Run `npm run docs:errors:check` to verify CI check works

## Phase 8: Cleanup
**Status:** Not Started

- [ ] Remove old error classes entirely from `utils/error.ts`:
  - [ ] Delete `LexerError` class
  - [ ] Delete `ParserError` class
  - [ ] Delete `TypeError` class
  - [ ] Delete `CompilationError` class
  - [ ] Delete `RuntimeError` class
  - [ ] Delete `VibefunError` base class (replaced by `VibefunDiagnostic`)
- [ ] Verify `TypeCheckerError` deleted (should be done in Phase 5)
- [ ] Verify `DesugarError.ts` deleted (should be done in Phase 4)
- [ ] Update all imports across codebase to use new diagnostics
- [ ] Update CLI `compile()` to thread source through pipeline
- [ ] Update CLI error handling:
  - [ ] Call `error.format(source)` for VibefunDiagnostic
  - [ ] Print warnings after successful compilation
  - [ ] Consider color output for terminal
- [ ] Move `docs/spec/03-type-system/error-catalog.md` to `.claude/archive/`
- [ ] Update `docs/spec/03-type-system/error-reporting.md`:
  - [ ] Reference new error code system
  - [ ] Update examples to show VFxxxx codes
- [ ] Final `npm run verify`
- [ ] Update CLAUDE.md if needed

## Pre-Implementation Checklist

Before starting Phase 1, verify:

- [ ] Audit `unify.ts` for all plain `Error` throws - map user-facing ones to VF4xxx
- [ ] Audit `patterns.ts` for all throws - map user-facing ones to VF4xxx
- [ ] Verify VF2400-2499 import/export codes cover all parser cases
- [ ] Understand source threading requirements through CLI

## Overall Progress

| Phase | Status | Tasks | Notes |
|-------|--------|-------|-------|
| Phase 1: Infrastructure | Not Started | 0/21 | Core diagnostics module + interpolate/registry/truncation |
| Phase 2: Lexer Migration | Not Started | 0/9 | ~15 error codes |
| Phase 3: Parser Migration | Not Started | 0/9 | ~15 error codes (incl. import/export) |
| Phase 4: Desugarer Migration | Not Started | 0/10 | ~3 error codes (internal errors excluded) |
| Phase 5a: TC Codes & Basic | Not Started | 0/12 | ~52 codes (incl. FFI), UnifyContext setup |
| Phase 5b: Unify/Patterns | Not Started | 0/10 | ~20 call site updates, 20-21 errors |
| Phase 5c: Inference Cleanup | Not Started | 0/18 | Migrate infer/*.ts, resolver.ts, environment.ts |
| Phase 6: Module System | Not Started | 0/5 | ~8 error codes (placeholder) |
| Phase 7: Documentation Gen | Not Started | 0/25 | Generator, CI, internal docs |
| Phase 8: Cleanup | Not Started | 0/10 | Remove old classes, CLI format integration |

**Overall: 0/10 Phases Complete (0%)**
**Estimated Total Error Codes: ~92**
**Estimated Test Updates: ~180-250 tests**
