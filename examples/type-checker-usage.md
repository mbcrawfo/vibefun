# Type Checker Usage Examples

This document provides examples of how to use the Vibefun type checker as a library.

## Basic Usage

```typescript
import { typeCheck } from '@vibefun/core/typechecker';
import { parse } from '@vibefun/core/parser';
import { desugar } from '@vibefun/core/desugarer';

// Parse, desugar, and type check a program
const source = `
let identity = (x) => x

let main = () => {
    let result = identity(42)
    result
}
`;

try {
    // Parse the source code
    const ast = parse(source, 'example.vf');

    // Desugar to Core AST
    const coreModule = desugar(ast);

    // Type check the module
    const typedModule = typeCheck(coreModule);

    // Access inferred types
    const identityType = typedModule.declarationTypes.get('identity');
    console.log(`identity has type: ${identityType}`);
    // Output: identity has type: ('a) -> 'a

    const mainType = typedModule.declarationTypes.get('main');
    console.log(`main has type: ${mainType}`);
    // Output: main has type: () -> Int

} catch (error) {
    if (error instanceof TypeCheckerError) {
        console.error(error.format());
    } else {
        throw error;
    }
}
```

## Handling Type Errors

```typescript
import { typeCheck, TypeCheckerError } from '@vibefun/core/typechecker';

const badSource = `
let add = (x, y) => x + y

let main = () => {
    add(42, "hello")  // Type error: cannot add Int and String
}
`;

try {
    const ast = parse(badSource, 'error-example.vf');
    const coreModule = desugar(ast);
    const typedModule = typeCheck(coreModule);
} catch (error) {
    if (error instanceof TypeCheckerError) {
        // Format and display the error
        console.error(error.format());
        // Output:
        // Type error at error-example.vf:5:5
        //   Type mismatch: expected Int, got String
        //   Hint: Consider adding a type annotation

        // Access error properties
        console.log(`Error at line ${error.loc.line}, column ${error.loc.column}`);
        console.log(`Message: ${error.message}`);
        if (error.hint) {
            console.log(`Hint: ${error.hint}`);
        }
    }
}
```

## Working with Polymorphic Functions

```typescript
const polymorphicSource = `
let map = (f, list) => match list {
    | Nil => Nil
    | Cons(head, tail) => Cons(f(head), map(f, tail))
}

let double = (x) => x * 2

let main = () => {
    let numbers = Cons(1, Cons(2, Cons(3, Nil)))
    let doubled = map(double, numbers)
    doubled
}
`;

const ast = parse(polymorphicSource, 'poly-example.vf');
const coreModule = desugar(ast);
const typedModule = typeCheck(coreModule);

// Check inferred types
const mapType = typedModule.declarationTypes.get('map');
console.log(`map has type: ${mapType}`);
// Output: map has type: forall 'a 'b. (('a) -> 'b, List<'a>) -> List<'b>

const mainType = typedModule.declarationTypes.get('main');
console.log(`main has type: ${mainType}`);
// Output: main has type: () -> List<Int>
```

## Checking for Non-Exhaustive Patterns

```typescript
import { createNonExhaustiveError } from '@vibefun/core/typechecker';

const nonExhaustiveSource = `
let unwrap = (option) => match option {
    | Some(x) => x
    // Missing: | None => ...
}
`;

try {
    const ast = parse(nonExhaustiveSource, 'pattern-example.vf');
    const coreModule = desugar(ast);
    const typedModule = typeCheck(coreModule);
} catch (error) {
    if (error instanceof TypeCheckerError) {
        console.error(error.format());
        // Output:
        // Type error at pattern-example.vf:2:15
        //   Non-exhaustive pattern match. Missing cases: None
        //   Hint: Consider adding a wildcard pattern (_) to handle all remaining cases
    }
}
```

## Using the Type Environment

```typescript
const source = `
type Point = { x: Int, y: Int }

let distance = (p: Point) => {
    let dx = p.x * p.x
    let dy = p.y * p.y
    dx + dy
}
`;

const ast = parse(source, 'env-example.vf');
const coreModule = desugar(ast);
const typedModule = typeCheck(coreModule);

// Access the type environment
const env = typedModule.env;

// Look up type definitions
const pointTypeDef = env.types.get('Point');
console.log(`Point type: ${pointTypeDef}`);

// Look up value bindings
const distanceBinding = env.values.get('distance');
if (distanceBinding && distanceBinding.kind === 'Value') {
    const scheme = distanceBinding.scheme;
    console.log(`distance has type scheme: ${typeSchemeToString(scheme)}`);
    // Output: distance has type scheme: (Point) -> Int
}

// Access built-in types and functions
const listMapBinding = env.values.get('List.map');
if (listMapBinding && listMapBinding.kind === 'Value') {
    const scheme = listMapBinding.scheme;
    console.log(`List.map: ${typeSchemeToString(scheme)}`);
    // Output: List.map: forall 'a 'b. (('a) -> 'b, List<'a>) -> List<'b>
}
```

## Formatting Types

```typescript
import { typeToString } from '@vibefun/core/typechecker';

// Format various types
const intType = { type: 'Const', name: 'Int' };
console.log(typeToString(intType));
// Output: Int

const functionType = {
    type: 'Fun',
    params: [{ type: 'Const', name: 'Int' }],
    return: { type: 'Const', name: 'String' }
};
console.log(typeToString(functionType));
// Output: (Int) -> String

const listType = {
    type: 'App',
    constructor: { type: 'Const', name: 'List' },
    args: [{ type: 'Const', name: 'Int' }]
};
console.log(typeToString(listType));
// Output: List<Int>

const recordType = {
    type: 'Record',
    fields: new Map([
        ['name', { type: 'Const', name: 'String' }],
        ['age', { type: 'Const', name: 'Int' }]
    ])
};
console.log(typeToString(recordType));
// Output: { name: String, age: Int }
```

## Integration with Other Compiler Phases

```typescript
import { Lexer } from '@vibefun/core/lexer';
import { Parser } from '@vibefun/core/parser';
import { desugar } from '@vibefun/core/desugarer';
import { typeCheck } from '@vibefun/core/typechecker';

// Full compiler pipeline
function compileSource(source: string, filename: string) {
    // 1. Lexical analysis
    const lexer = new Lexer(source, filename);
    const tokens = lexer.tokenize();

    // 2. Parsing
    const parser = new Parser(tokens, filename);
    const ast = parser.parseModule();

    // 3. Desugaring
    const coreModule = desugar(ast);

    // 4. Type checking
    const typedModule = typeCheck(coreModule);

    // 5. Further compilation steps (code generation, optimization, etc.)
    // ...

    return typedModule;
}

// Use the pipeline
try {
    const typedModule = compileSource(source, 'my-program.vf');
    console.log('Type checking succeeded!');
    console.log(`Found ${typedModule.declarationTypes.size} top-level declarations`);
} catch (error) {
    console.error('Compilation failed:', error);
}
```

## Error Recovery

The type checker currently stops at the first error encountered. Future versions may support multiple error collection for better developer experience.

```typescript
// Current behavior: stops at first error
try {
    const typedModule = typeCheck(coreModule);
} catch (error) {
    // Only the first error is reported
    console.error(error.format());
}

// Future: collect multiple errors (not yet implemented)
// const result = typeCheckWithErrors(coreModule);
// if (!result.success) {
//     for (const error of result.errors) {
//         console.error(error.format());
//     }
// }
```

## Advanced: Custom Type Checking

For advanced use cases, you can use the lower-level inference API:

```typescript
import { createContext, inferExpr } from '@vibefun/core/typechecker/infer';
import { buildEnvironment } from '@vibefun/core/typechecker/environment';

// Build a type environment
const env = buildEnvironment(coreModule);

// Create an inference context
const ctx = createContext(env);

// Type check individual expressions
const expr = /* some CoreExpr */;
const result = inferExpr(ctx, expr);

console.log(`Expression has type: ${typeToString(result.type)}`);
console.log(`Substitution: ${result.subst}`);
```

## Testing Type Checking

Example test using Vitest:

```typescript
import { describe, it, expect } from 'vitest';
import { parse } from '@vibefun/core/parser';
import { desugar } from '@vibefun/core/desugarer';
import { typeCheck, TypeCheckerError } from '@vibefun/core/typechecker';

describe('Type Checker', () => {
    it('should infer identity function as polymorphic', () => {
        const source = 'let id = (x) => x';
        const ast = parse(source, 'test.vf');
        const coreModule = desugar(ast);
        const typedModule = typeCheck(coreModule);

        const idType = typedModule.declarationTypes.get('id');
        expect(idType).toBeDefined();
        // Check that it's polymorphic (would need type inspection utilities)
    });

    it('should reject type mismatch', () => {
        const source = 'let x: Int = "hello"';
        const ast = parse(source, 'test.vf');
        const coreModule = desugar(ast);

        expect(() => typeCheck(coreModule)).toThrow(TypeCheckerError);
    });
});
```

## Best Practices

1. **Always catch TypeCheckerError**: Type checking can fail, so always wrap typeCheck() in a try-catch block.

2. **Use the full pipeline**: Don't skip parsing or desugaring - the type checker expects Core AST input.

3. **Leverage type environment**: The returned TypeEnv contains valuable information about types and bindings.

4. **Format errors for users**: Use the `format()` method on TypeCheckerError for user-friendly error messages.

5. **Trust the type checker**: If type checking succeeds, the program is type-safe according to Hindley-Milner rules.

## Known Limitations

- **Module imports**: Import declarations are trusted but not verified. Future versions will load and verify imported modules.
- **Literal types**: Not supported - use variants instead of string literals for enums.
- **Primitive union narrowing**: Cannot discriminate `Int | String` - use variant wrappers.
- **Error collection**: Only reports first error - future versions will collect multiple errors.

## See Also

- [Vibefun Language Specification](../docs/spec/README.md)
- [Type System Specification](../docs/spec/03-type-system/)
- [Type Inference Details](../docs/spec/03-type-system/type-inference.md)
