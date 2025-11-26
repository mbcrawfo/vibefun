<!-- THIS FILE IS AUTO-GENERATED. DO NOT EDIT MANUALLY. -->
<!-- Run 'npm run docs:errors' to regenerate. -->


# Lexer Errors

Errors during lexical analysis (tokenization)

## Overview

| Code | Name | Severity |
|------|------|----------|
| [VF1001](#vf1001) | UnterminatedString | **Error** |
| [VF1002](#vf1002) | UnterminatedStringEOF | **Error** |
| [VF1003](#vf1003) | UnterminatedMultilineString | **Error** |
| [VF1010](#vf1010) | InvalidEscapeSequence | **Error** |
| [VF1011](#vf1011) | InvalidHexEscape | **Error** |
| [VF1012](#vf1012) | InvalidUnicodeEscape | **Error** |
| [VF1100](#vf1100) | InvalidNumberSeparator | **Error** |
| [VF1101](#vf1101) | InvalidBinaryLiteral | **Error** |
| [VF1102](#vf1102) | InvalidHexLiteral | **Error** |
| [VF1103](#vf1103) | InvalidOctalLiteral | **Error** |
| [VF1104](#vf1104) | InvalidScientificNotation | **Error** |
| [VF1300](#vf1300) | UnterminatedComment | **Error** |
| [VF1400](#vf1400) | UnexpectedCharacter | **Error** |

---

## VF1001

**UnterminatedString** **Error**

### Message

> Unterminated string: newline in single-line string

### Explanation

Single-line strings (using single double-quotes) cannot contain literal newlines. If you need a string that spans multiple lines, use triple-quoted strings ("""...""") or escape the newline character with \n.

### Example

**Problem:**

```vibefun
let msg = "Hello
World"
```

**Solution:**

```vibefun
let msg = "Hello\nWorld"
// or
let msg = """
Hello
World
"""
```

*Use escape sequence \n or triple-quoted string for multi-line content*

### Hint

> Use """ for multi-line strings or escape the newline with \n

### Related

[VF1002](lexer.md#vf1002), [VF1003](lexer.md#vf1003)

### See Also

- [spec/02-syntax/literals.md](../spec/02-syntax/literals.md)


---

## VF1002

**UnterminatedStringEOF** **Error**

### Message

> Unterminated string: expected closing "

### Explanation

The string literal was not closed before the end of the file. Every opening double-quote must have a matching closing double-quote.

### Example

**Problem:**

```vibefun
let msg = "Hello world
```

**Solution:**

```vibefun
let msg = "Hello world"
```

*Added closing " at the end of the string*

### Hint

> Add a closing " at the end of the string

### Related

[VF1001](lexer.md#vf1001), [VF1003](lexer.md#vf1003)


---

## VF1003

**UnterminatedMultilineString** **Error**

### Message

> Unterminated multi-line string: expected closing """

### Explanation

The multi-line string literal was not closed before the end of the file. Triple-quoted strings must end with """.

### Example

**Problem:**

```vibefun
let msg = """
Hello
World
```

**Solution:**

```vibefun
let msg = """
Hello
World
"""
```

*Added closing """ at the end of the multi-line string*

### Hint

> Add closing """ at the end of the string

### Related

[VF1001](lexer.md#vf1001), [VF1002](lexer.md#vf1002)


---

## VF1010

**InvalidEscapeSequence** **Error**

### Message

> Invalid escape sequence: \{char}

### Explanation

The escape sequence is not recognized. Vibefun supports the following escape sequences: \n (newline), \t (tab), \r (carriage return), \" (double quote), \' (single quote), \\ (backslash), \xHH (hex byte), \uXXXX (unicode), \u{XXXXXX} (unicode code point).

### Example

**Problem:**

```vibefun
let path = "C:\Users\name"
```

**Solution:**

```vibefun
let path = "C:\\Users\\name"
```

*Escaped backslashes with \\*

### Hint

> Valid escapes: \n, \t, \r, \", \', \\, \xHH, \uXXXX, \u{XXXXXX}

### Related

[VF1011](lexer.md#vf1011), [VF1012](lexer.md#vf1012)


---

## VF1011

**InvalidHexEscape** **Error**

### Message

> Invalid \xHH escape: expected 2 hex digits

### Explanation

The \x escape sequence requires exactly 2 hexadecimal digits to specify a byte value. Valid hex digits are 0-9, a-f, and A-F.

### Example

**Problem:**

```vibefun
let char = "\x4"
```

**Solution:**

```vibefun
let char = "\x41"  // ASCII "A"
```

*Used exactly 2 hex digits*

### Hint

> Use exactly 2 hex digits (0-9, a-f, A-F) after \x

### Related

[VF1010](lexer.md#vf1010), [VF1012](lexer.md#vf1012)


---

## VF1012

**InvalidUnicodeEscape** **Error**

### Message

> Invalid unicode escape: {reason}

### Explanation

Unicode escapes must be either \uXXXX with exactly 4 hex digits, or \u{...} with 1-6 hex digits. The code point must not exceed 0x10FFFF.

### Example

**Problem:**

```vibefun
let emoji = "\u{1F600"  // missing closing brace
```

**Solution:**

```vibefun
let emoji = "\u{1F600}"  // 😀
```

*Added closing brace to unicode escape*

### Hint

> Use \uXXXX (4 hex digits) or \u{XXXXXX} (1-6 hex digits, max 10FFFF)

### Related

[VF1010](lexer.md#vf1010), [VF1011](lexer.md#vf1011)


---

## VF1100

**InvalidNumberSeparator** **Error**

### Message

> Invalid number separator: underscore must be between digits

### Explanation

Numeric separators (underscores) are allowed to improve readability, but they must appear between digits. They cannot appear at the start, end, or adjacent to other separators.

### Example

**Problem:**

```vibefun
let n = 1_000_
```

**Solution:**

```vibefun
let n = 1_000
```

*Removed trailing underscore*

### Hint

> Remove trailing underscore or add more digits

### Related

[VF1101](lexer.md#vf1101), [VF1102](lexer.md#vf1102), [VF1103](lexer.md#vf1103)


---

## VF1101

**InvalidBinaryLiteral** **Error**

### Message

> Invalid binary literal: expected at least one binary digit after 0b

### Explanation

Binary literals start with 0b or 0B and must contain at least one binary digit (0 or 1). Example: 0b1010 represents the decimal value 10.

### Example

**Problem:**

```vibefun
let flags = 0b
```

**Solution:**

```vibefun
let flags = 0b1010
```

*Added binary digits after the 0b prefix*

### Hint

> Add binary digits (0 or 1) after 0b

### Related

[VF1100](lexer.md#vf1100), [VF1102](lexer.md#vf1102)


---

## VF1102

**InvalidHexLiteral** **Error**

### Message

> Invalid hex literal: expected at least one hex digit after 0x

### Explanation

Hexadecimal literals start with 0x or 0X and must contain at least one hex digit. Valid hex digits are 0-9, a-f, and A-F. Example: 0xFF represents the decimal value 255.

### Example

**Problem:**

```vibefun
let color = 0x
```

**Solution:**

```vibefun
let color = 0xFF00FF
```

*Added hex digits after the 0x prefix*

### Hint

> Add hex digits (0-9, a-f, A-F) after 0x

### Related

[VF1100](lexer.md#vf1100), [VF1101](lexer.md#vf1101)


---

## VF1103

**InvalidOctalLiteral** **Error**

### Message

> Invalid octal literal: expected at least one octal digit after 0o

### Explanation

Octal literals start with 0o or 0O and must contain at least one octal digit (0-7). Example: 0o755 represents the decimal value 493.

### Example

**Problem:**

```vibefun
let perms = 0o
```

**Solution:**

```vibefun
let perms = 0o755
```

*Added octal digits after the 0o prefix*

### Hint

> Add octal digits (0-7) after 0o

### Related

[VF1100](lexer.md#vf1100), [VF1101](lexer.md#vf1101), [VF1102](lexer.md#vf1102)


---

## VF1104

**InvalidScientificNotation** **Error**

### Message

> Invalid scientific notation: expected digit after exponent

### Explanation

Scientific notation requires at least one digit after the exponent indicator (e or E). An optional sign (+ or -) can appear before the exponent digits.

### Example

**Problem:**

```vibefun
let big = 1.5e
```

**Solution:**

```vibefun
let big = 1.5e10
```

*Added exponent value after 'e'*

### Hint

> Add at least one digit after 'e' or 'E'

### Related

[VF1100](lexer.md#vf1100)


---

## VF1300

**UnterminatedComment** **Error**

### Message

> Unterminated multi-line comment

### Explanation

Multi-line comments starting with /* must be closed with */. Vibefun supports nested comments, so make sure each /* has a matching */.

### Example

**Problem:**

```vibefun
/* This comment
never ends
```

**Solution:**

```vibefun
/* This comment
is properly closed */
```

*Added closing */ to the comment*

### Hint

> Add closing */


---

## VF1400

**UnexpectedCharacter** **Error**

### Message

> Unexpected character: '{char}'

### Explanation

The lexer encountered a character that is not part of the vibefun language syntax. This might be a typo, a character from a different keyboard layout, or an unsupported symbol.

### Example

**Problem:**

```vibefun
let x = 5 @ 3
```

**Solution:**

```vibefun
let x = 5 * 3
```

*Replaced invalid @ with valid operator **

### Hint

> This character is not valid in vibefun syntax

