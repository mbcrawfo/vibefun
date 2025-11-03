# Compilation Model

This section describes how Vibefun source code is transformed into executable JavaScript.

## Contents

1. **[Desugaring](./desugaring.md)** - Surface syntax to core transformations
2. **[Code Generation](./codegen.md)** - JavaScript output and source maps
3. **[Runtime](./runtime.md)** - Runtime type checking modes

## Overview

The Vibefun compiler follows a multi-phase pipeline:
1. **Lexing**: Source code → tokens
2. **Parsing**: Tokens → AST
3. **Desugaring**: Surface AST → Core AST
4. **Type checking**: Algorithm W inference
5. **Optimization**: Optional passes
6. **Code generation**: Core AST → JavaScript + source maps

The compiler prioritizes readable JavaScript output for debuggability.
