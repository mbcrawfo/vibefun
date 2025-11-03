# Vibefun Language Specification

**Version:** 0.1.0 (Draft)
**Date:** October 2025
**Status:** In Development

This is the complete specification for the Vibefun programming language - a pragmatic functional programming language that transpiles to JavaScript.

## Table of Contents

### 1. [Introduction](./01-introduction.md)
Overview of Vibefun, design goals, target audience, and language philosophy.

### 2. [Lexical Structure](./02-lexical-structure/)
How Vibefun source code is tokenized and lexically analyzed.
- [Basic Structure](./02-lexical-structure/basic-structure.md) - Source files, comments, whitespace, semicolons
- [Tokens](./02-lexical-structure/tokens.md) - Keywords, identifiers, literals
- [Operators](./02-lexical-structure/operators.md) - Operators, punctuation, edge cases

### 3. [Type System](./03-type-system/)
Hindley-Milner type system with modern extensions.
- [Primitive Types](./03-type-system/primitive-types.md) - Int, Float, String, Bool, Unit, Ref<T>
- [Type Inference](./03-type-system/type-inference.md) - Type variables, polymorphism, inference
- [Record Types](./03-type-system/record-types.md) - Structural records with width subtyping
- [Variant Types](./03-type-system/variant-types.md) - Sum types and tagged unions
- [Generic Types](./03-type-system/generic-types.md) - Parametric polymorphism
- [Union Types](./03-type-system/union-types.md) - Union type features
- [Recursive Types](./03-type-system/recursive-types.md) - Recursive type definitions
- [Type Aliases](./03-type-system/type-aliases.md) - Type aliases and annotations

### 4. [Expressions](./04-expressions/)
Core computational units of the language.
- [Basic Expressions](./04-expressions/basic-expressions.md) - Literals, variables, calls, operators
- [Control Flow](./04-expressions/control-flow.md) - If and match expressions
- [Data Literals](./04-expressions/data-literals.md) - Records and lists
- [Functions and Composition](./04-expressions/functions-composition.md) - Lambdas, blocks, pipes

### 5. [Pattern Matching](./05-pattern-matching/)
Powerful pattern matching with exhaustiveness checking.
- [Pattern Basics](./05-pattern-matching/pattern-basics.md) - Match, literal, variable, wildcard
- [Data Patterns](./05-pattern-matching/data-patterns.md) - Variant, list, record patterns
- [Advanced Patterns](./05-pattern-matching/advanced-patterns.md) - Nested, guards, or-patterns
- [Exhaustiveness Checking](./05-pattern-matching/exhaustiveness.md) - Compiler guarantees

### 6. [Functions](./06-functions.md)
First-class functions, currying, recursion, and higher-order functions.

### 7. [Mutable References](./07-mutable-references.md)
Controlled mutability with the `Ref<T>` type.

### 8. [Modules](./08-modules.md)
Module system with explicit exports and imports.

### 9. [Error Handling](./09-error-handling.md)
Error handling with Result/Option types and runtime semantics.

### 10. [JavaScript Interop](./10-javascript-interop/)
Type-safe interoperation with JavaScript code.
- [External Declarations](./10-javascript-interop/external-declarations.md) - Declaring JS functions
- [Unsafe Blocks](./10-javascript-interop/unsafe-blocks.md) - Controlled side effects
- [Type Safety](./10-javascript-interop/type-safety.md) - FFI boundary safety
- [Calling Conventions](./10-javascript-interop/calling-conventions.md) - JS calling Vibefun

### 11. [Standard Library](./11-stdlib/)
Essential data structures and utilities.
- [List](./11-stdlib/list.md) - Immutable list operations
- [Option](./11-stdlib/option.md) - Optional values and null safety
- [Result](./11-stdlib/result.md) - Error handling
- [String](./11-stdlib/string.md) - String manipulation
- [Numeric](./11-stdlib/numeric.md) - Int and Float operations
- [Array](./11-stdlib/array.md) - Mutable arrays
- [Collections](./11-stdlib/collections.md) - Map and Set
- [Math](./11-stdlib/math.md) - Mathematical functions
- [JSON](./11-stdlib/json.md) - JSON parsing and serialization

### 12. [Compilation Model](./12-compilation/)
How Vibefun compiles to JavaScript.
- [Desugaring](./12-compilation/desugaring.md) - Surface to core transformations
- [Code Generation](./12-compilation/codegen.md) - JavaScript output and source maps
- [Runtime](./12-compilation/runtime.md) - Runtime type checking

### 13. [Appendix](./13-appendix.md)
Syntax summary, keyword reference, and best practices.

---

## Quick Reference

### File Extension
- Source files: `.vf`

### Naming Conventions
- Types & Constructors: `PascalCase`
- Functions & Variables: `camelCase`

### Key Language Features
- **Type Inference**: Hindley-Milner with minimal annotations
- **Pattern Matching**: Exhaustive with compiler guarantees
- **Immutability**: By default, with explicit `mut` for refs
- **First-Class Functions**: Curried by default
- **Algebraic Data Types**: Variants (sum types) and records (product types)
- **JavaScript Interop**: Explicit `external` and `unsafe` keywords

### Simple Example
```vibefun
// Type definition
type Option<T> = Some(T) | None

// Function with pattern matching
let getOrDefault = <T>(opt: Option<T>, default: T): T =>
    match opt {
        | Some(x) => x
        | None => default
    }

// Pipe operator
[1, 2, 3, 4, 5]
    |> List.filter((x) => x % 2 == 0)
    |> List.map((x) => x * 2)
    |> List.sum
```

---

## About This Specification

This specification defines the Vibefun language syntax, semantics, type system, and standard library. It serves as:
- The authoritative reference for language implementers
- A comprehensive guide for developers learning Vibefun
- Documentation for language design decisions

For project implementation details, see the root [`CLAUDE.md`](../../CLAUDE.md) file.
