/**
 * Core Lexer implementation for Vibefun
 *
 * The Lexer is responsible for converting source code into a stream of tokens.
 * It maintains position tracking for accurate error reporting and handles
 * character-by-character navigation through the source code.
 */

import type { Location, Token } from "../types/index.js";

import { isBoolLiteral, isKeyword } from "../types/token.js";
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
     * Check if a character can start an identifier
     * Identifiers can start with Unicode letters or underscore
     * @param char - The character to check
     * @returns true if char can start an identifier
     */
    private isIdentifierStart(char: string): boolean {
        if (char === "_") return true;
        // Check if it's a Unicode letter using Unicode property escapes
        // \p{L} matches any Unicode letter character
        return /\p{L}/u.test(char);
    }

    /**
     * Check if a character can continue an identifier
     * Identifiers can continue with Unicode letters, digits, or underscore
     * @param char - The character to check
     * @returns true if char can continue an identifier
     */
    private isIdentifierContinue(char: string): boolean {
        if (char === "_") return true;
        if (char >= "0" && char <= "9") return true;
        // Check if it's a Unicode letter
        return /\p{L}/u.test(char);
    }

    /**
     * Read an identifier from the source
     * Handles keywords, boolean literals, and regular identifiers
     * @returns A token (KEYWORD, BOOL_LITERAL, or IDENTIFIER)
     */
    private readIdentifier(): Token {
        const start = this.makeLocation();
        let value = "";

        // Read identifier characters
        while (!this.isAtEnd() && this.isIdentifierContinue(this.peek())) {
            value += this.advance();
        }

        // Check if it's a keyword
        if (isKeyword(value)) {
            return {
                type: "KEYWORD",
                value,
                keyword: value,
                loc: start,
            };
        }

        // Check if it's a boolean literal
        if (isBoolLiteral(value)) {
            return {
                type: "BOOL_LITERAL",
                value: value === "true",
                loc: start,
            };
        }

        // Regular identifier
        return {
            type: "IDENTIFIER",
            value,
            loc: start,
        };
    }

    /**
     * Tokenize the entire source code
     * @returns Array of tokens representing the source code
     * @throws {LexerError} If an invalid token is encountered
     */
    tokenize(): Token[] {
        const tokens: Token[] = [];

        while (!this.isAtEnd()) {
            const char = this.peek();

            // Skip whitespace (but not newlines - they're significant)
            if (char === " " || char === "\t" || char === "\r") {
                this.advance();
                continue;
            }

            // Newlines
            if (char === "\n") {
                const start = this.makeLocation();
                this.advance();
                tokens.push({ type: "NEWLINE", value: "\n", loc: start });
                continue;
            }

            // Identifiers and keywords
            if (this.isIdentifierStart(char)) {
                tokens.push(this.readIdentifier());
                continue;
            }

            // Single-character punctuation and operators
            const start = this.makeLocation();
            this.advance();

            switch (char) {
                case "(":
                    tokens.push({ type: "LPAREN", value: "(", loc: start });
                    continue;
                case ")":
                    tokens.push({ type: "RPAREN", value: ")", loc: start });
                    continue;
                case "{":
                    tokens.push({ type: "LBRACE", value: "{", loc: start });
                    continue;
                case "}":
                    tokens.push({ type: "RBRACE", value: "}", loc: start });
                    continue;
                case "[":
                    tokens.push({ type: "LBRACKET", value: "[", loc: start });
                    continue;
                case "]":
                    tokens.push({ type: "RBRACKET", value: "]", loc: start });
                    continue;
                case ",":
                    tokens.push({ type: "COMMA", value: ",", loc: start });
                    continue;
                case ".":
                    tokens.push({ type: "DOT", value: ".", loc: start });
                    continue;
                case ":":
                    tokens.push({ type: "COLON", value: ":", loc: start });
                    continue;
                case ";":
                    tokens.push({ type: "SEMICOLON", value: ";", loc: start });
                    continue;
                case "+":
                    tokens.push({ type: "PLUS", value: "+", loc: start });
                    continue;
                case "-":
                    tokens.push({ type: "MINUS", value: "-", loc: start });
                    continue;
                case "*":
                    tokens.push({ type: "STAR", value: "*", loc: start });
                    continue;
                case "/":
                    tokens.push({ type: "SLASH", value: "/", loc: start });
                    continue;
                case "%":
                    tokens.push({ type: "PERCENT", value: "%", loc: start });
                    continue;
                case "<":
                    tokens.push({ type: "LT", value: "<", loc: start });
                    continue;
                case ">":
                    tokens.push({ type: "GT", value: ">", loc: start });
                    continue;
                case "=":
                    tokens.push({ type: "EQ", value: "=", loc: start });
                    continue;
                case "!":
                    tokens.push({ type: "BANG", value: "!", loc: start });
                    continue;
                case "~":
                    tokens.push({ type: "TILDE", value: "~", loc: start });
                    continue;
                case "|":
                    tokens.push({ type: "PIPE", value: "|", loc: start });
                    continue;

                default:
                    throw new LexerError(
                        `Unexpected character: '${char}'`,
                        start,
                        "This character is not valid in vibefun syntax",
                    );
            }
        }

        // Add EOF token
        tokens.push(this.makeToken("EOF", ""));

        return tokens;
    }
}
