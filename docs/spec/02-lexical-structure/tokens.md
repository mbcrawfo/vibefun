# Tokens

## Keywords

Vibefun has 19 reserved keywords:

```
let       mut       type      if
then      else      match     when
rec       and       import    export
external  unsafe    from      as
ref       try       catch
```

**Note:** `try` and `catch` are used in unsafe blocks for JavaScript exception handling interop.

Additional reserved for future use:
```
async     await     trait     impl
where     do        yield     return
```

## Identifiers

**Syntax:** Identifiers start with a Unicode letter or underscore, followed by letters, digits, or underscores.

**Pattern:** `[a-zA-Z_\p{L}][a-zA-Z0-9_\p{L}]*`

**Examples:**
```vibefun
x
userName
_private
café
αβγ
変数
```

**Conventions:**
- Variables and functions: `camelCase`
- Types and constructors: `PascalCase`
- Constants: `camelCase`

## Literals

### Boolean Literals

```vibefun
true
false
```

### Integer Literals

```vibefun
42          // Decimal
0xFF        // Hexadecimal (255)
0b1010      // Binary (10)
```

**Note:** Underscores can be used as separators: `1_000_000`

### Float Literals

```vibefun
3.14
0.5
1e10        // Scientific notation (10000000000)
3.14e-2     // (0.0314)
1e010       // Leading zeros in exponents allowed (equivalent to 1e10)
```

**Decimal point rules:**
- Float literals must have at least one digit before AND after the decimal point
- Leading decimal (`.5`) is not allowed
- Trailing decimal (`5.`) is not allowed

**Scientific notation:**
- Exponents may have leading zeros (e.g., `1e010` is equivalent to `1e10`)
- Leading zeros in exponents do not have special meaning and are ignored

### String Literals

**Single-line strings:**
```vibefun
"hello"
"hello, world!"
```

**Multi-line strings:**
```vibefun
"""
This is a multi-line string.
It can span multiple lines.
"""
```

**Escape sequences:**
- `\\` - Backslash
- `\"` - Double quote
- `\'` - Single quote
- `\n` - Newline
- `\r` - Carriage return
- `\t` - Tab
- `\xHH` - Hex escape (e.g., `\x41` = 'A')
- `\uXXXX` - Unicode escape (e.g., `\u03B1` = 'α')
- `\u{XXXXXX}` - Long unicode escape (e.g., `\u{1F600}` = '😀')

**Unicode normalization:**
String literal values are normalized to NFC (Canonical Decomposition followed by Canonical Composition) during lexical analysis. The token value contains the normalized form, ensuring that visually identical strings have identical representations.

### Unit Literal

```vibefun
()  // The unit value (like void in other languages)
```
