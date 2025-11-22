/**
 * Pattern Parsing Module
 *
 * All pattern parsing logic for match expressions and let bindings.
 */

import type { Location, Pattern, RecordPatternField } from "../types/index.js";
import type { ParserBase } from "./parser-base.js";

import { ParserError } from "../utils/index.js";

// Forward declaration for circular dependency
let parseTypeExpr: (parser: ParserBase) => import("../types/index.js").TypeExpr;

/**
 * Set the type expression parsing function (called during initialization)
 */
export function setParseTypeExpr(fn: (parser: ParserBase) => import("../types/index.js").TypeExpr): void {
    parseTypeExpr = fn;
}

/**
 * Parse a pattern (with or-pattern support)
 * Syntax: pattern ('|' pattern)*
 */
export function parsePattern(parser: ParserBase): Pattern {
    const patterns: Pattern[] = [parsePrimaryPattern(parser)];

    // Or patterns: pattern1 | pattern2 | pattern3
    // Need to be careful not to consume case separators in match expressions
    // The caller (match expression) will handle case separators
    while (parser.check("PIPE")) {
        // Lookahead to distinguish or-pattern from case separator
        // If next token after PIPE can start a pattern, it's an or-pattern
        // Otherwise, it's a case separator (let match handle it)
        const nextToken = parser.peek(1);
        if (
            nextToken.type === "IDENTIFIER" ||
            nextToken.type === "INT_LITERAL" ||
            nextToken.type === "FLOAT_LITERAL" ||
            nextToken.type === "STRING_LITERAL" ||
            nextToken.type === "BOOL_LITERAL" ||
            nextToken.type === "KEYWORD" ||
            nextToken.type === "LBRACE" ||
            nextToken.type === "LBRACKET" ||
            nextToken.type === "LPAREN"
        ) {
            parser.advance(); // consume |
            patterns.push(parsePrimaryPattern(parser));
        } else {
            break; // Not an or-pattern, stop
        }
    }

    if (patterns.length === 1) {
        const pattern = patterns[0];
        if (!pattern) {
            throw new ParserError("Internal error: empty patterns array", parser.peek().loc);
        }
        return pattern;
    }

    const firstPattern = patterns[0];
    if (!firstPattern) {
        throw new ParserError("Internal error: empty patterns array", parser.peek().loc);
    }

    return {
        kind: "OrPattern",
        patterns,
        loc: firstPattern.loc,
    };
}

/**
 * Parse a primary pattern (non-or)
 */
function parsePrimaryPattern(parser: ParserBase): Pattern {
    const startLoc = parser.peek().loc;

    // Wildcard pattern: _
    if (parser.check("IDENTIFIER") && parser.peek().value === "_") {
        parser.advance();
        return { kind: "WildcardPattern", loc: startLoc };
    }

    // Literal patterns: numbers, strings, booleans, null
    if (parser.check("INT_LITERAL") || parser.check("FLOAT_LITERAL")) {
        const token = parser.advance();
        const literal = token.value as number;
        return { kind: "LiteralPattern", literal, loc: startLoc };
    }

    if (parser.check("STRING_LITERAL")) {
        const token = parser.advance();
        const literal = token.value as string;
        return { kind: "LiteralPattern", literal, loc: startLoc };
    }

    if (parser.check("BOOL_LITERAL")) {
        const token = parser.advance();
        const literal = token.value as boolean;
        return { kind: "LiteralPattern", literal, loc: startLoc };
    }

    // Constructor pattern or variable pattern
    if (parser.check("IDENTIFIER")) {
        const nameToken = parser.advance();
        const name = nameToken.value as string;

        // Check for null literal
        if (name === "null") {
            return { kind: "LiteralPattern", literal: null, loc: startLoc };
        }

        // Constructor pattern: PascalCase identifier followed by (
        // Variable pattern: camelCase identifier (or PascalCase without args)
        const firstChar = name.charAt(0);
        const isPascalCase = firstChar >= "A" && firstChar <= "Z";

        if (isPascalCase && parser.check("LPAREN")) {
            // Constructor pattern with arguments: Constructor(arg1, arg2, ...)
            parser.advance(); // consume (

            const args: Pattern[] = [];

            if (!parser.check("RPAREN")) {
                do {
                    args.push(parsePattern(parser));

                    // Check if there's a comma
                    if (!parser.match("COMMA")) {
                        break;
                    }

                    // Check for trailing comma
                    if (parser.check("RPAREN")) {
                        break; // Trailing comma allowed
                    }
                } while (true); // eslint-disable-line no-constant-condition
            }

            parser.expect("RPAREN", "Expected ')' after constructor pattern arguments");

            return {
                kind: "ConstructorPattern",
                constructor: name,
                args,
                loc: startLoc,
            };
        }

        // Nullary constructor pattern: PascalCase without parens
        if (isPascalCase) {
            return {
                kind: "ConstructorPattern",
                constructor: name,
                args: [],
                loc: startLoc,
            };
        }

        // Variable pattern (camelCase only)
        return { kind: "VarPattern", name, loc: startLoc };
    }

    // Tuple pattern or parenthesized pattern: (pattern) or (p1, p2, ...)
    // Or type-annotated pattern: (pattern: Type)
    if (parser.check("LPAREN")) {
        parser.advance(); // consume (

        // Empty tuple: ()
        if (parser.check("RPAREN")) {
            parser.advance();
            return { kind: "TuplePattern", elements: [], loc: startLoc };
        }

        const patterns: Pattern[] = [];
        patterns.push(parsePattern(parser));

        // Check for type annotation: (pattern: Type)
        if (patterns.length === 1 && parser.check("COLON")) {
            parser.advance(); // consume :
            const typeExpr = parseTypeExpr(parser);
            parser.expect("RPAREN", "Expected ')' after type annotation");

            const pattern = patterns[0];
            if (!pattern) {
                throw new ParserError("Internal error: empty patterns array", parser.peek().loc);
            }

            return {
                kind: "TypeAnnotatedPattern",
                pattern,
                typeExpr,
                loc: startLoc,
            };
        }

        while (parser.match("COMMA")) {
            // Check for trailing comma
            if (parser.check("RPAREN")) {
                break; // Trailing comma allowed
            }

            patterns.push(parsePattern(parser));
        }

        parser.expect("RPAREN", "Expected ')' after tuple pattern");

        // Single element: just a parenthesized pattern (return the inner pattern)
        if (patterns.length === 1) {
            const pattern = patterns[0];
            if (!pattern) {
                throw new ParserError("Internal error: empty patterns array", parser.peek().loc);
            }
            return pattern;
        }

        // Multiple elements: tuple pattern
        return { kind: "TuplePattern", elements: patterns, loc: startLoc };
    }

    // Record pattern: { field1, field2: pattern, ... }
    if (parser.check("LBRACE")) {
        parser.advance(); // consume {

        const fields: RecordPatternField[] = [];

        if (!parser.check("RBRACE")) {
            do {
                // Check for shorthand with type annotation: { (name: String), ... }
                if (parser.check("LPAREN")) {
                    const pattern = parsePattern(parser);
                    // After parsing (name: String), we should have a TypeAnnotatedPattern
                    // with a VarPattern inside. Extract the field name from it.
                    let fieldName: string;
                    let fieldPattern: Pattern = pattern;

                    if (pattern.kind === "TypeAnnotatedPattern" && pattern.pattern.kind === "VarPattern") {
                        fieldName = pattern.pattern.name;
                        fieldPattern = pattern;
                    } else if (pattern.kind === "VarPattern") {
                        fieldName = pattern.name;
                        fieldPattern = pattern;
                    } else {
                        throw new ParserError(
                            "Type-annotated record shorthand must use variable pattern",
                            pattern.loc,
                            "Expected (fieldName: Type)",
                        );
                    }

                    fields.push({
                        name: fieldName,
                        pattern: fieldPattern,
                        loc: pattern.loc,
                    });
                } else {
                    const fieldNameToken = parser.expect("IDENTIFIER", "Expected field name in record pattern");
                    const fieldName = fieldNameToken.value as string;

                    // Check for field rename: { field: pattern }
                    if (parser.match("COLON")) {
                        const pattern = parsePattern(parser);
                        fields.push({
                            name: fieldName,
                            pattern,
                            loc: fieldNameToken.loc,
                        });
                    } else {
                        // Field binding: { field } is shorthand for { field: field }
                        fields.push({
                            name: fieldName,
                            pattern: { kind: "VarPattern", name: fieldName, loc: fieldNameToken.loc },
                            loc: fieldNameToken.loc,
                        });
                    }
                }

                // Check if there's a comma
                if (!parser.match("COMMA")) {
                    break;
                }

                // Check for trailing comma
                if (parser.check("RBRACE")) {
                    break; // Trailing comma allowed
                }
            } while (true); // eslint-disable-line no-constant-condition
        }

        parser.expect("RBRACE", "Expected '}' after record pattern");

        return { kind: "RecordPattern", fields, loc: startLoc };
    }

    // List pattern: [elem1, elem2, ...rest]
    if (parser.check("LBRACKET")) {
        parser.advance(); // consume [

        const elements: Pattern[] = [];
        let rest: Pattern | undefined;

        if (!parser.check("RBRACKET")) {
            while (true) {
                // Check for rest pattern: ...rest or ..._
                if (parser.check("SPREAD")) {
                    parser.advance(); // consume ...

                    // Parse rest pattern (can be variable or wildcard)
                    rest = parsePrimaryPattern(parser);

                    // Rest must be the last element
                    break;
                }

                elements.push(parsePattern(parser));

                if (!parser.match("COMMA")) {
                    break;
                }

                // Check for trailing comma
                if (parser.check("RBRACKET")) {
                    break; // Trailing comma allowed
                }
            }
        }

        parser.expect("RBRACKET", "Expected ']' after list pattern");

        const listPattern: {
            kind: "ListPattern";
            elements: Pattern[];
            rest?: Pattern;
            loc: Location;
        } = {
            kind: "ListPattern",
            elements,
            loc: startLoc,
        };

        // Only add rest if it exists (exactOptionalPropertyTypes)
        if (rest !== undefined) {
            listPattern.rest = rest;
        }

        return listPattern;
    }

    throw parser.error(
        "Expected pattern",
        startLoc,
        "Expected a pattern (variable, wildcard, literal, constructor, record, or list)",
    );
}
