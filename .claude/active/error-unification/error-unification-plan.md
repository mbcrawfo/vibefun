# Unified Error and Warning System Plan

**Created:** 2025-11-24
**Last Updated:** 2025-11-25
**Status:** Planning (Reviewed)
**Branch:** error-unification

## Overview

Unify all compiler diagnostics (errors and warnings) under a single VFxxxx code system with TypeScript as the source of truth and auto-generated documentation.

## Goals

1. Unified VFxxxx codes for all diagnostics with severity as a property
2. Renumbered code ranges organized by compiler phase
3. TypeScript as source of truth for error codes
4. Auto-generated documentation in `docs/error-codes/`
5. Consistent error class hierarchy across all compiler phases
6. Full migration of all existing error throw sites
7. Warning infrastructure with collection and reporting
8. Source context in error formatting for all compiler phases

## Design Decisions

These decisions were made during plan review (2025-11-25):

### 1. Internal vs User-Facing Errors
**Decision:** Internal errors remain plain `Error` throws (not diagnostic codes).

- DI initialization failures, exhaustiveness checks, "Unknown X kind" → plain `Error`
- These indicate compiler bugs, not user errors
- Only user-facing errors get VFxxxx codes

### 2. Factory Function Migration
**Decision:** Full replacement (delete old factories).

- Delete `createTypeMismatchError()`, `createUndefinedVariableError()`, etc.
- Replace ALL call sites with `createDiagnostic("VF4001", ...)` / `throwDiagnostic()`
- Delete `TypeCheckerError` class entirely
- Breaking change is acceptable

### 3. Warning Infrastructure
**Decision:** Include warnings in this work (not deferred).

- Define `WarningCollector` class in Phase 1
- Implement VFx900-x999 codes with `severity: "warning"`
- Warnings accumulate without stopping compilation
- Reported after compilation completes

### 4. Source Context
**Decision:** Pass `source: string` through compilation pipeline.

- Thread source through all phases (lexer → parser → desugarer → typechecker)
- Required for consistent error formatting with code snippets
- Add `source` parameter to `typecheck()` and `desugar()` entry points

### 5. Plain Error Throws
**Decision:** Convert user-facing plain `Error` throws to diagnostics.

- `unify.ts` has 18+ plain `Error` throws → convert to VF4xxx
- `desugarListWithConcats.ts` plain errors → convert to VF3xxx
- Leave internal assertion-style errors as plain `Error`

## Error Code Ranges

4-digit codes organized by compiler phase. Each phase reserves codes 000-899 for errors and 900-999 for warnings:

| Range | Phase | Errors | Warnings |
|-------|-------|--------|----------|
| VF1xxx | Lexer | VF1000-VF1899 | VF1900-VF1999 |
| VF2xxx | Parser | VF2000-VF2899 | VF2900-VF2999 |
| VF3xxx | Desugarer | VF3000-VF3899 | VF3900-VF3999 |
| VF4xxx | Type System | VF4000-VF4899 | VF4900-VF4999 |
| VF5xxx | Module System | VF5000-VF5899 | VF5900-VF5999 |
| VF6xxx | Code Generator | VF6000-VF6899 | VF6900-VF6999 |
| VF7xxx | Runtime | VF7000-VF7899 | VF7900-VF7999 |

### Subcategory Allocation

**VF1xxx - Lexer:**
- VF1000-VF1099: String literals
- VF1100-VF1199: Number literals
- VF1200-VF1299: Escape sequences
- VF1300-VF1399: Comments
- VF1400-VF1499: Operators/symbols
- VF1500-VF1599: Identifiers/keywords
- VF1900-VF1999: Lexer warnings

**VF2xxx - Parser:**
- VF2000-VF2099: Declaration parsing
- VF2100-VF2199: Expression parsing
- VF2200-VF2299: Pattern parsing
- VF2300-VF2399: Type expression parsing
- VF2400-VF2499: Import/export parsing
- VF2500-VF2599: General syntax errors
- VF2900-VF2999: Parser warnings

**VF3xxx - Desugarer:**
- VF3000-VF3099: Unknown node kinds
- VF3100-VF3199: Invalid transformations
- VF3900-VF3999: Desugarer warnings

**VF4xxx - Type System:**
- VF4000-VF4099: Type mismatch
- VF4100-VF4199: Undefined references
- VF4200-VF4299: Arity errors
- VF4300-VF4399: Infinite types
- VF4400-VF4499: Pattern errors
- VF4500-VF4599: Record errors
- VF4600-VF4699: Variant errors
- VF4700-VF4799: Polymorphism errors
- VF4800-VF4899: External/FFI errors
- VF4900-VF4999: Type warnings (unreachable patterns, etc.)

**VF5xxx - Module System:**
- VF5000-VF5099: Import resolution
- VF5100-VF5199: Export validation
- VF5200-VF5299: Dependency errors
- VF5900-VF5999: Module warnings (circular deps, case sensitivity)

### Additional Error Codes (from review)

These codes were identified as missing during the plan review:

**Parser (VF2xxx) - Import/Export:**
| Code | Name | Message |
|------|------|---------|
| VF2104 | ExpectedClosingAngle | "Expected '>' to close type parameters" |
| VF2105 | ExpectedArrow | "Expected '->' in function type" |
| VF2400 | InvalidImportSpecifier | "Invalid import specifier" |
| VF2401 | MalformedExport | "Malformed export declaration" |
| VF2402 | ExpectedModulePath | "Expected module path string" |

**Type Checker (VF4xxx) - Additional Mismatch:**
| Code | Name | Message |
|------|------|---------|
| VF4007 | TupleElementMismatch | "Tuple element {index}: expected {expected}, got {actual}" |
| VF4008 | RecordFieldMismatch | "Field '{field}': expected {expected}, got {actual}" |
| VF4011 | GuardTypeMismatch | "Guard must be Bool, got {actual}" |
| VF4012 | AnnotationMismatch | "Type annotation {expected} does not match inferred {actual}" |
| VF4014 | NotARecord | "Cannot access field on non-record type {actual}" |
| VF4015 | NotARef | "Cannot dereference non-Ref type {actual}" |
| VF4016 | RefAssignmentMismatch | "Cannot assign {actual} to Ref<{expected}>" |

**Type Checker (VF4xxx) - Arity:**
| Code | Name | Message |
|------|------|---------|
| VF4203 | TupleArity | "Expected {expected}-tuple, got {actual}-tuple" |
| VF4204 | TypeArgumentCount | "Type '{name}' expects {expected} type arguments, got {actual}" |

**Type Checker (VF4xxx) - Infinite Types:**
| Code | Name | Message |
|------|------|---------|
| VF4301 | RecursiveAlias | "Type alias '{name}' is recursive" |

**Type Checker (VF4xxx) - Variants:**
| Code | Name | Message |
|------|------|---------|
| VF4601 | ConstructorArgMismatch | "Constructor '{name}' argument type mismatch: expected {expected}, got {actual}" |
| VF4602 | VariantMismatch | "Expected variant type {expected}, got {actual}" |

**Unification Errors (VF4xxx) - from unify.ts plain Error throws:**
| Code | Name | Message |
|------|------|---------|
| VF4020 | CannotUnify | "Cannot unify {t1} with {t2}" |
| VF4021 | FunctionArityMismatch | "Cannot unify functions with different arity: {arity1} vs {arity2}" |
| VF4022 | TypeApplicationArityMismatch | "Cannot unify type applications with different arity" |
| VF4023 | UnionArityMismatch | "Cannot unify unions with different number of types" |
| VF4024 | IncompatibleTypes | "Cannot unify types: {type1} with {type2}" |
| VF4025 | VariantUnificationError | "Cannot unify variant types" |

## Directory Structure

```
packages/core/src/
├── diagnostics/
│   ├── index.ts                    # Public API exports
│   ├── diagnostic.ts               # Diagnostic types and VibefunDiagnostic class
│   ├── diagnostic.test.ts          # Tests (side-by-side)
│   ├── registry.ts                 # Central error code registry
│   ├── registry.test.ts            # Tests (side-by-side)
│   ├── factory.ts                  # Error creation helpers
│   ├── factory.test.ts             # Tests (side-by-side)
│   ├── warning-collector.ts        # Warning accumulation (NEW)
│   ├── warning-collector.test.ts   # Tests (side-by-side)
│   ├── test-helpers.ts             # Test utilities (NEW)
│   ├── test-helpers.test.ts        # Tests (side-by-side)
│   ├── codes/
│   │   ├── index.ts                # Aggregate exports
│   │   ├── lexer.ts                # VF1xxx definitions
│   │   ├── parser.ts               # VF2xxx definitions
│   │   ├── desugarer.ts            # VF3xxx definitions
│   │   ├── typechecker.ts          # VF4xxx definitions
│   │   ├── modules.ts              # VF5xxx definitions
│   │   └── codegen.ts              # VF6xxx definitions
│
scripts/
└── generate-error-docs.ts          # Documentation generator

docs/error-codes/
├── README.md                       # Index (auto-generated)
├── lexer.md                        # VF1xxx (auto-generated)
├── parser.md                       # VF2xxx (auto-generated)
├── desugarer.md                    # VF3xxx (auto-generated)
├── typechecker.md                  # VF4xxx (auto-generated)
├── modules.md                      # VF5xxx (auto-generated)
└── codegen.md                      # VF6xxx (auto-generated)
```

## Core Types

```typescript
// diagnostics/diagnostic.ts

export type DiagnosticSeverity = "error" | "warning";

export type DiagnosticPhase =
    | "lexer" | "parser" | "desugarer"
    | "typechecker" | "modules" | "codegen" | "runtime";

export interface DiagnosticDefinition {
    readonly code: string;
    readonly title: string;
    readonly messageTemplate: string;
    readonly severity: DiagnosticSeverity;
    readonly phase: DiagnosticPhase;
    readonly category: string;
    readonly hintTemplate?: string;
    readonly example?: { code: string; description: string };
    readonly fix?: string;
}

export interface Diagnostic {
    readonly definition: DiagnosticDefinition;
    readonly message: string;
    readonly location: Location;
    readonly hint?: string;
}

// Unified error class replacing all existing error classes
export class VibefunDiagnostic extends Error {
    public readonly diagnostic: Diagnostic;

    constructor(diagnostic: Diagnostic) { ... }

    get code(): string { ... }
    get severity(): DiagnosticSeverity { ... }
    get location(): Location { ... }
    get hint(): string | undefined { ... }

    format(source?: string): string { ... }
}

// diagnostics/warning-collector.ts

export class WarningCollector {
    private warnings: VibefunDiagnostic[] = [];

    add(warning: VibefunDiagnostic): void { ... }
    getWarnings(): readonly VibefunDiagnostic[] { ... }
    hasWarnings(): boolean { ... }
    clear(): void { ... }
}

// diagnostics/test-helpers.ts

/**
 * Expect a function to throw a VibefunDiagnostic with the given code.
 * Returns the diagnostic for further assertions.
 */
export function expectDiagnostic(
    fn: () => void,
    expectedCode: string
): VibefunDiagnostic { ... }

/**
 * Expect a warning to be collected with the given code.
 */
export function expectWarning(
    collector: WarningCollector,
    expectedCode: string
): VibefunDiagnostic { ... }
```

## Implementation Phases

### Phase 1: Infrastructure (Foundation)

Create the diagnostics module with core types, registry, and factory functions.

**Key deliverables:**
- `diagnostic.ts` - Core types and `VibefunDiagnostic` class
- `registry.ts` - Central error code registry with duplicate detection
- `factory.ts` - `createDiagnostic()` and `throwDiagnostic()` helpers
- `warning-collector.ts` - `WarningCollector` class for accumulating warnings
- `test-helpers.ts` - `expectDiagnostic()` and `expectWarning()` utilities
- `codes/index.ts` - Empty placeholder exports for each phase

### Phase 2: Lexer Migration

Define lexer error codes and migrate all lexer throw sites (~15 codes).

**Migration targets:**
- `string-parser.ts` - String literal errors
- `number-parser.ts` - Number literal errors
- `comment-handler.ts` - Comment errors
- `operator-parser.ts` - Unexpected character errors

### Phase 3: Parser Migration

Define parser error codes and migrate parser throw sites (~15 codes including new VF2400+ import/export codes).

**Migration targets:**
- `parser-base.ts` - Error helper method
- `parse-declarations.ts`, `parse-expressions.ts`, `parse-patterns.ts`, `parse-types.ts`

### Phase 4: Desugarer Migration

Define desugarer error codes and migrate DesugarError usage (~5 codes).

**Migration targets:**
- `desugarer.ts`, `desugarListPattern.ts`, `buildConsChain.ts`
- `desugarListWithConcats.ts` - Convert plain `Error` throws to diagnostics
- Delete `DesugarError.ts`

### Phase 5: Type Checker Migration

**Full replacement approach** - Delete factory functions, replace all call sites with `createDiagnostic()`.

**Migration targets:**
- `errors.ts` - DELETE factory functions, keep only `typeToString()` utilities
- `typechecker.ts` - Add `source` parameter, use `createDiagnostic()`
- `unify.ts` - Convert 18+ plain `Error` throws to VF4xxx diagnostics
- `patterns.ts` - Convert 12+ throws to diagnostics
- All `infer/*.ts` files - Replace factory calls
- Delete `TypeCheckerError` class entirely

**Estimated codes:** ~45 (including unification errors)

### Phase 6: Module System Integration

Define module system codes including circular dependency warnings (~8 codes).

### Phase 7: Documentation Generation

Create script to generate markdown docs from TypeScript.

**Additional requirements:**
- Include severity column in error tables
- Document warning codes alongside error codes

### Phase 8: Cleanup

Remove old error classes entirely (breaking changes OK) and update documentation.

**Files to delete:**
- `packages/core/src/utils/error.ts` - Old error classes
- `packages/core/src/typechecker/errors.ts` - TypeCheckerError (after migration)
- `packages/core/src/desugarer/DesugarError.ts`

**Files to update:**
- `docs/spec/03-type-system/error-catalog.md` → Move to archive
- `docs/spec/03-type-system/error-reporting.md` → Reference new system
- `docs/spec/.agent-map.md` → Add error-codes reference

## Test Migration Patterns

When updating tests during migration, use these patterns:

```typescript
// OLD pattern
expect(() => lexer.tokenize()).toThrow(LexerError);
expect(() => lexer.tokenize()).toThrow("Unexpected character");

// NEW pattern - basic
expect(() => lexer.tokenize()).toThrow(VibefunDiagnostic);
expect(() => lexer.tokenize()).toThrow(/VF1400/);  // code in message

// NEW pattern - with test helper (recommended)
const diag = expectDiagnostic(() => lexer.tokenize(), "VF1400");
expect(diag.message).toContain("Unexpected character");
expect(diag.location.line).toBe(1);

// NEW pattern - warnings
const collector = new WarningCollector();
typecheck(program, source, { warningCollector: collector });
const warning = expectWarning(collector, "VF4900");
expect(warning.message).toContain("Unreachable");
```

**Key test files requiring updates:**
- `packages/core/src/parser/parser-errors.test.ts` (299 lines - largest)
- `packages/core/src/typechecker/errors.test.ts` (464 lines)
- `packages/core/src/utils/error.test.ts` (103 lines)
- `packages/core/src/desugarer/DesugarError.test.ts` (42 lines)
- Lexer tests across multiple files (75+ assertions)

## Success Criteria

1. All diagnostics use VFxxxx codes
2. `throwDiagnostic("VF1001", loc, params)` pattern throughout codebase
3. `vibefun explain VF4001` returns detailed explanation
4. `docs/error-codes/` auto-generated from TypeScript
5. All existing tests pass
6. Error messages remain user-friendly with locations and hints
7. No duplicate error codes (registry validates)
8. Warning infrastructure functional (collector, reporting)
9. Source context available in all error formatting
10. Test helpers available for diagnostic assertions

## Non-Goals

- Changing error recovery behavior (parser still collects multiple errors)
- Adding new error detection (only migrating existing)
- Internationalization (messages remain English)
- IDE integration (future work)
- Multi-error collection for type checker (deferred - only parser collects multiple)
