# Module Resolution

This guide explains how Vibefun finds and loads imported modules.

## Overview

When you write an import statement like:

```vibefun
import { helper } from "./utils"
```

Vibefun's module resolver needs to find the actual file that corresponds to `"./utils"`. This process is called **module resolution**.

## Resolution Algorithm

Vibefun follows a resolution algorithm similar to Node.js and TypeScript, with some Vibefun-specific conventions.

### Step 1: Identify Import Type

Imports fall into three categories:

1. **Relative imports** - Start with `./` or `../`
   ```vibefun
   import { foo } from "./utils"
   import { bar } from "../shared/helpers"
   ```

2. **Path-mapped imports** - Match patterns in `vibefun.json`
   ```vibefun
   import { foo } from "@/utils"  // Maps to ./src/utils
   ```

3. **Package imports** - No prefix (resolved via node_modules)
   ```vibefun
   import { Option } from "@vibefun/std"
   ```

### Step 2: Apply Path Mappings (if configured)

If your project has a `vibefun.json` with path mappings, those are checked **before** looking in node_modules:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

With this config:
- `import { x } from "@/utils"` resolves to `./src/utils.vf`

See [vibefun.json Configuration](./vibefun-json.md) for details.

### Step 3: Resolve the Path

#### Relative Imports

For relative imports (`./` or `../`), Vibefun resolves relative to the importing file:

```
project/
├── src/
│   ├── main.vf           # import { foo } from "./utils"
│   └── utils.vf          # ← resolves here
```

#### Package Imports

For package imports (no `./` or `../`), Vibefun searches `node_modules` directories:

1. Start from the importing file's directory
2. Look for `node_modules/<package>`
3. If not found, move up to parent directory
4. Repeat until reaching filesystem root

```
project/
├── node_modules/
│   └── @vibefun/
│       └── std/
│           └── index.vf   # ← found here
└── src/
    └── main.vf            # import { Option } from "@vibefun/std"
```

### Step 4: File vs Directory Resolution

Once the base path is determined, Vibefun tries to find the actual file:

1. **If the path ends with `.vf`**: Use it as-is
   ```vibefun
   import { foo } from "./utils.vf"  // Try ./utils.vf only
   ```

2. **If the path does NOT end with `.vf`**:
   - First, try adding `.vf`: `./utils` → `./utils.vf`
   - If that doesn't exist, try as directory with index: `./utils` → `./utils/index.vf`

3. **File takes precedence over directory**: If both `utils.vf` and `utils/index.vf` exist, the file wins.

4. **Trailing slash means directory**: `./utils/` tries **only** `./utils/index.vf`

### Examples

| Import Path | Files Tried (in order) |
|-------------|----------------------|
| `"./utils"` | `./utils.vf`, then `./utils/index.vf` |
| `"./utils.vf"` | `./utils.vf` only |
| `"./utils/"` | `./utils/index.vf` only |
| `"."` | `./index.vf` |
| `".."` | `../index.vf` |

## Symlink Handling

Vibefun resolves symlinks to their **real paths**. This ensures:

- A module is only loaded once, even if accessed via different symlinks
- Module caching works correctly
- Circular dependency detection is accurate

```bash
# If utils.vf is a symlink to shared/utils.vf
ls -la src/
# utils.vf -> ../shared/utils.vf
```

Both `import from "./utils"` and `import from "../shared/utils"` will resolve to the same module.

## Cross-Platform Considerations

### Case Sensitivity

File systems vary in case sensitivity:
- **Linux**: Case-sensitive (`Utils.vf` ≠ `utils.vf`)
- **macOS/Windows**: Usually case-insensitive

**Problem**: Code that works on macOS might fail on Linux:

```vibefun
import { foo } from "./Utils"  // File is actually utils.vf
```

**Solution**: Vibefun emits warning [VF5901](../errors/modules.md#vf5901) when casing doesn't match:

```
warning[VF5901]: Module path './Utils' has different casing than on disk: './utils'
```

Always use the exact casing as the file on disk.

### Path Separators

Vibefun normalizes path separators internally, so both work:

```vibefun
import { foo } from "./utils/helpers"    // Unix style (recommended)
import { foo } from "./utils\\helpers"   // Windows style (works but not recommended)
```

Use forward slashes (`/`) for maximum portability.

## Scoped Packages

Scoped packages like `@vibefun/std` or `@myorg/utils` are supported:

```vibefun
import { Option, Result } from "@vibefun/std"
import { logger } from "@myorg/utils"
```

These are resolved in node_modules:
- `@vibefun/std` → `node_modules/@vibefun/std/index.vf`
- `@myorg/utils` → `node_modules/@myorg/utils/index.vf`

## Side-Effect Imports

Import a module for its side effects without binding any names:

```vibefun
import "./setup"  // Runs setup.vf but imports nothing
```

This still creates a dependency and the module will be loaded.

## Common Issues

### Module Not Found (VF5000)

```
error[VF5000]: Module './utills' not found
```

**Causes**:
- Typo in the import path
- File doesn't exist
- Wrong relative path

**Solutions**:
- Check spelling carefully
- Verify the file exists at the expected location
- Use your IDE's autocomplete for import paths

### Case Sensitivity Mismatch (VF5901)

```
warning[VF5901]: Module path './Utils' has different casing than on disk: './utils'
```

**Solution**: Update the import to match the exact filename casing.

### Circular Dependencies (VF5900)

```
warning[VF5900]: Circular dependency detected: a.vf → b.vf → a.vf
```

See [Fixing Circular Dependencies](./fixing-circular-dependencies.md) for solutions.

### Self Import (VF5004)

```
error[VF5004]: Module cannot import itself: './utils'
```

**Cause**: A module is importing itself (directly or via path that resolves to same file).

**Solution**: Remove the self-import. You don't need to import from the current file.

## Resolution Order Summary

1. Check if import matches a path mapping in `vibefun.json`
2. If relative (`./` or `../`), resolve relative to importing file
3. If package import, search node_modules up the directory tree
4. Try `.vf` extension, then `/index.vf`
5. Resolve symlinks to real paths
6. Check case sensitivity and warn if mismatched

## See Also

- [vibefun.json Configuration](./vibefun-json.md) - Path mappings and project configuration
- [Fixing Circular Dependencies](./fixing-circular-dependencies.md) - Resolving cycle warnings
- [Module System Errors](../errors/modules.md) - All module-related error codes
