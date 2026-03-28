# Spec Validation Test Authoring Guide

## Core Principle

Each test should validate ONLY the feature being tested, using the minimal set of additional language features. This prevents false negatives when an unrelated feature is broken.

## Avoiding Feature Coupling

### Boolean-to-String Conversion

Use `String.fromBool(x)` instead of `if x then "true" else "false"`:

```typescript
// Good - uses stdlib, no control flow dependency
withOutput(`let x = 1 == 1;`, `String.fromBool(x)`)

// Bad - couples your test to if-then-else working correctly
withOutput(`let x = 1 == 1;`, `if x then "true" else "false"`)
```

### Numeric Output

Use `String.fromInt(x)` and `String.fromFloat(x)` for numeric-to-string conversion.

### Conditional Logic in Test Code

Use `match` with guards instead of `if-then-else` for conditional logic:

```
// Good - uses pattern matching
match n {
  | x when x <= 1 => 1
  | x => x * factorial(x - 1)
}

// Bad - depends on if-then-else
if n <= 1 then 1 else n * factorial(n - 1)
```

## Broken Features

When a language feature is currently broken, tests that specifically validate that feature should be skipped rather than left to fail:

```typescript
import { skip } from "../framework/helpers.js";

test(S, "specRef", "test name", () =>
    skip("if-then-else is currently broken"),
);
```

Tests that are NOT testing the broken feature but were incidentally using it should be rewritten to avoid the broken feature entirely.
