# Spec Validation Remediation — Task Checklist

Derived from [ordering.md](./ordering.md). For scope, effort, and rationale see that file.

## Phase 1: Quick Wins & Prerequisites
- [x] 1.1 Boolean exhaustiveness checking
- [x] 1.2 Multi-argument call desugaring
- [x] 1.3 Zero-argument lambda
- [x] 1.4 Empty block expression
- [x] 1.5 Wildcard pattern in let-bindings
- [x] 1.6 Division-by-zero runtime checks
- [x] 1.7 Nullary constructor type annotation crash

## Phase 2: Stdlib Name Resolution

Implemented as **Package D** (first-class module values + explicit
imports from `@vibefun/std`). See `phase-2-options.md` §8 and the plan
at `../plans/review-claude-spec-analysis-phase-2-opti-distributed-zebra.md`.
Package D was delivered across 11 sub-phases (2.0 baseline capture, 2.1
runtime, 2.2 `TModule`, 2.3 signature registry, 2.4 import wiring, 2.5
`__std__` desugaring, 2.6 ambient removal + fixture wrappers, 2.7
signature completeness, 2.8 e2e harness, 2.9 multi-file CLI, 2.10 docs
closeout) on the `module-resolution` branch. The checklist below tracks
the root-cause groups that Package D remediated:

- [x] 2.1 Module-qualified name resolution (TModule + registry + import handler)
- [x] 2.2 Missing builtin registrations (String.fromBool, Float.isNaN/isInfinite/isFinite, List.flatten, full Math surface)
- [x] 2.3 List spread `concat` name mismatch (→ `__std__.List.concat`)
- [x] 2.4 Stdlib runtime codegen (packages/stdlib/src/* real TS runtime)
- [x] 2.5 Test fixture cleanup (withOutput wrapper prepends stdlib import; section-11 redundant type redefs removed)

## Phase 3: Core Language Features
- [x] 3.1 User-defined type declaration processing
- [x] 3.2 Prefix `!` operator disambiguation
- [x] 3.3 Float arithmetic operators

## Phase 4: Supporting Features
- [x] 4.1 Nested `let mut` + codegen double-wrapping fix
- [x] 4.2 Top-level expression statements
- [x] 4.3 Non-let expressions in block bodies

## Phase 5: Advanced Features
- [x] 5.1 Tuple type system
- [x] 5.2 Pattern matching completeness
- [ ] 5.3 Explicit type parameters on functions
- [ ] 5.4 Lambda parameter destructuring
- [ ] 5.5 JavaScript interop completeness

## Phase 6: Module System
- [x] 6.1 Fix module test fixtures (single→double quotes; done opportunistically in phase 2.9)
- [x] 6.2 Multi-file compilation pipeline (wired in phase 2.9; strict cross-module export typechecking deferred)

## Phase 7: Remaining Items
- [ ] 7.1 String literal union types
- [ ] 7.2 Type declaration validation
- [ ] 7.3 Re-exports, namespace imports

Critical path: Phase 1 → Phase 2 → Phase 3. After Phase 3, remaining phases can proceed in parallel.
