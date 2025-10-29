# Vibefun Parser Implementation Plan

## Overview

This document provides a detailed implementation plan for the vibefun parser - the second phase of the compilation pipeline that transforms tokens into an Abstract Syntax Tree (AST).

**Note:** For the complete language specification including all syntax, semantics, and examples, see [vibefun-spec.md](../../vibefun-spec.md). This document focuses on the parser implementation plan and approach.

## Design Decisions

### 1. Parser Architecture

**Choice: Recursive Descent Parser**

**Rationale:**
- **Clarity**: Direct mapping from grammar rules to parsing functions
- **Maintainability**: Easy to understand and modify
- **Error Messages**: Full control over error reporting for better developer experience
- **Flexibility**: Easy to add custom recovery strategies
- **Performance**: Fast enough for our use case (not parsing gigabytes of code)

**Alternative Considered:**
- Parser generators (ANTLR, PEG.js): Less control over error messages, additional tooling dependency

### 2. Operator Precedence

**Choice: Precedence Climbing Algorithm**

**Rationale:**
- **Correctness**: Handles operator precedence and associativity properly
- **Simplicity**: Cleaner than building full precedence tables
- **Extensibility**: Easy to add new operators

**Operator Precedence Table** (highest to lowest):

| Level | Operators | Associativity | Description |
|-------|-----------|---------------|-------------|
| 14 | `.` `()` `[]` | Left | Field access, calls, indexing |
| 13 | `!` `-` (unary) | Right | Logical NOT, negation |
| 12 | `*` `/` `%` | Left | Multiplicative |
| 11 | `+` `-` `&` | Left | Additive, string concatenation |
| 9 | `<` `<=` `>` `>=` | Left | Comparison |
| 8 | `==` `!=` | Left | Equality |
| 5 | `&&` | Left | Logical AND |
| 4 | `||` | Left | Logical OR |
| 3 | `::` | Right | List cons |
| 2 | `|>` | Left | Forward pipe |
| 1 | `:=` | Right | Reference assignment |

### 3. AST Design

**Choice: Discriminated Unions with Location Tracking**

**Rationale:**
- **Type Safety**: TypeScript discriminated unions provide exhaustiveness checking
- **Immutability**: All AST nodes are immutable records
- **Location Info**: Every node carries location for error reporting
- **Pattern Matching**: Easy to pattern match in later compiler phases

**Example:**
```typescript
type Expr =
    | { kind: 'IntLit'; value: number; loc: Location }
    | { kind: 'Var'; name: string; loc: Location }
    | { kind: 'BinOp'; op: BinaryOp; left: Expr; right: Expr; loc: Location }
    // ... more variants
```

### 4. Error Recovery Strategy

**Choice: Synchronization on Statement Boundaries**

**Strategy:**
1. When error occurs, report it with location and helpful message
2. Synchronize by skipping tokens until reaching safe point:
   - Start of next declaration (`let`, `type`, `import`, `export`)
   - Start of next statement (newline or semicolon)
   - Closing braces/parens at appropriate depth
3. Continue parsing to find more errors
4. Track whether any errors occurred

**Rationale:**
- Provides multiple error messages in single parse
- Better IDE experience (see all errors at once)
- Doesn't overwhelm with cascading errors

## AST Node Type Definitions

### Expression Types

```typescript
type Expr =
    // Literals
    | { kind: 'IntLit'; value: number; loc: Location }
    | { kind: 'FloatLit'; value: number; loc: Location }
    | { kind: 'StringLit'; value: string; loc: Location }
    | { kind: 'BoolLit'; value: boolean; loc: Location }
    | { kind: 'UnitLit'; loc: Location }

    // Variables and Bindings
    | { kind: 'Var'; name: string; loc: Location }
    | { kind: 'Let'; pattern: Pattern; value: Expr; body: Expr; mutable: boolean; recursive: boolean; loc: Location }

    // Functions
    | { kind: 'Lambda'; params: Pattern[]; body: Expr; loc: Location }
    | { kind: 'App'; func: Expr; args: Expr[]; loc: Location }

    // Control Flow
    | { kind: 'If'; condition: Expr; then: Expr; else_: Expr; loc: Location }
    | { kind: 'Match'; expr: Expr; cases: MatchCase[]; loc: Location }

    // Records
    | { kind: 'Record'; fields: RecordField[]; loc: Location }
    | { kind: 'RecordAccess'; record: Expr; field: string; loc: Location }
    | { kind: 'RecordUpdate'; record: Expr; updates: RecordField[]; loc: Location }

    // Lists
    | { kind: 'List'; elements: Expr[]; loc: Location }
    | { kind: 'ListCons'; head: Expr; tail: Expr; loc: Location }

    // Operators
    | { kind: 'BinOp'; op: BinaryOp; left: Expr; right: Expr; loc: Location }
    | { kind: 'UnaryOp'; op: UnaryOp; expr: Expr; loc: Location }

    // Pipe
    | { kind: 'Pipe'; expr: Expr; func: Expr; loc: Location }

    // Blocks
    | { kind: 'Block'; exprs: Expr[]; loc: Location }

    // Type Annotation
    | { kind: 'TypeAnnotation'; expr: Expr; typeExpr: TypeExpr; loc: Location }

    // Unsafe
    | { kind: 'Unsafe'; expr: Expr; loc: Location }

type RecordField = {
    name: string;
    value: Expr;
    loc: Location;
}

type MatchCase = {
    pattern: Pattern;
    guard?: Expr;
    body: Expr;
    loc: Location;
}
```

### Pattern Types

```typescript
type Pattern =
    | { kind: 'VarPattern'; name: string; loc: Location }
    | { kind: 'WildcardPattern'; loc: Location }
    | { kind: 'LiteralPattern'; literal: Literal; loc: Location }
    | { kind: 'ConstructorPattern'; constructor: string; args: Pattern[]; loc: Location }
    | { kind: 'RecordPattern'; fields: RecordPatternField[]; loc: Location }
    | { kind: 'ListPattern'; elements: Pattern[]; rest?: Pattern; loc: Location }
    | { kind: 'OrPattern'; patterns: Pattern[]; loc: Location }

type RecordPatternField = {
    name: string;
    pattern: Pattern;
    loc: Location;
}

type Literal = number | string | boolean | null
```

### Type Expression Types

```typescript
type TypeExpr =
    | { kind: 'TypeVar'; name: string; loc: Location }
    | { kind: 'TypeConst'; name: string; loc: Location }
    | { kind: 'TypeApp'; constructor: TypeExpr; args: TypeExpr[]; loc: Location }
    | { kind: 'FunctionType'; params: TypeExpr[]; return_: TypeExpr; loc: Location }
    | { kind: 'RecordType'; fields: RecordTypeField[]; loc: Location }
    | { kind: 'VariantType'; constructors: VariantConstructor[]; loc: Location }
    | { kind: 'UnionType'; types: TypeExpr[]; loc: Location }

type RecordTypeField = {
    name: string;
    typeExpr: TypeExpr;
    loc: Location;
}

type VariantConstructor = {
    name: string;
    args: TypeExpr[];
    loc: Location;
}
```

### Declaration Types

```typescript
type Declaration =
    | { kind: 'LetDecl'; pattern: Pattern; value: Expr; mutable: boolean; recursive: boolean; exported: boolean; loc: Location }
    | { kind: 'TypeDecl'; name: string; params: string[]; definition: TypeDefinition; exported: boolean; loc: Location }
    | { kind: 'ExternalDecl'; name: string; typeExpr: TypeExpr; jsName: string; from?: string; loc: Location }
    | { kind: 'ImportDecl'; items: ImportItem[]; from: string; loc: Location }

type TypeDefinition =
    | { kind: 'AliasType'; typeExpr: TypeExpr; loc: Location }
    | { kind: 'RecordTypeDef'; fields: RecordTypeField[]; loc: Location }
    | { kind: 'VariantTypeDef'; constructors: VariantConstructor[]; loc: Location }

type ImportItem = {
    name: string;
    alias?: string;
    isType: boolean;
}
```

### Module Structure

```typescript
type Module = {
    imports: Declaration[];  // ImportDecl[]
    declarations: Declaration[];
    loc: Location;
}
```

### Binary and Unary Operators

```typescript
type BinaryOp =
    // Arithmetic
    | 'Add' | 'Subtract' | 'Multiply' | 'Divide' | 'Modulo'
    // Comparison
    | 'Equal' | 'NotEqual' | 'LessThan' | 'LessEqual' | 'GreaterThan' | 'GreaterEqual'
    // Logical
    | 'LogicalAnd' | 'LogicalOr'
    // String
    | 'Concat'
    // List
    | 'Cons'
    // Composition
    | 'ForwardCompose' | 'BackwardCompose'
    // Reference
    | 'RefAssign'

type UnaryOp =
    | 'Negate'       // -x
    | 'LogicalNot'   // !x
    | 'Deref'        // !x (in ref context)
```

## Parser Implementation

### Class Structure

```typescript
export class Parser {
    private tokens: Token[];
    private current: number = 0;
    private hadError: boolean = false;
    private filename: string;

    constructor(tokens: Token[], filename: string = '<input>') {
        this.tokens = tokens;
        this.filename = filename;
    }

    /**
     * Parse a complete module
     */
    parse(): Module {
        return this.parseModule();
    }

    // Token consumption methods
    private peek(offset: number = 0): Token;
    private advance(): Token;
    private isAtEnd(): boolean;
    private expect(type: TokenType, message?: string): Token;
    private match(...types: TokenType[]): Token | null;
    private check(type: TokenType): boolean;
    private synchronize(): void;

    // Expression parsing (by precedence level)
    private parseExpression(): Expr;
    private parsePipe(): Expr;
    private parseLogicalOr(): Expr;
    private parseLogicalAnd(): Expr;
    private parseEquality(): Expr;
    private parseComparison(): Expr;
    private parseAdditive(): Expr;
    private parseMultiplicative(): Expr;
    private parseUnary(): Expr;
    private parseCall(): Expr;
    private parsePrimary(): Expr;

    // Specific expression types
    private parseIf(): Expr;
    private parseMatch(): Expr;
    private parseLambda(): Expr;
    private parseRecord(): Expr;
    private parseList(): Expr;
    private parseBlock(): Expr;

    // Pattern parsing
    private parsePattern(): Pattern;
    private parseConstructorPattern(): Pattern;
    private parseRecordPattern(): Pattern;
    private parseListPattern(): Pattern;

    // Type expression parsing
    private parseTypeExpr(): TypeExpr;
    private parseFunctionType(): TypeExpr;
    private parseTypeApplication(): TypeExpr;

    // Declaration parsing
    private parseDeclaration(): Declaration;
    private parseLetDecl(exported: boolean): Declaration;
    private parseTypeDecl(exported: boolean): Declaration;
    private parseExternalDecl(): Declaration;
    private parseImportDecl(): Declaration;

    // Module parsing
    private parseModule(): Module;

    // Error handling
    private error(message: string, loc: Location, help?: string): ParserError;
}
```

### Key Parsing Functions

#### Expression Parsing

```typescript
/**
 * Parse an expression using operator precedence climbing
 */
private parseExpression(): Expr {
    return this.parsePipe();
}

/**
 * Parse pipe expressions (lowest precedence)
 * expr |> func |> func
 */
private parsePipe(): Expr {
    let expr = this.parseLogicalOr();

    while (this.match('PIPE_GT')) {
        const func = this.parseLogicalOr();
        expr = {
            kind: 'Pipe',
            expr,
            func,
            loc: expr.loc
        };
    }

    return expr;
}

/**
 * Parse binary operations with proper precedence
 */
private parseLogicalOr(): Expr {
    let left = this.parseLogicalAnd();

    while (this.match('PIPE_PIPE')) {
        const op = 'LogicalOr' as BinaryOp;
        const right = this.parseLogicalAnd();
        left = {
            kind: 'BinOp',
            op,
            left,
            right,
            loc: left.loc
        };
    }

    return left;
}

// Similar functions for each precedence level...

/**
 * Parse primary expressions (highest precedence)
 */
private parsePrimary(): Expr {
    // Literals
    if (this.check('INT_LITERAL')) {
        const token = this.advance();
        return { kind: 'IntLit', value: token.value as number, loc: token.loc };
    }

    if (this.check('FLOAT_LITERAL')) {
        const token = this.advance();
        return { kind: 'FloatLit', value: token.value as number, loc: token.loc };
    }

    if (this.check('STRING_LITERAL')) {
        const token = this.advance();
        return { kind: 'StringLit', value: token.value as string, loc: token.loc };
    }

    if (this.check('BOOL_LITERAL')) {
        const token = this.advance();
        return { kind: 'BoolLit', value: token.value as boolean, loc: token.loc };
    }

    // Unit literal
    if (this.match('LPAREN') && this.check('RPAREN')) {
        const loc = this.peek(-1).loc;
        this.advance();
        return { kind: 'UnitLit', loc };
    }

    // Variables
    if (this.check('IDENTIFIER')) {
        const token = this.advance();
        return { kind: 'Var', name: token.value as string, loc: token.loc };
    }

    // Grouped expression
    if (this.match('LPAREN')) {
        const expr = this.parseExpression();
        this.expect('RPAREN', 'Expected closing parenthesis');
        return expr;
    }

    // Keywords that start expressions
    if (this.check('KEYWORD')) {
        const keyword = this.peek().value;

        if (keyword === 'if') {
            return this.parseIf();
        }

        if (keyword === 'match') {
            return this.parseMatch();
        }

        if (keyword === 'unsafe') {
            const loc = this.advance().loc;
            this.expect('LBRACE', 'Expected { after unsafe');
            const expr = this.parseBlock();
            return { kind: 'Unsafe', expr, loc };
        }
    }

    // Records
    if (this.check('LBRACE')) {
        return this.parseRecord();
    }

    // Lists
    if (this.check('LBRACKET')) {
        return this.parseList();
    }

    // Lambda
    if (this.match('LPAREN') || (this.check('IDENTIFIER') && this.peek(1).type === 'FAT_ARROW')) {
        return this.parseLambda();
    }

    throw this.error(
        `Unexpected token: ${this.peek().type}`,
        this.peek().loc,
        'Expected an expression'
    );
}
```

#### Pattern Parsing

```typescript
/**
 * Parse a pattern for match expressions or let bindings
 */
private parsePattern(): Pattern {
    // Wildcard
    if (this.check('IDENTIFIER') && this.peek().value === '_') {
        const loc = this.advance().loc;
        return { kind: 'WildcardPattern', loc };
    }

    // Literals
    if (this.check('INT_LITERAL') || this.check('FLOAT_LITERAL') ||
        this.check('STRING_LITERAL') || this.check('BOOL_LITERAL')) {
        const token = this.advance();
        return {
            kind: 'LiteralPattern',
            literal: token.value,
            loc: token.loc
        };
    }

    // Constructor pattern (uppercase identifier)
    if (this.check('IDENTIFIER') && this.isUpperCase(this.peek().value as string)) {
        return this.parseConstructorPattern();
    }

    // Variable pattern
    if (this.check('IDENTIFIER')) {
        const token = this.advance();
        return {
            kind: 'VarPattern',
            name: token.value as string,
            loc: token.loc
        };
    }

    // Record pattern
    if (this.check('LBRACE')) {
        return this.parseRecordPattern();
    }

    // List pattern
    if (this.check('LBRACKET')) {
        return this.parseListPattern();
    }

    throw this.error(
        'Invalid pattern',
        this.peek().loc,
        'Expected a pattern (variable, literal, constructor, record, or list)'
    );
}
```

#### Type Expression Parsing

```typescript
/**
 * Parse a type expression
 */
private parseTypeExpr(): TypeExpr {
    return this.parseFunctionType();
}

/**
 * Parse function types with -> syntax
 * (T1, T2) -> T3
 */
private parseFunctionType(): TypeExpr {
    let typeExpr = this.parseUnionType();

    // Check for function arrow
    if (this.match('ARROW')) {
        const params: TypeExpr[] = [];

        // Left side might be tuple of params
        if (typeExpr.kind === 'TupleType') {
            params.push(...typeExpr.elements);
        } else {
            params.push(typeExpr);
        }

        const return_ = this.parseTypeExpr();

        return {
            kind: 'FunctionType',
            params,
            return_,
            loc: typeExpr.loc
        };
    }

    return typeExpr;
}

/**
 * Parse union types: T1 | T2 | T3
 */
private parseUnionType(): TypeExpr {
    const types: TypeExpr[] = [this.parseTypeApplication()];

    while (this.match('PIPE')) {
        types.push(this.parseTypeApplication());
    }

    if (types.length === 1) {
        return types[0];
    }

    return {
        kind: 'UnionType',
        types,
        loc: types[0].loc
    };
}

/**
 * Parse type applications: List<T>, Option<Int>
 */
private parseTypeApplication(): TypeExpr {
    let typeExpr = this.parsePrimaryType();

    // Generic type application
    if (this.match('LT')) {
        const args: TypeExpr[] = [this.parseTypeExpr()];

        while (this.match('COMMA')) {
            args.push(this.parseTypeExpr());
        }

        this.expect('GT', 'Expected > after type arguments');

        return {
            kind: 'TypeApp',
            constructor: typeExpr,
            args,
            loc: typeExpr.loc
        };
    }

    return typeExpr;
}
```

#### Declaration Parsing

```typescript
/**
 * Parse a top-level declaration
 */
private parseDeclaration(): Declaration {
    // Check for export modifier
    const exported = this.match('KEYWORD', 'export') !== null;

    // Import
    if (this.match('KEYWORD', 'import')) {
        if (exported) {
            throw this.error(
                'Cannot export import declaration',
                this.peek().loc
            );
        }
        return this.parseImportDecl();
    }

    // External
    if (this.match('KEYWORD', 'external')) {
        return this.parseExternalDecl();
    }

    // Type
    if (this.match('KEYWORD', 'type')) {
        return this.parseTypeDecl(exported);
    }

    // Let
    if (this.match('KEYWORD', 'let')) {
        return this.parseLetDecl(exported);
    }

    throw this.error(
        'Expected declaration',
        this.peek().loc,
        'Expected let, type, import, export, or external'
    );
}

/**
 * Parse let declaration
 * let x = value
 * let rec f = ...
 * let mut x = ref(value)
 */
private parseLetDecl(exported: boolean): Declaration {
    const loc = this.peek(-1).loc;

    // Check for recursive
    const recursive = this.match('KEYWORD', 'rec') !== null;

    // Check for mutable
    const mutable = this.match('KEYWORD', 'mut') !== null;

    // Parse pattern
    const pattern = this.parsePattern();

    // Expect =
    this.expect('EQ', 'Expected = after pattern in let declaration');

    // Parse value
    const value = this.parseExpression();

    return {
        kind: 'LetDecl',
        pattern,
        value,
        mutable,
        recursive,
        exported,
        loc
    };
}
```

## Error Handling Strategy

### Error Types

```typescript
export class ParserError extends Error {
    constructor(
        message: string,
        public location: Location,
        public help?: string,
        public notes?: string[]
    ) {
        super(message);
        this.name = 'ParserError';
    }

    format(): string {
        const { file, line, column } = this.location;
        let output = `\nError: ${this.message}\n`;
        output += `  at ${file}:${line}:${column}\n\n`;

        // Show source context with error pointer
        output += this.showSourceContext();

        if (this.help) {
            output += `\nHelp: ${this.help}\n`;
        }

        if (this.notes && this.notes.length > 0) {
            output += '\nNotes:\n';
            this.notes.forEach(note => {
                output += `  - ${note}\n`;
            });
        }

        return output;
    }

    private showSourceContext(): string {
        // Format source code with ^ pointer to error location
        // (Implementation similar to lexer error)
    }
}
```

### Error Messages

Good error messages should:
1. Clearly state what went wrong
2. Show the exact location with source context
3. Provide actionable help text
4. Suggest possible fixes

**Examples:**

```
Error: Expected ) after function arguments
  at example.vf:5:15

5 |   let add = (x, y => x + y
  |                   ^ Expected closing parenthesis

Help: Add ) before =>
```

```
Error: Pattern match not exhaustive
  at example.vf:10:3

10 |   match option {
   |   ^^^^^ This match expression doesn't handle all cases

Missing patterns:
  - None

Help: Add a case for None:
    | None => <default value>
```

### Synchronization

When an error occurs, synchronize to avoid cascading errors:

```typescript
private synchronize(): void {
    this.advance();

    while (!this.isAtEnd()) {
        // Sync on statement boundaries
        if (this.peek(-1).type === 'SEMICOLON' ||
            this.peek(-1).type === 'NEWLINE') {
            return;
        }

        // Sync on declaration keywords
        if (this.check('KEYWORD')) {
            const keyword = this.peek().value;
            if (['let', 'type', 'import', 'export', 'external'].includes(keyword as string)) {
                return;
            }
        }

        this.advance();
    }
}
```

## Testing Strategy

### Test Organization

```
src/parser/
├── parser.ts                      # Main implementation
├── parser.test.ts                 # Core parser tests (token consumption, etc.)
├── expressions.test.ts            # Expression parsing tests
├── patterns.test.ts               # Pattern parsing tests
├── types.test.ts                  # Type expression tests
├── declarations.test.ts           # Declaration tests
├── parser-integration.test.ts     # Complete programs
└── parser-errors.test.ts          # Error handling tests
```

### Test Coverage Goals

- **100% line coverage**: Every line of code executed
- **100% branch coverage**: Every code path tested
- **All AST node types**: Test construction of each node kind
- **Error conditions**: Every error path tested
- **Edge cases**: Empty programs, nested structures, complex expressions

### Test Examples

#### Basic Expression Tests

```typescript
describe('Parser - Expressions', () => {
    it('should parse integer literal', () => {
        const tokens = tokenize('42');
        const parser = new Parser(tokens);
        const module = parser.parse();

        expect(module.declarations).toHaveLength(0);
        // Or with expression-level parser:
        const expr = parser.parseExpression();
        expect(expr).toMatchObject({
            kind: 'IntLit',
            value: 42
        });
    });

    it('should parse binary operation with correct precedence', () => {
        const tokens = tokenize('1 + 2 * 3');
        const parser = new Parser(tokens);
        const expr = parser.parseExpression();

        // Should parse as 1 + (2 * 3), not (1 + 2) * 3
        expect(expr).toMatchObject({
            kind: 'BinOp',
            op: 'Add',
            left: { kind: 'IntLit', value: 1 },
            right: {
                kind: 'BinOp',
                op: 'Multiply',
                left: { kind: 'IntLit', value: 2 },
                right: { kind: 'IntLit', value: 3 }
            }
        });
    });

    it('should parse function call', () => {
        const tokens = tokenize('add(1, 2)');
        const parser = new Parser(tokens);
        const expr = parser.parseExpression();

        expect(expr).toMatchObject({
            kind: 'App',
            func: { kind: 'Var', name: 'add' },
            args: [
                { kind: 'IntLit', value: 1 },
                { kind: 'IntLit', value: 2 }
            ]
        });
    });

    it('should parse pipe expression', () => {
        const tokens = tokenize('x |> f |> g');
        const parser = new Parser(tokens);
        const expr = parser.parseExpression();

        expect(expr).toMatchObject({
            kind: 'Pipe',
            expr: {
                kind: 'Pipe',
                expr: { kind: 'Var', name: 'x' },
                func: { kind: 'Var', name: 'f' }
            },
            func: { kind: 'Var', name: 'g' }
        });
    });
});
```

#### Pattern Tests

```typescript
describe('Parser - Patterns', () => {
    it('should parse variable pattern', () => {
        const pattern = parsePattern('x');
        expect(pattern).toMatchObject({
            kind: 'VarPattern',
            name: 'x'
        });
    });

    it('should parse constructor pattern with args', () => {
        const pattern = parsePattern('Some(x)');
        expect(pattern).toMatchObject({
            kind: 'ConstructorPattern',
            constructor: 'Some',
            args: [
                { kind: 'VarPattern', name: 'x' }
            ]
        });
    });

    it('should parse list pattern with rest', () => {
        const pattern = parsePattern('[x, y, ...rest]');
        expect(pattern).toMatchObject({
            kind: 'ListPattern',
            elements: [
                { kind: 'VarPattern', name: 'x' },
                { kind: 'VarPattern', name: 'y' }
            ],
            rest: { kind: 'VarPattern', name: 'rest' }
        });
    });
});
```

#### Integration Tests

```typescript
describe('Parser - Integration', () => {
    it('should parse function definition', () => {
        const code = 'let add = (x, y) => x + y';
        const tokens = tokenize(code);
        const parser = new Parser(tokens);
        const module = parser.parse();

        expect(module.declarations).toHaveLength(1);
        expect(module.declarations[0]).toMatchObject({
            kind: 'LetDecl',
            pattern: { kind: 'VarPattern', name: 'add' },
            value: {
                kind: 'Lambda',
                params: [
                    { kind: 'VarPattern', name: 'x' },
                    { kind: 'VarPattern', name: 'y' }
                ],
                body: {
                    kind: 'BinOp',
                    op: 'Add',
                    left: { kind: 'Var', name: 'x' },
                    right: { kind: 'Var', name: 'y' }
                }
            }
        });
    });

    it('should parse type definition with variants', () => {
        const code = 'type Option<T> = Some(T) | None';
        const tokens = tokenize(code);
        const parser = new Parser(tokens);
        const module = parser.parse();

        expect(module.declarations[0]).toMatchObject({
            kind: 'TypeDecl',
            name: 'Option',
            params: ['T'],
            definition: {
                kind: 'VariantTypeDef',
                constructors: [
                    {
                        name: 'Some',
                        args: [{ kind: 'TypeVar', name: 'T' }]
                    },
                    {
                        name: 'None',
                        args: []
                    }
                ]
            }
        });
    });

    it('should parse complete program', () => {
        const code = `
            import { List } from "std/list"

            type Option<T> = Some(T) | None

            let map = (list, f) => match list {
                | [] => []
                | [x, ...xs] => [f(x), ...map(xs, f)]
            }

            export let double = (x) => x * 2
        `;

        const tokens = tokenize(code);
        const parser = new Parser(tokens);
        const module = parser.parse();

        expect(module.imports).toHaveLength(1);
        expect(module.declarations).toHaveLength(3);
        expect(module.declarations[2].exported).toBe(true);
    });
});
```

#### Error Tests

```typescript
describe('Parser - Errors', () => {
    it('should throw on unexpected token', () => {
        const code = 'let x = @';
        const tokens = tokenize(code);
        const parser = new Parser(tokens);

        expect(() => parser.parse()).toThrow(ParserError);
    });

    it('should provide helpful error for missing closing paren', () => {
        const code = 'let f = (x, y => x + y';
        const tokens = tokenize(code);
        const parser = new Parser(tokens);

        try {
            parser.parse();
            fail('Should have thrown');
        } catch (error) {
            expect(error).toBeInstanceOf(ParserError);
            expect((error as ParserError).message).toContain('Expected )');
        }
    });

    it('should recover from error and continue parsing', () => {
        const code = `
            let x = @
            let y = 42
        `;
        const tokens = tokenize(code);
        const parser = new Parser(tokens);

        const module = parser.parse();

        // Should have parsed y = 42 despite error in x
        expect(module.declarations).toHaveLength(1);
        expect(parser.hadError).toBe(true);
    });
});
```

## Implementation Phases

### Phase 1: Setup (1 hour)
**Goal**: Create type definitions and basic infrastructure

**Tasks**:
- Extend `src/types/ast.ts` with all AST node types
- Create `src/utils/error.ts` with ParserError class
- Create `src/parser/parser.ts` with Parser class skeleton
- Create all test file scaffolds
- Verify type safety (zero `any` types)

**Deliverables**:
- Complete AST type definitions (~500 lines)
- ParserError class with formatting
- Parser class structure
- Test file scaffolds
- All `npm run verify` checks passing

### Phase 2: Core Parser (1.5 hours)
**Goal**: Implement token stream management and utilities

**Tasks**:
- Implement `peek()`, `advance()`, `isAtEnd()`
- Implement `expect()`, `match()`, `check()`
- Implement error reporting and synchronization
- Test token consumption logic
- Test error handling

**Deliverables**:
- Complete token consumption API
- Error reporting with helpful messages
- `parser.test.ts` with 40+ tests
- Synchronization logic

### Phase 3: Primary Expressions (1 hour)
**Goal**: Parse literals, variables, and parenthesized expressions

**Tasks**:
- Implement `parsePrimary()` for all literal types
- Implement variable parsing
- Implement parenthesized expressions
- Test all primary expression types

**Deliverables**:
- Literal parsing (int, float, string, bool, unit)
- Variable parsing
- Grouping with parentheses
- `expressions.test.ts` started (30+ tests)

### Phase 4: Complex Expressions (3 hours)
**Goal**: Parse all expression types

**Tasks**:
- Implement operator precedence climbing
- Implement function calls
- Implement lambda expressions
- Implement if-then-else
- Implement match expressions
- Implement records (construction, access, update)
- Implement lists
- Implement pipe expressions
- Implement blocks
- Comprehensive expression tests

**Deliverables**:
- All expression types parsed
- Correct operator precedence
- `expressions.test.ts` complete (100+ tests)

### Phase 5: Patterns (1.5 hours)
**Goal**: Parse all pattern types for match and let

**Tasks**:
- Implement `parsePattern()`
- Implement constructor patterns
- Implement record patterns
- Implement list patterns (with rest)
- Implement or patterns
- Test all pattern types

**Deliverables**:
- All pattern types parsed
- Nested pattern support
- `patterns.test.ts` complete (50+ tests)

### Phase 6: Type Expressions (1 hour)
**Goal**: Parse type annotations

**Tasks**:
- Implement `parseTypeExpr()`
- Implement function types
- Implement generic type applications
- Implement record types
- Implement union types
- Test type parsing

**Deliverables**:
- All type expression types parsed
- Generic type parameters
- `types.test.ts` complete (40+ tests)

### Phase 7: Declarations (2 hours)
**Goal**: Parse module-level declarations

**Tasks**:
- Implement `parseDeclaration()`
- Implement let declarations (with mut, rec)
- Implement type declarations (alias, record, variant)
- Implement external declarations
- Implement import/export
- Test all declaration types

**Deliverables**:
- All declaration types parsed
- Module structure complete
- `declarations.test.ts` complete (50+ tests)

### Phase 8: Integration & Documentation (1.5 hours)
**Goal**: Test complete programs and document

**Tasks**:
- Write integration tests for complete programs
- Test error cases and recovery
- Add JSDoc to all public APIs
- Update CLAUDE.md (folders only)
- Performance testing

**Deliverables**:
- `parser-integration.test.ts` (30+ tests)
- `parser-errors.test.ts` (20+ tests)
- Complete JSDoc documentation
- Updated CLAUDE.md
- 300+ total tests passing

## Performance Considerations

1. **Token Array Access**: Use array access instead of queue for better performance
2. **AST Node Allocation**: Accept allocation cost for immutability benefits
3. **Lookahead**: Minimize lookahead distance (max 2 tokens)
4. **String Interning**: Consider for identifiers if profiling shows need
5. **Lazy Evaluation**: Not needed for initial implementation

## Future Enhancements

1. **Better Error Recovery**: More sophisticated synchronization
2. **Error Tolerance**: Continue parsing with synthetic nodes
3. **Incremental Parsing**: For IDE use cases
4. **Syntax Highlighting Info**: Track additional metadata
5. **Automatic Semicolon Insertion**: If beneficial
6. **Prettier-style Formatting**: Preserve whitespace info

## References

- **Language specification**: [vibefun-spec.md](../../vibefun-spec.md)
- **Compiler architecture**: [compiler-architecture.md](./compiler-architecture.md)
- **Type system**: [type-system.md](./type-system.md)
- **Coding standards**: [.claude/CODING_STANDARDS.md](../CODING_STANDARDS.md)
- **Lexer implementation**: Completed with 368 tests
- **Progress tracking**: `.claude/PARSER_PROGRESS.md` (to be created)
