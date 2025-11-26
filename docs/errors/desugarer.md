<!-- THIS FILE IS AUTO-GENERATED. DO NOT EDIT MANUALLY. -->
<!-- Run 'npm run docs:errors' to regenerate. -->


# Desugarer Errors

Errors during desugaring (syntax transformation)

## Overview

| Code | Name | Severity |
|------|------|----------|
| [VF3101](#vf3101) | UndefinedListElement | **Error** |

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

