# AST Division Context

**Last Updated:** 2026-02-01

## Key Files

### Core AST Definition
- **Path:** `packages/core/src/types/core-ast.ts`
- **Lines:** 244-264 (`CoreBinaryOp` type union)
- **Current state:** Has single `"Divide"` operator
- **Change needed:** Add `"IntDivide"` and `"FloatDivide"` to union

### Type Checker - Operator Inference (PRIMARY CHANGE FILE)
- **Path:** `packages/core/src/typechecker/infer/infer-operators.ts`
- **Function:** `inferBinOp()` (line 34-91)
- **Function:** `getBinOpTypes()` (line 99-158)
- **Current state:** `"Divide"` returns `(Int, Int) -> Int`
- **Change needed:**
  1. Add cases for `IntDivide` and `FloatDivide` in `getBinOpTypes()`
  2. Add inline lowering logic in `inferBinOp()` to replace `Divide` with appropriate operator

### Constant Folding Optimizer
- **Path:** `packages/core/src/optimizer/passes/constant-folding.ts`
- **Lines:** 71-74 (integer division with `Math.floor` - **BUG**)
- **Lines:** 115-120 (float division)
- **Critical Bug:** Uses `Math.floor` instead of `Math.trunc`
- **Change needed:**
  1. Fix `Math.floor` → `Math.trunc` for existing `Divide` case
  2. Add `IntDivide` case using `Math.trunc`
  3. Add `FloatDivide` case using standard division

### Type Checker - Main Entry (NO CHANGES NEEDED)
- **Path:** `packages/core/src/typechecker/typechecker.ts`
- **Function:** `typeCheck()` (line 58)
- **Note:** No changes needed - lowering happens inline during inference

### Desugarer Binary Ops (NO CHANGES NEEDED)
- **Path:** `packages/core/src/desugarer/desugarBinOp.ts`
- **Note:** Continues to pass `"Divide"` unchanged; lowering happens in type checker

### Surface AST (NO CHANGES NEEDED)
- **Path:** `packages/core/src/types/ast.ts`
- **Lines:** 116-141 (`BinaryOp` type - keeps `"Divide"`)

## Test Files

| File | What it tests | Changes Needed |
|------|---------------|----------------|
| `packages/core/src/optimizer/passes/constant-folding.test.ts` | Division folding | Add `IntDivide`/`FloatDivide` tests, add negative number truncation tests |
| `packages/core/src/typechecker/infer-operators.test.ts` | Division type inference | Add `IntDivide`/`FloatDivide` tests |
| `packages/core/src/desugarer/desugarBinOp.test.ts` | Desugarer (unchanged) | No changes |
| `packages/core/src/parser/expression-operators.test.ts` | Parser (unchanged) | No changes |

## Design Document Reference

**Source of truth:** `.claude/design/codegen-requirements.md`
- Section 5.11: Binary Operators (lines 461-520)
- Section 17.1: Prerequisite Changes (lines 1364-1393)
- Section 19.1: Math.trunc vs Math.floor (lines 1517-1527)

## Key Decisions Made

1. **Architecture:** Inline lowering during type inference (not separate pass)
2. **Truncation:** `Math.trunc()` (toward zero), not `Math.floor()` (toward -infinity)
3. **Scope:** Division only; Float arithmetic for other ops is separate task
4. **Surface AST:** Unchanged; keeps single `"Divide"`
5. **Mutation:** Mutate `expr.op` in place during inference (safe since Core AST won't be reused pre-lowering)

## Type System Notes

Current type checking for arithmetic:
- All arithmetic ops (Add, Subtract, Multiply, Divide, Modulo) require `Int` operands
- No Float arithmetic support yet (TODO in code at line 109 of infer-operators.ts)
- Equality ops are polymorphic (any type T)
- Comparison ops require `Int` only

For this change:
- `Divide` stays as `(Int, Int) -> Int` in desugarer output
- `Divide` gets lowered to `IntDivide` during type inference (since all division is currently Int-based)
- `IntDivide` is `(Int, Int) -> Int`
- `FloatDivide` is `(Float, Float) -> Float` (for future use when Float arithmetic is added)

## Key Implementation Detail: InferenceContext

The type checker uses `InferenceContext` (infer-context.ts:20-27):
```typescript
export type InferenceContext = {
    env: TypeEnv;           // Type environment
    subst: Substitution;    // Current substitution
    level: number;          // Type variable scoping level
};
```

**Important:** There is NO expression-to-type map. Types are inferred on-the-fly and threaded through via substitution. This is why inline lowering is the right approach.

## Files That Reference "Divide"

| File | Line | Context |
|------|------|---------|
| `types/core-ast.ts` | 249 | `CoreBinaryOp` type definition |
| `types/ast.ts` | 121 | Surface `BinaryOp` type (unchanged) |
| `typechecker/infer/infer-operators.ts` | 106 | `getBinOpTypes()` case |
| `optimizer/passes/constant-folding.ts` | 71, 115 | Integer and float folding cases |
| `parser/parse-expression-operators.ts` | 421 | Parser produces `"Divide"` |
| Test files | various | Test cases using `"Divide"` |
