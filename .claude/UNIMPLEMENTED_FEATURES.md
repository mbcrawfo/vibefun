# Unimplemented Language Features

This document catalogs language features that were discovered to be unimplemented during parser edge case test development.

**Last Updated:** 2025-11-09

## Summary

During implementation of comprehensive parser edge case tests, several language features were found to be either not yet implemented or have limitations in the current parser/lexer.

---

## Lexer Features

### Emoji Identifiers

**Status:** ✅ **IMPLEMENTED** (as of 2025-11-09)

**Description:** The lexer fully supports emoji characters as valid identifier characters, including complex emoji with skin tone modifiers and zero-width joiners.

**Supported examples:**
```vibefun
let 🚀 = 42
let 🌟 = () => "hello"
type 🚀 = Int
type Result = 🚀(Int) | 💥
let 👨‍💻 = "developer"    // Complex emoji with ZWJ
let π🚀 = 3.14             // Mixed Unicode and emoji
```

**Implementation details:**
- Pattern: `[a-zA-Z_\p{L}\p{Emoji_Presentation}][a-zA-Z0-9_\p{L}\p{M}\p{Emoji_Presentation}\u200D]*`
- Supports: All emoji with `\p{Emoji_Presentation}`, combining marks, and zero-width joiners
- Works in: Variable names, type names, constructor names, and field names
- See: `docs/spec/02-lexical-structure/tokens.md` for full specification

**Tests:** Comprehensive test coverage in `packages/core/src/lexer/identifiers.test.ts`

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

**Status:** ✅ **IMPLEMENTED IN LEXER** (Parser status unknown)

**Description:** The ref assignment operator is fully implemented in the lexer and tokenizes correctly as `OP_ASSIGN`.

**Lexer support:**
```typescript
// Lexer emits OP_ASSIGN token correctly
":=" → { type: "OP_ASSIGN", value: ":=" }
```

**Tests:** See `packages/core/src/lexer/operators.test.ts` (line 532-542)

**Note:** The lexer correctly tokenizes `:=`. Parser support for the assignment expression has not been verified in this review.

### Postfix Dereference (`x!`)

**Status:** ⚠️ **NOT IN SPEC** (Working as designed)

**Description:** Postfix dereference syntax is not part of the Vibefun language specification. Only **prefix** `!` is documented and supported for both logical NOT and dereferencing.

**Language design:**
```vibefun
!x      // Prefix: logical NOT (for Bool) or dereference (for Ref<T>)
```

**Specification:** See `docs/spec/02-lexical-structure/operators.md` (lines 253-261) and `docs/spec/07-mutable-references.md` - only prefix `!` is documented.

**Conclusion:** This is not a missing feature - the language intentionally uses prefix-only syntax for the `!` operator.

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
- **Reverse pipe `<|` is NOT implemented** (not in spec)

**Working:**
```vibefun
data |> process |> transform  // Works
f >> g                         // Works (forward compose)
g << f                         // Works (backward compose)
```

**Not supported:**
```vibefun
x <| y  // Reverse pipe - NOT IN SPEC, not implemented
```

**Specification:** See `docs/spec/02-lexical-structure/operators.md` (lines 233-243) - only documents `|>`, `>>`, and `<<`. Reverse pipe `<|` is not part of the language design.

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
