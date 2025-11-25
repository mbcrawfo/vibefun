# Subtyping

Vibefun implements a limited form of subtyping that enables flexible programming while preserving decidable type inference. This document formalizes the subtyping rules and their interaction with type inference.

## Overview

Vibefun uses:
- **Width subtyping** for records (structural)
- **Nominal typing** for variants (no subtyping)
- **Invariant** type parameters
- **Unification-based** integration with type inference

This approach is deliberately conservative—it provides practical flexibility (especially for JavaScript interop) while avoiding the complexity and undecidability of full subtyping systems.

## Record Width Subtyping

### Definition

A record type `R1` is a **subtype** of record type `R2` (written `R1 <: R2`) if:

1. **Field containment**: `R1` has all the fields of `R2`
2. **Field compatibility**: Each corresponding field in `R1` has a type compatible with the field in `R2`

Formally:

```
R1 = { f1: T1, f2: T2, ..., fn: Tn, extra1: E1, ..., extrak: Ek }
R2 = { f1: S1, f2: S2, ..., fn: Sn }

R1 <: R2  if  T1 ~ S1, T2 ~ S2, ..., Tn ~ Sn
```

Where `T ~ S` means types `T` and `S` unify (are compatible).

### Examples

```vibefun
type Point2D = { x: Int, y: Int };
type Point3D = { x: Int, y: Int, z: Int };
type ColoredPoint = { x: Int, y: Int, color: String };

// Point3D <: Point2D (has all Point2D fields plus z)
let p3: Point3D = { x: 1, y: 2, z: 3 };
let p2: Point2D = p3;  // OK

// ColoredPoint <: Point2D (has all Point2D fields plus color)
let colored: ColoredPoint = { x: 5, y: 10, color: "red" };
let p2again: Point2D = colored;  // OK

// NOT a subtype relationship:
// { x: Int } is NOT a subtype of { x: Int, y: Int }
// (missing required field y)
```

### Symmetric Width Matching in Unification

**Important**: Vibefun's width subtyping is implemented through **unification**, not a separate subtyping check. During record unification:

1. Find the common fields between both record types
2. Unify only the common fields
3. Extra fields in either record are ignored

This means width subtyping is **symmetric** during unification—either record can have extra fields:

```vibefun
// Both directions work during unification
let f = (x: { a: Int }) => x.a;

f({ a: 1, b: 2 });  // OK: argument has extra field b
```

This differs from traditional subsumption-based subtyping where `<:` is directional.

## Integration with Type Inference

### Unification-Based Approach

Vibefun integrates subtyping into Hindley-Milner type inference through a modified unification algorithm. This preserves:

- **Decidability**: Type inference always terminates
- **Principal types**: Inferred types are most general
- **Predictability**: No surprising type coercions

The unification algorithm for records works as follows:

```
unify(Record1, Record2):
    common_fields = intersection(Record1.fields, Record2.fields)
    for each field in common_fields:
        unify(Record1[field], Record2[field])
    // Extra fields are NOT an error
    return success
```

### Why Not Full Subtyping?

Traditional subtyping with subsumption rule (`if e : T1 and T1 <: T2 then e : T2`) creates problems:

1. **Undecidable inference**: General subtyping with polymorphism is undecidable
2. **Loss of principal types**: Multiple valid types exist, no "best" choice
3. **Complex error messages**: Hard to explain why types don't match
4. **Implementation complexity**: Requires constraint solving with inequalities

Vibefun's unification-based approach avoids these issues while providing practical width subtyping for records.

### When Inference "Just Works"

For most record operations, type inference handles width subtyping automatically:

```vibefun
// Function infers minimum required fields
let getX = (p) => p.x;
// Inferred: <A>({ x: A, ... }) -> A

// Can be called with any record having x
getX({ x: 42 });          // A := Int
getX({ x: 42, y: 100 });  // Extra field y is fine
getX({ x: "hello", z: true });  // Different extra fields
```

## Function Type Variance

### Theoretical Variance Rules

In type theory, function types have the following variance:

- **Contravariant** in parameter types: If `S <: T`, then `(T) -> R <: (S) -> R`
- **Covariant** in return types: If `R <: S`, then `(T) -> R <: (T) -> S`

### Vibefun's Current Behavior

**Vibefun does NOT implement variance for function types.** Function types must unify exactly:

```vibefun
type Point2D = { x: Int, y: Int };
type Point3D = { x: Int, y: Int, z: Int };

// These function types do NOT have a subtyping relationship in Vibefun
let f: (Point3D) -> Int = (p) => p.x + p.y + p.z;
let g: (Point2D) -> Int = f;  // ERROR: types must match exactly
```

### Why No Function Variance?

Implementing variance for function types would require:

1. **Directional type checking**: Know whether we're in covariant or contravariant position
2. **Subsumption rule**: Separate from unification
3. **Bidirectional typing**: Track expected types through inference

These add significant complexity without proportional benefit for Vibefun's goals. The current approach:

- Keeps inference simple and predictable
- Provides good error messages
- Matches most practical use cases

### Workarounds

If you need to pass a function expecting fewer fields:

```vibefun
type Point2D = { x: Int, y: Int };
type Point3D = { x: Int, y: Int, z: Int };

// Instead of relying on variance, be explicit:
let process2D: (Point2D) -> Int = (p) => p.x + p.y;
let process3D: (Point3D) -> Int = (p) => process2D(p);  // Manual wrapping
```

## Type Parameter Invariance

### The Rule

Generic type parameters are **strictly invariant**—they must match exactly:

```vibefun
type Box<T> = { value: T };

let intBox: Box<Int> = { value: 42 };
let numBox: Box<Float> = intBox;  // ERROR: Box<Int> is not Box<Float>
```

Even when width subtyping would apply to the contained types:

```vibefun
type Point2D = { x: Int, y: Int };
type Point3D = { x: Int, y: Int, z: Int };

// Point3D <: Point2D, but...
let box3D: Box<Point3D> = { value: { x: 1, y: 2, z: 3 } };
let box2D: Box<Point2D> = box3D;  // ERROR: type parameters must match exactly
```

### Why Invariance is Required

Covariant type parameters would be **unsound** even for immutable data:

```vibefun
// Hypothetically, if List<Point3D> <: List<Point2D>:

let points3D: List<Point3D> = [{ x: 1, y: 2, z: 3 }];
let points2D: List<Point2D> = points3D;  // Hypothetically allowed

// Now points2D and points3D refer to the same list

// Add a Point2D (which lacks z):
let newList = Cons({ x: 5, y: 6 }, points2D);

// If we access through points3D reference:
match newList {
    | Cons(p, _) => p.z  // ERROR at runtime! p doesn't have z
}
```

The issue is that type parameters appear in both covariant positions (producing values) and contravariant positions (consuming values) in most generic types.

### Safe Covariance (Future Consideration)

Some languages (Kotlin, Scala, TypeScript) support **declaration-site variance** annotations:

```typescript
// TypeScript example (not Vibefun syntax)
interface ReadonlyBox<out T> {  // 'out' means covariant
    get(): T;
    // set(value: T): void;  // NOT allowed with 'out'
}
```

This is not currently supported in Vibefun but could be added in the future if needed.

## When Type Annotations Help

### Annotations Are Rarely Required

Due to complete Hindley-Milner inference with width subtyping via unification, type annotations are **optional** in most cases:

```vibefun
// All types inferred correctly
let getX = (p) => p.x;              // <A>({ x: A }) -> A
let add = (a, b) => a + b;          // (Int, Int) -> Int
let identity = (x) => x;            // <T>(T) -> T
let points = [{ x: 1, y: 2 }];      // List<{ x: Int, y: Int }>
```

### When Annotations Are Helpful

**1. Documentation**: Make intent explicit for readers

```vibefun
// Type annotation documents expected input
let processUser: (User) -> String = (user) => user.name;
```

**2. Constraining polymorphism**: Prevent unwanted generalization

```vibefun
// Without annotation: inferred as <T>(List<T>) -> T
let first = (list) => List.head(list);

// With annotation: constrained to Int only
let firstInt: (List<Int>) -> Int = (list) => List.head(list);
```

**3. Error localization**: Help identify where type mismatches occur

```vibefun
// Annotation helps pinpoint errors in complex expressions
let result: String = complexComputation();  // Error points here if not String
```

**4. Value restriction workarounds**: Enable polymorphism for non-values

```vibefun
// Without annotation: monomorphic due to value restriction
let composed = f >> g;  // (t) -> t

// With annotation: can force polymorphism (if semantically valid)
let composed: <T>(T) -> T = (x) => f(g(x));  // Eta-expanded
```

### Annotations Are Never Required For

- **Width subtyping**: Works automatically during unification
- **Let-polymorphism**: Generalization is automatic for syntactic values
- **Record field access**: Field types are inferred
- **Pattern matching**: Scrutinee and pattern types inferred

## Summary

| Concept | Behavior | Rationale |
|---------|----------|-----------|
| **Records** | Width subtyping via unification | Practical flexibility, JS interop |
| **Variants** | Nominal (no subtyping) | Type safety, clear errors |
| **Functions** | Exact matching (no variance) | Simplicity, predictability |
| **Type parameters** | Invariant | Soundness, even for immutable data |
| **Annotations** | Optional | Complete inference |

Vibefun's approach prioritizes:
- **Decidable inference**: Always terminates, finds principal types
- **Predictable behavior**: No surprising type coercions
- **Clear error messages**: Easy to understand type mismatches
- **Practical flexibility**: Width subtyping for records covers common use cases
