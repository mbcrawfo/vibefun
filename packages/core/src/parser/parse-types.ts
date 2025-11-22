/**
 * Type Expression Parsing Module
 *
 * All type expression parsing logic for type annotations and declarations.
 */

import type { RecordTypeField, TypeExpr } from "../types/index.js";
import type { ParserBase } from "./parser-base.js";

import { ParserError } from "../utils/index.js";

/**
 * Parse a type expression (with union support)
 * Syntax: type ('|' type)*
 * Note: VariantType is constructed in type declarations, not type expressions
 */
export function parseTypeExpr(parser: ParserBase): TypeExpr {
    const types: TypeExpr[] = [parseFunctionType(parser)];

    // Check for union separators
    while (parser.check("PIPE")) {
        // Lookahead to check if this is a union separator
        const nextToken = parser.peek(1);
        if (nextToken.type === "IDENTIFIER" || nextToken.type === "LPAREN" || nextToken.type === "LBRACE") {
            parser.advance(); // consume |
            types.push(parseFunctionType(parser));
        } else {
            break; // Not a union separator
        }
    }

    if (types.length === 1) {
        const type = types[0];
        if (!type) {
            throw new ParserError("Internal error: empty types array", parser.peek().loc);
        }
        return type;
    }

    const firstType = types[0];
    if (!firstType) {
        throw new ParserError("Internal error: empty types array", parser.peek().loc);
    }

    return {
        kind: "UnionType",
        types,
        loc: firstType.loc,
    };
}

/**
 * Parse function type
 * Syntax: type '->' type  or  (type, type, ...) -> type
 *
 * Note: When a TupleType appears before ->, it's flattened into function parameters.
 * For example: (Int, String) -> Bool has TWO params (Int and String)
 * But ((Int, String)) -> Bool has ONE param (a TupleType)
 */
export function parseFunctionType(parser: ParserBase): TypeExpr {
    const left = parsePrimaryType(parser);

    // Check for function type arrow
    if (parser.check("ARROW")) {
        parser.advance(); // consume ->

        // Left side becomes parameter(s)
        // If left is TupleType, flatten its elements to params
        const params: TypeExpr[] = left.kind === "TupleType" ? left.elements : [left];
        const return_ = parseFunctionType(parser); // Right-associative

        return {
            kind: "FunctionType",
            params,
            return_,
            loc: left.loc,
        };
    }

    return left;
}

/**
 * Parse primary type (variables, constants, applications, records, parenthesized)
 */
function parsePrimaryType(parser: ParserBase): TypeExpr {
    const startLoc = parser.peek().loc;

    // Parenthesized type or tuple-style function params: (T) or (T, U, V) -> R
    if (parser.check("LPAREN")) {
        parser.advance(); // consume (

        if (parser.check("RPAREN")) {
            // Unit type: ()
            parser.advance();
            return { kind: "TypeConst", name: "Unit", loc: startLoc };
        }

        const types: TypeExpr[] = [];
        do {
            types.push(parseTypeExpr(parser));

            // Skip newlines after type
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

        parser.expect("RPAREN", "Expected ')' after type");

        // If single type, return it (grouping); if multiple, return TupleType
        if (types.length === 1) {
            const type = types[0];
            if (!type) {
                throw new ParserError("Internal error: empty types array", parser.peek().loc);
            }
            return type;
        }

        // Multiple types in parens = tuple type
        return {
            kind: "TupleType",
            elements: types,
            loc: startLoc,
        };
    }

    // Record type: { field: Type, ... }
    if (parser.check("LBRACE")) {
        parser.advance(); // consume {

        const fields: RecordTypeField[] = [];

        if (!parser.check("RBRACE")) {
            do {
                const fieldNameToken = parser.expect("IDENTIFIER", "Expected field name in record type");
                const fieldName = fieldNameToken.value as string;

                parser.expect("COLON", "Expected ':' after field name in record type");

                const typeExpr = parseTypeExpr(parser);

                fields.push({
                    name: fieldName,
                    typeExpr,
                    loc: fieldNameToken.loc,
                });

                // Skip newlines after field
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
                if (parser.check("RBRACE")) {
                    break; // Trailing comma allowed
                }
            } while (true); // eslint-disable-line no-constant-condition
        }

        parser.expect("RBRACE", "Expected '}' after record type");

        return { kind: "RecordType", fields, loc: startLoc };
    }

    // Type variable or type constant
    if (parser.check("IDENTIFIER")) {
        const token = parser.advance();
        const name = token.value as string;

        // Type application: List<T>, Option<Int>, Map<K, V>
        if (parser.check("OP_LT")) {
            parser.advance(); // consume <

            const args: TypeExpr[] = [];
            do {
                args.push(parseTypeExpr(parser));

                // Check if there's a comma
                if (!parser.match("COMMA")) {
                    break;
                }

                // Check for trailing comma
                if (parser.check("OP_GT") || parser.check("OP_GT_GT")) {
                    break; // Trailing comma allowed
                }
            } while (true); // eslint-disable-line no-constant-condition

            // Handle >> as two > tokens for nested generics
            // Access tokens via type assertion
            const p = parser as unknown as {
                tokens: Array<{ type: string; value: unknown; loc: unknown }>;
                current: number;
            };
            if (parser.check("OP_GT_GT")) {
                // Split >> into > and >
                // Consume one > and leave the other for the outer type application
                const gtgtToken = parser.advance();
                // Insert a synthetic GT token for the outer level
                p.tokens.splice(p.current, 0, {
                    type: "OP_GT",
                    value: ">",
                    loc: gtgtToken.loc,
                });
            } else {
                parser.expect("OP_GT", "Expected '>' after type arguments");
            }

            // Constructor is the identifier we just parsed
            const constructor: TypeExpr = {
                kind: "TypeConst",
                name,
                loc: token.loc,
            };

            return {
                kind: "TypeApp",
                constructor,
                args,
                loc: startLoc,
            };
        }

        // Check if constructor with args (for variant types): Some(T)
        if (parser.check("LPAREN")) {
            parser.advance(); // consume (

            const args: TypeExpr[] = [];

            if (!parser.check("RPAREN")) {
                do {
                    args.push(parseTypeExpr(parser));

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

            parser.expect("RPAREN", "Expected ')' after constructor arguments");

            // This is TypeApp with TypeConst constructor
            const constructor: TypeExpr = {
                kind: "TypeConst",
                name,
                loc: token.loc,
            };

            return {
                kind: "TypeApp",
                constructor,
                args,
                loc: startLoc,
            };
        }

        // Determine if type variable or type constant by case
        // Type variables: lowercase (a, t, elem)
        // Type constants: PascalCase (Int, String, List)
        const firstChar = name.charAt(0);
        const isTypeVar = firstChar >= "a" && firstChar <= "z";

        if (isTypeVar) {
            return { kind: "TypeVar", name, loc: token.loc };
        } else {
            return { kind: "TypeConst", name, loc: token.loc };
        }
    }

    throw parser.error(
        "Expected type expression",
        startLoc,
        "Expected a type (variable, constant, function type, record type, or parenthesized type)",
    );
}
