# 07 - Mutable References: Spec Validation Analysis

## Summary

Section 07 covers mutable references (`Ref<T>`) -- creation with `ref()` and `mut`, dereference with prefix `!`, assignment with `:=`, type-based disambiguation of `!`, ref equality/aliasing, and refs in data structures and closures. Of 19 tests, 5 pass and 14 fail. The failures stem from four distinct root causes: (1) the prefix `!` operator always parses as `LogicalNot` rather than `Deref`, (2) the `String` module functions (e.g., `String.fromInt`) are unreachable because dotted stdlib names cannot be resolved by the typechecker, (3) `let mut` inside function bodies is explicitly unimplemented in the typechecker (VF4017), and (4) top-level bare expressions (like `x := 20;`) are rejected by the parser (VF2000). The majority of failures (12 of 14) involve the `String` stdlib resolution issue, which is a cross-cutting problem affecting many spec sections beyond just mutable references.

Note: The failing test list provided in the task description (17 failures, 2 passes) differs from the current run (14 failures, 5 passes). This analysis reflects the actual current state.

## Failure Categories

### Category 1: Prefix `!` always parses as LogicalNot instead of Deref

- **Tests affected:** "dereference with !", "dereference string ref", "! as dereference for Ref", "update ref with :=" (partial), "update ref with computed value" (partial), "two refs to same value are not equal", "aliased refs are equal", "mutations visible through aliases", "while loop with mutable counter" (partial), "record with ref field" (partial), "closure captures ref" (partial), "multiple updates to same ref" (partial)
- **Root cause:** In `/workspace/packages/core/src/parser/parse-expression-operators.ts` line 480, the prefix `!` operator always generates `op: "LogicalNot"` regardless of the operand type. Only the postfix `!` (line 573) generates `op: "Deref"`. However, the spec defines `!x` (prefix) as the dereference operator for `Ref<T>` types, with type-based disambiguation between logical NOT (for `Bool`) and dereference (for `Ref<T>`). When the typechecker encounters a `LogicalNot` on a `Ref<T>` operand, it tries to unify `Ref<T>` with `Bool` and fails with `VF4024: Cannot unify types: Ref<T> with Bool`. The type-based disambiguation described in the spec (Section "The `!` Operator: Type-Based Disambiguation") is not implemented -- the parser makes the decision statically based on operator position (prefix=NOT, postfix=Deref) rather than the typechecker disambiguating based on operand type.
- **Spec reference:** `07-mutable-references.md`, section "The `!` Operator: Type-Based Disambiguation" -- "The compiler distinguishes between these uses based on the type of the operand"
- **Scope estimate:** Medium (2-8 hours)
- **Complexity:** Medium
- **Notes:** Requires either: (a) changing the parser to emit a generic `Bang` operator and having the typechecker disambiguate based on type, or (b) implementing a type-directed resolution pass that rewrites `LogicalNot` to `Deref` when the operand has `Ref<T>` type. The postfix `!` (e.g., `x!`) correctly generates `Deref` and the typechecker + codegen handle it properly. The codegen for `Deref` emits `x.$value` and for `RefAssign` emits `(x.$value = value, undefined)`, both of which are correct.

### Category 2: Stdlib module-qualified names (e.g., String.fromInt) unresolvable

- **Tests affected:** "dereference with !", "dereference string ref", "update ref with :=", "update ref with computed value", "! as logical NOT for Bool", "! as dereference for Ref", "two refs to same value are not equal", "aliased refs are equal", "mutations visible through aliases", "while loop with mutable counter", "record with ref field", "multiple updates to same ref"
- **Root cause:** The stdlib builtin functions are registered in the typechecker value environment with dotted keys like `"String.fromInt"` (see `/workspace/packages/core/src/typechecker/builtins.ts` line 226). However, the parser parses `String.fromInt(x)` as a `RecordAccess` expression: first it looks up `String` as a variable, then accesses field `fromInt`. The typechecker then tries `env.values.get("String")`, which fails with `VF4100: Undefined variable 'String'` because only the full dotted name `"String.fromInt"` exists in the environment, not a `String` namespace object. There is no mechanism to resolve dotted-name calls into their combined key form.
- **Spec reference:** `07-mutable-references.md` (examples use `String.fromInt`); `11-stdlib/string.md` (defines `String.fromInt`, `String.fromBool`, etc.)
- **Scope estimate:** Large (1-3 days)
- **Complexity:** High
- **Notes:** This is NOT a mutable-references-specific issue. It affects nearly every spec validation test that uses runtime output verification via `String.fromInt`, `String.fromBool`, `String.fromFloat`, etc. The test for "! as logical NOT for Bool" fails purely due to this -- it uses `String.fromBool(x)` which, additionally, is not even registered in builtins (only specified in the spec). Many of the 14 failures in this section would still fail even if this were fixed, because they also require prefix `!` disambiguation (Category 1). Solutions include: (a) introducing namespace objects in the value environment, (b) adding a desugaring pass that recognizes `RecordAccess` on known module names and rewrites to a direct lookup, or (c) restructuring the stdlib to use non-dotted names.

### Category 3: Mutable let-bindings (let mut) unimplemented in expression context

- **Tests affected:** "closure captures ref (makeCounter pattern)", "while loop with mutable counter" (secondary), "record with ref field" (when code is nested in functions)
- **Root cause:** In `/workspace/packages/core/src/typechecker/infer/infer-bindings.ts` lines 80-85, the `inferLet` function explicitly throws `VF4017: "Mutable let-bindings not yet implemented"` when `expr.mutable` is true. This affects all `let mut` bindings inside function bodies / lambda expressions. Top-level `let mut` declarations work because they go through `typeCheckDeclaration` in `/workspace/packages/core/src/typechecker/typechecker.ts`, which does not check the `mutable` flag. The "closure captures ref" test specifically fails with exit code 5 (`Internal error: Lambda with zero parameters`) because zero-parameter lambdas are broken, which is a separate issue that blocks testing the nested `let mut`.
- **Spec reference:** `07-mutable-references.md`, section "Example: Refs in Closures" -- `let makeCounter = () => { let mut count = ref(0); ... }`
- **Scope estimate:** Medium (2-8 hours)
- **Complexity:** Medium
- **Notes:** There is a secondary codegen issue: when `mutable: true`, the codegen wraps the value in `{ $value: ... }`, but `ref(x)` already produces `{ $value: x }` via the runtime helper `const ref = ($value) => ({ $value })`. This creates double-wrapping: `let mut x = ref(42)` generates `const x = { $value: ref(42) }` which is `{ $value: { $value: 42 } }`. The deref codegen (`x.$value`) would unwrap only one level, producing `{ $value: 42 }` instead of `42`. Either the `mut` wrapping should be removed (letting `ref()` be the sole wrapper), or the codegen for deref/assign should account for the double wrapping.

### Category 4: Top-level bare expressions not supported by parser

- **Tests affected:** "update ref with :=", "update ref with computed value", "while loop with mutable counter", "record with ref field", "mutations visible through aliases", "multiple updates to same ref"
- **Root cause:** The parser only accepts keyword-starting declarations (`let`, `type`, `external`, `import`, `export`) at the top level. Bare expressions like `x := 20;` or `while ... { ... };` are rejected with `VF2000: Expected declaration keyword`. The test code places `x := 20;` and `while ...` at the module top level. The spec (section 08-modules.md, "Top-Level Expression Evaluation") states that modules can contain top-level expressions. The test helper `withOutput` generates code like:
  ```
  external console_log: ...;
  let mut x = ref(10);
  x := 20;                    <-- fails: not a declaration
  let _ = unsafe { ... };
  ```
- **Spec reference:** `08-modules.md`, section "Top-Level Expression Evaluation" -- "Modules can contain top-level expressions that execute during initialization"
- **Scope estimate:** Medium (2-8 hours)
- **Complexity:** Medium
- **Notes:** Even wrapping in `let _ = ...` does not work because the typechecker only supports `CoreVarPattern` in let bindings, not wildcard patterns (throws VF4017). A workaround would be `let _unused = x := 20;` but this is not how idiomatic vibefun code should work. The parser's `parseDeclaration` function at `/workspace/packages/core/src/parser/parse-declarations.ts` line 138 rejects anything that does not start with a keyword.

### Category 5: Zero-parameter lambdas cause internal error

- **Tests affected:** "closure captures ref (makeCounter pattern)"
- **Root cause:** The test defines `let makeCounter = () => { ... }` which is a zero-parameter lambda. This causes `Internal error: Lambda with zero parameters` (exit code 5). This is an internal compiler error separate from the mutable references feature.
- **Spec reference:** `06-functions.md` (function definitions)
- **Scope estimate:** Medium (2-8 hours)
- **Complexity:** Medium
- **Notes:** This blocks testing of the entire "makeCounter" pattern which is a key use case for mutable references in closures. The test would still fail due to Categories 1-3 even if this were fixed.

## Dependencies

- **Category 2 (stdlib resolution)** is a cross-cutting dependency that blocks nearly all runtime output tests across all spec sections (not just section 07). Fixing this would unblock many tests across sections 04, 05, 06, 07, 08, 09, 10, 11, 12.
- **Category 1 (prefix ! disambiguation)** depends on Category 2 being fixed first, since the tests need `String.fromInt` to verify dereference output.
- **Category 3 (nested let mut)** depends on Categories 1 and 2 for end-to-end verification.
- **Category 4 (top-level expressions)** is specified in the modules section and affects how tests are written. Could be worked around by restructuring tests.
- **Category 5 (zero-param lambdas)** is an independent bug in the compiler, not related to mutable references.
- The **codegen double-wrapping issue** (noted in Category 3) must be addressed alongside the typechecker fix for nested `let mut` to produce correct runtime behavior.

## Summary Table

| Category | Tests | Root Cause | Scope | Complexity |
|----------|-------|------------|-------|------------|
| Prefix `!` always LogicalNot | 12 (overlapping) | Parser emits LogicalNot for prefix `!`; no type-based disambiguation between NOT and Deref | Medium (2-8 hours) | Medium |
| Stdlib dotted names unresolvable | 12 (overlapping) | `String.fromInt` etc. stored as dotted keys but parser creates RecordAccess on undefined `String` variable | Large (1-3 days) | High |
| Nested `let mut` unimplemented | 3 | Typechecker throws VF4017 for mutable let-bindings in expression context | Medium (2-8 hours) | Medium |
| Top-level bare expressions rejected | 6 (overlapping) | Parser only accepts keyword-starting declarations at module top level | Medium (2-8 hours) | Medium |
| Zero-parameter lambdas broken | 1 | Internal compiler error on `() => expr` | Medium (2-8 hours) | Medium |
| Codegen double-wrapping for `mut` | all `mut` tests | `let mut x = ref(v)` wraps twice: `{ $value: { $value: v } }` | Small (1-2 hours) | Low |

Note: Most failing tests are affected by multiple categories simultaneously. The "overlapping" counts reflect that a single test may fail due to 2-3 root causes stacked together (e.g., prefix `!` + stdlib resolution + top-level expression parsing).
