# Specification Inconsistencies - Resolved

**Date:** 2025-11-03
**Status:** Resolved

## Summary

This document tracks the resolution of inconsistencies identified during the comprehensive specification review.

## 1. Ref Creation Syntax - ✅ RESOLVED

**Issue:** Unclear whether `mut` keyword is required or just conventional for ref creation.

**Examples causing confusion:**
- Some examples: `let mut x = ref(10)`
- Question: Can you write `let x = ref(10)` without `mut`?

**Resolution:**
- **`mut` is REQUIRED** when declaring a ref
- This is consistently documented in:
  - `/docs/spec/07-mutable-references.md` (line 36): "The `mut` keyword is **required**"
  - `/docs/spec/03-type-system/primitive-types.md` (line 69): "All refs must be declared with the `mut` keyword"

**Status:** Consistent across documentation. No changes needed.

---

## 2. Empty List Polymorphism - ✅ RESOLVED

**Issue:** Documentation appeared contradictory about whether `[]` is polymorphic.

**Contradictory statements:**
- "` []` has type `List<T>` (polymorphic)"
- "Due to value restriction, `let empty = []` creates monomorphic list"

**Resolution:**
- The `[]` **expression** is polymorphic: `List<T>`
- **Binding** `[]` to a variable makes it monomorphic due to value restriction
- Updated `/docs/spec/04-expressions/data-literals.md` (lines 244-283) with:
  - Clear explanation of expression vs binding distinction
  - Value restriction explanation
  - Examples showing the behavior
  - Workarounds (use function or use `[]` directly)

**Files modified:**
- `/docs/spec/04-expressions/data-literals.md` - Clarified empty list semantics

---

## 3. String Concatenation Operator - ✅ RESOLVED

**Issue:** Unclear whether `&` is a primitive operator or syntactic sugar.

**Documentation locations:**
- `/docs/spec/02-lexical-structure/operators.md`: "`&` - String concatenation"
- `/docs/spec/12-compilation/desugaring.md`: "desugared to `String.concat`"

**Resolution:**
- `&` is **syntactic sugar** that desugars to `String.concat(s1, s2)`
- Added cross-reference in operators.md (line 162) linking to desugaring docs

**Files modified:**
- `/docs/spec/02-lexical-structure/operators.md` - Added note about desugaring

---

## 4. Function Type Notation - ✅ RESOLVED

**Issue:** Inconsistent use of function type notation in examples.

**Two forms:**
- Multi-arg: `(Int, Int) -> Int`
- Curried: `(Int) -> (Int) -> Int`

**Resolution:**
- Both forms are **equivalent** (multi-arg desugars to curried)
- Specification uses multi-arg form for **readability** in examples
- Desugaring documentation explains the transformation
- Both are valid and correct

**Recommendation:** Prefer multi-arg form `(A, B) -> C` in documentation for clarity, but both are acceptable.

**Status:** No changes needed - both forms are valid and already documented as equivalent.

---

## Summary of Changes

| Inconsistency | Status | Files Modified | Change Type |
|---------------|--------|----------------|-------------|
| Ref `mut` requirement | ✅ Already consistent | None | Documentation review confirmed consistency |
| Empty list polymorphism | ✅ Clarified | `data-literals.md` | Improved explanation with examples |
| String `&` operator | ✅ Cross-referenced | `operators.md` | Added link to desugaring docs |
| Function type notation | ✅ Both valid | None | Accepted as design choice |

## Outcome

All identified inconsistencies have been resolved through:
1. Clarification of existing correct documentation (refs, function types)
2. Improved explanations with examples (empty list)
3. Added cross-references (string concatenation)

The specification is now internally consistent and provides clear guidance for compiler implementation.
