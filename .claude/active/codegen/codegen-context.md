# Code Generator Context

## Critical Reference Files

| File | Purpose |
|------|---------|
| `packages/core/src/types/core-ast.ts` | Core AST definitions (input to codegen) |
| `packages/core/src/typechecker/typechecker.ts` | TypedModule definition (lines 32-39) |
| `packages/core/src/types/environment.ts` | TypeEnv structure for variant info |
| `packages/core/src/codegen/index.ts` | Current stub implementation |
| `.claude/design/codegen-requirements.md` | Full requirements document |

## Input Contract: TypedModule

```typescript
type TypedModule = {
    module: CoreModule;                    // Desugared AST
    env: TypeEnv;                          // Type environment
    declarationTypes: Map<string, Type>;   // Inferred types
};

type CoreModule = {
    imports: CoreImportDecl[];
    declarations: CoreDeclaration[];
    loc: Location;
};
```

## Output Contract: GenerateResult

```typescript
interface GenerateResult {
    readonly code: string;
}
```

## Core AST Types (from core-ast.ts)

### Expressions
- CoreIntLit, CoreFloatLit, CoreStringLit, CoreBoolLit, CoreUnitLit
- CoreVar, CoreLet, CoreLetRecExpr
- CoreLambda, CoreApp
- CoreMatch (with CoreMatchCase)
- CoreRecord, CoreRecordAccess, CoreRecordUpdate
- CoreVariant
- CoreBinOp, CoreUnaryOp
- CoreTypeAnnotation, CoreUnsafe
- CoreTuple

### Patterns
- CoreWildcardPattern, CoreVarPattern
- CoreLiteralPattern (number | string | boolean | null)
- CoreVariantPattern, CoreRecordPattern, CoreTuplePattern

### Declarations
- CoreLetDecl, CoreLetRecGroup
- CoreTypeDecl (with CoreTypeDefinition)
- CoreExternalDecl, CoreExternalTypeDecl
- CoreImportDecl

## Binary Operators (CoreBinaryOp)

```typescript
type CoreBinaryOp =
    | "Add" | "Subtract" | "Multiply"
    | "Divide"      // Pre-lowering (desugarer output)
    | "IntDivide"   // Post-lowering (Math.trunc)
    | "FloatDivide" // Post-lowering (IEEE 754)
    | "Modulo"
    | "Equal" | "NotEqual"
    | "LessThan" | "LessEqual" | "GreaterThan" | "GreaterEqual"
    | "LogicalAnd" | "LogicalOr"
    | "Concat" | "RefAssign";
```

## Parser Structure Reference

The parser uses dependency injection to break circular dependencies:

```
packages/core/src/parser/
├── parser.ts              # Main class, wires dependencies
├── parser-base.ts         # State management
├── parse-expressions.ts   # Aggregator, initializes sub-modules
├── parse-expression-*.ts  # Expression parsing split across files
├── parse-patterns.ts
├── parse-types.ts
├── parse-declarations.ts
└── index.ts               # Public exports
```

Key pattern from `parse-expressions.ts`:
```typescript
let parsePattern: (parser: ParserBase) => Pattern = () => {
    throw new Error("not initialized");
};

export function setParsePattern(fn: typeof parsePattern): void {
    parsePattern = fn;
}
```

## Parser Snapshot Test Reference

```
packages/core/src/parser/snapshot-tests/
├── test-helpers.ts        # parseFixture() function
├── *.vf                   # Fixture files
├── *.test.ts              # One test per fixture
└── __snapshots__/         # Generated snapshots
```

Test pattern:
```typescript
import { describe, expect, it } from "vitest";
import { parseFixture } from "./test-helpers.js";

describe("Parser Snapshot - Declarations", () => {
    it("should parse declarations.vf", () => {
        const ast = parseFixture("declarations.vf");
        expect(ast).toMatchSnapshot();
    });
});
```

## JavaScript Target: ES2020

Allowed features:
- `const` and `let`
- Arrow functions
- Destructuring
- Spread operator
- Template literals
- ES6 modules

## Runtime Helpers

### ref() helper
```javascript
const ref = ($value) => ({ $value });
```

### $eq() helper (structural equality)
```javascript
const $eq = (a, b) => {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== "object") return false;

    // Ref: identity only
    if ("$value" in a && "$value" in b) return a === b;

    // Variant: compare $tag and $N fields
    if ("$tag" in a) {
        if (!("$tag" in b) || a.$tag !== b.$tag) return false;
        for (let i = 0; `$${i}` in a; i++) {
            if (!$eq(a[`$${i}`], b[`$${i}`])) return false;
        }
        return true;
    }

    // Tuple (array)
    if (Array.isArray(a)) {
        if (!Array.isArray(b) || a.length !== b.length) return false;
        return a.every((v, i) => $eq(v, b[i]));
    }

    // Record
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(k => k in b && $eq(a[k], b[k]));
};
```

## Key Design Decisions

1. **Currying**: All functions single-param, multi-arg calls are `f(a)(b)(c)`
2. **Variants**: Tagged objects `{ $tag: "Name", $0: arg }`
3. **Tuples**: JavaScript arrays
4. **Records**: Plain objects
5. **Refs**: `{ $value: ... }` objects
6. **Unit**: `undefined`
7. **Exports**: Collected at end of file
8. **IntDivide**: `Math.trunc(a / b)` (truncate toward zero)
9. **Reserved words**: Escape with `$` suffix

## Edge Cases to Handle

- Negative literals: wrap in parens `(-5)`
- Float special values: `Infinity`, `NaN`
- String escaping: `\n`, `\t`, `\"`, Unicode
- Reserved word escaping: `class` → `class$`
- Operator precedence: proper parenthesization
- RefAssign return: `(a.$value = b, undefined)` in expression context
- NaN equality: `NaN === NaN` is false (IEEE 754)
