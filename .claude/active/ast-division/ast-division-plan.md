# AST Division Operators Implementation Plan

**Last Updated:** 2026-02-01

## Overview

Add `IntDivide` and `FloatDivide` operators to the Core AST to replace the generic `Divide` operator. This enables proper code generation with distinct JavaScript output for integer vs float division.

## Background

The codegen-requirements document (`.claude/design/codegen-requirements.md`) specifies:
- `IntDivide` emits `Math.trunc(a / b)` - truncates toward zero
- `FloatDivide` emits `a / b` - standard IEEE 754 division

Currently the compiler has a single `"Divide"` operator that doesn't distinguish between integer and floating-point division.

## Architecture

### Pipeline Challenge

The current compilation pipeline is:
```
Source -> Lexer -> Parser -> Desugarer -> TypeChecker -> Optimizer -> CodeGen
```

The desugarer runs BEFORE the typechecker, but we need type information to decide which division operator to emit.

### Solution: Post-TypeChecker Lowering Pass

Add a **type-directed lowering pass** that runs after typechecking:

```
Source -> Lexer -> Parser -> Desugarer -> TypeChecker -> [DivisionLowering] -> Optimizer -> CodeGen
```

This pass examines the inferred types of division operands and rewrites `Divide` to either `IntDivide` or `FloatDivide`.

## Detailed Changes

### 1. Core AST Types (`core-ast.ts`)

```typescript
export type CoreBinaryOp =
    // Arithmetic
    | "Add"
    | "Subtract"
    | "Multiply"
    | "Divide"        // Keep temporarily for desugarer output
    | "IntDivide"     // NEW: Integer division
    | "FloatDivide"   // NEW: Float division
    | "Modulo"
    // ... rest unchanged
```

### 2. Type-Directed Lowering Pass (`lower-division.ts`)

New file that transforms `Divide` nodes based on operand types:

```typescript
export function lowerDivision(module: CoreModule, exprTypes: Map<CoreExpr, Type>): CoreModule {
    // Walk AST, for each CoreBinOp with op="Divide":
    // - If both operands are Int -> replace with IntDivide
    // - If either operand is Float -> replace with FloatDivide
    // - If type is unknown/polymorphic -> default to FloatDivide (safer)
}
```

### 3. Type Checker Integration (`typechecker.ts`)

Modify `typeCheck()` to:
1. Perform type inference as before
2. Build a Map<CoreExpr, Type> during inference
3. Call `lowerDivision()` on the module
4. Return the lowered module

### 4. Operator Type Inference (`infer-operators.ts`)

Update `getBinOpTypes()`:

```typescript
case "Divide":
    // Pre-lowering: polymorphic (accepts Int or Float)
    return { paramType: primitiveTypes.Int, resultType: primitiveTypes.Int };

case "IntDivide":
    return { paramType: primitiveTypes.Int, resultType: primitiveTypes.Int };

case "FloatDivide":
    return { paramType: primitiveTypes.Float, resultType: primitiveTypes.Float };
```

### 5. Constant Folding (`constant-folding.ts`)

Update to handle both operators:

```typescript
case "IntDivide":
    if (r === 0) return expr;
    return { kind: "CoreIntLit", value: Math.trunc(l / r), loc };

case "FloatDivide":
    if (r === 0) return expr;
    const result = l / r;
    if (!Number.isFinite(result)) return expr;
    return { kind: "CoreFloatLit", value: result, loc };
```

**Critical Fix:** Change existing `Math.floor` to `Math.trunc` for correct negative number handling.

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Post-typechecker lowering | Avoids major refactoring of desugarer; leverages existing type info |
| Keep `Divide` in Core AST | Allows gradual migration; desugarer continues to output `Divide` |
| `Math.trunc` not `Math.floor` | Truncate toward zero: `-7/2 = -3`, not `-4` |
| No division-by-zero exception | Follow JavaScript semantics (returns Infinity/NaN) |

## Edge Cases

1. **Negative integers**: `-7 / 2` must equal `-3` (truncate toward zero)
2. **Division by zero**: Returns `Infinity`, `-Infinity`, or `NaN`
3. **Mixed types**: `5 / 2.0` uses `FloatDivide` (Int promoted to Float conceptually)
4. **Constant folding edge cases**: Don't fold if result is non-finite

## Dependencies

- No external dependencies
- Internal dependency: Must run lowering after type inference completes

## Scope Exclusions

- Float arithmetic for Add, Subtract, Multiply (future task)
- Polymorphic numeric type classes (future consideration)
- Code generator implementation (separate task)
