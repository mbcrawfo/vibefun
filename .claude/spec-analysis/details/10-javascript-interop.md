# 10 - JavaScript Interop: Spec Validation Analysis

## Summary

Section 10 covers JavaScript interop: external declarations, unsafe blocks, and type safety at FFI boundaries. Of 13 tests, 7 pass and 6 fail. The failures stem from four distinct root causes: (1) module-qualified stdlib function calls like `String.fromInt` are not resolved by the typechecker, causing 4 tests to fail in their output-wrapper boilerplate rather than in the feature under test; (2) unsafe blocks do not support multi-line content because the parser does not skip newlines after `{` and only parses a single expression rather than a block; (3) the compiler does not enforce that external functions may only be called within `unsafe` blocks, as specified; and (4) `try`/`catch` expressions are not implemented in the parser despite `try` and `catch` being registered as keywords.

**Note on discrepancy:** The user-provided list claimed 11 failures and 2 passes, but the actual test run (after build) shows 7 passes and 6 failures. The analysis below is based on the actual results.

## Failure Categories

### Category 1: Module-Qualified Stdlib Calls Not Resolved (String.fromInt, String.fromFloat)

- **Tests affected:** "unsafe block as expression returns value", "external function used in pipe", "wrap external in safe function", "nested unsafe blocks allowed"
- **Root cause:** The parser parses `String.fromInt(42)` as `RecordAccess(Var("String"), "fromInt")` -- i.e., field access on a variable named `String`. The typechecker registers builtin stdlib functions using flat dotted names (e.g., the key `"String.fromInt"` in the environment map at `packages/core/src/typechecker/builtins.ts`), but the `Var("String")` lookup fails with error `VF4100: Undefined variable 'String'` because no variable named `String` exists in scope. The desugarer does not transform `RecordAccess` on module-like identifiers into qualified name lookups. This is a systemic issue affecting all module-qualified stdlib calls (`String.*`, `Int.*`, `Float.*`, `List.*`, etc.) across the entire test suite (e.g., 52 of 53 stdlib tests also fail for this reason).
- **Spec reference:** `10-javascript-interop/unsafe-blocks.md` (unsafe block as expression), `10-javascript-interop/type-safety.md` (pipe with external, wrapping externals). Also affects `11-stdlib/` extensively.
- **Scope estimate:** Medium (2-8 hours)
- **Complexity:** Medium
- **Notes:** 4 of the 6 failing tests in this section are false negatives -- the features they test (unsafe block as expression, pipe with externals, wrapping externals in safe functions) actually work correctly at the compilation level. The tests only fail because the output-assertion wrapper (`withOutput` in `tests/spec-validation/framework/helpers.ts`) injects `String.fromInt(result)` or `String.fromFloat(result)` calls that hit this bug. Fixing this single stdlib resolution issue would turn those 4 tests from FAIL to PASS without any changes to the interop features themselves.

### Category 2: Multi-Line Unsafe Blocks Not Parsed

- **Tests affected:** "nested unsafe blocks allowed" (compound failure with Category 1)
- **Root cause:** The unsafe block parser in `packages/core/src/parser/parse-expression-primary.ts` (lines 155-171) does not skip newlines after `{` and only calls `parseExpressionFn(parser)` for a single expression, rather than parsing a full block with multiple statements. Compare with the `while` loop parser just below (line 183: `while (parser.match("NEWLINE"));`) which properly skips newlines. The spec shows multi-line unsafe blocks with `let` bindings and multiple expressions, but the parser only supports `unsafe { singleExpr }` on one line. Any newline after `{` triggers `VF2101: Unexpected token: 'NEWLINE'`.
- **Spec reference:** `10-javascript-interop/unsafe-blocks.md` -- "Unsafe Block Semantics" and "Nesting Unsafe Blocks" sections show multi-line blocks with `let` bindings.
- **Scope estimate:** Small (1-2 hours)
- **Complexity:** Low
- **Notes:** The fix is to change the unsafe block parser to (a) skip leading newlines after `{`, and (b) call `parseBlockExprFn` instead of `parseExpressionFn`. The `parseBlockExpr` function already exists and handles this pattern for other block contexts. The "nested unsafe blocks allowed" test has a compound failure: even if multi-line parsing were fixed, it would still fail due to `String.fromInt` (Category 1).

### Category 3: Unsafe Block Enforcement Not Implemented

- **Tests affected:** "calling external without unsafe is error"
- **Root cause:** The compiler does not enforce that external function calls must occur inside `unsafe` blocks. The typechecker's `inferUnsafe` function (in `packages/core/src/typechecker/infer/infer-primitives.ts`, lines 259-263) simply infers the type of the inner expression and passes it through -- the comment explicitly states: "The 'unsafe' designation is more of a marker for code generation and documentation." There is no tracking of whether the current inference context is inside an `unsafe` block, and no check at external call sites. As a result, `let _ = console_log("hello");` compiles successfully outside any unsafe block.
- **Spec reference:** `10-javascript-interop/unsafe-blocks.md` -- "Unsafe Block Restrictions" section with explicit error examples.
- **Scope estimate:** Medium (2-8 hours)
- **Complexity:** Medium
- **Notes:** Requires adding an `inUnsafe` boolean to the inference context. The spec says encapsulated unsafe is OK: `let safeLog = (msg) => unsafe { log(msg) }; safeLog("hello") // OK`.

### Category 4: Try/Catch Expressions Not Implemented

- **Tests affected:** "try-catch in unsafe block"
- **Root cause:** The `try` and `catch` tokens are registered as keywords in the lexer (`packages/core/src/types/token.ts`), but the parser has no handling for `try` expressions. There is no `TryCatch` node in either AST. The parser fails with `VF2101: Unexpected keyword: 'try'`.
- **Spec reference:** `10-javascript-interop/unsafe-blocks.md` -- "JavaScript Syntax in Unsafe Blocks" section lists try/catch as allowed syntax.
- **Scope estimate:** Large (1-3 days)
- **Complexity:** High
- **Notes:** Requires a new AST node, parser support, desugarer pass-through, typechecker inference, and codegen. Depends on Category 2 (multi-line unsafe) since try/catch is inherently multi-line.

## Dependencies

- **Category 1 (stdlib calls)** depends on broader module/namespace system work -- same issue blocking section 11 stdlib tests.
- **Category 2 (multi-line unsafe)** is independent and can be fixed in isolation.
- **Category 3 (unsafe enforcement)** is independent but should be designed alongside Category 4.
- **Category 4 (try/catch)** depends on Category 2 (multi-line unsafe blocks).

## Summary Table

| Category | Tests | Root Cause | Scope | Complexity |
|----------|-------|------------|-------|------------|
| Module-qualified stdlib calls not resolved | 4 (unsafe block as expression, pipe with external, wrap external, nested unsafe) | Parser produces `RecordAccess(Var("String"), "fromInt")` but typechecker registers flat name `"String.fromInt"` -- lookup fails with VF4100 | Medium (2-8 hours) | Medium |
| Multi-line unsafe blocks not parsed | 1 (nested unsafe blocks) | Unsafe block parser does not skip newlines after `{` and calls `parseExpressionFn` instead of `parseBlockExprFn` | Small (1-2 hours) | Low |
| Unsafe block enforcement not implemented | 1 (calling external without unsafe) | Typechecker does not track `inUnsafe` context; external calls compile without unsafe wrapper | Medium (2-8 hours) | Medium |
| Try/catch expressions not implemented | 1 (try-catch in unsafe block) | Keywords reserved but no AST node, parser handling, or codegen exists | Large (1-3 days) | High |
