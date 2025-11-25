# Unified Error and Warning System Plan

**Created:** 2025-11-24
**Last Updated:** 2025-11-24
**Status:** Planning
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
```

## Implementation Phases

### Phase 1: Infrastructure (Foundation)

Create the diagnostics module with core types, registry, and factory functions.

### Phase 2: Lexer Migration

Define lexer error codes and migrate all lexer throw sites (~15 codes).

### Phase 3: Parser Migration

Define parser error codes and migrate parser throw sites (~10 codes).

### Phase 4: Desugarer Migration

Define desugarer error codes and migrate DesugarError usage (~5 codes).

### Phase 5: Type Checker Migration

Map existing TypeCheckerError factory functions to new codes (~30 codes).

### Phase 6: Module System Integration

Define module system codes including circular dependency warnings (~8 codes).

### Phase 7: Documentation Generation

Create script to generate markdown docs from TypeScript.

### Phase 8: Cleanup

Remove old error classes entirely (breaking changes OK) and update documentation.

## Success Criteria

1. All diagnostics use VFxxxx codes
2. `throwDiagnostic("VF1001", loc, params)` pattern throughout codebase
3. `vibefun explain VF4001` returns detailed explanation
4. `docs/error-codes/` auto-generated from TypeScript
5. All existing tests pass
6. Error messages remain user-friendly with locations and hints
7. No duplicate error codes (registry validates)

## Non-Goals

- Changing error recovery behavior (parser still collects multiple errors)
- Adding new error detection (only migrating existing)
- Internationalization (messages remain English)
- IDE integration (future work)
