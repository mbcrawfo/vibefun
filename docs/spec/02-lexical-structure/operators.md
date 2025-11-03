# Operators and Edge Cases

## Lexical Edge Cases and Errors

This section defines lexer behavior for malformed or ambiguous input.

### Invalid Number Formats

**Multiple decimal points:**
```vibefun
1.2.3    // ❌ Lexer error: "Invalid number literal"
```

**Invalid scientific notation:**
```vibefun
1e       // ❌ Lexer error: "Invalid scientific notation (missing exponent)"
1e+      // ❌ Lexer error: "Invalid scientific notation (missing exponent)"
3.14e2.5 // ❌ Lexer error: "Exponent must be an integer"
```

**Invalid hex/binary:**
```vibefun
0xGHI    // ❌ Lexer error: "Invalid hexadecimal digit"
0b1012   // ❌ Lexer error: "Invalid binary digit"
```

**Underscore placement:**
```vibefun
_123     // ✅ OK: identifier, not a number
123_     // ❌ Lexer error: "Trailing underscore in number"
_123_    // ✅ OK: identifier
1__000   // ❌ Lexer error: "Consecutive underscores in number"
```

**Leading zeros:**
```vibefun
0123     // ✅ OK: decimal 123 (NOT octal like JavaScript!)
00       // ✅ OK: decimal 0
0.123    // ✅ OK: float 0.123
```

**Note:** Unlike JavaScript, Vibefun does NOT support octal literals (0o prefix would be needed for octal, but is not currently supported).

### Number Size Limits

**Integer limits:**
- Maximum safe integer: `9007199254740991` (2^53 - 1)
- Minimum safe integer: `-9007199254740991` (-(2^53 - 1))
- Integers outside this range lose precision (see Error Handling → Integer Overflow)

**Float limits:**
- Maximum value: approximately `1.7976931348623157e+308`
- Minimum positive value: approximately `5e-324`
- Special values: `Infinity`, `-Infinity`, `NaN`

**Literal overflow:**
```vibefun
let huge = 1e400    // Lexer accepts, value is Infinity at runtime
let tiny = 1e-400   // Lexer accepts, value is 0.0 at runtime
```

### Invalid String Escapes

**Unknown escape sequences:**
```vibefun
"hello\q"    // ❌ Lexer error: "Unknown escape sequence: \q"
"\k"         // ❌ Lexer error: "Unknown escape sequence: \k"
```

**Incomplete escape sequences:**
```vibefun
"test\x4"    // ❌ Lexer error: "Hex escape requires 2 digits"
"test\u03"   // ❌ Lexer error: "Unicode escape \uXXXX requires 4 hex digits"
"test\u{12"  // ❌ Lexer error: "Unterminated unicode escape"
```

**Invalid unicode:**
```vibefun
"\u{110000}"  // ❌ Lexer error: "Unicode code point out of range (max 0x10FFFF)"
"\u{GGGG}"    // ❌ Lexer error: "Invalid hex digit in unicode escape"
```

**Unterminated strings:**
```vibefun
"hello       // ❌ Lexer error: "Unterminated string"
```

**Multi-line string without triple quotes:**
```vibefun
"line 1
line 2"      // ❌ Lexer error: "Unterminated string (use """ for multi-line)"
```

### Unicode Normalization

**Normalization:** Vibefun source code and string literals use **NFC (Canonical Decomposition, followed by Canonical Composition)** Unicode normalization.

**Identifiers:**
```vibefun
café         // ✅ OK: normalized to NFC
café         // ✅ OK: also normalized to NFC (visually identical)
```

**Note:** Identifiers that appear identical but have different Unicode representations (combining characters vs precomposed) are normalized to the same identifier.

**String literals:**
```vibefun
"café" == "café"  // true (normalized to same NFC representation)
```

### Comment Edge Cases

**Unterminated multi-line comment:**
```vibefun
/* This comment never ends...
// ❌ Lexer error: "Unterminated comment"
```

**Nested comment termination:**
```vibefun
/* Outer /* Inner */ Still in outer */  // ✅ OK
/* /* /* Three levels */ */ */          // ✅ OK
```

## Operators

### Arithmetic Operators

```
+     Addition
-     Subtraction / Negation
*     Multiplication
/     Division
%     Modulo
```

### Comparison Operators

```
==    Equal
!=    Not equal
<     Less than
<=    Less than or equal
>     Greater than
>=    Greater than or equal
```

### Logical Operators

```
&&    Logical AND
||    Logical OR
!     Logical NOT (also used for dereference - see Special Operators)
```

### String Operators

```
&     String concatenation
```

### Special Operators

```
|>    Forward pipe (function application)
>>    Forward composition
<<    Backward composition
->    Function type / arrow
=>    Lambda / function expression
::    List cons
...   Spread operator (records, lists)
.     Record field access / module access
```

#### Reference Operators

```
:=    Reference assignment - updates a mutable reference
      Type: (Ref<T>, T) -> Unit
      Example: myRef := newValue
      See: Mutable References section

!     Dereference / Logical NOT (type-based disambiguation)
      When applied to Ref<T>: extracts value (type Ref<T> -> T)
      When applied to Bool: logical negation (type Bool -> Bool)
      Examples:
        !myRef    // Dereference: reads value from Ref<Int>
        !true     // Logical NOT: evaluates to false
      The compiler automatically determines which operation based on operand type.
      See: Mutable References section
```

### Punctuation

```
(  )    Parentheses (grouping, tuples, function calls)
{  }    Braces (blocks, records, match branches)
[  ]    Brackets (lists, arrays)
,       Comma (separates items)
;       Semicolon (statement separator)
:       Colon (type annotations, pattern matching)
|       Pipe (variant constructors, match cases)
```
