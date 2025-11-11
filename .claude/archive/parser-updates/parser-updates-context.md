# Parser Updates Context

**Last Updated**: 2025-11-09 (Plan v2.2 - Reviewed and Approved)

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
**Decision**: Lambda (level 0) is entry point, calling chain proceeds from low to high precedence
**Correct Understanding**: Lower precedence number = weaker binding = parsed FIRST (top of call chain)
**Precedence Chain**: parseLambda(0) → parseRefAssign(1) → parseTypeAnnotation(2) → parsePipe(3) → parseComposition(4) → parseLogicalOr(5) → parseLogicalAnd(6) → parseEquality(9) → parseComparison(10) → parseCons(11) → parseConcat(12) → parseAdditive(13) → parseMultiplicative(14) → parseUnary(15) → parseCall(16) → parsePrimary
**Impact**:
- Parser: Complete restructure of precedence method chain required
- Critical for correct parsing of complex expressions
- Each method calls the NEXT HIGHER precedence level

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

### Issues Identified (20 total - including lambda)

**Critical (9):**
1. Lambda precedence missing - Lambda (level 0) not in precedence chain
2. While loops missing - No implementation at all
3. Tuple expressions missing - No implementation at all
4. Tuple patterns missing - No implementation at all
5. Match leading pipe optional - Should be required for ALL cases (with corrected loop structure)
6. Cons precedence wrong - Currently level 3, should be level 11
7. Composition precedence wrong - Currently level 10, should be level 4
8. ASI not implemented - No automatic semicolon insertion
9. If without else not supported - Currently requires else branch

**Major (7):**
10. Record shorthand missing - `{ name }` not supported in BOTH construction and update spreads
11. Operator sections not rejected - Should error with helpful message
12. Error recovery disabled - synchronize() exists but unused
13. Multi-error collection missing - Stops at first error
14. Minus disambiguation missing - Always treats as unary
15. Match loop structure bug - Expects PIPE after RBRACE
16. Tuple arity validation - Location not specified in original plan

**Minor (4):**
17. Precedence comments wrong - Incorrect level numbers throughout
18. Spec references outdated - Point to old vibefun-spec.md
19. Test coverage gaps - Missing tests for many features
20. While desugaring details - Original plan missing implementation specifics

---

## Plan Evolution

### v2.0 → v2.1 Corrections
1. **Added Phase 0: Lambda Precedence** - Lambda (level 0) as entry point
2. **Fixed Phase 2: Precedence Chain** - Corrected understanding of precedence traversal
3. **Enhanced Phase 3.3: Record Shorthand** - TWO locations (construction + update)
4. **Fixed Phase 4.1: Match Loop** - Check RBRACE before PIPE
5. **Enhanced Phase 5.2: ASI Integration** - Explicit integration points
6. **Added Phase 10.1: While Desugaring** - Complete implementation pseudocode

### v2.1 → v2.2 Review Enhancements

**Comprehensive Review Completed (2025-11-09)**
- 📊 **Review Score**: 90/100 (Excellent - ready to implement)
- ✅ **Precedence Chain**: Verified 100% correct against spec
- ✅ **Feature Coverage**: All 19 issues properly identified
- ⚠️ **Risk Assessment**: Medium-High (precedence restructuring)

**User Clarifications Incorporated:**

1. **Phase Ordering** (Critical)
   - **Decision**: Phase 0 BEFORE Phase 2 (lower risk approach)
   - **Rationale**: Add parseLambda() first (isolated, low risk), then restructure chain (high risk)
   - **Impact**: Can test lambda parsing independently before chain integration

2. **ASI + Lambda Interaction** (Critical)
   - **Decision**: Allow newlines before `=>` arrow
   - **Implementation**: Add lookahead check: `if (peek().type === "FAT_ARROW") return false`
   - **Test cases**: `(x, y)\n=> body`, `x\n=> body`, `()\n=> body`

3. **ASI in Record Literals** (Critical)
   - **Decision**: Disable ASI entirely inside record literals `{ }`
   - **Implementation**: Add `inRecordContext` boolean flag, check in `shouldInsertSemicolon()`
   - **Rationale**: Prevents ambiguity with field shorthand like `{ name }`

**Additional Clarifications Added:**

4. **Tuple Arity Validation Location**
   - Added explicit pseudocode showing WHERE check happens (in `parseLambdaOrParen()`)
   - After ruling out lambda with `=>` lookahead, before creating tuple node

5. **Operator Section Variations**
   - Clarified ALL forms rejected: `(+)`, `( + )`, `(+ 1)`, `(1 +)`
   - Check after LPAREN catches bare operators and partial applications

6. **Type Checker Tuple Details**
   - Added: Arity must match exactly between pattern and type
   - Added: Exhaustiveness checking for tuple patterns
   - Example: `(x, _)` matches only 2-tuples, not 3-tuples

7. **Code Generator Tuple Strategy**
   - Tuples compile to JS arrays: `(1, 2)` → `[1, 2]`
   - Destructuring: `let (a, b) = tuple` → `let [a, b] = tuple`

8. **Missing Test Files Identified**
   - `lambda-precedence.test.ts` - Lambda at level 0, right-associativity
   - `record-shorthand.test.ts` - Both construction and update
   - `minus-disambiguation.test.ts` - Context-aware minus handling

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

### New Test Files Needed (7 total)
- `lambda-precedence.test.ts` - ~100-150 lines (NEW from v2.2 review)
- `while-loops.test.ts` - ~100-200 lines
- `tuples.test.ts` - ~200-300 lines (include arity validation)
- `asi.test.ts` - ~100-200 lines (include lambda + ASI, record context)
- `operator-sections.test.ts` - ~50-100 lines (all forms: `(+)`, `(+ 1)`, etc.)
- `record-shorthand.test.ts` - ~100-150 lines (or add to expressions.test.ts) (NEW from v2.2 review)
- `minus-disambiguation.test.ts` - ~50-100 lines (or add to expressions.test.ts) (NEW from v2.2 review)

### Existing Files to Update
- `expressions.test.ts` - Add record shorthand, if-without-else
- `parser-errors.test.ts` - Add all new error messages
- `patterns.test.ts` - Add tuple patterns
- `declarations.test.ts` - Add ASI tests
- `parser-integration.test.ts` - Add precedence tests
- `lists.test.ts` (desugarer) - Update 6 ListCons references

---

## Risk Assessment

### High Risk Items (from v2.2 review)
1. **Precedence Chain Restructure** ⚠️ **HIGHEST RISK**
   - One mistake breaks ALL expression parsing
   - Moving 3 major levels: Cons (8 levels down), Composition (6 levels up), RefAssign (swap order)
   - **Mitigation**: Phase 0 first, test after EACH level move in Phase 2
   - **Add**: Intermediate test checkpoints

2. **ASI Implementation** ⚠️ **HIGH RISK**
   - Complex rules, many edge cases
   - Could break multi-line expressions
   - **Mitigation**: Comprehensive tests for multi-line lambdas, match, records, lists
   - **Critical tests**: Lambda + ASI interaction, record context, nested structures

3. **Tuple vs Lambda vs Parens Ambiguity** ⚠️ **MEDIUM-HIGH RISK**
   - After parsing `(expr1, expr2, ...)`, must distinguish 3 cases
   - Requires careful lookahead for `=>`
   - **Mitigation**: Explicit lookahead before ASI, test all three cases thoroughly

### Medium Risk Items
4. **While Loop Desugaring** - Incorrect desugaring could create infinite loops
5. **Pipeline Integration** - Changes must propagate correctly through all stages
6. **Tuple Exhaustiveness Checking** - Complex algorithm extension

### Low Risk Items
7. **ListCons Removal** - Well-defined change with clear migration path
8. **If Optional Else** - Simple change with clear semantics
9. **Documentation Updates** - No code risk

### Risk Mitigation Strategy
- ✅ Do Phase 0 before Phase 2 (user-confirmed lower risk approach)
- ✅ Test after each precedence level move (not just at end)
- ✅ ASI lookahead for `=>` prevents breaking lambdas
- ✅ ASI disabled in record context prevents field shorthand issues
- ✅ Comprehensive test suite (7 new test files + updates to 5 existing)

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

## Review Findings Summary

**What's Correct:**
- ✅ Precedence chain matches spec 100%
- ✅ All 19 issues properly identified
- ✅ Record shorthand correctly identifies BOTH locations
- ✅ Match loop structure fix is correct
- ✅ While desugaring matches spec

**What Needed Clarification:**
- ⚠️ Phase 0 vs Phase 2 ordering → **RESOLVED**: Phase 0 first
- ⚠️ ASI + Lambda interaction → **RESOLVED**: Lookahead for `=>`
- ⚠️ ASI in records → **RESOLVED**: Disable entirely
- ⚠️ Tuple arity validation location → **RESOLVED**: Added pseudocode
- ⚠️ Operator section variations → **RESOLVED**: All forms documented
- ⚠️ Missing test files → **RESOLVED**: Added 3 more files

**Implementation Readiness:**
- ✅ Phase 1 (AST): Ready now
- ✅ Phase 0 (Lambda): Ready now - DO FIRST
- ✅ Phase 2 (Precedence): Ready after Phase 0
- ✅ Phases 3-9: Ready after Phase 2
- ✅ Phase 10 (Pipeline): Ready after parser complete
- ✅ Phase 11 (Testing): Continuous

---

## References

- [Parser Requirements](./.../../parser-requirements.md) - Authoritative specification
- [Language Spec](./../../docs/spec/) - Complete language specification
- [CLAUDE.md](./../../CLAUDE.md) - Project overview and directives
- [CODING_STANDARDS.md](./../CODING_STANDARDS.md) - Code style guidelines
- [Parser Updates Plan](parser-updates-plan.md) - v2.2 (Reviewed and Approved)
