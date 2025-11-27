# vibefun.json Configuration

The `vibefun.json` file configures your Vibefun project. This guide covers the configuration options available.

## File Location

Place `vibefun.json` in your project root:

```
my-project/
├── vibefun.json    # Project configuration
├── src/
│   └── main.vf
└── package.json
```

## Finding the Project Root

When compiling, Vibefun searches for `vibefun.json` starting from the entry point's directory and walking up:

```
/home/user/project/src/main.vf  # Entry point
/home/user/project/src/         # Check here first
/home/user/project/             # Then here (found vibefun.json)
```

If no `vibefun.json` is found, Vibefun looks for `package.json` as a fallback to determine the project root.

## Basic Structure

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## Path Mappings

Path mappings let you create import aliases, making imports cleaner and refactoring easier.

### Simple Alias

Map a prefix to a directory:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

Now you can use:

```vibefun
// Instead of: import { foo } from "../../utils/helpers"
import { foo } from "@/utils/helpers"
```

### Multiple Aliases

Define multiple path mappings:

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

```vibefun
import { Button } from "@components/Button"
import { format } from "@utils/format"
```

### Exact Mappings (No Wildcard)

Map a specific import to a specific file:

```json
{
  "compilerOptions": {
    "paths": {
      "@config": ["./config/production.vf"]
    }
  }
}
```

```vibefun
import { settings } from "@config"  // → ./config/production.vf
```

### Fallback Paths

Provide multiple paths to try in order:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*", "./lib/*"]
    }
  }
}
```

Vibefun tries each path in order until one resolves successfully.

## Pattern Syntax

### Wildcards

The `*` wildcard matches any path segment:

| Pattern | Import | Resolves To |
|---------|--------|-------------|
| `@/*` → `./src/*` | `@/utils` | `./src/utils` |
| `@/*` → `./src/*` | `@/deep/nested/file` | `./src/deep/nested/file` |

### Resolution

After applying the mapping, standard module resolution applies:

1. `./src/utils` → try `./src/utils.vf`
2. If not found → try `./src/utils/index.vf`

## Precedence

Path mappings take **precedence over node_modules** lookups (matching TypeScript behavior).

Given this config:

```json
{
  "compilerOptions": {
    "paths": {
      "lodash": ["./my-lodash/index.vf"]
    }
  }
}
```

```vibefun
import { map } from "lodash"  // Uses ./my-lodash/index.vf, NOT node_modules/lodash
```

This allows you to:
- Override package imports for testing
- Provide local implementations of packages
- Alias internal modules

## Missing vibefun.json

If no `vibefun.json` exists:

- Path mappings are disabled (no error)
- Relative imports work normally
- Package imports resolve via node_modules
- Project root is determined by `package.json` location

## Error Handling

### Invalid JSON

If `vibefun.json` contains invalid JSON:

```
error: Failed to parse vibefun.json: Unexpected token at line 3, column 5
```

**Solution**: Fix the JSON syntax error.

### Invalid Path in Mapping

If a path mapping points to a non-existent location:

```
error[VF5000]: Module '@/utils' not found
```

**Solution**: Verify the path in your mapping is correct.

## Examples

### Monorepo Setup

For a monorepo with shared packages:

```json
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["../../packages/shared/src/*"],
      "@utils/*": ["../../packages/utils/src/*"]
    }
  }
}
```

### Testing Setup

Override dependencies for testing:

```json
{
  "compilerOptions": {
    "paths": {
      "@/config": ["./test/mocks/config.vf"],
      "@vibefun/std": ["./test/mocks/std/index.vf"]
    }
  }
}
```

### Library Development

Alias your library's src during development:

```json
{
  "compilerOptions": {
    "paths": {
      "my-library": ["./src/index.vf"],
      "my-library/*": ["./src/*"]
    }
  }
}
```

## Best Practices

1. **Use meaningful prefixes**: `@/`, `@components/`, `@utils/` clearly indicate aliased paths

2. **Keep mappings simple**: Too many mappings can be confusing

3. **Document your aliases**: Add a comment in your README about configured aliases

4. **Consistent conventions**: Use the same alias patterns across your codebase

5. **Match IDE config**: If using an IDE, configure the same aliases there for autocomplete

## Future Options

The `compilerOptions` object will support additional settings in future versions:

```json
{
  "compilerOptions": {
    "paths": { ... },
    "strict": true,           // (future) Enable strict type checking
    "target": "es2020",       // (future) JavaScript target version
    "sourceMap": true         // (future) Generate source maps
  }
}
```

## See Also

- [Module Resolution](./module-resolution.md) - How Vibefun finds modules
- [Fixing Circular Dependencies](./fixing-circular-dependencies.md) - Resolving dependency cycles
