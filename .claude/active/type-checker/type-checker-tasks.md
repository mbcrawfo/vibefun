# Type Checker Implementation Tasks

**Created:** 2025-10-30
**Last Updated:** 2025-10-30
**Status:** Not Started

## Progress Overview

- **Phases Completed:** 0/10 (0%)
- **Current Phase:** Phase 1 (Type Representation & Unification)
- **Tests Written:** 28 (existing), Target: 200+

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
  - [ ] **Target:** 20+ tests total

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
  - [ ] Define List<T> variant type
    - [ ] Cons constructor: (T, List<T>) -> List<T>
    - [ ] Nil constructor: () -> List<T>
  - [ ] Define Option<T> variant type
    - [ ] Some constructor: (T) -> Option<T>
    - [ ] None constructor: () -> Option<T>
  - [ ] Define Result<T, E> variant type
    - [ ] Ok constructor: (T) -> Result<T, E>
    - [ ] Err constructor: (E) -> Result<T, E>
  - [ ] Define standard library function signatures
    - [ ] List.map, filter, fold, length, head, tail, etc.
    - [ ] Option.map, flatMap, getOrElse, isSome, isNone
    - [ ] Result.map, mapErr, flatMap, isOk, isErr
    - [ ] String functions (length, concat, etc.)
    - [ ] Int/Float functions (toString, abs, etc.)
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

## Phase 3: Core Type Inference (Algorithm W - Basics)

**Status:** 🔜 Not Started
**Estimated:** 6-8 hours
**Actual:** _TBD_

### Implementation Tasks

- [ ] Create `packages/core/src/typechecker/infer.ts`
  - [ ] Define InferenceContext class/type
    - [ ] Type environment (TypeEnv)
    - [ ] Fresh type variable counter
    - [ ] Current substitution
  - [ ] Implement fresh type variable generation
  - [ ] Build main inferExpr() function
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
  - [ ] Implement generalization function
    - [ ] Find free type variables in type
    - [ ] Find free type variables in environment
    - [ ] Quantify vars free in type but not in env
    - [ ] Return TypeScheme with quantified vars
  - [ ] Implement instantiation function
    - [ ] Take TypeScheme
    - [ ] Create fresh type vars for quantified vars
    - [ ] Substitute in type
    - [ ] Return instantiated Type
  - [ ] Implement let-binding inference
    - [ ] CoreLet → infer binding value type
    - [ ] Generalize value type to scheme
    - [ ] Add binding to environment
    - [ ] Infer body expression
    - [ ] Return body type
  - [ ] Handle recursive bindings
    - [ ] Add binding name to env before inferring value
    - [ ] Use type variable initially
    - [ ] Unify after inference
  - [ ] Consider mutually recursive functions (optional)

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
  - [ ] Test recursive functions
    - [ ] Factorial
    - [ ] Fibonacci
    - [ ] List length
  - [ ] Test recursive function needs annotation (edge case)
  - [ ] Test shadowing (inner let overrides outer)
  - [ ] Test mutually recursive functions (if supported)
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
**Estimated:** 5-6 hours
**Actual:** _TBD_

### Implementation Tasks

- [ ] Extend `packages/core/src/typechecker/infer.ts`
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
  - [ ] Test structural typing (same fields = same type)
  - [ ] Test variant construction (Some, None, Cons, Nil)
  - [ ] Test List construction: Cons(1, Cons(2, Nil))
  - [ ] Test Option construction: Some(42), None
  - [ ] Test Result construction: Ok(value), Err(error)
  - [ ] Test generic type instantiation
  - [ ] Test nested generics: Option<List<Int>>
  - [ ] Test variant with wrong payload type (error)
  - [ ] Test mixing different list types (error)
  - [ ] **Target:** 25+ tests

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

## Phase 7: Advanced Features

**Status:** 🔜 Not Started
**Estimated:** 4-5 hours
**Actual:** _TBD_

### Implementation Tasks

- [ ] Extend `packages/core/src/typechecker/infer.ts`
  - [ ] Implement union type support
    - [ ] Union type creation
    - [ ] Union type inference
    - [ ] Type narrowing (if needed)
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
  - [ ] Test union types (Int | String)
  - [ ] Test literal unions ("pending" | "active")
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
  - [ ] **Target:** 20+ tests

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
    - [ ] Add built-in types and functions
    - [ ] Type check each top-level declaration:
      - [ ] Type definitions (variants, records)
      - [ ] Let bindings
      - [ ] External declarations
    - [ ] Attach inferred types to AST nodes
    - [ ] Return TypedModule
  - [ ] Handle top-level declarations
    - [ ] Process type definitions first
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
  - [ ] Test complete programs:
    - [ ] Fibonacci function
    - [ ] Factorial function
    - [ ] List filter and map composition
    - [ ] Tree traversal (if defined)
  - [ ] Test integration with desugarer:
    - [ ] Parse → Desugar → Type Check pipeline
    - [ ] Verify desugared constructs type check correctly
  - [ ] Test error cases end-to-end
  - [ ] **Target:** 25+ integration tests

### Quality Checks

- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes (ALL tests: 200+)
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

**Total Phases:** 10
**Total Tasks:** ~150+
**Total Tests:** 200+
**Status:** Ready to begin Phase 1

---

## Notes

- Update this file after completing each phase
- Mark checkboxes as tasks are completed: `- [x]`
- Update status indicators: 🔜 Not Started → ⏳ In Progress → ✅ Done
- Record actual time spent vs estimates
- Note any deviations from plan or issues encountered
- Keep "Last Updated" timestamp current
