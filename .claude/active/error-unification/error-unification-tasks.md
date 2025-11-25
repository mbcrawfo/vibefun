# Error Unification - Task List

**Last Updated:** 2025-11-25

## Phase 1: Infrastructure
**Status:** Not Started

- [ ] Create `packages/core/src/diagnostics/` directory structure
- [ ] Implement `diagnostic.ts`:
  - [ ] `DiagnosticSeverity` type
  - [ ] `DiagnosticPhase` type
  - [ ] `DiagnosticDefinition` interface
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
  - [ ] VF3001 UnknownExpressionKind (keep as plain Error - internal)
  - [ ] VF3002 UnknownPatternKind (keep as plain Error - internal)
  - [ ] VF3003 UnknownDeclarationKind (keep as plain Error - internal)
  - [ ] VF3100 OrPatternNotExpanded (keep as plain Error - internal)
  - [ ] VF3101 UndefinedListElement
  - [ ] VF3102 EmptySegmentList (from plain Error in desugarListWithConcats.ts)
  - [ ] VF3103 EmptySegment (from plain Error in desugarListWithConcats.ts)
- [ ] Register desugarer codes in registry
- [ ] Add `source` parameter to `desugar()` entry point
- [ ] Migrate `desugarer.ts` throw sites (keep internal errors as plain Error)
- [ ] Migrate `desugarListPattern.ts`
- [ ] Migrate `buildConsChain.ts`
- [ ] Migrate `desugarListLiteral.ts`
- [ ] Migrate `desugarListWithConcats.ts` - convert plain `Error` to diagnostics
- [ ] Delete `DesugarError.ts`
- [ ] Update desugarer tests (use `expectDiagnostic()`)
- [ ] Run `npm run verify` - all tests pass

## Phase 5: Type Checker Migration
**Status:** Not Started

**Approach:** Full replacement - DELETE factory functions, replace ALL call sites.

- [ ] Create `codes/typechecker.ts` with VF4xxx definitions:
  - [ ] VF4001 TypeMismatch
  - [ ] VF4002 ArgumentTypeMismatch
  - [ ] VF4003 ReturnTypeMismatch
  - [ ] VF4004 BranchTypeMismatch
  - [ ] VF4005 IfBranchTypeMismatch
  - [ ] VF4006 ListElementMismatch
  - [ ] VF4007 TupleElementMismatch (NEW)
  - [ ] VF4008 RecordFieldMismatch (NEW)
  - [ ] VF4009 NumericTypeMismatch
  - [ ] VF4010 OperatorTypeMismatch
  - [ ] VF4011 GuardTypeMismatch (NEW)
  - [ ] VF4012 AnnotationMismatch (NEW)
  - [ ] VF4013 NotAFunction
  - [ ] VF4014 NotARecord (NEW)
  - [ ] VF4015 NotARef (NEW)
  - [ ] VF4016 RefAssignmentMismatch (NEW)
  - [ ] VF4020-VF4025 Unification errors (NEW - from unify.ts plain Errors)
  - [ ] VF4100 UndefinedVariable
  - [ ] VF4101 UndefinedType
  - [ ] VF4102 UndefinedConstructor
  - [ ] VF4103 UndefinedField
  - [ ] VF4200 ConstructorArity
  - [ ] VF4201 NoMatchingOverload
  - [ ] VF4202 WrongArgumentCount
  - [ ] VF4203 TupleArity (NEW)
  - [ ] VF4204 TypeArgumentCount (NEW)
  - [ ] VF4300 InfiniteType
  - [ ] VF4301 RecursiveAlias (NEW)
  - [ ] VF4400 NonExhaustiveMatch
  - [ ] VF4401 InvalidGuard
  - [ ] VF4402 DuplicateBinding
  - [ ] VF4403 OrPatternBindingMismatch
  - [ ] VF4500 NonRecordAccess
  - [ ] VF4501 MissingRecordField
  - [ ] VF4502 DuplicateRecordField
  - [ ] VF4600 UnknownConstructor
  - [ ] VF4601 ConstructorArgMismatch (NEW)
  - [ ] VF4602 VariantMismatch (NEW)
  - [ ] VF4700 ValueRestriction
  - [ ] VF4701 TypeEscape
  - [ ] VF4900 UnreachablePattern (warning)
- [ ] Register typechecker codes in registry
- [ ] Add `source` parameter to `typecheck()` entry point
- [ ] Migrate `typechecker/errors.ts`:
  - [ ] DELETE `createTypeMismatchError()` and all factory functions
  - [ ] KEEP `typeToString()` and `typeSchemeToString()` utilities
  - [ ] DELETE `TypeCheckerError` class
- [ ] Migrate `unify.ts`:
  - [ ] Convert 18+ plain `Error` throws to VF4020-VF4025 diagnostics
  - [ ] Keep internal assertion errors as plain `Error`
- [ ] Migrate `patterns.ts`:
  - [ ] Convert 12+ throws to diagnostics
  - [ ] Keep internal exhaustiveness checks as plain `Error`
- [ ] Migrate `typechecker.ts` - replace factory calls with `throwDiagnostic()`
- [ ] Migrate all `infer/*.ts` files - replace factory calls
- [ ] Migrate `resolver.ts`, `constraints.ts`, `environment.ts`
- [ ] Update typechecker tests (use `expectDiagnostic()`)
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

- [ ] Create `scripts/generate-error-docs.ts`:
  - [ ] Read all codes from registry
  - [ ] Generate markdown for each phase
  - [ ] Include severity column in tables (error vs warning)
  - [ ] Generate index README.md with all codes
- [ ] Create `docs/error-codes/` directory
- [ ] Add npm script: `"docs:errors": "tsx scripts/generate-error-docs.ts"`
- [ ] Generate initial documentation
- [ ] Add `--explain` command to CLI (if CLI exists)
- [ ] Test documentation generation
- [ ] Run `npm run verify`

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
- [ ] Move `docs/spec/03-type-system/error-catalog.md` to `.claude/archive/`
- [ ] Update `docs/spec/03-type-system/error-reporting.md`:
  - [ ] Reference new error code system
  - [ ] Update examples to show VFxxxx codes
- [ ] Update `docs/spec/.agent-map.md`:
  - [ ] Add reference to `docs/error-codes/`
  - [ ] Update error-related queries
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
| Phase 1: Infrastructure | Not Started | 0/15 | Core diagnostics module |
| Phase 2: Lexer Migration | Not Started | 0/9 | ~15 error codes |
| Phase 3: Parser Migration | Not Started | 0/9 | ~15 error codes (incl. new import/export) |
| Phase 4: Desugarer Migration | Not Started | 0/11 | ~5 error codes + plain Error conversion |
| Phase 5: Type Checker Migration | Not Started | 0/12 | ~45 error codes (largest phase) |
| Phase 6: Module System Integration | Not Started | 0/5 | ~8 error codes |
| Phase 7: Documentation Generation | Not Started | 0/7 | Auto-generated docs |
| Phase 8: Cleanup | Not Started | 0/11 | Remove old classes |

**Overall: 0/8 Phases Complete (0%)**
**Estimated Total Error Codes: ~90**
