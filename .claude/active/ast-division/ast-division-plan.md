# AST Division Operators Implementation Plan

**Last Updated:** 2026-02-01 (reviewed)

## Overview

Add `IntDivide` and `FloatDivide` operators to the Core AST to replace the generic `Divide` operator. This enables proper code generation with distinct JavaScript output for integer vs float division.

## Background

The codegen-requirements document (`.claude/design/codegen-requirements.md`) specifies:
- `IntDivide` emits `Math.trunc(a / b)` - truncates toward zero
- `FloatDivide` emits `a / b` - standard IEEE 754 division

Currently the compiler has a single `"Divide"` operator that doesn't distinguish between integer and floating-point division.

**Critical Bug:** The current constant folding uses `Math.floor` for integer division, which is incorrect for negative numbers. `-7 / 2` should equal `-3` (truncation toward zero), not `-4` (floor). This must be fixed as part of this change.

## Architecture

### Pipeline Challenge

The current compilation pipeline is:
```
Source -> Lexer -> Parser -> Desugarer -> TypeChecker -> Optimizer -> CodeGen
```

The desugarer runs BEFORE the typechecker, but we need type information to decide which division operator to emit.

### Solution: Inline Lowering During Type Inference

**Chosen approach:** Perform division lowering *inline* during type inference rather than as a separate pass.

**Rationale:**
- The current type checker does NOT maintain a `Map<CoreExpr, Type>` for all sub-expressions
- Adding such a map would require significant changes to the entire inference engine
- During inference of a `CoreBinOp` with `op="Divide"`, we already know the operand types
- We can mutate/replace the node in place (or return a modified version)

**Alternative considered (rejected):** A separate post-typechecker lowering pass would require:
1. Building an expression-to-type map during inference (major refactor)
2. A full AST traversal after type checking
3. Updating `TypedModule` interface to carry the map

The inline approach is simpler and avoids these complications.

### Updated Pipeline

```
Source -> Lexer -> Parser -> Desugarer -> TypeChecker (with inline lowering) -> Optimizer -> CodeGen
```

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

### 2. Inline Lowering in Type Inference (`infer-operators.ts`)

Modify `inferBinOp()` to perform division lowering inline:

```typescript
export function inferBinOp(ctx: InferenceContext, expr: Extract<CoreExpr, { kind: "CoreBinOp" }>): InferResult {
    // ... existing inference logic ...

    // After determining operand types, if op is "Divide":
    if (expr.op === "Divide") {
        // Determine which division operator based on inferred types
        const leftTypeResolved = applySubst(finalSubst, leftResult.type);
        const rightTypeResolved = applySubst(finalSubst, rightResult.type);

        // Check if both operands are Int
        const isIntDivision =
            leftTypeResolved.type === "Const" && leftTypeResolved.name === "Int" &&
            rightTypeResolved.type === "Const" && rightTypeResolved.name === "Int";

        // Mutate or return modified expression with correct operator
        const loweredOp = isIntDivision ? "IntDivide" : "FloatDivide";
        // (Implementation will modify expr.op or return a new node)
    }

    return { type: finalResultType, subst: finalSubst };
}
```

**Note:** This approach requires either:
- Mutating the `expr.op` field in place (simpler but mutates input)
- Returning additional information about the lowered expression (cleaner but requires interface changes)

The chosen approach will be mutation in place, since the Core AST is already constructed and will be used for later passes.

**Important Implementation Note:** Mutation is safe here because:
1. `TypedModule.module` returns the same `CoreModule` reference that was passed in
2. The lowered operators will be visible in the module after `typeCheck()` returns
3. This can be verified in tests by inspecting `typedModule.module.declarations[0]` to see that `Divide` has been replaced with `IntDivide`

### 3. Type Checker Integration (`typechecker.ts`)

No changes needed! The lowering happens automatically during `inferExpr()` calls.

### 4. Operator Type Inference (`infer-operators.ts`)

Update `getBinOpTypes()`:

```typescript
case "Divide":
    // Pre-lowering: accepts Int (will be lowered to IntDivide or FloatDivide)
    // Currently only Int arithmetic is supported
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

case "Divide":
    // Legacy case - should not appear after type checking
    // Keep for backwards compatibility during transition
    if (r === 0) return expr;
    return { kind: "CoreIntLit", value: Math.trunc(l / r), loc };
```

**Critical Fix:** Change existing `Math.floor` to `Math.trunc` for correct negative number handling.

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Inline lowering during inference | Avoids building expression-type map; simpler than separate pass |
| Mutate `expr.op` in place | Core AST is already constructed; mutation is safe at this point |
| Keep `Divide` in Core AST | Allows gradual migration; desugarer continues to output `Divide` |
| `Math.trunc` not `Math.floor` | Truncate toward zero: `-7/2 = -3`, not `-4` |
| No division-by-zero exception | Follow JavaScript semantics (returns Infinity/NaN) |

## Edge Cases

1. **Negative integers**: `-7 / 2` must equal `-3` (truncate toward zero)
2. **Division by zero**: Returns `Infinity`, `-Infinity`, or `NaN` (not folded at compile time)
3. **Mixed types**: Currently only Int is supported for division. When Float arithmetic is added, `5 / 2.0` will use `FloatDivide`
4. **Constant folding edge cases**: Don't fold if result is non-finite
5. **Polymorphic division**: If operand type cannot be resolved to Int or Float (e.g., type variable), default to `FloatDivide` as the safer option
6. **Division in different contexts**: Lowering must work for division in lambdas, match bodies, let bindings, etc. (handled automatically by recursive inference)
7. **Negative divisor**: `7 / -2` must equal `-3` (truncate toward zero)
8. **Both negative**: `-7 / -2` must equal `3` (truncate toward zero)

## Dependencies

- No external dependencies
- No internal ordering dependencies (lowering is inline with inference)

**Pipeline ordering guarantee:** The optimizer runs AFTER type checking, so by the time constant folding occurs, all `Divide` operators will have been lowered to `IntDivide` or `FloatDivide`. The optimizer will never see unlowered `Divide` operators (except in legacy test cases that construct Core AST directly).

## Scope Exclusions

- Float arithmetic for Add, Subtract, Multiply (future task)
- Polymorphic numeric type classes (future consideration)
- Code generator implementation (separate task)
- Modulo operator differentiation (could be added similarly if needed, but current semantics work for Int)

## Open Questions (Resolved)

1. **Q: Should we use a separate lowering pass or inline during inference?**
   **A: Inline during inference.** Building an expression-type map for a separate pass would require significant refactoring.

2. **Q: Should we mutate the AST in place or return modified nodes?**
   **A: Mutate in place.** The Core AST is constructed before type checking and won't be reused in its pre-lowered form.

3. **Q: What about Modulo?**
   **A: Out of scope.** Modulo currently only works on Int, and JS `%` operator works correctly for integers. If Float modulo is added later, we can add `IntModulo`/`FloatModulo` at that time.
