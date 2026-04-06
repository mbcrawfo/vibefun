# 05 - Pattern Matching: Spec Validation Analysis

## Summary

Section 05 covers pattern matching: literal/variable/wildcard patterns, variant/list/record patterns, nested patterns, guards, or-patterns, tuple patterns, and exhaustiveness checking. Of 40 tests, 22 pass and 18 fail. The failures fall into six distinct categories. Notably, many failures are not actually pattern matching bugs -- they are caused by cross-cutting issues in other subsystems (stdlib module access, tuple type inference, type annotation handling) that happen to surface in pattern matching tests because those tests need to convert results to strings or use specific language features. The true pattern matching-specific issues are: incomplete exhaustiveness checking (Bool, guards, unreachable patterns), missing or-pattern validation, and missing nested or-pattern desugaring.

## Failure Categories

### Category 1: Stdlib Module Access (String.fromInt not resolvable)
- **Tests affected:** variable pattern binds value, variant pattern - Some, list pattern - single element, list pattern - head and tail, list pattern - specific length, nested variant in variant, nested variant in list, nested list in variant (8 tests)
- **Root cause:** Standard library functions are registered in the builtin environment with dotted keys (e.g., `"String.fromInt"`), but the parser produces `RecordAccess(Var("String"), "fromInt")` for the expression `String.fromInt(x)`. The type checker tries to resolve `String` as a variable first (`inferExprFn` on `Var("String")`), which fails with VF4100 "Undefined variable 'String'" because `String` is not a value in the environment -- only `String.fromInt` (as a single string key) is. There is no module access resolution that bridges this gap.
- **Spec reference:** `11-stdlib/string.md` defines `String.fromInt` as available; `08-modules.md` and the type system would govern how module-style access is resolved.
- **Scope estimate:** Medium (2-8 hours) -- requires either adding a module namespace system to the type checker or converting dotted stdlib identifiers during desugaring/inference.
- **Complexity:** Medium -- touches the type checker's variable resolution path and potentially the desugarer.
- **Notes:** This is NOT a pattern matching bug. These 8 tests would pass if `String.fromInt` were accessible. When the match arm result expressions are changed to plain string literals (not needing `String.fromInt`), pattern matching works correctly for all of these cases. This is the single largest category of failure.

### Category 2: Bool Exhaustiveness Not Recognized
- **Tests affected:** literal pattern matching - bool, exhaustive match on bool (2 tests)
- **Root cause:** The exhaustiveness checker in `packages/core/src/typechecker/patterns.ts` (`checkExhaustiveness` function) only handles variant types represented as `App(Const(name), args)` for constructor coverage analysis. Bool is represented as `Const("Bool")` (a primitive type constant), so it falls through to the literal pattern branch, which always requires a wildcard/variable pattern. The compiler does not recognize that `true | false` covers all possible Bool values. Error: VF4400 "Non-exhaustive pattern match. Missing cases: \<other values\>".
- **Spec reference:** `05-pattern-matching/exhaustiveness.md` -- "For finite types (Bool), enumerate all constructors"
- **Scope estimate:** Small (1-2 hours) -- add a special case in `checkExhaustiveness` for `Const("Bool")` to check if both `true` and `false` literal patterns are present.
- **Complexity:** Low -- isolated change in the exhaustiveness checker.
- **Notes:** The "literal pattern matching - bool" test also fails at runtime because the match expression is rejected at compile time with the non-exhaustive error.

### Category 3: Tuple Type Inference Not Implemented
- **Tests affected:** tuple pattern matching with correct arity, tuple pattern with literal values (2 tests)
- **Root cause:** Tuple expressions are explicitly marked as not yet implemented. The type checker throws VF4017 "Tuple type inference not yet implemented" when encountering tuple expressions like `(1, 2)` or `(0, 0)`. The pattern matcher has a placeholder for `CoreTuplePattern` that returns a stub result, and the codegen has tuple pattern emission implemented, but the type checker blocks compilation before codegen is reached.
- **Spec reference:** `03-type-system/tuples.md`, `05-pattern-matching/exhaustiveness.md` (tuple pattern section)
- **Scope estimate:** Large (1-3 days) -- requires implementing tuple type inference in the type checker, including tuple construction, tuple type unification, and tuple pattern matching type checking.
- **Complexity:** High -- tuple types need to be integrated into the type inference algorithm (Algorithm W), pattern checking, and exhaustiveness analysis.
- **Notes:** This is NOT a pattern matching bug per se. The codegen already supports tuple patterns. The blocker is in the type checker.

### Category 4: Missing Or-Pattern Validation and Nested Or-Pattern Desugaring
- **Tests affected:** or-pattern cannot bind variables, or-pattern nested in constructor (2 tests)
- **Root cause:** Two distinct sub-issues:
  1. **No variable binding validation in or-patterns:** The spec says `Some(x) | None` should be an error because `x` is bound in one branch but not the other. The compiler accepts this without error. The desugarer expands or-patterns into separate match cases, each with its own body, so the generated code works (each case gets a separate copy of the body). But the spec requires this to be rejected.
  2. **Nested or-patterns not expanded:** The desugarer only handles or-patterns at the top level of match cases (line 200 of `desugarer.ts`). When an or-pattern appears nested inside a constructor pattern (e.g., `Ok("a" | "b")`), the recursive `desugarPattern` function encounters the `OrPattern` node and throws: "Or-pattern should have been expanded at match level". This causes an internal error (exit code 5).
- **Spec reference:** `05-pattern-matching/advanced-patterns.md` -- "Variables cannot be bound in or-patterns" and "Or-patterns can appear within constructor patterns"
- **Scope estimate:** Medium (2-8 hours) -- the validation is a new check to add; the nested expansion requires modifying the desugarer to recursively distribute or-patterns within constructor/list/record patterns.
- **Complexity:** Medium -- the nested or-pattern expansion requires careful case distribution logic (e.g., `Ok("a" | "b")` must become two separate cases `Ok("a")` and `Ok("b")`).
- **Notes:** These are genuine pattern matching implementation gaps.

### Category 5: Guards Not Considered in Exhaustiveness Analysis
- **Tests affected:** guards do not affect exhaustiveness (1 test)
- **Root cause:** The exhaustiveness checker (`checkExhaustiveness` in `patterns.ts`) receives only the patterns, not the guards. It treats variable patterns as always-matching wildcards. When a match has `| x when x > 0 => ... | x when x < 0 => ...`, the checker sees two variable patterns and considers the match exhaustive. Per the spec, guards should NOT contribute to exhaustiveness -- a guarded variable pattern should not count as a catch-all. The match should be flagged as non-exhaustive because the guards might not cover all values.
- **Spec reference:** `05-pattern-matching/exhaustiveness.md` -- "Guards do not affect exhaustiveness checking. The compiler analyzes patterns without considering guard conditions" and "Requiring an explicit fallback pattern ensures soundness."
- **Scope estimate:** Small (1-2 hours) -- the exhaustiveness checker needs to receive guard information and treat guarded patterns as non-exhaustive (i.e., a pattern with a guard should not count as covering its entire type space).
- **Complexity:** Medium -- requires threading guard information through the exhaustiveness API and modifying the wildcard/variable detection logic to exclude guarded patterns.
- **Notes:** The current behavior is the OPPOSITE of what the spec requires. The spec says guarded patterns should be treated as if they don't exist for exhaustiveness purposes. The current code ignores guards entirely and treats the underlying patterns as fully matching.

### Category 6: Unreachable Pattern Detection Not Implemented
- **Tests affected:** unreachable pattern after wildcard (1 test)
- **Root cause:** The compiler has no unreachable pattern detection. When a wildcard pattern `_` appears before a more specific pattern `0`, the compiler does not warn or error. The test expects a compilation error but gets exit code 0.
- **Spec reference:** `05-pattern-matching/exhaustiveness.md` -- "The compiler also warns about unreachable patterns (patterns that can never match)"
- **Scope estimate:** Medium (2-8 hours) -- requires implementing a reachability analysis that checks whether any pattern is subsumed by earlier patterns.
- **Complexity:** Medium -- reachability checking is the dual of exhaustiveness checking and can reuse much of the same pattern matrix infrastructure, but it requires new logic to compare patterns against earlier patterns.
- **Notes:** This is a new feature that needs to be built. The spec says it should produce a "warning," but the test expects a compilation error (exit code 1). The implementation may need to decide whether unreachable patterns are warnings or errors.

### Category 7: User-Defined Variant Constructors Not Registered as Values
- **Tests affected:** or-pattern with variant constructors (1 test)
- **Root cause:** When users define `type Color = Red | Green | Blue`, the code generator correctly emits constructor constants (`const Red = { $tag: "Red" }` etc.), but the type checker does NOT register these constructors as values in the type environment. The `typeCheckDeclaration` function for `CoreTypeDecl` simply returns the environment unchanged (line 241-244 in `typechecker.ts`). The `buildEnvironment` function's `addSingleDeclaration` only handles `ExternalDecl` with a TODO for other types. Only builtin variants (Option, List, Result) have their constructors registered in `builtins.ts`. So `let c = Green` produces VF4100 "Undefined variable 'Green'".
- **Spec reference:** `03-type-system/variant-types.md` defines user variant types; `05-pattern-matching/advanced-patterns.md` uses them in or-patterns.
- **Scope estimate:** Medium (2-8 hours) -- the type checker needs to process `CoreTypeDecl` with `CoreVariantTypeDef` definitions, creating appropriate type schemes for each constructor and adding them to the environment.
- **Complexity:** Medium -- requires generating proper type schemes for constructors (handling type parameters, creating function types for constructors with arguments, and direct types for nullary constructors), then registering them in the type environment.
- **Notes:** This is NOT a pattern matching bug. Variant constructors work fine in pattern positions (the pattern checker looks them up differently). The issue is using them as value expressions. The test fails because `let c = Green` (a value expression) cannot resolve `Green`.

### Category 8: Internal Error with Nullary Constructor Type Annotation
- **Tests affected:** variant pattern - None (1 test, but also affects any code using `let x: Option<Int> = None`)
- **Root cause:** Builtin nullary constructors like `None` and `Nil` are registered with `funType([], ...)` -- a function type with zero parameters (line 87-99 in `builtins.ts`). When the code includes a type annotation like `let x: Option<Int> = None`, the type checker processes the annotation and eventually calls `typeToString` on this zero-parameter function type, which throws "Function type must have at least one parameter" (line 24 in `format.ts`). This causes an internal error (exit code 5).
- **Spec reference:** `03-type-system/variant-types.md` -- nullary constructors should work with type annotations.
- **Scope estimate:** Small (1-2 hours) -- either fix `typeToString` to handle zero-parameter function types, or change the type representation of nullary constructors to not use function types (e.g., use the return type directly, as they do in pattern checking at line 199 of `patterns.ts`).
- **Complexity:** Low -- the fix is localized. The most correct fix is probably to represent nullary constructors as non-function types.
- **Notes:** Without the type annotation (`let x = None`), the code compiles fine. The error only surfaces when a type annotation forces type formatting.

## Dependencies

- **Category 1 (String.fromInt)** depends on the stdlib/module access system (section 08-modules, section 11-stdlib). This is the most impactful cross-cutting issue.
- **Category 3 (Tuples)** depends on the type system implementation (section 03-type-system).
- **Category 7 (User-defined variants)** depends on the type checker's declaration processing (section 03-type-system).
- **Category 8 (Nullary constructor annotation)** is related to Category 7 (how constructors are typed) and the builtin type representations.
- Categories 2, 4, 5, and 6 are self-contained pattern matching improvements with no external dependencies.

## Summary Table

| Category | Tests | Root Cause | Scope | Complexity |
|----------|-------|------------|-------|------------|
| Stdlib module access (String.fromInt) | 8 | Module-style access (`String.fromInt`) not resolved; `String` not in value env | Medium | Medium |
| Bool exhaustiveness | 2 | Exhaustiveness checker treats Bool as infinite literal type, not finite enum | Small | Low |
| Tuple type inference | 2 | Tuple expressions/types not yet implemented in type checker (VF4017) | Large | High |
| Or-pattern validation + nested expansion | 2 | No variable binding check in or-patterns; nested or-patterns not expanded | Medium | Medium |
| Guards in exhaustiveness | 1 | Guarded patterns incorrectly treated as catch-all by exhaustiveness checker | Small | Medium |
| Unreachable pattern detection | 1 | No reachability analysis implemented | Medium | Medium |
| User-defined variant constructors | 1 | Type checker doesn't register user variant constructors in value environment | Medium | Medium |
| Nullary constructor type annotation | 1 | `funType([])` causes crash in `typeToString` when formatting zero-param function | Small | Low |
