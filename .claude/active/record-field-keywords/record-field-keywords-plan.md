# Record Field Keywords Plan

**Feature**: Allow language keywords to be used as record field names

**Date Created**: 2025-11-22

## Overview

Enable Vibefun to accept language keywords (e.g., `type`, `match`, `if`, `import`) as field names in records, patterns, and type definitions. This improves JavaScript interop and ergonomics when working with JavaScript objects that use reserved words as property names.

## Motivation

JavaScript frequently uses reserved words as object properties:
```javascript
// Common in JavaScript/TypeScript
const node = { type: "BinaryOp", value: "+" };
const config = { import: "./file.js", export: ["default"] };
```

Currently, Vibefun cannot express these patterns because the parser only accepts `IDENTIFIER` tokens as field names, but keywords are lexed as `KEYWORD` tokens.

## Design

### What Works

```vibefun
// ✅ Explicit field syntax with keywords
type ASTNode = { type: String, value: String }
let node = { type: "BinaryOp", value: "+" }
let kind = node.type

// ✅ Pattern matching
match node {
    | { type: "BinaryOp", value } => handleBinaryOp(value)
    | { type, _ } => handleOther(type)
}
```

### What Doesn't Work (By Design)

```vibefun
// ❌ Shorthand syntax requires identifiers (can't have variable named 'type')
let type = "User";  // ERROR: 'type' is a keyword
let record = { type };  // ERROR: no variable 'type' exists

// ✅ Solution: use explicit syntax
let typeValue = "User";
let record = { type: typeValue };
```

### Rationale

Keywords cannot be variable names in Vibefun (and shouldn't be), so shorthand `{ type }` would try to reference a non-existent variable. This is the same behavior as JavaScript and other languages - reserved words can be object keys but not variable names.

## Implementation Strategy

### Parser Changes Only

The implementation requires **only parser changes** - no lexer, AST, or type system modifications:

1. **Lexer**: Already correctly tokenizes keywords - no changes needed
2. **AST**: Field names are already stored as strings - no changes needed
3. **Parser**: Update 4 locations to accept `KEYWORD` tokens as field names

### Parser Locations

All changes are in `packages/core/src/parser/`:

1. **parse-expressions.ts**: Record construction (`{ name: value }`)
   - Line ~1590: Normal record fields
   - Line ~1530: Record update fields

2. **parse-patterns.ts**: Record patterns (`{ name }`)
   - Line ~260: Pattern field names

3. **parse-types.ts**: Record type definitions (`{ name: Type }`)
   - Line ~161: Type field names

### Implementation Approach

Create a helper function `expectFieldName()` that accepts either `IDENTIFIER` or `KEYWORD`:

```typescript
function expectFieldName(parser: ParserBase, context: string): { name: string; loc: Location } {
    const token = parser.peek();

    if (token.type === "IDENTIFIER") {
        parser.advance();
        return { name: token.value as string, loc: token.loc };
    }

    if (token.type === "KEYWORD") {
        parser.advance();
        return { name: token.keyword, loc: token.loc };
    }

    throw parser.error(
        `Expected field name in ${context}`,
        token.loc,
        `Found ${token.type} instead`
    );
}
```

Then replace all `parser.expect("IDENTIFIER", "Expected field name...")` calls in field name positions with `expectFieldName()`.

### Shorthand Validation

For shorthand syntax, keep the existing behavior - only `IDENTIFIER` allowed:

```typescript
// In parseRecordExpr after consuming field token:
if (parser.check("COMMA") || parser.check("RBRACE")) {
    // Shorthand syntax
    if (fieldToken.type === "KEYWORD") {
        throw parser.error(
            `Cannot use keyword '${fieldToken.keyword}' in field shorthand`,
            fieldToken.loc,
            `Use explicit syntax: { ${fieldToken.keyword}: value }`
        );
    }
    // ... existing shorthand logic
}
```

## Testing Strategy

### Unit Tests

Add tests for each parser context:

1. **Record Expressions** (`parse-expressions.test.ts` or new file)
   - Construction with keyword field names
   - Update with keyword field names
   - Shorthand with keyword should error
   - Mixed keywords and identifiers
   - Nested records with keywords

2. **Record Patterns** (`parse-patterns.test.ts` or new file)
   - Pattern matching on keyword fields
   - Partial matching with keywords
   - Nested patterns with keywords

3. **Record Types** (`parse-types.test.ts` or new file)
   - Type definitions with keyword fields
   - Generic types with keyword fields

### Integration Tests

Create `keyword-field-names.test.ts`:
- End-to-end parsing of records with keyword fields
- Field access with keywords
- Pattern matching with keywords
- Type checking with keyword fields

### Example Programs

Add `examples/keyword-fields.vf`:
```vibefun
// Demonstrate the feature with realistic examples
type ASTNode = {
    type: String,
    match: Bool,
    import: String
}

let node = {
    type: "BinaryOp",
    match: true,
    import: "stdlib"
}

match node {
    | { type: "BinaryOp", match: true } => "matched binary op"
    | { type, _ } => "other: " & type
}
```

## Spec Updates

Update the following spec files to document keyword field names:

1. **docs/spec/03-type-system/record-types.md**
   - Add section: "Keywords as Field Names"
   - Show examples with explicit syntax
   - Document shorthand limitation
   - Explain rationale (JavaScript interop)

2. **docs/spec/04-expressions/data-literals.md**
   - Update record expression examples
   - Show keyword fields in construction
   - Show keyword fields in updates
   - Document shorthand limitation

3. **docs/spec/05-pattern-matching/data-patterns.md**
   - Update record pattern examples
   - Show keyword fields in patterns
   - Document shorthand limitation

4. **docs/spec/02-lexical-structure/tokens.md** (optional)
   - Add note about keywords in field positions

## Error Messages

Ensure clear error messages:

```
// When using keyword in shorthand:
Error: Cannot use keyword 'type' in field shorthand
  --> example.vf:3:7
  |
3 | let record = { type };
  |                ^^^^ keyword cannot be used as variable name
  |
  = help: Use explicit syntax: { type: value }

// When field access fails:
Error: Type { name: String } does not have field 'type'
  --> example.vf:5:10
  |
5 | person.type
  |        ^^^^ field not found
```

## Risks and Mitigations

### Risk: Confusion about shorthand

**Mitigation**: Clear error message explaining the limitation and suggesting explicit syntax.

### Risk: Breaking changes

**Mitigation**: This is purely additive - no existing valid code breaks.

### Risk: Spec ambiguity

**Mitigation**: Comprehensive spec updates with examples showing what works and what doesn't.

## Success Criteria

1. ✅ All 20 keywords can be used as field names in explicit syntax
2. ✅ Field access works: `obj.type`, `obj.match`, etc.
3. ✅ Pattern matching works: `{ type: "value" }`
4. ✅ Type definitions work: `type T = { type: String }`
5. ✅ Shorthand with keyword produces clear error
6. ✅ All tests pass (unit, integration, examples)
7. ✅ Spec updated with examples
8. ✅ `npm run verify` passes (check, lint, test, format)

## Implementation Phases

### Phase 1: Parser Implementation
- Create `expectFieldName()` helper
- Update record expression parsing
- Update record pattern parsing
- Update record type parsing
- Add shorthand validation with error

### Phase 2: Testing
- Unit tests for each parser context
- Integration tests for end-to-end scenarios
- Example programs demonstrating feature

### Phase 3: Documentation
- Update language spec files
- Add examples to spec
- Document limitations (shorthand)

### Phase 4: Quality Assurance
- Run full test suite
- Run verification checks
- Verify error messages are clear
- Review generated code (codegen tests)

## Timeline

No timeline estimates - work proceeds in phases as outlined above.

## Notes

- This change is purely syntactic - no runtime or semantic changes
- Code generation should work unchanged (field names are just strings)
- Type checking should work unchanged (field names are just strings)
- This aligns with JavaScript, TypeScript, Python, Rust behavior
