# Vibefun Parser Implementation Plan v2.0

**Status**: Ready for Implementation
**Created**: 2025-11-09
**Last Updated**: 2025-11-09
**Reviewed By**: Plan subagent (comprehensive review completed)

## Executive Summary

This plan updates the Vibefun parser to implement all requirements specified in `.claude/parser-requirements.md`. Analysis identified 19 issues requiring fixes:
- **8 Critical**: While loops, tuples, match leading pipe, precedence errors, ASI, if-without-else
- **6 Major**: Record shorthand, error recovery, tuple patterns, multi-error collection
- **5 Minor**: Documentation, test coverage, minus disambiguation

## Phase 1: AST Type Updates (Foundation)

### 1.1 Add Missing Expression Types
**File:** `packages/core/src/types/ast.ts`
- Add `Tuple`: `{ kind: "Tuple"; elements: Expr[]; loc: Location }`
- Add `While`: `{ kind: "While"; condition: Expr; body: Expr; loc: Location }`
- Make If.else_ optional: `else_?: Expr` (or keep required and document parser inserts Unit)

### 1.2 Add Missing Pattern Types
**File:** `packages/core/src/types/ast.ts`
- Add `TuplePattern`: `{ kind: "TuplePattern"; elements: Pattern[]; loc: Location }`

### 1.3 Update BinaryOp Type
**Decision:** Change `ListCons` to use `BinOp` with `op: "Cons"` per requirements line 540
- Remove `ListCons` expression from Expr union
- Ensure `BinaryOp` type includes `"Cons"` in the operator list

### 1.4 Update Core AST
**File:** `packages/core/src/types/core-ast.ts`
- Add `CoreTuple`, `CoreWhile` to CoreExpr union
- Add `CoreTuplePattern` to CorePattern union

**Test:** Run type checks after AST updates: `npm run check`

---

## Phase 2: Fix Critical Precedence Issues

### 2.1 Correct Precedence Chain Order
**CRITICAL FIX from review:** RefAssign must come BEFORE TypeAnnotation (lower level = lower precedence)

**Correct order (low to high):**
```
parseExpression()
  → parseRefAssign()          // Level 1: :=
    → parseTypeAnnotation()   // Level 2: expr : Type
      → parsePipe()           // Level 3: expr |> func
        → parseComposition()  // Level 4: f >> g, f << g
          → parseLogicalOr()  // Level 5: ||
            → parseLogicalAnd() // Level 6: &&
              → parseEquality() // Level 9: ==, !=
                → parseComparison() // Level 10: <, <=, >, >=
                  → parseCons() // Level 11: ::
                    → parseConcat() // Level 12: &
                      → parseAdditive() // Level 13: +, -
                        → parseMultiplicative() // Level 14: *, /, %
                          → parseUnary() // Level 15: -, !
                            → parseCall() // Level 16: calls, field access
```

### 2.2 Implementation Changes
**File:** `packages/core/src/parser/parser.ts`

1. **Move parseCons()** from current position (after parsePipe) to after parseComparison
2. **Move parseComposition()** from current position to after parsePipe
3. **Split parseAdditive()** into parseConcat (level 12, &) and parseAdditive (level 13, +/-)
4. **Restructure precedence methods** to match correct order above

**Test:** Parser precedence tests after each move

---

## Phase 3: Implement Missing Expression Features

### 3.1 While Loops
**File:** `packages/core/src/parser/parser.ts` in `parsePrimary()`

Add after unsafe block handling:
```typescript
if (this.check("KEYWORD") && this.peek().value === "while") {
    const startLoc = this.peek().loc;
    this.advance(); // consume 'while'
    const condition = this.parseExpression();
    this.expect("LBRACE", "Expected '{' after while condition");
    const body = this.parseExpression();
    this.expect("RBRACE", "Expected '}' after while body");
    return { kind: "While", condition, body, loc: startLoc };
}
```

### 3.2 Tuple Expressions
**File:** `packages/core/src/parser/parser.ts` in `parseLambdaOrParen()`

Modify to detect tuples:
- Parse comma-separated expressions
- If multiple elements and NOT followed by `=>`: create Tuple
- If single element with trailing comma: error "Tuple must have at least 2 elements"
- Validate minimum 2 elements for tuples

### 3.3 Record Field Shorthand
**File:** `packages/core/src/parser/parser.ts` in `parseRecordExpr()`

**CORRECTED from review:** Handle both normal construction AND update cases

```typescript
// In normal record construction:
const fieldName = this.expect("IDENTIFIER").value as string;
if (this.check("COMMA") || this.check("RBRACE")) {
    // Shorthand: { name } → { name: Var(name) }
    fields.push({
        kind: "Field",
        name: fieldName,
        value: { kind: "Var", name: fieldName, loc: this.peek(-1).loc },
        loc: this.peek(-1).loc,
    });
} else {
    this.expect("COLON");
    // ... existing full syntax handling
}

// Also handle in record update spread case (line 837-850)
```

### 3.4 If Expression Without Else
**File:** `packages/core/src/parser/parser.ts` in `parsePrimary()`

Make else optional:
```typescript
let elseExpr: Expr;
if (this.check("KEYWORD") && this.peek().value === "else") {
    this.advance();
    elseExpr = this.parseExpression();
} else {
    // Parser inserts Unit for missing else branch
    elseExpr = { kind: "UnitLit", loc: this.peek().loc };
}
```

### 3.5 Operator Section Rejection
**File:** `packages/core/src/parser/parser.ts`

Add helper:
```typescript
private isOperatorToken(): boolean {
    return this.check("OP_PLUS") || this.check("OP_MINUS") ||
           this.check("OP_STAR") || this.check("OP_SLASH") ||
           this.check("OP_PERCENT") || this.check("OP_AMPERSAND") ||
           this.check("OP_EQ") || this.check("OP_NEQ") ||
           this.check("OP_LT") || this.check("OP_GT") ||
           this.check("OP_LTE") || this.check("OP_GTE") ||
           this.check("OP_AND") || this.check("OP_OR") ||
           this.check("OP_CONS") || this.check("OP_PIPE_GT");
}
```

In `parseLambdaOrParen()` after consuming LPAREN:
```typescript
if (this.isOperatorToken()) {
    throw this.error(
        `Operator sections are not supported: (${this.peek().value})`,
        this.peek().loc,
        "Use a lambda instead. For (+), write: (x, y) => x + y"
    );
}
```

**Test:** Add tests for all new expression features

---

## Phase 4: Fix Match Expression Issues

### 4.1 Require Leading Pipe for ALL Cases
**File:** `packages/core/src/parser/parser.ts` in `parseMatchExpr()`

**CORRECTED from review:** Complete loop restructure needed

```typescript
// Parse match cases - skip leading newlines
while (this.match("NEWLINE"));

// ALL cases require leading pipe (including first)
while (!this.check("RBRACE") && !this.isAtEnd()) {
    // Require pipe for every case
    this.expect("PIPE", "Match case must begin with '|'");

    // Parse pattern, guard, body
    const pattern = this.parsePattern();
    let guard: Expr | undefined;
    if (this.check("KEYWORD") && this.peek().value === "when") {
        this.advance();
        guard = this.parseLogicalAnd();
    }
    this.expect("FAT_ARROW", "Expected '=>' after match pattern");
    const body = this.parseLogicalAnd();

    cases.push({ pattern, guard, body, loc: pattern.loc });
    while (this.match("NEWLINE"));
}

// Validate at least one case
if (cases.length === 0) {
    throw this.error(
        "Match expression must have at least one case",
        startLoc,
        "Add at least one pattern match case: | pattern => expr"
    );
}
```

### 4.2 Add Lambda-in-Match Test Cases
**File:** `packages/core/src/parser/parser.test.ts`

Add test to verify lambda bodies work correctly in match cases:
```vibefun
match x {
  | Some(v) => v => v + 1  // lambda as body
  | None => () => 0
}
```

**Test:** Match expression tests with leading pipe requirement

---

## Phase 5: Implement Automatic Semicolon Insertion

**CRITICAL REDESIGN from review:** ASI must be integrated at the right points with correct rules

### 5.1 Add ASI Helper Methods
**File:** `packages/core/src/parser/parser.ts`

```typescript
private shouldInsertSemicolon(): boolean {
    if (this.current === 0) return false;

    const prev = this.peek(-1);
    const curr = this.peek();

    // Must be on different lines
    if (curr.loc.line <= prev.loc.line) return false;

    // Previous token prevents insertion (expression continues)
    if (this.isExpressionContinuation(prev.type)) return false;

    // Current token prevents insertion (line continuation)
    if (this.isLineContinuation(curr.type)) return false;

    // Current token triggers insertion (new statement)
    if (this.isStatementStart(curr.type)) return true;

    // Check for closing delimiter (also triggers)
    if (curr.type === "RBRACE") return true;

    // Default: insert semicolon on new line
    return true;
}

private isExpressionContinuation(type: TokenType): boolean {
    return type === "OP_PLUS" || type === "OP_MINUS" ||
           type === "OP_STAR" || type === "OP_SLASH" ||
           type === "OP_PERCENT" || type === "OP_AMPERSAND" ||
           type === "OP_AND" || type === "OP_OR" ||
           type === "OP_PIPE_GT" || type === "OP_GT_GT" || type === "OP_LT_LT" ||
           type === "DOT" || type === "LPAREN" || type === "COMMA" ||
           (type === "KEYWORD" && (this.peek(-1).value === "then" || this.peek(-1).value === "else"));
}

private isLineContinuation(type: TokenType): boolean {
    return type === "OP_PLUS" || type === "OP_MINUS" ||
           type === "OP_STAR" || type === "OP_SLASH" ||
           type === "OP_PERCENT" || type === "OP_AMPERSAND" ||
           type === "OP_AND" || type === "OP_OR" ||
           type === "OP_PIPE_GT" || type === "OP_GT_GT" || type === "OP_LT_LT" ||
           type === "DOT" || type === "COMMA";
}

private isStatementStart(type: TokenType): boolean {
    if (type === "KEYWORD") {
        const keyword = this.peek().value as string;
        return ["let", "type", "match", "if", "external", "import", "export", "while"].includes(keyword);
    }
    return false;
}
```

### 5.2 Integrate ASI
**Locations to integrate:**

1. **In `parseModule()`** after each declaration
2. **In `parseBlockExpr()`** between expressions
3. Replace explicit semicolon checks with: `this.check("SEMICOLON") || this.shouldInsertSemicolon()`

**Test:** Comprehensive ASI tests for all edge cases from requirements Section 8.1

---

## Phase 6: Tuple Pattern Parsing

### 6.1 Add Tuple Pattern Support
**File:** `packages/core/src/parser/parser.ts` in `parsePrimaryPattern()`

```typescript
// Handle parenthesized patterns and tuple patterns
if (this.check("LPAREN")) {
    this.advance();

    // Empty parens not valid in patterns
    if (this.check("RPAREN")) {
        throw this.error("Empty pattern not allowed", this.peek().loc);
    }

    const patterns: Pattern[] = [];
    do {
        patterns.push(this.parsePattern());
    } while (this.match("COMMA"));

    this.expect("RPAREN");

    // Single pattern: parenthesized
    if (patterns.length === 1) {
        return patterns[0]!;
    }

    // Multiple patterns: tuple (minimum 2)
    return { kind: "TuplePattern", elements: patterns, loc: startLoc };
}
```

**Test:** Tuple pattern tests

---

## Phase 7: Fix Minus Sign Disambiguation

### 7.1 Context-Aware Unary Parsing
**File:** `packages/core/src/parser/parser.ts` in `parseUnary()`

```typescript
private parseUnary(): Expr {
    if (this.check("OP_MINUS") || this.check("OP_BANG")) {
        // For minus, check if it should be binary
        if (this.current > 0 && this.peek().type === "OP_MINUS") {
            const prevType = this.peek(-1).type;

            // After these, minus is binary subtraction
            const binaryContexts = ["IDENTIFIER", "RPAREN", "RBRACKET", "RBRACE",
                                   "INT_LITERAL", "FLOAT_LITERAL", "STRING_LITERAL", "BOOL_LITERAL"];
            if (binaryContexts.includes(prevType)) {
                // Let caller handle as binary
                return this.parseCall();
            }
        }

        // Unary operator
        const opToken = this.advance();
        const op = opToken.type === "OP_MINUS" ? "Negate" : "LogicalNot";
        const expr = this.parseUnary(); // Right-associative
        return { kind: "UnaryOp", op, expr, loc: opToken.loc };
    }

    return this.parseCall();
}
```

**Test:** Minus disambiguation tests from requirements examples

---

## Phase 8: Error Handling Improvements

### 8.1 Multi-Error Collection
**File:** `packages/core/src/parser/parser.ts`

```typescript
class Parser {
    private errors: ParserError[] = [];
    private readonly maxErrors = 10;

    private error(message: string, location: Location, help?: string): ParserError {
        const err = new ParserError(message, location, help);
        this.errors.push(err);

        if (this.errors.length >= this.maxErrors) {
            // Stop parsing after max errors
            throw new Error(`Too many parse errors (${this.maxErrors}). Stopping.`);
        }

        return err;
    }

    getErrors(): ParserError[] {
        return this.errors;
    }
}
```

### 8.2 Activate Error Recovery
- Remove `@ts-expect-error` from `synchronize()` method
- Wrap declaration parsing in try-catch
- Call `synchronize()` on errors
- Continue parsing to collect multiple errors

### 8.3 Add All Required Error Messages
Per requirements Section 7.2:
- Tuple arity: "Tuple must have at least 2 elements"
- Match pipe: "Match case must begin with '|'"
- Operator sections: "Operator sections are not supported: (+)"
- All with appropriate hints

**Test:** Error message tests

---

## Phase 9: Update Documentation and Comments

### 9.1 Fix Precedence Comments
**File:** `packages/core/src/parser/parser.ts`
- Update all method comments to reflect correct precedence levels
- Fix incorrect level numbers throughout

### 9.2 Update Spec References
- Change references from `vibefun-spec.md` to `parser-requirements.md`
- Update line number references

**Test:** Documentation review

---

## Phase 10: Update Compiler Pipeline

### 10.1 Desugarer Updates
**Files:** `packages/core/src/desugarer/desugarer.ts`, `desugarBinOp.ts`

1. Remove `ListCons` case (lines 296-302)
2. Ensure `desugarBinOp` handles `Cons` operator
3. Add `If` optional else handling (use Unit if missing)
4. Add `Tuple` case → `CoreTuple`
5. Add `While` case → desugared to recursive let binding
6. Add `TuplePattern` case → `CoreTuplePattern`
7. Update all tests (6 ListCons references in lists.test.ts)

### 10.2 Type Checker Updates
**Files:** `packages/core/src/typechecker/infer.ts`, `patterns.ts`

1. Add `inferTuple()` for tuple type inference
2. Add `inferWhile()` for while type checking (condition: Bool, result: Unit)
3. Add `checkTuplePattern()` for tuple pattern type checking
4. Update exhaustiveness checking for tuple types
5. No changes needed for Cons (already handled via BinOp)

### 10.3 Optimizer Updates
**Files:** `packages/core/src/optimizer/passes/*.ts`, `packages/core/src/utils/ast-*.ts`

1. Add `CoreTuple`, `CoreWhile` to all pass switches
2. Add `CoreTuplePattern` to pattern handling
3. Update ast-transform.ts, ast-analysis.ts, substitution.ts
4. Be conservative with While (side effects - don't eliminate)

**Test:** Full compiler pipeline tests

---

## Phase 11: Comprehensive Testing

### 11.1 New Test Files
- `while-loops.test.ts` - while expression tests
- `tuples.test.ts` - tuple expressions and patterns
- `asi.test.ts` - ASI edge cases
- `operator-sections.test.ts` - rejection tests

### 11.2 Update Existing Tests
- `expressions.test.ts` - record shorthand, if without else
- `parser-errors.test.ts` - all new error messages
- `patterns.test.ts` - tuple patterns
- `declarations.test.ts` - ASI in declarations
- `parser-integration.test.ts` - precedence tests

### 11.3 Test Coverage Goals
Per requirements Section 10:
- All expression types
- All operators at all precedence levels
- All pattern types
- All type expressions
- Error cases with proper messages
- ASI edge cases
- Trailing commas in all contexts
- Multi-line expressions

---

## Implementation Order (Dependencies)

1. **Phase 1** (AST) - Foundation for everything
2. **Phase 2** (Precedence) - Must be correct before adding features
3. **Phase 3** (Expressions) → **Phase 4** (Match) → **Phase 6** (Tuple Patterns)
4. **Phase 5** (ASI) - Can happen after Phase 2
5. **Phase 7** (Minus) - Independent, can be anytime
6. **Phase 8** (Errors) - Throughout implementation
7. **Phase 9** (Docs) - Throughout implementation
8. **Phase 10** (Pipeline) - After parser is complete
9. **Phase 11** (Testing) - **CONTINUOUS throughout all phases**

---

## Testing Strategy

**CRITICAL:** Test after EACH phase, not just at the end

- After Phase 1: `npm run check` (type checking)
- After Phase 2: Run precedence tests
- After each Phase 3 feature: Run expression tests
- After Phase 4: Run match tests
- After Phase 5: Run ASI tests
- After Phase 10: Run full pipeline tests `npm run verify`

---

## Success Criteria

✅ All 19 identified issues resolved
✅ Parser passes all requirements from parser-requirements.md
✅ Full test coverage (90%+ coverage)
✅ All existing tests still pass
✅ Desugarer, type checker, optimizer updated
✅ `npm run verify` passes (check, lint, test, format)
✅ No regressions in compiler pipeline

---

## Risk Mitigation

1. **Precedence bugs:** Test after each precedence method change
2. **ASI breakage:** Comprehensive multi-line expression tests
3. **Pipeline breakage:** Test desugarer/type checker/optimizer after parser changes
4. **Regression:** Run full test suite after each phase

**Estimated Effort:** 5-7 days of focused implementation with comprehensive testing
