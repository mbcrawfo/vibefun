# Section 07: Mutable References - Failure Analysis

## Summary
- Total tests: 15
- Passing: 3
- Failing: 12
- Key issues: (1) Prefix `!` always parsed as LogicalNot, never Deref -- spec requires type-based disambiguation. (2) Stdlib namespaced builtins (`String.fromInt` etc.) not resolvable at runtime, blocking all `expectRunOutput` tests. (3) Top-level expressions (`:=` assignments, `while` loops) not supported as statements. (4) Double-wrapping codegen bug for mutable ref bindings. (5) Missing `String.fromBool` builtin. (6) No enforcement that `ref()` requires `mut`.

**Note:** The actual test run shows 3 passing (create ref with mut, ref with different types, assignment returns Unit) and 12 failing, which differs from the task description's 1 pass / 14 fail. The analysis below reflects actual observed results.

## Root Causes

### RC-1: Prefix `!` Always Parsed as LogicalNot (Not Deref)
**Affected tests:** dereference with !, dereference string ref, update ref with computed value, ! as dereference for Ref, while loop with mutable counter, mutations through aliases
**Description:** The parser (`parse-expression-operators.ts`, line 480) statically assigns prefix `!` as `LogicalNot` and only postfix `expr!` as `Deref`. The spec (section 07) says prefix `!x` should be dereference when `x` has type `Ref<T>`, with type-based disambiguation at compile time. All tests use `!x` syntax (prefix) for dereference, which the parser treats as boolean NOT.

When the type checker encounters `LogicalNot` on a `Ref<Int>`, it tries to unify `Ref<Int>` with `Bool` and fails with VF4024.

**Evidence:**
```
error[VF4024]: Cannot unify types: Ref<Int> with Bool
  --> test.vf:2:10
  |
2 | let y = !x;
  |          ^
```

**Estimated complexity:** Medium — Requires either (a) changing the parser/desugarer to emit an ambiguous `!` operator that the type checker resolves, or (b) adding a post-typechecking rewrite pass that converts `LogicalNot` on `Ref<T>` to `Deref`. Option (a) is cleaner but touches parser, desugarer, type checker, and codegen. Option (b) is a targeted fix in the type checker only.

### RC-2: Stdlib Namespaced Builtins Not Resolvable
**Affected tests:** dereference with !, dereference string ref, update ref with :=, update ref with computed value, ! as logical NOT for Bool, ! as dereference for Ref, two refs identity equality, aliased refs equality, mutations through aliases, while loop with mutable counter, record with ref field
**Description:** Nearly all `expectRunOutput` tests use `String.fromInt(...)` or `String.fromBool(...)` to convert values to strings for output. These are registered in the type environment as flat names (e.g., `env.set("String.fromInt", ...)`) in `builtins.ts`, but the parser treats `String.fromInt(42)` as field access on a variable `String` — which is undefined.

**Evidence:**
```
error[VF4100]: Undefined variable 'String'
  --> test.vf:2:9
  |
2 | let x = String.fromInt(42);
  |         ^
```

This is a cross-cutting issue affecting the majority of spec validation tests across all sections, not just section 07.

Additionally, `String.fromBool` is not registered as a builtin at all (no matches in the codebase).

**Estimated complexity:** Large — Requires implementing a module/namespace system for stdlib builtins, or a special resolution path that maps `Namespace.function` syntax to the flat builtin names. Also needs `String.fromBool` added to builtins.

### RC-3: Top-Level Expression Statements Not Supported
**Affected tests:** update ref with :=, update ref with computed value, while loop with mutable counter, record with ref field, mutations through aliases
**Description:** The top-level parser (`parseDeclaration` in `parse-declarations.ts`) only accepts declarations (let, type, external, etc.). Expression statements like `x := 20;`, `while ... { ... };`, and `obj.counter := 5;` cannot appear at the top level. They would need to be wrapped in `let _ = ...;` or placed inside a block/function body.

The test framework's `withOutput` helper places test code directly at the top level between `external` declarations and `let _ = ...` bindings, so any expression-statement code fails to parse.

**Evidence:**
```
error[VF2000]: Expected declaration keyword
  --> test.vf:2:1
  |
2 | x := 20;
  | ^
```

```
error[VF2001]: Unexpected keyword in declaration: while
  --> test.vf:2:1
  |
2 | while true {
  | ^
```

**Estimated complexity:** Medium — Either (a) add top-level expression statement support to the parser, or (b) rewrite the failing tests to wrap expressions in `let _ = expr;`. Option (b) is simpler but option (a) is needed for the language to match the spec's examples.

### RC-4: Double-Wrapping Codegen Bug for Mutable Refs
**Affected tests:** All runtime tests involving mutable refs (if they get past parsing/typechecking)
**Description:** When code generation encounters `let mut x = ref(10)`, two things happen:
1. The `ref` builtin runtime helper emits `const ref = ($value) => ({ $value });` — so `ref(10)` produces `{ $value: 10 }`
2. The mutable binding codegen wraps the value again: `const x = { $value: ref(10) }` — producing `{ $value: { $value: 10 } }`

This results in `x.$value` being `{ $value: 10 }` instead of `10`, breaking deref (`x.$value`) and assignment (`x.$value = 20`).

**Evidence:**
```javascript
// Generated JS for: let mut x = ref(10);
const ref = ($value) => ({ $value });
const x = { $value: ref(10) };
// x is { $value: { $value: 10 } } — double-wrapped!
```

**Estimated complexity:** Small — Either (a) don't emit the `{ $value: ... }` wrapper for mutable bindings when the value is already a `ref()` call, or (b) make `ref()` a no-op/identity function and rely solely on the mutable binding wrapper. Option (b) is cleaner.

### RC-5: No Enforcement That `ref()` Requires `mut`
**Affected tests:** ref without mut is error
**Description:** The parser validates that `let mut` bindings use `ref()` syntax (`validateMutableBinding`), but does NOT validate the converse — that `ref()` calls require `mut`. So `let x = ref(10);` compiles without error, but the spec says this should be a compile-time error.

**Evidence:**
```bash
$ echo 'let x = ref(10);' | vibefun compile -
# Compiles successfully — should fail
```

Test expects exit code 1 (compilation error) but gets exit code 0.

**Estimated complexity:** Small — Add a check in the parser's `validateMutableBinding` or in a new validation pass that verifies any let-binding with a `ref()` value expression also has the `mutable` flag set. Could also be done in the type checker by checking if a non-mutable binding has type `Ref<T>`.

## Dependencies

### What these fixes depend on:
- **RC-2 (stdlib builtins)** is a cross-cutting blocker: even if all ref-specific issues are fixed, runtime tests will still fail because `String.fromInt`/`String.fromBool` cannot be resolved. This must be fixed first or in parallel.
- **RC-1 (prefix ! disambiguation)** is the core ref-specific blocker. Fixing this likely requires changes to the type checker's unary operator inference, possibly introducing an ambiguous `!` AST node resolved during type checking.
- **RC-3 (top-level expressions)** blocks tests that include `:=` or `while` at the module top level. Could be worked around by rewriting tests, but the spec shows these as valid code patterns.
- **RC-4 (double-wrapping)** is independent and straightforward to fix, but only observable once RC-1 and RC-2 are resolved.
- **RC-5 (ref without mut)** is independent and straightforward.

### What these fixes enable:
- Fixing these root causes would unblock mutable state patterns needed by other sections (e.g., imperative algorithms, JavaScript interop with mutable APIs).
- The `while` loop functionality (RC-3) is also tested in section 04 (expressions) and section 12 (compilation).
- The stdlib resolution (RC-2) is a prerequisite for nearly all runtime tests across all spec sections.

### Fix priority order:
1. **RC-2** (stdlib builtins) — highest impact, cross-cutting
2. **RC-1** (prefix `!` disambiguation) — core ref feature
3. **RC-3** (top-level expression statements) — affects multiple sections
4. **RC-5** (ref without mut enforcement) — small, isolated
5. **RC-4** (double-wrapping codegen) — small, isolated, but only testable after RC-1 and RC-2
