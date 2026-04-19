/**
 * Primary Expression Parsing Module
 *
 * Handles literals, variables, and starting tokens for complex expressions.
 */

import type { Expr, ListElement, Location } from "../types/index.js";
import type { ParserBase } from "./parser-base.js";

import { parseTypeParameters } from "./parse-types.js";

// Forward declarations for complex expression parsers (injected by aggregator)
// Initialized to error-throwing functions for type safety and better error messages
let parseLambdaOrParenFn: (parser: ParserBase, startLoc: Location) => Expr = () => {
    throw new Error("parseLambdaOrParenFn not initialized - setComplexParsers must be called first");
};
let parseMatchExprFn: (parser: ParserBase, startLoc: Location) => Expr = () => {
    throw new Error("parseMatchExprFn not initialized - setComplexParsers must be called first");
};
let parseRecordExprFn: (parser: ParserBase, startLoc: Location) => Expr = () => {
    throw new Error("parseRecordExprFn not initialized - setComplexParsers must be called first");
};
let parseBlockExprFn: (parser: ParserBase, startLoc: Location) => Expr = () => {
    throw new Error("parseBlockExprFn not initialized - setComplexParsers must be called first");
};
let parseLetExprFn: (parser: ParserBase, startLoc: Location) => Expr = () => {
    throw new Error("parseLetExprFn not initialized - setComplexParsers must be called first");
};
let parseExpressionFn: (parser: ParserBase) => Expr = () => {
    throw new Error("parseExpressionFn not initialized - setComplexParsers must be called first");
};

/**
 * Set the complex expression parsers (called during initialization)
 */
export function setComplexParsers(fns: {
    parseLambdaOrParen: (parser: ParserBase, startLoc: Location) => Expr;
    parseMatchExpr: (parser: ParserBase, startLoc: Location) => Expr;
    parseRecordExpr: (parser: ParserBase, startLoc: Location) => Expr;
    parseBlockExpr: (parser: ParserBase, startLoc: Location) => Expr;
    parseLetExpr: (parser: ParserBase, startLoc: Location) => Expr;
    parseExpression: (parser: ParserBase) => Expr;
}): void {
    parseLambdaOrParenFn = fns.parseLambdaOrParen;
    parseMatchExprFn = fns.parseMatchExpr;
    parseRecordExprFn = fns.parseRecordExpr;
    parseBlockExprFn = fns.parseBlockExpr;
    parseLetExprFn = fns.parseLetExpr;
    parseExpressionFn = fns.parseExpression;
}

/**
 * Parse a permissive brace-delimited body.
 *
 * Accepts either a single expression (with optional surrounding whitespace)
 * or a multi-statement block with semicolon-separated statements. Returns
 * the single expression directly when there is one statement so the Core
 * AST after desugaring is unchanged from the historical single-expression
 * shape. Used by the `unsafe` and `try` / `catch` parsers, which both
 * allow either form.
 *
 * Consumes the closing RBRACE.
 */
function parseBraceBody(parser: ParserBase, lbraceLoc: Location): Expr {
    // Skip leading newlines inside the braces
    while (parser.match("NEWLINE"));

    // Empty body: unsafe { } → Unit-valued block
    if (parser.check("RBRACE")) {
        parser.advance();
        return { kind: "Block", exprs: [], loc: lbraceLoc };
    }

    const exprs: Expr[] = [];
    while (!parser.check("RBRACE") && !parser.isAtEnd()) {
        exprs.push(parseExpressionFn(parser));

        while (parser.match("NEWLINE"));

        // Allow final expression to omit the trailing semicolon
        if (parser.check("RBRACE")) {
            break;
        }

        if (!parser.check("SEMICOLON")) {
            throw parser.error("VF2107", parser.peek().loc, {
                context: "statements in block",
            });
        }
        parser.advance(); // consume ';'

        while (parser.match("NEWLINE"));
    }

    parser.expect("RBRACE", "Expected '}' to close block");

    if (exprs.length === 1) {
        // Preserve legacy shape: single-expression unsafe bodies are not wrapped
        // in a Block node, so existing AST assertions and optimizer passes keep
        // working unchanged.
        const onlyExpr = exprs[0];
        if (!onlyExpr) {
            throw new Error("Internal error: unsafe body has undefined single expression");
        }
        return onlyExpr;
    }
    return { kind: "Block", exprs, loc: lbraceLoc };
}

/**
 * Parse primary expressions (literals, variables, parenthesized)
 */
export function parsePrimary(parser: ParserBase): Expr {
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

    // Lambda with explicit type parameters: <T>(x: T): T => x
    // Type-inference still infers polymorphic types automatically; the prefix
    // is captured on the AST for future tooling but discarded by the desugarer.
    if (parser.check("OP_LT")) {
        const startLoc = parser.peek().loc;
        const typeParams = parseTypeParameters(parser); // consumes < ... >

        parser.expect("LPAREN", "Expected '(' after type parameters in lambda");
        const lparenLoc = parser.peek(-1).loc;
        const lambda = parseLambdaOrParenFn(parser, lparenLoc);

        if (lambda.kind !== "Lambda") {
            throw parser.error("VF2101", startLoc, {
                tokenType: "token",
                value: "<",
                hint: "Type parameters '<T>' must be followed by a lambda expression",
            });
        }

        return { ...lambda, typeParams, loc: startLoc };
    }

    // Lambda, unit literal, or parenthesized expression
    if (parser.check("LPAREN")) {
        const startLoc = parser.peek().loc;
        parser.advance(); // consume (
        return parseLambdaOrParenFn(parser, startLoc);
    }

    // If expression: if condition then expr1 [else expr2]
    // Else branch is optional; if missing, parser inserts Unit
    if (parser.check("KEYWORD") && parser.peek().value === "if") {
        const startLoc = parser.peek().loc;
        parser.advance(); // consume 'if'

        const condition = parseExpressionFn(parser);

        // Skip newlines before 'then' (supports: if cond\n then expr)
        while (parser.check("NEWLINE")) {
            parser.advance();
        }

        parser.expect("KEYWORD", "Expected 'then' after if condition");
        if (parser.peek(-1).value !== "then") {
            throw parser.error("VF2105", parser.peek(-1).loc);
        }

        const thenExpr = parseExpressionFn(parser);

        // Else branch is optional
        let elseExpr: Expr;
        // Skip newlines before 'else' (supports: if...then expr\n else expr)
        while (parser.check("NEWLINE")) {
            parser.advance();
        }

        if (parser.check("KEYWORD") && parser.peek().value === "else") {
            parser.advance(); // consume 'else'
            elseExpr = parseExpressionFn(parser);
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
        return parseMatchExprFn(parser, startLoc);
    }

    // Unsafe block: unsafe { expr }  OR  unsafe { stmt; stmt; ... expr; }
    if (parser.check("KEYWORD") && parser.peek().value === "unsafe") {
        const startLoc = parser.peek().loc;
        parser.advance(); // consume 'unsafe'

        const lbraceToken = parser.expect("LBRACE", "Expected '{' after 'unsafe'");

        const expr = parseBraceBody(parser, lbraceToken.loc);

        return {
            kind: "Unsafe",
            expr,
            loc: startLoc,
        };
    }

    // Try/catch: try { body } catch (binder) { body }
    if (parser.check("KEYWORD") && parser.peek().value === "try") {
        const startLoc = parser.peek().loc;
        parser.advance(); // consume 'try'

        const tryLBrace = parser.expect("LBRACE", "Expected '{' after 'try'");
        const tryBody = parseBraceBody(parser, tryLBrace.loc);

        // Newlines can appear between the try body and the 'catch' keyword
        while (parser.match("NEWLINE"));

        if (!(parser.check("KEYWORD") && parser.peek().value === "catch")) {
            throw parser.error("VF2107", parser.peek().loc, {
                context: "expected 'catch' after try block",
            });
        }
        parser.advance(); // consume 'catch'

        parser.expect("LPAREN", "Expected '(' after 'catch'");
        const binderToken = parser.expect("IDENTIFIER", "Expected an identifier for catch binder");
        parser.expect("RPAREN", "Expected ')' after catch binder");

        const catchLBrace = parser.expect("LBRACE", "Expected '{' after catch binder");
        const catchBody = parseBraceBody(parser, catchLBrace.loc);

        return {
            kind: "TryCatch",
            tryBody,
            catchBinder: binderToken.value as string,
            catchBody,
            loc: startLoc,
        };
    }

    // While loop: while condition { body }
    if (parser.check("KEYWORD") && parser.peek().value === "while") {
        const startLoc = parser.peek().loc;
        parser.advance(); // consume 'while'

        const condition = parseExpressionFn(parser);

        const lbraceToken = parser.expect("LBRACE", "Expected '{' after while condition");

        // Skip leading newlines inside block
        while (parser.match("NEWLINE"));

        // Parse body as block expression (consumes RBRACE internally)
        const body = parseBlockExprFn(parser, lbraceToken.loc);

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
        return parseLetExprFn(parser, startLoc);
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
                    const spreadExpr = parseExpressionFn(parser);
                    elements.push({ kind: "Spread", expr: spreadExpr });
                } else {
                    const expr = parseExpressionFn(parser);
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

        // Empty braces - treat as empty block per spec (functions-composition.md:167)
        // An empty block {} has type Unit and evaluates to ()
        if (parser.check("RBRACE")) {
            parser.advance();
            return {
                kind: "Block",
                exprs: [],
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
                return parseBlockExprFn(parser, startLoc);
            }
        }

        // Check for record spread: { ...expr, ... }
        if (parser.check("SPREAD")) {
            return parseRecordExprFn(parser, startLoc);
        }

        // Check for record update: { id | ... } or { keyword | ... }
        if ((parser.check("IDENTIFIER") || parser.check("KEYWORD")) && parser.peek(1).type === "PIPE") {
            return parseRecordExprFn(parser, startLoc);
        }

        // Check for record construction: { id : ... } or { keyword : ... }
        if ((parser.check("IDENTIFIER") || parser.check("KEYWORD")) && parser.peek(1).type === "COLON") {
            return parseRecordExprFn(parser, startLoc);
        }

        // Check for record shorthand: { id } or { id, ... }
        // Lookahead past newlines to check for COMMA or RBRACE
        // Note: Single-field records like { name } are still valid (detected by RBRACE)
        // Multiple fields now require commas between them for consistency
        // Note: Keywords cannot use shorthand, but we still need to detect them to give a clear error
        if (parser.check("IDENTIFIER") || parser.check("KEYWORD")) {
            let offset = 1;
            while (parser.peek(offset).type === "NEWLINE") {
                offset++;
            }
            const nextToken = parser.peek(offset);
            if (nextToken.type === "COMMA" || nextToken.type === "RBRACE") {
                return parseRecordExprFn(parser, startLoc);
            }
        }

        // Need to parse first expression to check for semicolon
        // Save position for potential rollback
        const p = parser as unknown as { current: number };
        const checkpoint = p.current;
        try {
            parseExpressionFn(parser);

            // Check for semicolon → block
            if (parser.check("SEMICOLON")) {
                // Rollback and parse as block
                p.current = checkpoint;
                return parseBlockExprFn(parser, startLoc);
            }

            // Check for closing brace → single expression could be block or ambiguous
            if (parser.check("RBRACE")) {
                // Ambiguous case: { expr }
                // This could be a record field shorthand OR a single-expression block
                // Decision: require semicolon for blocks, so this is an error
                throw parser.error("VF2107", startLoc, {
                    context: "statements in block",
                });
            }

            // If we get here, there's more content but no semicolon
            // This is likely a malformed record or block
            throw parser.error("VF2107", parser.peek().loc, {
                context: "statements in block",
            });
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
    const token = parser.peek();
    const value = token.type === "KEYWORD" ? token.value : token.type;
    throw parser.error("VF2101", token.loc, {
        tokenType: token.type === "KEYWORD" ? "keyword" : "token",
        value: String(value),
        hint: "Expected an expression (literal, variable, or parenthesized expression)",
    });
}
