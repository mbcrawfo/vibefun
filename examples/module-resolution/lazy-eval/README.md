# Lazy Evaluation Pattern for Circular Dependencies

This example demonstrates the **lazy evaluation pattern** for safely handling circular dependencies.

## The Pattern

Instead of importing values directly:
\`\`\`vibefun
// ❌ Problematic - value accessed at import time
import { MESSAGE } from "./moduleA";
\`\`\`

Import getter functions:
\`\`\`vibefun
// ✅ Safe - value accessed when function is called
import { getMessage } from "./moduleA";
\`\`\`

## How It Works

1. Each module exports getter functions instead of bare values
2. The getter functions are imported (functions exist at import time)
3. Values are accessed via function calls (deferred until after init)
4. By the time functions are called, both modules are fully initialized

## Key Changes

### Before (Unsafe)
\`\`\`vibefun
// moduleA.vf
export let MESSAGE = "Hello";

// moduleB.vf
import { MESSAGE } from "./moduleA";
let x = MESSAGE; // ⚠️ May be undefined!
\`\`\`

### After (Safe)
\`\`\`vibefun
// moduleA.vf
export let MESSAGE = "Hello";
export let getMessage = () => MESSAGE;

// moduleB.vf
import { getMessage } from "./moduleA";
let x = getMessage(); // ✅ Safe - called after init
\`\`\`

## Why This Works

- Functions are objects that exist immediately
- Importing a function doesn't execute its body
- The function body runs later, when modules are initialized
- Deferred access avoids the initialization order problem

## When to Use

Use this pattern when:
- You have circular value dependencies
- Refactoring to break the cycle is not practical
- The circular dependency is intentional/necessary

## Alternatives

1. **Extract shared module**: Move shared values to a third module
2. **Dependency injection**: Pass dependencies as function parameters
3. **Event system**: Decouple modules via events/callbacks

See the `complex-cycle/` example for the extract shared module pattern.
