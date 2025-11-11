# Test 2: Missing Comma in Record Error

## Test Location
`packages/core/src/parser/parser-errors.test.ts:241-245`

## Test Description
```typescript
it("reports error for missing comma in record", () => {
    const error = expectParseError("let x = { x: 1 y: 2 }");
    expect(error.message).toBeDefined();
    expect(error.message.length).toBeGreaterThan(0);
});
```

## Expected Behavior
The parser should throw an error when parsing `{ x: 1 y: 2 }` (two fields on the same line without a comma separator).

## Actual Behavior
The parser currently does NOT throw an error. It successfully parses this as a valid record.

## Root Cause Analysis

### Parser Logic (parser.ts:1388-1447)
The record parsing logic has several features that interact in complex ways:

1. **Shorthand field syntax**: `{ name }` → `{ name: name }`
2. **Multi-line support**: Fields can be on separate lines without commas
3. **Shorthand detection**: Checks if next token is COMMA, RBRACE, or IDENTIFIER

### The Problem
The shorthand detection at line 1398-1401:
```typescript
if (
    this.check("COMMA") ||
    this.check("RBRACE") ||
    this.check("IDENTIFIER")  // <-- This is the issue
) {
    // Shorthand: { name } → { name: Var(name) }
```

When parsing `{ x: 1 y: 2 }`:
1. Parser sees `x`, expects COLON or shorthand indicator
2. After `:`, it's not shorthand, so it parses the value `1`
3. After parsing `1`, it skips newlines (line 1428)
4. Checks for COMMA or continues if next token is IDENTIFIER
5. The logic at line 1442 allows continuing if IDENTIFIER is found

### Why It's Complex

#### Conflict 1: ASI (Automatic Semicolon Insertion)
Multi-line records are valid without commas:
```vibefun
{
  x: 1
  y: 2
}
```

This is shown in `asi.test.ts:107-120`:
```typescript
it("should NOT insert semicolon inside record literal", () => {
    const module = parseModule(`
let point = {
  x: 1
  y: 2
}
    `);
    expect(module.declarations).toHaveLength(1);
```

#### Conflict 2: Shorthand Syntax
Shorthand fields can be newline-separated:
```vibefun
{
  name
  age
  active
}
```

This is shown in `record-shorthand.test.ts:95-104`.

#### Conflict 3: Mixed Shorthand and Regular Fields
```vibefun
{
  name
  age: 30
  active
}
```

This is shown in `record-shorthand.test.ts:106-115`.

### The Challenge
The parser needs to distinguish:
- ✅ Valid: `{ x: 1\n y: 2 }` (newline separator)
- ✅ Valid: `{ x: 1, y: 2 }` (comma separator)
- ✅ Valid: `{ x\n y }` (shorthand with newline)
- ❌ Invalid: `{ x: 1 y: 2 }` (same line, no comma)

But the parser consumes newlines during expression parsing, making it difficult to determine if there was originally a newline between fields.

## Attempted Fixes

### Attempt 1: Check for IDENTIFIER without COMMA
```typescript
} else if (this.check("IDENTIFIER")) {
    throw this.error("Expected ',' between record fields", ...);
}
```

**Result**: Broke shorthand multi-line syntax (8 new test failures)

### Attempt 2: Track if field is shorthand
```typescript
let isShorthand = false;
if (this.check("COMMA") || this.check("RBRACE") || this.check("NEWLINE")) {
    isShorthand = true;
    // ... shorthand handling
}
// Later:
if (this.check("IDENTIFIER") && !isShorthand && !hadNewline) {
    throw error;
}
```

**Result**: Still broke tests because `parseExpression()` consumes trailing newlines

### Attempt 3: Use line numbers to detect newlines
```typescript
const nextTokenLine = this.peek().loc.start.line;
const fieldStartLine = fieldToken.loc.start.line;
if (nextTokenLine > fieldStartLine) {
    hadNewline = true;
}
```

**Result**: 49 test failures (catastrophic regressions)

## What Would Be Needed to Fix

### Option 1: Stricter Token Lookahead
Track whether newlines were consumed between parsing a field value and seeing the next token. This would require:
- Saving position/line before calling `parseExpression()`
- Checking if current position is on a different line after
- Using this to determine if comma is required

### Option 2: Redesign Record Syntax Rules
Simplify the grammar to require commas between all regular fields, even on separate lines. This would:
- Break existing ASI test expectations
- Require updating language specification
- Need user input on desired semantics

### Option 3: Context-Sensitive Parsing
Pass context to `parseExpression()` to avoid consuming trailing newlines in record context. This would:
- Require refactoring expression parsing
- Add complexity to maintain context through parser
- Potentially affect other parts of the grammar

## Recommendation

**This test may need to be reconsidered or marked as known issue.** The conflict between:
- Multi-line records without commas (ASI)
- Shorthand syntax with newlines
- Detecting same-line missing commas

...suggests a fundamental tension in the grammar. The test expectation may be at odds with the language design.

**Before fixing**: Clarify language spec whether `{ x: 1 y: 2 }` (same line) should be:
1. An error (current test expectation)
2. Parsed as two fields (current parser behavior, aligns with ASI)
3. Subject to ASI rules (newline required, not space)

## Status
**Deferred** - Needs design decision before implementation.
