# Introduction

**Vibefun** is a pragmatic functional programming language that transpiles to JavaScript. It combines the elegance and safety of ML-style functional programming with practical features for real-world application development. Vibefun aims to bring strong static typing, algebraic data types, and powerful type inference to the JavaScript ecosystem while maintaining excellent interoperability with existing JavaScript code.

## Design Goals

- **Type Safety**: Strong static typing with comprehensive type inference
- **Functional-First**: Immutability by default, first-class functions, and algebraic data types
- **Pragmatic**: Escape hatches for JavaScript interop when needed
- **Developer Experience**: Clear error messages and excellent tooling
- **JavaScript Target**: Generate readable, debuggable JavaScript code

## Target Audience

Vibefun is designed for developers who:
- Want ML-style functional programming on the JavaScript runtime
- Value type safety and immutability but need JavaScript interop
- Prefer expressive type systems and pattern matching
- Build real-world applications requiring reliability and maintainability

---

## Language Philosophy

### Pragmatic Functional Programming

Vibefun follows a "pragmatic functional" philosophy similar to OCaml and F#. The language provides:

- **Strong functional defaults**: Immutability, pure functions, and algebraic data types are the norm
- **Escape hatches**: Explicit mechanisms (`mut`, `unsafe`) when mutability or side effects are needed
- **Practicality over purity**: The goal is productive real-world development, not theoretical purity

### Explicitness Over Implicitness

Vibefun values clear, explicit code:

- **Explicit boundaries**: JavaScript interop requires `external` and `unsafe` keywords
- **Explicit mutability**: Mutation requires `let mut` and the `:=` operator
- **Explicit exports**: Module exports are explicitly declared
- **Optional type annotations**: Inference works well, but annotations improve clarity at boundaries

### Developer Experience First

Every design decision considers developer experience:

- **Clear error messages**: Detailed, actionable error messages with location information
- **Minimal boilerplate**: Type inference reduces annotation burden
- **Readable generated code**: JavaScript output should be understandable for debugging
- **Fast compilation**: Keep compile times reasonable
