# Specification Improvement: Code Generation & Compilation

**Last Updated:** 2025-11-03
**Status:** In Progress

## Goal

Improve the vibefun language specification to provide sufficient detail for compiler implementation, focusing on code generation and compilation semantics.

## Approach

- **Incremental by Section**: Complete one specification section at a time
- **Specification Only**: Define behavior and semantics without prescribing implementation
- **Implementation-Defined Limits**: Leave practical limits to compiler discretion
- **Priority**: Code Generation & Compilation first

## Phase 1: Code Generation Core Semantics (Current)

**Create: `docs/spec/11-compilation/code-generation.md`**

Document how language constructs map to JavaScript semantics:

1. **Value Representations**
   - Primitive types (Int → number, String → string, etc.)
   - Records (structural typing, field access, update semantics)
   - Variants (constructor representation, tag semantics, pattern matching requirements)
   - Lists (cons structure, empty list, pattern matching)
   - Tuples (arity preservation, element access)
   - Refs (mutable cell semantics, boxing requirements)

2. **Function Compilation**
   - Currying behavior (partial application semantics)
   - Calling conventions (arity checking, argument forwarding)
   - Closure capture (variable binding, scope preservation)
   - Recursive function semantics (let rec behavior)

3. **Pattern Matching Compilation**
   - Match expression semantics (evaluation order, exhaustiveness)
   - Pattern binding guarantees
   - Guard evaluation order
   - Unreachable pattern handling

4. **Name Resolution**
   - Identifier mapping rules (valid JS identifiers, collision avoidance)
   - Module name mapping
   - Constructor disambiguation
   - Reserved name handling

## Phase 2: Expression Evaluation Semantics

**Update: `docs/spec/04-expressions/` files**

1. **Evaluation Order** (`evaluation-order.md` - new file)
   - Function argument evaluation (left-to-right guarantee)
   - Record field evaluation order
   - List construction evaluation
   - Spread operator evaluation
   - Side effect sequencing

2. **Operator Semantics** (update existing files)
   - Chained comparison behavior
   - Logical operator short-circuiting (explicit guarantees)
   - Arithmetic overflow/underflow behavior
   - Division by zero (runtime vs compile-time)
   - String concatenation type enforcement

## Phase 3: Module System Runtime Behavior

**Update: `docs/spec/08-modules/module-system.md`**

1. **Module Initialization**
   - Top-level expression evaluation order
   - Error propagation during initialization
   - Circular dependency runtime behavior (detection vs resolution)
   - Re-export semantics

2. **Import Resolution**
   - Path resolution algorithm
   - Caching behavior
   - Hot reload semantics (future)

## Phase 4: Type System Compilation Semantics

**Update: `docs/spec/03-type-system/` files**

1. **Type Erasure**
   - What type information is preserved at runtime
   - Runtime type checking modes
   - Type coercion boundaries (external functions)

2. **Edge Cases**
   - Empty records `{}` semantics
   - Empty variants behavior
   - Duplicate field names (compile error spec)
   - Type inference failure modes (when to require annotations)

## Phase 5: Standard Library Specifications

**Create detailed docs for each stdlib module**

For List, Option, Result, String, Int, Float modules:
- Complete type signatures
- Precise behavior specifications
- Error conditions
- Edge cases (empty lists, None values, division by zero)
- Usage examples

## Success Criteria

After Phase 1-4:
- A compiler implementer can generate correct JavaScript without ambiguity
- All evaluation order is specified where it matters for correctness
- Type erasure and runtime semantics are clear
- Edge cases have defined behavior

## Notes

- Focus on "what" not "how" (specification, not implementation)
- Document semantic guarantees, not optimization strategies
- Leave performance characteristics unspecified unless semantically important
- Mark implementation-defined limits clearly
