# Type Inference and Polymorphism

### Type Variables and Polymorphism

Type variables represent polymorphic types and enable generic programming.

#### Type Variable Syntax

Vibefun uses **explicit type parameter syntax** with angle brackets `<T>` for declaring type parameters:

```vibefun
// Type parameters in function signatures
let identity: <T>(T) -> T = (x) => x;
let map: <A, B>(List<A>, (A) -> B) -> List<B> = ...;

// Type parameters in type definitions
type Box<T> = { value: T };
type Option<T> = Some(T) | None;
type Result<T, E> = Ok(T) | Err(E);
```

**Naming conventions:**
- Type parameters use `PascalCase`: `<T>`, `<A>`, `<B>`, `<TValue>`, `<TError>`
- Use single letters for generic types: `<T>`, `<A>`, `<B>`
- Use descriptive names for semantic clarity: `<TValue>`, `<TError>`, `<TKey>`

#### Implicit vs Explicit Type Parameters

Type parameters are **implicitly quantified** at the outermost level of type signatures—you don't write `forall`:

```vibefun
// Implicit quantification (standard)
let identity: <T>(T) -> T = (x) => x;

// NOT used: forall T. (T) -> T  (we don't use forall syntax)
```

At use sites, type parameters are **always inferred**—there is no syntax for explicit type application:

```vibefun
let id: <T>(T) -> T = (x) => x;

// Type parameters inferred from arguments
id(42);  // T inferred as Int
id("hello");  // T inferred as String

// NO explicit type application syntax:
// id<Int>(42)     // ❌ Not supported
// id::<String>("hello")  // ❌ Not supported
```

#### Type Variable Scoping

Type variables are **lexically scoped** to their declaration:

```vibefun
// Each function has independent type variables
let f: <T>(T) -> T = ...;  // T scoped to f
let g: <T>(T) -> T = ...;  // Different T scoped to g

// Type variables in nested positions
let apply: <A, B>((A) -> B, A) -> B = (f, x) => f(x);
//         ^^^^^^  ^^^^^^^^^^^^^^     ^^^^^^^^^^
//         declared    used in type    used in body

// Type variables in type definitions
type Pair<A, B> = { first: A, second: B };
//        ^^^^                ^^      ^^
//        declared            used    used
```

#### Type Variable Inference

The type checker automatically infers type variables using Hindley-Milner inference:

```vibefun
// Type parameters inferred (no annotation needed)
let identity = (x) => x;
// Inferred type: <T>(T) -> T

let first = (x, y) => x;
// Inferred type: <A, B>(A, B) -> A

let applyTwice = (f, x) => f(f(x));
// Inferred type: <T>((T) -> T, T) -> T
```

#### Polymorphic Instantiation

When a polymorphic function is used, the type checker **instantiates** its type variables with fresh type variables or concrete types:

```vibefun
let id: <T>(T) -> T = (x) => x;

// Each use instantiates T independently
let a = id(42);  // T := Int
let b = id("hello");  // T := String
let c = id(true);  // T := Bool

// In a polymorphic context
let apply = (f, x) => f(x);
// When apply is called with id, the type variables are unified
apply(id, 42);  // id's T unified with Int, apply's A := Int, B := Int
```

#### Higher-Rank Types

Vibefun uses **rank-1 polymorphism** (prenex polymorphism)—type variables can only be quantified at the outermost level of a type signature. Higher-rank types (where type quantifiers appear in nested positions) are **not supported**:

```vibefun
// ✅ Rank-1: Type parameters at the outermost level
let map: <A, B>(List<A>, (A) -> B) -> List<B> = ...;

// ❌ Higher-rank: Would require nested quantification (NOT SUPPORTED)
// This would require passing a polymorphic function that works for ALL types:
// let applyToAll: ((<T>(T) -> T)) -> (Int, String) = ...
//                    ^^^ nested quantifier not allowed
```

If you need higher-rank behavior, use explicit wrapper types or redesign the API.


### Type Inference

Vibefun uses Hindley-Milner type inference with Algorithm W. The compiler infers types for most code without annotations.

```vibefun
// All types inferred
let add = (x, y) => x + y;  // (Int, Int) -> Int
let double = (x) => add(x, x);  // (Int) -> Int
let numbers = [1, 2, 3]                 // List<Int>
let result = numbers |> map(double)     // List<Int>
```

### Type Variable Scoping and Generalization

**Generalization** is the process of making a type polymorphic by converting type variables into type parameters. This happens automatically at `let`-bindings and determines when functions can be used with different types.

#### When Generalization Happens

Generalization occurs at `let`-bindings when the type checker has inferred a type containing type variables:

```vibefun
// Before generalization: inferred type is (t) -> t (monomorphic type variable t)
// After generalization: type becomes <T>(T) -> T (polymorphic type parameter T)
let identity = (x) => x;

// Each use gets a fresh instance of T
identity(42);      // T := Int
identity("hello"); // T := String (independent from previous use)
```

Without generalization, you could only use `identity` with one specific type throughout your program.

#### Scope-Based Generalization

Type variables can only be generalized if they don't escape the scope where they were created. This prevents unsound type assignments:

```vibefun
// ✅ CORRECT: Type variable is local to the let-binding
let f = (x) => {
  let id = (y) => y;  // Generalized to <T>(T) -> T
  id(x)               // Uses id polymorphically
};
// f has type: <A>(A) -> A

// ✅ CORRECT: Each let-binding generalizes independently
let g = (x) => {
  let f1 = (y) => y;  // <T>(T) -> T
  let f2 = (z) => z;  // <U>(U) -> U (different type parameter)
  f1(x)               // T := A (from g's parameter)
};

// ❌ INCORRECT: Would be unsound - variable would escape its scope
// This is prevented by the type system
let h = (x) => {
  let f = x;           // Cannot generalize x - it comes from outer scope
  f                    // f has the same type as x, not a polymorphic type
};
```

#### Generalization and Function Arguments

Function parameters are never generalized—they remain monomorphic within the function body:

```vibefun
let apply = (f, x) => f(x);
// f has type (a) -> b (monomorphic variables a and b)
// f is NOT generalized to <T>(T) -> T

// When apply is called:
apply(identity, 42);
// f is unified with identity's type: (a) -> b unifies with Int -> Int
// So a := Int, b := Int for this call

// Different call, different instantiation:
apply(identity, "hello");
// New instantiation: a := String, b := String
```

The key insight: **polymorphism happens at let-bindings, not at lambda abstractions**.

#### Nested Let-Bindings

Type variables are generalized at the innermost `let`-binding that contains them:

```vibefun
let outer =
  let inner1 = (x) => x;      // Generalized: <T>(T) -> T
  let inner2 = (y) => inner1(y);  // inner1 instantiated freshly
  inner2;                     // Generalized: <U>(U) -> U

// Each nested let can generalize independently
outer(42);      // U := Int
outer("test");  // U := String
```

#### Why Scoping Matters

Without proper scoping rules, you could create unsound programs:

```vibefun
// Imagine if this were allowed (it's NOT):
let makeInconsistent = (x) => {
  let f = x;  // If we generalized x here to <T>(T) -> T
  f           // We could use x as any type!
};

let intId = (n: Int) => n + 1;
let bad = makeInconsistent(intId);  // bad would have type <T>(T) -> T
bad("hello");  // Runtime error! We're calling (Int -> Int) with a String

// The type system prevents this by NOT generalizing x
// Instead: makeInconsistent has type <A>((A) -> A) -> (A) -> A
// No polymorphism is introduced improperly
```

#### Summary of Generalization Rules

**Type variables are generalized at `let`-bindings when:**
1. The `let`-binding has inferred a type containing type variables
2. Those type variables don't come from an outer scope
3. The value restriction is satisfied (see next section)

**Type variables are NOT generalized when:**
1. They come from function parameters (remain monomorphic in function body)
2. They would escape their defining scope
3. The value restriction blocks it (non-value right-hand side)

**Key principle:** Generalization creates polymorphism at `let`-bindings, and scoping rules ensure type safety by preventing type variables from escaping where they were created.

### Value Restriction and Polymorphism

The **value restriction** is a type system rule that determines when a `let`-binding can be generalized to a polymorphic type. This restriction is essential for maintaining type safety in the presence of mutable references and side effects.

#### The Rule: Only Syntactic Values Can Be Polymorphic

A `let`-binding is generalized to a polymorphic type **only if** the right-hand side is a **syntactic value**.

**Syntactic values** (can be generalized):
- Variables: `x`, `foo`
- Literals: `42`, `"hello"`, `true`
- Lambda expressions: `(x) => ...`, `(x, y) => ...`
- Constructors applied to values: `Some(42)`, `Ok("hello")`
- Records: `{ name: "Alice", age: 30 }`
- Lists of values: `[1, 2, 3]`

**Non-values** (cannot be generalized):
- Function applications: `f(x)`, `map(list, fn)`
- If expressions: `if cond then a else b`
- Match expressions: `match x { ... }`
- Blocks: `{ let y = x; y }`
- Ref operations: `ref(x)`, `!r`, `r := v`
- Operators: `x + y`, `!x`, `x && y`

#### Why the Value Restriction Exists

Without the value restriction, you could write unsound code:

```vibefun
// WITHOUT value restriction (unsound!):
let id = (x) => x;  // <T>(T) -> T
let badRef = ref(id);  // Would be: Ref<<T>(T) -> T> (polymorphic ref!)

// Now we could break type safety:
badRef := (x: Int) => x + 1;  // Store Int -> Int
let result = (!badRef)("hello");  // Get it back, but as String -> String!
// Type error! We stored (Int -> Int) but used (String -> String)
```

The value restriction prevents this by refusing to generalize `ref(id)`:

```vibefun
let id = (x) => x;  // <T>(T) -> T (OK: lambda is a value)
let badRef = ref(id);  // Ref<(t) -> t> (monomorphic t, not polymorphic)

// Now the type checker catches the error:
badRef := (x: Int) => x + 1;  // Error: expects (t) -> t, got (Int) -> Int
```

#### Examples: When Generalization Happens

```vibefun
// ✅ Lambda is a value → generalized
let identity = (x) => x;
// Type: <T>(T) -> T

// ✅ Each use gets a fresh instantiation
identity(42);  // T := Int
identity("hello");  // T := String

// ✅ Constructor with value → generalized
let none = None;
// Type: <T>Option<T>

// ✅ List of values → generalized
let emptyList = [];
// Type: <T>List<T>
```

#### Examples: When Generalization Does NOT Happen

```vibefun
// ❌ Function application → NOT a value → monomorphic
let ids = [id];
// Type: List<(t) -> t>  (monomorphic type variable t)
// NOT: <T>List<(T) -> T>

// This means you can't use ids polymorphically:
let f = List.head(ids);  // Some((t) -> t)
f(42);  // ✅ OK: t := Int
f("hello")  // ❌ Error: t is already Int, can't be String

// ❌ Ref creation → NOT a value → monomorphic
let mut r = ref(None);
// Type: Ref<Option<t>>  (monomorphic t)

r := Some(42);  // ✅ OK: t := Int
r := Some("hello");  // ❌ Error: t is Int, can't be String

// ❌ If expression → NOT a value → monomorphic
let choose = if condition then Some else None;
// Type: <t>(t) -> Option<t>  (monomorphic t, NOT polymorphic)

// ❌ Function call → NOT a value → monomorphic
let result = identity(identity);
// Type: (t) -> t  (monomorphic t)
```

#### Workaround: Eta-Expansion

If you need polymorphism for a non-value expression, wrap it in a lambda (eta-expansion):

```vibefun
// Problem: Function application is not a value
let composed = f(g);  // Monomorphic: (t) -> t
composed(42);  // OK: t := Int
composed("hello")             // Error: t is already Int

// Solution: Eta-expand to make it a value
let composed = (x) => f(g)(x) // Polymorphic: <T>(T) -> T;
composed(42);  // OK: T := Int
composed("hello");  // OK: T := String (independent instantiation)
```

#### Value Restriction and Refs

The value restriction is especially important for `Ref<T>`:

```vibefun
// Refs must be monomorphic
let mut counter = ref(0);  // Ref<Int> (concrete type)
let mut state = ref(None);  // Ref<Option<t>> (monomorphic t)

// You cannot create a polymorphic ref:
let mut polymorphicRef = ref(id)  // Ref<(t) -> t>, NOT Ref<<T>(T) -> T>

// To store polymorphic functions, use variants or records:
type PolyFunc = { apply: <T>(T) -> T };
let mut polyRef = ref({ apply: (x) => x })  // Ref<PolyFunc>
```

#### Summary

**Key takeaway**: The value restriction ensures type safety by preventing polymorphic mutable references. Only lambda expressions, constructors, and literals can be generalized to polymorphic types. Function applications and other non-value expressions get monomorphic types.

**Rule of thumb**:
- If you want polymorphism: use lambda expressions
- If you have a function call: it won't be polymorphic (unless you eta-expand)
- Refs are always monomorphic in their type variables

---

