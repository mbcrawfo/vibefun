# Evaluation Order

This document specifies the evaluation order guarantees for Vibefun expressions. Understanding evaluation order is critical when expressions have side effects (e.g., mutable references, external function calls).

## Overview

Vibefun provides **strict evaluation** (eager evaluation) with **well-defined evaluation order** for most constructs. This ensures predictable behavior when side effects are present.

### General Principles

1. **Strict evaluation**: Expressions are evaluated when encountered, not lazily
2. **Left-to-right**: Most compound expressions evaluate sub-expressions left-to-right
3. **Once only**: Each expression is evaluated exactly once (except in loops)
4. **Short-circuit**: Boolean operators `&&` and `||` short-circuit (right side not evaluated if not needed)

---

## Function Application

### Argument Evaluation

When calling a function, arguments are evaluated **left-to-right** before the function body executes.

**Guarantee:** For `f(arg1, arg2, arg3)`:
1. `arg1` is evaluated first
2. `arg2` is evaluated second
3. `arg3` is evaluated third
4. Then `f` is called with the evaluated values

**Example with side effects:**
```vibefun
mut x = 0

let sideEffect = (n) => {
  x := !x + n;
  !x
}

// Arguments evaluated left-to-right
let result = add(sideEffect(1), sideEffect(10))
// After evaluation: x = 11, result = 12 (1 + 11)
```

### Partial Application

**Partial application does not evaluate the function body** - it only captures arguments.

**Example:**
```vibefun
mut x = 0

let makeIncrementer = (n) => {
  x := !x + n;  // Not evaluated during partial application
  (y) => !x + y
}

let inc5 = makeIncrementer(5)  // x is still 0 (body not executed)
let result = inc5(3)            // Now x becomes 5, result is 8
```

### Function Expression Evaluation

The function expression itself is evaluated before its arguments.

**Guarantee:** For `f()(arg)`:
1. `f()` is evaluated first (returns a function)
2. `arg` is evaluated second
3. The returned function is called with `arg`

---

## Binary Operators

### Arithmetic and Comparison Operators

Arithmetic (`+`, `-`, `*`, `/`, `%`) and comparison (`<`, `>`, `<=`, `>=`, `==`, `!=`) operators evaluate **left-to-right**.

**Guarantee:** For `a + b`:
1. `a` is evaluated first
2. `b` is evaluated second
3. The operation is performed

**Example:**
```vibefun
mut x = 5

let inc = () => {
  x := !x + 1;
  !x
}

let result = inc() + inc()
// First inc(): x becomes 6, returns 6
// Second inc(): x becomes 7, returns 7
// Result: 6 + 7 = 13
```

### Logical Operators (Short-Circuit)

Logical operators `&&` (and) and `||` (or) use **short-circuit evaluation**.

#### And Operator (`&&`)

**Guarantee:** For `a && b`:
1. `a` is evaluated first
2. If `a` is `false`, return `false` **without evaluating `b`**
3. If `a` is `true`, evaluate `b` and return its value

**Example:**
```vibefun
mut x = 0

let sideEffect = (value) => {
  x := !x + 1;
  value
}

let result = sideEffect(false) && sideEffect(true)
// Only first sideEffect() is called
// x = 1 (not 2), result = false
```

#### Or Operator (`||`)

**Guarantee:** For `a || b`:
1. `a` is evaluated first
2. If `a` is `true`, return `true` **without evaluating `b`**
3. If `a` is `false`, evaluate `b` and return its value

**Example:**
```vibefun
mut x = 0

let sideEffect = (value) => {
  x := !x + 1;
  value
}

let result = sideEffect(true) || sideEffect(false)
// Only first sideEffect() is called
// x = 1 (not 2), result = true
```

### String Concatenation (`++`)

String concatenation evaluates **left-to-right**, like arithmetic operators.

**Guarantee:** For `a ++ b`:
1. `a` is evaluated first
2. `b` is evaluated second
3. Strings are concatenated

---

## Composite Expressions

### Record Construction

Record fields are evaluated **left-to-right** in source order.

**Guarantee:** For `{ x: expr1, y: expr2, z: expr3 }`:
1. `expr1` is evaluated first
2. `expr2` is evaluated second
3. `expr3` is evaluated third
4. Record is constructed with evaluated values

**Example:**
```vibefun
mut count = 0

let next = () => {
  count := !count + 1;
  !count
}

let record = { a: next(), b: next(), c: next() }
// record = { a: 1, b: 2, c: 3 }
```

**Note:** Field order in the type is irrelevant, but field order in the literal determines evaluation order.

### Record Update

For record update with spread, evaluation proceeds **left-to-right**.

**Guarantee:** For `{ ...base, field: newValue }`:
1. `base` is evaluated first
2. `newValue` is evaluated second
3. Updated record is created

**Example:**
```vibefun
mut count = 0

let next = () => {
  count := !count + 1;
  !count
}

let base = { a: 0, b: 0 }
let updated = { ...getBase(), a: next() }
// getBase() evaluated before next()
```

### List Construction

List elements are evaluated **left-to-right**.

**Guarantee:** For `[expr1, expr2, expr3]`:
1. `expr1` is evaluated first
2. `expr2` is evaluated second
3. `expr3` is evaluated third
4. List is constructed

**Example:**
```vibefun
mut count = 0

let next = () => {
  count := !count + 1;
  !count
}

let list = [next(), next(), next()]
// list = [1, 2, 3]
```

### List Cons (`::`)

The cons operator evaluates **left-to-right** (head before tail).

**Guarantee:** For `head :: tail`:
1. `head` is evaluated first
2. `tail` is evaluated second
3. New list is constructed

### Tuple Construction

Tuple elements are evaluated **left-to-right** (like record fields).

**Guarantee:** For `(expr1, expr2, expr3)`:
1. `expr1` is evaluated first
2. `expr2` is evaluated second
3. `expr3` is evaluated third
4. Tuple is constructed

---

## Control Flow

### If Expressions

If expressions evaluate the condition, then **exactly one** branch.

**Guarantee:** For `if condition then thenExpr else elseExpr`:
1. `condition` is evaluated first
2. If `condition` is `true`, evaluate `thenExpr` only (skip `elseExpr`)
3. If `condition` is `false`, evaluate `elseExpr` only (skip `thenExpr`)

**Example:**
```vibefun
mut x = 0

let inc = () => {
  x := !x + 1;
  !x
}

let result = if true then inc() else inc()
// Only one inc() is called
// x = 1, result = 1
```

### Match Expressions

Match expressions evaluate the scrutinee once, then test patterns **top-to-bottom** until a match.

**Guarantee:** For `match scrutinee { | pattern1 => expr1 | pattern2 => expr2 }`:
1. `scrutinee` is evaluated **exactly once**
2. Patterns are tested top-to-bottom
3. When a pattern matches:
   - If there's a guard, evaluate the guard
   - If guard passes (or no guard), evaluate the corresponding expression
   - Skip all subsequent patterns
4. Pattern-bound variables are in scope for the branch expression

**Example:**
```vibefun
mut evaluations = 0

let trackEval = (value) => {
  evaluations := !evaluations + 1;
  value
}

match trackEval(Some(5)) {
  | Some(x) when x > 10 => "big"
  | Some(x) => "small"
  | None => "none"
}
// trackEval() called exactly once (evaluations = 1)
// First pattern matches, guard fails, second pattern matches
```

### While Loops

While loops evaluate the condition before each iteration.

**Guarantee:** For `while condition { body }`:
1. Evaluate `condition`
2. If `condition` is `true`:
   - Evaluate `body`
   - Go back to step 1
3. If `condition` is `false`:
   - Exit loop (return `()`)

**Note:** The loop body may be executed zero or more times.

---

## Block Expressions

Blocks evaluate expressions **sequentially** (top-to-bottom), returning the last expression's value.

**Guarantee:** For `{ expr1; expr2; expr3 }`:
1. `expr1` is evaluated first (result discarded)
2. `expr2` is evaluated second (result discarded)
3. `expr3` is evaluated third (result returned)

**Example:**
```vibefun
mut x = 0

let block = {
  x := !x + 1;  // x becomes 1
  x := !x + 1;  // x becomes 2
  !x            // Returns 2
}
// block = 2, x = 2
```

### Unit Expressions

Expressions that return `Unit` (`()`) are typically used for side effects. When semicolon-terminated, the result is discarded.

**Example:**
```vibefun
{
  log("first");   // Evaluated for side effect, result () is discarded
  log("second");  // Evaluated for side effect, result () is discarded
  42              // Returned as block value
}
```

---

## Pipe Operator

The pipe operator (`|>`) evaluates **left-to-right** with clear sequencing.

**Guarantee:** For `a |> f |> g`:
1. `a` is evaluated first
2. `f` is called with `a`'s result
3. `g` is called with result of `f(a)`

This is equivalent to `g(f(a))`.

**Example with side effects:**
```vibefun
mut trace = []

let track = (name) => (value) => {
  trace := trace ++ [name];
  value
}

let result = 5 |> track("f") |> track("g") |> track("h")
// trace = ["f", "g", "h"]
// Functions called in left-to-right order
```

### Pipe with Multi-Argument Functions

When piping to multi-argument functions, the piped value becomes the **last argument**.

**Guarantee:** For `value |> f(arg1, arg2)`:
1. `value` is evaluated first
2. `arg1` is evaluated second
3. `arg2` is evaluated third
4. `f(arg1, arg2, value)` is called

---

## Reference Operations

### Reference Creation (`mut`)

Reference creation evaluates the initial value, then creates the reference.

**Guarantee:** For `mut x = expr`:
1. `expr` is evaluated first
2. A new mutable reference is created with the evaluated value
3. The reference is bound to `x`

### Reference Assignment (`:=`)

Reference assignment evaluates the new value, then updates the reference.

**Guarantee:** For `ref := expr`:
1. `ref` is evaluated first (to get the reference)
2. `expr` is evaluated second
3. The reference is updated with the new value
4. Returns `()`

**Example:**
```vibefun
mut x = 0
mut y = 10

let getRef = () => {
  log("getting ref");
  x
}

let getValue = () => {
  log("getting value");
  !y
}

getRef() := getValue()
// Output:
// "getting ref"
// "getting value"
// x is updated to 10
```

### Reference Dereference (`!`)

Dereference evaluates the reference expression, then reads the value.

**Guarantee:** For `!ref`:
1. `ref` is evaluated first
2. The current value is read from the reference

---

## External Function Calls

External (JavaScript) function calls follow the same evaluation order as Vibefun functions.

**Guarantee:** For external function calls:
1. Arguments are evaluated left-to-right
2. The external function is called with evaluated arguments
3. Side effects in arguments occur in left-to-right order

**Note:** External functions may have their own internal evaluation order, but Vibefun guarantees argument evaluation order.

---

## Unspecified Evaluation Order

The following have **unspecified** or **implementation-defined** evaluation order:

### Compiler Optimizations

Compilers may reorder evaluations if they can prove no observable difference in behavior (e.g., pure expressions with no side effects).

**Example:** For `add(f(x), g(y))` where `f` and `g` are pure, the compiler might evaluate `g(y)` before `f(x)`.

**Recommendation:** Don't rely on evaluation order for pure expressions when reasoning about code. Use explicit sequencing for side effects.

### Pattern Matching Internals

The specific order in which patterns test nested structure is implementation-defined, as long as the semantic guarantees (match once, test top-to-bottom) are preserved.

---

## Summary Table

| Construct | Evaluation Order | Short-Circuit |
|-----------|-----------------|---------------|
| Function application `f(a, b, c)` | Left-to-right (a, b, c, then f) | No |
| Binary operators `a + b` | Left-to-right (a, then b) | No |
| Logical AND `a && b` | Left-to-right (a, then b if needed) | Yes (b skipped if a is false) |
| Logical OR `a \|\| b` | Left-to-right (a, then b if needed) | Yes (b skipped if a is true) |
| Record `{ x: a, y: b }` | Left-to-right (a, then b) | No |
| List `[a, b, c]` | Left-to-right (a, then b, then c) | No |
| Tuple `(a, b, c)` | Left-to-right (a, then b, then c) | No |
| If `if c then t else e` | c, then t or e (not both) | Yes (one branch only) |
| Match `match s { ... }` | s once, then patterns top-to-bottom | Yes (stops at first match) |
| Block `{ a; b; c }` | Sequential (a, then b, then c) | No |
| Pipe `a \|> f \|> g` | Left-to-right (a, then f, then g) | No |
| Assignment `r := v` | r, then v | No |

---

## Best Practices

1. **Minimize side effects**: Prefer pure functions to avoid reasoning about evaluation order
2. **Use blocks for sequencing**: Make side effect order explicit with block expressions
3. **Avoid side effects in guards**: Guards may be evaluated multiple times during pattern compilation
4. **Document side effects**: When using side effects, document the expected evaluation order
5. **Use mutable references sparingly**: Prefer pure transformations over mutation when possible

---

## Examples

### Complex Expression with Side Effects

```vibefun
mut counter = 0

let next = () => {
  counter := !counter + 1;
  !counter
}

let result = {
  let a = next();              // counter = 1, a = 1
  let b = next();              // counter = 2, b = 2
  let record = {
    x: next(),                 // counter = 3, x = 3
    y: next()                  // counter = 4, y = 4
  };
  let list = [next(), next()]; // counter = 6, list = [5, 6]
  (a, b, record, list)
}
// result = (1, 2, { x: 3, y: 4 }, [5, 6])
// counter = 6
```

### Evaluation Order with Conditionals

```vibefun
mut trace = []

let track = (name, value) => {
  trace := trace ++ [name];
  value
}

let result = if track("cond", true)
  then track("then", 10)
  else track("else", 20)

// trace = ["cond", "then"]
// result = 10
// "else" was never evaluated
```

### Short-Circuit in Practice

```vibefun
// Safe division with short-circuit
let safeDivide = (numerator, denominator) =>
  denominator != 0 && (numerator / denominator > 100)

// Division only happens if denominator != 0
let result = safeDivide(1000, 0)  // false, no division error
```
