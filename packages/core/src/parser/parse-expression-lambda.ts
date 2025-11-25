/**
 * Lambda and Parenthesized Expression Parsing Module
 *
 * Handles lambda expressions, parenthesized expressions, and operator section detection.
 */

import type { Expr, LambdaParam, Location, TypeExpr } from "../types/index.js";
import type { ParserBase } from "./parser-base.js";

// Forward declarations (injected by aggregator)
// Initialized to error-throwing functions for type safety and better error messages
let parsePatternFn: (parser: ParserBase) => import("../types/index.js").Pattern = () => {
    throw new Error("parsePatternFn not initialized - setDependencies must be called first");
};
let parseTypeExprFn: (parser: ParserBase) => TypeExpr = () => {
    throw new Error("parseTypeExprFn not initialized - setDependencies must be called first");
};
let parseExpressionFn: (parser: ParserBase) => Expr = () => {
    throw new Error("parseExpressionFn not initialized - setDependencies must be called first");
};
let parseLambdaFn: (parser: ParserBase) => Expr = () => {
    throw new Error("parseLambdaFn not initialized - setDependencies must be called first");
};

/**
 * Set the dependent parsers (called during initialization)
 */
export function setDependencies(fns: {
    parsePattern: (parser: ParserBase) => import("../types/index.js").Pattern;
    parseTypeExpr: (parser: ParserBase) => TypeExpr;
    parseExpression: (parser: ParserBase) => Expr;
    parseLambda: (parser: ParserBase) => Expr;
}): void {
    parsePatternFn = fns.parsePattern;
    parseTypeExprFn = fns.parseTypeExpr;
    parseExpressionFn = fns.parseExpression;
    parseLambdaFn = fns.parseLambda;
}

/**
 * Helper to check if current token is an operator
 */
export function isOperatorToken(parser: ParserBase): boolean {
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
 * Parse a single lambda parameter (pattern with optional type annotation)
 * Supports: x, { name }, [a, b], (x, y), x: Int, { name }: { name: String }, etc.
 */
export function parseLambdaParam(parser: ParserBase): LambdaParam {
    const pattern = parsePatternFn(parser);

    // Skip newlines after pattern
    while (parser.check("NEWLINE")) {
        parser.advance();
    }

    // Check for optional type annotation: pattern: Type
    if (parser.check("COLON")) {
        parser.advance(); // consume :

        // Skip newlines after colon
        while (parser.check("NEWLINE")) {
            parser.advance();
        }

        const type = parseTypeExprFn(parser);
        return {
            pattern,
            type,
            loc: pattern.loc,
        };
    }

    // No type annotation
    return {
        pattern,
        loc: pattern.loc,
    };
}

/**
 * Check if the content inside parentheses looks like lambda parameters
 * by performing deep lookahead to find the closing paren and check for =>
 */
export function isLikelyLambda(parser: ParserBase): boolean {
    let depth = 1; // We're already inside the opening paren
    let offset = 0;

    // Scan ahead to find the matching closing paren
    while (depth > 0 && parser.peek(offset).type !== "EOF") {
        const token = parser.peek(offset);

        if (token.type === "LPAREN" || token.type === "LBRACKET" || token.type === "LBRACE") {
            depth++;
        } else if (token.type === "RPAREN" || token.type === "RBRACKET" || token.type === "RBRACE") {
            depth--;

            if (depth === 0) {
                // Found the matching closing paren
                // Now check what follows it
                offset++;

                // Skip newlines
                while (parser.peek(offset).type === "NEWLINE") {
                    offset++;
                }

                const next = parser.peek(offset);

                // If followed by => or : (for return type), it's a lambda
                if (next.type === "FAT_ARROW") {
                    return true;
                }

                if (next.type === "COLON") {
                    // Could be return type annotation
                    // Look ahead further for =>
                    // Need to properly skip the entire type expression which may contain {}, (), []
                    offset++;

                    // Skip newlines after colon
                    while (parser.peek(offset).type === "NEWLINE") {
                        offset++;
                    }

                    // Track depth for nested structures in the type expression
                    let typeDepth = 0;

                    // Skip the entire type expression to find =>
                    while (parser.peek(offset).type !== "EOF") {
                        const token = parser.peek(offset);

                        // Track opening brackets/braces/parens
                        if (token.type === "LPAREN" || token.type === "LBRACKET" || token.type === "LBRACE") {
                            typeDepth++;
                        } else if (token.type === "RPAREN" || token.type === "RBRACKET" || token.type === "RBRACE") {
                            typeDepth--;
                        }

                        // Only stop at => when we're at depth 0 (not inside any nested structure)
                        if (typeDepth === 0) {
                            if (token.type === "FAT_ARROW") {
                                return true;
                            }
                            // Also stop if we hit statement terminators at depth 0
                            if (token.type === "SEMICOLON" || token.type === "RBRACE") {
                                return false;
                            }
                        }

                        offset++;
                    }

                    return false;
                }

                return false;
            }
        }

        offset++;
    }

    return false;
}

/**
 * Parse lambda or parenthesized expression starting with LPAREN
 * Handles: () => expr, (x) => expr, (x, y) => expr, or (expr)
 * Note: LPAREN has already been consumed by caller
 */
export function parseLambdaOrParen(parser: ParserBase, startLoc: Location): Expr {
    // Check for bare operator sections: (+), (*), (-), etc.
    // This only catches operators at the start, NOT unary like (-x)
    // We handle left sections like (1 +) later after parsing the expression
    if (isOperatorToken(parser)) {
        const operatorToken = parser.peek();
        const nextToken = parser.peek(1);

        // Check if it's followed by RPAREN - that's a bare operator section
        if (nextToken.type === "RPAREN") {
            throw parser.error("VF2112", operatorToken.loc, {
                hint: "Use a lambda instead. For (+), write: (x, y) -> x + y",
            });
        }

        // Check for right operator sections like (- x) with leading whitespace
        // If the operator has leading whitespace before the identifier, it's a section, not unary
        if (
            nextToken.hasLeadingWhitespace &&
            (nextToken.type === "IDENTIFIER" || nextToken.type === "INT_LITERAL" || nextToken.type === "FLOAT_LITERAL")
        ) {
            throw parser.error("VF2112", operatorToken.loc, {
                hint: `Use a lambda instead. For (${operatorToken.value} x), write: (x) -> ${operatorToken.value}x`,
            });
        }

        // If followed by an identifier or expression without leading whitespace,
        // it might be unary like (-x) or (!flag)
        // Fall through to normal expression parsing
    }

    // Check for closing paren immediately
    if (parser.check("RPAREN")) {
        parser.advance(); // consume )

        // Skip newlines after closing paren
        while (parser.check("NEWLINE")) {
            parser.advance();
        }

        // Check for return type annotation: (): ReturnType => expr
        let returnType: TypeExpr | undefined;
        if (parser.check("COLON")) {
            parser.advance(); // consume :

            // Skip newlines after colon
            while (parser.check("NEWLINE")) {
                parser.advance();
            }

            returnType = parseTypeExprFn(parser);

            // Skip newlines after return type
            while (parser.check("NEWLINE")) {
                parser.advance();
            }
        }

        // Check if it's a lambda: () => expr or (): Type => expr
        if (parser.check("FAT_ARROW")) {
            parser.advance(); // consume =>

            // Skip newlines after => (supports: () =>\nbody)
            while (parser.check("NEWLINE")) {
                parser.advance();
            }

            const body = parseExpressionFn(parser);
            const lambda: Expr = {
                kind: "Lambda",
                params: [],
                body,
                loc: startLoc,
            };

            // Add return type if present
            if (returnType !== undefined) {
                (
                    lambda as {
                        kind: "Lambda";
                        params: LambdaParam[];
                        body: Expr;
                        returnType?: TypeExpr;
                        loc: Location;
                    }
                ).returnType = returnType;
            }

            return lambda;
        }

        // Otherwise, it's a unit literal (but we already consumed potential type annotation - that's an error)
        if (returnType !== undefined) {
            throw parser.error("VF2113", startLoc);
        }

        return {
            kind: "UnitLit",
            loc: startLoc,
        };
    }

    // Lookahead to distinguish lambda from parenthesized expression/tuple
    // Use deep lookahead to check for => or : Type => after the closing paren
    // This allows us to parse lambda parameters as patterns directly
    if (isLikelyLambda(parser)) {
        // Parse lambda parameters as patterns (supports destructuring)
        const params: LambdaParam[] = [];

        // Parse comma-separated lambda parameters
        if (!parser.check("RPAREN")) {
            do {
                // Skip newlines before parameter
                while (parser.check("NEWLINE")) {
                    parser.advance();
                }

                params.push(parseLambdaParam(parser));

                // Skip newlines after parameter
                while (parser.check("NEWLINE")) {
                    parser.advance();
                }

                // Check if there's a comma
                if (!parser.match("COMMA")) {
                    break;
                }

                // Skip newlines after comma
                while (parser.check("NEWLINE")) {
                    parser.advance();
                }

                // Check for trailing comma
                if (parser.check("RPAREN")) {
                    break; // Trailing comma allowed
                }
            } while (true); // eslint-disable-line no-constant-condition
        }

        parser.expect("RPAREN", "Expected closing parenthesis after lambda parameters");

        // Skip newlines after closing paren
        while (parser.check("NEWLINE")) {
            parser.advance();
        }

        // Check for return type annotation: (params): ReturnType => body
        let returnType: TypeExpr | undefined;
        if (parser.check("COLON")) {
            parser.advance(); // consume :

            // Skip newlines after colon
            while (parser.check("NEWLINE")) {
                parser.advance();
            }

            returnType = parseTypeExprFn(parser);

            // Skip newlines after return type
            while (parser.check("NEWLINE")) {
                parser.advance();
            }
        }

        parser.expect("FAT_ARROW", "Expected '=>' for lambda expression");

        // Skip newlines after => (supports: (x, y) =>\nbody)
        while (parser.check("NEWLINE")) {
            parser.advance();
        }

        const body = parseLambdaFn(parser); // Right-associative

        const lambda: Expr = {
            kind: "Lambda",
            params,
            body,
            loc: startLoc,
        };

        // Add return type if present
        if (returnType !== undefined) {
            (
                lambda as { kind: "Lambda"; params: LambdaParam[]; body: Expr; returnType?: TypeExpr; loc: Location }
            ).returnType = returnType;
        }

        return lambda;
    }

    // Not a lambda - parse as parenthesized expression or tuple
    // Parse comma-separated expressions
    const exprs: Expr[] = [];

    // Try to parse expression, catching errors for operator sections
    try {
        exprs.push(parseExpressionFn(parser));

        // Skip newlines after expression
        while (parser.check("NEWLINE")) {
            parser.advance();
        }

        // Check for operator section: (expr op)
        if (isOperatorToken(parser)) {
            throw parser.error("VF2112", parser.peek().loc, {
                hint: `Use a lambda instead. For example: (x) -> x ${parser.peek().value} ...`,
            });
        }

        // Check for comma (potential tuple or multi-param lambda)
        while (parser.match("COMMA")) {
            // Skip newlines after comma
            while (parser.check("NEWLINE")) {
                parser.advance();
            }

            // Check for trailing comma
            if (parser.check("RPAREN")) {
                break; // Trailing comma allowed
            }

            exprs.push(parseExpressionFn(parser));

            // Skip newlines after expression
            while (parser.check("NEWLINE")) {
                parser.advance();
            }
        }
    } catch (error) {
        // If we got "Unexpected token" and the token is RPAREN,
        // and the previous token was an operator, it's likely an operator section
        const isParserError = error instanceof Error && error.name === "ParserError";
        const hasUnexpectedToken = isParserError && (error as Error).message.includes("Unexpected token");

        if (hasUnexpectedToken && parser.check("RPAREN")) {
            // Check if we have consumed some tokens (meaning we parsed part of an expr + op)
            throw parser.error("VF2112", parser.peek().loc, {
                hint: "Use a lambda instead. For example: (x) -> x + ...",
            });
        }
        throw error;
    }

    parser.expect("RPAREN", "Expected closing parenthesis");

    // Note: Lambda cases should have been caught by isLikelyLambda() above
    // This is just a parenthesized expression or tuple
    // Determine if tuple or grouped expression
    if (exprs.length === 1) {
        // Single element: just grouping/precedence, NOT a tuple
        const expr = exprs[0];
        if (!expr) {
            throw parser.error("VF2109", startLoc);
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
