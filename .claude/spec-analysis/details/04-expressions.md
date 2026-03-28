# Section 04: Expressions - Failure Analysis

## Summary
- Total tests: 53
- Passing: 12
- Failing: 41
- Key issues: (1) Namespace-qualified builtins (`String.fromInt`, `String.fromBool`, `String.fromFloat`) are unreachable because the typechecker doesn't resolve `RecordAccess(Var("String"), "fromInt")` to the dotted key `"String.fromInt"` in the type environment -- this is the dominant failure cause affecting ~30 tests. (2) Bool exhaustiveness checking is missing, breaking all if-then-else tests. (3) Zero-param lambdas and empty blocks are rejected by the desugarer. (4) User-defined variant constructors aren't added to scope. (5) While loops can't appear at top-level declaration position. (6) List spread desugars to bare `concat` but builtins register it as `List.concat`. (7) Tuple type inference is unimplemented.

**Note:** The task description says 49 failures / 4 passes, but running the actual tests shows 41 failures / 12 passes. The additional passes are: string literal, string concat with &, field access on record, chained field access, list literal, empty list, cons operator prepends, cons is right-associative -- these all avoid the broken features.

## Root Causes

### RC-1: Namespace-qualified stdlib functions are unreachable (String.fromInt, etc.)
**Affected tests:** integer literal expression, float literal expression, boolean literal expression, variable reference, variable shadowing, single-argument function call, multi-argument function call, addition, subtraction, multiplication, integer division, modulo, unary minus, equality comparison, inequality comparison, less than comparison, logical AND short-circuit, logical OR short-circuit, logical NOT, record literal, record spread (immutable update), lambda with single param, lambda with multiple params, lambda with block body, block expression returns last value, nested blocks, pipe operator basic, pipe operator chaining, forward composition >>, backward composition <<
**Description:** The typechecker builtins register functions with dotted keys like `"String.fromInt"`, `"String.fromBool"`, `"String.fromFloat"` in the type environment (`builtins.ts` line 226). However, when the parser encounters `String.fromInt(42)`, it produces a `RecordAccess(Var("String"), "fromInt")` AST node. The typechecker then tries to look up `"String"` as a standalone variable, which doesn't exist, producing `VF4100: Undefined variable 'String'`. There is no mechanism to resolve `RecordAccess` on a capitalized name to a namespace-qualified builtin lookup.
**Evidence:**
```
error[VF4100]: Undefined variable 'String'
  --> <stdin>:2:30
  |
2 | let _ = unsafe { console_log(String.fromInt(42)) };
  |                              ^
```
The underlying features (arithmetic, lambdas, blocks, pipes, composition, records) all compile and work correctly when tested without `String.fromXxx` -- the failure is purely in the output/assertion mechanism.
**Estimated complexity:** Medium -- requires either (a) adding a namespace resolution pass that converts `RecordAccess(Var("String"), "fromInt")` to a direct builtin lookup when the base is a known namespace, or (b) registering `String` as a module/namespace object in the type environment with proper member types. Option (a) is simpler. Also need corresponding codegen support to emit the correct runtime calls.

### RC-2: Bool exhaustiveness checking treats true/false as non-exhaustive
**Affected tests:** if-then-else expression, nested if-else chains, if without else returns Unit, while loop, while loop returns Unit, match expression with variants (indirectly)
**Description:** The `checkExhaustiveness` function in `packages/core/src/typechecker/patterns.ts` (lines 386-393) treats all literal patterns as non-exhaustive unless a wildcard/variable catch-all is present. It does not special-case `Bool` to recognize `true | false` as exhaustive coverage. Since if-then-else desugars to `match cond { | true => a | false => b }`, all if-then-else expressions fail with `VF4400: Non-exhaustive pattern match`.
**Evidence:**
```
error[VF4400]: Non-exhaustive pattern match. Missing cases: <other values>
  --> /tmp/test_matchbool.vf:1:9
  |
1 | let x = match true {
  |         ^
```
Source code (`patterns.ts` line 386-393):
```typescript
const hasLiterals = patterns.some((p) => p.kind === "CoreLiteralPattern");
if (hasLiterals) {
    // Non-exhaustive unless there's a catch-all
    return ["<other values>"];
}
```
**Estimated complexity:** Small -- add a special case in `checkExhaustiveness` to recognize that Bool literal patterns covering both `true` and `false` are exhaustive.

### RC-3: User-defined variant constructors not added to type environment
**Affected tests:** match expression with variants
**Description:** When a `type Color = Red | Green | Blue;` declaration is processed, the constructors (`Red`, `Green`, `Blue`) are never added to the value environment. The `buildEnvironment` function in `environment.ts` has a TODO comment at line 128: "Handle other declaration types (LetDecl, TypeDecl, etc.) when type checker is implemented". The typechecker at line 241-244 skips `CoreTypeDecl` with the comment "Type declarations are already processed in buildEnvironment", but they aren't.
**Evidence:**
```
error[VF4100]: Undefined variable 'Red'
  --> /tmp/test_variant.vf:2:9
  |
2 | let c = Red;
  |         ^
```
**Estimated complexity:** Medium -- need to process `CoreTypeDecl` nodes to extract variant constructors and add them to the type environment with their proper types (e.g., `Red: Color`, `Some: (T) -> Option<T>`). Also need to handle constructors in codegen.

### RC-4: Zero-parameter lambdas rejected by desugarer
**Affected tests:** no-argument function call, lambda with no params
**Description:** The parser accepts `() => expr` syntax, but the desugarer's `curryLambda` function (`desugarer/curryLambda.ts` line 34) throws `"Lambda with zero parameters"` for any lambda with an empty parameter list. The spec allows zero-parameter lambdas as `() => expr`.
**Evidence:**
```
Internal error: Lambda with zero parameters
```
**Estimated complexity:** Small -- the desugarer needs to handle zero-parameter lambdas, likely by converting them to take a single Unit parameter or by emitting them as thunks in the core AST.

### RC-5: Empty block expressions rejected by desugarer
**Affected tests:** empty block returns Unit
**Description:** The desugarer's `desugarBlock` function (`desugarer/desugarBlock.ts` line 32) throws `"Empty block expression"` when given an empty block `{}`. The spec says empty blocks should return Unit.
**Evidence:**
```
Internal error: Empty block expression
```
**Estimated complexity:** Simple -- handle the empty block case by returning a Unit literal in the desugarer.

### RC-6: While loops cannot appear at top-level declaration position
**Affected tests:** while loop, while loop returns Unit
**Description:** The parser only expects declarations (let, type, external, import) at the top level. A `while` expression at the top level produces `VF2001: Unexpected keyword in declaration: while`. The test wraps the while loop body at top level (via `withOutputs`), so it fails. Even wrapping in `let _ = while ...` fails with "Pattern matching in let-bindings not yet implemented" (VF4017).
**Evidence:**
```
error[VF2001]: Unexpected keyword in declaration: while
  --> /tmp/test_while_full.vf:3:1
  |
3 | while !i < 3 {
  | ^
```
**Estimated complexity:** Medium -- while loops need to either be allowed as top-level expressions (requiring parser changes) or the test needs restructuring. Also depends on RC-2 (Bool exhaustiveness) since while desugars through conditionals, and the `!` deref operator issue (prefix `!` is logical NOT, not deref -- the spec says `!` is both with type-based disambiguation, but the parser implements deref as postfix `expr!`).

### RC-7: List spread desugars to bare `concat` but builtins use `List.concat`
**Affected tests:** list spread
**Description:** The desugarer's `desugarListWithConcats.ts` (line 64) emits `CoreVar("concat")` for list spread operations, but the builtin environment registers the function as `"List.concat"` (builtins.ts line 274). This is the same namespace resolution issue as RC-1 but from the desugarer side.
**Evidence:**
```
error[VF4100]: Undefined variable 'concat'
  --> /tmp/test_spread.vf:2:10
  |
2 | let ys = [0, ...xs, 3];
  |          ^
```
**Estimated complexity:** Simple -- either change the desugarer to emit `List.concat` (and handle the namespace resolution), or register a bare `concat` alias in builtins. The former is more correct but depends on RC-1 being fixed first.

### RC-8: Tuple type inference not implemented
**Affected tests:** tuple literal
**Description:** The typechecker explicitly rejects tuple expressions with `VF4017: Tuple type inference not yet implemented`.
**Evidence:**
```
error[VF4017]: Tuple type inference not yet implemented
  --> <stdin>:1:12
  |
1 | let pair = (1, "hello");
  |            ^
```
**Estimated complexity:** Large -- requires implementing tuple types in the type system, type inference for tuple expressions, destructuring support, and codegen for tuple values (likely as JS arrays).

## Dependencies

### Fix ordering recommendations:
1. **RC-1 (namespace resolution)** is the highest-impact fix -- resolving it would immediately make ~30 tests pass since the underlying features already work. It is also a prerequisite for RC-7.
2. **RC-2 (Bool exhaustiveness)** is the second-highest impact -- would unblock all if-then-else and control flow tests (~6 tests directly).
3. **RC-3 (variant constructors)** is needed for pattern matching on user types.
4. **RC-4 and RC-5** (zero-param lambdas, empty blocks) are small independent fixes.
5. **RC-6 (while loops)** has multiple sub-issues (top-level expressions, deref disambiguation, Bool exhaustiveness).
6. **RC-7 (list spread)** depends on RC-1.
7. **RC-8 (tuples)** is the largest standalone feature gap.

### Cross-section dependencies:
- RC-1 affects tests across all sections that use `String.fromInt`/`String.fromBool`/`String.fromFloat` for output assertions.
- RC-2 affects section 05 (pattern matching) and 06 (functions) tests that use if-then-else.
- RC-3 affects section 05 (pattern matching on variants) and section 03 (type system with ADTs).
- RC-6's `!` deref issue affects section 07 (mutable references).
