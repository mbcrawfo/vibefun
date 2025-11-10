# Vibefun Parser Implementation Plan v2.1

**Status**: Ready for Implementation (Corrected)
**Created**: 2025-11-09
**Last Updated**: 2025-11-09
**Reviewed By**: Plan subagent + precedence corrections applied

## Executive Summary

This plan updates the Vibefun parser to implement all requirements specified in `.claude/parser-requirements.md`. Analysis identified 19 issues requiring fixes:
- **8 Critical**: While loops, tuples, match leading pipe, precedence errors, ASI, if-without-else
- **6 Major**: Record shorthand, error recovery, tuple patterns, multi-error collection
- **5 Minor**: Documentation, test coverage, minus disambiguation

## Phase 0: Lambda Precedence (Level 0)

### 0.1 Add Lambda to Precedence Chain
**File:** `packages/core/src/parser/parser.ts`

**Context:** Lambda `=>` has the lowest precedence (level 0) per requirements Section 4.2. The lambda body extends to the end of the current context, which means lambdas must be parsed at the TOP of the precedence chain.

**Implementation:**
- Create `parseLambda()` method as the entry point for expression parsing
- Handle single-parameter lambdas without parens: `x => expr`
- Delegate to existing `parseLambdaOrParen()` for paren-wrapped params: `(x, y) => expr`
- Lambda body calls `parseRefAssign()` to continue down the precedence chain

```typescript
private parseLambda(): Expr {
    // Check for single-param lambda without parens: x => expr
    if (this.check("IDENTIFIER")) {
        const next = this.peek(1);
        if (next && next.type === "FAT_ARROW") {
            const param = this.advance();
            this.advance(); // consume =>
            const body = this.parseLambda(); // Right-associative, body can be another lambda
            return {
                kind: "Lambda",
                params: [{ kind: "VarPattern", name: param.value as string, loc: param.loc }],
                body,
                loc: param.loc
            };
        }
    }

    // Not a lambda, continue to next precedence level
    return this.parseRefAssign();
}
```

**Update parseExpression():**
```typescript
private parseExpression(): Expr {
    return this.parseLambda(); // Start at level 0
}
```

**Test:** Lambda precedence tests - ensure `x => y => z` parses correctly as `x => (y => z)`

---

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

### 2.1 Understanding Precedence Chain Order
**CRITICAL:** Precedence levels indicate binding strength. Lower numbers = weaker binding = parsed FIRST (top of call chain).

**Correct precedence chain (from level 0 to 16):**
```
parseExpression()             // Entry point
  → parseLambda()             // Level 0: => (weakest binding)
    → parseRefAssign()        // Level 1: :=
      → parseTypeAnnotation() // Level 2: :
        → parsePipe()         // Level 3: |>
          → parseComposition() // Level 4: >>, <<
            → parseLogicalOr() // Level 5: ||
              → parseLogicalAnd() // Level 6: &&
                → parseEquality() // Level 9: ==, !=
                  → parseComparison() // Level 10: <, <=, >, >=
                    → parseCons()   // Level 11: ::
                      → parseConcat() // Level 12: & (split from additive)
                        → parseAdditive() // Level 13: +, -
                          → parseMultiplicative() // Level 14: *, /, %
                            → parseUnary() // Level 15: -, !
                              → parseCall() // Level 16: calls, field access (strongest binding)
                                → parsePrimary() // Literals, variables, parens
```

**Why this works:** Each method calls the next HIGHER precedence level, ensuring higher precedence operators bind tighter. Example: `a + b * c` → addition (13) calls multiplication (14), so `*` binds first → `a + (b * c)` ✓

### 2.2 Current State vs. Required Changes
**File:** `packages/core/src/parser/parser.ts`

**Current chain (INCORRECT):**
```
parseExpression → parseTypeAnnotation (2) → parsePipe (3) → parseRefAssign (1) → parseCons (11) → parseLogicalOr (5) → ...
```

**Problems:**
1. Missing parseLambda (level 0) at entry - **ADDED IN PHASE 0**
2. parseRefAssign (1) comes AFTER parsePipe (3) - **WRONG ORDER**
3. parseCons (11) comes BEFORE parseLogicalOr (5) - **WRONG ORDER**
4. parseComposition is at level 10 position, should be level 4 - **MAJOR MOVE**
5. parseConcat (&) is grouped with parseAdditive (+,-) - **NEEDS SPLIT**

### 2.3 Implementation Steps
**Complete restructuring required - do in this order:**

**Step 1: Split parseConcat from parseAdditive**
- Create new `parseConcat()` method handling only `OP_AMPERSAND` (level 12)
- Update `parseAdditive()` to handle only `OP_PLUS`, `OP_MINUS` (level 13)
- parseConcat calls parseAdditive (higher precedence)

**Step 2: Move parseComposition**
- Currently: parseComparison → parseComposition → parseAdditive
- Required: parsePipe (3) → parseComposition (4) → parseLogicalOr (5)
- parseComposition must call parseLogicalOr, not parseAdditive

**Step 3: Reorder RefAssign and Cons**
- Current: parsePipe → parseRefAssign → parseCons
- Required: parseRefAssign → ...much later... → parseCons
- parseRefAssign (1) should call parseTypeAnnotation (2)
- parseCons (11) should call parseConcat (12)

**Step 4: Update all precedence method calls**
Each method must call the NEXT level in the chain:
- parseLambda (0) → parseRefAssign (1)
- parseRefAssign (1) → parseTypeAnnotation (2)
- parseTypeAnnotation (2) → parsePipe (3)
- parsePipe (3) → parseComposition (4)
- parseComposition (4) → parseLogicalOr (5)
- parseLogicalOr (5) → parseLogicalAnd (6)
- parseLogicalAnd (6) → parseEquality (9)
- parseEquality (9) → parseComparison (10)
- parseComparison (10) → parseCons (11)
- parseCons (11) → parseConcat (12)
- parseConcat (12) → parseAdditive (13)
- parseAdditive (13) → parseMultiplicative (14)
- parseMultiplicative (14) → parseUnary (15)
- parseUnary (15) → parseCall (16)
- parseCall (16) → parsePrimary

**Step 5: Update all method comments**
Each method should document its precedence level and what it calls.

**Test:** After restructuring, run comprehensive precedence tests to verify correct parsing of complex expressions like: `x => y := z : Type |> f >> g || a && b == c < d :: e & f + g * h.i()`

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
- If NOT followed by `=>`, determine if tuple or paren expression
- **Validate tuple arity BEFORE creating node:**
  ```typescript
  // After determining it's not a lambda (no =>):
  if (elements.length === 1) {
      // Single element with trailing comma, or just parens
      throw this.error(
          "Tuple must have at least 2 elements",
          startLoc,
          "Use parentheses for grouping: (x), not for single-element tuples"
      );
  }
  // Only create Tuple if elements.length >= 2
  return { kind: "Tuple", elements, loc: startLoc };
  ```

### 3.3 Record Field Shorthand
**File:** `packages/core/src/parser/parser.ts` in `parseRecordExpr()`

**CRITICAL:** Handle shorthand in BOTH normal construction AND record update spreads

**Location 1: Normal record construction (around line 866-877)**
```typescript
} else if (this.check("IDENTIFIER")) {
    const fieldName = this.advance().value as string;

    // Check for shorthand: { name } or { name, ... }
    if (this.check("COMMA") || this.check("RBRACE")) {
        // Shorthand: { name } → { name: Var(name) }
        fields.push({
            kind: "Field",
            name: fieldName,
            value: { kind: "Var", name: fieldName, loc: this.peek(-1).loc },
            loc: this.peek(-1).loc,
        });
    } else {
        // Full syntax: { name: value }
        this.expect("COLON", "Expected ':' after field name");
        const value = this.parseExpression();
        fields.push({
            kind: "Field",
            name: fieldName,
            value,
            loc: this.peek(-1).loc,
        });
    }
}
```

**Location 2: Record update spread (around line 837-850)**
```typescript
} else if (this.check("IDENTIFIER")) {
    const fieldName = this.advance().value as string;

    // Check for shorthand: { ...base, name } or { ...base, name, ... }
    if (this.check("COMMA") || this.check("RBRACE")) {
        // Shorthand in update: { ...base, name }
        updates.push({
            kind: "Field",
            name: fieldName,
            value: { kind: "Var", name: fieldName, loc: this.peek(-1).loc },
            loc: this.peek(-1).loc,
        });
    } else {
        // Full syntax: { ...base, name: value }
        this.expect("COLON", "Expected ':' after field name");
        const value = this.parseExpression();
        updates.push({
            kind: "Field",
            name: fieldName,
            value,
            loc: this.peek(-1).loc,
        });
    }
}
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

**CORRECTED:** Loop structure must check for RBRACE BEFORE expecting PIPE

```typescript
// Parse match cases - skip leading newlines
while (this.match("NEWLINE"));

// Validate at least one case before loop
if (this.check("RBRACE")) {
    throw this.error(
        "Match expression must have at least one case",
        this.peek().loc,
        "Add at least one pattern match case: | pattern => expr"
    );
}

// ALL cases require leading pipe (including first)
const cases: MatchCase[] = [];
while (!this.check("RBRACE") && !this.isAtEnd()) {
    // Require pipe for every case
    this.expect("PIPE", "Match case must begin with '|'");

    // Parse pattern
    const pattern = this.parsePattern();

    // Optional guard
    let guard: Expr | undefined;
    if (this.check("KEYWORD") && this.peek().value === "when") {
        this.advance();
        guard = this.parseLogicalAnd();
    }

    // Arrow and body
    this.expect("FAT_ARROW", "Expected '=>' after match pattern");
    const body = this.parseLogicalAnd();

    cases.push({ pattern, guard, body, loc: pattern.loc });

    // Skip trailing newlines before checking for next case or RBRACE
    while (this.match("NEWLINE"));
}

this.expect("RBRACE", "Expected '}' to close match expression");
```

**Key fix:** Check for RBRACE BEFORE expecting PIPE to avoid trying to parse a pipe when the match is closing.

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

**Location 1: `parseModule()` - After each declaration**
```typescript
private parseModule(): Module {
    const declarations: Declaration[] = [];

    while (!this.isAtEnd()) {
        while (this.match("NEWLINE")); // Skip leading newlines

        if (this.isAtEnd()) break;

        const decl = this.parseDeclaration();
        declarations.push(decl);

        // ASI: Check for semicolon or insert automatically
        if (this.check("SEMICOLON")) {
            this.advance();
        } else if (this.shouldInsertSemicolon()) {
            // ASI triggered - continue without consuming token
        } else if (!this.isAtEnd()) {
            throw this.error(
                "Expected semicolon or newline after declaration",
                this.peek().loc
            );
        }
    }

    return { kind: "Module", declarations, loc: ... };
}
```

**Location 2: `parseBlockExpr()` - Between expressions**
```typescript
private parseBlockExpr(): Expr {
    // ... parse expressions ...

    while (!this.check("RBRACE") && !this.isAtEnd()) {
        expressions.push(this.parseExpression());

        // ASI: Check for semicolon or insert automatically
        if (this.check("SEMICOLON")) {
            this.advance();
        } else if (this.shouldInsertSemicolon()) {
            // ASI triggered - treat as if semicolon exists
            // Continue to next expression or end of block
        } else if (!this.check("RBRACE")) {
            // Not at end of block and no semicolon - error
            throw this.error(
                "Expected semicolon or newline between expressions",
                this.peek().loc
            );
        }

        while (this.match("NEWLINE")); // Skip trailing newlines
    }
}
```

**Pattern to replace throughout parser:**
```typescript
// OLD: Require explicit semicolon
if (this.check("SEMICOLON")) {
    this.advance();
}

// NEW: ASI-aware semicolon handling
if (this.check("SEMICOLON")) {
    this.advance(); // Consume explicit semicolon
} else if (this.shouldInsertSemicolon()) {
    // Automatic insertion - don't consume, just continue
} else {
    // Error: no semicolon and ASI doesn't apply
    throw this.error("Expected semicolon", this.peek().loc);
}
```

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
3. Add `If` optional else handling (parser inserts Unit, desugarer passes through)
4. Add `Tuple` case → `CoreTuple` (straightforward mapping)
5. **Add `While` case → desugared to recursive let binding:**
   ```typescript
   case "While": {
       // while cond { body }
       // Desugar to:
       //   let rec loop = () => if cond then { body; loop() } else ()
       //   in loop()

       const loopName = freshVar("loop"); // Generate unique name

       const loopCall: CoreExpr = {
           kind: "CoreApp",
           func: { kind: "CoreVar", name: loopName, loc: expr.loc },
           args: [{ kind: "CoreUnitLit", loc: expr.loc }],
           loc: expr.loc
       };

       const loopBody: CoreExpr = {
           kind: "CoreIf",
           condition: desugar(expr.condition),
           then_: {
               kind: "CoreSequence",
               exprs: [desugar(expr.body), loopCall],
               loc: expr.loc
           },
           else_: { kind: "CoreUnitLit", loc: expr.loc },
           loc: expr.loc
       };

       const loopFunc: CoreExpr = {
           kind: "CoreLambda",
           params: [{ kind: "CoreVarPattern", name: "_unit", loc: expr.loc }],
           body: loopBody,
           loc: expr.loc
       };

       return {
           kind: "CoreLetRec",
           bindings: [{
               name: loopName,
               value: loopFunc,
               loc: expr.loc
           }],
           body: loopCall,
           loc: expr.loc
       };
   }
   ```
6. Add `TuplePattern` case → `CoreTuplePattern` (straightforward mapping)
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
2. **Phase 0** (Lambda) + **Phase 2** (Precedence) - Must be correct before adding features (do together as they're interdependent)
3. **Phase 3** (Expressions) → **Phase 4** (Match) → **Phase 6** (Tuple Patterns)
4. **Phase 5** (ASI) - Can happen after Phase 2
5. **Phase 7** (Minus) - Independent, can be anytime
6. **Phase 8** (Errors) - Throughout implementation
7. **Phase 9** (Docs) - Throughout implementation
8. **Phase 10** (Pipeline) - After parser is complete
9. **Phase 11** (Testing) - **CONTINUOUS throughout all phases**

**Note:** Phase 0 and Phase 2 are interconnected - parseLambda() calls parseRefAssign(), which is part of the precedence chain restructuring.

---

## Testing Strategy

**CRITICAL:** Test after EACH phase, not just at the end

- After Phase 1: `npm run check` (type checking)
- After Phase 0 + Phase 2: Run lambda and precedence tests
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
