# ES2020 Code Generator Implementation Plan

## Overview

Implement the ES2020 code generator for the Vibefun compiler. The generator transforms `TypedModule` (output of typechecker) into valid ES2020 JavaScript code.

## Directory Structure

```
packages/core/src/codegen/
├── index.ts                    # Main public API (update existing)
└── es2020/
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
- Runtime helper injection
- Public API

### Phase 9: Snapshot Tests
- Fixture files
- Test helpers
- Generate snapshots

### Phase 10: Structural Equality
- $eq helper implementation
- Tracking when needed

### Phase 11: Polish
- Edge cases
- Indentation
- Documentation

## Verification

After implementation:
1. `npm run check` - Type checking
2. `npm run lint` - Linting
3. `npm test` - All tests pass
4. `npm run format` - Code formatting
5. Manual testing with example .vf files
