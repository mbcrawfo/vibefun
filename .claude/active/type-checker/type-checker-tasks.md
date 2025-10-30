# Type Checker Implementation Tasks

**Created:** 2025-10-30
**Last Updated:** 2025-10-30 (Synchronized with Final Plan)
**Status:** Not Started

## Progress Overview

- **Phases Completed:** 0/11 (0%) [Added Phase 4b]
- **Current Phase:** Phase 1 (Type Representation & Unification)
- **Tests Written:** 28 (existing), Target: 275+

---

## Phase 1: Type Representation & Unification

**Status:** 🔜 Not Started
**Estimated:** 4-6 hours
**Actual:** _TBD_

### Implementation Tasks

- [ ] Create `packages/core/src/typechecker/types.ts`
  - [ ] Implement type construction helper functions
  - [ ] Create type variable helpers (fresh, isFree, etc.)
  - [ ] Implement type equality checks
  - [ ] Add typeToString() for readable formatting
  - [ ] Add Never type support (bottom type, unifies with everything)
  - [ ] Add Ref<T> type constructor (for mutable references)
  - [ ] Export all type utilities

- [ ] Create `packages/core/src/typechecker/unify.ts`
  - [ ] Define Substitution type (Map<number, Type>)
  - [ ] Implement substitution application to types
  - [ ] Implement substitution composition
  - [ ] Build occurs check function
  - [ ] Implement unification algorithm:
    - [ ] Unify primitives (Const with Const)
    - [ ] Unify type variables (Var with any type)
    - [ ] Unify function types recursively
    - [ ] Unify generic applications (List<T> with List<U>)
    - [ ] Unify record types (structural)
    - [ ] Unify variant types
    - [ ] Unify union types
  - [ ] Export unify() function

### Testing Tasks

- [ ] Create `packages/core/src/typechecker/types.test.ts`
  - [ ] Test type construction functions
  - [ ] Test type variable operations
  - [ ] Test type equality
  - [ ] Test typeToString formatting
  - [ ] Test complex nested types

- [ ] Create `packages/core/src/typechecker/unify.test.ts`
  - [ ] Test primitive unification (Int ~ Int, Int !~ String)
  - [ ] Test type variable unification (α ~ T)
  - [ ] Test function type unification
  - [ ] Test generic type unification (List<Int> ~ List<Int>)
  - [ ] Test record type unification (structural)
  - [ ] Test variant type unification
  - [ ] Test union type unification
  - [ ] Test occurs check (α !~ List<α>)
  - [ ] Test substitution application
  - [ ] Test substitution composition
  - [ ] Test unification failure cases
  - [ ] Test Never type unification (always succeeds)
  - [ ] Test Ref<T> type unification
  - [ ] **Target:** 25+ tests total

### Quality Checks

- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes (all tests)
- [ ] `npm run format` applied
- [ ] Test coverage ≥90%

---

## Phase 2: Type Environment & Built-ins

**Status:** 🔜 Not Started
**Estimated:** 3-4 hours
**Actual:** _TBD_

### Implementation Tasks

- [ ] Create `packages/core/src/typechecker/builtins.ts`
  - [ ] Define primitive type constants
    - [ ] Int: Const("Int")
    - [ ] Float: Const("Float")
    - [ ] String: Const("String")
    - [ ] Bool: Const("Bool")
    - [ ] Unit: Const("Unit")
    - [ ] Never: Const("Never") - bottom type for panic
  - [ ] Define List<T> variant type
    - [ ] Cons constructor: (T, List<T>) -> List<T>
    - [ ] Nil constructor: () -> List<T>
  - [ ] Define Option<T> variant type
    - [ ] Some constructor: (T) -> Option<T>
    - [ ] None constructor: () -> Option<T>
  - [ ] Define Result<T, E> variant type
    - [ ] Ok constructor: (T) -> Result<T, E>
    - [ ] Err constructor: (E) -> Result<T, E>
  - [ ] Define **17 core stdlib function signatures** (Phase 2 subset):
    - [ ] **List (4)**: map, filter, fold, length
    - [ ] **Option (3)**: map, flatMap, getOrElse
    - [ ] **Result (3)**: map, flatMap, isOk
    - [ ] **String (3)**: length, concat, fromInt
    - [ ] **Int (2)**: toString, toFloat
    - [ ] **Float (2)**: toString, toInt
    - [ ] *(Remaining 29 stdlib functions deferred to Phase 7)*
  - [ ] Add panic function: panic: (String) -> Never
  - [ ] Add ref constructor: ref: forall a. (a) -> Ref<a>
  - [ ] Export getBuiltinEnv() function

- [ ] Modify `packages/core/src/typechecker/environment.ts`
  - [ ] Import built-ins module
  - [ ] Update buildEnvironment() to inject built-ins
  - [ ] Ensure existing tests still pass
  - [ ] Add new built-ins to returned TypeEnv

### Testing Tasks

- [ ] Create `packages/core/src/typechecker/builtins.test.ts`
  - [ ] Test primitive types exist
  - [ ] Test List<T> type and constructors
  - [ ] Test Option<T> type and constructors
  - [ ] Test Result<T, E> type and constructors
  - [ ] Test variant constructors have function types
  - [ ] Test standard library function signatures
  - [ ] Test built-in environment creation
  - [ ] Test generic type instantiation
  - [ ] **Target:** 15+ tests

- [ ] Update `packages/core/src/typechecker/environment.test.ts`
  - [ ] Verify existing tests still pass
  - [ ] Test built-ins present in environment
  - [ ] Test user declarations don't override built-ins

### Quality Checks

- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes (all existing + new tests)
- [ ] `npm run format` applied
- [ ] Test coverage ≥90%

---

## Phase 2.5: Mutable References & Value Restriction

**Status:** 🔜 Not Started
**Estimated:** 5-7 hours
**Actual:** _TBD_

### Implementation Tasks

- [ ] Extend `packages/core/src/typechecker/types.ts`
  - [ ] Add Ref<T> type constructor (if not done in Phase 1)
  - [ ] Implement isSyntacticValue() predicate:
    - [ ] Returns true for: CoreVar, CoreLambda, literals, CoreVariant
    - [ ] Returns false for: CoreApp, CoreMatch, CoreLet, etc.
  - [ ] Export isSyntacticValue function

- [ ] Extend `packages/core/src/typechecker/builtins.ts`
  - [ ] Add ref constructor (if not done in Phase 2)
  - [ ] Ensure type: ref: forall a. (a) -> Ref<a>

- [ ] Extend `packages/core/src/typechecker/infer.ts` (will be created in Phase 3)
  - [ ] Implement RefAssign operator type checking:
    - [ ] Left operand must be Ref<T>
    - [ ] Right operand must be T
    - [ ] Result type: Unit
  - [ ] Implement Deref operator type checking:
    - [ ] Operand must be Ref<T>
    - [ ] Result type: T
  - [ ] Update generalization to use isSyntacticValue():
    - [ ] Only generalize if isSyntacticValue(expr) returns true
    - [ ] Non-values cannot be generalized (prevents unsound polymorphism)

### Testing Tasks

- [ ] Extend `packages/core/src/typechecker/infer.test.ts` (will be created)
  - [ ] Test Ref<T> type construction
  - [ ] Test ref constructor: ref(42) has type Ref<Int>
  - [ ] Test reference assignment: r := 5
  - [ ] Test dereferencing: !r
  - [ ] Test assignment to non-ref fails
  - [ ] Test dereferencing non-ref fails
  - [ ] Test syntactic value restriction:
    - [ ] Variables can be generalized
    - [ ] Lambdas can be generalized
    - [ ] Literals can be generalized
    - [ ] Constructors can be generalized
    - [ ] Function applications cannot be generalized
    - [ ] Match expressions cannot be generalized
    - [ ] ref(None) requires type annotation
  - [ ] Test mutable let bindings with `mutable: true` flag
  - [ ] Test recursive flag handling
  - [ ] **Target:** 25+ tests

### Quality Checks

- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run format` applied
- [ ] Test coverage ≥90%

---

## Phase 3: Core Type Inference (Algorithm W - Basics)

**Status:** 🔜 Not Started
**Estimated:** 6-8 hours
**Actual:** _TBD_

### Implementation Tasks

- [ ] Create `packages/core/src/typechecker/constraints.ts`
  - [ ] Define Constraint data structure:
    - [ ] Equality constraint: `{ kind: "Equality"; t1: Type; t2: Type; loc: Location }`
    - [ ] Instance constraint: `{ kind: "Instance"; scheme: TypeScheme; type: Type; loc: Location }`
  - [ ] Implement constraint solver:
    - [ ] `solveConstraints(constraints: Constraint[]): Substitution`
    - [ ] Apply unification for equality constraints
    - [ ] Handle instantiation constraints
  - [ ] Export solver and constraint types

- [ ] Create `packages/core/src/typechecker/infer.ts`
  - [ ] Define InferenceContext class/type
    - [ ] Type environment (TypeEnv)
    - [ ] Fresh type variable counter
    - [ ] Current substitution
    - [ ] Current level (for type variable scoping)
  - [ ] Implement fresh type variable generation (with levels)
  - [ ] Build main inferExpr() function (constraint generation)
  - [ ] Implement literal inference
    - [ ] CoreIntLit → Int
    - [ ] CoreFloatLit → Float
    - [ ] CoreStringLit → String
    - [ ] CoreBoolLit → Bool
    - [ ] CoreUnitLit → Unit
  - [ ] Implement variable inference
    - [ ] CoreVar → lookup in environment
    - [ ] Instantiate type scheme (replace quantified vars with fresh vars)
    - [ ] Report error if undefined
  - [ ] Implement lambda inference
    - [ ] CoreLambda → create fresh type var for parameter
    - [ ] Add parameter to environment
    - [ ] Infer body type
    - [ ] Return function type: param -> body
  - [ ] Implement application inference
    - [ ] CoreApp → infer function expression
    - [ ] Infer argument expression
    - [ ] Create fresh type var for result
    - [ ] Unify function type with (arg -> result)
    - [ ] Apply substitution, return result type
  - [ ] Implement binary operator inference
    - [ ] CoreBinOp → check operator type
    - [ ] Arithmetic: +, -, *, / → (Int, Int) -> Int or (Float, Float) -> Float
    - [ ] Comparison: <, >, <=, >= → (Int, Int) -> Bool or (Float, Float) -> Bool
    - [ ] Equality: ==, != → (T, T) -> Bool (polymorphic)
    - [ ] Logical: &&, || → (Bool, Bool) -> Bool
  - [ ] Implement unary operator inference
    - [ ] CoreUnaryOp → check operator
    - [ ] Negation: - → Int -> Int or Float -> Float
    - [ ] Logical not: ! → Bool -> Bool
  - [ ] Implement type annotation checking
    - [ ] CoreTypeAnnotation → infer expression
    - [ ] Parse/convert annotation to Type
    - [ ] Unify inferred type with annotation
    - [ ] Return annotation type

### Testing Tasks

- [ ] Create `packages/core/src/typechecker/infer.test.ts`
  - [ ] Test literal type inference (all primitive types)
  - [ ] Test variable lookup
  - [ ] Test undefined variable error
  - [ ] Test lambda inference (identity function)
  - [ ] Test function application
  - [ ] Test curried functions
  - [ ] Test higher-order functions
  - [ ] Test partial application
  - [ ] Test arithmetic operators
  - [ ] Test comparison operators
  - [ ] Test equality operators (polymorphic)
  - [ ] Test logical operators
  - [ ] Test negation operator
  - [ ] Test logical not operator
  - [ ] Test type annotations (matching)
  - [ ] Test type annotations (mismatching - error)
  - [ ] Test function composition
  - [ ] Test nested applications
  - [ ] **Target:** 25+ tests

### Quality Checks

- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run format` applied
- [ ] Test coverage ≥90%

---

## Phase 4: Let-Bindings & Polymorphism

**Status:** 🔜 Not Started
**Estimated:** 4-5 hours
**Actual:** _TBD_

### Implementation Tasks

- [ ] Extend `packages/core/src/typechecker/infer.ts`
  - [ ] Implement **level-based generalization** function
    - [ ] Find free type variables in type
    - [ ] Find free type variables in environment
    - [ ] **Filter out variables with level > current level** (escape check)
    - [ ] Quantify vars free in type but not in env, at current level or deeper
    - [ ] **Apply syntactic value restriction**: use isSyntacticValue()
    - [ ] Only generalize if expression is a syntactic value
    - [ ] Return TypeScheme with quantified vars (or monomorphic if non-value)
  - [ ] Implement instantiation function
    - [ ] Take TypeScheme
    - [ ] Create fresh type vars for quantified vars (at current level)
    - [ ] Substitute in type
    - [ ] Return instantiated Type
  - [ ] Implement let-binding inference
    - [ ] CoreLet → check `recursive: boolean` flag
    - [ ] If recursive, add binding to env BEFORE inferring value
    - [ ] Infer binding value type
    - [ ] Generalize value type to scheme (with value restriction)
    - [ ] Add binding to environment (or update if recursive)
    - [ ] Infer body expression
    - [ ] Return body type
  - [ ] Handle `mutable: boolean` flag
    - [ ] Check flag in CoreLet/CoreLetDecl
    - [ ] Apply value restriction appropriately
  - [ ] Consider mutually recursive functions (deferred decision)

### Testing Tasks

- [ ] Extend `packages/core/src/typechecker/infer.test.ts`
  - [ ] Test simple let-binding
  - [ ] Test let-bound variable usage
  - [ ] Test polymorphic identity function
    - [ ] `let id = x => x` usable at Int, String, etc.
  - [ ] Test polymorphic compose function
  - [ ] Test polymorphic map function
  - [ ] Test multiple uses of polymorphic function
  - [ ] Test let-bound function returns different types
  - [ ] Test nested let-bindings
  - [ ] **Test type variable scoping with levels**:
    - [ ] Nested let-bindings with shadowing work correctly
    - [ ] Type variables don't escape their scope
    - [ ] `let f = () => ref(None)` fails (type var would escape)
    - [ ] Inner scopes can't leak variables to outer scopes
  - [ ] Test recursive functions with `recursive: true`:
    - [ ] Factorial
    - [ ] Fibonacci
    - [ ] List length
  - [ ] Test recursive flag enables self-reference
  - [ ] Test non-recursive function without flag
  - [ ] Test syntactic value restriction:
    - [ ] Function applications cannot be generalized
    - [ ] ref(None) requires type annotation
    - [ ] Lambdas can be generalized
  - [ ] Test shadowing (inner let overrides outer)
  - [ ] Test mutable flag handling
  - [ ] **Target:** 30+ tests (added scoping tests)

### Quality Checks

- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run format` applied
- [ ] Test coverage ≥90%

---

## Phase 4b: Mutually Recursive Functions

**Status:** 🔜 Not Started
**Estimated:** 4-5 hours
**Actual:** _TBD_

**Prerequisites:** Parser must support `and` keyword in `let rec ... and ...` syntax

### Implementation Tasks

- [ ] **Parser changes** (if not already updated)
  - [ ] Add `and` as keyword
  - [ ] Parse `let rec f = expr1 and g = expr2 and h = expr3`
  - [ ] Generate CoreLet with list of mutually recursive bindings
  - [ ] Update Core AST if needed to support mutual groups

- [ ] Extend `packages/core/src/typechecker/infer.ts`
  - [ ] Detect mutually recursive binding groups (bindings with `and`)
  - [ ] For each mutual group:
    - [ ] Bind all names with fresh type variables BEFORE inferring values
    - [ ] Increment level
    - [ ] Infer each value expression
    - [ ] Unify inferred types with placeholder types
    - [ ] Generalize all bindings together
    - [ ] Add all bindings to environment
  - [ ] Handle single recursion (existing `rec`) as before
  - [ ] Ensure proper level management for mutual groups

### Testing Tasks

- [ ] Extend `packages/core/src/typechecker/infer.test.ts`
  - [ ] Test simple mutual recursion: isEven/isOdd
  - [ ] Test three-way mutual recursion
  - [ ] Test mutually recursive functions with different types
  - [ ] Test mutually recursive functions with polymorphic types
  - [ ] Test mixing mutual recursion with regular recursion
  - [ ] Test error: Undefined function in mutual group
  - [ ] Test error: Type mismatch in mutual group
  - [ ] Test mutual recursion with level tracking
  - [ ] Test mutual group with type annotations
  - [ ] **Target:** 20+ tests

### Quality Checks

- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run format` applied
- [ ] Test coverage ≥90%

---

## Phase 5: Algebraic Data Types

**Status:** 🔜 Not Started
**Estimated:** 6-7 hours
**Actual:** _TBD_

### Implementation Tasks

- [ ] Extend `packages/core/src/typechecker/infer.ts` and `environment.ts`
  - [ ] Handle CoreExternalTypeDecl:
    - [ ] Register external types as type aliases in environment
    - [ ] Structure: { name, typeExpr, exported }
    - [ ] Convert CoreTypeExpr to Type
    - [ ] Add to type environment
  - [ ] Implement record construction inference
    - [ ] CoreRecord → infer all field types
    - [ ] Create record type with field map
    - [ ] Return record type
  - [ ] Implement record access inference
    - [ ] CoreRecordAccess → infer record expression
    - [ ] Check it's a record type
    - [ ] Look up field in record type
    - [ ] Return field type (error if field missing)
  - [ ] Implement record update inference
    - [ ] CoreRecordUpdate → infer base record
    - [ ] Infer all update field types
    - [ ] Check fields exist in base record
    - [ ] Create new record type with updated fields
    - [ ] Return new record type
  - [ ] **Implement width subtyping for records:**
    - [ ] When checking record type compatibility, allow extra fields
    - [ ] Record with MORE fields can be used where fewer expected
    - [ ] Function expecting `{x: Int}` accepts `{x: Int, y: Int}`
    - [ ] Update unification to support width subtyping
  - [ ] Implement variant construction inference
    - [ ] CoreVariant → look up constructor in environment
    - [ ] Instantiate generic type parameters (fresh vars)
    - [ ] Infer payload expression types
    - [ ] Unify payload types with constructor params
    - [ ] Return variant type with instantiated generics
  - [ ] Handle generic type instantiation
    - [ ] List<Int> vs List<String>
    - [ ] Option<Bool> vs Option<Float>
    - [ ] Nested generics: Option<List<Int>>

### Testing Tasks

- [ ] Extend `packages/core/src/typechecker/infer.test.ts`
  - [ ] Test record construction
  - [ ] Test empty record
  - [ ] Test nested records
  - [ ] Test record field access
  - [ ] Test field access on non-record (error)
  - [ ] Test missing field access (error)
  - [ ] Test record update
  - [ ] Test record update with wrong field (error)
  - [ ] **Test width subtyping for records**:
    - [ ] Record with extra fields accepted where fewer expected
    - [ ] Function expecting `{x: Int}` accepts `{x: Int, y: Int}`
    - [ ] Duck-typing-like behavior (compile-time)
    - [ ] Width subtyping with function parameters
  - [ ] **Test nominal typing for variants**:
    - [ ] `type A = X | Y` and `type B = X | Y` are DIFFERENT types
    - [ ] Cannot mix different variant types (error)
    - [ ] Same structure doesn't mean same type for variants
  - [ ] Test variant construction (Some, None, Cons, Nil)
  - [ ] Test List construction: Cons(1, Cons(2, Nil))
  - [ ] Test Option construction: Some(42), None
  - [ ] Test Result construction: Ok(value), Err(error)
  - [ ] Test generic type instantiation
  - [ ] Test nested generics: Option<List<Int>>
  - [ ] Test variant with wrong payload type (error)
  - [ ] Test mixing different list types (error)
  - [ ] **Target:** 35+ tests (added width subtyping & nominal tests)

### Quality Checks

- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run format` applied
- [ ] Test coverage ≥90%

---

## Phase 6: Pattern Matching

**Status:** 🔜 Not Started
**Estimated:** 6-8 hours
**Actual:** _TBD_

### Implementation Tasks

- [ ] Create `packages/core/src/typechecker/patterns.ts`
  - [ ] Define pattern type checking result
    - [ ] Inferred pattern type
    - [ ] Variable bindings: Map<string, Type>
  - [ ] Implement checkPattern() function
    - [ ] CoreWildcardPattern → matches any type, no bindings
    - [ ] CoreVarPattern → matches any type, binds variable
    - [ ] CoreLiteralPattern → unify with literal type
    - [ ] CoreVariantPattern → look up constructor, check payloads recursively
    - [ ] CoreRecordPattern → check all field patterns, collect bindings
  - [ ] Implement exhaustiveness checking
    - [ ] Build pattern matrix
    - [ ] Extract all constructors from scrutinee type
    - [ ] Check each constructor covered by at least one pattern
    - [ ] Wildcard/variable patterns cover all constructors
    - [ ] Return list of missing constructors (if any)
  - [ ] Export checkPattern() and checkExhaustiveness()

- [ ] Extend `packages/core/src/typechecker/infer.ts`
  - [ ] Implement match expression inference
    - [ ] CoreMatch → infer scrutinee type
    - [ ] For each arm:
      - [ ] Check pattern against scrutinee type
      - [ ] Add pattern bindings to environment
      - [ ] Infer arm body type
    - [ ] Check exhaustiveness (error if non-exhaustive)
    - [ ] Unify all arm body types
    - [ ] Return unified result type

### Testing Tasks

- [ ] Create `packages/core/src/typechecker/patterns.test.ts`
  - [ ] Test wildcard pattern
  - [ ] Test variable pattern
  - [ ] Test literal patterns (int, string, bool)
  - [ ] Test variant patterns (Some, None, Cons, Nil)
  - [ ] Test nested variant patterns
  - [ ] Test record patterns
  - [ ] Test nested record patterns
  - [ ] Test pattern bindings have correct types
  - [ ] Test exhaustiveness checking:
    - [ ] Exhaustive match (all cases)
    - [ ] Non-exhaustive match (error)
    - [ ] Wildcard makes exhaustive
    - [ ] List all missing cases in error

- [ ] Extend `packages/core/src/typechecker/infer.test.ts`
  - [ ] Test match on Option (exhaustive)
  - [ ] Test match on Option (non-exhaustive - error)
  - [ ] Test match on List with recursion
  - [ ] Test match on Result
  - [ ] Test match with literal patterns
  - [ ] Test match with wildcard catch-all
  - [ ] Test pattern variable bindings in arm bodies
  - [ ] Test all arms return same type
  - [ ] Test arms with different types (error)
  - [ ] Test nested patterns with deep structures
  - [ ] **Target:** 30+ tests total

### Quality Checks

- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run format` applied
- [ ] Test coverage ≥90%

---

## Phase 7: Advanced Features & Stdlib Completion

**Status:** 🔜 Not Started
**Estimated:** 4-5 hours
**Actual:** _TBD_

### Implementation Tasks

- [ ] Complete standard library (29 remaining functions)
  - [ ] **List (5 more)**: foldRight, head, tail, reverse, concat, flatten
  - [ ] **Option (3 more)**: isSome, isNone, unwrap
  - [ ] **Result (4 more)**: mapErr, isErr, unwrap, unwrapOr
  - [ ] **String (10 more)**: toUpperCase, toLowerCase, trim, split, contains, startsWith, endsWith, fromFloat, toInt, toFloat
  - [ ] **Int (3 more)**: abs, max, min
  - [ ] **Float (4 more)**: round, floor, ceil, abs (toInt already in core)

- [ ] Extend `packages/core/src/typechecker/infer.ts`
  - [ ] Implement union type support
    - [ ] Union type creation
    - [ ] Union type inference
    - [ ] **Variant-based narrowing only** (Some/None, Ok/Err)
    - [ ] Document that primitive unions (Int | String) cannot be narrowed
  - [ ] Validate type annotations
    - [ ] When CoreTypeAnnotation present
    - [ ] Convert annotation to Type
    - [ ] Unify with inferred type
    - [ ] Report clear error if mismatch
  - [ ] Integrate overload resolver
    - [ ] Import resolver module
    - [ ] In CoreApp inference, check if function is external
    - [ ] If overloaded, call resolver.resolveCall()
    - [ ] Use resolved function type for type checking
    - [ ] Report overload resolution errors
  - [ ] Handle CoreUnsafe blocks
    - [ ] Trust declared external types (no verification)
    - [ ] Still type check expressions inside
    - [ ] Mark unsafe boundary in output
  - [ ] Handle edge cases
    - [ ] Empty list type inference (context-dependent)
    - [ ] Ambiguous recursive functions (require annotation)
    - [ ] Type variables escaping scope (check)

### Testing Tasks

- [ ] Extend `packages/core/src/typechecker/infer.test.ts`
  - [ ] Test all 29 remaining stdlib functions work correctly
  - [ ] Test union types for variants (Option | Result)
  - [ ] Test type annotation validation (matching)
  - [ ] Test type annotation mismatch (error)
  - [ ] Test overloaded external resolution
    - [ ] Single argument selects correct overload
    - [ ] Multiple arguments select correct overload
    - [ ] No matching overload (error)
    - [ ] Ambiguous overload (error)
  - [ ] Test unsafe blocks with external calls
  - [ ] Test empty list handling
  - [ ] Test ambiguous recursion (error without annotation)
  - [ ] Test ambiguous recursion (ok with annotation)
  - [ ] Test Never type with panic function
  - [ ] **Target:** 20+ tests (removed literal type tests)

### Quality Checks

- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run format` applied
- [ ] Test coverage ≥90%

---

## Phase 8: Error Reporting

**Status:** 🔜 Not Started
**Estimated:** 3-4 hours
**Actual:** _TBD_

### Implementation Tasks

- [ ] Create `packages/core/src/typechecker/errors.ts`
  - [ ] Define TypeCheckerError class
    - [ ] Extends base Error
    - [ ] Location field (line, column, filename)
    - [ ] Message field (primary error)
    - [ ] Optional hint/suggestion field
    - [ ] Format method for display
  - [ ] Implement type formatting
    - [ ] typeToString() for readable output
    - [ ] Format primitives: Int, String, etc.
    - [ ] Format functions: (Int, String) -> Bool
    - [ ] Format records: { name: String, age: Int }
    - [ ] Format variants: Option<T>, List<Int>
    - [ ] Format unions: Int | String
    - [ ] Handle nested types: Option<List<Int>>
  - [ ] Create error factory functions
    - [ ] createTypeMismatchError(expected, actual, loc)
    - [ ] createUndefinedVariableError(name, loc, suggestions)
    - [ ] createNonExhaustiveError(missingCases, loc)
    - [ ] createOccursCheckError(typeVar, type, loc)
    - [ ] createOverloadError(funcName, arity, overloads, loc)
  - [ ] Add suggestion generation
    - [ ] Levenshtein distance for "did you mean?"
    - [ ] Common fixes ("add type annotation")
    - [ ] Show missing pattern cases
  - [ ] Export error classes and factories

- [ ] Update error throwing in other modules
  - [ ] Replace generic errors with TypeCheckerError
  - [ ] Use error factories for consistency
  - [ ] Include helpful hints

### Testing Tasks

- [ ] Create `packages/core/src/typechecker/errors.test.ts`
  - [ ] Test typeToString() formatting
    - [ ] Primitives formatted correctly
    - [ ] Functions formatted with arrows
    - [ ] Records formatted with fields
    - [ ] Nested types formatted correctly
  - [ ] Test error creation
    - [ ] Type mismatch error has expected/actual
    - [ ] Undefined variable error has location
    - [ ] Non-exhaustive error lists missing cases
    - [ ] Occurs check error is clear
  - [ ] Test suggestions
    - [ ] "Did you mean X?" for close variable names
    - [ ] Helpful hints for common mistakes
  - [ ] Test error formatting
    - [ ] Error displays with location
    - [ ] Error shows source context (if available)
    - [ ] Hints are included
  - [ ] **Target:** 15+ tests

- [ ] Update existing test error expectations
  - [ ] Check error messages are clear
  - [ ] Verify error types are correct

### Quality Checks

- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run format` applied
- [ ] Test coverage ≥90%

---

## Phase 9: Integration & Main Entry Point

**Status:** 🔜 Not Started
**Estimated:** 5-6 hours
**Actual:** _TBD_

### Implementation Tasks

- [ ] Create `packages/core/src/typechecker/typechecker.ts`
  - [ ] Define TypedModule type (CoreModule with type info)
  - [ ] Implement main typeCheck() function
    - [ ] Input: CoreModule (from desugarer)
    - [ ] Build type environment from declarations
    - [ ] Add all 46 built-in types and functions (from Phase 2 + 7)
    - [ ] Type check each top-level declaration:
      - [ ] Type definitions (variants, records)
      - [ ] External type declarations (CoreExternalTypeDecl)
      - [ ] Let bindings (with mutable and recursive support)
      - [ ] External declarations (with overload support)
    - [ ] Attach inferred types to AST nodes
    - [ ] Return TypedModule
  - [ ] Handle top-level declarations
    - [ ] Process type definitions first (two-pass for recursion)
    - [ ] Process external type declarations
    - [ ] Then process let bindings and externals
    - [ ] Build full environment
  - [ ] Attach types to AST nodes
    - [ ] Add inferredType field to CoreExpr nodes
    - [ ] Preserve all other AST information
    - [ ] Include type schemes for let-bound values

- [ ] Update `packages/core/src/typechecker/index.ts`
  - [ ] Export main typeCheck function
  - [ ] Export TypedModule type
  - [ ] Export error types
  - [ ] Export other public APIs

### Testing Tasks

- [ ] Create `packages/core/src/typechecker/typechecker.test.ts`
  - [ ] Test end-to-end type checking
  - [ ] Test simple programs:
    - [ ] Identity function
    - [ ] Arithmetic expressions
    - [ ] Let bindings
  - [ ] Test polymorphic functions:
    - [ ] Polymorphic identity
    - [ ] List map function
    - [ ] Compose function
  - [ ] Test algebraic data types:
    - [ ] List operations (length, sum, map)
    - [ ] Option handling (getOrElse, map)
    - [ ] Result handling (map, flatMap)
  - [ ] Test pattern matching:
    - [ ] Match on Option
    - [ ] Recursive list processing
    - [ ] Nested patterns
  - [ ] Test external functions:
    - [ ] Single externals
    - [ ] Overloaded externals
  - [ ] Test external type declarations work end-to-end
  - [ ] Test complete programs:
    - [ ] Fibonacci function (recursive flag)
    - [ ] Factorial function (recursive flag)
    - [ ] List filter and map composition
    - [ ] Tree traversal (if defined)
  - [ ] Test mutable references end-to-end
  - [ ] Test syntactic value restriction enforced
  - [ ] Test all 46 stdlib functions accessible and working
  - [ ] Test pattern guards work correctly
  - [ ] Test integration with desugarer:
    - [ ] Parse → Desugar → Type Check pipeline
    - [ ] Verify desugared constructs type check correctly
  - [ ] Test error cases end-to-end
  - [ ] **Target:** 30+ integration tests

### Quality Checks

- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes (ALL tests: 230+)
- [ ] `npm run format` applied
- [ ] Test coverage ≥90%

---

## Phase 10: Documentation & Polish

**Status:** 🔜 Not Started
**Estimated:** 2-3 hours
**Actual:** _TBD_

### Documentation Tasks

- [ ] Add JSDoc to all public APIs
  - [ ] `typechecker.ts` - Main typeCheck function
  - [ ] `infer.ts` - inferExpr and helpers (if exported)
  - [ ] `patterns.ts` - checkPattern, checkExhaustiveness
  - [ ] `errors.ts` - Error classes and factories
  - [ ] `builtins.ts` - getBuiltinEnv (if exported)
  - [ ] `types.ts` - Type utilities
  - [ ] `unify.ts` - unify function
  - [ ] Include @param, @returns, @throws, @example

- [ ] Create usage examples
  - [ ] Example: Type checking a simple program
  - [ ] Example: Handling type errors
  - [ ] Example: Using type checker as library
  - [ ] Example: Error message formatting

- [ ] Update project documentation
  - [ ] Update `CLAUDE.md`:
    - [ ] Note type checker completion
    - [ ] Document key design decisions made
    - [ ] Update project status
  - [ ] Update `.claude/active/type-checker/type-checker-context.md`:
    - [ ] Fill in "Decisions Made" section
    - [ ] Document any deviations from plan
  - [ ] Update this file:
    - [ ] Mark all tasks complete
    - [ ] Add final timestamp
    - [ ] Note total time spent

### Polish Tasks

- [ ] Review all error messages
  - [ ] Ensure consistency in formatting
  - [ ] Verify suggestions are helpful
  - [ ] Check location info is correct

- [ ] Code review and cleanup
  - [ ] Remove any debug code
  - [ ] Ensure consistent naming
  - [ ] Check for code duplication
  - [ ] Verify adherence to coding standards

- [ ] Final verification
  - [ ] Run full test suite: `npm test`
  - [ ] Check type coverage: `npm run check`
  - [ ] Run linting: `npm run lint`
  - [ ] Format all code: `npm run format`
  - [ ] Generate coverage report: `npm run test:coverage`
  - [ ] Verify ≥90% coverage

### Quality Checks

- [ ] All public APIs have JSDoc with examples
- [ ] CLAUDE.md updated with completion notes
- [ ] Task documents marked complete
- [ ] `npm run verify` passes completely
- [ ] Test coverage ≥90%
- [ ] No lint warnings
- [ ] All files formatted

---

## Final Summary

**Total Phases:** 11 (added Phase 4b for mutually recursive functions)
**Total Tasks:** ~185+
**Total Tests:** 275+
**Key Features:**
- Full Hindley-Milner type inference with **constraint-based Algorithm W**
- **Type variable scoping with levels** (Standard ML approach)
- **Mutually recursive functions** with `and` keyword (OCaml/F# style)
- **Width subtyping for records** (duck-typing-like flexibility)
- **Nominal typing for variants** (exact name matching)
- Mutable references with full syntactic value restriction
- Pattern matching with exhaustiveness checking and guards
- Recursive functions with explicit flag support
- External type declarations (CoreExternalTypeDecl)
- 46 standard library functions (17 core + 29 additional)
- Overloaded external function resolution
- Never type for non-returning functions (panic)
- Comprehensive error messages with suggestions

**Status:** Ready to begin Phase 1

**Known Limitations:**
- Literal types NOT supported (requires parser changes)
- Primitive union narrowing NOT supported (no pattern type annotations)
- Module import verification deferred (trusts imports)
- Promise is external type (not built-in)

---

## Notes

- Update this file after completing each phase
- Mark checkboxes as tasks are completed: `- [x]`
- Update status indicators: 🔜 Not Started → ⏳ In Progress → ✅ Done
- Record actual time spent vs estimates
- Note any deviations from plan or issues encountered
- Keep "Last Updated" timestamp current
- All decisions documented in type-checker-plan.md Appendix
