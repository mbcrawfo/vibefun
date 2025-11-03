# JavaScript Interop

Vibefun provides explicit, type-safe mechanisms for interoperating with JavaScript code.

## Contents

1. **[External Declarations](./external-declarations.md)** - Declaring and using JavaScript functions
2. **[Unsafe Blocks](./unsafe-blocks.md)** - Controlled escape hatch for side effects
3. **[Type Safety](./type-safety.md)** - Maintaining type safety at FFI boundaries
4. **[Calling Conventions](./calling-conventions.md)** - Calling Vibefun from JavaScript

## Philosophy

Vibefun's JavaScript interop is designed with these principles:
- **Explicit boundaries**: The `external` and `unsafe` keywords make interop explicit
- **Type safety**: External functions have Vibefun type signatures
- **Pragmatic**: Full access to JavaScript ecosystem when needed
- **Clear semantics**: Well-defined behavior at language boundaries
