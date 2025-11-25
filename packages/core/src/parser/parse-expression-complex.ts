/**
 * Complex Expression Parsing Module
 *
 * Handles match expressions, record construction/update, block expressions, and let expressions.
 */

import type { Expr, Location, MatchCase, RecordField } from "../types/index.js";
import type { ParserBase } from "./parser-base.js";

// Forward declarations (injected by aggregator)
// Initialized to error-throwing functions for type safety and better error messages
let parsePatternFn: (parser: ParserBase) => import("../types/index.js").Pattern = () => {
    throw new Error("parsePatternFn not initialized - setDependencies must be called first");
};
let parseTypeExprFn: (parser: ParserBase) => import("../types/index.js").TypeExpr = () => {
    throw new Error("parseTypeExprFn not initialized - setDependencies must be called first");
};
let parseExpressionFn: (parser: ParserBase) => Expr = () => {
    throw new Error("parseExpressionFn not initialized - setDependencies must be called first");
};
let parseLogicalOrFn: (parser: ParserBase) => Expr = () => {
    throw new Error("parseLogicalOrFn not initialized - setDependencies must be called first");
};

/**
 * Set the dependent parsers (called during initialization)
 */
export function setDependencies(fns: {
    parsePattern: (parser: ParserBase) => import("../types/index.js").Pattern;
    parseTypeExpr: (parser: ParserBase) => import("../types/index.js").TypeExpr;
    parseExpression: (parser: ParserBase) => Expr;
    parseLogicalOr: (parser: ParserBase) => Expr;
}): void {
    parsePatternFn = fns.parsePattern;
    parseTypeExprFn = fns.parseTypeExpr;
    parseExpressionFn = fns.parseExpression;
    parseLogicalOrFn = fns.parseLogicalOr;
}

/**
 * Parse match expression
 * Syntax: match expr { | pattern => body | pattern when guard => body ... }
 * Note: 'match' keyword has already been consumed by caller
 */
export function parseMatchExpr(parser: ParserBase, startLoc: Location): Expr {
    const expr = parseExpressionFn(parser);

    parser.expect("LBRACE", "Expected '{' after match expression");

    // Parse match cases - skip leading newlines
    while (parser.match("NEWLINE"));

    // Validate at least one case before loop
    if (parser.check("RBRACE")) {
        throw parser.error("VF2100", parser.peek().loc);
    }

    // ALL cases require leading pipe (including first)
    const cases: MatchCase[] = [];
    while (!parser.check("RBRACE") && !parser.isAtEnd()) {
        // Require pipe for every case
        parser.expect("PIPE", "Match case must begin with '|'");

        // Parse pattern
        const pattern = parsePatternFn(parser);

        // Optional guard: when expr
        let guard: Expr | undefined;
        if (parser.check("KEYWORD") && parser.peek().value === "when") {
            parser.advance(); // consume 'when'
            // Guard expression - parse up to logical OR level to allow || but not |> pipe
            // This allows: when x > 0 && y < 10 || z == 5
            guard = parseLogicalOrFn(parser);
        }

        // Fat arrow
        parser.expect("FAT_ARROW", "Expected '=>' after match pattern");

        // Body - now that PIPE is required at the START of each case,
        // we can use parseExpression() which allows lambdas in match bodies
        const body = parseExpressionFn(parser);

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
export function parseRecordExpr(parser: ParserBase, startLoc: Location): Expr {
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
            const spreadExpr = parseExpressionFn(parser);

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
                    throw parser.error("VF2110", parser.peek(-1).loc, {
                        expected: "'}' to close record",
                        context: "record field",
                    });
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
                    const expr = parseExpressionFn(parser);
                    updates.push({
                        kind: "Spread",
                        expr,
                        loc: parser.peek(-1).loc,
                    });

                    // Skip newlines after spread
                    while (parser.check("NEWLINE")) {
                        parser.advance();
                    }
                } else if (parser.check("IDENTIFIER") || parser.check("KEYWORD")) {
                    // Regular field or shorthand
                    const fieldNameResult = parser.expectFieldName("record update");
                    const fieldName = fieldNameResult.name;
                    const fieldLoc = fieldNameResult.loc;

                    // Skip newlines before checking for shorthand/colon
                    while (parser.check("NEWLINE")) {
                        parser.advance();
                    }

                    // Check for shorthand: { ...base, name } or { ...base, name, ... }
                    // Note: Commas now required between fields for consistency
                    if (parser.check("COMMA") || parser.check("RBRACE")) {
                        // Check if field is a keyword - can't use shorthand with keywords
                        const token = parser.peek(-1); // Get the field name token we just consumed
                        if (token.type === "KEYWORD") {
                            throw parser.error("VF2201", fieldLoc, { keyword: fieldName });
                        }

                        // Shorthand in update: { ...base, name }
                        updates.push({
                            kind: "Field",
                            name: fieldName,
                            value: {
                                kind: "Var",
                                name: fieldName,
                                loc: fieldLoc,
                            },
                            loc: fieldLoc,
                        });
                    } else {
                        // Full syntax: { ...base, name: value }
                        parser.expect("COLON", "Expected ':' after field name");
                        const value = parseExpressionFn(parser);
                        updates.push({
                            kind: "Field",
                            name: fieldName,
                            value,
                            loc: fieldLoc,
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
            const fieldNameResult = parser.expectFieldName("record expression");
            const fieldName = fieldNameResult.name;
            const fieldLoc = fieldNameResult.loc;

            // Skip newlines before checking for shorthand/colon
            while (parser.check("NEWLINE")) {
                parser.advance();
            }

            // Check for shorthand: { name } or { name, ... }
            // Note: Commas now required between fields for consistency
            if (parser.check("COMMA") || parser.check("RBRACE")) {
                // Check if field is a keyword - can't use shorthand with keywords
                const token = parser.peek(-1); // Get the field name token we just consumed
                if (token.type === "KEYWORD") {
                    throw parser.error("VF2201", fieldLoc, { keyword: fieldName });
                }

                // Shorthand: { name } → { name: Var(name) }
                fields.push({
                    kind: "Field",
                    name: fieldName,
                    value: {
                        kind: "Var",
                        name: fieldName,
                        loc: fieldLoc,
                    },
                    loc: fieldLoc,
                });
            } else {
                // Full syntax: { name: value }
                parser.expect("COLON", "Expected ':' after field name");
                const value = parseExpressionFn(parser);

                fields.push({
                    kind: "Field",
                    name: fieldName,
                    value,
                    loc: fieldLoc,
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
                throw parser.error("VF2110", parser.peek(-1).loc, {
                    expected: "'}' to close record",
                    context: "record field",
                });
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
        const expr = parseExpressionFn(parser);
        exprs.push(expr);

        // Skip optional newlines after expression
        while (parser.match("NEWLINE"));

        // Require semicolon after every statement in block
        if (!parser.check("SEMICOLON")) {
            throw parser.error("VF2107", parser.peek().loc, {
                context: "statements in block",
            });
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
export function parseLetExpr(parser: ParserBase, startLoc: Location): Expr {
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
    const pattern = parsePatternFn(parser);

    // Optional type annotation
    if (parser.match("COLON")) {
        // Skip type annotation for now (will be used by type checker)
        parseTypeExprFn(parser);
    }

    // Expect =
    parser.expect("OP_EQUALS", "Expected '=' after let pattern");

    // Parse value expression
    const value = parseExpressionFn(parser);

    // Skip optional newlines after value
    while (parser.match("NEWLINE"));

    // Require explicit semicolon after let binding
    if (!parser.check("SEMICOLON")) {
        throw parser.error("VF2107", parser.peek().loc, {
            context: "let binding and body",
        });
    }
    parser.advance(); // Consume the semicolon

    // Skip newlines after semicolon
    while (parser.match("NEWLINE"));

    // Parse body (rest of block)
    // For nested let expressions, we parse another expression
    // For the final expression, this will be the result
    const body = parseExpressionFn(parser);

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
