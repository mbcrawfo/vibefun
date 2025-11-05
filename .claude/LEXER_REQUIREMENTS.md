# Vibefun Lexer Requirements

This document provides a comprehensive specification of all lexical requirements for implementing a lexer for the vibefun programming language. This is derived from a complete review of the vibefun language specification.

## 1. Source File Structure

### File Properties
- **Extension**: `.vf`
- **Encoding**: UTF-8
- **Line Endings**: LF (`\n`) or CRLF (`\r\n`)
- **Unicode Normalization**: NFC (Canonical Decomposition + Composition)

## 2. Keywords

### Active Keywords (17)
These keywords are reserved and cannot be used as identifiers:

```
let       mut       type      if
then      else      match     when
rec       and       import    export
external  unsafe    from      as
ref
```

### Reserved for Future Use (8)
These keywords are reserved for potential future language features and cannot be used as identifiers:

```
async     await     trait     impl
where     do        yield     return
```

**Lexer Requirement**: Reserved keywords should produce clear error messages indicating they are reserved for future use.

## 3. Identifiers

### Pattern
- **Regex**: `[a-zA-Z_\p{L}][a-zA-Z0-9_\p{L}]*`
- **Start**: Unicode letter (`\p{L}`) or underscore (`_`)
- **Continue**: Letters, digits, underscores
- **Unicode Support**: Full Unicode letter support with NFC normalization

### Naming Conventions
(Not enforced by lexer, but documented for reference):
- Variables/functions: `camelCase`
- Types/constructors: `PascalCase`

### Examples
```vibefun
x
userName
_private
café
αβγ
変数
```

### Lexer Requirements
- Apply NFC normalization to all identifiers
- Identifiers that appear visually identical but have different Unicode representations should normalize to the same identifier
- Check against keyword list after normalization

## 4. Literals

### 4.1 Boolean Literals

```vibefun
true
false
```

**Token Type**: `BOOL_LITERAL`
**Value**: `true` or `false` (boolean)

### 4.2 Integer Literals

#### Decimal Integers
- **Pattern**: `[0-9][0-9_]*`
- **Leading zeros allowed**: `0123` is decimal 123 (NOT octal like JavaScript)
- **Examples**: `42`, `0`, `0123`, `1_000_000`

#### Hexadecimal Integers
- **Pattern**: `0x[0-9a-fA-F][0-9a-fA-F_]*`
- **Case insensitive**: `0xFF`, `0xff`, `0Xff` all valid
- **Example**: `0xFF` (255)

#### Binary Integers
- **Pattern**: `0b[01][01_]*`
- **Example**: `0b1010` (10)

#### Underscore Separators
- **Allowed**: Between digits for readability: `1_000_000`
- **Not allowed**:
  - Trailing: `123_`
  - Consecutive: `1__000`
  - Leading in numeric part (but `_123` is an identifier)

#### Validation
- **Maximum safe integer**: `9007199254740991` (2^53 - 1)
- Values outside this range lose precision at runtime (not a lexer error)
- All digits in hex/binary must be valid for their base

**Token Type**: `INT_LITERAL`
**Value**: Numeric value (number or bigint)

### 4.3 Float Literals

#### Syntax Options
1. **Decimal point**: `3.14`, `0.5`, `123.456`
2. **Scientific notation**: `1e10`, `3.14e-2`, `1e+5`
3. **Both**: `3.14e-2`

#### Pattern
```
[0-9][0-9_]*\.[0-9][0-9_]*([eE][+-]?[0-9]+)?
[0-9][0-9_]*[eE][+-]?[0-9]+
```

#### Requirements
- Must have decimal point OR exponent to be a float
- Exponent must be integer (no `3.14e2.5`)
- Scientific notation components:
  - Base: decimal number (can have underscores)
  - Exponent marker: `e` or `E`
  - Sign: optional `+` or `-`
  - Exponent value: integer

#### Special Runtime Values
- `Infinity`, `-Infinity`, `NaN` (runtime, not lexer tokens)

#### Validation Errors
- Multiple decimal points: `1.2.3`
- Missing exponent: `1e`, `1e+`
- Non-integer exponent: `3.14e2.5`
- Trailing underscore: `3.14_`
- Consecutive underscores: `3.1__4`

**Token Type**: `FLOAT_LITERAL`
**Value**: Numeric value (number)

### 4.4 String Literals

#### Single-Line Strings
```vibefun
"hello"
"hello, world!"
```

#### Multi-Line Strings
```vibefun
"""
This is a multi-line string.
It can span multiple lines.
"""
```

#### Escape Sequences
The lexer must recognize and process these escape sequences:

| Escape | Meaning | Example |
|--------|---------|---------|
| `\\` | Backslash | `"\\"` → `\` |
| `\"` | Double quote | `"\""` → `"` |
| `\'` | Single quote | `"\'"` → `'` |
| `\n` | Newline (LF) | `"\n"` → newline |
| `\r` | Carriage return | `"\r"` → CR |
| `\t` | Tab | `"\t"` → tab |
| `\xHH` | Hex (2 digits) | `"\x41"` → `A` |
| `\uXXXX` | Unicode (4 hex digits) | `"\u03B1"` → `α` |
| `\u{X...}` | Long Unicode (1-6 hex) | `"\u{1F600}"` → `😀` |

#### Validation
- **Unterminated strings**: Error at EOF or newline (for single-line strings)
- **Unknown escape sequences**: Error (e.g., `\q`)
- **Incomplete escapes**: Error (e.g., `\x4`, `\u03`, `\u{12`)
- **Unicode range**: Max code point `0x10FFFF`
- **Newlines in single-line strings**: Must use `"""` for multi-line

#### Error Examples
```vibefun
// ❌ Errors
"hello\q"       // Unknown escape sequence
"\x4"           // Hex escape needs 2 digits
"\u03"          // Unicode \uXXXX needs 4 hex digits
"\u{12"         // Unterminated unicode escape
"\u{110000}"    // Unicode out of range
"unterminated   // Unterminated string

// Single-line string with newline (not allowed)
"line 1
line 2"         // Error: use """ for multi-line

// ✅ Valid
"\x41"          // 'A'
"\u03B1"        // 'α'
"\u{1F600}"     // '😀'
"""multi
line"""         // Multi-line string
```

**Token Type**: `STRING_LITERAL`
**Value**: String with all escape sequences processed

### 4.5 Unit Literal

```vibefun
()  // The unit value
```

**Token Type**: `UNIT_LITERAL` or tokenize as `LPAREN` + `RPAREN`
**Value**: Unit/void

## 5. Operators

### 5.1 Arithmetic Operators
```
+     Addition (binary)
-     Subtraction (binary) / Negation (unary)
*     Multiplication
/     Division
%     Modulo
```

### 5.2 Comparison Operators
```
==    Equal
!=    Not equal
<     Less than
<=    Less than or equal
>     Greater than
>=    Greater than or equal
```

### 5.3 Logical Operators
```
&&    Logical AND
||    Logical OR
!     Logical NOT / Dereference (context-dependent)
```

### 5.4 String Operator
```
&     String concatenation (strictly typed)
```

### 5.5 Special Operators
```
|>    Forward pipe
>>    Forward composition
<<    Backward composition
->    Function type / arrow
=>    Lambda / function expression
::    List cons (right-associative)
...   Spread operator
.     Field access / module access
:=    Reference assignment
!     Dereference / Logical NOT
```

### 5.6 Multi-Character Operator Disambiguation

**Critical Lexer Requirement**: The lexer must use maximal munch to correctly tokenize multi-character operators:

| Input | Correct Tokenization | NOT |
|-------|---------------------|-----|
| `==` | `EQ` | `EQUALS` + `EQUALS` |
| `!=` | `NEQ` | `BANG` + `EQUALS` |
| `<=` | `LTE` | `LT` + `EQUALS` |
| `>=` | `GTE` | `GT` + `EQUALS` |
| `&&` | `AND_AND` | `AMPERSAND` + `AMPERSAND` |
| `||` | `OR_OR` | `PIPE` + `PIPE` |
| `|>` | `PIPE_GT` | `PIPE` + `GT` |
| `>>` | `GT_GT` | `GT` + `GT` |
| `<<` | `LT_LT` | `LT` + `LT` |
| `->` | `ARROW` | `MINUS` + `GT` |
| `=>` | `FAT_ARROW` | `EQUALS` + `GT` |
| `::` | `CONS` | `COLON` + `COLON` |
| `:=` | `ASSIGN` | `COLON` + `EQUALS` |
| `...` | `SPREAD` | `DOT` + `DOT` + `DOT` |

**Implementation Note**: Always try to match the longest possible operator first.

### Suggested Token Types
```
PLUS, MINUS, STAR, SLASH, PERCENT
EQ, NEQ, LT, LTE, GT, GTE
AND_AND, OR_OR, BANG
AMPERSAND
PIPE_GT, GT_GT, LT_LT
ARROW, FAT_ARROW, CONS, SPREAD
DOT, ASSIGN
```

## 6. Punctuation

```
(  )    Parentheses - LPAREN, RPAREN
{  }    Braces - LBRACE, RBRACE
[  ]    Brackets - LBRACKET, RBRACKET
,       Comma - COMMA
;       Semicolon - SEMICOLON
:       Colon - COLON
|       Pipe - PIPE
=       Equals - EQUALS
```

### Uses
- **Parentheses**: Grouping, tuples, function calls
- **Braces**: Blocks, records, match branches
- **Brackets**: Lists, arrays
- **Comma**: Separates items in lists, tuples, function parameters
- **Semicolon**: Statement separator (often inserted automatically)
- **Colon**: Type annotations, pattern matching
- **Pipe**: Variant constructors, match cases
- **Equals**: Assignment, definitions

## 7. Comments

### 7.1 Single-Line Comments
```vibefun
// This is a single-line comment
let x = 42  // Comment at end of line
```

- Start with `//`
- Continue to end of line
- Do not nest

### 7.2 Multi-Line Comments (Nested)
```vibefun
/*
 * This is a multi-line comment
 * It can span multiple lines
 */

/* Outer comment /* inner nested comment */ still in outer */
```

**Critical Feature**: Comments can be nested.

#### Lexer Requirements
- Track nesting depth
- Each `/*` increments depth
- Each `*/` decrements depth
- EOF with depth > 0 is an error (unterminated comment)

#### Example Nesting
```vibefun
/* Level 1
   /* Level 2
      /* Level 3 */
   */
*/
```

### Comment Handling
Comments are typically discarded by the lexer and not included in the token stream (unless building a documentation tool or formatter).

## 8. Whitespace

### 8.1 Ignored Whitespace
The following whitespace is ignored but used to separate tokens:
- **Spaces** (` ` - U+0020)
- **Tabs** (`\t` - U+0009)
- **Carriage returns** (`\r` - U+000D) when not part of line ending

### 8.2 Significant Whitespace
- **Newlines** (`\n` - U+000A, or `\r\n`): Used for automatic semicolon insertion

**Note**: Unlike Python or Haskell, indentation is NOT significant in vibefun.

## 9. Automatic Semicolon Insertion (ASI)

### Overview
Vibefun uses automatic semicolon insertion to allow developers to omit semicolons in most cases, similar to JavaScript but with clearer rules.

### ASI Rules
A semicolon is automatically inserted before a newline if:
1. The newline follows a **complete expression** or **statement**
2. The next token **cannot** continue the current expression
3. The next token starts a new statement or expression

### Tokens That PREVENT Semicolon Insertion
These tokens indicate the expression continues on the next line:

**Binary operators**:
- Arithmetic: `+`, `-`, `*`, `/`, `%`
- Comparison: `==`, `!=`, `<`, `>`, `<=`, `>=`
- Logical: `&&`, `||`
- String: `&`
- List cons: `::`

**Pipe operators**:
- `|>`, `>>`, `<<`

**Other continuation tokens**:
- `.` (field access)
- `(` (function application)
- `,` (inside lists, records, tuples)

### Tokens That START New Statements
These tokens trigger semicolon insertion:

**Keywords**:
- `let`, `type`, `match`, `if`, `external`, `import`, `export`

**Expression starters** (when not continuing):
- Identifiers
- Literals
- `(`, `[`, `{` (when starting new expression)

### Examples

```vibefun
// ✅ Semicolon inserted after complete statement
let x = 42
let y = 100

// Equivalent to:
let x = 42;
let y = 100;

// ✅ No semicolon inserted - expression continues
let sum = x +
  y +
  z

// ✅ No semicolon inserted - pipe continues
value
  |> transform
  |> process

// ❌ Potential issue - semicolon inserted (probably not intended)
let f = someFunction
(arg1, arg2)

// This is parsed as:
let f = someFunction;
(arg1, arg2);  // Separate expression!

// ✅ Fix: keep on same line or use explicit continuation
let f = someFunction(arg1, arg2)
```

### Lexer Requirements
The lexer should either:
1. **Track newlines**: Emit `NEWLINE` tokens that the parser uses for ASI
2. **Insert semicolons**: Insert `SEMICOLON` tokens based on ASI rules

The parser must handle ASI logic, but the lexer needs to preserve newline information.

## 10. Lexical Edge Cases

### 10.1 Number Validation Errors

```vibefun
// ❌ Multiple decimal points
1.2.3

// ❌ Missing exponent
1e
1e+
1e-

// ❌ Non-integer exponent
3.14e2.5

// ❌ Invalid hex digit
0xGHI

// ❌ Invalid binary digit
0b1012

// ❌ Trailing underscore
123_
3.14_

// ❌ Consecutive underscores
1__000

// ❌ Leading underscore in number (this is an identifier!)
_123  // This is an identifier, not a number

// ✅ Valid
0123         // Decimal 123 (NOT octal!)
1_000        // Valid separator
0.123        // Valid float
1e10         // Valid scientific notation
```

### 10.2 String Validation Errors

```vibefun
// ❌ Unknown escape sequence
"hello\q"

// ❌ Incomplete hex escape
"\x4"        // Needs 2 hex digits

// ❌ Incomplete unicode escape
"\u03"       // Needs 4 hex digits
"\u{12"      // Missing closing brace

// ❌ Unicode out of range
"\u{110000}" // Max is 0x10FFFF

// ❌ Unterminated string
"hello

// ❌ Newline in single-line string
"line 1
line 2"

// ✅ Valid
"\x41"          // 'A'
"\u03B1"        // 'α'
"\u{1F600}"     // '😀'
"""multi
line"""         // Multi-line string
```

### 10.3 Comment Validation Errors

```vibefun
// ❌ Unterminated multi-line comment
/* Never ends...

// ❌ Unterminated nested comment
/* Outer /* Inner */
   // Missing closing for outer

// ✅ Valid
/* /* Properly nested */ */
```

### 10.4 Operator Disambiguation

```vibefun
// Ensure correct tokenization
x>=y       // GT_GT, EQUALS (not GTE!)
// Actually, maximal munch: GTE, not GT_GT + EQUALS

// With spaces
x > = y    // GT, EQUALS (assignment to comparison result)

// Arrow vs minus + greater
x->y       // ARROW (function type or lambda)
x - >y     // MINUS, GT, identifier 'y'

// Cons vs two colons
x::xs      // CONS (list cons operator)
x : :xs    // COLON, COLON, identifier 'xs'
```

**Lexer Rule**: Always use **maximal munch** - match the longest possible token.

## 11. Location Tracking

### Required Information
The lexer must track precise location information for every token:

```typescript
interface Location {
  filename: string;
  start: Position;
  end: Position;
}

interface Position {
  line: number;    // 1-indexed (first line is 1)
  column: number;  // 0-indexed or 1-indexed (be consistent)
  offset: number;  // Absolute character offset from start of file
}
```

### Uses
- **Error reporting**: Show exactly where errors occur
- **Source maps**: Map generated JavaScript back to source
- **IDE integration**: Enable go-to-definition, refactoring, etc.

### Tracking Requirements
- Update line counter on every `\n`
- Update column counter on every character
- Reset column to 0/1 at start of new line
- Track start position when beginning a token
- Track end position when completing a token
- Handle CRLF (`\r\n`) as a single line ending

### Multi-Line Tokens
For multi-line strings and comments, track:
- Start position: First character
- End position: Last character
- The token's location spans multiple lines

## 12. Token Structure

### Recommended Token Interface

```typescript
interface Token {
  type: TokenType;
  value: TokenValue;
  location: Location;
  raw: string;  // Original text from source (optional but useful)
}

type TokenValue =
  | string    // For identifiers, strings
  | number    // For integers, floats
  | boolean   // For booleans
  | null      // For keywords, operators, punctuation
  | undefined;

enum TokenType {
  // Keywords
  LET, MUT, TYPE, IF, THEN, ELSE, MATCH, WHEN,
  REC, AND, IMPORT, EXPORT, FROM, AS, EXTERNAL,
  UNSAFE, REF,

  // Identifiers
  IDENTIFIER,

  // Literals
  BOOL_LITERAL,
  INT_LITERAL,
  FLOAT_LITERAL,
  STRING_LITERAL,
  UNIT_LITERAL,

  // Arithmetic operators
  PLUS, MINUS, STAR, SLASH, PERCENT,

  // Comparison operators
  EQ, NEQ, LT, LTE, GT, GTE,

  // Logical operators
  AND_AND, OR_OR, BANG,

  // String operator
  AMPERSAND,

  // Special operators
  PIPE_GT, GT_GT, LT_LT,
  ARROW, FAT_ARROW, CONS, SPREAD,
  DOT, ASSIGN,

  // Punctuation
  LPAREN, RPAREN,
  LBRACE, RBRACE,
  LBRACKET, RBRACKET,
  COMMA, SEMICOLON, COLON, PIPE, EQUALS,

  // Special
  NEWLINE,  // For ASI tracking (optional)
  EOF,
}
```

## 13. Error Handling

### Error Message Requirements

Errors should be:
1. **Precise**: Point to exact location
2. **Actionable**: Suggest how to fix
3. **Clear**: Explain what went wrong

### Error Examples

#### Invalid Number
```
Error: Invalid number literal at line 5, column 10
  1.2.3
  ^^^^^
  Multiple decimal points are not allowed in number literals
```

#### Unterminated String
```
Error: Unterminated string literal at line 12, column 15
  let msg = "hello
            ^
  String must be closed on the same line, or use """ for multi-line strings
```

#### Unknown Character
```
Error: Unexpected character '@' at line 3, column 7
  let @ = 42
      ^
  Character '@' is not valid in vibefun syntax
```

#### Invalid Escape
```
Error: Invalid escape sequence '\q' at line 8, column 12
  "hello\q"
        ^^
  Valid escape sequences: \\ \" \' \n \r \t \xHH \uXXXX \u{...}
```

#### Unterminated Comment
```
Error: Unterminated multi-line comment starting at line 15, column 1
  /* This comment never ends...
  ^
  Add closing */ to terminate the comment
```

### Error Recovery
Consider whether the lexer should:
- **Fail fast**: Stop at first error
- **Continue**: Try to report multiple errors (more helpful for developers)

For production lexers, continuing after errors and reporting multiple issues is preferred.

## 14. Special Lexical Features

### 14.1 Unicode Normalization

**NFC (Canonical Decomposition + Composition)**:
- Apply to all identifiers
- Apply to string literals
- Ensures `"café"` and `"café"` (different encodings) are equal

```vibefun
// These are the same identifier after NFC normalization
let café = 42;   // Composed form
let café = 100;  // Decomposed form - error: duplicate definition
```

### 14.2 Nested Comments

Unique feature compared to many languages:

```vibefun
/*
  Outer comment
  /* Inner comment */
  Still in outer
*/
```

**Implementation**: Use a counter, not a boolean flag.

### 14.3 Context-Dependent `!` Operator

The `BANG` token has two meanings determined by type checking:
- **Logical NOT**: When operand is `Bool`
- **Dereference**: When operand is `Ref<T>`

```vibefun
!true           // Logical NOT -> false
!(x > 5)        // Logical NOT

let r = ref 42
!r              // Dereference -> 42
```

The lexer produces a single `BANG` token. The type checker determines the meaning.

### 14.4 Leading Zeros in Decimal

**Unlike JavaScript**, leading zeros in vibefun do NOT indicate octal:

```vibefun
0123  // Decimal 123 in vibefun
0123  // Octal 83 in JavaScript (strict mode error in JS)
```

This prevents common bugs when porting from JavaScript.

## 15. Implementation Guidance

### Recommended Architecture

```typescript
class Lexer {
  private source: string;
  private filename: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 0;
  private tokens: Token[] = [];

  constructor(source: string, filename: string) {
    this.source = source;
    this.filename = filename;
  }

  tokenize(): Token[] {
    while (!this.isAtEnd()) {
      this.scanToken();
    }
    this.addToken('EOF', null);
    return this.tokens;
  }

  private scanToken(): void {
    // Main tokenization logic
  }

  private advance(): string {
    const char = this.source[this.position];
    this.position++;
    this.column++;
    return char;
  }

  private peek(): string {
    return this.source[this.position] || '\0';
  }

  private peekNext(): string {
    return this.source[this.position + 1] || '\0';
  }

  private match(expected: string): boolean {
    if (this.isAtEnd()) return false;
    if (this.source[this.position] !== expected) return false;
    this.advance();
    return true;
  }

  private isAtEnd(): boolean {
    return this.position >= this.source.length;
  }

  private addToken(type: TokenType, value: TokenValue): void {
    // Add token with location info
  }
}
```

### Testing Strategy

#### Unit Tests Required
1. **Keywords**: All 17 active keywords + 8 reserved
2. **Operators**: All single and multi-character operators
3. **Literals**:
   - Integers: decimal, hex, binary, with/without underscores
   - Floats: decimal point, scientific notation, combinations
   - Strings: single-line, multi-line, all escape sequences
   - Booleans: true, false
   - Unit: ()
4. **Comments**: Single-line, multi-line, nested
5. **Unicode**: Identifiers with various Unicode characters
6. **Edge cases**: All error scenarios documented above
7. **Location tracking**: Verify line/column accuracy
8. **ASI**: Newline handling for automatic semicolon insertion

#### Integration Tests
- Complete vibefun programs
- Mixed token types
- Real-world code examples

#### Error Tests
- Every error condition must have a test
- Verify error messages are helpful
- Test error recovery (if implemented)

### Performance Considerations

1. **String scanning**: Use character-by-character advance, avoid regex when possible
2. **Keyword lookup**: Use `Set<string>` or `Map<string, TokenType>` for O(1) lookup
3. **Number parsing**: Use built-in `parseInt()`, `parseFloat()` after validation
4. **Unicode normalization**: Cache normalized strings if needed
5. **Minimize allocations**: Reuse position objects, use string builder for tokens
6. **Large files**: Consider streaming or chunking for very large files

### Development Workflow

1. **Start simple**: Implement basic tokens first (keywords, identifiers, simple operators)
2. **Add literals**: Integers, then floats, then strings
3. **Add comments**: Single-line, then multi-line with nesting
4. **Add complex operators**: Multi-character operators with maximal munch
5. **Add location tracking**: Ensure accurate line/column tracking
6. **Add error handling**: Comprehensive error messages
7. **Add Unicode**: NFC normalization for identifiers and strings
8. **Add ASI support**: Newline tracking for automatic semicolon insertion

### Quality Checklist

Before considering the lexer complete, verify:

- [ ] All 17 active keywords recognized
- [ ] All 8 reserved keywords recognized (with appropriate errors)
- [ ] Unicode identifiers with NFC normalization
- [ ] Integer literals (decimal, hex, binary) with underscore separators
- [ ] Float literals (decimal point, scientific notation)
- [ ] String literals (single-line, multi-line, all 8 escape sequences)
- [ ] Boolean literals (true, false)
- [ ] Unit literal (())
- [ ] All 30+ operators with correct multi-character tokenization
- [ ] All punctuation tokens
- [ ] Single-line comments (//)
- [ ] Multi-line nested comments (/* /* */ */)
- [ ] Whitespace handling (ignored except newlines)
- [ ] Newline tracking for ASI
- [ ] Precise location tracking (filename, line, column, offset)
- [ ] Comprehensive error messages for all error cases
- [ ] Edge case handling (invalid numbers, unterminated strings, etc.)
- [ ] 90%+ test coverage
- [ ] All tests passing
- [ ] Performance acceptable on large files (>10K LOC)

---

## Summary

The vibefun lexer is a comprehensive component that must handle:

- **25 keywords** (17 active + 8 reserved)
- **5 literal types** with extensive validation
- **30+ operators** including complex multi-character operators
- **Unicode support** with NFC normalization
- **Nested comments** (unique feature)
- **Automatic semicolon insertion** context
- **Precise location tracking** for every token
- **Helpful error messages** for all error conditions

This specification provides all the details needed to implement a complete, production-quality lexer for the vibefun programming language.
