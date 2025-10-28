# Vibefun Lexer Implementation Plan

## Overview

This document provides a detailed implementation plan for the vibefun lexer - the first phase of the compilation pipeline that transforms source code into a stream of tokens.

## Design Decisions

### 1. Number Literals

**Support:** Decimal, hexadecimal, binary, and scientific notation

**Formats:**
- **Decimal integers**: `42`, `0`, `999999`
- **Decimal floats**: `3.14`, `0.5`, `2.0`
- **Hexadecimal**: `0x1A`, `0xFF`, `0x0` (case-insensitive)
- **Binary**: `0b1010`, `0b11111111`
- **Scientific notation**: `1e10`, `3.14e-2`, `2E+5`

**Parsing Rules:**
- Negative sign (`-`) is a separate operator token
- No underscores for readability (can be added later)
- Floats require digit after decimal point (`3.` is invalid)
- Scientific notation requires digit after `e/E`

### 2. String Literals

**Support:** Both single-line and multi-line strings with full unicode escapes

**Syntax:**
- **Single-line**: `"hello world"` - Cannot contain unescaped newlines
- **Multi-line**: `"""line1\nline2"""` - Can span multiple lines

**Escape Sequences:**
- **Simple**: `\n` (newline), `\t` (tab), `\r` (carriage return), `\"` (quote), `\\` (backslash), `\'` (single quote)
- **Hex bytes**: `\xHH` - 2 hexadecimal digits (e.g., `\x41` = 'A')
- **Unicode short**: `\uXXXX` - 4 hexadecimal digits (e.g., `\u0041` = 'A')
- **Unicode long**: `\u{XXXXXX}` - 1-6 hexadecimal digits (e.g., `\u{1F600}` = '😀')

**Error Handling:**
- Unterminated strings throw LexerError
- Invalid escape sequences throw LexerError with helpful message
- Invalid unicode codepoints (> 0x10FFFF) throw LexerError

### 3. Identifiers

**Support:** Unicode letters in identifiers

**Rules:**
- Start with: Unicode letter or underscore `_`
- Continue with: Unicode letters, digits, or underscore
- Use JavaScript's Unicode character properties (Letter, Mark, Number, Connector)
- Case-sensitive

**Examples:**
- Valid: `x`, `userName`, `_private`, `café`, `myVar2`, `αβγ`
- Invalid: `2abc` (starts with digit), `my-var` (hyphen not allowed)

### 4. Comments

**Single-line**: `// comment text` - Extends to end of line

**Multi-line**: `/* comment text */` - Can nest

**Nested Comments:**
```vibefun
/* outer comment
   /* inner comment */
   still outer
*/
```

**Implementation:** Use depth counter to track nesting level

## Architecture

### File Structure

```
src/
├── types/
│   ├── token.ts         # Token type definitions
│   ├── ast.ts           # Location type
│   └── index.ts         # Re-exports
├── utils/
│   ├── error.ts         # LexerError class
│   └── index.ts
└── lexer/
    ├── lexer.ts         # Main Lexer class
    ├── lexer.test.ts    # Core tests
    ├── numbers.test.ts  # Number parsing tests
    ├── strings.test.ts  # String parsing tests
    ├── identifiers.test.ts
    ├── operators.test.ts
    ├── comments.test.ts
    ├── lexer-integration.test.ts
    └── lexer-errors.test.ts
```

## Implementation Details

### Core Lexer Class

```typescript
export class Lexer {
    private source: string;
    private filename: string;
    private position: number = 0;
    private line: number = 1;
    private column: number = 1;

    constructor(source: string, filename: string) {
        this.source = source;
        this.filename = filename;
    }

    /**
     * Tokenize the entire source code
     */
    tokenize(): Token[] {
        const tokens: Token[] = [];

        while (!this.isAtEnd()) {
            this.skipWhitespaceAndComments();
            if (this.isAtEnd()) break;
            tokens.push(this.nextToken());
        }

        tokens.push(this.makeToken('EOF', ''));
        return tokens;
    }

    private nextToken(): Token {
        const char = this.peek();

        // Determine token type and dispatch
        if (this.isDigit(char)) return this.readNumber();
        if (char === '"') return this.readString();
        if (this.isIdentifierStart(char)) return this.readIdentifier();
        if (char === '\n') return this.readNewline();

        return this.readOperatorOrPunctuation();
    }
}
```

### State Management

**Position Tracking:**
```typescript
private advance(): string {
    if (this.isAtEnd()) return '\0';

    const char = this.source[this.position];
    this.position++;
    this.column++;

    if (char === '\n') {
        this.line++;
        this.column = 1;
    }

    return char;
}

private peek(offset: number = 0): string {
    const pos = this.position + offset;
    if (pos >= this.source.length) return '\0';
    return this.source[pos];
}

private isAtEnd(): boolean {
    return this.position >= this.source.length;
}
```

**Location Creation:**
```typescript
private makeLocation(): Location {
    return {
        file: this.filename,
        line: this.line,
        column: this.column,
        offset: this.position
    };
}

private makeToken(type: TokenType, value: string | number | boolean): Token {
    return {
        type,
        value,
        loc: this.makeLocation()
    };
}
```

### Whitespace & Comment Handling

```typescript
private skipWhitespaceAndComments(): void {
    while (!this.isAtEnd()) {
        const char = this.peek();

        // Skip whitespace (but not newlines - they're significant)
        if (char === ' ' || char === '\t' || char === '\r') {
            this.advance();
            continue;
        }

        // Check for comments
        if (char === '/' && this.peek(1) === '/') {
            this.skipSingleLineComment();
            continue;
        }

        if (char === '/' && this.peek(1) === '*') {
            this.skipMultiLineComment();
            continue;
        }

        break;
    }
}

private skipSingleLineComment(): void {
    // Skip '//'
    this.advance();
    this.advance();

    // Skip until newline or EOF
    while (!this.isAtEnd() && this.peek() !== '\n') {
        this.advance();
    }
}

private skipMultiLineComment(): void {
    // Skip '/*'
    this.advance();
    this.advance();

    let depth = 1;

    while (!this.isAtEnd() && depth > 0) {
        if (this.peek() === '/' && this.peek(1) === '*') {
            this.advance();
            this.advance();
            depth++;
        } else if (this.peek() === '*' && this.peek(1) === '/') {
            this.advance();
            this.advance();
            depth--;
        } else {
            this.advance();
        }
    }

    if (depth > 0) {
        throw new LexerError(
            'Unterminated multi-line comment',
            this.makeLocation(),
            'Add closing */'
        );
    }
}
```

### Number Parsing

```typescript
private readNumber(): Token {
    const start = this.makeLocation();

    // Check for hex or binary prefix
    if (this.peek() === '0' && this.peek(1) === 'x') {
        return this.readHexNumber(start);
    }

    if (this.peek() === '0' && this.peek(1) === 'b') {
        return this.readBinaryNumber(start);
    }

    return this.readDecimalNumber(start);
}

private readDecimalNumber(start: Location): Token {
    let value = '';
    let isFloat = false;

    // Read integer part
    while (this.isDigit(this.peek())) {
        value += this.advance();
    }

    // Check for decimal point
    if (this.peek() === '.' && this.isDigit(this.peek(1))) {
        isFloat = true;
        value += this.advance(); // consume '.'

        while (this.isDigit(this.peek())) {
            value += this.advance();
        }
    }

    // Check for scientific notation
    if (this.peek() === 'e' || this.peek() === 'E') {
        isFloat = true;
        value += this.advance(); // consume 'e'

        if (this.peek() === '+' || this.peek() === '-') {
            value += this.advance();
        }

        if (!this.isDigit(this.peek())) {
            throw new LexerError(
                'Invalid scientific notation: expected digit after exponent',
                this.makeLocation()
            );
        }

        while (this.isDigit(this.peek())) {
            value += this.advance();
        }
    }

    const numValue = isFloat ? parseFloat(value) : parseInt(value, 10);

    return {
        type: isFloat ? 'FLOAT_LITERAL' : 'INT_LITERAL',
        value: numValue,
        loc: start
    };
}

private readHexNumber(start: Location): Token {
    this.advance(); // consume '0'
    this.advance(); // consume 'x'

    let value = '';

    while (this.isHexDigit(this.peek())) {
        value += this.advance();
    }

    if (value.length === 0) {
        throw new LexerError(
            'Invalid hex literal: expected at least one hex digit after 0x',
            this.makeLocation()
        );
    }

    return {
        type: 'INT_LITERAL',
        value: parseInt(value, 16),
        loc: start
    };
}

private readBinaryNumber(start: Location): Token {
    this.advance(); // consume '0'
    this.advance(); // consume 'b'

    let value = '';

    while (this.peek() === '0' || this.peek() === '1') {
        value += this.advance();
    }

    if (value.length === 0) {
        throw new LexerError(
            'Invalid binary literal: expected at least one binary digit after 0b',
            this.makeLocation()
        );
    }

    return {
        type: 'INT_LITERAL',
        value: parseInt(value, 2),
        loc: start
    };
}

private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
}

private isHexDigit(char: string): boolean {
    return this.isDigit(char) ||
           (char >= 'a' && char <= 'f') ||
           (char >= 'A' && char <= 'F');
}
```

### String Parsing

```typescript
private readString(): Token {
    const start = this.makeLocation();

    // Check for multi-line string
    if (this.peek() === '"' && this.peek(1) === '"' && this.peek(2) === '"') {
        return this.readMultiLineString(start);
    }

    return this.readSingleLineString(start);
}

private readSingleLineString(start: Location): Token {
    this.advance(); // consume opening "

    let value = '';

    while (!this.isAtEnd() && this.peek() !== '"') {
        if (this.peek() === '\n') {
            throw new LexerError(
                'Unterminated string: newline in single-line string',
                this.makeLocation(),
                'Use """ for multi-line strings or escape the newline with \\n'
            );
        }

        if (this.peek() === '\\') {
            value += this.readEscapeSequence();
        } else {
            value += this.advance();
        }
    }

    if (this.isAtEnd()) {
        throw new LexerError(
            'Unterminated string: expected closing "',
            this.makeLocation()
        );
    }

    this.advance(); // consume closing "

    return {
        type: 'STRING_LITERAL',
        value,
        loc: start
    };
}

private readMultiLineString(start: Location): Token {
    // Consume opening """
    this.advance();
    this.advance();
    this.advance();

    let value = '';

    while (!this.isAtEnd()) {
        // Check for closing """
        if (this.peek() === '"' && this.peek(1) === '"' && this.peek(2) === '"') {
            this.advance();
            this.advance();
            this.advance();

            return {
                type: 'STRING_LITERAL',
                value,
                loc: start
            };
        }

        if (this.peek() === '\\') {
            value += this.readEscapeSequence();
        } else {
            value += this.advance();
        }
    }

    throw new LexerError(
        'Unterminated multi-line string: expected closing """',
        this.makeLocation()
    );
}

private readEscapeSequence(): string {
    this.advance(); // consume '\'

    const char = this.peek();

    switch (char) {
        case 'n': this.advance(); return '\n';
        case 't': this.advance(); return '\t';
        case 'r': this.advance(); return '\r';
        case '"': this.advance(); return '"';
        case "'": this.advance(); return "'";
        case '\\': this.advance(); return '\\';

        case 'x': return this.readHexEscape();
        case 'u': return this.readUnicodeEscape();

        default:
            throw new LexerError(
                `Invalid escape sequence: \\${char}`,
                this.makeLocation(),
                'Valid escapes: \\n, \\t, \\r, \\", \\\\, \\xHH, \\uXXXX, \\u{XXXXXX}'
            );
    }
}

private readHexEscape(): string {
    this.advance(); // consume 'x'

    let hex = '';
    for (let i = 0; i < 2; i++) {
        if (!this.isHexDigit(this.peek())) {
            throw new LexerError(
                'Invalid \\xHH escape: expected 2 hex digits',
                this.makeLocation()
            );
        }
        hex += this.advance();
    }

    return String.fromCharCode(parseInt(hex, 16));
}

private readUnicodeEscape(): string {
    this.advance(); // consume 'u'

    // Check for long form \u{...}
    if (this.peek() === '{') {
        this.advance(); // consume '{'

        let hex = '';
        while (this.peek() !== '}' && !this.isAtEnd()) {
            if (!this.isHexDigit(this.peek())) {
                throw new LexerError(
                    'Invalid \\u{...} escape: expected hex digits',
                    this.makeLocation()
                );
            }
            hex += this.advance();
        }

        if (this.peek() !== '}') {
            throw new LexerError(
                'Invalid \\u{...} escape: expected closing }',
                this.makeLocation()
            );
        }

        this.advance(); // consume '}'

        if (hex.length === 0 || hex.length > 6) {
            throw new LexerError(
                'Invalid \\u{...} escape: expected 1-6 hex digits',
                this.makeLocation()
            );
        }

        const codePoint = parseInt(hex, 16);

        if (codePoint > 0x10FFFF) {
            throw new LexerError(
                `Invalid unicode codepoint: 0x${hex} (max is 0x10FFFF)`,
                this.makeLocation()
            );
        }

        return String.fromCodePoint(codePoint);
    }

    // Short form \uXXXX
    let hex = '';
    for (let i = 0; i < 4; i++) {
        if (!this.isHexDigit(this.peek())) {
            throw new LexerError(
                'Invalid \\uXXXX escape: expected 4 hex digits',
                this.makeLocation()
            );
        }
        hex += this.advance();
    }

    return String.fromCharCode(parseInt(hex, 16));
}
```

### Identifier Parsing

```typescript
private readIdentifier(): Token {
    const start = this.makeLocation();
    let value = '';

    // Read identifier characters
    while (!this.isAtEnd() && this.isIdentifierContinue(this.peek())) {
        value += this.advance();
    }

    // Check if it's a keyword or boolean literal
    if (isKeyword(value)) {
        return {
            type: 'KEYWORD',
            value,
            keyword: value as Keyword,
            loc: start
        };
    }

    if (isBoolLiteral(value)) {
        return {
            type: 'BOOL_LITERAL',
            value: value === 'true',
            loc: start
        };
    }

    return {
        type: 'IDENTIFIER',
        value,
        loc: start
    };
}

private isIdentifierStart(char: string): boolean {
    if (char === '_') return true;

    // Check if it's a Unicode letter
    // Using Unicode categories: Letter (L)
    return /\p{L}/u.test(char);
}

private isIdentifierContinue(char: string): boolean {
    if (char === '_') return true;
    if (this.isDigit(char)) return true;

    // Unicode letter categories
    return /\p{L}/u.test(char);
}
```

### Operator & Punctuation Parsing

```typescript
private readOperatorOrPunctuation(): Token {
    const start = this.makeLocation();
    const char = this.peek();
    const next = this.peek(1);
    const next2 = this.peek(2);

    // Three-character operators
    if (char === '.' && next === '.' && next2 === '.') {
        this.advance();
        this.advance();
        this.advance();
        return this.makeToken('DOT_DOT_DOT', '...');
    }

    // Two-character operators
    if (char === '=' && next === '=') {
        this.advance(); this.advance();
        return this.makeToken('EQ_EQ', '==');
    }
    if (char === '!' && next === '=') {
        this.advance(); this.advance();
        return this.makeToken('BANG_EQ', '!=');
    }
    if (char === '<' && next === '=') {
        this.advance(); this.advance();
        return this.makeToken('LT_EQ', '<=');
    }
    if (char === '>' && next === '=') {
        this.advance(); this.advance();
        return this.makeToken('GT_EQ', '>=');
    }
    if (char === '+' && next === '+') {
        this.advance(); this.advance();
        return this.makeToken('PLUS_PLUS', '++');
    }
    if (char === '|' && next === '>') {
        this.advance(); this.advance();
        return this.makeToken('PIPE_GT', '|>');
    }
    if (char === '>' && next === '>') {
        this.advance(); this.advance();
        return this.makeToken('GT_GT', '>>');
    }
    if (char === '<' && next === '<') {
        this.advance(); this.advance();
        return this.makeToken('LT_LT', '<<');
    }
    if (char === '-' && next === '>') {
        this.advance(); this.advance();
        return this.makeToken('ARROW', '->');
    }
    if (char === '=' && next === '>') {
        this.advance(); this.advance();
        return this.makeToken('FAT_ARROW', '=>');
    }
    if (char === ':' && next === '=') {
        this.advance(); this.advance();
        return this.makeToken('COLON_EQ', ':=');
    }
    if (char === '&' && next === '&') {
        this.advance(); this.advance();
        return this.makeToken('AMP_AMP', '&&');
    }
    if (char === '|' && next === '|') {
        this.advance(); this.advance();
        return this.makeToken('PIPE_PIPE', '||');
    }

    // Single-character operators and punctuation
    this.advance();

    switch (char) {
        case '+': return { ...this.makeToken('PLUS', '+'), loc: start };
        case '-': return { ...this.makeToken('MINUS', '-'), loc: start };
        case '*': return { ...this.makeToken('STAR', '*'), loc: start };
        case '/': return { ...this.makeToken('SLASH', '/'), loc: start };
        case '%': return { ...this.makeToken('PERCENT', '%'), loc: start };
        case '<': return { ...this.makeToken('LT', '<'), loc: start };
        case '>': return { ...this.makeToken('GT', '>'), loc: start };
        case '=': return { ...this.makeToken('EQ', '='), loc: start };
        case '!': return { ...this.makeToken('BANG', '!'), loc: start };
        case '~': return { ...this.makeToken('TILDE', '~'), loc: start };
        case '(': return { ...this.makeToken('LPAREN', '('), loc: start };
        case ')': return { ...this.makeToken('RPAREN', ')'), loc: start };
        case '{': return { ...this.makeToken('LBRACE', '{'), loc: start };
        case '}': return { ...this.makeToken('RBRACE', '}'), loc: start };
        case '[': return { ...this.makeToken('LBRACKET', '['), loc: start };
        case ']': return { ...this.makeToken('RBRACKET', ']'), loc: start };
        case ',': return { ...this.makeToken('COMMA', ','), loc: start };
        case '.': return { ...this.makeToken('DOT', '.'), loc: start };
        case ':': return { ...this.makeToken('COLON', ':'), loc: start };
        case ';': return { ...this.makeToken('SEMICOLON', ';'), loc: start };
        case '|': return { ...this.makeToken('PIPE', '|'), loc: start };

        default:
            throw new LexerError(
                `Unexpected character: '${char}'`,
                start,
                'This character is not valid in vibefun syntax'
            );
    }
}

private readNewline(): Token {
    const start = this.makeLocation();
    this.advance(); // consume '\n'
    return {
        type: 'NEWLINE',
        value: '\n',
        loc: start
    };
}
```

## Testing Strategy

### Test Coverage Goals

- **100% line coverage**: Every line of code executed
- **100% branch coverage**: Every code path tested
- **All edge cases**: Empty files, EOF, invalid input
- **Error conditions**: Every error path tested
- **Location tracking**: Verify accuracy throughout

### Test Categories

#### 1. Basic Token Tests

Test each token type individually:

```typescript
describe('Lexer - Numbers', () => {
    it('should tokenize integer literal', () => {
        const lexer = new Lexer('42', 'test.vf');
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(2); // INT_LITERAL + EOF
        expect(tokens[0]).toMatchObject({
            type: 'INT_LITERAL',
            value: 42
        });
    });

    it('should tokenize hex literal', () => {
        const lexer = new Lexer('0xFF', 'test.vf');
        const tokens = lexer.tokenize();

        expect(tokens[0]).toMatchObject({
            type: 'INT_LITERAL',
            value: 255
        });
    });

    it('should tokenize binary literal', () => {
        const lexer = new Lexer('0b1010', 'test.vf');
        const tokens = lexer.tokenize();

        expect(tokens[0]).toMatchObject({
            type: 'INT_LITERAL',
            value: 10
        });
    });

    it('should tokenize scientific notation', () => {
        const lexer = new Lexer('1.5e10', 'test.vf');
        const tokens = lexer.tokenize();

        expect(tokens[0]).toMatchObject({
            type: 'FLOAT_LITERAL',
            value: 1.5e10
        });
    });
});
```

#### 2. String Parsing Tests

```typescript
describe('Lexer - Strings', () => {
    it('should parse simple string', () => {
        const lexer = new Lexer('"hello"', 'test.vf');
        const tokens = lexer.tokenize();

        expect(tokens[0]).toMatchObject({
            type: 'STRING_LITERAL',
            value: 'hello'
        });
    });

    it('should parse multi-line string', () => {
        const lexer = new Lexer('"""line1\nline2"""', 'test.vf');
        const tokens = lexer.tokenize();

        expect(tokens[0].value).toBe('line1\nline2');
    });

    it('should handle escape sequences', () => {
        const lexer = new Lexer('"hello\\nworld"', 'test.vf');
        const tokens = lexer.tokenize();

        expect(tokens[0].value).toBe('hello\nworld');
    });

    it('should handle unicode escapes', () => {
        const lexer = new Lexer('"\\u0041\\u{1F600}"', 'test.vf');
        const tokens = lexer.tokenize();

        expect(tokens[0].value).toBe('A😀');
    });

    it('should throw on unterminated string', () => {
        const lexer = new Lexer('"hello', 'test.vf');

        expect(() => lexer.tokenize()).toThrow(LexerError);
    });
});
```

#### 3. Comment Tests

```typescript
describe('Lexer - Comments', () => {
    it('should skip single-line comments', () => {
        const lexer = new Lexer('42 // comment\n100', 'test.vf');
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(4); // 42, NEWLINE, 100, EOF
    });

    it('should skip multi-line comments', () => {
        const lexer = new Lexer('42 /* comment */ 100', 'test.vf');
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(3); // 42, 100, EOF
    });

    it('should handle nested comments', () => {
        const lexer = new Lexer('42 /* outer /* inner */ outer */ 100', 'test.vf');
        const tokens = lexer.tokenize();

        expect(tokens).toHaveLength(3);
    });

    it('should throw on unterminated multi-line comment', () => {
        const lexer = new Lexer('/* comment', 'test.vf');

        expect(() => lexer.tokenize()).toThrow(LexerError);
    });
});
```

#### 4. Integration Tests

```typescript
describe('Lexer - Integration', () => {
    it('should tokenize function definition', () => {
        const code = 'let add = (x, y) => x + y';
        const lexer = new Lexer(code, 'test.vf');
        const tokens = lexer.tokenize();

        expect(tokens.map(t => t.type)).toEqual([
            'KEYWORD',      // let
            'IDENTIFIER',   // add
            'EQ',          // =
            'LPAREN',      // (
            'IDENTIFIER',   // x
            'COMMA',       // ,
            'IDENTIFIER',   // y
            'RPAREN',      // )
            'FAT_ARROW',   // =>
            'IDENTIFIER',   // x
            'PLUS',        // +
            'IDENTIFIER',   // y
            'EOF'
        ]);
    });

    it('should tokenize type definition', () => {
        const code = 'type Option<T> = Some(T) | None';
        const lexer = new Lexer(code, 'test.vf');
        const tokens = lexer.tokenize();

        // Verify complete token sequence
    });

    it('should tokenize pipe expression', () => {
        const code = 'data |> filter(f) |> map(g)';
        const lexer = new Lexer(code, 'test.vf');
        const tokens = lexer.tokenize();

        // Verify pipe operators are recognized
    });
});
```

#### 5. Location Tracking Tests

```typescript
describe('Lexer - Location Tracking', () => {
    it('should track line and column correctly', () => {
        const code = 'let x = 42\nlet y = 100';
        const lexer = new Lexer(code, 'test.vf');
        const tokens = lexer.tokenize();

        expect(tokens[0].loc).toMatchObject({ line: 1, column: 1 }); // let
        expect(tokens[4].loc).toMatchObject({ line: 1, column: 9 }); // 42
        expect(tokens[6].loc).toMatchObject({ line: 2, column: 1 }); // let (second)
    });

    it('should track multi-line strings correctly', () => {
        const code = '"""line1\nline2"""';
        const lexer = new Lexer(code, 'test.vf');
        const tokens = lexer.tokenize();

        expect(tokens[0].loc.line).toBe(1);
    });
});
```

## Implementation Checklist

- [ ] Create `src/types/token.ts` with all token types
- [ ] Create `src/types/ast.ts` with Location type
- [ ] Create `src/utils/error.ts` with LexerError
- [ ] Create `src/lexer/lexer.ts` with main Lexer class
- [ ] Implement character navigation (advance, peek)
- [ ] Implement whitespace skipping
- [ ] Implement single-line comment skipping
- [ ] Implement nested multi-line comment skipping
- [ ] Implement number parsing (decimal, hex, binary, scientific)
- [ ] Implement string parsing (single-line, multi-line)
- [ ] Implement escape sequence handling
- [ ] Implement identifier parsing with unicode support
- [ ] Implement operator/punctuation parsing
- [ ] Implement newline token handling
- [ ] Write comprehensive tests for each component
- [ ] Achieve 100% test coverage
- [ ] Verify all `npm run verify` checks pass
- [ ] Document implementation in CLAUDE.md

## Performance Considerations

1. **String Building**: Use string concatenation for small strings, StringBuilder for large
2. **Unicode Handling**: JavaScript's native regex with `\p{L}` is fast enough
3. **Token Allocation**: Consider object pooling if profiling shows allocation pressure
4. **Lookahead**: Two-character lookahead is sufficient for all operators
5. **Comment Nesting**: Counter-based approach is O(n) with single pass

## Future Optimizations

1. **Token Interning**: Cache common identifiers/keywords
2. **Lazy Tokenization**: Generate tokens on-demand for parser
3. **Parallel Lexing**: For very large files, lex chunks in parallel
4. **Error Recovery**: Continue lexing after errors for better IDE experience
5. **Source Maps**: Generate source maps during lexing

## References

- Language design: `.claude/plans/language-design.md`
- Type system: `.claude/plans/type-system.md`
- Compiler architecture: `.claude/plans/compiler-architecture.md`
- Coding standards: `.claude/CODING_STANDARDS.md`
