/**
 * Core Lexer implementation for Vibefun
 *
 * The Lexer is responsible for converting source code into a stream of tokens.
 * It maintains position tracking for accurate error reporting and handles
 * character-by-character navigation through the source code.
 *
 * @example
 * ```typescript
 * import { Lexer } from './lexer/index.js';
 *
 * const code = 'let x = 42';
 * const lexer = new Lexer(code, 'example.vf');
 * const tokens = lexer.tokenize();
 *
 * // tokens = [
 * //   { type: 'KEYWORD', value: 'let', keyword: 'let', loc: {...} },
 * //   { type: 'IDENTIFIER', value: 'x', loc: {...} },
 * //   { type: 'EQ', value: '=', loc: {...} },
 * //   { type: 'INT_LITERAL', value: 42, loc: {...} },
 * //   { type: 'EOF', value: '', loc: {...} }
 * // ]
 * ```
 *
 * @remarks
 * The lexer supports:
 * - All vibefun keywords (let, type, if, match, etc.)
 * - Identifiers with Unicode support
 * - Number literals (integers, floats, hex, binary, scientific notation)
 * - String literals (single-line and multi-line with escape sequences)
 * - All operators (single and multi-character with longest-match)
 * - Comments (single-line // and nested multi-line /* *\/)
 * - Accurate location tracking for error reporting
 */

import type { Location, Token } from "../types/index.js";

import { isDigit, isIdentifierStart } from "./character-utils.js";
import { skipWhitespaceAndComments } from "./comment-handler.js";
import { readIdentifier } from "./identifier-parser.js";
import { readNumber } from "./number-parser.js";
import { readOperatorOrPunctuation } from "./operator-parser.js";
import { readString } from "./string-parser.js";

/**
 * Lexer class for tokenizing vibefun source code
 *
 * Converts source code text into a sequence of tokens with location information.
 * Handles all vibefun syntax including keywords, literals, operators, and comments.
 */
export class Lexer {
    private position: number = 0; // Current position in source (0-indexed)
    private line: number = 1; // Current line number (1-indexed)
    private column: number = 1; // Current column number (1-indexed)
    private readonly source: readonly string[];
    private readonly filename: string;
    private _hadLeadingWhitespace: boolean = false; // Track if whitespace preceded current token

    /**
     * Creates a new Lexer instance
     *
     * @param source - The source code to tokenize
     * @param filename - The filename for error reporting (defaults to "<input>")
     *
     * @example
     * ```typescript
     * const lexer = new Lexer('let x = 1', 'example.vf');
     * ```
     */
    constructor(source: string, filename: string = "<input>") {
        // Convert source to array of characters to properly handle
        // multi-byte Unicode characters like emoji (which are surrogate pairs)
        this.source = Array.from(source);
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
     * @returns A token object with type, value, location, and whitespace info
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
            ...(this._hadLeadingWhitespace && { hasLeadingWhitespace: true }),
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
            // Skip whitespace and comments, tracking if any were skipped
            this._hadLeadingWhitespace = skipWhitespaceAndComments(this);

            // Check for EOF after skipping
            if (this.isAtEnd()) {
                break;
            }

            const char = this.peek();

            // Newlines
            if (char === "\n") {
                const start = this.makeLocation();
                this.advance();
                tokens.push({
                    type: "NEWLINE",
                    value: "\n",
                    loc: start,
                    ...(this._hadLeadingWhitespace && { hasLeadingWhitespace: true }),
                });
                continue;
            }

            // Numbers
            if (isDigit(char)) {
                tokens.push(readNumber(this, this._hadLeadingWhitespace));
                continue;
            }

            // Strings
            if (char === '"') {
                tokens.push(readString(this, this._hadLeadingWhitespace));
                continue;
            }

            // Identifiers and keywords
            if (isIdentifierStart(char)) {
                tokens.push(readIdentifier(this, this._hadLeadingWhitespace));
                continue;
            }

            // Operators and punctuation (handles both single and multi-character)
            tokens.push(readOperatorOrPunctuation(this, this._hadLeadingWhitespace));
        }

        // Add EOF token (EOF never has leading whitespace)
        this._hadLeadingWhitespace = false;
        tokens.push(this.makeToken("EOF", ""));

        return tokens;
    }
}
