# Type System

Vibefun uses a Hindley-Milner type system extended with generics, union types, and records. Type inference minimizes the need for annotations while maintaining strong static typing.

## Contents

1. **[Primitive Types](./primitive-types.md)** - Int, Float, String, Bool, Unit, Ref<T>, and function types
2. **[Type Inference](./type-inference.md)** - Type variables, polymorphism, inference rules, and value restriction
3. **[Record Types](./record-types.md)** - Structural records with width subtyping
4. **[Variant Types](./variant-types.md)** - Sum types and tagged unions with nominal typing
5. **[Generic Types](./generic-types.md)** - Parametric polymorphism and generic functions
6. **[Union Types](./union-types.md)** - Union types for variants and literals
7. **[Recursive Types](./recursive-types.md)** - Recursive and mutually recursive type definitions
8. **[Type Aliases](./type-aliases.md)** - Type aliases and annotations

## Type System Design

Vibefun's type system is based on **Algorithm W** with several modern extensions:

- **Constraint-based inference**: Generates and solves type constraints for flexible, modular type checking
- **Type variable scoping with levels**: Prevents type variables from escaping their scope (Standard ML approach)
- **Width subtyping for records**: Records with extra fields are subtypes (duck-typing-like flexibility)
- **Nominal typing for variants**: Variant types require exact name matching
- **Let-polymorphism**: Automatic generalization and instantiation of polymorphic types
- **Syntactic value restriction**: Only syntactic values can be generalized (prevents unsound polymorphism)
