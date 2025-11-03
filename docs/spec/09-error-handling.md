# Error Handling

## Error Handling

Vibefun uses algebraic data types for error handling rather than exceptions.

### Runtime Error Semantics

Vibefun minimizes runtime errors through its type system, but some operations can still fail at runtime. This section defines the behavior of potentially failing operations.

#### Division by Zero

**Integer division** by zero causes a **runtime panic**:

```vibefun
let result = 10 / 0  // Runtime panic: "Division by zero"
```

**Float division** by zero follows IEEE 754 semantics:

```vibefefun
let result = 10.0 / 0.0    // Infinity
let result = -10.0 / 0.0   // -Infinity
let result = 0.0 / 0.0     // NaN
```

**Recommendation:** Use safe division functions that return `Result` or `Option`:

```vibefun
let safeDivide = (a, b) =>
    if b == 0
    then None
    else Some(a / b)
```

#### Integer Overflow

Vibefun integers are JavaScript numbers (53-bit safe integers). Operations that exceed `Number.MAX_SAFE_INTEGER` (2^53 - 1) or `Number.MIN_SAFE_INTEGER` (-(2^53 - 1)) **lose precision** but do not panic.

```vibefun
let maxSafe = 9007199254740991  // 2^53 - 1
let overflow = maxSafe + 1      // 9007199254740992 (exact)
let overflow2 = maxSafe + 2     // 9007199254740992 (NOT 9007199254740993 - precision lost!)
```

**Recommendation:**
- For large integers, use a BigInt library via FFI
- The compiler does not warn about overflow
- Test edge cases with large numbers

#### Float Special Values

Floats follow IEEE 754 semantics with three special values:

**NaN (Not a Number):**
```vibefun
let nan = 0.0 / 0.0
let nan2 = Math.sqrt(-1.0)

// NaN comparisons
nan == nan      // false (IEEE 754 behavior)
Float.isNaN(nan)  // true (use this instead)
```

**Infinity and -Infinity:**
```vibefun
let inf = 1.0 / 0.0
let negInf = -1.0 / 0.0

Float.isInfinite(inf)     // true
Float.isFinite(42.0)      // true
Float.isFinite(inf)       // false
```

**Operations with special values:**
```vibefun
inf + 1.0       // Infinity
inf * 2.0       // Infinity
inf - inf       // NaN
inf / inf       // NaN
0.0 * inf       // NaN
```

#### Array Bounds

Array access with out-of-bounds indices returns `None`:

```vibefun
let arr = Array.fromList([1, 2, 3])
let value = Array.get(arr, 10)  // None (no panic)

unsafe {
    Array.set(arr, 10, 42)  // Runtime panic: "Index out of bounds"
}
```

#### Panic

The `panic` function terminates the program with an error message:

```vibefun
let panic: (String) -> never
```

**Behavior:**
- Throws a JavaScript `Error` with the provided message
- Unrecoverable (cannot be caught in Vibefun code)
- Stops program execution immediately
- Stack trace is preserved for debugging

**When panic is used:**
- `unwrap()` on `None` or `Err`
- Division by zero (integer only)
- Array bounds violations in unsafe code
- Pattern match failures (non-exhaustive matches)
- Explicit calls to `panic()`

**Example:**
```vibefun
let unwrap = <T>(opt: Option<T>): T =>
    match opt {
        | Some(x) => x
        | None => panic("unwrap called on None")
    }

let value = unwrap(None)  // Runtime panic: "unwrap called on None"
```

#### Stack Overflow

Deeply nested recursion can cause stack overflow:

```vibefun
let rec infiniteLoop = () => infiniteLoop()
infiniteLoop()  // Runtime error: "Maximum call stack size exceeded"
```

**Recommendation:**
- Use tail recursion when possible (though JavaScript may not optimize it)
- Consider iterative approaches for deep recursion
- Use trampolining for complex recursive algorithms

#### Out of Memory

Large data structures can exhaust available memory:

```vibefun
let rec buildHugeList = (n) =>
    if n == 0
    then []
    else n :: buildHugeList(n - 1)

buildHugeList(100000000)  // May cause: "Out of memory"
```

**Note:** Memory errors are JavaScript runtime errors and cannot be caught in Vibefun.

#### Summary of Error Behaviors

| Operation | Behavior |
|-----------|----------|
| Integer division by zero | Panic |
| Float division by zero | Returns Infinity/NaN (IEEE 754) |
| Integer overflow | Silent precision loss (no panic) |
| Array out-of-bounds read | Returns `None` |
| Array out-of-bounds write | Panic |
| `panic()` call | Terminate with error |
| Stack overflow | JavaScript runtime error |
| Out of memory | JavaScript runtime error |
| Non-exhaustive pattern match | Compile-time error (prevented) |

### Result Type

```vibefun
type Result<T, E> = Ok(T) | Err(E)

let divide = (a, b) =>
    if b == 0
    then Err("Division by zero")
    else Ok(a / b)

let result = divide(10, 2)
match result {
    | Ok(value) => "Result: " &String.fromInt(value)
    | Err(msg) => "Error: " &msg
}
```

### Option Type

```vibefun
type Option<T> = Some(T) | None

let find = (list, predicate) => match list {
    | [] => None
    | [x, ...xs] => if predicate(x) then Some(x) else find(xs, predicate)
}
```

### Error Propagation

```vibefun
// Manual propagation
let getUserEmail = (id) => {
    let userResult = findUser(id)
    match userResult {
        | Ok(user) => validateEmail(user.email)
        | Err(e) => Err(e)
    }
}

// Using flatMap for chaining
let getUserEmail = (id) =>
    findUser(id)
    |> Result.flatMap((user) => validateEmail(user.email))
```

### Panic (Last Resort)

```vibefun
let panic: (String) -> <never> = ...

let unwrap = (opt) => match opt {
    | Some(x) => x
    | None => panic("unwrap called on None")
}
```

**Note:** Avoid `panic` in library code. Prefer `Result` or `Option`.

---

