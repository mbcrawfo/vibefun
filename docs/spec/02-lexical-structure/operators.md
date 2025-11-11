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
- Maximum safe integer: `9007199254740991` (2^53 - 1, `Number.MAX_SAFE_INTEGER`)
- Minimum safe integer: `-9007199254740991` (-(2^53 - 1), `Number.MIN_SAFE_INTEGER`)
- Integers outside this range lose precision when converted to JavaScript numbers at runtime

**Lexer behavior:**
The lexer accepts integer literals of any size. Values exceeding `Number.MAX_SAFE_INTEGER` will lose precision when converted to JavaScript numbers at runtime. The lexer does not warn or error on large integers.

**Example:**
```vibefun
let big = 9007199254740992;  // Lexer accepts
// Runtime: loses precision (9007199254740992 may become 9007199254740992 or 9007199254740993)

let huge = 999999999999999999999;  // Lexer accepts
// Runtime: loses precision significantly
```

**Recommendation:** For precise large integer arithmetic, consider using a BigInt library via JavaScript interop.

**Float limits:**
- Maximum value: approximately `1.7976931348623157e+308`
- Minimum positive value: approximately `5e-324`
- Special values: `Infinity`, `-Infinity`, `NaN`

**Literal overflow:**
```vibefun
let huge = 1e400;  // Lexer accepts, value is Infinity at runtime
let tiny = 1e-400;  // Lexer accepts, value is 0.0 at runtime
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
"line 1;
line 2"      // ❌ Lexer error: "Unterminated string (use """ for multi-line)"
```

### Unicode Normalization

**Normalization:** Vibefun source code and string literals use **NFC (Canonical Decomposition, followed by Canonical Composition)** Unicode normalization.

**When normalization occurs:** The lexer applies NFC normalization to identifiers and string literals during tokenization. This ensures that visually identical text has identical internal representation.

**Identifiers:**
```vibefun
café         // ✅ OK: normalized to NFC during lexical analysis
café         // ✅ OK: also normalized to NFC (visually identical)
```

**Note:** Identifiers that appear identical but have different Unicode representations (combining characters vs precomposed) are normalized to the same identifier during tokenization.

**String literals:**
```vibefun
"café" == "café";  // true (normalized to same NFC representation during lexical analysis)
```

String comparison is simple byte-for-byte comparison because normalization has already occurred in the lexer.

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

**Unary minus (`-`):**
The lexer emits a single `OP_MINUS` token for all `-` characters. The parser determines whether the minus represents unary negation (e.g., `-x`) or binary subtraction (e.g., `a - b`) based on expression context. Whitespace around `-` is not significant for lexical analysis.

**Examples:**
```vibefun
-42;  // Unary negation (parser determines from context)
x - y;  // Binary subtraction (parser determines from context)
- x;  // Also unary negation (whitespace doesn't matter to lexer)
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

**Type signature:**
```vibefun
(&): (String, String) -> String
```

**Type enforcement:** The `&` operator is **strictly typed** - both operands must be of type `String`. There is **no automatic type coercion** from other types.

**Valid usage:**
```vibefun
"hello" & " " & "world";  // ✅ OK → "hello world"
"Age: " & String.fromInt(42)      // ✅ OK → "Age: 42"
"Pi: " & String.fromFloat(3.14)   // ✅ OK → "Pi: 3.14"
```

**Invalid usage (compile-time errors):**
```vibefun
"Age: " & 42                      // ❌ Type error: Int is not String
"Count: " & 100                   // ❌ Type error: Int is not String
123 & "hello"                     // ❌ Type error: Int is not String
true & "value"                    // ❌ Type error: Bool is not String

// Error message:
// Type mismatch in binary operation
//   Operator & expects: (String, String) -> String
//   Left operand: String
//   Right operand: Int
//
//   "Age: " & 42
//             ^^
//   Help: Use String.fromInt(42) to convert Int to String
```

**Rationale:** Explicit conversion is required to prevent accidental type coercion bugs common in dynamically-typed languages. This makes type errors caught at compile time rather than producing unexpected string representations at runtime.

**Conversion functions:**
- `String.fromInt: (Int) -> String`
- `String.fromFloat: (Float) -> String`
- `String.fromBool: (Bool) -> String`
- See [String module](../11-stdlib/string.md) for complete API

**Note:** The `&` operator is syntactic sugar that is desugared to `String.concat(s1, s2)` during compilation. The type checker validates operand types **before** desugaring. See [Desugaring](../12-compilation/desugaring.md) for details.

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
