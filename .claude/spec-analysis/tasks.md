# Spec Validation Remediation — Task Checklist

Derived from [ordering.md](./ordering.md). For scope, effort, and rationale see that file.

## Phase 1: Quick Wins & Prerequisites
- [x] 1.1 Boolean exhaustiveness checking
- [x] 1.2 Multi-argument call desugaring
- [x] 1.3 Zero-argument lambda
- [x] 1.4 Empty block expression
- [ ] 1.5 Wildcard pattern in let-bindings
- [ ] 1.6 Division-by-zero runtime checks
- [x] 1.7 Nullary constructor type annotation crash

## Phase 2: Stdlib Name Resolution
- [ ] 2.1 Module-qualified name resolution
- [ ] 2.2 Missing builtin registrations
- [ ] 2.3 List spread `concat` name mismatch
- [ ] 2.4 Stdlib runtime codegen
- [ ] 2.5 Test fixture cleanup

## Phase 3: Core Language Features
- [ ] 3.1 User-defined type declaration processing
- [ ] 3.2 Prefix `!` operator disambiguation
- [ ] 3.3 Float arithmetic operators

## Phase 4: Supporting Features
- [ ] 4.1 Nested `let mut` + codegen double-wrapping fix
- [ ] 4.2 Top-level expression statements
- [ ] 4.3 Non-let expressions in block bodies

## Phase 5: Advanced Features
- [ ] 5.1 Tuple type system
- [ ] 5.2 Pattern matching completeness
- [ ] 5.3 Explicit type parameters on functions
- [ ] 5.4 Lambda parameter destructuring
- [ ] 5.5 JavaScript interop completeness

## Phase 6: Module System
- [ ] 6.1 Fix module test fixtures
- [ ] 6.2 Multi-file compilation pipeline

## Phase 7: Remaining Items
- [ ] 7.1 String literal union types
- [ ] 7.2 Type declaration validation
- [ ] 7.3 Re-exports, namespace imports

Critical path: Phase 1 → Phase 2 → Phase 3. After Phase 3, remaining phases can proceed in parallel.
