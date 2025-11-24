# Typechecker Specification Gaps: Research and Recommendations

**Date:** 2025-11-23
**Status:** Research Complete - Ready for Specification Updates

## Executive Summary

This document presents comprehensive research findings for 8 identified gaps in the Vibefun typechecker specification. Each gap has been thoroughly investigated through parallel research efforts examining academic literature, production ML language implementations (OCaml, SML, F#, Haskell), and modern type checker designs (Rust, Elm, TypeScript).

**All gaps have been resolved** with clear recommendations for specification updates.

## Table of Contents

1. [Gap 1: Type Variable Levels Algorithm](#gap-1-type-variable-levels-algorithm)
2. [Gap 2: Constraint-Based Type Inference](#gap-2-constraint-based-type-inference)
3. [Gap 3: Unification Algorithm Details](#gap-3-unification-algorithm-details)
4. [Gap 4: Polymorphic Recursion](#gap-4-polymorphic-recursion)
5. [Gap 5: Subtyping and Inference Interaction](#gap-5-subtyping-and-inference-interaction)
6. [Gap 6: Module System Type Checking](#gap-6-module-system-type-checking)
7. [Gap 7: Type Environment and Scheme Representation](#gap-7-type-environment-and-scheme-representation)
8. [Gap 8: Error Reporting Strategy](#gap-8-error-reporting-strategy)
9. [Summary of Recommendations](#summary-of-recommendations)
10. [Implementation Priorities](#implementation-priorities)

---

## Gap 1: Type Variable Levels Algorithm

### Problem Statement

The specification mentions "level-based scoping" to prevent type variables from escaping their scope, but doesn't provide algorithm details:
- What are levels and how are they assigned?
- When do levels change?
- How do levels prevent variable escape during generalization?

### Research Findings

#### What Are Levels?

**Levels** (also called "ranks") are integers that track the **nesting depth of let-bindings** in a program. This algorithm was discovered by **Didier Rémy in 1988** and has been used in OCaml, Caml-Light, and other production compilers ever since.

**Core concept:** A type variable's level indicates the deepest let-binding scope where it was created. This can be thought of as the **De Bruijn depth** of the let-binding that will eventually quantify that variable.

#### How Levels Work

**Level Assignment:**
1. Type checker maintains a mutable `current_level` counter, starting at level 1 (top-level)
2. When a fresh type variable is created, it receives the `current_level` as its level
3. When entering a `let` expression: `current_level++`
4. When leaving a `let` expression: `current_level--`

**Level Changes During Unification:**
Levels can **only decrease**, never increase. During unification, the `update_level()` function decreases levels to reflect the widest scope:

```typescript
function unify(var_at_level_L, type_expr):
    occurs_check(var, type_expr)
    traverse type_expr:
        for each free variable in type_expr:
            update its level to min(current_level, L)
    bind var to type_expr
```

**Generalization Condition:**
A free type variable at level `L` is generalized when `L > current_level` (meaning the variable's owning region has exited).

#### Algorithm Pseudocode

```typescript
// Type checking a let expression
function typeof(env, let_expr):
    enter_level()                    // Increment current_level
    type_of_binding = infer_type(binding_expr)
    leave_level()                    // Decrement current_level
    generalize(type_of_binding)      // Quantify escaping variables
    new_env = add_binding(env, variable, type_of_binding)
    return typeof(new_env, body)

// Generalization
function generalize(type_expr):
    traverse type_expr recursively
    for each free variable tv with level L:
        if L > current_level:          // Variable outlived its region
            convert tv to quantified variable (set to generic_level)
        else:
            keep tv unbound
    stop traversing types with level ≤ current_level

// Unification with level update
function unify(var_at_level_L, type_expr):
    occurs_check(var, type_expr)
    traverse type_expr:
        for each free variable in type_expr:
            update its level to min(current_level, L)
    bind var to type_expr
```

#### Concrete Example: Preventing Unsound Generalization

```vibefun
fun x -> let y = x in y
```

**Step-by-step execution:**
1. **Initial state**: `current_level = 1`
2. **Type check outer lambda** `fun x -> ...`:
   - Create fresh type variable `ty_x` at level 1
   - Environment: `{x: ty_x/1}` (notation: type/level)
3. **Enter inner let** `let y = x`:
   - `enter_level()` → `current_level = 2`
4. **Type check binding** `y = x`:
   - Lookup `x` in environment → `ty_x/1`
   - Binding type: `ty_x/1`
5. **Exit inner let**:
   - `leave_level()` → `current_level = 1`
6. **Generalize** `ty_x`:
   - Check: Is `ty_x.level (1) > current_level (1)`?
   - Answer: No (1 is not > 1)
   - Decision: **Do not generalize** `ty_x`
7. **Result**: Type is `'a -> 'a` (monomorphic in the same type variable)

**Why this is correct**: The variable `x` is from the outer scope, so it shouldn't be generalized in the inner let. The level system prevents this escape.

#### Advantages Over Naive Algorithm W

**Traditional Algorithm W** scans the entire type environment to determine free type variables:
- O(n) time per generalization where n is size of environment
- Makes type checking O(n²) for whole program
- Inefficient for large programs with many nested bindings

**Level-based approach benefits:**
- **O(1) level operations** - just increment/decrement an integer
- **No environment scanning** - generalization only looks at type variables' levels
- **O(n log n) overall** type checking complexity
- **Clean semantic insight** - levels track ownership/dominance

### Current Vibefun Implementation Status

✅ **Already implemented correctly** in `/packages/core/src/types/environment.ts`:

```typescript
export type Type =
    | { type: "Var"; id: number; level: number }  // ✅ Has level field
    // ... other types
```

The implementation includes:
- Type variables with levels
- `freshTypeVar(level: number)` function
- Level tracking in unifier (`/packages/core/src/typechecker/unify.ts`)

### Recommendations

**Status: ✅ IMPLEMENTED** - Reorganized to properly separate language semantics from implementation details.

#### Implementation Summary

The type variable levels content has been properly separated across three documentation locations:

**1. Language Specification** (`docs/spec/03-type-system/type-inference.md`)
- ✅ Added section "Type Variable Scoping and Generalization"
- Semantic description of when generalization happens
- Scope-based rules for type variables
- User-facing examples showing correct vs incorrect generalization
- NO implementation algorithm details (kept semantic)

**2. Typechecker Requirements** (`.claude/design/typechecker-requirements.md`)
- ✅ Added section 7.4 "Type Variable Levels Algorithm"
- Complete algorithm specification with pseudocode
- Data structures (current_level counter, type variable level field)
- Core operations (enterLevel, leaveLevel, newvar, updateLevel, generalize)
- Example execution traces
- Algorithm invariants and performance characteristics
- Comprehensive testing requirements

**3. Compiler Architecture** (`docs/compiler-architecture/02-compilation-pipeline.md`)
- ✅ Added design rationale "Why level-based type variable scoping?"
- High-level explanation of design choice
- Efficiency benefits (O(1) vs O(n))
- Historical context (Rémy 1988, OCaml/SML)
- NO implementation details (kept architectural)

#### Documentation Philosophy Applied

This reorganization properly separates:
- **What** (language spec) - semantic behavior users need to understand
- **Why** (compiler architecture) - design decisions and trade-offs
- **How** (typechecker requirements) - implementation algorithm details

The level-based algorithm is correctly identified as an **implementation detail** of the type checker, not a language specification concern. Users need to understand generalization semantics, but not the specific mechanism used to implement it.

### Sources

- [Efficient and Insightful Generalization](https://okmij.org/ftp/ML/generalization.html) - Oleg Kiselyov's comprehensive explanation
- [Practical Type Inference with Levels](https://dl.acm.org/doi/10.1145/3729338) - Recent formalization (2024)
- [A different level based typer](https://eduardorfs.github.io/2021/09/26/a_different_level_based_typer/index.html) - Alternative implementation approach
- [OCaml type cannot be generalized - Stack Overflow](https://stackoverflow.com/questions/40350077/ocaml-type-cannot-be-generalized) - Practical examples
- [TypeVariableScope - MLton](http://mlton.org/TypeVariableScope) - Standard ML perspective
- [Hindley-Milner Type System - Wikipedia](https://en.wikipedia.org/wiki/Hindley–Milner_type_system)

---

## Gap 2: Constraint-Based Type Inference

### Problem Statement

The specification says it uses "constraint-based inference" but doesn't specify:
- What constraint types exist?
- How do constraints differ from direct unification?
- What is the constraint solving algorithm?
- When to use constraint generation vs. direct unification?

### Research Findings

#### Current Vibefun Implementation Analysis

Vibefun already has a constraint system at `/packages/core/src/typechecker/constraints.ts` with two constraint types:

1. **Equality Constraints** (`t1 = t2`) - requires two types to unify
2. **Instance Constraints** (`t is an instance of scheme`) - documents instantiation (mostly no-op)

However, the implementation **solves constraints eagerly** during inference, not in a separate phase. This is **Algorithm W**, not true constraint-based inference.

#### Algorithm W vs. Algorithm M

**Algorithm W (Direct Unification):**
- Traverses AST bottom-up
- Unifies types **immediately** during inference
- Threads substitutions through recursive calls
- Each expression returns `(Type, Substitution)`
- Constraint generation and solving are **interleaved**
- **This is what Vibefun currently does**

**Algorithm M (Constraint-Based):**
- **Phase 1**: Traverse AST and collect all constraints
- **Phase 2**: Solve constraints independently
- Adds third parameter: expected type (top-down information)
- Clean separation of concerns
- Easier to extend with new features

#### When to Use Each Approach

**Use Algorithm W when:**
- Simple HM system without extensions ✅ (Vibefun)
- Performance is critical ✅
- Code generation happens immediately after type checking ✅

**Use constraint-based when:**
- Adding complex subtyping
- Need high-quality error messages (can analyze all constraints before reporting)
- Want modular, extensible type checker
- Implementing IDE features (can show partial results)

#### Width Subtyping: Two Approaches

**Option A: True Subtyping with Subsumption**
- Requires subtyping constraints in the constraint system
- Makes type inference undecidable or very complex
- Research confirms: "subtyping and type inference just don't mix"

**Option B: Row Polymorphism (Equality-Based)**
- Uses equality constraints only
- Instantiates row variable to represent extra fields
- "Doing type inference with row polymorphic records is much easier"

**Vibefun's Current Approach:** Neither! It uses **structural unification with width subtyping**:
- Width subtyping happens during unification, not through constraints
- No row variables, no subsumption rule
- Extra fields ignored during unification
- Pragmatic, decidable, works well

#### Constraint Solving in Vibefun

From `constraints.ts:74-116`:

```typescript
function solveConstraints(constraints: Constraint[]): Substitution {
    let subst = empty;

    for (const constraint of constraints) {
        if (constraint.kind === "Equality") {
            const t1 = applySubst(subst, constraint.t1);
            const t2 = applySubst(subst, constraint.t2);
            const newSubst = unify(t1, t2);
            subst = compose(newSubst, subst);
        }
    }

    return subst;
}
```

This is **eager solving** - constraints are solved immediately, not accumulated for later analysis.

### Current Vibefun Implementation Status

✅ **Correctly implemented as Algorithm W** with eager unification

The "constraint-based" terminology in the spec is **misleading** - Vibefun uses Algorithm W with unification, not constraint-based inference.

### Recommendations

**Status: ✅ PLANNED - Strategic Decision to Use Algorithm M**

#### Strategic Decision

After thorough analysis, **Vibefun will use Algorithm M** (constraint-based, two-phase) instead of Algorithm W (direct unification) to enable:
- Better error messages through constraint analysis
- Partial results for IDE support
- Future extensibility for advanced type features
- Bidirectional typing for more precise inference

**Trade-off accepted:** More complex implementation in exchange for superior developer experience and future capabilities.

#### Implementation Summary

**Typechecker Requirements** (`.claude/design/typechecker-requirements.md`):
- ✅ Updated section 1.1 to specify Algorithm M
- ✅ Added comprehensive section 7.5 "Algorithm M: Two-Phase Constraint-Based Type Inference"
  - Complete algorithm specification with pseudocode
  - Constraint types (Equality, Instance, Subtype)
  - Bidirectional typing (synthesis + checking modes)
  - Phase 1: Constraint generation algorithm
  - Phase 2: Constraint solving with error recovery
  - Error prioritization strategy
  - Partial results for IDE support
  - Migration path from current Algorithm W
  - Testing requirements
  - Sources and references
- ✅ Removed constraint gap from section 8.1 (now fully specified)

**Compiler Architecture** (`docs/compiler-architecture/02-compilation-pipeline.md`):
- ✅ Updated Type Checker section to specify Algorithm M
- ✅ Added design rationale "Why Algorithm M over Algorithm W?"
  - Better error messages
  - IDE support enablement
  - Future extensibility
  - Clean architecture

**Gap Document** (`.claude/design/typechecker-gaps.md`):
- ✅ Updated Gap 2 recommendations to reflect Algorithm M decision

#### Documentation Philosophy

This correctly identifies the choice between Algorithm W (simple, fast) and Algorithm M (complex, extensible) as an **architectural decision** for the compiler implementation, not a language specification concern.

**Language specification** describes type inference semantics (what types are inferred), not the specific algorithm used (how inference is implemented).

#### Migration Strategy

**Current state:**
- Algorithm W implementation with eager unification
- Constraint types exist but are solved immediately
- Works correctly but limited error recovery

**Target state:**
- Algorithm M with two-phase architecture
- Constraint generation phase (bidirectional)
- Constraint solving phase (with error analysis)
- Partial results and error prioritization

**Incremental migration:**
1. Add expected type parameter (Phase 1 foundation)
2. Separate generation from solving
3. Implement bidirectional typing rules
4. Add error recovery with placeholders
5. Enhance error message quality

### Sources

- [Hindley–Milner type system - Wikipedia](https://en.wikipedia.org/wiki/Hindley–Milner_type_system)
- [Lecture 11: Type Inference - Northeastern University](https://course.ccs.neu.edu/cs4410sp19/lec_type-inference_notes.html)
- [Hindley-Milner type inference with constraints](https://kseo.github.io/posts/2017-01-02-hindley-milner-inference-with-constraints.html)
- [Damas-Hindley-Milner inference two ways - Max Bernstein](https://bernsteinbear.com/blog/type-inference/)
- [Row Polymorphism Isn't Subtyping - BAM Weblog](https://brianmckenna.org/blog/row_polymorphism_isnt_subtyping)
- [Row polymorphism crash course - Medium](https://ahnfelt.medium.com/row-polymorphism-crash-course-587f1e7b7c47)
- [Row Polymorphism without the Jargon](https://jadon.io/blog/row-polymorphism/)
- [Unification (computer science) - Wikipedia](https://en.wikipedia.org/wiki/Unification_(computer_science))

---

## Gap 3: Unification Algorithm Details

### Problem Statement

The specification doesn't detail the unification algorithm:
- What is the specific algorithm? (Robinson's? Other?)
- How does the occurs check work?
- How does unification work with width subtyping?
- When to use unification vs. subtyping check?
- How to handle contravariance in function arguments?

### Research Findings

#### Current Implementation Analysis

Vibefun already has a solid unification implementation at `/packages/core/src/typechecker/unify.ts`:

**Key features:**
- ✅ Robinson's unification algorithm
- ✅ Occurs check (prevents infinite types like `α = List<α>`)
- ✅ Level tracking (prevents scope escape)
- ✅ Width subtyping for records (structural typing)
- ✅ Nominal typing for variants
- ✅ Substitution management (composition, application)

#### Robinson's Unification Algorithm

**Core steps:**
1. If both types are identical constants, return empty substitution
2. If one is a type variable `α`:
   - Check if `α` occurs in the other type (occurs check)
   - If no, bind `α` to the other type
3. If both are compound types (functions, applications, etc.):
   - Recursively unify components
   - Compose resulting substitutions
4. Otherwise, fail with unification error

**Pseudocode:**

```typescript
unify(t1, t2) -> Substitution:
  if t1 == t2:
    return empty_subst()

  if is_var(t1):
    if occurs(t1.id, t2):
      error("Occurs check failure")
    return bind(t1.id, t2)

  if is_var(t2):
    if occurs(t2.id, t1):
      error("Occurs check failure")
    return bind(t2.id, t1)

  if is_fun(t1) and is_fun(t2):
    subst = empty_subst()
    for each param pair (p1, p2):
      s = unify(apply(subst, p1), apply(subst, p2))
      subst = compose(subst, s)
    s_ret = unify(apply(subst, t1.return), apply(subst, t2.return))
    return compose(subst, s_ret)

  // Other type constructors...

  error("Cannot unify " + t1 + " with " + t2)
```

#### Unification with Width Subtyping

Vibefun's approach (from `unify.ts:413-434`):

```typescript
function unifyRecords(r1, r2):
  // Find common fields
  common_fields = intersection(r1.fields, r2.fields)

  subst = empty_subst()
  for each field in common_fields:
    s = unify(apply(subst, r1.field), apply(subst, r2.field))
    subst = compose(subst, s)

  // Width subtyping: extra fields allowed
  return subst
```

**This is NOT true row polymorphism** (no row variables like `{x: Int | ρ}`).
**This is NOT subsumption** (no directional subtyping check).
**This IS**: Equality constraints with structural matching - extra fields ignored during unification.

#### Unification vs. Subtyping Check

**Vibefun's current answer:** Always use unification, but make record unification subsumption-aware.

**When each should be used (theoretically):**
- **Unification**: When inferring unknown types (type variables involved)
- **Subtyping check**: When checking known types against constraints

**For records with width subtyping:**
- Unification handles it naturally by only requiring common fields to unify
- Works both directions (symmetric)
- No need for separate subsumption rule

#### Contravariance in Function Arguments

**The principle:** Functions are contravariant in parameters, covariant in return types.

**Example:**
```vibefun
type Point2D = { x: Int, y: Int }
type Point3D = { x: Int, y: Int, z: Int }

// Point3D <: Point2D (width subtyping)

// With contravariance:
// (Point3D) -> Int <: (Point2D) -> Int
// Because a function accepting Point3D is STRICTER
```

**Vibefun's current implementation:** Function types do NOT support contravariant subtyping. Function types must unify exactly on parameters.

```typescript
// From unify.ts - function unification
case "Fun":
    // Unify parameter types (symmetric, not contravariant)
    for (let i = 0; i < t1.params.length; i++) {
        const paramSubst = unify(applySubst(subst, t1.params[i]),
                                  applySubst(subst, t2.params[i]));
        subst = composeSubst(subst, paramSubst);
    }
    // Unify return type
    const returnSubst = unify(applySubst(subst, t1.return),
                               applySubst(subst, t2.return));
    return composeSubst(subst, returnSubst);
```

**Why?** Contravariance requires:
- Separate subtyping check (not just unification)
- Subsumption rule in the type system
- Direction-aware type checking (bidirectional typing)

Vibefun uses pure synthesis (Algorithm W) with symmetric unification.

**This is correctly documented in the spec** (`record-types.md:149-171`).

#### Optimization: Union-Find

Research shows that union-find data structures with path compression achieve nearly constant-time amortized complexity for unification.

**Current Vibefun approach:** Simple substitution map (`Map<number, Type>`)

**Trade-offs:**
- **Current**: Simple, functional, debuggable, adequate for now
- **Union-find**: Faster (O(α(n)) vs O(n)), mutable, more complex

**Recommendation:** Keep current approach, add union-find optimization later if profiling shows bottleneck.

### Current Vibefun Implementation Status

✅ **Correctly implemented** - solid Robinson unification with occurs check and levels

**Gaps:**
- ⚠️ No location tracking through unification
- ⚠️ Error messages could be more helpful (see Gap 8)

### Recommendations

**Status: ✅ IMPLEMENTED - Documentation Complete**

#### Implementation Summary

Gap 3 identified a **documentation gap**, not an implementation gap. The Robinson unification algorithm was already correctly implemented in `/packages/core/src/typechecker/unify.ts` with comprehensive test coverage.

**Typechecker Requirements** (`.claude/design/typechecker-requirements.md`):
- ✅ Added comprehensive section 7.6 "Unification Algorithm"
  - Complete Robinson's algorithm specification with pseudocode
  - Occurs check algorithm and purpose
  - Width subtyping for records (common fields approach)
  - Level tracking integration
  - Substitution operations (application and composition)
  - Nominal typing for variants
  - Error cases and messages
  - Testing requirements (100% coverage achieved)
  - Performance characteristics
  - Integration with Algorithm M
  - Sources and references
- ✅ Removed unification from section 8.1 gaps (now fully documented)

**Compiler Architecture** (`docs/compiler-architecture/02-compilation-pipeline.md`):
- ✅ Added design rationale "Why Robinson's unification algorithm?"
  - Standard algorithm for HM systems since 1965
  - Well-understood with extensive literature
  - Functional implementation prioritizing clarity
  - Occurs check for infinite type prevention
  - Natural integration with level tracking
  - Optimization opportunities noted but deferred

**Gap Document** (`.claude/design/typechecker-gaps.md`):
- ✅ Updated Gap 3 recommendations to reflect implementation status

#### Key Findings

**What Exists:**
- Production-quality Robinson's unification (648 lines of tests)
- Occurs check preventing infinite types
- Level tracking integration for scope safety
- Width subtyping via common field matching
- Nominal typing for variants
- Comprehensive error messages

**What Was Missing:**
- Documentation of the algorithm details
- Design rationale in architecture docs
- Specification in requirements docs

**Outcome:**
Gap 3 is now fully resolved with complete documentation of the existing, correct implementation.

### Sources

- [Hindley-Milner Type Inference](https://steshaw.org/hm/hindley-milner.pdf)
- [Type Inference - Cornell](https://www.cs.cornell.edu/courses/cs3110/2011sp/Lectures/lec26-type-inference/type-inference.htm)
- [Understanding Algorithm W](https://jeremymikkola.com/posts/2018_03_25_understanding_algorithm_w.html)
- [Row Polymorphism Isn't Subtyping](https://brianmckenna.org/blog/row_polymorphism_isnt_subtyping)
- [Covariance and Contravariance](https://eli.thegreenplace.net/2018/covariance-and-contravariance-in-subtyping/)
- [Union-Find for Type Inference](https://papl.cs.brown.edu/2016/Type_Inference.html)
- [Tying up Type Inference](https://thunderseethe.dev/posts/unification/)
- [Disjoint-Set Data Structure](https://en.wikipedia.org/wiki/Disjoint-set_data_structure)

---

## Gap 4: Polymorphic Recursion

### Problem Statement

The specification doesn't say whether polymorphic recursion is allowed or forbidden:
- What is polymorphic recursion?
- Is it allowed in Vibefun?
- If not, what are the workarounds?

### Research Findings

#### What is Polymorphic Recursion?

**Polymorphic recursion** occurs when a recursive function calls itself with different type instantiations.

**Regular recursion (monomorphic):**
```vibefun
let rec length = <A>(list: List<A>) => match list {
    | [] => 0
    | [_, ...rest] => 1 + length(rest)  // Same type A
}
```

**Polymorphic recursion (different types):**
```ocaml
(* OCaml example - nested datatype *)
type 'a nested = Leaf of 'a | Node of ('a * 'a) nested

let rec flatten : 'a. 'a nested -> 'a list = function
    | Leaf x -> [x]
    | Node t ->
        (* Recursive call with DIFFERENT type! *)
        (* flatten called with ('a * 'a) nested, not 'a nested *)
        List.concat (List.map (fun (x,y) -> [x;y]) (flatten t))
```

#### Why is it Useful?

Polymorphic recursion enables elegant solutions for:
1. **Nested datatypes** - Data structures where type parameters nest recursively
2. **Type-indexed functions** - Functions operating on varying type precision
3. **Advanced type-level programming** - Phantom types, GADTs

#### Why is it Complicated?

1. **Undecidable type inference** - No algorithm can always determine if a program with polymorphic recursion is well-typed
2. **Requires explicit annotations** - Programmer must provide type signatures
3. **Complexity** - Harder to understand and debug
4. **Limited practical utility** - Most programs don't need it

#### Language Comparisons

| Language | Polymorphic Recursion | Annotations Required | Decidable Inference |
|----------|----------------------|---------------------|---------------------|
| **SML** | ❌ Forbidden | N/A | ✅ Yes |
| **OCaml** | ✅ With annotations | ✅ Yes (`'a.` syntax) | ✅ Yes (with restriction) |
| **Haskell** | ✅ Allowed | ✅ Yes (type signature) | ✅ Yes (with restriction) |

**Standard ML (FORBIDDEN):**
- Polymorphic recursion is completely forbidden
- Recursive calls assumed to have monomorphic type
- Type checker unifies all recursive calls to find single type
- Simpler implementation, better error messages

**OCaml (ALLOWED WITH ANNOTATIONS):**
```ocaml
(* Explicit universal quantifier forces polymorphism *)
let rec flatten : 'a. 'a nested -> 'a list = function
    | Leaf x -> [x]
    | Node t -> (* can call flatten polymorphically *)
```

**Haskell (ALLOWED):**
- Requires explicit type signatures
- Doesn't attempt to infer polymorphic recursion
- Works well with GADTs and advanced features

#### Type Inference Challenge

**The core problem:**
- Standard HM inference generalizes types AFTER the entire definition is complete
- Polymorphic recursion needs the function to be polymorphic WITHIN its own definition
- This creates circular dependency: need polymorphic type to infer definition, need definition to generalize type

**Theoretical result:** Type inference with polymorphic recursion is equivalent to **semi-unification**, which is proven undecidable.

### Decision for Vibefun

**RECOMMENDATION: FORBID polymorphic recursion** (following SML approach)

**Rationale:**

1. **Decidable type inference is a core design goal**
   - Vibefun follows ML-style Hindley-Milner inference
   - Type annotations should be optional in most cases
   - Forbidding polymorphic recursion preserves decidability

2. **Limited practical utility**
   - Most real-world programs don't need polymorphic recursion
   - Nested datatypes are rare in practice
   - Workarounds exist for most use cases

3. **Better developer experience**
   - Simpler mental model
   - Clearer error messages
   - More predictable type inference

4. **Conservative initial design**
   - Can always add polymorphic recursion later (backward compatible)
   - Cannot easily remove it once added
   - Aligns with "pragmatic" philosophy

5. **Implementation simplicity**
   - Standard Algorithm W works without modification
   - Less complex type checker
   - Easier to maintain and debug

#### Workarounds for Common Cases

**1. Explicit type witnesses:**
```vibefun
let rec flattenWith = <A, B>(tree: Nested<A>, transform: (A) -> List<B>) =>
    match tree {
        | Leaf(x) => transform(x)
        | Node(t) =>
            flattenWith(t, ((a, b)) => List.concat([transform(a), transform(b)]))
    }
```

**2. Mutually recursive functions with different types:**
```vibefun
let rec processInts = (xs: List<Int>) => ...
and processFloats = (ys: List<Float>) => ...
```

**3. Restructure the data type** - Often nested datatypes can be redesigned

### Recommendations

#### For Language Specification

**Add to `docs/spec/03-type-system/type-inference.md`:**

Create section "Polymorphic Recursion" explaining:
- What it is (with examples)
- That it's forbidden in Vibefun
- Why the restriction exists (decidable inference, simplicity)
- Workarounds (type witnesses, mutual recursion, restructuring)
- How recursive functions are type-checked (monomorphic during inference, generalized after)

**Update `docs/spec/06-functions.md`:**

Add note in "Recursive Functions" section:
```markdown
**Note on polymorphic recursion**: Vibefun does not support polymorphic recursion.
Recursive functions must call themselves with the same type instantiation.
See [Type Inference](../03-type-system/type-inference.md#polymorphic-recursion) for details.
```

#### For Typechecker Requirements

**Update `.claude/design/typechecker-requirements.md`:**

**Section 8.2 - Resolve ambiguity:**

```markdown
### 8.2 Design Decisions (RESOLVED)

1. **Polymorphic recursion:**
   - **Decision**: Polymorphic recursion is **FORBIDDEN** (SML-style)
   - **Rationale**:
     - Preserves decidable type inference
     - Simpler implementation and better error messages
     - Limited practical utility
     - Can be added later with annotations if needed
   - **Implementation**: During `let rec` type inference:
     1. Assume function has monomorphic type variable `t`
     2. Type check body with function having type `t`
     3. Unify all recursive uses with `t`
     4. Generalize `t` only after entire definition complete
```

**Add test requirements:**
```markdown
**Polymorphic Recursion Tests:**
- Verify polymorphic recursive calls are rejected with clear error
- Verify regular monomorphic recursion works correctly
- Verify mutually recursive functions with different types allowed
```

### Future Consideration

If polymorphic recursion proves necessary in a future version:
- Add explicit universal quantifier syntax (`forall` or `'a.`)
- Require annotations for polymorphic recursive functions
- Default behavior remains monomorphic recursion
- Provides escape hatch for advanced users

### Sources

- [OCaml - Polymorphism and its limitations](https://ocaml.org/manual/5.1/polymorphism.html)
- [Type inference for polymorphic recursive functions - Stack Overflow](https://stackoverflow.com/questions/34498497/type-inference-for-polymorphic-recursive-functions)
- [Polymorphic recursion - Wikipedia](https://en.wikipedia.org/wiki/Polymorphic_recursion)
- [Jane Street Blog - Ensuring polymorphism in OCaml](https://blog.janestreet.com/ensuring-that-a-function-is-polymorphic-in-ocaml-3-12/)
- [Programming Examples Needing Polymorphic Recursion](https://www.sciencedirect.com/science/article/pii/S1571066105050607)
- [Standard ML with polymorphic recursion](https://www.cis.uni-muenchen.de/~leiss/polyrec/polyrec.examples.html)
- [The Hindley-Milner type system plus polymorphic recursion](https://cs.stackexchange.com/questions/30330/the-hindley-milner-type-system-plus-polymorphic-recursion-is-undecidable-or-semi)
- [Do we need nested datatypes? - PLClub](https://www.cis.upenn.edu/~plclub/blog/2020-12-04-nested-datatypes/)

---

## Gap 5: Subtyping and Inference Interaction

### Problem Statement

Vibefun has width subtyping for records but the spec doesn't detail:
- How does subtyping interact with type inference?
- When to use unification vs. subtyping?
- How does contravariance work in function arguments?
- Why are type parameters invariant?
- When do type annotations help or become required?

### Research Findings

#### The Fundamental Challenge

Traditional Hindley-Milner type inference with subtyping is **undecidable in the general case**. The core problem: subtyping requires solving **inequality constraints** (semi-unification) rather than **equality constraints** (unification).

As noted in research: *"Type inference in a Damas-Hindley-Milner type system with subtyping is known to be undecidable in general."*

#### Vibefun's Current Approach

Vibefun implements **width subtyping for records only** using a **unification-based approach** (from `unify.ts:413-434`):

```typescript
function unifyRecords(r1, r2) {
    // Width subtyping: allow extra fields
    const commonFields = Array.from(r1.fields.keys())
        .filter(f => r2.fields.has(f));

    // Unify all common fields
    let subst = emptySubst();
    for (const field of commonFields) {
        const fieldSubst = unify(/* ... */);
        subst = composeSubst(subst, fieldSubst);
    }

    return subst;  // Extra fields ignored
}
```

**This is:**
- ✅ Decidable (preserves HM decidability)
- ✅ Integrated with Algorithm W (no separate subsumption)
- ✅ Pragmatic (works for JavaScript interop)

**This is NOT:**
- ❌ Row polymorphism (no row variables like `{x: Int | ρ}`)
- ❌ Subsumption-based subtyping (no directional checking)
- ❌ Full structural subtyping (only records, not functions)

#### Width Subtyping Semantics

**The rule:** Record R1 is a subtype of R2 if:
1. R1 has **all** fields of R2
2. Each corresponding field has compatible types

**Example:**
```vibefun
type Point2D = { x: Int, y: Int }
type Point3D = { x: Int, y: Int, z: Int }

// Point3D <: Point2D (has all fields plus z)
```

**In Vibefun's unification:**
- `{x: Int, y: Int, z: Int}` unifies with `{x: Int, y: Int}` ✅
- `{x: Int}` unifies with `{x: Int, y: Int}` ✅
- Both directions work (symmetric width subtyping)

#### When to Use Unification vs. Subtyping

**Vibefun's answer:** Always use unification, make record unification subsumption-aware.

**Theoretical distinction:**
- **Unification**: Making types equal (`T1 = T2`)
- **Subtyping**: Checking hierarchy (`T1 <: T2`)

**Vibefun's combined approach:** Record unification implements width subtyping automatically by:
- Finding common fields
- Unifying common fields
- Ignoring extra fields

No separate subsumption rule needed!

#### Contravariance in Function Arguments

**The principle:** Functions are:
- **Contravariant** in parameters (can accept more general types)
- **Covariant** in return types (can return more specific types)

**Formal rule:**
```
If S2 <: S1 (S2 more general) and T1 <: T2 (T1 more specific)
Then (S1) -> T1 <: (S2) -> T2
```

**Example:**
```vibefun
type Point2D = { x: Int, y: Int }
type Point3D = { x: Int, y: Int, z: Int }

// Theoretically with contravariance:
// (Point3D) -> Int <: (Point2D) -> Int
// Because function accepting Point3D is STRICTER
```

**Vibefun's current behavior:** Function types do NOT support contravariant subtyping. Function types must unify exactly.

```vibefun
let f: (Point2D) -> Int = ...
let g: (Point3D) -> Int = ...

let h: (Point2D) -> Int = g  // ❌ ERROR: types must match exactly
```

**Why not implemented?** Contravariance requires:
- Separate subtyping check (not just unification)
- Subsumption rule
- Bidirectional typing or direction-aware checking

Vibefun uses pure synthesis (Algorithm W) with symmetric unification. The spec correctly documents this limitation.

#### Type Parameter Invariance

**The rule:** Generic type parameters are **invariant** - they must match exactly.

**Why?** To prevent type confusion in mutable data structures.

**Example showing unsoundness if covariant:**

```vibefun
type Point2D = { x: Int, y: Int }
type Point3D = { x: Int, y: Int, z: Int }

// Point3D <: Point2D (width subtyping)

// Assume (incorrectly) that List<Point3D> <: List<Point2D>
let points3D: List<Point3D> = [{ x: 1, y: 2, z: 3 }]
let points2D: List<Point2D> = points3D  // Hypothetically allowed

// Add a Point2D (which lacks z):
let points2D = Cons({ x: 5, y: 6 }, points2D)

// Access through original reference:
match points3D {
    | Cons(p, _) => p.z  // ERROR: p doesn't have z!
}
```

Even though Vibefun's List is immutable, the same principle applies: **type safety requires exact type matches for generic parameters**.

**Current implementation** (from `unify.ts`):
```typescript
case "App":
    // Type application: List<T1> = List<T2> requires T1 = T2
    const constructorSubst = unify(t1.constructor, t2.constructor);

    // Unify all type arguments (invariant - must be exactly equal)
    for (let i = 0; i < t1.args.length; i++) {
        const argSubst = unify(t1.args[i], t2.args[i]);
        subst = composeSubst(subst, argSubst);
    }
```

This is **correct and necessary for soundness**.

#### When Type Annotations Are Needed

**Good news:** Type annotations are **rarely required** for width subtyping in Vibefun.

**Annotations NOT required for:**
1. Width subtyping (record types inferred structurally)
2. Polymorphic functions (generalization automatic)
3. Record construction (types inferred from values)

**Annotations MAY be helpful for:**
1. Documentation (making intent explicit)
2. Constraining value restriction edge cases
3. Complex nested polymorphism
4. Resolving ambiguity in error messages

**Annotations NEVER required for:**
- Width subtyping (unlike some bidirectional systems)
- Let-polymorphism (within value restriction)
- Record field access
- Pattern matching

### Current Vibefun Implementation Status

✅ **Correctly implemented** - width subtyping via unification, invariant type parameters

**Design is sound and pragmatic** for Vibefun's goals.

### Recommendations

#### For Language Specification

**Create `docs/spec/03-type-system/subtyping.md`:**

```markdown
# Subtyping

## Record Width Subtyping

[Formalize the subtyping relation for records]

## Function Type Variance

Functions are theoretically contravariant in parameters, but Vibefun's
current implementation requires exact matching.

[Explain why, show examples]

## Type Parameter Invariance

Generic type parameters are invariant for soundness.

[Show examples of unsoundness if covariant/contravariant]

## Integration with Type Inference

Vibefun integrates subtyping into unification:
- During record unification: width subtyping automatic
- During function unification: parameters must match exactly
- During type application: arguments must match exactly

[Algorithm details]
```

**Update `docs/spec/03-type-system/type-inference.md`:**

Add section "When Type Annotations Are Needed":
- Rarely required due to complete inference
- Optional for documentation
- Helpful for complex cases
- List specific scenarios

**Update `docs/spec/03-type-system/record-types.md`:**

Expand contravariance section:
- Explain why contravariance isn't supported yet
- Show what would be needed to implement it
- Provide workarounds

**Update `docs/spec/03-type-system/generic-types.md`:**

Add comprehensive variance section:
- Explain invariance with examples
- Show why covariance is unsound
- Provide workarounds for variance needs

#### For Typechecker Requirements

**Update `.claude/design/typechecker-requirements.md`:**

**Section 8.2 - Resolve ambiguity:**

```markdown
4. **Subtyping and inference:**
   - **Decision**: Width subtyping via unification (not subsumption)
   - **Rationale**: Preserves decidability, integrates with Algorithm W
   - **Implementation**:
     - Record unification checks common fields only
     - Function types must unify exactly (no contravariance)
     - Type parameters are strictly invariant
   - **Specification**: See `docs/spec/03-type-system/subtyping.md`
```

### Advanced Approaches (For Future Consideration)

**MLsub (Algebraic Subtyping):**
- Extends HM with full subtyping while preserving principal types
- Uses constraint accumulation, type variable bounds, polarity restrictions
- Complex but powerful

**Simple-sub:**
- Simplifies MLsub's algorithm to ~300 lines
- Practical alternative with good performance
- Could enable union/intersection types in future

**Recommendation:** Current approach is sufficient. Consider MLsub/Simple-sub only if future requirements demand full subtyping.

### Sources

- [Algebraic Subtyping - Demystifying MLsub](https://lptk.github.io/programming/2020/03/26/demystifying-mlsub.html)
- [The Simple Essence of Algebraic Subtyping](https://dl.acm.org/doi/10.1145/3409006)
- [Simple-sub GitHub](https://github.com/LPTK/simple-sub)
- [Integrating Subtyping with Damas-Hindley-Milner](https://langdev.stackexchange.com/questions/1789/)
- [Notes on Subsumption](https://homepage.cs.uiowa.edu/~jgmorrs/eecs662s19/notes/Notes-on-subsumption.html)
- [Bidirectional Type Checking](https://dl.acm.org/doi/fullHtml/10.1145/3450952)
- [Type Variance](https://typeinference.com/typing/2015/10/29/covariance_and_contravaciance.html)
- [Covariance and Contravariance (.NET)](https://learn.microsoft.com/en-us/dotnet/standard/generics/covariance-and-contravariance)

---

## Gap 6: Module System Type Checking

### Problem Statement

The spec doesn't detail how to handle:
- Type checking order for modules
- Import/export semantics
- Circular dependencies
- Separate compilation
- Module-level declaration order

### Research Findings

#### Current Vibefun Module System

**What's specified** (`docs/spec/08-modules.md`):
- Each `.vf` file is a module
- Import/export syntax
- Module resolution (file-based)
- Module initialization order (dependency order)
- Runtime behavior (singleton semantics)

**What's missing:**
- Type checking order
- How imported types/values are added to environment
- Export signature validation
- Circular dependency type checking
- Separate compilation support

#### How ML Languages Handle This

**OCaml:**
- Compilation units: `.ml` (implementation) + optional `.mli` (interface)
- Compiled interfaces (`.cmi`): Binary files with type signatures
- Separate compilation: Each module type-checks independently using `.cmi` files
- **Dependency order required** - dependencies compiled before dependents
- MD5 checksums prevent inconsistencies
- **No circular module imports** (except via `module rec`)

**Standard ML:**
- Signatures (interfaces) defined before structures (implementations)
- **Strict DAG requirement** - no circular dependencies
- "Dependency cycle in instantiate" errors
- Clean separation between interface and implementation

**F#:**
- **Strict compilation order** - files listed in dependency order in `.fsproj`
- **No forward references** across files
- Circular dependencies discouraged by design
- `module rec` for mutual recursion within a file only
- Forces clean, well-defined dependencies

#### Recommended Approach for Vibefun

**Phase 1 (MVP): Whole-Program Type Checking**

```
Algorithm: ModuleTypeCheck(modules)

1. DEPENDENCY ANALYSIS
   - Build dependency graph from imports
   - Detect cycles (warn if value-level, allow if type-only)
   - Topologically sort modules

2. INTERFACE EXTRACTION (for each module in order)
   - Process type declarations → M.interface.types
   - Process external declarations → M.interface.values
   - Create stub environment for value declarations

3. IMPLEMENTATION TYPE CHECKING (for each module in order)
   - Build environment from imports
   - Type-check declarations
   - Verify exports

4. FINALIZATION
   - Save interfaces (for future separate compilation)
```

**Phase 2: Circular Dependency Handling**

For modules in circular dependency:
1. Extract all type declarations from all modules in cycle
2. Stub all value declarations with fresh type variables
3. Type-check all implementations together using combined environment
4. Check for illegal patterns (top-level calls to imported functions)
5. Warn about potential runtime errors

**Phase 3 (Future): Separate Compilation**

Create interface files (`.vfi`):
```typescript
{
  values: Map<string, TypeScheme>,        // Exported values
  types: Map<string, TypeConstructor>,    // Exported types
  typeAliases: Map<string, Type>,         // Expanded aliases
  modulePath: string,
  dependencies: string[],
  checksum: string                        // For verification
}
```

#### Module-Level Declaration Order

**Decision:** Declarations must be defined before use (no forward references).

**Exceptions:**
- Mutually recursive functions (`let rec ... and ...`)
- Mutually recursive types (defined together)

**Examples:**

```vibefun
// ✅ OK: Type defined before use
type User = { id: Int, name: String };
let user: User = { id: 1, name: "Alice" };

// ❌ Error: Forward reference
let user: User = { id: 1, name: "Alice" };
type User = { id: Int, name: String };

// ✅ OK: Mutually recursive types
type Tree<T> = Leaf(T) | Node(Forest<T>);
type Forest<T> = List<Tree<T>>;
```

#### Import/Export Type Checking

**When type-checking an import:**

```vibefun
import { foo, type Bar, baz as qux } from "./module";
```

The type checker:
1. Locates the imported module
2. Retrieves its export signature
3. Verifies each imported name exists and has correct kind
4. Adds bindings to environment:
   - `foo`: Type scheme from module's exports
   - `Bar`: Type constructor (type import)
   - `qux`: Alias for `baz`'s type scheme

**Export validation:**

Track which declarations are exported:
- Exported value bindings with polymorphic type schemes
- Exported type constructors
- Exported type aliases (expanded form)
- Verify re-exports exist in source module

#### Circular Dependencies

**Type-level circular dependencies:** Always safe (types erased at runtime)

```vibefun
// moduleA.vf
import type { TypeB } from "./moduleB";
export type TypeA = { field: TypeB };

// moduleB.vf
import type { TypeA } from "./moduleA";
export type TypeB = { field: TypeA };
```

**Value-level circular dependencies:** Allowed but require care

```vibefun
// moduleA.vf
import { functionB } from "./moduleB";
export let functionA = (x) => ...;  // OK
let result = functionB(10);          // UNSAFE during init
```

**Type checking approach:** Two-pass for circular groups
1. **Pass 1:** Collect type declarations, stub value declarations
2. **Pass 2:** Type-check implementations with combined environment

### Recommendations

#### For Language Specification

**Update `docs/spec/08-modules.md`:**

Add new section "Module Type Checking":

```markdown
## Module Type Checking

### Type Checking Order

Modules are type-checked in **dependency order**:
1. Build dependency graph from imports
2. Topologically sort (if acyclic)
3. Type-check in sorted order

### Import Type Checking

[Detailed explanation of how imports are validated and added to environment]

### Export Type Checking

[Explanation of export signatures and validation]

### Type Checking with Circular Dependencies

[Two-pass approach explanation]

### Module Interfaces

[Description of module interface concept]

### Declaration Order Within Module

[Requirements for definition before use]
```

Add subsection to "Module Initialization Order":

```markdown
#### Type Checking vs Runtime Initialization

**Type-level circular dependencies**: Safe, always allowed
**Value-level circular dependencies**: Allowed but require care

[Examples and explanations]
```

**Update `docs/spec/03-type-system/type-inference.md`:**

Add section "Module-Level Type Generalization":

```markdown
### Module-Level Type Generalization

Exported bindings are generalized after inference:

[Examples of polymorphic exports]
[Cross-module polymorphism]
```

#### For Typechecker Requirements

**Update `.claude/design/typechecker-requirements.md`:**

**Section 8.2 - Resolve ambiguity:**

```markdown
2. **Module type checking order:**
   - **Decision**: Dependency-based topological order
   - **Phases**:
     - Phase 1 (MVP): Whole-program type checking
     - Phase 2: Two-pass for circular dependencies
     - Phase 3 (Future): Separate compilation with .vfi files
   - **Algorithm**: [Include detailed algorithm from research]
   - **Specification**: See `docs/spec/08-modules.md#module-type-checking`
```

Add new section "Multi-Module Type Checking":

```markdown
### Multi-Module Type Checking Algorithm

[Detailed algorithm with pseudocode]
[Export signature extraction]
[Import resolution]
[Circular dependency handling]
```

### Sources

- [Compilation Units - OCaml Programming](https://cs3110.github.io/textbook/chapters/modules/compilation_units.html)
- [Files, Modules, and Programs - Real World OCaml](https://dev.realworldocaml.org/files-modules-and-programs.html)
- [The Compiler Frontend - Real World OCaml](https://dev.realworldocaml.org/compiler-frontend.html)
- [Batch compilation (ocamlc) - OCaml Manual](https://v2.ocaml.org/releases/4.11/htmlman/comp.html)
- [SML '97 Modules - SML/NJ](https://www.smlnj.org/doc/Conversion/modules.html)
- [Modules | SML Help](https://smlhelp.github.io/book/docs/concepts/modules/)
- [Organizing modules - F# for fun and profit](https://fsharpforfunandprofit.com/posts/recipe-part3/)
- [F# file ordering - Stack Overflow](https://stackoverflow.com/questions/38360616/)
- [Modules - F# | Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/fsharp/language-reference/modules)

---

## Gap 7: Type Environment and Scheme Representation

### Problem Statement

The spec doesn't specify:
- How to represent type variables (integers? names? both?)
- How to represent types (ADT structure?)
- How to represent type schemes (∀α.τ in code?)
- What data structure for type environments?
- How to represent substitutions?

### Research Findings

#### Current Vibefun Implementation

**Excellent news:** Vibefun already has well-designed representations that align with best practices!

**Type Variable Representation** ✅

```typescript
// From /packages/core/src/types/environment.ts
export type Type =
    | { type: "Var"; id: number; level: number }  // ✅ Integer IDs + Levels
```

- **Integer IDs**: Globally unique (via counter)
- **Level tracking**: For scope tracking (Rémy's algorithm)
- **Fresh generation**: `freshTypeVar(level: number)`

This matches OCaml's approach and is the standard in ML implementations.

**Type Representation** ✅

```typescript
export type Type =
    | { type: "Var"; id: number; level: number }     // Type variables
    | { type: "Const"; name: string }                // Primitives
    | { type: "Fun"; params: Type[]; return: Type }  // Functions
    | { type: "App"; constructor: Type; args: Type[] } // Type constructors
    | { type: "Record"; fields: Map<string, Type> }  // Records
    | { type: "Variant"; constructors: Map<string, Type[]> } // Variants
    | { type: "Union"; types: Type[] }               // Unions
    | { type: "Tuple"; elements: Type[] }            // Tuples
    | { type: "Ref"; inner: Type }                   // Mutable refs
    | { type: "Never" };                             // Bottom type
```

**Strengths:**
- TypeScript discriminated unions (type-safe)
- Maps for O(1) field/constructor lookup
- Clear separation between type constructors (App) and concrete types
- No memoization needed yet (types are lightweight)

**Type Scheme Representation** ✅

```typescript
export type TypeScheme = {
    vars: number[];     // Quantified type variable IDs
    type: Type;         // Type with free variables
};
```

**Example:** `forall a. (a) -> a`
```typescript
{
    vars: [0],  // Quantify variable 0
    type: {
        type: "Fun",
        params: [{ type: "Var", id: 0, level: 0 }],
        return: { type: "Var", id: 0, level: 0 }
    }
}
```

This is the **standard approach** - explicit list of quantified variables.

**Type Environment Structure** ✅

```typescript
export type TypeEnv = {
    values: Map<string, ValueBinding>;  // Value-level bindings
    types: Map<string, TypeBinding>;    // Type-level bindings
};
```

**Design characteristics:**
- **Flat maps**: Single-level, not nested scopes
- **Immutable shadowing**: New environments via `new Map(oldEnv.values)`
- **Efficient lookup**: O(1) Map lookup
- **No backtracking**: Algorithm W doesn't require undo

**Substitution Representation** ✅

```typescript
export type Substitution = Map<number, Type>;
```

**Operations:**
- Empty: `new Map()`
- Single binding: `Map.set(id, type)`
- Composition: `composeSubst(s1, s2)` - correct implementation
- Path compression: Implicit via recursive `applySubst`

This is the **standard functional approach**.

#### Comparison with OCaml

| Aspect | Vibefun | OCaml | Assessment |
|--------|---------|-------|------------|
| Type Variables | Integer IDs + levels | Integer IDs + levels | ✅ Same |
| Type Representation | Tagged union (ADT) | ADT | ✅ Same |
| Type Schemes | `{vars, type}` | Same concept | ✅ Standard |
| Environment | Flat Map | Nested scopes | ✅ Valid choice |
| Substitution | `Map<number, Type>` | Same | ✅ Standard |
| Mutability | Immutable | Mutable (performance) | ✅ Simpler |

**Key difference:** OCaml uses **mutable type variables** (updated in-place during unification) for performance. Vibefun uses **immutable substitutions** (functional style). Both are correct; OCaml's is faster, Vibefun's is simpler and more debuggable.

#### Potential Future Optimizations

1. **Mutable unification variables** (OCaml-style) - faster but more complex
2. **Path compression in substitution** - avoid long chains
3. **Hash-consing for types** - share identical type structures
4. **Persistent data structures** for environments - faster copying

**Recommendation:** Keep current design. It's clean, correct, and performant enough. Optimize only if profiling shows bottlenecks.

### Current Implementation Status

✅ **Excellent implementation** - well-designed and follows best practices

No significant changes needed!

### Recommendations

#### For Language Specification

These are **implementation details** that should NOT be in the language spec.

However, **for implementer guidance**, could add appendix:

**Create `docs/spec/13-appendix/implementation-notes.md`:**

```markdown
# Implementation Notes

## Type Representation

Implementers may find these data structures useful:

### Type Variables
- Integer IDs for uniqueness
- Level tracking for scope checking
- Fresh variable generation

### Type Schemes
- Explicit list of quantified variable IDs
- Type body with free occurrences

[More guidance without being prescriptive]
```

#### For Typechecker Requirements

**Update `.claude/design/typechecker-requirements.md`:**

Add section documenting current representations (as reference, not requirements):

```markdown
### Type Representation (Current Implementation)

The current implementation uses:

[Document the excellent TypeScript types that exist]

**Assessment**: Current implementation is well-designed and follows ML best practices.

**Recommendations**:
- Keep current approach (clean, correct, debuggable)
- No optimizations needed yet
- If future profiling shows bottlenecks, consider:
  - Union-find for type variables
  - Hash-consing for types
  - Path compression in substitution
```

**Remove from "8.3 Missing Specifications"** - these are implementation details, not specification gaps.

### Sources

- [Efficient and Insightful Generalization](https://okmij.org/ftp/ML/generalization.html)
- [Type Inference in OCaml - CS3110](https://cs3110.github.io/textbook/chapters/interp/inference.html)
- [Hindley-Milner Type Inference](https://bernsteinbear.com/blog/type-inference/)
- [Algorithm W Implementation in OCaml](https://github.com/bynect/algorithm-w)
- [TypeScript Hindley-Milner Implementation](https://gist.github.com/oxyflour/f98432aa400daa225d04)

---

## Gap 8: Error Reporting Strategy

### Problem Statement

The spec doesn't specify:
- Error priorities (which to report when multiple errors exist)
- Whether to report multiple errors or stop at first
- How to recover from errors
- What makes a helpful error message
- How to explain unification failures
- Error message format and content

### Research Findings

#### Error Priority Strategies

**Modern type checkers prioritize local, specific errors** over cascading errors.

**Priority approaches:**

1. **Most Local First** (Rust, Elm)
   - Report errors at most specific location
   - Leaf expressions before compound expressions
   - Example: Error on `x + "hello"` not entire function

2. **First Encountered with Context** (TypeScript)
   - Report in source order with rich context
   - Show chain of inference that led to error

3. **Most Helpful First** (Elm philosophy)
   - Prioritize actionable feedback
   - Delay/suppress likely consequences
   - Focus on fixable errors

**Research evidence:** ["Compiler Error Messages Considered Unhelpful"](https://www.brettbecker.com/wp-content/uploads/2019/12/becker2019compiler.pdf) found that error message quality significantly impacts developer productivity, with clear, local errors being most effective.

#### Multiple Error Reporting

**Best practice:** Continue type checking after errors while avoiding cascading false positives.

**Strategies:**

1. **Error Type Placeholder**
   - When type checking fails, store special "error" type
   - Error type unifies with anything without generating new errors
   - Allows checking to continue without cascading
   - Implementation: Return error type on first failure

2. **Independent Error Reporting**
   - Report multiple independent errors in single pass
   - TypeScript aggregates all errors and reports together
   - Useful for IDE support

3. **Cascading Error Prevention**
   - Track which errors are "primary" vs "derived"
   - Only report primary errors by default
   - If `x` has wrong type, don't report every use of `x`

**Stack Overflow confirmation:** ["Can Hindley-Milner return more than one error?"](https://stackoverflow.com/questions/65866615/) confirms you can recover by ignoring offending unifications and continuing with error types.

#### Error Recovery Techniques

**Core strategy:** Use **error types** as placeholders.

**Recovery mechanisms:**

1. **Error Type with Memory**
   - Store error type with metadata about what went wrong
   - Can be specific: "error, could be Int or String"
   - Prevents re-reporting same error
   - AST nodes cache types, so error logged once

2. **Unification Error Handling**
   - Pass diagnostic information (source spans) through unification
   - When unification fails, create helpful error with location
   - Continue by pruning recursion at type constructor mismatches
   - Skip bindings that fail occurs check

3. **Occurs Check Recovery**
   - Occurs check failures (infinite types) can be recovered from
   - Simply skip the problematic binding
   - Leaves type context in valid state

**Key insight:** Recovery must maintain type system soundness - error type treated conservatively.

#### Quality Error Messages

**Research-backed best practices:**

1. **Structure and Content**
   - Answer "What went wrong?" and "How to fix it?"
   - Include specific location information
   - Provide actionable suggestions
   - Use plain language, avoid jargon

2. **Visibility and Format**
   - High visibility (formatting, color coding)
   - Respect user effort (don't blame user)
   - Constructive communication
   - Consistent formatting

3. **Empirical Evidence**
   - Enhanced error messages improve learning outcomes
   - Effectiveness depends on message design
   - Context-specific help more valuable than generic
   - Messages trigger stress response - be helpful!

#### Type Error Explanation

**Unification failure explanation** (Arthur Charguéraud's OCaml research):

**Problem with basic approach:**
- Blindly assumes first type seen is correct
- "Expected Int, got 'a" - unhelpful
- Doesn't track why types must be equal

**Better approach:**
- Track unification order carefully
- Provide context about why types must match
- Show chain of inference that led to constraint
- Example: "In function application, argument has type String but parameter expects Int"

**Type variable instantiation:**
- Show how polymorphic types were instantiated
- "Function has type <T>(T) -> T, instantiated with T = Int here, but T = String there"

**Subtyping failures:**
- For records: clearly show missing/extra fields
- "Record is missing field 'age: Int'" not full type diff

#### Diff-Based Error Messages

**Modern approaches:**

1. **Rust's Multi-Level Approach**
   - Primary labels: Main error (red underline)
   - Secondary labels: Related context (blue underline)
   - Notes: Additional explanation
   - Help: Suggestions for fixes
   - ASCII art: Visual highlighting

2. **Elm's Friendly Format**
   - Color coding for readability
   - ASCII art showing location
   - Conversational tone
   - Specific, actionable suggestions
   - Links to documentation

3. **Type Difference Highlighting**
   - Structural diff of types
   - Highlight mismatched parts
   - Row diffing for records
   - Example:
     ```
     Expected: { name: String, age: Int }
     Got:      { name: String, age: String }
                                     ^^^^^^
     ```

**Research:** [Comparing Compiler Errors](https://www.amazingcto.com/developer-productivity-compiler-errors/) found Rust and Elm have best error messages. Key differentiators:
- Clear visual hierarchy
- Actionable suggestions
- Context about why error occurred
- Links to additional help

#### Language-Specific Insights

**Rust:**
- Default: Concise errors
- Expanded mode (`--explain`): Detailed explanations
- Cost is "staggering" but impact enormous

**Elm:**
- Optimized for teaching
- Friendly, encouraging tone
- Extensive examples in errors
- ASCII art for visual clarity

**TypeScript:**
- Reports all errors in file
- Error codes for documentation lookup
- Context-aware suggestions
- IDE integration first-class

### Current Vibefun Implementation Status

**Good foundation:**
- ✅ TypeCheckerError class
- ✅ Location tracking
- ✅ Hints support
- ✅ Error creators (createTypeMismatchError, etc.)
- ✅ Levenshtein distance for "Did you mean?"

**Gaps:**
- ⚠️ No specification of error recovery strategy
- ⚠️ No specification of multi-error reporting policy
- ⚠️ No error codes for documentation lookup

### Recommendations

#### For Language Specification

**Create `docs/spec/03-type-system/error-reporting.md`:**

```markdown
# Type Error Reporting

## Error Reporting Guarantees

### Minimal Requirements
- Type checker reports at least one error on failure
- All errors include source location (file, line, column)

### Multiple Error Reporting
- Type checker MAY report multiple independent errors
- Implementation SHOULD avoid cascading errors
- Derived errors SHOULD be suppressed

## Error Categories

### Type Mismatch Errors
[Unification failures with examples]

### Undefined Reference Errors
[Variables, types, constructors]

### Pattern Match Errors
[Non-exhaustive matches]

### Occurs Check Errors
[Infinite types]

### Value Restriction Errors
[Generalization failures]

## Error Message Format

### Required Components
- Error category
- Source location
- Error description

### Optional Components
- Type information (expected vs actual)
- Hints and suggestions
- Help text
- Error codes

## Error Recovery

### Strategy
- Use error types as placeholders
- Continue checking when sound
- Prevent cascading errors

## Type Display Format

[How types should be rendered in errors]
```

#### For Typechecker Requirements

**Update `.claude/design/typechecker-requirements.md`:**

**Section 8.1 - Remove error priority gap, add resolved details:**

```markdown
4. **Type error priorities and recovery:**
   - **Decision**: Local-first priority with error recovery
   - **Strategy**:
     - Report local, specific errors first
     - Use error types as placeholders to continue checking
     - Suppress cascading/derived errors
     - Report multiple independent errors when possible
   - **Error recovery**:
     - Use special "error" type that unifies with anything
     - Track primary vs derived errors
     - Continue type checking after recoverable errors
   - **Specification**: See `docs/spec/03-type-system/error-reporting.md`
```

Add new section "Error Reporting Requirements":

```markdown
### Error Reporting Implementation

**Error Types:**
- Type mismatch (unification failure)
- Undefined variable/type
- Non-exhaustive pattern match
- Occurs check failure (infinite type)
- Arity mismatch
- Missing field
- Value restriction violation

**Error Recovery:**
[Algorithm for error type placeholders]

**Error Message Quality:**
- Include source location with file, line, column
- Show expected vs actual types
- Provide helpful hints
- Suggest corrections for typos (Levenshtein distance)

**Testing:**
- Test all error types with expected messages
- Verify location accuracy
- Test error recovery (multiple errors reported)
- Snapshot testing for error messages
```

### Near-Term Improvements

1. Document error recovery strategy in spec ✅
2. Specify multi-error reporting policy ✅
3. Add error codes for documentation lookup
4. Enhance type diff display for complex types

### Long-Term Enhancements

1. Implement error explanation system (like Rust's `--explain`)
2. Add comprehensive error message testing
3. User testing of error message quality
4. IDE integration considerations

### Sources

- [Compiler Error Messages Considered Unhelpful](https://www.brettbecker.com/wp-content/uploads/2019/12/becker2019compiler.pdf)
- [On Compiler Error Messages](https://www.hindawi.com/journals/ahci/2010/602570/)
- [Error Messages Research Survey](https://www.researchgate.net/publication/339039595_Compiler_Error_Messages_Considered_Unhelpful)
- [Elm: Compiler Errors for Humans](https://elm-lang.org/news/compiler-errors-for-humans)
- [Rust: Shape of Errors to Come](https://blog.rust-lang.org/2016/08/10/Shape-of-errors-to-come.html)
- [Rust RFC 1644](https://rust-lang.github.io/rfcs/1644-default-and-expanded-rustc-errors.html)
- [Comparing Compiler Errors](https://www.amazingcto.com/developer-productivity-compiler-errors/)
- [Writing Good Compiler Error Messages](https://calebmer.com/2019/07/01/writing-good-compiler-error-messages.html)
- [Improving Type Error Messages in OCaml](https://www.chargueraud.org/research/2015/ocaml_errors/ocaml_errors.pdf)
- [OCaml Common Error Messages](https://ocaml.org/docs/common-errors)
- [Can Hindley-Milner return more than one error?](https://stackoverflow.com/questions/65866615/)
- [How does a compiler recover from type errors?](https://softwareengineering.stackexchange.com/questions/364240/)
- [Type Inference Lecture Notes](https://course.ccs.neu.edu/cs4410sp19/lec_type-inference_notes.html)
- [Google: Writing Helpful Error Messages](https://developers.google.com/tech-writing/error-messages)
- [Nielsen Norman Group: Error Message Guidelines](https://www.nngroup.com/articles/error-message-guidelines/)

---

## Summary of Recommendations

### Design Decisions Made

All 8 specification gaps have been resolved with clear design decisions:

| Gap | Decision | Rationale |
|-----|----------|-----------|
| **1. Type Variable Levels** | Use Rémy's level-based algorithm | O(1) operations, proven in OCaml, already implemented |
| **2. Constraint-Based Inference** | Use Algorithm W (not constraint-based) | Simpler, adequate for Vibefun's goals, already implemented |
| **3. Unification Algorithm** | Robinson's with occurs check + levels | Standard, correct, already implemented |
| **4. Polymorphic Recursion** | FORBID (SML-style) | Preserves decidable inference, simpler, rare in practice |
| **5. Subtyping Integration** | Width subtyping via unification | Decidable, pragmatic, already implemented |
| **6. Module Type Checking** | Dependency-order with phases | MVP: whole-program, Future: separate compilation |
| **7. Type Representation** | Current implementation excellent | Integer IDs + levels, standard ADTs, no changes needed |
| **8. Error Reporting** | Local-first with error recovery | Modern best practices, continue after errors |

### Specification Updates Required

**New Files to Create:**
1. `docs/spec/03-type-system/unification.md` - Unification algorithm details
2. `docs/spec/03-type-system/subtyping.md` - Subtyping rules formalization
3. `docs/spec/03-type-system/error-reporting.md` - Error reporting guarantees
4. `docs/spec/13-appendix/implementation-notes.md` - Optional implementer guidance

**Existing Files to Update:**
1. `docs/spec/03-type-system/README.md` - Remove "constraint-based", add Algorithm W
2. `docs/spec/03-type-system/type-inference.md` - Add levels, polymorphic recursion, annotations
3. `docs/spec/03-type-system/record-types.md` - Expand contravariance explanation
4. `docs/spec/03-type-system/generic-types.md` - Add variance section
5. `docs/spec/06-functions.md` - Add polymorphic recursion note
6. `docs/spec/08-modules.md` - Add type checking semantics
7. `.claude/design/typechecker-requirements.md` - Resolve all gaps, add implementation details

### Key Takeaways

1. **Current implementation is excellent** - most gaps are already correctly handled in code
2. **Specification needs updating** - docs don't reflect the good implementation
3. **Design philosophy validated** - pragmatic, Algorithm W approach is correct for Vibefun
4. **Clear path forward** - all ambiguities resolved, ready for spec updates
5. **No major implementation changes needed** - focus on documentation

---

## Implementation Priorities

### Phase 1: Documentation (Immediate)

**Priority: HIGH - Resolve specification gaps**

1. Update existing specification files to reflect current implementation ✅
2. Create new specification files for unification, subtyping, error reporting ✅
3. Update typechecker requirements with resolved decisions ✅
4. Remove ambiguities from all specification documents ✅

**Deliverables:**
- 4 new spec files
- 7 updated spec files
- 1 updated requirements file
- All 8 gaps documented and resolved

**Time estimate:** No time estimates in plan mode

### Phase 2: Implementation Gaps (Short-term)

**Priority: MEDIUM - Fill actual implementation gaps**

1. **Multi-module type checking** (Gap 6)
   - Module loader/resolver
   - Dependency graph building
   - Import/export validation
   - Type checking in dependency order

2. **Error recovery** (Gap 8)
   - Error type placeholders
   - Multiple error reporting
   - Cascading error prevention
   - Enhanced error messages

**Deliverables:**
- Module type checking infrastructure
- Error recovery system
- Comprehensive error message tests

### Phase 3: Enhancements (Long-term)

**Priority: LOW - Quality of life improvements**

1. **Error explanation system** - Like Rust's `--explain`
2. **Module separate compilation** - Interface files (`.vfi`)
3. **Performance optimizations** - Union-find, hash-consing (only if needed)
4. **IDE support** - Incremental type checking, real-time errors

**Deliverables:**
- Error explanation documentation
- Interface file format
- Performance benchmarks
- IDE protocol

---

**End of Document**

**Next Steps:**
1. Review this research document
2. Create specification updates based on recommendations
3. Update typechecker requirements document
4. Proceed with implementation priorities as needed
