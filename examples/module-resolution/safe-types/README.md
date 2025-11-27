# Safe Circular Type Imports

This example demonstrates **safe** circular dependencies using type-only imports.

## The Pattern

`moduleA.vf` and `moduleB.vf` have circular type dependencies:
- `moduleA` imports `type Node` from `moduleB`
- `moduleB` imports `type Tree` from `moduleA`

## Why It's Safe

Type-only imports (`import type { ... }`) are erased at runtime:
1. Types exist only during compilation for type checking
2. No code executes when a type is imported
3. There's no initialization order issue

## Compiler Behavior

The vibefun compiler:
- ✅ Allows type-only circular imports
- ✅ Does NOT emit warnings for type-only cycles
- ✅ Correctly type-checks across the cycle

## When to Use

Use this pattern when:
- Two modules have mutually recursive type definitions
- You need to express complex type relationships
- The circular dependency is only at the type level

## Key Points

- Always use `import type { ... }` for type-only imports
- Value imports create runtime dependencies (may cause warnings)
- Mixed imports (type + value) are treated as value imports
