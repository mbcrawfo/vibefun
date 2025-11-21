/**
 * Expression Parsing Module
 *
 * All expression parsing logic using recursive descent with operator precedence climbing.
 * Expression parsing uses a precedence climbing approach with 16 precedence levels.
 */

import type {
    Expr,
    LambdaParam,
    ListElement,
    Location,
    MatchCase,
    Pattern,
    RecordField,
} from "../types/index.js";
import type { TokenType } from "../types/token.js";
import type { ParserBase } from "./parser-base.js";

// Forward declarations for circular dependencies
let parsePattern: (parser: ParserBase) => Pattern;
let parseTypeExpr: (parser: ParserBase) => import("../types/index.js").TypeExpr;

/**
 * Set the pattern parsing function (called during initialization)
 */
export function setParsePattern(fn: (parser: ParserBase) => Pattern): void {
    parsePattern = fn;
}

/**
 * Set the type expression parsing function (called during initialization)
 */
export function setParseTypeExpr(fn: (parser: ParserBase) => import("../types/index.js").TypeExpr): void {
    parseTypeExpr = fn;
}

/**
 * Parse an expression
 * Entry point for expression parsing with operator precedence
 */
export function parseExpression(parser: ParserBase): Expr {
    return parseLambda(parser);
}

/**
 * Parse lambda expression: x => expr
 * Precedence level 0 (lowest - lambda body extends to end of context)
 *
 * Handles single-parameter lambdas without parentheses.
 * Multi-parameter lambdas like (x, y) => expr are handled in parseLambdaOrParen.
 *
 * Right-associative: x => y => z parses as x => (y => z)
 */
function parseLambda(parser: ParserBase): Expr {
    // Check for single-param lambda without parens: x => expr
    // Supports newlines before =>: x\n=> expr
    if (parser.check("IDENTIFIER")) {
        // Lookahead past newlines to check for =>
        let offset = 1;
        while (parser.peek(offset).type === "NEWLINE") {
            offset++;
        }
        const next = parser.peek(offset);

        if (next && next.type === "FAT_ARROW") {
            const paramToken = parser.advance();
            const pattern: Pattern = {
                kind: "VarPattern",
                name: paramToken.value as string,
                loc: paramToken.loc,
            };

            // Skip newlines before =>
            while (parser.check("NEWLINE")) {
                parser.advance();
            }

            parser.advance(); // consume =>

            // Skip newlines after => (supports: x =>\nbody)
            while (parser.check("NEWLINE")) {
                parser.advance();
            }

            // Right-associative: body can be another lambda
            const body = parseLambda(parser);

            return {
                kind: "Lambda",
                params: [{ pattern, loc: pattern.loc }],
                body,
                loc: paramToken.loc,
            };
        }
    }

    // Not a lambda, continue to next precedence level
    return parseRefAssign(parser);
}

/**
 * Parse reference assignment: ref := value
 * Precedence level 1 (right-associative)
 */
function parseRefAssign(parser: ParserBase): Expr {
    const expr = parseTypeAnnotation(parser);

    if (parser.match("OP_ASSIGN")) {
        const value = parseRefAssign(parser); // Right-associative
        return {
            kind: "BinOp",
            op: "RefAssign",
            left: expr,
            right: value,
            loc: expr.loc,
        };
    }

    return expr;
}

/**
 * Parse type annotation: expr : Type
 * Precedence level 2
 */
function parseTypeAnnotation(parser: ParserBase): Expr {
    const expr = parsePipe(parser);

    // Check for type annotation
    // We need to be careful not to consume : in other contexts (record fields, etc.)
    // Type annotations are only valid in expression context, not in record construction
    if (parser.check("COLON")) {
        // Lookahead: if the next token can start a type, it's a type annotation
        const nextToken = parser.peek(1);
        const canStartType =
            nextToken.type === "IDENTIFIER" || nextToken.type === "LPAREN" || nextToken.type === "LBRACE";

        if (canStartType) {
            parser.advance(); // consume :
            const typeExpr = parseTypeExpr(parser);
            return {
                kind: "TypeAnnotation",
                expr,
                typeExpr,
                loc: expr.loc,
            };
        }
    }

    return expr;
}

/**
 * Parse pipe expressions: expr |> func
 * Precedence level 3
 */
function parsePipe(parser: ParserBase): Expr {
    let expr = parseComposition(parser);

    while (parser.match("OP_PIPE_GT")) {
        // Skip newlines after operator (supports: a |>\n b)
        while (parser.check("NEWLINE")) {
            parser.advance();
        }

        const func = parseComposition(parser);
        expr = {
            kind: "Pipe",
            expr,
            func,
            loc: expr.loc,
        };
    }

    return expr;
}

/**
 * Parse function composition: f >> g (forward) or f << g (backward)
 * Precedence level 4
 */
function parseComposition(parser: ParserBase): Expr {
    let left = parseLogicalOr(parser);

    while (parser.match("OP_GT_GT", "OP_LT_LT")) {
        const opToken = parser.peek(-1);
        const op = opToken.type === "OP_GT_GT" ? "ForwardCompose" : "BackwardCompose";

        // Skip newlines after operator (supports: f >>\n g)
        while (parser.check("NEWLINE")) {
            parser.advance();
        }

        const right = parseLogicalOr(parser);
        left = {
            kind: "BinOp",
            op,
            left,
            right,
            loc: left.loc,
        };
    }

    return left;
}

/**
 * Parse logical OR: expr || expr
 * Precedence level 5
 */
function parseLogicalOr(parser: ParserBase): Expr {
    let left = parseLogicalAnd(parser);

    while (parser.match("OP_OR")) {
        // Skip newlines after operator (supports: a ||\n b)
        while (parser.check("NEWLINE")) {
            parser.advance();
        }

        const right = parseLogicalAnd(parser);
        left = {
            kind: "BinOp",
            op: "LogicalOr",
            left,
            right,
            loc: left.loc,
        };
    }

    return left;
}

/**
 * Parse logical AND: expr && expr
 * Precedence level 6
 */
function parseLogicalAnd(parser: ParserBase): Expr {
    let left = parseEquality(parser);

    while (parser.match("OP_AND")) {
        // Skip newlines after operator (supports: a &&\n b)
        while (parser.check("NEWLINE")) {
            parser.advance();
        }

        const right = parseEquality(parser);
        left = {
            kind: "BinOp",
            op: "LogicalAnd",
            left,
            right,
            loc: left.loc,
        };
    }

    return left;
}

/**
 * Parse equality: expr == expr, expr != expr
 * Precedence level 7
 */
function parseEquality(parser: ParserBase): Expr {
    let left = parseComparison(parser);

    while (parser.match("OP_EQ", "OP_NEQ")) {
        const opToken = parser.peek(-1);
        const op = opToken.type === "OP_EQ" ? "Equal" : "NotEqual";

        // Skip newlines after operator (supports: a ==\n b)
        while (parser.check("NEWLINE")) {
            parser.advance();
        }

        const right = parseComparison(parser);
        left = {
            kind: "BinOp",
            op,
            left,
            right,
            loc: left.loc,
        };
    }

    return left;
}

/**
 * Parse comparison: <, <=, >, >=
 * Precedence level 8
 */
function parseComparison(parser: ParserBase): Expr {
    let left = parseCons(parser);

    while (parser.match("OP_LT", "OP_LTE", "OP_GT", "OP_GTE")) {
        const opToken = parser.peek(-1);
        const op =
            opToken.type === "OP_LT"
                ? "LessThan"
                : opToken.type === "OP_LTE"
                  ? "LessEqual"
                  : opToken.type === "OP_GT"
                    ? "GreaterThan"
                    : "GreaterEqual";

        // Skip newlines after operator (supports: a <\n b)
        while (parser.check("NEWLINE")) {
            parser.advance();
        }

        const right = parseCons(parser);
        left = {
            kind: "BinOp",
            op,
            left,
            right,
            loc: left.loc,
        };
    }

    return left;
}

/**
 * Parse list cons: head :: tail
 * Precedence level 11 (right-associative)
 */
function parseCons(parser: ParserBase): Expr {
    const expr = parseConcat(parser);

    if (parser.match("OP_CONS")) {
        // Skip newlines after operator (supports: a ::\n b)
        while (parser.check("NEWLINE")) {
            parser.advance();
        }

        const tail = parseCons(parser); // Right-associative
        return {
            kind: "BinOp",
            op: "Cons",
            left: expr,
            right: tail,
            loc: expr.loc,
        };
    }

    return expr;
}

/**
 * Parse string concatenation: &
 * Precedence level 10
 */
function parseConcat(parser: ParserBase): Expr {
    let left = parseAdditive(parser);

    while (parser.match("OP_AMPERSAND")) {
        // Skip newlines after operator (supports: a &\n b)
        while (parser.check("NEWLINE")) {
            parser.advance();
        }

        const right = parseAdditive(parser);
        left = {
            kind: "BinOp",
            op: "Concat",
            left,
            right,
            loc: left.loc,
        };
    }

    return left;
}

/**
 * Parse additive: +, -
 * Precedence level 12
 */
function parseAdditive(parser: ParserBase): Expr {
    let left = parseMultiplicative(parser);

    // Skip newlines before operator (supports: a\n + b)
    while (parser.check("NEWLINE")) {
        parser.advance();
    }

    while (parser.match("OP_PLUS", "OP_MINUS")) {
        const opToken = parser.peek(-1);
        const op = opToken.type === "OP_PLUS" ? "Add" : "Subtract";

        // Skip newlines after operator (supports: a +\n b)
        while (parser.check("NEWLINE")) {
            parser.advance();
        }

        const right = parseMultiplicative(parser);
        left = {
            kind: "BinOp",
            op,
            left,
            right,
            loc: left.loc,
        };

        // Skip newlines before next operator (supports: a + b\n + c)
        while (parser.check("NEWLINE")) {
            parser.advance();
        }
    }

    return left;
}

/**
 * Parse multiplicative: *, /, %
 * Precedence level 13
 */
function parseMultiplicative(parser: ParserBase): Expr {
    let left = parseUnary(parser);

    // Skip newlines before operator (supports: a\n * b)
    while (parser.check("NEWLINE")) {
        parser.advance();
    }

    while (parser.match("OP_STAR", "OP_SLASH", "OP_PERCENT")) {
        const opToken = parser.peek(-1);
        const op = opToken.type === "OP_STAR" ? "Multiply" : opToken.type === "OP_SLASH" ? "Divide" : "Modulo";

        // Skip newlines after operator (supports: a *\n b)
        while (parser.check("NEWLINE")) {
            parser.advance();
        }

        const right = parseUnary(parser);
        left = {
            kind: "BinOp",
            op,
            left,
            right,
            loc: left.loc,
        };

        // Skip newlines before next operator (supports: a * b\n * c)
        while (parser.check("NEWLINE")) {
            parser.advance();
        }
    }

    return left;
}

/**
 * Parse unary operators: -, !
 * Precedence level 14
 */
function parseUnary(parser: ParserBase): Expr {
    // Check for unary operators
    if (parser.check("OP_MINUS") || parser.check("OP_BANG")) {
        // Access current position via type assertion
        const p = parser as unknown as { current: number };

        // For minus, check if it should be binary based on previous token
        if (p.current > 0 && parser.peek().type === "OP_MINUS") {
            const prevType = parser.peek(-1).type;

            // After these tokens, minus is binary subtraction (not unary negation)
            const binaryContexts: TokenType[] = [
                "IDENTIFIER",
                "RPAREN",
                "RBRACKET",
                "RBRACE",
                "INT_LITERAL",
                "FLOAT_LITERAL",
                "STRING_LITERAL",
                "BOOL_LITERAL",
            ];

            if (binaryContexts.includes(prevType)) {
                // Let caller handle as binary operator
                return parseCall(parser);
            }
        }

        // Unary operator
        const opToken = parser.advance();
        const op = opToken.type === "OP_MINUS" ? "Negate" : "LogicalNot";
        const expr = parseUnary(parser); // Right-associative (unary operators can stack)

        return {
            kind: "UnaryOp",
            op,
            expr,
            loc: opToken.loc,
        };
    }

    // No unary operator, continue to postfix (calls)
    return parseCall(parser);
}

/**
 * Parse function calls and postfix operators
 * Precedence level 15 (postfix)
 */
function parseCall(parser: ParserBase): Expr {
    let expr = parsePrimary(parser);

    // Parse postfix operators (function calls, record field access)
    while (true) {
        // Skip newlines before postfix operators (supports: expr\n .field, expr\n (args))
        while (parser.check("NEWLINE")) {
            parser.advance();
        }

        // Function call: func(arg1, arg2, ...)
        if (parser.match("LPAREN")) {
            const args: Expr[] = [];

            // Skip leading newlines after opening paren
            while (parser.check("NEWLINE")) {
                parser.advance();
            }

            // Check for empty argument list
            if (!parser.check("RPAREN")) {
                // Parse arguments
                do {
                    args.push(parseExpression(parser));

                    // Skip newlines after argument
                    while (parser.check("NEWLINE")) {
                        parser.advance();
                    }
                } while (
                    parser.match("COMMA") &&
                    (() => {
                        // Skip newlines after comma (supports: f(a,\n b))
                        while (parser.check("NEWLINE")) {
                            parser.advance();
                        }
                        return true;
                    })()
                );
            }

            parser.expect("RPAREN", "Expected closing parenthesis after function arguments");

            expr = {
                kind: "App",
                func: expr,
                args,
                loc: expr.loc,
            };
        }
        // Record field access: record.field
        else if (parser.match("DOT")) {
            const fieldToken = parser.expect("IDENTIFIER", "Expected field name after '.'");
            const field = fieldToken.value as string;

            expr = {
                kind: "RecordAccess",
                record: expr,
                field,
                loc: expr.loc,
            };
        }
        // Postfix dereference: expr!
        // Used to dereference mutable references: ref! gets the value
        // Chainable: ref!! for double dereference
        else if (parser.match("OP_BANG")) {
            expr = {
                kind: "UnaryOp",
                op: "Deref",
                expr,
                loc: expr.loc,
            };
        } else {
            // No more postfix operators
            break;
        }
    }

    return expr;
}

/**
 * Parse primary expressions (literals, variables, parenthesized)
 */
function parsePrimary(parser: ParserBase): Expr {
    // Integer literal
    if (parser.check("INT_LITERAL")) {
        const token = parser.advance();
        return {
            kind: "IntLit",
            value: token.value as number,
            loc: token.loc,
        };
    }

    // Float literal
    if (parser.check("FLOAT_LITERAL")) {
        const token = parser.advance();
        return {
            kind: "FloatLit",
            value: token.value as number,
            loc: token.loc,
        };
    }

    // String literal
    if (parser.check("STRING_LITERAL")) {
        const token = parser.advance();
        return {
            kind: "StringLit",
            value: token.value as string,
            loc: token.loc,
        };
    }

    // Boolean literal
    if (parser.check("BOOL_LITERAL")) {
        const token = parser.advance();
        return {
            kind: "BoolLit",
            value: token.value as boolean,
            loc: token.loc,
        };
    }

    // Lambda, unit literal, or parenthesized expression
    if (parser.check("LPAREN")) {
        const startLoc = parser.peek().loc;
        parser.advance(); // consume (
        return parseLambdaOrParen(parser, startLoc);
    }

    // If expression: if condition then expr1 [else expr2]
    // Else branch is optional; if missing, parser inserts Unit
    if (parser.check("KEYWORD") && parser.peek().value === "if") {
        const startLoc = parser.peek().loc;
        parser.advance(); // consume 'if'

        const condition = parseExpression(parser);

        // Skip newlines before 'then' (supports: if cond\n then expr)
        while (parser.check("NEWLINE")) {
            parser.advance();
        }

        parser.expect("KEYWORD", "Expected 'then' after if condition");
        if (parser.peek(-1).value !== "then") {
            throw parser.error("Expected 'then' after if condition", parser.peek(-1).loc);
        }

        const thenExpr = parseExpression(parser);

        // Else branch is optional
        let elseExpr: Expr;
        // Skip newlines before 'else' (supports: if...then expr\n else expr)
        while (parser.check("NEWLINE")) {
            parser.advance();
        }

        if (parser.check("KEYWORD") && parser.peek().value === "else") {
            parser.advance(); // consume 'else'
            elseExpr = parseExpression(parser);
        } else {
            // Parser inserts Unit literal for missing else branch
            elseExpr = {
                kind: "UnitLit",
                loc: parser.peek().loc,
            };
        }

        return {
            kind: "If",
            condition,
            then: thenExpr,
            else_: elseExpr,
            loc: startLoc,
        };
    }

    // Match expression: match expr { | pattern => body | pattern when guard => body ... }
    if (parser.check("KEYWORD") && parser.peek().value === "match") {
        const startLoc = parser.peek().loc;
        parser.advance(); // consume 'match'
        return parseMatchExpr(parser, startLoc);
    }

    // Unsafe block: unsafe { expr }
    if (parser.check("KEYWORD") && parser.peek().value === "unsafe") {
        const startLoc = parser.peek().loc;
        parser.advance(); // consume 'unsafe'

        parser.expect("LBRACE", "Expected '{' after 'unsafe'");

        const expr = parseExpression(parser);

        parser.expect("RBRACE", "Expected '}' after unsafe expression");

        return {
            kind: "Unsafe",
            expr,
            loc: startLoc,
        };
    }

    // While loop: while condition { body }
    if (parser.check("KEYWORD") && parser.peek().value === "while") {
        const startLoc = parser.peek().loc;
        parser.advance(); // consume 'while'

        const condition = parseExpression(parser);

        const lbraceToken = parser.expect("LBRACE", "Expected '{' after while condition");

        // Skip leading newlines inside block
        while (parser.match("NEWLINE"));

        // Parse body as block expression (consumes RBRACE internally)
        const body = parseBlockExpr(parser, lbraceToken.loc);

        return {
            kind: "While",
            condition,
            body,
            loc: startLoc,
        };
    }

    // Let expression: let [mut] [rec] pattern = value; body
    // Used inside blocks for local bindings
    if (parser.check("KEYWORD") && parser.peek().value === "let") {
        const startLoc = parser.peek().loc;
        parser.advance(); // consume 'let'
        return parseLetExpr(parser, startLoc);
    }

    // List literal with optional spread elements
    // Syntax: [1, 2, 3] or [1, ...rest, 2] or [...items]
    // Supports multiple spreads: [...a, ...b, x, ...c]
    if (parser.check("LBRACKET")) {
        const startLoc = parser.peek().loc;
        parser.advance(); // consume [

        const elements: ListElement[] = [];

        // Skip leading newlines after opening bracket
        while (parser.check("NEWLINE")) {
            parser.advance();
        }

        // Check for empty list
        if (!parser.check("RBRACKET")) {
            // Parse elements (can be regular Element or Spread)
            do {
                // Check for spread element: ...expr
                if (parser.match("SPREAD")) {
                    const spreadExpr = parseExpression(parser);
                    elements.push({ kind: "Spread", expr: spreadExpr });
                } else {
                    const expr = parseExpression(parser);
                    elements.push({ kind: "Element", expr });
                }

                // Skip newlines after element
                while (parser.check("NEWLINE")) {
                    parser.advance();
                }
            } while (
                parser.match("COMMA") &&
                (() => {
                    // Skip newlines after comma (supports: [a,\n b])
                    while (parser.check("NEWLINE")) {
                        parser.advance();
                    }
                    // Check for trailing comma before closing bracket
                    if (parser.check("RBRACKET")) {
                        return false; // Exit loop, don't try to parse another element
                    }
                    return true;
                })()
            );
        }

        parser.expect("RBRACKET", "Expected closing bracket after list elements");

        return {
            kind: "List",
            elements,
            loc: startLoc,
        };
    }

    // Record construction, update, or block expression: { ... }
    if (parser.check("LBRACE")) {
        const startLoc = parser.peek().loc;
        parser.advance(); // consume {

        // Skip leading newlines
        while (parser.match("NEWLINE"));

        // Empty braces - treat as empty record (existing behavior)
        if (parser.check("RBRACE")) {
            parser.advance();
            return {
                kind: "Record",
                fields: [],
                loc: startLoc,
            };
        }

        // Disambiguate: block vs. record
        // Strategy:
        // 1. If starts with keyword (let, if, match, unsafe) → block
        // 2. If identifier followed by PIPE → record update
        // 3. If identifier followed by COLON → record construction
        // 4. Parse first expression and check for SEMICOLON → block
        // 5. Otherwise → error for ambiguous case

        // Check for block starting with keyword
        if (parser.check("KEYWORD")) {
            const keyword = parser.peek().value as string;
            if (["let", "if", "match", "unsafe"].includes(keyword)) {
                return parseBlockExpr(parser, startLoc);
            }
        }

        // Check for record spread: { ...expr, ... }
        if (parser.check("SPREAD")) {
            return parseRecordExpr(parser, startLoc);
        }

        // Check for record update: { id | ... }
        if (parser.check("IDENTIFIER") && parser.peek(1).type === "PIPE") {
            return parseRecordExpr(parser, startLoc);
        }

        // Check for record construction: { id : ... }
        if (parser.check("IDENTIFIER") && parser.peek(1).type === "COLON") {
            return parseRecordExpr(parser, startLoc);
        }

        // Check for record shorthand: { id } or { id, ... }
        // Lookahead past newlines to check for COMMA or RBRACE
        // Note: Single-field records like { name } are still valid (detected by RBRACE)
        // Multiple fields now require commas between them for consistency
        if (parser.check("IDENTIFIER")) {
            let offset = 1;
            while (parser.peek(offset).type === "NEWLINE") {
                offset++;
            }
            const nextToken = parser.peek(offset);
            if (nextToken.type === "COMMA" || nextToken.type === "RBRACE") {
                return parseRecordExpr(parser, startLoc);
            }
        }

        // Need to parse first expression to check for semicolon
        // Save position for potential rollback
        const p = parser as unknown as { current: number };
        const checkpoint = p.current;
        try {
            parseExpression(parser);

            // Check for semicolon → block
            if (parser.check("SEMICOLON")) {
                // Rollback and parse as block
                p.current = checkpoint;
                return parseBlockExpr(parser, startLoc);
            }

            // Check for closing brace → single expression could be block or ambiguous
            if (parser.check("RBRACE")) {
                // Ambiguous case: { expr }
                // This could be a record field shorthand OR a single-expression block
                // Decision: require semicolon for blocks, so this is an error
                throw parser.error(
                    "Ambiguous syntax: single expression in braces",
                    startLoc,
                    "Use semicolon for block ({ expr; }) or field:value syntax for record ({ field: value })",
                );
            }

            // If we get here, there's more content but no semicolon
            // This is likely a malformed record or block
            throw parser.error(
                "Expected semicolon, closing brace, or colon",
                parser.peek().loc,
                "Use semicolons to separate statements in blocks, or use field:value syntax for records",
            );
        } catch (error) {
            // If expression parsing failed, restore position and throw
            p.current = checkpoint;
            throw error;
        }
    }

    // Variable (identifier)
    if (parser.check("IDENTIFIER")) {
        const token = parser.advance();
        return {
            kind: "Var",
            name: token.value as string,
            loc: token.loc,
        };
    }

    // If we get here, unexpected token
    throw parser.error(
        `Unexpected token: ${parser.peek().type}`,
        parser.peek().loc,
        "Expected an expression (literal, variable, or parenthesized expression)",
    );
}

/**
 * Helper to check if current token is an operator
 */
function isOperatorToken(parser: ParserBase): boolean {
    return (
        parser.check("OP_PLUS") ||
        parser.check("OP_MINUS") ||
        parser.check("OP_STAR") ||
        parser.check("OP_SLASH") ||
        parser.check("OP_PERCENT") ||
        parser.check("OP_AMPERSAND") ||
        parser.check("OP_EQ") ||
        parser.check("OP_NEQ") ||
        parser.check("OP_LT") ||
        parser.check("OP_GT") ||
        parser.check("OP_LTE") ||
        parser.check("OP_GTE") ||
        parser.check("OP_AND") ||
        parser.check("OP_OR") ||
        parser.check("OP_CONS") ||
        parser.check("OP_PIPE_GT") ||
        parser.check("OP_GT_GT") ||
        parser.check("OP_LT_LT")
    );
}

/**
 * Parse lambda or parenthesized expression starting with LPAREN
 * Handles: () => expr, (x) => expr, (x, y) => expr, or (expr)
 * Note: LPAREN has already been consumed by caller
 */
function parseLambdaOrParen(parser: ParserBase, startLoc: Location): Expr {
    // Check for bare operator sections: (+), (*), (-), etc.
    // This only catches operators at the start, NOT unary like (-x)
    // We handle left sections like (1 +) later after parsing the expression
    if (isOperatorToken(parser)) {
        const operatorToken = parser.peek();
        const nextToken = parser.peek(1);

        // Check if it's followed by RPAREN - that's a bare operator section
        if (nextToken.type === "RPAREN") {
            throw parser.error(
                "Operator sections are not supported",
                operatorToken.loc,
                "Use a lambda instead. For (+), write: (x, y) => x + y",
            );
        }

        // Check for right operator sections like (- x) with leading whitespace
        // If the operator has leading whitespace before the identifier, it's a section, not unary
        if (
            nextToken.hasLeadingWhitespace &&
            (nextToken.type === "IDENTIFIER" || nextToken.type === "INT_LITERAL" || nextToken.type === "FLOAT_LITERAL")
        ) {
            throw parser.error(
                "Operator sections are not supported",
                operatorToken.loc,
                `Use a lambda instead. For (${operatorToken.value} x), write: (x) => ${operatorToken.value}x`,
            );
        }

        // If followed by an identifier or expression without leading whitespace,
        // it might be unary like (-x) or (!flag)
        // Fall through to normal expression parsing
    }

    // Check for closing paren immediately
    if (parser.check("RPAREN")) {
        parser.advance(); // consume )

        // Check if it's a lambda: () => expr
        if (parser.check("FAT_ARROW")) {
            parser.advance(); // consume =>

            // Skip newlines after => (supports: () =>\nbody)
            while (parser.check("NEWLINE")) {
                parser.advance();
            }

            const body = parseExpression(parser);
            return {
                kind: "Lambda",
                params: [],
                body,
                loc: startLoc,
            };
        }

        // Otherwise, it's a unit literal
        return {
            kind: "UnitLit",
            loc: startLoc,
        };
    }

    // Lookahead to distinguish lambda from parenthesized expression
    // Lambda: (id) => or (id, id, ...) =>
    // Paren expr: (expr)
    //
    // Strategy: If we see identifier, peek ahead to see if next is ) or ,
    // - If ), peek ahead again for =>
    // - If ,, it must be lambda parameters
    // - Otherwise, it's a parenthesized expression

    if (parser.check("IDENTIFIER")) {
        const nextToken = parser.peek(1);

        // Check if it looks like lambda parameters
        if (nextToken.type === "RPAREN") {
            // Could be (x) => or (x)
            // Need to check if there's => after the )
            const afterParen = parser.peek(2);
            if (afterParen.type === "FAT_ARROW") {
                // It's a lambda: (x) => expr
                const pattern: Pattern = {
                    kind: "VarPattern" as const,
                    name: parser.advance().value as string,
                    loc: parser.peek(-1).loc,
                };
                parser.expect("RPAREN");
                parser.expect("FAT_ARROW");

                // Skip newlines after => (supports: (x) =>\nbody)
                while (parser.check("NEWLINE")) {
                    parser.advance();
                }

                const body = parseExpression(parser);
                return {
                    kind: "Lambda",
                    params: [{ pattern, loc: pattern.loc }],
                    body,
                    loc: startLoc,
                };
            } else {
                // It's a parenthesized variable: (x)
                const name = parser.advance().value as string;
                const varLoc = parser.peek(-1).loc;
                parser.expect("RPAREN");
                return {
                    kind: "Var",
                    name,
                    loc: varLoc,
                };
            }
        } else if (nextToken.type === "COMMA") {
            // Could be lambda parameters or tuple - parse as expressions
            // and check for => after closing paren
            // Fall through to general expression parsing
        }
    }

    // Not a lambda, parse as parenthesized expression or tuple
    // Parse comma-separated expressions
    const exprs: Expr[] = [];

    // Try to parse expression, catching errors for operator sections
    try {
        exprs.push(parseExpression(parser));

        // Check for operator section: (expr op)
        if (isOperatorToken(parser)) {
            throw parser.error(
                "Operator sections are not supported",
                parser.peek().loc,
                `Use a lambda instead. For example: (x) => x ${parser.peek().value} ...`,
            );
        }

        // Check for comma (potential tuple or multi-param lambda)
        while (parser.match("COMMA")) {
            exprs.push(parseExpression(parser));
        }
    } catch (error) {
        // If we got "Unexpected token" and the token is RPAREN,
        // and the previous token was an operator, it's likely an operator section
        const isParserError = error instanceof Error && error.name === "ParserError";
        const hasUnexpectedToken = isParserError && (error as Error).message.includes("Unexpected token");

        if (hasUnexpectedToken && parser.check("RPAREN")) {
            // Check if we have consumed some tokens (meaning we parsed part of an expr + op)
            throw parser.error(
                "Operator sections are not supported",
                parser.peek().loc,
                "Use a lambda instead. For example: (x) => x + ...",
            );
        }
        throw error;
    }

    parser.expect("RPAREN", "Expected closing parenthesis");

    // Skip newlines before checking for arrow (supports: (x, y)\n=> body)
    while (parser.check("NEWLINE")) {
        parser.advance();
    }

    // After closing paren, check for arrow (could be lambda with pattern params)
    if (parser.check("FAT_ARROW")) {
        // It's a lambda with pattern parameters: (pattern1, pattern2) => body
        // Convert expressions to patterns (this handles more complex patterns)
        parser.advance(); // consume =>

        // Skip newlines after => (supports: (x, y) =>\nbody)
        while (parser.check("NEWLINE")) {
            parser.advance();
        }

        const body = parseLambda(parser); // Right-associative

        // Convert expressions to lambda parameters
        // Supports: (x), (x: Int), (x, y: String), etc.
        const params: LambdaParam[] = exprs.map((e) => {
            // Simple identifier: x
            if (e.kind === "Var") {
                const pattern: Pattern = { kind: "VarPattern", name: e.name, loc: e.loc };
                return { pattern, loc: e.loc };
            }
            // Type-annotated parameter: x: Int
            if (e.kind === "TypeAnnotation") {
                if (e.expr.kind !== "Var") {
                    throw parser.error(
                        "Lambda parameter type annotations must be on simple identifiers",
                        e.loc,
                        "Use the form 'param: Type'",
                    );
                }
                const pattern: Pattern = { kind: "VarPattern", name: e.expr.name, loc: e.expr.loc };
                return { pattern, type: e.typeExpr, loc: e.loc };
            }
            // For more complex patterns, we'd need to convert the expression AST
            throw parser.error(
                "Lambda parameters must be simple identifiers or type-annotated identifiers",
                e.loc,
                "Use 'x' or 'x: Type'",
            );
        });

        return {
            kind: "Lambda",
            params,
            body,
            loc: startLoc,
        };
    }

    // Not a lambda - determine if tuple or grouped expression
    if (exprs.length === 1) {
        // Single element: just grouping/precedence, NOT a tuple
        const expr = exprs[0];
        if (!expr) {
            throw parser.error("Unexpected empty expression list", startLoc);
        }
        return expr;
    } else {
        // Multiple elements (2+): valid tuple
        return {
            kind: "Tuple",
            elements: exprs,
            loc: startLoc,
        };
    }
}

/**
 * Parse match expression
 * Syntax: match expr { | pattern => body | pattern when guard => body ... }
 * Note: 'match' keyword has already been consumed by caller
 */
function parseMatchExpr(parser: ParserBase, startLoc: Location): Expr {
    const expr = parseExpression(parser);

    parser.expect("LBRACE", "Expected '{' after match expression");

    // Parse match cases - skip leading newlines
    while (parser.match("NEWLINE"));

    // Validate at least one case before loop
    if (parser.check("RBRACE")) {
        throw parser.error(
            "Match expression must have at least one case",
            parser.peek().loc,
            "Add at least one pattern match case: | pattern => expr",
        );
    }

    // ALL cases require leading pipe (including first)
    const cases: MatchCase[] = [];
    while (!parser.check("RBRACE") && !parser.isAtEnd()) {
        // Require pipe for every case
        parser.expect("PIPE", "Match case must begin with '|'");

        // Parse pattern
        const pattern = parsePattern(parser);

        // Optional guard: when expr
        let guard: Expr | undefined;
        if (parser.check("KEYWORD") && parser.peek().value === "when") {
            parser.advance(); // consume 'when'
            // Guard expression - parse up to logical OR level to allow || but not |> pipe
            // This allows: when x > 0 && y < 10 || z == 5
            guard = parseLogicalOr(parser);
        }

        // Fat arrow
        parser.expect("FAT_ARROW", "Expected '=>' after match pattern");

        // Body - now that PIPE is required at the START of each case,
        // we can use parseExpression() which allows lambdas in match bodies
        const body = parseExpression(parser);

        const matchCase: MatchCase = {
            pattern,
            body,
            loc: pattern.loc,
        };

        // Only add guard if it exists (exactOptionalPropertyTypes)
        if (guard !== undefined) {
            matchCase.guard = guard;
        }

        cases.push(matchCase);

        // Skip trailing newlines before checking for next case or RBRACE
        while (parser.match("NEWLINE"));
    }

    parser.expect("RBRACE", "Expected '}' after match cases");

    return {
        kind: "Match",
        expr,
        cases,
        loc: startLoc,
    };
}

/**
 * Parse record construction or update expression
 *
 * Syntax:
 * - Construction: { field: value, ... }
 * - Update: { ...record, field: value, ... }
 * - Multiple spreads: { ...base, ...overrides, field: value }
 * - Shallow copy: { ...record }
 *
 * Semantics:
 * - Multiple spreads use rightmost-wins (JavaScript semantics)
 * - Later fields/spreads override earlier ones
 * - Example: { ...a, x: 1, ...b } - b.x overrides explicit x: 1
 *
 * Implementation:
 * - Uses RecordField union (Field | Spread) in updates array
 * - Spreads are added as Spread elements, preserving order
 * - Order in updates array determines override precedence
 *
 * Note: LBRACE has already been consumed by caller
 */
function parseRecordExpr(parser: ParserBase, startLoc: Location): Expr {
    // Set record context for disambiguation (records vs blocks)
    const p = parser as unknown as { inRecordContext: boolean };
    p.inRecordContext = true;

    try {
        // Check for empty record
        if (parser.check("RBRACE")) {
            parser.advance();
            return {
                kind: "Record",
                fields: [],
                loc: startLoc,
            };
        }

        // Check if it starts with spread operator: { ...expr, ... }
        if (parser.check("SPREAD")) {
            parser.advance(); // consume ...

            // Parse the spread expression
            const spreadExpr = parseExpression(parser);

            // Collect remaining fields and spreads
            const updates: RecordField[] = [];

            // Skip newlines after spread expr
            while (parser.check("NEWLINE")) {
                parser.advance();
            }

            // Continue parsing fields and spreads (commas required between items)
            while (true) {
                // Check if we're at the end
                if (parser.check("RBRACE")) {
                    break; // End of record update
                }

                // Require comma before next item
                if (!parser.check("COMMA")) {
                    const nextToken = parser.peek();
                    throw parser.error(
                        `Expected ',' between record fields`,
                        parser.peek(-1).loc,
                        `Found ${nextToken.type} instead. Add a comma to separate fields.`,
                    );
                }
                parser.advance(); // Consume comma

                // Skip newlines after comma
                while (parser.check("NEWLINE")) {
                    parser.advance();
                }

                // Check for trailing comma before closing brace
                if (parser.check("RBRACE")) {
                    break; // Trailing comma allowed, exit loop
                }

                // Parse spread or field
                if (parser.check("SPREAD")) {
                    parser.advance(); // consume ...
                    const expr = parseExpression(parser);
                    updates.push({
                        kind: "Spread",
                        expr,
                        loc: parser.peek(-1).loc,
                    });

                    // Skip newlines after spread
                    while (parser.check("NEWLINE")) {
                        parser.advance();
                    }
                } else if (parser.check("IDENTIFIER")) {
                    // Regular field or shorthand
                    const fieldToken = parser.advance();
                    const fieldName = fieldToken.value as string;

                    // Skip newlines before checking for shorthand/colon
                    while (parser.check("NEWLINE")) {
                        parser.advance();
                    }

                    // Check for shorthand: { ...base, name } or { ...base, name, ... }
                    // Note: Commas now required between fields for consistency
                    if (parser.check("COMMA") || parser.check("RBRACE")) {
                        // Shorthand in update: { ...base, name }
                        updates.push({
                            kind: "Field",
                            name: fieldName,
                            value: {
                                kind: "Var",
                                name: fieldName,
                                loc: fieldToken.loc,
                            },
                            loc: fieldToken.loc,
                        });
                    } else {
                        // Full syntax: { ...base, name: value }
                        parser.expect("COLON", "Expected ':' after field name");
                        const value = parseExpression(parser);
                        updates.push({
                            kind: "Field",
                            name: fieldName,
                            value,
                            loc: fieldToken.loc,
                        });
                    }

                    // Skip newlines after field value
                    while (parser.check("NEWLINE")) {
                        parser.advance();
                    }
                } else {
                    // Unexpected token - error will be thrown at top of loop
                    break;
                }
            }

            parser.expect("RBRACE", "Expected '}' after record fields");

            return {
                kind: "RecordUpdate",
                record: spreadExpr,
                updates,
                loc: startLoc,
            };
        }

        // Otherwise, it's normal record construction: { field: value, ... }
        const fields: RecordField[] = [];

        do {
            const fieldToken = parser.expect("IDENTIFIER", "Expected field name");
            const fieldName = fieldToken.value as string;

            // Skip newlines before checking for shorthand/colon
            while (parser.check("NEWLINE")) {
                parser.advance();
            }

            // Check for shorthand: { name } or { name, ... }
            // Note: Commas now required between fields for consistency
            if (parser.check("COMMA") || parser.check("RBRACE")) {
                // Shorthand: { name } → { name: Var(name) }
                fields.push({
                    kind: "Field",
                    name: fieldName,
                    value: {
                        kind: "Var",
                        name: fieldName,
                        loc: fieldToken.loc,
                    },
                    loc: fieldToken.loc,
                });
            } else {
                // Full syntax: { name: value }
                parser.expect("COLON", "Expected ':' after field name");
                const value = parseExpression(parser);

                fields.push({
                    kind: "Field",
                    name: fieldName,
                    value,
                    loc: fieldToken.loc,
                });
            }

            // Skip newlines after field
            while (parser.check("NEWLINE")) {
                parser.advance();
            }

            // Check if we're at the end
            if (parser.check("RBRACE")) {
                break; // End of record
            }

            // Require comma before next field - enhanced error message
            if (!parser.check("COMMA")) {
                const nextToken = parser.peek();
                throw parser.error(
                    `Expected ',' between record fields`,
                    parser.peek(-1).loc,
                    `Found ${nextToken.type} instead. Add a comma to separate fields.`,
                );
            }
            parser.advance(); // Consume comma

            // Skip newlines after comma
            while (parser.check("NEWLINE")) {
                parser.advance();
            }

            // Check for trailing comma
            if (parser.check("RBRACE")) {
                break; // Trailing comma allowed
            }
            // eslint-disable-next-line no-constant-condition
        } while (true);

        parser.expect("RBRACE", "Expected '}' after record fields");

        return {
            kind: "Record",
            fields,
            loc: startLoc,
        };
    } finally {
        // Reset record context flag
        p.inRecordContext = false;
    }
}

/**
 * Parse block expression
 * Syntax: { expr; expr; ... result }
 * Note: LBRACE has already been consumed by caller
 */
export function parseBlockExpr(parser: ParserBase, startLoc: Location): Expr {
    // Already consumed {
    // Leading newlines already skipped by caller

    const exprs: Expr[] = [];

    // Parse expressions separated by explicit semicolons
    while (!parser.check("RBRACE") && !parser.isAtEnd()) {
        const expr = parseExpression(parser);
        exprs.push(expr);

        // Skip optional newlines after expression
        while (parser.match("NEWLINE"));

        // Require semicolon after every statement in block
        if (!parser.check("SEMICOLON")) {
            throw parser.error(
                "Expected ';' after statement in block",
                parser.peek().loc,
                "All statements in a block must end with a semicolon",
            );
        }
        parser.advance(); // Consume the semicolon

        // Skip newlines after semicolon
        while (parser.match("NEWLINE"));

        // Check if closing brace follows (trailing semicolon case)
        if (parser.check("RBRACE")) {
            break;
        }
    }

    parser.expect("RBRACE", "Expected '}' to close block");

    return {
        kind: "Block",
        exprs,
        loc: startLoc,
    };
}

/**
 * Parse let expression
 * Syntax: let [mut] [rec] pattern = value; body
 * Note: This is for let expressions inside blocks, not top-level declarations
 */
function parseLetExpr(parser: ParserBase, startLoc: Location): Expr {
    // 'let' keyword already consumed by caller

    // Check for modifiers
    let mutable = false;
    let recursive = false;

    while (parser.check("KEYWORD")) {
        const mod = parser.peek().value as string;
        if (mod === "mut" && !mutable) {
            mutable = true;
            parser.advance();
        } else if (mod === "rec" && !recursive) {
            recursive = true;
            parser.advance();
        } else {
            break;
        }
    }

    // Parse pattern
    const pattern = parsePattern(parser);

    // Optional type annotation
    if (parser.match("COLON")) {
        // Skip type annotation for now (will be used by type checker)
        parseTypeExpr(parser);
    }

    // Expect =
    parser.expect("OP_EQUALS", "Expected '=' after let pattern");

    // Parse value expression
    const value = parseExpression(parser);

    // Skip optional newlines after value
    while (parser.match("NEWLINE"));

    // Require explicit semicolon after let binding
    if (!parser.check("SEMICOLON")) {
        throw parser.error(
            "Expected ';' after let binding",
            parser.peek().loc,
            "Let expressions in blocks must be followed by a semicolon",
        );
    }
    parser.advance(); // Consume the semicolon

    // Skip newlines after semicolon
    while (parser.match("NEWLINE"));

    // Parse body (rest of block)
    // For nested let expressions, we parse another expression
    // For the final expression, this will be the result
    const body = parseExpression(parser);

    return {
        kind: "Let",
        pattern,
        value,
        body,
        mutable,
        recursive,
        loc: startLoc,
    };
}
