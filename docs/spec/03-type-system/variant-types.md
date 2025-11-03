# Variant Types

### Variant Types

Variants (also called sum types or tagged unions) represent values that can be one of several alternatives.

#### Simple Enums

```vibefun
type Color = Red | Green | Blue
```

#### Variants with Data

```vibefun
type Option<T> = Some(T) | None

type Result<T, E> =
    | Ok(T)
    | Err(E)
```

#### Complex Variants

```vibefun
type Shape =
    | Circle(Float)                          // radius
    | Rectangle(Float, Float)                // width, height
    | Triangle(Float, Float, Float)          // sides
```

#### Constructor Functions

Variant constructors are functions:

```vibefun
Some: <T>(T) -> Option<T>
None: <T>Option<T>

Circle: (Float) -> Shape
Rectangle: (Float, Float) -> Shape
```

#### Nominal Typing for Variants

Variants use **nominal typing**: two variant types are compatible **only if they have the same type name**, even if they have identical constructors.

```vibefun
type Status = Pending | Active | Complete
type State = Pending | Active | Complete

let status: Status = Pending
let state: State = status  // ERROR: Status ≠ State

// Even though constructors are identical, these are different types
```

This prevents accidental mixing of semantically different types:

```vibefun
type HttpStatus = Ok | NotFound | ServerError
type DatabaseStatus = Ok | NotFound | ServerError

// These are DIFFERENT types - cannot be mixed
let httpStatus: HttpStatus = Ok
let dbStatus: DatabaseStatus = httpStatus  // ERROR: different types
```

**Rationale**: Nominal typing for variants provides type safety by preventing confusion between types that happen to have the same structure but represent different concepts.

