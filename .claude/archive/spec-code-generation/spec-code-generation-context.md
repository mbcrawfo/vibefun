# Specification Improvement: Context & Decisions

**Last Updated:** 2025-11-03

## Key Files

### Current Specification Structure

```
docs/spec/
├── 01-introduction/
├── 02-lexical-structure/
├── 03-type-system/
├── 04-expressions/
├── 05-patterns/
├── 06-functions/
├── 07-references/
├── 08-modules/
├── 09-error-handling/
├── 10-javascript-interop/
├── 11-standard-library/
├── 12-compilation/
└── 13-appendix.md
```

### Files Being Created/Modified

**Phase 1:**
- `docs/spec/12-compilation/code-generation.md` (new)

**Phase 2:**
- `docs/spec/04-expressions/evaluation-order.md` (new)
- `docs/spec/04-expressions/operators.md` (update)

**Phase 3:**
- `docs/spec/08-modules/module-system.md` (update)

**Phase 4:**
- `docs/spec/03-type-system/type-inference.md` (update)
- `docs/spec/03-type-system/records.md` (update)
- `docs/spec/03-type-system/variants.md` (update)

## Design Decisions

### Documentation Philosophy

1. **Specification vs Implementation**
   - Define *what* behavior is guaranteed, not *how* to implement it
   - Allow compiler implementers flexibility in implementation strategies
   - Focus on observable semantics

2. **Implementation-Defined Behavior**
   - Practical limits (max arity, nesting depth) are implementation-defined
   - Performance characteristics are not specified
   - Optimization strategies are not mandated

3. **Edge Cases**
   - All edge cases must have defined behavior
   - Prefer compile-time errors over runtime errors where possible
   - Unclear cases should result in compilation errors (fail-safe)

### Code Generation Principles

1. **Value Representations**
   - Specify semantic requirements, not data structures
   - Example: Variants must preserve constructor identity and support pattern matching
   - Implementation can choose tagged objects, arrays, or other representations

2. **Evaluation Order**
   - Specify evaluation order where it affects correctness (side effects)
   - Leave unspecified where order doesn't matter semantically
   - Be explicit about what is guaranteed vs what is unspecified

3. **Type Erasure**
   - Type information is primarily compile-time
   - Specify what (if any) type information persists at runtime
   - Runtime type checking is optional/implementation-defined

## Research Findings

### Critical Gaps Identified

From comprehensive spec review (2025-11-03):

**Priority 1 - Blocks Implementation:**
1. Code generation semantics (how constructs map to JS)
2. Standard library complete specifications
3. Expression evaluation order
4. Module initialization behavior

**Priority 2 - Important for Correctness:**
5. Type system edge cases
6. Pattern matching details
7. Operator semantics
8. Error message requirements

**Priority 3 - Quality of Life:**
9. Performance characteristics
10. Lexical edge cases
11. Practical limits

### User Preferences

- **Priority Area**: Code Generation & Compilation (start here)
- **Detail Level**: Specification Only (behavior, not implementation)
- **Limits**: Implementation-defined (no hard-coded limits in spec)
- **Approach**: Incremental by Section (complete one area at a time)

## Notes

- Focus on creating documentation that enables correct implementation
- Avoid over-specification that limits optimization opportunities
- Provide examples to clarify ambiguous cases
- Cross-reference related sections of the spec
