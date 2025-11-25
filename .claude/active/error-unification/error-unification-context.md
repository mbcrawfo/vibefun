# Error Unification - Context Document

**Last Updated:** 2025-11-24

## Key Design Decisions

### 1. Unified VFxxxx Namespace
All diagnostics (both errors and warnings) use VFxxxx codes with severity as a property, not separate namespaces (VFxxxx vs Wxxxx).

**Rationale:** More unified system like TypeScript. Easier tooling integration. Severity can change over time without renumbering.

### 2. Warnings Distributed by Phase
Each phase has its own warning subrange (VF1900-1999 for lexer, VF4900-4999 for types, etc.) rather than grouping all warnings in a single VF9xxx range.

**Rationale:** Better grouping by topic. Easier to find related errors/warnings together.

### 3. Renumbered Code Ranges
Existing VF0001-VF0231 type system codes (from `docs/spec/03-type-system/error-catalog.md`) are renumbered to VF4xxx to fit the new phase-based scheme.

**Rationale:** Clean, consistent organization. The old codes were never implemented in actual code anyway.

### 4. TypeScript as Source of Truth
Error codes defined in TypeScript (`diagnostics/codes/*.ts`), markdown docs auto-generated from TypeScript.

**Rationale:** Single source of truth. Code and docs can't drift. Enables runtime lookup and `--explain` command.

### 5. Migration Strategy
Full migration of all existing error throw sites across lexer, parser, desugarer, and type checker in one task. Old error classes are fully removed (not deprecated). Breaking changes are acceptable.

**Rationale:** Consistent error handling everywhere. Avoid half-migrated state. Clean codebase without legacy patterns.

### 6. Test File Placement
Tests are placed side-by-side with source files (e.g., `diagnostic.ts` and `diagnostic.test.ts` in the same directory), not in a separate `__tests__/` folder.

**Rationale:** Follows project conventions. Easier to find related test files.

## Critical Files

### Files to Create
| File | Purpose |
|------|---------|
| `packages/core/src/diagnostics/diagnostic.ts` | Core types, VibefunDiagnostic class |
| `packages/core/src/diagnostics/diagnostic.test.ts` | Tests (side-by-side) |
| `packages/core/src/diagnostics/registry.ts` | Central error code registry |
| `packages/core/src/diagnostics/registry.test.ts` | Tests (side-by-side) |
| `packages/core/src/diagnostics/factory.ts` | Error creation helpers |
| `packages/core/src/diagnostics/factory.test.ts` | Tests (side-by-side) |
| `packages/core/src/diagnostics/codes/lexer.ts` | VF1xxx definitions |
| `packages/core/src/diagnostics/codes/parser.ts` | VF2xxx definitions |
| `packages/core/src/diagnostics/codes/desugarer.ts` | VF3xxx definitions |
| `packages/core/src/diagnostics/codes/typechecker.ts` | VF4xxx definitions |
| `packages/core/src/diagnostics/codes/modules.ts` | VF5xxx definitions |
| `packages/core/src/diagnostics/index.ts` | Public API exports |
| `scripts/generate-error-docs.ts` | Documentation generator |

### Files to Modify
| File | Changes |
|------|---------|
| `packages/core/src/lexer/string-parser.ts` | Replace LexerError throws with diagnostics |
| `packages/core/src/lexer/number-parser.ts` | Replace LexerError throws with diagnostics |
| `packages/core/src/lexer/comment-handler.ts` | Replace LexerError throws with diagnostics |
| `packages/core/src/lexer/operator-parser.ts` | Replace LexerError throws with diagnostics |
| `packages/core/src/parser/parser-base.ts` | Replace error helper with diagnostics |
| `packages/core/src/parser/parse-declarations.ts` | Use new error pattern |
| `packages/core/src/parser/parse-expressions.ts` | Use new error pattern |
| `packages/core/src/desugarer/desugarer.ts` | Replace DesugarError with diagnostics |
| `packages/core/src/typechecker/typechecker.ts` | Update to use diagnostics/factory.ts |
| `packages/core/src/typechecker/unify.ts` | Update to use diagnostics/factory.ts |

### Files to Delete
| File | Reason |
|------|--------|
| `packages/core/src/desugarer/DesugarError.ts` | Replaced by unified diagnostics |
| `packages/core/src/utils/error.ts` | Old error classes replaced by VibefunDiagnostic |
| `packages/core/src/typechecker/errors.ts` | TypeCheckerError replaced by diagnostics (factory functions moved to diagnostics/factory.ts) |

### Files to Archive/Update
| File | Action |
|------|--------|
| `docs/spec/03-type-system/error-catalog.md` | Move to archive folder |
| `docs/spec/03-type-system/error-reporting.md` | Update to reference new system |
| `docs/spec/.agent-map.md` | Update error code references |

## Existing Error Infrastructure

### Current Error Classes
```
packages/core/src/utils/error.ts:
  VibefunError (base)
  ├── LexerError
  ├── ParserError
  ├── TypeError
  ├── CompilationError
  └── RuntimeError

packages/core/src/typechecker/errors.ts:
  TypeCheckerError (separate, extends Error directly)

packages/core/src/desugarer/DesugarError.ts:
  DesugarError (separate, extends Error directly)
```

### Inconsistencies to Fix
1. `TypeCheckerError` uses `loc` instead of `location`
2. `DesugarError` uses `hint` instead of `help`
3. `DesugarError` doesn't extend `VibefunError`
4. Ad-hoc messages without codes throughout codebase

## Error Code Mappings

### Lexer (VF1xxx)
| Current Message | New Code | Title |
|-----------------|----------|-------|
| Unterminated string: newline | VF1001 | UnterminatedString |
| Unterminated string: EOF | VF1002 | UnterminatedStringEOF |
| Unterminated multi-line string | VF1003 | UnterminatedMultilineString |
| Invalid escape sequence | VF1010 | InvalidEscapeSequence |
| Invalid \\xHH escape | VF1011 | InvalidHexEscape |
| Invalid \\u{...} escape | VF1012 | InvalidUnicodeEscape |
| Invalid number separator | VF1100 | InvalidNumberSeparator |
| Invalid binary literal | VF1101 | InvalidBinaryLiteral |
| Invalid hex literal | VF1102 | InvalidHexLiteral |
| Invalid octal literal | VF1103 | InvalidOctalLiteral |
| Invalid scientific notation | VF1104 | InvalidScientificNotation |
| Unterminated multi-line comment | VF1300 | UnterminatedComment |
| Unexpected character | VF1400 | UnexpectedCharacter |

### Parser (VF2xxx)
| Current Pattern | New Code | Title |
|-----------------|----------|-------|
| Expected X, but found Y | VF2001 | UnexpectedToken |
| Expected declaration keyword | VF2010 | ExpectedDeclaration |
| Expected '=' after pattern | VF2011 | ExpectedEquals |
| Expected expression | VF2100 | ExpectedExpression |
| Expected closing brace | VF2101 | ExpectedClosingBrace |
| Expected closing paren | VF2102 | ExpectedClosingParen |
| Expected closing bracket | VF2103 | ExpectedClosingBracket |
| Expected type name | VF2300 | ExpectedTypeName |
| Expected pattern | VF2200 | ExpectedPattern |
| Too many parse errors | VF2500 | TooManyErrors |

### Desugarer (VF3xxx)
| Current Message | New Code | Title |
|-----------------|----------|-------|
| Unknown expression kind | VF3001 | UnknownExpressionKind |
| Unknown pattern kind | VF3002 | UnknownPatternKind |
| Unknown declaration kind | VF3003 | UnknownDeclarationKind |
| Or-pattern not expanded | VF3100 | OrPatternNotExpanded |
| List has undefined element | VF3101 | UndefinedListElement |

### Type Checker (VF4xxx)
| Factory Function | New Code | Title |
|------------------|----------|-------|
| createTypeMismatchError | VF4001 | TypeMismatch |
| (argument mismatch) | VF4002 | ArgumentTypeMismatch |
| (return type mismatch) | VF4003 | ReturnTypeMismatch |
| (branch mismatch) | VF4004 | BranchTypeMismatch |
| (if branch mismatch) | VF4005 | IfBranchTypeMismatch |
| (list element mismatch) | VF4006 | ListElementMismatch |
| (numeric mismatch) | VF4009 | NumericTypeMismatch |
| (operator mismatch) | VF4010 | OperatorTypeMismatch |
| (not a function) | VF4013 | NotAFunction |
| createUndefinedVariableError | VF4100 | UndefinedVariable |
| createUndefinedTypeError | VF4101 | UndefinedType |
| createUndefinedConstructorError | VF4102 | UndefinedConstructor |
| createMissingFieldError | VF4103 | UndefinedField |
| createConstructorArityError | VF4200 | ConstructorArity |
| createOverloadError | VF4201 | NoMatchingOverload |
| (wrong argument count) | VF4202 | WrongArgumentCount |
| createOccursCheckError | VF4300 | InfiniteType |
| createNonExhaustiveError | VF4400 | NonExhaustiveMatch |
| createInvalidGuardError | VF4401 | InvalidGuard |
| (duplicate binding) | VF4402 | DuplicateBinding |
| (or-pattern mismatch) | VF4403 | OrPatternBindingMismatch |
| createNonRecordAccessError | VF4500 | NonRecordAccess |
| (missing field) | VF4501 | MissingRecordField |
| (duplicate field) | VF4502 | DuplicateRecordField |
| (unknown constructor) | VF4600 | UnknownConstructor |
| createValueRestrictionError | VF4700 | ValueRestriction |
| createEscapeError | VF4701 | TypeEscape |
| (unreachable pattern) | VF4900 | UnreachablePattern (warning) |

### Module System (VF5xxx)
| Description | New Code | Title |
|-------------|----------|-------|
| Module not found | VF5000 | ModuleNotFound |
| Import not exported | VF5001 | ImportNotExported |
| Duplicate import | VF5002 | DuplicateImport |
| Import shadowed by local | VF5003 | ImportShadowed |
| Duplicate export | VF5100 | DuplicateExport |
| Re-export name conflict | VF5101 | ReexportConflict |
| Circular import (value) | VF5900 | CircularDependency (warning) |
| Case sensitivity mismatch | VF5901 | CaseSensitivityMismatch (warning) |

## Related Documentation

- Existing error catalog: `docs/spec/03-type-system/error-catalog.md`
- Error reporting spec: `docs/spec/03-type-system/error-reporting.md`
- Module resolution plan: `.claude/active/module-resolution/module-resolution-plan.md`
- Typechecker requirements: `.claude/design/typechecker-requirements.md`
