# Generic Types

### Generics (Parametric Polymorphism)

Generics allow types and functions to be parameterized by type variables.

#### Generic Types

```vibefun
type Box<T> = { value: T };

type Pair<A, B> = { first: A, second: B };

type Either<L, R> = Left(L) | Right(R);
```

#### Generic Functions

```vibefun
let identity: <T>(T) -> T = (x) => x;

let map: <A, B>(List<A>, (A) -> B) -> List<B> = (list, f) => ...;
```

#### Multiple Type Parameters

```vibefun
let zip: <A, B>(List<A>, List<B>) -> List<Pair<A, B>> = ...;
```

### Type Parameter Variance

**Variance** describes how subtyping relationships between type parameters relate to subtyping relationships between parameterized types. Vibefun uses **invariant** type parameters.

#### Invariance: The Rule

In Vibefun, type parameters are **strictly invariant**—they must match exactly:

```vibefun
type Box<T> = { value: T };
type Point2D = { x: Int, y: Int };
type Point3D = { x: Int, y: Int, z: Int };

// Even though Point3D <: Point2D (width subtyping)...
let box3D: Box<Point3D> = { value: { x: 1, y: 2, z: 3 } };
let box2D: Box<Point2D> = box3D;  // ❌ ERROR: Box<Point3D> ≠ Box<Point2D>

// Type parameters must match exactly
let intList: List<Int> = [1, 2, 3];
let floatList: List<Float> = intList;  // ❌ ERROR: List<Int> ≠ List<Float>
```

#### Why Not Covariance?

**Covariance** would mean: if `A <: B`, then `Container<A> <: Container<B>`. This seems intuitive but is **unsound** for many types:

```vibefun
// Hypothetically, if List<Point3D> <: List<Point2D>:

let points3D: List<Point3D> = [{ x: 1, y: 2, z: 3 }];
let points2D: List<Point2D> = points3D;  // Hypothetically allowed

// Now both variables reference the same list data

// What if we could add to points2D?
// points2D.add({ x: 5, y: 6 });  // Point2D without z

// Access through points3D:
// match points3D[1] {
//     | p => p.z   // RUNTIME ERROR: no z field!
// }
```

The problem: type parameters appear in both **producing** (read) and **consuming** (write) positions. Covariance is only safe when values are only produced, never consumed.

#### Why Not Contravariance?

**Contravariance** would mean: if `A <: B`, then `Container<B> <: Container<A>`. This is the opposite of covariance and has similar soundness issues for generic types.

#### Variance in Other Languages

Some languages support **declaration-site variance** annotations:

| Language | Covariance | Contravariance | Example |
|----------|------------|----------------|---------|
| **Kotlin** | `out T` | `in T` | `List<out T>`, `Comparable<in T>` |
| **Scala** | `+T` | `-T` | `List[+T]`, `Function1[-T, +R]` |
| **C#** | `out T` | `in T` | `IEnumerable<out T>` |
| **TypeScript** | Structural | Structural | `readonly` arrays are covariant |

These annotations tell the type checker:
- `out`/`+`: Type parameter only appears in output positions (covariant is safe)
- `in`/`-`: Type parameter only appears in input positions (contravariant is safe)

#### Vibefun's Design Decision

Vibefun uses **invariant** type parameters for all generic types because:

1. **Simplicity**: No variance annotations to learn or maintain
2. **Soundness**: No risk of variance-related runtime errors
3. **Predictability**: Types either match or they don't—no subtle relationships
4. **Implementation simplicity**: Unification-based type checking "just works"

The trade-off is less flexibility in some polymorphic patterns, but this is rarely a problem in practice.

#### Workarounds for Variance-Like Behavior

**1. Use width subtyping directly**: Let subtyping happen at the value level, not the container level

```vibefun
// Instead of trying to convert containers...
let box3D: Box<Point3D> = { value: { x: 1, y: 2, z: 3 } };

// ...use width subtyping when extracting values
let p2D: Point2D = box3D.value;  // ✅ OK: Point3D <: Point2D
```

**2. Use generic functions**: Polymorphism at the function level

```vibefun
// Generic function works with any Box<T>
let getBoxValue = <T>(box: Box<T>) => box.value;

// Width subtyping at call sites
let box3D: Box<Point3D> = { value: { x: 1, y: 2, z: 3 } };
let value = getBoxValue(box3D);  // Type: Point3D

// Then use width subtyping on the result
let p2D: Point2D = value;  // ✅ OK
```

**3. Create adapter functions**: Explicit conversion when needed

```vibefun
let boxPoint3DToPoint2D = (box: Box<Point3D>) => {
    { value: box.value }  // New Box<Point2D> via width subtyping on inner value
};
```

#### Variance in Function Types

While generic type parameters are invariant, **function types** have natural variance properties:

- Parameters are **contravariant** (can accept more general types)
- Return types are **covariant** (can return more specific types)

However, Vibefun's unification-based type checking requires exact function type matching. See [Record Types](./record-types.md#contravariance-in-function-types) for details and workarounds.

#### Summary

| Aspect | Vibefun Behavior | Rationale |
|--------|------------------|-----------|
| Type parameter variance | **Invariant** | Soundness, simplicity |
| Subtyping | Via width subtyping on records | Practical flexibility |
| Workarounds | Extract values, use generics, adapters | Cover most use cases |
| Future | May add optional variance annotations | If proven necessary |

**Key insight**: Most variance-related patterns can be achieved through width subtyping at value extraction points rather than container-level subtyping.

