# Adding New Diagnostic Codes

This guide explains how to add new error or warning codes to the Vibefun diagnostic system.

## Code Ranges

Each compiler phase has assigned code ranges. Choose the appropriate range for your new code:

| Phase        | Range     | Errors          | Warnings        | File             |
|--------------|-----------|-----------------|-----------------|------------------|
| Lexer        | VF1xxx    | VF1000-VF1899   | VF1900-VF1999   | `lexer.ts`       |
| Parser       | VF2xxx    | VF2000-VF2899   | VF2900-VF2999   | `parser/`        |
| Desugarer    | VF3xxx    | VF3000-VF3899   | VF3900-VF3999   | `desugarer.ts`   |
| Type Checker | VF4xxx    | VF4000-VF4899   | VF4900-VF4999   | `typechecker/`   |
| Modules      | VF5xxx    | VF5000-VF5899   | VF5900-VF5999   | `modules.ts`     |
| Code Gen     | VF6xxx    | VF6000-VF6899   | VF6900-VF6999   | `codegen.ts`     |
| Runtime      | VF7xxx    | VF7000-VF7899   | VF7900-VF7999   | (future)         |

### Subcategory Allocation

Within each phase, codes are organized by subcategory. Check existing codes in the phase file to find the right subcategory.

**Example (Type Checker VF4xxx):**
- VF4000-VF4019: Type mismatch errors
- VF4020-VF4029: Unification errors
- VF4100-VF4199: Undefined reference errors
- VF4200-VF4299: Arity errors
- VF4300-VF4399: Infinite type errors
- VF4400-VF4499: Pattern errors
- VF4500-VF4599: Record errors
- VF4600-VF4699: Variant errors
- VF4700-VF4799: Polymorphism errors
- VF4800-VF4899: FFI/External errors
- VF4900-VF4999: Type warnings

## Step-by-Step Guide

### 1. Choose the Code Number

1. Identify the compiler phase (lexer, parser, etc.)
2. Find the appropriate subcategory
3. Look at existing codes in that subcategory
4. Pick the next available number

### 2. Create the Definition

Phases are stored as either a single file (e.g., `lexer.ts`, `desugarer.ts`, `modules.ts`) or a folder with one file per subcategory (e.g., `parser/`, `typechecker/`). For phase-folders, pick the subcategory file that matches the code's range (e.g., `typechecker/mismatch.ts` for VF4000–VF4019, `parser/expression.ts` for VF2100–VF2199) — follow the header comment in the phase's `index.ts` for the authoritative subcategory map. Adding a new subcategory file requires creating a sibling `<name>.ts` exporting an aggregated `<name>Codes` array, then threading it into the phase's `index.ts`.

Add your definition to the appropriate phase file or subcategory file:

```typescript
export const VF4XXX: DiagnosticDefinition = {
    // === CORE FIELDS (required) ===
    code: "VF4XXX",
    title: "YourErrorTitle",  // PascalCase, descriptive
    messageTemplate: "Error message with {placeholder} values",
    severity: "error",  // or "warning"
    phase: "typechecker",
    category: "subcategory",  // e.g., "mismatch", "undefined"

    // === HINT (optional but recommended) ===
    hintTemplate: "Actionable fix suggestion with {placeholder}",

    // === DOCUMENTATION (required) ===
    explanation:
        "One paragraph explaining why this error occurs. " +
        "Be specific about the root cause and common scenarios.",

    example: {
        bad: `let x: Int = "hello"`,
        good: `let x: String = "hello"`,
        description: "Changed type annotation to match the value",
    },

    // === CROSS-REFERENCES (optional) ===
    relatedCodes: ["VF4001", "VF4002"],
    seeAlso: ["spec/03-type-system/inference.md"],
};
```

### 3. Register the Code

**Single-file phases** (e.g., `lexer.ts`): add your code to the registration array at the bottom of the file:

```typescript
const lexerCodes: readonly DiagnosticDefinition[] = [
    // ... existing codes ...
    VF1XXX,  // Add your new code
];
```

**Phase-folder phases** (e.g., `typechecker/`, `parser/`): add your code to the subcategory file's local array (e.g., `typechecker/mismatch.ts` exports `mismatchCodes`). The folder's `index.ts` already spreads every subcategory array into the phase-wide `registerXxxCodes()` aggregator, so no edit there is needed unless you are introducing a brand-new subcategory file.

```typescript
// typechecker/mismatch.ts
export const mismatchCodes: readonly DiagnosticDefinition[] = [
    // ... existing codes ...
    VF4XXX,  // Add your new code
];
```

### 4. Export from Index

The code should be automatically exported through the phase's public surface:

- **Single-file phases** export via the phase file directly, which is re-exported from `codes/index.ts`.
- **Phase-folder phases** export via the folder's `index.ts`, which `codes/index.ts` re-exports. For phase-folders, verify the subcategory file is imported by the folder's `index.ts`.

### 5. Use the Code

In your compiler code:

```typescript
import { throwDiagnostic } from "../diagnostics/index.js";

// For errors (stops compilation)
throwDiagnostic("VF4XXX", loc, { placeholder: value });

// For warnings (continues compilation)
import { createDiagnostic } from "../diagnostics/index.js";
const warning = createDiagnostic("VF4XXX", loc, { placeholder: value });
warningCollector.add(warning);
```

### 6. Write Tests

Use the test helpers to verify your diagnostic:

```typescript
import { expectDiagnostic } from "../diagnostics/index.js";

it("should report VF4XXX when ...", () => {
    const diag = expectDiagnostic(
        () => typecheck(parseProgram(`let x: Int = "hello"`)),
        "VF4XXX"
    );
    expect(diag.message).toContain("expected something");
    expect(diag.location.line).toBe(1);
});
```

### 7. Regenerate Documentation

After adding codes, regenerate the documentation:

```bash
pnpm run docs:errors
```

Verify the new code appears correctly in `docs/errors/{phase}.md`.

## Template: Complete Error Definition

Copy this template when adding a new code:

```typescript
export const VF____ : DiagnosticDefinition = {
    code: "VF____",
    title: "",
    messageTemplate: "",
    severity: "error",
    phase: "",
    category: "",
    hintTemplate: "",
    explanation: "",
    example: {
        bad: ``,
        good: ``,
        description: "",
    },
    relatedCodes: [],
    seeAlso: [],
};
```

## Quality Checklist

Before committing a new diagnostic code:

- [ ] Code number is unique and in the correct range
- [ ] Title is PascalCase and descriptive
- [ ] Message template is clear and uses proper {placeholders}
- [ ] Explanation describes why the error occurs (not just what)
- [ ] Example shows realistic bad and good code
- [ ] Example description explains what changed
- [ ] Hint provides actionable fix guidance (if applicable)
- [ ] Related codes are linked (if applicable)
- [ ] Tests verify the code is thrown correctly
- [ ] Tests check message content and location
- [ ] Documentation regenerated with `pnpm run docs:errors`
- [ ] `pnpm run docs:errors:check` passes

## Internal vs User-Facing Errors

**Use VFxxxx codes for user-facing errors:**
- Syntax errors in user code
- Type mismatches
- Undefined variables/types
- Invalid patterns
- Anything the user can fix

**Keep as plain `Error` throws:**
- "Unknown X kind" (compiler bug)
- "Not initialized" (DI failure)
- Assertion failures
- Internal invariant violations

Internal errors indicate compiler bugs and should never reach end users in normal operation.
