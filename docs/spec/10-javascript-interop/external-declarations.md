# External Declarations

### External Declarations

The `external` keyword declares JavaScript values with their types.

#### Opaque JavaScript Types

When interfacing with JavaScript, Vibefun provides several **opaque types** that represent JavaScript values without exposing their internal structure. These types can only be used within `unsafe` blocks or passed to `external` functions.

##### JsObject

Represents an arbitrary JavaScript object with unknown structure:

```vibefun
external process_env: JsObject = "process.env" from "process"
external fetch_options: JsObject = "..." from "..."

unsafe {
    let env = process_env  // JsObject - opaque, structure unknown
}
```

**Characteristics:**
- **Opaque**: Cannot access fields or methods directly in Vibefun code
- **Usage**: Pass to external functions that expect JavaScript objects
- **Type safety**: Minimal - represents "any JavaScript object"
- **Operations**: Can only be passed to externals or stored; no direct field access

**When to use:**
- When JavaScript API expects an options object with unknown/dynamic structure
- For third-party library objects you don't want to fully type
- As a type-safe alternative to `Any` when you know it's an object

##### Json

Represents JSON values (parsed or to-be-serialized):

```vibefun
external from "JSON" {
    parse: (String) -> Json = "parse"
    stringify: (Json) -> String = "stringify"
}

unsafe {
    let data = Json.parse("{\"name\": \"Alice\"}")  // Json
    let text = Json.stringify(data)                 // String
}
```

**Characteristics:**
- **Opaque**: Represents JSON-compatible data (objects, arrays, primitives)
- **Type safety**: Guarantees JSON-serializability but not specific structure
- **Operations**: Can be passed to `JSON.stringify`, returned from `JSON.parse`

**See also:** `/docs/spec/11-stdlib/json.md` for the standard library JSON module.

##### Promise\<T\>

Represents JavaScript Promises for asynchronous operations:

```vibefun
external fetch: (String) -> Promise<Response> = "fetch"
external then: <A, B>(Promise<A>, (A) -> B) -> Promise<B> = "then"

unsafe {
    let promise = fetch("https://api.example.com")  // Promise<Response>
}
```

**Characteristics:**
- **Generic**: Parameterized by the resolved value type `T`
- **Opaque**: Cannot directly access promise internals
- **Operations**: Use external `.then()`, `.catch()`, or `await` (future feature)

**Type safety:** The type parameter `T` represents what the promise resolves to, providing type safety for async chains.

##### Error

Represents JavaScript Error objects:

```vibefun
external from "Error" {
    Error: (String) -> Error = "Error"
    message: (Error) -> String = "message"
    stack: (Error) -> String = "stack"
}

unsafe {
    let err = Error("Something went wrong")
    let msg = message(err)  // String
}
```

**Characteristics:**
- **Opaque**: Represents JavaScript Error instances
- **Usage**: For JavaScript exception handling in unsafe blocks
- **Type safety**: Guarantees it's an Error object, but structure is opaque

**Best practice:** Prefer `Result<T, E>` types in pure Vibefun code for error handling.

##### Any

Represents a completely unconstrained JavaScript value (escape hatch):

```vibefun
external process_argv: Any = "process.argv"
external console_log: (Any) -> Unit = "console.log"

unsafe {
    let mysterious = process_argv  // Any - could be anything!
    console_log(mysterious)        // Accepts Any
}
```

**Characteristics:**
- **Completely opaque**: No guarantees about what the value is
- **Least type-safe**: Equivalent to TypeScript's `any` or `unknown`
- **Operations**: Can only pass to externals that accept `Any`

**When to use:**
- **Last resort** when JavaScript API is too dynamic to type
- Debugging or prototyping
- Wrapping highly polymorphic JS libraries

**Warning:** `Any` bypasses type safety. Prefer specific types (`JsObject`, `Json`, etc.) or properly typed external declarations when possible.

##### Type Safety Summary

| Type | Safety Level | Use Case |
|------|-------------|----------|
| `Int`, `String`, etc. | High | Primitive JavaScript values with known types |
| Vibefun types | High | Structured data within Vibefun code |
| `Promise<T>` | Medium | Async operations with known result type |
| `Json` | Medium | JSON data with unknown structure |
| `JsObject` | Low | Arbitrary JS objects |
| `Error` | Low | JavaScript exceptions |
| `Any` | None | Complete escape hatch (use sparingly) |

**General principle:** Use the **most specific type possible**. Define explicit record types or variants when you know the structure:

```vibefun
// Instead of:
external fetch: (String) -> Promise<Any> = "fetch"

// Prefer:
external {
    type Response = { ok: Bool, status: Int, json: (Unit) -> Promise<Json> }
    fetch: (String) -> Promise<Response> = "fetch"
}
```

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

#### Opaque JavaScript Type Constructors

When interfacing with JavaScript classes or constructor functions, you can declare them as opaque types using the `Type` identifier:

```vibefun
external from "node-fetch" {
    Headers: Type = "Headers"
    Request: Type = "Request"
    Response: Type = "Response"
}
```

**The `Type` identifier:**
- **Not a keyword**: `Type` is a PascalCase identifier with special semantics in external blocks
- **Purpose**: Declares an opaque JavaScript constructor or class that cannot be instantiated or inspected from pure Vibefun code
- **Usage**: Only meaningful in external declarations; treated as a regular identifier elsewhere
- **Type safety**: The declared binding can only be passed to external functions that expect it

**Example:**

```vibefun
external from "node-fetch" {
    Headers: Type = "Headers"
    newHeaders: (Unit) -> Headers = "Headers"  // Constructor wrapper
    append: (Headers, String, String) -> Unit = "append"
}

unsafe {
    let headers = newHeaders()  // Creates a Headers instance
    append(headers, "Content-Type", "application/json")
}
```

**When to use `Type`:**
- JavaScript classes/constructors you don't want to fully type as records
- Third-party library types with complex internal structure
- Objects that should remain opaque to Vibefun code

**Alternative:** For types with known structure, use record type declarations instead (see next section).

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

