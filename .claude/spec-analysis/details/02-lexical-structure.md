# 02 - Lexical Structure: Spec Validation Analysis

## Summary

Section 02 covers lexical structure: comments, whitespace, semicolons, keywords, identifiers, literals (boolean, integer, float, string, unit), and operators. With a fresh build, 50 of 64 tests pass and 14 fail. The originally reported 49 failures were inflated because the CLI had not been built (`pnpm run build`); after building, most tests pass immediately.

The 14 remaining failures fall into three distinct root causes:
1. Standard library module-qualified function calls (`String.fromInt`, `String.fromFloat`, `String.fromBool`) cannot be resolved -- this accounts for 12 failures.
2. Empty block expressions are not supported in the desugarer -- 1 failure.
3. Reference operators have spec/implementation mismatches (prefix `!` vs postfix `!` for dereference, and top-level assignment statements not supported) -- 1 failure.

**Important note on the original failure count:** The task description lists 49 failures and 15 passes. After running `pnpm run build`, the count drops to 14 failures and 50 passes. The 35 tests that were failing only due to a stale build all pass once the CLI is compiled. The analysis below covers the 14 genuine failures.

## Failure Categories

### Category 1: Module-Qualified Standard Library Calls Not Resolvable

- **Tests affected:** boolean literal true, boolean literal false, decimal integer literal, hexadecimal integer literal, binary integer literal, underscore separators in integers, leading zeros are decimal, basic float literal, scientific notation float, scientific notation with negative exponent, pipe operator, unary minus operator (12 tests -- but unary minus and pipe are only here because the test harness uses `String.fromInt`; the actual operators work fine)
- **Root cause:** The test harness uses `withOutput()` which wraps code with `String.fromInt(x)`, `String.fromFloat(x)`, or `String.fromBool(x)` to produce printable output. However, the compiler cannot resolve module-qualified function calls like `String.fromInt(x)`. The parser correctly parses `String.fromInt(x)` as a `RecordAccess` on the identifier `String`, followed by a function call. But the typechecker tries to look up `String` as a variable in the environment and fails with `VF4100: Undefined variable 'String'`. The builtins ARE registered in `/workspace/packages/core/src/typechecker/builtins.ts` as flat string keys (e.g., `env.set("String.fromInt", ...)`) but there is no mechanism to resolve `RecordAccess(Var("String"), "fromInt")` to the flat key `"String.fromInt"`. The AST `RecordAccess` node expects the record expression to resolve to a record type, but `String` is not bound as a variable at all -- it is a type name / module namespace, not a value.
- **Spec reference:** `02-lexical-structure/tokens.md` (literals section -- tests need conversion functions); `11-stdlib/string.md` (defines `String.fromInt`, `String.fromFloat`, `String.fromBool`)
- **Scope estimate:** Medium (2-8 hours)
- **Complexity:** Medium
- **Notes:** The underlying lexical features (booleans, integers, floats, pipe operator, unary minus) all work correctly. These tests fail purely because the output mechanism (`String.fromInt` etc.) is broken. If the test harness used a different output strategy (e.g., external declarations wrapping JavaScript's `String()` constructor), these would all pass. Additionally, `String.fromBool` is not registered as a builtin at all in `builtins.ts`, even though `String.fromInt` and `String.fromFloat` are. Fixing this requires either: (a) a desugaring pass that recognizes `Module.function(args)` patterns and rewrites them to flat builtin calls, or (b) registering module namespaces as record-like values in the type environment, or (c) a special resolution step in the typechecker for known stdlib module prefixes.

### Category 2: Empty Block Expression Not Supported

- **Tests affected:** empty blocks valid without semicolons
- **Root cause:** The test `let x = {};` is parsed as a `Block` with zero expressions. The desugarer in `/workspace/packages/core/src/desugarer/desugarBlock.ts` (line 32) throws `"Empty block expression"` for blocks with no expressions. The comment says "Empty block shouldn't happen (parser should catch this)" -- indicating the desugarer was never designed to handle empty blocks. The spec at `02-lexical-structure/basic-structure.md` explicitly states empty blocks are valid: `let noOp = () => {};`. Additionally, the spec's example `() => {}` also fails because the parser throws `"Lambda with zero parameters"` for zero-argument lambdas.
- **Spec reference:** `02-lexical-structure/basic-structure.md` (section "Special Cases" -- "Empty blocks are valid without semicolons")
- **Scope estimate:** Small (1-2 hours)
- **Complexity:** Low
- **Notes:** The empty block `{}` should evaluate to `()` (unit). This is consistent with how blocks work in ML-family languages. The fix is straightforward: when `exprs.length === 0` in `desugarBlock`, return a `CoreUnit` literal instead of throwing. The zero-parameter lambda issue (`() => {}`) is a separate bug in the parser that would need to be addressed independently.

### Category 3: Reference Operator Spec/Implementation Mismatch

- **Tests affected:** reference operators compile
- **Root cause:** The test code is:
  ```
  let mut x = ref(0);
  let y = !x;
  x := 1;
  ```
  This has two independent issues:
  1. **Prefix `!` for dereference:** The spec (`02-lexical-structure/operators.md`) defines `!` as a prefix operator that is disambiguated by type (`!myRef` for Ref dereference, `!true` for logical NOT). However, the parser implements dereference as a **postfix** `!` operator (`x!`), while prefix `!` is always `LogicalNot`. The typechecker then correctly rejects `!x` when `x` is `Ref<Int>` because it expects a `Bool` operand for `LogicalNot` (error: `VF4024: Cannot unify types: Ref<Int> with Bool`). Using `x!` (postfix) works correctly for dereference.
  2. **Top-level assignment statement:** `x := 1;` is a standalone statement at the top level. The parser only accepts declarations (`let`, `type`, `external`, etc.) at the top level and rejects bare expression statements with `VF2000: Expected declaration keyword`. The assignment works when wrapped in a `let` binding: `let _ = (x := 1);`.
- **Spec reference:** `02-lexical-structure/operators.md` (Reference Operators section -- shows prefix `!myRef` for dereference); `07-mutable-references.md` (mutable reference semantics)
- **Scope estimate:** Medium (2-8 hours)
- **Complexity:** Medium
- **Notes:** Two sub-issues: (a) Reconciling the spec vs implementation on prefix-vs-postfix `!` for dereference. If the spec is correct, the parser needs to emit `LogicalNot` or `Deref` based on context, and the typechecker would handle the ambiguity. If the implementation is correct (postfix `!`), the spec needs updating. The postfix `!` implementation is arguably better-designed than the spec's prefix `!`, since it avoids the need for type-directed parsing. Rust uses a similar postfix approach (though with `*` for dereference). This may warrant a spec update rather than a code change. (b) Top-level expression statements: either the parser needs to accept expression statements at the top level, or the spec needs to clarify that assignments must be wrapped.

## Dependencies

- **Category 1 (module-qualified calls)** depends on the module/namespace system design. Fixing this properly requires deciding how stdlib modules are represented at the value level (as records? as a special namespace resolution pass?). This impacts sections 08 (modules) and 11 (stdlib) as well.
- **Category 2 (empty blocks)** is self-contained with no external dependencies.
- **Category 3 (reference operators)** intersects with section 07 (mutable references). The `!` operator design decision affects all code using mutable references.

## Summary Table

| Category | Tests | Root Cause | Scope | Complexity |
|----------|-------|------------|-------|------------|
| Module-qualified stdlib calls | 12 | `String.fromInt(x)` parsed as RecordAccess on undefined `String` variable; no resolution from RecordAccess to flat builtin keys | Medium | Medium |
| Empty block expression | 1 | Desugarer throws on empty block instead of producing CoreUnit | Small | Low |
| Reference operator mismatches | 1 | Spec says prefix `!` for deref but implementation uses postfix `x!`; top-level bare assignment statements not supported | Medium | Medium |

## Additional Observations

1. **Stale build is the primary cause of the inflated failure count.** The original report of 49 failures drops to 14 after `pnpm run build`. Any CI pipeline should ensure the CLI is built before running spec validation.

2. **The lexer and parser are well-implemented for this section.** All comment types, semicolons, keyword handling, identifier patterns (including Unicode and emoji), all literal types, and all operator tokens work correctly at the lexical/parsing level.

3. **The `String.fromBool` builtin is entirely missing** from `/workspace/packages/core/src/typechecker/builtins.ts`. Even if module-qualified calls were fixed, `String.fromBool` would still fail until it is registered.

4. **11 of the 14 failures are actually testing OTHER features** (stdlib module calls), not the lexical features they claim to test. The underlying lexical features (integer literals, float literals, boolean literals, pipe operator, unary minus) all compile correctly. The tests fail only because the output mechanism (`String.fromInt` etc.) is broken. This suggests the tests could be rewritten to use `expectCompiles` instead of `expectRunOutput` for pure lexical validation, or use external declarations to provide the conversion functions.
