# Type Checker Implementation Plan

**Created:** 2025-10-30
**Updated:** 2025-10-30 (Final - All Decisions Incorporated)
**Status:** Planning Complete - Ready for Implementation

## Overview

Implement a complete Hindley-Milner type checker with Algorithm W for the vibefun language. This builds on the existing environment building and overload resolution components already implemented in `packages/core/src/typechecker/`.

## Existing Foundation

The following components are already complete:
- ✅ **Environment Building** (`environment.ts`): Scans module declarations, groups external overloads, validates constraints
- ✅ **Overload Resolution** (`resolver.ts`): Arity-based resolution for overloaded external functions
- ✅ **Test Coverage**: 28 passing tests for environment and resolver
- ✅ **Type Definitions** (`types/environment.ts`): TypeEnv, ValueBinding, Type, TypeScheme structures

## What's Desugared (Not in Core AST)

The following constructs are handled by the desugarer and **DO NOT** appear in Core AST:

- ✅ **Multi-parameter lambdas**: Desugared to curried single-parameter lambdas
- ✅ **Pipe operator (`|>`)**: Desugared to function applications
- ✅ **Composition operators (`>>`, `<<`)**: Desugared to lambda compositions
- ✅ **If-then-else expressions**: Desugared to match on boolean
- ✅ **Block expressions**: Desugared to nested let bindings
- ✅ **List literals `[1, 2, 3]`**: Desugared to Cons/Nil variant constructors
- ✅ **List cons operator (`::`)**: Desugared to Cons variant constructor
- ✅ **List patterns**: Desugared to variant patterns (Cons/Nil)
- ✅ **Record update spread syntax**: Desugared to explicit field copying
- ✅ **Or-patterns (`p1 | p2`)**: Expanded to multiple match cases

**Reference**: See `packages/core/src/types/core-ast.ts` (lines 1-17) for complete documentation.

**Type Checker Implication**: These constructs are already simplified before type checking begins.

## Core AST Constructs to Type Check

The type checker operates on Core AST and must handle:

**Expressions**:
- Literals: Int, Float, String, Bool, Unit
- Variables and let-bindings (with mutable support)
- Single-parameter lambdas (curried)
- Function applications
- Match expressions (the only conditional construct)
- Records: construction, access, update
- Variants: constructor applications (includes Cons/Nil, Some/None)
- Binary operators: arithmetic, comparison, logical, string concat, ref assignment
- Unary operators: negate, logical not, dereference
- Type annotations
- Unsafe blocks

**Patterns**:
- Wildcard (`_`)
- Variable binding
- Literals
- Variant patterns (with args)
- Record patterns

**Declarations**:
- Let declarations (value bindings)
- Type declarations (aliases, records, variants)
- External declarations (with overload support)
- External type declarations
- Imports

**Guards**: Match cases may have optional guard expressions (`when` clauses)

## Implementation Phases

### Phase 1: Type Representation & Unification (Foundation)

**Estimated Effort:** 4-6 hours

**Files to Create:**
- `packages/core/src/typechecker/types.ts` - Type representation utilities
- `packages/core/src/typechecker/unify.ts` - Unification algorithm
- `packages/core/src/typechecker/types.test.ts` - Type utilities tests
- `packages/core/src/typechecker/unify.test.ts` - Unification tests

**Implementation Tasks:**
1. Create concrete Type representation functions/builders
2. Implement Substitution type and composition
3. Build unification algorithm with occurs check
4. Add type formatting utilities (typeToString for errors)
5. Implement type variable freshening
6. Add Never type support (for panic function)
   - Never unifies with any type (bottom type)
   - Used for functions that never return

**Test Requirements:**
- Unify primitive types (Int with Int succeeds, Int with String fails)
- Unify function types with parameter/return types
- Unify type variables (α unifies with anything, creates substitution)
- Occurs check (α cannot unify with List<α>)
- Substitution application and composition
- Complex nested types (Option<List<Int>>)
- Record type unification (structural)
- Variant type unification
- Union type unification
- Never type unification (always succeeds)
- **Target:** 25+ tests

**Quality Gate:**
- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run format` applied
- [ ] Test coverage ≥90%

---

### Phase 2: Type Environment & Built-ins

**Estimated Effort:** 3-4 hours

**Files to Create:**
- `packages/core/src/typechecker/builtins.ts` - Built-in types and stdlib signatures
- `packages/core/src/typechecker/builtins.test.ts` - Built-ins tests

**Files to Modify:**
- `packages/core/src/typechecker/environment.ts` - Extend to include built-ins

**Implementation Tasks:**
1. Define primitive type constants (Int, Float, String, Bool, Unit, Never)
2. Create algebraic type definitions:
   - List<T>: Cons(head: T, tail: List<T>) | Nil
   - Option<T>: Some(T) | None
   - Result<T, E>: Ok(T) | Err(E)
3. Define variant constructor functions (Cons: (T, List<T>) -> List<T>, etc.)
4. Add **17 core standard library function signatures** (Phase 2 subset):
   - **List (4)**: map, filter, fold, length
   - **Option (3)**: map, flatMap, getOrElse
   - **Result (3)**: map, flatMap, isOk
   - **String (3)**: length, concat, fromInt
   - **Int (2)**: toString, toFloat
   - **Float (2)**: toString, toInt
   - **Note**: Remaining 29 stdlib functions deferred to Phase 9
5. Add panic function signature: `panic: (String) -> Never`
6. Extend buildEnvironment() to inject built-ins into TypeEnv
7. Handle CoreExternalTypeDecl: Register external types as type aliases

**Test Requirements:**
- Built-in environment contains all primitives (including Never)
- List, Option, Result types available with correct structure
- Variant constructors have correct function types
- Standard library functions have proper polymorphic types
- Environment building doesn't break existing tests
- Generic nullary constructors work (None, Nil)
- **Target:** 15+ tests

**Quality Gate:**
- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes (all existing + new)
- [ ] `npm run format` applied
- [ ] Test coverage ≥90%

---

### Phase 2.5: Mutable References (CRITICAL - NEW)

**Estimated Effort:** 5-7 hours

**Why This Phase**: Mutable references are a core language feature (pragmatic functional programming) and present in Core AST but were missing from original plan.

**Core AST Support:**
- `CoreBinOp`: "RefAssign" (`:=` operator)
- `CoreUnaryOp`: "Deref" (`!` operator)
- `CoreLet`: `mutable: boolean` field
- `CoreLetDecl`: `mutable: boolean` field

**Files to Modify:**
- `packages/core/src/typechecker/types.ts` - Add Ref<T> type
- `packages/core/src/typechecker/builtins.ts` - Add ref constructor
- `packages/core/src/typechecker/infer.ts` - Handle ref operations (will be created in Phase 3)

**Implementation Tasks:**
1. Add `Ref<T>` type constructor to Type definition:
   ```typescript
   | { type: "Ref"; inner: Type }  // Reference type
   ```
2. Add ref constructor to built-ins:
   ```vibefun
   ref: forall a. (a) -> Ref<a>
   ```
3. Implement **full syntactic value restriction**:
   - Only syntactic values can be generalized in let-polymorphism
   - Syntactic values: variables, lambdas, literals, constructors
   - Non-values (function applications, match expressions, etc.) cannot be generalized
   - Prevents unsound polymorphism with effects (refs, I/O, etc.)
   - Aligns with OCaml/SML semantics
   - Implement `isSyntacticValue(expr: CoreExpr): boolean` predicate
4. Type check RefAssign operator (`:=`):
   - Left side: must be `Ref<T>`
   - Right side: must be `T`
   - Result: `Unit`
5. Type check Deref operator (`!`):
   - Expression: must be `Ref<T>`
   - Result: `T`
6. Handle `mutable` flag in let-bindings:
   - Check if bound value is a ref
   - Apply value restriction appropriately

**Test Requirements:**
- Ref<T> type construction and unification
- Creating refs: `ref(42)` has type `Ref<Int>`
- Reference assignment: `r := 5` where r: Ref<Int>
- Dereferencing: `!r` where r: Ref<Int> returns Int
- Assignment to non-ref fails (type error)
- Dereferencing non-ref fails (type error)
- **Syntactic value restriction**:
  - Variables, lambdas, literals, constructors can be generalized
  - Function applications cannot be generalized
  - Match expressions cannot be generalized
  - `let r = ref(None)` requires annotation (non-value)
  - `let f = (x) => x` can be generalized (syntactic value)
- Mutable let bindings work correctly
- Immutable refs (let without mut) still work
- **Target:** 25+ tests

**Quality Gate:**
- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run format` applied
- [ ] Test coverage ≥90%

---

### Phase 3: Core Type Inference (Algorithm W - Basics)

**Estimated Effort:** 6-8 hours

**Files to Create:**
- `packages/core/src/typechecker/infer.ts` - Core inference engine
- `packages/core/src/typechecker/constraints.ts` - Constraint generation and solving
- `packages/core/src/typechecker/infer.test.ts` - Inference tests

**Implementation Tasks:**
1. Implement InferenceContext (type environment, fresh variable counter, substitution, current level)
2. Build fresh type variable generation (with levels)
3. **Define Constraint data structure:**
   - `{ kind: "Equality"; t1: Type; t2: Type; loc: Location }`
   - `{ kind: "Instance"; scheme: TypeScheme; type: Type; loc: Location }`
4. **Implement constraint solver:**
   - `solveConstraints(constraints: Constraint[]): Substitution`
   - Apply unification to solve equality constraints
   - Handle instantiation constraints
5. Implement `inferExpr()` for:
   - Literals: CoreIntLit → Int, CoreStringLit → String, etc.
   - Variables: CoreVar → lookup in environment, instantiate type scheme
   - Lambda: CoreLambda → create function type, infer body (single-param only)
   - Application: CoreApp → infer function, infer arguments, unify
   - Binary operators: CoreBinOp → handle all operator types
   - Unary operators: CoreUnaryOp → handle negation, not, deref
4. Thread substitutions through inference
5. Handle type annotations (CoreTypeAnnotation)

**Binary Operator Type Checking** (Core AST has these):

**Arithmetic (Add, Subtract, Multiply, Divide, Modulo)**:
- Strategy: Type-directed specialization (no overloading)
- Both operands must unify with same type
- Type must be Int or Float (checked after unification)
- Result is same type as operands
- Cannot mix Int and Float (require explicit conversion)

**Comparison (LessThan, LessEqual, GreaterThan, GreaterEqual)**:
- Both operands must unify with same type
- Type must be Int or Float
- Result: Bool

**Equality (Equal, NotEqual)**:
- Polymorphic: both operands must unify with same type 'a
- Result: Bool
- Works for any type (structural equality)

**Logical (LogicalAnd, LogicalOr)**:
- Both operands: Bool
- Result: Bool

**String (Concat)**:
- Both operands: String
- Result: String
- This is the `&` operator in surface syntax

**Reference (RefAssign)**:
- Left operand: Ref<T>
- Right operand: T
- Result: Unit
- This is the `:=` operator

**Unary Operator Type Checking**:

**Negate**:
- Operand: Int or Float
- Result: same type as operand

**LogicalNot**:
- Operand: Bool
- Result: Bool

**Deref**:
- Operand: Ref<T>
- Result: T
- This is the `!` prefix operator

**Test Requirements:**
- Infer literal types correctly
- Look up variables and instantiate polymorphic types
- Infer lambda parameter and return types (single-param)
- Handle function application with unification
- Support curried functions
- Handle higher-order functions
- Support partial application
- Test all arithmetic operators (Int and Float)
- Test comparison operators
- Test equality operators (polymorphic)
- Test logical operators
- Test string concatenation (Concat operator)
- Test reference assignment (RefAssign)
- Test negation operator (Int and Float)
- Test logical not operator
- Test dereference operator (Deref)
- Type annotations constrain inference
- Type annotations mismatch produces error
- Function composition (already desugared to lambdas)
- Nested applications
- **Target:** 35+ tests

**Quality Gate:**
- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run format` applied
- [ ] Test coverage ≥90%

---

### Phase 4: Let-Bindings & Polymorphism

**Estimated Effort:** 5-6 hours

**Files to Modify:**
- `packages/core/src/typechecker/infer.ts` - Add let-binding support
- `packages/core/src/typechecker/infer.test.ts` - Polymorphism tests

**Implementation Tasks:**
1. Implement **level-based generalization**:
   - Find free type variables in inferred type
   - Find free type variables in environment
   - **Filter out variables with level > current level** (escape check)
   - Quantify vars free in type but not in env, at current level or deeper
   - Create TypeScheme with quantified vars
   - Apply **full syntactic value restriction** (only generalize syntactic values)
2. Implement instantiation:
   - Replace quantified variables with fresh type variables (at current level)
3. Type check CoreLet expressions:
   - Check `recursive: boolean` flag in CoreLet/CoreLetDecl
   - If recursive, bind name in environment BEFORE inferring value
   - Infer binding value type
   - Generalize to create type scheme (with value restriction)
   - Add to environment (or update if recursive)
   - Infer body expression
4. Handle recursive bindings:
   - When `recursive === true`, add binding to env before type checking value
   - Allows function to reference itself (factorial, fibonacci, etc.)
5. Handle mutable bindings:
   - Check `mutable` flag
   - Apply syntactic value restriction appropriately
6. Support mutually recursive functions (if needed - deferred decision)

**Full Syntactic Value Restriction**:
- Only syntactic values can be generalized
- Non-values (including function applications like `ref(None)`) cannot be generalized
- Prevents unsound polymorphism with effects and mutable state
- Example that requires annotation:
  ```vibefun
  let r = ref(None)  // Error: cannot generalize non-value
  let r: Ref<Option<Int>> = ref(None)  // OK with annotation
  ```
- Values that CAN be generalized:
  ```vibefun
  let id = (x) => x  // OK - lambda is syntactic value
  let f = id         // OK - variable is syntactic value
  let c = Some       // OK - constructor is syntactic value
  ```

**Test Requirements:**
- Simple let-bindings infer correctly
- Polymorphic identity function: `let id = x => x` usable at Int, String, etc.
- Polymorphic map: works with different function types
- Polymorphic compose function
- Let-bound values instantiated fresh at each use
- Recursive functions with `recursive: true` flag (factorial, fibonacci)
- **Type variable scoping with levels**:
  - Nested let-bindings with shadowing work correctly
  - Type variables don't escape their scope
  - `let f = () => ref(None)` fails (type var would escape)
  - Inner scopes can't leak variables to outer scopes
- **Syntactic value restriction**:
  - Function applications cannot be generalized
  - Lambdas, variables, constructors can be generalized
  - `ref(None)` requires type annotation
- Mutable bindings with `mutable: true` flag
- Recursive flag enables self-reference
- **Target:** 30+ tests (added scoping tests)

**Quality Gate:**
- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run format` applied
- [ ] Test coverage ≥90%

---

### Phase 4b: Mutually Recursive Functions (NEW)

**Estimated Effort:** 4-5 hours

**Prerequisites:** Parser must support `and` keyword in `let rec ... and ...` syntax

**Files to Modify:**
- Parser files (if not already updated) - Add `and` keyword support
- `packages/core/src/typechecker/infer.ts` - Handle mutual recursion
- `packages/core/src/typechecker/infer.test.ts` - Mutual recursion tests

**Implementation Tasks:**
1. **Parser changes** (if needed):
   - Add `and` as keyword
   - Parse `let rec f = expr1 and g = expr2 and h = expr3`
   - Generate CoreLet with list of mutually recursive bindings
2. **Type checker changes:**
   - Detect mutually recursive binding groups (bindings with `and`)
   - For each group:
     - Bind all names with fresh type variables BEFORE inferring any values
     - Increment level
     - Infer each value expression
     - Unify inferred types with placeholder types
     - Generalize all bindings together (at end of group)
     - Add all bindings to environment
3. Handle single recursion (existing `rec` keyword) as before
4. Ensure proper level management for mutual groups

**Test Requirements:**
- Simple mutual recursion: isEven/isOdd
- Three-way mutual recursion
- Mutually recursive functions with different types
- Mutually recursive functions with polymorphic types
- Mixing mutual recursion with regular recursion
- Error: Undefined function in mutual group
- Error: Type mismatch in mutual group
- **Target:** 20+ tests

**Quality Gate:**
- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run format` applied
- [ ] Test coverage ≥90%

---

### Phase 5: Algebraic Data Types & Type Definitions

**Estimated Effort:** 6-7 hours

**Files to Modify:**
- `packages/core/src/typechecker/infer.ts` - Add ADT support
- `packages/core/src/typechecker/infer.test.ts` - ADT tests
- `packages/core/src/typechecker/environment.ts` - Type definition processing

**Implementation Tasks:**
1. Implement type definition processing (two-pass for recursion):
   - **First pass**: Add type constructors to environment
   - **Second pass**: Check type definitions
   - Supports self-recursive types (List<T>)
   - Supports mutually recursive types (Tree/Forest)
2. Handle CoreExternalTypeDecl:
   - Register external types as type aliases in environment
   - Structure: `{ name: string, typeExpr: CoreTypeExpr, exported: boolean }`
   - These represent JavaScript types imported into vibefun's type system
3. Type check CoreRecord:
   - Infer all field expression types
   - Create record type with field map
4. Type check CoreRecordAccess:
   - Infer record expression type
   - Verify it's a record type
   - Look up field type
5. Type check CoreRecordUpdate:
   - Infer base record type
   - Infer update field types
   - Verify fields exist
   - Create new record type
5b. **Implement width subtyping for records:**
   - When checking record type compatibility, allow extra fields
   - `{x: Int, y: Int, z: Int} <: {x: Int, y: Int}` is valid
   - Record with MORE fields can be used where fewer fields expected
   - Duck-typing-like flexibility (compile-time checked)
6. Type check CoreVariant:
   - Look up variant constructor in environment
   - Instantiate generic type parameters with fresh vars
   - Infer payload types
   - Unify with constructor parameter types
7. Handle generic type instantiation (List<Int> vs List<String>)
8. Handle generic nullary constructors (None, Nil):
   - Instantiate with fresh type variable
   - Unify with context or generalize

**Recursive Type Definitions**:
```vibefun
// Self-recursive:
type List<T> = Cons(T, List<T>) | Nil

// Mutually recursive:
type Tree<T> = Node(T, Forest<T>)
type Forest<T> = List<Tree<T>>
```

**Strategy**: Two-pass approach ensures all type constructors are available before checking definitions.

**Test Requirements:**
- Record construction infers correct field types
- Record field access works
- Record updates maintain structural typing
- **Width subtyping for records**:
  - Record with extra fields accepted where fewer expected
  - Function expecting `{x: Int}` accepts `{x: Int, y: Int}`
  - Duck-typing-like behavior (compile-time)
- **Nominal typing for variants**:
  - `type A = X | Y` and `type B = X | Y` are DIFFERENT types
  - Cannot mix different variant types even if same structure
- Variant construction with correct types
- Generic variants: Some(42) is Option<Int>, Nil is List<α>
- Cons(1, Cons(2, Nil)) infers List<Int>
- Nested records and variants
- Self-recursive type definitions (List)
- Mutually recursive type definitions (Tree/Forest)
- Generic nullary constructors get fresh type vars
- None unifies with context (e.g., in [Some(42), None])
- Empty list (Nil) gets fresh type variable
- **CoreExternalTypeDecl handling**:
  - External types registered as type aliases
  - Can be used in type annotations
  - Work with exported/non-exported external types
- **Target:** 35+ tests (added width subtyping & nominal tests)

**Quality Gate:**
- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run format` applied
- [ ] Test coverage ≥90%

---

### Phase 6: Pattern Matching & Exhaustiveness

**Estimated Effort:** 7-9 hours

**Files to Create:**
- `packages/core/src/typechecker/patterns.ts` - Pattern type checking and exhaustiveness
- `packages/core/src/typechecker/patterns.test.ts` - Pattern tests

**Files to Modify:**
- `packages/core/src/typechecker/infer.ts` - Add CoreMatch support

**Implementation Tasks:**
1. Implement pattern type checking:
   - CoreWildcardPattern: matches any type, binds nothing
   - CoreVarPattern: matches any type, binds variable
   - CoreLiteralPattern: must unify with literal type
   - CoreVariantPattern: look up constructor, check payload patterns
   - CoreRecordPattern: check all field patterns
2. Collect pattern variable bindings with types
3. Implement exhaustiveness checking:
   - Build matrix of patterns vs constructors
   - Check all variant constructors covered
   - Handle wildcard patterns as catch-all
4. Type check CoreMatch:
   - Infer scrutinee type
   - Check each arm's pattern against scrutinee type
   - Add pattern bindings to environment
   - **Type check guard if present (must be Bool)**
   - Verify exhaustiveness
   - Infer all arm body types
   - Unify all arm types (must return same type)

**Pattern Guards** (in Core AST):
- CoreMatchCase has optional `guard: CoreExpr`
- Guard must have type Bool
- Guard is evaluated after pattern matches
- Pattern bindings are in scope for guard

**Note on Or-Patterns**: Or-patterns are desugared to multiple match cases, so type checker doesn't need to handle them directly.

**Test Requirements:**
- Wildcard patterns work
- Variable patterns bind with correct type
- Literal patterns match correctly
- Variant patterns destructure with correct types
- Record patterns extract fields
- Nested patterns work
- Exhaustiveness: error on missing variant cases
- Exhaustiveness: wildcard catches remaining cases
- All match arms have same return type
- Pattern variable bindings available in arm body
- **Guards type check as Bool**
- **Guards have access to pattern bindings**
- **Guard failures fall through to next case**
- Dead code detection (unreachable patterns) - warn only
- **Target:** 35+ tests

**Quality Gate:**
- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run format` applied
- [ ] Test coverage ≥90%

---

### Phase 7: Advanced Features & Integration

**Estimated Effort:** 4-5 hours

**Files to Modify:**
- `packages/core/src/typechecker/infer.ts` - Union types, unsafe blocks
- `packages/core/src/typechecker/infer.test.ts` - Advanced feature tests

**Implementation Tasks:**
1. Type check union types:
   - Union type creation and representation
   - **Variant-based narrowing only**: Variant constructors (Some/None, Ok/Err) can be discriminated
   - **Primitive unions (Int | String) cannot be narrowed** without language syntax extensions
   - Document limitation: primitive unions have limited utility
2. Validate type annotations:
   - When CoreTypeAnnotation present, check inferred type matches
   - Provide clear error if mismatch
3. Integrate overload resolver:
   - Use existing resolver.resolveCall() in CoreApp inference
   - Handle ResolutionResult (Single vs Overload)
   - Type check with resolved function type
4. Type check CoreUnsafe blocks:
   - Trust external function types (no verification)
   - Check expressions inside still type check
   - Mark unsafe boundary in typed AST
5. Handle edge cases:
   - Empty list (Nil) needs context type or gets fresh var
   - Ambiguous recursion needs annotation
   - Type variables escaping scope
6. **Complete remaining stdlib functions** (29 functions):
   - List: foldRight, head, tail, reverse, concat, flatten (5 more)
   - Option: isSome, isNone, unwrap (3 more)
   - Result: mapErr, isErr, unwrap, unwrapOr (4 more)
   - String: toUpperCase, toLowerCase, trim, split, contains, startsWith, endsWith, fromFloat, toInt, toFloat (10 more)
   - Int: abs, max, min (3 more)
   - Float: toInt, round, floor, ceil, abs (4 more - note toInt already listed in core)

**Literal Types**:
- ❌ **NOT SUPPORTED** - Parser does not support literal type syntax
- Spec-implementation gap: `type Status = "pending" | "active"` cannot be parsed
- **Workaround**: Use variants instead: `type Status = Pending | Active | Complete`
- Document as known limitation and future enhancement
- Requires parser/AST changes (out of type checker scope)

**Union Type Narrowing**:
- ✅ Variant unions work: `match option { | Some(x) => ... | None => ... }`
- ❌ Primitive unions don't work: Cannot narrow `Int | String` without pattern type annotations
- Pattern type annotations (`| n: Int =>`) do not exist in language
- Document limitation and recommend using variants for discrimination

**Test Requirements:**
- Union types work correctly for variants (Option | Result)
- Type annotations validate inferred types
- Overloaded external functions resolve and type check
- Unsafe blocks allow FFI calls
- Empty list handling (fresh type variable)
- Ambiguous recursion error without annotation
- Ambiguous recursion ok with annotation
- Never type works with panic
- Remaining stdlib functions work correctly
- **Target:** 20+ tests (removed literal type tests)

**Quality Gate:**
- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run format` applied
- [ ] Test coverage ≥90%

---

### Phase 8: Error Reporting

**Estimated Effort:** 3-4 hours

**Files to Create:**
- `packages/core/src/typechecker/errors.ts` - Type error classes and formatting
- `packages/core/src/typechecker/errors.test.ts` - Error message tests

**Implementation Tasks:**
1. Create TypeCheckerError class:
   - Extends base error with location info
   - Message field for primary error
   - Optional hint/suggestion field
   - Format with source context
2. Implement type formatting:
   - typeToString(): format types readably
   - Handle nested types (Option<List<Int>>)
   - Format function types with arrows
   - Format record types with fields
   - Format union types with |
   - Format Ref<T> types
   - Format Never type
3. Generate helpful error messages:
   - Type mismatch: show expected vs actual
   - Undefined variable: show name and location
   - Non-exhaustive patterns: list missing cases
   - Occurs check: explain infinite type error
   - Overload resolution: show candidates and why they don't match
   - Value restriction: explain why ref can't be generalized
4. Add suggestions where possible:
   - "Did you mean X?"
   - "Consider adding a type annotation"
   - "This variable is not in scope"

**Error Strategy**: Initial implementation stops at first error. Multiple error collection can be added later as enhancement.

**Test Requirements:**
- Type formatting produces readable output
- Mismatch errors show expected and actual types
- Exhaustiveness errors list all missing cases
- Occurs check errors are clear
- Overload errors show candidates
- Value restriction errors are helpful
- Error locations are correct
- Suggestions are helpful
- **Target:** 20+ tests

**Quality Gate:**
- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run format` applied
- [ ] Test coverage ≥90%

---

### Phase 9: Integration & Main Entry Point

**Estimated Effort:** 6-7 hours

**Files to Create:**
- `packages/core/src/typechecker/typechecker.ts` - Main type checker entry point
- `packages/core/src/typechecker/typechecker.test.ts` - Integration tests

**Files to Modify:**
- `packages/core/src/typechecker/index.ts` - Export main typeCheck function

**Implementation Tasks:**
1. Create main typeCheck() function:
   - Input: CoreModule (desugared AST)
   - Build type environment with built-ins (including all 46 stdlib functions from Phase 2 + 7)
   - Process type definitions (two-pass)
   - Type check each top-level declaration
   - Attach inferred types to AST nodes
   - Output: TypedModule (CoreModule with type annotations)
2. Attach types to AST:
   - Add inferredType field to each CoreExpr node
   - Preserve all other AST information
3. Handle module-level declarations:
   - Type definitions (variants, records) - two-pass
   - External type declarations (CoreExternalTypeDecl)
   - Let bindings (with mutable and recursive support)
   - External declarations (with overloads)
4. Module system basics:
   - Trust imported types (load/verify in future)
   - Infer and attach types to exports
   - Disallow cyclic imports (error if detected)
   - Support re-exports (type check transitively)
5. End-to-end integration tests:
   - Parse → Desugar → Type Check pipeline
   - Complete small programs
   - All features combined
   - **All 46 stdlib functions work end-to-end**

**Module System Strategy** (initial):
- **Imports**: Trust declared types, verify in future phases
- **Exports**: Infer types and make available to importers
- **Cycles**: Disallow cyclic imports for now
- **Re-exports**: Type check transitively

**Test Requirements:**
- Simple programs type check correctly
- Polymorphic functions work end-to-end
- Pattern matching exhaustiveness enforced
- External functions with overloads work
- External type declarations work
- Records and variants work together
- Fibonacci, factorial, list operations
- Map/filter/fold compositions with all stdlib functions
- Real examples from spec
- Integration with desugarer output
- Mutable references work end-to-end
- Recursive functions work (recursive flag)
- Guards in pattern matching
- Full syntactic value restriction enforced
- All 46 stdlib functions accessible and working
- **Target:** 30+ integration tests

**Quality Gate:**
- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes (all 230+ tests)
- [ ] `npm run format` applied
- [ ] Test coverage ≥90%

---

### Phase 10: Documentation & Polish

**Estimated Effort:** 2-3 hours

**Files to Modify:**
- All public APIs - Add JSDoc comments
- `CLAUDE.md` - Update with type checker completion
- `.claude/active/type-checker/type-checker-context.md` - Document decisions made
- `.claude/active/type-checker/type-checker-tasks.md` - Mark all complete

**Files to Create:**
- Examples demonstrating type inference
- Usage documentation

**Implementation Tasks:**
1. Add JSDoc to all public functions:
   - Type checker main entry point
   - Inference functions
   - Pattern matching
   - Error types
   - Include @example blocks
2. Update CLAUDE.md:
   - Document type checker completion
   - Note any design decisions made
3. Update task tracking documents:
   - Mark all phases complete
   - Add "Last Updated" timestamp
   - Document actual time spent
4. Create usage examples:
   - How to use type checker as library
   - Example error messages
5. Final verification:
   - Run full test suite
   - Check coverage report
   - Verify all quality checks

**Quality Gate:**
- [ ] All public APIs documented with JSDoc
- [ ] CLAUDE.md updated
- [ ] All task documents marked complete
- [ ] Usage examples created
- [ ] `npm run verify` passes completely
- [ ] Test coverage ≥90%

---

## Testing Requirements Summary

**Total Test Count Target:** 275+ tests (updated from 230+)

**Phase Breakdown:**
- Phase 1 (Unification): 25+ tests (+5 for Never type)
- Phase 2 (Built-ins): 15+ tests (17 core stdlib functions)
- Phase 2.5 (References): 25+ tests (NEW - full syntactic value restriction)
- Phase 3 (Basic Inference): 35+ tests (+10 for constraint solving & levels)
- Phase 4 (Polymorphism): 30+ tests (+10 for level-based scoping)
- Phase 4b (Mutual Recursion): 20+ tests (NEW - `and` keyword support)
- Phase 5 (ADTs): 35+ tests (+10 for width subtyping & nominal typing)
- Phase 6 (Patterns): 35+ tests (+5 for guards)
- Phase 7 (Advanced): 20+ tests (removed literal types, added 29 stdlib functions)
- Phase 8 (Errors): 20+ tests (+5 for ref errors)
- Phase 9 (Integration): 30+ tests (+5 for end-to-end with full stdlib)
- Phase 10 (Documentation): 0 new tests (verification only)

**Test Categories:**
- Unit tests for each function/algorithm
- Edge cases and boundary conditions
- Error paths and error messages
- Integration tests combining features
- End-to-end compiler pipeline tests
- Mutable reference tests (NEW)
- Pattern guard tests (NEW)
- Recursive type tests (NEW)

**Every Phase Must:**
1. Pass `npm run check` (type checking)
2. Pass `npm run lint` (linting)
3. Pass `npm test` (all tests)
4. Pass `npm run format` (formatting)
5. Maintain ≥90% coverage

## Key Technical Decisions

### Algorithm Choice
- **Algorithm W** for Hindley-Milner type inference
- **Constraint-based approach (lazy)**: Generate constraints during traversal, solve afterward
- More flexible for future features (type classes, GADTs)
- Better error messages possible
- Proven, well-understood algorithm

### Type Representation
- Use Type ADT from types/environment.ts
- Add `Ref<T>` for mutable references (NEW)
- Add `Never` for bottom type (NEW)
- **Width subtyping for records**: Records with extra fields are subtypes
  - `{x: Int, y: Int, z: Int} <: {x: Int, y: Int}`
  - Duck-typing-like flexibility with compile-time safety
  - Functions can accept "at least these fields"
- **Nominal typing for variants**: Exact type name matching required
  - `type A = X | Y` ≠ `type B = X | Y` (different types)
  - Prevents accidental mixing of semantically different types

### Operator Type Checking
- **Arithmetic operators**: Type-directed specialization
  - Both operands must be same type (Int or Float)
  - Cannot mix Int and Float
  - Result is same type as operands
- **Equality operators**: Polymorphic (work on any type)
- **String concatenation**: Requires both String operands
- **Reference operators**: Special handling for Ref<T>

### Mutable References (NEW)
- `Ref<T>` type constructor for references
- **Full syntactic value restriction** prevents unsafe polymorphism
- Only syntactic values (variables, lambdas, literals, constructors) can be generalized
- Non-values (function applications, match expressions) cannot be generalized
- Aligns with OCaml/SML semantics
- Assignment (`:=`) and dereference (`!`) operators

### Type Variable Scoping (NEW)
- **Standard ML approach with levels**: Track level for each type variable
- Increment level when entering let-bindings
- Generalize only variables at current level or deeper
- **Prevents type variable escape**: Variables cannot escape their binding scope
- Sound and aligns with OCaml/SML semantics
- Example that fails: `let f = () => ref(None)` where type var would escape

### Mutually Recursive Functions (NEW)
- **Supported with `and` keyword**: OCaml/F# style explicit mutual recursion
- Syntax: `let rec f = ... and g = ...`
- Clear where mutual groups begin and end
- Type checker infers types for entire mutual group together
- Requires parser changes to support `and` keyword

### Unification Strategy
- Occurs check to prevent infinite types
- Substitution threading through inference
- Early error reporting on unification failure
- Never type unifies with everything

### Pattern Matching
- Exhaustiveness checking required (safety first)
- Matrix-based algorithm for coverage analysis
- Clear errors listing missing cases
- Guards must be Bool type (NEW)
- Or-patterns handled by desugarer (not in Core AST)

### Recursive Types (NEW)
- Two-pass approach for type definitions
- Supports self-recursive types (List)
- Supports mutually recursive types (Tree/Forest)

### Empty Collections (NEW)
- Empty lists (Nil) get fresh type variable
- Unified with context or generalized
- Standard Hindley-Milner behavior

### External Functions
- Integration with existing overload resolver
- Arity-based resolution at compile time
- Type checking after overload selection

### Error Messages
- Include source location with line/column
- Show expected vs actual types clearly
- Provide suggestions and hints
- Format types in readable way
- Stop at first error initially (can enhance later)

### Module System (Initial)
- Trust import declarations
- Infer and export types
- Disallow cyclic imports
- Support re-exports

## Success Criteria

The type checker implementation is complete when:

- ✅ All 11 phases implemented and tested (added Phase 4b)
- ✅ All quality gates passed
- ✅ ≥275 tests passing with ≥90% coverage
- ✅ Primitive types inferred correctly
- ✅ Let-polymorphism works (polymorphic identity, map, compose)
- ✅ **Full syntactic value restriction enforced** (NEW)
- ✅ Pattern matching exhaustiveness enforced
- ✅ Pattern guards type check correctly (NEW)
- ✅ Algebraic data types fully supported (records, variants, generics)
- ✅ Recursive type definitions work (NEW)
- ✅ **Recursive functions work with `recursive` flag** (NEW)
- ✅ **Mutable references fully supported** (NEW)
- ✅ **External type declarations registered correctly** (NEW)
- ✅ Overloaded externals resolve and type check
- ✅ Union types supported (variant-based narrowing)
- ✅ Never type works with panic (NEW)
- ✅ All 46 standard library functions work (NEW)
- ✅ Clear, helpful error messages with locations
- ✅ Integration with desugarer complete
- ✅ Documentation complete with JSDoc and examples
- ✅ `npm run verify` passes completely

## Known Limitations

These features are not supported in the initial type checker implementation:

### 1. **Literal Types** ❌
- **Issue**: Parser does not support literal type syntax like `type Status = "pending" | "active"`
- **Reason**: Spec-implementation gap; requires parser/AST changes outside type checker scope
- **Workaround**: Use variants instead: `type Status = Pending | Active | Complete`
- **Future**: Requires updating lexer, parser, AST, desugarer, AND type checker

### 2. **Primitive Union Narrowing** ❌
- **Issue**: Cannot discriminate primitive unions like `Int | String` in pattern matching
- **Reason**: Pattern type annotations (`| n: Int =>`) don't exist in language syntax
- **Supported**: Variant unions work fine (Option, Result, custom variants)
- **Workaround**: Use variant wrappers for discrimination
- **Future**: Requires language syntax extension for type-testing patterns

### 3. **Pattern Type Annotations** ❌
- **Issue**: Syntax like `match x { | n: Int => ... }` not supported
- **Reason**: Not in Surface AST or Core AST
- **Impact**: Limits union type narrowing capabilities
- **Future**: Requires parser and AST changes

### 4. **Promise as Built-in Type** ℹ️
- **Approach**: Promise is treated as external type (user declares when needed)
- **Reason**: Avoids premature async/await design decisions
- **Usage**: `external { type Promise<T> = {...}, fetch: ... }`
- **Future**: May become built-in if async/await is added

### 5. **Module Import Verification** ⚠️
- **Current**: Trust imported types without verification
- **Impact**: Cannot detect if imported type doesn't exist or mismatches
- **Future**: Load and verify imported modules for full soundness

## Dependencies

**Prerequisites (All Complete):**
- ✅ Lexer implemented and tested
- ✅ Parser implemented and tested
- ✅ Desugarer implemented and tested (15/15 phases)
- ✅ Environment building implemented
- ✅ Overload resolver implemented
- ✅ Core AST types defined
- ✅ Type system design documented

**No Blockers:** Ready to proceed with implementation.

## Notes

- Follow coding standards in `.claude/CODING_STANDARDS.md`
- Update progress in `type-checker-tasks.md` after each phase
- Commit after each phase completion
- Focus on quality over speed
- Each phase should be independently testable
- Don't move to next phase until current phase passes all quality gates

## Appendix: Design Clarifications

These decisions were made during plan review (2025-10-30):

### Final Design Decisions (2025-10-30)

**Decision 1: Constraint-Based Inference (FINAL)**
- **Chosen**: Constraint-based (lazy) approach
- **Rationale**: More flexible for future features (type classes, GADTs), better error messages possible
- **Implementation**: Generate constraints during traversal, solve afterward
- **Impact**: More modular, easier to extend

**Decision 2: Type Variable Scoping with Levels (FINAL)**
- **Chosen**: Standard ML approach with lexical levels
- **Rationale**: Sound, prevents type variable escape, aligns with OCaml/SML
- **Implementation**: Track level for each type variable, increment on let-bindings, generalize only at current level
- **Impact**: Prevents: `let f = () => ref(None)` where type var would escape

**Decision 3: Mutually Recursive Functions (FINAL)**
- **Chosen**: Supported with `and` keyword (OCaml/F# style)
- **Syntax**: `let rec f = ... and g = ...`
- **Rationale**: Explicit, clear where groups begin/end, well-understood precedent
- **Implementation**: Infer types for entire mutual group together
- **Impact**: Requires parser changes, adds Phase 4b (4-5 hours, 20+ tests)

**Decision 4: Record Subtyping (FINAL)**
- **Chosen**: Width subtyping (permissive)
- **Rule**: `{x: Int, y: Int, z: Int} <: {x: Int, y: Int}` (extra fields allowed)
- **Rationale**: Duck-typing-like flexibility with compile-time safety
- **Implementation**: Allow extra fields when checking record compatibility
- **Impact**: Functions accept "at least these fields"

**Decision 5: Variant Typing (FINAL)**
- **Chosen**: Nominal (exact name matching)
- **Rule**: `type A = X | Y` ≠ `type B = X | Y` (different types)
- **Rationale**: Prevents accidental mixing of semantically different types, most sound
- **Implementation**: Check type name equality, not structural equality
- **Impact**: Standard ML-family behavior

### What's in Core AST vs Desugared
- **Core AST**: Single constructs that need type checking
- **Desugared**: Multi-param lambdas, pipes, composition, if-then-else, blocks, lists, cons, or-patterns
- See Core AST documentation for complete list

### Value Restriction Strategy (DECISION)
- **Chosen**: Full syntactic value restriction (OCaml/SML style)
- **Not Chosen**: Simple Ref-based restriction
- **Rationale**: More principled, future-proof for effects, aligns with "similar to OCaml" philosophy
- **Impact**: +1 hour Phase 2.5 (5-7 hours instead of 4-6)
- Only syntactic values (variables, lambdas, literals, constructors) can be generalized
- Function applications and match expressions cannot be generalized

### Literal Types (DECISION)
- **Chosen**: NOT SUPPORTED - documented as known limitation
- **Reason**: Parser does not support literal type syntax
- **Spec Gap**: Spec shows `type Status = "pending" | "active"` but parser cannot handle it
- **Workaround**: Use variants instead
- **Future**: Requires parser, AST, and desugarer changes

### Union Type Narrowing (DECISION)
- **Chosen**: Variant-based narrowing only
- **Reason**: Pattern type annotations don't exist in language
- **Supported**: Option, Result, and custom variant discrimination works
- **Not Supported**: Primitive unions (Int | String) cannot be narrowed
- **Workaround**: Wrap primitives in variants for discrimination

### Standard Library Strategy (DECISION)
- **Chosen**: Phased approach - 17 core functions in Phase 2, remaining 29 in Phase 7
- **Rationale**: Keeps Phase 2 focused, allows faster progress to inference
- **Phase 2 Core**: List.map/filter/fold/length, Option.map/flatMap/getOrElse, Result.map/flatMap/isOk, String/Int/Float basics
- **Phase 7 Complete**: All remaining functions from spec

### Promise Type Handling (DECISION)
- **Chosen**: External type (user declares when needed)
- **Not Built-in**: Avoid premature async/await design
- **Usage**: Users declare Promise structure in external blocks
- **Future**: May become built-in if async/await added to language

### Recursive Flag Handling
- Core AST has `recursive: boolean` field in CoreLet/CoreLetDecl
- When `recursive === true`, bind name before type checking value
- Enables self-referential functions (factorial, fibonacci)

### External Type Declarations
- Core AST has `CoreExternalTypeDecl` with `name`, `typeExpr`, `exported` fields
- Register as type aliases in environment
- Represent JavaScript types imported into vibefun

### Mutable References
- Critical feature present in Core AST
- Added as Phase 2.5
- Full syntactic value restriction maintains soundness

### Operator Overloading
- Arithmetic: Type-directed (not overloaded)
- Both operands must be same type
- Cannot mix Int and Float

### Empty Collections
- Get fresh type variable
- Unified with context or generalized
- Standard ML behavior

### Pattern Guards
- Present in Core AST
- Must be Bool type
- Have access to pattern bindings

### Recursive Types
- Two-pass approach
- First pass adds constructors
- Second pass checks definitions

### Error Strategy
- Stop at first error initially
- Multiple error collection can be added later

### Module System
- Trust imports initially (known limitation)
- Infer exports
- Disallow cycles for now

### Never Type
- Added for panic function
- Unifies with any type (bottom type)
- Enables safe non-returning functions
