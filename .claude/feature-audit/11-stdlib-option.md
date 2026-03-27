# Feature Audit: Standard Library - Option

**Spec files**: 11-stdlib/option.md
**Date**: 2026-03-26

## Results

### Option Construction

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 1 | `Some(42)` creates Some value | Option Type | positive | FAIL | Compiles OK but runtime ReferenceError: `Some` is not defined. Codegen emits `Some(42)` as a raw JS call but never defines the `Some` constructor function. Match expects `{$tag: "Some", $0: ...}` objects. |
| 2 | `None` as standalone expression (typed) | Option Type | positive | FAIL | `let x: Option<Int> = None;` causes internal compiler error: "Function type must have at least one parameter" |
| 3 | `None` as standalone expression (untyped) | Option Type | positive | FAIL | `let x = None;` causes same internal compiler error: "Function type must have at least one parameter" |
| 4 | User-defined variant type `MySome(T) \| MyNone` | Variant Types | positive | FAIL | Compiles with error: "Undefined variable 'MySome'" -- user-defined variant constructors are not available as expression-level functions |

### Option Module Functions (Namespace `Option.*`)

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 5 | `Option.map` | Option.map | positive | FAIL | Compile error: "Undefined variable 'Option'" -- the Option namespace is not bound in scope |
| 6 | `Option.flatMap` | Option.flatMap | positive | FAIL | Compile error: "Undefined variable 'Option'" |
| 7 | `Option.getOrElse` | Option.getOrElse | positive | FAIL | Compile error: "Undefined variable 'Option'" |
| 8 | `Option.isSome` | Option.isSome | positive | FAIL | Compile error: "Undefined variable 'Option'" |
| 9 | `Option.isNone` | Option.isNone | positive | FAIL | Compile error: "Undefined variable 'Option'" |
| 10 | `Option.unwrap` | Option.unwrap | positive | FAIL | Compile error: "Undefined variable 'Option'" |
| 11 | `Option.unwrapOr` | AI Coding Guide | positive | FAIL | Compile error: "Undefined variable 'Option'" |
| 12 | `Option.filter` | Additional Patterns | positive | FAIL | Compile error: "Undefined variable 'Option'" |
| 13 | `Option.fold` | Additional Patterns (implied) | positive | FAIL | Compile error: "Undefined variable 'Option'" |
| 14 | `Option.tap` | Additional Patterns (implied) | positive | FAIL | Compile error: "Undefined variable 'Option'" |
| 15 | `Option.or` | Additional Patterns | positive | FAIL | Compile error: "Undefined variable 'Option'" |
| 16 | `Option.getOrElseLazy` | Additional Patterns | positive | FAIL | Internal compiler error: "Lambda with zero parameters" -- the `() => expr` syntax is not supported |
| 17 | `Option.toList` | Additional Patterns | positive | FAIL | Compile error: "Undefined variable 'Option'" |
| 18 | `Option.fromNullable` | Additional Patterns | positive | FAIL | Compile error: "Undefined variable 'Option'" |

### Option Pattern Matching

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 19 | Match `Some(v)` with binding (compile) | Pattern Matching | positive | FAIL | Compiles successfully but fails at runtime: `Some` constructor not defined in generated JS |
| 20 | Match `None` pattern (compile) | Pattern Matching | positive | FAIL | Compiles successfully (None works fine as a pattern) but fails at runtime because the matched value (`Some(42)`) is not constructable |
| 21 | Exhaustive match enforced (missing None) | Pattern Matching | negative | PASS | Correctly reports: "Non-exhaustive pattern match. Missing cases: None" |
| 22 | Nested option `Some(Some(42))` (compile) | Edge Cases | positive | FAIL | Compiles successfully but runtime ReferenceError on `Some` |
| 23 | Match with guard on Some | Pattern Matching | positive | FAIL | Compiles successfully but runtime ReferenceError on `Some` |
| 24 | Literal in Some pattern `Some(0)` (compile) | Pattern Matching | positive | FAIL | Compiles successfully but runtime ReferenceError on `Some` |

### Option as Return Type

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 25 | Function returning `Some(x)` only (compile) | Common Usage | positive | FAIL | Compiles but runtime ReferenceError on `Some` |
| 26 | Function returning `None` in else branch | Common Usage | positive | FAIL | Internal compiler error: "Function type must have at least one parameter" -- `None` in expression position crashes compiler |
| 27 | Chaining option operations with match (compile) | Common Usage | positive | FAIL | Compiles when only `Some` used, but runtime fails. When `None` used as expression, compiler crashes. |
| 28 | Converting Option to Result (compile) | Common Usage | positive | FAIL | Compiles but runtime ReferenceError on `Some`/`Ok` constructors |

### None as Expression in Various Contexts

| # | Feature | Spec Reference | Test Type | Result | Notes |
|---|---------|---------------|-----------|--------|-------|
| 29 | `None` in if-then branch | Option Type | positive | FAIL | Internal error: "Function type must have at least one parameter" |
| 30 | `None` in if-else branch | Option Type | positive | FAIL | Internal error: "Function type must have at least one parameter" |
| 31 | `None` returned from match arm (`\| None => None`) | Option Type | positive | FAIL | Internal error: "Function type must have at least one parameter" |

## Summary

- **Total**: 31 tests
- **Pass**: 1
- **Fail**: 30

## Key Findings

### Blocker 1: Variant Constructor Functions Not Emitted in Generated JS
The codegen compiles `Some(42)` to the literal JavaScript `Some(42)`, but never emits a function definition for `Some`. Pattern matching expects objects of the form `{$tag: "Some", $0: value}`, so something like `function Some(v) { return {$tag: "Some", $0: v}; }` is needed in the output. This affects ALL uses of `Some(...)` as an expression (not just Option -- also `Ok(...)`, `Err(...)`, and any variant constructor). Every test that constructs a `Some` value compiles but crashes at runtime with `ReferenceError: Some is not defined`.

### Blocker 2: `None` as Expression Crashes Compiler
Using `None` anywhere as an expression value (not as a pattern) causes an internal compiler error: "Function type must have at least one parameter". This affects `let x = None`, `if ... then None else ...`, `| None => None`, and any code path where `None` is used as a value rather than a pattern to match against.

### Blocker 3: `Option` Namespace Not Implemented
The `Option` module namespace is not bound in the type checker or runtime. All `Option.*` function calls fail with "Undefined variable 'Option'". None of the spec'd functions (`map`, `flatMap`, `getOrElse`, `isSome`, `isNone`, `unwrap`, `filter`, `or`, `toList`, `fromNullable`, `getOrElseLazy`) are available.

### Blocker 4: User-Defined Variant Constructors Also Broken
Defining a custom type like `type MyOption<T> = MySome(T) | MyNone` and then trying to use `MySome(42)` fails with "Undefined variable 'MySome'". This means variant construction is completely non-functional for any user-defined types as well.

### Blocker 5: Zero-Parameter Lambda Not Supported
`() => expr` causes internal error "Lambda with zero parameters", blocking patterns like `Option.getOrElseLazy` that take thunks.

### What Works
- **Pattern matching syntax compiles**: `| Some(v) => ...` and `| None => ...` are correctly parsed and type-checked
- **Exhaustiveness checking works**: Missing `None` case correctly reported as non-exhaustive
- **Type checking for Option compiles**: The type checker recognizes `Option<T>` as a built-in type with `Some(T)` and `None` constructors

### Net Assessment
The Option module is **non-functional**. While the type checker recognizes `Option<T>`, `Some`, and `None`, no Option values can be constructed or manipulated at runtime. The standard library functions do not exist. The fundamental blocker is that variant constructor functions are not emitted in the generated JavaScript.
