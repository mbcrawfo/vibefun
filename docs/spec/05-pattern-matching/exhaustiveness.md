# Exhaustiveness Checking

### Exhaustiveness Checking

The compiler performs **exhaustiveness checking** to ensure all possible values are handled by match patterns.

#### Exhaustiveness Algorithm

The type checker uses a **pattern matrix algorithm** to determine if a match is exhaustive:

1. **Construct pattern matrix**: Each match arm becomes a row
2. **Check coverage**: For each possible value of the scrutinee type, verify at least one pattern matches
3. **Report missing patterns**: If any values are uncovered, report them

**Example: Exhaustive match**
```vibefun
// ✅ Exhaustive: all Option values covered
match opt {
    | Some(x) => x
    | None => 0
}

// ✅ Exhaustive: wildcard catches all remaining
match n {
    | 0 => "zero"
    | _ => "non-zero"
}
```

**Example: Non-exhaustive match**
```vibefun
// ❌ Non-exhaustive: missing None case
match opt {
    | Some(x) => x
}
// Error: Non-exhaustive match, missing pattern: None

// ❌ Non-exhaustive: missing cases
match color {
    | Red => "red"
    | Green => "green"
}
// Error: Non-exhaustive match, missing pattern: Blue
```

#### Wildcard Pattern Requirement

For types with infinitely many values (Int, String, records), the compiler **requires** a wildcard or variable pattern:

```vibefun
// ❌ Non-exhaustive: Int has infinite values
match n {
    | 0 => "zero"
    | 1 => "one"
    | 2 => "two"
}
// Error: Non-exhaustive match, missing cases for other Int values

// ✅ Exhaustive: wildcard catches remaining cases
match n {
    | 0 => "zero"
    | 1 => "one"
    | _ => "other"
}
```

#### Exhaustiveness with Guards

Guards **do not affect** exhaustiveness checking. The compiler analyzes patterns **without** considering guard conditions:

```vibefun
// ❌ Non-exhaustive: guards don't count toward coverage
match n {
    | x when x > 0 => "positive"
    | x when x < 0 => "negative"
}
// Error: Non-exhaustive match
// Even though guards cover all cases, compiler doesn't analyze guard logic

// ✅ Exhaustive: add fallback pattern
match n {
    | x when x > 0 => "positive"
    | x when x < 0 => "negative"
    | _ => "zero"
}
```

**Rationale:** Analyzing guard expressions for exhaustiveness is undecidable in general. Requiring an explicit fallback pattern ensures soundness.

#### Exhaustiveness Error Messages

The compiler provides helpful error messages with suggested missing patterns:

```vibefun
match result {
    | Ok(Some(x)) => x
    | Ok(None) => 0
}
// Error: Non-exhaustive match
// Missing patterns:
//   - Err(_)
// Suggestion: Add pattern | Err(_) => ...

match status {
    | Pending => "pending"
}
// Error: Non-exhaustive match
// Missing patterns:
//   - Active
//   - Complete
// Suggestion: Add wildcard pattern | _ => ...
```

#### Unreachable Patterns

The compiler also warns about **unreachable patterns** (patterns that can never match):

```vibefun
match opt {
    | Some(x) => x
    | None => 0
    | _ => 42  // Warning: Unreachable pattern (all cases already covered)
}

match n {
    | _ => "any"
    | 0 => "zero"  // Warning: Unreachable pattern (wildcard already matches all)
}
```

---

