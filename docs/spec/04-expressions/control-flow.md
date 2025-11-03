# Control Flow

### If Expressions

If expressions are expressions that evaluate to a value based on a condition. Both branches must have the same type.

```vibefun
let max = (a, b) =>
    if a > b then a else b

let sign = (x) =>
    if x > 0 then "positive"
    else if x < 0 then "negative"
    else "zero"
```

#### If-Then-Else (Complete Form)

The standard form requires both `then` and `else` branches:

```vibefun
// Basic if-then-else
let result = if condition then valueIfTrue else valueIfFalse

// Multi-line form
let result = if condition then
    expensiveComputation()
else
    defaultValue

// Nested if (else-if chain)
let category = if score >= 90 then "A"
    else if score >= 80 then "B"
    else if score >= 70 then "C"
    else if score >= 60 then "D"
    else "F"
```

**Type requirements:**
- The condition must have type `Bool`
- Both branches must have the **same type**
- The entire if expression has the type of the branches

```vibefun
let x = if true then 42 else 100  // Type: Int
let y = if false then "hello" else "world"  // Type: String

// ❌ Type error: branches have different types
let bad = if condition then 42 else "hello"
// Error: Expected Int in else branch, got String
```

#### If Without Else (Returns Unit)

If the `else` branch is omitted, the expression returns `()` (Unit) when the condition is false:

```vibefun
// If without else
if condition then sideEffect()
// Type: Unit (returns () when condition is false)

// Equivalent to:
if condition then sideEffect() else ()

// Useful for side effects
if debug then unsafe { console_log("Debug message") }

// The then branch must also have type Unit:
if condition then 42  // ❌ Error: then branch is Int, but if without else must have type Unit
```

**Rules for if without else:**
- The `then` branch **must** have type `Unit`
- The entire expression has type `Unit`
- Used for conditional side effects

```vibefun
// ✅ OK: then branch returns Unit
if condition then print("message")

// ✅ OK: block returns Unit
if condition then {
    doSomething();
    doSomethingElse()
}

// ❌ Error: then branch returns Int, not Unit
if condition then 42
```

#### If Expression Type Rules

**Type checking algorithm:**
1. Check condition has type `Bool`
2. Infer type of `then` branch → `T1`
3. If `else` present: Infer type of `else` branch → `T2`, unify `T1` with `T2`
4. If `else` omitted: Require `T1 = Unit`
5. Result type: `T1` (or `T2` if they're unified)

**Examples:**

```vibefun
// Both branches same type
let x: Int = if condition then 1 else 2  // OK

// Polymorphic if (type variable)
let id = (x) => if true then x else x  // OK: both branches are x

// Nested ifs
let result = if a then
    if b then 1 else 2
else
    if c then 3 else 4
// Type: Int

// If without else must be Unit
let action = if shouldAct then performAction()
// OK if performAction returns Unit
```

#### Short-Circuit Evaluation

If expressions use **short-circuit evaluation**:
- If condition is `true`: only `then` branch is evaluated
- If condition is `false`: only `else` branch is evaluated

```vibefun
// Safe: second branch never evaluated when x is 0
let safe = if x == 0 then 0 else 10 / x

// The unevaluated branch can have side effects
let result = if condition then
    unsafe { console_log("then branch") }
else
    unsafe { console_log("else branch") }
// Only one message is printed
```

### Match Expressions

Pattern matching with exhaustiveness checking.

```vibefun
let describe = (opt) => match opt {
    | Some(x) => "got " &String.fromInt(x)
    | None => "nothing"
}
```

