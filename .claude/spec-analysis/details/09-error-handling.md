# Section 09: Error Handling - Failure Analysis

## Summary
- Total tests: 9
- Passing: 0
- Failing: 9
- Key issues: (1) Module-qualified stdlib function calls (`String.fromInt`, `String.fromFloat`) fail with "Undefined variable 'String'" because the parser emits `RecordAccess` on a `Var("String")` that doesn't exist in the type environment -- builtins are registered as flat keys like `"String.fromInt"` but there is no namespace/module resolution mechanism. (2) Integer division by zero produces `Infinity` instead of a runtime panic. (3) Nullary variant constructors with explicit generic type annotations trigger an internal error.

## Root Causes

### RC-1: Module-qualified stdlib calls are not resolved
**Affected tests:** "float division by zero returns Infinity", "float 0/0 returns NaN", "negative float division by zero returns -Infinity", "Result type - Ok variant", "Result type - Err variant", "Option type - Some variant", "nested Result in Option" (7 tests)
**Description:** All 7 tests use `String.fromInt(v)` or `String.fromFloat(x)` to convert values to strings for output. The parser produces a `RecordAccess` node with `record: Var("String")` and `field: "fromInt"`. The typechecker then tries to resolve `String` as a standalone variable, which fails because only `"String.fromInt"` exists as a flat key in the builtin environment. There is no mechanism to resolve module-qualified names (e.g., resolving `String.fromInt` from a `RecordAccess` on `Var("String")`).

**Evidence:**
```
error[VF4100]: Undefined variable 'String'
  --> <stdin>:5:14
  |
5 |   | Ok(v) => String.fromInt(v)
  |              ^
```

The builtins are registered in `packages/core/src/typechecker/builtins.ts` as flat names:
```typescript
env.set("String.fromInt", monoScheme(funType([primitiveTypes.Int], primitiveTypes.String)));
env.set("String.fromFloat", monoScheme(funType([primitiveTypes.Float], primitiveTypes.String)));
```

But the parser has no concept of qualified names -- `String.fromInt` is parsed as `RecordAccess(Var("String"), "fromInt")`, and `inferRecordAccess` first tries to infer the type of `Var("String")`, which fails.

**Estimated complexity:** Medium -- Requires either (a) adding namespace/module resolution to the typechecker so `RecordAccess` on known module names resolves to the flat builtin key, or (b) adding a desugaring pass that converts `RecordAccess(Var("String"), "fromInt")` to `Var("String.fromInt")` when `String` matches a known builtin module. The codegen would also need corresponding changes to emit the correct JS runtime calls. This is a cross-cutting issue that affects all stdlib module-qualified calls throughout the compiler.

### RC-2: Integer division by zero does not panic at runtime
**Affected tests:** "integer division by zero panics" (1 test)
**Description:** The spec requires integer division by zero to produce a runtime panic. Currently, `1 / 0` compiles to `Math.trunc(1 / 0)` which evaluates to `Infinity` in JavaScript -- no error is thrown. The codegen for `IntDivide` in `emit-expressions.ts` emits `Math.trunc(a / b)` without any runtime guard checking whether the divisor is zero.

**Evidence:**
```
$ echo 'let x: Int = 1 / 0;' | node packages/cli/dist/index.js compile -
// Output: const x = Math.trunc(1 / 0);

$ node -e "console.log(Math.trunc(1/0))"
Infinity
```

Test failure message: `Expected runtime error, but program exited successfully`

The relevant codegen is in `packages/core/src/codegen/es2020/emit-expressions.ts`:
```typescript
if (op === "IntDivide") {
    const leftCode = emitExpr(expr.left, withPrecedence(ctx, prec));
    const rightCode = emitExpr(expr.right, withPrecedence(ctx, prec));
    const code = `Math.trunc(${leftCode} / ${rightCode})`;
    return maybeParens(code, CALL_PRECEDENCE, ctx.precedence);
}
```

**Estimated complexity:** Small -- The codegen for `IntDivide` needs to emit a runtime check, e.g., a helper function `$intDiv(a, b)` that throws when `b === 0`, or inline the check. The constant folding pass should also be updated to detect division by zero at compile time if both operands are known.

### RC-3: Nullary variant constructor with explicit generic type annotation triggers internal error
**Affected tests:** "Option type - None variant" (1 test)
**Description:** When a nullary variant constructor (like `None`) is used with an explicit type annotation containing a generic parameter (e.g., `let x: Option<Int> = None`), the typechecker crashes with an internal error: "Function type must have at least one parameter". This happens because the typechecker tries to treat `None` as a function type when unifying it against the annotated type `Option<Int>`, but `None` is a constant (not a function), so the function-type decomposition fails.

**Evidence:**
```
$ echo 'type Option<T> = Some(T) | None;
let x: Option<Int> = None;' | node packages/cli/dist/index.js compile -
Internal error: Function type must have at least one parameter
```

Without the type annotation, it works:
```
$ echo 'type Option<T> = Some(T) | None;
let x = None;' | node packages/cli/dist/index.js compile -
// Output: const None = { $tag: "None" }; const x = None;
```

Note: This test also has the RC-1 issue (`String.fromInt`), but RC-3 is hit first because the `None` assignment fails before reaching the match expression.

**Estimated complexity:** Medium -- The typechecker's annotation unification logic needs to handle nullary variant constructors correctly when the annotation provides a more specific generic type. The unification between a nullary constructor's type (`forall T. Option<T>`) and the annotation (`Option<Int>`) needs to instantiate the type variable without requiring a function type decomposition.

## Dependencies

### What these fixes depend on:
- **RC-1 (stdlib namespace resolution)** is a fundamental infrastructure issue. It blocks not just these 7 tests but likely many tests across other sections (notably section 11 stdlib tests). Fixing this requires changes to the parser or typechecker and codegen.
- **RC-2 (division by zero panic)** is self-contained and can be fixed independently in the codegen layer.
- **RC-3 (nullary variant annotation)** is a typechecker issue that may also affect other sections using `None` or other nullary constructors with type annotations.

### What these fixes enable:
- **RC-1** would unblock a large number of tests across multiple sections that use stdlib functions (String, Int, Float, List, etc.).
- **RC-2** is specific to error handling semantics.
- **RC-3** would enable proper use of `None`, `Nil`, and other nullary constructors with explicit type annotations throughout the language.

### Cross-section impact:
- RC-1 is likely the single most impactful fix across the entire spec validation suite, as stdlib module-qualified calls are used pervasively.
- RC-3 may overlap with pattern matching (section 05) and type system (section 03) test failures.
