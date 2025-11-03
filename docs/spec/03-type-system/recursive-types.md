# Recursive Types

### Recursive Types

Vibefun supports **recursive type definitions**, where a type refers to itself:

```vibefun
// Recursive variant type (most common)
type List<T> =
    | Nil
    | Cons(T, List<T>)

// Recursive tree type
type Tree<T> =
    | Leaf(T)
    | Node(Tree<T>, Tree<T>)

// JSON representation
type Json =
    | JNull
    | JBool(Bool)
    | JNumber(Float)
    | JString(String)
    | JArray(List<Json>)           // Recursive reference
    | JObject(List<(String, Json)>) // Recursive reference
```

**Requirements:**
- Recursive types must be **guarded** by a constructor (variant or record)
- Direct self-reference without a constructor is not allowed

```vibefun
// ✅ OK: Recursion guarded by variant constructor
type Expr = Lit(Int) | Add(Expr, Expr) | Mul(Expr, Expr)

// ❌ Error: Unguarded recursion (infinite type)
type Bad = Bad  // Equivalent to type Bad = Bad = Bad = ...
```

#### Mutually Recursive Types

Multiple types can reference each other using the `and` keyword:

```vibefun
// Mutually recursive types for expressions and patterns
type Expr =
    | Lit(Int)
    | Var(String)
    | Lambda(Pattern, Expr)  // References Pattern
    | App(Expr, Expr)
and Pattern =
    | PWildcard
    | PVar(String)
    | PCons(Pattern, Pattern)
    | PExpr(Expr)             // References Expr

// Another example: tree with labeled nodes
type LabeledTree<T> =
    | Leaf(T)
    | Node(Label, List<LabeledTree<T>>)
and Label = {
    name: String,
    metadata: Metadata
}
and Metadata = {
    created: String,
    tags: List<String>,
    children: List<LabeledTree<String>>  // Back-reference
}
```

**Mutual recursion syntax:**
```vibefun
type A = ... B ...    // A references B
and B = ... A ...     // B references A
and C = ... A ... B   // C references both A and B
```

**Rules:**
- All types in a `and` group are simultaneously in scope
- Each type can reference any other type in the group
- Mutually recursive types must still be guarded by constructors

