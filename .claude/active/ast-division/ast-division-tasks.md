# AST Division Tasks

**Last Updated:** 2026-02-01 (reviewed)

## Phase 1: Fix Critical Bug (Math.floor → Math.trunc)

This must be done first because it's a correctness bug independent of the new operators.

- [x] Change `Math.floor` to `Math.trunc` in `constant-folding.ts` line 74
- [x] Update test comment in `constant-folding.test.ts` line 70: "Floor division" → "Truncation toward zero"
- [x] Add test: `-7 / 2 = -3` (truncation toward zero, not -4 like floor)
- [x] Add test: `7 / -2 = -3` (truncation toward zero)
- [x] Add test: `-7 / -2 = 3` (truncation toward zero)
- [x] Run `npm run verify` to confirm fix

**Verification:** The key test is `-7 / 2`. With `Math.floor`, this would be `-4`. With `Math.trunc`, it's `-3`. The existing test `10 / 3 = 3` passes with both because both operands are positive.

## Phase 2: Core AST Updates

- [x] Add `"IntDivide"` to `CoreBinaryOp` in `core-ast.ts` (after `"Divide"`)
- [x] Add `"FloatDivide"` to `CoreBinaryOp` in `core-ast.ts` (after `"IntDivide"`)
- [x] Keep `"Divide"` for backward compatibility (desugarer output)
- [x] Run `npm run check` to verify no type errors

## Phase 3: Type Checker - Operator Types

- [x] Add `"IntDivide"` case to `getBinOpTypes()` returning `(Int, Int) -> Int`
- [x] Add `"FloatDivide"` case to `getBinOpTypes()` returning `(Float, Float) -> Float`
- [x] Keep `"Divide"` case unchanged (will be lowered by inferBinOp)
- [x] Run `npm run check` to verify

## Phase 4: Inline Lowering in Type Inference

- [x] Modify `inferBinOp()` in `infer-operators.ts`:
  - After computing `finalSubst` (around line 88), check if `expr.op === "Divide"`
  - Determine operand types using `applySubst(finalSubst, leftResult.type)` and `applySubst(finalSubst, rightResult.type)`
  - If both types are `Int` (type: "Const", name: "Int"), mutate `expr.op` to `"IntDivide"`
  - Otherwise (Float or unresolved type variable), mutate `expr.op` to `"FloatDivide"`
- [x] Add helper function `isIntType(type: Type): boolean` if needed for cleaner code
- [x] Run `npm run check` to verify

**Implementation detail:** The mutation must happen before the `return` statement. Use `(expr as { op: CoreBinaryOp }).op = "IntDivide"` to satisfy TypeScript's readonly concerns if needed.

## Phase 5: Constant Folding Updates

- [ ] Add `"IntDivide"` case in integer arithmetic section (around line 75) using `Math.trunc(l / r)`
- [ ] Add `"FloatDivide"` case in float arithmetic section (around line 120) preserving current float logic
- [ ] Keep `"Divide"` case using `Math.trunc` (for backwards compatibility with unit tests that construct AST directly)
- [ ] Run `npm run check` to verify

**Note:** After type checking, the optimizer will only see `IntDivide` and `FloatDivide`. The `Divide` case is kept for tests that construct Core AST directly without going through the full pipeline.

## Phase 6: Unit Tests

### Constant Folding Tests (`constant-folding.test.ts`)
- [ ] Add test: `IntDivide` folds `10 / 3 = 3`
- [ ] Add test: `IntDivide` doesn't fold division by zero
- [ ] Add test: `IntDivide` negative truncation: `-7 / 2 = -3`
- [ ] Add test: `IntDivide` negative truncation: `7 / -2 = -3`
- [ ] Add test: `IntDivide` negative truncation: `-7 / -2 = 3`
- [ ] Add test: `FloatDivide` folds `10.0 / 4.0 = 2.5`
- [ ] Add test: `FloatDivide` doesn't fold division by zero
- [ ] Add test: `FloatDivide` negative: `-7.0 / 2.0 = -3.5` (no truncation for floats)

### Type Inference Tests (`infer-operators.test.ts`)
- [ ] Add test: `IntDivide` infers `(Int, Int) -> Int`
- [ ] Add test: `FloatDivide` infers `(Float, Float) -> Float`
- [ ] Verify existing `Divide` test still passes (gets lowered to IntDivide)

### Inline Lowering Verification Tests (`infer-operators.test.ts` or new file)
- [ ] Add test: verify `Divide` operator is mutated to `IntDivide` after `inferBinOp()` for Int operands
- [ ] Add test: verify `Divide` operator is mutated to `FloatDivide` after `inferBinOp()` for Float operands

### Integration Test (new file: `typechecker/division-lowering.test.ts`)
- [ ] Add test: full pipeline (parse → desugar → typecheck) verifies `Divide` becomes `IntDivide`
  - Create source: `let x = 10 / 3`
  - Parse, desugar, typecheck
  - Inspect `typedModule.module.declarations[0]` to verify the binop has `op: "IntDivide"`
- [ ] Add test: division inside lambda body gets lowered correctly
  - Source: `let f = (x) => x / 2`
  - Verify the division in the lambda body is `IntDivide`
- [ ] Add test: division inside match case gets lowered correctly
  - Source: `let f = (x) => match x { | n => n / 2 }`
  - Verify the division in the match body is `IntDivide`

## Phase 7: Verification

- [ ] Run `npm run check` - Type checking passes (no exhaustiveness warnings)
- [ ] Run `npm run lint` - Linting passes
- [ ] Run `npm test` - All tests pass
- [ ] Run `npm run format` - Code formatted
- [ ] Verify all switch statements are exhaustive (TypeScript will error if not)
- [ ] Manual verification: Run the integration tests to confirm AST lowering works end-to-end

## Phase 8: Documentation & Cleanup

### Required Documentation Updates
- [ ] Update language spec (`docs/spec/`) with IntDivide/FloatDivide semantics and truncation-toward-zero behavior
- [ ] Update `.claude/VIBEFUN_AI_CODING_GUIDE.md` with the new division operator details
- [ ] Update codegen-requirements.md if any decisions changed during implementation

### Optional Cleanup
- [ ] Update any relevant doc comments in modified files
- [ ] Consider removing `"Divide"` from `CoreBinaryOp` if confident no code paths use it

---

## Progress Summary

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1: Bug Fix | ✅ Done | Fix Math.floor → Math.trunc |
| Phase 2: Core AST | ✅ Done | Add IntDivide/FloatDivide types |
| Phase 3: Type Checker | ✅ Done | Add operator type cases |
| Phase 4: Lowering | ✅ Done | Inline lowering in inferBinOp |
| Phase 5: Constant Folding | 🔜 Not Started | Handle new operators |
| Phase 6: Tests | 🔜 Not Started | Comprehensive test coverage |
| Phase 7: Verification | 🔜 Not Started | Full verification suite |
| Phase 8: Documentation | 🔜 Not Started | Spec & guide updates |

**Overall Progress:** 4/8 phases complete

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

## Maintenance Notes

**Line Number References:** This document references specific line numbers (e.g., line 74, line 88, line 120) for precision during implementation. Re-verify all line numbers at implementation time as the codebase may have shifted.
