# 04 - Expressions: Spec Validation Analysis

## Summary

Section 04 tests the expression system of Vibefun: literals, variables, function calls, arithmetic/comparison/logical/string operators, control flow (if/while/match), data literals (records, lists, tuples), lambdas, block expressions, pipe operator, and function composition. Of 68 tests, 12 pass and 56 fail (0 errors).

The 12 passing tests are either string-only runtime tests (which don't need `String.fromInt`), negative compile-error tests, or compile-only tests that don't exercise runtime output. The 56 failures are caused by a small number of cross-cutting root causes:

1. **Stdlib module access** (`String.fromInt`, `String.fromFloat`, `String.fromBool`, `List.length`) -- the dominant blocker, affecting 40+ tests
2. **Zero-argument lambda** -- internal error in the desugarer, affects 4 tests directly
3. **While loop not supported at top level** -- parser only allows `while` inside expression context, but tests use it at top level
4. **User-defined variant constructors not registered** -- `type Color = Red | Green | Blue` doesn't add `Red`/`Green`/`Blue` to the value environment
5. **Boolean exhaustiveness checking** -- `true | false` literal patterns not recognized as exhaustive for `Bool`
6. **Wildcard pattern in let-bindings** -- type checker rejects `let _ = expr in body`
7. **Tuple type inference** -- explicitly throws "not yet implemented"
8. **List spread desugarer name mismatch** -- desugarer generates `concat` but builtins register `List.concat`
9. **Empty block expression** -- desugarer throws internal error
10. **Prefix `!` always parsed as LogicalNot** -- no type-based disambiguation for dereference

## Failure Categories

### Category 1: Stdlib Module Access Not Implemented (`String.fromInt` / `String.fromFloat` / `String.fromBool` / `List.length`)

- **Tests affected:** integer literal expression, float literal expression, boolean literal expression, variable reference, variable shadowing, single-argument function call, multi-argument function call, addition, subtraction, multiplication, integer division, modulo, unary minus, equality comparison, inequality comparison, less than comparison, logical AND short-circuit, logical OR short-circuit, logical NOT, if-then-else expression, nested if-else chains, record literal, record spread (immutable update), lambda with single param, lambda with multiple params, lambda with block body, block expression returns last value, nested blocks, pipe operator basic, pipe operator chaining, forward composition >>, backward composition <<, cons operator prepends to list, cons is right-associative, float addition, float subtraction, float multiplication, float division, greater than comparison, greater than or equal comparison, less than or equal comparison, list spread runtime verification, lambda single param without parens (43 tests total, though many overlap with other categories)
- **Root cause:** The test harness wraps output in `String.fromInt(result)`, `String.fromFloat(result)`, `String.fromBool(result)`, or `List.length(xs)` via `withOutput()`. The compiler's builtins register these as flat keys in the type environment map (e.g., `"String.fromInt"` as a single string key). However, the parser treats `String.fromInt(42)` as a record field access: `CoreRecordAccess(CoreVar("String"), "fromInt")` applied to `42`. The type checker then looks up `"String"` as a variable and fails with `VF4100: Undefined variable 'String'`. There is no module resolution system that maps dotted access patterns to flat builtin keys.
- **Additional issue:** `String.fromBool` is not defined in the builtins at all (only `String.fromInt` and `String.fromFloat` exist in `typechecker/builtins.ts`), so even fixing module access would leave 3 tests failing until `String.fromBool` is added.
- **Spec reference:** `04-expressions/basic-expressions.md` examples use `String.fromInt()`, `String.fromFloat()`, etc. The stdlib spec is in `11-stdlib/string.md`.
- **Scope estimate:** Medium (2-8 hours)
- **Complexity:** Medium
- **Notes:** This is the single largest blocker across the entire spec validation suite. The underlying features (arithmetic, comparisons, records, pipes, composition, lambdas, etc.) compile correctly and generate valid JavaScript. Manual testing confirms the generated JS produces correct runtime results. Fixing stdlib module access would unblock the majority of failing tests across all sections.

### Category 2: Zero-Argument Lambda Not Implemented (Internal Error, Exit Code 5)

- **Tests affected:** no-argument function call, lambda with no params, AND short-circuit skips right side, OR short-circuit skips right side (4 tests)
- **Root cause:** The parser correctly parses `() => expr` as a Lambda with 0 parameters. However, the desugarer's `curryLambda` function (`desugarer/curryLambda.ts:34`) explicitly throws `Error("Lambda with zero parameters")` when `params.length === 0`. The Core AST `CoreLambda` type requires exactly one `param: CorePattern`, so there is no representation for zero-param lambdas. The spec (`04-expressions/functions-composition.md`) explicitly shows `() => 42;` as valid syntax. The fix requires either: (a) desugaring `() => expr` to a lambda with a unit pattern parameter `(_: Unit) => expr`, or (b) extending the Core AST.
- **Spec reference:** `04-expressions/functions-composition.md` -- Lambda Syntax section shows `() => 42;` as valid.
- **Scope estimate:** Small (1-2 hours)
- **Complexity:** Low
- **Notes:** Exit code 5 indicates an unhandled internal error. The short-circuit tests fail because they define `let sideEffect = () => { ... }` which triggers the zero-param lambda error. These tests also depend on `String.fromInt` for output, so both this fix and Category 1 are needed.

### Category 3: Empty Block Expression Not Implemented (Internal Error, Exit Code 5)

- **Tests affected:** empty block returns Unit (1 test)
- **Root cause:** The desugarer's `desugarBlock` function (`desugarer/desugarBlock.ts:32`) throws `Error("Empty block expression")` when the block has zero expressions. The spec (`04-expressions/functions-composition.md`) states that `{}` has type `Unit` and evaluates to `()`. The fix is to handle `exprs.length === 0` by returning a `CoreUnitLit` instead of throwing.
- **Spec reference:** `04-expressions/functions-composition.md` -- Empty Blocks section: "An empty block `{}` has type `Unit` and evaluates to `()`".
- **Scope estimate:** Small (1-2 hours)
- **Complexity:** Low
- **Notes:** Simple fix. Exit code 5 indicates an unhandled internal error.

### Category 4: While Loop Not Supported at Top Level (VF2001)

- **Tests affected:** while loop, while loop with false condition executes zero times (2 tests)
- **Root cause:** The top-level declaration parser (`parse-declarations.ts:137-154`) only recognizes `let`, `type`, `external`, and `import` as valid declaration starters. When `while` appears at the top level (outside a `let` binding), the parser throws `VF2001: Unexpected keyword in declaration: while`. While loops ARE parsed as expressions within other expression contexts (e.g., inside `let` bindings or blocks), but cannot stand alone as top-level statements.
- **Spec reference:** `04-expressions/control-flow.md` -- While Loops section shows while at top level: `let mut i = ref(0); while !i < 10 { ... };`.
- **Scope estimate:** Small (1-2 hours)
- **Complexity:** Low
- **Notes:** The test code uses `while` after `let mut i = ref(0);` at the top level. The while expression needs to be wrapped in a `let` binding or the parser needs to support expression-statements at the top level. Additionally, even if the parser accepted this, the `!i` dereference syntax and boolean exhaustiveness issues (Categories 8, 6) would still block execution.

### Category 5: While Loop Type Checking Failures (Multiple Issues)

- **Tests affected:** while loop returns Unit (1 test, overlap with Category 4 for other while tests)
- **Root cause:** Multiple compounding issues prevent while loops from type-checking even when inside a `let` binding:
  1. The while desugarer creates `let _ = body in loop()` using `CoreWildcardPattern`, but the type checker's `inferLet` only supports `CoreVarPattern` (`infer-bindings.ts:71-75`), throwing `VF4017`.
  2. The desugared while creates a `CoreMatch` on boolean literal patterns (`true`/`false`), which fails the exhaustiveness check (see Category 6).
  3. The `!i` prefix syntax is parsed as `LogicalNot` rather than `Deref` (see Category 8), causing unification failure when `i` is `Ref<T>`.
- **Spec reference:** `04-expressions/control-flow.md` -- While Loops section, While Loop Type Checking Rules.
- **Scope estimate:** Medium (2-8 hours)
- **Complexity:** Medium
- **Notes:** Fixing while loops requires addressing three separate issues: wildcard in let-bindings, boolean exhaustiveness, and `!` disambiguation. The desugaring logic itself is well-designed (recursive function pattern matching the spec), but the type checker can't handle the desugared output.

### Category 6: Boolean Exhaustiveness Checking Incomplete (VF4400)

- **Tests affected:** if without else returns Unit (1 test directly, but also blocks while loops and all if-then-else expressions that are desugared to boolean match)
- **Root cause:** The exhaustiveness checker (`typechecker/patterns.ts:389-393`) treats all literal patterns as non-exhaustive unless there's a wildcard/variable catch-all pattern. When `if-then-else` is desugared to `match cond { | true => ... | false => ... }`, the checker sees `CoreLiteralPattern` patterns and returns `["<other values>"]`, causing `VF4400: Non-exhaustive pattern match`. The checker should recognize that boolean literals `true | false` cover all `Bool` values.
- **Spec reference:** `04-expressions/control-flow.md` -- If Expression Type Rules, and `05-pattern-matching/exhaustiveness.md` for exhaustiveness requirements.
- **Scope estimate:** Small (1-2 hours)
- **Complexity:** Low
- **Notes:** This is a targeted fix to the `checkExhaustiveness` function. When the scrutinee type is `Bool` and the patterns include both `true` and `false` literal patterns, it should report as exhaustive. This issue indirectly blocks ALL if-then-else expressions (which desugar to boolean match) and all while loops (which also desugar through boolean match).

### Category 7: User-Defined Variant Constructors Not Registered (VF4100)

- **Tests affected:** match expression with variants, nested match as expression (2 tests)
- **Root cause:** The `buildEnvironment` function (`typechecker/environment.ts:40-56`) only processes `ExternalDecl` and `ExternalBlock` declarations. Type declarations (`TypeDecl`) with variant constructors are NOT processed -- the function's `addSingleDeclaration` has a `TODO: Handle other declaration types (LetDecl, TypeDecl, etc.)` comment at line 128. When `type Color = Red | Green | Blue;` is declared, the constructors `Red`, `Green`, `Blue` are never added to the value environment, so subsequent code using `let c = Green` fails with `VF4100: Undefined variable 'Green'`.
- **Additional detail:** Built-in variant types (Option, Result, List) work because their constructors (`Some`, `None`, `Ok`, `Err`, `Cons`, `Nil`) are pre-registered by `getBuiltinEnv()`. User redefinition like `type Option<T> = Some(T) | None` appears to work only because the built-in constructors already exist.
- **Spec reference:** `04-expressions/control-flow.md` -- Match Expressions section, and `03-type-system/variant-types.md` for variant type definitions.
- **Scope estimate:** Medium (2-8 hours)
- **Complexity:** Medium
- **Notes:** The type checker processes `CoreTypeDecl` with a comment "already processed in buildEnvironment" but `buildEnvironment` doesn't actually do anything for type declarations. The fix requires `buildEnvironment` (or the typechecker's declaration processing) to extract variant constructors from type declarations and register them in the value environment with appropriate type schemes.

### Category 8: Prefix `!` Always Parsed as LogicalNot (No Type-Based Disambiguation)

- **Tests affected:** All tests using `!variable` for dereference in while/mut contexts (affects while loop tests, while loop returns Unit test -- overlaps with Categories 4, 5)
- **Root cause:** The parser (`parse-expression-operators.ts:480`) always creates `LogicalNot` for prefix `!expr`. Postfix `expr!` creates `Deref`. The spec (`07-mutable-references.md` "The `!` Operator: Type-Based Disambiguation") states that prefix `!` should be disambiguated based on the operand type: `LogicalNot` for `Bool`, `Deref` for `Ref<T>`. The type checker has separate handling for `LogicalNot` (expects `Bool`) and `Deref` (expects `Ref<T>`), but there is no mechanism for the type checker to reclassify `LogicalNot` as `Deref` based on the inferred operand type.
- **Spec reference:** `07-mutable-references.md` -- "The `!` Operator: Type-Based Disambiguation" section.
- **Scope estimate:** Medium (2-8 hours)
- **Complexity:** Medium
- **Notes:** This is technically a cross-section issue (more relevant to section 07 - mutable references), but it directly impacts section 04 tests that use while loops with mutable refs. The fix could be either: (a) in the type checker's `inferUnaryOp`, when `LogicalNot` encounters a `Ref<T>` operand, treat it as `Deref`; or (b) in the desugarer, convert all prefix `!` to a generic "Not-or-Deref" operator that the type checker resolves. Option (a) is simpler and more aligned with the spec's description.

### Category 9: Tuple Type Inference Not Implemented (VF4017)

- **Tests affected:** tuple literal (1 test)
- **Root cause:** The type checker explicitly throws `VF4017: Tuple type inference not yet implemented` in `infer-primitives.ts:175` when encountering a `CoreTuple` expression. The parser and desugarer handle tuples, but the type checker does not.
- **Spec reference:** `03-type-system/tuples.md` and `04-expressions/data-literals.md` -- Tuples section.
- **Scope estimate:** Medium (2-8 hours)
- **Complexity:** Medium
- **Notes:** Tuple support requires implementing type inference for tuple expressions, tuple type checking, and tuple code generation. The code generator already has `emitTuple` which generates JavaScript arrays, so the main work is in the type checker.

### Category 10: List Spread Desugarer Name Mismatch (VF4100)

- **Tests affected:** list spread, list spread runtime verification (2 tests)
- **Root cause:** The list spread desugarer (`desugarer/list-spread.test.ts` confirms the pattern) generates calls to `concat` (bare name), but the builtin environment registers the function as `List.concat`. When the type checker encounters the desugared `CoreApp(CoreVar("concat"), ...)`, it fails with `VF4100: Undefined variable 'concat'`.
- **Spec reference:** `04-expressions/data-literals.md` -- List Spread Operator section.
- **Scope estimate:** Small (1-2 hours)
- **Complexity:** Low
- **Notes:** Simple fix: either change the desugarer to use `"List.concat"` as the function name, or add `"concat"` as an alias in the builtin environment. However, even with the name fixed, the module access issue (Category 1) would prevent `List.concat` from being called since `List` would be treated as a variable by the parser. The better fix is to use the flat name `"List.concat"` in the desugarer and ensure the type checker can look it up directly.

## Dependencies

- **Category 1 (stdlib module access)** is the dominant blocker, affecting 43+ tests. Fixing this alone would unblock the largest number of tests.
- **Categories 4, 5, 6, 8** (while loop issues) are tightly coupled -- while loops fail due to a combination of parser limitations, type checker gaps, and dereference disambiguation. All four must be addressed for while loop tests to pass.
- **Category 7** (user-defined variants) is independent and only blocks the 2 match expression tests.
- **Category 9** (tuples) is independent and only blocks 1 test.
- **Category 10** (list spread name mismatch) is partially dependent on Category 1 for the full fix.
- **Categories 2, 3** (zero-arg lambda, empty block) are independent small fixes.
- **Category 6** (boolean exhaustiveness) is also needed for if-then-else and while desugaring to work.

### Cross-Section Dependencies

- Category 1 (stdlib access) is a shared blocker with sections 02, 03, 06, 07, 09, 11, and 12.
- Category 8 (prefix `!` disambiguation) is a shared blocker with section 07 (mutable references).
- Category 7 (user-defined variants) is a shared blocker with sections 03 (type system) and 05 (pattern matching).

## Summary Table

| Category | Tests | Root Cause | Scope | Complexity |
|----------|-------|------------|-------|------------|
| Stdlib module access (`String.fromInt`, etc.) | 43 | Module-qualified names parsed as field access on undefined variable; builtins use flat keys; `String.fromBool` missing entirely | Medium (2-8 hours) | Medium |
| Zero-argument lambda | 4 | Desugarer throws "Lambda with zero parameters"; Core AST requires exactly one param | Small (1-2 hours) | Low |
| Empty block expression | 1 | Desugarer throws "Empty block expression" instead of returning UnitLit | Small (1-2 hours) | Low |
| While loop not at top level | 2 | Parser declaration handler doesn't recognize `while` keyword | Small (1-2 hours) | Low |
| While loop type checking (compound) | 1 | Wildcard in let-bindings + boolean exhaustiveness + `!` disambiguation all block desugared while | Medium (2-8 hours) | Medium |
| Boolean exhaustiveness | 1+ | `true \| false` literal patterns not recognized as covering all Bool values | Small (1-2 hours) | Low |
| User-defined variant constructors | 2 | `buildEnvironment` doesn't register constructors from TypeDecl in value env | Medium (2-8 hours) | Medium |
| Prefix `!` disambiguation | 0 (overlap) | Prefix `!` always LogicalNot; no type-based Deref disambiguation | Medium (2-8 hours) | Medium |
| Tuple type inference | 1 | Explicitly throws "not yet implemented" in type checker | Medium (2-8 hours) | Medium |
| List spread name mismatch | 2 | Desugarer generates `concat`; builtins register `List.concat` | Small (1-2 hours) | Low |
