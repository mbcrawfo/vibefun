# Recommended Implementation Ordering

## Guiding Principles

1. **Unblock the most tests first.** A fix that unblocks 150 tests takes priority over one that fixes 2.
2. **Small fixes before large ones** when they aren't blocking anything.
3. **Fix prerequisites before dependents.** Don't implement features that depend on unfinished foundations.
4. **Maximize signal early.** Fixing the test infrastructure (stdlib output) first lets us see which features actually work vs. which have real bugs.

### On Test Counts

Throughout this document, "tests unblocked" means "tests where **at least one** blocker is removed." Many tests have multiple overlapping blockers, so the actual number of newly-passing tests after a single phase will be lower than the stated count. The figures represent the ceiling, not the expected pass count.

---

## Phase 1: Quick Wins & Prerequisites (~6-8 hours)

These are small, independent fixes with no dependencies that enable downstream phases.

### 1.1 Boolean exhaustiveness checking
Fix the exhaustiveness checker to recognize `true | false` as covering all `Bool` values. Small (~1 hour). **Hidden critical prerequisite:** if-then-else desugars to boolean match, so this indirectly blocks many tests across all sections.

### 1.2 Multi-argument call desugaring
Desugar `f(a, b)` to `f(a)(b)`. Small (~1-2 hours). **Prerequisite for Phase 2:** many stdlib function tests use tupled calling syntax (`List.fold(fn, init, list)`, `Result.map(fn, result)`). Without this, fixing name resolution alone won't unblock those tests.

### 1.3 Zero-argument lambda
Desugar `() => expr` to a lambda with a unit pattern parameter. Small (~1 hour). Unblocks ~6 tests and is needed by makeCounter/closure patterns.

### 1.4 Empty block expression
Return `CoreUnitLit` for empty blocks instead of throwing. Small (~30 min).

### 1.5 Wildcard pattern in let-bindings
Support `CoreWildcardPattern` in the typechecker's `inferLet`. Small (~1 hour). Needed by the while loop desugarer and `let _ = expr;` patterns.

### 1.6 Division-by-zero runtime checks
Add zero-divisor guards for integer division and modulo in codegen. Small (~1 hour). Fully independent, no prerequisites. Removes a blocker for 2 tests (which also need Group 1 for output verification).

### 1.7 Nullary constructor type annotation crash
Fix `typeToString` to handle zero-parameter function types. Small (~1 hour). Eliminates internal errors (exit code 5) across multiple sections.

---

## Phase 2: Stdlib Name Resolution (~3-5 days)

The single highest-impact work. After Phase 1 clears the prerequisites, this unblocks the maximum number of tests.

### 2.1 Module-qualified name resolution
Bridge the gap between `RecordAccess(Var("String"), "fromInt")` and the flat builtin key `"String.fromInt"`. Medium effort (~4-8 hours).

### 2.2 Missing builtin registrations
Add `String.fromBool`, `Float.isNaN/isInfinite/isFinite`, `List.flatten`, and all `Math` module functions to the builtin environment. Fix parameter order for List/Option/Result functions (data-first per spec). Small effort (~2-3 hours).

### 2.3 List spread `concat` name mismatch
Fix the list spread desugarer to use a name that matches the builtin registration, and ensure the codegen emits a working JS implementation. Small effort (~1 hour).

### 2.4 Stdlib runtime codegen
Implement JavaScript runtime for all stdlib functions. ~46 functions total. Many are trivial JS wrappers but List/Option/Result functions require recursive implementations that interact with the variant representation (`{ $tag: "Cons", $0: value, ... }`). Large effort (~2-4 days).

### 2.5 Test fixture cleanup
Remove redundant `type Option<T> = ...` and `type Result<T, E> = ...` redefinitions from test fixtures in section 11 (~19 tests). Small effort (~30 min).

---

## Phase 3: Core Language Features (~3-5 days)

### 3.1 User-defined type declaration processing
Register variant constructors in the type environment. Implement type alias transparency. This is fundamental for algebraic data types to be usable. Medium-Large effort (~1-2 days).

### 3.2 Prefix `!` operator disambiguation
**Requires design decision first** (prefix `!x` per spec vs postfix `x!` per implementation). Then implement type-based disambiguation. Medium effort (~4-8 hours). Needed by all mutable reference tests.

### 3.3 Float arithmetic operators
Extend the polymorphic type-lowering pattern from Divide to all arithmetic and comparison operators, plus unary negation. Medium effort (~4-8 hours). Follow the existing Divide template.

---

## Phase 4: Supporting Features (~1-2 days)

### 4.1 Nested `let mut` + codegen double-wrapping fix
Support mutable let-bindings in expression context and fix the `mut`/`ref` double-wrapping. Medium effort (~4-8 hours).

### 4.2 Top-level expression statements
Allow bare expressions at the module top level (e.g., `x := 20;`, `while ...`). Medium effort (~2-4 hours). Lower priority since `let _unused = expr;` works as a workaround after Phase 1.5.

### 4.3 Non-let expressions in block bodies
Support bare expression statements (not just `let` bindings) in block expressions. Small effort (~1-2 hours). Currently `desugarBlock.ts` throws for non-let, non-final expressions.

---

## Phase 5: Advanced Features (~4-7 days)

### 5.1 Tuple type system
Implement tuple type inference, unification, pattern matching, and exhaustiveness. Large effort (~1-3 days). Self-contained feature.

### 5.2 Pattern matching completeness
Or-pattern validation, nested or-pattern expansion, guard-aware exhaustiveness, unreachable detection. Medium effort (~4-8 hours).

### 5.3 Explicit type parameters on functions
Parser support for `<T>` before lambda parameters. Medium effort (~4-8 hours).

### 5.4 Lambda parameter destructuring
Desugar to `(temp) => match temp { | pattern => body }`. Large effort (~1-2 days).

### 5.5 JavaScript interop completeness
Multi-line unsafe blocks (small), unsafe enforcement (medium), try/catch (large). Total ~1-3 days.

---

## Phase 6: Module System (~3-5 days)

### 6.1 Fix module test fixtures
Change single-quoted strings to double-quoted in test fixtures and reconcile spec inconsistency. Small effort (~30 min). Can be done anytime.

### 6.2 Multi-file compilation pipeline
Integrate the existing ModuleLoader with the CLI. Implement multi-file typechecking and codegen. XL effort (~3-5 days). This is the largest single work item but only affects 14 tests in section 08 and doesn't block other sections.

---

## Phase 7: Remaining Items (~2-3 days)

### 7.1 String literal union types
Parser + typechecker support for `type Status = "pending" | "active"`. Medium effort.

### 7.2 Type declaration validation
Recursive alias rejection, unguarded recursion check, directional record subtyping. Medium effort.

### 7.3 Re-exports, namespace imports
Part of the module system completion. Depends on Phase 6.

---

## Summary

| Phase | Items | Est. Effort | Blocker Removed For |
|-------|-------|-------------|---------------------|
| 1 - Prerequisites | Bool exhaustiveness, multi-arg calls, zero-arg lambda, empty block, wildcard in let, div-by-zero, nullary crash | ~6-8 hours | ~10 directly + enables Phase 2 |
| 2 - Stdlib Resolution | Name resolution, builtin gaps, concat fix, stdlib runtime, test fixtures | ~3-5 days | ~150+ tests (with overlap caveats) |
| 3 - Core Features | User types, `!` disambiguation, float ops | ~3-5 days | ~30-40 tests |
| 4 - Supporting | Nested mut, top-level exprs, block statements | ~1-2 days | ~10-15 tests |
| 5 - Advanced | Tuples, pattern matching, type params, lambda destruct, interop | ~4-7 days | ~15-20 tests |
| 6 - Modules | Test fixtures, multi-file pipeline | ~3-5 days | ~14 tests |
| 7 - Remaining | String unions, validation, re-exports | ~2-3 days | ~5-10 tests |

**"Blocker Removed For" caveat:** These numbers represent tests where at least one blocker is removed by that phase. Tests with multiple overlapping blockers won't pass until ALL their blockers are resolved. The actual cumulative pass rate depends on the specific combination of fixes applied.

**Critical path:** Phase 1 → Phase 2 → Phase 3. After Phase 3, remaining phases can proceed in parallel.

**Estimated total effort:** ~20-32 days to address all 331 failing tests.
