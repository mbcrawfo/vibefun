/**
 * Expression Operator Parsing Module
 *
 * Handles operator precedence chain using precedence climbing algorithm.
 * Expression parsing uses a precedence climbing approach with 16 precedence levels.
 */

import type { Expr, TypeExpr } from "../types/index.js";
import type { ParserBase } from "./parser-base.js";

// Forward declarations (injected by aggregator)
let parsePrimaryFn: (parser: ParserBase) => Expr;
let parseTypeExprFn: (parser: ParserBase) => TypeExpr;

/**
 * Set the primary expression parser (called during initialization)
 */
export function setParsePrimary(fn: (parser: ParserBase) => Expr): void {
    parsePrimaryFn = fn;
}

/**
 * Set the type expression parser (called during initialization)
 */
export function setParseTypeExpr(fn: (parser: ParserBase) => TypeExpr): void {
    parseTypeExprFn = fn;
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
export function parseLambda(parser: ParserBase): Expr {
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
            const pattern = {
                kind: "VarPattern" as const,
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
            const typeExpr = parseTypeExprFn(parser);
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
export function parseLogicalOr(parser: ParserBase): Expr {
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
            const binaryContexts = [
                "IDENTIFIER",
                "RPAREN",
                "RBRACKET",
                "RBRACE",
                "INT_LITERAL",
                "FLOAT_LITERAL",
                "STRING_LITERAL",
                "BOOL_LITERAL",
            ] as const;

            if (binaryContexts.includes(prevType as (typeof binaryContexts)[number])) {
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
    let expr = parsePrimaryFn(parser);

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

                    // Check if there's a comma
                    if (!parser.match("COMMA")) {
                        break;
                    }

                    // Skip newlines after comma (supports: f(a,\n b))
                    while (parser.check("NEWLINE")) {
                        parser.advance();
                    }

                    // Check for trailing comma
                    if (parser.check("RPAREN")) {
                        break; // Trailing comma allowed
                    }
                } while (true); // eslint-disable-line no-constant-condition
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
            const fieldNameResult = parser.expectFieldName("field access");
            const field = fieldNameResult.name;

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
