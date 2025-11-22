# Record Field Keywords - Context

**Last Updated**: 2025-11-22

## Key Files

### Parser Files (Primary Changes)

- **packages/core/src/parser/parse-expressions.ts** (1788 lines)
  - Lines ~1457-1700: `parseRecordExpr()` - handles record construction and updates
  - Line ~1590: Normal record field parsing
  - Line ~1530: Record update field parsing
  - Line ~567: Field access parsing (`obj.field`)

- **packages/core/src/parser/parse-patterns.ts** (357 lines)
  - Line ~225: Record pattern parsing starts
  - Line ~260: Field name parsing in patterns

- **packages/core/src/parser/parse-types.ts**
  - Line ~161: Record type field name parsing

### Token/Lexer Files (Reference Only - No Changes)

- **packages/core/src/types/token.ts**
  - Lines 9-29: `Keyword` type definition (20 keywords)
  - Lines 107-128: `KEYWORDS` set
  - Lines 133-135: `isKeyword()` function
  - Lines 42-43: `IDENTIFIER` and `KEYWORD` token types

- **packages/core/src/lexer/lexer.ts**
  - Lines 198-249: `readIdentifier()` - already handles keyword tokenization correctly

### Test Files (Will Add To)

- **packages/core/src/parser/parse-expressions.test.ts** - record expression tests
- **packages/core/src/parser/parse-patterns.test.ts** - pattern tests
- **packages/core/src/parser/parse-types.test.ts** - type tests
- Create new: **packages/core/src/parser/keyword-field-names.test.ts**

### Spec Files (To Update)

- **docs/spec/03-type-system/record-types.md** (277 lines)
  - Section on field names (around line 30-50)
  - Examples throughout

- **docs/spec/04-expressions/data-literals.md** (478 lines)
  - Record construction section (lines 1-275)
  - Field shorthand section (lines 151-196)

- **docs/spec/05-pattern-matching/data-patterns.md** (314 lines)
  - Record pattern section (lines 174-313)

## Current Parser Behavior

### How Field Names Are Currently Parsed

All field name parsing uses the same pattern:

```typescript
const fieldToken = parser.expect("IDENTIFIER", "Expected field name");
const fieldName = fieldToken.value as string;
```

This pattern appears in 4 locations (expressions, patterns, types).

### Token Flow

1. Lexer sees `type` in source
2. Lexer calls `readIdentifier()`
3. `readIdentifier()` checks if it's a keyword
4. Keyword detected → returns `{ type: "KEYWORD", keyword: "type", value: "type", ... }`
5. Parser expects `IDENTIFIER` → error

### Why Lexer Doesn't Need Changes

The lexer already:
- Identifies keywords correctly
- Stores the keyword string in both `keyword` and `value` fields
- Preserves location information

We just need the parser to accept `KEYWORD` tokens in field positions.

## Design Decisions

### Decision 1: Parser-Only Changes

**Rationale**: Field names are stored as strings in the AST. The parser just needs to accept keywords and extract the string value. No downstream changes needed.

**Impact**: Minimal - highly localized changes.

### Decision 2: Disallow Shorthand with Keywords

**Rationale**: Shorthand `{ type }` desugars to `{ type: type }` where the second `type` is a variable reference. Since you can't have a variable named `type`, the shorthand is impossible.

**Impact**: Users get a clear error with suggestion to use explicit syntax.

**Alternative Considered**: Special-case shorthand to allow keywords. **Rejected** because:
- It would be magic behavior (creates field from non-existent variable)
- Inconsistent with language semantics
- Confusing for users
- No real benefit

### Decision 3: Allow All 20 Keywords + Reserved Keywords

**Question**: Should we allow reserved keywords (async, await, trait, etc.) as field names?

**Decision**: Yes, allow all keywords including reserved ones.

**Rationale**:
- Reserved keywords are reserved for *variables*, not field names
- Useful for forward compatibility (e.g., `{ async: true }` for config)
- Consistent with JavaScript interop
- No ambiguity in grammar

### Decision 4: Field Access Syntax

**Confirmed**: `obj.type` should work for field access (already unambiguous after DOT token).

**Implementation**: Update field access parsing (line ~567 in parse-expressions.ts) to accept keywords.

## Technical Details

### Token Type Structure

```typescript
// IDENTIFIER token
{ type: "IDENTIFIER", value: "name", loc: {...} }

// KEYWORD token
{ type: "KEYWORD", value: "type", keyword: "type", loc: {...} }
```

Both have a `value` field we can use as the field name string.

### Helper Function Signature

```typescript
function expectFieldName(
    parser: ParserBase,
    context: string
): { name: string; loc: Location } {
    // Accept IDENTIFIER or KEYWORD, return the string value
}
```

### Shorthand Detection Logic

```typescript
// After parsing field name token:
if (parser.check("COMMA") || parser.check("RBRACE")) {
    // This is shorthand syntax
    if (fieldToken.type === "KEYWORD") {
        // Error: shorthand with keyword
    } else {
        // OK: shorthand with identifier
    }
} else {
    // Explicit syntax: expect COLON
    parser.expect("COLON", ...);
}
```

## Test Coverage Needed

### Parser Unit Tests

1. **Record construction with keywords**
   ```vibefun
   { type: "value", match: true, import: "file" }
   ```

2. **Record updates with keywords**
   ```vibefun
   { ...base, type: "new", export: false }
   ```

3. **Field access with keywords**
   ```vibefun
   node.type
   config.import
   ```

4. **Pattern matching with keywords**
   ```vibefun
   match obj {
       | { type: "A", match: true } => ...
       | { type, _ } => ...
   }
   ```

5. **Type definitions with keywords**
   ```vibefun
   type Node = { type: String, if: Bool }
   ```

6. **Error cases**
   ```vibefun
   { type }  // Error: shorthand with keyword
   { type type: "x" }  // Error: syntax error
   ```

### Integration Tests

1. End-to-end parsing of complex records with keyword fields
2. Type checking records with keyword fields
3. Pattern exhaustiveness with keyword fields
4. Code generation with keyword fields

## Examples for Spec

### JavaScript Interop Example

```vibefun
// Modeling JavaScript AST nodes
type ASTNode = {
    type: String,
    import: String,
    export: List<String>
}

external parseJS: (String) -> ASTNode from "./parser.js"

let node = parseJS("import x from 'y'")

match node {
    | { type: "ImportDeclaration", import: path } =>
        "Importing from: " & path
    | _ => "Other node"
}
```

### Configuration Example

```vibefun
// Application configuration
type Config = {
    import: String,
    export: String,
    type: String,  // "production" | "development"
    unsafe: Bool
}

let config = {
    import: "./input",
    export: "./output",
    type: "production",
    unsafe: false
}
```

## Related Language Features

### Other Languages' Behavior

- **JavaScript**: Reserved words allowed as object keys
  ```js
  const obj = { type: "x", import: "y" };  // OK
  const { type } = obj;  // OK - destructuring
  ```

- **TypeScript**: Reserved words allowed as interface properties
  ```ts
  interface Node { type: string; import: string; }  // OK
  ```

- **Python**: Reserved words allowed as dict keys (with quotes)
  ```python
  obj = { "type": "x", "import": "y" }  # OK
  ```

- **Rust**: Raw identifiers allow keywords as names
  ```rust
  struct Node { r#type: String }  // r# prefix required
  ```

Vibefun's approach (keywords allowed in explicit syntax) is most similar to JavaScript/TypeScript.

## Edge Cases

### Mixed Keywords and Identifiers

```vibefun
// Should work: mixing keyword and identifier fields
{ type: "A", name: "B", if: true, value: 42 }
```

### Nested Records

```vibefun
// Should work: keywords at any nesting level
{ outer: { type: "inner", match: true } }
```

### Spread with Keywords

```vibefun
// Should work: spreading records with keyword fields
let base = { type: "base" }
let extended = { ...base, match: true }
```

### Type Annotations in Patterns

```vibefun
// Should work: type-annotated pattern with keyword field
match node {
    | { type: (t: String) } => t
}
```

## Implementation Notes

### Order of Changes

1. Add `expectFieldName()` helper to parser-base.ts or parse-expressions.ts
2. Update record expression parsing (2 locations)
3. Update record pattern parsing (1 location)
4. Update record type parsing (1 location)
5. Update field access parsing (1 location)
6. Add shorthand validation error
7. Add tests
8. Update specs

### Testing Strategy

- Write tests first (TDD approach)
- Start with simplest case (single keyword field)
- Add complexity gradually (multiple fields, nesting, patterns)
- Test error cases last
- Run `npm run verify` frequently

## Questions Resolved

### Q: Do we need to update codegen?

**A**: No. Field names are strings in the AST. Codegen already handles them correctly:
```javascript
// Generated JavaScript
{ type: "value", match: true }  // Works fine - 'type' is a valid JS key
```

### Q: Do we need to update type checker?

**A**: No. Type checker operates on AST, where field names are strings. No changes needed.

### Q: What about field access in generated code?

**A**: JavaScript handles it fine:
```javascript
obj.type  // Works - 'type' is valid property name in JS
```

### Q: Should we allow `true` and `false` as field names?

**A**: Out of scope. They're boolean literals, not keywords. Could be a future enhancement.

## Success Metrics

- All 20 keywords work as field names in all contexts
- Clear error for shorthand with keyword
- All existing tests still pass
- New tests achieve >95% coverage of changed code
- Spec examples are clear and comprehensive
- Zero regressions in `npm run verify`
