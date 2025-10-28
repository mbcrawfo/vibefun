/**
 * Core Lexer implementation for Vibefun
 *
 * The Lexer is responsible for converting source code into a stream of tokens.
 * It maintains position tracking for accurate error reporting and handles
 * character-by-character navigation through the source code.
 */

import type { Location, Token } from "../types/index.js";

import { LexerError } from "../utils/index.js";

/**
 * Lexer state management and tokenization
 */
export class Lexer {
    private position: number = 0; // Current position in source (0-indexed)
    private line: number = 1; // Current line number (1-indexed)
    private column: number = 1; // Current column number (1-indexed)
    private readonly source: string;
    private readonly filename: string;

    constructor(source: string, filename: string = "<input>") {
        this.source = source;
        this.filename = filename;
    }

    /**
     * Get the current character without consuming it
     * @param offset - How many characters ahead to look (default: 0)
     * @returns The character at position + offset, or empty string if at/past end
     */
    peek(offset: number = 0): string {
        const pos = this.position + offset;
        if (pos >= this.source.length) {
            return "";
        }
        return this.source[pos] ?? "";
    }

    /**
     * Check if we've reached the end of the source
     * @returns true if at or past the end of source
     */
    isAtEnd(): boolean {
        return this.position >= this.source.length;
    }

    /**
     * Consume the current character and advance position
     * Updates position, line, and column tracking
     * @returns The consumed character, or empty string if at end
     */
    advance(): string {
        if (this.isAtEnd()) {
            return "";
        }

        const char = this.source[this.position];
        if (char === undefined) {
            return "";
        }

        this.position++;

        // Handle newlines for line/column tracking
        if (char === "\n") {
            this.line++;
            this.column = 1;
        } else {
            this.column++;
        }

        return char;
    }

    /**
     * Create a location snapshot at the current position
     * @returns Location object with current file, line, column, and offset
     */
    makeLocation(): Location {
        return {
            file: this.filename,
            line: this.line,
            column: this.column,
            offset: this.position,
        };
    }

    /**
     * Create a token with the current location
     * @param type - The token type
     * @param value - The token value (defaults to empty string)
     * @returns A token object with type, value, and location
     */
    makeToken<T extends Token["type"]>(type: T, value: string = ""): Extract<Token, { type: T }> {
        const loc = this.makeLocation();

        // We need to cast here because TypeScript can't narrow the union type
        // based on the generic parameter T. This is safe because we're constructing
        // the token with the correct shape for the given type.
        return {
            type,
            value,
            loc,
        } as Extract<Token, { type: T }>;
    }

    /**
     * Tokenize the entire source code
     * @returns Array of tokens representing the source code
     * @throws {LexerError} If an invalid token is encountered
     */
    tokenize(): Token[] {
        const tokens: Token[] = [];

        while (!this.isAtEnd()) {
            // For now, just create a placeholder token for each character
            // This will be expanded in later phases to handle actual token types
            const char = this.peek();

            if (char === "\n") {
                tokens.push(this.makeToken("NEWLINE", char));
                this.advance();
            } else if (char === " " || char === "\t" || char === "\r") {
                // Skip whitespace (but not newlines)
                this.advance();
            } else {
                // For now, throw an error for any other character
                // This will be replaced with actual token parsing in later phases
                throw new LexerError(
                    `Unexpected character: '${char}'`,
                    this.makeLocation(),
                    "Token parsing will be implemented in later phases",
                );
            }
        }

        // Add EOF token
        tokens.push(this.makeToken("EOF", ""));

        return tokens;
    }
}
