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

#### Circular Dependencies

Vibefun **allows** circular module dependencies, with these semantics:

```vibefun
// moduleA.vf
import { functionB } from './moduleB'
export let functionA = (x) => functionB(x) + 1

// moduleB.vf
import { functionA } from './moduleA'
export let functionB = (x) => if x > 0 then functionA(x - 1) else 0
```

**Initialization order:**
1. Modules are topologically sorted where possible
2. Circular dependencies create **initialization cycles**
3. During a cycle, imported bindings may be **undefined** until fully initialized
4. The compiler **warns** about circular dependencies but allows them

**Best practice:** Avoid circular dependencies when possible. If needed, use explicit initialization or redesign with a shared module:

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

