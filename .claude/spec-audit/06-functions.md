# Audit: 06 Functions (`docs/spec/06-functions.md`)

## Sources Reviewed

**Spec files** (with line counts):
- `docs/spec/06-functions.md` (376 lines)

**Implementation files**:
- `packages/core/src/parser/parse-expression-lambda.ts` (460 lines)
- `packages/core/src/parser/parse-declarations/let.ts` (234 lines)
- `packages/core/src/desugarer/curryLambda.ts` (207 lines)
- `packages/core/src/desugarer/desugarComposition.ts` (96 lines)
- `packages/core/src/typechecker/infer/infer-functions.ts` (129 lines)
- `packages/core/src/typechecker/infer/infer-bindings.ts` (312 lines)
- `packages/core/src/codegen/es2020/emit-expressions/functions.ts` (57 lines)
- `packages/core/src/codegen/es2020/emit-declarations.ts` (partial)

**Test files** (every layer):
- Unit: `packages/core/src/parser/lambda-*.test.ts` (5 test files)
- Unit: `packages/core/src/desugarer/lambdas.test.ts`
- Unit: `packages/core/src/typechecker/infer-functions.test.ts`
- Unit: `packages/core/src/typechecker/typechecker-recursion.test.ts`
- Unit: `packages/core/src/typechecker/infer/let-binding-helpers.test.ts`
- Integration: `packages/core/src/desugarer/desugarer-primitives.test.ts`
- Snapshot: `packages/core/src/parser/snapshot-tests/snapshot-functions.test.ts`
- Snapshot: `packages/core/src/codegen/es2020/snapshot-tests/snapshot-functions.test.ts`
- Execution: `packages/core/src/codegen/es2020/execution-tests/functions.test.ts` (22 tests)
- E2E: `tests/e2e/spec-validation/06-functions.test.ts` (22 tests)
- E2E: `tests/e2e/let-binding-matrix.test.ts`

---

## Feature Inventory

### F-01: Named function definitions with type annotations

- **Spec ref**: `docs/spec/06-functions.md:9-22` — Named functions can be defined with optional type annotations using `let name: Type = expr;` syntax
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-declarations/let.ts:94-141` — `parseLetDecl` parses let declarations with optional type annotation
  - `packages/core/src/typechecker/infer/infer-bindings.ts:47-154` — `inferLet` infers and generalizes let-bound functions
  - `packages/core/src/codegen/es2020/emit-declarations.ts` — emits function declarations
- **Tests**:
  - Unit: `packages/core/src/parser/snapshot-tests/snapshot-functions.test.ts:1-10` — parsing snapshot
  - E2E: `tests/e2e/spec-validation/06-functions.test.ts:15-50` — all three `it()` tests for named function definitions
  - Execution: `packages/core/src/codegen/es2020/execution-tests/functions.test.ts` — emits and runs correctly
- **Coverage assessment**: ✅ Adequate — parsing, typechecking, and execution all covered
- **Notes**: none

### F-02: Function types with arrow notation

- **Spec ref**: `docs/spec/06-functions.md:24-48` — Function types written with arrow `->` operator; surface syntax `(A, B) -> C` is syntactic sugar for `(A) -> (B) -> C`
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-types.ts` (inferred via type parsing) — parser converts surface syntax to internal representation
  - `packages/core/src/typechecker/types.ts:50-52` — `funType(params, returnType)` constructs function types
  - Type checker treats both forms identically during unification
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-functions.test.ts` — function type inference
  - Integration: `packages/core/src/desugarer/desugarer-primitives.test.ts` — multi-arg desugaring
  - E2E: `tests/e2e/spec-validation/06-functions.test.ts:26-50` — type annotations in function definitions
- **Coverage assessment**: ✅ Adequate — syntax parsing and type semantics validated
- **Notes**: The type representation uses `{ type: "Fun", params: Type[], return: Type }` which correctly models currying

### F-03: Automatic currying of multi-argument functions

- **Spec ref**: `docs/spec/06-functions.md:76-94` — All multi-argument functions are automatically curried, enabling partial application
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/desugarer/curryLambda.ts:39-62` — `curryLambda()` transforms multi-param lambdas into nested single-param lambdas
  - `packages/core/src/parser/parse-expression-lambda.ts:298-382` — lambda parameter parsing
  - Desugarer applies currying to all Surface `Lambda` expressions before typechecking
- **Tests**:
  - Unit: `packages/core/src/desugarer/lambdas.test.ts:86-120` — currying two-parameter lambda
  - Integration: `packages/core/src/desugarer/desugarer-primitives.test.ts` — multi-argument applications desugar to curried applications
  - E2E: `tests/e2e/spec-validation/06-functions.test.ts:54-100` — currying tests for 2-arg and 3-arg functions
  - Execution: `packages/core/src/codegen/es2020/execution-tests/functions.test.ts:13-72` — curried function application and partial application
- **Coverage assessment**: ✅ Adequate — tested at desugarer, typechecker, and execution layers
- **Notes**: Currying is transparent; user writes `(x, y) => x + y` and desugarer converts to nested lambdas

### F-04: Full application evaluation

- **Spec ref**: `docs/spec/06-functions.md:96-119` — Multi-argument calls with all parameters, e.g., `add(1, 2)`, return the result value
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/desugarer/desugarer-primitives.ts` — multi-arg `App` desugars to nested curried applications
  - `packages/core/src/codegen/es2020/emit-expressions/functions.ts:45-56` — `emitApp` emits curried application chains
- **Tests**:
  - Integration: `packages/core/src/desugarer/desugarer-primitives.test.ts:221-248` — multi-argument applications desugar correctly
  - E2E: `tests/e2e/spec-validation/06-functions.test.ts:16-24` — full application returns result
  - Execution: `packages/core/src/codegen/es2020/execution-tests/functions.test.ts:23-40` — evaluates `add(2, 3)` to `5` and `add3(1, 2, 3)` to `6`
- **Coverage assessment**: ✅ Adequate
- **Notes**: none

### F-05: Partial application (fewer arguments than parameters)

- **Spec ref**: `docs/spec/06-functions.md:89-94` and `209-225` — Providing fewer arguments returns a function with remaining arity
- **Status**: ✅ Implemented
- **Implementation**:
  - Automatic via currying: `add(1)` applies one argument and returns `(Int) -> Int`
  - `packages/core/src/typechecker/infer/infer-functions.ts:95-128` — `inferApp` handles partial application via type unification
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-functions.test.ts` — partial application type inference
  - E2E: `tests/e2e/spec-validation/06-functions.test.ts:54-64` — `add5 = add(5)` returns `(Int) -> Int`
  - Execution: `packages/core/src/codegen/es2020/execution-tests/functions.test.ts:52-72` — partial application and multi-level currying
- **Coverage assessment**: ✅ Adequate
- **Notes**: Partial application is a natural consequence of the curried representation

### F-06: Arity validation at compile time

- **Spec ref**: `docs/spec/06-functions.md:134-169` — Arity checking occurs at compile time during type checking; over-application is rejected with a type error
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/infer/infer-functions.ts:95-128` — `inferApp` unifies function type with argument; over-application fails unification when attempting to apply to non-function type
  - Type checker validates that `CoreApp` has correct arity based on function type
- **Tests**:
  - E2E: `tests/e2e/spec-validation/06-functions.test.ts:303-309` — `add(1, 2, 3)` is a compile error
  - (none at unit/snapshot level specifically for arity mismatch error messages)
- **Coverage assessment**: ⚠️ Thin — only happy-path (error condition) is tested; error message content not validated
- **Notes**: The error manifests as a unification failure ("Cannot apply argument of type Int to non-function type Int"), which is correct but implicit

### F-07: Anonymous lambdas (lambda expressions)

- **Spec ref**: `docs/spec/06-functions.md:354-362` — Anonymous functions can be written inline with `(x) => expr` syntax
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-lambda.ts:193-383` — `parseLambdaOrParen` parses lambdas inside parentheses
  - Full lambda parsing pipeline: parameter parsing, type annotations, return type annotations, destructuring support
- **Tests**:
  - Unit: `packages/core/src/parser/lambda-*.test.ts` — 5 dedicated test files for lambda syntax variations
  - E2E: `tests/e2e/spec-validation/06-functions.test.ts:215-257` — all lambda tests (type annotations, destructuring, zero-arg, return type)
  - Execution: `packages/core/src/codegen/es2020/execution-tests/functions.test.ts:74-89` — closure and zero-parameter lambda execution
- **Coverage assessment**: ✅ Adequate
- **Notes**: Extensive parser tests for lambda edge cases (annotations, destructuring patterns, return types)

### F-08: Lambda parameter type annotations

- **Spec ref**: `docs/spec/06-functions.md:9-22` and implicit in lambda param parsing — Parameters can have optional type annotations, e.g., `(x: Int) => x + 1`
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-lambda.ts:70-100` — `parseLambdaParam` parses `pattern: Type` syntax
  - `packages/core/src/desugarer/curryLambda.ts:103-132` — wraps annotated simple params in `let p = ($raw : T) in body`
- **Tests**:
  - Unit: `packages/core/src/parser/lambda-annotations.test.ts` — parameter annotation parsing
  - E2E: `tests/e2e/spec-validation/06-functions.test.ts:215-224` — lambda with type annotations executes correctly
  - Execution: `packages/core/src/codegen/es2020/execution-tests/functions.test.ts:165-189` — polymorphic and multi-param lambdas with annotations
- **Coverage assessment**: ✅ Adequate
- **Notes**: Annotations are enforced by wrapping in a let binding that includes the type annotation

### F-09: Lambda return type annotations

- **Spec ref**: `docs/spec/06-functions.md:9-22` and `248-257` — Lambdas can have return type annotations, e.g., `(x): Int => ...`
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-lambda.ts:233-249` and `341-357` — parses return type after closing paren
  - Return type is attached to the Lambda AST node and used during type checking
- **Tests**:
  - Unit: `packages/core/src/parser/lambda-return-type.test.ts` — return type annotation parsing
  - E2E: `tests/e2e/spec-validation/06-functions.test.ts:248-257` — lambda with return type annotation
  - Execution: `packages/core/src/codegen/es2020/execution-tests/functions.test.ts:85-89` — zero-parameter lambda
- **Coverage assessment**: ✅ Adequate
- **Notes**: Return type annotations are validated during type checking

### F-10: Destructuring lambda parameters

- **Spec ref**: implicit in lambda syntax (not explicitly stated but shown in examples) — Lambda parameters can be patterns that destructure records, tuples, etc.
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-lambda.ts:70-100` — `parseLambdaParam` parses any pattern as a parameter
  - `packages/core/src/desugarer/curryLambda.ts:134-170` — destructuring params lift into a synthesized match over a fresh scrutinee
- **Tests**:
  - Unit: `packages/core/src/parser/lambda-destructuring.test.ts` — destructuring pattern parsing
  - E2E: `tests/e2e/spec-validation/06-functions.test.ts:226-235` — record destructuring in lambda
  - Execution: `packages/core/src/codegen/es2020/execution-tests/functions.test.ts:116-152` — record and tuple destructuring in parameters
- **Coverage assessment**: ✅ Adequate
- **Notes**: Desugarer lifts destructuring into match, so Core lambdas only have simple (var/wildcard) params

### F-11: Zero-argument lambdas

- **Spec ref**: implicit in lambda syntax — `() => expr` is a valid lambda that accepts the unit type
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expression-lambda.ts:224-282` — parses `()` as zero-param lambda
  - `packages/core/src/desugarer/curryLambda.ts:53-60` — synthesizes a wildcard-pattern param for `() => expr`
- **Tests**:
  - Unit: `packages/core/src/parser/lambda-*.test.ts` — zero-param lambda parsing
  - E2E: `tests/e2e/spec-validation/06-functions.test.ts:237-246` — zero-argument lambda execution
  - Execution: `packages/core/src/codegen/es2020/execution-tests/functions.test.ts:42-50` — `answer()` call and invocation
- **Coverage assessment**: ✅ Adequate
- **Notes**: Zero-arg call `f()` desugars to `f(unit)`, matching the synthesized wildcard param

### F-12: Recursive functions with `let rec`

- **Spec ref**: `docs/spec/06-functions.md:298-310` — Use `rec` keyword to allow a function to call itself
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-declarations/let.ts:94-141` — parser recognizes `rec` modifier in let declarations
  - `packages/core/src/typechecker/typechecker.ts` — `CoreLetRecGroup` branch handles recursive bindings by pre-binding all names with fresh type vars
  - `packages/core/src/typechecker/infer/infer-bindings.ts:173-311` — `inferLetRecExpr` implements recursion algorithm
- **Tests**:
  - Unit: `packages/core/src/typechecker/typechecker-recursion.test.ts:61-143` — recursive factorial and other recursion patterns
  - E2E: `tests/e2e/spec-validation/06-functions.test.ts:104-143` — recursive factorial, fibonacci, and error when `rec` is missing
  - E2E: `tests/e2e/let-binding-matrix.test.ts` — recursion matrix scenarios
  - Execution: `packages/core/src/codegen/es2020/execution-tests/functions.test.ts:92-115` — recursive factorial and fibonacci evaluation
- **Coverage assessment**: ✅ Adequate
- **Notes**: Spec mandates that non-recursive let-bindings referencing themselves is an error; tests verify this

### F-13: Mutually recursive functions with `and`

- **Spec ref**: `docs/spec/06-functions.md:313-337` — Use `and` keyword to define mutually recursive functions as a group
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-declarations/let.ts:143-221` — parser handles `and` keyword for multi-binding recursion groups
  - `packages/core/src/typechecker/infer/infer-bindings.ts:173-311` — `inferLetRecExpr` handles multiple bindings in one pass
- **Tests**:
  - Unit: `packages/core/src/typechecker/typechecker-recursion.test.ts:144+` — mutual recursion tests (isEven/isOdd)
  - E2E: `tests/e2e/spec-validation/06-functions.test.ts:147-185` — mutually recursive isEven/isOdd with both directions
  - E2E: `tests/e2e/let-binding-matrix.test.ts` — mutual recursion matrix scenarios
- **Coverage assessment**: ✅ Adequate
- **Notes**: The `and` keyword must be paired with `rec` (spec requirement); parser enforces this

### F-14: Higher-order functions (functions as arguments)

- **Spec ref**: `docs/spec/06-functions.md:339-351` — Functions can be passed as arguments to other functions
- **Status**: ✅ Implemented
- **Implementation**:
  - Type system treats functions as first-class values; `(A) -> B` is a valid parameter type
  - `packages/core/src/typechecker/infer/infer-functions.ts` — function types unify correctly in applications
- **Tests**:
  - E2E: `tests/e2e/spec-validation/06-functions.test.ts:189-211` — function as argument and return value
  - Execution: `packages/core/src/codegen/es2020/execution-tests/functions.test.ts:12-72` — various HOF patterns
- **Coverage assessment**: ✅ Adequate
- **Notes**: No special syntax; functions are values and flow through the normal type system

### F-15: Higher-order functions (functions as return values)

- **Spec ref**: `docs/spec/06-functions.md:339-351` — Functions can return other functions (closures)
- **Status**: ✅ Implemented
- **Implementation**:
  - Currying naturally supports this: `(x) => (y) => x + y` returns a function from the outer lambda
  - Closures are implemented via JavaScript's lexical scoping in the codegen
- **Tests**:
  - E2E: `tests/e2e/spec-validation/06-functions.test.ts:201-211` — `makeAdder` returns a function
  - E2E: `tests/e2e/spec-validation/06-functions.test.ts:289-299` — closures capture outer variables
  - Execution: `packages/core/src/codegen/es2020/execution-tests/functions.test.ts:75-83` — closure that captures `n`
- **Coverage assessment**: ✅ Adequate
- **Notes**: Closures automatically capture variables from enclosing scopes

### F-16: Closures and variable capture

- **Spec ref**: implicit in higher-order functions and lambda semantics — Lambdas capture variables from enclosing scopes
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/codegen/es2020/emit-expressions/functions.ts:26-39` — `emitLambda` emits arrow functions, which capture lexical scope
  - JavaScript's native closure semantics handle variable capture
- **Tests**:
  - E2E: `tests/e2e/spec-validation/06-functions.test.ts:289-299` — closure captures outer variable
  - Execution: `packages/core/src/codegen/es2020/execution-tests/functions.test.ts:75-83` — `makeAdder(10)` captures `n = 10`
  - Property: `packages/core/src/codegen/es2020/execution-tests/functions.test.ts:231-245` — property test for closure semantics
- **Coverage assessment**: ✅ Adequate
- **Notes**: Captured variables must satisfy unsafe block rules if inside unsafe context

### F-17: Function composition with `>>` (forward)

- **Spec ref**: `docs/spec/06-functions.md:366-375` — Forward composition `f >> g` produces `(x) => g(f(x))`
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/desugarer/desugarComposition.ts:24-95` — `desugarComposition` desugars `>>` to lambda and nested applications
  - Parser recognizes `>>` as `ForwardCompose` operator
- **Tests**:
  - Unit: `packages/core/src/desugarer/desugarComposition.test.ts` — composition desugaring
  - Unit: `packages/core/src/desugarer/composition.test.ts` — composition operator tests
  - E2E: `tests/e2e/spec-validation/06-functions.test.ts:261-272` — forward composition with actual functions
- **Coverage assessment**: ✅ Adequate
- **Notes**: Composition is syntactic sugar; desugars to a lambda that applies both functions

### F-18: Function composition with `<<` (backward)

- **Spec ref**: `docs/spec/06-functions.md:366-375` — Backward composition `f << g` produces `(x) => f(g(x))`
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/desugarer/desugarComposition.ts:24-95` — `desugarComposition` desugars `<<` to lambda and nested applications
- **Tests**:
  - Unit: `packages/core/src/desugarer/composition.test.ts` — composition operator tests
  - E2E: `tests/e2e/spec-validation/06-functions.test.ts:274-285` — backward composition with actual functions
- **Coverage assessment**: ✅ Adequate
- **Notes**: none

### F-19: Type inference for curried functions

- **Spec ref**: `docs/spec/06-functions.md:276-294` — Type checker infers curried types automatically and validates partial applications
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/infer/infer-functions.ts:37-83` — `inferLambda` creates fresh type var for param and function type for result
  - `packages/core/src/typechecker/infer/infer-bindings.ts:47-154` — `inferLet` with generalization for polymorphic functions
- **Tests**:
  - Unit: `packages/core/src/typechecker/infer-functions.test.ts` — lambda type inference
  - Unit: `packages/core/src/typechecker/typechecker-higher-order.test.ts` — higher-order function type inference
  - E2E: `tests/e2e/let-binding-matrix.test.ts` — polymorphic function inference matrix
- **Coverage assessment**: ✅ Adequate
- **Notes**: Generalization respects the value restriction for polymorphic let bindings

### F-20: Generic (polymorphic) functions

- **Spec ref**: `docs/spec/06-functions.md:227-236` — Generic functions can be defined with explicit type parameters, e.g., `<A, B>(x: A, f: (A) -> B): B`
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-types.ts` — parses `<A, B>` type parameter syntax
  - `packages/core/src/typechecker/infer/` — unification and substitution handle polymorphic types
- **Tests**:
  - E2E: `tests/e2e/spec-validation/06-functions.test.ts` — implicit polymorphic functions (type inference)
  - Execution: `packages/core/src/codegen/es2020/execution-tests/functions.test.ts:165-189` — polymorphic identity and pair selection
- **Coverage assessment**: ✅ Adequate
- **Notes**: Both explicit type parameters and implicit inference are supported

### F-21: Polymorphic recursion prohibition

- **Spec ref**: `docs/spec/06-functions.md:311` — Vibefun does not support polymorphic recursion; recursive functions must use the same type instantiation on recursive calls
- **Status**: ✅ Implemented
- **Implementation**:
  - Value restriction + monomorphization of recursive bindings prevents polymorphic recursion
  - Type checker unifies all recursive calls against the same inferred type
- **Tests**:
  - (No explicit test for polymorphic recursion rejection; implicit via let-rec type checking)
- **Coverage assessment**: ⚠️ Thin — no explicit test that polymorphic recursion is rejected; implicit through normal recursion tests
- **Notes**: The prohibition is enforced implicitly; a recursive call with different type args would fail unification, but no test explicitly validates this error

### F-22: Type inference with partial application

- **Spec ref**: `docs/spec/06-functions.md:209-225` — Type checker infers correct types for partial applications
- **Status**: ✅ Implemented
- **Implementation**:
  - Currying and type unification naturally handle partial application
  - `packages/core/src/typechecker/infer/infer-functions.ts:95-128` — `inferApp` with partial application
- **Tests**:
  - E2E: `tests/e2e/spec-validation/06-functions.test.ts:54-88` — partial application type checking
  - Execution: `packages/core/src/codegen/es2020/execution-tests/functions.test.ts:52-72` — partial application evaluation
- **Coverage assessment**: ✅ Adequate
- **Notes**: none

### F-23: Function value semantics

- **Spec ref**: implicit in function semantics — Functions are first-class values and can be bound to variables, passed to functions, etc.
- **Status**: ✅ Implemented
- **Implementation**:
  - Type system treats `(A) -> B` as a value type
  - No special "function value" AST node; functions are expressions like any other value
- **Tests**:
  - E2E: `tests/e2e/spec-validation/06-functions.test.ts:189-211` — functions as values
  - Execution: all function tests implicitly validate this
- **Coverage assessment**: ✅ Adequate
- **Notes**: Functions are values; no special handling needed

### F-24: Name shadowing in function scopes

- **Spec ref**: implicit in scoping semantics — Function parameters and let-bindings can shadow outer variables
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/typechecker/infer/infer-functions.ts:37-83` — `inferLambda` creates new environment with param binding
  - `packages/core/src/typechecker/infer/infer-bindings.ts` — let bindings extend environment with new binding
- **Tests**:
  - (Implicit in most tests; no explicit shadowing test)
- **Coverage assessment**: ⚠️ Thin — shadowing is supported but not explicitly tested
- **Notes**: Shadowing is a natural consequence of lexical scoping; each function introduces a new scope

### F-25: Function call in expressions (application syntax)

- **Spec ref**: `docs/spec/06-functions.md:86` — Functions are called with parentheses and arguments
- **Status**: ✅ Implemented
- **Implementation**:
  - `packages/core/src/parser/parse-expressions.ts` — expression parser handles function application
  - `packages/core/src/desugarer/desugarer-primitives.ts` — multi-arg app desugars to curried apps
  - `packages/core/src/codegen/es2020/emit-expressions/functions.ts:45-56` — `emitApp` emits JS function calls
- **Tests**:
  - All function tests exercise application syntax
- **Coverage assessment**: ✅ Adequate
- **Notes**: Application is standard syntax

---

## Feature Gaps (this section)

_None_.

---

## Testing Gaps (this section)

- **F-06**: Arity validation — While over-application is correctly rejected at compile time, the specific error message and edge cases (e.g., error location, message content) are not directly validated. Consider adding a unit test that asserts the exact diagnostic code and message for arity mismatch.

- **F-21**: Polymorphic recursion prohibition — No explicit test that rejects polymorphic recursion with a specific error. The prohibition is enforced implicitly (unification failure), but a dedicated test would clarify the expected behavior and provide better error context for future maintainers.

- **F-24**: Name shadowing in function scopes — Shadowing is supported but not explicitly tested. Add a test that binds a parameter with the same name as an outer variable and validates that the inner binding is used.

---

## Testing Redundancies (this section)

- **Candidate**: `packages/core/src/desugarer/lambdas.test.ts:86-120` ("should curry two-parameter lambda") and `packages/core/src/desugarer/desugarer-primitives.test.ts:221-248` ("should desugar multi-argument applications into curried applications") both verify that multi-param lambdas produce nested single-param lambdas. Recommendation: These serve different purposes (internal desugarer structure vs. surface syntax behavior), so both are valuable. Keep both — the first tests the currying function directly; the second tests the full App desugaring path.

- **Candidate**: `tests/e2e/spec-validation/06-functions.test.ts:54-88` ("automatic currying - partial application" and related currying tests) and `packages/core/src/codegen/es2020/execution-tests/functions.test.ts:13-72` (curried function application tests) both validate currying semantics end-to-end. The spec-validation tests focus on language semantics (partial application, mixed calling styles); the execution tests focus on runtime behavior (that curried calls evaluate correctly). Recommendation: Keep both — they test complementary layers.

- **Candidate**: `tests/e2e/spec-validation/06-functions.test.ts:104-143` (recursive and mutual recursion) and `packages/core/src/typechecker/typechecker-recursion.test.ts` (unit tests) both cover recursion. The spec-validation tests exercise the full pipeline; the unit tests verify the typechecker's algorithm in isolation. Recommendation: Keep both — unit tests are faster and catch algorithm bugs earlier; spec-validation tests catch pipeline integration issues.

---

## Summary

**Feature count**: 25 features enumerated, all ✅ Implemented
**Gap count**: 0 missing or partial implementations  
**Testing-gap count**: 3 (arity error messages, polymorphic recursion rejection, name shadowing)
**Redundancy count**: 3 candidates identified and justified (all kept)
**Output file path**: `/Users/michael/Projects/vibefun/.claude/spec-audit/06-functions.md`
