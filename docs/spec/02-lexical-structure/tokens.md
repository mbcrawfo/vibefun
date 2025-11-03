# Tokens

## Keywords

Vibefun has 17 reserved keywords:

```
let       mut       type      if
then      else      match     when
rec       and       import    export
external  unsafe    from      as
ref
```

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
```

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

### Unit Literal

```vibefun
()  // The unit value (like void in other languages)
```
