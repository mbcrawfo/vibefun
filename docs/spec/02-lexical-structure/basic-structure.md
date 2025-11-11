# Basic Structure

## Source Files

Vibefun source files use the `.vf` extension. Each file is a module.

**Encoding:** UTF-8

**Unicode Normalization:** The lexer applies NFC (Canonical Decomposition followed by Canonical Composition) normalization to identifiers and string literals during tokenization. Source files need not be pre-normalized—normalization is performed incrementally as tokens are processed.

**Line Endings:** LF (`\n`) or CRLF (`\r\n`)

## Comments

### Single-Line Comments

```vibefun
// This is a single-line comment
let x = 42;  // Comment at end of line
```

### Multi-Line Comments

Multi-line comments support nesting:

```vibefun
/*
 * This is a multi-line comment
 * It can span multiple lines
 */

/* Outer comment /* inner nested comment */ still in outer */
```

## Whitespace and Semicolons

- **Spaces** and **tabs** are treated as whitespace and ignored (except in strings)
- **Newlines** are not significant for parsing (indentation-insensitive syntax)
- **Indentation** is not significant (unlike Python or Haskell)

### Semicolon Requirements

Vibefun requires **explicit semicolons** to separate statements and declarations. Semicolons are **not optional** and must be written explicitly.

**Top-level declarations** require semicolons:
```vibefun
let x = 10;
let y = 20;
type Point = { x: Int, y: Int };
```

**Block expressions** require semicolons after each statement:
```vibefun
{
    let x = 1;
    let y = 2;
    x + y;
}
```

**External declarations** use semicolons as separators:
```vibefun
external {
    log: (String) -> Unit = "console.log";
    error: (String) -> Unit = "console.error";
}
```

### Multi-line Expressions

Expressions can span multiple lines without semicolons in the middle:

```vibefun
// ✅ Expression continues across lines
let result = 1 +
    2 +
    3;

// ✅ Function call continues
map(list,
    (x) => x + 1);

// ✅ List literal (commas separate items)
let numbers = [;
    1,
    2,
    3;
];

// ✅ Record literal (commas separate fields)
let person = {
    name: "Alice",
    age: 30
};

// ✅ Pipe operators allow multi-line
data;
    |> filter((x) => x > 0)
    |> map((x) => x * 2);
```

### Special Cases

**Empty blocks** are valid without semicolons inside:
```vibefun
let noOp = () => {};
```

**Record literals** use commas (not semicolons):
```vibefun
let point = { x: 1, y: 2 };  // Commas for fields
let block = { x; y; };        // Semicolons = block expression
```

**Lambda newlines** are allowed before the arrow:
```vibefun
let add = (x, y);
    => x + y;
```
