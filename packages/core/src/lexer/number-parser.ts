/**
 * Number literal parsing for the lexer
 *
 * Handles decimal, hexadecimal, and binary number literals
 */

import type { Location, Token } from "../types/index.js";
import type { Lexer } from "./lexer.js";

import { throwDiagnostic } from "../diagnostics/index.js";
import { isDigit, isHexDigit } from "./character-utils.js";

/**
 * Read a number literal from the source
 * Dispatches to specific parser based on prefix (0x, 0b) or defaults to decimal
 * @param lexer - The lexer instance
 * @param hadLeadingWhitespace - Whether whitespace preceded this token
 * @returns A token (INT_LITERAL or FLOAT_LITERAL)
 * @throws {VibefunDiagnostic} If number format is invalid
 */
export function readNumber(lexer: Lexer, hadLeadingWhitespace: boolean): Token {
    const start = lexer.makeLocation();

    // Check for hexadecimal prefix
    if (lexer.peek() === "0" && (lexer.peek(1) === "x" || lexer.peek(1) === "X")) {
        return readHexNumber(lexer, start, hadLeadingWhitespace);
    }

    // Check for binary prefix
    if (lexer.peek() === "0" && (lexer.peek(1) === "b" || lexer.peek(1) === "B")) {
        return readBinaryNumber(lexer, start, hadLeadingWhitespace);
    }

    // Default to decimal number
    return readDecimalNumber(lexer, start, hadLeadingWhitespace);
}

/**
 * Read a decimal number (integer or float with optional scientific notation)
 * Formats: 42, 3.14, 1e10, 3.14e-2, 1_000_000, 3.141_592
 * @param lexer - The lexer instance
 * @param start - The starting location of the number
 * @param hadLeadingWhitespace - Whether whitespace preceded this token
 * @returns INT_LITERAL or FLOAT_LITERAL token
 * @throws {VibefunDiagnostic} If number format is invalid
 */
function readDecimalNumber(lexer: Lexer, start: Location, hadLeadingWhitespace: boolean): Token {
    let value = "";
    let isFloat = false;

    // Read integer part (with optional underscores)
    while (isDigit(lexer.peek()) || lexer.peek() === "_") {
        const char = lexer.peek();
        if (char === "_") {
            // Skip underscore, but validate it's between digits
            const next = lexer.peek(1);
            if (!isDigit(next)) {
                throwDiagnostic("VF1100", lexer.makeLocation());
            }
            lexer.advance(); // skip underscore
        } else {
            value += lexer.advance();
        }
    }

    // Check for decimal point (must be followed by a digit)
    if (lexer.peek() === "." && isDigit(lexer.peek(1))) {
        isFloat = true;
        value += lexer.advance(); // consume '.'

        // Read fractional part (with optional underscores)
        while (isDigit(lexer.peek()) || lexer.peek() === "_") {
            const char = lexer.peek();
            if (char === "_") {
                const next = lexer.peek(1);
                if (!isDigit(next)) {
                    throwDiagnostic("VF1100", lexer.makeLocation());
                }
                lexer.advance(); // skip underscore
            } else {
                value += lexer.advance();
            }
        }
    }

    // Check for scientific notation
    if (lexer.peek() === "e" || lexer.peek() === "E") {
        isFloat = true;
        value += lexer.advance(); // consume 'e' or 'E'

        // Optional sign
        if (lexer.peek() === "+" || lexer.peek() === "-") {
            value += lexer.advance();
        }

        // Must have at least one digit after exponent
        if (!isDigit(lexer.peek())) {
            throwDiagnostic("VF1104", lexer.makeLocation());
        }

        // Read exponent digits (with optional underscores)
        while (isDigit(lexer.peek()) || lexer.peek() === "_") {
            const char = lexer.peek();
            if (char === "_") {
                const next = lexer.peek(1);
                if (!isDigit(next)) {
                    throwDiagnostic("VF1100", lexer.makeLocation());
                }
                lexer.advance(); // skip underscore
            } else {
                value += lexer.advance();
            }
        }
    }

    const numValue = isFloat ? parseFloat(value) : parseInt(value, 10);

    return {
        type: isFloat ? "FLOAT_LITERAL" : "INT_LITERAL",
        value: numValue,
        loc: start,
        ...(hadLeadingWhitespace && { hasLeadingWhitespace: true }),
    };
}

/**
 * Read a hexadecimal number (0x prefix)
 * Format: 0x1A, 0xFF, 0x0, 0xFF_AA_BB
 * @param lexer - The lexer instance
 * @param start - The starting location of the number
 * @param hadLeadingWhitespace - Whether whitespace preceded this token
 * @returns INT_LITERAL token
 * @throws {VibefunDiagnostic} If hex format is invalid
 */
function readHexNumber(lexer: Lexer, start: Location, hadLeadingWhitespace: boolean): Token {
    // Skip '0x' or '0X'
    lexer.advance();
    lexer.advance();

    let value = "";

    // Read hex digits (with optional underscores)
    while (isHexDigit(lexer.peek()) || lexer.peek() === "_") {
        const char = lexer.peek();
        if (char === "_") {
            // Skip underscore, but validate it's between hex digits
            const next = lexer.peek(1);
            if (!isHexDigit(next)) {
                throwDiagnostic("VF1100", lexer.makeLocation());
            }
            lexer.advance(); // skip underscore
        } else {
            value += lexer.advance();
        }
    }

    // Must have at least one hex digit
    if (value.length === 0) {
        throwDiagnostic("VF1102", lexer.makeLocation());
    }

    return {
        type: "INT_LITERAL",
        value: parseInt(value, 16),
        loc: start,
        ...(hadLeadingWhitespace && { hasLeadingWhitespace: true }),
    };
}

/**
 * Read a binary number (0b prefix)
 * Format: 0b1010, 0b11111111, 0b1111_0000
 * @param lexer - The lexer instance
 * @param start - The starting location of the number
 * @param hadLeadingWhitespace - Whether whitespace preceded this token
 * @returns INT_LITERAL token
 * @throws {VibefunDiagnostic} If binary format is invalid
 */
function readBinaryNumber(lexer: Lexer, start: Location, hadLeadingWhitespace: boolean): Token {
    // Skip '0b' or '0B'
    lexer.advance();
    lexer.advance();

    let value = "";

    // Read binary digits (0 or 1, with optional underscores)
    while (lexer.peek() === "0" || lexer.peek() === "1" || lexer.peek() === "_") {
        const char = lexer.peek();
        if (char === "_") {
            // Skip underscore, but validate it's between binary digits
            const next = lexer.peek(1);
            if (next !== "0" && next !== "1") {
                throwDiagnostic("VF1100", lexer.makeLocation());
            }
            lexer.advance(); // skip underscore
        } else {
            value += lexer.advance();
        }
    }

    // Must have at least one binary digit
    if (value.length === 0) {
        throwDiagnostic("VF1101", lexer.makeLocation());
    }

    return {
        type: "INT_LITERAL",
        value: parseInt(value, 2),
        loc: start,
        ...(hadLeadingWhitespace && { hasLeadingWhitespace: true }),
    };
}
