# Ref Variables Documentation Plan

## Overview
Update vibefun-spec.md to comprehensively document mutable references (refs), including syntax, semantics, type system integration, usage examples, and design philosophy.

## Problem Statement
Current documentation of refs is severely incomplete:
- Only brief mentions in operators and keywords sections
- Zero working examples in the spec
- No explanation of when/why to use refs
- Missing from Type System section
- Ambiguous `!` operator not explained

## Approach

### 1. Add New "Mutable References" Section
Location: After "Pattern Matching" section, before "Modules"

Content:
- Design philosophy (escape hatch for imperative algorithms, generally discouraged)
- The `Ref<T>` type explanation
- Three core operations: creation, dereference, assignment
- Comprehensive examples

### 2. Update Type System Section
- Add `Ref<T>` to types list
- Document type checking rules for ref operations
- Explain type-based resolution of `!` operator

### 3. Enhance Operators Section
- Expand `:=` and `!` descriptions beyond one-liners
- Add cross-references to Mutable References section
- Clarify type-based disambiguation for `!`

### 4. Update Syntax Quick Reference
- Add complete ref examples to syntax summary
- Include in end-of-spec cheat sheet

## Key Design Decisions
Based on clarifications:
- `mut` keyword IS required: `let mut x = ref(0)`
- `!` uses type-based resolution (Bool → NOT, Ref<T> → deref)
- `ref` is special syntax, not a regular function
- Philosophy: use for imperative algorithms & JS interop, but prefer pure functional alternatives

## Examples to Include
1. Basic counter (create, read, update)
2. Imperative factorial with while loop
3. Refs with variants (Option/Result state)
4. Multiple coordinated refs
5. Closure capture behavior
