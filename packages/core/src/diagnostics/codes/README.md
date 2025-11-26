# Adding New Diagnostic Codes

This guide explains how to add new error or warning codes to the Vibefun diagnostic system.

## Code Ranges

Each compiler phase has assigned code ranges. Choose the appropriate range for your new code:

| Phase        | Range     | Errors          | Warnings        | File             |
|--------------|-----------|-----------------|-----------------|------------------|
| Lexer        | VF1xxx    | VF1000-VF1899   | VF1900-VF1999   | `lexer.ts`       |
| Parser       | VF2xxx    | VF2000-VF2899   | VF2900-VF2999   | `parser.ts`      |
| Desugarer    | VF3xxx    | VF3000-VF3899   | VF3900-VF3999   | `desugarer.ts`   |
| Type Checker | VF4xxx    | VF4000-VF4899   | VF4900-VF4999   | `typechecker.ts` |
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

Add your definition to the appropriate phase file (e.g., `typechecker.ts`):

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

Add your code to the registration array at the bottom of the file:

```typescript
const typecheckerCodes: readonly DiagnosticDefinition[] = [
    // ... existing codes ...
    VF4XXX,  // Add your new code
];
```

### 4. Export from Index

The code should be automatically exported through the phase file's exports. Verify it appears in `codes/index.ts` re-exports.

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
npm run docs:errors
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
- [ ] Documentation regenerated with `npm run docs:errors`
- [ ] `npm run docs:errors:check` passes

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
