# Basic Structure

## Source Files

Vibefun source files use the `.vf` extension. Each file is a module.

**Encoding:** UTF-8
**Line Endings:** LF (`\n`) or CRLF (`\r\n`)

## Comments

### Single-Line Comments

```vibefun
// This is a single-line comment
let x = 42  // Comment at end of line
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

## Whitespace and Semicolon Insertion

- **Spaces** and **tabs** are treated as whitespace and ignored (except in strings)
- **Newlines** are significant in some contexts (automatic semicolon insertion)
- **Indentation** is not significant (unlike Python or Haskell)

### Semicolon Insertion Rules

Vibefun uses **automatic semicolon insertion (ASI)** similar to JavaScript, but with more conservative rules. Semicolons separate statements and expressions in blocks, but are often optional due to ASI.

**Explicit semicolons** (always allowed):
```vibefun
let x = 10; let y = 20; x + y
```

**Implicit semicolons** (inserted automatically):
```vibefun
let x = 10
let y = 20
x + y
```

**When semicolons are inserted:**

A semicolon is automatically inserted before a newline if **all** of the following are true:
1. The newline follows a **complete expression** or **statement**
2. The next token **cannot** continue the current expression
3. The next token starts a new statement or expression

**Examples:**

```vibefun
// ✅ Semicolon inserted after 10 (complete expression)
let x = 10
let y = 20

// ✅ Semicolon inserted after each expression in block
{
    let x = 1
    let y = 2
    x + y
}

// ✅ NO semicolon inserted (expression continues on next line)
let result = 1 +
    2 +
    3

// ✅ NO semicolon inserted (function call continues)
map(list,
    (x) => x + 1)

// ✅ NO semicolon inserted (list literal continues)
let numbers = [
    1,
    2,
    3
]

// ✅ NO semicolon inserted (record literal continues)
let person = {
    name: "Alice",
    age: 30
}

// ✅ NO semicolon inserted (pipe continues)
data
    |> filter((x) => x > 0)
    |> map((x) => x * 2)
```

**Tokens that prevent semicolon insertion** (expression continues):
- Binary operators: `+`, `-`, `*`, `/`, `%`, `&&`, `||`, `&`, `==`, `!=`, `<`, `>`, `<=`, `>=`, `::`
- Pipe operators: `|>`, `>>`, `<<`
- Field access: `.`
- Function application: `(`
- List/record continuation: `,` (inside `[]` or `{}`)

**Tokens that start new statements** (trigger semicolon insertion):
- `let`, `type`, `match`, `if`, `external`, `import`, `export`
- Identifiers (when not continuing an expression)
- Literals (when not continuing an expression)

**Best practices:**
- Rely on ASI for simple cases (let bindings, return values)
- Use explicit semicolons when in doubt
- Avoid relying on subtle ASI rules; prefer explicit semicolons in complex cases
- Use parentheses to group multi-line expressions when needed

```vibefun
// Clear: no ambiguity
let x = 1
let y = 2

// Explicit semicolon for clarity in complex blocks
let process = () => {
    sideEffect1();
    sideEffect2();
    result
}

// Parentheses for multi-line expressions
let value = (
    longExpression1 +
    longExpression2
)
```
