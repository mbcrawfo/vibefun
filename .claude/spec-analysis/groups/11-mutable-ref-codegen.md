# Group 11: Mutable Reference Codegen Issues

## Problem
Two codegen-level issues with mutable references:

1. **Double-wrapping bug**: `let mut x = ref(10)` generates `const x = { $value: ref(10) }` where `ref(10)` already produces `{ $value: 10 }`, resulting in `{ $value: { $value: 10 } }`. Deref and assignment break because of the extra nesting.

2. **No enforcement that `ref()` requires `mut`**: `let x = ref(10);` compiles without error, but the spec says this should be a compile-time error. The parser validates `mut` requires `ref()` but not the converse.

## Affected Sections
- 07-mutable-references: 2+ tests (blocked by other issues, would surface after prefix-! and stdlib resolution are fixed)

## Estimated Complexity
Small for both:
- Double-wrapping: Don't emit wrapper when value is already a `ref()` call, or make `ref()` identity
- Ref-without-mut: Add validation check
