# Vibefun Typechecker Requirements

**Last Updated:** 2025-11-23
**Status:** Requirements Analysis Complete

## Overview

This document provides a comprehensive requirements specification for the vibefun typechecker based on analysis of:
- Language specification in `./docs/spec/`
- Compiler architecture documentation
- Parser and desugarer implementation (Core AST structure)

The typechecker implements a **Hindley-Milner type inference system** (Algorithm W) with structural typing for records, nominal typing for variants, and sophisticated pattern matching analysis.

## Scope

The typechecker processes the **Core AST** (output from the desugarer) and must handle:
- **27 core expression types**
- **6 pattern types**
- **7 type expression forms**
- **6 declaration types**

## 1. Type System Features

### 1.1 Core Type System

**Reference:** `docs/spec/03-type-system/type-inference.md`

- **Algorithm:** Hindley-Milner type inference (Algorithm W)
- **Approach:** Constraint-based inference with constraint generation and solving
- **Type Variables:** Level-based scoping to prevent variables from escaping scope (Standard ML approach)
- **Polymorphism:** Let-polymorphism with automatic generalization and instantiation
- **Restriction:** Value restriction - only syntactic values can be generalized
- **Rank:** Rank-1 polymorphism only (no higher-rank types)

### 1.2 Primitive Types

**Reference:** `docs/spec/03-type-system/primitive-types.md`

Supported primitive types:
- `Int` - signed integers
- `Float` - floating-point numbers
- `String` - unicode text
- `Bool` - boolean values
- `Unit` - void/no value type `()`
- `Ref<T>` - mutable reference cells

**Critical Rules:**
- Int and Float are **distinct types** with **NO automatic coercion**
- Arithmetic operators require operands of the **same numeric type**
- Comparison operators require same numeric type
- Lists must contain single numeric type
- Explicit conversion required via `Float.fromInt()` or `Int.fromFloat()`
- Mixing Int and Float is a type error (must suggest conversion in error message)

### 1.3 Function Types

**Reference:** `docs/spec/06-functions.md`

- All functions are **automatically curried**
- Surface syntax `(A, B) -> C` is syntactic sugar for `A -> B -> C`
- Type checker must represent all function types in curried form
- Partial application is fully supported
- Type parameters: `<T>(T) -> T` syntax
- No explicit type application at use sites (always inferred)
- No higher-rank types (rank-1 polymorphism only)

**Key Requirements:**
- Desugar multi-parameter syntax to curried form before type checking
- Support partial application with correct type inference
- Check arity on application (detect over-application)

### 1.4 Tuple Types

**Reference:** `docs/spec/03-type-system/tuples.md`

- Fixed-size, heterogeneous product types
- Syntax: `(T1, T2, T3)`
- **No single-element tuples** - `(T)` is just grouping/precedence
- Unit type `()` is the 0-tuple
- Structurally typed (order matters, exact arity required)
- No index access in language - must destructure via pattern matching
- Arity checking at compile time

**Key Requirements:**
- Enforce minimum 2 elements for tuples
- Exact arity matching in patterns
- Order-sensitive structural equality

### 1.5 Record Types

**Reference:** `docs/spec/03-type-system/record-types.md`

- **Structural typing** with **width subtyping**
- Records with extra fields are subtypes of records with fewer fields
- Field order doesn't matter for type compatibility
- Keyword field names allowed (explicit syntax only)
- Field shorthand desugared before type checking
- **Contravariant** in function argument positions
- **Invariant** in type parameters

**Width Subtyping Rules:**
- `R1 <: R2` if R1 has all fields of R2 with compatible types
- Extra fields in R1 are ignored when matching against R2
- Example: `{x: Int, y: Int, z: Int}` is subtype of `{x: Int, y: Int}`
- Type variables are invariant (no variance in generics)

**Contravariance Example:**
```
// Point3D <: Point2D (width subtyping)
// But function types are contravariant in arguments:
// (Point2D) -> Int is NOT subtype of (Point3D) -> Int
// Instead: (Point3D) -> Int <: (Point2D) -> Int
```

### 1.6 Variant Types

**Reference:** `docs/spec/03-type-system/variant-types.md`

- **Nominal typing** - exact name matching required
- No structural compatibility even with identical constructors
- Constructors are functions (can be partially applied)
- Single-constructor variants allowed (for newtype pattern)

**Key Requirements:**
- Type names must match exactly
- Constructor names must match exactly
- No duck typing or structural equivalence
- Constructors have function types that can be inferred/checked

### 1.7 Generic Types

**Reference:** `docs/spec/03-type-system/generic-types.md`

- Parametric polymorphism with type parameters
- Type parameter syntax: `<T>`, `<A, B>`
- Naming convention: Single letters or PascalCase
- Implicit quantification (no forall syntax needed)
- Type inference for polymorphic functions
- Fresh instantiation at each use site

**Key Requirements:**
- Generate fresh type variables for each use of polymorphic value
- Unify type parameters during application
- Support generic types, functions, and constructors
- No explicit type application syntax (fully inferred)

### 1.8 Union Types

**Reference:** `docs/spec/03-type-system/union-types.md`

- **Limited support** for general unions
- Primary use: variant constructors (closed unions)
- String literal unions supported: `"pending" | "active" | "complete"`
- General unions (`Int | String`) limited to FFI boundary
- Type inference may fail for complex unions - annotations may be required

**Key Requirements:**
- Support variant constructor unions
- Support string literal unions
- Warn or error on complex unions that can't be inferred
- Suggest type annotations when inference fails

### 1.9 Recursive Types

**Reference:** `docs/spec/03-type-system/recursive-types.md`

- Recursive type definitions supported
- Must be **guarded** by constructor (variant/record)
- Mutually recursive types with `and` keyword
- Unguarded recursion forbidden (would create infinite types)

**Example:**
```vibefun
type List<T> =
  | Nil
  | Cons(T, List<T>)  // Guarded by Cons constructor

type Tree<T> = Node(T, Forest<T>)  // Mutually recursive
and Forest<T> = List<Tree<T>>
```

**Key Requirements:**
- Detect and allow guarded recursion
- Error on unguarded recursive type aliases
- Handle mutually recursive type groups with `and`

### 1.10 Type Aliases

**Reference:** `docs/spec/03-type-system/type-aliases.md`

- **Transparent aliases** - completely interchangeable with definition
- Type checker expands aliases immediately
- No type safety between aliases of same underlying type
- Cannot be directly recursive (use variants for recursive types)
- Generic aliases supported

**Example:**
```vibefun
type Point = {x: Int, y: Int}
type Point3D = {x: Int, y: Int, z: Int}

// Point and {x: Int, y: Int} are completely interchangeable
```

**Key Requirements:**
- Expand aliases during type checking
- Prevent infinite expansion (detect cycles)
- For nominal type safety, users should use single-constructor variants instead

## 2. Type Inference Features

### 2.1 Value Restriction

**Reference:** `docs/spec/03-type-system/type-inference.md:136-274`

The value restriction determines which let-bindings can be generalized to polymorphic types.

**Syntactic Values** (can be generalized):
- Variables
- Literals (Int, Float, String, Bool, Unit)
- Lambda expressions
- Constructors applied to values
- Records containing only values
- Lists containing only values
- Tuples of values

**Non-Values** (cannot be generalized):
- Function applications
- If expressions
- Match expressions
- Block expressions
- Ref operations (`ref`, `!`, `:=`)
- Binary/unary operator expressions

**Critical Requirement:**
This prevents polymorphic mutable references, which would be unsound:
```vibefun
// Without value restriction (UNSOUND):
let r = ref(None)  // Would infer: <T> Ref<Option<T>> (BAD!)
r := Some(42)
let _ = (!r : Option<String>)  // Type error should occur here

// With value restriction (SOUND):
let r = ref(None)  // Infers: Ref<Option<'a>> for some monomorphic 'a
```

### 2.2 Type Variable Scoping

**Reference:** `docs/spec/03-type-system/type-inference.md`

- Type variables are lexically scoped to their declaration
- Fresh type variables generated for each use of polymorphic value
- Level-based scoping prevents type variables from escaping their scope
- Independent type variables in nested/different positions

**Key Requirements:**
- Implement level tracking for type variables
- Prevent type variable escape during generalization
- Fresh instantiation maintains correct scoping

### 2.3 Polymorphic Instantiation

- Fresh instantiation at each use site
- Type variables unified with concrete types or fresh variables
- Rank-1 polymorphism only (prenex polymorphism)
- No explicit type application needed (fully inferred)

**Example:**
```vibefun
let id = <T>(x: T) -> T = x

let a = id(42)        // Fresh instantiation: T ~ Int
let b = id("hello")   // Fresh instantiation: T ~ String
```

## 3. Pattern Matching

### 3.1 Exhaustiveness Checking

**Reference:** `docs/spec/05-pattern-matching/exhaustiveness.md`

The typechecker must implement the **pattern matrix algorithm** (OCaml/SML approach) to:
- Check pattern match exhaustiveness
- Compute uncovered values
- Report missing patterns with examples
- Detect unreachable patterns

**Algorithm Requirements:**
- Specialize pattern matrix for each constructor
- Handle variant, literal, record, list, and tuple patterns
- Or-patterns must be expanded before checking
- Nested patterns checked recursively
- Wildcard `_` matches anything
- Guards **do not** affect exhaustiveness

**Critical Rules:**
- Infinite types (Int, String, records) require wildcard pattern
- Finite types (variants, bools) must cover all constructors
- Or-patterns don't create new branches for exhaustiveness
- Constructor arity must match type definition

**Error Messages:**
- Report which patterns are missing
- Provide example values that would not be matched
- Suggest wildcard for infinite types
- Warn about unreachable patterns

### 3.2 Pattern Types

**Reference:** `docs/spec/05-pattern-matching/pattern-basics.md`

The typechecker must handle these pattern types:

- **Wildcard:** `_` - matches any value, no bindings
- **Variable:** `x` - matches any value, binds variable
- **Literal:** `0`, `3.14`, `"hello"`, `true`, `false` - matches exact value
- **Constructor:** `Some(x)`, `Cons(head, tail)` - matches variant with pattern args
- **Record:** `{name, age}`, `{x: 0, y}` - matches record with field patterns
- **List:** Desugared to Nil/Cons patterns before type checking
- **Tuple:** `(x, y, z)` - matches tuple with exact arity
- **Or-patterns:** `0 | 1 | 2` - expanded before type checking (handled by desugarer)

## 4. Core AST Input (After Desugaring)

**Reference:** `packages/core/src/types/core-ast.ts`

The typechecker receives a fully desugared Core AST as input. The desugarer has already:
- Converted multi-parameter lambdas to curried single-parameter lambdas
- Expanded or-patterns into separate match cases
- Desugared field shorthand in records
- Converted list literals to Nil/Cons constructors
- Removed pipe and composition operators (replaced with nested applications)
- Converted if-expressions to match expressions

### 4.1 Core Expressions to Type Check

**Literals:**
- `CoreIntLit` - integer literal with value
- `CoreFloatLit` - float literal with value
- `CoreStringLit` - string literal with value
- `CoreBoolLit` - boolean literal with value
- `CoreUnitLit` - unit literal `()`

**Variables and Bindings:**
- `CoreVar` - variable reference (lookup in environment)
- `CoreLet` - single let binding (value + pattern + body)
- `CoreLetRecExpr` - mutually recursive let bindings (expression form)

**Functions:**
- `CoreLambda` - **single-parameter** lambda (all functions are curried)
- `CoreApp` - function application (function + args array)

**Control Flow:**
- `CoreMatch` - pattern matching (ONLY conditional construct in Core AST)

**Data Structures:**
- `CoreRecord` - record literal with fields (name + value pairs)
- `CoreRecordAccess` - field access (record.field)
- `CoreRecordUpdate` - functional update (spread + field updates)
- `CoreVariant` - variant constructor application
- `CoreTuple` - tuple construction (2+ elements)

**Operations:**
- `CoreBinOp` - binary operations (no pipe/compose in Core)
- `CoreUnaryOp` - unary operations

**Other:**
- `CoreTypeAnnotation` - explicit type annotation
- `CoreUnsafe` - unsafe JavaScript interop block

### 4.2 Core Patterns to Type Check

- `CoreWildcardPattern` - `_` wildcard
- `CoreVarPattern` - variable binding
- `CoreLiteralPattern` - literal match (Int, Float, String, Bool, Unit)
- `CoreVariantPattern` - constructor pattern with argument patterns
- `CoreRecordPattern` - record destructuring with field patterns
- `CoreTuplePattern` - tuple destructuring with element patterns

**Note:** No `OrPattern` in Core AST - the desugarer expands or-patterns into separate match cases.

### 4.3 Core Type Expressions

- `CoreTypeVar` - type variable (e.g., `T`, `'a`)
- `CoreTypeConst` - type constant (e.g., `Int`, `String`, custom types)
- `CoreTypeApp` - type application (e.g., `List<Int>`, `Option<T>`)
- `CoreFunctionType` - function type (curried form)
- `CoreRecordType` - record type with field types
- `CoreVariantType` - variant type with constructor definitions
- `CoreUnionType` - union type (limited use)
- `CoreTupleType` - tuple type with element types

### 4.4 Core Declarations

- `CoreLetDecl` - let declaration at module level
- `CoreLetRecGroup` - mutually recursive declarations
- `CoreTypeDecl` - type definition (alias, record, or variant)
- `CoreExternalDecl` - external value (FFI)
- `CoreExternalTypeDecl` - external type (FFI)
- `CoreImportDecl` - import statement

## 5. Type Checking Scenarios

### 5.1 Expression Type Checking

#### Literals
- `CoreIntLit(value)` → `Int`
- `CoreFloatLit(value)` → `Float` (must have decimal point or exponent)
- `CoreStringLit(value)` → `String`
- `CoreBoolLit(value)` → `Bool`
- `CoreUnitLit` → `Unit`

#### Variables
1. Lookup variable in type environment
2. If polymorphic (type scheme), instantiate with fresh type variables
3. Return instantiated type

#### Let Bindings (`CoreLet`)
1. Type check value expression
2. Check pattern against value type (extract bindings)
3. Determine if value is syntactic value (for value restriction)
4. If syntactic value, generalize type (create type scheme)
5. If non-value, keep type monomorphic
6. Extend environment with pattern bindings
7. Type check body expression
8. Return body type

#### Let Rec Bindings (`CoreLetRecExpr`)
1. Create recursive environment with temporary type variables for all bindings
2. Type check all value expressions in this environment
3. Unify temporary variables with inferred types
4. Check if bindings are syntactic values
5. Generalize types for syntactic values
6. Extend environment with all bindings
7. Type check body expression
8. Return body type

#### Lambdas (`CoreLambda`)
**Note:** All lambdas have single parameter (curried form)

1. Create fresh type variable for parameter
2. Bind pattern to parameter type variable
3. Extract pattern bindings and extend environment
4. Type check body expression
5. Return function type: `param_type -> body_type`

#### Function Application (`CoreApp`)
1. Type check function expression
2. Type check all argument expressions (may be multiple for curried calls)
3. For each argument:
   - Unify function type with `arg_type -> result_type`
   - Use result_type as new function type for next argument
4. Check for over-application (too many arguments)
5. Return final result type

#### Match Expressions (`CoreMatch`)
1. Type check scrutinee expression
2. For each case:
   - Check pattern against scrutinee type
   - Extract pattern variable bindings
   - Extend environment with bindings
   - If guard exists, type check guard (must be `Bool`)
   - Type check case body
3. Unify all case body types (must all be the same)
4. Check exhaustiveness of patterns
5. Return unified body type

#### Records (`CoreRecord`)
1. Type check all field value expressions
2. Build record type from field names and types
3. If spread exists:
   - Type check spread expression
   - Unify with record type
   - Merge spread fields with explicit fields
4. Return record type

#### Record Access (`CoreRecordAccess`)
1. Type check record expression
2. Create fresh type variable for field type
3. Unify record type with record containing field: `{field: 'a, ...}` (width subtyping)
4. Return field type

#### Record Update (`CoreRecordUpdate`)
1. Type check base record expression
2. Type check all update field expressions
3. Ensure updated fields exist in base record type
4. Create new record type with updated field types
5. Return updated record type

#### Variants (`CoreVariant`)
1. Lookup constructor in type environment
2. Get constructor type (function type for constructors with args, or direct type)
3. If constructor is polymorphic, instantiate with fresh type variables
4. Type check argument expressions
5. If constructor expects arguments, unify with function type
6. Return result type (the variant type, properly instantiated)

#### Tuples (`CoreTuple`)
1. Type check all element expressions
2. Ensure at least 2 elements (enforcement)
3. Return tuple type with element types: `(T1, T2, ...)`

#### Binary Operations (`CoreBinOp`)
Type check based on operator:

**Arithmetic** (`+`, `-`, `*`, `/`, `%`):
- Type check both operands
- Unify both with same type variable
- Constrain type variable to be `Int` or `Float`
- Return same type as operands

**Comparison** (`<`, `<=`, `>`, `>=`):
- Type check both operands
- Unify both with same type variable
- Constrain type variable to be `Int` or `Float`
- Return `Bool`

**Equality** (`==`, `!=`):
- Type check both operands
- Unify both with same type variable
- Return `Bool`

**Logical** (`&&`, `||`):
- Type check both operands
- Unify both with `Bool`
- Return `Bool`

**String Concatenation** (`++`):
- Type check both operands
- Unify both with `String`
- Return `String`

**Cons** (`::` - if not desugared):
- Type check head (element)
- Type check tail (list)
- Unify tail with `List<element_type>`
- Return `List<element_type>`

**Ref Assignment** (`:=`):
- Type check left operand (must be `Ref<T>`)
- Type check right operand
- Unify right with `T`
- Return `Unit`

**Critical:** No automatic coercion between `Int` and `Float`. Mixing is a type error.

#### Unary Operations (`CoreUnaryOp`)

**Negate** (`-`):
- Type check operand
- Unify with type variable constrained to `Int` or `Float`
- Return same type

**Logical Not** (`!` for booleans, **NOT** deref):
- Type check operand
- Unify with `Bool`
- Return `Bool`

**Deref** (`!` for refs):
- Type check operand
- Unify with `Ref<T>` for fresh type variable `T`
- Return `T`

#### Type Annotations (`CoreTypeAnnotation`)
1. Type check inner expression
2. Type check/resolve annotated type expression
3. Unify inferred type with annotated type
4. Return annotated type

#### Unsafe Blocks (`CoreUnsafe`)
1. Type check inner expression
2. Return inferred type
3. No special checking (user takes responsibility)

### 5.2 Pattern Type Checking

Pattern type checking takes a pattern and an expected type, checks compatibility, and returns variable bindings.

#### Wildcard Pattern (`CoreWildcardPattern`)
- Matches any type
- No bindings created
- Always succeeds

#### Variable Pattern (`CoreVarPattern`)
- Binds variable to expected type
- Add binding to environment: `var: expected_type`
- Always succeeds

#### Literal Pattern (`CoreLiteralPattern`)
- Unify expected type with literal type:
  - Int literal → `Int`
  - Float literal → `Float`
  - String literal → `String`
  - Bool literal → `Bool`
  - Unit literal → `Unit`
- No bindings created

#### Constructor Pattern (`CoreVariantPattern`)
1. Lookup constructor in type environment
2. Instantiate constructor type with fresh type variables
3. Unify expected type with constructor result type
4. If constructor has arguments:
   - Extract argument types from constructor type
   - Recursively check argument patterns against argument types
   - Collect bindings from argument patterns
5. Return all bindings

#### Record Pattern (`CoreRecordPattern`)
1. Unify expected type with record type containing at least the matched fields
2. For each field pattern:
   - Extract field type from expected type
   - Recursively check field pattern against field type
   - Collect bindings from field pattern
3. Width subtyping: expected type may have extra fields
4. Return all bindings

#### Tuple Pattern (`CoreTuplePattern`)
1. Unify expected type with tuple type
2. Check arity matches exactly
3. For each element pattern:
   - Extract element type from tuple type
   - Recursively check element pattern against element type
   - Collect bindings from element pattern
4. Return all bindings

### 5.3 Declaration Type Checking

#### Let Declarations (`CoreLetDecl`)
1. Type check value expression
2. Check pattern against value type
3. Apply value restriction:
   - If value is syntactic value, generalize type
   - If non-value, keep monomorphic
4. Extract bindings from pattern
5. Add bindings to module environment
6. Handle recursive flag if set

#### Let Rec Groups (`CoreLetRecGroup`)
1. Create mutually recursive environment with temporary type variables
2. Type check all values in this environment
3. Unify temporary variables with inferred types
4. Apply value restriction to each binding
5. Generalize polymorphic types
6. Check all bindings are actually recursive (or warn if not)
7. Add all bindings to module environment

#### Type Declarations (`CoreTypeDecl`)
1. Process type parameters (create type variables)
2. Check type definition based on kind:

   **Type Alias:**
   - Check type expression is well-formed
   - Check no free type variables (except parameters)
   - Detect cycles (prevent infinite expansion)

   **Record Type:**
   - Check all field types are well-formed
   - Check field names are unique
   - Check no free type variables

   **Variant Type:**
   - Check all constructor types are well-formed
   - Check constructor names are unique
   - Check no free type variables
   - Verify constructors are guarded for recursive types

3. Add type to type environment
4. Handle mutually recursive types with `and` keyword

#### External Declarations (`CoreExternalDecl`)
1. Check type expression is well-formed
2. Add to value environment with given type
3. No value restriction (assumed pure by default)
4. Trust the declared type (unsafe - user responsibility)

#### External Type Declarations (`CoreExternalTypeDecl`)
1. Process type parameters
2. Add opaque type to type environment
3. Type is abstract (no structure known)

## 6. Special Cases and Edge Cases

### 6.1 Numeric Type Coercion

**Critical:** Int and Float are completely separate types with **NO automatic coercion**.

**Requirements:**
- Type error when mixing Int and Float in operations
- Error message must suggest explicit conversion:
  - `Float.fromInt(x)` to convert Int to Float
  - `Int.fromFloat(x)` to convert Float to Int (may truncate)
- Lists cannot mix Int and Float
- No implicit widening or narrowing

**Example Errors:**
```
Error: Type mismatch in binary operation
  Expected: Int
  Got: Float

  Hint: Use Float.fromInt() to convert Int to Float
```

### 6.2 Ref Type Checking

**Reference:** `docs/spec/07-mutable-references.md`

**Operations:**
- `ref(value)`: `T → Ref<T>`
- `!ref`: `Ref<T> → T` (deref)
- `ref := value`: `(Ref<T>, T) → Unit` (assignment)

**Critical Rules:**
- Refs are **monomorphic** (value restriction applies)
- Creating a ref is not a syntactic value
- `mut` keyword required in declarations (parser enforces)
- Cannot pattern match on Ref type directly (must dereference first)
- Assignment returns Unit

**Example:**
```vibefun
let mut r = ref(42)  // r: Ref<Int> (monomorphic)
r := 100             // OK
let x = !r           // x: Int
```

### 6.3 Currying and Application

**All functions are curried internally:**
- Surface syntax `(A, B) -> C` desugars to `A -> B -> C`
- Multi-argument application desugars to nested applications
- Partial application returns function type

**Requirements:**
- Support partial application with correct type inference
- Over-application is a type error
- Arity checking on application

**Examples:**
```vibefun
let add = (x: Int, y: Int) -> Int = x + y
// Type: Int -> Int -> Int

let add5 = add(5)    // Partial application, type: Int -> Int
let result = add5(3) // Full application, type: Int

let bad = add(1, 2, 3)  // ERROR: over-application
```

### 6.4 Width Subtyping

**Records support width subtyping:**
- Records with extra fields are subtypes of records with fewer fields
- Field order doesn't matter
- Extra fields ignored when matching

**Contravariance in function arguments:**
```vibefun
type Point2D = {x: Int, y: Int}
type Point3D = {x: Int, y: Int, z: Int}

// Point3D <: Point2D (width subtyping)

let f: (Point2D) -> Int = ...
let g: (Point3D) -> Int = ...

// f is NOT subtype of g
// But g IS subtype of f (contravariance)
```

**Invariance in type parameters:**
```vibefun
// List<Point3D> is NOT subtype of List<Point2D>
// Even though Point3D <: Point2D
```

### 6.5 Exhaustiveness Edge Cases

**Guards don't affect exhaustiveness:**
```vibefun
match x {
  | Some(n) if n > 0 -> "positive"
  | Some(n) -> "non-positive"  // Still needed!
  | None -> "none"
}
```

**Infinite types require wildcard:**
```vibefun
match n {
  | 0 -> "zero"
  | 1 -> "one"
  | _ -> "other"  // Required! Int is infinite
}
```

**Nested patterns checked recursively:**
```vibefun
match pair {
  | (Some(x), Some(y)) -> x + y
  | (Some(x), None) -> x
  | (None, Some(y)) -> y
  | (None, None) -> 0  // All combinations required
}
```

**Unreachable pattern detection:**
```vibefun
match x {
  | _ -> "anything"
  | Some(x) -> "some"  // WARNING: unreachable
}
```

### 6.6 Polymorphism Restrictions

**Value restriction:**
- Only syntactic values can be generalized
- Function applications remain monomorphic
- Eta-expansion can restore polymorphism

**Example:**
```vibefun
// Not polymorphic (function application):
let id1 = identity(identity)  // Monomorphic

// Polymorphic (eta-expanded):
let id2 = <T>(x: T) -> T = identity(identity)(x)  // Polymorphic
```

**No higher-rank types:**
```vibefun
// NOT supported:
let apply: (<T>(T) -> T) -> Int = ...

// Rank-1 only:
let apply: <T>((T) -> T) -> Int = ...
```

**Refs cannot be polymorphic:**
```vibefun
let r = ref(None)  // Monomorphic: Ref<Option<'a>>
// NOT polymorphic: <T> Ref<Option<T>>
```

### 6.7 Mutual Recursion

**Types:**
```vibefun
type Tree<T> = Node(T, Forest<T>)
and Forest<T> = List<Tree<T>>
```

**Values:**
```vibefun
let rec isEven = (n: Int) -> Bool =
  if n == 0 then true else isOdd(n - 1)
and isOdd = (n: Int) -> Bool =
  if n == 0 then false else isEven(n - 1)
```

**Requirements:**
- All bindings in group visible to each other
- Type check all in mutually recursive environment
- Generalize after all are typed
- Works for both types and values

### 6.8 Type Alias Expansion

**Transparent expansion:**
```vibefun
type UserId = Int

let uid: UserId = 42     // OK
let x: Int = uid         // OK (transparent)
```

**Requirements:**
- Expand aliases during type checking
- Prevent infinite expansion (detect cycles)
- Generic aliases expand with substitution

**Cycle detection:**
```vibefun
type A = B   // Cycle detection required
type B = A
```

## 7. Error Reporting Requirements

### 7.1 Type Errors

All type errors must include:
- Clear description of the error
- Expected type
- Actual type
- Source location (file, line, column)
- Helpful suggestions when applicable

**Error Categories:**

#### Type Mismatch
```
Error: Type mismatch
  Expected: Int
  Got: String

  Location: example.vf:10:15
```

#### Occurs Check Failure (Infinite Types)
```
Error: Cannot construct infinite type
  Type variable 'a occurs in 'a -> 'a

  This would create an infinite type
  Location: example.vf:15:20
```

#### Undefined Variable
```
Error: Undefined variable 'foo'

  Location: example.vf:5:10

  Did you mean: 'bar'?
```

#### Undefined Type
```
Error: Undefined type 'Foo'

  Location: example.vf:8:5
```

#### Arity Mismatch
```
Error: Function arity mismatch
  Function expects 2 arguments
  Got 3 arguments

  Location: example.vf:12:5
```

#### Missing Record Field
```
Error: Record missing required field
  Field 'name' not found in record type

  Record type: {age: Int}
  Required: {name: String, age: Int}

  Location: example.vf:20:10
```

#### Constructor Arity Mismatch
```
Error: Constructor arity mismatch
  Constructor 'Some' expects 1 argument
  Got 2 arguments

  Location: example.vf:7:15
```

#### Pattern Type Mismatch
```
Error: Pattern type mismatch
  Pattern expects: Option<Int>
  Scrutinee has type: List<Int>

  Location: example.vf:25:3
```

#### Numeric Type Confusion
```
Error: Type mismatch in arithmetic operation
  Expected: Int
  Got: Float

  Hint: Use Float.fromInt() to convert, or use Float literals (3.14)
  Location: example.vf:18:10
```

### 7.2 Exhaustiveness Errors

#### Non-Exhaustive Match
```
Error: Non-exhaustive pattern match
  Missing patterns:
    - None
    - Some(0)

  Location: example.vf:30:1
```

#### Unreachable Pattern
```
Warning: Unreachable pattern
  This pattern is shadowed by previous patterns

  Location: example.vf:35:5
```

#### Infinite Type Requires Wildcard
```
Error: Non-exhaustive pattern match
  Cannot enumerate all values of type Int

  Suggestion: Add a wildcard pattern '_' to match remaining cases
  Location: example.vf:40:1
```

### 7.3 Location Information

All errors and warnings must include:
- **File name**: Source file path
- **Line number**: 1-indexed
- **Column number**: 1-indexed
- **Offset**: Character offset from start of file
- **Context**: Show the relevant source code line

**Format:**
```
Error: Type mismatch
  Expected: Int
  Got: String

  --> example.vf:10:15
   |
10 | let x: Int = "hello"
   |              ^^^^^^^ Expected Int, got String
   |
```

## 8. Identified Gaps in Specification

### 8.1 Algorithm Details Not Specified

1. **Type variable levels algorithm:**
   - Spec mentions "level-based scoping" but doesn't detail the algorithm
   - Need to clarify: what are levels, how are they assigned, when do they change?
   - Standard ML approach: levels track nesting depth of let-bindings

2. **Constraint types and solving:**
   - Spec says "constraint-based inference" but doesn't specify constraint types
   - What constraints exist? (Equality, subtyping, type class?)
   - What is the constraint solving algorithm?

3. **Unification algorithm:**
   - Not specified in detail
   - Occurs check required (prevent infinite types)
   - Substitution strategy?
   - Error recovery when unification fails?

4. **Type error priorities:**
   - When multiple type errors exist, which to report first?
   - Should we report all errors or stop at first?
   - How to provide most helpful error messages?

### 8.2 Ambiguities

1. **Polymorphic recursion:**
   - Is polymorphic recursion allowed or forbidden?
   - Standard ML forbids it, OCaml allows with annotations
   - Affects let rec type checking

2. **Module type checking order:**
   - How to handle circular imports?
   - Type check declarations in dependency order?
   - What about forward references?

3. **Type annotation interaction:**
   - Do type annotations enable polymorphic recursion?
   - Can annotations override value restriction?
   - How do annotations interact with inference?

4. **Subtyping and inference:**
   - Width subtyping is specified for records
   - How does it interact with type inference?
   - When to apply subtyping vs. unification?

5. **Error recovery:**
   - Should type checker continue after errors?
   - How to recover from type errors for IDE support?
   - What placeholder types to use after errors?

### 8.3 Missing Specifications

1. **Type environment representation:**
   - What data structure to use?
   - How to handle shadowing?
   - How to manage scopes efficiently?

2. **Type scheme representation:**
   - How to represent polymorphic types?
   - How to track quantified variables?
   - How to handle constraints on type variables?

3. **Module system:**
   - How do imports affect type environment?
   - How to handle qualified names?
   - What about re-exports?

4. **Performance characteristics:**
   - What is acceptable type checking time?
   - Should we cache type checking results?
   - Incremental type checking for IDE?

### 8.4 Implementation Questions

1. **Type variable representation:**
   - Use integers, names, or both?
   - How to generate fresh type variables?
   - How to pretty-print type variables?

2. **Type variable levels:**
   - Integer levels or other representation?
   - When to increment/decrement?
   - How to implement level checking efficiently?

3. **Type environment structure:**
   - Map from names to types?
   - Hierarchical scopes?
   - Persistent data structure for backtracking?

4. **Caching and memoization:**
   - Should we cache type checking results?
   - Memoize type unification?
   - Cache exhaustiveness checking?

5. **Multi-pass vs single-pass:**
   - Type check in single pass or multiple passes?
   - Collect all declarations first, then type check?
   - How to handle forward references?

## 9. Testing Requirements

### 9.1 Unit Tests

**Primitive Types:**
- Test each primitive type (Int, Float, String, Bool, Unit, Ref)
- Numeric type separation (Int vs Float, no coercion)
- Type errors for mixed numeric types

**Functions:**
- Function type inference
- Currying and partial application
- Multi-parameter desugaring
- Arity checking
- Polymorphic functions
- Type parameters

**Tuples:**
- Tuple construction and destructuring
- Arity enforcement (minimum 2 elements)
- Type checking all elements
- Pattern matching on tuples

**Records:**
- Record construction and field access
- Width subtyping (extra fields allowed)
- Field order independence
- Record update
- Pattern matching on records

**Variants:**
- Variant construction
- Nominal typing (no structural equivalence)
- Constructor as function
- Pattern matching on variants
- Generic variants

**Generic Types:**
- Type parameter inference
- Polymorphic functions
- Fresh instantiation
- Generic data structures

**Pattern Matching:**
- All pattern types (wildcard, variable, literal, constructor, record, tuple)
- Exhaustiveness checking for all pattern types
- Unreachable pattern detection
- Nested patterns
- Guards (don't affect exhaustiveness)

**Let Polymorphism:**
- Syntactic values generalized
- Non-values stay monomorphic
- Value restriction enforcement
- Fresh instantiation at use sites

**Value Restriction:**
- Lambdas are values
- Function applications are not values
- Records of values are values
- Refs are not values

**Exhaustiveness:**
- All constructors covered
- Wildcard for infinite types
- Missing pattern detection
- Example generation for missing patterns

**Mutual Recursion:**
- Mutually recursive types
- Mutually recursive functions
- Type checking in recursive environment

### 9.2 Integration Tests

**End-to-End:**
- Type check complete modules
- Multiple declarations
- Type definitions with usage
- Import and export

**Complex Types:**
- Nested generic types
- Recursive data structures
- Mutually recursive types
- Higher-order functions with generics

**Pattern Matching:**
- Complex patterns on complex types
- Nested patterns
- Multiple levels of nesting
- Exhaustiveness on complex types

**FFI:**
- External declarations
- External types
- Unsafe blocks
- Type checking across FFI boundary

### 9.3 Error Message Tests

**Test each error type:**
- Type mismatch with clear expected/actual
- Occurs check failure explanation
- Undefined variable with suggestions
- Arity mismatch with clear message
- Missing fields in records
- Non-exhaustive patterns with examples
- Unreachable patterns

**Test error locations:**
- Correct file, line, column
- Accurate source code context
- Proper span highlighting

**Test error suggestions:**
- Numeric conversion hints
- Did you mean suggestions for typos
- Wildcard suggestions for infinite types
- Missing constructor suggestions

### 9.4 Edge Cases

**Numeric Types:**
- Int + Float = error
- Int list with Float element = error
- Explicit conversion required

**Width Subtyping:**
- Extra fields allowed in records
- Field order doesn't matter
- Contravariance in function arguments
- Invariance in type parameters

**Polymorphism:**
- Value restriction edge cases
- Eta-expansion for polymorphism
- Refs cannot be polymorphic
- Function applications not polymorphic

**Exhaustiveness:**
- Guards don't count
- Infinite types need wildcard
- All constructor combinations
- Nested pattern exhaustiveness

**Currying:**
- Partial application types
- Over-application errors
- Multi-stage application

**Mutual Recursion:**
- Type and value mutual recursion
- Actually recursive vs. just grouped
- Generalization timing

## 10. Deliverables

### 10.1 Core Typechecker Module

**Location:** `packages/core/src/typechecker/`

**Components:**
- **Type representation:** Algebraic data types for types
- **Type environment:** Scoped mapping from names to type schemes
- **Type inference:** Algorithm W implementation
- **Unification:** Type unification with occurs check
- **Type variables:** Level-based scoping, instantiation, generalization
- **Constraint solving:** Generate and solve type constraints

**Key Functions:**
- `inferExpr(expr: CoreExpr, env: TypeEnv): Type`
- `checkExpr(expr: CoreExpr, expectedType: Type, env: TypeEnv): void`
- `unify(type1: Type, type2: Type): Substitution`
- `instantiate(scheme: TypeScheme): Type`
- `generalize(type: Type, env: TypeEnv): TypeScheme`

### 10.2 Pattern Checking Module

**Location:** `packages/core/src/typechecker/patterns.ts`

**Components:**
- **Pattern type checking:** Check patterns against expected types
- **Pattern bindings:** Extract variable bindings from patterns
- **Exhaustiveness checker:** Pattern matrix algorithm
- **Unreachable detection:** Find shadowed patterns

**Key Functions:**
- `checkPattern(pattern: CorePattern, expectedType: Type): Bindings`
- `checkExhaustiveness(patterns: CorePattern[], scrutineeType: Type): ExhaustivenessResult`
- `findUnreachable(patterns: CorePattern[]): number[]`
- `generateMissingExamples(patterns: CorePattern[], type: Type): Example[]`

### 10.3 Declaration Checking Module

**Location:** `packages/core/src/typechecker/declarations.ts`

**Components:**
- **Module type checking:** Type check module-level declarations
- **Type definitions:** Process type declarations
- **Mutual recursion:** Handle recursive declarations
- **Exports:** Track exported types and values

**Key Functions:**
- `checkDeclaration(decl: CoreDeclaration, env: TypeEnv): TypeEnv`
- `checkModule(module: CoreModule): TypedModule`
- `processTypeDecl(decl: CoreTypeDecl, env: TypeEnv): TypeEnv`
- `checkLetRec(group: CoreLetRecGroup, env: TypeEnv): TypeEnv`

### 10.4 Error Reporting Module

**Location:** `packages/core/src/typechecker/errors.ts`

**Components:**
- **Type error types:** All error kinds
- **Error formatting:** Pretty-print errors with locations
- **Suggestions:** Generate helpful hints
- **Context:** Show source code context

**Key Classes:**
- `TypeMismatchError`
- `OccursCheckError`
- `UndefinedError`
- `ArityError`
- `NonExhaustiveError`
- `UnreachablePatternError`

### 10.5 Test Suite

**Location:** `packages/core/src/typechecker/*.test.ts`

**Files:**
- `typechecker.test.ts` - Core type checking tests
- `patterns.test.ts` - Pattern matching tests
- `exhaustiveness.test.ts` - Exhaustiveness checking tests
- `polymorphism.test.ts` - Let-polymorphism and value restriction tests
- `errors.test.ts` - Error message tests
- `integration.test.ts` - End-to-end tests

**Coverage Target:** 90%+ with comprehensive edge case coverage

## 11. Summary

### Key Complexity Factors

1. **Value restriction** for polymorphism (soundness with mutable refs)
2. **Width subtyping** for records (extra fields allowed)
3. **Nominal typing** for variants (exact name matching)
4. **No numeric coercion** (Int and Float completely separate)
5. **Exhaustiveness checking** with pattern matrix algorithm
6. **Level-based type variable scoping** (prevent escape)
7. **Automatic currying** and partial application
8. **Contravariance** in function arguments

### Critical Path Items

1. **Type representation and environment:** Foundation for everything
2. **Unification with occurs check:** Core algorithm component
3. **Type variable instantiation and generalization:** Polymorphism support
4. **Pattern matrix exhaustiveness checker:** Required for match expressions
5. **Comprehensive error reporting:** Developer experience is critical

### Implementation Strategy

**Recommended approach:**
1. Start with type representation and environment
2. Implement basic type checking for simple expressions
3. Add unification algorithm
4. Implement polymorphism (instantiation/generalization)
5. Add pattern checking
6. Implement exhaustiveness checking
7. Add declaration checking
8. Polish error messages
9. Comprehensive testing throughout

### Success Criteria

- Type checks all valid vibefun programs correctly
- Rejects invalid programs with helpful errors
- Infers types without requiring excessive annotations
- Detects non-exhaustive pattern matches
- Prevents unsound polymorphic refs
- No false positives or false negatives
- Fast enough for interactive use (<100ms for typical modules)
- 90%+ test coverage

---

**Next Steps:** Begin implementation with type representation and basic inference engine.
