# Vibefun Diagnostics System

This module provides a unified error and warning system for the Vibefun compiler. All compiler diagnostics use VFxxxx codes with consistent formatting.

## Architecture Overview

```
diagnostics/
├── diagnostic.ts         # Core types and VibefunDiagnostic class
├── registry.ts           # Central registry for all diagnostic codes
├── factory.ts            # createDiagnostic() and throwDiagnostic() helpers
├── warning-collector.ts  # WarningCollector class for accumulating warnings
├── test-helpers.ts       # Test utilities: expectDiagnostic(), expectWarning()
├── index.ts              # Public API exports
└── codes/                # Diagnostic code definitions by phase
    ├── index.ts          # Aggregate exports and initialization
    ├── lexer.ts          # VF1xxx codes
    ├── parser.ts         # VF2xxx codes
    ├── desugarer.ts      # VF3xxx codes
    ├── typechecker.ts    # VF4xxx codes
    ├── modules.ts        # VF5xxx codes
    └── README.md         # Guide for adding new codes
```

## Usage

### Throwing Errors

Use `throwDiagnostic()` to throw an error with a specific code:

```typescript
import { throwDiagnostic } from "../diagnostics/index.js";

// Throws a VibefunDiagnostic with interpolated message
throwDiagnostic("VF4001", loc, { expected: "Int", actual: "String" });
```

### Creating Warnings

Use `createDiagnostic()` to create a warning without throwing:

```typescript
import { createDiagnostic, WarningCollector } from "../diagnostics/index.js";

const collector = new WarningCollector();

const warning = createDiagnostic("VF4900", loc, { pattern: "..." });
collector.add(warning);

// Later, report all warnings
for (const w of collector.getWarnings()) {
    console.warn(w.format(source));
}
```

### Formatting Errors for Display

```typescript
import { VibefunDiagnostic } from "../diagnostics/index.js";

try {
    compile(source);
} catch (error) {
    if (error instanceof VibefunDiagnostic) {
        // Rich formatting with source context
        console.error(error.format(source));
    } else {
        // Fallback for unexpected errors
        console.error(error.message);
    }
}
```

### Testing

Use the test helpers for asserting diagnostics:

```typescript
import { expectDiagnostic, expectWarning, WarningCollector } from "../diagnostics/index.js";

// Test that code throws a specific error
const diag = expectDiagnostic(() => typecheck(program), "VF4001");
expect(diag.message).toContain("expected Int");
expect(diag.location.line).toBe(5);

// Test warnings
const collector = new WarningCollector();
typecheck(program, source, { warningCollector: collector });
const warning = expectWarning(collector, "VF4900");
expect(warning.message).toContain("Unreachable");
```

## Code Ranges

Each compiler phase has its own range of diagnostic codes:

| Range     | Phase        | Errors          | Warnings        |
|-----------|--------------|-----------------|-----------------|
| VF1xxx    | Lexer        | VF1000-VF1899   | VF1900-VF1999   |
| VF2xxx    | Parser       | VF2000-VF2899   | VF2900-VF2999   |
| VF3xxx    | Desugarer    | VF3000-VF3899   | VF3900-VF3999   |
| VF4xxx    | Type Checker | VF4000-VF4899   | VF4900-VF4999   |
| VF5xxx    | Modules      | VF5000-VF5899   | VF5900-VF5999   |
| VF6xxx    | Code Gen     | VF6000-VF6899   | VF6900-VF6999   |
| VF7xxx    | Runtime      | VF7000-VF7899   | VF7900-VF7999   |

## Key Types

### DiagnosticDefinition

The complete definition of a diagnostic code, serving as the single source of truth for both runtime error creation and documentation generation:

```typescript
interface DiagnosticDefinition {
    code: string;           // "VF4001"
    title: string;          // "TypeMismatch"
    messageTemplate: string; // "Type mismatch: expected {expected}, got {actual}"
    severity: "error" | "warning";
    phase: DiagnosticPhase;
    category: string;       // "mismatch", "undefined", etc.
    hintTemplate?: string;  // Optional fix suggestion

    // Documentation fields (required)
    explanation: string;    // Why this error occurs
    example: {
        bad: string;        // Code that triggers error
        good: string;       // Fixed code
        description: string; // What changed
    };
    relatedCodes?: string[];  // Related error codes
    seeAlso?: string[];       // Links to spec docs
}
```

### VibefunDiagnostic

The error class thrown by `throwDiagnostic()`:

```typescript
class VibefunDiagnostic extends Error {
    code: string;           // "VF4001"
    severity: DiagnosticSeverity;
    location: Location;
    hint?: string;
    diagnosticMessage: string;  // Interpolated message

    format(source?: string): string;  // Rich formatting
}
```

## Internal vs User-Facing Errors

Not all errors should use diagnostic codes:

- **User-facing errors** → Use `throwDiagnostic("VFxxxx", ...)`
  - Syntax errors, type mismatches, undefined references, etc.
  - Anything the user can fix in their code

- **Internal errors** → Use plain `throw new Error(...)`
  - "Unknown expression kind" (compiler bug)
  - "Not initialized" (DI failures)
  - Exhaustiveness check failures
  - These indicate compiler bugs, not user errors

## Adding New Codes

See [codes/README.md](./codes/README.md) for a step-by-step guide on adding new diagnostic codes.

## Documentation Generation

Error documentation in `docs/errors/` is auto-generated from the TypeScript definitions:

```bash
# Generate documentation
npm run docs:errors

# Check if docs are up to date (used in CI)
npm run docs:errors:check
```

The generator reads all `DiagnosticDefinition` objects from the registry and produces markdown files with explanations, examples, and cross-references.
