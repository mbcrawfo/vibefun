/**
 * String literal parsing for the lexer
 *
 * Handles single-line and multi-line string literals with escape sequences
 */

import type { Location, Token } from "../types/index.js";
import type { Lexer } from "./lexer.js";

import { throwDiagnostic } from "../diagnostics/index.js";
import { isHexDigit } from "./character-utils.js";

/**
 * Read a string literal from the source
 * Dispatches to single-line or multi-line string parser based on opening quotes
 * @param lexer - The lexer instance
 * @param hadLeadingWhitespace - Whether whitespace preceded this token
 * @returns STRING_LITERAL token
 * @throws {LexerError} If string is unterminated or has invalid escape sequences
 */
export function readString(lexer: Lexer, hadLeadingWhitespace: boolean): Token {
    const start = lexer.makeLocation();

    // Check for multi-line string (""")
    if (lexer.peek() === '"' && lexer.peek(1) === '"' && lexer.peek(2) === '"') {
        return readMultiLineString(lexer, start, hadLeadingWhitespace);
    }

    return readSingleLineString(lexer, start, hadLeadingWhitespace);
}

/**
 * Read a single-line string literal
 * Single-line strings cannot contain unescaped newlines
 * @param lexer - The lexer instance
 * @param start - The starting location of the string
 * @param hadLeadingWhitespace - Whether whitespace preceded this token
 * @returns STRING_LITERAL token
 * @throws {LexerError} If string is unterminated or contains newline
 */
function readSingleLineString(lexer: Lexer, start: Location, hadLeadingWhitespace: boolean): Token {
    lexer.advance(); // consume opening "

    let value = "";

    while (!lexer.isAtEnd() && lexer.peek() !== '"') {
        if (lexer.peek() === "\n") {
            throwDiagnostic("VF1001", lexer.makeLocation());
        }

        if (lexer.peek() === "\\") {
            value += readEscapeSequence(lexer);
        } else {
            value += lexer.advance();
        }
    }

    if (lexer.isAtEnd()) {
        throwDiagnostic("VF1002", lexer.makeLocation());
    }

    lexer.advance(); // consume closing "

    // Unicode NFC normalization for consistent string comparison
    value = value.normalize("NFC");

    return {
        type: "STRING_LITERAL",
        value,
        loc: start,
        ...(hadLeadingWhitespace && { hasLeadingWhitespace: true }),
    };
}

/**
 * Read a multi-line string literal (triple-quoted)
 * Multi-line strings can contain newlines and preserve formatting
 * @param lexer - The lexer instance
 * @param start - The starting location of the string
 * @param hadLeadingWhitespace - Whether whitespace preceded this token
 * @returns STRING_LITERAL token
 * @throws {LexerError} If string is unterminated
 */
function readMultiLineString(lexer: Lexer, start: Location, hadLeadingWhitespace: boolean): Token {
    // Consume opening """
    lexer.advance();
    lexer.advance();
    lexer.advance();

    let value = "";

    while (!lexer.isAtEnd()) {
        // Check for closing """
        if (lexer.peek() === '"' && lexer.peek(1) === '"' && lexer.peek(2) === '"') {
            lexer.advance();
            lexer.advance();
            lexer.advance();

            // Unicode NFC normalization for consistent string comparison
            value = value.normalize("NFC");

            return {
                type: "STRING_LITERAL",
                value,
                loc: start,
                ...(hadLeadingWhitespace && { hasLeadingWhitespace: true }),
            };
        }

        if (lexer.peek() === "\\") {
            value += readEscapeSequence(lexer);
        } else {
            value += lexer.advance();
        }
    }

    throwDiagnostic("VF1003", lexer.makeLocation());
}

/**
 * Read an escape sequence from a string
 * Handles: \n, \t, \r, \", \', \\, \xHH, \uXXXX, \u{XXXXXX}
 * @param lexer - The lexer instance
 * @returns The unescaped character(s)
 * @throws {LexerError} If escape sequence is invalid
 */
function readEscapeSequence(lexer: Lexer): string {
    lexer.advance(); // consume '\'

    const char = lexer.peek();

    switch (char) {
        case "n":
            lexer.advance();
            return "\n";
        case "t":
            lexer.advance();
            return "\t";
        case "r":
            lexer.advance();
            return "\r";
        case '"':
            lexer.advance();
            return '"';
        case "'":
            lexer.advance();
            return "'";
        case "\\":
            lexer.advance();
            return "\\";

        case "x":
            return readHexEscape(lexer);
        case "u":
            return readUnicodeEscape(lexer);

        default:
            throwDiagnostic("VF1010", lexer.makeLocation(), { char: char ?? "EOF" });
    }
}

/**
 * Read a hex escape sequence (\xHH)
 * Expects exactly 2 hex digits
 * @param lexer - The lexer instance
 * @returns The character represented by the hex code
 * @throws {LexerError} If format is invalid
 */
function readHexEscape(lexer: Lexer): string {
    lexer.advance(); // consume 'x'

    let hex = "";
    for (let i = 0; i < 2; i++) {
        if (!isHexDigit(lexer.peek())) {
            throwDiagnostic("VF1011", lexer.makeLocation());
        }
        hex += lexer.advance();
    }

    return String.fromCharCode(parseInt(hex, 16));
}

/**
 * Read a unicode escape sequence (\uXXXX or \u{XXXXXX})
 * Short form: exactly 4 hex digits
 * Long form: 1-6 hex digits in braces
 * @param lexer - The lexer instance
 * @returns The character represented by the unicode codepoint
 * @throws {LexerError} If format is invalid or codepoint is out of range
 */
function readUnicodeEscape(lexer: Lexer): string {
    lexer.advance(); // consume 'u'

    // Check for long form \u{...}
    if (lexer.peek() === "{") {
        lexer.advance(); // consume '{'

        let hex = "";
        // Read hex digits until we hit a non-hex-digit
        while (!lexer.isAtEnd() && isHexDigit(lexer.peek())) {
            hex += lexer.advance();
        }

        // After reading hex digits, we must find a closing }
        if (lexer.peek() !== "}") {
            throwDiagnostic("VF1012", lexer.makeLocation(), { reason: "expected closing }" });
        }

        lexer.advance(); // consume '}'

        if (hex.length === 0 || hex.length > 6) {
            throwDiagnostic("VF1012", lexer.makeLocation(), { reason: "expected 1-6 hex digits" });
        }

        const codePoint = parseInt(hex, 16);

        if (codePoint > 0x10ffff) {
            throwDiagnostic("VF1012", lexer.makeLocation(), {
                reason: `codepoint 0x${hex} exceeds maximum 0x10FFFF`,
            });
        }

        return String.fromCodePoint(codePoint);
    }

    // Short form \uXXXX
    let hex = "";
    for (let i = 0; i < 4; i++) {
        if (!isHexDigit(lexer.peek())) {
            throwDiagnostic("VF1012", lexer.makeLocation(), { reason: "expected 4 hex digits for \\uXXXX" });
        }
        hex += lexer.advance();
    }

    return String.fromCharCode(parseInt(hex, 16));
}
