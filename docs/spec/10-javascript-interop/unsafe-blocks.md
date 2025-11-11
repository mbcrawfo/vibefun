# Unsafe Blocks

### Unsafe Blocks

All JavaScript interop must occur in `unsafe` blocks, which mark code that interacts with untyped JavaScript.

```vibefun
let debug = (msg) => unsafe {
    console_log(msg);
}

let fetchUser = (id) => unsafe {
    let url = "https://api.example.com/users/" &String.fromInt(id);
    fetch(url);
}
```

#### Unsafe Block Semantics

```vibefun
// Basic unsafe block
unsafe {
    console_log("Hello, world!");
}

// Unsafe block as expression (returns value)
let result = unsafe {
    let data = fetchData();
    processData(data);
}

// Multiple FFI calls in one unsafe block
unsafe {
    console_log("Starting...");
    let result = compute();
    console_log("Result: " & String.fromInt(result));
    result;
}
```

#### JavaScript Syntax in Unsafe Blocks

Within `unsafe` blocks, you can use **limited JavaScript syntax** for interoperating with JavaScript code:

**Allowed:**
- Vibefun expressions (the default)
- Calling external functions
- JavaScript try/catch blocks (for exception handling)
- JavaScript property access and method calls through external declarations

```vibefun
// ✅ Try/catch is allowed in unsafe blocks
unsafe {
    try {
        riskyOperation();
    } catch (error) {
        handleError(error);
    }
}

// ✅ Calling JavaScript methods
external setTimeout: ((Unit) -> Unit, Int) -> Int = "setTimeout" from "global";
unsafe {
    setTimeout(() => { log("Hello") }, 1000);
}
```

**Not allowed (use external declarations instead):**
- Raw JavaScript `if`, `for`, `while` statements (use Vibefun control flow)
- JavaScript `var`, `let`, `const` declarations (use Vibefun `let`)
- JavaScript `function` declarations (use Vibefun functions)
- JavaScript classes and prototypes
- JavaScript operators that differ from Vibefun (e.g., `===`, `++`, `+=`)

```vibefun
// ❌ JavaScript syntax not supported
unsafe {
    var x = 10;  // Error: Use 'let x = 10'
    if (condition) { }  // Error: Use Vibefun 'if condition then ...'
    for (let i = 0; i < 10; i++) { };  // Error: Use while loop or List operations
}

// ✅ Use Vibefun syntax instead
unsafe {
    let x = 10;
    if condition then { ... } else { ... };
    // Use while loops or functional operations
}
```

**Best practice:** Keep unsafe blocks minimal and use external declarations for complex JavaScript integration:

```vibefun
// ❌ Attempting complex JavaScript in unsafe block
unsafe {
    try {
        const response = await fetch(url);  // Error: await not supported
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
    }
}

// ✅ Declare JavaScript functions externally
external fetchJson: (String) -> Promise<Json> = "fetchJson" from "./api";
unsafe {
    fetchJson(url);
        .then((data) => processData(data));
        .catch((error) => handleError(error));
}
```

#### Nesting Unsafe Blocks

Unsafe blocks **can be nested** (though usually unnecessary):

```vibefun
// ✅ OK: Nested unsafe blocks
unsafe {
    let x = externalFn1();

    let y = unsafe {
        externalFn2(x);
    }

    externalFn3(y);
}

// But nesting is redundant (outer unsafe applies to inner blocks too)
// Prefer single unsafe block:
unsafe {
    let x = externalFn1();
    let y = externalFn2(x);
    externalFn3(y);
}
```

**Rules:**
- Once inside an `unsafe` block, all nested code can call external functions
- Nesting doesn't add additional meaning (already unsafe)
- Inner unsafe blocks are allowed but stylistically discouraged

#### Unsafe Block Restrictions

**What requires unsafe:**
- Calling `external` functions
- Any expression that directly or indirectly calls FFI

```vibefun
external log: (String) -> Unit = "console.log";

// ❌ Error: Cannot call external function outside unsafe block
log("hello");

// ✅ OK: Inside unsafe block
unsafe { log("hello") };

// ❌ Error: Function calls external, must be marked unsafe at call site
let greet = (name) => log("Hello, " & name);
greet("Alice")  // Error: greet calls external function

// ✅ OK: Wrap unsafe code in function
let greet = (name) => unsafe { log("Hello, " & name) };
greet("Alice")  // OK: greet handles unsafe internally
```

**What doesn't require unsafe:**
- Pure Vibefun code (no external calls)
- Calling Vibefun functions that internally use unsafe (unsafe is encapsulated)

```vibefun
// This function uses unsafe internally
let safeLog = (msg) => unsafe { log(msg) };

// Calling it doesn't require unsafe
safeLog("hello")  // ✅ OK: unsafe is encapsulated in safeLog
```

#### Unsafe and Return Values

Values returned from unsafe blocks are **trusted** to have the declared type:

```vibefun
external parseJson: (String) -> Json = "JSON.parse";

// Return value is trusted to be Json
let data: Json = unsafe { parseJson('{"key": "value"}') };

// But there's no runtime verification!
// If parseJson returns something incompatible, undefined behavior may occur
```

**Best practice:** Wrap FFI calls in checked wrappers when possible:

```vibefun
let safeParseJson = (str: String): Option<Json> => unsafe {
    try {
        Some(parseJson(str));
    } catch {
        None;  // Catch JS exceptions and return None
    }
}
```

