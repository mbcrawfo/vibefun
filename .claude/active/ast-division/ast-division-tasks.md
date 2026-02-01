# AST Division Tasks

**Last Updated:** 2026-02-01

## Phase 1: Core AST Updates

- [ ] Add `"IntDivide"` to `CoreBinaryOp` in `core-ast.ts`
- [ ] Add `"FloatDivide"` to `CoreBinaryOp` in `core-ast.ts`
- [ ] Keep `"Divide"` for backward compatibility during transition

## Phase 2: Type Checker - Operator Inference

- [ ] Add `"IntDivide"` case to `getBinOpTypes()` returning `(Int, Int) -> Int`
- [ ] Add `"FloatDivide"` case to `getBinOpTypes()` returning `(Float, Float) -> Float`
- [ ] Keep `"Divide"` case unchanged (will be lowered later)

## Phase 3: Division Lowering Pass

- [ ] Create new file `packages/core/src/typechecker/lower-division.ts`
- [ ] Implement `lowerDivisionExpr()` to transform single expression
- [ ] Implement `lowerDivisionModule()` to transform entire module
- [ ] Handle edge case: unknown/polymorphic type (default to FloatDivide)
- [ ] Export from `packages/core/src/typechecker/index.ts`

## Phase 4: Type Checker Integration

- [ ] Modify `typeCheck()` in `typechecker.ts` to call division lowering
- [ ] Ensure lowering runs after all declarations are typechecked
- [ ] Pass expression type map to lowering function

## Phase 5: Constant Folding Updates

- [ ] Add `"IntDivide"` case using `Math.trunc(l / r)`
- [ ] Add `"FloatDivide"` case preserving current float logic
- [ ] **FIX:** Change existing integer `"Divide"` from `Math.floor` to `Math.trunc`
- [ ] Update or remove `"Divide"` case (may still be needed during transition)

## Phase 6: Test Updates

### Constant Folding Tests
- [ ] Update test "should fold integer division" to use `IntDivide`
- [ ] Update test "should not fold division by zero" to use `IntDivide`
- [ ] Update float division tests to use `FloatDivide`
- [ ] Add test: `-7 / 2 = -3` (truncation toward zero)
- [ ] Add test: `7 / -2 = -3` (truncation toward zero)
- [ ] Fix comment "Floor division" -> "Truncation toward zero"

### Type Inference Tests
- [ ] Update test "should infer type for division" to use `IntDivide`
- [ ] Add test for `FloatDivide` type inference
- [ ] Keep or add test for pre-lowered `Divide` if needed

### New Lowering Tests
- [ ] Create `packages/core/src/typechecker/lower-division.test.ts`
- [ ] Test: Int / Int -> IntDivide
- [ ] Test: Float / Float -> FloatDivide
- [ ] Test: Int / Float -> FloatDivide
- [ ] Test: Float / Int -> FloatDivide
- [ ] Test: nested expressions are lowered correctly

## Phase 7: Verification

- [ ] Run `npm run check` - Type checking passes
- [ ] Run `npm run lint` - Linting passes
- [ ] Run `npm test` - All tests pass
- [ ] Run `npm run format` - Code formatted
- [ ] Manual verification: constant folding `-7 / 2 = -3`

## Optional Phase 8: Cleanup

- [ ] Consider removing `"Divide"` from `CoreBinaryOp` if no longer needed
- [ ] Update any remaining code that references `"Divide"` in Core AST context

---

## Progress Summary

| Phase | Status |
|-------|--------|
| Phase 1: Core AST | Not Started |
| Phase 2: Type Inference | Not Started |
| Phase 3: Lowering Pass | Not Started |
| Phase 4: Integration | Not Started |
| Phase 5: Constant Folding | Not Started |
| Phase 6: Tests | Not Started |
| Phase 7: Verification | Not Started |
| Phase 8: Cleanup | Not Started |

**Overall Progress:** 0/8 phases complete
