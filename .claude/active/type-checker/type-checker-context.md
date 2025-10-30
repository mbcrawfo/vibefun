# Type Checker Implementation Context

**Created:** 2025-10-30
**Last Updated:** 2025-10-30 (Implementation Complete - Phase 10 Documentation)

## Purpose

This document captures key context, files, and design decisions for the type checker implementation.

## Key Files

### Existing Implementation

**Type System Definitions:**
- `packages/core/src/types/environment.ts` - Type, TypeScheme, TypeEnv, ValueBinding types

**Already Implemented (28 tests passing):**
- `packages/core/src/typechecker/environment.ts` - Environment building, overload grouping
- `packages/core/src/typechecker/resolver.ts` - Overload resolution (arity-based)
- `packages/core/src/typechecker/environment.test.ts` - 13 tests
- `packages/core/src/typechecker/resolver.test.ts` - 15 tests
- `packages/core/src/typechecker/index.ts` - Public exports

**Input (Desugarer Output):**
- `packages/core/src/types/core-ast.ts` - CoreModule, CoreExpr, CorePattern types
- Desugarer is COMPLETE (15/15 phases) - produces clean Core AST

**Design Documents:**
- `.claude/design/type-system.md` - Algorithm W, unification, type inference details
- `.claude/design/compiler-architecture.md` - Type checker phase in pipeline
- `vibefun-spec.md` - Language specification with type system requirements

**Related Code:**
- `packages/core/src/parser/` - Parser implementation (provides AST to desugarer)
- `packages/core/src/desugarer/` - Complete desugarer (provides input to type checker)
- `packages/core/src/lexer/` - Lexer implementation

### Files to Create

**Phase 1-2 (Foundation):**
- `packages/core/src/typechecker/types.ts` - Type utilities and representation
- `packages/core/src/typechecker/unify.ts` - Unification algorithm
- `packages/core/src/typechecker/builtins.ts` - Built-in types and stdlib

**Phase 3-7 (Inference):**
- `packages/core/src/typechecker/infer.ts` - Core inference engine (Algorithm W)
- `packages/core/src/typechecker/patterns.ts` - Pattern checking and exhaustiveness

**Phase 8-9 (Integration):**
- `packages/core/src/typechecker/errors.ts` - Error types and formatting
- `packages/core/src/typechecker/typechecker.ts` - Main entry point

**All Test Files:**
- `*.test.ts` for each implementation file

## Language Features Requiring Type Checking

### From vibefun-spec.md

**Primitive Types:**
- Int, Float, String, Bool, Unit
- All literals must infer correct primitive type

**Function Types:**
- Lambda expressions: `(x) => x + 1` should infer `(Int) -> Int`
- Curried functions: all lambdas are single-parameter after desugaring
- Higher-order functions: `map`, `filter`, `fold`
- Partial application must work correctly

**Algebraic Data Types:**
- **Records:** `{ name: "Alice", age: 30 }`
  - Structural typing (same fields = same type)
  - Field access: `person.name`
  - Immutable updates: `{ ...person, age: 31 }`
- **Variants:** `Some(42)`, `None`, `Cons(1, Nil)`
  - Constructors are functions
  - Generic variants: `Option<T>`, `List<T>`, `Result<T, E>`

**Pattern Matching:**
- Must type check all pattern types
- Must verify exhaustiveness (all cases covered)
- Pattern variables must have correct types in arm bodies
- All arms must return same type

**Let-Bindings:**
- Let-polymorphism: generalize at binding, instantiate at use
- Identity function usable at multiple types
- Recursive functions need special handling

**Union Types:**
- Type unions: `Int | String`
- Literal unions: `"pending" | "active" | "complete"`
- May need narrowing (future consideration)

**External Functions:**
- Single externals: trust declared type
- Overloaded externals: resolve by arity, then type check
- Use existing resolver.resolveCall()

**Type Annotations:**
- Optional: `let x: Int = 42`
- Must validate annotation matches inferred type

**Unsafe Blocks:**
- Trust external function types
- Still type check expressions inside block

## Algorithm W Overview

From `.claude/design/type-system.md`:

### Steps

1. **Generate Constraints:**
   - Walk the Core AST
   - For each expression, generate type constraints
   - Collect variable bindings and their types

2. **Unification:**
   - Solve type equations by unifying types
   - Build substitution mapping type variables to concrete types
   - Perform occurs check to prevent infinite types

3. **Instantiation:**
   - Replace quantified type variables with fresh variables
   - Happens when using polymorphic let-bound values

4. **Generalization:**
   - Find free type variables in inferred type
   - Quantify variables not free in environment
   - Create type scheme (∀α. T)

### Key Data Structures

**Type:**
```typescript
type Type =
    | { type: "Var"; id: number }           // Type variable α
    | Const"; name: string }          // Primitives: Int, String, etc.
    | { type: "Fun"; params: Type[]; return: Type }  // Function type
    | { type: "App"; constructor: Type; args: Type[] }  // List<Int>
    | { type: "Record"; fields: Map<string, Type> }
    | { type: "Variant"; constructors: Map<string, Type[]> }
    | { type: "Union"; types: Type[] }
```

**TypeScheme:**
```typescript
type TypeScheme = {
    vars: number[];  // Quantified variables [0, 1] for ∀α∀β
    type: Type;
}
```

**Substitution:**
```typescript
type Substitution = Map<number, Type>;  // Maps type var ID to Type
```

**Type Environment:**
```typescript
type TypeEnv = {
    values: Map<string, TypeScheme>;  // Variable bindings
    types: Map<string, TypeDef>;      // Type definitions
}
```

### Unification Rules

- `Int ~ Int` → success, empty substitution
- `α ~ T` → success, substitution [α → T] (if α not in T - occurs check)
- `T ~ α` → success, substitution [α → T] (if α not in T)
- `(T1) -> T2 ~ (T3) -> T4` → unify T1~T3, T2~T4, compose substitutions
- `List<T1> ~ List<T2>` → unify T1~T2
- `{x: T1, y: T2} ~ {x: T3, y: T4}` → unify T1~T3, T2~T4 (same fields required)
- Otherwise → unification failure

### Occurs Check

Prevent infinite types: `α cannot unify with List<α>`

Example:
```vibefun
let f = x => f(x)  // Would create α = α -> β (infinite type!)
```

The occurs check catches this and reports an error.

## Pattern Exhaustiveness Checking

From `.claude/design/type-system.md`:

### Matrix-Based Algorithm

1. Build matrix of patterns vs constructors
2. For each constructor of the scrutinee type:
   - Check if at least one pattern covers it
3. Wildcard/variable patterns cover all constructors
4. If any constructor uncovered → error

### Examples

**Exhaustive:**
```vibefun
match option {
    | Some(x) => x
    | None => 0
}
```
All constructors of Option<T> covered.

**Non-exhaustive:**
```vibefun
match option {
    | Some(x) => x
}
```
Missing None case → error: "Non-exhaustive pattern match. Missing cases: None"

**With Wildcard:**
```vibefun
match option {
    | Some(x) => x
    | _ => 0
}
```
Wildcard covers None → exhaustive.

## External Function Overloading

From `vibefun-spec.md` and existing `resolver.ts`:

### Existing Implementation

The overload resolver is already complete in `resolver.ts`:

**Resolution Algorithm:**
1. Check if function is overloaded (multiple externals with same name)
2. Filter candidates by arity (number of arguments provided)
3. If one match → use it
4. If zero matches → error: "No matching overload"
5. If multiple matches → error: "Ambiguous overload"

**Type Checking Integration:**
- After resolution, type check the call with resolved function's type
- Use standard application type checking (unify parameter types)

**Example:**
```vibefun
external fetch: (String) -> Promise<Response> = "fetch" from "global"
external fetch: (String, RequestInit) -> Promise<Response> = "fetch" from "global"

// Call with 1 arg:
fetch("https://api.com")  // Resolves to first overload

// Call with 2 args:
fetch("https://api.com", { method: "POST" })  // Resolves to second overload
```

### Type Checker Integration

In `inferExpr()` for `CoreApp`:
1. Check if function is external and overloaded
2. If yes, call `resolver.resolveCall(funcName, argCount, env)`
3. Use resolved function type for type checking
4. If resolution fails, report overload error

## Built-in Types to Include

From `vibefun-spec.md`:

### Primitives
- Int, Float, String, Bool, Unit

### Standard Library Types

**List<T>:**
```vibefun
type List<T> = Cons(head: T, tail: List<T>) | Nil
```
Constructors:
- `Cons: (T, List<T>) -> List<T>`
- `Nil: List<T>` (nullary constructor, but as function: `() -> List<T>`)

**Option<T>:**
```vibefun
type Option<T> = Some(T) | None
```
Constructors:
- `Some: (T) -> Option<T>`
- `None: Option<T>` (as function: `() -> Option<T>`)

**Result<T, E>:**
```vibefun
type Result<T, E> = Ok(T) | Err(E)
```
Constructors:
- `Ok: (T) -> Result<T, E>`
- `Err: (E) -> Result<T, E>`

### Standard Library Functions (Partial List)

**List Module:**
- `List.map: ((T) -> U, List<T>) -> List<U>`
- `List.filter: ((T) -> Bool, List<T>) -> List<T>`
- `List.fold: ((U, T) -> U, U, List<T>) -> U`
- `List.length: (List<T>) -> Int`
- `List.head: (List<T>) -> Option<T>`

**Option Module:**
- `Option.map: ((T) -> U, Option<T>) -> Option<U>`
- `Option.flatMap: ((T) -> Option<U>, Option<T>) -> Option<U>`
- `Option.getOrElse: (T, Option<T>) -> T`
- `Option.isSome: (Option<T>) -> Bool`

**Result Module:**
- `Result.map: ((T) -> U, Result<T, E>) -> Result<U, E>`
- `Result.mapErr: ((E) -> F, Result<T, E>) -> Result<T, F>`
- `Result.flatMap: ((T) -> Result<U, E>, Result<T, E>) -> Result<U, E>`

**String Module:**
- `String.length: (String) -> Int`
- `String.concat: (String, String) -> String`
- `String.toUpperCase: (String) -> String`

## Error Message Requirements

From `.claude/design/type-system.md` and general best practices:

### Error Types

1. **Type Mismatch:**
```
Type mismatch at line 10, column 5:
  Expected: Int
  Actual:   String

In expression: x + "hello"
```

2. **Undefined Variable:**
```
Undefined variable 'foo' at line 15, column 8

Did you mean 'bar'?
```

3. **Non-exhaustive Pattern Match:**
```
Non-exhaustive pattern match at line 20, column 3

Missing cases:
  - None
  - Some(_)

Consider adding:
  | _ => defaultValue
```

4. **Occurs Check:**
```
Cannot construct infinite type at line 25, column 10:
  α = List<α>

This would create an infinite type. Consider adding a type annotation.
```

5. **Overload Resolution:**
```
No matching overload for 'fetch' with 3 arguments at line 30, column 5

Available overloads:
  - fetch: (String) -> Promise<Response>
  - fetch: (String, RequestInit) -> Promise<Response>
```

### Formatting Requirements

- Include source location (line, column)
- Show expected vs actual types clearly
- Use readable type formatting (not internal representation)
- Provide suggestions when possible
- Show source context (the actual code line)

## Testing Strategy

### Unit Tests (Per Module)

**types.ts:**
- Type construction functions
- Type equality checks
- Type formatting (typeToString)

**unify.ts:**
- Primitive type unification
- Function type unification
- Record/variant unification
- Type variable unification
- Occurs check
- Substitution composition

**builtins.ts:**
- All built-in types present
- Correct type schemes for constructors
- Standard library function signatures

**infer.ts:**
- Literal inference
- Variable lookup
- Lambda inference
- Application inference
- Let-binding with generalization
- Each CoreExpr type
- Each operator type

**patterns.ts:**
- Each pattern type inference
- Exhaustiveness checking (positive and negative cases)
- Pattern variable bindings

**errors.ts:**
- Error message formatting
- Type formatting in errors
- Suggestion generation

**typechecker.ts:**
- End-to-end type checking
- Integration with desugarer
- Complete programs

### Integration Tests

Test complete programs combining multiple features:
- Polymorphic list operations
- Pattern matching with ADTs
- Recursive functions with patterns
- External functions with overloads
- Real-world examples from spec

### Edge Cases

- Empty lists (need context type)
- Ambiguous recursive functions (need annotation)
- Type variables escaping scope
- Very deeply nested types
- Large pattern matches
- Mutually recursive functions
- Generic variant constructors (Nil, None)

## Design Decisions Made

**Updated:** 2025-10-30 (After plan review, Core AST analysis, and final design decisions)

### 1. What's Desugared vs Core AST

**Decision:** Type checker only handles Core AST constructs. The following are desugared:
- Multi-parameter lambdas → curried single-param
- Pipe operator (`|>`) → function applications
- Composition (`>>`, `<<`) → lambda compositions
- If-then-else → match on boolean
- Block expressions → nested let bindings
- List literals/cons (`::`) → Cons/Nil variants
- Or-patterns → multiple match cases
- Record update spread → explicit field copying

**Rationale:** Simplifies type checker, reduces duplication. Desugarer already handles this.

**Reference:** Core AST documentation (`packages/core/src/types/core-ast.ts`)

### 2. Mutable References with Full Syntactic Value Restriction

**Decision:** Full support for mutable references with full syntactic value restriction

**Implementation:**
- Add `Ref<T>` type constructor
- `RefAssign` operator (`:=`): requires `Ref<T>` on left, `T` on right, returns `Unit`
- `Deref` operator (`!`): requires `Ref<T>`, returns `T`
- **Full syntactic value restriction**: Only syntactic values can be generalized
  - Syntactic values: variables, lambdas, literals, constructors
  - Non-values: function applications, match expressions, etc.
- Prevents unsound polymorphism with effects and mutable state
- Aligns with OCaml/SML semantics

**Rationale:**
- Core language feature for pragmatic functional programming
- Full value restriction is more principled and future-proof
- Automatically handles any future effect system
- Matches "similar to OCaml" philosophy

**Phase:** Added as Phase 2.5 (5-7 hours, 25+ tests)

### 3. Operator Type Checking Strategy

**Decision:** Type-directed specialization (no overloading)

**Arithmetic operators (`+`, `-`, `*`, `/`, `%`):**
- Both operands must unify to same type
- Type must be Int or Float (checked after unification)
- Result is same type as operands
- Cannot mix Int and Float (require explicit conversion)

**Rationale:** Simple, no need for type classes. Avoids overload complexity.

**Alternative considered:** Ad-hoc overloading (rejected - more complex, not in spec)

### 4. Empty Collections (Nil, None)

**Decision:** Fresh type variables with standard Hindley-Milner behavior

**Strategy:**
- `Nil` gets instantiated as `List<'a>` where `'a` is fresh
- `None` gets instantiated as `Option<'a>` where `'a` is fresh
- Type variable unified with context or generalized

**Example:**
```vibefun
let empty = Nil              // Type: forall a. List<a>
let list = [None, Some(42)]  // Type: List<Option<Int>>
                              // None's 'a unified with Int
```

**Rationale:** Standard ML behavior. Inference handles this naturally.

### 5. Pattern Guards

**Decision:** Full support in type checker (present in Core AST)

**Implementation:**
- CoreMatchCase has optional `guard: CoreExpr`
- Guard must type check as `Bool`
- Pattern bindings are in scope for guard
- Guard evaluated after pattern matches

**Rationale:** Present in Core AST, required by language spec.

**Phase:** Added to Phase 6 (included in 7-9 hour estimate)

### 6. Recursive Type Definitions

**Decision:** Two-pass approach for type definitions

**Strategy:**
- **First pass:** Add type constructors to environment
- **Second pass:** Check type definitions
- Supports self-recursive types (`List<T> = Cons(T, List<T>) | Nil`)
- Supports mutually recursive types (`Tree`/`Forest`)

**Rationale:** Standard approach, handles all recursion cases.

**Phase:** Integrated into Phase 5 (6-7 hours)

### 7. Never Type

**Decision:** Add Never type as bottom type

**Implementation:**
- `Never` type in Type ADT
- Unifies with any type (always succeeds)
- Used for `panic: (String) -> Never`
- Enables type-safe non-returning functions

**Rationale:** Present in spec, semantically correct, enables panic.

**Phase:** Added to Phase 1 and Phase 2

### 8. Error Strategy

**Decision:** Stop at first error initially

**Strategy:**
- Throw TypeCheckerError on first type error
- No error recovery in initial implementation
- Can enhance later to collect multiple errors (Phase 11)

**Rationale:** Simpler to implement, get working sooner. Error recovery is complex.

**Future:** Can add multiple error collection as enhancement.

### 9. Module System

**Decision:** Trust imports, infer exports, disallow cycles (initial)

**Strategy:**
- **Imports:** Trust declared types (don't load/verify modules yet)
- **Exports:** Infer types and attach to declarations
- **Cycles:** Disallow cyclic imports (error if detected)
- **Re-exports:** Type check transitively

**Rationale:** Simple, gets type checker working. Module loading can be added later.

**Future:** Load and verify imported modules for full soundness.

### 10. Literal Types (FINAL DECISION)

**Decision:** NOT SUPPORTED - Documented as known limitation

**Investigation Results:**
- Parser CANNOT parse literal type syntax like `type Status = "pending" | "active"`
- No `TypeLiteral` variant in Surface AST or Core AST
- Spec shows literal types but implementation doesn't support them
- This is a **spec-implementation gap**

**Workaround:**
- Use variants instead: `type Status = Pending | Active | Complete`

**Future Enhancement:**
- Requires updates to: lexer, parser, AST, desugarer, AND type checker
- Outside type checker scope

**Rationale:** Cannot implement without parser changes. Document limitation and provide workaround.

**Phase:** Removed from Phase 7 implementation tasks

### 11. Mutually Recursive Functions (FINALIZED)

**Decision:** Supported with `and` keyword (OCaml/F# style)

**Syntax:** `let rec f = ... and g = ...`

**Strategy:**
- Parser must support `and` keyword
- Bind all names with fresh type variables BEFORE inferring any values
- Infer types for entire mutual group together
- Generalize all bindings at end of group
- Type checker handles mutual groups in Phase 4b

**Rationale:** Explicit syntax makes intent clear, follows well-understood precedent from OCaml/F#.

**Phase:** Added Phase 4b (4-5 hours, 20+ tests)

### 19. Algorithm W Approach (FINALIZED)

**Decision:** Constraint-based (lazy) inference

**Strategy:**
- Generate constraints during AST traversal
- Solve constraints after generation
- More flexible than direct unification

**Rationale:** Better for future features (type classes, GADTs), better error messages possible, more modular.

**Phase:** Affects Phase 3 - adds constraint solver

### 20. Type Variable Scoping with Levels (FINALIZED)

**Decision:** Standard ML approach with lexical levels

**Strategy:**
- Track level for each type variable
- Increment level when entering let-bindings
- Generalize only variables at current level or deeper
- Filter out variables with level > current level (escape check)

**Rationale:** Sound, prevents type variable escape, aligns with OCaml/SML semantics.

**Example that fails:** `let f = () => ref(None)` where type var would escape

**Phase:** Integrated into Phase 1 (type vars have levels) and Phase 4 (level-based generalization)

### 21. Width Subtyping for Records (FINALIZED)

**Decision:** Width subtyping (permissive) - records with extra fields are subtypes

**Rule:** `{x: Int, y: Int, z: Int} <: {x: Int, y: Int}` is valid

**Strategy:**
- When checking record type compatibility, allow extra fields
- Record with MORE fields can be used where fewer expected
- Duck-typing-like flexibility with compile-time safety

**Rationale:** Provides flexibility similar to structural typing in TypeScript, allows functions to accept "at least these fields"

**Phase:** Integrated into Phase 5 unification

### 22. Nominal Typing for Variants (FINALIZED)

**Decision:** Nominal typing - exact type name matching required

**Rule:** `type A = X | Y` ≠ `type B = X | Y` (different types)

**Strategy:**
- Check type name equality for variant types
- Two variant types with same constructors are DIFFERENT if names differ
- Prevents accidental mixing

**Rationale:** Most sound approach, prevents confusion between semantically different types, standard ML-family behavior

**Phase:** Integrated into Phase 5 variant type checking

### 12. Type Schemes in AST

**Decision:** Attach instantiated Type to expression nodes

**Strategy:**
- Each CoreExpr gets `inferredType: Type` field
- Type is the instantiated type (not scheme)
- Type schemes stored in environment for let-bound values

**Rationale:** Simpler for code generator. Schemes only needed during type checking.

### 13. Source Maps

**Decision:** Preserve Location information, source maps in later phase

**Strategy:**
- All AST nodes have Location information
- Type checker preserves locations
- Source map generation handled by code generator

**Rationale:** Type checker doesn't need source maps. Locations sufficient for errors.

### 14. Recursive Flag in Let-Bindings (FINAL)

**Decision:** Use `recursive: boolean` flag in CoreLet/CoreLetDecl

**Investigation Results:**
- Core AST has `recursive: boolean` field in both CoreLet and CoreLetDecl
- When `recursive === true`, bind name in environment BEFORE type checking value
- Enables self-referential functions (factorial, fibonacci, etc.)

**Implementation:**
- Check flag during let-binding inference
- If recursive, add binding to env with fresh type var before inferring value
- After inference, unify and generalize

**Rationale:** Present in Core AST. Required for recursive functions.

**Phase:** Integrated into Phase 4

### 15. External Type Declarations (FINAL)

**Decision:** Full support for CoreExternalTypeDecl

**Investigation Results:**
- Core AST has `CoreExternalTypeDecl` with `name`, `typeExpr`, `exported` fields
- Desugarer expands external blocks into individual external type declarations
- Represent JavaScript types imported into vibefun's type system

**Implementation:**
- Register external types as type aliases in environment
- Convert CoreTypeExpr to internal Type representation
- Make available for use in type annotations

**Rationale:** Present in Core AST. Required for JavaScript interop.

**Phase:** Integrated into Phase 5

### 16. Standard Library Phasing Strategy (FINAL)

**Decision:** 17 core functions in Phase 2, remaining 29 in Phase 7

**Phase 2 Core (17 functions):**
- List: map, filter, fold, length (4)
- Option: map, flatMap, getOrElse (3)
- Result: map, flatMap, isOk (3)
- String: length, concat, fromInt (3)
- Int: toString, toFloat (2)
- Float: toString, toInt (2)

**Phase 7 Complete (29 functions):**
- List: foldRight, head, tail, reverse, concat, flatten (5)
- Option: isSome, isNone, unwrap (3)
- Result: mapErr, isErr, unwrap, unwrapOr (4)
- String: toUpperCase, toLowerCase, trim, split, contains, startsWith, endsWith, fromFloat, toInt, toFloat (10)
- Int: abs, max, min (3)
- Float: round, floor, ceil, abs (4)

**Rationale:** Keeps Phase 2 focused on essentials, allows faster progress to core inference.

### 17. Union Type Narrowing (FINAL)

**Decision:** Variant-based narrowing only

**Investigation Results:**
- Pattern type annotations (`| n: Int =>`) do NOT exist in language syntax
- Not in Surface AST or Core AST
- Cannot discriminate primitive unions (Int | String) without syntax extensions

**Supported:**
- Variant unions work fine: Option, Result, custom variants
- Pattern matching on constructors narrows types naturally

**Not Supported:**
- Primitive unions (Int | String) cannot be narrowed
- Would require type-testing patterns or pattern type annotations

**Workaround:** Use variant wrappers for discrimination

**Rationale:** Cannot implement without language syntax extensions.

**Phase:** Clarified in Phase 7 documentation

### 18. Promise Type Handling (FINAL)

**Decision:** External type (user declares when needed)

**Approach:**
```vibefun
external {
    type Promise<T> = { then: ((T) -> Unit) -> Promise<Unit> }
    fetch: (String) -> Promise<Response> = "fetch"
}
```

**Not Built-in:** Avoids premature async/await design decisions

**Rationale:** Most pragmatic approach. Let users define Promise structure for their use case.

**Future:** May become built-in if async/await added to language

## Open Questions (Remaining)

These will be resolved during implementation:

1. ~~**Mutually recursive functions**~~: **RESOLVED** - Supported with `and` keyword (Phase 4b)
2. ~~**Algorithm approach**~~: **RESOLVED** - Constraint-based (lazy)
3. ~~**Type variable scoping**~~: **RESOLVED** - Standard ML levels
4. ~~**Record subtyping**~~: **RESOLVED** - Width subtyping (permissive)
5. ~~**Variant typing**~~: **RESOLVED** - Nominal (exact name matching)
6. **Exhaustiveness warnings:** Just error or also warn for unreachable patterns? (Phase 6) - To be decided during implementation

**All major design decisions have been finalized!**

## Integration Points

### Input: Desugarer Output

- Type checker receives `CoreModule` from desugarer
- Core AST has all syntactic sugar removed
- Single-parameter curried lambdas
- Match expressions (no if-then-else)
- Or-patterns already expanded
- **CoreExternalTypeDecl present** for external type declarations
- **Pattern type annotations NOT present** (not in language syntax)
- **Literal types NOT present** (parser doesn't support them)

### Output: Typed Core AST

- Same CoreModule structure
- Each CoreExpr node has `inferredType: Type` field
- Type errors thrown during inference prevent output

### Next Phase: Optimizer (Future)

- Will receive typed Core AST
- Can use type information for optimizations
- Constant folding, dead code elimination
- Type-directed optimizations

## Known Limitations

These features are NOT supported in the initial type checker implementation:

### 1. Literal Types ❌
- **Issue**: Parser does not support literal type syntax like `type Status = "pending" | "active"`
- **Workaround**: Use variants: `type Status = Pending | Active | Complete`
- **Future**: Requires parser, AST, desugarer, and type checker changes

### 2. Primitive Union Narrowing ❌
- **Issue**: Cannot discriminate primitive unions like `Int | String` in pattern matching
- **Reason**: Pattern type annotations don't exist in language
- **Supported**: Variant unions work (Option, Result, custom variants)
- **Workaround**: Use variant wrappers
- **Future**: Requires language syntax extension for type-testing patterns

### 3. Pattern Type Annotations ❌
- **Issue**: Syntax like `match x { | n: Int => ... }` not supported
- **Reason**: Not in Surface AST or Core AST
- **Impact**: Limits union type narrowing
- **Future**: Requires parser and AST changes

### 4. Promise as Built-in Type ℹ️
- **Approach**: Promise is external type (user declares when needed)
- **Reason**: Avoids premature async/await design
- **Future**: May become built-in if async/await added

### 5. Module Import Verification ⚠️
- **Current**: Trust imported types without verification
- **Impact**: Cannot detect if imported type doesn't exist or mismatches
- **Future**: Load and verify imported modules for full soundness

## Performance Considerations

From `.claude/design/type-system.md`:

- Unification is O(n) in type size
- Algorithm W is roughly O(n²) in expression size (worst case)
- Should be fast enough for most programs
- If performance issues arise, can optimize:
  - Use union-find for unification
  - Cache type schemes
  - Incremental type checking

For initial implementation: **focus on correctness over performance**.

## References

### Design Documents
- `.claude/design/type-system.md` - Complete Algorithm W specification
- `.claude/design/compiler-architecture.md` - Compiler pipeline
- `.claude/design/language-design.md` - Language design decisions

### Language Specification
- `vibefun-spec.md` - Complete language reference

### Academic References (for Algorithm W)
- "Principal Type-Schemes for Functional Programs" - Damas & Milner
- "Types and Programming Languages" - Benjamin Pierce
- "The Implementation of Functional Programming Languages" - Simon Peyton Jones

### Code Standards
- `.claude/CODING_STANDARDS.md` - TypeScript style, testing requirements
- `.claude/DOCUMENTATION_RULES.md` - Documentation guidelines

## Notes

- All existing tests (28) must continue passing
- Each new phase adds tests incrementally
- **Total target: 275+ tests** (updated from 230+)
- **Total phases: 11** (added Phase 4b for mutually recursive functions)
- Focus on quality: no `any` types, comprehensive tests
- Follow functional style where appropriate
- Use classes for stateful components (InferenceContext, etc.)
- **All major design decisions finalized** - see decisions 1-22 above
- Known limitations documented - see Known Limitations section
- Update this document with any additional decisions made during implementation

## Final Design Decisions Summary (2025-10-30)

1. ✅ **Constraint-based inference** (lazy approach)
2. ✅ **Type variable scoping with levels** (Standard ML)
3. ✅ **Mutually recursive functions** with `and` keyword (OCaml/F# style)
4. ✅ **Width subtyping for records** (duck-typing-like)
5. ✅ **Nominal typing for variants** (exact name matching)

These decisions are final and implementation should proceed based on them.
