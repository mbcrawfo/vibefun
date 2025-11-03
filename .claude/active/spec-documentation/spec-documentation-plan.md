# Comprehensive Vibefun Specification Documentation Plan

**Created:** 2025-11-03
**Status:** In Progress

## Overview
Address all 14 identified documentation gaps systematically, making design decisions where behavior is undefined, updating vibefun-spec.md, and creating a new compiler-implementation-guide.md.

## Phase 1: Critical Compiler Foundations
**Update vibefun-spec.md:**
- Complete operator precedence table (add `>>`, `<<`, `...`, clarify all precedences)
- Define operator associativity and ambiguity resolution (unary minus, field access)
- Specify type variable syntax (explicit `<T>` vs implicit `'a`, when each is used)
- Document function type representation (curried vs uncurried, internal vs surface syntax)
- Define value restriction rules with examples (what expressions can be generalized)
- Clarify semicolon insertion rules (when newlines are significant)
- Specify module resolution algorithm (path resolution, file extensions, circular deps)

## Phase 2: Type System Formalism
**Update vibefun-spec.md:**
- Document recursive type definitions and mutual recursion
- Clarify type aliases (transparent vs nominal, recursive aliases)
- Define union types semantics (first-class status, inference rules, pattern matching)
- Specify generic type parameter rules (explicit vs inferred, constraints)
- Document width subtyping implementation details for records
- Define Ref<T> equality semantics (identity vs value, aliasing rules)
- Add value restriction examples for all edge cases

## Phase 3: Expression Semantics
**Update vibefun-spec.md:**
- Block expressions (empty blocks, side-effect-only blocks, scoping rules)
- If expressions (omitted else clause, multi-way if, type rules)
- List expressions (empty list type, spread positions, cons operator details)
- Record operations (update semantics, spread order, multiple spreads)
- Lambda expressions (annotations, destructuring parameters)
- Operator sections (if supported: `(+)`, `(+ 1)`)
- Pipe operator associativity and precedence

## Phase 4: Pattern Matching Completeness
**Update vibefun-spec.md:**
- Or-patterns (variable binding rules, nesting, type checking)
- Nested patterns (depth limits, record-in-variant, list-in-variant)
- Record patterns (spread patterns, partial matching, width subtyping)
- List patterns (multiple spreads, empty vs wildcard)
- Guards (variable scope, expression restrictions, evaluation order)
- Pattern type annotations (syntax, inference interaction)
- Missing pattern forms (as-patterns if desired, tuple patterns if applicable)
- Exhaustiveness checking algorithm description

## Phase 5: JavaScript Interop Details
**Update vibefun-spec.md:**
- External function generic declarations
- Overloaded externals (return type differences, curried overloads, partial application)
- Unsafe block nesting and restrictions
- Type safety at FFI boundaries (runtime checks, error handling)
- Calling Vibefun from JS (type representations, constructing ADTs)
- String concatenation operator type rules and error messages

## Phase 6: Standard Library & Compilation
**Update vibefun-spec.md:**
- Complete standard library documentation (all modules, all functions)
- Document missing modules (Array, Map, Set, Math, JSON, Async if applicable)
- Define error handling semantics (panic, division by zero, overflow)
- Specify lexical details (number separators, string escapes, multi-line strings)
- Document desugaring transformations (surface to core syntax mappings)

## Phase 7: Create Compiler Implementation Guide
**Create new file: compiler-implementation-guide.md:**
- JavaScript compilation strategies (variant representation, pattern matching compilation)
- Curried function compilation (nested functions vs arity checking)
- Record and type representation in JS
- Source map generation details
- Runtime type checking implementation (for each mode)
- Optimization opportunities (constant folding, dead code, tail calls if possible)
- Error message guidelines with examples
- AST specifications (surface AST and core AST)
- Type inference algorithm details (Algorithm W implementation)
- Pattern exhaustiveness checking algorithm

## Phase 8: Review & Validation
- Cross-check all sections for consistency
- Ensure all examples are syntactically correct
- Verify no contradictions between sections
- Confirm all design decisions are documented
- Run through the spec as if implementing a compiler to find remaining gaps

## Deliverables
1. **vibefun-spec.md** - Enhanced with complete language semantics, all ambiguities resolved
2. **compiler-implementation-guide.md** - New technical reference for compiler implementers
3. **Updated CLAUDE.md** - Document key design decisions made during this process

## User Decisions
- Priority: Everything - comprehensive specification
- Approach: Make design decisions where needed
- Structure: Both spec updates + implementation notes
