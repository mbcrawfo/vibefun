# Ungrouped Issues

These failures don't fit neatly into the cross-cutting groups above. Each is relatively isolated.

## 1. Explicit Type Parameters on Functions (Section 03)
- **Tests:** 2 (polymorphic identity function, generic function)
- **Issue:** Parser doesn't recognize `<T>` before lambda params; `<` is treated as a less-than operator
- **Scope:** Medium (2-8 hours)
- **Notes:** Type inference already works for polymorphic functions without explicit annotations. This is about optional explicit syntax.

## 2. String Literal Union Types (Section 03)
- **Tests:** 1
- **Issue:** Parser rejects string literals in type definitions (`type Status = "pending" | "active"`)
- **Scope:** Medium (2-8 hours)
- **Notes:** Requires parser + typechecker additions for string literal types.

## 3. Lambda Parameter Destructuring (Section 06)
- **Tests:** 1
- **Issue:** Typechecker explicitly rejects non-variable patterns in lambda parameters (VF4017)
- **Scope:** Large (1-3 days)
- **Notes:** Requires desugaring to `(temp) => match temp { | pattern => body }`.

## 4. Division-by-Zero Runtime Checks (Section 09)
- **Tests:** 2 (integer division, integer modulo)
- **Issue:** Codegen emits `Math.trunc(a/b)` and `a%b` without zero-divisor guard. Spec requires panic.
- **Scope:** Small (1-2 hours)
- **Notes:** Localized codegen change. Float division correctly produces Infinity/NaN via JS semantics. Fully independent -- can be done anytime.

## 5. Record Width Subtyping Direction (Section 03)
- **Tests:** Part of the type declaration validation category in Group 2
- **Issue:** Width subtyping is bidirectional (ignores missing fields in both directions). Should only allow extra fields in arguments, not missing required fields.
- **Scope:** Medium (2-8 hours)
- **Notes:** Should be addressed alongside Group 2 (type declaration validation sub-item).

## 6. Nullary Constructor Type Annotation Crash (Sections 03, 05, 09, 11)
- **Tests:** ~3-4 tests across sections
- **Issue:** `None` and `Nil` are typed as `funType([])` (zero-param function type). `typeToString` in `format.ts:23` crashes with "Function type must have at least one parameter" when a type annotation forces formatting. Triggered by `let x: Option<Int> = None`.
- **Scope:** Small (1-2 hours)
- **Notes:** Fix either `typeToString` to handle zero-param function types, or change nullary constructor representation to use the return type directly. Independent of Group 2 despite both involving constructors.

## 7. Test Fixture Type Redefinition Conflicts (Section 11)
- **Tests:** ~19 tests in section 11
- **Issue:** Tests redundantly redefine `Option` and `Result` as user types, conflicting with built-in types. `Some(5)` bound to built-in `Option` doesn't unify with user-defined `Option`.
- **Scope:** Small (1-2 hours) -- test authoring fix only
- **Notes:** Remove the `type Option<T> = ...` and `type Result<T, E> = ...` declarations from test fixtures since these are already built-in types.

## Decision Points (not implementation gaps)

These items require design decisions before implementation can proceed:

### D1. Prefix `!` vs Postfix `!` for Dereference
- **Current state:** Implementation uses postfix `x!` for dereference. Spec defines prefix `!x` with type-based disambiguation.
- **Tradeoff:** Postfix avoids type-directed parsing ambiguity. Prefix matches ML-family convention.
- **Impact:** Affects all mutable reference tests (Group 3c). Must be decided before implementing Group 3c.

### ~~D2. `f(a, b)` Auto-Desugaring to `f(a)(b)`~~ — Resolved
The spec is explicit that `f(a, b)` is sugar for `f(a)(b)` (see `docs/spec/06-functions.md`). This is not an open decision — it is an implementation task tracked as Group 4.

## Infrastructure Issues (not language features)

### I1. Stale CLI Build Inflating Failure Count
- **Issue:** Running `spec:validate` without first building the CLI (`pnpm run build`) causes ~35 additional false failures. The spec validation script should either auto-build or warn.
- **Scope:** Small (trivial fix to test runner)
