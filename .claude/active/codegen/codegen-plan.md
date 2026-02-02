# ES2020 Code Generator Implementation Plan

**Last Updated:** 2026-02-01 (Third review: CoreLetRecExpr, unlowered Divide error, pattern export collection, execution test ES module handling, indent config)

## Overview

Implement the ES2020 code generator for the Vibefun compiler. The generator transforms `TypedModule` (output of typechecker) into valid ES2020 JavaScript code.

## Prerequisites Status

| Prerequisite | Status | Notes |
|--------------|--------|-------|
| IntDivide/FloatDivide in Core AST | ✅ Complete | `core-ast.ts:250-251` |
| Typechecker division lowering | ✅ Complete | `infer-operators.ts`, tests in `division-lowering.test.ts` |
| Optimizer constant folding updated | ✅ Complete | Uses `Math.trunc` for IntDivide |

All prerequisites are in place. Implementation can proceed.

## Directory Structure

```
packages/core/src/codegen/
├── index.ts                    # Main public API (update existing)
└── es2020/
    ├── CLAUDE.md               # Module documentation (following parser pattern)
    ├── index.ts                # ES2020 public API (~50 lines)
    ├── generator.ts            # Main generator class (~350 lines)
    ├── emit-expressions.ts     # Expression emission (~450 lines)
    ├── emit-patterns.ts        # Pattern emission (~300 lines)
    ├── emit-declarations.ts    # Declaration emission (~250 lines)
    ├── emit-operators.ts       # Operator precedence (~200 lines)
    ├── context.ts              # EmitContext type (~100 lines)
    ├── reserved-words.ts       # JS reserved word escaping (~80 lines)
    ├── runtime-helpers.ts      # $eq, ref helpers (~120 lines)
    ├── tests/
    │   ├── test-helpers.ts
    │   ├── expressions.test.ts
    │   ├── patterns.test.ts
    │   ├── declarations.test.ts
    │   ├── operators.test.ts
    │   ├── execution-test-helpers.ts  # Uses Node vm module
    │   ├── execution.test.ts          # Runtime semantic tests
    │   └── reserved-words.test.ts
    └── snapshot-tests/
        ├── test-helpers.ts
        ├── __snapshots__/
        ├── expressions.vf / .test.ts
        ├── declarations.vf / .test.ts
        ├── patterns.vf / .test.ts
        ├── functions.vf / .test.ts
        ├── data-structures.vf / .test.ts
        └── real-world.vf / .test.ts
```

## Public API Design

### Main Interface (supports future ES targets)

```typescript
// packages/core/src/codegen/index.ts
export type ESTarget = "es2020"; // Future: | "es2015" | "es2022"

export interface GenerateOptions {
    readonly filename?: string;
    readonly target?: ESTarget;
}

export interface GenerateResult {
    readonly code: string;
}

export function generate(
    typedModule: TypedModule,
    options?: GenerateOptions
): GenerateResult;
```

### ES2020-Specific API

```typescript
// packages/core/src/codegen/es2020/index.ts
export function generate(
    typedModule: TypedModule,
    options?: GenerateOptions
): GenerateResult;
```

## Key Design Decisions

### 1. Module Organization (Follows Parser Pattern)
- Separate files for expressions, patterns, declarations
- Each file under 500 lines
- Use index.ts for public exports only

### 2. Dependency Injection Pattern
Break circular dependencies between modules:

```typescript
// emit-expressions.ts
let emitPatternFn: (pattern: CorePattern, ctx: EmitContext) => string = () => {
    throw new Error("emitPatternFn not initialized");
};

export function setEmitPattern(fn: typeof emitPatternFn): void {
    emitPatternFn = fn;
}
```

Wiring in generator.ts:
```typescript
Expressions.setEmitPattern(Patterns.emitPattern);
Patterns.setEmitExpr(Expressions.emitExpr);
Declarations.setDependencies({
    emitExpr: Expressions.emitExpr,
    emitPattern: Patterns.emitPattern,
});
```

### 3. Context Tracking
Track statement vs expression context for proper emission:

```typescript
interface EmitContext {
    mode: "statement" | "expression";
    indentLevel: number;
    indentString: string;        // Default: "  " (2 spaces)
    precedence: number;
    needsEqHelper: boolean;
    needsRefHelper: boolean;
    env: TypeEnv;
    declarationTypes: Map<string, Type>;
    exportedNames: Set<string>;  // Collected during declaration emission
}
```

**Indentation Strategy:**
- Default: 2 spaces per level
- Top-level declarations at indent 0
- IIFE bodies and match cases indent +1 level

### 4. Runtime Helpers
Emit only when needed:
- `ref()` - for mutable references
- `$eq()` - for structural equality on composite types

### 5. Structural Equality Detection ($eq)
**Challenge:** Types are erased at codegen time, but we need to know when to use `$eq` vs `===`.

**Solution:** Use `TypedModule.declarationTypes` and `TypeEnv` to look up operand types during emission:
1. For `CoreBinOp` with `Equal` or `NotEqual`, examine the left operand's type
2. If operand is a `CoreVar`, look up its type in `declarationTypes` or `env.values`
3. Primitive types (Int, Float, String, Bool, Unit) → use `===`
4. Composite types (records, variants, tuples, lists) → use `$eq`
5. Type variables that couldn't resolve → conservatively use `$eq`

**Implementation:** Add `getExprType(expr: CoreExpr, ctx: EmitContext): Type | undefined` helper

### 5. Reserved Word Escaping
Append `$` suffix: `class` → `class$`

## Core AST Node Handling

### Expressions (CoreExpr)
| Node | JavaScript Output |
|------|------------------|
| CoreIntLit | `42`, `(-5)` |
| CoreFloatLit | `3.14`, `Infinity`, `NaN` |
| CoreStringLit | `"hello"` (escaped) |
| CoreBoolLit | `true`, `false` |
| CoreUnitLit | `undefined` |
| CoreVar | `x`, `class$` (escaped) |
| CoreLet | IIFE or const (context-dependent) |
| CoreLetRecExpr | IIFE with let declarations (mutual recursion in expressions) |
| CoreLambda | `(x) => body` |
| CoreApp | `f(a)(b)(c)` (curried) - Note: `args` is always a single-element array |
| CoreMatch | IIFE with if-chain |
| CoreRecord | `{ field: value }` |
| CoreRecordAccess | `record.field` |
| CoreRecordUpdate | `{ ...record, field: value }` |
| CoreVariant | `{ $tag: "Name", $0: arg }` |
| CoreBinOp | Operator with precedence handling |
| CoreUnaryOp | `-x`, `!x`, `x.$value` |
| CoreTuple | `[a, b, c]` |

### Patterns (CorePattern)
| Pattern | Condition | Bindings |
|---------|-----------|----------|
| CoreWildcardPattern | (none) | (none) |
| CoreVarPattern | (none) | `const name = value` |
| CoreLiteralPattern | `value === literal` | (none) |
| CoreVariantPattern | `value.$tag === "Name"` | `value.$0`, `value.$1`... |
| CoreRecordPattern | (none) | `{ field }` destructuring |
| CoreTuplePattern | (none) | `[a, b]` destructuring |

### Declarations (CoreDeclaration)
| Declaration | JavaScript Output |
|-------------|------------------|
| CoreLetDecl | `const name = value;` |
| CoreLetRecGroup | Multiple const declarations |
| CoreTypeDecl | Variant constructors only |
| CoreExternalDecl | Import + const binding (also handle ExternalOverload from TypeEnv) |
| CoreExternalTypeDecl | (no output) |
| CoreImportDecl | ES6 import statement |

## Binary Operators

| Op | JavaScript |
|----|------------|
| Add | `a + b` |
| Subtract | `a - b` |
| Multiply | `a * b` |
| Divide | **ERROR** (should never appear - must be lowered by typechecker) |
| IntDivide | `Math.trunc(a / b)` |
| FloatDivide | `a / b` |
| Modulo | `a % b` |
| Equal | `$eq(a, b)` or `a === b` |
| NotEqual | `!$eq(a, b)` or `a !== b` |
| LessThan | `a < b` |
| LessEqual | `a <= b` |
| GreaterThan | `a > b` |
| GreaterEqual | `a >= b` |
| LogicalAnd | `a && b` |
| LogicalOr | `a \|\| b` |
| Concat | `a + b` |
| RefAssign | `(a.$value = b, undefined)` |

## Implementation Phases

### Phase 1: Core Infrastructure
- Create directory structure
- Implement context.ts
- Implement reserved-words.ts
- Implement emit-operators.ts
- Set up test infrastructure

### Phase 2: Expression Emission
- Literals (int, float, string, bool, unit)
- Variables with escaping
- Binary/unary operators with precedence
- Lambdas and function application
- Tuples

### Phase 3: Pattern Emission
- Dependency injection setup
- Wildcard, variable patterns
- Literal patterns
- Tuple/record patterns
- Variant patterns

### Phase 4: Match Expressions
- Complete match emission
- Guards
- Nested patterns

### Phase 5: Let and Mutability
- Let expressions (IIFE vs const)
- Recursive lets
- Mutual recursion (let rec)
- Mutable references (ref helper)

### Phase 6: Records and Variants
- Record literals
- Record access/update
- Variant construction

### Phase 7: Declarations
- Let declarations
- Type declarations (constructors)
- External declarations
- Import declarations
- Export handling

### Phase 8: Generator Integration
- Main generator class
- Module emission
- Runtime helper injection (conditional)
- Helper detection: track `needsEqHelper`/`needsRefHelper` during emission
- Empty module handling
- Import deduplication
- Public API

### Phase 9: Snapshot Tests
- Fixture files (following parser snapshot test pattern)
- Test helpers (`compileFixture()` that goes source → JS)
- Generate snapshots
- **Naming Convention:** Use `snapshot-*.test.ts` pattern to match parser convention

### Phase 10: Execution Tests
- End-to-end tests that execute generated JS using Node's `vm` module (sandboxed)
- Verify runtime semantics (currying, pattern matching, etc.)
- Test edge cases (NaN equality, integer division truncation, etc.)
- **Note:** Test helper must handle module-level declarations, not just expressions
- **ES Module Handling:** Generated code uses `export { }` which isn't supported by `vm.runInContext`. Solution: Strip the final `export { ... }` statement before execution, as declarations are already available in the vm context.

### Phase 11: Structural Equality
- $eq helper implementation
- Tracking when needed (composite types in Equal/NotEqual)

### Phase 12: Polish
- Edge cases (negative zero, deeply nested structures)
- Indentation consistency
- Internal error handling (unknown node kinds)
- Documentation

## Verification

After implementation:
1. `npm run check` - Type checking
2. `npm run lint` - Linting
3. `npm test` - All tests pass
4. `npm run format` - Code formatting
5. Manual testing with example .vf files

## Special Considerations

### CoreApp.args Semantics
The Core AST uses single-parameter lambdas (curried), so `CoreApp.args` is **always a single-element array**. Multi-argument calls like `add(1, 2)` are already desugared to `add(1)(2)`, which becomes nested `CoreApp` nodes, each with a single-element `args` array.

**Emission pattern:**
```typescript
// CoreApp { func: f, args: [a] }  →  f(a)
// Nested: CoreApp { func: CoreApp { func: f, args: [a] }, args: [b] }  →  f(a)(b)
```

### String Escape Sequences
Emit strings with proper escaping for JavaScript string literals:
- Control characters: `\n`, `\t`, `\r`, `\\`, `\"`
- Unicode line separators: `U+2028` → `\u2028`, `U+2029` → `\u2029`
- Other non-printable characters: `\xNN` or `\uNNNN`

Note: U+2028 and U+2029 are valid in JavaScript strings but break when appearing unescaped in string literals (they're line terminators).

### Export Strategy
Exports are collected during declaration emission and emitted as a single `export { ... }` statement at the end of the module. This approach:
- Keeps declarations as simple `const` statements
- Allows easy deduplication
- Handles pattern destructuring exports correctly

**Example:**
```javascript
// Declarations
const add = (x) => (y) => x + y;
const multiply = (x) => (y) => x * y;
// End of file
export { add, multiply };
```

### Mutual Recursion and Let Rec Groups
JavaScript `const` is not hoisted, so mutually recursive functions require special handling:

**Strategy:** Use a two-phase approach:
1. Declare all names with `let` (to allow forward references)
2. Assign the function bodies

```javascript
// let rec f = (x) => g(x) and g = (x) => f(x)
let f, g;
f = (x) => g(x);
g = (x) => f(x);
```

For single recursive functions, this simplifies to using `const` with an arrow function (works because the name is in scope in the body).

### Variant Constructor Emission
Zero-argument and multi-argument constructors are handled differently:

| Constructor | Emission |
|-------------|----------|
| `None` (0 args) | `{ $tag: "None" }` (constant object) |
| `Some(x)` (1 arg) | `($$0) => ({ $tag: "Some", $0: $$0 })` (function) |
| `Node(l, v, r)` (3 args) | `($$0) => ($$1) => ($$2) => ({ $tag: "Node", $0: $$0, $1: $$1, $2: $$2 })` (curried function) |

Zero-arg constructors are not functions - they're directly usable as values.

### Float Edge Cases
- `Infinity` → emit as `Infinity`
- `-Infinity` → emit as `(-Infinity)` (parenthesized)
- `NaN` → emit as `NaN`
- `-0.0` → emit as `(-0)` (negative zero)

### NaN and Negative Zero in $eq Helper
The `$eq` helper preserves IEEE 754 semantics:
- `NaN === NaN` returns `false` (identity check `a === b` handles this)
- `-0 === 0` returns `true` in JavaScript (acceptable for Vibefun equality)

No special handling needed - JavaScript's `===` already provides correct behavior for these cases.

### Import Path Rules
| Import Type | Rule |
|-------------|------|
| Relative (`./foo`) | Append `.js` → `"./foo.js"` |
| Absolute (`/lib/foo`) | Append `.js` → `"/lib/foo.js"` |
| Package (`lodash`) | Pass through unchanged |
| Scoped (`@vibefun/std`) | Pass through unchanged |

### Type-Only Import Handling
When filtering `CoreImportItem.isType`:
- If some items are type-only, filter them out
- If ALL items are type-only, emit **no import statement at all**
- This prevents empty `import { } from "module.js"` statements

### Runtime Helper Detection
Track during expression emission:
- `needsRefHelper`: Set when encountering `CoreLet` with `mutable: true` OR `CoreUnaryOp` with `op: "Deref"` OR `CoreBinOp` with `op: "RefAssign"`
- `needsEqHelper`: Set when encountering `CoreBinOp` with `op: "Equal"` or `"NotEqual"` AND operand type is composite (record, variant, tuple, list)

### Error Handling
- Unknown AST node kind → throw internal compiler error with node details
- Invalid/malformed TypedModule → throw internal compiler error (should never happen if typechecker is correct)
- Unlowered `Divide` operator → throw internal compiler error (typechecker must lower to IntDivide/FloatDivide)

### Pattern Export Collection
When a declaration uses pattern destructuring, all bound names must be exported:

```javascript
// let (a, b) = tuple;  →  exports { a, b }
// let { x, y } = rec;  →  exports { x, y }
```

Implement `extractPatternNames(pattern: CorePattern): string[]` helper to collect all variable names from a pattern.

## Non-Goals (MVP)

These are explicitly out of scope for this implementation:
1. **Source maps** - Will be added in a future phase (spec mentions `--source-maps` flag)
2. **Runtime type checking** - FFI boundary checks deferred
3. **Multiple ES targets** - Only ES2020 for now (config has commented placeholder)
4. **Minification** - Output prioritizes readability
5. **Tree shaking** - Emit all declarations

## Implementation Notes

### Alignment with Language Spec
The language spec (`docs/spec/12-compilation/codegen.md`) is deliberately implementation-agnostic about representations. This plan makes **concrete implementation choices**:
- Variants → Tagged objects with `$tag`, `$0`, `$1`...
- Tuples → JavaScript arrays
- Records → Plain objects
- Refs → Objects with `$value`
- Unit → `undefined`

These choices are valid implementations of the spec's semantic requirements.
