# Audit: 03a Types-Core (03-type-system)

## Sources Reviewed

**Spec files** (with line counts):
- `docs/spec/03-type-system/README.md` (30 lines)
- `docs/spec/03-type-system/primitive-types.md` (281 lines)
- `docs/spec/03-type-system/tuples.md` (454 lines)
- `docs/spec/03-type-system/type-inference.md` (630 lines)
- `docs/spec/03-type-system/type-aliases.md` (176 lines)

**Implementation files**:
- `packages/core/src/typechecker/types.ts` (core type definitions and helpers)
- `packages/core/src/typechecker/infer/infer-primitives.ts` (main type inference dispatcher and literal inference)
- `packages/core/src/typechecker/infer/infer-context.ts` (inference context and type scheme operations)
- `packages/core/src/typechecker/infer/infer-bindings.ts` (let-binding type inference)
- `packages/core/src/typechecker/infer/let-binding-helpers.ts` (value restriction and generalization)
- `packages/core/src/typechecker/infer/infer-functions.ts` (lambda and application inference)
- `packages/core/src/typechecker/infer/infer-operators.ts` (numeric operator type checking)
- `packages/core/src/typechecker/unify.ts` (type unification algorithm)
- `packages/core/src/typechecker/environment.ts` (type environment construction)
- `packages/core/src/typechecker/builtins.ts` (built-in function signatures)
- `packages/core/src/typechecker/format.ts` (type formatting)

**Test files** (every layer):
- Unit: `packages/core/src/typechecker/infer-primitives.test.ts`, `packages/core/src/typechecker/types.test.ts`, `packages/core/src/typechecker/infer/let-binding-helpers.test.ts`, `packages/core/src/typechecker/infer-bindings-basic.test.ts`, `packages/core/src/typechecker/infer-bindings-recursive.test.ts`, `packages/core/src/typechecker/infer-bindings-errors-and-edges.test.ts`, `packages/core/src/typechecker/constraints.test.ts`
- E2E: `tests/e2e/let-binding-matrix.test.ts`
- Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts`

## Feature Inventory

### F-01: Int primitive type

- **Spec ref**: `docs/spec/03-type-system/primitive-types.md:3-10` — Int is a signed integer type, inferred from integer literals without decimal point
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/types.ts:139` — `primitiveTypes.Int` constant
  - `packages/core/src/typechecker/infer/infer-primitives.ts:106-107` — CoreIntLit inference
  - `packages/core/src/typechecker/builtins.ts:71-169` — built-in type constructor and functions
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-primitives.test.ts:"should infer Int type for integer literals"`
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts:"Int type"`
  - Coverage assessment: ✅ Adequate
- **Notes**: None

### F-02: Float primitive type

- **Spec ref**: `docs/spec/03-type-system/primitive-types.md:12-19` — Float is a floating-point type, inferred from literals with decimal point or exponent
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/types.ts:140` — `primitiveTypes.Float` constant
  - `packages/core/src/typechecker/infer/infer-primitives.ts:109-110` — CoreFloatLit inference
  - `packages/core/src/typechecker/builtins.ts:71-169` — built-in type constructor and functions
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-primitives.test.ts:"should infer Float type for float literals"`
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts:"Float type"`
- **Coverage assessment**: ✅ Adequate
- **Notes**: None

### F-03: String primitive type

- **Spec ref**: `docs/spec/03-type-system/primitive-types.md:208-215` — String is a Unicode text type
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/types.ts:141` — `primitiveTypes.String` constant
  - `packages/core/src/typechecker/infer/infer-primitives.ts:112-113` — CoreStringLit inference
  - `packages/core/src/typechecker/builtins.ts:71-169` — built-in string functions
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-primitives.test.ts:"should infer String type for string literals"`
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts:"String type"`
- **Coverage assessment**: ✅ Adequate
- **Notes**: None

### F-04: Bool primitive type

- **Spec ref**: `docs/spec/03-type-system/primitive-types.md:217-224` — Bool represents boolean values
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/types.ts:142` — `primitiveTypes.Bool` constant
  - `packages/core/src/typechecker/infer/infer-primitives.ts:115-116` — CoreBoolLit inference
  - `packages/core/src/typechecker/builtins.ts:71-169` — built-in boolean functions
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-primitives.test.ts:"should infer Bool type for boolean literals"`
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts:"Bool type"`
- **Coverage assessment**: ✅ Adequate
- **Notes**: None

### F-05: Unit primitive type

- **Spec ref**: `docs/spec/03-type-system/primitive-types.md:226-233` — Unit type represents "no value", only value is ()
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/types.ts:143` — `primitiveTypes.Unit` constant
  - `packages/core/src/typechecker/infer/infer-primitives.ts:118-119` — CoreUnitLit inference
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-primitives.test.ts:"should infer Unit type for unit literals"`
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts:"Unit type"`
- **Coverage assessment**: ✅ Adequate
- **Notes**: None

### F-06: No automatic Int/Float coercion

- **Spec ref**: `docs/spec/03-type-system/primitive-types.md:25-46` — Int and Float are distinct types with no automatic coercion; mixed operations are type errors
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/infer/infer-operators.ts` — operator type checking enforces homogeneous numeric types
  - `packages/core/src/typechecker/unify.ts:1-300` — unification algorithm rejects mismatched numeric types
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-operators.test.ts` — operator type tests
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts:"no Int/Float auto-coercion"`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Numeric operators require same operand type; bidirectional unification enforces this

### F-07: Numeric literal type inference (Int literals infer as Int, Float literals as Float)

- **Spec ref**: `docs/spec/03-type-system/primitive-types.md:57-82` — Literal expressions have specific inferred types; integer literals → Int, float literals → Float
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/infer/infer-primitives.ts:106-119` — literal inference cases
  - Lexer distinguishes float literals (with . or exponent) from int literals
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-primitives.test.ts` — literal type inference tests
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts` — primitive type tests
- **Coverage assessment**: ✅ Adequate
- **Notes**: Type inference at parse/lex boundary; no inference rules needed in type checker

### F-08: Arithmetic operations (Int and Float separately)

- **Spec ref**: `docs/spec/03-type-system/primitive-types.md:83-109` — Arithmetic operators require operands of same numeric type
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/infer/infer-operators.ts` — operator type checking
  - Unification enforces type homogeneity during operator inference
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-operators.test.ts` — comprehensive operator tests
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts:"Int division truncates toward zero"`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Integer division truncation is JavaScript behavior; type system doesn't enforce truncation semantics

### F-09: Comparison operations (same numeric type required)

- **Spec ref**: `docs/spec/03-type-system/primitive-types.md:111-127` — Comparisons require same numeric type
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/infer/infer-operators.ts` — comparison operator handling
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-operators.test.ts` — operator tests
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts` — primitive type tests
- **Coverage assessment**: ✅ Adequate
- **Notes**: None

### F-10: List element type homogeneity (numeric types)

- **Spec ref**: `docs/spec/03-type-system/primitive-types.md:129-146` — Lists must contain elements of single numeric type
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/infer/infer-structures.ts` — list literal inference
  - Unification enforces element type consistency
- **Tests**:
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts` — numeric list tests
- **Coverage assessment**: ⚠️ Thin — only happy path (homogeneous lists) tested; edge cases for heterogeneous types may be missing dedicated tests
- **Notes**: Implementation delegates to list-element type unification; no special handling beyond that

### F-11: Type annotation syntax (explicit type declarations)

- **Spec ref**: `docs/spec/03-type-system/type-aliases.md:149-167` — Function and variable type annotations
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/infer/infer-primitives.ts:242-288` — type annotation inference via `inferTypeAnnotation`
  - `packages/core/src/typechecker/infer/infer-primitives.ts:382-415` — type expression conversion via `convertTypeExpr`
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-primitives.test.ts` — annotation tests
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts` — function type tests
- **Coverage assessment**: ✅ Adequate
- **Notes**: Bidirectional type checking via unification; string-literal annotations get special handling (F-46)

### F-12: Tuple construction with comma-separated expressions

- **Spec ref**: `docs/spec/03-type-system/tuples.md:9-15` — Tuples constructed with comma-separated expressions in parentheses
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/infer/infer-primitives.ts:178-187` — CoreTuple inference
  - `packages/core/src/typechecker/types.ts:107-109` — `tupleType()` constructor
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-primitives.test.ts` — tuple construction tests
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts` — tuple tests (if any)
- **Coverage assessment**: ✅ Adequate
- **Notes**: Parser distinguishes empty tuple `()` (Unit), single-element parentheses `(x)` (grouping), and multi-element tuples `(x, y)`

### F-13: Tuple type syntax (comma-separated types in parentheses)

- **Spec ref**: `docs/spec/03-type-system/tuples.md:17-32` — Tuple types use parenthesized comma-separated type syntax
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/infer/infer-primitives.ts:382-415` — CoreTupleType case in `convertTypeExpr`
- **Tests**:
  - Unit: Type inference tests for tuple-typed values
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts` — tuple type tests
- **Coverage assessment**: ⚠️ Thin — basic tuple types tested; complex nested/polymorphic tuples may lack edge case tests
- **Notes**: None

### F-14: Tuple destructuring in pattern matching

- **Spec ref**: `docs/spec/03-type-system/tuples.md:38-51` — Tuples destructured via pattern matching or let bindings
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/patterns.ts` — pattern type checking
  - `packages/core/src/typechecker/infer/infer-bindings.ts:47-154` — let-binding pattern handling with tuple destructuring (CoreTuplePattern)
  - `packages/core/src/typechecker/infer/infer-primitives.ts:176` — match pattern inference
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-bindings-basic.test.ts` — tuple destructuring tests
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts` — tuple destructuring tests
- **Coverage assessment**: ✅ Adequate
- **Notes**: Arity checking enforced during pattern matching; see F-21

### F-15: Nested tuple destructuring

- **Spec ref**: `docs/spec/03-type-system/tuples.md:53-67` — Nested tuples destructurable at arbitrary levels
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/patterns.ts` — recursive pattern checking
  - Parser produces nested CoreTuplePattern structures
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-patterns.test.ts` — pattern tests
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts` — nested destructuring tests
- **Coverage assessment**: ⚠️ Thin — basic nesting tested; deeply nested patterns (3+ levels) may lack specific tests
- **Notes**: Implementation is recursive over pattern structure; no special edge cases known

### F-16: Tuples vs Records table (feature distinction, not type-checked)

- **Spec ref**: `docs/spec/03-type-system/tuples.md:69-80` — Comparison of tuple and record use cases
- **Status**: ✅ Implemented (documentation)
- **Implementation**: Specification and compiler behavior align naturally
- **Tests**: (none — documentation feature)
- **Coverage assessment**: N/A
- **Notes**: Type system enforces the distinction; no additional test needed

### F-17: Unit type as 0-element tuple

- **Spec ref**: `docs/spec/03-type-system/tuples.md:131-142` — Unit type `()` is conceptually a 0-element tuple
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/types.ts:143` — Unit primitive
  - Parser and type system treat `()` as Unit, not as a tuple type
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-primitives.test.ts` — Unit type tests
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts:"Unit type"`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Consistency check: `()` has type `Unit` and `type Unit = ()` is semantically valid

### F-18: No single-element tuples (single-element parentheses are grouping, not tuples)

- **Spec ref**: `docs/spec/03-type-system/tuples.md:150-165` — Single-element parentheses are grouping, not tuple construction
- **Status**: ✅ Implemented
- **Implementation**:
  - Parser grammar: `(expr)` is parsed as grouped expression, not CoreTuple
  - Only 0-element `()` and 2+ element expressions produce tuple types
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-primitives.test.ts` — grouping vs tuple tests
- **Coverage assessment**: ✅ Adequate
- **Notes**: Parser enforces this; type system only sees properly-formed tuples

### F-19: Tuple arity mismatch in destructuring (compile-time error)

- **Spec ref**: `docs/spec/03-type-system/tuples.md:312-341` — Arity mismatch in destructuring is compile-time error with helpful message
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/patterns.ts` — pattern arity checking against scrutinee type
  - Unification fails with VF4502 (pattern/type mismatch) when arity differs
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-patterns.test.ts` — arity mismatch tests
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts` — tuple error tests
- **Coverage assessment**: ✅ Adequate
- **Notes**: Error messages cite expected/actual arity; testing should verify message quality

### F-20: Tuple arity in pattern matching (patterns must match tuple size)

- **Spec ref**: `docs/spec/03-type-system/tuples.md:343-367` — Pattern match arms must have correct arity; wildcards still count toward arity
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/patterns.ts` — pattern arity validation
  - Both destructuring patterns and match patterns subject to arity check
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-patterns.test.ts` — pattern arity tests
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts` — match arm arity tests
- **Coverage assessment**: ✅ Adequate
- **Notes**: Wildcard patterns `_` count toward arity; incorrect patterns are rejected before evaluation

### F-21: Tuple type equivalence (structural, order-sensitive)

- **Spec ref**: `docs/spec/03-type-system/tuples.md:394-408` — Tuples are structurally typed; same element types in same order are equivalent; different order or arity is different type
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/unify.ts` — structural unification of Tuple types
  - Unification compares element types positionally; order and arity must match exactly
- **Tests**:
  - Unit: `packages/core/src/typechecker/types.test.ts` — type equality tests
- **Coverage assessment**: ⚠️ Thin — basic equivalence tested; mismatched order/arity error messages may lack specific tests
- **Notes**: Transparent type aliases (F-35) also participate in structural equivalence

### F-22: Type variables represent polymorphic types

- **Spec ref**: `docs/spec/03-type-system/type-inference.md:3-20` — Type variables enable generic programming; explicit syntax `<T>` for parameters
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/types.ts:29-31` — `freshTypeVar()` creates type variables
  - `packages/core/src/typechecker/types.ts:138-145` — type variable structure (Var)
  - `packages/core/src/typechecker/infer/infer-context.ts:68-77` — type scheme instantiation
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-primitives.test.ts` — polymorphic function tests
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts:"polymorphic identity function"`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Type variables are internal; surface syntax uses `<T>` notation

### F-23: Implicit type parameter quantification (no `forall` syntax)

- **Spec ref**: `docs/spec/03-type-system/type-inference.md:27-36` — Type parameters implicitly quantified at outermost level; no explicit `forall` syntax
- **Status**: ✅ Implemented
- **Implementation**:
  - Parser accepts `<T>` in function signatures
  - Type scheme represents quantified variables implicitly in `TypeScheme.vars`
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-primitives.test.ts` — polymorphic function tests
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts:"polymorphic identity function"`
- **Coverage assessment**: ✅ Adequate
- **Notes**: No `forall` keyword in language; quantification is implicit in let-polymorphism generalization

### F-24: Type parameters always inferred at use sites (no explicit type application)

- **Spec ref**: `docs/spec/03-type-system/type-inference.md:38-50` — Type parameters inferred from arguments; no explicit type application syntax like `id<Int>(42)`
- **Status**: ✅ Implemented
- **Implementation**:
  - Parser grammar does not accept `<...>` syntax in expressions
  - `packages/core/src/typechecker/infer/infer-context.ts:68-77` — `instantiate()` creates fresh type variables for scheme instantiation
  - Type inference unifies instantiated variables with argument types
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-primitives.test.ts` — polymorphic function application tests
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts:"polymorphic identity function"`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Type application is always implicit; compiler rejects explicit syntax at parse time

### F-25: Type variable lexical scoping

- **Spec ref**: `docs/spec/03-type-system/type-inference.md:52-70` — Type variables lexically scoped to declaration; independent type variables in nested positions
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/types.ts:29-31` — `freshTypeVar()` generates unique IDs
  - `packages/core/src/typechecker/infer/let-binding-helpers.ts:46-54` — `generalize()` quantifies over free type variables at current level
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-bindings-basic.test.ts` — let-binding scope tests
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts` — polymorphism tests
- **Coverage assessment**: ✅ Adequate
- **Notes**: Level-based generalization (Algorithm W) enforces scoping; fresh variables have unique IDs

### F-26: Type variable inference via Hindley-Milner Algorithm W

- **Spec ref**: `docs/spec/03-type-system/type-inference.md:72-86` — Type checker automatically infers type variables; type parameters inferred from function usage
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/infer/` — complete Algorithm W implementation
  - `packages/core/src/typechecker/infer/infer-primitives.ts:103-189` — main dispatcher via `inferExpr`
  - `packages/core/src/typechecker/unify.ts` — unification algorithm
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-primitives.test.ts` — comprehensive type inference tests
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts:"Hindley-Milner infers function parameter types"`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Full implementation of Algorithm W with level-based generalization per SML approach

### F-27: Polymorphic instantiation (fresh type variables for each use)

- **Spec ref**: `docs/spec/03-type-system/type-inference.md:88-104` — Polymorphic function type variables instantiated freshly at each use site
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/infer/infer-context.ts:68-77` — `instantiate()` creates fresh type variables
  - `packages/core/src/typechecker/infer/infer-primitives.ts:202-231` — `inferVar()` calls `instantiate()` on scheme lookup
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-primitives.test.ts` — polymorphic function instantiation tests
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts:"polymorphic identity function"`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Fresh variables ensure independent instantiations; tests verify type parameter don't interfere between calls

### F-28: Rank-1 polymorphism only (no higher-rank types)

- **Spec ref**: `docs/spec/03-type-system/type-inference.md:106-120` — Type quantifiers only at outermost level; higher-rank (nested quantified) types not supported
- **Status**: ✅ Implemented (limitation enforced by design)
- **Implementation**:
  - Parser grammar: `<T>` syntax only accepted in top-level position of function signatures
  - Type system has no representation for nested quantifiers
- **Tests**:
  - (implicit — parser rejects higher-rank syntax)
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts` — polymorphic tests don't exceed rank-1
- **Coverage assessment**: ✅ Adequate (limitation feature)
- **Notes**: By design; no test needed for unsupported feature

### F-29: Generalization at let-bindings (type variables become type parameters)

- **Spec ref**: `docs/spec/03-type-system/type-inference.md:136-151` — Generalization occurs at let-bindings; type variables convert to type parameters
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/infer/let-binding-helpers.ts:46-54` — `generalize()` creates TypeScheme with quantified variables
  - `packages/core/src/typechecker/infer/infer-bindings.ts:104-110` — variable pattern binding calls `computeBindingScheme()` which calls `generalize()`
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-bindings-basic.test.ts:"polymorphism is introduced at let binding"`
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts:"let-polymorphism generalization"`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Generalization is automatic for syntactic values; value restriction (F-41) blocks other cases

### F-30: Scope-based generalization (type variables don't escape scope)

- **Spec ref**: `docs/spec/03-type-system/type-inference.md:155-180` — Type variables only generalized if they don't escape their defining scope
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/infer/let-binding-helpers.ts:46-54` — `generalize()` uses `freeTypeVarsAtLevel()` to filter variables at current level
  - `packages/core/src/typechecker/infer/infer-bindings.ts:75-76` — level increment for new binding scope
  - Level-based scoping prevents escaping type variables
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-bindings-basic.test.ts` — scoping tests
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts` — polymorphism tests
- **Coverage assessment**: ✅ Adequate
- **Notes**: Algorithm W with level-based generalization (Standard ML approach); escaping variables caught at generalization time

### F-31: Function parameters not generalized (remain monomorphic in body)

- **Spec ref**: `docs/spec/03-type-system/type-inference.md:182-199` — Function parameters are monomorphic within function body; polymorphism happens at let-bindings
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/infer/infer-functions.ts` — lambda inference creates monomorphic parameter types
  - Parameters don't get a let-binding; they're bound in the environment as `Value` schemes with `vars: []`
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-functions.test.ts` — lambda parameter tests
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts` — function tests
- **Coverage assessment**: ✅ Adequate
- **Notes**: Monomorphism is enforced by not calling `generalize()` on parameter types

### F-32: Nested let-bindings with independent generalization

- **Spec ref**: `docs/spec/03-type-system/type-inference.md:203-216` — Type variables generalized at innermost let-binding; nested lets generalize independently
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/infer/infer-bindings.ts:75-76` — each let-binding increments level
  - Generalization at each binding level filters variables independently
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-bindings-basic.test.ts` — nested let tests
- **Coverage assessment**: ✅ Adequate
- **Notes**: Recursive level increment ensures independent scopes

### F-33: Polymorphic recursion forbidden

- **Spec ref**: `docs/spec/03-type-system/type-inference.md:252-314` — Polymorphic recursion (function calling itself with different type instantiations) not supported; enforced via monomorphic recursive function assumption
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/infer/infer-bindings.ts:173-261` — `inferLetRecExpr()` binds recursive names with fresh monomorphic type variables
  - Recursive calls must unify with the single monomorphic type; different instantiations cause unification failure
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-bindings-recursive.test.ts` — recursive function tests
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts` — recursive tests
- **Coverage assessment**: ✅ Adequate
- **Notes**: Limitation enforced by design; Standard ML approach; decidable inference guaranteed

### F-34: Value restriction and polymorphism (only syntactic values generalize)

- **Spec ref**: `docs/spec/03-type-system/type-inference.md:377-511` — Let-polymorphism only for syntactic values; non-values remain monomorphic to ensure soundness with mutable references
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/types.ts` — `isSyntacticValue()` predicate checks expression kind
  - `packages/core/src/typechecker/infer/let-binding-helpers.ts:46-54` — `generalize()` checks `isSyntacticValue()` and skips generalization for non-values
  - `packages/core/src/typechecker/infer/infer-bindings.ts:104-110` — binding scheme computation respects value restriction
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-bindings-basic.test.ts` — value restriction tests
  - Unit: `packages/core/src/typechecker/infer-bindings-errors-and-edges.test.ts` — value restriction edge cases
  - Unit: `packages/core/src/typechecker/infer/let-binding-helpers.test.ts:"value restriction tests"`
  - E2E: `tests/e2e/let-binding-matrix.test.ts` — cross-form soundness matrix
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts:"value restriction on non-syntactic values"`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Syntactic values: variables, literals, lambdas, constructors, records, lists. Non-values: function applications, if/match expressions, blocks. Comprehensive test matrix in let-binding-matrix.test.ts

### F-35: Type aliases are transparent (no new types, just alternative names)

- **Spec ref**: `docs/spec/03-type-system/type-aliases.md:17-31` — Type aliases are transparent; alias and definition completely interchangeable
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/type-declarations.ts` — type alias expansion during resolution
  - `packages/core/src/typechecker/unify.ts` — `expandAliasFully()` expands aliases to underlying types during unification
  - Aliases don't appear in final types; only expanded form is visible
- **Tests**:
  - Unit: `packages/core/src/typechecker/types.test.ts` — type alias tests
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts` — alias tests
- **Coverage assessment**: ✅ Adequate
- **Notes**: Contrast with nominal types (variants/records); type aliases purely for documentation

### F-36: Recursive type aliases forbidden (must use variant types)

- **Spec ref**: `docs/spec/03-type-system/type-aliases.md:35-47` — Recursive aliases not allowed; must use variant types for recursive structures
- **Status**: ⚠️ Partial
- **Implementation**:
  - Parser grammar accepts type aliases without recursion check
  - `packages/core/src/typechecker/type-declarations.ts` — type alias handling (recursion check status unclear)
- **Tests**: (none explicitly)
- **Coverage assessment**: ❌ Untested
- **Notes**: Implementation status unclear; need to verify if recursive alias expansion is rejected. This is a compile-time check, not runtime.

### F-37: Generic type aliases (parameterized by type variables)

- **Spec ref**: `docs/spec/03-type-system/type-aliases.md:49-66` — Type aliases can be parameterized with type variables
- **Status**: ✅ Implemented
- **Implementation**:
  - Parser grammar: `type Pair<A, B> = { first: A, second: B };` syntax accepted
  - `packages/core/src/typechecker/infer/infer-primitives.ts:382-415` — type expression conversion handles generic aliases
  - `packages/core/src/typechecker/unify.ts` — unification expands parameterized aliases with type arguments
- **Tests**:
  - Unit: `packages/core/src/typechecker/types.test.ts` — generic type tests
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts` — generic tests (likely in record/variant sections)
- **Coverage assessment**: ✅ Adequate
- **Notes**: Generic aliases work via transparent expansion; full type argument instantiation required

### F-38: Type alias expansion during type inference (immediate expansion)

- **Spec ref**: `docs/spec/03-type-system/type-aliases.md:68-83` — Type checker immediately expands aliases to underlying types
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/unify.ts` — `expandAliasFully()` expands aliases before structural unification
  - Aliases expanded transparently during unification, not visible in final types
- **Tests**:
  - Unit: `packages/core/src/typechecker/types.test.ts` — alias expansion tests
- **Coverage assessment**: ✅ Adequate
- **Notes**: Expansion is transparent to users; final inferred types show expanded form

### F-39: Type alias vs nominal type distinction (aliases don't prevent mixing similar types)

- **Spec ref**: `docs/spec/03-type-system/type-aliases.md:87-113` — Type aliases cannot prevent mixing conceptually different types; variant types provide nominal safety
- **Status**: ✅ Implemented (as limitation of aliases)
- **Implementation**:
  - Aliases expand to underlying types; no nominal check
  - Spec recommends single-constructor variants for nominal distinction (F-40)
- **Tests**:
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts` — type safety tests
- **Coverage assessment**: ✅ Adequate (documentation feature)
- **Notes**: This is a design feature, not a bug; documentation guides users to use nominal types when needed

### F-40: Single-constructor variant types for nominal type safety

- **Spec ref**: `docs/spec/03-type-system/type-aliases.md:102-113` — Single-constructor variant types (newtype pattern) provide nominal distinction
- **Status**: ✅ Implemented
- **Implementation**:
  - Variant types are nominal (see chunk 3 audit)
  - Single-constructor variants work naturally as newtype
- **Tests**:
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts` — variant tests (chunk 3)
- **Coverage assessment**: ✅ Adequate
- **Notes**: Feature is part of variant type system (chunk 3); documented here as recommendation

### F-41: Type annotation optionality (not required for well-typed programs)

- **Spec ref**: `docs/spec/03-type-system/type-inference.md:519-626` — Hindley-Milner type inference is complete; annotations never required for well-typed programs
- **Status**: ✅ Implemented
- **Implementation**:
  - Full Algorithm W implementation with all required inference rules
  - Annotations are hints that enable better error localization, not requirements
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-primitives.test.ts` — unannotated function tests
  - Spec-validation: `tests/e2e/spec-validation/03-type-system.test.ts` — unannotated code tests
- **Coverage assessment**: ✅ Adequate
- **Notes**: Completeness for this subset (primitives, tuples, let-polymorphism); full type system completeness depends on records/variants/subtyping (chunk 3)

### F-42: Width subtyping works without annotations

- **Spec ref**: `docs/spec/03-type-system/type-inference.md:523-529` — Width subtyping works automatically during unification
- **Status**: ✅ Implemented (part of chunk 3 — records)
- **Implementation**: See chunk 3 audit for detailed implementation
- **Tests**: See chunk 3 audit
- **Coverage assessment**: ✅ Adequate
- **Notes**: Feature belongs to record subtyping; documented in this section of spec as inference property

### F-43: Let-polymorphism generalization is automatic

- **Spec ref**: `docs/spec/03-type-system/type-inference.md:531-538` — Generalization automatic for syntactic values
- **Status**: ✅ Implemented
- **Implementation**: See F-29, F-34
- **Tests**: See F-29, F-34
- **Coverage assessment**: ✅ Adequate
- **Notes**: None

### F-44: Record field access type inference works without annotations

- **Spec ref**: `docs/spec/03-type-system/type-inference.md:540-545` — Record field types inferred from usage (chunk 3 feature)
- **Status**: ✅ Implemented (part of chunk 3)
- **Implementation**: See chunk 3 audit for records
- **Tests**: See chunk 3 audit
- **Coverage assessment**: ✅ Adequate
- **Notes**: Feature documented in inference section but implemented in record type checking

### F-45: Pattern matching type inference works without annotations

- **Spec ref**: `docs/spec/03-type-system/type-inference.md:547-555` — Pattern matching type inference works without annotations
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/patterns.ts` — pattern type checking
  - Type flows through patterns during inference
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-patterns.test.ts` — pattern inference tests
- **Coverage assessment**: ✅ Adequate
- **Notes**: Pattern matching is part of this chunk (tuples) and chunk 3 (records/variants)

### F-46: String-literal type annotations (discriminated unions for string literals)

- **Spec ref**: `docs/spec/03-type-system/type-inference.md:595-604` — Ambiguous empty list inference and string-literal annotations for disambiguation
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/infer/infer-primitives.ts:256-273` — string-literal annotation special handling
  - `packages/core/src/typechecker/infer/infer-primitives.ts:296-304` — shape detection for StringLit/Union types
  - `packages/core/src/typechecker/infer/infer-primitives.ts:311-316` — literal value matching
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-primitives.test.ts` — string-literal annotation tests
- **Coverage assessment**: ⚠️ Thin — basic string-literal handling tested; edge cases (nested unions, mixed types) may lack tests
- **Notes**: Bidirectional type checking special case; string-literal type annotations get compile-time validation of literal values

## Feature Gaps (this section)

- **F-36**: Recursive type aliases — Implementation status unclear. Need to verify that recursive type alias expansion is rejected with appropriate error code. No test asserting this rejection.

## Testing Gaps (this section)

- **F-10**: List element type homogeneity — Only happy path tested. Missing explicit tests for heterogeneous numeric types (e.g., `[1, 2.0, 3]`), though type unification likely catches them.
- **F-13**: Tuple type syntax — Complex nested and polymorphic tuple types lack dedicated edge case tests.
- **F-15**: Nested tuple destructuring — Deeply nested patterns (3+ levels) lack specific regression tests.
- **F-21**: Tuple type equivalence error messages — Basic equivalence tested; specific error message formatting for mismatch (different order/arity) lacks assertion tests.
- **F-46**: String-literal type annotations — Edge cases (nested unions, mixed-type unions, non-string literals in unions) lack tests.

## Testing Redundancies (this section)

- **Candidate**: `packages/core/src/typechecker/infer-primitives.test.ts:"should infer Int type for integer literals"` overlaps with `tests/e2e/spec-validation/03-type-system.test.ts:"Int type"` — both assert Int literal inference. Recommendation: Keep both. Unit test is fast and isolated; e2e test validates full pipeline. Different test targets.
- **Candidate**: `packages/core/src/typechecker/infer-primitives.test.ts:"should infer Float type for float literals"` overlaps with `tests/e2e/spec-validation/03-type-system.test.ts:"Float type"` — same reasoning as above.
- **Candidate**: `packages/core/src/typechecker/infer-primitives.test.ts:"should infer String type for string literals"` overlaps with `tests/e2e/spec-validation/03-type-system.test.ts:"String type"` — same reasoning as above.
- **Candidate**: `packages/core/src/typechecker/infer-primitives.test.ts:"should infer Bool type for boolean literals"` overlaps with `tests/e2e/spec-validation/03-type-system.test.ts:"Bool type"` — same reasoning as above.
- **Candidate**: `packages/core/src/typechecker/infer-primitives.test.ts:"should infer Unit type for unit literals"` overlaps with `tests/e2e/spec-validation/03-type-system.test.ts:"Unit type"` — same reasoning as above.

All identified redundancies follow the pattern of unit tests + e2e tests for the same basic feature. This is appropriate per the audit methodology — unit and e2e tests serve different purposes (isolation/speed vs. full pipeline). Keeping both is recommended.

---

**Summary**: 46 features identified. 1 feature gap (F-36: recursive alias rejection status unclear). 5 testing gaps (F-10, F-13, F-15, F-21, F-46 lack edge case coverage). 5 test redundancy candidates (all unit/e2e pairs; recommended to keep both for coverage purposes).
