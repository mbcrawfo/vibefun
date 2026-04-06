# Group 3: While Loop & Mutable Reference Compound Issues

## Root Issue
While loops and mutable references involve multiple overlapping implementation gaps that must all be addressed together. A while loop desugars to a recursive function that uses boolean pattern matching, wildcard let-bindings, and dereference -- each of which has its own issue.

This group is organized into three sub-groups to reflect their different dependency profiles:

## Sub-Group 3a: Boolean Exhaustiveness (BROAD IMPACT)

**This sub-issue has impact far beyond while loops.** If-then-else expressions desugar to `match cond { | true => ... | false => ... }`, which fails exhaustiveness checking because the checker treats Bool as an infinite literal type. This means **every if-then-else expression is broken**, making this a hidden prerequisite for Group 1's test results.

- **Scope:** Small (1 hour)
- **Impact:** Unblocks if-then-else across ALL sections, plus while loop desugaring
- **Location:** `typechecker/patterns.ts` -- `checkExhaustiveness` function needs a Bool special case

## Sub-Group 3b: Wildcard/Destructuring in Let-Bindings (BROAD IMPACT)

The typechecker's `inferLet` (`infer-bindings.ts:71-76`) only supports `CoreVarPattern`. The while loop desugarer generates `let _ = body in loop()` with `CoreWildcardPattern`. This also blocks `let _ = expr;` as a workaround for top-level expression statements.

- **Scope:** Small (1 hour)
- **Impact:** Unblocks while loop desugaring, enables `let _ = expr;` patterns

## Sub-Group 3c: Mutable Reference Specific Issues

These are tightly coupled and primarily affect section 07:

1. **Prefix `!` always parsed as LogicalNot** (Medium): The parser (`parse-expression-operators.ts:480`) emits `LogicalNot` for prefix `!`, but the spec defines type-based disambiguation -- `!x` should be `Deref` when `x: Ref<T>` and `LogicalNot` when `x: Bool`. Postfix `x!` correctly emits `Deref`. **DECISION REQUIRED:** The spec uses prefix `!x` for dereference while the implementation uses postfix `x!`. This is a design decision that must be resolved before implementation.

2. **Top-level expression statements rejected** (Small-Medium): The parser only accepts keyword-starting declarations at the top level. Bare expressions like `x := 20;` or `while ... { ... };` are rejected. Lower priority since `let _unused = expr;` is a workaround after sub-group 3b is fixed.

3. **Nested `let mut` unimplemented** (Medium): The typechecker throws VF4017 for mutable let-bindings in expression context (`infer-bindings.ts:81-85`). Top-level `let mut` works but nested (e.g., inside a function body) does not.

4. **Codegen double-wrapping for mut/ref** (Small): `let mut x = ref(v)` generates `{ $value: { $value: v } }` because both `mut` codegen and the `ref()` helper create `$value` wrappers.

5. **Non-let expressions in block bodies** (Small): `desugarBlock.ts:65` throws for non-let, non-final expressions in blocks (e.g., `{ sideEffect(); let x = 1; x }`). This blocks imperative-style code in blocks and closures.

## Affected Sections
02-lexical-structure, 04-expressions, 07-mutable-references, 12-compilation

## Affected Tests (count)
~15-20 tests (with significant overlap, as individual tests fail due to multiple causes).

## Individual Failures
- **02**: 1 test (reference operators)
- **04**: 3+ tests (while loop, while returns Unit, while with false condition), plus indirect impact on if-then-else via boolean exhaustiveness
- **07**: 14 tests (most mutable reference tests fail due to overlapping causes)
- **12**: 1 test (while loop desugars correctly)

## Estimated Fix Scope
Medium to Large (1-3 days total). Sub-groups 3a and 3b are quick (~2 hours combined) and should be done in Phase 1. Sub-group 3c requires ~1-2 days and depends on the prefix/postfix `!` design decision.
