# Parser Architecture

**Created:** 2025-11-03
**Status:** Complete
**Related:** Parser completion implementation (Phases 0-4)

## Overview

This document describes the architecture and design decisions of the vibefun parser, focusing on disambiguation strategies, precedence handling, and key implementation patterns.

## Parser Type

**Recursive Descent Parser**
- Hand-written (not generated)
- Predictive parsing with limited lookahead
- Pratt-style precedence climbing for binary operators
- Class-based implementation for state management

## Core Design Principles

1. **Clarity over cleverness** - Parser code should be readable and maintainable
2. **Error recovery** - Provide helpful error messages with location information
3. **Spec fidelity** - Implementation must match vibefun-spec.md exactly
4. **Performance** - Fast enough for interactive development
5. **Correctness** - Prefer correctness over speed optimization

## Disambiguation Strategies

### 1. Postfix `!` vs Prefix `!`

**Challenge:** The `!` token has two meanings depending on position:
- Prefix: Logical NOT operator (`!true` → `false`)
- Postfix: Dereference operator for mutable references (`ref!` → value)

**Solution:** Context-based parsing in different methods

```typescript
// Prefix ! - parsed in parseUnary()
private parseUnary(): Expr {
    if (this.match("BANG")) {
        const expr = this.parseUnary(); // recursive for chains like !!x
        return { kind: "UnaryOp", op: "LogicalNot", expr, loc };
    }
    return this.parseCall();
}

// Postfix ! - parsed in parseCall()
private parseCall(): Expr {
    let expr = this.parsePrimary();
    while (true) {
        if (this.match("BANG")) {
            expr = { kind: "UnaryOp", op: "Deref", expr, loc: expr.loc };
        } else break;
    }
    return expr;
}
```

**Precedence:**
- Postfix `!` has higher precedence (level 14 - same as function calls and field access)
- Prefix `!` has lower precedence (level 13 - unary operators)

**Examples:**
```vibefun
!x      // LogicalNot(Var("x"))
x!      // Deref(Var("x"))
!x!     // LogicalNot(Deref(Var("x"))) - postfix binds first
!!x     // LogicalNot(LogicalNot(Var("x"))) - prefix NOT twice
x!!     // Deref(Deref(Var("x"))) - postfix deref twice
```

**Spec Reference:** vibefun-spec.md lines 256-263, 1548-1573

### 2. Block vs Record Disambiguation

**Challenge:** Both blocks and records use curly braces `{ }`:
- Block: `{ let x = 1; x + 2 }` - sequence of statements with result
- Record: `{ x: 1, y: 2 }` - data structure with fields
- Record Update: `{ ...base, x: 1 }` - record with spread

**Solution:** Multi-strategy lookahead and keyword detection

**Strategy 1: Keyword detection**
```typescript
if (this.check("KEYWORD")) {
    const keyword = this.peek().value as string;
    if (["if", "match", "unsafe"].includes(keyword)) {
        return this.parseBlockExpr(startLoc);
    }
}
```
- Keywords like `if`, `match`, `unsafe` only appear in blocks

**Strategy 2: Spread detection**
```typescript
if (this.check("DOT_DOT_DOT")) {
    return this.parseRecordExpr(startLoc); // Record update
}
```
- Spread operator `...` indicates record update

**Strategy 3: Colon detection**
```typescript
if (this.check("IDENTIFIER") && this.peek(1).type === "COLON") {
    return this.parseRecordExpr(startLoc); // Record construction
}
```
- Pattern `identifier:` indicates record field

**Strategy 4: Semicolon detection**
- Parse first expression
- If followed by `;` → block
- Otherwise → error or single-expression result

**Empty braces:** `{}` is treated as empty record (existing behavior)

**Spec Reference:** vibefun-spec.md lines 404-407 (records), 494-513 (blocks)

### 3. Generic Type Arguments vs Bit Shift

**Challenge:** `>>` can be:
- End of nested generic: `List<List<Int>>`
- Bit shift operator: `x >> 2`

**Solution:** Token splitting in lexer and parser context

**Lexer Strategy:**
- Initially tokenize `>>` as single `RIGHT_SHIFT` token
- Parser requests split when needed for generics

**Parser Strategy:**
```typescript
// In type parsing, >> is split into two > tokens
parseGenericType() {
    // List<List<Int>>
    //               ^^ split into > >
}
```

**Context:**
- In type expression context: treat `>>` as two `>` closers
- In expression context: treat `>>` as right shift operator

**Note:** Current implementation may not have full splitting logic - verify implementation details.

**Spec Reference:** vibefun-spec.md lines 1095-1130 (type syntax)

### 4. Record Update Syntax Migration

**Historical Note:** Parser originally used pipe syntax `{ record | field: value }`

**Current Syntax:** Spread-based `{ ...record, field: value }`

**Design Decision:** Use spread syntax to match:
- JavaScript/TypeScript familiarity
- Spec definition (vibefun-spec.md lines 404-407)
- Modern functional language trends

**Migration:** Completed in Phase 0 of parser completion (2025-11-02)

## Spread Operator Parsing

### Record Spreads

**Syntax:**
```vibefun
{ ...base, x: 1 }                    // Update with one field
{ ...a, ...b, x: 1 }                 // Multiple spreads
{ ...record }                        // Shallow copy
```

**Semantics:**
- **Rightmost wins:** Later fields/spreads override earlier ones
- **JavaScript semantics:** Matches JS spread operator behavior
- Example: `{ ...a, x: 1, ...b }` - if `b` has field `x`, it overrides the explicit `x: 1`

**AST Structure:**
```typescript
// Record construction
{ kind: "Record"; fields: RecordField[]; loc: Location }

// Record update (when spread present)
{ kind: "RecordUpdate"; record: Expr; updates: RecordField[]; loc: Location }

// RecordField is a union:
type RecordField =
    | { kind: "Field"; name: string; value: Expr; loc: Location }
    | { kind: "Spread"; expr: Expr; loc: Location }
```

**Multiple Spreads Implementation:**
- Uses flat array of `RecordField` elements in `updates`
- Spreads are added as `Spread` elements
- Order in array determines precedence (rightmost wins)
- Simpler than nested `RecordUpdate` nodes

**Example AST:**
```vibefun
{ ...a, x: 1, ...b }
```
→
```typescript
{
    kind: "RecordUpdate",
    record: Var("a"),
    updates: [
        { kind: "Field", name: "x", value: IntLiteral(1) },
        { kind: "Spread", expr: Var("b") }
    ]
}
```

**Spec Reference:** vibefun-spec.md lines 404-407

### List Spreads

**Syntax:**
```vibefun
[1, 2, ...rest]                      // Spread at end
[...start, 3, 4]                     // Spread at start
[...a, ...b, ...c]                   // Multiple spreads
```

**AST Structure:**
```typescript
// List expression
{ kind: "List"; elements: ListElement[]; loc: Location }

// ListElement is a union:
type ListElement =
    | { kind: "Element"; expr: Expr }
    | { kind: "Spread"; expr: Expr }
```

**Implementation:**
- Check for `DOT_DOT_DOT` token before each element
- Create `Spread` or `Element` accordingly
- Support any number of spreads at any position

**Note:** AST structure already supported spreads - parser just needed implementation

**Spec Reference:** vibefun-spec.md lines 687-689

## Precedence and Associativity

**Pratt-style Precedence Climbing:**
- Each binary operator has a binding power (precedence level)
- Left vs right associativity handled via precedence adjustments

**Precedence Table (Highest to Lowest):**

| Level | Operators | Associativity | Note |
|-------|-----------|---------------|------|
| 14 | `()` `.` `!` (postfix) | Left | Function call, field access, deref |
| 13 | `!` `-` (prefix) | Right | Logical NOT, negation |
| 12 | `*` `/` `%` | Left | Multiplicative |
| 11 | `+` `-` | Left | Additive |
| 10 | `<<` `>>` | Left | Bit shift |
| 9 | `<` `<=` `>` `>=` | Left | Comparison |
| 8 | `==` `!=` | Left | Equality |
| 7 | `&` | Left | Bitwise AND |
| 6 | `^` | Left | Bitwise XOR |
| 5 | `\|` | Left | Bitwise OR |
| 4 | `&&` | Left | Logical AND |
| 3 | `\|\|` | Left | Logical OR |
| 2 | `\|>` | Left | Pipe forward |
| 1 | `>>` (composition) | Right | Function composition |
| 0 | `:=` | Right | Reference assignment |

**Key Decisions:**
- Pipe `|>` has low precedence (level 2) - encourages use without parentheses
- Composition `>>` has lowest precedence (level 1) - binds entire expressions
- RefAssign `:=` has lowest precedence (level 0) - assignment is a statement-like operation
- Postfix operators bind tightest (level 14) - consistent with most languages

**Spec Reference:** vibefun-spec.md lines 1548-1573

## Expression Parsing Order

**Top to Bottom (Lowest to Highest Precedence):**

```
parseExpression()              // Entry point
  └─> parsePipe()              // |> (level 2)
        └─> parseComposition() // >> (level 1)
              └─> parseRefAssign() // := (level 0)
                    └─> parseLogicalOr() // || (level 3)
                          └─> parseLogicalAnd() // && (level 4)
                                └─> parseBitwiseOr() // | (level 5)
                                      └─> parseBitwiseXor() // ^ (level 6)
                                            └─> parseBitwiseAnd() // & (level 7)
                                                  └─> parseEquality() // == != (level 8)
                                                        └─> parseComparison() // < <= > >= (level 9)
                                                              └─> parseBitShift() // << >> (level 10)
                                                                    └─> parseAdditive() // + - (level 11)
                                                                          └─> parseMultiplicative() // * / % (level 12)
                                                                                └─> parseUnary() // ! - (prefix) (level 13)
                                                                                      └─> parseCall() // () . ! (postfix) (level 14)
                                                                                            └─> parsePrimary() // literals, identifiers, etc.
```

**Why this order?**
- Lower precedence operators at the top
- Recursively calls higher precedence parsers
- Ensures correct operator binding

## Error Handling

**Philosophy:**
- **Fail fast:** Parser throws on first error (no recovery)
- **Helpful messages:** Clear, actionable error messages
- **Location info:** Always include line/column information
- **Suggestions:** Provide hints when possible

**Error Message Examples:**

```typescript
// Empty spread
"Expected expression after spread operator '...' in record"

// Missing delimiter
"Expected '}' after record fields"

// Type mismatch (from type checker, not parser)
"Type mismatch: expected Int, got String"
```

**Error Classes:**
- `ParserError` - Syntax errors during parsing
- `LexerError` - Invalid tokens (from lexer)
- `TypeError` - Type checking errors (from type checker)

**Location Tracking:**
- Every AST node has `loc: Location` field
- Location includes: filename, line, column, source excerpt
- Enables precise error reporting in downstream phases

## Pattern Matching

**Exhaustiveness Checking:**
- Parser constructs match expression AST
- Type checker verifies exhaustiveness
- Matrix-based algorithm (separate from parser)

**Pattern Types Supported:**
1. Wildcard: `_`
2. Variable binding: `x`
3. Integer literal: `42`
4. String literal: `"hello"`
5. Boolean literal: `true`, `false`
6. Variant constructor: `Some(x)`
7. Record pattern: `{ x, y }`
8. List pattern: `[x, ...rest]`
9. Or pattern: `Some(x) | None`

**Parser Role:**
- Parse pattern syntax into AST
- Handle nesting and composition
- Validate basic syntax
- Type checker handles semantic validation

**Spec Reference:** vibefun-spec.md lines 843-958

## Module System

**Declarations Supported:**

1. **Import:**
   - Named: `import { x, y } from "./mod"`
   - Namespace: `import * as Mod from "./mod"`
   - Type: `import { type T } from "./mod"`

2. **Export:**
   - Named: `export { x, y }`
   - Inline: `export let x = 1`
   - Type: `export { type T }`

3. **Re-export:**
   - Named: `export { x, y } from "./mod"`
   - Namespace: `export * from "./mod"`
   - Type: `export { type T } from "./mod"`

**AST Design Decision:**
- Separate `ReExportDeclaration` node (not extending `ExportDeclaration`)
- Cleaner separation of concerns
- Easier for downstream phases

**Re-export AST:**
```typescript
{
    kind: "ReExportDecl";
    items: ImportItem[] | null;  // null for export *
    from: string;
    loc: Location;
}
```

**Note:** `exported: boolean` field was considered but rejected as redundant (node kind already indicates exported)

**Spec Reference:** vibefun-spec.md lines 995-1046

## Type Expression Parsing

**Type Syntax:**
- Primitives: `Int`, `String`, `Bool`, `Float`, `Unit`
- Type variables: `T`, `A`, `B`
- Functions: `(Int) -> String`, `(Int, String) -> Bool`
- Generics: `List<Int>`, `Option<String>`
- Records: `{ x: Int, y: String }`
- Variants: (defined separately via `type` declarations)

**Arrow Function Types:**
- Single param: `(Int) -> String`
- Multiple params: `(Int, String) -> Bool`
- Curried representation in AST

**Generic Type Arguments:**
- Syntax: `Type<A, B, C>`
- Parser handles `<` `>` delimiters
- May need `>>` splitting for nested generics

**Spec Reference:** vibefun-spec.md lines 1095-1130

## Design Decisions Log

### Decision: Record Spread Syntax

**Date:** 2025-11-02

**Question:** Use pipe syntax `{ r | f: v }` or spread syntax `{ ...r, f: v }`?

**Decision:** ✅ Spread syntax

**Rationale:**
- Matches vibefun-spec.md (source of truth)
- Familiar to JavaScript/TypeScript developers
- Aligns with modern language trends
- More intuitive for developers coming from web background

**Trade-off:** Breaking change for existing code
**Mitigation:** Pre-1.0, so breaking changes acceptable

### Decision: Multiple Spread Handling

**Date:** 2025-11-02

**Question:** How to represent `{ ...a, ...b, x: 1 }` in AST?

**Options:**
1. Nested `RecordUpdate` nodes
2. Flat array of `RecordField` (Field | Spread)

**Decision:** ✅ Flat array approach (Option 2)

**Rationale:**
- Simpler AST structure
- Easier to implement in parser
- Order preservation in array
- Desugarer can handle semantics

**Implementation:**
```typescript
updates: RecordField[]  // Array of Field | Spread
```

### Decision: Spread-Only Records

**Date:** 2025-11-02

**Question:** Should `{ ...obj }` with no fields be allowed?

**Decision:** ✅ Yes, allow it

**Rationale:**
- Enables shallow copy use case
- Matches JavaScript semantics
- Pragmatic for functional programming
- Consistent with vibefun's practical approach

**AST:** `RecordUpdate(obj, [])` with empty updates array

### Decision: ReExportDeclaration Node

**Date:** 2025-11-02

**Question:** Extend `ExportDeclaration` or create new node?

**Decision:** ✅ Create new `ReExportDeclaration` node

**Rationale:**
- Cleaner separation of concerns
- No optional fields mixing concepts
- Easier for downstream to distinguish
- More explicit AST structure

**Rejected:** `exported: boolean` field (redundant with node kind)

### Decision: Parser Error Recovery

**Question:** Should parser attempt error recovery?

**Decision:** ✅ No recovery - fail fast

**Rationale:**
- Simpler implementation
- Clearer error messages
- Fast feedback loop in development
- May add recovery later if needed

**Trade-off:** Only reports first error per parse

## Testing Strategy

**Test Categories:**

1. **Unit Tests** - Individual parser methods
   - Expression parsing
   - Pattern parsing
   - Type parsing
   - Declaration parsing

2. **Integration Tests** - Complete programs
   - Multi-feature combinations
   - Realistic use cases
   - 50-100 line programs

3. **Error Tests** - Malformed syntax
   - Missing delimiters
   - Invalid tokens
   - Unexpected keywords
   - Helpful error messages

4. **Edge Cases** - Boundary conditions
   - Deep nesting
   - Large literals
   - Unicode handling
   - Operator precedence

**Test Count:**
- Baseline: ~346 parser tests
- After completion: ~441 parser tests
- Total project: ~1,864 tests

**Coverage Goal:** 90%+ code coverage

## Performance Considerations

**Current Approach:**
- No premature optimization
- Correctness over speed
- Linear scan for most operations

**Future Optimizations:**
- Memoization for repeated lookups
- Better error recovery
- Incremental parsing for IDE integration

**Benchmarks:** Not yet measured

## Future Enhancements

**Potential Improvements:**

1. **Better Error Recovery**
   - Attempt to continue parsing after errors
   - Report multiple errors per parse
   - Smarter synchronization points

2. **Incremental Parsing**
   - Re-parse only changed sections
   - Enable fast IDE responsiveness
   - LSP (Language Server Protocol) integration

3. **Source Maps**
   - Preserve mapping from source to AST
   - Enable better debugging
   - Support code generation

4. **Comments in AST**
   - Attach comments to AST nodes
   - Enable documentation generation
   - Preserve formatting

5. **Performance Optimization**
   - Benchmark and profile
   - Optimize hot paths
   - Consider parser generator for speed

## References

### Specification
- **vibefun-spec.md** - Complete language specification
  - Lines 404-407: Record spreads
  - Lines 687-689: List spreads
  - Lines 256-263: Ref operations (`:=` and `!`)
  - Lines 995-1046: Module system
  - Lines 843-958: Pattern matching
  - Lines 1095-1130: Type syntax
  - Lines 1548-1573: Operator precedence

### Implementation Files
- **packages/core/src/parser/parser.ts** - Main parser implementation
- **packages/core/src/types/ast.ts** - AST type definitions
- **packages/core/src/lexer/lexer.ts** - Tokenization

### Design Documents
- **docs/spec/** - Language specification (see 01-introduction.md for design philosophy)
- **docs/spec/03-type-system/** - Type system specification (inference, generics, type checking)
- **.claude/active/parser-completion/** - Parser completion plan and context

### Test Files
- **packages/core/src/parser/expressions.test.ts** - Expression parsing tests
- **packages/core/src/parser/patterns.test.ts** - Pattern parsing tests
- **packages/core/src/parser/types.test.ts** - Type parsing tests
- **packages/core/src/parser/declarations.test.ts** - Declaration parsing tests
- **packages/core/src/parser/parser-integration.test.ts** - Integration tests
- **packages/core/src/parser/parser-errors.test.ts** - Error handling tests

## Glossary

- **AST:** Abstract Syntax Tree - structured representation of parsed code
- **Pratt Parsing:** Precedence climbing algorithm for operator parsing
- **Recursive Descent:** Top-down parsing strategy using recursive functions
- **Lookahead:** Peeking at future tokens without consuming them
- **Precedence:** Operator binding strength (higher = binds tighter)
- **Associativity:** Whether operators group left-to-right or right-to-left
- **Disambiguation:** Resolving ambiguous syntax using context

---

**Document Status:** ✅ Complete
**Last Updated:** 2025-11-03
**Related Work:** Parser completion (Phases 0-4)
