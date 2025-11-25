# Type System

Vibefun uses a Hindley-Milner type system extended with generics, union types, and records. Type inference minimizes the need for annotations while maintaining strong static typing.

## Contents

1. **[Primitive Types](./primitive-types.md)** - Int, Float, String, Bool, Unit, Ref<T>, and function types
2. **[Tuple Types](./tuples.md)** - Fixed-size, heterogeneous product types with positional elements
3. **[Type Inference](./type-inference.md)** - Type variables, polymorphism, inference rules, and value restriction
4. **[Record Types](./record-types.md)** - Structural records with width subtyping
5. **[Variant Types](./variant-types.md)** - Sum types and tagged unions with nominal typing
6. **[Generic Types](./generic-types.md)** - Parametric polymorphism, generic functions, and type parameter variance
7. **[Union Types](./union-types.md)** - Union types for variants and literals
8. **[Recursive Types](./recursive-types.md)** - Recursive and mutually recursive type definitions
9. **[Type Aliases](./type-aliases.md)** - Type aliases and annotations
10. **[Subtyping](./subtyping.md)** - Width subtyping for records, type parameter invariance, and integration with inference
11. **[Error Reporting](./error-reporting.md)** - Type error format, recovery strategy, and message conventions
12. **[Error Catalog](./error-catalog.md)** - Complete reference of all type error codes (VF0001-VF0249)

## Type System Design

Vibefun's type system is based on **Algorithm W** with several modern extensions:

- **Constraint-based inference**: Generates and solves type constraints for flexible, modular type checking
- **Type variable scoping with levels**: Prevents type variables from escaping their scope (Standard ML approach)
- **Width subtyping for records**: Records with extra fields are subtypes (duck-typing-like flexibility)
- **Nominal typing for variants**: Variant types require exact name matching
- **Let-polymorphism**: Automatic generalization and instantiation of polymorphic types
- **Syntactic value restriction**: Only syntactic values can be generalized (prevents unsound polymorphism)
