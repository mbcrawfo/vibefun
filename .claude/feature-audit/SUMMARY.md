# Vibefun Feature Audit Summary

**Date**: 2026-03-26
**Method**: Black-box testing via `pnpm vibefun compile` + `node` execution
**Scope**: All testable features from docs/spec/ (sections 02-11)

## Overall Results

| Metric | Count |
|--------|-------|
| **Total Tests** | 704 |
| **Pass** | 371 (52.7%) |
| **Fail** | 333 (47.3%) |

## Results by Section

| Section | File | Pass | Fail | Total | Rate |
|---------|------|------|------|-------|------|
| Lexical Structure | 02-lexical-structure.md | 31 | 1 | 32 | 97% |
| Primitive Types | 03-primitive-types.md | 33 | 3 | 36 | 92% |
| Tuples | 03-tuples.md | 3 | 15 | 18 | 17% |
| Records & Subtyping | 03-records-subtyping.md | 26 | 7 | 33 | 79% |
| Variants & Recursive Types | 03-variants-recursive.md | 27 | 23 | 50 | 54% |
| Type Inference & Generics | 03-inference-generics.md | 35 | 13 | 48 | 73% |
| Expressions | 04-expressions.md | 42 | 8 | 50 | 84% |
| Pattern Matching | 05-pattern-matching.md | 45 | 9 | 54 | 83% |
| Functions | 06-functions.md | 27 | 6 | 33 | 82% |
| Mutable References | 07-mutable-references.md | 11 | 20 | 31 | 35% |
| Error Handling | 09-error-handling.md | 8 | 17 | 25 | 32% |
| JS Interop & Modules | 10-js-interop.md | 23 | 16 | 39 | 59% |
| Stdlib: List | 11-stdlib-list.md | 11 | 22 | 33 | 33% |
| Stdlib: Option | 11-stdlib-option.md | 1 | 30 | 31 | 3% |
| Stdlib: Result | 11-stdlib-result.md | 29 | 18 | 47 | 62% |
| Stdlib: String | 11-stdlib-string.md | 11 | 18 | 29 | 38% |
| Stdlib: Numeric & Math | 11-stdlib-numeric-math.md | 8 | 54 | 62 | 13% |
| Stdlib: Collections | 11-stdlib-collections.md | 0 | 53 | 53 | 0% |

## Systemic Issues (Ranked by Impact)

These are cross-cutting bugs that account for the majority of failures.

### 1. Stdlib Namespace Modules Not Bound (accounts for ~170 failures)

`List`, `String`, `Int`, `Float`, `Math`, `Option`, `Result`, `Array`, `Map`, `Set`, `Json` -- none of these namespaces are bound as variables. Every call like `List.map(...)`, `String.fromInt(...)`, `Math.sqrt(...)` fails with `Undefined variable`. The builtins are registered in the type checker environment as dotted names (e.g., `"String.fromInt"`) but the parser resolves `String.fromInt` as `FieldAccess(Variable("String"), "fromInt")`, and `String` is not a variable.

**Impact**: The entire standard library is inaccessible. No type conversions, no collection operations, no math functions.

### 2. User-Defined Variant Constructors Not Recognized (~30 failures)

Only the hardcoded built-in constructors `Some`, `None`, `Ok`, `Err` are available. Any user-defined constructor like `Red`, `Circle(5)`, `Cons(1, Nil)`, `Box(42)` fails with `Undefined variable`. This makes user-defined ADTs unusable beyond type definitions.

**Impact**: Custom algebraic data types cannot be constructed, only matched against.

### 3. Built-in Variant Constructors Not Emitted in Codegen (~15 failures)

`Some(42)` type-checks but the generated JS emits `Some(42)` without defining the `Some` function. Match arms correctly destructure `{$tag: "Some", $0: value}` objects but these objects can never be created. Workaround: define `type Option<T> = Some(T) | None;` explicitly (user-defined types DO emit constructor functions).

**Impact**: Built-in Option/Result types are unusable without explicit type redefinition.

### 4. `if/then/else` Completely Broken (~15 failures)

Every `if/then/else` expression fails with `Non-exhaustive pattern match. Missing cases: <other values>`. The desugarer converts if-expressions to match on Bool, but exhaustiveness checking doesn't recognize `true`/`false` as covering all Bool cases.

**Impact**: All conditional logic must use `match` expressions as a workaround.

### 5. Float Arithmetic Operators Broken (~10 failures)

`+`, `-`, `*` are hardcoded to Int. `10.0 + 3.0` fails with `Cannot unify Float with Int`. Only `/` is overloaded for Float (due to special-casing in the division type inference). Unary negation on floats also fails.

**Impact**: Float-based computation is essentially impossible without FFI workarounds.

### 6. `None` Value Expression Crashes Compiler (~8 failures)

Using `None` as a value (not in a pattern) triggers `Internal error: Function type must have at least one parameter`. This affects any code that constructs a None value, e.g., `let x: Option<Int> = None;`.

**Impact**: Cannot express "no value" in Option types outside of pattern matching.

### 7. Ref Dereference `!` Never Works (~10 failures)

The `!` operator always resolves to logical NOT (Bool). The spec's type-based disambiguation for Ref dereference is not implemented. Every test reading from a ref fails with `Cannot unify Ref<T> with Bool`.

**Impact**: Mutable references are write-only -- values can be stored but never read back.

### 8. Multi-Argument Call Syntax `f(a, b)` Rejected (~5 failures)

The spec says `f(a, b)` is equivalent to `f(a)(b)` for curried functions, but the compiler rejects it with `Cannot unify functions with different arity`. Only the curried form `f(a)(b)` works.

**Impact**: Ergonomic multi-arg calls don't work; must always use curried form.

### 9. Multi-Line Unsafe Blocks Rejected (~3 failures)

Parser fails on newlines after `unsafe {`. All unsafe blocks must be single-line expressions.

**Impact**: Complex JS interop operations are difficult to express.

### 10. Variable Shadowing Generates Invalid JS (~2 failures)

`let x = 1; let x = 2;` compiles to `const x = 1; const x = 2;` which JavaScript rejects as redeclaration.

**Impact**: Common functional pattern of rebinding variables is broken at runtime.

## Additional Notable Issues

- **Tuples**: Entirely unimplemented (`Tuple type inference not yet implemented`)
- **Zero-parameter lambdas**: `() => expr` causes internal compiler error
- **Explicit generic syntax**: `<T>(x: T): T => x` not supported
- **Type aliases not transparent**: `let x: UserId = 42` fails when `UserId = Int`
- **Multi-field record access in functions**: Accessing 2+ fields on a function parameter fails
- **`let mut` not enforced**: `let x = ref(0)` compiles without error (spec requires `mut`)
- **`let mut` only at top level**: Mutable bindings inside functions produce `not yet implemented` error
- **While loops**: Non-functional in any position
- **Module imports**: Parsed but imported bindings not available during type-checking
- **External multi-param functions**: JS functions with 2+ params only receive first argument due to currying
- **Integer division by zero**: No runtime panic (returns Infinity via JS semantics)
- **Try/catch in unsafe**: Not supported despite being in spec
- **Re-exports**: Crash the compiler with internal error

## What Works Well

The following areas are solid and match the spec:

- **Lexer**: Comments, semicolons, all number formats (hex, binary, scientific), string escapes, all operators
- **Basic Int arithmetic**: +, -, *, /, % all correct with truncation-toward-zero
- **Type inference**: Hindley-Milner inference works well for basic and polymorphic cases
- **Records**: Construction, field access, spread updates, width subtyping, keyword fields
- **Pattern matching**: Comprehensive -- literals, variables, wildcards, variant/list/record patterns, nested patterns, guards, or-patterns, exhaustiveness checking
- **Functions**: Curried calls, partial application, closures, `let rec`, mutual recursion (`and`), higher-order functions
- **Pipe operator**: `|>` works correctly
- **Composition**: `>>` and `<<` work correctly
- **List construction**: Literals, cons `::`, spread at end of list
- **External declarations**: Single and block form, constant externals
- **Basic unsafe blocks**: Single-expression form works
