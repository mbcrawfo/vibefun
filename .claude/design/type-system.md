# Vibefun Type System Design

## Overview

Vibefun uses a combination of Hindley-Milner type inference with modern extensions including generics and union types. The type system is designed to be:

1. **Sound** - Well-typed programs don't go wrong
2. **Expressive** - Can represent complex data relationships
3. **Inferable** - Types can be inferred without excessive annotations
4. **Practical** - Works well with JavaScript interop

## Type Hierarchy

```
Type
├── Primitive
│   ├── Int
│   ├── Float
│   ├── String
│   ├── Bool
│   └── Unit
├── Function
│   └── (T1, T2, ..., Tn) -> T
├── TypeVariable
│   └── 'a, 'b, 'c (polymorphic)
├── Record
│   └── { field1: T1, field2: T2, ... }
├── Variant
│   └── Constructor1(T1) | Constructor2(T2) | ...
├── Application
│   └── TypeConstructor<T1, T2, ...>
│       ├── List<T>
│       ├── Option<T>
│       ├── Result<T, E>
│       └── Custom<A, B, ...>
└── Union
    └── T1 | T2 | ... | Tn
```

## Type Inference Algorithm

### Hindley-Milner Inference

The core algorithm follows Hindley-Milner with Algorithm W:

1. **Generate constraints**: Walk the AST and generate type equations
2. **Unification**: Solve type equations to find most general type
3. **Instantiation**: Replace type variables with concrete types
4. **Generalization**: Abstract type variables into polymorphic types

### Type Variables

- Fresh type variables: `'a`, `'b`, `'c`, etc.
- Scoped to let-bindings (generalized at let, instantiated at use)

### Example Inference

```vibefun
let identity = (x) => x
// 1. Generate: x: 'a, body: 'a, function: 'a -> 'a
// 2. Generalize: ∀ 'a. 'a -> 'a
// 3. Use site: instantiate with fresh variable

let y = identity(42)
// 1. identity: ∀ 'a. 'a -> 'a
// 2. Instantiate: 'b -> 'b
// 3. Unify: 'b = Int (from 42)
// 4. Result: y: Int
```

## Type Checking Rules

### Literals

```
⊢ 42 : Int
⊢ 3.14 : Float
⊢ "hello" : String
⊢ true : Bool
⊢ () : Unit
```

### Variables

```
Γ(x) = T
─────────
Γ ⊢ x : T
```

### Functions

```
Γ, x: T1 ⊢ e : T2
──────────────────────────
Γ ⊢ (x) => e : T1 -> T2
```

### Application

```
Γ ⊢ f : T1 -> T2    Γ ⊢ x : T1
──────────────────────────────
Γ ⊢ f(x) : T2
```

### Let Bindings

```
Γ ⊢ e1 : T1    Γ, x: gen(T1) ⊢ e2 : T2
──────────────────────────────────────
Γ ⊢ let x = e1 in e2 : T2

where gen(T) generalizes free type variables in T
```

### Pattern Matching

```
Γ ⊢ e : T    ∀ i. Γ, pattern_i : T ⊢ body_i : T'
────────────────────────────────────────────────
Γ ⊢ match e { pattern_i => body_i } : T'

(all branches must have same type T')
```

#### Or Patterns

Or patterns allow matching multiple cases with the same handler:

```
Γ ⊢ e : T    Γ, p1 : T ⊢ body : T'    Γ, p2 : T ⊢ body : T'
──────────────────────────────────────────────────────────
Γ ⊢ match e { p1 | p2 => body } : T'

(all patterns in or-pattern must bind same variables with same types)
```

Example:
```vibefun
match status {
    | "pending" | "loading" => "In progress"  // OK
    | "success" => "Done"
}
```

### Overloaded External Functions

External functions can be declared with multiple type signatures, enabling natural JavaScript interop. Resolution is compile-time based on arity (argument count):

```
external f: (T1) -> R1 = "jsFunc"
external f: (T1, T2) -> R2 = "jsFunc"
─────────────────────────────────────
f(x) resolves to first signature
f(x, y) resolves to second signature
```

Type checking rules:

1. **Declaration validation**: All overloads must:
   - Map to the same JavaScript function name
   - Be function types (not values)
   - Have different arities

2. **Call site resolution**: At each call site, select the overload whose arity matches the number of arguments

3. **Type checking**: Check arguments against selected overload's parameter types

Example:
```vibefun
external fetch: (String) -> Promise<Response> = "fetch"
external fetch: (String, RequestInit) -> Promise<Response> = "fetch"

// Type checking:
let r1 = fetch("url")              // resolves to first overload
let r2 = fetch("url", options)     // resolves to second overload
let r3 = fetch("url", x, y)        // error: no matching overload
```

**Important**: Overloading is limited to `external` declarations only. Pure vibefun functions cannot be overloaded; use pattern matching or different function names instead.

## Algebraic Data Types

### Sum Types (Variants)

```vibefun
type Option<T> = Some(T) | None

// Internal representation:
// Option<T> is a type constructor: * -> *
// Some: T -> Option<T>
// None: Option<T>
```

Type checking variant construction:

```
type T = C1(T1) | C2(T2) | ... | Cn(Tn)

Γ ⊢ e : Ti
─────────────────────
Γ ⊢ Ci(e) : T
```

### Product Types (Records)

```vibefun
type Person = { name: String, age: Int }

// Type checking record construction:
Γ ⊢ e1 : T1    Γ ⊢ e2 : T2    ...    Γ ⊢ en : Tn
────────────────────────────────────────────────
Γ ⊢ { field1: e1, field2: e2, ..., fieldn: en } : { field1: T1, field2: T2, ..., fieldn: Tn }
```

Record field access:

```
Γ ⊢ e : { ..., field: T, ... }
───────────────────────────────
Γ ⊢ e.field : T
```

Record update:

```
Γ ⊢ e1 : { field: T, ...rest }    Γ ⊢ e2 : T
──────────────────────────────────────────────
Γ ⊢ { ...e1, field: e2 } : { field: T, ...rest }
```

## Generics (Parametric Polymorphism)

### Type Parameters

```vibefun
// Type parameter declaration
type Box<T> = { value: T }

// Generic function
let map: <A, B>(List<A>, (A) -> B) -> List<B> = (list, f) => ...
```

### Type Application

```vibefun
let intBox: Box<Int> = { value: 42 }
let stringBox: Box<String> = { value: "hello" }
```

### Constraints

For now, no constraint system (no type classes). Future work might add:

```vibefun
// Future: type class constraints
let sum: <T: Numeric>(List<T>) -> T = ...
```

## Union Types

### Literal Unions

```vibefun
type Status = "pending" | "active" | "complete"

// Type checking:
Γ ⊢ "pending" : "pending"
Γ ⊢ "active" : "active"
Γ ⊢ "complete" : "complete"

let status: Status = "pending"  // OK
let status: Status = "invalid"  // Error: "invalid" is not assignable to Status
```

### Type Unions

```vibefun
type NumberOrString = Int | String

// Subtyping rules:
Int <: Int | String
String <: Int | String

// Use requires discrimination:
let process = (x: Int | String) => match x {
    | n: Int => "number: " &String.fromInt(n)
    | s: String => "string: " &s
}
```

### Union Narrowing

Pattern matching narrows union types:

```vibefun
let x: Int | String = ...

match x {
    | n: Int =>
        // In this branch, x has type Int
        n + 1
    | s: String =>
        // In this branch, x has type String
        s &"!"
}
```

## Type Annotations

### When Required

Type annotations are required in:

1. **External declarations**: FFI needs explicit types
2. **Ambiguous expressions**: When inference would fail
3. **Public API boundaries**: Module exports (recommended)
4. **Recursive types**: Complex recursive definitions

### When Optional

Type annotations are optional for:

1. **Let bindings**: Type is inferred from RHS
2. **Function parameters**: Inferred from usage
3. **Return types**: Inferred from body

### Annotation Syntax

```vibefun
// Variable annotation
let x: Int = 42

// Function annotation (full)
let add: (Int, Int) -> Int = (x, y) => x + y

// Function annotation (partial - just return type)
let add = (x: Int, y: Int): Int => x + y

// Generic annotation
let identity: <T>(T) -> T = (x) => x

// Record annotation
let person: Person = { name: "Alice", age: 30 }

// Variant annotation
let result: Result<Int, String> = Ok(42)
```

## Runtime Type Checking

Vibefun includes runtime type checking for:

1. **FFI boundaries**: Validate JS values match declared types
2. **Development mode**: Additional runtime checks (disabled in production)
3. **Variant exhaustiveness**: Ensure all cases handled

### Type Representation

Types are represented at runtime for checking:

```typescript
// Runtime type representation (TypeScript)
type RuntimeType =
    | { kind: 'Int' }
    | { kind: 'Float' }
    | { kind: 'String' }
    | { kind: 'Bool' }
    | { kind: 'Unit' }
    | { kind: 'Function'; params: RuntimeType[]; return: RuntimeType }
    | { kind: 'Record'; fields: Record<string, RuntimeType> }
    | { kind: 'Variant'; name: string; constructors: Record<string, RuntimeType[]> }
    | { kind: 'Application'; constructor: string; args: RuntimeType[] }
    | { kind: 'Union'; types: RuntimeType[] }
```

### Type Checking Functions

```typescript
// Runtime type checker (generated code)
function checkType(value: unknown, type: RuntimeType): boolean {
    switch (type.kind) {
        case 'Int':
            return typeof value === 'number' && Number.isInteger(value)
        case 'String':
            return typeof value === 'string'
        case 'Record':
            return typeof value === 'object' &&
                   Object.entries(type.fields).every(([key, fieldType]) =>
                       key in value && checkType(value[key], fieldType)
                   )
        // ... other cases
    }
}
```

## Type Errors

### Error Messages

Good error messages are critical. Examples:

```
Error: Type mismatch
  Expected: Int
  Got: String
  Location: main.vibe:12:5

12 |     let x: Int = "hello"
    |                  ^^^^^^^ String is not assignable to Int

Help: Did you mean to convert the string to an integer using String.toInt?
```

```
Error: Pattern match not exhaustive
  Missing cases: None
  Location: main.vibe:15:10

15 |     match option {
   |           ^^^^^^ This expression has type Option<Int>

16 |         | Some(x) => x
   |         ^^^^^^^^^^^^^^^ Only Some(x) is handled

Help: Add a case for None:
    | None => <default value>
```

### Common Type Errors

1. **Type mismatch**: Expected type T1, got T2
2. **Occurs check**: Infinite type (e.g., 'a = 'a -> 'a)
3. **Undefined variable**: Variable not in scope
4. **Arity mismatch**: Wrong number of arguments
5. **Field not found**: Record field doesn't exist
6. **Pattern not exhaustive**: Missing match cases
7. **Union type not narrowed**: Can't use union type without discrimination

## Type System Implementation

### Data Structures

```typescript
// Type representation in compiler
type Type =
    | { type: 'Var'; id: number }  // Type variable
    | { type: 'Const'; name: string }  // Primitive or named type
    | { type: 'Fun'; params: Type[]; return: Type }
    | { type: 'App'; constructor: Type; args: Type[] }
    | { type: 'Record'; fields: Map<string, Type> }
    | { type: 'Variant'; constructors: Map<string, Type[]> }
    | { type: 'Union'; types: Type[] }

// Type environment (Gamma)
type TypeEnv = Map<string, TypeScheme>

// Type scheme (polymorphic type)
type TypeScheme = {
    vars: number[]  // Quantified type variables
    type: Type
}
```

### Unification Algorithm

```typescript
function unify(t1: Type, t2: Type, substitution: Substitution): Substitution {
    // Apply current substitution
    t1 = apply(substitution, t1)
    t2 = apply(substitution, t2)

    if (equal(t1, t2)) {
        return substitution
    }

    if (t1.type === 'Var') {
        if (occursIn(t1.id, t2)) {
            throw new TypeError('Occurs check failed: infinite type')
        }
        return compose(substitution, { [t1.id]: t2 })
    }

    if (t2.type === 'Var') {
        return unify(t2, t1, substitution)
    }

    if (t1.type === 'Fun' && t2.type === 'Fun') {
        let sub = unifyList(t1.params, t2.params, substitution)
        return unify(t1.return, t2.return, sub)
    }

    if (t1.type === 'App' && t2.type === 'App') {
        let sub = unify(t1.constructor, t2.constructor, substitution)
        return unifyList(t1.args, t2.args, sub)
    }

    throw new TypeError(`Cannot unify ${typeToString(t1)} with ${typeToString(t2)}`)
}
```

## Future Extensions

1. **Row polymorphism**: For extensible records
2. **Rank-N types**: Higher-rank polymorphism
3. **Type classes**: Ad-hoc polymorphism (traits/interfaces)
4. **Effect types**: Track side effects in types
5. **Dependent types**: Types that depend on values (far future)
6. **Refinement types**: Types with predicates
7. **Gradual typing**: Mix static and dynamic typing more flexibly
