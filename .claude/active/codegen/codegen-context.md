# Code Generator Context

**Last Updated:** 2026-02-01 (Fourth review: external var lookup, null pattern literal, import deduplication)

**Maintenance Note:** Line numbers below are best-effort; re-verify at implementation time.

## Critical Reference Files

| File | Purpose |
|------|---------|
| `packages/core/src/types/core-ast.ts` | Core AST definitions (input to codegen) |
| `packages/core/src/typechecker/typechecker.ts` | TypedModule definition (lines 32-39) |
| `packages/core/src/types/environment.ts` | TypeEnv structure for variant info |
| `packages/core/src/codegen/index.ts` | Current stub implementation |
| `.claude/design/codegen-requirements.md` | Full requirements document |
| `packages/core/src/parser/snapshot-tests/` | Reference for snapshot test pattern |
| `packages/core/src/typechecker/division-lowering.test.ts` | Division operator tests (IntDivide/FloatDivide) |
| `packages/core/src/types/environment.ts` | TypeEnv, ValueBinding (incl. ExternalOverload) |

## Input Contract: TypedModule

```typescript
type TypedModule = {
    module: CoreModule;                    // Desugared AST
    env: TypeEnv;                          // Type environment
    declarationTypes: Map<string, Type>;   // Inferred types for declarations
};

type CoreModule = {
    imports: CoreImportDecl[];
    declarations: CoreDeclaration[];
    loc: Location;
};
```

### TypeEnv Structure (for $eq detection and external handling)

```typescript
type TypeEnv = {
    values: Map<string, ValueBinding>;     // For type lookup
    types: Map<string, TypeBinding>;       // Variant constructor info
};

type ValueBinding =
    | { kind: "Value"; scheme: TypeScheme; loc: Location }
    | { kind: "External"; scheme: TypeScheme; jsName: string; from?: string; loc: Location }
    | { kind: "ExternalOverload"; overloads: ExternalOverload[]; jsName: string; from?: string; loc: Location };
```

**Note:** `ExternalOverload` is used when an external name has multiple type signatures. At codegen time, we only need the `jsName` and `from` fields - type overloading is handled by JavaScript's dynamic dispatch.

## Output Contract: GenerateResult

```typescript
interface GenerateResult {
    readonly code: string;
}
```

## Core AST Types (from core-ast.ts)

### Expressions
- CoreIntLit, CoreFloatLit, CoreStringLit, CoreBoolLit, CoreUnitLit
- CoreVar, CoreLet
- **CoreLetRecExpr** - Mutually recursive let in expression context (distinct from CoreLetRecGroup at declaration level)
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
    | "Divide"      // Pre-lowering (desugarer output) - SHOULD NEVER REACH CODEGEN
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
- Float special values: `Infinity`, `-Infinity`, `NaN`, `-0` (negative zero)
- String escaping: `\n`, `\t`, `\"`, Unicode, line separators (U+2028, U+2029)
- Reserved word escaping: `class` → `class$`
- Operator precedence: proper parenthesization
- RefAssign return: `(a.$value = b, undefined)` in expression context
- NaN equality: `NaN === NaN` is false (IEEE 754)
- Empty modules: emit valid JS with just header and `export {}`
- Deeply nested patterns: ensure correct binding extraction
- Zero-arg variant constructors: emit as object literal, not function
- All type-only imports: emit nothing (no empty import statement)
- Mutual recursion: use `let` declarations for forward references
- CoreLetRecExpr (expression context): emit as IIFE with let declarations
- Unlowered `Divide`: throw internal error (typechecker bug)
- Pattern destructuring exports: extract all bound names from pattern
- CoreVar for externals: use `jsName` from TypeEnv, not vibefun name
- CoreLiteralPattern with `null`: emit as `=== undefined` check
- Import deduplication: type+value → value; track by `(from, name)` tuple

## String Escape Rules

When emitting string literals, apply these escapes:

| Character | Escape Sequence |
|-----------|-----------------|
| `\n` (newline) | `\\n` |
| `\r` (carriage return) | `\\r` |
| `\t` (tab) | `\\t` |
| `\\` (backslash) | `\\\\` |
| `"` (quote) | `\\"` |
| U+2028 (line separator) | `\\u2028` |
| U+2029 (paragraph separator) | `\\u2029` |
| Other control chars (0x00-0x1F) | `\\xNN` |

Note: U+2028 and U+2029 are JavaScript line terminators and MUST be escaped in string literals to avoid syntax errors.

## CoreApp Structure Clarification

The desugarer transforms multi-argument calls into nested single-argument applications:

```
// Source: add(1, 2)
// After desugaring: two nested CoreApp nodes
CoreApp {
    func: CoreApp {
        func: CoreVar { name: "add" },
        args: [CoreIntLit { value: 1 }]
    },
    args: [CoreIntLit { value: 2 }]
}
```

Each `CoreApp.args` array has exactly **one element**. Codegen emits as chained calls: `add(1)(2)`

## CLAUDE.md Template (for es2020/ module)

```markdown
# ES2020 Code Generator Module

This module generates ES2020 JavaScript from typed Core AST.

## Files

- **generator.ts** - Main ES2020Generator class, wires dependencies
- **emit-expressions.ts** - Expression emission functions
- **emit-patterns.ts** - Pattern emission for destructuring and match
- **emit-declarations.ts** - Declaration emission
- **emit-operators.ts** - Operator precedence and parenthesization
- **context.ts** - EmitContext type for tracking emission state
- **reserved-words.ts** - JavaScript reserved word escaping
- **runtime-helpers.ts** - $eq and ref helper generation

## Public API

The module exports a single `generate()` function via `index.ts`:
- `generate(typedModule, options?)` - Generate JavaScript from TypedModule

## Circular Dependencies

Modules use dependency injection to avoid import cycles. Initialization happens in `generator.ts`:

```typescript
Expressions.setEmitPattern(Patterns.emitPattern);
Patterns.setEmitExpr(Expressions.emitExpr);
Declarations.setDependencies({ ... });
```

All emit functions take `EmitContext` as a parameter for state tracking.

## Key Design Decisions

1. **Context-aware emission**: Track statement vs expression mode
2. **Precedence-based parenthesization**: Minimal parens for readability
3. **Conditional helpers**: Only emit ref/$eq when used
4. **IIFE for scoping**: Let expressions in expression context use IIFEs
```

## Test Helper Pattern (for snapshot tests)

```typescript
// snapshot-tests/test-helpers.ts
import type { GenerateResult } from "../../index.js";

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import { Lexer } from "../../../lexer/index.js";
import { Parser } from "../../../parser/index.js";
import { desugar } from "../../../desugarer/index.js";
import { typeCheck } from "../../../typechecker/index.js";
import { generate } from "../../index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Compile a .vf fixture file to JavaScript
 */
export function compileFixture(filename: string): GenerateResult {
    const fixturePath = join(__dirname, filename);
    const source = readFileSync(fixturePath, "utf-8");

    // Full compilation pipeline
    const lexer = new Lexer(source, filename);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, filename);
    const ast = parser.parse();
    const coreModule = desugar(ast);
    const typedModule = typeCheck(coreModule);

    return generate(typedModule, { filename });
}
```

## Execution Test Pattern (for semantic validation)

Uses Node's `vm` module for sandboxed execution (safer than `new Function()`).

```typescript
// tests/execution-test-helpers.ts
import vm from "node:vm";

import { Lexer } from "../../../lexer/index.js";
import { Parser } from "../../../parser/index.js";
import { desugar } from "../../../desugarer/index.js";
import { typeCheck } from "../../../typechecker/index.js";
import { generate } from "../../index.js";

/**
 * Compile vibefun source and execute in a sandboxed VM context.
 * Handles both single expressions and module-level declarations.
 *
 * @param source - Vibefun source code
 * @param resultExpr - Expression to evaluate for the result (default: last declaration name)
 */
export function compileAndRun(source: string, resultExpr?: string): unknown {
    // Compile through full pipeline
    const lexer = new Lexer(source, "test.vf");
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, "test.vf");
    const ast = parser.parse();
    const coreModule = desugar(ast);
    const typedModule = typeCheck(coreModule);
    const { code } = generate(typedModule, { filename: "test.vf" });

    // Strip the export statement for vm execution
    // Generated code ends with `export { name1, name2 };` which isn't valid in vm context
    const executableCode = code.replace(/^export\s*\{[^}]*\}\s*;\s*$/m, "");

    // Execute in sandboxed context
    const context = vm.createContext({
        // Provide minimal globals needed by generated code
        Math,
        Array,
        Object,
        Infinity,
        NaN,
        undefined,
        console, // For debugging
    });

    // Run generated code, then evaluate result expression
    // The generated code defines variables that become accessible in context
    vm.runInContext(executableCode, context);

    // If resultExpr provided, evaluate it; otherwise return undefined
    if (resultExpr) {
        return vm.runInContext(resultExpr, context);
    }
    return undefined;
}

/**
 * Compile and run, expecting a specific named export as result
 */
export function compileAndGetExport(source: string, exportName: string): unknown {
    return compileAndRun(source, exportName);
}
```

```typescript
// tests/execution.test.ts
import { describe, expect, it } from "vitest";
import { compileAndRun, compileAndGetExport } from "./execution-test-helpers.js";

describe("Execution Tests", () => {
    it("should correctly evaluate curried function application", () => {
        const result = compileAndGetExport(`
            let add = (x, y) => x + y;
            let add5 = add(5);
            let result = add5(3);
        `, "result");
        expect(result).toBe(8);
    });

    it("should handle NaN equality correctly", () => {
        const result = compileAndGetExport(`
            let x = 0.0 / 0.0;
            let result = x == x;
        `, "result");
        expect(result).toBe(false); // IEEE 754 semantics
    });

    it("should truncate integer division toward zero", () => {
        const result = compileAndGetExport(`
            let result = (-7) / 2;
        `, "result");
        expect(result).toBe(-3); // Not -4 (floor)
    });

    it("should handle structural equality for records", () => {
        const result = compileAndGetExport(`
            let a = { x: 1, y: 2 };
            let b = { x: 1, y: 2 };
            let result = a == b;
        `, "result");
        expect(result).toBe(true);
    });
});
```
