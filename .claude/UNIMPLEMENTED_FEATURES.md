# Unimplemented Language Features

This document catalogs language features that were discovered to be unimplemented during parser edge case test development.

**Last Updated:** 2025-11-02

## Summary

During implementation of comprehensive parser edge case tests, several language features were found to be either not yet implemented or have limitations in the current parser/lexer.

---

## Lexer Limitations

### Emoji Identifiers

**Status:** ❌ Not Supported

**Description:** The lexer does not accept emoji characters as valid identifier characters.

**Examples that fail:**
```vibefun
let 🚀 = 42
let 🌟 = () => "hello"
```

**Current behavior:** Throws `LexerError: Unexpected character: '�'`

**Note:** The lexer DOES support:
- Greek letters: `π`, `α`, `β`, `θ`, etc.
- Math subscripts/superscripts: `x₁`, `x²`
- CJK characters: `变量`, `変数`, `변수`
- Other Unicode identifier characters per Unicode standard

### Emoji in Type/Constructor Names

**Status:** ❌ Not Supported

**Description:** Emoji cannot be used in type names or variant constructor names.

**Examples that fail:**
```vibefun
type 🚀 = Int
type Result = 🚀(Int) | 💥
```

**Workaround:** Use Greek letters or other supported Unicode characters:
```vibefun
type Π = Int
type Result = Σ(Int) | Δ
```

---

## Parser Limitations

### Generic Type Application with Angle Brackets

**Status:** ❌ Not Yet Implemented

**Description:** The parser does not yet support generic type application using angle bracket syntax.

**Examples that don't work:**
```vibefun
f<A>()
f<List<Int>>()
map<String, Int>(fn, list)
```

**Workaround:** Type inference should handle most cases without explicit type arguments.

---

## Operator Limitations

### Reference Assignment (`:=`)

**Status:** ❌ Not Yet Implemented

**Description:** The ref assignment operator is not yet implemented in the parser.

**Example that doesn't work:**
```vibefun
x := 42
```

### Postfix Dereference (`x!`)

**Status:** ❌ Not Yet Implemented

**Description:** Postfix dereference syntax is not implemented. Only prefix `!` works (as logical NOT).

**Example that doesn't work:**
```vibefun
x!      // Postfix deref
obj.field!
```

**Current behavior:** `x!` parses as `!(x)` (prefix logical NOT)

**Workaround:** Use prefix `!` operator:
```vibefun
!x      // Works (logical NOT or deref depending on type)
```

---

## Record Features

### Record Field Punning

**Status:** ❌ Not Yet Implemented

**Description:** Shorthand syntax for record fields where the field name matches the variable name.

**Example that doesn't work:**
```vibefun
let x = 1
let record = { x }  // Shorthand for { x: x }
```

### Record Update Syntax

**Status:** ❌ Not Yet Implemented

**Description:** Spread syntax for updating records.

**Example that doesn't work:**
```vibefun
let updated = { ...original, x: 42 }
```

---

## Pipe Operators

### Status: ⚠️ Partially Implemented

**Description:** Pipe and composition operators exist but create specific AST nodes, not generic binary operators.

**Current behavior:**
- `|>` creates a `Pipe` node (not `BinOp`)
- `>>` and `<<` create composition operators as `BinOp` with ops "ForwardCompose" and "BackwardCompose"
- Reverse pipe `<|` may not be implemented

**Working:**
```vibefun
data |> process |> transform  // Works
f >> g                         // Works (forward compose)
```

**Needs verification:**
```vibefun
x <| y  // Reverse pipe
a |> b >> c << d  // Complex chains
```

---

## String Concatenation

### Status: ✅ Implemented

**Description:** String concatenation operator `&` is fully implemented.

**Example:**
```vibefun
"hello" & " world"
```

**Status:** Implemented and tested

---

## Tuple Syntax

### Status: ❌ Not Implemented

**Description:** There is no dedicated tuple syntax. Parentheses with commas create `Block` expressions.

**Example:**
```vibefun
(1, 2, 3)  // Creates a Block with 3 expressions, not a tuple
```

**Workaround:** Use lists or records depending on needs:
```vibefun
[1, 2, 3]              // List
{ first: 1, second: 2 } // Record
```

---

## Comparison Operators

### Status: ⚠️ Needs Verification

**Description:** Comparison operators `<`, `>`, `<=`, `>=` may conflict with generic type syntax or have parsing issues.

**Examples that may have issues:**
```vibefun
x < y
x > y
x < y < z  // Chained comparison
```

**Note:** These operators exist in the type system but edge case behavior needs verification.

---

## Match Expression Syntax

### Status: ✅ Implemented (with caveats)

**Current syntax:**
```vibefun
match value {
  | Pattern1 => expr1
  | Pattern2 => expr2
}
```

**Important:**
- Cases must be separated by `|`, not commas
- Each case starts with `|`
- Newlines are optional but recommended for readability

**Common mistake:**
```vibefun
// ❌ Wrong - using commas
match x { Some(y) => y, None => 0 }

// ✅ Correct - using pipes
match x { | Some(y) => y | None => 0 }
```

---

## Recommendations

### For Test Writers

When writing parser tests:
1. Check existing tests in `packages/core/src/parser/expressions.test.ts` for syntax examples
2. Verify AST node names in `packages/core/src/types/ast.ts`
3. Test features with simple examples first before edge cases
4. Emoji identifiers are not supported - use Greek letters instead for unicode tests

### For Feature Implementers

Priority order for implementing missing features:

**High Priority:**
1. Generic type application with angle brackets (needed for explicit type parameters)
2. Record field punning and update syntax (common patterns)
3. Reference types and operators (`:=`, proper `!` deref)

**Medium Priority:**
4. Tuple syntax (or document that blocks are the intended tuple replacement)
5. Comparison operator edge cases and chaining

**Low Priority:**
6. Postfix dereference syntax (prefix works fine)
7. Emoji identifier support (nice-to-have, not critical)
8. Complex pipe operator chains (basic pipe works)

---

## Testing Status

**Edge Case Test Coverage:**

- ✅ Deep nesting (20-50 levels): **Implemented and passing**
- ✅ Large literals (10KB+ strings, 1e308 floats): **Implemented and passing**
- ⚠️ Unicode integration: **Partially passing** (emoji not supported)
- ✅ Operator precedence: **Implemented and passing** (for implemented operators)

**Test Results as of 2025-11-02:**
- Total tests: 1879
- Passing: 1861
- Failing: 18 (mostly emoji identifier tests)
- Test files: 71 total, 69 passing

---

## Notes for Future Development

### Lexer Unicode Support

The lexer correctly supports Unicode identifiers per the Unicode identifier specification, but explicitly excludes emoji. If emoji support is desired:

1. Update `Lexer.isIdentifierStart()` and `Lexer.isIdentifierContinue()`
2. Consider: Should emoji be allowed in type names? Constructor names? Field names?
3. Document the decision in language spec

### AST Node Naming Conventions

Discovered naming conventions:
- `"UnaryOp"` not `"UnOp"`
- `"Record"` not `"RecordLit"`
- `"List"` not `"ListLit"`
- `"VarPattern"` not `"VarPat"`
- List elements wrapped in `{ kind: "Element", expr: ... }`
- UnaryOp uses field `expr` not `operand`
- Operator values are enum strings: `"Negate"`, `"LogicalNot"`, `"Add"`, etc.

### Parser Optimizations

The parser performs some optimizations:
- Parentheses around simple expressions are removed: `(42)` → `IntLit{42}`
- This is intentional and simplifies the AST
