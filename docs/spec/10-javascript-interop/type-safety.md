# Type Safety at Boundaries

### Type Safety at Boundaries

Values crossing FFI boundaries require careful handling to maintain type safety.

```vibefun
external parseJson: (String) -> Json = "JSON.parse";

// Checked wrapper
let safeParseJson = (str) => unsafe {
    try {
        Some(parseJson(str));
    } catch {
        None;
    }
}
```

#### Runtime Type Checking Modes

The compiler supports three modes for runtime type checking at FFI boundaries:

**1. `--runtime-checks=ffi` (recommended for development)**
- Checks values entering/exiting unsafe blocks
- Validates external function arguments and return values
- Throws runtime errors on type mismatches
- Minimal overhead (only at FFI boundaries)

**2. `--runtime-checks=all` (maximum safety)**
- Checks all values everywhere (including pure Vibefun code)
- Very thorough but significant performance overhead
- Useful for debugging type-related issues

**3. `--runtime-checks=none` (production)**
- No runtime checking (pure compile-time safety)
- Fastest performance
- Relies on correct external type annotations

#### Type Checking at FFI Boundaries

When runtime checks are enabled, the compiler inserts checks:

```vibefun
external fetchData: (String) -> User = "fetchData";

// With runtime checks enabled:
unsafe {
    let user = fetchData("alice");
    // Runtime check verifies user has expected User shape
    // Throws if JS returns null, wrong type, or missing fields
}

// Without runtime checks:
// User is trusted to have correct type (no verification)
```

#### Handling JavaScript Null and Undefined

JavaScript `null` and `undefined` don't exist in Vibefun's type system. Use `Option` to represent nullable values:

```vibefun
// Declare external that might return null
external getUserById: (Int) -> Option<User> = "getUserById";

// Use in Vibefun
let getUser = (id: Int): Option<User> => unsafe {
    getUserById(id);  // JS null/undefined → None, value → Some(value)
}

// If external doesn't declare Option, wrap it:
external rawGetUser: (Int) -> User = "getUserById";  // May return null!

let safeGetUser = (id: Int): Option<User> => unsafe {
    let result = rawGetUser(id);
    if isNull(result) then None else Some(result);
}
```

