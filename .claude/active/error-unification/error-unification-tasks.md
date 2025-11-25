# Error Unification - Task List

**Last Updated:** 2025-11-25 (Phase 4 Complete)

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
| Phase 1: Infrastructure | ✅ Complete | 21/21 | Core diagnostics module + interpolate/registry/truncation |
| Phase 2: Lexer Migration | ✅ Complete | 9/9 | 13 error codes (VF1001-VF1400) |
| Phase 3: Parser Migration | ✅ Complete | 9/9 | 37 error codes (VF2000-VF2501) |
| Phase 4: Desugarer Migration | ✅ Complete | 12/12 | 1 error code (VF3101), internal errors → plain Error |
| Phase 5a: TC Codes & Basic | Not Started | 0/12 | ~52 codes (incl. FFI), UnifyContext setup |
| Phase 5b: Unify/Patterns | Not Started | 0/10 | ~20 call site updates, 20-21 errors |
| Phase 5c: Inference Cleanup | Not Started | 0/18 | Migrate infer/*.ts, resolver.ts, environment.ts |
| Phase 6: Module System | Not Started | 0/5 | ~8 error codes (placeholder) |
| Phase 7: Documentation Gen | Not Started | 0/25 | Generator, CI, internal docs |
| Phase 8: Cleanup | Not Started | 0/10 | Remove old classes, CLI format integration |

**Overall: 4/10 Phases Complete (40%)**
**Estimated Total Error Codes: ~114 (13 lexer + 37 parser + 1 desugarer + ~63 remaining)**
**Estimated Test Updates: ~180-250 tests**
