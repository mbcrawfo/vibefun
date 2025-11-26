/**
 * Comment handling for the lexer
 *
 * Handles single-line and multi-line comments with nesting support
 */

import type { Lexer } from "./lexer.js";

import { throwDiagnostic } from "../diagnostics/index.js";

/**
 * Skip whitespace and comments
 * Whitespace (spaces, tabs, carriage returns) is skipped
 * Newlines are preserved as significant tokens
 * Comments are skipped (both single-line and multi-line with nesting)
 * @param lexer - The lexer instance
 * @returns true if any whitespace or comments were skipped
 */
export function skipWhitespaceAndComments(lexer: Lexer): boolean {
    let skippedAny = false;

    while (!lexer.isAtEnd()) {
        const char = lexer.peek();

        // Skip whitespace (but not newlines - they're significant)
        if (char === " " || char === "\t" || char === "\r") {
            lexer.advance();
            skippedAny = true;
            continue;
        }

        // Check for single-line comment
        if (char === "/" && lexer.peek(1) === "/") {
            skipSingleLineComment(lexer);
            skippedAny = true;
            continue;
        }

        // Check for multi-line comment
        if (char === "/" && lexer.peek(1) === "*") {
            skipMultiLineComment(lexer);
            skippedAny = true;
            continue;
        }

        // No more whitespace or comments to skip
        break;
    }

    return skippedAny;
}

/**
 * Skip a single-line comment (//)
 * Consumes characters until newline or EOF
 * @param lexer - The lexer instance
 */
function skipSingleLineComment(lexer: Lexer): void {
    // Skip '//'
    lexer.advance();
    lexer.advance();

    // Skip until newline or EOF
    while (!lexer.isAtEnd() && lexer.peek() !== "\n") {
        lexer.advance();
    }
}

/**
 * Skip a multi-line comment with nesting support
 * Handles nested comments (slash-star ... star-slash) by tracking depth
 * @param lexer - The lexer instance
 * @throws {VibefunDiagnostic} If comment is unterminated
 */
function skipMultiLineComment(lexer: Lexer): void {
    const start = lexer.makeLocation();

    // Skip '/*'
    lexer.advance();
    lexer.advance();

    let depth = 1;

    while (!lexer.isAtEnd() && depth > 0) {
        // Check for nested opening /*
        if (lexer.peek() === "/" && lexer.peek(1) === "*") {
            lexer.advance();
            lexer.advance();
            depth++;
        }
        // Check for closing */
        else if (lexer.peek() === "*" && lexer.peek(1) === "/") {
            lexer.advance();
            lexer.advance();
            depth--;
        }
        // Regular character
        else {
            lexer.advance();
        }
    }

    // Check if comment was properly closed
    if (depth > 0) {
        throwDiagnostic("VF1300", start);
    }
}
