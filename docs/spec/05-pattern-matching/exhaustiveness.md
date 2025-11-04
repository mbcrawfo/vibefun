# Exhaustiveness Checking

### Exhaustiveness Checking

The compiler performs **exhaustiveness checking** to ensure all possible values are handled by match patterns.

#### Exhaustiveness Algorithm

The type checker uses a **pattern matrix algorithm** to determine if a match is exhaustive. This algorithm is based on the approach used in OCaml and Standard ML compilers.

**High-level overview:**

1. **Construct pattern matrix**: Each match arm becomes a row
2. **Check coverage**: For each possible value of the scrutinee type, verify at least one pattern matches
3. **Report missing patterns**: If any values are uncovered, report them

**Detailed algorithm:**

The exhaustiveness checker works by computing the set of values **not covered** by the patterns. If this set is empty, the match is exhaustive.

**Algorithm steps:**

1. **Initialize:** Start with the pattern matrix `P` where each row is a pattern from a match arm
2. **Compute uncovered values:** Call `U(P, T)` where `T` is the type of the scrutinee
3. **Result:**
   - If `U(P, T)` returns empty set: match is exhaustive
   - If `U(P, T)` returns non-empty set: match is non-exhaustive, report missing patterns

**Computing uncovered values `U(P, T)`:**

The function `U(P, T)` computes the set of values of type `T` that are **not** matched by any pattern in `P`.

**Base cases:**

- `U([], T) = {_}` - Empty pattern matrix doesn't cover anything (return wildcard representing all values)
- `U([[_], ...], T) = {}` - Wildcard pattern covers everything (return empty set)
- `U([[x], ...], T) = {}` - Variable pattern covers everything (return empty set)

**Recursive cases:**

**For variant patterns:**

If the first pattern in the first row is a variant constructor `C(p1, ..., pn)`:

1. **Specialize** the matrix for constructor `C`: Keep only rows starting with `C`, expand constructor arguments
2. **Default** matrix: Keep only rows starting with wildcard/variable (that could match other constructors)
3. Recursively check both matrices
4. Combine results

**For literal patterns (Int, String, Bool):**

- Check coverage of literal values
- For finite types (Bool), enumerate all constructors
- For infinite types (Int, String), require wildcard/variable pattern

**For record patterns:**

- Expand record fields
- Check exhaustiveness of each field recursively

**For list patterns:**

- Treat list patterns as variant constructors:
  - `[]` as `Nil` constructor
  - `[head, ...tail]` as `Cons(head, tail)` constructor

**For tuple patterns:**

- Expand tuple components
- Check exhaustiveness of each component

**Example: Checking Option<Int>**

```vibefun
match opt {
    | Some(0) => "zero"
    | Some(_) => "nonzero"
    | None => "none"
}
```

**Pattern matrix:**
```
[ Some(0) ]
[ Some(_) ]
[ None    ]
```

**Algorithm execution:**

1. Type `T = Option<Int>` has constructors: `Some`, `None`
2. **Specialize for `Some`:**
   - Extract patterns matching `Some`: `[0]`, `[_]`
   - Check `U([[0], [_]], Int)`:
     - First row has literal `0`, not wildcard
     - Second row has wildcard `_`, covers all
     - Result: `{}` (exhaustive for `Some` branch)
3. **Specialize for `None`:**
   - Extract patterns matching `None`: `[]` (third row)
   - None takes no arguments, so exhaustive
4. **Combine:** Both `Some` and `None` are covered → exhaustive

**Example: Non-exhaustive match**

```vibefun
match opt {
    | Some(x) => x
}
```

**Pattern matrix:**
```
[ Some(x) ]
```

**Algorithm execution:**

1. Type `T = Option<Int>` has constructors: `Some`, `None`
2. **Specialize for `Some`:** Covered (pattern `Some(x)`)
3. **Specialize for `None`:** NOT covered (no pattern for `None`)
4. **Result:** Missing pattern `None`

#### Or-Pattern Handling

Or-patterns are **expanded** during exhaustiveness checking. Each or-pattern is treated as if it were multiple separate patterns.

**Example:**

```vibefun
match x {
    | 0 | 1 | 2 => "small"
    | _ => "large"
}
```

**Expanded pattern matrix:**
```
[ 0 ]
[ 1 ]
[ 2 ]
[ _ ]
```

The exhaustiveness checker analyzes the expanded matrix, treating each alternative as a separate row.

#### Nested Pattern Handling

Nested patterns are checked recursively by expanding the pattern matrix.

**Example:**

```vibefun
match pair {
    | (Some(x), Some(y)) => x + y
    | (Some(x), None) => x
    | (None, Some(y)) => y
    | (None, None) => 0
}
```

**Pattern matrix:**
```
[ (Some(x), Some(y)) ]
[ (Some(x), None)    ]
[ (None,    Some(y)) ]
[ (None,    None)    ]
```

**Algorithm execution:**

1. Scrutinee type: `(Option<Int>, Option<Int>)`
2. Expand tuple: Check exhaustiveness of each component
3. First component: `[Some(x), Some(x), None, None]` - covers both `Some` and `None`
4. Second component (when first is `Some`): `[Some(y), None]` - covers both
5. Second component (when first is `None`): `[Some(y), None]` - covers both
6. **Result:** Exhaustive

**Constructor Arity Checking:**

The algorithm verifies that patterns use the correct number of arguments for each constructor:

```vibefun
type MyType = A(Int) | B(Int, Int) | C

match x {
    | A(n) => n        // ✅ A takes 1 argument
    | B(n, m) => n + m // ✅ B takes 2 arguments
    | C => 0           // ✅ C takes 0 arguments
}
```

**Type error if arity is wrong:**

```vibefun
match x {
    | A(n, m) => n + m  // ❌ Error: A expects 1 argument, got 2
    | B(n) => n         // ❌ Error: B expects 2 arguments, got 1
}
```

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

