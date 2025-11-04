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

See the [Pattern Matching](../05-pattern-matching/) section for complete documentation.

---

## While Loops

While loops provide imperative-style iteration when working with mutable references. They are expressions that return `Unit`.

### Syntax

```vibefun
while condition {
    body
}
```

### Semantics

- **Condition:** Must have type `Bool`
- **Body:** Executed repeatedly while condition is `true`, must have type `Unit`
- **Return value:** The entire while expression has type `Unit`
- **Evaluation:** Condition is checked before each iteration (pre-test loop)

### Examples

**Basic while loop:**

```vibefun
let mut i = ref(0)

while !i < 10 {
    unsafe { console.log(String.fromInt(!i)) }
    i := !i + 1
}
// Prints: 0 1 2 3 4 5 6 7 8 9
```

**Factorial with while loop:**

```vibefun
let factorial = (n: Int): Int => {
    let mut result = ref(1)
    let mut i = ref(1)

    while !i <= n {
        result := !result * !i
        i := !i + 1
    }

    !result
}

factorial(5)  // 120
```

**Early termination pattern:**

While loops don't have `break`, but you can use a boolean flag:

```vibefun
let mut i = ref(0)
let mut found = ref(false)

while !i < 100 && !(!found) {
    if someCondition(!i) then {
        found := true
    } else {
        i := !i + 1
    }
}
```

### Type Checking Rules

1. Condition expression must have type `Bool`
2. Body must have type `Unit`
3. The while expression has type `Unit`
4. All mutations must use `Ref<T>` with the `:=` operator

**Type errors:**

```vibefun
// ❌ Error: condition must be Bool
while 42 {  // Error: Expected Bool, got Int
    ()
}

// ❌ Error: body must be Unit
let mut x = ref(0)
while !x < 10 {
    !x + 1  // Error: Body has type Int, expected Unit
}

// ✅ OK: assign result to ref
while !x < 10 {
    x := !x + 1  // OK: := returns Unit
}
```

### Desugaring Transformation

While loops are **syntactic sugar** that desugar to recursive functions during compilation. This transformation is performed during the desugaring phase, before code generation.

**Surface syntax:**
```vibefun
while condition {
    body
}
```

**Core AST representation (desugared form):**
```vibefun
let rec __while_loop = () =>
    if condition then {
        body;
        __while_loop()
    } else ()

__while_loop()
```

**Example transformation:**

```vibefun
// Source code:
let mut i = ref(0)
while !i < 10 {
    i := !i + 1
}

// Desugars to:
let mut i = ref(0)
let rec __while_loop_1 = () =>
    if !i < 10 then {
        i := !i + 1;
        __while_loop_1()
    } else ()

__while_loop_1()
```

**Notes on desugaring:**
- Each while loop generates a unique recursive function name (e.g., `__while_loop_1`, `__while_loop_2`)
- The condition and body are captured in the closure
- Variables referenced in the condition/body are captured by the recursive function
- The body expression must end with a semicolon (`;`) before the recursive call to ensure proper sequencing
- The else branch returns `()` (Unit), so the entire expression has type `Unit`

### Evaluation Semantics

The evaluation of a while loop follows these precise steps:

1. **Evaluate the condition** expression
2. **If condition is `true`:**
   - Evaluate the body expression (discarding its result, which must be `Unit`)
   - Return to step 1 (re-evaluate the condition)
3. **If condition is `false`:**
   - Stop iteration and return `()` (Unit)

**Step-by-step evaluation example:**

```vibefun
let mut x = ref(0)
while !x < 3 {
    x := !x + 1
}

// Evaluation trace:
// 1. Evaluate condition: !x < 3 → 0 < 3 → true
//    Execute body: x := !x + 1 → x := 0 + 1 → x now holds 1
// 2. Evaluate condition: !x < 3 → 1 < 3 → true
//    Execute body: x := !x + 1 → x := 1 + 1 → x now holds 2
// 3. Evaluate condition: !x < 3 → 2 < 3 → true
//    Execute body: x := !x + 1 → x := 2 + 1 → x now holds 3
// 4. Evaluate condition: !x < 3 → 3 < 3 → false
//    Stop iteration, return ()
```

**Important semantic properties:**

- **Pre-test loop:** The condition is always evaluated **before** the body, so the body may execute zero times
- **Short-circuit:** Each iteration re-evaluates the condition fresh; changes to refs in the body affect the next condition evaluation
- **Scope:** The while loop body creates a new scope, but captured variables (refs) retain their identity across iterations
- **Return value:** While loops always return `()` regardless of how many iterations execute
- **No break/continue:** Vibefun does not support `break` or `continue` keywords; use conditional logic with refs to exit early

**Zero-iteration example:**

```vibefun
let mut x = ref(10)
while !x < 5 {
    // This body never executes
    x := !x + 1
}
// Returns () immediately, x remains 10
```

### Functional Alternative

While loops are useful for performance-critical code or when interfacing with imperative JavaScript, but recursive functions are often more idiomatic:

```vibefun
// While loop (imperative)
let sum = (n: Int): Int => {
    let mut total = ref(0)
    let mut i = ref(1)

    while !i <= n {
        total := !total + !i
        i := !i + 1
    }

    !total
}

// Recursive function (functional)
let rec sum = (n: Int): Int =>
    if n <= 0 then 0 else n + sum(n - 1)

// Or using List.fold
let sum = (n: Int): Int =>
    List.fold(List.range(1, n + 1), 0, (acc, x) => acc + x)
```

**When to use while loops:**
- Performance-critical tight loops
- Interfacing with imperative JavaScript code
- When mutation is clearer than recursion
- Implementing low-level algorithms

**When to use recursion:**
- Working with immutable data structures
- Expressing mathematical recurrence relations
- Leveraging pattern matching
- Most list/tree processing

### Performance Notes

- While loops are typically faster than recursion in JavaScript (no stack frames)
- However, JavaScript engines optimize tail recursion in some cases
- Prefer functional style unless profiling shows performance issues

---

## For Loops

**Status:** For loops are **not currently supported** in Vibefun.

For loops may be added in a future version. Until then, use functional list operations (`List.map`, `List.fold`, `List.filter`) or while loops for iteration.

**See:** **[Future Features: For Loops](../13-appendix/future-features.md#for-loops)** for alternatives and future design considerations.

---

## Async/Await

**Status:** Async/await is **reserved for future implementation** but not currently supported.

The keywords `async` and `await` are **reserved** and cannot be used as identifiers.

```vibefun
// ❌ Parse error: 'async' is a reserved keyword
let async = 42
```

**Current alternatives:** Use JavaScript Promises through external declarations and unsafe blocks.

**See:** **[Future Features: Async/Await](../13-appendix/future-features.md#asyncawait)** for workarounds and future design considerations.

---

## Try/Catch

**Status:** Try/catch is **not a Vibefun language feature**.

Vibefun uses `Result<T, E>` and `Option<T>` for error handling instead of exceptions.

**Error handling in Vibefun:**

```vibefun
// Use Result for operations that may fail
let divide = (a: Int, b: Int): Result<Int, String> =>
    if b == 0
    then Err("Division by zero")
    else Ok(a / b)

// Chain operations with flatMap
let compute = (x: Int, y: Int): Result<Int, String> =>
    divide(x, y)
        |> Result.flatMap((r) => divide(r, 2))
        |> Result.map((r) => r + 1)

// Handle errors with pattern matching
match compute(10, 0) {
    | Ok(value) => unsafe { console.log("Result: " & String.fromInt(value)) }
    | Err(msg) => unsafe { console.log("Error: " & msg) }
}
```

**JavaScript interop with try/catch:**

When calling JavaScript code that may throw exceptions, wrap it in `unsafe` blocks and convert to `Result`:

```vibefun
external jsonParse: (String) -> external = "JSON.parse" from "global"

let parseJSON = (jsonString: String): Result<external, String> =>
    unsafe {
        try {
            Ok(jsonParse(jsonString))
        } catch (e) {
            Err("Parse error: " & e.message)
        }
    }
```

**Note:** The `try/catch` syntax in the example above is **JavaScript syntax within an `unsafe` block**, not Vibefun syntax. Vibefun code cannot use try/catch; use `Result` instead.

**See also:**
- [Error Handling](../09-error-handling.md) - Complete error handling guide
- [Result Module](../11-stdlib/result.md) - Result type and combinators
- [Option Module](../11-stdlib/option.md) - Option type for nullable values

---

## Summary

**Supported control flow:**
- ✅ **If expressions** - Conditional branching with `if/then/else`
- ✅ **Match expressions** - Pattern matching with exhaustiveness checking
- ✅ **While loops** - Imperative iteration with mutable references

**Not supported (use alternatives):**
- ❌ **For loops** - Use `List.map`, `List.fold`, or while loops
- ❌ **Async/await** - Reserved for future; use JavaScript Promises via interop
- ❌ **Try/catch** - Use `Result<T, E>` and `Option<T>` for error handling

