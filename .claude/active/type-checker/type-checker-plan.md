# Type Checker Implementation Plan

**Created:** 2025-10-30
**Status:** Planning Complete - Ready for Implementation

## Overview

Implement a complete Hindley-Milner type checker with Algorithm W for the vibefun language. This builds on the existing environment building and overload resolution components already implemented in `packages/core/src/typechecker/`.

## Existing Foundation

The following components are already complete:
- ✅ **Environment Building** (`environment.ts`): Scans module declarations, groups external overloads, validates constraints
- ✅ **Overload Resolution** (`resolver.ts`): Arity-based resolution for overloaded external functions
- ✅ **Test Coverage**: 28 passing tests for environment and resolver
- ✅ **Type Definitions** (`types/environment.ts`): TypeEnv, ValueBinding, Type, TypeScheme structures

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
- **Target:** 20+ tests

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
1. Define primitive type constants (Int, Float, String, Bool, Unit)
2. Create algebraic type definitions:
   - List<T>: Cons(head: T, tail: List<T>) | Nil
   - Option<T>: Some(T) | None
   - Result<T, E>: Ok(T) | Err(E)
3. Define variant constructor functions (Cons: (T, List<T>) -> List<T>, etc.)
4. Add standard library function signatures (List.map, Option.getOrElse, etc.)
5. Extend buildEnvironment() to inject built-ins into TypeEnv

**Test Requirements:**
- Built-in environment contains all primitives
- List, Option, Result types available with correct structure
- Variant constructors have correct function types
- Standard library functions have proper polymorphic types
- Environment building doesn't break existing tests
- **Target:** 15+ tests

**Quality Gate:**
- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes (all existing + new)
- [ ] `npm run format` applied
- [ ] Test coverage ≥90%

---

### Phase 3: Core Type Inference (Algorithm W - Basics)

**Estimated Effort:** 6-8 hours

**Files to Create:**
- `packages/core/src/typechecker/infer.ts` - Core inference engine
- `packages/core/src/typechecker/infer.test.ts` - Inference tests

**Implementation Tasks:**
1. Implement InferenceContext (type environment, fresh variable counter, substitution)
2. Build fresh type variable generation
3. Implement `inferExpr()` for:
   - Literals: CoreIntLit → Int, CoreStringLit → String, etc.
   - Variables: CoreVar → lookup in environment, instantiate type scheme
   - Lambda: CoreLambda → create function type, infer body
   - Application: CoreApp → infer function, infer argument, unify
   - Binary operators: CoreBinOp → handle arithmetic, comparison, logical
   - Unary operators: CoreUnaryOp → handle negation, not
4. Thread substitutions through inference
5. Handle type annotations (CoreTypeAnnotation)

**Test Requirements:**
- Infer literal types correctly
- Look up variables and instantiate polymorphic types
- Infer lambda parameter and return types
- Handle function application with unification
- Support curried functions (single-param lambdas)
- Infer types through composition
- Handle binary operators (+, -, *, <, ==, etc.)
- Handle unary operators (-, !)
- Type annotations constrain inference
- **Target:** 25+ tests

**Quality Gate:**
- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run format` applied
- [ ] Test coverage ≥90%

---

### Phase 4: Let-Bindings & Polymorphism

**Estimated Effort:** 4-5 hours

**Files to Modify:**
- `packages/core/src/typechecker/infer.ts` - Add let-binding support
- `packages/core/src/typechecker/infer.test.ts` - Polymorphism tests

**Implementation Tasks:**
1. Implement generalization:
   - Find free type variables in inferred type
   - Quantify variables not free in environment
   - Create TypeScheme with quantified vars
2. Implement instantiation:
   - Replace quantified variables with fresh type variables
3. Type check CoreLet expressions:
   - Infer binding value type
   - Generalize to create type scheme
   - Add to environment
   - Infer body expression
4. Handle recursive bindings (bind name before inferring value)
5. Support mutually recursive functions (if needed)

**Test Requirements:**
- Simple let-bindings infer correctly
- Polymorphic identity function: `let id = x => x` usable at Int, String, etc.
- Polymorphic map: works with different function types
- Polymorphic compose function
- Let-bound values instantiated fresh at each use
- Recursive functions (factorial, fibonacci)
- Mutually recursive functions (if supported)
- **Target:** 20+ tests

**Quality Gate:**
- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run format` applied
- [ ] Test coverage ≥90%

---

### Phase 5: Algebraic Data Types

**Estimated Effort:** 5-6 hours

**Files to Modify:**
- `packages/core/src/typechecker/infer.ts` - Add ADT support
- `packages/core/src/typechecker/infer.test.ts` - ADT tests

**Implementation Tasks:**
1. Type check CoreRecord:
   - Infer all field expression types
   - Create record type with field map
2. Type check CoreRecordAccess:
   - Infer record expression type
   - Verify it's a record type
   - Look up field type
3. Type check CoreRecordUpdate:
   - Infer base record type
   - Infer update field types
   - Verify fields exist
   - Create new record type
4. Type check CoreVariant:
   - Look up variant constructor in environment
   - Instantiate generic type parameters
   - Infer payload types
   - Unify with constructor parameter types
5. Handle generic type instantiation (List<Int> vs List<String>)

**Test Requirements:**
- Record construction infers correct field types
- Record field access works
- Record updates maintain structural typing
- Variant construction with correct types
- Generic variants: Some(42) is Option<Int>, Nil is List<α>
- Cons(1, Cons(2, Nil)) infers List<Int>
- Nested records and variants
- Structural record compatibility
- **Target:** 25+ tests

**Quality Gate:**
- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run format` applied
- [ ] Test coverage ≥90%

---

### Phase 6: Pattern Matching

**Estimated Effort:** 6-8 hours

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
   - Verify exhaustiveness
   - Infer all arm body types
   - Unify all arm types (must return same type)

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
- **Target:** 30+ tests

**Quality Gate:**
- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run format` applied
- [ ] Test coverage ≥90%

---

### Phase 7: Advanced Features

**Estimated Effort:** 4-5 hours

**Files to Modify:**
- `packages/core/src/typechecker/infer.ts` - Union types, unsafe blocks
- `packages/core/src/typechecker/infer.test.ts` - Advanced feature tests

**Implementation Tasks:**
1. Type check union types:
   - Union type creation and representation
   - Type narrowing in patterns (if needed)
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
   - Empty list needs context type
   - Ambiguous recursion needs annotation
   - Type variables escaping scope

**Test Requirements:**
- Union types work correctly
- Type annotations validate inferred types
- Overloaded external functions resolve and type check
- Unsafe blocks allow FFI calls
- Edge cases handled with clear errors
- **Target:** 20+ tests

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
3. Generate helpful error messages:
   - Type mismatch: show expected vs actual
   - Undefined variable: show name and location
   - Non-exhaustive patterns: list missing cases
   - Occurs check: explain infinite type error
   - Overload resolution: show candidates and why they don't match
4. Add suggestions where possible:
   - "Did you mean X?"
   - "Consider adding a type annotation"
   - "This variable is not in scope"

**Test Requirements:**
- Type formatting produces readable output
- Mismatch errors show expected and actual types
- Exhaustiveness errors list all missing cases
- Occurs check errors are clear
- Overload errors show candidates
- Error locations are correct
- Suggestions are helpful
- **Target:** 15+ tests

**Quality Gate:**
- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run format` applied
- [ ] Test coverage ≥90%

---

### Phase 9: Integration & Main Entry Point

**Estimated Effort:** 5-6 hours

**Files to Create:**
- `packages/core/src/typechecker/typechecker.ts` - Main type checker entry point
- `packages/core/src/typechecker/typechecker.test.ts` - Integration tests

**Files to Modify:**
- `packages/core/src/typechecker/index.ts` - Export main typeCheck function

**Implementation Tasks:**
1. Create main typeCheck() function:
   - Input: CoreModule (desugared AST)
   - Build type environment with built-ins
   - Type check each top-level declaration
   - Attach inferred types to AST nodes
   - Output: TypedModule (CoreModule with type annotations)
2. Attach types to AST:
   - Add inferredType field to each CoreExpr node
   - Preserve all other AST information
3. Handle module-level declarations:
   - Type definitions (variants, records)
   - Let bindings
   - External declarations
4. End-to-end integration tests:
   - Parse → Desugar → Type Check pipeline
   - Complete small programs
   - All features combined

**Test Requirements:**
- Simple programs type check correctly
- Polymorphic functions work end-to-end
- Pattern matching exhaustiveness enforced
- External functions with overloads work
- Records and variants work together
- Fibonacci, factorial, list operations
- Map/filter/fold compositions
- Real examples from spec
- Integration with desugarer output
- **Target:** 25+ integration tests

**Quality Gate:**
- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes (all 200+ tests)
- [ ] `npm run format` applied
- [ ] Test coverage ≥90%

---

### Phase 10: Documentation & Polish

**Estimated Effort:** 2-3 hours

**Files to Modify:**
- All public APIs - Add JSDoc comments
- `CLAUDE.md` - Update with type checker completion
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

**Total Test Count Target:** 200+ tests

**Phase Breakdown:**
- Phase 1 (Unification): 20+ tests
- Phase 2 (Built-ins): 15+ tests
- Phase 3 (Basic Inference): 25+ tests
- Phase 4 (Polymorphism): 20+ tests
- Phase 5 (ADTs): 25+ tests
- Phase 6 (Patterns): 30+ tests
- Phase 7 (Advanced): 20+ tests
- Phase 8 (Errors): 15+ tests
- Phase 9 (Integration): 25+ tests
- Phase 10 (Documentation): 0 new tests (verification only)

**Test Categories:**
- Unit tests for each function/algorithm
- Edge cases and boundary conditions
- Error paths and error messages
- Integration tests combining features
- End-to-end compiler pipeline tests

**Every Phase Must:**
1. Pass `npm run check` (type checking)
2. Pass `npm run lint` (linting)
3. Pass `npm test` (all tests)
4. Pass `npm run format` (formatting)
5. Maintain ≥90% coverage

## Key Technical Decisions

### Algorithm Choice
- **Algorithm W** for Hindley-Milner type inference
- Proven, well-understood algorithm
- Efficient constraint generation and solving

### Type Representation
- Use Type ADT from types/environment.ts
- Structural typing for records
- Nominal typing for variants (by constructor name)

### Unification Strategy
- Occurs check to prevent infinite types
- Substitution threading through inference
- Early error reporting on unification failure

### Pattern Matching
- Exhaustiveness checking required (safety first)
- Matrix-based algorithm for coverage analysis
- Clear errors listing missing cases

### External Functions
- Integration with existing overload resolver
- Arity-based resolution at compile time
- Type checking after overload selection

### Error Messages
- Include source location with line/column
- Show expected vs actual types clearly
- Provide suggestions and hints
- Format types in readable way

## Success Criteria

The type checker implementation is complete when:

- ✅ All 10 phases implemented and tested
- ✅ All quality gates passed
- ✅ ≥200 tests passing with ≥90% coverage
- ✅ Primitive types inferred correctly
- ✅ Let-polymorphism works (polymorphic identity, map, compose)
- ✅ Pattern matching exhaustiveness enforced
- ✅ Algebraic data types fully supported (records, variants, generics)
- ✅ Overloaded externals resolve and type check
- ✅ Union types supported
- ✅ Clear, helpful error messages with locations
- ✅ Integration with desugarer complete
- ✅ Documentation complete with JSDoc and examples
- ✅ `npm run verify` passes completely

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
