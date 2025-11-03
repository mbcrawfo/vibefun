# Code Generation

### JavaScript Target

Vibefun generates JavaScript code targeting **ECMAScript 2020 (ES2020)**.

#### Guaranteed Features

The generated JavaScript is guaranteed to be valid ES2020, which includes:

- Arrow functions, `const`/`let` declarations
- Destructuring, spread operators
- Promises, `async`/`await`
- Optional chaining (`?.`), nullish coalescing (`??`)
- All ES2020 standard library features

#### Compatibility

- **Node.js**: 14.0+ (Node.js 16+ recommended)
- **Browsers**: Modern browsers (2020+)
- **Legacy targets**: Transpilation for older environments is the user's responsibility

#### Implementation Details

The specific patterns used to generate JavaScript from Vibefun code (such as how functions are curried, how algebraic data types are represented, or how pattern matching is compiled) are **implementation details** and may change between compiler versions without notice.

The generated code is designed to be **readable for debugging purposes**, but should be treated as compiler output rather than a stable API. Always use source maps to debug original Vibefun source code rather than inspecting generated JavaScript.

### Source Maps

Vibefun generates source maps for debugging:

```bash
vibefun compile main.vf -o main.js --source-maps
```

This allows stepping through original Vibefun code in browser/Node.js debuggers.

