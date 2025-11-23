# Extensibility

This document describes how to extend the Vibefun compiler with new features, optimizations, and capabilities.

## Overview

The compiler is designed for extensibility through:
- **Modular transformations** - Add new desugarings
- **Pluggable passes** - Add new optimizations
- **AST extensions** - Add new language features
- **Utility extensions** - Add new analysis or transformation utilities

## Adding an Optimization Pass

### Step 1: Create Pass File

Create a new file in `packages/core/src/optimizer/passes/`:

```typescript
// my-optimization.ts
import type { CoreExpr } from '../../types/core-ast.js';
import type { OptimizationPass } from '../optimizer.js';

export const myOptimizationPass: OptimizationPass = {
  name: 'my-optimization',

  transform(expr: CoreExpr): CoreExpr {
    // Your optimization logic here
    if (shouldOptimize(expr)) {
      return optimizedVersion(expr);
    }

    // Recurse into children if no optimization at this level
    return transformChildren(expr);
  }
};

function shouldOptimize(expr: CoreExpr): boolean {
  // Check if optimization applies
  return /* condition */;
}

function optimizedVersion(expr: CoreExpr): CoreExpr {
  // Return optimized version
  return /* optimized expr */;
}

function transformChildren(expr: CoreExpr): CoreExpr {
  // Recursively transform children
  // Use transformExpr utility from utils/ast-transform.ts
  return /* expr with transformed children */;
}
```

### Step 2: Add Tests

Create test file `my-optimization.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { myOptimizationPass } from './my-optimization.js';

describe('myOptimizationPass', () => {
  it('should optimize pattern X', () => {
    const input = /* test input */;
    const expected = /* expected output */;
    const result = myOptimizationPass.transform(input);
    expect(result).toEqual(expected);
  });

  it('should not change expressions that do not match', () => {
    const input = /* non-matching input */;
    const result = myOptimizationPass.transform(input);
    expect(result).toEqual(input);
  });

  it('should preserve locations', () => {
    const input = /* test input */;
    const result = myOptimizationPass.transform(input);
    expect(result.loc).toEqual(input.loc);
  });
});
```

### Step 3: Register Pass

Add to `packages/core/src/optimizer/index.ts`:

```typescript
export { myOptimizationPass } from './passes/my-optimization.js';
```

Add to default optimizer in `packages/core/src/optimizer/optimizer.ts`:

```typescript
import { myOptimizationPass } from './passes/my-optimization.js';

const defaultPasses = [
  constantFoldingPass,
  deadCodeEliminationPass,
  betaReductionPass,
  myOptimizationPass,  // Add here
  // ... other passes
];
```

### Step 4: Document the Pass

Add documentation to the pass file:

```typescript
/**
 * My Optimization Pass
 *
 * Optimizes [describe what this optimizes].
 *
 * Transformations:
 * - [pattern 1] → [optimized form 1]
 * - [pattern 2] → [optimized form 2]
 *
 * Examples:
 * ```
 * Input:  [example input]
 * Output: [example output]
 * ```
 */
export const myOptimizationPass: OptimizationPass = {
  // ...
};
```

### Example: Simple Constant Folding

```typescript
// constant-folding-extended.ts
export const extendedConstantFoldingPass: OptimizationPass = {
  name: 'extended-constant-folding',

  transform(expr: CoreExpr): CoreExpr {
    // Fold string concatenation at compile time
    if (expr.type === 'CoreApp' &&
        expr.func.type === 'CoreApp' &&
        expr.func.func.type === 'CoreVar' &&
        expr.func.func.name === 'concat' &&
        expr.func.arg.type === 'CoreString' &&
        expr.arg.type === 'CoreString') {

      return {
        type: 'CoreString',
        value: expr.func.arg.value + expr.arg.value,
        loc: expr.loc
      };
    }

    // Recurse
    return transformExpr(expr, this.transform.bind(this));
  }
};
```

## Adding a Desugaring Transformation

### Step 1: Create Transformation File

Create a new file in `packages/core/src/desugarer/`:

```typescript
// desugarMyFeature.ts
import type { Expr as SurfaceExpr } from '../types/ast.js';
import type { CoreExpr } from '../types/core-ast.js';

/**
 * Desugar [feature name] to core language.
 *
 * Transformation:
 * [surface syntax] → [core syntax]
 */
export function desugarMyFeature(expr: SurfaceExpr): CoreExpr {
  if (expr.type === 'MyFeature') {
    // Transform to core AST
    return {
      type: 'Core...',
      // ... fields
      loc: expr.loc  // Preserve location
    };
  }

  // Recursively process children
  return /* transform children */;
}
```

### Step 2: Add to Desugarer

Add to `packages/core/src/desugarer/desugarer.ts`:

```typescript
import { desugarMyFeature } from './desugarMyFeature.js';

export function desugar(module: Module): CoreModule {
  // Apply transformations in order
  let result = module;
  result = desugarPipe(result);
  result = desugarMyFeature(result);  // Add here
  result = curryLambda(result);
  // ... other transformations
  return result;
}
```

### Step 3: Add Tests

```typescript
// desugarMyFeature.test.ts
describe('desugarMyFeature', () => {
  it('should desugar [feature]', () => {
    const surface = /* surface AST */;
    const core = desugarMyFeature(surface);
    expect(core).toEqual(/* expected core AST */);
  });

  it('should preserve locations', () => {
    const surface = /* surface AST */;
    const core = desugarMyFeature(surface);
    expect(core.loc).toEqual(surface.loc);
  });
});
```

### Transformation Ordering

**Important:** Order matters for desugaring transformations.

**Guidelines:**
1. **Early:** Transformations that simplify surface syntax
2. **Middle:** Feature-specific transformations
3. **Late:** Fundamental transformations (currying, list literals)

**Example ordering:**
```typescript
// 1. Surface syntax simplification
result = desugarPipe(result);           // Early
result = desugarComposition(result);    // Early

// 2. Feature transformations
result = desugarMyFeature(result);      // Middle

// 3. Fundamental transformations
result = curryLambda(result);           // Late
result = desugarListLiteral(result);    // Late
result = desugarBlock(result);          // Late
```

## Adding a New Language Feature

Adding a complete language feature involves multiple steps across the pipeline.

### Step 1: Update Language Specification

Document the feature in `docs/spec/`:

1. Add syntax to appropriate spec file
2. Add semantics description
3. Add examples
4. Update `.agent-map.md`

### Step 2: Add to Lexer (if new syntax)

If the feature requires new keywords or operators:

**Add to `packages/core/src/lexer/lexer.ts`:**

```typescript
const KEYWORDS = new Set([
  // ... existing keywords
  'mynewkeyword',
]);

// Or add new operator
private scanOperator(): Token {
  // ... existing operators
  if (this.match('~>')) {
    return this.makeToken('CUSTOM_ARROW');
  }
}
```

**Add token type to `packages/core/src/types/token.ts`:**

```typescript
export type TokenType =
  | 'IDENTIFIER'
  // ... existing types
  | 'CUSTOM_ARROW'
  | /* ... */;
```

### Step 3: Add to Surface AST

**Add node type to `packages/core/src/types/ast.ts`:**

```typescript
export type Expr =
  | Variable
  | Lambda
  // ... existing types
  | MyNewFeature;

export interface MyNewFeature {
  type: 'MyNewFeature';
  field1: string;
  field2: Expr;
  loc: Location;
}
```

### Step 4: Update Parser

**Add parsing logic to `packages/core/src/parser/parser.ts`:**

```typescript
private parseMyFeature(): Expr {
  const start = this.currentToken.loc;

  this.consume('MYNEWKEYWORD');
  const field1 = this.expect('IDENTIFIER').value;
  this.consume('EQUALS');
  const field2 = this.parseExpr();

  return {
    type: 'MyNewFeature',
    field1,
    field2,
    loc: start
  };
}
```

**Integrate into expression parsing:**

```typescript
private parseExpr(): Expr {
  if (this.check('MYNEWKEYWORD')) {
    return this.parseMyFeature();
  }
  // ... existing parsing logic
}
```

### Step 5: Add Desugaring

Create desugaring transformation as described in "Adding a Desugaring Transformation" above.

### Step 6: Update Type Checker (if needed)

If the feature requires special type checking:

**Add to `packages/core/src/typechecker/typechecker.ts`:**

```typescript
function inferExpr(expr: CoreExpr, env: TypeEnv): [Type, Subst] {
  switch (expr.type) {
    // ... existing cases
    case 'CoreMyFeature':
      return inferMyFeature(expr, env);
  }
}

function inferMyFeature(expr: CoreMyFeature, env: TypeEnv): [Type, Subst] {
  // Type inference logic for the feature
}
```

### Step 7: Add Tests Throughout

**Lexer tests:**
```typescript
it('should tokenize my new feature syntax', () => {
  // ...
});
```

**Parser tests:**
```typescript
it('should parse my new feature', () => {
  // ...
});
```

**Desugarer tests:**
```typescript
it('should desugar my new feature', () => {
  // ...
});
```

**Type checker tests:**
```typescript
it('should infer correct type for my new feature', () => {
  // ...
});
```

**Integration tests:**
```typescript
it('should compile my new feature end-to-end', () => {
  // ...
});
```

### Step 8: Update Documentation

- Update language spec in `docs/spec/`
- Add examples to `examples/`
- Update this extensibility guide if pattern is reusable

## Extending AST Utilities

### Adding an Analysis Function

**Create in `packages/core/src/utils/ast-analysis.ts`:**

```typescript
/**
 * Analyze [aspect] of an expression.
 *
 * @param expr - The expression to analyze
 * @returns [description of return value]
 */
export function analyzeMyAspect(expr: CoreExpr): MyAnalysisResult {
  switch (expr.type) {
    case 'CoreVar':
      return /* analyze variable */;

    case 'CoreLambda':
      return /* analyze lambda */;

    // ... other cases
  }
}
```

**Export from `packages/core/src/utils/index.ts`:**

```typescript
export { analyzeMyAspect } from './ast-analysis.js';
```

**Add tests:**

```typescript
describe('analyzeMyAspect', () => {
  it('should analyze [case 1]', () => {
    const expr = /* test case */;
    const result = analyzeMyAspect(expr);
    expect(result).toEqual(/* expected */);
  });
});
```

### Adding a Transformation Utility

**Create in `packages/core/src/utils/ast-transform.ts`:**

```typescript
/**
 * Transform expression by [description].
 *
 * @param expr - The expression to transform
 * @param config - Configuration for transformation
 * @returns Transformed expression
 */
export function myTransform(
  expr: CoreExpr,
  config: MyTransformConfig
): CoreExpr {
  // Transformation logic
  return /* transformed expr */;
}
```

## Extending Error Types

### Adding a New Error Class

**Create in `packages/core/src/utils/error.ts`:**

```typescript
export class MyPhaseError extends VibefunError {
  constructor(message: string, loc: Location, hint?: string) {
    super(message, loc, hint);
    this.name = 'MyPhaseError';
  }
}
```

**Use in your phase:**

```typescript
throw new MyPhaseError(
  'Clear description of error',
  expr.loc,
  'Helpful suggestion'
);
```

## Extension Patterns

### Pattern 1: Visitor Pattern for AST Traversal

```typescript
interface ExprVisitor<T> {
  visitVar(expr: CoreVar): T;
  visitLambda(expr: CoreLambda): T;
  visitApp(expr: CoreApp): T;
  // ... other visit methods
}

function visitExpr<T>(expr: CoreExpr, visitor: ExprVisitor<T>): T {
  switch (expr.type) {
    case 'CoreVar':
      return visitor.visitVar(expr);
    case 'CoreLambda':
      return visitor.visitLambda(expr);
    case 'CoreApp':
      return visitor.visitApp(expr);
    // ... other cases
  }
}
```

**Usage:**
```typescript
const myVisitor: ExprVisitor<number> = {
  visitVar: () => 1,
  visitLambda: (expr) => 1 + visitExpr(expr.body, myVisitor),
  visitApp: (expr) => visitExpr(expr.func, myVisitor) + visitExpr(expr.arg, myVisitor),
  // ...
};

const result = visitExpr(expr, myVisitor);
```

### Pattern 2: Builder Pattern for AST Construction

```typescript
class CoreExprBuilder {
  variable(name: string, loc: Location): CoreVar {
    return { type: 'CoreVar', name, loc };
  }

  lambda(param: string, body: CoreExpr, loc: Location): CoreLambda {
    return { type: 'CoreLambda', param, body, loc };
  }

  app(func: CoreExpr, arg: CoreExpr, loc: Location): CoreApp {
    return { type: 'CoreApp', func, arg, loc };
  }

  // ... other builders
}

// Usage
const builder = new CoreExprBuilder();
const expr = builder.app(
  builder.lambda('x', builder.variable('x', loc), loc),
  builder.int(42, loc),
  loc
);
```

### Pattern 3: Pipeline Composition for Transformations

```typescript
type Transform = (expr: CoreExpr) => CoreExpr;

function compose(...transforms: Transform[]): Transform {
  return (expr: CoreExpr) =>
    transforms.reduce((e, t) => t(e), expr);
}

// Usage
const myPipeline = compose(
  transform1,
  transform2,
  transform3
);

const result = myPipeline(expr);
```

## Testing Extensions

### Unit Testing

Test each component independently:

```typescript
describe('MyExtension', () => {
  describe('transformation', () => {
    it('should transform case 1', () => { /* ... */ });
    it('should transform case 2', () => { /* ... */ });
    it('should preserve locations', () => { /* ... */ });
  });

  describe('edge cases', () => {
    it('should handle empty input', () => { /* ... */ });
    it('should handle deeply nested structures', () => { /* ... */ });
  });

  describe('error cases', () => {
    it('should throw on invalid input', () => { /* ... */ });
  });
});
```

### Integration Testing

Test the feature end-to-end:

```typescript
describe('MyFeature integration', () => {
  it('should compile my feature correctly', () => {
    const source = 'mynewkeyword x = 42';
    const tokens = new Lexer(source, 'test.vf').tokenize();
    const ast = new Parser(tokens, 'test.vf').parseModule();
    const core = desugar(ast);
    const optimized = optimize(core);

    expect(optimized).toMatchSnapshot();
  });
});
```

## Best Practices for Extensions

### Do:

✅ **Follow existing patterns** - Match the style of similar code
✅ **Write comprehensive tests** - Cover all cases and edge cases
✅ **Preserve locations** - Always include source locations
✅ **Document your extension** - Explain what it does and why
✅ **Use immutable operations** - Create new nodes, don't mutate
✅ **Export from index.ts** - Follow module organization pattern
✅ **Update language spec** - Keep spec in sync with implementation

### Don't:

❌ **Mutate existing structures** - Always create new nodes
❌ **Skip error handling** - Provide helpful error messages
❌ **Forget type safety** - No `any` types
❌ **Break existing tests** - Ensure all tests still pass
❌ **Ignore performance** - Consider complexity of your extension
❌ **Skip documentation** - Document non-obvious decisions

## Checklist for Adding a Feature

- [ ] Update language specification in `docs/spec/`
- [ ] Add lexer changes (keywords, operators) if needed
- [ ] Add Surface AST node type in `types/ast.ts`
- [ ] Add parser logic in `parser/parser.ts`
- [ ] Create desugaring transformation
- [ ] Add to desugarer pipeline
- [ ] Add type checking logic (if needed)
- [ ] Add optimization passes (if applicable)
- [ ] Write unit tests for each phase
- [ ] Write integration tests for end-to-end
- [ ] Update documentation
- [ ] Add examples to `examples/`
- [ ] Run all quality checks (`npm run verify`)

## Examples of Extensions

### Example 1: Range Syntax

**Surface syntax:** `1..10`

**Steps:**
1. Lexer: Add `RANGE` token for `..`
2. Parser: Add `RangeLiteral` AST node
3. Desugarer: Transform to list construction
4. Tests: Cover various ranges

### Example 2: Pipeline Assignment

**Surface syntax:** `x |= f` (equivalent to `x = x |> f`)

**Steps:**
1. Lexer: Add `PIPE_ASSIGN` token for `|=`
2. Parser: Add to assignment parsing
3. Desugarer: Transform to `x = x |> f`
4. Tests: Cover edge cases

### Example 3: Do-Notation (Future)

**Surface syntax:**
```vibefun
do {
  x <- action1
  y <- action2
  return x + y
}
```

**Steps:**
1. Parser: Add `DoExpression` AST node
2. Desugarer: Transform to nested binds
3. Type checker: Ensure correct monad constraints
4. Tests: Comprehensive do-notation tests

## Next Steps

Continue reading:

- **[03-design-patterns.md](./03-design-patterns.md)** - Review architectural patterns
- **[02-compilation-pipeline.md](./02-compilation-pipeline.md)** - Understand how phases connect

**To contribute:**
1. Review existing code in the phase you're extending
2. Follow patterns established in the codebase
3. Ask questions if uncertain

---

**Last Updated:** 2025-11-23
