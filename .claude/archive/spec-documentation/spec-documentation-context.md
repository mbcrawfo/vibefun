# Specification Documentation - Context

**Last Updated:** 2025-11-03

## Key Files

- **vibefun-spec.md** - Main language specification (being enhanced)
- **compiler-implementation-guide.md** - New file to be created
- **CLAUDE.md** - Will be updated with design decisions

## Documentation Gaps Identified

### Critical (Phase 1)
1. Incomplete operator precedence table (missing `>>`, `<<`, `...`)
2. Unclear type variable syntax and quantification rules
3. Function type representation ambiguities
4. Value restriction rules undefined
5. Module resolution algorithm missing
6. Semicolon insertion rules unclear
7. Operator associativity ambiguities

### Type System (Phase 2)
8. Recursive type definitions not documented
9. Type alias semantics unclear (transparent vs nominal)
10. Union types semantics undefined
11. Generic type parameter rules incomplete
12. Width subtyping implementation details missing
13. Ref<T> equality semantics unclear
14. Value restriction edge cases need examples

### Expressions (Phase 3)
15. Block expression edge cases
16. If expression without else clause
17. List expression type inference
18. Record update semantics incomplete
19. Lambda expression annotations unclear
20. Operator sections not documented
21. Pipe operator precedence missing

### Pattern Matching (Phase 4)
22. Or-pattern variable binding rules
23. Nested pattern depth and combinations
24. Record pattern spread and partial matching
25. List pattern spread positions
26. Guard evaluation order and scope
27. Pattern type annotations
28. As-patterns and other forms

### JS Interop (Phase 5)
29. External function generics
30. Overloaded external edge cases
31. Unsafe block nesting
32. FFI type safety boundaries
33. Vibefun to JS calling conventions
34. String concatenation type rules

### Stdlib & Compilation (Phase 6)
35. Complete standard library reference
36. Missing modules (Array, Map, Set, Math)
37. Error handling semantics
38. Lexical structure details
39. Desugaring transformations

### Implementation Guide (Phase 7)
40. Compilation strategies for all constructs
41. Type representations in JavaScript
42. Runtime checking implementation
43. Error message guidelines
44. AST specifications
45. Type inference implementation
46. Exhaustiveness checking algorithm

## Design Decisions Log

This section will be updated as design decisions are made during documentation.

### Decisions Made

*(To be filled in as work progresses)*

## Notes

- All ambiguities should be resolved with explicit design decisions
- Examples should be added for all edge cases
- Implementation guide should be comprehensive enough for independent implementation
