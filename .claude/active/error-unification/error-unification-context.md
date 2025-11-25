# Error Unification - Context Document

**Last Updated:** 2025-11-25 (Review Complete)

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

### 7. Internal vs User-Facing Errors (Resolved 2025-11-25)
Internal errors (compiler bugs) remain plain `Error` throws, not diagnostic codes.

**Examples of internal errors (keep as plain Error):**
- "Unknown expression kind: {kind}"
- "Internal error: empty types array"
- "parseLambdaFn not initialized" (DI initialization)
- Exhaustiveness check failures

**User-facing errors get VFxxxx codes.**

**Rationale:** Internal errors indicate compiler bugs that should never reach users. They don't need lookup or documentation. Keeps diagnostic system focused on user-actionable errors.

### 8. Factory Function Migration (Resolved 2025-11-25)
Full replacement approach - DELETE all `createXxxError()` factory functions.

**Before:**
```typescript
throw createTypeMismatchError(expected, actual, loc);
```

**After:**
```typescript
throwDiagnostic("VF4001", loc, { expected, actual });
```

**Rationale:** Single code path. No confusion about which pattern to use. Breaking change is acceptable for this internal refactor.

### 9. Warning Infrastructure (Resolved 2025-11-25)
Warnings are included in this work, not deferred.

**Components:**
- `WarningCollector` class accumulates warnings without stopping
- VFx900-x999 codes have `severity: "warning"`
- Warnings reported after compilation completes

**Rationale:** Unreachable pattern warnings are already needed. Better to build infrastructure now than patch later.

### 10. Source Context Threading (Resolved 2025-11-25)
Pass `source: string` through the entire compilation pipeline.

**Changes required:**
- `typecheck(program, source, options)` - add source parameter
- `desugar(program, source)` - add source parameter
- CLI `compile()` - thread source to all phases

**Rationale:** All error messages should show source context with `^` pointer. This requires source to be available everywhere.

### 11. UnifyContext Pattern for Unification (Resolved 2025-11-25)
Pass a context object through unification that includes location.

```typescript
interface UnifyContext {
    loc: Location;           // Source location for errors
    source?: string;         // Optional source for formatting
}

function unify(t1: Type, t2: Type, ctx: UnifyContext): Substitution
```

**Rationale:**
- Extensible for future needs (source, error collector, etc.)
- Clear ownership of error context
- Single point of change if context needs expansion

### 12. Internal vs User-Facing Error Classification (Resolved 2025-11-25)
Detailed classification of errors in unify.ts and patterns.ts.

**unify.ts (17 total throws):**
- 10 user-facing → VF4xxx codes
- 7 internal assertions → remain plain Error

**patterns.ts (11 total throws):**
- 8 user-facing → VF4xxx codes
- 3 internal assertions → remain plain Error

**desugarListWithConcats.ts (2 throws):**
- 0 user-facing (both are internal assertions) → remain plain Error

### 13. Phase 5 Split (Resolved 2025-11-25)
Split Phase 5 into three sub-phases for incremental progress.

- **Phase 5a:** Define VF4xxx codes, create UnifyContext, basic typechecker.ts migration
- **Phase 5b:** Add UnifyContext to unify() signature, migrate unify.ts and patterns.ts
- **Phase 5c:** Migrate infer/*.ts files, delete old infrastructure

### 14. Message Template Syntax (Resolved 2025-11-25)
Use `{paramName}` syntax for message templates.

```typescript
messageTemplate: "Cannot unify {t1} with {t2}"
```

### 15. Utility Function Relocation (Resolved 2025-11-25)
Move utilities from `errors.ts` to `typechecker/format.ts`.

Functions to move:
- `typeToString(type: Type): string`
- `typeSchemeToString(scheme: TypeScheme): string`
- `findSimilarStrings(target, candidates, maxDistance): string[]`
- `levenshteinDistance(a, b): number`

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
| `packages/core/src/diagnostics/warning-collector.ts` | Warning accumulation |
| `packages/core/src/diagnostics/warning-collector.test.ts` | Tests (side-by-side) |
| `packages/core/src/diagnostics/test-helpers.ts` | Test utilities: expectDiagnostic(), expectWarning() |
| `packages/core/src/diagnostics/test-helpers.test.ts` | Tests (side-by-side) |
| `packages/core/src/diagnostics/codes/lexer.ts` | VF1xxx definitions |
| `packages/core/src/diagnostics/codes/parser.ts` | VF2xxx definitions |
| `packages/core/src/diagnostics/codes/desugarer.ts` | VF3xxx definitions |
| `packages/core/src/diagnostics/codes/typechecker.ts` | VF4xxx definitions (~45 codes) |
| `packages/core/src/diagnostics/codes/modules.ts` | VF5xxx definitions |
| `packages/core/src/diagnostics/index.ts` | Public API exports |
| `packages/core/src/typechecker/format.ts` | Type formatting utilities (moved from errors.ts) |
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
| `packages/core/src/desugarer/desugarer.ts` | Replace DesugarError, add source parameter |
| `packages/core/src/desugarer/desugarListWithConcats.ts` | Convert plain Error throws to diagnostics |
| `packages/core/src/typechecker/typechecker.ts` | Add source parameter, use throwDiagnostic() |
| `packages/core/src/typechecker/unify.ts` | Convert 18+ plain Error throws to diagnostics |
| `packages/core/src/typechecker/patterns.ts` | Convert throws to diagnostics |
| `packages/core/src/typechecker/infer/*.ts` | Replace factory calls with throwDiagnostic() |
| `packages/cli/src/index.ts` | Thread source through compilation pipeline |

### Files to Delete
| File | When | Reason |
|------|------|--------|
| `packages/core/src/desugarer/DesugarError.ts` | Phase 4 | Replaced by unified diagnostics |
| `packages/core/src/typechecker/errors.ts` | Phase 5c | Move utilities to `format.ts` first, then delete factory functions and TypeCheckerError class |
| `packages/core/src/utils/error.ts` | Phase 8 | Old error classes replaced by VibefunDiagnostic |

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
| (tuple element mismatch) | VF4007 | TupleElementMismatch (NEW) |
| (record field mismatch) | VF4008 | RecordFieldMismatch (NEW) |
| (numeric mismatch) | VF4009 | NumericTypeMismatch |
| (operator mismatch) | VF4010 | OperatorTypeMismatch |
| (guard type mismatch) | VF4011 | GuardTypeMismatch (NEW) |
| (annotation mismatch) | VF4012 | AnnotationMismatch (NEW) |
| (not a function) | VF4013 | NotAFunction |
| (not a record) | VF4014 | NotARecord (NEW) |
| (not a ref) | VF4015 | NotARef (NEW) |
| (ref assignment) | VF4016 | RefAssignmentMismatch (NEW) |
| (unify.ts: cannot unify) | VF4020 | CannotUnify (NEW) |
| (unify.ts: function arity) | VF4021 | FunctionArityMismatch (NEW) |
| (unify.ts: type app arity) | VF4022 | TypeApplicationArityMismatch (NEW) |
| (unify.ts: union arity) | VF4023 | UnionArityMismatch (NEW) |
| (unify.ts: incompatible) | VF4024 | IncompatibleTypes (NEW) |
| (unify.ts: variant) | VF4025 | VariantUnificationError (NEW) |
| createUndefinedVariableError | VF4100 | UndefinedVariable |
| createUndefinedTypeError | VF4101 | UndefinedType |
| createUndefinedConstructorError | VF4102 | UndefinedConstructor |
| createMissingFieldError | VF4103 | UndefinedField |
| createConstructorArityError | VF4200 | ConstructorArity |
| createOverloadError | VF4201 | NoMatchingOverload |
| (wrong argument count) | VF4202 | WrongArgumentCount |
| (tuple arity) | VF4203 | TupleArity (NEW) |
| (type arg count) | VF4204 | TypeArgumentCount (NEW) |
| createOccursCheckError | VF4300 | InfiniteType |
| (recursive alias) | VF4301 | RecursiveAlias (NEW) |
| createNonExhaustiveError | VF4400 | NonExhaustiveMatch |
| createInvalidGuardError | VF4401 | InvalidGuard |
| (duplicate binding) | VF4402 | DuplicateBinding |
| (or-pattern mismatch) | VF4403 | OrPatternBindingMismatch |
| createNonRecordAccessError | VF4500 | NonRecordAccess |
| (missing field) | VF4501 | MissingRecordField |
| (duplicate field) | VF4502 | DuplicateRecordField |
| (unknown constructor) | VF4600 | UnknownConstructor |
| (constructor arg mismatch) | VF4601 | ConstructorArgMismatch (NEW) |
| (variant mismatch) | VF4602 | VariantMismatch (NEW) |
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
