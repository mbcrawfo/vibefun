<!-- THIS FILE IS AUTO-GENERATED. DO NOT EDIT MANUALLY. -->
<!-- Run 'pnpm run docs:errors' to regenerate. -->


# Desugarer Errors

Errors during desugaring (syntax transformation)

## Overview

| Code | Name | Severity |
|------|------|----------|
| [VF3101](#vf3101) | UndefinedListElement | **Error** |
| [VF3102](#vf3102) | OrPatternTooLarge | **Error** |

---

## VF3101

**UndefinedListElement** **Error**

### Message

> List element at index {index} is undefined

### Explanation

The list contains an undefined element at the specified position. This typically indicates an issue with list pattern or literal construction where an element was expected but not provided.

### Example

**Problem:**

```vibefun
let [a, b] = list  // where list has fewer than 2 elements
```

**Solution:**

```vibefun
let [a, b] = [1, 2]  // proper list with 2 elements
```

*Ensure the list has the expected number of defined elements*

### Hint

> Check that all list elements are properly defined


---

## VF3102

**OrPatternTooLarge** **Error**

### Message

> Or-pattern would expand to {count} cases, which exceeds the limit of {max}

### Explanation

Or-patterns are compiled by distributing their alternatives, so nesting them inside constructors, tuples, or other or-patterns multiplies the number of emitted match arms. A cap prevents a single surface arm from silently producing an enormous match.

### Example

**Problem:**

```vibefun
match x {
  | (1 | 2 | 3, 1 | 2 | 3, 1 | 2 | 3, 1 | 2 | 3, 1 | 2 | 3) => ...
}
```

**Solution:**

```vibefun
match x {
  | (a, b, c, d, e) when a < 4 && b < 4 => ...
}
```

*Use a guard for broad numeric predicates instead of exhaustive or-alternatives*

### Hint

> Simplify the pattern, or split the arm so each or-pattern has fewer nested alternatives

