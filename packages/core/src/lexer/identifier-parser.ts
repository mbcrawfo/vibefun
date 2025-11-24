/**
 * Identifier parsing for the lexer
 *
 * Handles parsing of identifiers, keywords, and boolean literals
 */

import type { Token } from "../types/index.js";
import type { Lexer } from "./lexer.js";

import { isBoolLiteral, isKeyword, isReservedKeyword } from "../types/token.js";
import { LexerError } from "../utils/index.js";
import { isIdentifierContinue } from "./character-utils.js";

/**
 * Read an identifier from the source
 * Handles keywords, boolean literals, and regular identifiers
 * @param lexer - The lexer instance
 * @param hadLeadingWhitespace - Whether whitespace preceded this token
 * @returns A token (KEYWORD, BOOL_LITERAL, or IDENTIFIER)
 * @throws {LexerError} If identifier is a reserved keyword
 */
export function readIdentifier(lexer: Lexer, hadLeadingWhitespace: boolean): Token {
    const start = lexer.makeLocation();
    let value = "";

    // Read identifier characters
    while (!lexer.isAtEnd() && isIdentifierContinue(lexer.peek())) {
        value += lexer.advance();
    }

    // Unicode NFC normalization ensures consistent representation
    // Example: café (U+00E9 composed) === café (U+0065+U+0301 decomposed)
    value = value.normalize("NFC");

    // Check if it's a reserved keyword (error if true)
    if (isReservedKeyword(value)) {
        throw new LexerError(
            `'${value}' is a reserved keyword for future language features`,
            start,
            "Reserved keywords cannot be used as identifiers",
        );
    }

    // Check if it's a keyword
    if (isKeyword(value)) {
        return {
            type: "KEYWORD",
            value,
            keyword: value,
            loc: start,
            ...(hadLeadingWhitespace && { hasLeadingWhitespace: true }),
        };
    }

    // Check if it's a boolean literal
    if (isBoolLiteral(value)) {
        return {
            type: "BOOL_LITERAL",
            value: value === "true",
            loc: start,
            ...(hadLeadingWhitespace && { hasLeadingWhitespace: true }),
        };
    }

    // Regular identifier
    return {
        type: "IDENTIFIER",
        value,
        loc: start,
        ...(hadLeadingWhitespace && { hasLeadingWhitespace: true }),
    };
}
