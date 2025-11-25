# Error Unification - Task List

**Last Updated:** 2025-11-24

## Phase 1: Infrastructure
**Status:** Not Started

- [ ] Create `packages/core/src/diagnostics/` directory structure
- [ ] Implement `diagnostic.ts`:
  - [ ] `DiagnosticSeverity` type
  - [ ] `DiagnosticPhase` type
  - [ ] `DiagnosticDefinition` interface
  - [ ] `Diagnostic` interface
  - [ ] `VibefunDiagnostic` class with `format()` method
- [ ] Implement `registry.ts`:
  - [ ] `DiagnosticRegistry` class
  - [ ] `get(code)` method
  - [ ] `all()` method
  - [ ] `byPhase(phase)` method
  - [ ] `explain(code)` method
  - [ ] Duplicate detection on registration
- [ ] Implement `factory.ts`:
  - [ ] `interpolate()` helper for message templates
  - [ ] `createDiagnostic()` function
  - [ ] `throwDiagnostic()` function
- [ ] Create `codes/index.ts` with empty placeholder exports
- [ ] Create `diagnostics/index.ts` public exports
- [ ] Write unit tests (side-by-side with source files):
  - [ ] `diagnostic.test.ts` - class creation, formatting
  - [ ] `registry.test.ts` - lookup, duplicate detection
  - [ ] `factory.test.ts` - interpolation, creation
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
  - [ ] VF2200 ExpectedPattern
  - [ ] VF2300 ExpectedTypeName
  - [ ] VF2500 TooManyErrors
- [ ] Register parser codes in registry
- [ ] Refactor `parser-base.ts` error helper to use diagnostics
- [ ] Migrate `parse-declarations.ts`
- [ ] Migrate `parse-expressions.ts`
- [ ] Migrate `parse-patterns.ts`
- [ ] Migrate `parse-types.ts`
- [ ] Update parser tests to expect new error format
- [ ] Run `npm run verify` - all tests pass

## Phase 4: Desugarer Migration
**Status:** Not Started

- [ ] Create `codes/desugarer.ts` with VF3xxx definitions:
  - [ ] VF3001 UnknownExpressionKind
  - [ ] VF3002 UnknownPatternKind
  - [ ] VF3003 UnknownDeclarationKind
  - [ ] VF3100 OrPatternNotExpanded
  - [ ] VF3101 UndefinedListElement
- [ ] Register desugarer codes in registry
- [ ] Migrate `desugarer.ts` throw sites
- [ ] Migrate `desugarListPattern.ts`
- [ ] Migrate `buildConsChain.ts`
- [ ] Migrate `desugarListLiteral.ts`
- [ ] Migrate `desugarListWithConcats.ts`
- [ ] Delete `DesugarError.ts`
- [ ] Update desugarer tests
- [ ] Run `npm run verify` - all tests pass

## Phase 5: Type Checker Migration
**Status:** Not Started

- [ ] Create `codes/typechecker.ts` with VF4xxx definitions:
  - [ ] VF4001-VF4013 Type mismatch errors
  - [ ] VF4100-VF4103 Undefined reference errors
  - [ ] VF4200-VF4202 Arity errors
  - [ ] VF4300 Infinite type (occurs check)
  - [ ] VF4400-VF4403 Pattern errors
  - [ ] VF4500-VF4502 Record errors
  - [ ] VF4600 Variant errors
  - [ ] VF4700-VF4701 Polymorphism errors
  - [ ] VF4900 UnreachablePattern (warning)
- [ ] Register typechecker codes in registry
- [ ] Refactor `typechecker/errors.ts`:
  - [ ] Update factory functions to use `createDiagnostic()`
  - [ ] Keep function signatures for compatibility
  - [ ] Return `VibefunDiagnostic` instead of `TypeCheckerError`
- [ ] Update `typechecker.ts` imports
- [ ] Update `unify.ts` imports
- [ ] Update all other typechecker files using errors
- [ ] Update typechecker tests
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
  - [ ] Generate index README.md
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
- [ ] Delete `TypeCheckerError` class from `typechecker/errors.ts`
- [ ] Verify `DesugarError.ts` deleted
- [ ] Update all imports across codebase to use new diagnostics
- [ ] Move `docs/spec/03-type-system/error-catalog.md` to `.claude/archive/`
- [ ] Update `docs/spec/03-type-system/error-reporting.md`:
  - [ ] Reference new error code system
  - [ ] Update examples to show VFxxxx codes
- [ ] Update `docs/spec/.agent-map.md`:
  - [ ] Add reference to `docs/error-codes/`
  - [ ] Update error-related queries
- [ ] Final `npm run verify`
- [ ] Update CLAUDE.md if needed

## Overall Progress

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Infrastructure | Not Started | 0% |
| Phase 2: Lexer Migration | Not Started | 0% |
| Phase 3: Parser Migration | Not Started | 0% |
| Phase 4: Desugarer Migration | Not Started | 0% |
| Phase 5: Type Checker Migration | Not Started | 0% |
| Phase 6: Module System Integration | Not Started | 0% |
| Phase 7: Documentation Generation | Not Started | 0% |
| Phase 8: Cleanup | Not Started | 0% |

**Overall: 0/8 Phases Complete (0%)**
