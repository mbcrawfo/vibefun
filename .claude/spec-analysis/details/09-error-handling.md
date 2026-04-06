# 09 - Error Handling: Spec Validation Analysis

## Summary

Section 09 covers error handling semantics including division by zero behavior, IEEE 754 float special values (NaN, Infinity), and the Result/Option algebraic data types for error handling. All 14 tests fail (0 pass). The failures stem from five distinct root causes, with the most impactful being the inability to resolve module-qualified builtin function names (e.g., `String.fromInt`), which blocks 10 of the 14 tests. The remaining failures are caused by missing runtime division-by-zero checks (2 tests), arithmetic/comparison operators being restricted to Int only (3 tests, overlapping with String issue), and unary negation being restricted to Int only (1 test, also overlapping with String issue).

## Failure Categories

### Category 1: Module-Qualified Builtin Name Resolution Not Implemented
- **Tests affected:** "float division by zero returns Infinity", "float 0/0 returns NaN", "Result type - Ok variant", "Result type - Err variant", "Option type - Some variant", "nested Result in Option", "NaN self-equality is false", "Infinity plus one is still Infinity", "Infinity minus Infinity is NaN", "Infinity comparison with finite number"
- **Root cause:** The compiler registers standard library functions with dotted keys in the type environment (e.g., `"String.fromInt"`, `"String.fromFloat"` as flat string keys in the `Map<string, TypeScheme>`). However, when the parser encounters `String.fromInt(42)`, it produces a `RecordAccess` AST node on a `Var("String")`. The typechecker's `inferVar` function looks up `"String"` (not `"String.fromInt"`) in the environment, and since there is no `String` variable, it throws `VF4100: Undefined variable 'String'`. There is no mechanism to bridge module-style dotted name access to the flat dotted-key builtins. Additionally, `String.fromBool` (used by 3 tests) is not even defined in the builtin environment at all. Even if name resolution were fixed, the code generator has no special handling for these stdlib functions -- it does not emit JavaScript runtime implementations for `String.fromInt`, `String.fromFloat`, etc.
- **Spec reference:** `09-error-handling.md` (uses `String.fromInt` in Result/Option examples); `11-stdlib/string.md`, `11-stdlib/numeric.md` (define `String.fromInt`, `String.fromFloat`, etc.)
- **Scope estimate:** Large (1-3 days) -- Requires implementing either (a) a module namespace system where `String`, `Int`, `Float`, etc. are pseudo-modules in the value environment, or (b) special-casing the `RecordAccess` on known stdlib module names. Also requires implementing the JavaScript runtime for all stdlib functions (the `@vibefun/std` package is currently a placeholder). Also need to add `String.fromBool` to the builtin type environment.
- **Complexity:** High -- This is a cross-cutting concern touching the typechecker (name resolution), code generator (runtime emission), and potentially the desugarer. It affects the majority of spec validation tests across all sections, not just section 09.
- **Notes:** This is the single most impactful missing feature across the entire spec validation suite. The 11-stdlib section has 52 failures out of 53 tests, almost all due to this same root cause. The `withOutput` test helper wraps test code with `String.fromInt(...)` / `String.fromFloat(...)` / `String.fromBool(...)` calls, so any test that needs to observe runtime output is blocked.

### Category 2: Missing Division-by-Zero Runtime Checks
- **Tests affected:** "integer division by zero panics", "integer modulo by zero panics"
- **Root cause:** Integer division compiles to `Math.trunc(a / b)` and integer modulo compiles to `a % b` without any runtime guard. Per the spec, integer division by zero should cause a runtime panic (throw an error). In JavaScript, `Math.trunc(1 / 0)` returns `Infinity`, and `1 % 0` returns `NaN` -- neither throws. The codegen needs to emit a runtime check like `if (b === 0) throw new Error("Division by zero")` before the division/modulo operation for integer operands.
- **Spec reference:** `09-error-handling.md` -- "Integer division by zero causes a runtime panic" and the summary table listing "Integer division by zero -> Panic".
- **Scope estimate:** Small (1-2 hours) -- The codegen's `emitBinOp` function already has special handling for `IntDivide`. Adding a divisor-zero check for `IntDivide` and `Modulo` (when operand types are Int) is straightforward.
- **Complexity:** Low -- Localized change in `packages/core/src/codegen/es2020/emit-expressions.ts`, affecting only the `IntDivide` and `Modulo` cases.
- **Notes:** Float division by zero correctly produces `Infinity`/`NaN` via IEEE 754 semantics (JavaScript's native behavior), which matches the spec. Only integer division/modulo needs the runtime check.

### Category 3: Arithmetic and Comparison Operators Restricted to Int
- **Tests affected:** "Infinity plus one is still Infinity" (also blocked by Category 1), "Infinity minus Infinity is NaN" (also blocked by Category 1), "Infinity comparison with finite number" (also blocked by Category 1)
- **Root cause:** In `packages/core/src/typechecker/infer/infer-operators.ts`, the `getBinOpTypes` function hardcodes `Add`, `Subtract`, `Multiply`, `Modulo`, `LessThan`, `LessEqual`, `GreaterThan`, and `GreaterEqual` to require `Int` operands. The code has a TODO comment: "TODO: Add polymorphic arithmetic to support Float operators". The `/` (Divide) operator has special-case logic that correctly supports both Int and Float via lowering to `IntDivide`/`FloatDivide`, but no other arithmetic or comparison operator has this treatment. When the tests try `inf + 1.0` or `inf > 1000000.0` where `inf` is a `Float`, the typechecker emits `VF4020: Cannot unify Float with Int`.
- **Spec reference:** `09-error-handling.md` -- Float special values section shows operations like `inf + 1.0`, `inf - inf`, etc. Also `03-type-system/primitive-types.md` and `04-expressions/basic-expressions.md` which define arithmetic as polymorphic over Int and Float.
- **Scope estimate:** Medium (2-8 hours) -- Each arithmetic and comparison operator needs the same type-lowering treatment that `Divide` already has: infer operand types, then dispatch to Int-specific or Float-specific variant. The Divide implementation can serve as a template.
- **Complexity:** Medium -- Requires extending `inferBinOp` with special-case logic for each operator (similar to the existing Divide handling), adding new operator variants to the core AST if needed (e.g., `IntAdd`/`FloatAdd`), and updating the code generator accordingly.
- **Notes:** All 3 tests in this category are also blocked by Category 1 (String module resolution). Even after fixing operator polymorphism, these tests would still fail unless Category 1 is also resolved. This is also a dependency for tests in other sections (e.g., section 04 expressions).

### Category 4: Unary Negation Restricted to Int
- **Tests affected:** "negative float division by zero returns -Infinity" (also blocked by Category 1)
- **Root cause:** In `packages/core/src/typechecker/infer/infer-operators.ts`, the `getUnaryOpTypes` function for `Negate` hardcodes the parameter type to `Int`. The comment says "Negation: Int -> Int or Float -> Float" but the implementation says "For simplicity, require Int". When the test writes `-1.0 / 0.0`, the parser creates a `Negate` unary op on the float literal `1.0`, and the typechecker rejects it with `VF4020: Cannot unify Float with Int`.
- **Spec reference:** `09-error-handling.md` -- Float division section shows `-10.0 / 0.0` producing `-Infinity`. Also `04-expressions/basic-expressions.md` which defines negation as working on both Int and Float.
- **Scope estimate:** Small (1-2 hours) -- Similar to Category 3 but only for the single `Negate` operator. Needs the same type-inference-then-lowering approach.
- **Complexity:** Low -- Localized change in the unary operator inference function.
- **Notes:** This test is also blocked by Category 1 (String module resolution). The fix needs to infer the operand type first, then constrain Negate to work with either Int or Float (but not other types).

### Category 5: Nullary Variant Constructor Crash in Pattern Matching (Internal Error)
- **Tests affected:** "Option type - None variant" (also blocked by Category 1)
- **Root cause:** When pattern matching encounters a redefined nullary variant constructor like `None` (from `type Option<T> = Some(T) | None`), the typechecker/formatter crashes with "Internal error: Function type must have at least one parameter" (exit code 5). This occurs in `packages/core/src/typechecker/format.ts` line 24 when `typeToString` is called on a `Fun` type with zero parameters. The builtin `None` is typed as `() -> Option<T>` (a function with empty params list), and when this type needs to be formatted (e.g., during type checking of the match expression), the formatter crashes because it assumes all function types have at least one parameter.
- **Spec reference:** `09-error-handling.md` -- Option type examples showing `None` used in pattern matching.
- **Scope estimate:** Small (1-2 hours) -- The `typeToString` function needs to handle zero-parameter function types (representing nullary constructors). The fix is likely a small change in `format.ts` plus possibly in how nullary constructors are represented in the type system.
- **Complexity:** Low -- The crash is in the formatter, but the underlying issue may be in how nullary constructors interact with user-defined type declarations that shadow built-in types.
- **Notes:** This test is also blocked by Category 1 (uses `String.fromInt`). The crash only manifests when the user redefines the `Option` type (which the test does with `type Option<T> = Some(T) | None`). Using the built-in `None` without redefinition does not crash. The specific trigger appears to be the interaction between user-defined variant types and pattern matching on nullary constructors.

## Dependencies

- **Category 1 (String module resolution)** is a blocker for all tests in this section. No test can pass without either fixing module-qualified builtin resolution or rewriting tests to avoid `String.fromInt`/`String.fromFloat`/`String.fromBool`.
- **Category 3 (Float arithmetic)** and **Category 4 (Float negation)** are sub-problems of a larger "polymorphic numeric operators" feature that affects sections 04, 09, 11, and 12.
- **Category 1** depends on the standard library runtime implementation (`@vibefun/std` package), which is currently a placeholder with only a version constant.
- **Category 5** may also affect section 05 (pattern matching) and section 03 (type system) tests that involve nullary variant constructors in user-defined types.

## Summary Table

| Category | Tests | Root Cause | Scope | Complexity |
|----------|-------|------------|-------|------------|
| Module-qualified builtin name resolution | 10 (all that use String.fromX) | Parser produces RecordAccess on Var("String") but builtins are flat dotted keys; no module namespace system; no stdlib runtime | Large (1-3 days) | High |
| Missing division-by-zero runtime checks | 2 (int div, int mod) | Codegen emits Math.trunc(a/b) and a%b without zero checks | Small (1-2 hours) | Low |
| Arithmetic/comparison operators Int-only | 3 (also blocked by Cat. 1) | getBinOpTypes hardcodes Add/Subtract/Multiply/comparisons to Int | Medium (2-8 hours) | Medium |
| Unary negation Int-only | 1 (also blocked by Cat. 1) | getUnaryOpTypes hardcodes Negate to Int | Small (1-2 hours) | Low |
| Nullary variant constructor crash | 1 (also blocked by Cat. 1) | typeToString crashes on Fun type with 0 params from nullary constructors | Small (1-2 hours) | Low |
