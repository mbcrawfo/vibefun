# Recommended Implementation Ordering

This document recommends the order in which to complete the vibefun language implementation, based on the dependency graph, difficulty, and impact of each group of related failures.

## Ordering Principles

1. **Quick wins first** - Simple fixes that take a few lines unlock disproportionate value
2. **Unblock testing infrastructure** - Fixes that enable output verification for other tests get priority
3. **High fan-out features** - Features that are prerequisites for many other features rank higher
4. **Parallel tracks** - Independent groups can be worked on simultaneously

## Recommended Order

### Phase 1: Quick Wins (Simple fixes, high leverage)

**1. G5: Nullary Constructor Type Representation**
Fix the zero-param function type crash in `format.ts` and `builtins.ts`. A few lines of code that eliminates confusing internal error crashes, making all subsequent debugging easier.

**2. G7: Zero-Parameter Lambdas and Empty Blocks**
Two small edge-case fixes in the desugarer. Eliminates internal crashes for `() => expr` and `{}`.

**3. G4: Bool Exhaustiveness**
Add `true`/`false` coverage check in the exhaustiveness checker. Small change that unblocks all if-then-else usage throughout the language.

### Phase 2: Core Infrastructure (Medium effort, massive impact)

**4. G1: Stdlib Module-Qualified Name Resolution**
The single most impactful fix. Enables `String.fromInt`, `String.fromFloat`, `String.fromBool` and all other `Module.function` calls. Unblocks ~120 tests across every section. Should be designed with the module system (G10) in mind. Also includes adding `String.fromBool` and stdlib runtime implementations.

**5. G3: Multi-Argument Call Site Desugaring**
Small desugarer change that enables natural `f(a, b)` call syntax for curried functions. Unblocks ~8 tests and is a basic usability requirement.

### Phase 3: Type System Completeness (Medium-large effort, foundational)

**6. G2: User-Defined Type Declarations**
Implement `CoreTypeDecl` processing in the typechecker to register variant constructors, resolve type aliases, and handle generic type definitions. This is a large task but foundational -- without it, users cannot define their own algebraic data types.

**7. G12e: Record Width Subtyping Fix**
Small fix to ensure record unification rejects records with missing required fields. Corrects type safety.

### Phase 4: Mutable State (Medium effort, enables imperative patterns)

**8. G6: Prefix `!` Disambiguation**
Implement type-based disambiguation so prefix `!` works as deref on `Ref<T>` and logical NOT on `Bool`. Required for the mutable references feature to be usable with spec syntax.

**9. G8: Top-Level Expression Statements**
Allow expression statements at the module top level. Needed for `:=` assignments, `while` loops, and other imperative patterns outside of function bodies.

**10. G11: Mutable Ref Codegen Fixes**
Fix double-wrapping bug and add ref-without-mut enforcement. These are small fixes but can only be validated after G6 and G1 are complete.

### Phase 5: Remaining Type Features (Medium effort each, isolated)

**11. G12a: Integer Division by Zero Panic**
Add runtime check to integer division codegen. Small, independent.

**12. G9: Tuple Type Inference**
Implement tuple type inference, pattern matching, and codegen. Significant new feature but self-contained.

**13. G12c: Explicit Type Parameters on Lambdas**
Extend parser to handle `<T>(x: T) => expr` syntax. Independent feature.

**14. G12b: String Literal Union Types**
Extend parser and type system to support string literals in type position. Independent feature.

**15. G12d: Lambda Pattern Destructuring**
Desugar pattern params to variable + match. Independent feature.

**16. G12f: Unsafe Block Enforcement**
Add unsafe-context tracking to the typechecker. Independent feature.

### Phase 6: Module System (Large effort, enables multi-file programs)

**17. G10: Module System Integration**
Wire the existing module loader and resolver into the CLI pipeline. Implement cross-module type checking. Handle re-exports. This is the largest single task but is largely independent of other groups and can be started earlier if resources allow.

## Summary Table

| Priority | Group | Effort | Tests Unblocked | Rationale |
|----------|-------|--------|-----------------|-----------|
| 1 | G5: Nullary constructors | Simple | ~4 | Eliminates internal crashes |
| 2 | G7: Zero-param / empty blocks | Small | ~4 | Eliminates internal crashes |
| 3 | G4: Bool exhaustiveness | Small | ~8 | Unblocks if-then-else |
| 4 | G1: Stdlib resolution | Medium+ | ~120 | Highest impact single fix |
| 5 | G3: Multi-arg calls | Small | ~8 | Basic usability |
| 6 | G2: User-defined types | Large | ~15 | Foundational type system |
| 7 | G12e: Record subtyping | Small | ~1 | Type safety correction |
| 8 | G6: Prefix `!` deref | Medium | ~6 | Enables mutable refs |
| 9 | G8: Top-level expressions | Medium | ~8 | Enables imperative patterns |
| 10 | G11: Ref codegen | Small | ~2 | Completes mutable refs |
| 11 | G12a: Div-by-zero | Small | 1 | Error handling correctness |
| 12 | G9: Tuples | Large | ~6 | New type feature |
| 13 | G12c: Lambda type params | Medium | 1 | Advanced feature |
| 14 | G12b: String literal unions | Medium | 1 | Advanced feature |
| 15 | G12d: Lambda destructuring | Medium | 1 | Convenience feature |
| 16 | G12f: Unsafe enforcement | Medium | 1 | Safety feature |
| 17 | G10: Module system | Large | 9 | Multi-file programs |

## Parallel Work Opportunities

The following can be worked on simultaneously:
- **Track A (critical path):** G5 -> G1 -> G11
- **Track B (type system):** G4 -> G2 -> G9
- **Track C (syntax/desugarer):** G7 -> G3 -> G8
- **Track D (independent):** G10 (can start anytime)
- **Track E (standalone fixes):** G12a-f (can be done anytime)
