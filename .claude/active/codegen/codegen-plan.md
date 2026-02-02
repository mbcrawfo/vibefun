# ES2020 Code Generator Implementation Plan

**Last Updated:** 2026-02-01

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
    precedence: number;
    needsEqHelper: boolean;
    needsRefHelper: boolean;
    env: TypeEnv;
    declarationTypes: Map<string, Type>;
}
```

### 4. Runtime Helpers
Emit only when needed:
- `ref()` - for mutable references
- `$eq()` - for structural equality on composite types

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
| CoreLambda | `(x) => body` |
| CoreApp | `f(a)(b)(c)` (curried) |
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
| CoreExternalDecl | Import + const binding |
| CoreExternalTypeDecl | (no output) |
| CoreImportDecl | ES6 import statement |

## Binary Operators

| Op | JavaScript |
|----|------------|
| Add | `a + b` |
| Subtract | `a - b` |
| Multiply | `a * b` |
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

### Phase 10: Execution Tests (NEW)
- End-to-end tests that execute generated JS using Node's `vm` module (sandboxed)
- Verify runtime semantics (currying, pattern matching, etc.)
- Test edge cases (NaN equality, integer division truncation, etc.)

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

### Float Edge Cases
- `Infinity` → emit as `Infinity`
- `-Infinity` → emit as `(-Infinity)` (parenthesized)
- `NaN` → emit as `NaN`
- `-0.0` → emit as `(-0)` (negative zero)

### Import Path Rules
| Import Type | Rule |
|-------------|------|
| Relative (`./foo`) | Append `.js` → `"./foo.js"` |
| Absolute (`/lib/foo`) | Append `.js` → `"/lib/foo.js"` |
| Package (`lodash`) | Pass through unchanged |
| Scoped (`@vibefun/std`) | Pass through unchanged |

### Runtime Helper Detection
Track during expression emission:
- `needsRefHelper`: Set when encountering `CoreLet` with `mutable: true` OR `CoreUnaryOp` with `op: "Deref"` OR `CoreBinOp` with `op: "RefAssign"`
- `needsEqHelper`: Set when encountering `CoreBinOp` with `op: "Equal"` or `"NotEqual"` AND operand type is composite (record, variant, tuple, list)

### Error Handling
- Unknown AST node kind → throw internal compiler error with node details
- Invalid/malformed TypedModule → throw internal compiler error (should never happen if typechecker is correct)
