# Record Types

### Record Types

Records are product types with named fields.

#### Type Definition

```vibefun
type Person = {
    name: String,
    age: Int,
    email: String
}
```

#### Construction

```vibefun
let person = {
    name: "Alice",
    age: 30,
    email: "alice@example.com"
}
```

#### Field Access

```vibefun
let name = person.name;  // "Alice"
let age = person.age;  // 30
```

#### Update (Immutable)

```vibefun
let older = { ...person, age: 31 };  // Creates new record
```

#### Structural Typing with Width Subtyping

Records use **structural typing with width subtyping**: two record types with the same fields are compatible, and records with **extra fields** are subtypes of records with fewer fields.

```vibefun
type Point2D = { x: Int, y: Int };
type Vector2D = { x: Int, y: Int };

let p: Point2D = { x: 1, y: 2 };
let v: Vector2D = p;  // OK - same structure

// Width subtyping: records with extra fields accepted
let point3D = { x: 1, y: 2, z: 3 };
let point2D: Point2D = point3D;  // OK - has x and y (z ignored)

// Functions accept "at least these fields"
let getX = (p: { x: Int }) => p.x;

getX({ x: 1, y: 2 })        // OK - has x (and extra y)
getX({ x: 5, y: 10, z: 15 }) // OK - has x (extra fields ignored)
```

This provides **duck-typing-like flexibility** with compile-time safety: functions can work with any record that has "at least" the required fields.

#### Width Subtyping Implementation Details

**Subtype relation:**
- A record type `R1` is a subtype of `R2` (written `R1 <: R2`) if:
  1. `R1` has **all** the fields of `R2`
  2. Each corresponding field has a **compatible type**

```vibefun
// Example 1: Extra fields
type Point2D = { x: Int, y: Int };
type Point3D = { x: Int, y: Int, z: Int };

// Point3D <: Point2D (Point3D has all Point2D fields plus z)
let p3: Point3D = { x: 1, y: 2, z: 3 };
let p2: Point2D = p3;  // ✅ OK: Point3D <: Point2D

// Example 2: Field type compatibility
type Numeric = { value: Int };
type Labeled = { value: Int, label: String };

// Labeled <: Numeric
let labeled: Labeled = { value: 42, label: "Answer" };
let numeric: Numeric = labeled;  // ✅ OK

// Example 3: Order doesn't matter (structural typing)
type A = { x: Int, y: Int };
type B = { y: Int, x: Int };

// A and B are THE SAME type (order doesn't matter)
let a: A = { x: 1, y: 2 };
let b: B = a;  // ✅ OK: same structure
```

**Type checking rules:**

During unification, when checking if record type `R1` is compatible with `R2`:
1. **Field name matching**: All field names in `R2` must exist in `R1`
2. **Field type unification**: Each field type in `R1` must unify with the corresponding field in `R2`
3. **Extra fields**: Fields in `R1` not present in `R2` are **ignored**

```vibefun
// Function parameter with record type
let distance = (p: { x: Int, y: Int }) =>
    // p must have at least { x: Int, y: Int }
    p.x * p.x + p.y * p.y;

// Can pass records with extra fields
distance({ x: 3, y: 4 })  // OK
distance({ x: 3, y: 4, z: 5 })  // OK - z ignored
distance({ x: 3, y: 4, label: "origin" })  // OK - label ignored
```

**Limitations:**

Width subtyping is **invariant** in type variables:

```vibefun
type Box<T> = { value: T };

let intBox: Box<Int> = { value: 42 };
let numBox: Box<Float> = intBox  // ❌ Error: Box<Int> ≠ Box<Float>
// Type parameters must match exactly (no variance)
```

**Contravariance in function types:**

When records appear in function argument positions, subtyping is **contravariant**:

```vibefun
type Point2D = { x: Int, y: Int };
type Point3D = { x: Int, y: Int, z: Int };

// Function that accepts Point3D
let process3D: (Point3D) -> Int = (p) => p.x + p.y + p.z;

// Can we assign to a function that accepts Point2D?
let process2D: (Point2D) -> Int = process3D;
// ❌ Error: (Point3D) -> Int is NOT a subtype of (Point2D) -> Int

// Why? If this were allowed:
// process2D({ x: 1, y: 2 })  // Pass Point2D
// But process3D expects z, which doesn't exist!

// The reverse IS allowed (covariant in return type, contravariant in args):
let accepts2D: (Point2D) -> Int = (p) => p.x + p.y;
let accepts3D: (Point3D) -> Int = accepts2D;  // ✅ OK
// A function expecting Point2D can accept Point3D (has all fields)
```

**Pattern matching and width subtyping:**

Pattern matching on records respects width subtyping:

```vibefun
type Point2D = { x: Int, y: Int };

let describe = (p: Point2D) => match p {
    | { x: 0, y: 0 } => "origin"
    | { x, y } => "point at (" & String.fromInt(x) & ", " & String.fromInt(y) & ")"
}

// Can pass records with extra fields
describe({ x: 3, y: 4 })  // OK: "point at (3, 4)"
describe({ x: 0, y: 0, z: 0 })  // OK: "origin" (z ignored)
```

**Inference with width subtyping:**

The type checker infers **minimum required fields** when a record is used:

```vibefun
// Function without type annotation
let getX = (p) => p.x;

// Inferred type: <A>({ x: A, ... }) -> A
// The "..." means "and possibly other fields"

// Type checker infers minimum requirements:
getX({ x: 42 });  // OK: A := Int
getX({ x: 42, y: 100 })  // OK: extra fields allowed
getX({ y: 100 })  // ❌ Error: missing required field x
```

#### Field Shorthand and Type Inference

Record literals support **field shorthand** syntax where `{ name, age }` is equivalent to `{ name: name, age: age }` when variables with matching names are in scope.

**Typing rules:**
The type checker uses the variable's type for the corresponding record field type. No special typing rules are needed—it's simply syntactic sugar that desugars before type checking.

```vibefun
// Variables with known types
let name: String = "Alice";
let age: Int = 30;

// Field shorthand
let person = { name, age };
// Type: { name: String, age: Int }

// Equivalent to explicit syntax
let personExplicit = { name: name, age: age };
// Same type: { name: String, age: Int }
```

**Type inference with shorthand:**

```vibefun
// Shorthand with inferred variable types
let x = 10;  // Inferred: Int
let y = 20;  // Inferred: Int
let point = { x, y };
// Inferred type: { x: Int, y: Int }

// Mixed shorthand and explicit fields
let name = "Bob";
let user = { name, age: 25, active: true };
// Inferred type: { name: String, age: Int, active: Bool }
```

**Shorthand with width subtyping:**

Field shorthand works seamlessly with width subtyping:

```vibefun
type Person = { name: String, age: Int };

let name = "Alice";
let age = 30;
let email = "alice@example.com";

// Shorthand creates record with extra field
let user = { name, age, email };
// Type: { name: String, age: Int, email: String }

// Can be used where Person is expected (width subtyping)
let person: Person = user;  // ✅ OK: has name and age (email ignored)
```

**Shorthand in function parameters:**

```vibefun
// Destructuring with shorthand in function body
let makePerson = (name, age, email) => {
    // Create record using parameter values with shorthand
    { name, age, email }
}
// Type: (String, Int, String) -> { name: String, age: Int, email: String }

// Call site
let p = makePerson("Bob", 25, "bob@example.com");
// Type: { name: String, age: Int, email: String }
```

