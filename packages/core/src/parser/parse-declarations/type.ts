/**
 * Type Declaration Parsing
 *
 * Parses `type` declarations (aliases, records, variant types), including
 * the shared `parseTypeDeclBody` entry point used for `and`-chained
 * mutually recursive type declarations.
 */

import type {
    Declaration,
    Location,
    RecordTypeField,
    TypeDefinition,
    TypeExpr,
    VariantConstructor,
} from "../../types/index.js";
import type { ParserBase } from "../parser-base.js";

import { parseTypeParameters } from "../parse-types.js";
import { parseFunctionType, parseTypeExpr } from "./shared-state.js";

/**
 * Parse type declaration body (without consuming 'type' keyword)
 * Syntax: Name<T, U> = definition
 * Used internally by parseTypeDecl and for 'and' keyword chaining
 */
export function parseTypeDeclBody(parser: ParserBase, exported: boolean, startLoc: Location): Declaration {
    // Parse type name
    const nameToken = parser.expect("IDENTIFIER", "Expected type name");
    const name = nameToken.value as string;

    // Parse type parameters: <T, U, V> or <T, U, V,>
    const params = parseTypeParameters(parser);

    // Expect =
    parser.expect("OP_EQUALS", "Expected '=' after type name");

    // Parse type definition
    const definition = parseTypeDefinition(parser);

    return {
        kind: "TypeDecl",
        name,
        params,
        definition,
        exported,
        loc: startLoc,
    };
}

/**
 * Parse type declaration
 * Syntax: type Name<T, U> = definition
 */
export function parseTypeDecl(parser: ParserBase, exported: boolean): Declaration {
    const startLoc = parser.peek().loc;
    parser.advance(); // consume 'type'

    return parseTypeDeclBody(parser, exported, startLoc);
}

/**
 * Parse type definition (alias, record, or variant)
 */
function parseTypeDefinition(parser: ParserBase): TypeDefinition {
    const startLoc = parser.peek().loc;

    // Record type: { ... }
    if (parser.check("LBRACE")) {
        parser.advance(); // consume {

        const fields: RecordTypeField[] = [];

        if (!parser.check("RBRACE")) {
            do {
                const fieldNameResult = parser.expectFieldName("record type");
                const fieldName = fieldNameResult.name;
                const fieldLoc = fieldNameResult.loc;

                parser.expect("COLON", "Expected ':' after field name");

                const typeExpr = parseTypeExpr(parser);

                fields.push({
                    name: fieldName,
                    typeExpr,
                    loc: fieldLoc,
                });
            } while (parser.match("COMMA"));
        }

        parser.expect("RBRACE", "Expected '}' after record type fields");

        return {
            kind: "RecordTypeDef",
            fields,
            loc: startLoc,
        };
    }

    // Skip newlines after = sign
    while (parser.match("NEWLINE"));

    // Check for optional leading pipe (for multiline variant syntax)
    // type Result<t, e> =
    //     | Ok(t)
    //     | Err(e)
    if (parser.check("PIPE")) {
        parser.advance(); // consume leading |
        // Skip newlines after pipe
        while (parser.match("NEWLINE"));
    }

    // Variant or alias - parse first constructor/type
    const firstType = parseFunctionType(parser);

    // Skip newlines after first type (for multi-line variant types)
    while (parser.match("NEWLINE"));

    // String-literal union alias: `type Status = "a" | "b" | "c"`. When the
    // first alternative is a string-literal type, this cannot be a variant
    // declaration — variants require constructor identifiers. Parse the tail
    // as additional type alternatives and return an AliasType wrapping a
    // UnionType. This must come before the variant-constructor branch below
    // because that branch errors (VF2006) on any non-constructor `firstType`.
    if (firstType.kind === "StringLiteralType" && parser.check("PIPE")) {
        const alternatives: TypeExpr[] = [firstType];
        while (true) {
            while (parser.match("NEWLINE"));
            if (!parser.match("PIPE")) {
                break;
            }
            while (parser.match("NEWLINE"));
            alternatives.push(parseFunctionType(parser));
        }

        const unionType: TypeExpr = {
            kind: "UnionType",
            types: alternatives,
            loc: firstType.loc,
        };

        return {
            kind: "AliasType",
            typeExpr: unionType,
            loc: startLoc,
        };
    }

    // Check if this is a variant type (has | separator)
    if (parser.check("PIPE")) {
        // Variant type: Constructor1(T) | Constructor2(U) | ...
        const constructors: VariantConstructor[] = [];

        // Process first constructor
        if (firstType.kind === "TypeApp" && firstType.constructor.kind === "TypeConst") {
            // Constructor with args: Some(T)
            constructors.push({
                name: (firstType.constructor as Extract<TypeExpr, { kind: "TypeConst" }>).name,
                args: firstType.args,
                loc: firstType.loc,
            });
        } else if (firstType.kind === "TypeConst") {
            // Nullary constructor: None
            constructors.push({
                name: firstType.name,
                args: [],
                loc: firstType.loc,
            });
        } else {
            throw parser.error("VF2006", firstType.loc);
        }

        // Parse remaining constructors
        while (true) {
            // Skip optional newlines before next pipe
            while (parser.match("NEWLINE"));

            // Check for next variant separator
            if (!parser.match("PIPE")) {
                break;
            }

            // Skip optional newlines after pipe
            while (parser.match("NEWLINE"));

            const constrType = parseFunctionType(parser);

            if (constrType.kind === "TypeApp" && constrType.constructor.kind === "TypeConst") {
                constructors.push({
                    name: (constrType.constructor as Extract<TypeExpr, { kind: "TypeConst" }>).name,
                    args: constrType.args,
                    loc: constrType.loc,
                });
            } else if (constrType.kind === "TypeConst") {
                constructors.push({
                    name: constrType.name,
                    args: [],
                    loc: constrType.loc,
                });
            } else {
                throw parser.error("VF2006", constrType.loc);
            }
        }

        return {
            kind: "VariantTypeDef",
            constructors,
            loc: startLoc,
        };
    }

    // Type alias: type Alias = OtherType
    return {
        kind: "AliasType",
        typeExpr: firstType,
        loc: startLoc,
    };
}
