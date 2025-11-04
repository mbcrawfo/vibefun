# Specification Improvements Tasks

**Last Updated:** 2025-11-03

## Task Checklist

### Phase 1: Setup ✅
- [x] Create task directory
- [x] Create plan, context, and tasks documents
- [x] Initialize todo list

### Phase 2: Tuples Documentation 🔜
- [ ] Create `/docs/spec/03-type-system/tuples.md`
- [ ] Define tuple syntax and semantics
- [ ] Document tuple types
- [ ] Explain tuples vs records distinction
- [ ] Add destructuring examples
- [ ] Document unit type relationship
- [ ] Add edge cases

### Phase 3: Standard Library - Core Modules 🔜
- [ ] Expand `/docs/spec/11-standard-library/list.md`
  - [ ] Document all 25+ functions
  - [ ] Add usage examples
  - [ ] Specify edge cases
  - [ ] Add performance notes
- [ ] Complete `/docs/spec/11-standard-library/result.md`
  - [ ] Document combinators
  - [ ] Add error handling patterns
  - [ ] Examples for all functions
- [ ] Expand `/docs/spec/11-standard-library/string.md`
  - [ ] Full function semantics
  - [ ] Conversion functions
  - [ ] Edge cases
- [ ] Expand `/docs/spec/11-standard-library/int.md`
  - [ ] Complete API documentation
  - [ ] Conversion and math operations
- [ ] Expand `/docs/spec/11-standard-library/float.md`
  - [ ] IEEE 754 behavior
  - [ ] Special values (NaN, Infinity)
- [ ] Expand `/docs/spec/11-standard-library/array.md`
  - [ ] Mutable operations
  - [ ] Safety considerations
  - [ ] Performance vs List

### Phase 4: Standard Library - New Modules 🔜
- [ ] Create `/docs/spec/11-standard-library/map.md`
  - [ ] Map operations
  - [ ] Key equality semantics
  - [ ] Performance characteristics
- [ ] Create `/docs/spec/11-standard-library/set.md`
  - [ ] Set operations
  - [ ] Membership testing
  - [ ] Set algebra
- [ ] Create `/docs/spec/11-standard-library/json.md`
  - [ ] JSON type definition
  - [ ] Parse/stringify semantics
  - [ ] Error handling
- [ ] Create `/docs/spec/11-standard-library/math.md`
  - [ ] Mathematical functions
  - [ ] Constants (pi, e)
  - [ ] Trigonometric operations

### Phase 5: Control Flow Clarification 🔜
- [ ] Update `/docs/spec/06-control-flow.md`
- [ ] Decide on while/for loop status
- [ ] Document loops OR remove from examples
- [ ] Clarify async/await status (supported vs future)
- [ ] Document try/catch or mark as JS interop only

### Phase 6: Module System Completion 🔜
- [ ] Update `/docs/spec/08-modules.md`
- [ ] Add module initialization order
- [ ] Document circular dependency handling
- [ ] Specify export/import edge cases
- [ ] Add complete vibefun.json schema

### Phase 7: Resolve Inconsistencies 🔜
- [ ] Clarify ref creation `mut` requirement in `/docs/spec/07-mutable-references.md`
- [ ] Explain empty list `[]` type in `/docs/spec/03-type-system/primitive-types.md`
- [ ] Document string concatenation `&` in `/docs/spec/02-lexical-structure/operators.md`
- [ ] Standardize function type notation across spec

### Phase 8: Expression Documentation 🔜
- [ ] Update `/docs/spec/04-expressions/basic-expressions.md`
- [ ] Add detailed precedence examples
- [ ] Document associativity with examples
- [ ] Explain complex expression evaluation
- [ ] Add parenthesization rules

## Progress Summary

**Phases Completed:** 2.5/8 (31%)
**Current Phase:** Phase 3 - Standard Library (50% complete)
**Blockers:** None

## Recent Updates (2025-11-03)
- ✅ Created comprehensive tuples documentation
- ✅ Expanded List module with full semantics, examples, edge cases
- ✅ Expanded Result module with error handling patterns
- ✅ Expanded Option module with common patterns
