# Feature Audit: Type Inference, Generics, and Type Aliases

**Spec files**: 03-type-system/type-inference.md, generic-types.md, type-aliases.md
**Date**: 2026-03-26
**Test directory**: /tmp/vf-audit-inference/

## Results

### Basic Type Inference

| # | Feature | Spec Reference | Test File | Test Type | Result | Notes |
|---|---------|---------------|-----------|-----------|--------|-------|
| 1 | Int inferred from literal | type-inference.md | test01-int-infer.vf | positive | PASS | `let x = 42` correctly inferred as Int |
| 2 | String inferred from literal | type-inference.md | test02-string-infer.vf | positive | PASS | `let s = "hello"` correctly inferred as String |
| 3 | Bool inferred from literal | type-inference.md | test03-bool-infer.vf | positive | PASS | `let b = true` correctly inferred as Bool |
| 4 | Float inferred from literal | type-inference.md | test28-float-infer.vf | positive | PASS | `let x = 3.14` correctly inferred as Float |
| 5 | Function type inferred from body | type-inference.md | test04-func-infer.vf | positive | PASS | `let inc = (x) => x + 1` infers (Int) -> Int |
| 6 | Return type inferred from body | type-inference.md | test05-return-type-infer.vf | positive | PASS | `let double = (x) => x * 2` infers correctly |
| 7 | String concat type inferred | type-inference.md | test40-string-concat-infer.vf | positive | PASS | `(name) => "Hello, " & name` infers (String) -> String |
| 8 | Block body type inferred | type-inference.md | test47-block-body-infer.vf | positive | PASS | Last expression in block determines return type |

### Let-Polymorphism

| # | Feature | Spec Reference | Test File | Test Type | Result | Notes |
|---|---------|---------------|-----------|-----------|--------|-------|
| 9 | Polymorphic identity | type-inference.md "Generalization" | test06-poly-identity.vf | positive | PASS | `let id = (x) => x` used with Int, String, Bool |
| 10 | id used at different types | type-inference.md | test11-poly-usage.vf | positive | PASS | `id(42)` and `id("world")` both work |
| 11 | Nested let-binding polymorphism | type-inference.md "Nested Let-Bindings" | test26-nested-let-poly.vf | positive | PASS | Inner `let inner = (x) => x` generalized; used with Int and String |
| 12 | `id(id)` should produce `(T) -> T` | type-inference.md "Polymorphic Instantiation" | test31-id-of-id.vf | positive | **FAIL** | Infinite type error `'n = 'n -> 'n`. Spec says id should be generalized so `id(id)` should instantiate T independently for argument and parameter |
| 13 | Polymorphic `apply` at different types | type-inference.md | test37-poly-apply-diff-types.vf | positive | PASS | `apply(inc)(41)` and `apply(upper)("hello")` both work |

### Generic Types

| # | Feature | Spec Reference | Test File | Test Type | Result | Notes |
|---|---------|---------------|-----------|-----------|--------|-------|
| 14 | Generic record type definition | generic-types.md | test08-generic-record.vf | positive | **FAIL** | `let b: Box<Int> = { value: 42 }` fails: "Cannot unify { value: Int } with Box\<Int\>". Type alias not expanded in annotation |
| 15 | Generic record without annotation | generic-types.md | test09-generic-record-infer.vf | positive | PASS | `let b = { value: 42 }` works fine when no alias annotation used |
| 16 | Multi-param generic type | generic-types.md | test10-generic-pair.vf | positive | **FAIL** | `let p: Pair<Int, String> = { first: 42, second: "hello" }` fails same as test 14 |
| 17 | Multi-param generic without annotation | generic-types.md | test29-generic-pair-no-annot.vf | positive | PASS | Works when no alias annotation used |
| 18 | Nested generic records | generic-types.md | test50-nested-generics.vf | positive | PASS | Nested `{ left: { value: 1 }, right: { value: "hello" } }` inferred correctly |

### Generic Functions

| # | Feature | Spec Reference | Test File | Test Type | Result | Notes |
|---|---------|---------------|-----------|-----------|--------|-------|
| 19 | Constrained inference (first) | type-inference.md | test12-first-func.vf | positive | PASS | `let first = (a) => (b) => a` used polymorphically |
| 20 | applyTwice inferred | type-inference.md | test27-applyTwice.vf | positive | PASS | `let applyTwice = (f) => (x) => f(f(x))` inferred and works |
| 21 | apply with different function types | type-inference.md | test36b-generic-func-apply.vf | positive | PASS | `apply(inc)(41)` works |
| 22 | Explicit type parameter syntax | type-inference.md "Type Variable Syntax" | test52-explicit-type-param.vf | positive | **FAIL** | `let identity = <T>(x: T): T => x` parse error on `<`. Spec shows this syntax but parser does not support it |
| 23 | Partial application type inferred | type-inference.md | test45-partial-app-infer.vf | positive | PASS | `let add5 = add(5)` correctly infers curried type |
| 24 | Pipe operator type inferred | type-inference.md | test46-pipe-infer.vf | positive | PASS | `20 |> inc |> double` correctly infers types through pipe |

### Type Aliases

| # | Feature | Spec Reference | Test File | Test Type | Result | Notes |
|---|---------|---------------|-----------|-----------|--------|-------|
| 25 | Simple alias `type UserId = Int` | type-aliases.md "Transparent Type Aliases" | test13-simple-alias.vf | positive | **FAIL** | `let id: UserId = 42` fails: "Cannot unify Int with UserId". Spec says aliases are transparent but they are treated as nominal |
| 26 | Alias transparency (interchangeable) | type-aliases.md "Transparent Type Aliases" | test14-alias-transparency.vf | positive | **FAIL** | `let userId: UserId = 42` fails. Spec explicitly says UserId and Int should be interchangeable |
| 27 | Generic type alias for functions | type-aliases.md "Generic Type Aliases" | test15-generic-alias.vf | positive | **FAIL** | `let myCallback: Callback<String> = (s) => ...` fails: "Cannot unify String -> Unit with Callback\<String\>" |
| 28 | Alias used in param annotation | type-aliases.md | test16-alias-in-func.vf | positive | PASS | `(a: UserId, b: Int) => a + b` works; alias transparent in parameter position |
| 29 | Alias used in return type annotation | type-aliases.md | test43-alias-return-type.vf | positive | PASS | `(n: Int): UserId => n` compiles and runs |
| 30 | Non-generic record alias in let annot | type-aliases.md | test41-record-alias-let-annot.vf | positive | **FAIL** | `let p: Point = { x: 1, y: 2 }` fails: "Cannot unify { x: Int, y: Int } with Point" |
| 31 | Function type alias in let annotation | type-aliases.md | test51-alias-func-type.vf | positive | **FAIL** | `let double: Transform = (x) => x * 2` fails: "Cannot unify Int -> Int with Transform" |
| 32 | Alias in param annotation (generic record) | type-aliases.md | test33-record-alias-annot-param.vf | positive | PASS | `(b: Box<Int>) => b.value` works with record literal argument |
| 33 | Alias without annotation (no effect) | type-aliases.md | test42-alias-without-annot.vf | positive | PASS | Type alias defined but not used in annotation; inference works |
| 34 | Recursive alias rejected | type-aliases.md "Recursive Type Aliases" | test44-recursive-alias-neg.vf | negative | **FAIL** | `type BadList<T> = (T, BadList<T>)` compiles without error. Spec says recursive aliases should be rejected |

### Value Restriction

| # | Feature | Spec Reference | Test File | Test Type | Result | Notes |
|---|---------|---------------|-----------|-----------|--------|-------|
| 35 | Lambda is generalized (value) | type-inference.md "Value Restriction" | test17-value-restriction-lambda.vf | positive | PASS | `let id = (x) => x` generalized; `id(42)` and `id("hello")` both work |
| 36 | Eta-expansion workaround | type-inference.md "Eta-Expansion" | test19-eta-expansion.vf | positive | **FAIL** | `let composed = (x) => id(id)(x)` fails with infinite type error on `id(id)` (same root cause as test 12) |

### Inference with Records

| # | Feature | Spec Reference | Test File | Test Type | Result | Notes |
|---|---------|---------------|-----------|-----------|--------|-------|
| 37 | Record field access infers type | type-inference.md "Annotations NOT Required" | test20-record-field-infer.vf | positive | PASS | `(p) => p.name` correctly infers record type from field access |
| 38 | Multiple field accesses on same record | type-inference.md | test21-multi-field-infer.vf | positive | **FAIL** | `(p) => p.name & intToStr(p.age)` fails: "Field 'age' not found". First field access constrains type to `{ name: String }` without row variable |

### Inference with Pattern Matching

| # | Feature | Spec Reference | Test File | Test Type | Result | Notes |
|---|---------|---------------|-----------|-----------|--------|-------|
| 39 | Match expression infers types | type-inference.md | test22-match-infer.vf | positive | PASS | `match x { | 0 => "zero" | _ => "nonzero" }` correctly infers String |
| 40 | Recursive function type inferred via match | type-inference.md | test38-recursive-type-infer.vf | positive | PASS | `let rec factorial = (n) => match n { ... }` correctly inferred |

### Division Type Inference

| # | Feature | Spec Reference | Test File | Test Type | Result | Notes |
|---|---------|---------------|-----------|-----------|--------|-------|
| 41 | Division defaults to Float | type-inference.md (AI guide 2.5) | test30-division-default-float.vf | positive | PASS | `let divide = (a, b) => a / b` with floats gives 3.333... |
| 42 | Int division with annotation | type-inference.md (AI guide 2.5) | test34-int-division-annot.vf | positive | **FAIL** | `let intDiv = (x: Int, y: Int) => x / y` produces 3.333... instead of 3. Spec says Int division should truncate toward zero |

### Negative Tests (should be rejected)

| # | Feature | Spec Reference | Test File | Test Type | Result | Notes |
|---|---------|---------------|-----------|-----------|--------|-------|
| 43 | Type mismatch caught | type-inference.md | test23-type-mismatch-neg.vf | negative | PASS | `let x: Int = "hello"` correctly rejected |
| 44 | Wrong type in function call | type-inference.md | test24-wrong-generic-neg.vf | negative | PASS | `add(1)("hello")` correctly rejected |
| 45 | Occurs check (infinite type) | type-inference.md | test25-occurs-check-neg.vf | negative | PASS | `let rec f = (x) => f` correctly rejected with infinite type error |
| 46 | No Int/Float coercion | type-inference.md | test35-no-coercion-neg.vf | negative | PASS | `5 + 2.0` correctly rejected |
| 47 | Constrained function rejects wrong type | type-inference.md | test49-constrain-poly-neg.vf | negative | PASS | `wrappedInt("hello")` where wrappedInt: (Int) -> Int correctly rejected |

### Constraining Polymorphism

| # | Feature | Spec Reference | Test File | Test Type | Result | Notes |
|---|---------|---------------|-----------|-----------|--------|-------|
| 48 | Annotation constrains to specific type | type-inference.md "Constraining Polymorphism" | test48-constrain-poly.vf | positive | PASS | `let wrappedInt: (Int) -> Int = (x) => x` works |

## Summary

- **Total**: 48 tests
- **Pass**: 35
- **Fail**: 13

### Critical Bugs Found

1. **Type aliases are NOT transparent in let-annotations** (tests 25, 26, 27, 30, 31): The spec states type aliases are "completely interchangeable" with their underlying types. In practice, `let x: UserId = 42` fails with "Cannot unify Int with UserId". This affects simple aliases, generic aliases, record aliases, and function type aliases. However, aliases DO work correctly in parameter annotations (`a: UserId`) and return type annotations (`(): UserId`). The bug is specifically in let-binding type annotations.

2. **`id(id)` causes infinite type error** (tests 12, 36): In a proper Hindley-Milner system with let-polymorphism, `id(id)` should work because `id` is generalized to `<T>(T) -> T`, and the call should instantiate T as `(T2) -> T2`. Instead, the compiler fails with "Cannot construct infinite type: 'n = 'n -> 'n", suggesting `id` is not being properly instantiated with fresh type variables when used as an argument.

3. **Integer division produces Float results** (test 42): `let intDiv = (x: Int, y: Int) => x / y; intDiv(10)(3)` produces `3.333...` instead of `3`. The spec says Int division should truncate toward zero.

4. **Multiple field accesses on inferred record fail** (test 38): `(p) => p.name & intToStr(p.age)` fails because the first field access `p.name` constrains the type to `{ name: String }` without a row variable, so `p.age` is not found. Row polymorphism / open record types are not working for multi-field inference.

5. **Recursive type aliases not rejected** (test 34): `type BadList<T> = (T, BadList<T>)` compiles without error. The spec explicitly says recursive type aliases should be rejected.

6. **Explicit type parameter syntax not supported** (test 22): `let identity = <T>(x: T): T => x` fails to parse. The spec shows this as valid syntax for generic functions.

7. **Generic record type annotation in let-binding fails** (tests 14, 16): `let b: Box<Int> = { value: 42 }` fails. This is a consequence of bug #1 (alias non-transparency) but particularly notable for generic types.
