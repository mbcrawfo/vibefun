# Vibefun Typechecker Requirements

**Last Updated:** 2025-11-23
**Status:** Requirements Analysis Complete

## Overview

This document provides a comprehensive requirements specification for the vibefun typechecker based on analysis of:
- Language specification in `./docs/spec/`
- Compiler architecture documentation
- Parser and desugarer implementation (Core AST structure)

The typechecker implements a **Hindley-Milner type inference system** (Algorithm M - constraint-based) with structural typing for records, nominal typing for variants, and sophisticated pattern matching analysis.

## Scope

The typechecker processes the **Core AST** (output from the desugarer) and must handle:
- **27 core expression types**
- **6 pattern types**
- **7 type expression forms**
- **6 declaration types**

## 1. Type System Features

### 1.1 Core Type System

**Reference:** `docs/spec/03-type-system/type-inference.md`

- **Algorithm:** Hindley-Milner type inference (Algorithm M - constraint-based)
- **Approach:** Two-phase inference with separate constraint generation and solving phases
- **Bidirectional:** Combines synthesis (bottom-up) and checking (top-down) with expected types
- **Type Variables:** Level-based scoping to prevent variables from escaping scope (Standard ML approach)
- **Polymorphism:** Let-polymorphism with automatic generalization and instantiation
- **Restriction:** Value restriction - only syntactic values can be generalized
- **Rank:** Rank-1 polymorphism only (no higher-rank types)
- **Error Recovery:** Partial results with placeholder types for continued inference after errors

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

### 7.4 Type Variable Levels Algorithm

**Reference:** `docs/spec/03-type-system/type-inference.md` (semantic description)

The type variable levels algorithm is an essential implementation detail for preventing type variables from escaping their scope during generalization. This section specifies the concrete algorithm requirements.

#### Overview

**Levels** are integers that track the nesting depth of let-bindings, similar to De Bruijn indices for let-quantifiers. This approach was discovered by Didier Rémy (1988) and is used in OCaml, Caml-Light, and other production ML compilers.

**Purpose:**
- Prevent type variables from escaping their defining scope
- Enable efficient O(1) generalization checks
- Ensure soundness of polymorphic type inference

#### Data Structures

The typechecker must maintain:

1. **Global level counter** (`current_level: number`)
   - Tracks current let-binding nesting depth
   - Starts at 0 (top level)
   - Incremented when entering a let-binding
   - Decremented when leaving a let-binding

2. **Type variable level field** (`level: number` on each type variable)
   - Records the level at which the type variable was created
   - Immutable once assigned (never changes for a given type variable)
   - Used during generalization to detect escape

#### Core Operations

**1. Creating Type Variables (`newvar()`)**

```typescript
function newvar(): TypeVariable {
    return { type: "Var", id: freshId(), level: current_level };
}
```

When creating a fresh type variable, assign it the current level.

**2. Entering Let-Bindings (`enterLevel()`)**

```typescript
function enterLevel(): void {
    current_level++;
}
```

Call before type checking the right-hand side of a let-binding.

**3. Leaving Let-Bindings (`leaveLevel()`)**

```typescript
function leaveLevel(): void {
    current_level--;
}
```

Call after generalizing the type of a let-binding.

**4. Updating Levels During Unification (`updateLevel()`)**

```typescript
function updateLevel(typeVar: TypeVariable, type: Type): void {
    // When unifying a type variable with a type,
    // update the minimum level of all type variables in the type
    const minLevel = Math.min(typeVar.level, minLevelIn(type));
    setLevelInType(type, minLevel);
}
```

During unification, if a type variable at level L₁ is unified with a type containing type variables at level L₂, update all type variables in the unified type to `min(L₁, L₂)`. This ensures that if a variable escapes, its level reflects the outermost scope it appears in.

**5. Generalization with Levels (`generalize()`)**

```typescript
function generalize(type: Type): TypeScheme {
    const quantifiedVars: TypeVariable[] = [];

    // Find all type variables whose level is GREATER than current level
    for (const tv of freeTypeVars(type)) {
        if (tv.level > current_level) {
            quantifiedVars.push(tv);
        }
    }

    // Convert those variables to quantified type parameters
    return { quantified: quantifiedVars, type: type };
}
```

**Key invariant:** A type variable with `level > current_level` was created in a nested let-binding and is safe to generalize. Variables with `level <= current_level` come from an outer scope and must NOT be generalized.

#### Type Checking Let-Bindings with Levels

**Complete algorithm for `let x = expr`:**

```typescript
function checkLetBinding(name: string, expr: Expr, body: Expr): Type {
    // 1. Enter a new level
    enterLevel();

    // 2. Type check the right-hand side at the new level
    const exprType = infer(expr);

    // 3. Leave the level (back to outer scope)
    leaveLevel();

    // 4. Generalize: quantify variables with level > current_level
    const scheme = generalize(exprType);

    // 5. Add to environment and type check body
    const newEnv = env.extend(name, scheme);
    return inferInEnv(body, newEnv);
}
```

#### Example Execution Trace

```vibefun
let id = (x) => x
```

**Trace:**
1. `current_level = 0` (top level)
2. `enterLevel()` → `current_level = 1`
3. Infer type of `(x) => x`:
   - Create type variable for `x`: `t1 = { level: 1 }`
   - Infer body type: `t1`
   - Result: `t1 -> t1`
4. `leaveLevel()` → `current_level = 0`
5. `generalize(t1 -> t1)`:
   - Find free variables: `[t1]`
   - Check levels: `t1.level (1) > current_level (0)` ✓
   - Generalize `t1` to `T`
   - Result: `<T>(T) -> T`

#### Preventing Escape Example

```vibefun
fun f -> let id = f in id
```

**Trace:**
1. `current_level = 0`
2. Infer `fun f ->`:
   - Create `f: t1 = { level: 0 }`  // function parameter at outer level
3. Enter let: `enterLevel()` → `current_level = 1`
4. Infer `let id = f`:
   - `f` has type `t1` (from environment)
   - No new variables created
5. `leaveLevel()` → `current_level = 0`
6. `generalize(t1)`:
   - Find free variables: `[t1]`
   - Check levels: `t1.level (0) > current_level (0)` ✗ FAIL
   - **Do NOT generalize** `t1`
   - Result: `t1` (monomorphic, NOT `<T>T`)

This correctly prevents `f` from being generalized because it comes from the outer scope.

#### Algorithm Invariants

The implementation must maintain:

1. **Level monotonicity:** `0 <= current_level <= max_nesting_depth`
2. **Variable creation:** All type variables created have `level = current_level` at creation time
3. **Level lowering:** During unification, levels can only decrease (via `updateLevel`), never increase
4. **Generalization safety:** Only generalize variables where `level > current_level`
5. **Scope correlation:** A variable's level corresponds to the let-binding depth where it was introduced

#### Performance Characteristics

- **Level operations:** O(1) - increment/decrement counter
- **Variable creation:** O(1) - assign current level
- **Generalization check:** O(1) per variable - compare `level > current_level`
- **Overall:** Linear in type size, no need to scan entire environment

Compare to naive Algorithm W:
- **Naive approach:** O(n) scan of environment to check if variable is free
- **Level-based:** O(1) level comparison
- **Speedup:** Significant for deeply nested let-bindings

#### Testing Requirements

The typechecker implementation must include tests for:

1. **Basic generalization:**
   - `let id = (x) => x` should be polymorphic
   - Multiple uses with different types should succeed

2. **Escape prevention:**
   - Function parameters should not be generalized
   - Variables from outer scopes should not be generalized

3. **Nested let-bindings:**
   - Each level should generalize independently
   - Inner lets can use polymorphic outer lets

4. **Value restriction interaction:**
   - Non-values should not be generalized (separate from levels)
   - Levels should still prevent escape for non-values

5. **Unification level updates:**
   - Unifying variables at different levels should update correctly
   - Level lowering should propagate through types

6. **Edge cases:**
   - Deep nesting (many levels)
   - Mutually recursive let-bindings
   - Type variables in function return types

#### Implementation Notes

- The level field is an **implementation detail** and should not appear in user-facing type error messages
- Type variable pretty-printing should use names (`a`, `b`, `t`, etc.), not levels
- The level algorithm is **compatible** with the value restriction - both checks must pass for generalization
- For efficiency, consider using a union-find data structure for type variables with path compression

### 7.5 Algorithm M: Two-Phase Constraint-Based Type Inference

**Strategic Decision:** Vibefun uses Algorithm M (constraint-based, two-phase) instead of Algorithm W (direct unification) to enable better error messages, partial results for IDE support, and future extensibility.

#### Overview

**Algorithm M** is a constraint-based approach to Hindley-Milner type inference that separates constraint generation from constraint solving. This separation provides significant advantages over Algorithm W:

**Benefits:**
- **Better error messages:** Can analyze all constraints before choosing which errors to report
- **Partial results:** Generate type information even when errors exist (critical for IDE support)
- **Error recovery:** Continue inference after encountering errors using placeholder types
- **Bidirectional typing:** Expected types flow top-down, inferred types flow bottom-up
- **Extensibility:** Easier to add new type system features (GADTs, effects, advanced subtyping)

**Trade-offs:**
- More complex implementation (two phases vs one)
- Slightly higher memory usage (store all constraints)
- Performance overhead minimal (two passes vs one, but enables optimizations)

#### Two-Phase Architecture

**Phase 1: Constraint Generation**
- Traverse the Core AST
- Generate type constraints without solving them
- Use bidirectional typing (expected types guide generation)
- Collect all constraints into a constraint set
- Do NOT unify during this phase

**Phase 2: Constraint Solving**
- Process all collected constraints
- Apply unification to equality constraints
- Apply subsumption to subtyping constraints
- Detect and prioritize error reporting
- Generate substitution mapping type variables to types

#### Constraint Types

The typechecker must support three kinds of constraints:

```typescript
type Constraint =
    | { kind: "Equality"; t1: Type; t2: Type; loc: Location }
    | { kind: "Instance"; type: Type; scheme: TypeScheme; loc: Location }
    | { kind: "Subtype"; sub: Type; super: Type; loc: Location }
```

**Equality Constraint** (`t1 = t2`):
- Requires `t1` and `t2` to unify
- Generated from: function application, let-binding, pattern matching
- Solved by: unification algorithm with occurs check

**Instance Constraint** (`t <: scheme`):
- Type `t` must be an instance of polymorphic scheme
- Generated from: variable lookup, polymorphic instantiation
- Solved by: scheme instantiation (create fresh type variables for quantifiers)

**Subtype Constraint** (`t1 <: t2`):
- Type `t1` must be a subtype of `t2`
- Generated from: record width subtyping
- Solved by: structural subtyping rules (extra fields allowed in records)

#### Bidirectional Typing

Algorithm M uses **bidirectional** type checking with expected types:

```typescript
// Constraint generation with expected type
function generate(env: TypeEnv, expr: CoreExpr, expected: Type | null): Constraint[] {
    // expected = null means "synthesize" (infer type bottom-up)
    // expected = Type means "check" (use top-down information)
}
```

**Synthesis mode** (expected = null):
- Infer type from expression structure
- Bottom-up type flow
- Used for: variables, literals, lambdas, applications

**Checking mode** (expected = Type):
- Use expected type to guide inference
- Top-down type flow
- Used for: function arguments, let-bindings, annotations

**Benefits of bidirectionality:**
- More precise type inference
- Better error locations (know what was expected)
- Supports future features (subsumption, higher-rank types)

#### Phase 1: Constraint Generation Algorithm

**Core generation function:**

```typescript
function generate(env: TypeEnv, expr: CoreExpr, expected: Type | null): Constraint[] {
    switch (expr.type) {
        case "Literal":
            const litType = literalType(expr.value);
            if (expected) {
                return [{ kind: "Equality", t1: litType, t2: expected, loc: expr.loc }];
            }
            return [];

        case "Variable":
            const scheme = env.lookup(expr.name);
            const instType = freshTypeVar(current_level);
            const constraints: Constraint[] = [
                { kind: "Instance", type: instType, scheme: scheme, loc: expr.loc }
            ];
            if (expected) {
                constraints.push({ kind: "Equality", t1: instType, t2: expected, loc: expr.loc });
            }
            return constraints;

        case "Lambda":
            // Fresh type variables for parameter and result
            const paramType = expr.paramType || freshTypeVar(current_level);
            const resultType = freshTypeVar(current_level);
            const funType = { type: "Function", param: paramType, result: resultType };

            // Add parameter to environment
            const bodyEnv = env.extend(expr.param, paramType);

            // Generate constraints for body (checking mode with expected result type)
            const bodyConstraints = generate(bodyEnv, expr.body, resultType);

            // Unify function type with expected type
            const constraints = [...bodyConstraints];
            if (expected) {
                constraints.push({ kind: "Equality", t1: funType, t2: expected, loc: expr.loc });
            }
            return constraints;

        case "Application":
            // Synthesize function type
            const argType = freshTypeVar(current_level);
            const resType = freshTypeVar(current_level);
            const funType = { type: "Function", param: argType, result: resType };

            const funConstraints = generate(env, expr.func, funType);
            const argConstraints = generate(env, expr.arg, argType);

            const constraints = [...funConstraints, ...argConstraints];
            if (expected) {
                constraints.push({ kind: "Equality", t1: resType, t2: expected, loc: expr.loc });
            }
            return constraints;

        case "Let":
            enterLevel();
            const bindingConstraints = generate(env, expr.value, null);  // Synthesize
            leaveLevel();

            // Generalize the inferred type
            const bindingType = freshTypeVar(current_level);
            const scheme = generalize(bindingType);

            // Type check body with extended environment
            const bodyEnv = env.extend(expr.name, scheme);
            const bodyConstraints = generate(bodyEnv, expr.body, expected);

            return [...bindingConstraints, ...bodyConstraints];

        // ... other expression types
    }
}
```

**Key principles:**
- Generate constraints, don't solve
- Use expected types when available (checking mode)
- Synthesize types when no expectation (synthesis mode)
- Collect all constraints for later solving

#### Phase 2: Constraint Solving Algorithm

**Core solving function:**

```typescript
function solve(constraints: Constraint[]): Substitution {
    let subst: Substitution = empty;
    const errors: TypeError[] = [];

    for (const constraint of constraints) {
        try {
            switch (constraint.kind) {
                case "Equality":
                    // Apply current substitution
                    const t1 = applySubst(subst, constraint.t1);
                    const t2 = applySubst(subst, constraint.t2);

                    // Unify
                    const newSubst = unify(t1, t2);
                    subst = compose(newSubst, subst);
                    break;

                case "Instance":
                    // Instantiate scheme
                    const instType = instantiate(constraint.scheme);
                    const t = applySubst(subst, constraint.type);
                    const unifier = unify(t, instType);
                    subst = compose(unifier, subst);
                    break;

                case "Subtype":
                    // Check subtyping (for records)
                    const tsub = applySubst(subst, constraint.sub);
                    const tsuper = applySubst(subst, constraint.super);
                    const subtypeSubst = checkSubtype(tsub, tsuper);
                    subst = compose(subtypeSubst, subst);
                    break;
            }
        } catch (err) {
            // Collect errors but continue solving
            errors.push({ ...err, loc: constraint.loc });

            // Use placeholder type to continue
            const placeholder = { type: "Error", id: freshErrorId() };
            // Bind type variables to placeholder to enable partial results
        }
    }

    // Analyze and prioritize errors before reporting
    if (errors.length > 0) {
        const prioritized = prioritizeErrors(errors);
        throw prioritized[0];  // Report most helpful error
    }

    return subst;
}
```

**Error recovery strategy:**
- Catch errors during solving but continue processing
- Use placeholder "error types" to enable partial results
- Collect all errors, then prioritize which to report
- Choose most local, specific, and actionable error

**Error prioritization:**
1. Type mismatches with location information (most specific)
2. Occurs check failures (infinite types)
3. Missing variable errors
4. Subtyping failures

#### Integration with Type Variable Levels

Algorithm M is **fully compatible** with the level-based scoping algorithm (section 7.4):

- Levels track let-binding nesting during constraint generation
- `enterLevel()` called before generating constraints for let-bindings
- `leaveLevel()` called before generalization
- Generalization uses level checks: `level > current_level`
- Constraint solving respects level invariants

#### Error Recovery for IDE Support

**Placeholder types:**
```typescript
type Type =
    | ... // normal types
    | { type: "Error"; id: number }  // Placeholder for errors

// Use error types to continue inference
function handleError(constraint: Constraint): Type {
    return { type: "Error", id: freshErrorId() };
}
```

**Partial results:**
- Even with errors, generate types for all expressions
- Use error types as placeholders where inference fails
- IDE can show "partial" type information with error markers
- Enables type-at-cursor even with errors elsewhere

#### Testing Requirements

**Phase 1 testing (Constraint Generation):**
1. Generate correct constraints for all expression types
2. Bidirectional mode switching (synthesis vs checking)
3. Expected type propagation
4. Constraint collection without premature solving

**Phase 2 testing (Constraint Solving):**
1. Equality constraint solving (unification)
2. Instance constraint solving (instantiation)
3. Subtype constraint solving (width subtyping for records)
4. Error detection and collection
5. Error prioritization and reporting

**Integration testing:**
1. End-to-end type inference with both phases
2. Error recovery with placeholder types
3. Partial results with errors
4. All existing type checker tests adapted to Algorithm M

**Error message quality testing:**
1. Compare error messages to Algorithm W baseline
2. Verify error location accuracy
3. Test error prioritization (most helpful first)
4. Verify inference chains in error messages

#### Migration from Current Implementation

**Current state:** Vibefun has:
- Algorithm W implementation with eager unification
- Constraint types defined but solved eagerly
- `/packages/core/src/typechecker/constraints.ts` with Equality and Instance constraints

**Migration path:**
1. **Keep:** Type representation, type environment, level tracking, generalization
2. **Refactor:** Split `infer()` into `generate()` and `solve()`
3. **Add:** Expected type parameter to all generation functions
4. **Add:** Bidirectional typing rules
5. **Enhance:** Error recovery with placeholder types
6. **Improve:** Error prioritization and reporting

**Incremental approach:**
1. Add expected type parameter (can be null initially)
2. Separate constraint generation from solving
3. Defer solving to end of generation phase
4. Add error recovery with placeholders
5. Enhance error messages with constraint analysis

#### Performance Characteristics

**Algorithm M complexity:**
- **Constraint generation:** O(n) where n = AST size
- **Constraint solving:** O(n log n) with union-find optimization
- **Overall:** Same asymptotic complexity as Algorithm W
- **Memory:** O(n) to store constraints (acceptable trade-off)

**Optimizations:**
- Use union-find for type variable unification
- Cache solved constraints
- Lazy constraint solving for incremental type checking
- Parallel constraint solving for independent constraints

#### Implementation Priorities

**Phase 1 (Core Algorithm M):**
1. Add expected type parameter to inference functions
2. Implement constraint generation for all expressions
3. Implement bidirectional typing rules
4. Separate constraint solving into distinct phase

**Phase 2 (Error Recovery):**
1. Add error type placeholders
2. Implement error collection during solving
3. Continue solving after errors
4. Generate partial results

**Phase 3 (Error Quality):**
1. Implement error prioritization algorithm
2. Add inference chain tracking
3. Improve error messages with context
4. Show expected vs actual types clearly

**Phase 4 (IDE Support):**
1. Incremental constraint generation
2. Partial result queries
3. Type-at-cursor with error recovery
4. Real-time error reporting

#### Sources and References

**Algorithm M and Constraint-Based Inference:**
- [Hindley-Milner inference with constraints](https://kseo.github.io/posts/2017-01-02-hindley-milner-inference-with-constraints.html) - Kwang Yul Seo's detailed explanation
- [Damas-Hindley-Milner inference two ways](https://bernsteinbear.com/blog/type-inference/) - Max Bernstein's comparison of Algorithm W vs constraint-based
- [Lecture 11: Type Inference](https://course.ccs.neu.edu/cs4410sp19/lec_type-inference_notes.html) - Northeastern University course notes
- [Unification (computer science)](https://en.wikipedia.org/wiki/Unification_(computer_science)) - Unification algorithm details

**Bidirectional Typing:**
- [Bidirectional Type Checking](https://www.cl.cam.ac.uk/~nk480/bidir.pdf) - Jana Dunfield and Neelakantan R. Krishnaswami (2019)
- Covers bidirectional typing with synthesis and checking modes

**Error Recovery:**
- [Resilient Parsing and Error Recovery](http://soft-dev.org/pubs/html/diekmann_tratt__resilient_ll_parsing_tutorial/) - Error recovery strategies
- [Incremental Type Checking](https://www.pl-enthusiast.net/2015/06/29/incremental-type-checking/) - IDE support patterns

**Production Implementations:**
- Rust's type checker: Constraint-based with bidirectional typing
- Elm's type checker: Algorithm M with excellent error messages
- PureScript: Constraint-based inference with advanced features

#### Summary

Algorithm M provides Vibefun with:
- ✅ **Better error messages** through constraint analysis
- ✅ **IDE support** via partial results and error recovery
- ✅ **Future extensibility** for advanced type features
- ✅ **Clean architecture** with separated concerns

The two-phase design (generation + solving) is more complex than Algorithm W but provides significant benefits for developer experience and future language evolution.

### 7.6 Unification Algorithm

**Implementation Status:** ✅ COMPLETE - Production-quality Robinson's unification already implemented in `/packages/core/src/typechecker/unify.ts`

#### Overview

**Robinson's Unification Algorithm** is the standard algorithm for unifying types in Hindley-Milner type systems. Vibefun's implementation includes:
- Core unification for all type forms
- Occurs check to prevent infinite types
- Level tracking integration to prevent scope escape
- Width subtyping for records via common field matching
- Nominal typing for variants

#### Robinson's Algorithm Specification

**Core unification function:**

```typescript
function unify(t1: Type, t2: Type): Substitution {
    // 1. If types are identical, return empty substitution
    if (typesEqual(t1, t2)) {
        return empty;
    }

    // 2. If either is a type variable, bind it (with occurs check)
    if (t1.type === "Var") {
        if (occursCheck(t1.id, t2)) {
            throw new TypeError("Occurs check: cannot create infinite type");
        }
        updateLevels(t2, t1.level);  // Prevent scope escape
        return bind(t1.id, t2);
    }

    if (t2.type === "Var") {
        if (occursCheck(t2.id, t1)) {
            throw new TypeError("Occurs check: cannot create infinite type");
        }
        updateLevels(t1, t2.level);  // Prevent scope escape
        return bind(t2.id, t1);
    }

    // 3. If both are compound types, recursively unify components
    if (t1.type === "Function" && t2.type === "Function") {
        return unifyFunctions(t1, t2);
    }

    if (t1.type === "Record" && t2.type === "Record") {
        return unifyRecords(t1, t2);  // Width subtyping
    }

    if (t1.type === "Variant" && t2.type === "Variant") {
        return unifyVariants(t1, t2);  // Nominal typing
    }

    // ... other type forms (App, Tuple, Union, Ref, etc.)

    // 4. Otherwise, types cannot unify
    throw new TypeError(`Cannot unify ${typeToString(t1)} with ${typeToString(t2)}`);
}
```

#### Occurs Check Algorithm

**Purpose:** Prevents infinite types like `α = List<α>` or `α = α -> Int`

**Algorithm:**

```typescript
function occursCheck(varId: number, type: Type): boolean {
    switch (type.type) {
        case "Var":
            return type.id === varId;

        case "Function":
            return type.params.some(p => occursCheck(varId, p))
                || occursCheck(varId, type.result);

        case "App":
            return occursCheck(varId, type.constructor)
                || type.args.some(arg => occursCheck(varId, arg));

        case "Record":
            return Object.values(type.fields).some(field =>
                occursCheck(varId, field.type)
            );

        case "Variant":
            return type.constructors.some(ctor =>
                ctor.args.some(arg => occursCheck(varId, arg))
            );

        case "Tuple":
            return type.elements.some(elem => occursCheck(varId, elem));

        case "Union":
            return type.types.some(t => occursCheck(varId, t));

        case "Ref":
            return occursCheck(varId, type.inner);

        default:
            return false;  // Constants, primitives don't contain variables
    }
}
```

**Key points:**
- Recursively traverses type structure
- Returns true if variable ID found anywhere in type
- Called before binding a type variable
- Prevents unification that would create infinite types

#### Width Subtyping for Records

**Approach:** Unification-based (NOT subsumption-based, NOT row polymorphism)

**Algorithm:**

```typescript
function unifyRecords(r1: RecordType, r2: RecordType): Substitution {
    // Find common fields (intersection of field names)
    const commonFields = Object.keys(r1.fields).filter(
        key => key in r2.fields
    );

    // Unify only the common fields
    let subst: Substitution = empty;
    for (const fieldName of commonFields) {
        const field1 = applySubst(subst, r1.fields[fieldName].type);
        const field2 = applySubst(subst, r2.fields[fieldName].type);

        const fieldSubst = unify(field1, field2);
        subst = composeSubst(subst, fieldSubst);
    }

    // Extra fields in either record are ignored (width subtyping)
    return subst;
}
```

**Key characteristics:**
- **NOT row polymorphism:** No row variables like `{x: Int | ρ}`
- **NOT subsumption:** No directional subtyping check `<:`
- **IS structural matching:** Extra fields ignored during unification
- **Width subtyping via equality:** `{x: Int, y: Int, z: Int}` unifies with `{x: Int, y: Int}` by checking only `x` and `y`

**Example:**
```vibefun
let f: {x: Int} -> Int = (r) => r.x;
let value = {x: 42, y: "hello", z: true};

f(value);  // OK: value has x: Int (extra fields y, z ignored)
```

#### Level Updates During Unification

**Purpose:** Prevent type variables from escaping their defining scope

**Algorithm:**

```typescript
function updateLevels(type: Type, maxLevel: number): void {
    // For type variables: update level to minimum
    if (type.type === "Var") {
        type.level = Math.min(type.level, maxLevel);
        return;
    }

    // Recursively update levels in compound types
    switch (type.type) {
        case "Function":
            type.params.forEach(p => updateLevels(p, maxLevel));
            updateLevels(type.result, maxLevel);
            break;

        case "App":
            updateLevels(type.constructor, maxLevel);
            type.args.forEach(arg => updateLevels(arg, maxLevel));
            break;

        case "Record":
            Object.values(type.fields).forEach(field =>
                updateLevels(field.type, maxLevel)
            );
            break;

        // ... other compound types
    }
}
```

**When called:**
- After occurs check passes
- Before binding a type variable to a type
- Ensures all type variables in the bound type have levels ≤ binding variable's level

**Integration with generalization:**
- Variables at deeper levels (higher numbers) can be generalized
- Variables at shallower levels (lower numbers) cannot escape
- See section 7.4 for complete level-based scoping algorithm

#### Substitution Operations

**Substitution representation:**

```typescript
type Substitution = Map<number, Type>;  // Maps type variable ID to type
```

**Application (applying substitution to a type):**

```typescript
function applySubst(subst: Substitution, type: Type): Type {
    switch (type.type) {
        case "Var":
            const binding = subst.get(type.id);
            if (binding) {
                // Follow chain: apply subst to the binding recursively
                return applySubst(subst, binding);
            }
            return type;

        case "Function":
            return {
                ...type,
                params: type.params.map(p => applySubst(subst, p)),
                result: applySubst(subst, type.result)
            };

        // ... recursively apply to all compound types

        default:
            return type;  // Constants unchanged
    }
}
```

**Composition (combining substitutions):**

```typescript
function composeSubst(s1: Substitution, s2: Substitution): Substitution {
    const result = new Map(s1);

    // For each binding in s2, apply s1 and add to result
    for (const [varId, type] of s2.entries()) {
        result.set(varId, applySubst(s1, type));
    }

    return result;
}
```

**Properties:**
- Application is idempotent: `apply(s, apply(s, t)) = apply(s, t)`
- Composition is associative: `compose(compose(s1, s2), s3) = compose(s1, compose(s2, s3))`

#### Nominal Typing for Variants

**Approach:** Variants must have identical constructor definitions to unify

```typescript
function unifyVariants(v1: VariantType, v2: VariantType): Substitution {
    // Variants must have the same type name (nominal typing)
    if (v1.name !== v2.name) {
        throw new TypeError(
            `Cannot unify variant ${v1.name} with variant ${v2.name}`
        );
    }

    // Unify type parameters
    return unifyTypeArgs(v1.typeArgs, v2.typeArgs);
}
```

**Key principle:**
- Variant types are **nominal**, not structural
- `type Result<T, E> = Ok(T) | Err(E)` and `type Either<A, B> = Left(A) | Right(B)` do NOT unify
- Even if structurally identical, different names mean different types
- This prevents accidental type equivalence and gives better error messages

#### Error Cases and Messages

**Unification can fail in several ways:**

1. **Type mismatch:**
   ```
   Error: Cannot unify Int with String
     Expected: Int
     Got: String
   ```

2. **Occurs check failure (infinite type):**
   ```
   Error: Occurs check failed: cannot create infinite type
     Variable 'a cannot equal List<'a>
   ```

3. **Arity mismatch:**
   ```
   Error: Function arity mismatch
     Expected: (Int, String) -> Bool
     Got: (Int) -> Bool
   ```

4. **Nominal type mismatch:**
   ```
   Error: Cannot unify variant Result with variant Either
     These are distinct types even if structurally similar
   ```

**Error message requirements:**
- Include location information (file, line, column)
- Show expected vs actual types
- Provide helpful context (e.g., "In function application", "In let-binding")
- Suggest fixes when possible (see Gap 8 for error reporting strategy)

#### Testing Requirements

**Comprehensive test coverage needed for:**

1. **Basic unification:**
   - Identical types (trivial cases)
   - Type variable unification
   - Constant unification

2. **Occurs check:**
   - Simple cycles (`'a = List<'a>`)
   - Complex cycles (`'a = 'a -> Int`)
   - Nested cycles
   - Cycles through compound types

3. **Level updates:**
   - Variables at different levels
   - Level lowering during unification
   - Integration with generalization

4. **Width subtyping:**
   - Records with extra fields
   - Records with missing fields (should unify)
   - Common fields must unify correctly
   - Nested records

5. **Compound types:**
   - Functions (parameters and return types)
   - Type applications (List<Int>, Option<String>)
   - Tuples (all elements)
   - Unions (all alternatives)
   - Refs (inner type)

6. **Error cases:**
   - Type mismatches
   - Occurs check failures
   - Arity mismatches
   - Nominal type mismatches

**Current test coverage:** ✅ Excellent - 648 lines of tests in `unify.test.ts` covering all scenarios

#### Performance Characteristics

**Current implementation (functional style):**
- Substitution application: O(n) where n = type size
- Substitution composition: O(m) where m = number of bindings
- Unification: O(n) for type size n
- Overall type checking: O(n²) in worst case for program size n

**Optimization opportunity (deferred):**
- **Union-Find with path compression**: Could reduce to O(n α(n)) where α is inverse Ackermann
- **Mutable state**: Could eliminate substitution composition overhead
- **Trade-off**: Current functional implementation prioritizes clarity and correctness over micro-optimization
- **Decision**: Performance is adequate for typical programs; optimize only if profiling shows bottleneck

#### Integration with Algorithm M

Unification is used in **Phase 2 (Constraint Solving)** of Algorithm M:

```typescript
// During constraint solving (Algorithm M Phase 2)
for (const constraint of constraints) {
    if (constraint.kind === "Equality") {
        const t1 = applySubst(currentSubst, constraint.t1);
        const t2 = applySubst(currentSubst, constraint.t2);

        const newSubst = unify(t1, t2);  // Call Robinson's unification
        currentSubst = composeSubst(currentSubst, newSubst);
    }
}
```

The unification algorithm itself is **independent** of whether the type checker uses Algorithm W or Algorithm M - both rely on the same core unification.

#### Sources and References

**Academic Sources:**
- [Hindley-Milner Type Inference](https://steshaw.org/hm/hindley-milner.pdf) - Original Hindley-Milner paper with Robinson's algorithm
- [A Theory of Type Polymorphism in Programming](https://courses.cs.washington.edu/courses/cse590p/06sp/milner.pdf) - Milner's seminal paper (1978)

**Tutorial Sources:**
- [Type Inference - Cornell CS3110](https://www.cs.cornell.edu/courses/cs3110/2011sp/Lectures/lec26-type-inference/type-inference.htm) - Educational presentation of unification
- [Understanding Algorithm W](https://jeremymikkola.com/posts/2018_03_25_understanding_algorithm_w.html) - Practical guide with unification details
- [Tying up Type Inference](https://thunderseethe.dev/posts/unification/) - Modern implementation guide

**Advanced Topics:**
- [Union-Find for Type Inference](https://papl.cs.brown.edu/2016/Type_Inference.html) - Optimization technique
- [Disjoint-Set Data Structure](https://en.wikipedia.org/wiki/Disjoint-set_data_structure) - Union-find background

**Subtyping and Width:**
- [Row Polymorphism Isn't Subtyping](https://brianmckenna.org/blog/row_polymorphism_isnt_subtyping) - Clarifies different approaches
- [Covariance and Contravariance](https://eli.thegreenplace.net/2018/covariance-and-contravariance-in-subtyping/) - Variance in type systems

#### Summary

Vibefun's unification implementation:
- ✅ **Correct:** Implements Robinson's algorithm with occurs check
- ✅ **Complete:** Handles all Vibefun type forms
- ✅ **Integrated:** Works with level-based scoping and Algorithm M
- ✅ **Tested:** Comprehensive test coverage (100% of scenarios)
- ✅ **Documented:** This specification provides complete algorithm details

The unification algorithm is a **proven, battle-tested component** that forms the foundation of Vibefun's type inference system.

## 8. Identified Gaps in Specification

### 8.1 Algorithm Details Not Specified

1. **Type error priorities:**
   - When multiple type errors exist, which to report first?
   - Should we report all errors or stop at first?
   - How to provide most helpful error messages?
   - Note: Algorithm M (section 7.5) provides error prioritization strategy

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
