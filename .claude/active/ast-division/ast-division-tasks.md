# AST Division Tasks

**Last Updated:** 2026-02-01

## Phase 1: Fix Critical Bug (Math.floor → Math.trunc)

This must be done first because it's a correctness bug independent of the new operators.

- [ ] Change `Math.floor` to `Math.trunc` in `constant-folding.ts` line 74
- [ ] Update test comment "Floor division" → "Truncation toward zero"
- [ ] Add test: `-7 / 2 = -3` (truncation toward zero)
- [ ] Add test: `7 / -2 = -3` (truncation toward zero)
- [ ] Add test: `-7 / -2 = 3` (truncation toward zero)
- [ ] Run `npm run verify` to confirm fix

## Phase 2: Core AST Updates

- [ ] Add `"IntDivide"` to `CoreBinaryOp` in `core-ast.ts` (after `"Divide"`)
- [ ] Add `"FloatDivide"` to `CoreBinaryOp` in `core-ast.ts` (after `"IntDivide"`)
- [ ] Keep `"Divide"` for backward compatibility (desugarer output)
- [ ] Run `npm run check` to verify no type errors

## Phase 3: Type Checker - Operator Types

- [ ] Add `"IntDivide"` case to `getBinOpTypes()` returning `(Int, Int) -> Int`
- [ ] Add `"FloatDivide"` case to `getBinOpTypes()` returning `(Float, Float) -> Float`
- [ ] Keep `"Divide"` case unchanged (will be lowered by inferBinOp)
- [ ] Run `npm run check` to verify

## Phase 4: Inline Lowering in Type Inference

- [ ] Modify `inferBinOp()` in `infer-operators.ts`:
  - After computing `finalSubst`, check if `expr.op === "Divide"`
  - Determine operand types using `applySubst(finalSubst, leftResult.type)` etc.
  - If both types are `Int` (Const with name "Int"), mutate `expr.op` to `"IntDivide"`
  - Otherwise (Float or unknown), mutate `expr.op` to `"FloatDivide"`
- [ ] Add helper function `isIntType(type: Type): boolean` if needed
- [ ] Run `npm run check` to verify

## Phase 5: Constant Folding Updates

- [ ] Add `"IntDivide"` case using `Math.trunc(l / r)`
- [ ] Add `"FloatDivide"` case preserving current float logic
- [ ] Keep `"Divide"` case using `Math.trunc` (for any pre-lowering edge cases)
- [ ] Run `npm run check` to verify

## Phase 6: Unit Tests

### Constant Folding Tests (`constant-folding.test.ts`)
- [ ] Add test: `IntDivide` folds `10 / 3 = 3`
- [ ] Add test: `IntDivide` doesn't fold division by zero
- [ ] Add test: `IntDivide` negative truncation: `-7 / 2 = -3`
- [ ] Add test: `IntDivide` negative truncation: `7 / -2 = -3`
- [ ] Add test: `FloatDivide` folds `10.0 / 4.0 = 2.5`
- [ ] Add test: `FloatDivide` doesn't fold division by zero

### Type Inference Tests (`infer-operators.test.ts`)
- [ ] Add test: `IntDivide` infers `(Int, Int) -> Int`
- [ ] Add test: `FloatDivide` infers `(Float, Float) -> Float`
- [ ] Verify existing `Divide` test still passes (gets lowered to IntDivide)

### Integration Test (new file or existing)
- [ ] Add test: full pipeline (parse → desugar → typecheck) verifies `Divide` becomes `IntDivide`
- [ ] Add test: division inside lambda body gets lowered correctly
- [ ] Add test: division inside match case gets lowered correctly

## Phase 7: Verification

- [ ] Run `npm run check` - Type checking passes
- [ ] Run `npm run lint` - Linting passes
- [ ] Run `npm test` - All tests pass
- [ ] Run `npm run format` - Code formatted
- [ ] Manual verification: Check that after typechecking, AST has `IntDivide` not `Divide`

## Phase 8: Documentation & Cleanup (Optional)

- [ ] Update any relevant doc comments in modified files
- [ ] Consider removing `"Divide"` from `CoreBinaryOp` if confident no code paths use it
- [ ] Update codegen-requirements.md if any decisions changed

---

## Progress Summary

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1: Bug Fix | 🔜 Not Started | Fix Math.floor → Math.trunc |
| Phase 2: Core AST | 🔜 Not Started | Add IntDivide/FloatDivide types |
| Phase 3: Type Checker | 🔜 Not Started | Add operator type cases |
| Phase 4: Lowering | 🔜 Not Started | Inline lowering in inferBinOp |
| Phase 5: Constant Folding | 🔜 Not Started | Handle new operators |
| Phase 6: Tests | 🔜 Not Started | Comprehensive test coverage |
| Phase 7: Verification | 🔜 Not Started | Full verification suite |
| Phase 8: Cleanup | 🔜 Not Started | Optional cleanup |

**Overall Progress:** 0/8 phases complete

---

## Implementation Notes

### Inline Lowering Pseudocode

```typescript
// In inferBinOp(), after determining finalSubst and finalResultType:
if (expr.op === "Divide") {
    const leftTypeResolved = applySubst(finalSubst, leftResult.type);
    const rightTypeResolved = applySubst(finalSubst, rightResult.type);

    const isIntDiv =
        leftTypeResolved.type === "Const" && leftTypeResolved.name === "Int" &&
        rightTypeResolved.type === "Const" && rightTypeResolved.name === "Int";

    // Mutate in place - safe since Core AST won't be reused pre-lowering
    (expr as { op: CoreBinaryOp }).op = isIntDiv ? "IntDivide" : "FloatDivide";
}
```

### Test Case for Negative Truncation

```typescript
it("should truncate toward zero for negative integers", () => {
    // -7 / 2 should equal -3 (not -4 which is floor)
    const expr: CoreExpr = {
        kind: "CoreBinOp",
        op: "IntDivide",
        left: { kind: "CoreIntLit", value: -7, loc: testLoc },
        right: { kind: "CoreIntLit", value: 2, loc: testLoc },
        loc: testLoc,
    };

    const result = pass.transform(expr);

    expect(result).toEqual({ kind: "CoreIntLit", value: -3, loc: testLoc });
});
```
