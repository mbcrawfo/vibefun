# Feature Audit: Variants, Unions, and Recursive Types

**Spec files**: 03-type-system/variant-types.md, union-types.md, recursive-types.md
**Date**: 2026-03-26
**Test directory**: /tmp/vf-audit-variants/

## Results

### Simple Enum Variants

| # | Feature | Spec Reference | Test File | Test Type | Result | Notes |
|---|---------|---------------|-----------|-----------|--------|-------|
| 1 | Simple enum definition compiles | variant-types.md "Simple Enums" | test01 | positive | PASS | `type Color = Red \| Green \| Blue;` compiles and correct JS constructors are emitted |
| 2 | Simple enum constructor as expression | variant-types.md "Simple Enums" | test02 | positive | **FAIL** | `let c = Red;` fails with "Undefined variable 'Red'" - type checker does not register simple enum constructors as value-level bindings |
| 3 | Pattern matching on simple enum | variant-types.md "Simple Enums" | test03 | positive | **FAIL** | Blocked by #2 - cannot create a value to match on |

### Data-Carrying Variants (Built-in Option/Result)

| # | Feature | Spec Reference | Test File | Test Type | Result | Notes |
|---|---------|---------------|-----------|-----------|--------|-------|
| 4 | Option type definition + Some(T) | variant-types.md "Variants with Data" | test04, test05 | positive | PASS | `type Option<T> = Some(T) \| None;` then `Some(42)` works correctly |
| 5 | Pattern matching on Some(v) | variant-types.md "Variants with Data" | test05 | positive | PASS | `match x { \| Some(v) => ... \| None => ... }` works, outputs "42" |
| 6 | None as standalone value with type annotation | variant-types.md "Variants with Data" | test06, test26, test28 | positive | **FAIL** | `let x: Option<Int> = None;` triggers internal error: "Function type must have at least one parameter" |
| 7 | None as standalone value without annotation | variant-types.md "Variants with Data" | test48 | positive | PASS | `let x = None;` compiles and runs (but cannot be used in function calls) |
| 8 | None as function argument | variant-types.md "Variants with Data" | test49 | positive | **FAIL** | `getDefault(None)` triggers internal error: "Function type must have at least one parameter" |
| 9 | None in pattern (not as value) | variant-types.md "Variants with Data" | test06b | positive | PASS | `\| None => "none"` works in match when value is `Some(42)` |

### Data-Carrying Variants (User-Defined)

| # | Feature | Spec Reference | Test File | Test Type | Result | Notes |
|---|---------|---------------|-----------|-----------|--------|-------|
| 10 | User-defined single-data variant | variant-types.md "Complex Variants" | test23 | positive | **FAIL** | `type Wrapper = Box(Int); let x = Box(42);` fails with "Undefined variable 'Box'" |
| 11 | User-defined multi-field variant | variant-types.md "Complex Variants" | test07, test08 | positive | **FAIL** | `Rectangle(3, 4)` fails with "Undefined variable 'Rectangle'" |
| 12 | User-defined single-field variant in multi-type | variant-types.md "Complex Variants" | test07b | positive | **FAIL** | `Circle(5)` fails with "Undefined variable 'Circle'" even though it carries data |
| 13 | Three-field variant | variant-types.md "Complex Variants" | test21 | positive | **FAIL** | `Triangle(3, 4, 5)` fails with "Undefined variable 'Triangle'" |
| 14 | User-defined variant with type annotation | variant-types.md | test29 | positive | **FAIL** | `let s: Shape = Circle(5);` still fails - type annotation does not help |
| 15 | User-defined variant with mixed data/no-data | union-types.md "Pattern Matching" | test24 | positive | **FAIL** | `IntVal(42)` fails with "Undefined variable 'IntVal'" |

### Generic Variants

| # | Feature | Spec Reference | Test File | Test Type | Result | Notes |
|---|---------|---------------|-----------|-----------|--------|-------|
| 16 | Result<T, E> definition and Ok(T) | variant-types.md "Variants with Data" | test09 | positive | PASS | `type Result<T, E> = Ok(T) \| Err(E);` then `Ok(42)` works |
| 17 | Result<T, E> with Err(E) | variant-types.md "Variants with Data" | test10 | positive | PASS | `Err("bad")` works with type annotation on binding |
| 18 | Type annotation on generic variant | variant-types.md | test47 | positive | PASS | `let x: Result<Int, String> = Ok(42);` works |
| 19 | Generic variant type inference | union-types.md "Type Inference" | test33 | positive | PASS | Type of function parameter inferred from match on Ok/Err |

### Variant Constructors as Values

| # | Feature | Spec Reference | Test File | Test Type | Result | Notes |
|---|---------|---------------|-----------|-----------|--------|-------|
| 20 | Some as first-class value | variant-types.md "Constructor Functions" | test11 | positive | PASS | `let wrap = Some; wrap(42);` works correctly |
| 21 | Ok as first-class value | variant-types.md "Constructor Functions" | test11b | positive | PASS | `let wrap = Ok; wrap(42);` works correctly |
| 22 | Err as first-class value | variant-types.md "Constructor Functions" | test43 | positive | PASS | `let wrapErr = Err; wrapErr("oops");` works correctly |

### Nominal Typing

| # | Feature | Spec Reference | Test File | Test Type | Result | Notes |
|---|---------|---------------|-----------|-----------|--------|-------|
| 23 | Same-structure variants are incompatible | variant-types.md "Nominal Typing" | test12b | negative | PASS | `Option<Int>` cannot be assigned to `MyOption<Int>` - correctly rejected with "Cannot unify Option with MyOption" |
| 24 | User-defined nominal typing test | variant-types.md "Nominal Typing" | test12 | negative | INCONCLUSIVE | Test was blocked by constructor bug (#10) before nominal check could be exercised |

### Advanced Pattern Matching with Variants

| # | Feature | Spec Reference | Test File | Test Type | Result | Notes |
|---|---------|---------------|-----------|-----------|--------|-------|
| 25 | Nested variant patterns | union-types.md "Pattern Matching" | test31 | positive | PASS | `Ok(Some(v))` pattern works correctly |
| 26 | Or-patterns with variants | union-types.md | test36 | positive | PASS | `Ok(None) \| Err(_)` or-pattern works |
| 27 | Wildcard in variant pattern | variant-types.md | test37 | positive | PASS | `Some(_)` wildcard pattern works |
| 28 | Guard with variant pattern | variant-types.md | test32 | positive | PASS | `Some(v) when v > 10` works correctly |
| 29 | Nested Option<Option<T>> | variant-types.md | test46 | positive | PASS | `Some(Some(42))` with nested match works |
| 30 | Variant in higher-order function (map-like) | variant-types.md | test41 | positive | PASS | `Ok(f(v))` inside match, rebuilding variants works |

### Variant Data Types

| # | Feature | Spec Reference | Test File | Test Type | Result | Notes |
|---|---------|---------------|-----------|-----------|--------|-------|
| 31 | Option<String> | variant-types.md | test38 | positive | PASS | `Some("hello")` works |
| 32 | Option<Bool> | variant-types.md | test39 | positive | PASS | `Some(true)` works |
| 33 | Polymorphic variant usage (Int and String) | variant-types.md | test40 | positive | PASS | `Some(1)` and `Some("hello")` in same program work |

### Multi-line Variant Syntax

| # | Feature | Spec Reference | Test File | Test Type | Result | Notes |
|---|---------|---------------|-----------|-----------|--------|-------|
| 34 | Multi-line without semicolon after `=` | variant-types.md | test44, test50 | positive | PASS | `type X = \| A(T) \| B(E);` (newline after `=`) works |
| 35 | Multi-line with semicolon after `=` (spec syntax) | recursive-types.md | test45 | positive | **FAIL** | `type X =; \| A(T) \| B(E);` fails with "Expected type expression" - spec shows this syntax but it is not supported |

### Recursive Types

| # | Feature | Spec Reference | Test File | Test Type | Result | Notes |
|---|---------|---------------|-----------|-----------|--------|-------|
| 36 | Recursive type definition | recursive-types.md | test13 | positive | PASS | `type List<T> = Cons(T, List<T>) \| Nil;` compiles |
| 37 | Creating recursive values | recursive-types.md | test14, test14b | positive | **FAIL** | `Cons(1, Cons(2, Nil))` fails - `Nil` (no-data constructor) triggers "Function type must have at least one parameter" |
| 38 | Pattern matching recursive type | recursive-types.md | test15 | positive | **FAIL** | Blocked by #37 |
| 39 | Recursive function over recursive type | recursive-types.md | test16 | positive | **FAIL** | Blocked by #37 |
| 40 | Recursive tree type usage | recursive-types.md | test22 | positive | **FAIL** | `Node(Leaf(1), Leaf(2))` fails - `Node`, `Leaf` are user-defined constructors (see #10) |
| 41 | Recursive expression type usage | recursive-types.md | test25 | positive | **FAIL** | `Lit(42)` fails - user-defined constructor not recognized |

### Unguarded Recursion

| # | Feature | Spec Reference | Test File | Test Type | Result | Notes |
|---|---------|---------------|-----------|-----------|--------|-------|
| 42 | Reject unguarded recursion | recursive-types.md "Requirements" | test42 | negative | **FAIL** | `type Bad = Bad;` compiles and runs without error - spec says this should be rejected |

### Mutually Recursive Types

| # | Feature | Spec Reference | Test File | Test Type | Result | Notes |
|---|---------|---------------|-----------|-----------|--------|-------|
| 43 | Mutual recursive type definition | recursive-types.md "Mutually Recursive Types" | test17 | positive | PASS | `type Even = ... and Odd = ...;` compiles |
| 44 | Mutual recursive with pattern types | recursive-types.md | test51 | positive | PASS | `type Expr = ... and Pattern = ...;` compiles |
| 45 | Using constructors from mutual recursive types | recursive-types.md | test17b, test51b | positive | **FAIL** | `Zero`, `Lit(42)` fail as "Undefined variable" - same user-defined constructor issue |

### Union Types

| # | Feature | Spec Reference | Test File | Test Type | Result | Notes |
|---|---------|---------------|-----------|-----------|--------|-------|
| 46 | String literal union type definition | union-types.md "String Literal Union Types" | test18 | positive | **FAIL** | `type Status = "pending" \| "active" \| "complete";` fails with "Expected type expression" - parser does not support string literals in type position |
| 47 | String literal union matching | union-types.md "Pattern Matching" | test19 | positive | **FAIL** | Blocked by #46 |
| 48 | Invalid string literal union value (negative) | union-types.md | test20 | negative | INCONCLUSIVE | Rejected, but for the wrong reason (parser error on type definition, not type error on invalid value) |
| 49 | General union type `Int \| String` | union-types.md "General Union Types" | test35 | positive | **FAIL** | `type FlexibleId = Int \| String;` definition parses, but `let id1: FlexibleId = 42;` fails with "Cannot unify Int with FlexibleId" |

### Built-in vs User-Defined Constructor Behavior

| # | Feature | Spec Reference | Test File | Test Type | Result | Notes |
|---|---------|---------------|-----------|-----------|--------|-------|
| 50 | Some/Ok/Err without type definition (runtime) | variant-types.md | test04b, test04c, test53 | positive | **FAIL** | Type checker accepts `Some(42)` without `type Option<T>` definition, but codegen does not emit constructor - runtime ReferenceError |

## Critical Bugs Found

### Bug 1: User-defined variant constructors not recognized as values
**Severity**: Critical
**Affects**: All user-defined variant types except built-in Option/Result constructors
**Description**: When you define `type Shape = Circle(Int) | Rectangle(Int, Int);`, the constructors `Circle` and `Rectangle` are NOT registered in the type checker's value environment. They cannot be used in expressions like `let s = Circle(5);`. Only the built-in constructors `Some`, `None`, `Ok`, `Err` work as expression-level constructors.
**Tests**: #2, #3, #10-15, #24, #40, #41, #45

### Bug 2: No-data constructors cause internal error when used as function arguments
**Severity**: Critical
**Affects**: `None` and any no-data variant constructor used in function call position or with type annotations
**Description**: Using `None` as a function argument or in `let x: Option<Int> = None;` triggers "Internal error: Function type must have at least one parameter". The type checker attempts to treat `None` as a function type but it has zero parameters.
**Tests**: #6, #8, #37, #38, #39 (5 tests)

### Bug 3: Codegen does not emit constructors for built-in types unless explicitly defined
**Severity**: Medium
**Affects**: Code using `Some`/`None`/`Ok`/`Err` without defining the corresponding type
**Description**: The type checker has built-in knowledge of `Some`, `None`, `Ok`, `Err`, so `Some(42)` type-checks without a `type Option<T>` definition. But the code generator only emits constructor functions for user-written type definitions. This causes a runtime ReferenceError.
**Tests**: #50

### Bug 4: Unguarded recursive types not rejected
**Severity**: Low
**Affects**: `type Bad = Bad;` and similar degenerate recursive types
**Description**: The spec says direct self-reference without a constructor guard should be an error, but `type Bad = Bad;` compiles without error.
**Tests**: #42

### Bug 5: String literal union types not supported
**Severity**: Medium
**Affects**: All string literal union type definitions
**Description**: `type Status = "pending" | "active" | "complete";` fails with "Expected type expression". The parser does not support string literals in type position, despite the spec defining this feature.
**Tests**: #46, #47, #48

### Bug 6: Spec uses unsupported `=;` multiline syntax
**Severity**: Low (documentation issue)
**Affects**: Spec examples in recursive-types.md
**Description**: The spec shows `type List<T> =;` with a semicolon after `=` before the pipe-delimited variants. This syntax is not supported. The correct syntax is `type List<T> =` (no semicolon) followed by `| Cons(T, List<T>) | Nil;`.
**Tests**: #35

## Summary
- **Total**: 50 tests
- **Pass**: 26
- **Fail**: 22
- **Inconclusive**: 2

### Pass/Fail by Category
| Category | Pass | Fail | Inconclusive |
|----------|------|------|--------------|
| Simple Enum Variants | 1 | 2 | 0 |
| Data-Carrying (Built-in) | 4 | 2 | 0 |
| Data-Carrying (User-Defined) | 0 | 6 | 0 |
| Generic Variants | 4 | 0 | 0 |
| Constructors as Values | 3 | 0 | 0 |
| Nominal Typing | 1 | 0 | 1 |
| Advanced Pattern Matching | 6 | 0 | 0 |
| Variant Data Types | 3 | 0 | 0 |
| Multi-line Syntax | 1 | 1 | 0 |
| Recursive Types | 1 | 5 | 0 |
| Unguarded Recursion | 0 | 1 | 0 |
| Mutually Recursive Types | 2 | 1 | 0 |
| Union Types | 0 | 3 | 1 |
| Built-in vs User-Defined | 0 | 1 | 0 |

### Root Cause Analysis
Most failures trace back to two dominant root causes:
1. **User-defined constructors not in scope** (Bug 1) - affects 14 tests. Only `Some`/`None`/`Ok`/`Err` are hardcoded as known constructors.
2. **No-data constructor internal error** (Bug 2) - affects 5 tests (#6, #8, #37-39). `None`, `Nil`, `Zero` etc. cannot be passed as function arguments or used with type annotations.

If these two bugs were fixed, the estimated pass count would rise from 27 to approximately 43-45.
