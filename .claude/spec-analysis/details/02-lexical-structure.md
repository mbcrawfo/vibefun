# Section 02: Lexical Structure - Failure Analysis

## Summary
- Total tests: 43
- Passing: 32
- Failing: 11
- Key issues: Two root causes account for all 11 failures: (1) Module-qualified builtins like `String.fromInt` cannot be resolved because the typechecker registers them as flat keys but the parser treats them as field access on an undefined variable `String` (10 tests); (2) empty block `{}` crashes the desugarer instead of being treated as a valid empty record or unit expression (1 test).

## Root Causes

### RC-1: Module-qualified builtins are not resolvable from source code
**Affected tests (10):**
- "boolean literal true"
- "boolean literal false"
- "decimal integer literal"
- "hexadecimal integer literal"
- "binary integer literal"
- "underscore separators in integers"
- "leading zeros are decimal (not octal)"
- "basic float literal"
- "pipe operator"
- "unary minus operator"

**Description:** All `expectRunOutput` tests use the `withOutput` helper, which wraps test code with `String.fromInt(x)`, `String.fromBool(x)`, or `String.fromFloat(x)` to convert values to strings for output comparison. When the parser encounters `String.fromInt(x)`, it parses this as a record/field access: `RecordAccess(Identifier("String"), "fromInt")` applied to `x`. The typechecker then tries to look up `String` as a variable in the environment and fails with `VF4100: Undefined variable 'String'`.

Meanwhile, the builtins module (`packages/core/src/typechecker/builtins.ts`) registers these functions as flat string keys like `"String.fromInt"` in the type environment Map. There is no mechanism to resolve `String` as a module namespace and then look up `fromInt` as a field on it.

Additionally, `String.fromBool` is not registered in the builtins at all -- it is completely missing from `builtins.ts`.

**Evidence:**
```
error[VF4100]: Undefined variable 'String'
  --> <stdin>:3:30
  |
3 | let _ = unsafe { console_log(String.fromInt(x)) };
  |                              ^
```

The underlying features being tested (comments, identifiers, literals, operators, pipe, unary minus) all work correctly. Compiling `let x = 42;`, `let x = -42;`, `let result = 5 |> double;`, etc. all succeed. The failures are entirely in the output/assertion layer, not in the features under test.

**Sub-issues:**
1. **No module namespace resolution**: The typechecker does not support looking up `String` as a namespace/module that exposes `fromInt`, `fromFloat`, etc. The flat key `"String.fromInt"` in the environment is never matched against the parsed AST form `RecordAccess(Var("String"), "fromInt")`.
2. **Missing `String.fromBool` builtin**: Even once namespace resolution works, `String.fromBool` (used by boolean literal tests) is not defined in `builtins.ts`.

**Estimated complexity:**
- Sub-issue 1 (namespace resolution for builtins): Medium (50-200 lines). Requires either: (a) teaching the typechecker to recognize `RecordAccess` on known module namespaces and map them to flat builtin keys, or (b) restructuring builtins to use actual record/module types, or (c) having the desugarer/parser rewrite `String.fromInt` into a direct reference to the flat builtin.
- Sub-issue 2 (add `String.fromBool`): Simple (1-2 lines). Add the type signature to `builtins.ts`, plus corresponding codegen support.

### RC-2: Empty block `{}` crashes the desugarer
**Affected tests (1):**
- "empty blocks valid without semicolons"

**Description:** The test `let x = {};` is parsed as a block expression with zero statements. The desugarer (`packages/core/src/desugarer/desugarBlock.ts` line 32) throws an internal error `"Empty block expression"` because it does not handle the empty block case. The spec (`docs/spec/02-lexical-structure/basic-structure.md`, line 104-107) says "Empty blocks are valid without semicolons inside" and shows `let noOp = () => {};` as a valid example.

There is an ambiguity: `{}` could be interpreted as an empty record literal or an empty block expression. The spec shows `{}` inside a lambda body (`() => {}`), suggesting it should evaluate to unit `()`. The parser currently creates an empty block which the desugarer rejects.

**Evidence:**
```
$ echo 'let x = {};' | node packages/cli/dist/index.js compile -
Internal error: Empty block expression
(exit code 5)
```

The error comes from `packages/core/src/desugarer/desugarBlock.ts:32`:
```typescript
if (exprs.length === 0) {
    throw new Error("Empty block expression");
}
```

**Estimated complexity:** Small (< 50 lines). The desugarer needs to handle the empty block case by converting `{}` to a unit literal `()`. May also require parser-level changes if the ambiguity between empty record and empty block needs to be resolved there.

## Dependencies

### What these fixes depend on
- RC-1 (namespace resolution) may interact with the module system (Section 08). A proper fix should be designed with module imports in mind so that `String.fromInt` works the same way whether `String` is a builtin module or an imported module.
- RC-1 (namespace resolution) also affects every other spec section that uses `withOutput`/`expectRunOutput` -- this is likely the single largest source of failures across all sections.

### What these fixes enable
- Fixing RC-1 would unblock a large number of tests across **all** spec sections, since `String.fromInt`, `String.fromFloat`, and `String.fromBool` are used pervasively in the test framework's `withOutput` helper.
- Fixing RC-2 enables empty record/block usage patterns.

### Cross-section impact
- RC-1 is the highest-priority fix for the spec validation suite. Based on the test framework design (every `expectRunOutput` test uses `withOutput` which uses `String.fromInt`/`String.fromBool`/`String.fromFloat`), this single issue likely causes failures in sections 03-12 as well.
