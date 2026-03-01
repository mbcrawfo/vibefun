# Bug: Type Annotations on Let Bindings Are Silently Ignored

## Summary

`let x: Int = "hello";` compiles successfully. The type checker infers `x: String` and the `: Int` annotation is silently discarded. This breaks the language's type safety guarantee — explicit type annotations should be checked against inferred types.

## Reproduction

```bash
echo 'let x: Int = "hello";' > bad.vf
vibefun compile bad.vf           # ✅ Succeeds (should fail)
vibefun compile bad.vf --emit typed-ast  # Shows x: String (annotation ignored)
```

The same issue applies to:
- `let rec` bindings with annotations
- `and` bindings in mutual recursion groups
- `let` expression bindings (not just declarations)

## Root Cause

The annotation is dropped in **one place**: the parser.

**File:** `packages/core/src/parser/parse-declarations.ts`, lines 227-231

```typescript
// Optional type annotation
if (parser.match("COLON")) {
    // Skip type annotation for now (will be used by type checker)
    parseTypeExpr(parser);  // return value silently discarded
}
```

The parser calls `parseTypeExpr` to consume the tokens (avoiding a syntax error), but throws the return value away. The comment "will be used by type checker" describes intent that was never implemented.

## Pipeline Trace

### Parser (`parse-declarations.ts`)

The `LetDecl` AST node has no `typeAnnotation` field (`packages/core/src/types/ast.ts`, lines 271-279):

```typescript
{
    kind: "LetDecl";
    pattern: Pattern;
    value: Expr;
    mutable: boolean;
    recursive: boolean;
    exported: boolean;
    loc: Location;
}
```

The same is true for the inline `Let` expression node — no `typeAnnotation` field.

### Desugarer (`desugarer.ts`)

`CoreLetDecl` in `packages/core/src/types/core-ast.ts` (lines 521-529) also has no `typeAnnotation` field. Nothing to preserve — the information was already destroyed in the parser.

Note: the desugarer also explicitly strips `TypeAnnotatedPattern` nodes (line 483-487) and lambda parameter annotations (line 151-153), but those are separate codepaths.

### Type Checker (`typechecker.ts`)

The type checker infers the value's type and registers it in the environment with no mechanism to consult a user-provided annotation — because none exists in the Core AST.

The type checker **does** know how to enforce annotations via `CoreTypeAnnotation` expression nodes (`infer-primitives.ts`, lines 228-247). That path calls `unify` against the annotation, which would correctly reject `"hello"` vs `Int`. But that path is never reached for let binding annotations because they're dropped in the parser.

## Suggested Fix

The cleanest fix wraps the value in the parser: when a `: Type` annotation is present on a let binding, wrap the parsed value expression in a `TypeAnnotation` expression node.

```typescript
// In parse-declarations.ts, after parsing the type annotation:
if (parser.match("COLON")) {
    const typeAnnotation = parseTypeExpr(parser);
    // After parsing the value expression, wrap it:
    value = {
        kind: "TypeAnnotation",
        expr: value,
        typeExpr: typeAnnotation,
        loc: value.loc,
    };
}
```

This piggybacks on the already-working `CoreTypeAnnotation` → `unify` infrastructure in the type checker with zero changes needed in the desugarer or type checker. The desugarer already handles `TypeAnnotation` → `CoreTypeAnnotation`, and the type checker already handles `CoreTypeAnnotation` by unifying.

### Locations to patch

1. `packages/core/src/parser/parse-declarations.ts` — `LetDecl` annotation (line ~230)
2. Same file — `and` binding annotation (line ~284-285)
3. Verify `Let` expression annotations follow the same pattern (if applicable)
