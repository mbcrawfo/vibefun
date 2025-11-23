# Record Field Keywords - Context

**Last Updated**: 2025-11-22 (Phase 1 complete - parser implementation done, ready for Phase 2 testing)

## Implementation Status

### Phase 1: Parser Implementation ✅ COMPLETE (2025-11-22)

**What's Done:**
- ✅ Helper function `expectFieldName()` created at `packages/core/src/parser/parser-base.ts:140-154`
- ✅ All 6 parser locations updated to accept keywords as field names:
  1. Record construction (normal fields) - `parse-expressions.ts:1602`
  2. Record construction (update fields) - `parse-expressions.ts:1533`
  3. Field access (DOT operator) - `parse-expressions.ts:567`
  4. Record patterns - `parse-patterns.ts:260`
  5. Record type definitions - `parse-types.ts:161`
  6. Record type definitions - `parse-declarations.ts:419`
- ✅ Shorthand validation with clear error messages (lines 1614-1622, 1545-1553 in parse-expressions.ts)
- ✅ Quality checks pass: type checking, linting, formatting
- ✅ All 2,641 existing tests pass (no regressions)
- ✅ Clean commit: f9fa24f "feat(parser): allow keywords as record field names"

**What's Pending:**
- ❌ Phase 2: Comprehensive testing (keyword-specific unit and integration tests)
- ❌ Phase 3: Documentation updates (0 of 8 required files updated)
  - Critical: `.agent-map.md` and `VIBEFUN_AI_CODING_GUIDE.md` (required by project rules)
- ❌ Phase 4: Quality assurance (manual testing, edge case verification)
- ❌ Phase 5: Finalization

**Readiness:** Implementation is solid and ready for Phase 2 testing. Parser changes are correct, comprehensive, and follow all coding standards.

## Key Files

### Parser Files (Primary Changes - 6 Locations)

- **packages/core/src/parser/parse-expressions.ts** (1788 lines)
  - Lines ~1457-1700: `parseRecordExpr()` - handles record construction and updates
  - Line ~1590: Normal record field parsing (LOCATION 1)
  - Line ~1530: Record update field parsing (LOCATION 2)
  - Line ~567: Field access parsing (`obj.field`) after DOT operator (LOCATION 3)

- **packages/core/src/parser/parse-patterns.ts** (357 lines)
  - Line ~225: Record pattern parsing starts
  - Line ~260: Field name parsing in patterns (LOCATION 4)

- **packages/core/src/parser/parse-types.ts**
  - Line ~161: Record type field name parsing (LOCATION 5)

- **packages/core/src/parser/parse-declarations.ts**
  - Line ~419: Record type field name parsing in type declarations (LOCATION 6)
  - Note: Discovered during implementation (plan originally mentioned 5 locations)

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

### Spec Files (To Update - 8 Files)

- **docs/spec/03-type-system/record-types.md** (277 lines)
  - Section on field names (around line 30-50)
  - Examples throughout

- **docs/spec/04-expressions/data-literals.md** (478 lines)
  - Record construction section (lines 1-275)
  - Field shorthand section (lines 151-196)

- **docs/spec/04-expressions/basic-expressions.md** (CRITICAL)
  - Lines 255-296: Field access operator documentation
  - Must document keywords work as field names

- **docs/spec/05-pattern-matching/data-patterns.md** (314 lines)
  - Record pattern section (lines 174-313)

- **docs/spec/02-lexical-structure/tokens.md**
  - Add note about keywords in field positions

- **docs/spec/02-lexical-structure/operators.md**
  - Update DOT operator description for field access

- **docs/spec/.agent-map.md** (REQUIRED)
  - Must add query for keyword field names
  - Per spec maintenance rules

- **.claude/VIBEFUN_AI_CODING_GUIDE.md** (REQUIRED)
  - Must update when syntax changes
  - Add to patterns and gotchas sections

## Parser Behavior After Phase 1

### How Field Names Are Now Parsed

All field name parsing now uses the `expectFieldName()` helper:

```typescript
const { name: fieldName, loc: fieldLoc } = parser.expectFieldName("context description");
```

This helper accepts both `IDENTIFIER` and `KEYWORD` tokens and appears in **6 locations**:
1. Record construction (normal fields) - `parse-expressions.ts:1602`
2. Record construction (update fields) - `parse-expressions.ts:1533`
3. Field access (after DOT) - `parse-expressions.ts:567`
4. Record patterns - `parse-patterns.ts:260`
5. Record type definitions - `parse-types.ts:161`
6. Record type definitions - `parse-declarations.ts:419`

### Token Flow (Before Phase 1)

1. Lexer sees `type` in source
2. Lexer calls `readIdentifier()`
3. `readIdentifier()` checks if it's a keyword
4. Keyword detected → returns `{ type: "KEYWORD", keyword: "type", value: "type", ... }`
5. ❌ Parser expects `IDENTIFIER` → error

### Token Flow (After Phase 1)

1. Lexer sees `type` in source
2. Lexer calls `readIdentifier()`
3. `readIdentifier()` checks if it's a keyword
4. Keyword detected → returns `{ type: "KEYWORD", keyword: "type", value: "type", ... }`
5. ✅ Parser accepts `KEYWORD` via `expectFieldName()` → success

### Why Lexer Doesn't Need Changes

The lexer already:
- Identifies keywords correctly
- Stores the keyword string in both `keyword` and `value` fields
- Preserves location information

The parser now accepts `KEYWORD` tokens in field positions via the `expectFieldName()` helper.

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

### Decision 5: Module vs Field Access Disambiguation

**Question**: How is `keyword.field` disambiguated between module access and field access?

**Answer**: Keywords cannot be module names (already enforced by language), so any `keyword.field` must be field access on a variable. This is unambiguous.

**Examples**:
```vibefun
let type = { name: "User" }
type.name  // Unambiguous: field access on variable 'type'

// Cannot do:
module type { ... }  // ERROR: 'type' is a keyword, can't be module name
```

**Impact**: No ambiguity. Document this in spec for clarity.

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

### Chained Field Access

```vibefun
// Should work: chained access with keywords
node.type
node.outer.type
node.outer.type.value
config.import.export.type  // All keywords!
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

### Generic Types with Keyword Fields

```vibefun
// Should work: generics with keyword fields
type Box<T> = { type: String, value: T }
let box: Box<Int> = { type: "int-box", value: 42 }
```

### Let-Binding Destructuring (if supported)

```vibefun
// Need to verify behavior:
let { type: nodeType, value } = node
// Should work - explicit syntax

let { type } = node
// ERROR - shorthand with keyword (same as match patterns)
```

## Implementation Notes

### Order of Changes

1. Add `expectFieldName()` helper to parser-base.ts or parse-expressions.ts
2. Update record expression parsing - construction (location 1)
3. Update record expression parsing - updates (location 2)
4. Update field access parsing (location 3)
5. Update record pattern parsing (location 4)
6. Update record type parsing (location 5)
7. Add shorthand validation error
8. Add tests (unit, integration, field access, edge cases)
9. Update specs (8 files total)

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

- All 20 keywords work as field names in all 5 parser contexts
- Field access works with keywords (simple and chained)
- Clear error for shorthand with keyword
- Module vs field access is unambiguous and documented
- All existing tests still pass
- New tests achieve >95% coverage of changed code
- Desugarer and type checker integration verified
- All 8 documentation files updated correctly
- Spec examples are clear and comprehensive
- Zero regressions in `npm run verify`
