# Parser Updates Context

**Last Updated**: 2025-11-09

## Key Files

### Parser Files
- `packages/core/src/parser/parser.ts` (2290 lines) - Main parser implementation
- `packages/core/src/types/ast.ts` - Surface AST type definitions
- `packages/core/src/types/core-ast.ts` - Core AST after desugaring
- `packages/core/src/types/token.ts` - Token types from lexer

### Requirements
- `.claude/parser-requirements.md` (1527 lines) - Complete parser specification (v3.0, approved)

### Desugarer Files
- `packages/core/src/desugarer/desugarer.ts` - Main desugarer
- `packages/core/src/desugarer/desugarBinOp.ts` - Binary operator desugaring
- `packages/core/src/desugarer/*.ts` - 16 desugarer files total

### Type Checker Files
- `packages/core/src/typechecker/infer.ts` - Type inference engine
- `packages/core/src/typechecker/patterns.ts` - Pattern type checking
- `packages/core/src/typechecker/*.ts` - Supporting type checker files

### Optimizer Files
- `packages/core/src/optimizer/optimizer.ts` - Main optimizer
- `packages/core/src/optimizer/passes/*.ts` - 8 optimization passes
- `packages/core/src/utils/ast-*.ts` - AST utilities used by optimizer

### Test Files
- `packages/core/src/parser/*.test.ts` - 12 parser test files (~7000+ lines)
- `packages/core/src/desugarer/*.test.ts` - Desugarer tests
- `packages/core/src/typechecker/*.test.ts` - Type checker tests

---

## Key Decisions

### 1. ListCons → BinOp with Cons
**Decision**: Switch from dedicated `ListCons` node to `BinOp` with `op: "Cons"`
**Rationale**: Requirements document (line 540) specifies using BinOp
**Impact**:
- Parser: Change parseCons() to create BinOp instead of ListCons
- Desugarer: Already handles Cons in desugarBinOp, remove ListCons case
- Type checker: No changes (already handles via BinOp)
- Tests: Update 6 references in lists.test.ts

### 2. If Expression Optional Else
**Decision**: Parser inserts Unit literal when else branch is missing
**Rationale**:
- Current AST requires else_ field (not optional)
- Parser-level insertion is simpler than desugarer/type-checker changes
- Matches user expectation: `if cond then expr` implicitly returns Unit if false
**Impact**:
- Parser: Make else optional in parsing, insert `{ kind: "UnitLit" }` if missing
- Desugarer: No changes needed (already handles Unit)
- Type checker: No changes needed

### 3. Precedence Chain Order
**Decision**: RefAssign (level 1) comes BEFORE TypeAnnotation (level 2)
**Rationale**: Lower precedence number = lower binding strength = earlier in chain
**Correction**: Initial plan had this backwards, review caught the error
**Impact**:
- Parser: Complete restructure of precedence method chain
- Critical for correct parsing of complex expressions

### 4. ASI Integration Strategy
**Decision**: Implement ASI as helper methods called at specific integration points
**Rationale**:
- Location-based (line number comparison)
- Context-aware (knows about expression continuations)
- Applied where semicolons are expected or optional
**Integration Points**:
- After each declaration in parseModule()
- Between expressions in parseBlockExpr()
- Not in match cases (use pipe separators)

### 5. While Loop Representation
**Decision**: Add While expression node, desugar to recursive let binding
**Rationale**:
- Surface syntax is clearer as While
- Desugarer converts to let rec for type checking/optimization
- Type checker sees recursive function, not special While construct
**Desugaring**:
```
while cond { body }
→
let rec loop = () => if cond then { body; loop() } else ()
loop()
```

### 6. Tuple Type Representation
**Decision**: Add Tuple as first-class type in type system
**Rationale**:
- Tuples are common in functional languages
- Need tuple types for pattern matching exhaustiveness
- Type checker needs native tuple support for inference
**Impact**:
- Type system: Add Tuple type variant
- Type checker: Add inferTuple() and checkTuplePattern()
- Exhaustiveness checking: Extend matrix algorithm for tuples

---

## Analysis Findings

### Issues Identified (19 total)

**Critical (8):**
1. While loops missing - No implementation at all
2. Tuple expressions missing - No implementation at all
3. Tuple patterns missing - No implementation at all
4. Match leading pipe optional - Should be required for ALL cases
5. Cons precedence wrong - Currently level 3, should be level 11
6. Composition precedence wrong - Currently level 10, should be level 4
7. ASI not implemented - No automatic semicolon insertion
8. If without else not supported - Currently requires else branch

**Major (6):**
9. Record shorthand missing - `{ name }` not supported
10. Operator sections not rejected - Should error with helpful message
11. Error recovery disabled - synchronize() exists but unused
12. Multi-error collection missing - Stops at first error
13. Minus disambiguation missing - Always treats as unary
14. Lambda precedence issues - May consume too much in match cases

**Minor (5):**
15. Precedence comments wrong - Incorrect level numbers throughout
16. Spec references outdated - Point to old vibefun-spec.md
17. Test coverage gaps - Missing tests for many features
18. Trailing comma verification - Need to ensure all contexts support
19. Empty match validation - Should require at least one case

---

## Compiler Pipeline Impact

### Desugarer Impact (Medium)
**Changes Required:**
- Remove ListCons case (1 location)
- Add Tuple, While, TuplePattern cases (3 new cases)
- Handle optional If else branch (1 modification)
- Update 6 test references to ListCons

**Risk Level**: Low - Mostly straightforward pass-through desugaring

### Type Checker Impact (High)
**Changes Required:**
- Add inferTuple() - type inference for tuples
- Add inferWhile() - type checking for while loops (simple: condition must be Bool, result is Unit)
- Add checkTuplePattern() - pattern type checking for tuples
- Update exhaustiveness checking for tuple patterns

**Risk Level**: Medium - Tuple exhaustiveness checking is complex

### Optimizer Impact (Medium-High)
**Changes Required:**
- Add CoreTuple, CoreWhile to all pass switches (8 passes)
- Add CoreTuplePattern to pattern handling
- Update ast-transform.ts, ast-analysis.ts, substitution.ts
- Be conservative with While (has side effects)

**Risk Level**: Low-Medium - Changes are mechanical, TypeScript will catch missing cases

---

## Testing Strategy

### Test-First Approach
**Each phase includes testing:**
- Phase 1: Type checking (`npm run check`)
- Phase 2: Precedence tests
- Phase 3-6: Feature-specific tests
- Phase 7: Minus disambiguation tests
- Phase 8: Error handling tests
- Phase 10: Full pipeline tests
- Phase 11: Integration tests

### New Test Files Needed
- `while-loops.test.ts` - ~100-200 lines
- `tuples.test.ts` - ~200-300 lines
- `asi.test.ts` - ~100-200 lines
- `operator-sections.test.ts` - ~50-100 lines

### Existing Files to Update
- `expressions.test.ts` - Add record shorthand, if-without-else
- `parser-errors.test.ts` - Add all new error messages
- `patterns.test.ts` - Add tuple patterns
- `declarations.test.ts` - Add ASI tests
- `parser-integration.test.ts` - Add precedence tests
- `lists.test.ts` (desugarer) - Update 6 ListCons references

---

## Risk Assessment

### High Risk Items
1. **ASI Implementation** - Complex logic, many edge cases, easy to break multi-line expressions
2. **Precedence Chain Restructure** - One mistake breaks expression parsing
3. **Tuple Exhaustiveness Checking** - Complex algorithm extension

### Medium Risk Items
4. **While Loop Desugaring** - Incorrect desugaring could create infinite loops
5. **Pipeline Integration** - Changes must propagate correctly through all stages
6. **Test Coverage** - Missing tests could hide bugs

### Low Risk Items
7. **ListCons Removal** - Well-defined change with clear migration path
8. **If Optional Else** - Simple change with clear semantics
9. **Documentation Updates** - No code risk

---

## Current State Summary

### What Works
- Basic expression parsing (literals, variables, operators)
- Function calls and lambdas
- If/match/unsafe expressions
- Let/type/external/import/export declarations
- Pattern matching (most patterns)
- Record and list literals
- Type expression parsing

### What's Broken/Missing
- No While loops
- No Tuple expressions or patterns
- Match requires leading pipe for first case only (should be all cases)
- Precedence chain has wrong order
- No ASI
- If requires else (should be optional)
- Record shorthand not supported
- Operator sections not rejected
- Error recovery not active
- Minus always unary (no context checking)

### What Needs Verification
- Trailing comma support in all contexts
- Type annotation in tricky contexts
- Lambda bodies in match cases
- Multi-line expression handling

---

## References

- [Parser Requirements](./.../../parser-requirements.md) - Authoritative specification
- [Language Spec](./../../docs/spec/) - Complete language specification
- [CLAUDE.md](./../../CLAUDE.md) - Project overview and directives
- [CODING_STANDARDS.md](./../CODING_STANDARDS.md) - Code style guidelines
