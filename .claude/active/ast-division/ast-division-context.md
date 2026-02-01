# AST Division Context

**Last Updated:** 2026-02-01

## Key Files

### Core AST Definition
- **Path:** `packages/core/src/types/core-ast.ts`
- **Lines:** 244-264 (`CoreBinaryOp` type union)
- **Current state:** Has single `"Divide"` operator

### Desugarer Binary Ops
- **Path:** `packages/core/src/desugarer/desugarBinOp.ts`
- **Lines:** 39-46 (pass-through for arithmetic operators)
- **Note:** Passes `"Divide"` unchanged to Core AST; no type info available here

### Type Checker - Operator Inference
- **Path:** `packages/core/src/typechecker/infer/infer-operators.ts`
- **Lines:** 99-114 (`getBinOpTypes()` arithmetic handling)
- **Current state:** `"Divide"` returns `(Int, Int) -> Int`

### Type Checker - Main Entry
- **Path:** `packages/core/src/typechecker/typechecker.ts`
- **Function:** `typeCheck()` (line 58)
- **Integration point:** Division lowering should run after line 71 (after all declarations are typechecked)

### Constant Folding Optimizer
- **Path:** `packages/core/src/optimizer/passes/constant-folding.ts`
- **Lines:** 71-74 (integer division with `Math.floor` - WRONG)
- **Lines:** 115-120 (float division)
- **Bug:** Uses `Math.floor` instead of `Math.trunc`

### Surface AST (unchanged)
- **Path:** `packages/core/src/types/ast.ts`
- **Lines:** 116-141 (`BinaryOp` type - keeps `"Divide"`)

## Test Files

| File | What it tests |
|------|---------------|
| `packages/core/src/optimizer/passes/constant-folding.test.ts` | Division folding (uses `"Divide"`) |
| `packages/core/src/typechecker/infer-operators.test.ts` | Division type inference (uses `"Divide"`) |
| `packages/core/src/desugarer/desugarBinOp.test.ts` | Minimal tests, needs expansion |
| `packages/core/src/parser/expression-operators.test.ts` | Parser produces `"Divide"` (unchanged) |

## Design Document Reference

**Source of truth:** `.claude/design/codegen-requirements.md`
- Section 5.11: Binary Operators (lines 461-520)
- Section 17.1: Prerequisite Changes (lines 1364-1393)
- Section 19.1: Math.trunc vs Math.floor (lines 1517-1527)

## Key Decisions Made

1. **Architecture:** Post-typechecker lowering pass (not modifying desugarer)
2. **Truncation:** `Math.trunc()` (toward zero), not `Math.floor()` (toward -infinity)
3. **Scope:** Division only; Float arithmetic for other ops is separate task
4. **Surface AST:** Unchanged; keeps single `"Divide"`

## Type System Notes

Current type checking for arithmetic:
- All arithmetic ops (Add, Subtract, Multiply, Divide, Modulo) require `Int` operands
- No Float arithmetic support yet (TODO in code)
- Equality ops are polymorphic (any type T)
- Comparison ops require `Int` only

For this change:
- `Divide` stays as `(Int, Int) -> Int` until lowered
- `IntDivide` is `(Int, Int) -> Int`
- `FloatDivide` is `(Float, Float) -> Float`

## Grep Results for "Divide"

```
packages/core/src/typechecker/infer/infer-operators.ts:106:        case "Divide":
packages/core/src/typechecker/infer-operators.test.ts:83:        const expr: CoreBinOp = { kind: "CoreBinOp", op: "Divide", ...
packages/core/src/types/core-ast.ts:249:    | "Divide"
packages/core/src/parser/parse-expression-operators.ts:421:        ... ? "Divide" : "Modulo";
packages/core/src/parser/expression-operators.test.ts:50:                    op: "Divide",
packages/core/src/types/ast.ts:121:    | "Divide"
packages/core/src/optimizer/passes/constant-folding.ts:71:                case "Divide":
packages/core/src/optimizer/passes/constant-folding.ts:115:                case "Divide": {
packages/core/src/optimizer/passes/constant-folding.test.ts:62:                op: "Divide",
```
