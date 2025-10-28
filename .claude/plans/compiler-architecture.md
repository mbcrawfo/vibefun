# Vibefun Compiler Architecture

## Overview

The vibefun compiler is a source-to-source transpiler that converts `.vf` files to JavaScript. The compilation pipeline consists of several distinct phases, each with clear inputs and outputs.

**Note:** For the complete language specification including syntax, semantics, and all language features, see [vibefun-spec.md](../../../vibefun-spec.md). This document focuses on the compiler implementation architecture.

## Compilation Pipeline

```
Source Code (.vf)
    ↓
┌─────────────┐
│   LEXER     │ → Tokenization
└─────────────┘
    ↓ (Tokens)
┌─────────────┐
│   PARSER    │ → AST Construction
└─────────────┘
    ↓ (AST)
┌─────────────┐
│  DESUGAR    │ → Syntax Sugar Removal
└─────────────┘
    ↓ (Core AST)
┌─────────────┐
│ TYPE CHECK  │ → Type Inference & Validation
└─────────────┘
    ↓ (Typed AST)
┌─────────────┐
│  OPTIMIZE   │ → Optional Optimizations
└─────────────┘
    ↓ (Optimized AST)
┌─────────────┐
│  CODEGEN    │ → JavaScript Generation
└─────────────┘
    ↓ (JavaScript)
Target Code (.js + .js.map)
```

## Phase 1: Lexer (Tokenization)

### Input
Raw source code as string

### Output
Stream of tokens

### Token Types

```typescript
type Token =
    // Literals
    | { type: 'INT_LITERAL'; value: number; loc: Location }
    | { type: 'FLOAT_LITERAL'; value: number; loc: Location }
    | { type: 'STRING_LITERAL'; value: string; loc: Location }
    | { type: 'BOOL_LITERAL'; value: boolean; loc: Location }

    // Identifiers and Keywords
    | { type: 'IDENTIFIER'; name: string; loc: Location }
    | { type: 'KEYWORD'; keyword: Keyword; loc: Location }

    // Operators
    | { type: 'OPERATOR'; op: Operator; loc: Location }

    // Punctuation
    | { type: 'LPAREN' | 'RPAREN' | 'LBRACE' | 'RBRACE' | 'LBRACKET' | 'RBRACKET'; loc: Location }
    | { type: 'COMMA' | 'DOT' | 'COLON' | 'SEMICOLON'; loc: Location }
    | { type: 'ARROW' | 'FAT_ARROW' | 'PIPE'; loc: Location }

    // Special
    | { type: 'EOF'; loc: Location }
    | { type: 'NEWLINE'; loc: Location }

type Keyword =
    | 'let' | 'mut' | 'type' | 'if' | 'then' | 'else'
    | 'match' | 'when' | 'rec' | 'import' | 'export'
    | 'external' | 'unsafe' | 'from' | 'as' | 'ref'

type Operator =
    // Arithmetic
    | '+' | '-' | '*' | '/' | '%'
    // Comparison
    | '==' | '!=' | '<' | '>' | '<=' | '>='
    // Logical
    | '&&' | '||' | '!'
    // Bitwise
    | '&' | '|' | '~' | '<<' | '>>'
    // String
    | '++'
    // Pipe and composition
    | '|>' | '>>' | '<<'
    // Special
    | '::' | '...' | '->' | '=>' | '=' | ':='

// Note: Some operators like >> and << have multiple meanings based on context
// >> can be right shift (bitwise) or forward composition (functional)
// << can be left shift (bitwise) or backward composition (functional)

type Location = {
    file: string
    line: number
    column: number
    offset: number
}
```

### Lexer Implementation

```typescript
class Lexer {
    private source: string
    private position: number = 0
    private line: number = 1
    private column: number = 1

    constructor(source: string, filename: string) {
        this.source = source
    }

    nextToken(): Token {
        this.skipWhitespaceAndComments()

        if (this.isAtEnd()) {
            return this.makeToken('EOF')
        }

        const char = this.peek()

        // Match literals
        if (this.isDigit(char)) {
            return this.readNumber()
        }

        if (char === '"') {
            return this.readString()
        }

        // Match identifiers and keywords
        if (this.isAlpha(char)) {
            return this.readIdentifierOrKeyword()
        }

        // Match operators and punctuation
        return this.readOperatorOrPunctuation()
    }

    // ... helper methods
}
```

## Phase 2: Parser (AST Construction)

### Input
Token stream

### Output
Abstract Syntax Tree (AST)

### AST Node Types

```typescript
type Expr =
    // Literals
    | { kind: 'IntLit'; value: number; loc: Location }
    | { kind: 'FloatLit'; value: number; loc: Location }
    | { kind: 'StringLit'; value: string; loc: Location }
    | { kind: 'BoolLit'; value: boolean; loc: Location }
    | { kind: 'UnitLit'; loc: Location }

    // Variables and Functions
    | { kind: 'Var'; name: string; loc: Location }
    | { kind: 'Lambda'; params: Pattern[]; body: Expr; loc: Location }
    | { kind: 'App'; func: Expr; args: Expr[]; loc: Location }

    // Let binding
    | { kind: 'Let'; pattern: Pattern; value: Expr; body: Expr; mutable: boolean; loc: Location }

    // Control flow
    | { kind: 'If'; condition: Expr; then: Expr; else: Expr; loc: Location }
    | { kind: 'Match'; expr: Expr; cases: MatchCase[]; loc: Location }

    // Records
    | { kind: 'Record'; fields: Map<string, Expr>; loc: Location }
    | { kind: 'RecordAccess'; record: Expr; field: string; loc: Location }
    | { kind: 'RecordUpdate'; record: Expr; fields: Map<string, Expr>; loc: Location }

    // Variants
    | { kind: 'Variant'; constructor: string; args: Expr[]; loc: Location }

    // Lists
    | { kind: 'List'; elements: Expr[]; loc: Location }

    // Binary operations
    | { kind: 'BinOp'; op: BinaryOp; left: Expr; right: Expr; loc: Location }

    // Unary operations
    | { kind: 'UnaryOp'; op: UnaryOp; expr: Expr; loc: Location }

    // Pipe
    | { kind: 'Pipe'; expr: Expr; func: Expr; loc: Location }

    // Type annotation
    | { kind: 'TypeAnnotation'; expr: Expr; type: TypeExpr; loc: Location }

    // Unsafe block
    | { kind: 'Unsafe'; expr: Expr; loc: Location }

type Pattern =
    | { kind: 'VarPattern'; name: string; loc: Location }
    | { kind: 'WildcardPattern'; loc: Location }
    | { kind: 'LiteralPattern'; value: Literal; loc: Location }
    | { kind: 'ConstructorPattern'; constructor: string; args: Pattern[]; loc: Location }
    | { kind: 'RecordPattern'; fields: Map<string, Pattern>; loc: Location }
    | { kind: 'ListPattern'; elements: Pattern[]; rest?: Pattern; loc: Location }

type MatchCase = {
    pattern: Pattern
    guard?: Expr
    body: Expr
}

type TypeExpr =
    | { kind: 'TypeVar'; name: string; loc: Location }
    | { kind: 'TypeConst'; name: string; loc: Location }
    | { kind: 'TypeApp'; constructor: TypeExpr; args: TypeExpr[]; loc: Location }
    | { kind: 'FunctionType'; params: TypeExpr[]; return: TypeExpr; loc: Location }
    | { kind: 'RecordType'; fields: Map<string, TypeExpr>; loc: Location }
    | { kind: 'UnionType'; types: TypeExpr[]; loc: Location }

type Declaration =
    | { kind: 'LetDecl'; pattern: Pattern; value: Expr; exported: boolean; loc: Location }
    | { kind: 'TypeDecl'; name: string; params: string[]; definition: TypeDefinition; exported: boolean; loc: Location }
    | { kind: 'ExternalDecl'; name: string; type: TypeExpr; from?: string; as?: string; loc: Location }

type TypeDefinition =
    | { kind: 'AliasType'; type: TypeExpr }
    | { kind: 'RecordType'; fields: Map<string, TypeExpr> }
    | { kind: 'VariantType'; constructors: Map<string, TypeExpr[]> }

type Module = {
    imports: ImportDecl[]
    declarations: Declaration[]
}

type ImportDecl = {
    items: string[]  // Named imports, or ['*'] for wildcard
    from: string
    as?: string
}
```

### Parser Implementation

Recursive descent parser with operator precedence:

```typescript
class Parser {
    private tokens: Token[]
    private current: number = 0

    constructor(tokens: Token[]) {
        this.tokens = tokens
    }

    parseModule(): Module {
        const imports: ImportDecl[] = []
        const declarations: Declaration[] = []

        while (!this.isAtEnd()) {
            if (this.match('KEYWORD', 'import')) {
                imports.push(this.parseImport())
            } else {
                declarations.push(this.parseDeclaration())
            }
        }

        return { imports, declarations }
    }

    parseExpression(): Expr {
        return this.parsePipe()
    }

    parsePipe(): Expr {
        let expr = this.parseLogicalOr()

        while (this.match('OPERATOR', '|>')) {
            const func = this.parseLogicalOr()
            expr = { kind: 'Pipe', expr, func, loc: expr.loc }
        }

        return expr
    }

    // Operator precedence climbing
    parseLogicalOr(): Expr { /* ... */ }
    parseLogicalAnd(): Expr { /* ... */ }
    parseEquality(): Expr { /* ... */ }
    parseComparison(): Expr { /* ... */ }
    parseAdditive(): Expr { /* ... */ }
    parseMultiplicative(): Expr { /* ... */ }
    parseUnary(): Expr { /* ... */ }
    parseCall(): Expr { /* ... */ }
    parsePrimary(): Expr { /* ... */ }

    // ... helper methods
}
```

## Phase 3: Desugaring

### Input
Surface AST

### Output
Core AST (simplified)

### Desugaring Transformations

1. **Multi-argument functions → Curried functions**
   ```vibefun
   let add = (x, y) => x + y
   // Desugars to:
   let add = (x) => (y) => x + y
   ```

2. **Pipe operator → Function application**
   ```vibefun
   x |> f |> g
   // Desugars to:
   g(f(x))
   ```

3. **If-then-else → Match**
   ```vibefun
   if condition then a else b
   // Desugars to:
   match condition { | true => a | false => b }
   ```

4. **List syntax → Constructor calls**
   ```vibefun
   [1, 2, 3]
   // Desugars to:
   Cons(1, Cons(2, Cons(3, Nil)))
   ```

5. **Record update → Merge**
   ```vibefun
   { ...record, field: value }
   // Desugars to:
   recordMerge(record, { field: value })
   ```

## Phase 4: Type Checking

### Input
Core AST

### Output
Typed AST with type annotations on every node

### Implementation

See `type-system.md` for detailed type checking rules.

Key steps:
1. Build type environment from declarations
2. Infer types for expressions using Algorithm W
3. Check pattern exhaustiveness
4. Validate external declarations
5. Attach type information to AST nodes

```typescript
type TypedExpr = Expr & { inferredType: Type }

class TypeChecker {
    private env: TypeEnv
    private constraints: Constraint[]

    typeCheck(module: Module): TypedModule {
        // Build initial environment with builtins
        this.env = this.buildInitialEnv()

        // Process declarations
        for (const decl of module.declarations) {
            this.checkDeclaration(decl)
        }

        return this.annotateModule(module)
    }

    inferExpr(expr: Expr, env: TypeEnv): [Type, Constraint[]] {
        // Algorithm W implementation
        // Returns inferred type and constraints
    }

    // ... more methods
}
```

## Phase 5: Optimization (Optional)

### Input
Typed AST

### Output
Optimized AST

### Planned Optimizations

1. **Constant folding**
   ```vibefun
   1 + 2  // → 3
   ```

2. **Dead code elimination**
   ```vibefun
   if true then a else b  // → a
   ```

3. **Inline small functions**
   ```vibefun
   let id = (x) => x
   let y = id(5)  // → let y = 5
   ```

4. **Tail call optimization** (where possible with JavaScript)

## Phase 6: Code Generation

### Input
Optimized typed AST

### Output
JavaScript code + source map

### Code Generation Strategy

1. **Direct transpilation**: Generate readable JavaScript
2. **Runtime library**: Small runtime for type checking and data structures
3. **Source maps**: For debugging

### JavaScript Output Examples

**Vibefun:**
```vibefun
let add = (x, y) => x + y
let result = add(1, 2)
```

**Generated JavaScript:**
```javascript
const add = (x) => (y) => x + y;
const result = add(1)(2);
```

**Vibefun with types:**
```vibefun
type Option<T> = Some(T) | None

let unwrap = (opt) => match opt {
    | Some(x) => x
    | None => panic("unwrap on None")
}
```

**Generated JavaScript:**
```javascript
// Runtime type representation
const Option = {
    Some: (value) => ({ tag: 'Some', value }),
    None: { tag: 'None' }
};

const unwrap = (opt) => {
    switch (opt.tag) {
        case 'Some':
            return opt.value;
        case 'None':
            throw new Error('unwrap on None');
        default:
            throw new Error('Non-exhaustive pattern match');
    }
};
```

### Codegen Implementation

```typescript
class CodeGenerator {
    private output: string[] = []
    private indent: number = 0

    generate(module: TypedModule): string {
        // Generate imports
        for (const imp of module.imports) {
            this.generateImport(imp)
        }

        // Generate declarations
        for (const decl of module.declarations) {
            this.generateDeclaration(decl)
        }

        return this.output.join('\n')
    }

    generateExpr(expr: TypedExpr): void {
        switch (expr.kind) {
            case 'IntLit':
                this.emit(expr.value.toString())
                break
            case 'Lambda':
                this.generateLambda(expr)
                break
            case 'App':
                this.generateApplication(expr)
                break
            case 'Match':
                this.generateMatch(expr)
                break
            // ... other cases
        }
    }

    // ... more methods
}
```

## Runtime Library

### Core Runtime Functions

```typescript
// Type checking (development mode)
function checkType(value: unknown, type: RuntimeType): void {
    if (!matchesType(value, type)) {
        throw new TypeError(`Type mismatch: expected ${typeToString(type)}`)
    }
}

// Variant constructors
function makeVariant(tag: string, ...args: unknown[]): Variant {
    return { tag, args }
}

// Record operations
function recordMerge(r1: Record<string, unknown>, r2: Record<string, unknown>) {
    return { ...r1, ...r2 }
}

// List operations (using persistent data structures)
const List = {
    Cons: (head: unknown, tail: List) => ({ tag: 'Cons', head, tail }),
    Nil: { tag: 'Nil' }
}

// Panic (for runtime errors)
function panic(message: string): never {
    throw new Error(`Panic: ${message}`)
}
```

## Source Maps

Generate source maps for debugging:

```typescript
import { SourceMapGenerator } from 'source-map'

class CodeGenWithSourceMap extends CodeGenerator {
    private sourceMap: SourceMapGenerator

    constructor(filename: string) {
        super()
        this.sourceMap = new SourceMapGenerator({ file: filename })
    }

    emit(code: string, loc?: Location): void {
        if (loc) {
            this.sourceMap.addMapping({
                generated: { line: this.currentLine, column: this.currentColumn },
                original: { line: loc.line, column: loc.column },
                source: loc.file
            })
        }
        super.emit(code)
    }

    getSourceMap(): string {
        return this.sourceMap.toString()
    }
}
```

## Error Reporting

Maintain location information throughout pipeline for good error messages:

```typescript
class CompilerError extends Error {
    constructor(
        message: string,
        public location: Location,
        public help?: string
    ) {
        super(message)
    }

    format(): string {
        const { file, line, column } = this.location
        return `
Error: ${this.message}
  Location: ${file}:${line}:${column}

${this.showSourceContext()}

${this.help ? `Help: ${this.help}` : ''}
        `.trim()
    }

    private showSourceContext(): string {
        // Show source code with error location highlighted
    }
}
```

## Build System Integration

### CLI Tool

```bash
# Compile single file
vibefun compile src/main.vf -o dist/main.js

# Compile with source maps
vibefun compile src/main.vf -o dist/main.js --source-map

# Type check only
vibefun check src/main.vf

# Run directly
vibefun run src/main.vf
```

### Project Configuration

```json
// vibefun.json
{
    "entry": "src/main.vf",
    "output": "dist",
    "sourceMap": true,
    "runtimeTypeChecks": "development",
    "target": "es2020"
}
```

## Future Enhancements

1. **Incremental compilation**: Cache type checking results
2. **Watch mode**: Recompile on file changes
3. **REPL**: Interactive evaluation
4. **Language server**: IDE integration (LSP)
5. **Better optimizations**: More aggressive optimizations
6. **WebAssembly target**: Alternative to JavaScript
7. **Module bundling**: Integrate with bundlers (webpack, esbuild)
