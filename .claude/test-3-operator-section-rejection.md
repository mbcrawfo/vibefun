# Test 3: Operator Section Rejection

## Test Location
`packages/core/src/parser/operator-sections.test.ts:129-132`

## Test Description
```typescript
it("should reject (- x) right section", () => {
    const error = expectParseError("let f = (- x)");
    expect(error).toBeDefined();
});
```

## Expected Behavior
The parser should reject `(- x)` (minus operator with space before identifier) as an invalid operator section.

## Actual Behavior
The parser does NOT throw an error. It successfully parses this as unary negation: `(-x)`.

## Root Cause Analysis

### Parser Logic (parser.ts:970-985)
The `parseLambdaOrParen()` method has special handling for operator sections:

```typescript
if (this.isOperatorToken()) {
    const nextToken = this.peek(1);
    if (nextToken.type === "RPAREN") {
        // Throw error for bare operator section like (+)
    }
    // Fall through for unary operators like (-x) or (!flag)
}
```

The comment at line 983 explicitly says:
> "If followed by an identifier or expression, it might be unary like (-x) or (!flag)"

### The Fundamental Problem
The parser cannot distinguish between:
- `(-x)` - Valid unary negation (no space in source)
- `(- x)` - Invalid right operator section (with space in source)

**Why**: The lexer has already tokenized both as the same sequence:
```
LPAREN, OP_MINUS, IDENTIFIER, RPAREN
```

The whitespace information is lost during lexing.

## Test Suite Context

### What Operator Sections Are
Operator sections are partial applications of operators (common in Haskell):
- `(+ 1)` - right section: `\x -> x + 1`
- `(1 +)` - left section: `\x -> 1 + x`
- `(+)` - bare section: the operator as a function

### Vibefun's Design Decision
According to `operator-sections.test.ts`, Vibefun **rejects all operator sections**:
- ❌ `(+)` - bare operator
- ❌ `(+ 1)` - right section
- ❌ `(1 +)` - left section

The tests suggest users should use lambdas instead:
```vibefun
// Instead of (+ 1), use:
(x) => x + 1
```

### Valid Alternatives
The parser correctly allows:
- ✅ `(-x)` - unary negation
- ✅ `(!flag)` - logical not
- ✅ `(x + y)` - regular binary expression

## Why This Test May Be Impossible

### Token Sequence Ambiguity
Both valid and invalid syntax have identical token sequences:

| Source Code | Tokens | Interpretation |
|------------|---------|---------------|
| `(-x)` | `LPAREN, OP_MINUS, IDENTIFIER, RPAREN` | ✅ Unary negation |
| `(- x)` | `LPAREN, OP_MINUS, IDENTIFIER, RPAREN` | ❌ Invalid right section |

The lexer discards whitespace, so the parser sees the same input.

### Potential Solutions

#### Option 1: Preserve Whitespace in Tokens
Add a `hasLeadingSpace: boolean` field to tokens:
```typescript
interface Token {
    type: TokenType;
    value: unknown;
    loc: Location;
    hasLeadingSpace?: boolean;  // <-- New field
}
```

**Pros**: Parser could distinguish `(-x)` from `(- x)`
**Cons**:
- Major lexer refactoring
- Increased token size
- Whitespace sensitivity may cause confusion

#### Option 2: Require Parentheses for Unary in This Context
Reject all `(- identifier)` patterns in parenthesized contexts:
```vibefun
// Require:
let f = (-(x))     // ✅ Double parens make negation explicit
let f = (\y -> -y) // ✅ Use lambda instead

// Reject:
let f = (-x)  // ❌ Ambiguous with operator section
```

**Pros**: Clear disambiguation
**Cons**:
- Breaks existing valid code
- Inconvenient for users
- Other contexts (tuples, lists) need similar rules

#### Option 3: Allow Operator Sections
Change the language design to allow operator sections:
```vibefun
let addOne = (+ 1)      // ✅ Right section
let subtractFrom5 = (5 -) // ✅ Left section
```

**Pros**:
- Consistent with functional languages (Haskell, OCaml)
- Elegant partial application
- Makes the distinction matter

**Cons**:
- Unary negation would need special syntax: `(neg x)` or `(negate x)`
- Complicates operator precedence
- Major language design change

#### Option 4: Accept Test Limitation
Acknowledge that `(- x)` vs `(-x)` distinction is impossible without whitespace tracking, and:
- Keep rejecting bare operator sections: `(+)`, `(*)`, etc.
- Accept that unary cases cannot be rejected
- Update/skip this specific test
- Document the limitation

## Similar Tests
The test suite has 31 operator section tests:
- ✅ 30 passing (correctly reject bare operators and most sections)
- ❌ 1 failing (this one: `(- x)`)

All other tests reject patterns that are unambiguous:
- `(+)` - no operands
- `(+ 1)` - literal on right (not variable)
- `(1 +)` - literal on left

Only `(- x)` and similar variable cases are ambiguous with unary operators.

## Recommendation

**Option 4** (Accept limitation) seems most pragmatic:

1. **Skip or update this test** to reflect parser limitations
2. **Document** that unary operator cases `(-x)`, `(!flag)` cannot be rejected without whitespace tracking
3. **Keep** rejection of unambiguous operator sections: `(+)`, `(+ 1)`, `(1 +)`, etc.
4. **Add documentation** explaining the difference between rejected operator sections and allowed unary operators

### Alternative
If whitespace sensitivity is desired for the language overall, **Option 1** (preserve whitespace in tokens) could be considered, but this is a major architectural change affecting the entire lexer and parser.

## Status
**Needs design decision** - Cannot be fixed without:
1. Whitespace-sensitive lexing, or
2. Rejecting all unary operators in parens (breaking change), or
3. Allowing operator sections (major language feature), or
4. Accepting the limitation and updating the test
