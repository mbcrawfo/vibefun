# Error Unification - Task List

**Last Updated:** 2025-11-25 (Phase 7 Complete)

## Phase 1: Infrastructure
**Status:** ✅ Complete (Commit: a70dd58)

- [x] Create `packages/core/src/diagnostics/` directory structure
- [x] Implement `diagnostic.ts`:
  - [x] `DiagnosticSeverity` type
  - [x] `DiagnosticPhase` type
  - [x] `DiagnosticExample` interface (bad, good, description)
  - [x] `DiagnosticDefinition` interface:
    - [x] Core fields: code, title, messageTemplate, severity, phase, category
    - [x] Optional hint: hintTemplate
    - [x] Documentation fields: explanation (required), example (required)
    - [x] Optional documentation: relatedCodes, seeAlso
  - [x] `Diagnostic` interface
  - [x] `VibefunDiagnostic` class with `format(source?)` method
- [x] Implement `registry.ts`:
  - [x] `DiagnosticRegistry` class
  - [x] `get(code)` method
  - [x] `all()` method
  - [x] `byPhase(phase)` method
  - [x] `bySeverity(severity)` method (NEW - for warnings)
  - [x] `explain(code)` method
  - [x] Duplicate detection on registration
- [x] Implement `factory.ts`:
  - [x] `interpolate()` helper for message templates
  - [x] `createDiagnostic()` function
  - [x] `throwDiagnostic()` function
- [x] Implement `warning-collector.ts` (NEW):
  - [x] `WarningCollector` class
  - [x] `add(warning)` method
  - [x] `getWarnings()` method
  - [x] `hasWarnings()` method
  - [x] `clear()` method
- [x] Implement `test-helpers.ts` (NEW):
  - [x] `expectDiagnostic(fn, code)` function
  - [x] `expectWarning(collector, code)` function
- [x] Create `codes/index.ts` with empty placeholder exports
- [x] Create `diagnostics/index.ts` public exports
- [x] Write unit tests (side-by-side with source files):
  - [x] `diagnostic.test.ts` - class creation, formatting with source
  - [x] `registry.test.ts` - lookup, duplicate detection, severity filtering
  - [x] `factory.test.ts` - interpolation, creation
  - [x] `warning-collector.test.ts` - accumulation, retrieval
  - [x] `test-helpers.test.ts` - helper functions
- [x] Implement `interpolate()` with missing placeholder handling:
  - [x] Leave unmatched `{placeholder}` as-is in output
  - [x] Add test cases for missing placeholders
- [x] Implement registry duplicate detection:
  - [x] Throw Error at registration time for duplicates
  - [x] Add test case for duplicate code detection
- [x] Implement `format()` source line truncation:
  - [x] Add `MAX_LINE_LENGTH = 120` constant
  - [x] Implement `truncateAroundColumn()` helper
  - [x] Preserve caret visibility for truncated lines
  - [x] Add test cases for long line truncation
- [x] Run `npm run verify` - all tests pass

## Phase 2: Lexer Migration
**Status:** ✅ Complete (Commit: e7a06fb)

- [x] Create `codes/lexer.ts` with VF1xxx definitions:
  - [x] VF1001 UnterminatedString
  - [x] VF1002 UnterminatedStringEOF
  - [x] VF1003 UnterminatedMultilineString
  - [x] VF1010 InvalidEscapeSequence
  - [x] VF1011 InvalidHexEscape
  - [x] VF1012 InvalidUnicodeEscape
  - [x] VF1100 InvalidNumberSeparator
  - [x] VF1101 InvalidBinaryLiteral
  - [x] VF1102 InvalidHexLiteral
  - [x] VF1103 InvalidOctalLiteral (not needed - no octal support)
  - [x] VF1104 InvalidScientificNotation
  - [x] VF1300 UnterminatedComment
  - [x] VF1400 UnexpectedCharacter
- [x] Register lexer codes in registry
- [x] Migrate `string-parser.ts` throw sites
- [x] Migrate `number-parser.ts` throw sites
- [x] Migrate `comment-handler.ts` throw sites
- [x] Migrate `operator-parser.ts` throw sites
- [x] Migrate `lexer.ts` throw sites (no changes needed - delegates to helpers)
- [x] Update lexer tests to expect new error format
- [x] Run `npm run verify` - all tests pass

## Phase 3: Parser Migration
**Status:** ✅ Complete

- [x] Create `codes/parser.ts` with VF2xxx definitions:
  - [x] VF2000 ExpectedDeclarationKeyword
  - [x] VF2001 UnexpectedKeyword
  - [x] VF2002 ExpectedEquals
  - [x] VF2003 MutableBindingMustUseRef
  - [x] VF2004 MutableBindingMustUseSimplePattern
  - [x] VF2005 AndRequiresLetRec
  - [x] VF2006 ExpectedConstructorInVariant
  - [x] VF2007 ExpectedSemicolonInExternalBlock
  - [x] VF2100 ExpectedExpression
  - [x] VF2101 UnexpectedToken
  - [x] VF2102 ExpectedClosingParen
  - [x] VF2103 ExpectedClosingBracket
  - [x] VF2104 ExpectedClosingBrace
  - [x] VF2105 ExpectedThen
  - [x] VF2106 ExpectedArrow
  - [x] VF2107 ExpectedStatementSeparator
  - [x] VF2108 EmptySpread
  - [x] VF2109 UnexpectedEmptyExpressionList
  - [x] VF2110 ExpectedCommaOrSeparator
  - [x] VF2111 RecordMixedSyntax
  - [x] VF2112 OperatorSectionNotSupported
  - [x] VF2113 UnexpectedReturnTypeAnnotation
  - [x] VF2200 ExpectedPattern
  - [x] VF2201 KeywordShorthandNotAllowed
  - [x] VF2202 TypeAnnotatedRecordShorthand
  - [x] VF2300 ExpectedTypeName
  - [x] VF2301 ExpectedTypeExpression
  - [x] VF2302 ExpectedTypeParameter
  - [x] VF2303 ExpectedClosingAngle
  - [x] VF2304 ExpectedColonInRecordType
  - [x] VF2400 ExpectedImportSpecifier
  - [x] VF2401 ExpectedExportSpecifier
  - [x] VF2402 ExpectedFromKeyword
  - [x] VF2403 ExpectedModulePath
  - [x] VF2404 ExpectedAsAfterStar
  - [x] VF2500 TooManyErrors
  - [x] VF2501 ExpectedToken
- [x] Register parser codes in registry
- [x] Refactor `parser-base.ts` error helper to use diagnostics
- [x] Migrate `parse-declarations.ts`
- [x] Migrate `parse-expressions.ts` (all expression files)
- [x] Migrate `parse-patterns.ts`
- [x] Migrate `parse-types.ts`
- [x] Update parser tests to expect new error format
- [x] Run `npm run verify` - all tests pass

## Phase 4: Desugarer Migration
**Status:** ✅ Complete

- [x] Create `codes/desugarer.ts` with VF3xxx definitions:
  - [x] VF3101 UndefinedListElement
  - (Note: VF3001-VF3003, VF3100 are internal errors, remain plain Error)
  - (Note: desugarListWithConcats.ts errors are internal assertions, remain plain Error)
- [x] Register desugarer codes in registry
- [x] Add `source` parameter to `desugar()` entry point (skipped - not needed for current errors)
- [x] Migrate `desugarer.ts` throw sites (keep internal errors as plain Error)
- [x] Migrate `desugarListPattern.ts`
- [x] Migrate `buildConsChain.ts`
- [x] Migrate `curryLambda.ts` (internal errors, converted to plain Error)
- [x] Migrate `desugarBlock.ts` (internal errors, converted to plain Error)
- [x] Delete `DesugarError.ts` and `DesugarError.test.ts`
- [x] Update desugarer tests (updated to expect plain Error for internal errors)
- [x] Run `npm run verify` - all tests pass

## Phase 5a: Type Checker Codes & Basic Migration
**Status:** ✅ Complete

**Goal:** Define VF4xxx codes and set up infrastructure for type checker migration.

- [x] Create `codes/typechecker.ts` with VF4xxx definitions (~52 codes):
  - [x] VF4001 TypeMismatch
  - [x] VF4002 ArgumentTypeMismatch
  - [x] VF4003 ReturnTypeMismatch
  - [x] VF4004 BranchTypeMismatch
  - [x] VF4005 IfBranchTypeMismatch
  - [x] VF4006 ListElementMismatch
  - [x] VF4007 TupleElementMismatch
  - [x] VF4008 RecordFieldMismatch
  - [x] VF4009 NumericTypeMismatch
  - [x] VF4010 OperatorTypeMismatch
  - [x] VF4011 GuardTypeMismatch
  - [x] VF4012 AnnotationMismatch
  - [x] VF4013 NotAFunction
  - [x] VF4014 NotARecord
  - [x] VF4015 NotARef
  - [x] VF4016 RefAssignmentMismatch
  - [x] VF4020-VF4026 Unification errors (from unify.ts)
  - [x] VF4100 UndefinedVariable
  - [x] VF4101 UndefinedType
  - [x] VF4102 UndefinedConstructor
  - [x] VF4103 UndefinedField
  - [x] VF4200 ConstructorArity
  - [x] VF4201 NoMatchingOverload
  - [x] VF4202 WrongArgumentCount
  - [x] VF4203 TupleArity
  - [x] VF4204 TypeArgumentCount
  - [x] VF4205 AmbiguousOverload
  - [x] VF4300 InfiniteType
  - [x] VF4301 RecursiveAlias
  - [x] VF4400 NonExhaustiveMatch
  - [x] VF4401 InvalidGuard
  - [x] VF4402 DuplicateBinding
  - [x] VF4403 OrPatternBindingMismatch
  - [x] VF4500 NonRecordAccess
  - [x] VF4501 MissingRecordField
  - [x] VF4502 DuplicateRecordField
  - [x] VF4600 UnknownConstructor
  - [x] VF4601 ConstructorArgMismatch
  - [x] VF4602 VariantMismatch
  - [x] VF4700 ValueRestriction
  - [x] VF4701 TypeEscape
  - [x] VF4800-VF4803 FFI errors (4 codes):
    - [x] VF4800 FFIError
    - [x] VF4801 FFIInconsistentName
    - [x] VF4802 FFIInconsistentImport
    - [x] VF4803 FFINotFunction
  - [x] VF4900 UnreachablePattern (warning)
  - [x] VF5102 DuplicateDeclaration (environment.ts)
- [x] Register typechecker codes in registry
- [x] Add `source` parameter to `typecheck()` entry point (as TypeCheckOptions)
- [x] Create `UnifyContext` type in typechecker module
- [x] Create `typechecker/format.ts` with utilities:
  - [x] Move `typeToString()` from errors.ts
  - [x] Move `typeSchemeToString()` from errors.ts
  - [x] Move `findSimilarStrings()` from errors.ts
  - [x] Move `levenshteinDistance()` from errors.ts
- [x] Migrate `resolver.ts` to `throwDiagnostic()` (3 errors)
- [x] Migrate `environment.ts` to `throwDiagnostic()` (4 errors)
- [x] Update resolver.test.ts to expect VibefunDiagnostic
- [x] Update environment.test.ts to expect VibefunDiagnostic
- [x] Keep `TypeCheckerError` temporarily (for `infer/*.ts` files)
- [x] Run `npm run verify` - all tests pass

## Phase 5b: Unification & Pattern Migration
**Status:** ✅ Complete (Commit: f86c606)

**Goal:** Migrate unify.ts and patterns.ts with the UnifyContext pattern.

- [x] Add `UnifyContext` parameter to `unify()` signature
- [x] Update all `unify()` call sites (~15-20 changes):
  - [x] `typechecker.ts`
  - [x] `infer/*.ts` files
  - [x] `constraints.ts`
  - [x] `patterns.ts`
- [x] Convert `unify.ts` user-facing errors (10 errors) to VF4xxx diagnostics:
  - [x] VF4020 CannotUnify (line 205)
  - [x] VF4021 FunctionArityMismatch (line 211)
  - [x] VF4022 TypeApplicationArityMismatch (line 235)
  - [x] VF4023 UnionArityMismatch (line 268)
  - [x] VF4024 IncompatibleTypes (line 308)
  - [x] VF4025 VariantUnificationError (lines 451, 456, 472)
  - [x] VF4300 InfiniteType/OccursCheck (line 327)
  - [x] VF4026 TupleArityMismatch (line 288)
- [x] Leave internal assertion errors as plain `Error` (7 errors):
  - [x] "Missing parameter at index" (lines 221, 479)
  - [x] "Missing argument at index" (line 246)
  - [x] "Missing type at index" (line 276)
  - [x] "Missing element at index" (line 298)
  - [x] "Missing field type" (line 425)
  - [x] "Missing constructor" (line 468)
- [x] Convert `patterns.ts` user-facing errors (10-11 errors) to VF4xxx diagnostics:
  - [x] VF4102 UndefinedConstructor (line 163)
  - [x] VF4600 NotValueBinding (line 167)
  - [x] VF4200 ConstructorArity (lines 183, 202)
  - [x] VF4402 DuplicateBinding (lines 229, 279)
  - [x] VF4500 NonRecordAccess (line 257)
  - [x] VF4501 MissingRecordField (line 270)
- [x] Leave internal errors as plain `Error` (3 errors):
  - [x] "Unknown pattern kind" (line 81)
  - [x] "Unknown literal type" (line 135)
  - [x] "Missing argument pattern" (line 220)
- [x] Update relevant tests
- [x] Run `npm run verify` - all tests pass

## Phase 5c: Inference Migration & Cleanup
**Status:** ✅ Complete (Commit: 0ebec96)

**Goal:** Complete the type checker migration and remove old infrastructure.

- [x] Migrate all `infer/*.ts` files to `throwDiagnostic()`:
  - [x] `infer-primitives.ts` (VF4017, VF4100, VF4804)
  - [x] `infer-bindings.ts` (VF4017, internal errors → plain Error)
  - [x] `infer-functions.ts` (VF4017)
  - [x] `infer-structures.ts` (VF4500, VF4501, VF4102, VF4804, VF4200, VF4400, VF4404)
- [x] Added new diagnostic codes:
  - [x] VF4017 NotImplemented (for not-yet-implemented features)
  - [x] VF4404 EmptyMatch
  - [x] VF4804 FFIOverloadNotSupported
- [x] Delete `TypeCheckerError` class from `errors.ts`
- [x] Delete factory functions from `errors.ts`:
  - [x] `createTypeMismatchError()`
  - [x] `createUndefinedVariableError()`
  - [x] `createNonExhaustiveError()`
  - [x] `createOccursCheckError()`
  - [x] `createOverloadError()`
  - [x] `createUndefinedTypeError()`
  - [x] `createMissingFieldError()`
  - [x] `createNonRecordAccessError()`
  - [x] `createUndefinedConstructorError()`
  - [x] `createConstructorArityError()`
  - [x] `createValueRestrictionError()`
  - [x] `createEscapeError()`
  - [x] `createInvalidGuardError()`
- [x] Delete `errors.test.ts` (tested removed functions)
- [x] Update typechecker tests to use VibefunDiagnostic:
  - [x] `infer-primitives.test.ts`
  - [x] `infer-records.test.ts`
- [x] Run `npm run verify` - all tests pass

## Phase 6: Module System Integration
**Status:** ✅ Complete (Commit: 600938f)

- [x] Create `codes/modules.ts` with VF5xxx definitions:
  - [x] VF5000 ModuleNotFound
  - [x] VF5001 ImportNotExported
  - [x] VF5002 DuplicateImport
  - [x] VF5003 ImportShadowed
  - [x] VF5100 DuplicateExport
  - [x] VF5101 ReexportConflict
  - [x] VF5900 CircularDependency (warning)
  - [x] VF5901 CaseSensitivityMismatch (warning)
- [x] Register module codes in registry
- [ ] Update module-resolution plan to reference new codes (deferred - module resolution not yet implemented)
- [ ] (Module resolver implementation uses these codes when built)
- [x] Run `npm run verify` - all tests pass

## Phase 7: Documentation Generation
**Status:** ✅ Complete

### 7.1: Generator Script
- [x] Create `scripts/generate-error-docs.ts`:
  - [x] Import all codes from registry
  - [x] Group codes by phase
  - [x] Generate `docs/errors/README.md` index:
    - [x] Quick reference table (code, name, severity, description)
    - [x] Links to phase-specific files
    - [x] Auto-generated header comment
  - [x] Generate `docs/errors/{phase}.md` for each phase:
    - [x] Phase overview with category table
    - [x] Individual error sections with:
      - [x] Code and title as heading
      - [x] Severity badge
      - [x] Message template
      - [x] Explanation section
      - [x] Example section (Problem/Solution code blocks)
      - [x] Related codes section with links
      - [x] See Also section with spec links
  - [x] Add `--check` flag for CI validation:
    - [x] Compare generated content with existing files
    - [x] Exit non-zero if any files would change
    - [x] Print helpful message listing changed files
- [x] Create `docs/errors/` directory

### 7.2: NPM Scripts
- [x] Add npm scripts to root `package.json`:
  - [x] `"docs:errors": "npx tsx scripts/generate-error-docs.ts"`
  - [x] `"docs:errors:check": "npx tsx scripts/generate-error-docs.ts --check"`
- [x] Test both scripts work correctly

### 7.3: CI Integration
- [x] Update `.github/workflows/ci.yml`:
  - [x] Add "Check error documentation is up to date" step
  - [x] Run `npm run docs:errors:check` after format check
  - [x] Verify CI fails when docs are stale (manually tested)

### 7.4: Internal Documentation
- [x] Create `packages/core/src/diagnostics/README.md`:
  - [x] Architecture overview (diagnostic.ts, registry.ts, factory.ts, etc.)
  - [x] Usage examples (throwDiagnostic, WarningCollector)
  - [x] Link to codes/README.md for adding new codes
- [x] Create `packages/core/src/diagnostics/codes/README.md`:
  - [x] Step-by-step guide for adding new error codes
  - [x] Code range table (VF1xxx=lexer, VF2xxx=parser, etc.)
  - [x] Subcategory allocation for each phase
  - [x] Complete error definition template with all required fields
  - [x] Registration instructions (export from codes/index.ts)
  - [x] Test writing instructions (expectDiagnostic pattern)
  - [x] Documentation regeneration instructions
  - [x] Quality checklist for new codes

### 7.5: Finalization
- [x] Update `docs/spec/.agent-map.md`:
  - [x] Add reference to `docs/errors/`
  - [x] Update error-related queries
- [x] Generate initial documentation with `npm run docs:errors`
- [x] Verify generated docs look correct
- [x] Run `npm run verify`
- [x] Run `npm run docs:errors:check` to verify CI check works

## Phase 8: Cleanup
**Status:** ✅ Complete

- [x] Remove old error classes entirely from `utils/error.ts`:
  - [x] Delete `LexerError` class
  - [x] Delete `ParserError` class
  - [x] Delete `TypeError` class
  - [x] Delete `CompilationError` class
  - [x] Delete `RuntimeError` class
  - [x] Delete `VibefunError` base class (replaced by `VibefunDiagnostic`)
- [x] Verify `TypeCheckerError` deleted (done in Phase 5c)
- [x] Verify `DesugarError.ts` deleted (done in Phase 4)
- [x] Update all imports across codebase to use new diagnostics
- [x] Add VF1500 ReservedKeyword error code for identifier-parser.ts
- [x] Update CLI `compile()` to thread source through pipeline
- [x] Update CLI error handling:
  - [x] Call `error.format(source)` for VibefunDiagnostic
  - [ ] Print warnings after successful compilation (deferred - no warnings generated yet)
  - [ ] Consider color output for terminal (deferred - future enhancement)
- [x] Delete `docs/spec/03-type-system/error-catalog.md` (obsolete)
- [x] Update `docs/spec/03-type-system/error-reporting.md`:
  - [x] Reference new error code system
  - [x] Update examples to show VFxxxx codes
- [x] Final `npm run verify`
- [x] Regenerate error documentation with new VF1500 code
- [x] Update CLAUDE.md if needed (no changes needed)

## Pre-Implementation Checklist

Before starting Phase 1, verify:

- [x] Audit `unify.ts` for all plain `Error` throws - map user-facing ones to VF4xxx
- [x] Audit `patterns.ts` for all throws - map user-facing ones to VF4xxx
- [x] Verify VF2400-2499 import/export codes cover all parser cases
- [ ] Understand source threading requirements through CLI

## Overall Progress

| Phase | Status | Tasks | Notes |
|-------|--------|-------|-------|
| Phase 1: Infrastructure | ✅ Complete | 21/21 | Core diagnostics module + interpolate/registry/truncation |
| Phase 2: Lexer Migration | ✅ Complete | 9/9 | 13 error codes (VF1001-VF1400) |
| Phase 3: Parser Migration | ✅ Complete | 9/9 | 37 error codes (VF2000-VF2501) |
| Phase 4: Desugarer Migration | ✅ Complete | 12/12 | 1 error code (VF3101), internal errors → plain Error |
| Phase 5a: TC Codes & Basic | ✅ Complete | 23/23 | 53 codes (VF4xxx + VF5102), resolver/environment migrated |
| Phase 5b: Unify/Patterns | ✅ Complete | 10/10 | ~20 call site updates, 20-21 errors |
| Phase 5c: Inference Cleanup | ✅ Complete | 18/18 | Migrate infer/*.ts, delete TypeCheckerError |
| Phase 6: Module System | ✅ Complete | 4/6 | 8 codes (VF5000-VF5901), 2 tasks deferred |
| Phase 7: Documentation Gen | ✅ Complete | 25/25 | Generator, CI, internal docs |
| Phase 8: Cleanup | ✅ Complete | 14/14 | Remove old classes, CLI format integration, VF1500 added |

**Overall: 10/10 Phases Complete (100%)**
**Total Error Codes: ~116 (14 lexer + 37 parser + 1 desugarer + 56 typechecker + 8 modules)**
**All tests passing: 2768 tests**
