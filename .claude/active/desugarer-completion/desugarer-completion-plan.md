# Desugarer Completion Plan

**Created:** 2025-11-23
**Last Updated:** 2025-11-23 (Post-audit revision - corrected scope and test counts)

## Overview

Complete the vibefun desugarer implementation by fixing critical bugs, verifying parser behavior, updating documentation to match implementation decisions, and adding comprehensive edge case test coverage.

## Current State

The desugarer is **95% complete** with excellent architecture and test coverage:
- **232 tests passing** across 28 test files (verified baseline)
- **All major transformations implemented**: lambdas, pipes, composition, lists, blocks, or-patterns, while loops
- **Modular architecture**: Separate files for each transformation type
- **Good error handling**: Custom DesugarError with location information

**Audit Findings:**
- While loops correctly desugar to recursive functions (CoreLetRecExpr)
- CoreWhile exists in core-ast.ts but is **dead code** (never constructed by desugarer)
- Type checker is functional and does NOT need type annotations from patterns
- Parser handles if-without-else and record field shorthand (not desugarer)

## Critical Issues Identified

1. **Missing TypeAnnotatedPattern handler** - Will throw error if parser produces type-annotated patterns (CONFIRMED BUG)
2. **CoreWhile dead code** - CoreWhile exists in core-ast.ts but is never used (needs removal)
3. **Documentation inconsistencies** - Requirements doc and language spec don't match implementation
4. **Edge case test coverage** - Need comprehensive tests for complex scenarios, including guards, exhaustiveness, etc.

## Implementation Decisions

Based on user preferences:
- **Mutable references (!ref, :=)**: Keep as core operations (CoreUnaryOp/CoreBinOp), not function calls
- **String concatenation (&)**: Keep as CoreBinOp 'Concat', not String.concat() calls
- **Test coverage**: Comprehensive tests with edge cases
- **Tooling**: Focus on core functionality only (no --show-desugared flag for now)

## Implementation Phases

### Phase 0: Remove CoreWhile Dead Code

**Goal:** Clean up dead code that misleads developers about compilation pipeline

**Background:** CoreWhile was added as a placeholder (Nov 10, commit fd44caf) but when while loop desugaring was implemented (commit eac42ee), it created CoreLetRecExpr instead. CoreWhile was never removed from the AST.

**⚠️ AUDIT UPDATE:** Initial plan identified 3 locations. Comprehensive audit found **11+ locations** across core-ast, typechecker, utilities, and optimizer.

**Tasks:**
1. Remove CoreWhile from `packages/core/src/types/core-ast.ts`:
   - Line 58: Remove `| CoreWhile;` from CoreExpr union
   - Lines 312-319: Remove CoreWhile type definition
2. Remove CoreWhile from `packages/core/src/typechecker/types.ts`:
   - Line 565: Remove `case "CoreWhile":` from isConstant function
3. Remove CoreWhile from `packages/core/src/typechecker/infer.ts`:
   - Lines 243-245: Remove CoreWhile placeholder case (unreachable code)
4. Remove CoreWhile from `packages/core/src/utils/ast-analysis.ts`:
   - Line 143: Remove CoreWhile case
5. Remove CoreWhile from `packages/core/src/utils/substitution.ts`:
   - Line 391: Remove CoreWhile case
6. Remove CoreWhile from `packages/core/src/utils/expr-equality.ts`:
   - Lines 178-179: Remove CoreWhile cases (2 locations)
7. Remove CoreWhile from `packages/core/src/utils/ast-transform.ts`:
   - Line 192: Remove CoreWhile case
8. Remove CoreWhile from `packages/core/src/optimizer/passes/eta-reduction.ts`:
   - Line 245: Remove CoreWhile case
9. Remove CoreWhile from `packages/core/src/optimizer/passes/pattern-match-opt.ts`:
   - Line 175: Remove CoreWhile case
10. Run tests to verify no breakage:
    - `npm test` - All tests should still pass
11. Document the removal in context.md

**Rationale:** CoreWhile is dead code that serves no purpose and misleads developers about whether while loops are desugared or passed through to code generator. Removing it from utilities and optimizer prevents propagation of unreachable code.

### Phase 1: Fix Critical Bug - TypeAnnotatedPattern

**Goal:** Fix missing handler that would cause runtime errors

**Tasks:**
1. Add case in `desugarer.ts:desugarPattern()` to handle `TypeAnnotatedPattern`
   - Strip type annotation
   - Recursively desugar inner pattern
   - Preserve location information
2. Add tests for type-annotated patterns:
   - In match expressions: `match x { | (n: Int) => ... }`
   - In let bindings: `let (x: Int) = value`
   - In lambda parameters: `(x: Int) => ...`
   - Nested patterns: `match x { | Some((n: Int)) => ... }`
3. Verify parser produces `TypeAnnotatedPattern` nodes correctly

### Phase 2: Document Parser Behavior and Add Tests

**Goal:** Document confirmed parser behavior and add validation tests

**Background:** Investigation confirmed that parser handles both if-without-else and record field shorthand. The language spec incorrectly claims desugarer handles these. This phase adds tests and documentation.

**Confirmed Findings:**
- **If-without-else:** Parser inserts `{ kind: "UnitLit" }` when else is omitted (`parse-expressions.ts:678-682`)
- **Record field shorthand:** Parser expands `{name}` to `{name: name}` before AST creation
- Both transformations happen at parse time, NOT desugaring time

**Tasks:**
1. Add parser tests for if-without-else:
   - Test: `if x then action()` produces AST with `else_: { kind: "UnitLit" }`
   - Verify parser inserts Unit literal, not undefined
   - Verify UnitLit location matches else branch source position
   - File: `packages/core/src/parser/expressions.test.ts`
2. Add parser tests for record field shorthand:
   - Test: `{name, age}` parses to explicit `{name: name, age: age}`
   - Verify parser expansion before AST creation
   - Test with mixed fields and spreads: `{...person, name, age: 31}`
   - File: `packages/core/src/parser/expressions.test.ts`
3. Add parser tests for TypeAnnotatedPattern creation:
   - Verify parser creates TypeAnnotatedPattern for `(x: Int)` syntax
   - Test nested type annotations: `(Some((x: Int)))`
   - Test in various contexts: match, let, record patterns
4. Document findings in context.md:
   - Update parser-desugarer boundary section
   - Remove "Critical Ambiguity" note (now resolved)
   - Add confirmed parser behavior with code references

### Phase 3: Update Documentation

**Goal:** Align requirements document AND language spec with implementation

**⚠️ CRITICAL:** This phase fixes multiple errors in the language specification that could mislead developers. Comprehensive audit revealed 3+ spec sections incorrectly describing desugarer behavior.

**Tasks:**

**A. Update Requirements Document** (`.claude/desugarer-requirements.md`):
1. Mark mutable references as ✅ Done (kept as core ops)
2. Mark string concatenation as ✅ Done (kept as CoreBinOp)
3. Mark list cons operator as ✅ Done (change from ⚠️ Verify)
4. Update if-without-else section based on Phase 2 findings (parser handles it)
5. Update record field shorthand section based on Phase 2 findings (parser handles it)
6. Add "Implementation Decisions" section documenting:
   - Why mutable refs kept as core ops (vs function calls)
   - Why string concat kept as core op (vs String.concat)
   - Why CoreWhile was removed (never used, dead code)
   - Rationale for each decision
7. Update transformation status table
8. Mark TypeAnnotatedPattern as ✅ Done after Phase 1
9. Document that type annotations are stripped (type checker doesn't need them)

**B. Update Language Specification** (`docs/spec/12-compilation/desugaring.md`):
1. **Fix if-without-else section (lines 317-329):**
   - Current (WRONG): Says desugarer handles if-without-else
   - Correct: Remove this section entirely (parser handles it)
   - Add new "Parser-Level Transformations" section documenting what parser does
   - Clarify that parser inserts Unit literal when else omitted
2. Fix string concatenation section:
   - Current (WRONG): Says desugars to `String.concat(s1, s2)`
   - Correct: Passes through as `CoreBinOp "Concat"`
3. Fix mutable reference deref section:
   - Current (WRONG): Says desugars to `Ref.get(ref)`
   - Correct: Passes through as `CoreUnaryOp "Deref"`
4. Fix mutable reference assignment section:
   - Current (WRONG): Says desugars to `Ref.set(ref, val)`
   - Correct: Passes through as `CoreBinOp "RefAssign"`
5. Add clarification that these are core operations handled by code generator
6. Document TypeAnnotatedPattern desugaring (strip annotations)
7. **Full spec review:** Audit entire desugaring.md for additional inconsistencies beyond identified sections

**C. Update Language Specification** (`docs/spec/04-expressions/control-flow.md`):
1. **Add implementation note about if-without-else (after line 76):**
   - Document that parser automatically inserts Unit literal
   - Clarify AST always includes else branch, but source syntax allows omitting it
   - Reference parser implementation for developers

### Phase 4: Comprehensive Edge Case Testing

**Goal:** Add extensive test coverage for complex scenarios

**Test Categories:**

1. **TypeAnnotatedPattern edge cases** (new file: `type-annotated-patterns.test.ts`)
   - Basic type annotations: `(x: List<Int>)`
   - In different contexts: match, let, lambda
   - Multiple separate annotations: `((x: Int), (y: String))`
   - **With or-patterns:** `match x { | (Some(n: Int)) | (Ok(n: Int)) => n }`
   - **Nested TypeAnnotatedPattern:** `((Some(x: Int)): Option<Int>)` - two annotation levels
   - Annotations on complex inner patterns
   - **Annotations on list patterns:** `([x, y]: List<Int>)` in match context

2. **Or-pattern edge cases** (enhance `or-patterns.test.ts`)
   - 3+ alternatives
   - Deeply nested patterns
   - Combined with list patterns
   - Combined with record patterns
   - **NEW: Or-patterns with guards** - `Some(x) when x > 0 | None => "default"`
   - Verify guard duplication to each expanded case

3. **List spread edge cases** (enhance `list-spread.test.ts`)
   - Multiple spreads: `[...xs, ...ys, ...zs]`
   - Mixed with elements: `[1, ...xs, 2, ...ys, 3]`
   - Nested lists: `[[...xs], [...ys]]`
   - Empty list spreads: `[...[]]`

4. **Record spread edge cases** (enhance `records.test.ts`)
   - Multiple spreads: `{...r1, ...r2, x: 1}`
   - Nested records: `{user: {...person, age: 31}}`
   - Empty record spreads: `{...{}}`
   - Spread with field shadowing: `{...r, x: 1, ...s}`

5. **While loop edge cases** (new tests in `desugarer.test.ts`)
   - Nested while loops
   - Complex conditions (binary ops, function calls)
   - Empty body: `while cond {}`
   - Body with multiple statements

6. **Pipe and composition edge cases** (enhance existing tests)
   - Mixed operators: `x |> f >> g |> h`
   - Nested compositions: `(f >> g) >> (h >> i)`
   - Complex expressions: `(x + 1) |> f |> (y => y * 2)`

7. **Block expression edge cases** (enhance `blocks.test.ts`)
   - Empty blocks: `{}`
   - Single statement blocks: `{ x }`
   - Deeply nested blocks: `{ { { x } } }`
   - Blocks with complex bindings

8. **Lambda currying edge cases** (enhance `lambdas.test.ts`)
   - Single parameter (no currying needed)
   - Many parameters (5+)
   - Nested lambdas: `(x) => (y) => (z) => e`
   - Lambda as argument: `f((x, y) => x + y)`

9. **Integration tests** (enhance `integration.test.ts`)
   - Combining multiple transformations
   - Real-world code patterns
   - Complex nested scenarios
   - Error cases that span multiple transformations
   - **Deep recursion stress test:** 100+ levels of nesting to verify no stack overflow

10. **NEW: Exhaustiveness checking interaction** (new file: `exhaustiveness.test.ts`)
    - Verify or-pattern expansion doesn't break exhaustiveness checking
    - Test: `Some(1) | Some(2) => "small"` still non-exhaustive
    - Test nested variant exhaustiveness after desugaring
    - Test list pattern exhaustiveness

11. **NEW: Fresh variable collision avoidance** (add to `desugarer.test.ts`)
    - Verify `$` prefix prevents user variable collisions
    - Test nested transformations generate unique names
    - Test that `$loop_0`, `$loop_1` increment correctly

12. **NEW: Type annotations on complex patterns** (add to `type-annotated-patterns.test.ts`)
    - Annotations on non-variable patterns: `([x, y]: List<Int>)`
    - Annotations on tuple patterns: `((x, y): (Int, String))`
    - Annotations on variant patterns: `(Some(x): Option<Int>)`
    - Multiple levels: `((Some(x)): Option<Int>)`

13. **NEW: Transformation order dependencies** (new file: `transformation-order.test.ts`)
    - Test or-patterns expanded before pattern desugaring
    - Test pipe desugared before currying in same expression
    - Test block desugaring before expression desugaring
    - Verify order-dependent transformations work correctly
    - **Run after all transformations are stable**

14. **NEW: Location preservation comprehensive** (enhance all test files)
    - Verify ALL desugared nodes preserve original locations
    - Test error messages point to surface syntax
    - Test location info for generated code (fresh variables)
    - Add location assertions to each transformation test
    - **Run after TypeAnnotatedPattern fix to ensure complete coverage**

15. **NEW: Parser contract tests** (new file: `parser-contract.test.ts`)
    - Verify parser always provides complete if-else (else_ field never undefined)
    - Verify parser expands record field shorthand before desugarer
    - Test AST structure assumptions from Phase 2 investigations
    - Verify parser produces expected node types for all syntax forms
    - Document parser-desugarer boundary explicitly

16. **NEW: Error message quality** (add to `desugarer.test.ts` or new file)
    - Test DesugarError messages are user-friendly and actionable
    - Verify error locations point to correct source positions
    - Test hint messages provide helpful guidance
    - Verify error formatting is consistent across all transformations
    - Test error messages for invalid syntax caught by desugarer

### Phase 5: Verification & Quality Checks

**Goal:** Ensure all tests pass and code meets standards

**Tasks:**
1. Run full verification suite:
   ```bash
   npm run verify
   ```
   - Type checking: `npm run check`
   - Linting: `npm run lint`
   - Tests: `npm test`
   - Formatting: `npm run format`
2. Verify all existing ~211 tests still pass (desugarer module baseline)
3. Confirm new tests bring total to ~365+ tests (expanded edge cases + parser contracts + error quality)
4. Review test output for warnings or issues
5. Check test coverage report (target: 90%+)
6. Fix any issues that arise

### Phase 6: Update Progress Tracking

**Goal:** Document completion and archive

**Tasks:**
1. Update task files in `.claude/active/desugarer-completion/`:
   - Mark all tasks complete in `desugarer-completion-tasks.md`
   - Update "Last Updated" timestamps
   - Add final notes about test counts, coverage
2. Archive the feature:
   - Move to `.claude/archive/desugarer-completion/`
   - Create completion summary document
3. Update CLAUDE.md if needed (following Documentation Rules):
   - No status indicators
   - No test counts
   - Only stable architectural information

## Success Criteria

- ✅ Zero critical bugs (TypeAnnotatedPattern fixed)
- ✅ CoreWhile dead code removed from entire codebase (core-ast, typechecker, utilities, optimizer)
- ✅ Complete documentation alignment with implementation (requirements doc AND language spec)
- ✅ ~386+ comprehensive tests covering all edge cases, parser contracts, and error quality
- ✅ All quality checks passing (`npm run verify` succeeds)
- ✅ Parser-desugarer boundary explicitly tested and documented
- ✅ Type checker compatibility verified (annotations not needed)
- ✅ Desugarer ready for continued type checker development

## Non-Goals

- Performance optimizations (future work)
- Developer tooling like `--show-desugared` flag (future work)
- Enhanced error messages with suggestions (future work)
- New transformation features not in requirements (out of scope)

## Risks & Mitigation

**Risk:** TypeAnnotatedPattern fix might reveal parser issues
**Mitigation:** Test parser behavior first, fix parser if needed

**Risk:** Adding comprehensive tests might reveal bugs in existing transformations
**Mitigation:** Fix any bugs discovered, update tests accordingly

**Risk:** Documentation updates might reveal more inconsistencies
**Mitigation:** Review entire requirements doc carefully, address all inconsistencies

## Timeline

No timeline estimates per project guidelines. Work proceeds phase by phase, completing each fully before moving to the next.

## Notes

- All code changes must include comprehensive test coverage
- Follow coding standards in `.claude/CODING_STANDARDS.md`
- Preserve location information in all transformations
- Maintain functional programming style
- No `any` types allowed
