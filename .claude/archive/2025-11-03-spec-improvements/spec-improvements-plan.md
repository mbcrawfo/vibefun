# Vibefun Specification Documentation Improvements Plan

**Created:** 2025-11-03
**Status:** In Progress

## Overview

Comprehensive improvements to the vibefun language specification based on a thorough review identifying gaps, inconsistencies, and areas needing expansion for compiler implementation.

## Goals

1. Add missing documentation for referenced but undefined features (tuples)
2. Expand standard library from type signatures to complete semantics
3. Clarify status of control flow features (loops, async, try/catch)
4. Complete module system documentation with initialization semantics
5. Resolve inconsistencies in terminology and examples
6. Expand expression documentation with precedence and evaluation order

## Implementation Plan

### 1. Add Tuples Documentation
**New file:** `/docs/spec/03-type-system/tuples.md`
- Define tuple syntax: `(expr1, expr2, ...)`
- Tuple types: `(T1, T2, ...)`
- Distinguish tuples from records (structural vs nominal)
- Destructuring in patterns and let bindings
- Relationship to unit type `()`
- Examples and edge cases

### 2. Expand Standard Library Documentation
**Update existing stub files with complete semantics:**

`/docs/spec/11-standard-library/list.md`:
- Document behavior of all 25+ functions
- Add examples for map, filter, fold, etc.
- Specify edge cases (empty lists, infinite lists)
- Performance characteristics

`/docs/spec/11-standard-library/result.md`:
- Complete Result module documentation
- Combinators: andThen, orElse, mapError
- Error handling patterns

`/docs/spec/11-standard-library/string.md`, `/int.md`, `/float.md`:
- Full function semantics
- Conversion functions
- Edge case behavior

`/docs/spec/11-standard-library/array.md`:
- Mutable operations safety
- Performance notes
- When to use vs List

**New files needed:**
- `/docs/spec/11-standard-library/map.md` (Map module)
- `/docs/spec/11-standard-library/set.md` (Set module)
- `/docs/spec/11-standard-library/json.md` (JSON module)
- `/docs/spec/11-standard-library/math.md` (Math module)

### 3. Clarify Control Flow Features
**Update:** `/docs/spec/06-control-flow.md`
- Add while/for loop specification OR remove from examples (document decision)
- Add section on async/await (if supported) or mark as future feature
- Document try/catch or clarify it's JS interop only

### 4. Complete Module System
**Update:** `/docs/spec/08-modules.md`
- Module initialization order and semantics
- Export/import edge cases (name conflicts, re-exports)
- Circular dependency handling
- Complete vibefun.json schema

### 5. Resolve Inconsistencies
- **Ref syntax**: Clarify if `mut` is required or conventional
- **Empty list**: Explain `[]` polymorphism vs value restriction
- **String concat**: Document `&` as primitive or sugar
- **Function types**: Standardize notation in examples

### 6. Expand Expression Documentation
**Update:** `/docs/spec/04-expressions/basic-expressions.md`
- Add detailed operator precedence examples
- Associativity demonstrations
- Complex expression evaluation order
- Parenthesization rules

## Acceptance Criteria

- [ ] All referenced features have complete documentation
- [ ] Standard library modules have semantics, examples, and edge cases
- [ ] Control flow feature status is clear (supported, future, or not included)
- [ ] Module system has complete initialization semantics
- [ ] All inconsistencies are resolved
- [ ] Expression evaluation rules are comprehensive

## Notes

Each section will include examples, edge cases, and implementation guidance sufficient for compiler development.
