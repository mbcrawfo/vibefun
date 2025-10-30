# Type Checker Implementation Context

**Created:** 2025-10-30
**Last Updated:** 2025-10-30

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

## Design Decisions to Make During Implementation

### Open Questions

1. **Empty List Type:**
   - How to handle `[]` without context?
   - Require annotation, or use type variable?

2. **Recursive Function Annotations:**
   - Always require annotation?
   - Or try to infer with fixed-point?

3. **Type Error Recovery:**
   - Stop at first error?
   - Or continue and report multiple errors?

4. **Mutually Recursive Functions:**
   - Support in Phase 4?
   - Or defer to later?

5. **Source Maps:**
   - Attach to typed AST?
   - Or keep separate?

6. **Type Schemes in AST:**
   - Attach inferred TypeScheme to nodes?
   - Or just concrete instantiated Type?

### Decisions Made (To Be Updated)

_This section will be updated as decisions are made during implementation._

## Integration Points

### Input: Desugarer Output

- Type checker receives `CoreModule` from desugarer
- Core AST has all syntactic sugar removed
- Single-parameter curried lambdas
- Match expressions (no if-then-else)
- Or-patterns already expanded

### Output: Typed Core AST

- Same CoreModule structure
- Each CoreExpr node has `inferredType: Type` field
- Type errors thrown during inference prevent output

### Next Phase: Optimizer (Future)

- Will receive typed Core AST
- Can use type information for optimizations
- Constant folding, dead code elimination
- Type-directed optimizations

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
- Focus on quality: no `any` types, comprehensive tests
- Follow functional style where appropriate
- Use classes for stateful components (InferenceContext, etc.)
- Update this document with decisions made during implementation
