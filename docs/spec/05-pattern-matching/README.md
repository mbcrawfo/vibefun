# Pattern Matching

Pattern matching is a powerful feature in Vibefun that allows deconstructing data structures and controlling program flow based on the shape and contents of values.

## Contents

1. **[Pattern Basics](./pattern-basics.md)** - Match expressions, literal, variable, and wildcard patterns
2. **[Data Patterns](./data-patterns.md)** - Variant, list, and record patterns
3. **[Advanced Patterns](./advanced-patterns.md)** - Nested patterns, guards, or-patterns, and as-patterns
4. **[Exhaustiveness Checking](./exhaustiveness.md)** - Type checking and exhaustiveness guarantees

## Overview

Vibefun's pattern matching provides:
- **Exhaustiveness checking**: The compiler ensures all cases are handled
- **Type safety**: Patterns are type-checked to prevent runtime errors
- **Destructuring**: Extract values from complex data structures
- **Guards**: Add conditional logic with `when` clauses
- **Or-patterns**: Match multiple patterns with a single arm
