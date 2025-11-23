# Desugarer Completion Plan

**Created:** 2025-11-23
**Last Updated:** 2025-11-23

## Overview

Complete the vibefun desugarer implementation by fixing critical bugs, verifying parser behavior, updating documentation to match implementation decisions, and adding comprehensive edge case test coverage.

## Current State

The desugarer is **95% complete** with excellent architecture and test coverage:
- **232 tests passing** across 28 test files
- **All major transformations implemented**: lambdas, pipes, composition, lists, blocks, or-patterns, while loops
- **Modular architecture**: Separate files for each transformation type
- **Good error handling**: Custom DesugarError with location information

## Critical Issues Identified

1. **Missing TypeAnnotatedPattern handler** - Will throw error if parser produces type-annotated patterns
2. **Documentation inconsistencies** - Requirements doc doesn't match implementation decisions
3. **Verification gaps** - Need to confirm parser behavior for if-without-else and record field shorthand
4. **Edge case test coverage** - Need comprehensive tests for complex scenarios

## Implementation Decisions

Based on user preferences:
- **Mutable references (!ref, :=)**: Keep as core operations (CoreUnaryOp/CoreBinOp), not function calls
- **String concatenation (&)**: Keep as CoreBinOp 'Concat', not String.concat() calls
- **Test coverage**: Comprehensive tests with edge cases
- **Tooling**: Focus on core functionality only (no --show-desugared flag for now)

## Implementation Phases

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

### Phase 2: Verify Parser Behavior

**Goal:** Confirm where transformations happen (parser vs desugarer)

**Tasks:**
1. Check if-expression handling:
   - Examine parser AST for if-expressions
   - Determine if `else_` field can be null
   - Test if parser requires else branches: `if cond then e1`
   - Document whether parser or desugarer handles default else
2. Check record field shorthand:
   - Test if parser expands `{name, age}` to `{name: name, age: age}`
   - Document where this expansion happens
   - Add tests if desugarer needs to handle it
3. Document all findings

### Phase 3: Update Documentation

**Goal:** Align requirements document with implementation

**Tasks:**
1. Update `.claude/desugarer-requirements.md`:
   - Mark mutable references as ✅ Done (kept as core ops)
   - Mark string concatenation as ✅ Done (kept as CoreBinOp)
   - Mark list cons operator as ✅ Done (change from ⚠️ Verify)
   - Update if-without-else section based on Phase 2 findings
   - Update record field shorthand section based on Phase 2 findings
2. Add "Implementation Decisions" section documenting:
   - Why mutable refs kept as core ops
   - Why string concat kept as core op
   - Rationale for each decision
3. Update transformation status table
4. Mark TypeAnnotatedPattern as ✅ Done after Phase 1

### Phase 4: Comprehensive Edge Case Testing

**Goal:** Add extensive test coverage for complex scenarios

**Test Categories:**

1. **TypeAnnotatedPattern edge cases** (new file: `type-annotated-patterns.test.ts`)
   - Nested type annotations: `(x: List<Int>)`
   - In different contexts: match, let, lambda
   - Multiple annotations: `((x: Int), (y: String))`
   - With or-patterns: `(Some(x: Int) | Ok(x: Int))`

2. **Or-pattern edge cases** (enhance `or-patterns.test.ts`)
   - 3+ alternatives
   - Deeply nested patterns
   - Combined with list patterns
   - Combined with record patterns

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
2. Verify all existing 232 tests still pass
3. Confirm new tests bring total to 300+ tests
4. Review test output for warnings or issues
5. Check test coverage report
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
- ✅ Complete documentation alignment with implementation
- ✅ 300+ comprehensive tests covering all edge cases
- ✅ All quality checks passing (`npm run verify` succeeds)
- ✅ Desugarer ready for type checker phase

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
