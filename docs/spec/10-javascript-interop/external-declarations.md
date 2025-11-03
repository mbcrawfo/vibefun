# External Declarations

### External Declarations

The `external` keyword declares JavaScript values with their types.

#### Single External Declarations

```vibefun
// Declare JS function
external console_log: (String) -> Unit = "console.log"

// From specific module
external fetch: (String) -> Promise<Response> = "fetch" from "node-fetch"

// JS constants
external process_env: JsObject = "process.env" from "process"

// Exported external (can be imported by other modules)
export external myHelper: (Int) -> String = "helper"
```

#### External Blocks

When wrapping JavaScript libraries, use external blocks to declare multiple bindings at once:

```vibefun
// Simple external block
external {
    log: (String) -> Unit = "console.log"
    error: (String) -> Unit = "console.error"
    warn: (String) -> Unit = "console.warn"
}

// External block with module import
external from "node-fetch" {
    fetch: (String, RequestInit) -> Promise<Response> = "fetch"
    Headers: Type = "Headers"
    Request: Type = "Request"
}

// Exported external block
export external from "react" {
    useState: (a) -> (a, (a) -> Unit) = "useState"
    useEffect: ((Unit) -> Unit, List<a>) -> Unit = "useEffect"
}
```

#### Overloaded External Functions

Many JavaScript APIs have functions with multiple signatures (overloading). Vibefun supports declaring multiple external signatures for the same JavaScript function:

```vibefun
// Multiple separate declarations for the same JS function
external fetch: (String) -> Promise<Response> = "fetch"
external fetch: (String, RequestInit) -> Promise<Response> = "fetch"

// Or grouped in an external block
external {
    setTimeout: ((Unit) -> Unit, Int) -> TimeoutId = "setTimeout"
    setTimeout: ((Unit) -> Unit, Int, Any) -> TimeoutId = "setTimeout"
}

// With module imports
external from "node:timers" {
    setTimeout: ((Unit) -> Unit, Int) -> TimeoutId = "setTimeout"
    setTimeout: ((Unit) -> Unit, Int, Any) -> TimeoutId = "setTimeout"
}
```

**Overload Resolution:**

The compiler automatically selects the correct overload based on the number of arguments at the call site:

```vibefun
unsafe {
    // Calls first overload: (String) -> Promise<Response>
    fetch("https://api.example.com/users")

    // Calls second overload: (String, RequestInit) -> Promise<Response>
    fetch("https://api.example.com/users", { method: "POST" })

    // Calls first setTimeout overload
    setTimeout(callback, 1000)

    // Calls second setTimeout overload
    setTimeout(callback, 1000, extraArg)
}
```

**Restrictions:**

- Only `external` functions can be overloaded (not pure Vibefun functions)
- All overloads must map to the same JavaScript function name
- All overloads must have the same `from` module (if specified)
- All overloads must be function types
- Overloads are resolved by argument count (arity)

**Error Messages:**

Clear errors when no overload matches or the call is ambiguous:

```vibefun
external fetch: (String) -> Promise<Response> = "fetch"
external fetch: (String, RequestInit) -> Promise<Response> = "fetch"

unsafe {
    fetch()  // Error: No matching signature for 'fetch'
             // Expected 1 or 2 arguments, but got 0

    fetch("url", options, extra)  // Error: No matching signature for 'fetch'
                                   // Expected 1 or 2 arguments, but got 3
}
```

**When to Use Overloading:**

Overloading is designed for JavaScript interop where the underlying JS function has multiple signatures. For pure Vibefun code, prefer pattern matching or different function names:

```vibefun
// Instead of overloading (not supported for pure Vibefun):
// let process = (x: Int) => ...
// let process = (x: String) => ...

// Use pattern matching:
let process = (x) => match x {
    | n: Int => n * 2
    | s: String => s & s
}

// Or use different names:
let processInt = (n: Int) => n * 2
let processString = (s: String) => s & s
```

#### Overloaded Externals Edge Cases

**Return type differences:**
```vibefun
// ✅ OK: Different return types allowed
external parse: (String) -> Int = "parseInt"
external parse: (String, Int) -> Int = "parseInt"  // With radix

// Return types can differ completely
external getValue: (String) -> String = "getValue"
external getValue: (Int) -> Bool = "getValue"
```

**Curried vs uncurried overloads:**
```vibefun
// ❌ Error: Cannot mix curried and uncurried forms for same function
external foo: (Int) -> Int = "foo"
external foo: (Int, Int) -> Int = "foo"  // Different arity: OK

// But this is confusing (same arity, different currying):
// external bar: (Int) -> (Int) -> Int = "bar"  // Arity 1 (returns function)
// external bar: (Int, Int) -> Int = "bar"      // Arity 2
// These are actually the SAME type (auto-currying), so no overloading needed
```

**Partial application with overloads:**
```vibefun
external fetch: (String) -> Promise<Response> = "fetch"
external fetch: (String, RequestInit) -> Promise<Response> = "fetch"

// Partial application resolves overload immediately
let fetchWithOptions = fetch("https://api.example.com")
// Type: (RequestInit) -> Promise<Response>
// Overload resolution: chose first signature (1 arg provided)

// To use second overload with partial application:
let fetchPost = (url) => fetch(url, { method: "POST" })
```

#### Generic External Declarations

External declarations can be generic, allowing JavaScript functions to work with any Vibefun type:

```vibefun
// Generic external function
external map: <A, B>(Array<A>, (A) -> B) -> Array<B> = "map" from "array-utils"

// Multiple type parameters
external zip: <A, B>(Array<A>, Array<B>) -> Array<(A, B)> = "zip"

// Higher-order generic function
external compose: <A, B, C>((B) -> C, (A) -> B) -> (A) -> C = "compose"

// Generic with constraints (implied by usage)
external sort: <T>(Array<T>, (T, T) -> Int) -> Array<T> = "sort"
```

**Type parameter resolution:**
- Type parameters are inferred at call sites
- No explicit type application syntax (type inference handles it)
- Generic externals work like generic Vibefun functions

```vibefun
unsafe {
    let numbers = [3, 1, 4, 1, 5]
    let doubled = map(numbers, (x) => x * 2)  // <Int, Int> inferred

    let strings = ["a", "b", "c"]
    let lengths = map(strings, String.length)  // <String, Int> inferred
}
```

**Limitations:**
- Generic externals cannot be overloaded (each signature must have distinct arity)
- Type parameters must be consistently used across the function signature
- No higher-kinded types in external declarations

#### External Type Declarations

Declare the shape of JavaScript objects within external blocks:

```vibefun
external {
    // Declare types for JS objects
    type Response = { ok: Bool, status: Int, json: (Unit) -> Promise<Json> }
    type RequestInit = { method: String, headers: JsObject }

    // Then declare functions that use those types
    fetch: (String, RequestInit) -> Promise<Response> = "fetch"
}

// Or separately
external from "node-fetch" {
    type Response = { ok: Bool, status: Int }
    type Headers = { append: (String, String) -> Unit }

    fetch: (String) -> Promise<Response> = "fetch"
    Headers: Type = "Headers"
}

// Generic type declarations
external {
    type Promise<T> = {
        then: <U>((T) -> U) -> Promise<U>,
        catch: ((Error) -> T) -> Promise<T>
    }
}
```

**Syntax Summary:**

```vibefun
// Single declaration
external name: Type = "jsName" [from "module"]

// Simple block
external {
    name1: Type1 = "jsName1"
    name2: Type2 = "jsName2"
    type TypeName = { ... }
}

// Block with module import
external from "module" {
    name: Type = "jsName"
    type TypeName = { ... }
}

// Exported (applies to both single and blocks)
export external name: Type = "jsName"
export external { ... }
export external from "module" { ... }
```

