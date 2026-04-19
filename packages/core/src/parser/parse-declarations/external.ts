/**
 * External Declaration Parsing
 *
 * Parses `external` declarations and blocks, including individual
 * external values/types and block items.
 */

import type { Declaration, ExternalBlockItem, Location } from "../../types/index.js";
import type { ParserBase } from "../parser-base.js";

import { parseTypeParameters } from "../parse-types.js";
import { parseTypeExpr } from "./shared-state.js";

/**
 * Parse external declaration or block
 * Syntax: external name: type = "jsName" [from "module"]
 *         external { ... }
 *         external from "module" { ... }
 */
export function parseExternalDeclOrBlock(parser: ParserBase, exported: boolean): Declaration {
    const startLoc = parser.peek().loc;
    parser.advance(); // consume 'external'

    // Check for block syntax
    if (parser.check("LBRACE")) {
        parser.advance(); // consume '{'
        return parseExternalBlock(parser, exported, startLoc, undefined);
    }

    // Check for "from" clause before block
    if (parser.check("KEYWORD") && parser.peek().value === "from") {
        parser.advance(); // consume 'from'
        const moduleToken = parser.expect("STRING_LITERAL", "Expected module name after 'from'");
        const from = moduleToken.value as string;

        // Must be followed by block
        parser.expect("LBRACE", "Expected '{' after 'from \"module\"'");
        return parseExternalBlock(parser, exported, startLoc, from);
    }

    // Single external declaration
    return parseExternalDecl(parser, exported, startLoc);
}

/**
 * Parse single external declaration
 * Syntax: name: type = "jsName" [from "module"]
 * Note: 'external' keyword already consumed by caller
 */
function parseExternalDecl(parser: ParserBase, exported: boolean, startLoc: Location): Declaration {
    // Parse name
    const nameToken = parser.expect("IDENTIFIER", "Expected external name");
    const name = nameToken.value as string;

    // Expect :
    parser.expect("COLON", "Expected ':' after external name");

    // Parse optional type parameters: <T, U, V>
    const typeParams = parseTypeParameters(parser);

    // Parse type
    const typeExpr = parseTypeExpr(parser);

    // Expect =
    parser.expect("OP_EQUALS", "Expected '=' after external type");

    // Parse JS name (string literal)
    const jsNameToken = parser.expect("STRING_LITERAL", "Expected string literal for JS name");
    const jsName = jsNameToken.value as string;

    // Optional: from "module"
    let from: string | undefined;
    if (parser.check("KEYWORD") && parser.peek().value === "from") {
        parser.advance(); // consume 'from'
        const moduleToken = parser.expect("STRING_LITERAL", "Expected module name");
        from = moduleToken.value as string;
    }

    return {
        kind: "ExternalDecl",
        name,
        ...(typeParams.length > 0 && { typeParams }),
        typeExpr,
        jsName,
        ...(from !== undefined && { from }),
        exported,
        loc: startLoc,
    };
}

/**
 * Parse external block
 * Syntax: item1, item2, ...
 * Note: '{' already consumed by caller, this parses items until '}'
 */
function parseExternalBlock(
    parser: ParserBase,
    exported: boolean,
    startLoc: Location,
    from: string | undefined,
): Declaration {
    // '{' already consumed by caller, parse items until '}'

    const items: ExternalBlockItem[] = [];

    // Skip leading newlines
    while (parser.match("NEWLINE"));

    // Parse items until we hit }
    while (!parser.check("RBRACE") && !parser.isAtEnd()) {
        // Skip newlines between items
        while (parser.match("NEWLINE"));

        if (parser.check("RBRACE")) break;

        // Parse item (value or type)
        const item = parseExternalBlockItem(parser);
        items.push(item);

        // Skip newlines after item
        while (parser.match("NEWLINE"));

        // Require semicolon after item (unless at closing brace)
        if (!parser.check("RBRACE")) {
            if (!parser.check("SEMICOLON")) {
                throw parser.error("VF2007", parser.peek().loc);
            }
            parser.advance(); // Consume the semicolon
        }

        // Skip newlines after semicolon
        while (parser.match("NEWLINE"));
    }

    parser.expect("RBRACE", "Expected '}' after external block");

    return {
        kind: "ExternalBlock",
        items,
        ...(from !== undefined && { from }),
        exported,
        loc: startLoc,
    };
}

/**
 * Parse external block item (value or type)
 * Syntax: name: type = "jsName"
 *         type Name = TypeExpr
 */
function parseExternalBlockItem(parser: ParserBase): ExternalBlockItem {
    const startLoc = parser.peek().loc;

    // Check for "type" keyword (external type)
    if (parser.check("KEYWORD") && parser.peek().value === "type") {
        parser.advance(); // consume 'type'

        // Parse type name
        const nameToken = parser.expect("IDENTIFIER", "Expected type name");
        const name = nameToken.value as string;

        // Parse optional type parameters: <T, U, V>
        const typeParams = parseTypeParameters(parser);

        // Expect =
        parser.expect("OP_EQUALS", "Expected '=' after type name");

        // Parse type expression
        const typeExpr = parseTypeExpr(parser);

        return {
            kind: "ExternalType",
            name,
            ...(typeParams.length > 0 && { typeParams }),
            typeExpr,
            loc: startLoc,
        };
    }

    // External value: name: type = "jsName"
    const nameToken = parser.expect("IDENTIFIER", "Expected name");
    const name = nameToken.value as string;

    // Expect :
    parser.expect("COLON", "Expected ':' after name");

    // Parse optional type parameters: <T, U, V>
    const typeParams = parseTypeParameters(parser);

    // Parse type
    const typeExpr = parseTypeExpr(parser);

    // Expect =
    parser.expect("OP_EQUALS", "Expected '=' after type");

    // Parse JS name (string literal)
    const jsNameToken = parser.expect("STRING_LITERAL", "Expected string literal for JS name");
    const jsName = jsNameToken.value as string;

    return {
        kind: "ExternalValue",
        name,
        ...(typeParams.length > 0 && { typeParams }),
        typeExpr,
        jsName,
        loc: startLoc,
    };
}
