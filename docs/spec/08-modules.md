# Modules

## Modules

Each `.vf` file is a module. Modules provide namespacing and code organization.

### Exports

```vibefun
// Export declarations
export let add = (x, y) => x + y

export type Person = { name: String, age: Int }

// Multiple exports
export let x = 10
export let y = 20
```

### Imports

```vibefun
// Named imports
import { map, filter } from './list'

// Import all as namespace
import * as List from './list'

// Import types
import type { Person } from './types'

// Mixed imports
import { type User, getUser, updateUser } from './api'
```

### Module Paths and Resolution

Vibefun uses a module resolution algorithm similar to Node.js, adapted for `.vf` files.

#### Import Path Syntax

```vibefun
// Relative imports (must start with ./ or ../)
import { utils } from './utils'        // Same directory
import { helpers } from '../helpers'   // Parent directory
import { types } from './shared/types' // Subdirectory

// Package imports (no ./ or ../ prefix)
import { Option, Result } from 'vibefun/std'
import { map, filter } from '@myorg/functional-utils'
```

#### Module Resolution Algorithm

When resolving an import `from "module-path"`, the compiler follows these steps:

**1. Determine import type:**
- If path starts with `./` or `../`: **relative import**
- Otherwise: **package import**

**2. For relative imports:**

Starting from the importing file's directory, resolve the path:

```vibefun
// Current file: src/user/profile.vf
import { helper } from './utils'

// Resolution steps:
// 1. src/user/utils.vf         (exact match)
// 2. src/user/utils/index.vf   (directory with index)
// 3. Error if not found
```

**3. For package imports:**

Search in order:
1. **Standard library**: `vibefun/*` paths resolve to built-in modules
2. **node_modules**: Search `node_modules/` in current and ancestor directories
3. **Configured paths**: Check `vibefun.json` path mappings

```vibefun
// Stdlib import
import { Option } from 'vibefun/std'
// Resolves to: <stdlib>/std.vf

// Package import
import { Button } from '@ui/components'
// Search order:
//   1. ./node_modules/@ui/components.vf
//   2. ./node_modules/@ui/components/index.vf
//   3. ../node_modules/@ui/components.vf
//   4. ../node_modules/@ui/components/index.vf
//   (continue up the directory tree)
```

#### File Extension Rules

The `.vf` extension is **optional** in imports but **required** on the filesystem:

```vibefun
// ✅ All equivalent (find utils.vf)
import { helper } from './utils'
import { helper } from './utils.vf'

// File system must have:
// src/utils.vf  (with or without .vf in import)
```

**Index file convention:**
```vibefun
// Directory structure:
// src/
//   components/
//     index.vf       (re-exports)
//     button.vf
//     input.vf

// Import from directory:
import { Button, Input } from './components'
// Resolves to: ./components/index.vf
```

#### Module Initialization Order

Vibefun modules are initialized in dependency order. Understanding initialization is crucial for avoiding runtime errors, especially with circular dependencies.

##### Normal (Acyclic) Module Initialization

When modules form a directed acyclic graph (DAG), initialization is straightforward:

**Example:**
```
main.vf → utils.vf → stdlib.vf
```

**Initialization order:**
1. `stdlib.vf` (no dependencies)
2. `utils.vf` (depends only on stdlib)
3. `main.vf` (depends on utils)

**Semantics:**
- Each module is initialized exactly once, in topological order
- When a module is initialized, all its dependencies are **already fully initialized**
- All imported bindings are available and have their defined values

**Process:**
1. Parse and type-check all modules
2. Build dependency graph
3. Topologically sort modules
4. Initialize in sorted order:
   - Execute module's top-level code
   - Bind exported values
   - Mark module as "initialized"

##### Circular Dependencies

Vibefun **allows** circular module dependencies, but they require careful handling:

```vibefun
// moduleA.vf
import { functionB } from './moduleB'
export let functionA = (x) => functionB(x) + 1

// moduleB.vf
import { functionA } from './moduleA'
export let functionB = (x) => if x > 0 then functionA(x - 1) else 0
```

**Dependency cycle:** A → B → A

**Initialization semantics:**

When a circular dependency is detected, the compiler uses **deferred initialization**:

1. **First pass**: Create bindings for all exports (initialized to `undefined` or temporary values)
2. **Second pass**: Execute module bodies in arbitrary order within the cycle
3. **Resolution**: Once all modules in the cycle complete, bindings resolve to their actual values

**Critical insight:** During initialization, imported bindings from modules in the same cycle may be **temporarily unbound** or hold placeholder values.

**What "undefined" means:**
- At the JavaScript runtime level, circular imports may be `undefined` during initialization
- Calling such functions during module initialization will cause runtime errors
- **After all modules initialize**, bindings are fully resolved and safe to use

**Example of the problem:**
```vibefun
// moduleA.vf
import { functionB } from './moduleB'

// This runs during module initialization!
let result = functionB(10)  // ❌ Runtime error: functionB is undefined

export let functionA = (x) => functionB(x) + 1  // ✅ OK: called later
```

**Why it fails:**
1. Compiler starts initializing `moduleA`
2. Encounters import of `functionB` from `moduleB`
3. Starts initializing `moduleB`
4. `moduleB` imports `functionA` from `moduleA` (cycle detected!)
5. `functionA` doesn't exist yet (still initializing `moduleA`)
6. `functionB` gets a placeholder/undefined reference
7. Back in `moduleA`, calling `functionB(10)` at module-level fails

**Safe pattern:**
```vibefun
// moduleA.vf
import { functionB } from './moduleB'

// Don't call during initialization - just define the function
export let functionA = (x) => functionB(x) + 1  // ✅ Safe

// Later, in application code:
let result = functionA(10)  // ✅ Safe: all modules initialized
```

##### Compiler Behavior

**The compiler:**
1. **Detects** circular dependencies during module graph analysis
2. **Warns** about circular dependencies:
   ```
   Warning: Circular dependency detected
     moduleA.vf → moduleB.vf → moduleA.vf

   Circular imports may cause runtime errors if bindings are accessed
   during module initialization. Ensure imports are only used in function
   bodies, not at module top-level.
   ```
3. **Allows** the code to compile (doesn't error)
4. **Generates** initialization code that handles cycles at runtime

**Type-only circular imports are safe:**
```vibefun
// moduleA.vf
import type { TypeB } from './moduleB'  // ✅ Safe: types erased at runtime

// moduleB.vf
import type { TypeA } from './moduleA'  // ✅ Safe
```

Type imports don't participate in runtime initialization, so circular type imports never cause problems.

##### Best Practices

**1. Avoid circular dependencies:**
```vibefun
// Instead of A ↔ B circular dependency:
// Create C as shared dependency: A → C ← B

// shared.vf
export type SharedType = ...

// moduleA.vf
import type { SharedType } from './shared'

// moduleB.vf
import type { SharedType } from './shared'
```

**2. If circular dependencies are necessary:**
- Only define functions/values, don't call them during initialization
- Move initialization logic into explicit initialization functions
- Call initialization functions after all modules load

```vibefun
// moduleA.vf
import { initB } from './moduleB'

let mut initialized = ref(false)

export let init = () => {
    if !initialized then {
        initB()
        initialized := true
    }
}

export let functionA = (x) => ...
```

**3. Use type-only imports when possible:**
```vibefun
// Import types for annotations, import values separately
import type { User } from './types'
import { processUser } from './logic'  // Different module
```

##### Initialization Order Summary

| Scenario | Initialization Behavior | Safety |
|----------|------------------------|--------|
| Acyclic dependencies | Topological order, all deps initialized first | ✅ Safe |
| Circular dependencies, functions only | Arbitrary order within cycle, functions defined but not called | ✅ Safe if no top-level calls |
| Circular dependencies with top-level calls | Undefined binding errors possible | ❌ Unsafe - runtime errors |
| Type-only circular imports | Types erased, no runtime initialization | ✅ Always safe |

**Recommendation:** Structure code to avoid circular dependencies. If unavoidable, ensure imported functions are only called after all modules initialize (e.g., in application entry point, not at module top-level).

#### Path Mappings (vibefun.json)

Configure import aliases and module paths in `vibefun.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@utils/*": ["./src/utils/*"]
    }
  }
}
```

Usage:
```vibefun
// With path mapping configured above:
import { Button } from '@components/button'
// Resolves to: ./src/components/button.vf

import { helper } from '@utils/string'
// Resolves to: ./src/utils/string.vf
```

#### Module Resolution Errors

Clear error messages when resolution fails:

```vibefun
import { missing } from './nonexistent'
// Error: Cannot find module './nonexistent'
//   Tried:
//     - src/nonexistent.vf
//     - src/nonexistent/index.vf

import { missing } from 'unknown-package'
// Error: Cannot find module 'unknown-package'
//   Tried:
//     - node_modules/unknown-package.vf
//     - node_modules/unknown-package/index.vf
//     - ../node_modules/unknown-package.vf
//     - ../node_modules/unknown-package/index.vf
//   Package may need to be installed: npm install unknown-package
```

### Re-exports

```vibefun
// Re-export from another module
export { map, filter } from './list'
export * from './utils'
```

### Module Structure

```vibefun
// src/user.vf
export type User = {
    id: Int,
    name: String,
    email: String
}

export let validateEmail = (email) => ...

export let createUser = (name, email) => ...

// src/main.vf
import { type User, createUser } from './user'

let main = () => {
    let user = createUser("Alice", "alice@example.com")
    ...
}
```

---

